from openbb_charting.core.openbb_figure import OpenBBFigure
from openbb_charting.core.plotly_ta.ta_class import PlotlyTA


def to_chart(
    data,
    indicators=None,
    symbol="",
    candles=True,
    volume=True,
    prepost=False,
    volume_ticks_x=7,
):
    pta = PlotlyTA()
    fig = pta.plot(
        data,
        indicators=indicators,
        symbol=symbol,
        candles=candles,
        volume=volume,
        prepost=prepost,
        volume_ticks_x=volume_ticks_x,
    )
    return fig, fig.to_plotly_json()


__all__ = ["OpenBBFigure", "PlotlyTA", "to_chart"]
