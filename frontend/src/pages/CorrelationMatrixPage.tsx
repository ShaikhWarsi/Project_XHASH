import { useState } from 'react'
import Card from '../components/ui/Card'
import CorrelationHeatmap from '../components/CorrelationHeatmap'
export default function CorrelationMatrixPage() {
  const [window, setWindow] = useState(30)
  const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA']
  const mockMatrix = symbols.map(() => symbols.map(() => Math.random() * 2 - 1))
  symbols.forEach((_, i) => { mockMatrix[i][i] = 1 })
  return (
    <div className="flex flex-col gap-1.5">
      <Card title="CORRELATION MATRIX" actions={
        <select value={window} onChange={e => setWindow(Number(e.target.value))}
          className="bg-input border-input text-primary text-[10px] font-mono-data px-2 py-0.5 outline-none rounded-sm cursor-pointer">
          <option value={5}>5D</option><option value={15}>15D</option><option value={30}>30D</option><option value={60}>60D</option><option value={90}>90D</option>
        </select>
      }>
        <CorrelationHeatmap data={{ symbols, matrix: mockMatrix }} height={400} cellSize={40} />
      </Card>
    </div>
  )
}
