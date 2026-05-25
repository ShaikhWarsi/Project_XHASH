import pandas as pd
import yfinance as yf
from price_action_concepts import PriceActionConcepts
import mplfinance as mpf
import matplotlib.pyplot as plt

def test_with_real_data(symbol="BTC-USD", period="5d", interval="1h"):
    print(f"Downloading data for {symbol}...")
    df = yf.download(symbol, period=period, interval=interval)
    
    if df.empty:
        print("Failed to download data.")
        return

    # Handle Multi-index columns from yfinance
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    print("Calculating Price Action Concepts...")
    pac = PriceActionConcepts(df).calculate_all()
    
    # Prepare data for plotting
    plot_df = df.copy()
    
    # Create markers for BOS/CHoCH
    # We'll use scatter plots on top of the candle chart
    bos_bull_x = []
    bos_bull_y = []
    bos_bear_x = []
    bos_bear_y = []
    
    for ms in pac.internal_structure:
        if ms['trend'] == 1:
            bos_bull_x.append(ms['index'])
            bos_bull_y.append(ms['price'])
        else:
            bos_bear_x.append(ms['index'])
            bos_bear_y.append(ms['price'])

    # Add extra plots
    apds = []
    
    if bos_bull_x:
        # Create a series with the same index as plot_df
        bull_markers = pd.Series(index=plot_df.index, dtype=float)
        for x, y in zip(bos_bull_x, bos_bull_y):
            bull_markers.loc[x] = y
        apds.append(mpf.make_addplot(bull_markers, type='scatter', marker='^', markersize=100, color='green'))

    if bos_bear_x:
        bear_markers = pd.Series(index=plot_df.index, dtype=float)
        for x, y in zip(bos_bear_x, bos_bear_y):
            bear_markers.loc[x] = y
        apds.append(mpf.make_addplot(bear_markers, type='scatter', marker='v', markersize=100, color='red'))

    # Order Blocks as horizontal lines or boxes
    # For simplicity in this test, we'll just print them or draw the latest ones
    print(f"Found {len(pac.order_blocks)} Order Blocks.")
    print(f"Found {len(pac.internal_structure)} Internal Structure breaks.")
    print(f"Found {len(pac.fvgs)} FVGs.")
    
    # Plot
    print("Generating chart and saving to 'pac_chart.png'...")
    mpf.plot(plot_df, type='candle', style='charles', 
             title=f"Price Action Concepts: {symbol}",
             ylabel='Price',
             addplot=apds,
             volume=True,
             figsize=(12, 8),
             savefig='pac_chart.png')
    print("Chart saved successfully!")

if __name__ == "__main__":
    test_with_real_data()
