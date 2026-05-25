import pandas as pd
import yfinance as yf
from custom_ob import CustomOBStrategy
from lightweight_charts import Chart
import time

def visualize_custom_ob(symbol="BTC-USD", period="1mo", interval="1h"):
    print(f"Downloading data for {symbol}...")
    df = yf.download(symbol, period=period, interval=interval)
    
    if df.empty:
        print("Failed to download data.")
        return

    # Handle Multi-index columns if they exist
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    
    # Calculate Custom OBs
    print("Calculating Custom Order Blocks...")
    strategy = CustomOBStrategy(df)
    obs_all = strategy.calculate()
    
    # Filter for only active (unbroken) OBs
    # An OB is active if its end_time is the last available timestamp in the dataframe
    last_timestamp = df.index[-1]
    obs = [ob for ob in obs_all if ob['end_time'] == last_timestamp]
    
    # Initialize Chart
    chart = Chart(toolbox=True, width=1200, height=800)
    
    # Set dark theme manually
    try:
        chart.layout(background_color='#131722', text_color='#d1d4dc')
        chart.candle_style(up_color='#089981', down_color='#f23645',
                           border_up_color='#089981', border_down_color='#f23645',
                           wick_up_color='#089981', wick_down_color='#f23645')
    except:
        pass
    
    chart.set(df)
    
    def format_time(t):
        if isinstance(t, pd.Timestamp):
            return t.strftime('%Y-%m-%d %H:%M:%S')
        return str(t)

    # Plot Custom OBs
    print(f"Plotting {len(obs)} Custom Order Blocks...")
    
    # Track intersections for darker coloring
    intersections = []
    for i in range(len(obs)):
        for j in range(i + 1, len(obs)):
            ob1, ob2 = obs[i], obs[j]
            if ob1['type'] == ob2['type']:
                # Calculate Intersection
                t_start = max(ob1['start_time'], ob2['start_time'])
                t_end = min(ob1['end_time'], ob2['end_time'])
                v_top = min(ob1['top'], ob2['top'])
                v_bottom = max(ob1['bottom'], ob2['bottom'])
                
                if t_start < t_end and v_bottom < v_top:
                    intersections.append({
                        'start_time': t_start,
                        'end_time': t_end,
                        'top': v_top,
                        'bottom': v_bottom,
                        'type': ob1['type']
                    })

    # Plot Base OBs
    for ob in obs:
        if ob['type'] == 'Bullish':
            border_color = '#00ff64'
            fill_color = 'rgba(0, 255, 100, 0.2)' 
        else:
            border_color = '#ff3232'
            fill_color = 'rgba(255, 50, 50, 0.2)' 
        
        t1, t2 = format_time(ob['start_time']), format_time(ob['end_time'])
        v1, v2 = ob['top'], ob['bottom']

        try:
            chart.box(
                start_time=t1, 
                start_value=v1, 
                end_time=t2, 
                end_value=v2, 
                color=border_color, 
                fill_color=fill_color
            )
        except Exception as e:
            chart.trend_line(t1, v1, t2, v1, border_color, width=1)
            chart.trend_line(t1, v2, t2, v2, border_color, width=1)
            chart.trend_line(t1, v1, t1, v2, border_color, width=1)
            chart.trend_line(t2, v1, t2, v2, border_color, width=1)

        # 2. MARK THE FVG
        chart.marker(time=ob['fvg_time'], text="FVG", color=border_color, shape='circle', position='below' if ob['type'] == 'Bullish' else 'above')

    # Plot Overlap Intersections (Darker)
    print(f"Plotting {len(intersections)} overlapping zones...")
    for inter in intersections:
        if inter['type'] == 'Bullish':
            fill_color = 'rgba(0, 255, 100, 0.5)' # Darker Green
        else:
            fill_color = 'rgba(255, 50, 50, 0.5)' # Darker Red
        
        t1, t2 = format_time(inter['start_time']), format_time(inter['end_time'])
        v1, v2 = inter['top'], inter['bottom']
        
        try:
            # Drawing the overlap as another box with higher opacity
            chart.box(
                start_time=t1, 
                start_value=v1, 
                end_time=t2, 
                end_value=v2, 
                color='rgba(0,0,0,0)', # No border for overlap
                fill_color=fill_color
            )
        except:
            pass

    print("Showing chart...")
    chart.show(block=True)

if __name__ == "__main__":
    visualize_custom_ob()
