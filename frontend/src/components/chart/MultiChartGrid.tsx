import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { ChartEngine } from './ChartEngine'
import type { ChartThemeColors } from './ChartTheme'
import type { BarData } from '../../api/types'

type LayoutMode = 'single' | '2x1' | '1x2' | '2x2'

export interface MultiChartGridHandle {
  getEngine: (index: number) => ChartEngine | null
  getFocusedEngine: () => ChartEngine | null
}

interface MultiChartGridProps {
  layoutMode: LayoutMode
  data: BarData[]
  symbol: string
  interval: string
  themeColors: ChartThemeColors
  focusedCell: number
  onFocusCell: (index: number) => void
  onChartReady?: (index: number, engine: ChartEngine) => void
}

const GRID_CONFIG: Record<LayoutMode, { cols: number; rows: number }> = {
  single: { cols: 1, rows: 1 },
  '2x1': { cols: 2, rows: 1 },
  '1x2': { cols: 1, rows: 2 },
  '2x2': { cols: 2, rows: 2 },
}

const CELL_HEADER_STYLE: React.CSSProperties = {
  fontSize: '9px',
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  color: 'var(--text-muted, #5d6b7e)',
  padding: '1px 4px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flexShrink: 0,
  lineHeight: '14px',
  userSelect: 'none',
}

export const MultiChartGrid = forwardRef<MultiChartGridHandle, MultiChartGridProps>(function MultiChartGrid(
  { layoutMode, data, symbol, interval, themeColors, focusedCell, onFocusCell, onChartReady },
  ref,
) {
  const engineMap = useRef<Map<number, ChartEngine>>(new Map())
  const containerRefs = useRef<(HTMLDivElement | null)[]>([])
  const onChartReadyRef = useRef(onChartReady)
  onChartReadyRef.current = onChartReady

  const { cols, rows } = GRID_CONFIG[layoutMode]
  const cellCount = cols * rows

  useImperativeHandle(ref, () => ({
    getEngine: (index: number) => engineMap.current.get(index) ?? null,
    getFocusedEngine: () => engineMap.current.get(focusedCell) ?? null,
  }))

  useEffect(() => {
    for (const [, engine] of engineMap.current) {
      engine.destroy()
    }
    engineMap.current.clear()

    const bars = data.map((bar) => ({
      time: bar.time as any,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }))

    for (let i = 0; i < cellCount; i++) {
      const container = containerRefs.current[i]
      if (!container) continue

      const engine = new ChartEngine({
        symbol,
        interval,
        data: bars,
        container,
        width: container.clientWidth || 400,
        height: container.clientHeight || 200,
        theme: themeColors,
      })

      engineMap.current.set(i, engine)
      onChartReadyRef.current?.(i, engine)
    }

    return () => {
      for (const [, engine] of engineMap.current) {
        engine.destroy()
      }
      engineMap.current.clear()
    }
  }, [layoutMode])

  useEffect(() => {
    if (engineMap.current.size === 0) return
    const bars = data.map((bar) => ({
      time: bar.time as any,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }))
    for (const [, engine] of engineMap.current) {
      engine.setMainSeries(bars)
      engine.setChartInterval(interval)
    }
  }, [data, symbol, interval])

  useEffect(() => {
    for (const [, engine] of engineMap.current) {
      engine.applyTheme(themeColors)
    }
  }, [themeColors])

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '2px',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    width: '100%',
    height: '100%',
    minHeight: 0,
  }

  const cells = Array.from({ length: cellCount }, (_, i) => i)

  return (
    <div style={gridStyle}>
      {cells.map((i) => {
        const isFocused = i === focusedCell
        return (
          <div
            key={i}
            data-cell-id={i}
            onClick={() => onFocusCell(i)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              border: `1px solid ${isFocused ? 'var(--accent-blue, #3b82f6)' : 'var(--border-color, #1a2332)'}`,
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              minHeight: 0,
            }}
          >
            <div style={CELL_HEADER_STYLE}>
              {symbol} {interval}
            </div>
            <div
              ref={(el) => { containerRefs.current[i] = el }}
              style={{
                flex: 1,
                minHeight: 0,
                position: 'relative',
              }}
            />
          </div>
        )
      })}
    </div>
  )
})
