import warnings
warnings.filterwarnings('ignore')

from openbb import obb
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
from scipy.signal import find_peaks
from master_strategy import C_BULL_OB, C_BEAR_OB, C_BULL_SMC, C_BEAR_SMC, C_EQH_EQL, C_HAMMER, C_BULL_ENG, C_BEAR_ENG, C_HANGING, C_ZIGZAG, C_HARMONIC

# Configure pandas display
pd.set_option('display.max_columns', None)
pd.set_option('display.precision', 4)

from master_strategy import MasterStrategy

# Fetch BTC data
btc = obb.crypto.price.historical(
   symbol="BTCUSD",
   provider="yfinance",
   interval="15m",
   start_date=(datetime.now() - timedelta(days=50)).strftime("%Y-%m-%d")
).to_df()



# Calculate advanced indicators
btc['SMA_20'] = btc['close'].rolling(20).mean()
btc['SMA_50'] = btc['close'].rolling(50).mean()
btc['SMA_200'] = btc['close'].rolling(200).mean()

# Bollinger Bands
btc['BB_middle'] = btc['close'].rolling(20).mean()
btc['BB_std'] = btc['close'].rolling(20).std()
btc['BB_upper'] = btc['BB_middle'] + (btc['BB_std'] * 2)
btc['BB_lower'] = btc['BB_middle'] - (btc['BB_std'] * 2)
btc['BB_width'] = (btc['BB_upper'] - btc['BB_lower']) / btc['BB_middle']

# RSI
delta = btc['close'].diff()
gain = (delta.where(delta > 0, 0)).rolling(14).mean()
loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
rs = gain / loss
btc['RSI'] = 100 - (100 / (1 + rs))

# MACD
exp1 = btc['close'].ewm(span=12).mean()
exp2 = btc['close'].ewm(span=26).mean()
btc['MACD'] = exp1 - exp2
btc['MACD_signal'] = btc['MACD'].ewm(span=9).mean()
btc['MACD_hist'] = btc['MACD'] - btc['MACD_signal']

# ATR (Average True Range)
btc['TR'] = np.maximum(
   btc['high'] - btc['low'],
   np.maximum(
       abs(btc['high'] - btc['close'].shift()),
       abs(btc['low'] - btc['close'].shift())
   )
)
btc['ATR'] = btc['TR'].rolling(14).mean()

# Identify support/resistance levels using peaks
peaks_high, _ = find_peaks(btc['high'], distance=20, prominence=btc['high'].std())
peaks_low, _ = find_peaks(-btc['low'], distance=20, prominence=btc['low'].std())

resistance_levels = btc['high'].iloc[peaks_high].nlargest(3).values
support_levels = btc['low'].iloc[peaks_low].nsmallest(3).values

print(f"\n🎯 Current BTC Price: ${btc['close'].iloc[-1]:,.2f}")
print(f"📊 RSI: {btc['RSI'].iloc[-1]:.2f} {'(Overbought)' if btc['RSI'].iloc[-1] > 70 else '(Oversold)' if btc['RSI'].iloc[-1] < 30 else '(Neutral)'}")
print(f"📈 MACD: {'Bullish' if btc['MACD'].iloc[-1] > btc['MACD_signal'].iloc[-1] else 'Bearish'}")
print(f"💪 Volatility (BB Width): {btc['BB_width'].iloc[-1]:.4f}")
print(f"\n🔴 Resistance Levels: {', '.join([f'${x:,.0f}' for x in resistance_levels])}")
print(f"🟢 Support Levels: {', '.join([f'${x:,.0f}' for x in support_levels])}")

# Create comprehensive chart
fig = make_subplots(
   rows=6, cols=1,
   shared_xaxes=True,
   vertical_spacing=0.03,
   row_heights=[0.4, 0.15, 0.15, 0.15, 0.15, 0.2],
   subplot_titles=('BTC Price Action with Bollinger Bands', 'Volume', 'RSI', 'MACD', 'ATR (Volatility)', 'Signals')
)

