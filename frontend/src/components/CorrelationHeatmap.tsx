import { useEffect, useRef, useMemo, useState, useCallback } from 'react'

interface CorrelationData {
  symbols: string[]
  matrix: number[][]
}

interface CorrelationHeatmapProps {
  data: CorrelationData
  height?: number
  draggable?: boolean
  cellSize?: number
  onReorder?: (symbols: string[], matrix: number[][]) => void
}

const DIVERGING_COLORS = [
  '#053061', '#2166ac', '#4393c3', '#92c5de', '#d1e5f0',
  '#f7f7f7',
  '#fddbc7', '#f4a582', '#d6604d', '#b2182b', '#67001f',
]

export default function CorrelationHeatmap({ data, height = 500, draggable, onReorder }: CorrelationHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<unknown>(null)
  const resizeRef = useRef<ResizeObserver | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [hoveredSymbol, setHoveredSymbol] = useState<number | null>(null)
  const [newSymbol, setNewSymbol] = useState('')
  const [orderedSymbols, setOrderedSymbols] = useState<string[]>(data.symbols)
  const [orderedMatrix, setOrderedMatrix] = useState<number[][]>(data.matrix)



  const displayData = useMemo(() => ({ symbols: orderedSymbols, matrix: orderedMatrix }), [orderedSymbols, orderedMatrix])

  const traceData = useMemo(() => {
    const { symbols, matrix } = displayData
    const z: number[][] = []
    const hovertext: string[][] = []
    for (let i = 0; i < symbols.length; i++) {
      const row: number[] = []
      const hoverRow: string[] = []
      for (let j = 0; j < symbols.length; j++) {
        const val = matrix[i]?.[j] ?? 0
        row.push(parseFloat(val.toFixed(4)))
        hoverRow.push(`${symbols[i]} / ${symbols[j]}<br>r = ${val.toFixed(4)}`)
      }
      z.push(row)
      hovertext.push(hoverRow)
    }
    return { z, hovertext }
  }, [displayData])

  const isDark = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') !== 'light' : true
  const textColor = isDark ? '#e8eaed' : '#212121'
  const bgColor = isDark ? '#0d1117' : '#ffffff'

  const plotHeight = draggable ? Math.max(100, height - 60) : height
  const symbolFontSize = Math.max(7, Math.min(11, Math.floor(40 / orderedSymbols.length)))
  const labelW = Math.max(30, Math.min(70, 360 / orderedSymbols.length))
  const labelH = 22

  useEffect(() => {
    if (!containerRef.current || orderedSymbols.length === 0) return

    const Plotly = (window as unknown as Record<string, unknown>).Plotly
    if (!Plotly) {
      import('plotly.js-dist-min' as string).then((mod: unknown) => {
        const p = (mod as Record<string, unknown>).default || mod
        renderChart(p as Record<string, unknown>)
      })
      return
    }
    renderChart(Plotly as Record<string, unknown>)

    function renderChart(Plotly: Record<string, unknown>) {
      const container = containerRef.current!
      const gridColor = isDark ? '#1a2332' : '#e0e0e0'

      const layout = {
        paper_bgcolor: bgColor,
        plot_bgcolor: bgColor,
        font: { color: textColor, size: 11, family: 'JetBrains Mono, monospace' },
        margin: draggable ? { l: 4, r: 40, b: 4, t: 4, pad: 2 } : { l: 60, r: 60, b: 60, t: 10, pad: 4 },
        xaxis: {
          tickvals: orderedSymbols.map((_, i) => i),
          ticktext: orderedSymbols,
          tickangle: draggable ? 0 : -45,
          side: 'top',
          showticklabels: !draggable,
          gridcolor: draggable ? 'transparent' : gridColor,
          linecolor: draggable ? 'transparent' : gridColor,
          zerolinecolor: gridColor,
        },
        yaxis: {
          tickvals: orderedSymbols.map((_, i) => i),
          ticktext: orderedSymbols,
          showticklabels: !draggable,
          gridcolor: draggable ? 'transparent' : gridColor,
          linecolor: draggable ? 'transparent' : gridColor,
          zerolinecolor: gridColor,
          autorange: 'reversed' as const,
        },
        width: container.clientWidth,
        height: plotHeight,
      }

      const trace = {
        z: traceData.z,
        x: orderedSymbols.map((_, i) => i),
        y: orderedSymbols.map((_, i) => i),
        xgap: 1,
        ygap: 1,
        type: 'heatmap' as const,
        colorscale: [
          [0, DIVERGING_COLORS[0]],
          [0.1, DIVERGING_COLORS[1]],
          [0.2, DIVERGING_COLORS[2]],
          [0.3, DIVERGING_COLORS[3]],
          [0.4, DIVERGING_COLORS[4]],
          [0.5, DIVERGING_COLORS[5]],
          [0.6, DIVERGING_COLORS[6]],
          [0.7, DIVERGING_COLORS[7]],
          [0.8, DIVERGING_COLORS[8]],
          [0.9, DIVERGING_COLORS[9]],
          [1, DIVERGING_COLORS[10]],
        ] as unknown as Record<string, unknown>[],
        zmin: -1,
        zmax: 1,
        zmid: 0,
        text: traceData.hovertext,
        hoverinfo: 'text' as const,
        hovertemplate: '%{text}<extra></extra>',
        showscale: true,
        colorbar: {
          title: { text: 'r', font: { color: textColor, size: 10 } },
          tickfont: { color: textColor, size: 10 },
          thickness: 15,
          len: 0.7,
          tickvals: [-1, -0.5, 0, 0.5, 1],
        },
      }

      try {
        if (chartRef.current) {
          (Plotly as any).react(container, [trace], layout, { responsive: true, displayModeBar: false })
        } else {
          (Plotly as any).newPlot(container, [trace], layout, { responsive: true, displayModeBar: false })
        }
        chartRef.current = container
      } catch (e) { console.warn('[CorrelationHeatmap] Plotly render failed:', e) }

      if (resizeRef.current) resizeRef.current.disconnect()
      resizeRef.current = new ResizeObserver(() => {
        (Plotly as any).Plots.resize(container)
      })
      resizeRef.current.observe(container!)
    }

    return () => {
      if (resizeRef.current) {
        resizeRef.current.disconnect()
        resizeRef.current = null
      }
      if (chartRef.current) {
        try {
          const Plotly = (window as unknown as Record<string, unknown>).Plotly
          ;(Plotly as Record<string, Function>)?.purge?.(chartRef.current)
        } catch (e) { console.warn('[CorrelationHeatmap] Plotly purge failed:', e) }
        chartRef.current = null
      }
    }
  }, [displayData, plotHeight, traceData, isDark, textColor, bgColor, draggable, orderedSymbols])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index))
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    setDragIndex(null)

    const newSymbols = [...orderedSymbols]
    const [movedSymbol] = newSymbols.splice(sourceIndex, 1)
    newSymbols.splice(targetIndex, 0, movedSymbol)

    const newMatrix = orderedMatrix.map(row => [...row])
    const [movedRow] = newMatrix.splice(sourceIndex, 1)
    newMatrix.splice(targetIndex, 0, movedRow)
    for (const row of newMatrix) {
      const [movedCol] = row.splice(sourceIndex, 1)
      row.splice(targetIndex, 0, movedCol)
    }

    setOrderedSymbols(newSymbols)
    setOrderedMatrix(newMatrix)
    onReorder?.(newSymbols, newMatrix)
  }, [orderedSymbols, orderedMatrix, onReorder])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
  }, [])

  const handleRemoveSymbol = useCallback((idx: number) => {
    const newSymbols = orderedSymbols.filter((_, i) => i !== idx)
    const newMatrix = orderedMatrix.filter((_, i) => i !== idx).map(row => row.filter((_, j) => j !== idx))
    setOrderedSymbols(newSymbols)
    setOrderedMatrix(newMatrix)
    setHoveredSymbol(null)
    onReorder?.(newSymbols, newMatrix)
  }, [orderedSymbols, orderedMatrix, onReorder])

  const handleAddSymbol = useCallback(() => {
    const sym = newSymbol.trim().toUpperCase()
    if (!sym || orderedSymbols.includes(sym)) return
    const n = orderedSymbols.length
    const newMatrix = orderedMatrix.map(row => [...row, 0])
    newMatrix.push(new Array(n + 1).fill(0))
    const newSymbols = [...orderedSymbols, sym]
    setOrderedSymbols(newSymbols)
    setOrderedMatrix(newMatrix)
    setNewSymbol('')
    onReorder?.(newSymbols, newMatrix)
  }, [newSymbol, orderedSymbols, orderedMatrix, onReorder])

  const inputStyle = {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: 2,
    padding: '2px 4px',
    color: 'var(--text-primary)',
    fontSize: 9,
    fontFamily: 'JetBrains Mono, monospace',
    outline: 'none',
    height: 20,
  }

  const buttonStyle = {
    background: 'var(--accent-blue)',
    border: 'none',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: 2,
    cursor: 'pointer' as const,
    fontSize: 9,
    fontFamily: 'JetBrains Mono, monospace',
    height: 20,
  }

  const labelChip = (sym: string, i: number, isY: boolean) => (
    <div key={sym}
      style={{
        textAlign: 'center' as const,
        padding: '0 2px',
        cursor: 'grab',
        fontSize: symbolFontSize,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--text-primary)',
        opacity: dragIndex === i ? 0.4 : 1,
        transition: 'opacity 0.15s',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isY ? 'flex-end' : 'center',
        gap: 2,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        height: isY ? '100%' : labelH,
        width: isY ? labelW : '100%',
        minWidth: 0,
        borderRight: isY ? '1px solid var(--border-color)' : 'none',
        borderBottom: !isY ? '1px solid var(--border-color)' : 'none',
        paddingRight: isY ? 4 : 0,
      }}
      draggable
      onDragStart={e => handleDragStart(e, i)}
      onDragOver={handleDragOver}
      onDrop={e => handleDrop(e, i)}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setHoveredSymbol(i)}
      onMouseLeave={() => setHoveredSymbol(null)}
      title={sym}
    >
      {sym}
      {hoveredSymbol === i && (
        <span onClick={e => { e.stopPropagation(); handleRemoveSymbol(i) }}
          style={{ cursor: 'pointer', color: '#ef5350', fontSize: 8, lineHeight: '8px', flexShrink: 0 }}>
          ×
        </span>
      )}
    </div>
  )

  if (orderedSymbols.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
        color: 'var(--text-secondary)', gap: 8,
      }}>
        <span>No correlation data available</span>
        {draggable && (
          <div style={{ display: 'flex', gap: 4 }}>
            <input type="text" value={newSymbol} onChange={e => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Add symbol..." style={{ ...inputStyle, width: 140 }}
              onKeyDown={e => e.key === 'Enter' && handleAddSymbol()} />
            <button onClick={handleAddSymbol} style={buttonStyle}>Add</button>
          </div>
        )}
      </div>
    )
  }

  if (draggable) {
    return (
      <div style={{ width: '100%', height, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', height: labelH }}>
          <div style={{ width: labelW, minWidth: labelW, height: labelH }} />
          {orderedSymbols.map((sym, i) => labelChip(sym, i, false))}
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ width: labelW, minWidth: labelW, display: 'flex', flexDirection: 'column' }}>
            {orderedSymbols.map((sym, i) => labelChip(sym, i, true))}
          </div>
          <div ref={containerRef} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, height: 24, alignItems: 'center' }}>
          <input type="text" value={newSymbol}
            onChange={e => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="Add symbol..." style={{ flex: 1, ...inputStyle }}
            onKeyDown={e => e.key === 'Enter' && handleAddSymbol()} />
          <button onClick={handleAddSymbol} style={buttonStyle}>Add</button>
        </div>
      </div>
    )
  }

  return <div ref={containerRef} style={{ width: '100%', height }} />
}
