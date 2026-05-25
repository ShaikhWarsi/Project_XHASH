from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import pandas as pd
import numpy as np


@dataclass
class MMCAnalysisResult:
    symbol: str
    timeframe: str
    upside_prob: float
    downside_prob: float
    bias: str
    eqh_count: int
    eql_count: int
    order_blocks: list[dict] = field(default_factory=list)
    bos_choch_levels: list[dict] = field(default_factory=list)
    candle_patterns: list[dict] = field(default_factory=list)
    harmonics: list[dict] = field(default_factory=list)
    zigzag_swings: list[dict] = field(default_factory=list)
    probabilities: dict = field(default_factory=dict)
    last_price: float = 0.0
    chart_html: str = ""

    def to_dict(self) -> dict:
        import math
        def sf(v):
            if isinstance(v, float):
                if math.isnan(v) or math.isinf(v):
                    return 0.0
                return v
            if isinstance(v, dict):
                return {k: sf(val) for k, val in v.items()}
            if isinstance(v, list):
                return [sf(i) for i in v]
            return v
        d = {
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "bias": self.bias,
            "upside_prob": sf(self.upside_prob),
            "downside_prob": sf(self.downside_prob),
            "eqh_count": self.eqh_count,
            "eql_count": self.eql_count,
            "order_blocks": sf(self.order_blocks),
            "bos_choch_levels": sf(self.bos_choch_levels),
            "candle_patterns": sf(self.candle_patterns),
            "harmonics": sf(self.harmonics),
            "zigzag_swings": sf(self.zigzag_swings),
            "probabilities": sf(self.probabilities),
            "last_price": sf(self.last_price),
        }
        if self.chart_html:
            d["chart_html"] = self.chart_html
        return d


