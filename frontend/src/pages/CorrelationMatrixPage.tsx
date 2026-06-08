import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import CorrelationHeatmap from '../components/CorrelationHeatmap'

export default function CorrelationMatrixPage() {
  const [window, setWindow] = useState(30)
  const [matrix, setMatrix] = useState<number[][]>([])
  const [symbols, setSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const syms = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA']
    fetch(`/api/correlation/matrix?symbols=${syms.join(',')}&period_days=${window}`)
      .then(r => r.json())
      .then(data => {
        if (data.symbols && data.matrix) {
          setSymbols(data.symbols)
          setMatrix(data.matrix)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [window])

  return (
    <div className="flex flex-col gap-1.5">
      <Card title="CORRELATION MATRIX" actions={
        <select value={window} onChange={e => setWindow(Number(e.target.value))}
          className="bg-input border-input text-primary text-[10px] font-mono-data px-2 py-0.5 outline-none rounded-sm cursor-pointer">
          <option value={5}>5D</option><option value={15}>15D</option><option value={30}>30D</option><option value={60}>60D</option><option value={90}>90D</option>
        </select>
      }>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 10 }}>Loading correlation data...</div>
        ) : (
          <CorrelationHeatmap data={{ symbols, matrix }} height={400} cellSize={40} />
        )}
      </Card>
    </div>
  )
}
