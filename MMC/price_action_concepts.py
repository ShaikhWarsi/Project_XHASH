import pandas as pd
import numpy as np
from collections import deque

class PriceActionConcepts:
    def __init__(self, df, internal_r_lookback=5, swing_r_lookback=50):
        """
        High-fidelity LuxAlgo Price Action Concepts (v1.2.2) implementation.
        """
        self.df = df.copy()
        if isinstance(self.df.columns, pd.MultiIndex):
            self.df.columns = self.df.columns.get_level_values(0)
        self.df.columns = [c.lower() for c in self.df.columns]
        
        # Inputs
        self.iLen = internal_r_lookback
        self.sLen = swing_r_lookback
        
        # --- State Arrays (mirrors Pine Script 'ms' UDT) ---
        self.up = {'p': deque(), 'n': deque(), 'l': deque()}
        self.dn = {'p': deque(), 'n': deque(), 'l': deque()}
        self.sup = {'p': deque(), 'n': deque(), 'l': deque()}
        self.sdn = {'p': deque(), 'n': deque(), 'l': deque()}
        
        # --- Trends ---
        self.itrend = 0 
        self.strend = 0 
        
        # --- Pivot Trackers (hN, lN, hS, lS) ---
        self.hN = deque([0], maxlen=1)
        self.lN = deque([0], maxlen=1)
        self.hS = deque([0], maxlen=1)
        self.lS = deque([0], maxlen=1)
        
        # --- Results for Visualization ---
        self.internal_ms = [] 
        self.swing_ms = []
        self.order_blocks = [] # List of active OB dictionaries
        self.fvgs = []
        
        # Pre-calculate masks for performance
        self._calculate_pivots()

    def _calculate_pivots(self):
        """Replicates ta.pivothigh / ta.pivotlow logic."""
        high = self.df['high']
        low = self.df['low']
        
        def get_pivots(src, left, right, is_high=True):
            window = left + right + 1
            if is_high:
                peaks = src.rolling(window=window, center=True).max() == src
            else:
                peaks = src.rolling(window=window, center=True).min() == src
            return peaks.shift(right).fillna(False)

        self.df['iH_mask'] = get_pivots(high, self.iLen, self.iLen, True)
        self.df['iL_mask'] = get_pivots(low, self.iLen, self.iLen, False)
        self.df['sH_mask'] = get_pivots(high, self.sLen, self.sLen, True)
        self.df['sL_mask'] = get_pivots(low, self.sLen, self.sLen, False)

    def calculate_all(self):
        """Processes bar-by-bar to maintain 1:1 state parity with Pine Script."""
        for i in range(len(self.df)):
            self._process_bar(i)
        return self

    def _process_bar(self, i):
        row = self.df.iloc[i]
        curr_time = self.df.index[i]
        close = row['close']
        high = row['high']
        low = row['low']
        prev_close = self.df['close'].iloc[i-1] if i > 0 else close
        
        # 1. Update Pivot Arrays (Internal)
        if row['iH_mask']:
            val = self.df['high'].iloc[i - self.iLen]
            self.up['p'].appendleft(val)
            self.up['l'].appendleft(val)
            self.up['n'].appendleft(i - self.iLen)
            self.hN.appendleft(i - self.iLen)
        if row['iL_mask']:
            val = self.df['low'].iloc[i - self.iLen]
            self.dn['p'].appendleft(val)
            self.dn['l'].appendleft(val)
            self.dn['n'].appendleft(i - self.iLen)
            self.lN.appendleft(i - self.iLen)
            
        # 2. Update Pivot Arrays (Swing)
        if row['sH_mask']:
            val = self.df['high'].iloc[i - self.sLen]
            self.sup['p'].appendleft(val)
            self.sup['l'].appendleft(val)
            self.sup['n'].appendleft(i - self.sLen)
            self.hS.appendleft(i - self.sLen)
        if row['sL_mask']:
            val = self.df['low'].iloc[i - self.sLen]
            self.sdn['p'].appendleft(val)
            self.sdn['l'].appendleft(val)
            self.sdn['n'].appendleft(i - self.sLen)
            self.lS.appendleft(i - self.sLen)

        # 3. Market Structure Logic (Internal)
        bull_ob, bear_ob = False, False
        
        # Internal Bullish Break
        if len(self.up['p']) > 0 and len(self.dn['l']) > 1:
            level = self.up['p'][0]
            if prev_close <= level and close > level:
                is_choch = self.itrend < 0
                txt = "CHoCH+" if (is_choch and self.dn['l'][0] > self.dn['l'][1]) else ("CHoCH" if is_choch else "BOS")
                
                self.internal_ms.append({
                    'time': curr_time, 'type': txt, 'trend': 1, 'price': level,
                    'start_time': self.df.index[self.up['n'][0]]
                })
                bull_ob = True
                self.itrend = 1
                self.up['p'].clear()
                self.up['n'].clear()

        # Internal Bearish Break
        if len(self.dn['p']) > 0 and len(self.up['l']) > 1:
            level = self.dn['p'][0]
            if prev_close >= level and close < level:
                is_choch = self.itrend > 0
                txt = "CHoCH+" if (is_choch and self.up['l'][0] < self.up['l'][1]) else ("CHoCH" if is_choch else "BOS")
                
                self.internal_ms.append({
                    'time': curr_time, 'type': txt, 'trend': -1, 'price': level,
                    'start_time': self.df.index[self.dn['n'][0]]
                })
                bear_ob = True
                self.itrend = -1
                self.dn['p'].clear()
                self.dn['n'].clear()

        # 4. Market Structure Logic (Swing)
        s_bull_ob, s_bear_ob = False, False
        
        # Swing Bullish Break
        if len(self.sup['p']) > 0 and len(self.sdn['l']) > 1:
            level = self.sup['p'][0]
            if prev_close <= level and close > level:
                is_choch = self.strend < 0
                txt = "CHoCH+" if (is_choch and self.sdn['l'][0] > self.sdn['l'][1]) else ("CHoCH" if is_choch else "BOS")
                
                self.swing_ms.append({
                    'time': curr_time, 'type': txt, 'trend': 1, 'price': level,
                    'start_time': self.df.index[self.sup['n'][0]]
                })
                s_bull_ob = True
                self.strend = 1
                self.sup['p'].clear()
                self.sup['n'].clear()

        # Swing Bearish Break
        if len(self.sdn['p']) > 0 and len(self.sup['l']) > 1:
            level = self.sdn['p'][0]
            if prev_close >= level and close < level:
                is_choch = self.strend > 0
                txt = "CHoCH+" if (is_choch and self.sup['l'][0] < self.sup['l'][1]) else ("CHoCH" if is_choch else "BOS")
                
                self.swing_ms.append({
                    'time': curr_time, 'type': txt, 'trend': -1, 'price': level,
                    'start_time': self.df.index[self.sdn['n'][0]]
                })
                s_bear_ob = True
                self.strend = -1
                self.sdn['p'].clear()
                self.sdn['n'].clear()

        # 5. Volumetric Order Block Detection
        if bull_ob: self._add_ob(True, self.hN[0], i, False)
        if bear_ob: self._add_ob(False, self.lN[0], i, False)
        if s_bull_ob: self._add_ob(True, self.hS[0], i, True)
        if s_bear_ob: self._add_ob(False, self.lS[0], i, True)

        # 6. FVG Detection
        if i >= 2:
            prev_high = self.df['high'].iloc[i-2]
            prev_low = self.df['low'].iloc[i-2]
            
            # Bullish FVG (Gap between Bar i-2 High and Bar i Low)
            if low > prev_high:
                self.fvgs.append({
                    'time': curr_time,
                    'type': 'Bullish',
                    'top': low,
                    'bottom': prev_high,
                    'start_time': self.df.index[i-1],
                    'end_time': curr_time,
                    'mitigated': False
                })
            # Bearish FVG (Gap between Bar i-2 Low and Bar i High)
            elif high < prev_low:
                self.fvgs.append({
                    'time': curr_time,
                    'type': 'Bearish',
                    'top': prev_low,
                    'bottom': high,
                    'start_time': self.df.index[i-1],
                    'end_time': curr_time,
                    'mitigated': False
                })

        # 7. Mitigation Tracking
        self._check_mitigation(close, curr_time)

    def _add_ob(self, bull, loc, current_i, is_swing):
        if loc >= current_i: return
        search_range = self.df.iloc[loc : current_i + 1]
        if search_range.empty: return
        
        if bull:
            ob_idx = search_range['low'].argmin() + loc
        else:
            ob_idx = search_range['high'].argmax() + loc
            
        ob_candle = self.df.iloc[ob_idx]
        hl2 = (ob_candle['high'] + ob_candle['low']) / 2
        top = ob_candle['high'] if not bull else hl2
        btm = hl2 if not bull else ob_candle['low']
        
        self.order_blocks.append({
            'start_time': self.df.index[ob_idx],
            'end_time': self.df.index[current_i],
            'type': 'Bullish' if bull else 'Bearish',
            'top': top,
            'bottom': btm,
            'is_swing': is_swing,
            'mitigated': False
        })

    def _check_mitigation(self, close, curr_time):
        # Update OBs
        for ob in self.order_blocks:
            if not ob['mitigated']:
                if ob['type'] == 'Bullish':
                    if close < ob['bottom']: ob['mitigated'] = True
                    else: ob['end_time'] = curr_time
                else:
                    if close > ob['top']: ob['mitigated'] = True
                    else: ob['end_time'] = curr_time
        
        # Update FVGs
        for fvg in self.fvgs:
            if not fvg['mitigated']:
                if fvg['type'] == 'Bullish':
                    if close < fvg['bottom']: fvg['mitigated'] = True
                    else: fvg['end_time'] = curr_time
                else:
                    if close > fvg['top']: fvg['mitigated'] = True
                    else: fvg['end_time'] = curr_time

    def get_results(self):
        return {
            'internal_ms': self.internal_ms,
            'swing_ms': self.swing_ms,
            'order_blocks': [ob for ob in self.order_blocks if not ob['mitigated']][-15:],
            'fvgs': [fvg for fvg in self.fvgs if not fvg['mitigated']][-15:]
        }
