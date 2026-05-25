import pandas as pd
import yfinance as yf
from price_action_concepts import PriceActionConcepts
from lightweight_charts import Chart
import time

def format_time(t):
    if isinstance(t, pd.Timestamp):
        return t.strftime('%Y-%m-%d %H:%M:%S')
    return str(t)

def visualize_pac(symbol="BTC-USD", period="1mo", interval="1h"):
    print(f"Downloading data for {symbol}...")
    df = yf.download(symbol, period=period, interval=interval)
    
    if df.empty:
        print("Failed to download data.")
        return

    # Handle Multi-index columns if they exist
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    
    # Calculate PAC
    print("Calculating Price Action Concepts...")
    pac_engine = PriceActionConcepts(df).calculate_all()
    results = pac_engine.get_results()
    
    # Initialize Chart
    chart = Chart(toolbox=True, width=1200, height=800)
    chart.set(df)
    
    # Colors
    BULL_COLOR = '#089981' # Green
    BEAR_COLOR = '#f23645' # Red
    SWING_BULL = '#006400'
    SWING_BEAR = '#8b0000'
    FVG_COLOR_UP = 'rgba(8, 153, 129, 0.2)'
    FVG_COLOR_DN = 'rgba(242, 54, 69, 0.2)'

    # 1. Plot Internal Market Structure
    print(f"Plotting {len(results['internal_ms'])} Internal Market Structure levels...")
    for ms in results['internal_ms']:
        color = BULL_COLOR if ms['trend'] == 1 else BEAR_COLOR
        label = ms['type']
        
        try:
            # Trend line with label
            chart.trend_line(
                format_time(ms['start_time']), ms['price'],
                format_time(ms['time']), ms['price'],
                color
            )
            # Add text label manually via marker since trend_line doesn't support text easily
            chart.marker(time=ms['time'], text=label, color=color, shape='arrow_up' if ms['trend'] == 1 else 'arrow_down', position='below' if ms['trend'] == 1 else 'above')
        except:
            pass

    # 2. Plot Swing Market Structure
    print(f"Plotting {len(results['swing_ms'])} Swing Market Structure levels...")
    for ms in results['swing_ms']:
        color = SWING_BULL if ms['trend'] == 1 else SWING_BEAR
        label = f"S-{ms['type']}"
        
        try:
            chart.trend_line(
                format_time(ms['start_time']), ms['price'],
                format_time(ms['time']), ms['price'],
                color
            )
            chart.marker(time=ms['time'], text=label, color=color, shape='arrow_up' if ms['trend'] == 1 else 'arrow_down', position='below' if ms['trend'] == 1 else 'above')
        except:
            pass

    # 3. Plot Order Blocks
    print(f"Plotting {len(results['order_blocks'])} Active Order Blocks...")
    for ob in results['order_blocks']:
        # Proper colors: Bullish = Green, Bearish = Red
        color = 'rgba(8, 153, 129, 0.5)' if ob['type'] == 'Bullish' else 'rgba(242, 54, 69, 0.5)'
        
        try:
            chart.box(
                format_time(ob['start_time']), ob['top'],
                format_time(ob['end_time']), ob['bottom'],
                color
            )
        except:
            # Fallback
            t1, t2 = format_time(ob['start_time']), format_time(ob['end_time'])
            v1, v2 = ob['top'], ob['bottom']
            chart.trend_line(t1, v1, t2, v1, color)
            chart.trend_line(t1, v2, t2, v2, color)
            chart.trend_line(t1, v1, t1, v2, color)
            chart.trend_line(t2, v1, t2, v2, color)

    # 4. Plot FVGs
    print(f"Plotting {len(results['fvgs'])} Active FVGs...")
    for fvg in results['fvgs']:
        color = FVG_COLOR_UP if fvg['type'] == 'Bullish' else FVG_COLOR_DN
        
        try:
            chart.box(
                format_time(fvg['start_time']), fvg['top'],
                format_time(fvg['end_time']), fvg['bottom'],
                color
            )
        except:
            pass

    print("Showing chart...")
    chart.show(block=True)

if __name__ == "__main__":
    visualize_pac()
