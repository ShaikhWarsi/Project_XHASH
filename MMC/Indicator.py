"""
@pyne

This code was compiled by PyneComp — the Pine Script to Python compiler.
Accessible via PyneSys: https://pynesys.io
Run with open-source PyneCore: https://pynecore.org
"""
from pynecore.lib import (
    barcolor, close, color, high, hl2, input, location, low, math, na, nz,
    open, plot, plotarrow, plotshape, request, script, shape, strategy, syminfo, ta
)
from pynecore.types import PersistentSeries, Series


@script.strategy("Sniper & Strategy by CSBender_", shorttitle="Sniper & Strategy by CSBender_", overlay=True, pyramiding=0, initial_capital=1)
def main(
    Piriod=input.timeframe("720", "Signal TF"),
    channel3=input.bool(False, "Connect Projection High/Low"),
    tf2=input.timeframe("1", "Trend Projection TF"),
    len0=input.int(13, "EMA 1"),
    len02=input.int(21, "EMA 2"),
    show_hma=input.bool(False, "Display Hull MA"),
    hma_base_length=input.int(8),
    hma_length_scalar=input.int(5),
    Factor=input.int(1, "Trend Transition Signal"),
    Pd=input.int(1)
):
    ch1 = request.security(syminfo.tickerid, Piriod, open)
    ch2 = request.security(syminfo.tickerid, Piriod, close)

    longCondition = ta.crossover(ch2, ch1)
    shortCondition = ta.crossunder(ch2, ch1)

    if longCondition:
        strategy.entry('Long', strategy.long)

    if shortCondition:
        strategy.entry('Short', strategy.short)

    plotshape(longCondition, style=shape.labelup, color=color.lime, text='Buy Signal', textcolor=color.black, location=location.belowbar)
    plotshape(shortCondition, style=shape.labeldown, color=color.red, text='Sell Signal')

    spfc2: Series = request.security(syminfo.tickerid, tf2, close)

    plot(spfc2 if channel3 else spfc2 if spfc2 == nz(spfc2[1]) else na, color=color.blue, linewidth=2)

    mysignal: Series = ta.ema(close, 13) - ta.ema(close, 26)
    barcolor(color.green if mysignal > mysignal[1] else color.red)

    ema0 = ta.ema(close, len0)

    direction = 1 if ta.rising(ema0, 2) else -1 if ta.falling(ema0, 2) else 0
    plot_color = color.lime if direction > 0 else color.red if direction < 0 else na

    plot(ema0, linewidth=2, color=plot_color)

    ema02 = ta.ema(close, len02)

    direction2 = 1 if ta.rising(ema02, 2) else -1 if ta.falling(ema02, 2) else 0
    plot_color2 = color.lime if direction2 > 0 else color.red if direction2 < 0 else na

    plot(ema02, linewidth=2, color=plot_color2)

    def hullma(src, length):
        return ta.wma(2 * ta.wma(src, length / 2) - ta.wma(src, length), math.round(math.sqrt(length)))

    plot(hullma(close, hma_base_length + hma_length_scalar * 6) if show_hma else na, color=color.black, linewidth=2)

    Up = hl2 - Factor * ta.atr(Pd)
    Dn = hl2 + Factor * ta.atr(Pd)

    TrendUp: PersistentSeries[float] = na(float)
    TrendDown: PersistentSeries[float] = na(float)
    Trend: PersistentSeries[int] = 0

    TrendUp = Up if na(TrendUp[1]) else math.max(Up, TrendUp[1]) if close[1] > TrendUp[1] else Up
    TrendDown = Dn if na(TrendDown[1]) else math.min(Dn, TrendDown[1]) if close[1] < TrendDown[1] else Dn
    Trend = 1 if close > TrendDown[1] else -1 if close < TrendUp[1] else nz(Trend[1])

    plotarrow(1 if Trend == 1 and Trend[1] == -1 else na, colorup=color.lime)
    plotarrow(-1 if Trend == -1 and Trend[1] == 1 else na, colordown=color.red)

    slow: int = 8
    fast: int = 5

    vh1 = ta.ema(ta.highest(math.avg(low, close), fast), 5)
    vl1 = ta.ema(ta.lowest(math.avg(high, close), slow), 8)

    e_ema1 = ta.ema(close, 1)
    e_ema2 = ta.ema(e_ema1, 1)
    e_ema3 = ta.ema(e_ema2, 1)

    tema = e_ema1 - e_ema2 + e_ema3

    e_e1 = ta.ema(close, 8)
    e_e2 = ta.ema(e_e1, 5)

    dema = 2 * e_e1 - e_e2

    signal: Series = math.max(vh1, vl1) if tema > dema else math.min(vh1, vl1)

    is_call = tema > dema and signal > low and (signal - signal[1] > signal[1] - signal[2])
    is_put = tema < dema and signal < high and (signal[1] - signal > signal[2] - signal[1])

    plotshape(is_call, title='BUY', color=color.green, text='B', style=shape.arrowup, location=location.belowbar)
    plotshape(is_put, title='SELL', color=color.red, text='S', style=shape.arrowdown)
