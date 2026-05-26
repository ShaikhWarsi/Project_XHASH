import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchOHLCV, fetchTechnicalAnalysis, fetchTAChart } from '../api/client'
import type { BarData } from '../api/types'
import { useWebSocket } from '../hooks/useWebSocket'
import { useToastStore } from '../store/toast'
import { ChartEngine } from '../components/chart/ChartEngine'
import { ChartToolbar } from '../components/chart/ChartToolbar'
import { TimeframeSelector } from '../components/chart/TimeframeSelector'
import { ObjectTree } from '../components/chart/ui/ObjectTree'
import { IndicatorSearch } from '../components/chart/ui/IndicatorSearch'
import { IndicatorParams } from '../components/chart/ui/IndicatorParams'
import { IndicatorPane } from '../components/chart/drawings/indicators/IndicatorPane'
import { DrawingProperties } from '../components/chart/ui/DrawingProperties'
import { CompareSymbol } from '../components/chart/ui/CompareSymbol'
import { ChartSettings } from '../components/chart/ui/ChartSettings'
import { LayoutBuilder } from '../components/chart/ui/LayoutBuilder'
import OpenBBChart from '../components/chart/plotly/OpenBBChart'
import TAIndicatorPanel from '../components/chart/plotly/TAIndicatorPanel'
import ErrorBoundary from '../components/ErrorBoundary'
import TimeMachine from '../components/chart/TimeMachine'
import LayerPanel from '../components/chart/LayerPanel'
import type { ChartLayer } from '../components/chart/LayerPanel'
import { type IndicatorPreset } from '../components/chart/drawings/indicators/IndicatorManager'
import type { ToolType, DrawingStyle } from '../components/chart/DrawingTypes'
import type { IndicatorConfig } from '../components/chart/DrawingTypes'
import { MultiChartSync } from '../components/chart/MultiChartSync'
import type { ChartThemeColors, ThemeName } from '../components/chart/ChartTheme'
import { getThemeColors, applyThemeToDocument, getStoredTheme, storeTheme, DARK_THEME } from '../components/chart/ChartTheme'
import ChartTemplates from '../components/ChartTemplates'
import Spinner from '../components/Spinner'
import CorrelationHeatmap from '../components/CorrelationHeatmap'
import WorkspaceManager from '../components/WorkspaceManager'
import type { SupportResistanceLevel } from '../components/chart/drawings/LevelsManager'

