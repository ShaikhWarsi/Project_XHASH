import pandas as pd
import numpy as np
import yfinance as yf
from custom_ob import CustomOBStrategy
from smc_analysis import SMCAnalysis
from candle_patterns import identify_candle_patterns
from lightweight_charts import Chart

# ==============================================================================
# CONFIGURATION SWITCHES — Toggle layers on/off for debugging or clarity
# ==============================================================================
SHOW_OB          = True   # Order Blocks (boxes + intersection zones)
SHOW_SMC         = True   # Swing Highs/Lows + BOS/CHoCH lines
SHOW_PATTERNS    = True   # Candle Patterns (Hammer, Engulfing, etc.)
SHOW_LIQUIDITY   = True   # EQH / EQL levels + swept liquidity markers
SHOW_ZIGZAG      = True   # Directional Change / ZigZag lines
SHOW_HARMONICS   = True   # Harmonic Patterns (Bat, Gartley, etc.)

# ==============================================================================
# COLOR PALETTE  (centralised so changes propagate everywhere)
# ==============================================================================
C_BULL_OB   = '#00C076'          # Bullish OB border / fill base
C_BEAR_OB   = '#EF4444'          # Bearish OB border / fill base
C_BULL_SMC  = '#00E676'          # BOS/CHoCH bullish, Swing Lows
C_BEAR_SMC  = '#FF5252'          # BOS/CHoCH bearish, Swing Highs
C_EQH_EQL   = '#FFD700'          # Equal Highs / Equal Lows (gold)
C_HAMMER    = '#29B6F6'          # Hammer / Inverse Hammer
C_BULL_ENG  = '#00E676'          # Bullish Engulfing
C_BEAR_ENG  = '#FF5252'          # Bearish Engulfing
C_HANGING   = '#FF9800'          # Hanging Man / Shooting Star
C_ZIGZAG    = '#BB86FC'          # ZigZag lines (purple)
C_HARMONIC  = '#03DAC6'          # Harmonic patterns (teal)


