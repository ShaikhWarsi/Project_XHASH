import pandas as pd
import numpy as np

class CustomOBStrategy:
    def __init__(self, df, pivot_len=5, fvg_lookback=7, body_size_mult=1.5):
        """
        Custom Strategy:
        1. Find Pivot Lows/Highs.
        2. Bullish OB: Last red candle at low + following green candle.
           Zone: Top = Red High, Bottom = Green Low.
           VALID only if followed by a BULLISH FVG (Large Green Candle) within 5-7 candles.
        3. Bearish OB: Last green candle at high + following red candle.
           Zone: Top = Green High, Bottom = Red Low.
           VALID only if followed by a BEARISH FVG (Large Red Candle) within 5-7 candles.
        4. Extend infinitely until a body close pierces the zone.
        """
        self.df = df.copy()
        if isinstance(self.df.columns, pd.MultiIndex):
            self.df.columns = self.df.columns.get_level_values(0)
        self.df.columns = [c.lower() for c in self.df.columns]
        
        self.pivot_len = pivot_len
        self.fvg_lookback = fvg_lookback
        self.body_size_mult = body_size_mult
        
        # Calculate indicators
        self.df['body_size'] = abs(self.df['close'] - self.df['open'])
        self.df['avg_body_size'] = self.df['body_size'].rolling(window=20).mean()
        self.df['is_red'] = self.df['close'] < self.df['open']
        self.df['is_green'] = self.df['close'] > self.df['open']
        
        # Calculate Pivots
        self.df['pivot_low'] = self.df['low'].rolling(window=2*pivot_len+1, center=True).min() == self.df['low']
        self.df['pivot_high'] = self.df['high'].rolling(window=2*pivot_len+1, center=True).max() == self.df['high']

    def calculate(self):
        obs = []
        for i in range(self.pivot_len, len(self.df)):
            # --- BULLISH OB ---
            # Sequence: Red Candle -> Green Candle at a Pivot Low
            if self.df['pivot_low'].iloc[i]:
                # Look for the sequence (Red -> Green) where the pivot low is part of this pair
                # We check (i-1, i) or (i, i+1) as the potential Red-Green pair
                found_pair = False
                red_idx, green_idx = -1, -1
                
                # Check (i-1) as Red and (i) as Green
                if i > 0 and self.df['is_red'].iloc[i-1] and self.df['is_green'].iloc[i]:
                    red_idx, green_idx = i-1, i
                    found_pair = True
                # OR check (i) as Red and (i+1) as Green
                elif i + 1 < len(self.df) and self.df['is_red'].iloc[i] and self.df['is_green'].iloc[i+1]:
                    red_idx, green_idx = i, i+1
                    found_pair = True
                
                if found_pair:
                    # User: "take the top of red candle and bottom of the follow up green candle"
                    top = self.df['high'].iloc[red_idx]
                    bottom = self.df['low'].iloc[green_idx]
                    
                    # Bullish FVG Check (Must be a large GREEN candle)
                    fvg_found = False
                    fvg_idx = -1
                    for k in range(green_idx + 1, min(green_idx + self.fvg_lookback + 1, len(self.df))):
                        # FVG for Bullish OB must be Green
                        if self.df['is_green'].iloc[k] and self.df['body_size'].iloc[k] > self.df['avg_body_size'].iloc[k] * self.body_size_mult:
                            fvg_found = True
                            fvg_idx = k
                            break
                    
                    if fvg_found:
                        # Mitigation trigger should be the absolute low of the formation (pivot low)
                        # to avoid early mitigation from small wicks near the box bottom
                        mitigation_level = min(self.df['low'].iloc[red_idx], self.df['low'].iloc[green_idx])
                        
                        mitigation_idx = -1
                        for m in range(fvg_idx + 1, len(self.df)):
                            if self.df['close'].iloc[m] < mitigation_level:
                                mitigation_idx = m
                                break
                        
                        is_mitigated = mitigation_idx != -1
                        # If not mitigated, set end_time to a very far future date for infinite stretching
                        if not is_mitigated:
                            # Use a fixed very far date that lightweight-charts can handle
                            # Or just use the last timestamp and let the plotter handle 'infinite'
                            # But here we'll use the last timestamp for logic and 'infinite' for visualization
                            end_time = self.df.index[-1]
                        else:
                            end_time = self.df.index[mitigation_idx]

                        obs.append({
                            'start_time': self.df.index[red_idx],
                            'end_time': end_time,
                            'top': top,
                            'bottom': bottom,
                            'type': 'Bullish',
                            'fvg_time': self.df.index[fvg_idx],
                            'mitigated': is_mitigated,
                            'mitigation_level': mitigation_level
                        })

            # --- BEARISH OB ---
            # Sequence: Green Candle -> Red Candle at a Pivot High
            if self.df['pivot_high'].iloc[i]:
                # Look for the sequence (Green -> Red) where the pivot high is part of this pair
                # We check (i-1, i) or (i, i+1) as the potential Green-Red pair
                found_pair = False
                green_idx, red_idx = -1, -1
                
                # Check (i-1) as Green and (i) as Red
                if i > 0 and self.df['is_green'].iloc[i-1] and self.df['is_red'].iloc[i]:
                    green_idx, red_idx = i-1, i
                    found_pair = True
                # OR check (i) as Green and (i+1) as Red
                elif i + 1 < len(self.df) and self.df['is_green'].iloc[i] and self.df['is_red'].iloc[i+1]:
                    green_idx, red_idx = i, i+1
                    found_pair = True
                
                if found_pair:
                    # User: "take the high of the last green candle and the low of the follow-up red candle"
                    top = self.df['high'].iloc[green_idx]
                    bottom = self.df['low'].iloc[red_idx]
                    
                    # Bearish FVG Check (Must be a large RED candle)
                    fvg_found = False
                    fvg_idx = -1
                    for k in range(red_idx + 1, min(red_idx + self.fvg_lookback + 1, len(self.df))):
                        # FVG for Bearish OB must be Red
                        if self.df['is_red'].iloc[k] and self.df['body_size'].iloc[k] > self.df['avg_body_size'].iloc[k] * self.body_size_mult:
                            fvg_found = True
                            fvg_idx = k
                            break
                    
                    if fvg_found:
                        # Mitigation trigger should be the absolute high of the formation (pivot high)
                        mitigation_level = max(self.df['high'].iloc[green_idx], self.df['high'].iloc[red_idx])
                        
                        mitigation_idx = -1
                        for m in range(fvg_idx + 1, len(self.df)):
                            if self.df['close'].iloc[m] > mitigation_level:
                                mitigation_idx = m
                                break
                        
                        is_mitigated = mitigation_idx != -1
                        if not is_mitigated:
                            end_time = self.df.index[-1]
                        else:
                            end_time = self.df.index[mitigation_idx]

                        obs.append({
                            'start_time': self.df.index[green_idx],
                            'end_time': end_time,
                            'top': top,
                            'bottom': bottom,
                            'type': 'Bearish',
                            'fvg_time': self.df.index[fvg_idx],
                            'mitigated': is_mitigated,
                            'mitigation_level': mitigation_level
                        })
                        
        return obs