# Price + Bollinger Bands + Support/Resistance
fig.add_trace(go.Candlestick(
   x=btc.index,
   open=btc['open'],
   high=btc['high'],
   low=btc['low'],
   close=btc['close'],
   name='BTC',
   increasing_line_color='#00ff41',
   decreasing_line_color='#ff4444'
), row=1, col=1)

fig.add_trace(go.Scatter(x=btc.index, y=btc['SMA_20'], name='SMA 20', line=dict(color='cyan', width=1)), row=1, col=1)
fig.add_trace(go.Scatter(x=btc.index, y=btc['SMA_50'], name='SMA 50', line=dict(color='yellow', width=1)), row=1, col=1)
fig.add_trace(go.Scatter(x=btc.index, y=btc['SMA_200'], name='SMA 200', line=dict(color='red', width=2)), row=1, col=1)

fig.add_trace(go.Scatter(x=btc.index, y=btc['BB_upper'], name='BB Upper', line=dict(color='gray', dash='dash', width=1)), row=1, col=1)
fig.add_trace(go.Scatter(x=btc.index, y=btc['BB_lower'], name='BB Lower', line=dict(color='gray', dash='dash', width=1), fill='tonexty', fillcolor='rgba(128,128,128,0.1)'), row=1, col=1)

# Add support/resistance lines
for level in resistance_levels:
   fig.add_hline(y=level, line_dash="dot", line_color="red", opacity=0.5, row=1, col=1)
for level in support_levels:
   fig.add_hline(y=level, line_dash="dot", line_color="green", opacity=0.5, row=1, col=1)

# Volume
fig.add_trace(go.Bar(x=btc.index, y=btc['volume'], name='Volume', marker_color='rgba(255,165,0,0.5)'), row=2, col=1)



print("Starting MasterStrategy calculations... this may take a moment.")
master = MasterStrategy(btc)
upside, downside, obs, smc_results, eqh_cnt, eql_cnt, zigzag, harmonics = master.calculate_probabilities()
print("MasterStrategy calculations complete. Adding layers to the chart...")

last_ts = btc.index[-1]
last_close = btc['close'].iloc[-1]
bias = "BULLISH" if upside > downside else ("BEARISH" if downside > upside else "NEUTRAL")
bull_obs_hit = any((not ob.get('mitigated')) and ob.get('type') == 'Bullish' and ob.get('bottom') <= last_close <= ob.get('top') for ob in obs)
bear_obs_hit = any((not ob.get('mitigated')) and ob.get('type') == 'Bearish' and ob.get('bottom') <= last_close <= ob.get('top') for ob in obs)
pr = master.df.iloc[-1]
is_bull = bool(pr.get('hammer')) or bool(pr.get('bullish_engulfing')) or bool(pr.get('inverse_hammer'))
is_bear = bool(pr.get('inverse_hangingstone')) or bool(pr.get('bearish_engulfing')) or bool(pr.get('hangingstone'))
signal = 'HOLD'
if upside > downside and (bull_obs_hit or is_bull):
    signal = 'BUY'
elif downside > upside and (bear_obs_hit or is_bear):
    signal = 'SELL'
print(f"ALERT: {signal} | Bias: {bias} | Price: {last_close:.2f}")
fig.add_annotation(x=last_ts, y=last_close, text=signal, showarrow=True, arrowhead=2, ax=0, ay=-30, font=dict(color='#00E676' if signal=='BUY' else ('#FF5252' if signal=='SELL' else '#DDE1E7'), size=16), row=1, col=1)
fig.add_annotation(xref='paper', yref='paper', x=0.01, y=1.03, text=f"Bias: {bias} | Signal: {signal} | Price: {last_close:.2f}", showarrow=False)

# Add MasterStrategy plots
cutoff_idx  = max(0, len(btc) - 800)

# Limit the number of items to plot to avoid performance issues
MAX_ITEMS_TO_PLOT = 20