class MasterStrategy:
    def __init__(self, df):
        self.df = df.copy()
        if isinstance(self.df.columns, pd.MultiIndex):
            self.df.columns = self.df.columns.get_level_values(0)
        self.df.columns = [c.lower() for c in self.df.columns]
        self.df = identify_candle_patterns(self.df)
        self.ob_strategy  = CustomOBStrategy(self.df)
        self.smc_analysis = SMCAnalysis(self.df)
        
    def directional_change(self, sigma: float = 0.02):
        """
        Identify peaks and valleys (ZigZag) based on a percentage change (sigma).
        Logic from technicalanalysisautomation/directional_change.py
        """
        high = self.df['high'].values
        low = self.df['low'].values
        close = self.df['close'].values
        
        up_zig = True # Last extreme is a bottom. Next is a top. 
        tmp_max = high[0]
        tmp_min = low[0]
        tmp_max_i = 0
        tmp_min_i = 0

        tops = []
        bottoms = []

        for i in range(len(close)):
            if up_zig: # Last extreme is a bottom
                if high[i] > tmp_max:
                    tmp_max = high[i]
                    tmp_max_i = i
                elif close[i] < tmp_max - tmp_max * sigma: 
                    top = [i, tmp_max_i, tmp_max]
                    tops.append(top)
                    up_zig = False
                    tmp_min = low[i]
                    tmp_min_i = i
            else: # Last extreme is a top
                if low[i] < tmp_min:
                    tmp_min = low[i]
                    tmp_min_i = i
                elif close[i] > tmp_min + tmp_min * sigma: 
                    bottom = [i, tmp_min_i, tmp_min]
                    bottoms.append(bottom)
                    up_zig = True
                    tmp_max = high[i]
                    tmp_max_i = i


        return tops, bottoms

    def get_zigzag_swings(self, sigma: float = 0.01):
        """
        Convert ZigZag results into a DataFrame format compatible with smc library.
        """
        tops, bottoms = self.directional_change(sigma=sigma)
        swings = pd.DataFrame(index=self.df.index)
        swings['HighLow'] = 0.0
        swings['Level'] = np.nan
        
        for t in tops:
            swings.at[self.df.index[t[1]], 'HighLow'] = 1.0
            swings.at[self.df.index[t[1]], 'Level'] = t[2]
        for b in bottoms:
            swings.at[self.df.index[b[1]], 'HighLow'] = -1.0
            swings.at[self.df.index[b[1]], 'Level'] = b[2]
            
        return swings

    def find_harmonics(self, tops, bottoms, err_thresh: float = 0.2):
        """
        Identify XABCD harmonic patterns from ZigZag extremes.
        Simplified logic from technicalanalysisautomation/harmonic_patterns.py
        """
        extremes = []
        for t in tops: extremes.append({'idx': t[1], 'p': t[2], 'type': 1})
        for b in bottoms: extremes.append({'idx': b[1], 'p': b[2], 'type': -1})
        extremes = sorted(extremes, key=lambda x: x['idx'])
        
        if len(extremes) < 5: return []
        
        found_patterns = []
        # Check last 5 points for XABCD
        for i in range(4, len(extremes)):
            X, A, B, C, D = extremes[i-4], extremes[i-3], extremes[i-2], extremes[i-1], extremes[i]
            
            # Leg heights
            XA = abs(A['p'] - X['p'])
            AB = abs(B['p'] - A['p'])
            BC = abs(C['p'] - B['p'])
            CD = abs(D['p'] - C['p'])
            AD = abs(D['p'] - A['p'])
            
            if XA == 0: continue
            
            # Ratios
            res_AB_XA = AB / XA
            res_BC_AB = BC / AB
            res_CD_BC = CD / BC
            res_AD_XA = AD / XA
            
            # Simple Bat check (as example)
            # Bat: AB/XA [0.382-0.5], BC/AB [0.382-0.886], CD/BC [1.618-2.618], AD/XA 0.886
            is_bat = (0.3 < res_AB_XA < 0.6) and (0.3 < res_BC_AB < 0.9) and (1.5 < res_CD_BC < 2.7)
            
            if is_bat:
                found_patterns.append({
                    'points': [X, A, B, C, D],
                    'name': 'BAT',
                    'bull': D['type'] == -1
                })
        return found_patterns

    def calculate_probabilities(self):
        """
        Calculate upside/downside probabilities based on:
        - OB proximity (current or recent touch)
        - Pattern alignment with OB bias
        - Active EQH / EQL counts
        """
        obs = self.ob_strategy.calculate()

        # Use ZigZag-based swings for structure detection instead of fixed window
        # This makes structure much more reliable and aligned with actual pivots
        zigzag_swings = self.get_zigzag_swings(sigma=0.01) # 1% change
        
        # Calculate structure using the ZigZag swings
        smc_results = {
            "swings": zigzag_swings,
            "bos_choch": self.smc_analysis.get_bos_choch(zigzag_swings),
            "liquidity": self.smc_analysis.get_liquidity(zigzag_swings),
            "prev_hl": self.smc_analysis.get_previous_high_low()
        }
        
        last_price = self.df['close'].iloc[-1]

        ob_upside = ob_downside = 0
        bull_obs_hit = [ob for ob in obs if not ob['mitigated']
                        and ob['bottom'] <= last_price <= ob['top']
                        and ob['type'] == 'Bullish']
        bear_obs_hit = [ob for ob in obs if not ob['mitigated']
                        and ob['bottom'] <= last_price <= ob['top']
                        and ob['type'] == 'Bearish']

        if bull_obs_hit or bear_obs_hit:
            ob_upside   = 40 if len(bull_obs_hit) >= 2 else (20 if bull_obs_hit else 0)
            ob_downside = 40 if len(bear_obs_hit) >= 2 else (20 if bear_obs_hit else 0)
        else:
            # Look back up to 100 bars for the most recent touch
            active_obs = [ob for ob in obs if not ob['mitigated']]
            recent_df  = self.df.iloc[-100:]
            for i in range(len(recent_df) - 1, -1, -1):
                row = recent_df.iloc[i]
                c_low, c_high = row['low'], row['high']
                touched_bull = any(max(c_low, ob['bottom']) <= min(c_high, ob['top']) for ob in active_obs if ob['type'] == 'Bullish')
                touched_bear = any(max(c_low, ob['bottom']) <= min(c_high, ob['top']) for ob in active_obs if ob['type'] == 'Bearish')
                if touched_bull and not touched_bear:
                    ob_upside = 20; break
                elif touched_bear and not touched_bull:
                    ob_downside = 20; break

        # Pattern probability (only if aligned with OB bias)
        pat_upside = pat_downside = 0
        for i in range(len(self.df) - 1, max(0, len(self.df) - 51), -1):
            row = self.df.iloc[i]
            is_bull = row.get('hammer') or row.get('bullish_engulfing')
            is_bear = row.get('inverse_hangingstone') or row.get('bearish_engulfing')
            if is_bull and ob_upside > 0:   pat_upside   = 20; break
            if is_bear and ob_downside > 0: pat_downside = 20; break

        # EQH/EQL counts for active unbroken levels
        eqh_count = eql_count = 0
        if 'eqh_origin_index' in self.df.columns:
            highs_arr = self.df['high'].values
            lows_arr  = self.df['low'].values
            for oi in self.df['eqh_origin_index'].dropna().astype(int).unique():
                if 0 <= oi < len(self.df) and not np.any(highs_arr[oi+1:] > highs_arr[oi]):
                    eqh_count += 1
            for oi in self.df['eql_origin_index'].dropna().astype(int).unique():
                if 0 <= oi < len(self.df) and not np.any(lows_arr[oi+1:] < lows_arr[oi]):
                    eql_count += 1

        prob_upside   = max(0, ob_upside   + pat_upside   + eqh_count * 5 - eql_count * 5)
        prob_downside = max(0, ob_downside + pat_downside + eql_count * 5 - eqh_count * 5)
        
        # ZigZag results for visualization
        tops, bottoms = self.directional_change(sigma=0.01)
        zigzag_results = (tops, bottoms)
        
        # Harmonic patterns
        harmonics = self.find_harmonics(tops, bottoms)
        
        return prob_upside, prob_downside, obs, smc_results, eqh_count, eql_count, zigzag_results, harmonics


