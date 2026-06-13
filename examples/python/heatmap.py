"""Example: Heatmap visualization using Plotly"""
import plotly.graph_objects as go
import numpy as np

np.random.seed(42)
symbols = [f"Asset_{i}" for i in range(10)]
dates = [f"Day_{d}" for d in range(20)]
data = np.random.randn(20, 10)

fig = go.Figure(
    data=go.Heatmap(
        z=data,
        x=symbols,
        y=dates,
        colorscale="RdYlGn",
        zmid=0,
        colorbar_title="Return",
    )
)

fig.update_layout(
    title="Asset Returns Heatmap",
    xaxis_title="Assets",
    yaxis_title="Date",
    width=900,
    height=600,
)

fig.show()