# Plot recent Order Blocks
recent_obs = [ob for ob in obs if ob['start_time'] >= btc.index[cutoff_idx]][-MAX_ITEMS_TO_PLOT:]
for ob in recent_obs:
    fig.add_shape(
        type="rect",
        x0=ob['start_time'],
        y0=ob['bottom'],
        x1=ob['end_time'],
        y1=ob['top'],
        line=dict(color=C_BULL_OB if ob['type'] == 'Bullish' else C_BEAR_OB),
        fillcolor=C_BULL_OB if ob['type'] == 'Bullish' else C_BEAR_OB,
        opacity=0.2,
        layer="below",
        row=1, col=1
    )

# Plot recent Swing Highs/Lows
swings = smc_results['swings'].iloc[cutoff_idx:]
recent_swings = swings[swings['HighLow'] != 0].tail(MAX_ITEMS_TO_PLOT)
for i, swing in recent_swings.iterrows():
    fig.add_annotation(
        x=i,
        y=swing['Level'],
        text="H" if swing['HighLow'] == 1 else "L",
        showarrow=True,
        arrowhead=1,
        ax=0,
        ay=-20 if swing['HighLow'] == 1 else 20,
        row=1, col=1
    )

# Plot recent BOS/CHoCH
bos_choch = smc_results['bos_choch'].iloc[cutoff_idx:]
recent_bos_choch = bos_choch[(bos_choch['BOS'] != 0) | (bos_choch['CHOCH'] != 0)].tail(MAX_ITEMS_TO_PLOT)
for i, bc in recent_bos_choch.iterrows():
    fig.add_shape(
        type="line",
        x0=i,
        y0=bc['Level'],
        x1=btc.index[-1],
        y1=bc['Level'],
        line=dict(
            color=C_BULL_SMC if bc['BOS'] == 1 or bc['CHOCH'] == 1 else C_BEAR_SMC,
            width=1,
            dash="dot",
        ),
        row=1, col=1
    )

# RSI
fig.add_trace(go.Scatter(x=btc.index, y=btc['RSI'], name='RSI', line=dict(color='orange', width=2)), row=3, col=1)
fig.add_hline(y=70, line_dash="dash", line_color="red", opacity=0.5, row=3, col=1)
fig.add_hline(y=30, line_dash="dash", line_color="green", opacity=0.5, row=3, col=1)

# MACD
fig.add_trace(go.Scatter(x=btc.index, y=btc['MACD'], name='MACD', line=dict(color='blue', width=1.5)), row=4, col=1)
fig.add_trace(go.Scatter(x=btc.index, y=btc['MACD_signal'], name='Signal', line=dict(color='red', width=1.5)), row=4, col=1)
fig.add_trace(go.Bar(x=btc.index, y=btc['MACD_hist'], name='Histogram', marker_color='gray'), row=4, col=1)

# ATR (Volatility)
fig.add_trace(go.Scatter(x=btc.index, y=btc['ATR'], name='ATR', line=dict(color='purple', width=2), fill='tozeroy'), row=5, col=1)

# Cutoff for display (last 800 bars)
cutoff_idx  = max(0, len(btc) - 800)
pattern_df = master.df.iloc[cutoff_idx:]

# Add annotations for candle patterns
pattern_df = master.df.iloc[cutoff_idx:]
recent_patterns = pattern_df[(pattern_df['hammer'] != 0) | (pattern_df['inverse_hammer'] != 0) | (pattern_df['bullish_engulfing'] != 0) | (pattern_df['hangingstone'] != 0) | (pattern_df['inverse_hangingstone'] != 0) | (pattern_df['bearish_engulfing'] != 0)].tail(MAX_ITEMS_TO_PLOT)
for i, row in recent_patterns.iterrows():
    if row['hammer']:
        fig.add_annotation(x=i, y=row['low'], text="H", showarrow=False, yshift=-10, row=1, col=1)
    if row['inverse_hammer']:
        fig.add_annotation(x=i, y=row['low'], text="IH", showarrow=False, yshift=-10, row=1, col=1)
    if row['bullish_engulfing']:
        fig.add_annotation(x=i, y=row['low'], text="BE", showarrow=False, yshift=-10, row=1, col=1)
    if row['hangingstone']:
        fig.add_annotation(x=i, y=row['high'], text="HS", showarrow=False, yshift=10, row=1, col=1)
    if row['inverse_hangingstone']:
        fig.add_annotation(x=i, y=row['high'], text="SS", showarrow=False, yshift=10, row=1, col=1)
    if row['bearish_engulfing']:
        fig.add_annotation(x=i, y=row['high'], text="BeE", showarrow=False, yshift=10, row=1, col=1)