# ==============================================================================
# MAIN RUNNER
# ==============================================================================
def run_master_strategy(symbol="BTC-USD", period="1mo", interval="15m"):
    print(f"Downloading data for {symbol}...")
    df = yf.download(symbol, period=period, interval=interval, progress=False)
    if df.empty:
        print("No data returned. Exiting."); return

    # ── Normalise columns
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df.columns = [c.lower() for c in df.columns]

    # ── Compute strategy
    master = MasterStrategy(df)
    upside, downside, obs, smc_results, eqh_cnt, eql_cnt, zigzag, harmonics = master.calculate_probabilities()
    last_price = df['close'].iloc[-1]

    # ── Chart
    chart = Chart(toolbox=True, width=1400, height=900)
    chart.layout(background_color='#0E1117', text_color='#DDE1E7')
    chart.grid(vert_enabled=False, horz_enabled=False)
    chart.candle_style(
        up_color='#089981', down_color='#F23645',
        border_up_color='#089981', border_down_color='#F23645',
        wick_up_color='#089981',   wick_down_color='#F23645'
    )
    chart.legend(visible=True, font_size=14, percent=True, color_based_on_candle=True)

    bias = "BULLISH 🟢" if upside > downside else ("BEARISH 🔴" if downside > upside else "NEUTRAL ⚪")
    chart.topbar.textbox(
        'info',
        f"  {symbol}  |  {interval}  |  Price: {last_price:,.2f}  |  "
        f"Upside: {upside}%  |  Downside: {downside}%  |  EQH: {eqh_cnt} | EQL: {eql_cnt} | Bias: {bias}  "
    )

    # ── Only pass OHLCV to chart.set() to avoid extra columns rendering as line series
    ohlcv_cols = [c for c in ['open', 'high', 'low', 'close', 'volume'] if c in df.columns]
    chart.set(df[ohlcv_cols])

    # ── Shared time helpers
    last_timestamp = df.index[-1]
    first_timestamp = df.index[0]

    def fmt(t):
        if isinstance(t, pd.Timestamp):
            return t.strftime('%Y-%m-%d %H:%M:%S')
        return str(t)

    # No future_str needed anymore — ray_line extends rightward automatically
    # (kept for any other potential use)
    total_span = last_timestamp - first_timestamp
    future_ext = total_span * 0.10
    future_str = fmt(last_timestamp + future_ext)

    # ── Pre-cache the full-df arrays (important: NOT sliced)
    highs_all  = df['high'].values
    lows_all   = df['low'].values
    times_all  = df.index          # full index, length == len(df)

    # Cutoff for display (last 800 bars)
    cutoff_idx  = max(0, len(df) - 800)
    cutoff_time = df.index[cutoff_idx]

    # ── Slice for pattern iteration (cutoff window only)
    pattern_df = master.df.iloc[cutoff_idx:]

    # ==========================================================================
    # LAYER 1 — Candle Patterns
    # ==========================================================================
    if SHOW_PATTERNS:
        for ts_idx, row in pattern_df.iterrows():
            ts = fmt(ts_idx)
            if row.get('hammer'):
                chart.marker(time=ts, text='H',   color=C_HAMMER,   shape='arrow_up',   position='below')
            if row.get('inverse_hammer'):
                chart.marker(time=ts, text='IH',  color=C_HAMMER,   shape='arrow_up',   position='below')
            if row.get('bullish_engulfing'):
                chart.marker(time=ts, text='BE',  color=C_BULL_ENG, shape='arrow_up',   position='below')
            if row.get('hangingstone'):
                chart.marker(time=ts, text='HS',  color=C_HANGING,  shape='arrow_down', position='above')
            if row.get('inverse_hangingstone'):
                chart.marker(time=ts, text='SS',  color=C_HANGING,  shape='arrow_down', position='above')
            if row.get('bearish_engulfing'):
                chart.marker(time=ts, text='BeE', color=C_BEAR_ENG, shape='arrow_down', position='above')

    # ==========================================================================
    # LAYER 2 — EQH / EQL Lines  (uses full-df arrays to avoid index mismatch)
    # ==========================================================================
    if SHOW_LIQUIDITY:
        plotted_eqh = set()
        plotted_eql = set()

        for _, row in pattern_df.iterrows():
            # --- EQH ---
            raw_eqh = row.get('eqh_origin_index')
            if not pd.isna(raw_eqh):
                oi = int(raw_eqh)
                if oi not in plotted_eqh and 0 <= oi < len(df):
                    plotted_eqh.add(oi)
                    level     = highs_all[oi]            # use full-array, not sliced
                    origin_ts = times_all[oi]
                    # Only plot if origin is within visible chart range
                    if origin_ts >= cutoff_time:
                        # Check unbroken: no future high exceeded this level
                        unbroken = not np.any(highs_all[oi + 1:] > level)
                        if unbroken:
                                start = fmt(origin_ts)
                                try:
                                    # ray_line starts at origin_ts and extends RIGHTWARD only
                                    # This prevents the 'backwards line' bug of trend_line()
                                    chart.ray_line(start, level, color=C_EQH_EQL)
                                    chart.marker(time=start, text='EQH', color=C_EQH_EQL,
                                                 shape='arrow_down', position='above')
                                except Exception:
                                    pass

            # --- EQL ---
            raw_eql = row.get('eql_origin_index')
            if not pd.isna(raw_eql):
                oi = int(raw_eql)
                if oi not in plotted_eql and 0 <= oi < len(df):
                    plotted_eql.add(oi)
                    level     = lows_all[oi]
                    origin_ts = times_all[oi]
                    if origin_ts >= cutoff_time:
                        unbroken = not np.any(lows_all[oi + 1:] < level)
                        if unbroken:
                                start = fmt(origin_ts)
                                try:
                                    chart.ray_line(start, level, color=C_EQH_EQL)
                                    chart.marker(time=start, text='EQL', color=C_EQH_EQL,
                                                 shape='arrow_up', position='below')
                                except Exception:
                                    pass

        # --- Swept liquidity markers (from SMC library) ---
        liquidity = smc_results['liquidity']
        for i in range(len(liquidity)):
            row = liquidity.iloc[i]
            if row['Liquidity'] == 0 or pd.isna(row['Swept']): continue
            try:
                idx = int(row['Swept'])
                if idx < cutoff_idx or idx >= len(df): continue
                ts = fmt(df.index[idx])
                is_bull = row['Liquidity'] == 1
                chart.marker(
                    time=ts,
                    text='EQH✓' if is_bull else 'EQL✓',
                    color=C_BEAR_SMC if is_bull else C_BULL_SMC,
                    shape='circle',
                    position='above' if is_bull else 'below'
                )
            except Exception:
                continue

    # ==========================================================================
    # LAYER 3 — Order Blocks
    # ==========================================================================
    if SHOW_OB:
        obs_active = [ob for ob in obs if ob['end_time'] == last_timestamp]

        # Find overlapping zones between same-type OBs for darker shading
        intersections = []
        for i in range(len(obs_active)):
            for j in range(i + 1, len(obs_active)):
                o1, o2 = obs_active[i], obs_active[j]
                if o1['type'] != o2['type']: continue
                ts  = max(o1['start_time'], o2['start_time'])
                te  = min(o1['end_time'],   o2['end_time'])
                vtop = min(o1['top'],    o2['top'])
                vbot = max(o1['bottom'], o2['bottom'])
                if ts < te and vbot < vtop:
                    intersections.append({'start_time': ts, 'end_time': te,
                                          'top': vtop, 'bottom': vbot, 'type': o1['type']})

        # Base OB boxes
        for ob in obs_active:
            is_bull     = ob['type'] == 'Bullish'
            border      = C_BULL_OB if is_bull else C_BEAR_OB
            alpha_fill  = 'rgba(0,192,118,0.15)' if is_bull else 'rgba(239,68,68,0.15)'
            t1, t2      = fmt(ob['start_time']), fmt(ob['end_time'])
            chart.box(start_time=t1, start_value=ob['top'],
                      end_time=t2,   end_value=ob['bottom'],
                      color=border,  fill_color=alpha_fill)
            chart.marker(
                time=fmt(ob['fvg_time']),
                text=f"OB{'↑' if is_bull else '↓'}",
                color=border,
                shape='circle',
                position='below' if is_bull else 'above'
            )

        # Overlap zones (darker tint)
        for inter in intersections:
            is_bull   = inter['type'] == 'Bullish'
            ov_fill   = 'rgba(0,192,118,0.40)' if is_bull else 'rgba(239,68,68,0.40)'
            t1, t2    = fmt(inter['start_time']), fmt(inter['end_time'])
            chart.box(start_time=t1, start_value=inter['top'],
                      end_time=t2,   end_value=inter['bottom'],
                      color='rgba(0,0,0,0)', fill_color=ov_fill)

    # ==========================================================================
    # LAYER 4 — SMC: Swings + BOS/CHoCH
    # ==========================================================================
    if SHOW_SMC:
        swings   = smc_results['swings']
        bos_choch = smc_results['bos_choch']

        print(f"DEBUG — Swings: {swings.shape}, BOS/CHoCH: {bos_choch.shape}")

        # Swing Highs (HighLow == 1) and Swing Lows (HighLow == -1)
        for i in range(len(swings)):
            hl = swings['HighLow'].iloc[i]
            if pd.isna(hl) or hl == 0: continue
            ts = swings.index[i]
            if ts not in df.index or ts < cutoff_time: continue
            is_sh = (hl == 1)
            chart.marker(
                time=fmt(ts),
                text='SH' if is_sh else 'SL',
                color=C_BEAR_SMC if is_sh else C_BULL_SMC,
                shape='circle',
                position='above' if is_sh else 'below'
            )

        # BOS / CHoCH — only show events from the last 150 bars
        # This ensures the label/marker is ALWAYS visible on screen (not off to the left)
        # A level is also skipped if price has already crossed back through it (mitigated)
        MAX_BOS_LINES  = 4
        BOS_LOOKBACK   = 150                          # bars to search for BOS/CHoCH origins
        bos_cutoff_idx = max(0, len(df) - BOS_LOOKBACK)
        last_close     = df['close'].iloc[-1]

        bos_candidates = []
        for i in range(len(bos_choch)):
            row = bos_choch.iloc[i]
            if row['BOS'] == 0 and row['CHOCH'] == 0: continue
            try:
                idx = int(row['BrokenIndex'])
                # Only use origins within the last BOS_LOOKBACK bars
                if idx < bos_cutoff_idx or idx >= len(df): continue
                level   = row['Level']
                is_bull = row['BOS'] == 1 or row['CHOCH'] == 1

                # Skip if price has already crossed back through (mitigated)
                if is_bull  and last_close < level: continue
                if not is_bull and last_close > level: continue

                bos_candidates.append((idx, level, is_bull, 'BOS' if row['BOS'] != 0 else 'CHoCH'))
            except Exception:
                continue

        # Draw only the most recent MAX_BOS_LINES
        for idx, level, is_bull, label in bos_candidates[-MAX_BOS_LINES:]:
            ts    = df.index[idx]
            color = C_BULL_SMC if is_bull else C_BEAR_SMC
            start = fmt(ts)
            try:
                # dashed style so these read clearly as "reference levels"
                chart.ray_line(start, level, color=color, width=1, style='dashed')
                chart.marker(
                    time=start, text=label, color=color,
                    shape='square',
                    position='below' if is_bull else 'above'
                )
            except Exception:
                continue

    # ==========================================================================
    # LAYER 5 — Directional Change (ZigZag)
    # ==========================================================================
    if SHOW_ZIGZAG:
        tops, bottoms = zigzag
        # Merge and sort by index
        extremes = []
        for t in tops: extremes.append({'idx': t[1], 'price': t[2], 'type': 'TOP'})
        for b in bottoms: extremes.append({'idx': b[1], 'price': b[2], 'type': 'BOTTOM'})
        extremes = sorted(extremes, key=lambda x: x['idx'])
        
        # Draw lines between extremes
        for i in range(1, len(extremes)):
            e1, e2 = extremes[i-1], extremes[i]
            if e1['idx'] < cutoff_idx and e2['idx'] < cutoff_idx: continue
            
            t1, t2 = fmt(df.index[e1['idx']]), fmt(df.index[e2['idx']])
            v1, v2 = e1['price'], e2['price']
            
            try:
                # Use simple trend_line for ZigZag segments
                chart.trend_line(t1, v1, t2, v2, color=C_ZIGZAG, width=1)
                chart.marker(time=t2, text='PK' if e2['type'] == 'TOP' else 'VY', 
                             color=C_ZIGZAG, shape='circle', 
                             position='above' if e2['type'] == 'TOP' else 'below')
            except: continue

    # ==========================================================================
    # LAYER 6 — Harmonic Patterns
    # ==========================================================================
    if SHOW_HARMONICS:
        for pat in harmonics:
            pts = pat['points']
            if pts[0]['idx'] < cutoff_idx: continue # skip if too old
            
            # Draw X-A-B-C-D connections
            for i in range(1, len(pts)):
                p1, p2 = pts[i-1], pts[i]
                t1, t2 = fmt(df.index[p1['idx']]), fmt(df.index[p2['idx']])
                v1, v2 = p1['p'], p2['p']
                try:
                    chart.trend_line(t1, v1, t2, v2, color=C_HARMONIC, width=2)
                except: continue
                
            # Entry text at point D
            d_pt = pts[-1]
            chart.marker(time=fmt(df.index[d_pt['idx']]), 
                         text=f"{pat['name']} {'BULL' if pat['bull'] else 'BEAR'}", 
                         color=C_HARMONIC, shape='square', 
                         position='below' if pat['bull'] else 'above')

    # ==========================================================================
    # Summary
    # ==========================================================================
    print(f"\n{'='*40}")
    print(f"  PAIR     : {symbol}  ({interval})")
    print(f"  PRICE    : {last_price:,.2f}")
    print(f"  PAST EQH : {eqh_cnt}  | PAST EQL : {eql_cnt}")
    print(f"  UPSIDE   : {upside}%")
    print(f"  DOWNSIDE : {downside}%")
    print(f"  BIAS     : {bias}")
    print(f"{'='*40}\n")

    chart.show(block=True)


if __name__ == "__main__":
    run_master_strategy()
