from __future__ import annotations

from typing import Any, Dict, List


class StrategyCompiler:
    def compile(self, config: Dict[str, Any]) -> str:
        name = config.get("name", "Generated Strategy")
        entry_rules = config.get("entry_rules", [])
        position_config = config.get("position_config", {})
        pyramiding_rules = config.get("pyramiding_rules", {})
        risk_management = config.get("risk_management", {})

        code = self._get_header(name)
        code += self._get_parameters(position_config, pyramiding_rules, risk_management)
        code += self._get_indicators_calculation(entry_rules)
        code += self._get_entry_logic(entry_rules)
        code += self._get_core_loop(position_config, pyramiding_rules, risk_management)
        code += self._get_output_section(name, entry_rules)
        return code

    def _get_header(self, name: str) -> str:
        return f"""
import pandas as pd
import numpy as np

def get_val(arr, i, default=0):
    if i < 0 or i >= len(arr): return default
    return arr[i]
"""

    def _get_parameters(self, pos_config: Dict, pyr_rules: Dict, risk_mgmt: Dict) -> str:
        initial_size = pos_config.get("initial_size_pct", 10) / 100.0
        leverage = pos_config.get("leverage", 1)
        max_pyramiding = pos_config.get("max_pyramiding", 0)

        pyr_enabled = pyr_rules.get("enabled", False)
        add_size = pyr_rules.get("size_pct", 0) / 100.0 if pyr_enabled else 0
        add_threshold = pyr_rules.get("value", 0) / 100.0

        stop_loss = risk_mgmt.get("stop_loss", {})
        sl_enabled = stop_loss.get("enabled", False)
        sl_pct = stop_loss.get("value", 0) / 100.0 if sl_enabled else 0.0

        trailing = risk_mgmt.get("trailing_stop", {})
        ts_enabled = trailing.get("enabled", False)
        ts_activation = trailing.get("activation_profit", 0) / 100.0
        ts_callback = trailing.get("callback_pct", 0) / 100.0

        return f"""
initial_position_pct = {initial_size}
leverage = {leverage}
max_pyramiding = {max_pyramiding}

add_position_pct = {add_size}
add_threshold_pct = {add_threshold}

stop_loss_pct = {sl_pct}
take_profit_activation = {ts_activation}
trailing_callback = {ts_callback}
"""

    def _get_indicators_calculation(self, rules: List[Dict]) -> str:
        code = ""
        calculated = set()

        for rule in rules:
            ind = rule.get("indicator")
            params = rule.get("params", {})

            if ind == "supertrend":
                key = f"st_{params.get('period')}_{params.get('multiplier')}"
                if key not in calculated:
                    code += f"""
period = {params.get('period', 14)}
multiplier = {params.get('multiplier', 3.0)}
df['hl2'] = (df['high'] + df['low']) / 2
df['tr'] = np.maximum(df['high'] - df['low'], np.maximum(abs(df['high'] - df['close'].shift(1)), abs(df['low'] - df['close'].shift(1))))
df['atr'] = df['tr'].ewm(alpha=1/period, adjust=False).mean()
df['basic_upper'] = df['hl2'] + (multiplier * df['atr'])
df['basic_lower'] = df['hl2'] - (multiplier * df['atr'])

final_upper = [0.0] * len(df)
final_lower = [0.0] * len(df)
trend = [1] * len(df)
close_arr = df['close'].values
basic_upper = np.nan_to_num(df['basic_upper'].values)
basic_lower = np.nan_to_num(df['basic_lower'].values)

for i in range(1, len(df)):
    if basic_upper[i] < final_upper[i-1] or close_arr[i-1] > final_upper[i-1]:
        final_upper[i] = basic_upper[i]
    else:
        final_upper[i] = final_upper[i-1]

    if basic_lower[i] > final_lower[i-1] or close_arr[i-1] < final_lower[i-1]:
        final_lower[i] = basic_lower[i]
    else:
        final_lower[i] = final_lower[i-1]

    prev_trend = trend[i-1]
    if prev_trend == -1 and close_arr[i] > final_upper[i-1]:
        trend[i] = 1
    elif prev_trend == 1 and close_arr[i] < final_lower[i-1]:
        trend[i] = -1
    else:
        trend[i] = prev_trend

df['st_trend'] = trend
df['st_upper'] = final_upper
df['st_lower'] = final_lower
"""
                    calculated.add(key)

            elif ind == "ema":
                period = params.get("period", 20)
                key = f"ema_{period}"
                if key not in calculated:
                    code += f"\ndf['ema_{period}'] = df['close'].ewm(span={period}, adjust=False).mean()\n"
                    calculated.add(key)

            elif ind == "rsi":
                period = params.get("period", 14)
                key = f"rsi_{period}"
                if key not in calculated:
                    code += f"""
delta = df['close'].diff()
gain = (delta.where(delta > 0, 0)).rolling(window={period}).mean()
loss = (-delta.where(delta < 0, 0)).rolling(window={period}).mean()
rs = gain / loss
df['rsi_{period}'] = 100 - (100 / (1 + rs))
"""
                    calculated.add(key)

            elif ind == "macd":
                fast = params.get("fast_period", 12)
                slow = params.get("slow_period", 26)
                signal = params.get("signal_period", 9)
                key = f"macd_{fast}_{slow}_{signal}"
                if key not in calculated:
                    code += f"""
exp1 = df['close'].ewm(span={fast}, adjust=False).mean()
exp2 = df['close'].ewm(span={slow}, adjust=False).mean()
df['macd_line'] = exp1 - exp2
df['macd_signal'] = df['macd_line'].ewm(span={signal}, adjust=False).mean()
df['macd_hist'] = df['macd_line'] - df['macd_signal']
"""
                    calculated.add(key)

            elif ind == "bollinger":
                period = params.get("period", 20)
                std_dev = params.get("std_dev", 2.0)
                key = f"bb_{period}_{std_dev}"
                if key not in calculated:
                    code += f"""
sma = df['close'].rolling(window={period}).mean()
std = df['close'].rolling(window={period}).std()
df['bb_upper'] = sma + ({std_dev} * std)
df['bb_lower'] = sma - ({std_dev} * std)
df['bb_mid'] = sma
"""
                    calculated.add(key)

            elif ind == "ma":
                period = params.get("period", 20)
                ma_type = params.get("ma_type", "sma")
                key = f"ma_{ma_type}_{period}"
                if key not in calculated:
                    if ma_type == "ema":
                        code += f"\ndf['ma'] = df['close'].ewm(span={period}, adjust=False).mean()\n"
                    else:
                        code += f"\ndf['ma'] = df['close'].rolling(window={period}).mean()\n"
                    calculated.add(key)

        return code

    def _get_entry_logic(self, rules: List[Dict]) -> str:
        code = """
df['raw_buy'] = False
df['raw_sell'] = False
"""
        conditions_buy = []
        conditions_sell = []

        for rule in rules:
            ind = rule.get("indicator")
            params = rule.get("params", {})

            if ind == "supertrend":
                signal = rule.get("signal", "trend_bullish")
                if signal == "trend_bullish":
                    conditions_buy.append("(df['st_trend'] == 1) & (df['st_trend'].shift(1) == -1)")
                    conditions_sell.append("(df['st_trend'] == -1) & (df['st_trend'].shift(1) == 1)")
                elif signal == "is_uptrend":
                    conditions_buy.append("(df['st_trend'] == 1)")
                    conditions_sell.append("(df['st_trend'] == -1)")

            elif ind == "ema":
                period = params.get("period", 20)
                operator = rule.get("operator", "price_above")
                col = "df['ema_{}']".format(period)
                if operator == "price_above":
                    conditions_buy.append(f"(df['close'] > {col})")
                    conditions_sell.append(f"(df['close'] < {col})")
                elif operator == "price_below":
                    conditions_buy.append(f"(df['close'] < {col})")
                    conditions_sell.append(f"(df['close'] > {col})")
                elif operator == "cross_up":
                    conditions_buy.append(f"(df['close'] > {col}) & (df['close'].shift(1) <= {col}.shift(1))")
                    conditions_sell.append(f"(df['close'] < {col}) & (df['close'].shift(1) >= {col}.shift(1))")
                elif operator == "cross_down":
                    conditions_buy.append(f"(df['close'] < {col}) & (df['close'].shift(1) >= {col}.shift(1))")
                    conditions_sell.append(f"(df['close'] > {col}) & (df['close'].shift(1) <= {col}.shift(1))")

            elif ind == "rsi":
                period = params.get("period", 14)
                operator = rule.get("operator", "<")
                thresh = params.get("threshold", 30)
                col = f"df['rsi_{period}']"
                if operator == "<":
                    conditions_buy.append(f"({col} < {thresh})")
                    conditions_sell.append(f"({col} > {100 - thresh})")
                elif operator == ">":
                    conditions_buy.append(f"({col} > {thresh})")
                    conditions_sell.append(f"({col} < {100 - thresh})")
                elif operator == "cross_up":
                    conditions_buy.append(f"({col} > {thresh}) & ({col}.shift(1) <= {thresh})")
                    conditions_sell.append(f"({col} < {100 - thresh}) & ({col}.shift(1) >= {100 - thresh})")
                elif operator == "cross_down":
                    conditions_buy.append(f"({col} < {thresh}) & ({col}.shift(1) >= {thresh})")
                    conditions_sell.append(f"({col} > {100 - thresh}) & ({col}.shift(1) <= {100 - thresh})")

        if conditions_buy:
            code += f"\ndf['raw_buy'] = {' & '.join(conditions_buy)}\n"
        if conditions_sell:
            code += f"\ndf['raw_sell'] = {' & '.join(conditions_sell)}\n"

        return code

    def _get_core_loop(self, pos_config: Dict, pyr_rules: Dict, risk_mgmt: Dict) -> str:
        return """
open_long_signals = [False] * len(df)
close_long_signals = [False] * len(df)
open_short_signals = [False] * len(df)
close_short_signals = [False] * len(df)

open_long_price = [0.0] * len(df)
close_long_price = [0.0] * len(df)
close_long_text = [None] * len(df)
open_short_price = [0.0] * len(df)
close_short_price = [0.0] * len(df)
close_short_text = [None] * len(df)

position = 0
position_count = 0
avg_entry_price = 0.0
highest_price = 0.0

close_arr = df['close'].values
high_arr = df['high'].values
low_arr = df['low'].values
raw_buy_arr = df['raw_buy'].values
raw_sell_arr = df['raw_sell'].values

for i in range(len(df)):
    current_close = close_arr[i]
    current_high = high_arr[i]
    current_low = low_arr[i]

    if position == 1:
        if current_high > highest_price:
            highest_price = current_high

        profit_pct = (highest_price - avg_entry_price) / avg_entry_price

        if take_profit_activation > 0 and profit_pct >= take_profit_activation:
            drawdown = (highest_price - current_close) / avg_entry_price
            if drawdown >= trailing_callback:
                close_long_signals[i] = True
                close_long_price[i] = current_close
                close_long_text[i] = "Trailing Stop"
                position = 0
                position_count = 0
                continue

        if stop_loss_pct > 0:
            loss_pct = (avg_entry_price - current_low) / avg_entry_price
            if loss_pct >= stop_loss_pct:
                close_long_signals[i] = True
                close_long_price[i] = avg_entry_price * (1 - stop_loss_pct)
                close_long_text[i] = "Stop Loss"
                position = 0
                position_count = 0
                continue

        if raw_sell_arr[i]:
            close_long_signals[i] = True
            close_long_price[i] = current_close
            close_long_text[i] = "Signal Exit"
            position = 0
            position_count = 0
            continue

    elif position == -1:
        if highest_price == 0:
            highest_price = avg_entry_price
        if current_low < highest_price:
            highest_price = current_low

        profit_pct = (avg_entry_price - highest_price) / avg_entry_price

        if take_profit_activation > 0 and profit_pct >= take_profit_activation:
            drawdown = (current_close - highest_price) / avg_entry_price
            if drawdown >= trailing_callback:
                close_short_signals[i] = True
                close_short_price[i] = current_close
                close_short_text[i] = "Trailing Stop"
                position = 0
                position_count = 0
                continue

        if stop_loss_pct > 0:
            loss_pct = (current_high - avg_entry_price) / avg_entry_price
            if loss_pct >= stop_loss_pct:
                close_short_signals[i] = True
                close_short_price[i] = avg_entry_price * (1 + stop_loss_pct)
                close_short_text[i] = "Stop Loss"
                position = 0
                position_count = 0
                continue

        if raw_buy_arr[i]:
            close_short_signals[i] = True
            close_short_price[i] = current_close
            close_short_text[i] = "Signal Exit"
            position = 0
            position_count = 0
            continue

    else:
        if raw_buy_arr[i]:
            open_long_signals[i] = True
            open_long_price[i] = current_close
            position = 1
            position_count = 1
            avg_entry_price = current_close
            highest_price = current_close

        elif raw_sell_arr[i]:
            open_short_signals[i] = True
            open_short_price[i] = current_close
            position = -1
            position_count = 1
            avg_entry_price = current_close
            highest_price = current_close

df['open_long'] = open_long_signals
df['close_long'] = close_long_signals
df['open_long_price'] = [p if s else None for p, s in zip(open_long_price, open_long_signals)]
df['close_long_price'] = [p if s else None for p, s in zip(close_long_price, close_long_signals)]
df['close_long_text'] = close_long_text
"""

    def _get_output_section(self, name: str, rules: List[Dict]) -> str:
        plots = []
        for rule in rules:
            ind = rule.get("indicator")
            params = rule.get("params", {})
            if ind == "supertrend":
                plots.append({'name': "SuperTrend Up", 'type': "line", 'data': "df['st_lower'].tolist()", 'color': "#00FF00", 'overlay': True})
                plots.append({'name': "SuperTrend Down", 'type': "line", 'data': "df['st_upper'].tolist()", 'color': "#FF0000", 'overlay': True})
            elif ind == "ema":
                p = params.get("period", 20)
                plots.append({'name': f"EMA {p}", 'type': "line", 'data': f"df['ema_{p}'].tolist()", 'color': "#FFA500", 'overlay': True})
            elif ind == "rsi":
                p = params.get("period", 14)
                plots.append({'name': f"RSI {p}", 'type': "line", 'data': f"df['rsi_{p}'].tolist()", 'color': "#8884d8", 'overlay': False})

        plots_py = "[\n"
        for p in plots:
            plots_py += f"    {{'name': '{p['name']}', 'type': '{p['type']}', 'data': {p['data']}, 'color': '{p['color']}', 'overlay': {p['overlay']}}},\n"
        plots_py += "]"

        return f"""
output = {{
    "name": "{name}",
    "plots": {plots_py},
    "signals": [
        {{"name": "Open Long", "type": "buy", "data": df['open_long_price'].tolist(), "color": "#00FF00", "text": "Open Long"}},
        {{"name": "Close Long", "type": "sell", "data": df['close_long_price'].tolist(), "color": "#FF6600", "text": "Close Long"}},
    ]
}}
"""
