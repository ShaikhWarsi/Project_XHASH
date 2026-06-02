export class WorkspaceDetacher {
  private windows: Map<string, Window> = new Map()

  detach(id: string, symbol: string, interval: string, config?: { chartType?: string; theme?: string }): Window | null {
    const existing = this.windows.get(id)
    if (existing && !existing.closed) {
      existing.focus()
      return existing
    }

    const w = window.open('', id, 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no')
    if (!w) return null

    const chartType = config?.chartType ?? 'candle'
    const theme = config?.theme ?? 'dark'

    w.document.write(this.buildHtml(id, symbol, interval, chartType, theme))
    w.document.close()

    w.addEventListener('beforeunload', () => {
      this.windows.delete(id)
    })

    const checkClosed = setInterval(() => {
      if (w.closed) {
        this.windows.delete(id)
        clearInterval(checkClosed)
      }
    }, 1000)

    this.windows.set(id, w)
    return w
  }

  close(id: string): void {
    const w = this.windows.get(id)
    if (w && !w.closed) {
      w.close()
    }
    this.windows.delete(id)
  }

  closeAll(): void {
    for (const w of this.windows.values()) {
      if (!w.closed) w.close()
    }
    this.windows.clear()
  }

  getDetachedCount(): number {
    let count = 0
    for (const [, w] of this.windows) {
      if (!w.closed) count++
    }
    return count
  }

  broadcast(type: string, data: unknown): void {
    for (const [, w] of this.windows) {
      if (!w.closed) {
        w.postMessage({ type, data }, '*')
      }
    }
  }

  private buildHtml(id: string, symbol: string, interval: string, chartType: string, theme: string): string {
    const bg = theme === 'dark' ? '#0f1118' : '#ffffff'
    const text = theme === 'dark' ? '#e8eaed' : '#1a1a2e'
    const muted = theme === 'dark' ? '#787c84' : '#9aa0a6'
    const border = theme === 'dark' ? '#2a2d3e' : '#e0e0e0'
    const card = theme === 'dark' ? '#1e2235' : '#f5f5f5'

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${symbol} - ${interval}</title>
<script src="https://unpkg.com/lightweight-charts@5.2.0/dist/lightweight-charts.standalone.production.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: ${bg};
  color: ${text};
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  overflow: hidden;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: ${card};
  border-bottom: 1px solid ${border};
  font-size: 11px;
  flex-shrink: 0;
  min-height: 30px;
}
.toolbar .symbol { color: #06b6d4; font-weight: 700; }
.toolbar .interval { color: ${muted}; }
.toolbar .close {
  margin-left: auto;
  background: none;
  border: 1px solid ${border};
  color: ${muted};
  cursor: pointer;
  padding: 2px 8px;
  font-family: inherit;
  font-size: 10px;
  border-radius: 2px;
}
.toolbar .close:hover { color: #ef4444; border-color: #ef4444; }
#chart { flex: 1; }
</style>
</head>
<body>
<div class="toolbar">
  <span class="symbol">${symbol}</span>
  <span class="interval">${interval}</span>
  <span style="color:${muted};font-size:9px">|</span>
  <span style="color:${muted};font-size:9px">${chartType}</span>
  <button class="close" onclick="window.close()">✕ Close</button>
</div>
<div id="chart"></div>
<script>
(function() {
  const chartEl = document.getElementById('chart');
  const chart = LightweightCharts.createChart(chartEl, {
    layout: { background: { type: 'solid', color: '${bg}' }, textColor: '${text}' },
    grid: { vertLines: { color: '${border}' }, horzLines: { color: '${border}' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '${border}' },
    timeScale: { borderColor: '${border}', timeVisible: true, secondsVisible: false },
    watermark: { text: '${symbol}', color: '${muted}', fontSize: 32, visible: true, horzAlign: 'center', vertAlign: 'center' },
  });

  const candleSeries = chart.addCandlestickSeries({
    upColor: '#22c55e', downColor: '#ef4444',
    borderUpColor: '#22c55e', borderDownColor: '#ef4444',
    wickUpColor: '#22c55e', wickDownColor: '#ef4444',
  });

  chart.timeScale().fitContent();

  window.addEventListener('resize', function() {
    chart.applyOptions({ width: chartEl.clientWidth, height: chartEl.clientHeight });
  });

  function connectWS() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(proto + '//' + window.location.host + '/ws/chart?symbol=' + symbol + '&interval=' + interval);
    ws.onmessage = function(ev) {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'bar' && msg.data) {
          candleSeries.update(msg.data);
        } else if (msg.type === 'bars' && Array.isArray(msg.data)) {
          candleSeries.setData(msg.data);
          chart.timeScale().fitContent();
        }
      } catch(e) {}
    };
    ws.onclose = function() { setTimeout(connectWS, 3000); };
  }
  connectWS();

  window.addEventListener('message', function(ev) {
    if (ev.data && ev.data.type) {
      var msg = ev.data;
      if (msg.type === 'interval' && msg.data) {
        chart.applyOptions({ timeScale: { timeVisible: msg.data.seconds } });
      }
    }
  });

  if (window.opener) {
    window.opener.postMessage({ type: 'detached_ready', id: '${id}', symbol: '${symbol}' }, '*');
  }
})();
</script>
</body>
</html>`
  }
}
