import { useState } from 'react'
import StreamResponse from './StreamResponse'
import { inspectPattern } from '../api/llm'

export interface InspectablePattern {
  type: string
  description: string
  confidence: number
  priceTarget: number
  stopLoss: number
  startTime: unknown
  endTime: unknown
}

export default function AIInspector({
  symbol,
  pattern,
  onClose,
}: {
  symbol: string
  pattern: InspectablePattern
  onClose: () => void
}) {
  const [visible, setVisible] = useState(true)

  const handleClose = () => {
    setVisible(false)
    onClose()
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md max-h-[70vh] overflow-y-auto rounded-md p-3"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-mono-data font-bold text-accent-cyan tracking-wider uppercase">
              Chart Inspector
            </span>
            <span className="text-[9px] text-muted ml-2">
              {symbol} · {pattern.type.replace(/_/g, ' ')}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="bg-transparent border border-default text-muted font-mono-data text-[9px] px-2 py-0.5 cursor-pointer rounded-sm"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 mb-2">
          <div className="px-1.5 py-0.5 rounded-sm text-center" style={{ background: 'var(--bg-hover)' }}>
            <div className="text-[7px] text-muted uppercase tracking-wider">Confidence</div>
            <div className="text-[10px] font-bold" style={{ color: pattern.confidence > 0.7 ? 'var(--accent-green)' : pattern.confidence > 0.4 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
              {(pattern.confidence * 100).toFixed(0)}%
            </div>
          </div>
          <div className="px-1.5 py-0.5 rounded-sm text-center" style={{ background: 'var(--bg-hover)' }}>
            <div className="text-[7px] text-muted uppercase tracking-wider">Target</div>
            <div className="text-[10px] font-bold text-accent-green">${pattern.priceTarget.toFixed(2)}</div>
          </div>
          <div className="px-1.5 py-0.5 rounded-sm text-center" style={{ background: 'var(--bg-hover)' }}>
            <div className="text-[7px] text-muted uppercase tracking-wider">Stop Loss</div>
            <div className="text-[10px] font-bold text-accent-red">${pattern.stopLoss.toFixed(2)}</div>
          </div>
        </div>

        <StreamResponse
          fetchStream={async (onToken) => {
            try {
              const res = await inspectPattern(symbol, pattern, `${pattern.description} | Target: $${pattern.priceTarget} | Stop: $${pattern.stopLoss}`)
              const reader = res.body?.getReader()
              if (!reader) return
              const decoder = new TextDecoder()
              let buffer = ''
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const parsed = JSON.parse(line.slice(6))
                      if (parsed.token) onToken(parsed.token)
                    } catch { /* ignore parse errors */ }
                  }
                }
              }
            } catch { /* ignore stream errors */ }
          }}
        />
      </div>
    </div>
  )
}
