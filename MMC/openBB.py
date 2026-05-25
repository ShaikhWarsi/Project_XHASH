import warnings
warnings.filterwarnings('ignore')

from openbb import obb
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
from scipy.signal import find_peaks

# Configure pandas display
pd.set_option('display.max_columns', None)
pd.set_option('display.precision', 4)

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
   rows=5, cols=1,
   shared_xaxes=True,
   vertical_spacing=0.03,
   row_heights=[0.4, 0.15, 0.15, 0.15, 0.15],
   subplot_titles=('BTC Price Action with Bollinger Bands', 'Volume', 'RSI', 'MACD', 'ATR (Volatility)')
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

fig.show()