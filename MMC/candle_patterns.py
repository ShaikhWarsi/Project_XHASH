import pandas as pd
import numpy as np

def identify_candle_patterns(df):
    """
    Identifies specific candlestick patterns in the DataFrame.
    
    Expected DataFrame columns (case-insensitive): 'open', 'high', 'low', 'close'
    """
    # Create a copy to avoid modifying the original dataframe directly if not intended
    df = df.copy()
    
    # Normalize column names to lowercase
    df.columns = [c.lower() for c in df.columns]
    
    # Basic candle features
    df['body_size'] = abs(df['close'] - df['open'])
    df['total_range'] = df['high'] - df['low']
    df['is_green'] = df['close'] > df['open']
    df['is_red'] = df['close'] < df['open']
    
    # Calculate wicks
    # For Green: Upper = High - Close, Lower = Open - Low
    # For Red:   Upper = High - Open,  Lower = Close - Low
    # We can use generalized formula:
    df['upper_wick'] = df['high'] - df[['open', 'close']].max(axis=1)
    df['lower_wick'] = df[['open', 'close']].min(axis=1) - df['low']
    
    # Avoid division by zero
    df['total_range'] = df['total_range'].replace(0, np.nan) 
    
    # --- Pattern 1: Hammer ---
    # Green candle with smaller body and longer lower wick
    # "Smaller body": Body is less than 35% of total range (configurable)
    # "Longer lower wick": Lower wick is at least 2 times the body size
    df['hammer'] = (
        df['is_green'] &
        (df['body_size'] < (df['total_range'] * 0.35)) &
        (df['lower_wick'] > (df['body_size'] * 2)) & 
        (df['upper_wick'] < df['body_size']) # Assuming upper wick should be small for a hammer
    )
    
    # --- Pattern 2: Hangingstone (Hanging Man) ---
    # Red candle with smaller body and longer lower wick
    df['hangingstone'] = (
        df['is_red'] &
        (df['body_size'] < (df['total_range'] * 0.35)) &
        (df['lower_wick'] > (df['body_size'] * 2)) &
        (df['upper_wick'] < df['body_size'])
    )
    
    # --- Pattern 3: Inverse Hammer ---
    # Green candle with smaller body and larger upper wick
    df['inverse_hammer'] = (
        df['is_green'] &
        (df['body_size'] < (df['total_range'] * 0.35)) &
        (df['upper_wick'] > (df['body_size'] * 2)) &
        (df['lower_wick'] < df['body_size'])
    )
    
    # --- Pattern 4: Inverse Hangingstone (Shooting Star) ---
    # Red candle with smaller body and larger upper wick
    df['inverse_hangingstone'] = (
        df['is_red'] &
        (df['body_size'] < (df['total_range'] * 0.35)) &
        (df['upper_wick'] > (df['body_size'] * 2)) &
        (df['lower_wick'] < df['body_size'])
    )
    
    # --- Engulfing Patterns (require previous candle) ---
    # Shifted columns for previous candle
    df['prev_open'] = df['open'].shift(1)
    df['prev_close'] = df['close'].shift(1)
    df['prev_high'] = df['high'].shift(1)
    df['prev_low'] = df['low'].shift(1)
    df['prev_is_red'] = df['close'].shift(1) < df['open'].shift(1)
    df['prev_is_green'] = df['close'].shift(1) > df['open'].shift(1)
    
    # --- Pattern 5: Bullish Engulfing ---
    # A red candle followed by a green candle
    # Green candle body closes above the red candle's upper wick/body/top (which is the High)
    is_bullish_engulfing = (
        df['prev_is_red'] &
        df['is_green'] &
        (df['close'] > df['prev_high'])
    )
    # Treat both candles as one pattern (mark both as True)
    df['bullish_engulfing'] = is_bullish_engulfing | is_bullish_engulfing.shift(-1).fillna(False)
    
    # --- Pattern 6: Bearish Engulfing ---
    # A green candle followed by a larger red candle 
    # Red candle body closes lower than the lowest point of green candle (which is the Low)
    # "Larger red candle" implies the red body or range covers the green one, 
    # but the condition "closes lower than lowest point" is the strict rule given.
    is_bearish_engulfing = (
        df['prev_is_green'] &
        df['is_red'] &
        (df['close'] < df['prev_low'])
    )
    # Treat both candles as one pattern (mark both as True)
    df['bearish_engulfing'] = is_bearish_engulfing | is_bearish_engulfing.shift(-1).fillna(False)
    
    # --- EQH / EQL (Equal Highs and Lows) ---
    # Logic: 
    # 1. Add every candle's high/low as a candidate level
    # 2. Check match with previous active levels
    # 3. Invalidate broken levels
    # 4. Store the "Original" level for plotting consistency
    
    # Threshold = 0.05% of the median price — scales correctly for all instruments
    # e.g. for BTC at $80,000 -> ~$40 tolerance; for SPY at $500 -> ~$0.25
    median_price = float(np.nanmedian(df['close'].values))
    threshold = median_price * 0.0005
    
    active_highs = []
    active_lows = []
    
    eqh_levels = np.full(len(df), np.nan)
    eql_levels = np.full(len(df), np.nan)
    eqh_origin_index = np.full(len(df), np.nan)
    eql_origin_index = np.full(len(df), np.nan)
    
    highs = df['high'].values
    lows = df['low'].values
    
    for i in range(len(df)):
        c_high = highs[i]
        c_low = lows[i]
        
        # 1. Check for EQH
        new_active_highs = []
        matched_level = None
        matched_origin = None
        
        for (h, orig_idx, max_high_since) in active_highs:
            max_high_since = max(max_high_since, c_high)
            if max_high_since > h:
                continue
            
            if abs(c_high - h) <= threshold:
                if matched_level is None or h > matched_level:
                    matched_level = h
                    matched_origin = orig_idx
            
            new_active_highs.append((h, orig_idx, max_high_since))
        
        if matched_level is not None:
            eqh_levels[i] = matched_level
            if matched_origin is not None:
                eqh_origin_index[i] = matched_origin
        else:
            new_active_highs.append((c_high, i, c_high))
            
        active_highs = new_active_highs
            
        # 2. Check for EQL
        new_active_lows = []
        matched_level_low = None
        matched_origin_low = None
        
        for (l, orig_idx, min_low_since) in active_lows:
            min_low_since = min(min_low_since, c_low)
            if min_low_since < l:
                continue
            
            if abs(c_low - l) <= threshold:
                if matched_level_low is None or l < matched_level_low:
                    matched_level_low = l
                    matched_origin_low = orig_idx
            
            new_active_lows.append((l, orig_idx, min_low_since))
        
        if matched_level_low is not None:
            eql_levels[i] = matched_level_low
            if matched_origin_low is not None:
                eql_origin_index[i] = matched_origin_low
        else:
            new_active_lows.append((c_low, i, c_low))
        
        active_lows = new_active_lows
                
    df['eqh_level'] = eqh_levels
    df['eql_level'] = eql_levels
    df['eqh_origin_index'] = eqh_origin_index
    df['eql_origin_index'] = eql_origin_index
    
    # Create boolean columns for backward compatibility if needed, 
    # but we should use the level columns for plotting.
    df['eqh'] = ~np.isnan(eqh_levels)
    df['eql'] = ~np.isnan(eql_levels)
    
    # Clean up temporary columns if desired, or keep them for debugging
    # For this task, we will return the dataframe with the new boolean columns
    
    # List of pattern columns to return
    patterns = [
        'hammer', 
        'hangingstone', 
        'inverse_hammer', 
        'inverse_hangingstone', 
        'bullish_engulfing', 
        'bearish_engulfing'
    ]
    
    return df
