import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { fetchOHLCV, fetchTechnicalAnalysis, fetchTAChart, fetchSignals, fetchStructure } from '../api/client'
import type { BarData } from '../api/types'
import DepthChart from '../components/chart/DepthChart'
import VolumeProfile from '../components/chart/VolumeProfile'
import { useWebSocket } from '../hooks/useWebSocket'
import { useToastStore } from '../store/toast'
import { ChartEngine, type SignalMarker, type StructureOverlay } from '../components/chart/ChartEngine'
import SignalTimeline from '../components/chart/SignalTimeline'
import { MultiChartGrid } from '../components/chart/MultiChartGrid'
import type { MultiChartGridHandle } from '../components/chart/MultiChartGrid'
import { ChartToolbar } from '../components/chart/ChartToolbar'
import { TimeframeSelector } from '../components/chart/TimeframeSelector'
import { ObjectTree } from '../components/chart/ui/ObjectTree'
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
import { type IndicatorPreset, PRESET_INDICATORS } from '../components/chart/drawings/indicators/IndicatorManager'
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
import ContextMenu from '../components/ui/ContextMenu'
import type { ContextMenuItem } from '../components/ui/ContextMenu'
import type { IChartApi } from 'lightweight-charts'

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
  const [showInlineSearch, setShowInlineSearch] = useState(false)
  const [inlineQuery, setInlineQuery] = useState('')
  const [showInlineParams, setShowInlineParams] = useState(false)
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
  const [layoutMode, setLayoutMode] = useState<'single' | '2x1' | '1x2' | '2x2'>('single')
  const [showSignals, setShowSignals] = useState(false)
  const [signalsData, setSignalsData] = useState<any>(null)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [levels, setLevels] = useState<SupportResistanceLevel[]>([])
  const [showStructureOverlay, setShowStructureOverlay] = useState(false)
  const [structureData, setStructureDataState] = useState<StructureOverlay | null>(null)
  const [showDepthChart, setShowDepthChart] = useState(false)
  const [showVolumeProfile, setShowVolumeProfile] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    position: { x: number; y: number }
    items: ContextMenuItem[]
  }>({ show: false, position: { x: 0, y: 0 }, items: [] })

  const addToast = useToastStore((s) => s.addToast)
  const [focusedCell, setFocusedCell] = useState(0)
  const [signalMarkers, setSignalMarkers] = useState<SignalMarker[]>([])
  const [showSignalTimeline, setShowSignalTimeline] = useState(false)
  const [chartApi, setChartApi] = useState<IChartApi | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const multiChartGridRef = useRef<MultiChartGridHandle>(null)
  const chartPanelRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ChartEngine | null>(null)
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
    const mainEngine = chartRef.current
    for (let i = 0; i < 4; i++) {
      const engine = multiChartGridRef.current?.getEngine(i)
      if (engine && engine !== mainEngine) {
        engine.setMainSeries(chartData)
      }
    }
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
    if (!chartRef.current) return
    fetchSignals()
      .then((sigData) => {
        const markers: SignalMarker[] = []
        const symbolSigs = sigData.signals[symbol]
        if (symbolSigs) {
          for (const s of symbolSigs) {
            const timeStr = s.timestamp || sigData.timestamp
            const time = Math.floor(new Date(timeStr).getTime() / 1000) as any
            markers.push({
              time,
              type: s.direction > 0 ? 'buy' : 'sell',
              price: s.price || 0,
              strength: s.strength || s.confidence || 1,
            })
          }
        }
        chartRef.current!.setSignals(markers)
        setSignalMarkers(markers)
      })
      .catch(() => {})
  }, [symbol, interval])

  useEffect(() => {
    if (!showStructureOverlay) {
      setStructureDataState(null)
      chartRef.current?.setStructureData(null)
      return
    }
    const load = async () => {
      try {
        const raw = await fetchStructure(symbol, interval)
        const mapped: StructureOverlay = {
          orderBlocks: (raw as any).active_order_blocks ?? [],
          fvgs: (raw as any).active_fvgs ?? [],
          liquidityLevels: (raw as any).liquidity_levels ?? [],
          keyLevels: (raw as any).key_levels ?? [],
        }
        setStructureDataState(mapped)
      } catch { /* silent */ }
    }
    load()
  }, [showStructureOverlay, symbol, interval])

  useEffect(() => {
    chartRef.current?.setStructureData(showStructureOverlay ? structureData : null)
  }, [structureData, showStructureOverlay])

  const handleEngineReady = useCallback((index: number, engine: ChartEngine) => {
    if (index === 0) {
      setChartApi(engine.chart)
      chartSync.register(
        { id: 'main', symbol, chart: engine.chart },
        (idx) => {
          if (timeMachineSynced) {
            setReplayIndex(idx)
            engine.seekToIndex(idx, dataRef.current.map((bar) => ({
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
    }
    chartRef.current = engine
  }, [symbol, timeMachineSynced, chartSync, addToast])

  useEffect(() => {
    const engine = multiChartGridRef.current?.getEngine(focusedCell)
    if (engine) {
      chartRef.current = engine
    }
  }, [focusedCell])

  useEffect(() => {
    return () => {
      chartSync.unregister('main')
    }
  }, [chartSync])

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

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  const handleExportDrawings = useCallback(() => {
    const allDrawings = chartRef.current?.drawingManager.getDrawings() ?? []
    if (allDrawings.length === 0) return
    const json = JSON.stringify(
      allDrawings.map((d) => ({ type: d.type, points: d.points, style: d.style })),
    )
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drawings_${symbol}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [symbol])

  const chartMenuItems = useMemo<ContextMenuItem[]>(
    () => [
      {
        label: 'Add Indicator',
        onClick: () => setShowIndicatorSearch(true),
        shortcut: 'I',
      },
      {
        label: 'Add Drawing',
        submenu: [
          {
            label: 'Trend Line',
            onClick: () => handleToolSelect('trendline'),
          },
          {
            label: 'Fibonacci',
            onClick: () => handleToolSelect('fib_retracement'),
          },
          {
            label: 'Rectangle',
            onClick: () => handleToolSelect('rectangle'),
          },
          { label: 'Text', onClick: () => handleToolSelect('text_label') },
        ],
      },
      {
        label: 'Change Interval',
        submenu: ['1m', '5m', '15m', '1h', '4h', '1d', '1w'].map((i) => ({
          label: i,
          onClick: () => handleIntervalChange(i),
        })),
      },
      { divider: true },
      {
        label: 'Export Chart',
        onClick: handleExportDrawings,
        shortcut: 'Ctrl+E',
      },
      { label: 'Fullscreen', onClick: toggleFullscreen, shortcut: 'F11' },
      { divider: true },
      {
        label: 'Chart Settings',
        onClick: () => setShowChartSettings(true),
      },
      { label: 'Layout', onClick: () => setShowLayout(true) },
    ],
    [handleToolSelect, handleIntervalChange, toggleFullscreen, handleExportDrawings],
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setContextMenu({
        show: true,
        position: { x: e.clientX, y: e.clientY },
        items: chartMenuItems,
      })
    },
    [chartMenuItems],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    e.currentTarget.style.borderColor = 'var(--accent-blue)'
    e.currentTarget.style.borderStyle = 'dashed'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.style.borderColor = 'var(--border-color)'
    e.currentTarget.style.borderStyle = 'solid'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.style.borderColor = 'var(--border-color)'
    e.currentTarget.style.borderStyle = 'solid'
    const symbol = e.dataTransfer.getData('text/plain')
    if (symbol && symbol.length <= 10) {
      _setSymbol(symbol)
      addToast(`Loaded ${symbol}`, 'info')
    }
  }, [addToast])

  const handleIndicatorAddClick = useCallback(() => {
    setShowInlineSearch(true)
    setSelectedIndicatorPreset(null)
    setInlineQuery('')
    setShowInlineParams(false)
  }, [])

  const handleInlineSelect = useCallback((preset: IndicatorPreset) => {
    const params = { ...preset.defaultParams } as Record<string, number>
    setSelectedIndicatorPreset(preset)
    setIndicatorParams(params)
    setShowInlineSearch(false)
    const paramKeys = Object.keys(preset.defaultParams).filter(k => Number(preset.defaultParams[k]) !== 0)
    if (paramKeys.length > 2) {
      setShowInlineParams(true)
    } else {
      handleIndicatorConfirm(preset, params)
    }
  }, [handleIndicatorConfirm])

  const handleIndicatorConfirm = useCallback((preset?: IndicatorPreset, params?: Record<string, number>) => {
    const p = preset ?? selectedIndicatorPreset
    const pr = params ?? indicatorParams
    if (!p) return
    const indConfig: IndicatorConfig = {
      id: `ind_${Date.now()}`,
      name: p.name,
      params: pr,
      paneId: `pane_${indicators.length + 1}`,
      visible: true,
      style: { color: p.color },
    }
    setIndicators((prev) => [...prev, indConfig])
    chartRef.current?.addIndicator(indConfig)
    setSelectedIndicatorPreset(null)
    setShowInlineParams(false)
  }, [selectedIndicatorPreset, indicatorParams, indicators.length])

  const handleInlineCancel = useCallback(() => {
    setShowInlineParams(false)
    setShowInlineSearch(false)
    setInlineQuery('')
  }, [])

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
        {showLayout && <LayoutBuilder currentLayout={layoutMode} onLayoutChange={setLayoutMode} onClose={() => setShowLayout(false)} />}
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

      <div ref={chartPanelRef} className="relative flex-1 bg-card border border-default min-h-[400px]" onContextMenu={handleContextMenu}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <MultiChartGrid
          ref={multiChartGridRef}
          layoutMode={layoutMode}
          data={data}
          symbol={symbol}
          interval={interval}
          themeColors={themeColors}
          focusedCell={focusedCell}
          onFocusCell={setFocusedCell}
          onChartReady={handleEngineReady}
        />

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

        {showInlineSearch && (
          <div style={{
            position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
            zIndex: 60, width: 220,
            background: 'var(--bg-card)', border: '1px solid var(--accent-blue)',
            borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}>
            <input
              autoFocus
              type="text"
              value={inlineQuery}
              onChange={e => setInlineQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setShowInlineSearch(false); setInlineQuery('') }
              }}
              placeholder="Search indicators..."
              style={{ width: '100%', background: 'transparent', border: 'none', padding: '6px 8px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', fontSize: 10 }}
            />
            {inlineQuery && (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {PRESET_INDICATORS.filter(p => p.name.toLowerCase().includes(inlineQuery.toLowerCase())).slice(0, 12).map(preset => (
                  <div key={preset.name}
                    onClick={() => handleInlineSelect(preset)}
                    style={{ padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-color)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: preset.color }} />
                    <span style={{ flex: 1, color: 'var(--text-primary)' }}>{preset.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>{preset.category || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showInlineParams && selectedIndicatorPreset && (
          <div style={{
            position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
            zIndex: 60, width: 200,
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 4, padding: 8,
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          }}>
            <div style={{ marginBottom: 6, color: 'var(--text-primary)', fontWeight: 600, fontSize: 9 }}>
              {selectedIndicatorPreset.name} params
            </div>
            {Object.entries(selectedIndicatorPreset.defaultParams).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: 9, minWidth: 40 }}>{key}</label>
                <input
                  type="number"
                  value={indicatorParams[key] ?? Number(val)}
                  onChange={e => setIndicatorParams(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  style={{ flex: 1, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 2, padding: '2px 4px', color: 'var(--text-primary)', fontSize: 9, fontFamily: 'inherit' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <button onClick={handleIndicatorConfirm} style={{ flex: 1, background: 'var(--accent-blue)', border: 'none', color: '#fff', padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontSize: 9 }}>Add</button>
              <button onClick={handleInlineCancel} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontSize: 9 }}>Cancel</button>
            </div>
          </div>
        )}

        {chartPanelRef.current && showDepthChart && createPortal(
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 }}>
            <DepthChart
              symbol={symbol}
              data={data}
              onClose={() => setShowDepthChart(false)}
            />
          </div>,
          chartPanelRef.current
        )}

        {chartPanelRef.current && showVolumeProfile && createPortal(
          <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 20, height: '100%', overflow: 'hidden' }}>
            <VolumeProfile
              data={data}
              onClose={() => setShowVolumeProfile(false)}
            />
          </div>,
          chartPanelRef.current
        )}
      </div>

      <SignalTimeline
        signals={signalMarkers}
        data={data}
        chart={chartApi}
        height={48}
        symbol={symbol}
        visible={showSignalTimeline}
      />

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
        <button onClick={() => setShowSignalTimeline(!showSignalTimeline)}
          className={`cursor-pointer text-[10px] transition-colors ${showSignalTimeline ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          SigLine
        </button>
        <button onClick={() => setShowTimeMachine(!showTimeMachine)}
          className={`cursor-pointer text-[10px] transition-colors ${showTimeMachine ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          {'\u23F1'} Replay
        </button>
        <button onClick={() => setShowStructureOverlay(!showStructureOverlay)}
          className={`cursor-pointer text-[10px] transition-colors ${showStructureOverlay ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Struct
        </button>
        <button onClick={() => setShowDepthChart(!showDepthChart)}
          className={`cursor-pointer text-[10px] transition-colors ${showDepthChart ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Depth
        </button>
        <button onClick={() => setShowVolumeProfile(!showVolumeProfile)}
          className={`cursor-pointer text-[10px] transition-colors ${showVolumeProfile ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Profile
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
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button onClick={() => setShowExportMenu(v => !v)}
            className="bg-transparent text-muted cursor-pointer text-[10px]"
            title="Export chart">
            Export
          </button>
          {showExportMenu && (
            <div className="absolute bottom-full right-0 z-50" style={{ marginRight: 80 }}>
              <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 4, padding: 4, fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                minWidth: 140, boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#8b95a5', padding: '2px 4px', borderBottom: '1px solid var(--border-color)', marginBottom: 2 }}>
                  EXPORT
                </div>
                <button onClick={() => {
                  setShowExportMenu(false)
                  const canvas = document.querySelector('#chart-main-container canvas') as HTMLCanvasElement
                  if (!canvas) { addToast('No chart canvas to export', 'error'); return }
                  const link = document.createElement('a')
                  link.download = `chart_${symbol}_${interval}_${Date.now()}.png`
                  link.href = canvas.toDataURL('image/png')
                  link.click()
                }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '3px 6px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 10 }}>
                  PNG Image
                </button>
                <button onClick={() => {
                  setShowExportMenu(false)
                  const allDrawings = chartRef.current?.drawingManager.getDrawings() ?? []
                  if (allDrawings.length === 0) { addToast('No drawings to export', 'info'); return }
                  const json = JSON.stringify(allDrawings.map((d) => ({ type: d.type, points: d.points, style: d.style })))
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = `drawings_${symbol}_${Date.now()}.json`; a.click()
                  URL.revokeObjectURL(url)
                }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '3px 6px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 10 }}>
                  JSON Drawings
                </button>
              </div>
            </div>
          )}
        </div>
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
        <button onClick={() => {
          const libs = chartRef.current?.drawingManager.listLibraries(symbol, interval) ?? []
          if (libs.length === 0) {
            chartRef.current?.drawingManager.saveToLibrary(symbol, interval)
            addToast('Drawings saved to library', 'success')
            return
          }
          const latest = libs[libs.length - 1]
          chartRef.current?.drawingManager.loadFromLibrary(symbol, interval, latest.id)
          addToast(`Loaded ${latest.drawingCount} drawings from library`, 'success')
        }} className="bg-transparent text-muted cursor-pointer text-[10px]" title="Drawing Library">
          Library
        </button>
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

      {contextMenu.show && (
        <ContextMenu
          items={contextMenu.items}
          position={contextMenu.position}
          onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
          id="chart-context-menu"
        />
      )}
    </div>
  )
}
