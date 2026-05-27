self.onmessage = (e: MessageEvent) => {
  const { type, id, indicator, params, data } = e.data;

  if (type === 'compute') {
    let result: any[] = [];

    switch (indicator) {
      case 'SMA':
        result = computeSMA(data, params.period);
        break;
      case 'EMA':
        result = computeEMA(data, params.period);
        break;
      case 'RSI':
        result = computeRSI(data, params.period);
        break;
      case 'MACD':
        result = computeMACD(data, params.fast, params.slow, params.signal);
        break;
      case 'Bollinger Bands':
        result = computeBollingerBands(data, params.period, params.stdDev);
        break;
    }

    self.postMessage({ type: 'result', id, result });
  }
};

function computeSMA(data: any[], period: number) {
  const result: { time: any; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function computeEMA(data: any[], period: number) {
  const result: { time: any; value: number }[] = [];
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: ema });

  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: ema });
  }
  return result;
}

function computeRSI(data: any[], period: number) {
  const result: { time: any; value: number }[] = [];
  if (data.length < period + 1) return result;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff; else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) { avgGain = (avgGain * (period - 1) + diff) / period; avgLoss = (avgLoss * (period - 1)) / period; }
    else { avgLoss = (avgLoss * (period - 1) - diff) / period; avgGain = (avgGain * (period - 1)) / period; }

    if (avgLoss === 0) {
      result.push({ time: data[i].time, value: 100 });
    } else {
      const rs = avgGain / avgLoss;
      result.push({ time: data[i].time, value: 100 - 100 / (1 + rs) });
    }
  }
  return result;
}

function computeMACD(data: any[], fast: number, slow: number, signal: number) {
  const fastEMA = computeEMA(data, fast);
  const slowEMA = computeEMA(data, slow);
  const macdLine: { time: any; value: number }[] = [];
  for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
    macdLine.push({ time: fastEMA[i].time, value: fastEMA[i].value - slowEMA[i].value });
  }
  const signalLine = computeEMA(macdLine.map(m => ({ time: m.time, close: m.value })), signal);
  const histogram: { time: any; value: number }[] = [];
  for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
    histogram.push({ time: macdLine[i].time, value: macdLine[i].value - signalLine[i].value });
  }
  return { macdLine, signalLine, histogram } as any;
}

function computeBollingerBands(data: any[], period: number, stdDev: number) {
  const middle = computeSMA(data, period);
  const upper: { time: any; value: number }[] = [];
  const lower: { time: any; value: number }[] = [];

  for (let i = 0; i < middle.length; i++) {
    const idx = i + period - 1;
    let sumSqDiff = 0;
    for (let j = idx - period + 1; j <= idx; j++) {
      sumSqDiff += (data[j].close - middle[i].value) ** 2;
    }
    const std = Math.sqrt(sumSqDiff / period);
    upper.push({ time: middle[i].time, value: middle[i].value + stdDev * std });
    lower.push({ time: middle[i].time, value: middle[i].value - stdDev * std });
  }

  return { middle, upper, lower } as any;
}