type ChartStyle = 'candle' | 'line' | 'area'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export default function ChartPage() {
  const [searchParams] = useSearchParams()
  const [symbol, _setSymbol] = useState(() => searchParams.get('symbol') || 'AAPL')
  const [interval, setIntervalState] = useState('1d')
  const [data, setData] = useState<BarData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTool, setActiveTool] = useState<ToolType | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [showIndicatorSearch, setShowIndicatorSearch] = useState(false)
  const [selectedIndicatorPreset, setSelectedIndicatorPreset] = useState<IndicatorPreset | null>(null)
  const [indicatorParams, setIndicatorParams] = useState<Record<string, number>>({})
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([])
  const [showDrawingProps, setShowDrawingProps] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [showChartSettings, setShowChartSettings] = useState(false)
  const [showLayout, setShowLayout] = useState(false)
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candle')
  const [drawingsCount, setDrawingsCount] = useState(0)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [figureJSON, setFigureJSON] = useState<any>(null)
  const [taIndicators, setTAIndicators] = useState<Record<string, Record<string, number | number[]>>>({})
  const [taChartKey, setTAChartKey] = useState(0)
  const [showTimeMachine, setShowTimeMachine] = useState(false)
  const [replayIndex, setReplayIndex] = useState<number | null>(null)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [layerOrder, setLayerOrder] = useState<Record<string, number>>({})
  const [_renderTick, setRenderTick] = useState(0)
  const [showTemplates, setShowTemplates] = useState(false)
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme())
  const themeColors = getThemeColors(theme)
  const [showCorrelation, setShowCorrelation] = useState(false)
  const [correlationData, setCorrelationData] = useState<any>(null)
  const [correlationLoading, setCorrelationLoading] = useState(false)
  const [correlationSymbols, setCorrelationSymbols] = useState('')
  const [comparisonSymbols, setComparisonSymbols] = useState<string[]>([])
  const [chartSync] = useState(() => new MultiChartSync())
  const [timeMachineSynced, setTimeMachineSynced] = useState(false)
  const [showSignals, setShowSignals] = useState(false)
  const [signalsData, setSignalsData] = useState<any>(null)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [levels, setLevels] = useState<SupportResistanceLevel[]>([])

  const addToast = useToastStore((s) => s.addToast)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ChartEngine | null>(null)
  const chartInitialized = useRef(false)
  const dataRef = useRef<BarData[]>([])
  const loadingDataRef = useRef(false)

  const wsUrl = `/ws/prices?symbols=${symbol}`
  const { lastData: wsPriceData, connected: wsConnected } = useWebSocket<any>(wsUrl)

  const setChartData = useCallback((bars: BarData[]) => {
    if (!chartRef.current) return
    const chartData = bars.map((bar) => ({
      time: bar.time as any,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }))
    chartRef.current.setMainSeries(chartData)
  }, [])

  useEffect(() => {
    applyThemeToDocument(themeColors)
  }, [themeColors])

  useEffect(() => {
    setLoading(true)
    setError('')
    loadingDataRef.current = true
    fetchOHLCV(symbol, interval)
      .then((d) => {
        setData(d)
        dataRef.current = d
        setLoading(false)
        loadingDataRef.current = false
        setChartData(d)
      })
      .catch((e) => {
        setError(e?.message ?? 'Failed to load data')
        addToast(e?.message ?? 'Failed to load chart data', 'error')
        setLoading(false)
        loadingDataRef.current = false
      })
  }, [symbol, interval, setChartData])

  useEffect(() => {
    if (!containerRef.current || chartInitialized.current) return
    chartInitialized.current = true

    const container = containerRef.current
    const engine = new ChartEngine({
      symbol,
      interval,
      data: [],
      container,
      width: container.clientWidth,
      height: 500,
      theme: themeColors,
    })

    chartRef.current = engine

    chartSync.register(
      { id: 'main', symbol, chart: engine.chart },
      (index) => {
        if (timeMachineSynced) {
          setReplayIndex(index)
          engine.seekToIndex(index, dataRef.current.map((bar) => ({
            time: bar.time as any, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume,
          })))
        }
      },
    )

    engine.drawingManager.setOnChanged(() => {
      setCanUndo(engine.drawingManager.canUndo())
      setCanRedo(engine.drawingManager.canRedo())
      setDrawingsCount(engine.drawingManager.getDrawings().length)
    })
    engine.drawingManager.setOnError((msg) => addToast(msg, 'error'))

    return () => {
      engine.destroy()
      chartRef.current = null
      chartInitialized.current = false
    }
  }, [])

  useEffect(() => {
    if (!wsPriceData || !chartRef.current) return
    if (loadingDataRef.current) return
    const bars = dataRef.current
    if (bars.length === 0) return
    const price = wsPriceData.price ?? wsPriceData.close
    const time = wsPriceData.time ?? Math.floor(Date.now() / 1000)
    if (price == null) return

    const lastBar = bars[bars.length - 1]
    const barTime = Math.floor(time / 60) * 60
    const isNewBar = barTime !== lastBar.time

    if (isNewBar) {
      const newBar = {
        time: barTime as any,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: wsPriceData.volume ?? 0,
      }
      chartRef.current.updateLastBar(newBar)
    } else {
      const updated: any = {
        time: lastBar.time as any,
        open: lastBar.open,
        high: Math.max(lastBar.high, price),
        low: Math.min(lastBar.low, price),
        close: price,
        volume: lastBar.volume + (wsPriceData.volume ?? 0),
      }
      chartRef.current.updateLastBar(updated)
    }
  }, [wsPriceData])

  const handleToolSelect = useCallback((tool: ToolType | null) => {
    setActiveTool(tool)
    if (chartRef.current) {
      chartRef.current.selectTool(tool ?? 'cursor')
    }
  }, [])

  const handleUndo = useCallback(() => {
    chartRef.current?.drawingManager.undo()
    setCanUndo(chartRef.current?.drawingManager.canUndo() ?? false)
    setCanRedo(chartRef.current?.drawingManager.canRedo() ?? false)
  }, [])

  const handleRedo = useCallback(() => {
    chartRef.current?.drawingManager.redo()
    setCanUndo(chartRef.current?.drawingManager.canUndo() ?? false)
    setCanRedo(chartRef.current?.drawingManager.canRedo() ?? false)
  }, [])

  const handleIntervalChange = useCallback((newInterval: string) => {
    setIntervalState(newInterval)
    if (chartRef.current) {
      chartRef.current.setChartInterval(newInterval)
    }
  }, [])

  const handleIndicatorAddClick = useCallback(() => {
    setShowIndicatorSearch(!showIndicatorSearch)
    setSelectedIndicatorPreset(null)
  }, [showIndicatorSearch])

  const handleIndicatorSelect = useCallback((preset: IndicatorPreset) => {
    setSelectedIndicatorPreset(preset)
    setIndicatorParams({ ...preset.defaultParams })
    setShowIndicatorSearch(false)
  }, [])

  const handleIndicatorConfirm = useCallback(() => {
    if (!selectedIndicatorPreset) return
    const indConfig: IndicatorConfig = {
      id: `ind_${Date.now()}`,
      name: selectedIndicatorPreset.name,
      params: indicatorParams,
      paneId: `pane_${indicators.length + 1}`,
      visible: true,
      style: { color: selectedIndicatorPreset.color },
    }
    setIndicators((prev) => [...prev, indConfig])
    chartRef.current?.addIndicator(indConfig)
    setSelectedIndicatorPreset(null)
  }, [selectedIndicatorPreset, indicatorParams, indicators.length])

  const handleIndicatorRemove = useCallback((id: string) => {
    setIndicators((prev) => prev.filter((i) => i.id !== id))
    chartRef.current?.removeIndicator(id)
  }, [])

  const handleObjectSelect = useCallback((id: string | null) => {
    chartRef.current?.drawingManager.setSelected(id)
    setShowDrawingProps(id != null)
  }, [])

  const handleObjectDelete = useCallback((id: string) => {
    chartRef.current?.drawingManager.setSelected(id)
    chartRef.current?.drawingManager.deleteSelected()
    setDrawingsCount(chartRef.current?.drawingManager.getDrawings().length ?? 0)
  }, [])

  const handleObjectVisibilityToggle = useCallback((id: string) => {
    const drawings = chartRef.current?.drawingManager.getDrawings() ?? []
    const drawing = drawings.find((d) => d.id === id)
    if (drawing) {
      drawing.visible = !drawing.visible
      chartRef.current?.requestRender()
    }
  }, [])

  const handleDrawingStyleChange = useCallback((style: Partial<DrawingStyle>) => {
    const selected = chartRef.current?.drawingManager.getSelectedDrawing()
    if (selected) {
      Object.assign(selected.style, style)
      chartRef.current?.requestRender()
    }
  }, [])

  const handleOpenAnalysis = useCallback(async () => {
    setShowAnalysis(true)
    setAnalysisLoading(true)
    setFigureJSON(null)
    setTAIndicators({})
    setTAChartKey((k) => k + 1)
    let analysisHtml = ''
    try {
      analysisHtml = await fetchTechnicalAnalysis(symbol, interval, 50)
      void analysisHtml
    } catch (e: any) {
      void analysisHtml
    }
    setAnalysisLoading(false)
  }, [symbol, interval])

  const handleGenerateTA = useCallback(async (indicators: Record<string, Record<string, number | number[]>>) => {
    setTAIndicators(indicators)
    if (Object.keys(indicators).length === 0) {
      setFigureJSON(null)
      return
    }
    setAnalysisLoading(true)
    setFigureJSON(null)
    try {
      const result = await fetchTAChart(symbol, interval, 50, indicators)
      setFigureJSON(result.figure_json)
    } catch (e: any) {
      addToast(e?.message || 'TA chart generation failed', 'error')
    }
    setAnalysisLoading(false)
  }, [symbol, interval])

  const handleTAIndicatorsChange = useCallback((indicators: Record<string, Record<string, number | number[]>>) => {
    setTAIndicators(indicators)
    if (Object.keys(indicators).length > 0) {
      handleGenerateTA(indicators)
    } else {
      setFigureJSON(null)
    }
  }, [handleGenerateTA])

  const drawings = chartRef.current?.drawingManager.getDrawings() ?? []
  const selectedDrawing = chartRef.current?.drawingManager.getSelectedDrawing()

  const currentChartConfig = { symbol, interval, chartStyle, indicators, drawings: drawings.map((d) => ({ type: d.type, points: d.points, style: d.style })) }
  const handleLoadChartConfig = useCallback((config: any) => {
    if (config.symbol) _setSymbol(config.symbol)
    if (config.interval) setIntervalState(config.interval)
    if (config.chartStyle) setChartStyle(config.chartStyle)
    if (config.indicators) {
      setIndicators(config.indicators)
      config.indicators.forEach((ind: any) => chartRef.current?.addIndicator(ind))
    }
    if (config.drawings && chartRef.current) {
      config.drawings.forEach((d: any) => chartRef.current!.drawingManager.addDrawing(d))
    }
    setShowTemplates(false)
    addToast('Chart template loaded', 'success')
  }, [addToast])

  const layers: ChartLayer[] = (() => {
    const result: ChartLayer[] = []
    result.push({ id: 'candle', name: 'Candles', type: 'candle', visible: true, opacity: 1, order: layerOrder['candle'] ?? 0, refType: 'candle' })
    result.push({ id: 'volume', name: 'Volume', type: 'volume', visible: true, opacity: 1, order: layerOrder['volume'] ?? 1, refType: 'volume' })
    indicators.forEach((ind, i) => {
      result.push({ id: ind.id, name: ind.name, type: 'indicator', visible: ind.visible, opacity: 1, order: layerOrder[ind.id] ?? 2 + i, refType: ind.name })
    })
    drawings.forEach((d, i) => {
      result.push({ id: d.id, name: d.type, type: 'drawing', visible: d.visible, opacity: d.style.opacity ?? 1, order: layerOrder[d.id] ?? 2 + indicators.length + i, refType: d.type })
    })
    return result.sort((a, b) => a.order - b.order)
  })()

  const handleSeek = useCallback((index: number) => {
    setReplayIndex(index)
    if (!chartRef.current) return
    const chartData = data.map((bar) => ({
      time: bar.time as any, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume,
    }))
    chartRef.current.seekToIndex(index, chartData)
  }, [data])

  const resetReplay = useCallback(() => {
    setReplayIndex(null)
    setShowTimeMachine(false)
    if (!chartRef.current) return
    const chartData = data.map((bar) => ({
      time: bar.time as any, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume,
    }))
    chartRef.current.setMainSeries(chartData)
    chartRef.current.fitContent()
  }, [data])

  const handleLayerVisibility = useCallback((id: string) => {
    if (id === 'candle' || id === 'volume') return
    const ind = indicators.find((i) => i.id === id)
    if (ind) {
      ind.visible = !ind.visible
      setIndicators([...indicators])
      return
    }
    const drawing = drawings.find((d) => d.id === id)
    if (drawing) {
      drawing.visible = !drawing.visible
      chartRef.current?.requestRender()
    }
  }, [indicators, drawings])

  const handleLayerOpacity = useCallback((id: string, opacity: number) => {
    if (id === 'candle' || id === 'volume') return
    const drawing = drawings.find((d) => d.id === id)
    if (drawing) {
      drawing.style.opacity = opacity
      chartRef.current?.requestRender()
    }
  }, [drawings])

  const handleLayerReorder = useCallback((id: string, direction: 'up' | 'down') => {
    const keys = ['candle', 'volume', ...indicators.map(i => i.id), ...drawings.map(d => d.id)]
    const idx = keys.indexOf(id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= keys.length) return
    const newOrder = { ...layerOrder }
    const a = newOrder[keys[idx]] ?? idx
    const b = newOrder[keys[swapIdx]] ?? swapIdx
    newOrder[keys[idx]] = b
    newOrder[keys[swapIdx]] = a
    setLayerOrder(newOrder)
    setRenderTick((t) => t + 1)
  }, [layerOrder, indicators, drawings])

  const handleThemeToggle = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeName = prev === 'dark' ? 'light' : 'dark'
      storeTheme(next)
      const colors = getThemeColors(next)
      applyThemeToDocument(colors)
      if (chartRef.current) {
        chartRef.current.applyTheme(colors)
      }
      return next
    })
  }, [])

  const handleCompareSymbol = useCallback((sym: string) => {
    setComparisonSymbols((prev) => {
      if (prev.includes(sym)) return prev
      return [...prev, sym]
    })
    addToast(`Added ${sym} to comparison`, 'info')
    setShowCompare(false)
  }, [addToast])

  const handleRemoveComparison = useCallback((sym: string) => {
    setComparisonSymbols((prev) => prev.filter((s) => s !== sym))
  }, [])

  const handleLoadCorrelation = useCallback(async () => {
    const syms = correlationSymbols.split(',').map((s) => s.trim()).filter(Boolean)
    if (syms.length < 2) {
      addToast('Enter at least 2 symbols separated by commas', 'error')
      return
    }
    setCorrelationLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/correlation/matrix?symbols=${syms.join(',')}&interval=1d&period_days=250`)
      if (!res.ok) throw new Error('Failed to fetch correlation data')
      const data = await res.json()
      setCorrelationData(data)
    } catch (e: any) {
      addToast(e?.message ?? 'Correlation fetch failed', 'error')
    }
    setCorrelationLoading(false)
  }, [correlationSymbols, addToast])

  const handleWorkspaceLoad = useCallback((config: any) => {
    if (config.symbol) _setSymbol(config.symbol)
    if (config.interval) setIntervalState(config.interval)
    if (config.chart_style) setChartStyle(config.chart_style)
    if (config.theme) {
      setTheme(config.theme as ThemeName)
      storeTheme(config.theme as ThemeName)
      applyThemeToDocument(getThemeColors(config.theme as ThemeName))
    }
    if (config.layout) setShowLayout(true)
    if (config.indicators) {
      setIndicators(config.indicators)
      config.indicators.forEach((ind: any) => chartRef.current?.addIndicator(ind))
    }
    if (config.drawings && chartRef.current) {
      config.drawings.forEach((d: any) => chartRef.current!.drawingManager.addDrawing(d))
    }
    addToast(`Workspace loaded`, 'success')
  }, [addToast])

  const handleDetectLevels = useCallback(() => {
    if (!chartRef.current) return
    const lvls = chartRef.current.drawingManager.detectLevels()
    setLevels(lvls)
    addToast(`Detected ${lvls.length} levels`, 'success')
  }, [addToast])

  const handleConvertToLevel = useCallback(() => {
    if (!chartRef.current) return
    const level = chartRef.current.drawingManager.convertSelectedToLevel()
    if (level) {
      setLevels(chartRef.current.drawingManager.levelsManager.getLevels())
      addToast(`Converted to level @ ${level.price.toFixed(2)}`, 'success')
    }
  }, [addToast])

  const handleFetchSignals = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chart/ta/signals/${symbol}?interval=${interval}&period_days=100`)
      if (!res.ok) throw new Error('Failed to fetch signals')
      const data = await res.json()
      setSignalsData(data.signals)
      setShowSignals(true)
    } catch (e: any) {
      addToast(e?.message ?? 'Signal fetch failed', 'error')
    }
  }, [symbol, interval, addToast])

  return (
    <div className="flex flex-col gap-0.5 h-full relative">
      <ChartToolbar
        activeTool={activeTool}
        onToolSelect={handleToolSelect}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        symbol={symbol}
        interval={interval}
        onIndicatorAdd={handleIndicatorAddClick}
        onTemplates={() => setShowTemplates(v => !v)}
      />

      <div className="flex items-center bg-card border-b border-default px-1 min-h-[22px]">
        <TimeframeSelector interval={interval} onIntervalChange={handleIntervalChange} />
        <div className="flex-1" />
        <div className="flex items-center gap-1 px-1">
          <button onClick={() => setShowCompare(!showCompare)}
            className="bg-transparent text-muted cursor-pointer text-[10px]">
            + Compare
          </button>
          <button onClick={() => setShowChartSettings(!showChartSettings)}
            className="bg-transparent text-muted cursor-pointer text-[10px]">
            Settings
          </button>
          <button onClick={() => setShowLayout(!showLayout)}
            className="bg-transparent text-muted cursor-pointer text-[10px]">
            Layout
          </button>
          <button onClick={handleThemeToggle}
            className="bg-transparent text-muted cursor-pointer text-[10px]">
            {theme === 'dark' ? '\u2600 Light' : '\u2601 Dark'}
          </button>
          <span className={`text-[8px] ${wsConnected ? 'text-up' : 'text-down'}`}>
            {wsConnected ? '\u25CF LIVE' : '\u25CB'}
          </span>
        </div>
        {showCompare && <CompareSymbol onCompare={handleCompareSymbol} onClose={() => setShowCompare(false)} />}
        {showChartSettings && <ChartSettings chartStyle={chartStyle} onChartStyleChange={setChartStyle} onClose={() => setShowChartSettings(false)} />}
        {showLayout && <LayoutBuilder currentLayout="single" onLayoutChange={() => {}} onClose={() => setShowLayout(false)} />}
      </div>

      {comparisonSymbols.length > 0 && (
        <div className="flex items-center gap-1 px-1 py-0.5 bg-card border-b border-default">
          <span className="text-[9px] text-muted">Comparing:</span>
          {comparisonSymbols.map((sym) => (
            <span key={sym} className="flex items-center gap-1 px-1.5 py-0.5 bg-accent-subtle rounded text-[9px]">
              {sym}
              <button onClick={() => handleRemoveComparison(sym)} className="bg-transparent cursor-pointer text-[9px] text-down">\u2715</button>
            </span>
          ))}
        </div>
      )}

      <div className="relative flex-1 bg-card border border-default min-h-[400px]">
        <div ref={containerRef} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <Spinner label="Loading chart..." />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-[11px] font-mono-data text-down">{error}</div>
          </div>
        )}

        {indicators.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            {indicators.map((ind) => (
              <IndicatorPane
                key={ind.id}
                indicator={ind}
                data={[]}
                onRemove={handleIndicatorRemove}
              />
            ))}
          </div>
        )}

        {showIndicatorSearch && (
          <div className="absolute top-0 left-0 z-50">
            <IndicatorSearch
              onSelect={handleIndicatorSelect}
              onClose={() => setShowIndicatorSearch(false)}
            />
          </div>
        )}

        {selectedIndicatorPreset && (
          <div className="absolute top-0 left-[220px] z-50">
            <IndicatorParams
              preset={selectedIndicatorPreset}
              params={indicatorParams}
              onChange={setIndicatorParams}
              onConfirm={handleIndicatorConfirm}
              onCancel={() => setSelectedIndicatorPreset(null)}
            />
          </div>
        )}
      </div>

      {showTimeMachine && (
        <div className="flex flex-col">
          <TimeMachine
            data={data}
            onSeek={handleSeek}
            currentIndex={replayIndex}
            multiChartSync={chartSync}
            onSyncAll={() => setTimeMachineSynced((p) => !p)}
            synced={timeMachineSynced}
          />
          {replayIndex != null && (
            <div className="flex gap-1.5 px-2 py-[1px] bg-card text-[9px] font-mono-data text-muted">
              <span className="text-accent-blue">{'\u23F1'} REPLAY MODE</span>
              <span className="flex-1" />
              <button onClick={resetReplay}
                className="bg-transparent text-accent-blue cursor-pointer text-[9px]">
                Exit Replay
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 px-1.5 py-0.5 text-[10px] font-mono-data text-secondary bg-card border-t border-default min-h-[20px]">
        <span className="text-accent-blue">{symbol}</span>
        <span>{interval}</span>
        <span className="text-muted">|</span>
        {activeTool && <span className="text-accent-yellow">Tool: {activeTool}</span>}
        {drawingsCount > 0 && <span>{drawingsCount} drawings</span>}
        {indicators.length > 0 && <span>{indicators.length} indicators</span>}
        <div className="flex-1" />
        <button onClick={() => setShowTimeMachine(!showTimeMachine)}
          className={`cursor-pointer text-[10px] transition-colors ${showTimeMachine ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          {'\u23F1'} Replay
        </button>
        <button onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={`cursor-pointer text-[10px] transition-colors ${showLayerPanel ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Layers
        </button>
        <button onClick={() => setShowTemplates(!showTemplates)}
          className={`cursor-pointer text-[10px] transition-colors ${showTemplates ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Templates
        </button>
        <button onClick={() => setShowWorkspace(!showWorkspace)}
          className={`cursor-pointer text-[10px] transition-colors ${showWorkspace ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Workspace
        </button>
        <button onClick={handleDetectLevels}
          className="bg-transparent text-muted cursor-pointer text-[10px]">
          Detect Levels
        </button>
        <button onClick={handleConvertToLevel} disabled={!chartRef.current?.drawingManager.getSelectedDrawing()}
          className={`bg-transparent text-[10px] transition-colors disabled:cursor-default ${chartRef.current?.drawingManager.getSelectedDrawing() ? 'text-muted' : 'text-[#333]'}`}>
          To Level
        </button>
        {showTemplates && (
          <div className="absolute bottom-full right-0 z-50 w-56">
            <div className="bg-card border border-default rounded-sm p-2">
              <ChartTemplates currentConfig={currentChartConfig} onLoadConfig={handleLoadChartConfig} />
            </div>
          </div>
        )}
        {showLayerPanel && (
          <div className="absolute bottom-full right-0 z-50">
            <LayerPanel
              layers={layers}
              onVisibilityToggle={handleLayerVisibility}
              onOpacityChange={handleLayerOpacity}
              onReorder={handleLayerReorder}
              onClose={() => setShowLayerPanel(false)}
            />
          </div>
        )}
        {showWorkspace && (
          <div className="absolute bottom-full right-0 z-50">
            <WorkspaceManager
              currentConfig={{
                symbol, interval, chart_style: chartStyle, theme,
                indicators, layout: 'single',
                drawings: drawings.map((d) => ({ type: d.type, points: d.points, style: d.style })),
                layers,
              }}
              onLoadConfig={handleWorkspaceLoad}
              onClose={() => setShowWorkspace(false)}
            />
          </div>
        )}
        {levels.length > 0 && (
          <div className="absolute bottom-full right-0 z-50" style={{ marginRight: 100 }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 4, padding: 4, fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              minWidth: 200, maxHeight: 200, overflowY: 'auto',
            }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: '#8b95a5', padding: '2px 4px', borderBottom: '1px solid var(--border-color)', marginBottom: 2 }}>
                LEVELS ({levels.length})
                <button onClick={() => setLevels([])}
                  style={{ float: 'right', background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', fontSize: 8 }}>
                  Clear
                </button>
              </div>
              {levels.map((lvl) => (
                <div key={lvl.id} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px',
                  borderBottom: '1px solid rgba(26,35,50,0.3)',
                }}>
                  <span style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: lvl.color,
                  }} />
                  <span style={{ color: 'var(--text-primary)', fontSize: 8, flex: 1 }}>{lvl.label}</span>
                  <span style={{
                    color: lvl.type === 'resistance' ? '#ef5350' : '#26a69a',
                    fontSize: 8, fontWeight: 600,
                  }}>
                    {lvl.type}
                  </span>
                  <span style={{ color: '#5d6b7e', fontSize: 8 }}>
                    {Math.round(lvl.strength * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={handleOpenAnalysis} className="bg-transparent text-muted cursor-pointer text-[10px]"
          title="Technical Analysis">
          Analysis
        </button>
        <button onClick={() => setShowCorrelation(!showCorrelation)}
          className={`cursor-pointer text-[10px] transition-colors ${showCorrelation ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Correlation
        </button>
        <button onClick={handleFetchSignals}
          className="bg-transparent text-muted cursor-pointer text-[10px]">
          Signals
        </button>
        <button
          onClick={() => {
            const allDrawings = chartRef.current?.drawingManager.getDrawings() ?? []
            if (allDrawings.length === 0) return
            const json = JSON.stringify(allDrawings.map((d) => ({ type: d.type, points: d.points, style: d.style })))
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `drawings_${symbol}_${Date.now()}.json`; a.click()
            URL.revokeObjectURL(url)
          }}
          className="bg-transparent text-muted cursor-pointer text-[10px]"
          title="Export drawings"
        >
          Export
        </button>
        <button
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'; input.accept = '.json'
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (!file || !chartRef.current) return
              try {
                const raw = await file.text()
                const parsed = JSON.parse(raw)
                if (!Array.isArray(parsed) && (!parsed.type || !parsed.points)) {
                  addToast('Invalid file format: expected array of drawings or a single drawing object', 'error')
                  return
                }
                const drawings = Array.isArray(parsed) ? parsed : [parsed]
                let imported = 0
                drawings.forEach((d: any) => {
                  const result = chartRef.current!.drawingManager.addDrawingFromJSON(d)
                  if (result) imported++
                })
                setDrawingsCount(chartRef.current!.drawingManager.getDrawings().length)
                addToast(`Imported ${imported} drawing(s)`, 'success')
              } catch (importErr) {
                const reason = importErr instanceof SyntaxError
                  ? 'JSON parse error: invalid file format'
                  : importErr instanceof TypeError
                    ? 'Type error: unexpected drawing data structure'
                    : 'file may be corrupt or wrong format'
                addToast(`Failed to import drawings: ${reason}`, 'error')
              }
            }
            input.click()
          }}
          className="bg-transparent text-muted cursor-pointer text-[10px]"
          title="Import drawings"
        >
          Import
        </button>
        <button onClick={() => setShowDrawingProps(!showDrawingProps)} disabled={!selectedDrawing}
          className={`bg-transparent text-[10px] transition-colors disabled:cursor-default ${selectedDrawing ? 'text-muted' : 'text-[#333]'}`}>
          Properties
        </button>
        {showDrawingProps && (
          <div className="absolute bottom-full right-0 z-50">
            <DrawingProperties drawing={selectedDrawing!} onChange={handleDrawingStyleChange} onClose={() => setShowDrawingProps(false)} />
          </div>
        )}
        <ObjectTree
          drawings={drawings}
          selectedId={chartRef.current?.drawingManager.getSelectedDrawing()?.id ?? null}
          onSelect={handleObjectSelect}
          onDelete={handleObjectDelete}
          onVisibilityToggle={handleObjectVisibilityToggle}
        />
      </div>

      {showAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowAnalysis(false)}>
          <div className="w-[95vw] h-[90vh] bg-card border border-default flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-1 border-b border-default">
              <div className="flex items-center gap-2">
                <span className="font-mono-data text-[11px] font-semibold text-primary">TECHNICAL ANALYSIS — {symbol}</span>
                <span className="text-[9px] text-muted">|</span>
                <span className={`text-[9px] ${taIndicators && Object.keys(taIndicators).length > 0 ? 'text-up' : 'text-muted'}`}>
                  {taIndicators ? `${Object.keys(taIndicators).length} indicator(s)` : 'Select indicators'}
                </span>
              </div>
              <button onClick={() => setShowAnalysis(false)} className="bg-transparent cursor-pointer text-muted text-xs">{'\u2715'}</button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <ErrorBoundary category="widget" componentName="TA Indicators">
                <TAIndicatorPanel onIndicatorsChange={handleTAIndicatorsChange} key={taChartKey} />
              </ErrorBoundary>
              <div className="flex-1 relative">
                {analysisLoading ? (
                  <div className="flex items-center justify-center h-full text-[11px] text-muted">
                    <Spinner label="Loading indicators..." />
                  </div>
                ) : figureJSON ? (
                  <ErrorBoundary category="chart" componentName="OpenBBChart">
                    <OpenBBChart figureJSON={figureJSON} style={{ width: '100%', height: '100%' }} />
                  </ErrorBoundary>
                ) : (
                  <div className="flex items-center justify-center h-full flex-col gap-2">
                    <div className="text-[11px] font-mono-data text-muted">
                      Select indicators from the left panel
                    </div>
                    <div className="text-[9px] text-accent-blue">
                      SMA, EMA, RSI, MACD, Bollinger Bands, and more
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCorrelation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowCorrelation(false)}>
          <div className="w-[60vw] bg-card border border-default flex flex-col p-3"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono-data text-[11px] font-semibold text-primary">CORRELATION MATRIX</span>
              <button onClick={() => setShowCorrelation(false)} className="bg-transparent cursor-pointer text-muted text-xs">{'\u2715'}</button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input type="text" value={correlationSymbols}
                onChange={(e) => setCorrelationSymbols(e.target.value)}
                placeholder="AAPL, MSFT, GOOGL, AMZN"
                className="flex-1 bg-bg border border-default rounded px-2 py-1 text-[10px] font-mono-data text-primary outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleLoadCorrelation()} />
              <button onClick={handleLoadCorrelation} disabled={correlationLoading}
                className="px-2 py-1 bg-accent-blue text-white text-[10px] rounded cursor-pointer disabled:opacity-50">
                {correlationLoading ? 'Loading...' : 'Compute'}
              </button>
            </div>
            {correlationData && (
              <div className="overflow-auto">
                <CorrelationHeatmap data={correlationData} cellSize={48} />
              </div>
            )}
          </div>
        </div>
      )}

      {showSignals && signalsData && (
        <div className="fixed bottom-12 right-2 z-50 w-72 bg-card border border-default rounded-sm p-2 shadow-lg"
          onMouseEnter={() => {}}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-primary">SIGNALS — {symbol}</span>
            <button onClick={() => setShowSignals(false)} className="bg-transparent cursor-pointer text-muted text-[9px]">{'\u2715'}</button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {Object.entries(signalsData).map(([plugin, sigs]: [string, any]) => (
              <div key={plugin} className="mb-1">
                <div className="text-[8px] font-bold text-accent-blue uppercase mb-0.5">{plugin}</div>
                {sigs.length === 0 ? (
                  <div className="text-[8px] text-muted pl-2">No signals</div>
                ) : (
                  sigs.map((sig: any, i: number) => (
                    <div key={i} className="flex items-center gap-1 pl-2 text-[8px]">
                      <span style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                        background: sig.direction > 0 ? '#26a69a' : sig.direction < 0 ? '#ef5350' : '#ffd54f',
                      }} />
                      <span className="text-primary">{sig.name}</span>
                      <span className="text-muted ml-auto">{Math.round(sig.strength * 100)}%</span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
