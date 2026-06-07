import { useState, useEffect } from 'react'
import {
  MousePointer2, Crosshair, TrendingUp, ArrowUpRight, ArrowRightLeft,
  Minus, ArrowUpDown, Sigma, RectangleHorizontal, Circle, Triangle,
  AlignHorizontalDistributeCenter, Type, ArrowUp, Paintbrush, Fan,
  ArrowUpCircle, ArrowDownCircle, Undo2, Redo2, BarChart3, Layout, Settings2,
  Anchor, Ruler, Zap, Save, Link2, Link2Off, Plus, HelpCircle,
} from 'lucide-react'
import type { ToolType } from './DrawingTypes'
import type { ReactNode } from 'react'

interface ChartToolbarProps {
  activeTool: ToolType | null
  onToolSelect: (tool: ToolType | null) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  symbol: string
  interval: string
  chartType: string
  onChartTypeChange?: (type: string) => void
  onIndicatorAdd?: () => void
  onTemplates?: () => void
  onSaveLayout?: () => void
  onCompareAdd?: () => void
  crosshairLinked?: boolean
  onCrosshairLinkToggle?: () => void
  onShowShortcuts?: () => void
}

interface ToolDef {
  type: ToolType | null
  label: string
  icon: ReactNode
}

const TOOLS: ToolDef[] = [
  { type: null, label: 'Cursor', icon: <MousePointer2 size={12} /> },
  { type: 'crosshair', label: 'Crosshair', icon: <Crosshair size={12} /> },
  { type: 'trendline', label: 'Trend Line', icon: <TrendingUp size={12} /> },
  { type: 'ray', label: 'Ray', icon: <ArrowUpRight size={12} /> },
  { type: 'extended_line', label: 'Extended', icon: <ArrowRightLeft size={12} /> },
  { type: 'horizontal_line', label: 'Horizontal', icon: <Minus size={12} /> },
  { type: 'vertical_line', label: 'Vertical', icon: <ArrowUpDown size={12} /> },
  { type: 'fib_retracement', label: 'Fib Retrace', icon: <Sigma size={12} /> },
  { type: 'fib_extension', label: 'Fib Ext', icon: <><Sigma size={12} /><sup style={{fontSize:7}}>+</sup></> },
  { type: 'rectangle', label: 'Rectangle', icon: <RectangleHorizontal size={12} /> },
  { type: 'ellipse', label: 'Ellipse', icon: <Circle size={12} /> },
  { type: 'triangle', label: 'Triangle', icon: <Triangle size={12} /> },
  { type: 'channel', label: 'Channel', icon: <AlignHorizontalDistributeCenter size={12} /> },
  { type: 'text_label', label: 'Text', icon: <Type size={12} /> },
  { type: 'arrow', label: 'Arrow', icon: <ArrowUp size={12} /> },
  { type: 'brush', label: 'Brush', icon: <Paintbrush size={12} /> },
  { type: 'gann_fan', label: 'Gann Fan', icon: <Fan size={12} /> },
  { type: 'long_marker', label: 'Long Entry', icon: <ArrowUpCircle size={12} /> },
  { type: 'short_marker', label: 'Short Entry', icon: <ArrowDownCircle size={12} /> },
  { type: 'anchored_vwap', label: 'Anchored VWAP', icon: <Anchor size={12} /> },
  { type: 'ruler', label: 'Ruler', icon: <Ruler size={12} /> },
  { type: 'speed_resistance_lines', label: 'Speed Lines', icon: <Zap size={12} /> },
]

const SEPARATOR = <div className="shrink-0" style={{ width: 1, height: 14, background: 'var(--border-color)' }} />

function loadPrefs(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem('chart_toolbar_prefs') || '{}') } catch { return {} }
}

function savePrefs(prefs: Record<string, boolean>) {
  localStorage.setItem('chart_toolbar_prefs', JSON.stringify(prefs))
}

const CHART_TYPES = ['candle', 'line', 'area', 'renko', 'range', 'pnf', 'heikinashi']

const btnBase: React.CSSProperties = {
  background: 'transparent', color: 'var(--text-muted)',
  border: '1px solid var(--border-color)', borderRadius: 3,
  padding: '2px 6px', cursor: 'pointer', fontSize: 9, height: 22,
  display: 'flex', alignItems: 'center', gap: 3,
  transition: 'background 0.15s, color 0.15s',
}