# Add liquidity lines
liquidity = smc_results['liquidity'].iloc[cutoff_idx:]
recent_liquidity = liquidity[liquidity['Liquidity'] != 0].tail(MAX_ITEMS_TO_PLOT)
for i, liq in recent_liquidity.iterrows():
    if pd.isna(liq['End']):
        continue
    fig.add_shape(
        type="line",
        x0=i,
        y0=liq['Level'],
        x1=btc.index[int(liq['End'])],
        y1=liq['Level'],
        line=dict(
            color=C_EQH_EQL,
            width=2,
        ),
        row=1, col=1
    )
    if not pd.isna(liq['Swept']):
        fig.add_annotation(
            x=btc.index[int(liq['Swept'])],
            y=liq['Level'],
            text="✓",
            showarrow=False,
            yshift=10 if liq['Liquidity'] == 1 else -10,
            row=1, col=1
        )

# Add ZigZag lines
tops, bottoms = zigzag
extremes = []
for t in tops:
    if t[1] >= cutoff_idx:
        extremes.append({'idx': t[1], 'price': t[2]})
for b in bottoms:
    if b[1] >= cutoff_idx:
        extremes.append({'idx': b[1], 'price': b[2]})
extremes = sorted(extremes, key=lambda x: x['idx'])[-MAX_ITEMS_TO_PLOT:]

for i in range(1, len(extremes)):
    fig.add_trace(go.Scatter(
        x=[btc.index[extremes[i-1]['idx']], btc.index[extremes[i]['idx']]],
        y=[extremes[i-1]['price'], extremes[i]['price']],
        mode='lines',
        line=dict(color=C_ZIGZAG, width=1),
        showlegend=False
    ), row=1, col=1)

# Add harmonic patterns
recent_harmonics = [p for p in harmonics if p['points'][0]['idx'] >= cutoff_idx][-MAX_ITEMS_TO_PLOT:]
for p in recent_harmonics:
    points = p['points']
    x_coords = [btc.index[pt['idx']] for pt in points]
    y_coords = [pt['p'] for pt in points]
    fig.add_trace(go.Scatter(
        x=x_coords,
        y=y_coords,
        mode='lines+markers',
        line=dict(color=C_HARMONIC, width=2),
        name=p['name']
    ), row=1, col=1)

fig.update_layout(
   title='Bitcoin Complete Technical Analysis Dashboard',
   template='plotly_dark',
   height=1400,
   showlegend=True,
   xaxis_rangeslider_visible=False
)

fig.update_yaxes(title_text="Price (USD)", row=1, col=1)
fig.update_yaxes(title_text="Volume", row=2, col=1)
fig.update_yaxes(title_text="RSI", row=3, col=1)
fig.update_yaxes(title_text="MACD", row=4, col=1)
fig.update_yaxes(title_text="ATR", row=5, col=1)
fig.update_yaxes(title_text="Signal", row=6, col=1)

# Plot historical BUY/SELL signals based on BOS/CHoCH in row 6
for i, bc in recent_bos_choch.iterrows():
    if bc['BOS'] == 1:
        fig.add_annotation(x=i, y=0.8, text="BUY", showarrow=False, font=dict(color='#00E676', size=10), xref='x', yref='y6', row=6, col=1)
    elif bc['BOS'] == -1:
        fig.add_annotation(x=i, y=0.2, text="SELL", showarrow=False, font=dict(color='#FF5252', size=10), xref='x', yref='y6', row=6, col=1)

fig.write_html("btc_chart.html")
print("\nChart has been saved to btc_chart.html. Please open this file in a web browser.")