class MMCAnalyzer:
    def __init__(self, symbol: str = "BTC-USD", period: str = "1mo", interval: str = "15m"):
        self.symbol = symbol
        self.period = period
        self.interval = interval
        self._last_result: Optional[MMCAnalysisResult] = None
        self._df: Optional[pd.DataFrame] = None

    @property
    def last_result(self) -> Optional[MMCAnalysisResult]:
        return self._last_result

    def analyze(self, df: Optional[pd.DataFrame] = None) -> MMCAnalysisResult:
        if df is None:
            import yfinance as yf
            ticker = yf.Ticker(self.symbol)
            df = ticker.history(period=self.period, interval=self.interval)

        self._df = df.copy()
        if isinstance(self._df.columns, pd.MultiIndex):
            self._df.columns = self._df.columns.get_level_values(0)
        self._df.columns = [c.lower() for c in self._df.columns]

        result = self._compute()
        self._last_result = result
        return result

    def _compute(self) -> MMCAnalysisResult:
        from analyzers.mmc.candle_patterns import identify_candle_patterns
        from analyzers.mmc.custom_ob import CustomOBStrategy
        from analyzers.mmc.smc_analysis import SMCAnalysis

        df = self._df.copy()

        df = identify_candle_patterns(df)

        ob_strategy = CustomOBStrategy(df)
        ob_strategy.calculate()

        smc = SMCAnalysis(df)

        zigzag_swings = self._get_zigzag_swings(sigma=0.01)

        smc_results = {
            "swings": zigzag_swings,
            "bos_choch": smc.get_bos_choch(zigzag_swings),
            "liquidity": smc.get_liquidity(zigzag_swings),
            "prev_hl": smc.get_previous_high_low(),
        }

        last_price = df["close"].iloc[-1]

        tops, bottoms = self._directional_change(sigma=0.01)

        obs = ob_strategy.calculate()

        ob_upside, ob_downside = self._ob_touch_score(obs, df, last_price)

        pat_upside, pat_downside = self._pattern_score(df, ob_upside > 0, ob_downside > 0)

        eqh_count, eql_count = self._count_eqh_eql(df)

        harmonics = self._find_harmonics(tops, bottoms)

        prob_upside = max(0, ob_upside + pat_upside + eqh_count * 5 - eql_count * 5)
        prob_downside = max(0, ob_downside + pat_downside + eql_count * 5 - eqh_count * 5)

        if prob_upside > prob_downside:
            bias = "BULLISH"
        elif prob_downside > prob_upside:
            bias = "BEARISH"
        else:
            bias = "NEUTRAL"

        bos_data = smc_results.get("bos_choch", pd.DataFrame())
        bos_levels = self._extract_bos_choch(bos_data) if len(bos_data) > 0 else []

        ob_list = []
        for ob in obs:
            ob_list.append({
                "type": ob.get("type", "unknown"),
                "top": float(ob.get("top", 0)),
                "bottom": float(ob.get("bottom", 0)),
                "start_time": str(ob.get("start_time", "")),
                "end_time": str(ob.get("end_time", "")),
                "mitigated": ob.get("mitigated", False),
                "mitigation_level": ob.get("mitigation_level", 0),
            })

        patterns_list = []
        pattern_cols = ["hammer", "inverse_hammer", "hangingstone", "inverse_hangingstone",
                        "bullish_engulfing", "bearish_engulfing"]
        for col in pattern_cols:
            if col in df.columns:
                series = df[col]
                if series.dtype == bool:
                    match_indices = series[series].index.tolist()
                else:
                    match_indices = series.dropna().index.tolist()
                for idx in match_indices[-20:]:
                    direction = "bullish" if col in ("hammer", "inverse_hammer", "bullish_engulfing") else "bearish"
                    patterns_list.append({
                        "pattern": col,
                        "direction": direction,
                        "time": str(idx),
                    })

        zz_list = []
        for t in tops:
            zz_list.append({"type": "top", "index": int(t[1]), "price": float(t[2])})
        for b in bottoms:
            zz_list.append({"type": "bottom", "index": int(b[1]), "price": float(b[2])})
        zz_list.sort(key=lambda x: x["index"])

        harmonic_list = []
        for h in harmonics:
            pts = h["points"]
            harmonic_list.append({
                "name": h["name"],
                "bull": h["bull"],
                "points": [{"index": int(p["idx"]), "price": float(p["p"]), "type": "top" if p["type"] == 1 else "bottom"} for p in pts],
            })

        self._df = df
        self._smc_results = smc_results
        self._tops = tops
        self._bottoms = bottoms
        self._obs = obs
        self._eqh_count = eqh_count
        self._eql_count = eql_count
        self._prob_upside = prob_upside
        self._prob_downside = prob_downside
        self._harmonics = harmonics
        self._last_price = last_price

        return MMCAnalysisResult(
            symbol=self.symbol,
            timeframe=self.interval,
            upside_prob=round(float(prob_upside), 1),
            downside_prob=round(float(prob_downside), 1),
            bias=bias,
            eqh_count=eqh_count,
            eql_count=eql_count,
            order_blocks=ob_list,
            bos_choch_levels=bos_levels,
            candle_patterns=patterns_list,
            zigzag_swings=zz_list,
            harmonics=harmonic_list,
            probabilities={
                "ob_score": ob_upside,
                "pattern_score": max(pat_upside, pat_downside),
                "eqh_eql_score": (eqh_count - eql_count) * 5,
                "raw_upside": prob_upside,
                "raw_downside": prob_downside,
            },
            last_price=float(last_price),
        )

    def _directional_change(self, sigma: float = 0.02):
        close = self._df["close"].values
        high = self._df["high"].values
        low = self._df["low"].values
        tops = []
        bottoms = []
        up_zig = True
        tmp_max = high[0]
        tmp_min = low[0]
        tmp_max_i = 0
        tmp_min_i = 0
        for i in range(len(close)):
            if up_zig:
                if high[i] > tmp_max:
                    tmp_max = high[i]
                    tmp_max_i = i
                elif close[i] < tmp_max - tmp_max * sigma:
                    tops.append([i, tmp_max_i, tmp_max])
                    up_zig = False
                    tmp_min = low[i]
                    tmp_min_i = i
            else:
                if low[i] < tmp_min:
                    tmp_min = low[i]
                    tmp_min_i = i
                elif close[i] > tmp_min + tmp_min * sigma:
                    bottoms.append([i, tmp_min_i, tmp_min])
                    up_zig = True
                    tmp_max = high[i]
                    tmp_max_i = i
        return tops, bottoms

    def _get_zigzag_swings(self, sigma: float = 0.01):
        tops, bottoms = self._directional_change(sigma=sigma)
        swings = pd.DataFrame(index=self._df.index)
        swings["HighLow"] = 0.0
        swings["Level"] = np.nan
        for t in tops:
            idx = t[1]
            if idx < len(swings):
                swings.iloc[idx, swings.columns.get_loc("HighLow")] = 1.0
                swings.iloc[idx, swings.columns.get_loc("Level")] = t[2]
        for b in bottoms:
            idx = b[1]
            if idx < len(swings):
                swings.iloc[idx, swings.columns.get_loc("HighLow")] = -1.0
                swings.iloc[idx, swings.columns.get_loc("Level")] = b[2]
        return swings

    def _ob_touch_score(self, obs, df, last_price):
        ob_upside = 0
        ob_downside = 0
        bull_obs_hit = [
            ob for ob in obs
            if not ob.get("mitigated", True)
            and ob.get("bottom", 0) <= last_price <= ob.get("top", 0)
            and ob["type"] == "Bullish"
        ]
        bear_obs_hit = [
            ob for ob in obs
            if not ob.get("mitigated", True)
            and ob.get("bottom", 0) <= last_price <= ob.get("top", 0)
            and ob["type"] == "Bearish"
        ]
        if bull_obs_hit or bear_obs_hit:
            ob_upside = 40 if len(bull_obs_hit) >= 2 else (20 if bull_obs_hit else 0)
            ob_downside = 40 if len(bear_obs_hit) >= 2 else (20 if bear_obs_hit else 0)
        else:
            active_obs = [ob for ob in obs if not ob.get("mitigated", True)]
            recent_df = df.iloc[-100:]
            for i in range(len(recent_df) - 1, -1, -1):
                row = recent_df.iloc[i]
                c_low, c_high = float(row["low"]), float(row["high"])
                touched_bull = any(
                    max(c_low, float(ob.get("bottom", 0))) <= min(c_high, float(ob.get("top", 0)))
                    for ob in active_obs if ob["type"] == "Bullish"
                )
                touched_bear = any(
                    max(c_low, float(ob.get("bottom", 0))) <= min(c_high, float(ob.get("top", 0)))
                    for ob in active_obs if ob["type"] == "Bearish"
                )
                if touched_bull and not touched_bear:
                    ob_upside = 20
                    break
                elif touched_bear and not touched_bull:
                    ob_downside = 20
                    break
        return ob_upside, ob_downside

    def _pattern_score(self, df, has_bull_ob, has_bear_ob):
        pat_upside = 0
        pat_downside = 0
        for i in range(len(df) - 1, max(0, len(df) - 51), -1):
            row = df.iloc[i]
            is_bull = bool(row.get("hammer")) or bool(row.get("bullish_engulfing"))
            is_bear = bool(row.get("inverse_hangingstone")) or bool(row.get("bearish_engulfing"))
            if is_bull and has_bull_ob:
                pat_upside = 20
                break
            if is_bear and has_bear_ob:
                pat_downside = 20
                break
        return pat_upside, pat_downside

    def _count_eqh_eql(self, df):
        eqh_count = 0
        eql_count = 0
        if "eqh_origin_index" in df.columns:
            highs_arr = df["high"].values
            lows_arr = df["low"].values
            for oi in df["eqh_origin_index"].dropna().astype(int).unique():
                if 0 <= oi < len(df) and not np.any(highs_arr[oi + 1:] > highs_arr[oi]):
                    eqh_count += 1
            for oi in df["eql_origin_index"].dropna().astype(int).unique():
                if 0 <= oi < len(df) and not np.any(lows_arr[oi + 1:] < lows_arr[oi]):
                    eql_count += 1
        return eqh_count, eql_count

    def _find_harmonics(self, tops, bottoms, err_thresh: float = 0.2):
        extremes = []
        for t in tops:
            extremes.append({"idx": t[1], "p": t[2], "type": 1})
        for b in bottoms:
            extremes.append({"idx": b[1], "p": b[2], "type": -1})
        extremes = sorted(extremes, key=lambda x: x["idx"])
        if len(extremes) < 5:
            return []
        found_patterns = []
        for i in range(4, len(extremes)):
            X, A, B, C, D = extremes[i - 4], extremes[i - 3], extremes[i - 2], extremes[i - 1], extremes[i]
            XA = abs(A["p"] - X["p"])
            AB = abs(B["p"] - A["p"])
            BC = abs(C["p"] - B["p"])
            CD = abs(D["p"] - C["p"])
            AD = abs(D["p"] - A["p"])
            if XA == 0:
                continue
            res_AB_XA = AB / XA
            res_BC_AB = BC / AB
            res_CD_BC = CD / BC
            is_bat = (0.3 < res_AB_XA < 0.6) and (0.3 < res_BC_AB < 0.9) and (1.5 < res_CD_BC < 2.7)
            if is_bat:
                found_patterns.append({
                    "points": [X, A, B, C, D],
                    "name": "BAT",
                    "bull": D["type"] == -1,
                })
        return found_patterns

    def _extract_bos_choch(self, bos_df: pd.DataFrame) -> list[dict]:
        import math
        levels = []
        for _, row in bos_df.iterrows():
            bos_val = row.get("BOS")
            choch_val = row.get("CHOCH")
            level_val = row.get("Level")
            bos_ok = bos_val is not None and not (isinstance(bos_val, float) and math.isnan(bos_val)) and float(bos_val) != 0
            choch_ok = choch_val is not None and not (isinstance(choch_val, float) and math.isnan(choch_val)) and float(choch_val) != 0
            if bos_ok or choch_ok:
                level = float(level_val) if level_val is not None and not (isinstance(level_val, float) and math.isnan(level_val)) else 0.0
                is_bullish = (float(bos_val) if bos_ok else float(choch_val)) > 0
                levels.append({
                    "type": "CHOCH" if choch_ok else "BOS",
                    "direction": "bullish" if is_bullish else "bearish",
                    "level": level,
                })
        return levels

    def generate_chart_html(self) -> str:
        if self._last_result is None:
            raise RuntimeError("Run analyze() first before generating chart")

        df = self._df
        last_price = self._last_price
        symbol = self.symbol
        interval = self.interval
        upside = self._prob_upside
        downside = self._prob_downside
        eqh_cnt = self._eqh_count
        eql_cnt = self._eql_count
        smc_results = self._smc_results
        tops = self._tops
        bottoms = self._bottoms
        obs = self._obs
        harmonics = self._harmonics

        if upside > downside:
            bias_emoji = "BULLISH"
        elif downside > upside:
            bias_emoji = "BEARISH"
        else:
            bias_emoji = "NEUTRAL"

        ohlc_data = []
        for ts, row in df.iterrows():
            ohlc_data.append({
                "time": ts.strftime("%Y-%m-%dT%H:%M:%S"),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
            })

        cutoff_idx = max(0, len(df) - 800)
        cutoff_time = df.index[cutoff_idx]

        patterns_json = []
        for ts_idx, row in df.iloc[cutoff_idx:].iterrows():
            ts_str = ts_idx.strftime("%Y-%m-%dT%H:%M:%S")
            if row.get("hammer"):
                patterns_json.append({"t": ts_str, "l": "H", "c": "#29B6F6", "pos": "below", "sh": "arrow_up"})
            if row.get("inverse_hammer"):
                patterns_json.append({"t": ts_str, "l": "IH", "c": "#29B6F6", "pos": "below", "sh": "arrow_up"})
            if row.get("bullish_engulfing"):
                patterns_json.append({"t": ts_str, "l": "BE", "c": "#00E676", "pos": "below", "sh": "arrow_up"})
            if row.get("hangingstone"):
                patterns_json.append({"t": ts_str, "l": "HS", "c": "#FF9800", "pos": "above", "sh": "arrow_down"})
            if row.get("inverse_hangingstone"):
                patterns_json.append({"t": ts_str, "l": "SS", "c": "#FF9800", "pos": "above", "sh": "arrow_down"})
            if row.get("bearish_engulfing"):
                patterns_json.append({"t": ts_str, "l": "BeE", "c": "#FF5252", "pos": "above", "sh": "arrow_down"})

        eqh_lines = []
        eql_lines = []
        if "eqh_origin_index" in df.columns:
            highs_all = df["high"].values
            lows_all = df["low"].values
            plotted_eqh = set()
            plotted_eql = set()
            for _, row in df.iloc[cutoff_idx:].iterrows():
                raw_eqh = row.get("eqh_origin_index")
                if not pd.isna(raw_eqh):
                    oi = int(raw_eqh)
                    if oi not in plotted_eqh and 0 <= oi < len(df):
                        plotted_eqh.add(oi)
                        level_val = float(highs_all[oi])
                        origin_ts = df.index[oi]
                        if origin_ts >= cutoff_time and not np.any(highs_all[oi + 1:] > level_val):
                            eqh_lines.append({
                                "time": origin_ts.strftime("%Y-%m-%dT%H:%M:%S"),
                                "level": level_val,
                            })
                raw_eql = row.get("eql_origin_index")
                if not pd.isna(raw_eql):
                    oi = int(raw_eql)
                    if oi not in plotted_eql and 0 <= oi < len(df):
                        plotted_eql.add(oi)
                        level_val = float(lows_all[oi])
                        origin_ts = df.index[oi]
                        if origin_ts >= cutoff_time and not np.any(lows_all[oi + 1:] < level_val):
                            eql_lines.append({
                                "time": origin_ts.strftime("%Y-%m-%dT%H:%M:%S"),
                                "level": level_val,
                            })

        ob_boxes = []
        last_timestamp = df.index[-1]
        for ob in obs:
            if ob.get("end_time") == last_timestamp:
                is_bull = ob["type"] == "Bullish"
                ob_boxes.append({
                    "start": ob["start_time"].strftime("%Y-%m-%dT%H:%M:%S"),
                    "end": ob["end_time"].strftime("%Y-%m-%dT%H:%M:%S"),
                    "top": float(ob["top"]),
                    "bottom": float(ob["bottom"]),
                    "type": ob["type"].lower(),
                    "fvg_time": ob.get("fvg_time", ob["start_time"]).strftime("%Y-%m-%dT%H:%M:%S"),
                    "border": "#00C076" if is_bull else "#EF4444",
                    "fill": "rgba(0,192,118,0.15)" if is_bull else "rgba(239,68,68,0.15)",
                })

        bos_lines = []
        bos_choch = smc_results.get("bos_choch", pd.DataFrame())
        if len(bos_choch) > 0:
            bos_cutoff_idx = max(0, len(df) - 150)
            last_close = df["close"].iloc[-1]
            bos_candidates = []
            for i in range(len(bos_choch)):
                row = bos_choch.iloc[i]
                if float(row.get("BOS", 0)) == 0 and float(row.get("CHOCH", 0)) == 0:
                    continue
                try:
                    idx = int(row["BrokenIndex"])
                    if idx < bos_cutoff_idx or idx >= len(df):
                        continue
                    level_val = float(row["Level"])
                    is_bull = float(row.get("BOS", 0)) == 1 or float(row.get("CHOCH", 0)) == 1
                    if is_bull and last_close < level_val:
                        continue
                    if not is_bull and last_close > level_val:
                        continue
                    label = "BOS" if float(row.get("BOS", 0)) != 0 else "CHoCH"
                    bos_candidates.append((idx, level_val, is_bull, label))
                except Exception:
                    continue
            for idx, level_val, is_bull, label in bos_candidates[-4:]:
                bos_lines.append({
                    "time": df.index[idx].strftime("%Y-%m-%dT%H:%M:%S"),
                    "level": level_val,
                    "is_bull": is_bull,
                    "label": label,
                })

        zigzag_lines = []
        extremes = []
        for t in tops:
            extremes.append({"idx": t[1], "price": t[2], "type": "TOP"})
        for b in bottoms:
            extremes.append({"idx": b[1], "price": b[2], "type": "BOTTOM"})
        extremes = sorted(extremes, key=lambda x: x["idx"])
        for i in range(1, len(extremes)):
            e1, e2 = extremes[i - 1], extremes[i]
            if e1["idx"] < cutoff_idx and e2["idx"] < cutoff_idx:
                continue
            zigzag_lines.append({
                "t1": df.index[e1["idx"]].strftime("%Y-%m-%dT%H:%M:%S"),
                "v1": e1["price"],
                "t2": df.index[e2["idx"]].strftime("%Y-%m-%dT%H:%M:%S"),
                "v2": e2["price"],
            })

        harmonic_lines = []
        for pat in harmonics:
            pts = pat["points"]
            if pts[0]["idx"] < cutoff_idx:
                continue
            connections = []
            for i in range(1, len(pts)):
                p1, p2 = pts[i - 1], pts[i]
                connections.append({
                    "t1": df.index[p1["idx"]].strftime("%Y-%m-%dT%H:%M:%S"),
                    "v1": p1["p"],
                    "t2": df.index[p2["idx"]].strftime("%Y-%m-%dT%H:%M:%S"),
                    "v2": p2["p"],
                })
            harmonic_lines.append({
                "name": f"{pat['name']} {'BULL' if pat['bull'] else 'BEAR'}",
                "connections": connections,
            })

        html = self._build_html(
            symbol, interval, last_price, upside, downside, eqh_cnt, eql_cnt, bias_emoji,
            ohlc_data, patterns_json, eqh_lines, eql_lines, ob_boxes, bos_lines,
            zigzag_lines, harmonic_lines,
        )
        return html

    def _build_html(self, symbol, interval, last_price, upside, downside,
                    eqh_cnt, eql_cnt, bias, ohlc_data, patterns, eqh_lines,
                    eql_lines, ob_boxes, bos_lines, zigzag_lines, harmonic_lines) -> str:
        import json as _json

        def js(v):
            return _json.dumps(v)

        info_text = (
            f"{symbol}  |  {interval}  |  "
            f"Price: {last_price:,.2f}  |  "
            f"Upside: {upside}%  |  Downside: {downside}%  |  "
            f"EQH: {eqh_cnt}  |  EQL: {eql_cnt}  |  Bias: {bias}"
        )

        return f'''<!DOCTYPE html>
<html lang="">
<head>
    <title>MMC Chart - {symbol}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: #0E1117;
            color: #DDE1E7;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden;
        }}
        #chart {{ width: 100vw; height: 100vh; }}
        #topbar {{
            display: flex; align-items: center; justify-content: center;
            padding: 8px 16px; background: #131722;
            border-bottom: 1px solid #2a2e39; font-size: 14px;
            color: #d1d4dc; min-height: 40px;
        }}
    </style>
</head>
<body>
    <div id="topbar">{info_text}</div>
    <div id="chart"></div>
    <script>
    (() => {{
        const chart = LightweightCharts.createChart(document.getElementById('chart'), {{
            layout: {{
                background: {{ color: '#0E1117' }},
                textColor: '#DDE1E7',
            }},
            grid: {{ vertLines: {{ visible: false }}, horzLines: {{ visible: false }} }},
            rightPriceScale: {{ borderColor: '#2a2e39' }},
            timeScale: {{ borderColor: '#2a2e39', timeVisible: true, secondsVisible: false }},
            crosshair: {{
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {{ color: '#6B6B6B', width: 1, style: LightweightCharts.LineStyle.Dashed, labelBackgroundColor: '#2a2e39' }},
                horzLine: {{ color: '#6B6B6B', width: 1, style: LightweightCharts.LineStyle.Dashed, labelBackgroundColor: '#2a2e39' }},
            }},
        }});

        const candleSeries = chart.addCandlestickSeries({{
            upColor: '#089981',
            downColor: '#F23645',
            borderUpColor: '#089981',
            borderDownColor: '#F23645',
            wickUpColor: '#089981',
            wickDownColor: '#F23645',
        }});

        candleSeries.setData({js(ohlc_data)});

        const markers = {js(patterns)};
        if (markers.length) {{
            candleSeries.setMarkers(markers.map(m => ({{
                time: m.t,
                position: m.pos,
                shape: m.sh,
                color: m.c,
                text: m.l,
            }})));
        }}

        const eqhLines = {js(eqh_lines)};
        eqhLines.forEach(line => {{
            chart.addLineSeries({{
                color: '#FFD700',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Solid,
                lastValueVisible: false,
                priceLineVisible: false,
            }}).setData([
                {{ time: line.time, value: line.level }},
                {{ time: ohlc_data[ohlc_data.length-1].time, value: line.level }},
            ]);
        }});

        const eqlLines = {js(eql_lines)};
        eqlLines.forEach(line => {{
            chart.addLineSeries({{
                color: '#FFD700',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Solid,
                lastValueVisible: false,
                priceLineVisible: false,
            }}).setData([
                {{ time: line.time, value: line.level }},
                {{ time: ohlc_data[ohlc_data.length-1].time, value: line.level }},
            ]);
        }});

        const obBoxes = {js(ob_boxes)};
        obBoxes.forEach(box => {{
            const topSeries = chart.addLineSeries({{
                color: box.border,
                lineWidth: 1,
                lastValueVisible: false,
                priceLineVisible: false,
            }});
            topSeries.setData([
                {{ time: box.start, value: box.top }},
                {{ time: box.end, value: box.top }},
            ]);
            const bottomSeries = chart.addLineSeries({{
                color: box.border,
                lineWidth: 1,
                lastValueVisible: false,
                priceLineVisible: false,
            }});
            bottomSeries.setData([
                {{ time: box.start, value: box.bottom }},
                {{ time: box.end, value: box.bottom }},
            ]);
            candleSeries.setMarkers((candleSeries.markers() || []).concat([{{
                time: box.fvg_time,
                position: box.type === 'bullish' ? 'below' : 'above',
                shape: 'circle',
                color: box.border,
                text: 'OB' + (box.type === 'bullish' ? '\\u2191' : '\\u2193'),
            }}]));
        }});

        const bosLines = {js(bos_lines)};
        bosLines.forEach(line => {{
            chart.addLineSeries({{
                color: line.is_bull ? '#00E676' : '#FF5252',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                lastValueVisible: false,
                priceLineVisible: false,
            }}).setData([
                {{ time: line.time, value: line.level }},
                {{ time: ohlc_data[ohlc_data.length-1].time, value: line.level }},
            ]);
        }});

        const zzLines = {js(zigzag_lines)};
        zzLines.forEach(line => {{
            chart.addLineSeries({{
                color: '#BB86FC',
                lineWidth: 1,
                lastValueVisible: false,
                priceLineVisible: false,
            }}).setData([
                {{ time: line.t1, value: line.v1 }},
                {{ time: line.t2, value: line.v2 }},
            ]);
        }});

        const harmonicData = {js(harmonic_lines)};
        harmonicData.forEach(pat => {{
            pat.connections.forEach(conn => {{
                chart.addLineSeries({{
                    color: '#03DAC6',
                    lineWidth: 2,
                    lastValueVisible: false,
                    priceLineVisible: false,
                }}).setData([
                    {{ time: conn.t1, value: conn.v1 }},
                    {{ time: conn.t2, value: conn.v2 }},
                ]);
            }});
        }});

        chart.timeScale().fitContent();
    }})();
    </script>
</body>
</html>'''

    def _fallback_result(self, reason: str) -> MMCAnalysisResult:
        return MMCAnalysisResult(
            symbol=self.symbol,
            timeframe=self.interval,
            upside_prob=0.0,
            downside_prob=0.0,
            bias="NEUTRAL",
            eqh_count=0,
            eql_count=0,
            probabilities={"error": reason},
        )