export function ChartToolbar({
  activeTool, onToolSelect, onUndo, onRedo, canUndo, canRedo,
  symbol, interval, chartType, onChartTypeChange,
  onIndicatorAdd, onTemplates, onSaveLayout, onCompareAdd,
  crosshairLinked, onCrosshairLinkToggle, onShowShortcuts,
}: ChartToolbarProps) {
  const [customizing, setCustomizing] = useState(false)
  const [toolPrefs, setToolPrefs] = useState<Record<string, boolean>>(() => loadPrefs())
  const [showChartType, setShowChartType] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => { savePrefs(toolPrefs) }, [toolPrefs])

  const visibleTools = TOOLS.filter(t => toolPrefs[t.label] !== false)

  const toggleTool = (label: string) => {
    setToolPrefs(prev => ({ ...prev, [label]: prev[label] === false ? true : false }))
  }

  const activeStyle = (cond: boolean): React.CSSProperties => ({
    background: cond ? 'var(--accent-cyan)' : 'transparent',
    color: cond ? '#000' : 'var(--text-muted)',
    border: 'none', borderRadius: 3,
    width: 24, height: 22, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 1,
      padding: '2px 6px', background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      overflowX: 'auto', whiteSpace: 'nowrap',
      minHeight: 30,
    }}>
      <span className="font-mono-data" style={{ color: 'var(--accent-cyan)', fontSize: 10, fontWeight: 600, marginRight: 2 }}>{symbol}</span>

      {/* C3: Compare overlay + */}
      <button onClick={onCompareAdd} title="Compare Symbol"
        style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', borderRadius: 3, width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 4 }}>
        <Plus size={10} />
      </button>

      <span className="font-mono-data" style={{ color: 'var(--text-muted)', fontSize: 9, marginRight: 4 }}>{interval}</span>

      {SEPARATOR}

      {visibleTools.map((tool) => {
        const isActive = activeTool === tool.type
        return (
          <button
            key={tool.label}
            onClick={() => onToolSelect(tool.type)}
            title={tool.label}
            className="flex items-center justify-center"
            style={activeStyle(isActive)}
            onMouseEnter={(e) => {
              if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }
            }}
            onMouseLeave={(e) => {
              if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }
            }}
          >
            {tool.icon}
          </button>
        )
      })}

      {SEPARATOR}

      <button onClick={onIndicatorAdd} title="Add Indicator"
        className="flex items-center gap-1 font-mono-data"
        style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <BarChart3 size={10} />
        IND
      </button>

      {/* C5: Chart type dropdown */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowChartType(v => !v)} title="Chart Type"
          className="flex items-center gap-1 font-mono-data"
          style={btnBase}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <BarChart3 size={10} />
          {chartType.toUpperCase().slice(0, 4)}
        </button>
        {showChartType && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 4, padding: 4, minWidth: 120,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            {CHART_TYPES.map(ct => (
              <button key={ct} onClick={() => { onChartTypeChange?.(ct); setShowChartType(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: chartType === ct ? 'var(--bg-hover)' : 'transparent',
                  color: chartType === ct ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  border: 'none', padding: '3px 8px', cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, borderRadius: 2,
                }}>
                {ct === 'candle' ? 'Candlestick' : ct === 'line' ? 'Line' : ct === 'area' ? 'Area' : ct === 'renko' ? 'Renko' : ct === 'range' ? 'Range' : ct === 'pnf' ? 'Point & Figure' : 'Heikin Ashi'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* C1: Save Layout */}
      <button onClick={onSaveLayout} title="Save Layout"
        className="flex items-center gap-1 font-mono-data"
        style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Save size={10} />
      </button>

      {/* C2: Sync crosshair toggle */}
      <button onClick={onCrosshairLinkToggle} title={crosshairLinked ? 'Crosshair Linked' : 'Crosshair Unlinked'}
        style={{
          background: crosshairLinked ? 'var(--accent-cyan)' : 'transparent',
          color: crosshairLinked ? '#000' : 'var(--text-muted)',
          border: 'none', borderRadius: 3, width: 22, height: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {crosshairLinked ? <Link2 size={11} /> : <Link2Off size={11} />}
      </button>

      {/* Templates */}
      <button onClick={onTemplates} title="Templates"
        className="flex items-center gap-1 font-mono-data"
        style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Layout size={10} />
        TPL
      </button>

      {SEPARATOR}

      <button onClick={onUndo} disabled={!canUndo} title="Undo"
        className="flex items-center justify-center"
        style={{
          background: 'transparent', color: canUndo ? 'var(--text-muted)' : 'var(--border-color)',
          border: 'none', borderRadius: 3, width: 22, height: 22,
          cursor: canUndo ? 'pointer' : 'default',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { if (canUndo) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
        onMouseLeave={(e) => { if (canUndo) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
      >
        <Undo2 size={12} />
      </button>
      <button onClick={onRedo} disabled={!canRedo} title="Redo"
        className="flex items-center justify-center"
        style={{
          background: 'transparent', color: canRedo ? 'var(--text-muted)' : 'var(--border-color)',
          border: 'none', borderRadius: 3, width: 22, height: 22,
          cursor: canRedo ? 'pointer' : 'default',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { if (canRedo) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
        onMouseLeave={(e) => { if (canRedo) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
      >
        <Redo2 size={12} />
      </button>

      {SEPARATOR}

      {/* C19: Keyboard shortcuts ? */}
      <button onClick={() => { onShowShortcuts?.(); setShowShortcuts(true) }} title="Keyboard Shortcuts"
        style={{
          background: 'transparent', color: 'var(--text-muted)',
          border: 'none', borderRadius: 3, width: 22, height: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <HelpCircle size={11} />
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ position: 'relative' }}>
        <button onClick={() => setCustomizing(v => !v)} title="Customize Toolbar"
          className="flex items-center justify-center"
          style={{
            background: customizing ? 'var(--bg-hover)' : 'transparent',
            color: customizing ? 'var(--text-primary)' : 'var(--text-muted)',
            border: 'none', borderRadius: 3, width: 22, height: 22, cursor: 'pointer',
          }}>
          <Settings2 size={12} />
        </button>
        {customizing && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, zIndex: 100,
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 4, padding: 8, minWidth: 160,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#8b95a5', marginBottom: 4, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
              CUSTOMIZE TOOLBAR
            </div>
            {TOOLS.map(tool => (
              <label key={tool.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 4px', cursor: 'pointer', borderRadius: 2,
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={toolPrefs[tool.label] !== false}
                  onChange={() => toggleTool(tool.label)}
                  style={{ accentColor: 'var(--accent-blue)' }}
                />
                <span style={{ color: 'var(--text-primary)', fontSize: 9 }}>{tool.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
