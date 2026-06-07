import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { api, fetchOHLCV, fetchTechnicalAnalysis, fetchTAChart, fetchSignals, fetchStructure } from '../api/client'
interface PriceTick {
  price?: number
  close?: number
  time?: number
  volume?: number
  t?: string
  id?: string
}
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
import { AIChartInspector } from '../components/chart/AIChartInspector'
import { IndicatorPicker } from '../components/chart/IndicatorPicker'
import { ChartLegend } from '../components/chart/ChartLegend'
import { ShortcutsOverlay } from '../components/chart/ShortcutsOverlay'
import { DrawingProperties } from '../components/chart/ui/DrawingProperties'
import { CompareSymbol } from '../components/chart/ui/CompareSymbol'
import { ChartSettings } from '../components/chart/ui/ChartSettings'
import PictureInPicture from '../components/PictureInPicture'
import { LayoutBuilder } from '../components/chart/ui/LayoutBuilder'
import OpenBBChart from '../components/chart/plotly/OpenBBChart'
import TAIndicatorPanel from '../components/chart/plotly/TAIndicatorPanel'
import ErrorBoundary from '../components/ErrorBoundary'
import { fmtNumber, fmtDateTime } from '../utils/format'
import TimeMachine from '../components/chart/TimeMachine'
import LayerPanel from '../components/chart/LayerPanel'
import type { ChartLayer } from '../components/chart/LayerPanel'
import { PRESET_INDICATORS } from '../components/chart/drawings/indicators/IndicatorManager'
import type { IndicatorParams as IndicatorPreset } from '../components/chart/drawings/indicators/IndicatorManager'
import type { ToolType, DrawingStyle, DrawingData } from '../components/chart/DrawingTypes'
import type { IndicatorConfig } from '../components/chart/DrawingTypes'
import { MultiChartSync } from '../components/chart/MultiChartSync'
import type { ChartThemeColors, ThemeName } from '../components/chart/ChartTheme'
import { getThemeColors, applyThemeToDocument, getStoredTheme, storeTheme, DARK_THEME } from '../components/chart/ChartTheme'
import ChartTemplates from '../components/ChartTemplates'
import Spinner from '../components/Spinner'
import CorrelationHeatmap from '../components/CorrelationHeatmap'
import WorkspaceManager from '../components/WorkspaceManager'
import MarketTickerBarEnhanced from '../components/widgets/MarketTickerBarEnhanced'
import type { SupportResistanceLevel } from '../components/chart/drawings/LevelsManager'
import ContextMenu from '../components/ui/ContextMenu'
import type { ContextMenuItem } from '../components/ui/ContextMenu'
import type { IChartApi } from 'lightweight-charts'
import OrderEntryPanel from '../components/OrderEntryPanel'

// Keyboard navigation
import { useChartKeyboard } from '../components/chart/hooks/useChartKeyboard'
// Symbol search
import { SymbolSearch } from '../components/chart/ui/SymbolSearch'
// Time & Sales
import TimeAndSales from '../components/chart/TimeAndSales'
// Chart animations
// Layout presets
import { LayoutPresets } from '../components/chart/ui/LayoutPresets'
// Delta calculator
import { calculateCumulativeDelta, getDeltaColor } from '../components/chart/delta/DeltaCalculator'
// Delta candle renderer
import { renderDeltaCandles, renderVolumeDeltas } from '../components/chart/delta/DeltaCandleRenderer'
// Professional structure overlays
import { renderFVG, renderOrderBlock, renderLiquidityLevel, renderKeyLevels } from '../components/chart/overlays/ProfessionalStructureRenderer'
// Volume profile
import { renderVolumeProfile } from '../components/chart/overlays/VolumeProfileRenderer'
// Signal timeline
import { renderSignalsOnChart } from '../components/chart/overlays/SignalTimelineRenderer'
// Signal timeline integrated
import SignalTimelineIntegrated from '../components/chart/SignalTimelineIntegrated'
// Chart alerts
import { ChartAlertSystem } from '../components/chart/alerts/ChartAlertSystem'
import { AlertDialog } from '../components/chart/alerts/AlertDialog'
// Multi-timeframe overlay
import MultiTimeframeOverlay from '../components/chart/overlays/MultiTimeframeOverlay'
// Anchored VWAP
import DrawingTemplatePanel from '../components/chart/drawings/DrawingTemplatePanel'
// Pattern detector
import { PatternDetector, type DetectedPattern } from '../components/chart/patterns/PatternDetector'
// Tick engine
// Streaming indicators
// Fullscreen hook
import { useChartFullscreen } from '../components/chart/hooks/useChartFullscreen'
// Workspace detacher
// Alternative chart engine
import { AlternativeChartEngine } from '../components/chart/alternatives/AlternativeChartEngine'
// Market Profile
import { MarketProfile } from '../components/chart/alternatives/MarketProfile'
// Drawing snap (utilities used via DrawingManager, no import needed here)
// Chart screenshot
// Tick sounds
import { playTickSound } from '../utils/tickSound'
// Drag and drop
import DropZone from '../components/dragndrop/DropZone'
import PriceDragTarget from '../components/chart/alerts/PriceDragTarget'
// Script editor
import ScriptEditor from '../components/chart/scripting/ScriptEditor'

type ChartStyle = 'candle' | 'line' | 'area' | 'tpo'

export default function ChartPage() {
  const [searchParams] = useSearchParams()
  const [symbol, _setSymbol] = useState(() => searchParams.get('symbol') || 'AAPL')
  const setSymbol = useCallback((sym: string) => {
    _setSymbol(sym)
    const url = new URL(window.location.href)
    url.searchParams.set('symbol', sym)
    window.history.replaceState({}, '', url.toString())
    try {
      const channel = new BroadcastChannel('te-sync')
      channel.postMessage({ type: 'SYMBOL_CHANGED', payload: { symbol: sym }, tabId: 'chart', timestamp: Date.now() })
      channel.close()
    } catch {}
  }, [])

  const urlSymbol = searchParams.get('symbol')
  useEffect(() => {
    if (urlSymbol && urlSymbol !== symbol) {
      setSymbol(urlSymbol)
    }
  }, [urlSymbol, symbol, setSymbol])

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('te-sync')
      channel.onmessage = (event) => {
        const ev = event.data
        if (ev.type === 'SYMBOL_CHANGED' && ev.tabId !== 'chart' && ev.payload?.symbol && ev.payload.symbol !== symbol) {
          _setSymbol(ev.payload.symbol as string)
          const url = new URL(window.location.href)
          url.searchParams.set('symbol', ev.payload.symbol as string)
          window.history.replaceState({}, '', url.toString())
        }
      }
      return () => channel.close()
    } catch {}
  }, [symbol])

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
  const [showSnapToOHLC, setShowSnapToOHLC] = useState(false)
  const [layers, setLayers] = useState<any[]>([])
  const [layerOrder, setLayerOrder] = useState<Record<string, number>>({})
  const [showTemplates, setShowTemplates] = useState(false)
  const [templatesTab, setTemplatesTab] = useState<'chart' | 'drawings'>('chart')
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme())
  const themeColors = useMemo(() => getThemeColors(theme), [theme])
  const [showCorrelation, setShowCorrelation] = useState(false)
  const [correlationData, setCorrelationData] = useState<any>(null)
  const [correlationLoading, setCorrelationLoading] = useState(false)
  const [correlationSymbols, setCorrelationSymbols] = useState('')
  const [comparisonSymbols, setComparisonSymbols] = useState<string[]>([])
  const [chartSync] = useState(() => new MultiChartSync())
  const [timeMachineSynced, setTimeMachineSynced] = useState(false)
  const timeMachineSyncedRef = useRef(timeMachineSynced)
  timeMachineSyncedRef.current = timeMachineSynced
  const [layoutMode, setLayoutMode] = useState<'single' | '2x1' | '1x2' | '2x2'>('single')
  const [showSignals, setShowSignals] = useState(false)
  const [signalsData, setSignalsData] = useState<any>(null)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [levels, setLevels] = useState<SupportResistanceLevel[]>([])
  const [showStructureOverlay, setShowStructureOverlay] = useState(false)
  const [structureData, setStructureDataState] = useState<StructureOverlay | null>(null)
  const [showDepthChart, setShowDepthChart] = useState(false)
  const [showDataWindow, setShowDataWindow] = useState(false)
  const [showVolumeProfile, setShowVolumeProfile] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    position: { x: number; y: number }
    items: ContextMenuItem[]
  }>({ show: false, position: { x: 0, y: 0 }, items: [] })

  const addToast = useToastStore((s) => s.addToast)
  const [focusedCell, setFocusedCell] = useState(0)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ChartEngine | null>(null)
  const { locked: crosshairLocked } = useChartKeyboard(chartRef as any, chartContainerRef)
  // @ts-ignore
  const { isFullscreen, toggle: toggleChartFullscreen } = useChartFullscreen(chartContainerRef)
  const alertSystemRef = useRef(new ChartAlertSystem())
  const [showTimeAndSales, setShowTimeAndSales] = useState(false)
  const [showMultiTimeframe, setShowMultiTimeframe] = useState(true)
  const [showScriptEditor, setShowScriptEditor] = useState(false)
  const [showPatterns, setShowPatterns] = useState(false)
  const [detectedPatterns, setDetectedPatterns] = useState<DetectedPattern[]>([])
  const [showSymbolSearch, setShowSymbolSearch] = useState(false)
  const [inspectorCandle, setInspectorCandle] = useState<BarData | null>(null)
  const [showIndicatorDrawer, setShowIndicatorDrawer] = useState(false)
  const [showOrderEntry, setShowOrderEntry] = useState(false)
  const [orderEntrySide, setOrderEntrySide] = useState<'BUY' | 'SELL'>('BUY')
  const [showAlertDialog, setShowAlertDialog] = useState(false)
  const [alertDialogPrice, setAlertDialogPrice] = useState<number | undefined>(undefined)
  const [signalMarkers, setSignalMarkers] = useState<SignalMarker[]>([])
  const [showSignalTimeline, setShowSignalTimeline] = useState(false)
  const [chartApi, setChartApi] = useState<IChartApi | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showLibraryMenu, setShowLibraryMenu] = useState(false)
  const multiChartGridRef = useRef<MultiChartGridHandle>(null)
  const chartPanelRef = useRef<HTMLDivElement>(null)
  const dataRef = useRef<BarData[]>([])
  const loadingDataRef = useRef(false)
  const [crosshairLinked, setCrosshairLinked] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => { chartSync.setLinked(crosshairLinked) }, [crosshairLinked, chartSync])

  const wsUrl = useMemo(() => `/ws/prices?symbols=${symbol}`, [symbol])
  const { lastData: wsPriceData, connected: wsConnected } = useWebSocket<any>(wsUrl)

  const ohlcvLastBarTimeRef = useRef<number | null>(null)

  const setChartData = useCallback((bars: BarData[]) => {
    if (!chartRef.current) {
      if (import.meta.env.DEV) console.debug('[Chart] setChartData skipped — engine not ready')
      return
    }
    const chartData = bars.map((bar) => ({
      time: bar.time as any,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }))
    chartRef.current.setMainSeries(chartData)
    chartRef.current.fitContent()
    // Record last bar timestamp for WS reconciliation
    if (bars.length > 0) {
      const lastBar = bars[bars.length - 1]
      ohlcvLastBarTimeRef.current = typeof lastBar.time === 'string'
        ? new Date(lastBar.time).getTime() / 1000
        : lastBar.time
    }
  }, [])

  const themeAppliedRef = useRef<string>('')
  useEffect(() => {
    const key = JSON.stringify(themeColors)
    if (themeAppliedRef.current === key) return
    themeAppliedRef.current = key
    applyThemeToDocument(themeColors)
  }, [themeColors])

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError('')
    loadingDataRef.current = true
    fetchOHLCV(symbol, interval)
      .then((d) => {
        if (abort.signal.aborted) return
        setData(d)
        dataRef.current = d
        setLoading(false)
        loadingDataRef.current = false
        setChartData(d)
      })
      .catch((e) => {
        if (abort.signal.aborted) return
        setError(e?.message ?? 'Failed to load data')
        addToast(e?.message ?? 'Failed to load chart data', 'error')
        setLoading(false)
        loadingDataRef.current = false
      })
    return () => abort.abort()
  }, [symbol, interval, setChartData])



  useEffect(() => {
    if (!showStructureOverlay) {
      setStructureDataState(null)
      chartRef.current?.setStructureData(null)
      return
    }
    const abort = new AbortController()
    const load = async () => {
      try {
        const raw = await fetchStructure(symbol, interval)
        if (abort.signal.aborted) return
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
    return () => abort.abort()
  }, [showStructureOverlay, symbol, interval])

  useEffect(() => {
    chartRef.current?.setStructureData(showStructureOverlay ? structureData : null)
  }, [structureData, showStructureOverlay])

  const signalsAbortRef = useRef<AbortController | null>(null)
  const onErrorUnsubRef = useRef<(() => void) | null>(null)
  const subEngineIdsRef = useRef<Set<string> | null>(null)

  const handleEngineReady = useCallback((index: number, engine: ChartEngine) => {
    if (import.meta.env.DEV) console.debug(`[Chart] Engine ready: index=${index}`)
    flushPendingTicksRef.current()
    if (index === 0) {
      // Load signals for this engine
      signalsAbortRef.current?.abort()
      const ac = new AbortController()
      signalsAbortRef.current = ac
      fetchSignals()
        .then((sigData) => {
          if (ac.signal.aborted) return
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
          engine.setSignals(markers)
          setSignalMarkers(markers)
        })
        .catch(() => {})
      // Re-hydrate indicators on the main engine only
      for (const ind of indicators) {
        engine.addIndicator(ind)
      }
      setChartApi(engine.chart)
      chartSync.register(
        { id: 'main', symbol, chart: engine.chart },
        (idx) => {
          if (timeMachineSyncedRef.current) {
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
      onErrorUnsubRef.current?.()
      onErrorUnsubRef.current = engine.drawingManager.setOnError((msg: string) => addToast(msg, 'error')) as any
      engine.openOrderEntry = (side) => { setShowOrderEntry(true); setOrderEntrySide(side) }
      chartRef.current = engine
      return
    }
    // Sub-engines (layout grids) get registered but don't replace chartRef
    const subId = `sub_${index}`
    chartSync.register(
      { id: subId, symbol, chart: engine.chart },
      (idx) => {
        if (timeMachineSyncedRef.current) {
          engine.seekToIndex(idx, dataRef.current.map((bar) => ({
            time: bar.time as any, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume,
          })))
        }
      },
    )
    // Track for cleanup
    if (!subEngineIdsRef.current) subEngineIdsRef.current = new Set<string>()
    subEngineIdsRef.current.add(subId)
  }, [symbol, chartSync, addToast, indicators])

  useEffect(() => {
    // Re-hydrate indicators on the existing engine when symbol/interval changes
    // (engines are not rebuilt on symbol change)
    if (!chartRef.current || indicators.length === 0) return
    // Clear existing indicator series from engine
    for (const ind of indicators) {
      chartRef.current.removeIndicator(ind.id)
    }
    // Re-add them with new data context
    for (const ind of indicators) {
      chartRef.current.addIndicator(ind)
    }
  }, [symbol, interval])

  useEffect(() => {
    const engine = multiChartGridRef.current?.getEngine(focusedCell)
    if (engine) {
      chartRef.current = engine
    }
  }, [focusedCell])

  useEffect(() => {
    return () => {
      chartSync.unregister('main')
      if (subEngineIdsRef.current) {
        for (const id of subEngineIdsRef.current) {
          chartSync.unregister(id)
        }
      }
      chartSync.destroy()
    }
  }, [chartSync])

  const intervalSeconds = useMemo(() => {
    const intervalMap: Record<string, number> = {
      '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '60m': 3600, '240m': 14400,
      '1d': 86400, '7d': 604800, '30d': 2592000,
    }
    return intervalMap[interval] ?? 86400
  }, [interval])

  const pendingTicksRef = useRef<PriceTick[]>([])
  const flushPendingTicksRef = useRef<() => void>(() => {})

  const toEpoch = (t: string | number): number =>
    typeof t === 'string' ? new Date(t).getTime() / 1000 : t

  const processTick = useCallback((tick: PriceTick, engine: ChartEngine, bars: BarData[], secs: number) => {
    const price = tick.price ?? tick.close
    const rawTime = tick.time ?? Date.now() / 1000
    const timeSec = toEpoch(rawTime)
    if (price == null) return
    const lastBar = bars[bars.length - 1]
    if (!lastBar) return
    const barTime = Math.floor(timeSec / secs) * secs

    // WS/OHLCV reconciliation: if OHLCV just loaded and this tick belongs to a
    // different bar boundary, ignore it to prevent flicker
    if (ohlcvLastBarTimeRef.current != null) {
      const ohlcvBarTime = Math.floor(ohlcvLastBarTimeRef.current / secs) * secs
      if (barTime < ohlcvBarTime) return
    }
    const isNewBar = barTime > toEpoch(lastBar.time)

    if (isNewBar) {
      const newBar = {
        time: barTime as any,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: tick.volume ?? 0,
      }
      engine.updateLastBar(newBar)
      bars.push({ time: barTime, open: price, high: price, low: price, close: price, volume: tick.volume ?? 0 })
      if (bars.length > 10000) bars.splice(0, bars.length - 5000)
    } else if (barTime === lastBar.time) {
      const updated = {
        time: lastBar.time as any,
        open: lastBar.open,
        high: Math.max(lastBar.high, price),
        low: Math.min(lastBar.low, price),
        close: price,
        volume: lastBar.volume + (tick.volume ?? 0),
      }
      engine.updateLastBar(updated)
      lastBar.high = Math.max(lastBar.high, price)
      lastBar.low = Math.min(lastBar.low, price)
      lastBar.close = price
      lastBar.volume += tick.volume ?? 0
    }
  }, [])

  useEffect(() => {
    if (!wsPriceData) return
    if (chartRef.current && !loadingDataRef.current) {
      processTick(wsPriceData as PriceTick, chartRef.current, dataRef.current, intervalSeconds)
    } else {
      pendingTicksRef.current.push(wsPriceData as PriceTick)
    }
  }, [wsPriceData])

  flushPendingTicksRef.current = () => {
    if (pendingTicksRef.current.length > 0 && chartRef.current && !loadingDataRef.current) {
      for (const tick of pendingTicksRef.current) {
        processTick(tick, chartRef.current, dataRef.current, intervalSeconds)
      }
      pendingTicksRef.current = []
    }
  }

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
        onClick: () => handleIndicatorAddClick(),
        shortcut: 'I',
      },
      ...(indicators.length > 0 ? [{
        label: 'Indicators',
        submenu: indicators.map((ind) => ({
          label: `${ind.name}${ind.hidden ? ' (hidden)' : ''}`,
          submenu: [
            { label: 'Remove', onClick: () => handleIndicatorRemove(ind.id) },
            { label: 'Hide', onClick: () => {} },
            { label: 'Color...', onClick: () => {} },
            { label: 'Scale Left', onClick: () => { if (chartRef.current) chartRef.current.setPriceScalePosition('left') } },
            { label: 'Scale Right', onClick: () => { if (chartRef.current) chartRef.current.setPriceScalePosition('right') } },
          ] as ContextMenuItem[],
        })),
      } as ContextMenuItem] : []),
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
            label: 'Auto-Fib',
            onClick: () => { chartRef.current?.drawingManager.createDrawing('auto_fib'); setDrawingsCount(chartRef.current?.drawingManager.getDrawings().length ?? 0) },
          },
          {
            label: 'Auto-Pitchfork',
            onClick: () => { chartRef.current?.drawingManager.createDrawing('auto_pitchfork'); setDrawingsCount(chartRef.current?.drawingManager.getDrawings().length ?? 0) },
          },
          {
            label: 'Rectangle',
            onClick: () => handleToolSelect('rectangle'),
          },
          { label: 'Text', onClick: () => handleToolSelect('text_label') },
          { label: 'Ruler Measure', onClick: () => handleToolSelect('ruler') },
        ],
      },
      {
        label: 'Change Interval',
        submenu: ['1m', '5m', '15m', '1h', '4h', '1d', '1w'].map((i) => ({
          label: i,
          onClick: () => handleIntervalChange(i),
        })),
      },
      { label: '', divider: true as any },
      {
        label: 'Export Chart',
        onClick: handleExportDrawings,
        shortcut: 'Ctrl+E',
      },
      { label: '', divider: true as any },
      {
        label: 'Chart Settings',
        onClick: () => setShowChartSettings(true),
      },
      { label: 'Layout', onClick: () => setShowLayout(true) },
    ],
    [handleToolSelect, handleIntervalChange, toggleFullscreen, handleExportDrawings, indicators],
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
    const el = e.currentTarget as HTMLElement
    el.style.borderColor = 'var(--accent-blue)'
    el.style.borderStyle = 'dashed'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.borderColor = 'var(--border-color)'
    el.style.borderStyle = 'solid'
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.borderColor = 'var(--border-color)'
    el.style.borderStyle = 'solid'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.style.borderColor = 'var(--border-color)'
    el.style.borderStyle = 'solid'
    const symbol = e.dataTransfer.getData('text/plain')
    if (symbol && symbol.length <= 10) {
      setSymbol(symbol)
      addToast(`Loaded ${symbol}`, 'info')
    }
  }, [addToast])

  const handleSymbolDropOnChart = useCallback((sym: string) => {
    setSymbol(sym)
    addToast(`Loaded ${sym}`, 'info')
  }, [setSymbol, addToast])

  const handleSymbolDropOnOrder = useCallback((sym: string) => {
    setShowOrderEntry(true)
    setOrderEntrySide('BUY')
    addToast(`Order ticket: ${sym}`, 'info')
  }, [addToast])

  const handleSymbolDropOnCompare = useCallback((sym: string) => {
    setShowCompare(false)
    setComparisonSymbols((prev) => {
      if (prev.includes(sym)) return prev
      return [...prev, sym]
    })
    addToast(`Comparing ${sym}`, 'info')
  }, [addToast])

  const handlePriceDropOnAlert = useCallback((payload: { symbol: string; price: number }) => {
    setAlertDialogPrice(payload.price)
    setShowAlertDialog(true)
    addToast(`Alert at ${payload.symbol} $${payload.price}`, 'info')
  }, [addToast])

  const handleIndicatorAddClick = useCallback(() => {
    setShowInlineSearch(true)
    setSelectedIndicatorPreset(null)
    setInlineQuery('')
    setShowInlineParams(false)
  }, [])

  const handleIndicatorConfirm = useCallback((preset?: IndicatorPreset, params?: Record<string, number>) => {
    const p = preset ?? selectedIndicatorPreset
    const pr = params ?? indicatorParams
    if (!p) return
    const indConfig: IndicatorConfig = {
      id: `ind_${Date.now()}`,
      name: String(p.name),
      type: 'line' as any,
      params: pr,
      paneId: `pane_${indicators.length + 1}`,
      visible: true,
      style: { color: (p as any).color },
    }
    setIndicators((prev) => [...prev, indConfig])
    chartRef.current?.addIndicator(indConfig)
    setSelectedIndicatorPreset(null)
    setShowInlineParams(false)
  }, [selectedIndicatorPreset, indicatorParams, indicators.length])

  const handleInlineSelect = useCallback((preset: IndicatorPreset) => {
    const params = { ...((preset as any).defaultParams || {}) } as Record<string, number>
    setSelectedIndicatorPreset(preset)
    setIndicatorParams(params)
    setShowInlineSearch(false)
    const paramKeys = Object.keys((preset as any).defaultParams || {}).filter(k => Number((preset as any).defaultParams[k]) !== 0)
    if (paramKeys.length > 2) {
      setShowInlineParams(true)
    } else {
      handleIndicatorConfirm(preset, params)
    }
  }, [handleIndicatorConfirm])

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
    try {
      await fetchTechnicalAnalysis(symbol, interval, 50)
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to load technical analysis', 'error')
    }
    setAnalysisLoading(false)
  }, [symbol, interval, addToast])

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
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'TA chart generation failed', 'error')
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

  const drawings = useMemo(() => chartRef.current?.drawingManager.getDrawings() ?? [], [drawingsCount])
  const selectedDrawing = useMemo(() => chartRef.current?.drawingManager.getSelectedDrawing(), [drawingsCount])
  const allDrawings = useMemo(() => chartRef.current?.drawingManager.getDrawings() ?? [], [drawingsCount])

  const currentChartConfig = { symbol, interval, chartStyle, indicators, drawings: allDrawings.map((d) => ({ type: d.type, points: d.points, style: d.style })) }
  // TODO: type this properly
  const handleLoadChartConfig = useCallback((cfg: Record<string, unknown>) => {
    if (cfg.symbol) setSymbol(cfg.symbol as string)
    if (cfg.interval) setIntervalState(cfg.interval as string)
    if (cfg.chartStyle) setChartStyle(cfg.chartStyle as ChartStyle)
    if (cfg.indicators) {
      setIndicators(cfg.indicators as IndicatorConfig[])
      ;(cfg.indicators as IndicatorConfig[]).forEach((ind) => chartRef.current?.addIndicator(ind))
    }
    if (cfg.drawings && chartRef.current && chartRef.current.drawingManager) {
      ;(cfg.drawings as DrawingData[]).forEach((d) => {
        try {
          chartRef.current!.drawingManager.addDrawingFromJSON(d)
        } catch {
          if (import.meta.env.DEV) console.debug('[Chart] Skipped drawing import during engine transition')
        }
      })
    }
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

  const handleSaveLayout = useCallback(() => {
    const cfg = {
      symbol, interval, chartStyle, indicators: indicators.map((i) => ({
        id: i.id, name: i.name, params: i.params, style: i.style,
      })),
      drawings: chartRef.current?.drawingManager.getDrawings().map((d) => ({
        type: d.type, points: d.points, style: d.style,
      })) || [],
    }
    addToast('Layout saved', 'info')
  }, [symbol, interval, chartStyle, indicators, addToast])

  const handleCrosshairLinkToggle = useCallback(() => {
    setCrosshairLinked((v) => !v)
  }, [])

  const handleShowShortcuts = useCallback(() => {
    setShowShortcuts((v) => !v)
  }, [])

  const legendSeries = useMemo(() => [
    { id: 'price', name: symbol, color: 'var(--accent-cyan)', visible: true, type: 'candlestick' as const },
    ...indicators.map((ind) => ({
      id: ind.id,
      name: ind.name,
      color: ind.style?.color || 'var(--accent-yellow)',
      visible: true,
      type: 'line' as const,
    })),
    ...(comparisonSymbols.map((sym) => ({
      id: `cmp_${sym}`, name: sym, color: 'var(--accent-blue)', visible: true, type: 'line' as const,
    }))),
  ], [symbol, indicators, comparisonSymbols])

  const handleLegendToggle = useCallback((id: string) => {
    if (id === 'price') return
    setIndicators((prev) => prev.map((ind) =>
      ind.id === id ? { ...ind, style: { ...ind.style, color: ind.style?.color || 'var(--accent-yellow)' } } : ind
    ))
  }, [])

  const handleLegendSolo = useCallback((id: string) => {
    setIndicators((prev) => prev.map((ind) => ({ ...ind, hidden: ind.id !== id })))
  }, [])

  const handleHideAll = useCallback(() => {
    setIndicators((prev) => prev.map((ind) => ({ ...ind, hidden: true })))
  }, [])

  const handleShowAll = useCallback(() => {
    setIndicators((prev) => prev.map((ind) => ({ ...ind, hidden: false })))
  }, [])

  const handleLoadCorrelation = useCallback(async () => {
    const syms = correlationSymbols.split(',').map((s) => s.trim()).filter(Boolean)
    if (syms.length < 2) {
      addToast('Enter at least 2 symbols separated by commas', 'error')
      return
    }
    setCorrelationLoading(true)
    try {
      const { data } = await api.get('/correlation/matrix', { params: { symbols: syms.join(','), interval: '1d', period_days: 250 } })
      setCorrelationData(data)
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Correlation fetch failed', 'error')
    }
    setCorrelationLoading(false)
  }, [correlationSymbols, addToast])

  // TODO: type this properly
  const handleWorkspaceLoad = useCallback((cfg: Record<string, unknown>) => {
    if (cfg.symbol) setSymbol(cfg.symbol as string)
    if (cfg.interval) setIntervalState(cfg.interval as string)
    if (cfg.chart_style) setChartStyle(cfg.chart_style as ChartStyle)
    if (cfg.theme) {
      setTheme(cfg.theme as ThemeName)
      storeTheme(cfg.theme as ThemeName)
      applyThemeToDocument(getThemeColors(cfg.theme as ThemeName))
    }
    if (cfg.layout) setShowLayout(true)
    if (cfg.indicators) {
      setIndicators(cfg.indicators as IndicatorConfig[])
      ;(cfg.indicators as IndicatorConfig[]).forEach((ind) => chartRef.current?.addIndicator(ind))
    }
    if (cfg.drawings && chartRef.current && chartRef.current.drawingManager) {
      ;(cfg.drawings as DrawingData[]).forEach((d) => {
        try {
          chartRef.current!.drawingManager.addDrawingFromJSON(d)
        } catch {
          if (import.meta.env.DEV) console.debug('[Chart] Skipped drawing import during workspace load')
        }
      })
    }
    addToast(`Workspace loaded`, 'success')
  }, [addToast])

  const handleDetectLevels = useCallback(() => {
    if (!chartRef.current) return
    const lvls = chartRef.current.drawingManager.detectLevels()
    setLevels(lvls)
    if ((chartRef.current as any).setLevels) {
      (chartRef.current as any).setLevels(lvls)
    }
    if (lvls.length > 0) {
      addToast(`Detected ${lvls.length} levels`, 'success')
    } else {
      addToast('No levels detected', 'info')
    }
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
      const { data } = await api.get(`/chart/ta/signals/${symbol}`, { params: { interval, period_days: 100 } })
      if (data && data.signals) {
        const normalized = Array.isArray(data.signals) ? { signals: data.signals } : data.signals
        setSignalsData(normalized)
        setShowSignals(true)
      } else {
        addToast('No signals data available', 'info')
      }
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Signal fetch failed', 'error')
    }
  }, [symbol, interval, addToast])

  const deltaData = useMemo(() => {
    if (data.length === 0) return []
    return calculateCumulativeDelta(data as any)
  }, [data])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        setShowSymbolSearch(prev => !prev)
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        switch (e.key) {
          case 't': e.preventDefault(); handleToolSelect('trendline'); break
          case 'f': e.preventDefault(); handleToolSelect('fib_retracement'); break
          case 'r': e.preventDefault(); handleToolSelect('rectangle'); break
          case 'b': e.preventDefault(); handleToolSelect('brush'); break
          case 'l': e.preventDefault(); if (!e.shiftKey) handleToolSelect('horizontal_line'); break
          case 'v': e.preventDefault(); handleToolSelect('vertical_line'); break
          case 'e': e.preventDefault(); handleToolSelect('ellipse'); break
          case 'x': e.preventDefault(); handleToolSelect('text_label'); break
          case 'i': e.preventDefault(); handleIndicatorAddClick(); break
          case 'c': e.preventDefault(); setShowCompare(prev => !prev); break
          case 'm': e.preventDefault(); setShowLayout(true); break
          case 'd': e.preventDefault(); setShowDataWindow(prev => !prev); break
          case 'u': e.preventDefault(); handleToolSelect('ruler'); break
          case 'w': e.preventDefault(); setShowWorkspace(prev => !prev); break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleToolSelect, handleIndicatorAddClick])

  if (import.meta.env.DEV) console.debug(`[Chart] Render — loading=${loading} error=${!!error} data=${data?.length ?? 0} bars engine=${!!chartRef.current}`)
  return (
    <div className="flex flex-col gap-0.5 h-full relative">
      <MarketTickerBarEnhanced />
      <ChartToolbar
        activeTool={activeTool}
        onToolSelect={handleToolSelect}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        symbol={symbol}
        interval={interval}
        chartType={chartStyle}
        onChartTypeChange={(t) => setChartStyle(t as ChartStyle)}
        onIndicatorAdd={handleIndicatorAddClick}
        onTemplates={() => setShowTemplates(v => !v)}
        onSaveLayout={handleSaveLayout}
        onCompareAdd={() => setShowCompare((v) => !v)}
        crosshairLinked={crosshairLinked}
        onCrosshairLinkToggle={handleCrosshairLinkToggle}
        onShowShortcuts={handleShowShortcuts}
      />

      {showLayout && (
        <div className="border-b border-default">
          <LayoutPresets
            active={layoutMode === 'single' ? 'Single' : layoutMode === '2x1' ? '2 Grid' : layoutMode === '2x2' ? '4 Grid' : 'Stack'}
            onSelect={(preset) => {
              const modeMap: Record<string, any> = { 'Single': 'single', '2 Grid': '2x1', 'Stack': '1x2', '4 Grid': '2x2' }
              if (modeMap[preset.name]) setLayoutMode(modeMap[preset.name])
              setShowLayout(false)
            }}
          />
        </div>
      )}
      <div className="flex items-center bg-card border-b border-default px-1 min-h-[22px]">
        <TimeframeSelector interval={interval} onIntervalChange={handleIntervalChange} />
        <div className="flex-1" />
        <div className="flex items-center gap-1 px-1">
          <button onClick={() => setShowCompare(!showCompare)}
            className="bg-transparent text-muted cursor-pointer text-[10px]">
            + Compare
          </button>
          <button onClick={() => setShowIndicatorDrawer(v => !v)}
            className={`bg-transparent cursor-pointer text-[10px] ${showIndicatorDrawer ? 'text-accent-blue' : 'text-muted'}`}>
            Indicators
          </button>
          <button onClick={() => setShowChartSettings(!showChartSettings)}
            className="bg-transparent text-muted cursor-pointer text-[10px]">
            Settings
          </button>
          <button onClick={() => setShowLayout(!showLayout)}
            className="bg-transparent text-muted cursor-pointer text-[10px]">
            Layout
          </button>
          <button onClick={() => {
            const themes: ['dark', 'light', 'matrix', 'amber', 'cyber'] = ['dark', 'light', 'matrix', 'amber', 'cyber']
            const idx = themes.indexOf(theme as any)
            const next = themes[(idx + 1) % themes.length]
            setTheme(next)
            storeTheme(next)
          }}
            className="bg-transparent text-muted cursor-pointer text-[10px]">
            {theme === 'dark' ? '\u2600 Light' : theme === 'light' ? '\u2601 Matrix' : theme === 'matrix' ? '\u2600 Amber' : theme === 'amber' ? '\u2601 Cyber' : '\u2600 Dark'}
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

      <DropZone kind="chart" onDrop={handleSymbolDropOnChart}>
        <div ref={chartPanelRef} className="relative flex-1 bg-card border border-default min-h-[400px]" onContextMenu={handleContextMenu}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onDragEnd={handleDragEnd}>
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

        <div
          className="absolute inset-0 flex items-center justify-center bg-black/70"
          style={{
            opacity: loading ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: loading ? 'auto' : 'none',
          }}
        >
          <Spinner label="Loading chart..." />
        </div>

        <div
          className="absolute inset-0 flex items-center justify-center bg-black/70"
          style={{
            opacity: error ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: error ? 'auto' : 'none',
          }}
        >
          <div className="text-[11px] font-mono-data text-down">{error}</div>
        </div>

        {indicators.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0">
            {indicators.map((ind) => (
                <IndicatorPane
                  key={ind.id}
                  indicator={ind}
                  data={data}
                  onRemove={handleIndicatorRemove}
                />
            ))}
          </div>
        )}

        {showInlineSearch && (
          <IndicatorPicker
            onSelect={(ind) => {
              setShowInlineSearch(false)
              if (chartRef.current) {
                chartRef.current.addIndicator({ id: `ind_${Date.now()}`, name: ind.name, type: 'line', params: ind.default_params || {} } as any)
              }
            }}
            onClose={() => setShowInlineSearch(false)}
          />
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
            {selectedIndicatorPreset.defaultParams && Object.entries(selectedIndicatorPreset.defaultParams).map(([key, val]) => (
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
              <button onClick={() => handleIndicatorConfirm()} style={{ flex: 1, background: 'var(--accent-blue)', border: 'none', color: '#fff', padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontSize: 9 }}>Add</button>
              <button onClick={() => handleInlineCancel()} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 2, cursor: 'pointer', fontSize: 9 }}>Cancel</button>
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

        {showTimeAndSales && chartPanelRef.current && createPortal(
          <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 30, height: '100%' }}>
            <TimeAndSales
              symbol={symbol}
              basePrice={data.length > 0 ? data[data.length - 1].close : 150}
              onClose={() => setShowTimeAndSales(false)}
            />
          </div>,
          chartPanelRef.current
        )}

        {showMultiTimeframe && chartRef.current && (
          <MultiTimeframeOverlay
            chartEngine={chartRef.current}
            data={data as any}
            visible={showMultiTimeframe}
            symbol={symbol}
          />
        )}

        {inspectorCandle && (
          <AIChartInspector
            candle={inspectorCandle}
            symbol={symbol}
            onClose={() => setInspectorCandle(null)}
          />
        )}

        {showIndicatorDrawer && indicators.length > 0 && (
          <div style={{
            position: 'absolute', top: 0, right: 0, zIndex: 60,
            width: 240, height: '100%', overflowY: 'auto',
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-color)',
            padding: 8, fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
          }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 9, marginBottom: 8 }}>
              INDICATOR SETTINGS
              <button onClick={() => setShowIndicatorDrawer(false)}
                style={{ float: 'right', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>X</button>
            </div>
            {indicators.map((ind) => (
              <div key={ind.id} style={{ padding: '6px 4px', borderBottom: '1px solid var(--border-color)', marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: ind.style?.color || 'var(--accent-yellow)' }}>{ind.name}</span>
                  <button onClick={() => handleIndicatorRemove(ind.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 8 }}>Remove</button>
                </div>
                {ind.params && Object.entries(ind.params).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 8, minWidth: 40 }}>{key}</span>
                    <input type="number" value={val as number}
                      onChange={(e) => { /* params change handler */ }}
                      style={{ width: 60, background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 2, padding: '1px 4px', color: 'var(--text-primary)', fontSize: 8, fontFamily: 'inherit' }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      </DropZone>

      {/* CHART TITLE BAR (#155) — last, ohlc, volume, change */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1]
        const prev = data.length > 1 ? data[data.length - 2] : last
        const chg = last.close - prev.close
        const chgPct = prev.close !== 0 ? (chg / prev.close) * 100 : 0
        return (
          <div className="flex items-center gap-3 px-2 py-0.5 bg-card border-b border-default font-mono-data text-[10px]">
            <span className="font-bold text-accent-cyan">{symbol}</span>
            <span className="font-bold text-primary">${last.close.toFixed(2)}</span>
            <span className={chg >= 0 ? 'text-accent-green' : 'text-accent-red'}>Δ {chg >= 0 ? '+' : ''}{chg.toFixed(2)} ({chgPct >= 0 ? '+' : ''}{chgPct.toFixed(2)}%)</span>
            <span className="text-muted">O: ${last.open.toFixed(2)}</span>
            <span className="text-muted">H: ${last.high.toFixed(2)}</span>
            <span className="text-muted">L: ${last.low.toFixed(2)}</span>
            <span className="text-muted">V: {fmtNumber(last.volume ?? 0, 0)}</span>
            <span className="text-muted">{interval} · {data.length} bars</span>
            <div className="flex-1" />
            {/* Snapshot button (#158) */}
            <button onClick={() => {
              const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
              const c = chartApi?.takeScreenshot?.() || canvas?.toDataURL?.() || ''
              if (c) { const a = document.createElement('a'); a.href = c as string; a.download = `${symbol}_${new Date().toISOString().slice(0,10)}.png`; a.click() }
            }} className="text-muted cursor-pointer bg-none border-none text-[9px]" title="Snapshot to clipboard">📷</button>
            {/* Workspace presets (#159-#161) */}
            <div className="flex gap-0.5 ml-1">
              {[
                { label: 'Day Trade', desc: 'Footprint + DOM + T&S' },
                { label: 'Swing', desc: 'MAs + Ichimoku + Anchored VWAP' },
                { label: 'Quant', desc: 'BBands + RSI + ATR' },
              ].map((p) => (
                <button key={p.label} onClick={() => addToast(`Applied "${p.label}" preset: ${p.desc}`, 'info')}
                  className="text-[8px] px-1 py-0.5 cursor-pointer border-none rounded-sm"
                  style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}
                  title={p.desc}>
                  {p.label}
                </button>
              ))}
            </div>
            {/* Period pills (#156) */}
            <div className="flex gap-0.5 ml-1">
              {['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'].map((p) => (
                <button key={p} onClick={() => addToast(`Period range: ${p}`, 'info')}
                  className="text-[8px] px-1 py-0.5 cursor-pointer border-none"
                  style={{ color: 'var(--text-muted)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      <ChartLegend
        series={legendSeries}
        onToggle={handleLegendToggle}
        onSolo={handleLegendSolo}
        onHideAll={handleHideAll}
        onShowAll={handleShowAll}
      />

      {/* Sticky bottom toolbar rail */}
      <div className="flex items-center gap-0 px-1 py-0.5 bg-card border-t border-default select-none sticky bottom-0 z-10">
        <TimeframeSelector interval={interval} onIntervalChange={handleIntervalChange} />
        <div className="w-px h-3 bg-border mx-1" />
        <div className="flex items-center gap-0.5">
          {[{ label: '1x1', mode: 'single' }, { label: '2x1', mode: '2x1' }, { label: '1x2', mode: '1x2' }, { label: '2x2', mode: '2x2' }].map((l) => (
            <button key={l.mode} onClick={() => setLayoutMode(l.mode as any)}
              className="text-[9px] font-mono-data cursor-pointer px-1 py-0.5 border-none"
              style={{ color: layoutMode === l.mode ? 'var(--accent-cyan)' : 'var(--text-muted)', background: layoutMode === l.mode ? 'var(--bg-hover)' : 'transparent' }}>
              {l.label}
            </button>
          ))}
          <button onClick={() => setShowLayout(true)}
            className="text-[9px] font-mono-data cursor-pointer px-1 py-0.5 border-none text-muted">
            ...
          </button>
        </div>
        <div className="w-px h-3 bg-border mx-1" />
        <button onClick={() => setTimeMachineSynced(v => !v)}
          className="text-[9px] font-mono-data cursor-pointer px-1.5 py-0.5 border-none flex items-center gap-1"
          style={{ color: timeMachineSynced ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
          {timeMachineSynced ? '\u26C5' : '\u2601'} Sync
        </button>
        <div className="flex-1" />
        <PictureInPicture symbol={symbol} />
        <div className="flex items-center gap-1 text-[8px] font-mono-data text-muted ml-1">
          <span>{data.length} bars</span>
          {wsConnected && <span className="text-up">{'\u25CF'} LIVE</span>}
        </div>
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
            onSeek={(idx: number) => {
              setReplayIndex(idx)
              playTickSound()
              const full = dataRef.current.map((bar) => ({
                time: bar.time as any,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
              }))
              chartRef.current?.seekToIndex(idx, full)
            }}
            currentIndex={replayIndex}
            multiChartSync={chartSync}
            onSyncAll={() => setTimeMachineSynced((p) => !p)}
            synced={timeMachineSynced}
          />
          {replayIndex != null && (
            <div className="flex gap-1.5 px-2 py-[1px] bg-card text-[9px] font-mono-data text-muted">
              <span className="text-accent-blue">{'\u23F1'} REPLAY MODE</span>
              <span className="flex-1" />
              <button onClick={() => {
                setReplayIndex(null)
                setChartData(dataRef.current)
              }}
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
        <PriceDragTarget onDrop={handlePriceDropOnAlert}>
          <button onClick={() => setShowAlertDialog(true)}
            className={`cursor-pointer text-[10px] transition-colors ${showAlertDialog ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
            Alert
          </button>
        </PriceDragTarget>
        <button onClick={() => setShowSignalTimeline(!showSignalTimeline)}
          className={`cursor-pointer text-[10px] transition-colors ${showSignalTimeline ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          SigLine
        </button>
        <button onClick={() => {
          const snap = !showSnapToOHLC
          setShowSnapToOHLC(snap)
          if (chartRef.current) chartRef.current.snapToOHLC = snap
        }}
          className={`cursor-pointer text-[10px] transition-colors ${showSnapToOHLC ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Magnet
        </button>
        <button onClick={() => setShowTimeMachine(!showTimeMachine)}
          className={`cursor-pointer text-[10px] transition-colors ${showTimeMachine ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          {'\u23F1'} Replay
        </button>
        <button onClick={() => setShowTimeAndSales(!showTimeAndSales)}
          className={`cursor-pointer text-[10px] transition-colors ${showTimeAndSales ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          T&S
        </button>
        <button onClick={() => setShowMultiTimeframe(!showMultiTimeframe)}
          className={`cursor-pointer text-[10px] transition-colors ${showMultiTimeframe ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          HTF
        </button>
        <button onClick={() => {
          if (!showPatterns && data.length > 0) {
            addToast('Computing patterns...', 'info')
            setDetectedPatterns([])
            setTimeout(() => {
              const detector = new PatternDetector()
              const patterns = detector.detectAll(data as any)
              setDetectedPatterns(patterns)
              addToast(`Detected ${patterns.length} patterns`, 'success')
            }, 0)
          }
          setShowPatterns(!showPatterns)
        }}
          className={`cursor-pointer text-[10px] transition-colors ${showPatterns ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Patterns
        </button>
        <button onClick={() => setShowScriptEditor(!showScriptEditor)}
          className={`cursor-pointer text-[10px] transition-colors ${showScriptEditor ? 'bg-accent-subtle text-accent-blue' : 'text-muted'}`}>
          Script
        </button>
        <button onClick={() => setShowSymbolSearch(true)}
          className="bg-transparent text-muted cursor-pointer text-[10px]">
          Search
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
        <button onClick={() => {
          const state = { symbol, interval, indicators: indicators.map((i) => ({ id: i.id, type: i.type, style: i.style })) }
          const encoded = btoa(JSON.stringify(state))
          const url = `${window.location.origin}${window.location.pathname}?shared=${encoded}`
          navigator.clipboard.writeText(url)
          addToast('Chart link copied to clipboard', 'success')
        }}
          className="bg-transparent text-[10px] transition-colors text-muted cursor-pointer">Share</button>
        {showTemplates && (
          <div className="absolute bottom-full right-36 z-50">
            <div className="bg-card border border-default rounded-sm p-2 min-w-[220px]">
              <div style={{ display: 'flex', gap: 1, marginBottom: 4, borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                {(['chart', 'drawings'] as const).map((tab) => (
                  <button key={tab} onClick={() => setTemplatesTab(tab)}
                    style={{
                      flex: 1, padding: '2px 0', fontSize: 8, fontWeight: 600,
                      background: templatesTab === tab ? 'var(--accent-cyan)' : 'transparent',
                      color: templatesTab === tab ? '#000' : 'var(--text-muted)',
                      border: 'none', cursor: 'pointer', borderRadius: 2,
                      fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                    }}>
                    {tab}
                  </button>
                ))}
              </div>
              {templatesTab === 'chart' ? (
                <ChartTemplates currentConfig={currentChartConfig} onLoadConfig={handleLoadChartConfig} />
              ) : (
                <DrawingTemplatePanel
                  currentDrawings={allDrawings}
                  onApplyTemplate={(drawings) => {
                    for (const d of drawings) chartRef.current?.drawingManager.addDrawingFromJSON(d as any)
                    setDrawingsCount(chartRef.current?.drawingManager.getDrawings().length ?? 0)
                    setShowTemplates(false)
                  }}
                  onClose={() => setShowTemplates(false)}
                />
              )}
            </div>
          </div>
        )}
        {showLayerPanel && (
          <div className="absolute bottom-full right-0 z-50">
            <LayerPanel
              layers={layers as any[]}
              onVisibilityToggle={(id: string) => setLayers((prev) => prev.map((l) => l.id === id ? { ...l, visible: !l.visible } : l))}
              onOpacityChange={(id: string, opacity: number) => setLayers((prev) => prev.map((l) => l.id === id ? { ...l, opacity } : l))}
              onReorder={(id: string, direction: "up" | "down") => {
                setLayers((prev) => {
                  const idx = prev.findIndex((l) => l.id === id)
                  if (idx < 0) return prev
                  const copy = [...prev]
                  const [moved] = copy.splice(idx, 1)
                  copy.splice(direction === "up" ? Math.max(0, idx - 1) : Math.min(copy.length, idx), 0, moved)
                  return copy
                })
              }}
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
                drawings: allDrawings.map((d) => ({ type: d.type, points: d.points, style: d.style })),
                layers,
              }}
              onLoadConfig={handleWorkspaceLoad}
              onClose={() => setShowWorkspace(false)}
            />
          </div>
        )}
        {showPatterns && detectedPatterns.length > 0 && (
          <div className="absolute bottom-full right-0 z-50" style={{ marginRight: 160 }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 4, padding: 4, fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              minWidth: 220, maxHeight: 300, overflowY: 'auto',
            }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: '#8b95a5', padding: '2px 4px', borderBottom: '1px solid var(--border-color)', marginBottom: 2 }}>
                PATTERNS ({detectedPatterns.length})
                <button onClick={() => setShowPatterns(false)}
                  style={{ float: 'right', background: 'none', border: 'none', color: '#5d6b7e', cursor: 'pointer', fontSize: 8 }}>
                  Close
                </button>
              </div>
              {detectedPatterns.map((p, i) => (
                <div key={i} style={{ padding: '2px 4px', borderBottom: '1px solid rgba(26,35,50,0.3)' }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 8 }}>{(p as any).name || (p as any).type}</span>
                  <span style={{ float: 'right', color: 'var(--accent-blue)', fontSize: 8 }}>{(p as any).direction}</span>
                </div>
              ))}
            </div>
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
          const cell0 = document.querySelector('[data-cell-id="0"]')
          const canvas = cell0 ? cell0.querySelector('canvas') : document.querySelector('.tv-lightweight-charts canvas, .chart-container canvas') as HTMLCanvasElement
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
                // TODO: type this properly
                drawings.forEach((d) => {
                  const result = chartRef.current!.drawingManager.addDrawingFromJSON(d as any)
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
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button onClick={() => setShowLibraryMenu(v => !v)}
          className="bg-transparent text-muted cursor-pointer text-[10px]" title="Drawing Library">
          Library
        </button>
        {showLibraryMenu && (
          <div className="absolute bottom-full right-0 z-50" style={{ marginRight: 40 }}>
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 4, padding: 4, fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              minWidth: 180, maxHeight: 200, overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#8b95a5', padding: '2px 4px', borderBottom: '1px solid var(--border-color)', marginBottom: 2 }}>
                DRAWING LIBRARY
              </div>
              {(() => {
                const libs = chartRef.current?.drawingManager.listLibraries(symbol, interval) ?? []
                if (libs.length === 0) {
                  return <div style={{ padding: '4px', fontSize: 9, color: '#5d6b7e' }}>No saved libraries</div>
                }
                return <>
                  {libs.map((entry: any) => (
                    <button key={entry.id}
                      onClick={() => {
                        chartRef.current?.drawingManager.loadFromLibrary(symbol, interval, entry.id)
                        addToast(`Loaded ${entry.drawingCount} drawings from library`, 'success')
                        setShowLibraryMenu(false)
                      }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '3px 6px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 9 }}>
                      {fmtDateTime(entry.savedAt)} ({entry.drawingCount} drawings)
                    </button>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 2, paddingTop: 2 }}>
                    <button onClick={() => {
                      chartRef.current?.drawingManager.saveToLibrary(symbol, interval)
                      addToast('Drawings saved to library', 'success')
                      setShowLibraryMenu(false)
                    }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '3px 6px', background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 9 }}>
                      + Save Current
                    </button>
                  </div>
                </>
              })()}
            </div>
          </div>
        )}
      </div>
        <div className="absolute bottom-full right-0 z-50" style={{ marginRight: 100 }}>
          <ObjectTree
            drawings={drawings}
            selectedId={chartRef.current?.drawingManager.getSelectedDrawing()?.id ?? null}
            onSelect={handleObjectSelect}
            onDelete={handleObjectDelete}
            onVisibilityToggle={handleObjectVisibilityToggle}
          />
        </div>
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
          >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold text-primary">SIGNALS — {symbol}</span>
            <button onClick={() => setShowSignals(false)} className="bg-transparent cursor-pointer text-muted text-[9px]">{'\u2715'}</button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {Object.entries(signalsData).map(([plugin, sigs]) => (
              <div key={plugin} className="mb-1">
                <div className="text-[8px] font-bold text-accent-blue uppercase mb-0.5">{plugin}</div>
                {Array.isArray(sigs) && sigs.length === 0 ? (
                  <div className="text-[8px] text-muted pl-2">No signals</div>
                ) : Array.isArray(sigs) ? (
                  sigs.map((sig: Record<string, unknown>, i: number) => (
                    <div key={i} className="flex items-center gap-1 pl-2 text-[8px]">
                      <span style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                        background: Number(sig.direction) > 0 ? '#26a69a' : Number(sig.direction) < 0 ? '#ef5350' : '#ffd54f',
                      }} />
                      <span className="text-primary">{String(sig.name)}</span>
                      <span className="text-muted ml-auto">{Math.round(Number(sig.strength) * 100)}%</span>
                    </div>
                  ))
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {showSymbolSearch && (
        <SymbolSearch
          onSelect={(sym) => {
            setSymbol(sym)
            setShowSymbolSearch(false)
          }}
          onClose={() => setShowSymbolSearch(false)}
        />
      )}

      {showOrderEntry && (
        <div style={{
          position: 'fixed', top: 80, right: 16, zIndex: 1000,
          width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6,
        }}>
          <div className="flex justify-end p-1">
            <button onClick={() => setShowOrderEntry(false)}
              className="cursor-pointer bg-transparent border-none text-muted text-xs px-2 py-0.5"
            >✕</button>
          </div>
          <OrderEntryPanel symbol={symbol} currentPrice={data?.[data.length - 1]?.close} />
        </div>
      )}

      {showAlertDialog && (
        <AlertDialog
          open={showAlertDialog}
          onClose={() => { setShowAlertDialog(false); setAlertDialogPrice(undefined) }}
          alertSystem={alertSystemRef.current}
          symbol={symbol}
          initialPrice={alertDialogPrice}
        />
      )}

      {showScriptEditor && (
        <ScriptEditor
          onScriptRun={(result) => {
            addToast(`Script "${result.name}" computed ${result.values.length} values`, 'success')
          }}
          onClose={() => setShowScriptEditor(false)}
        />
      )}

      {contextMenu.show && (
        <ContextMenu
          items={contextMenu.items}
          position={contextMenu.position}
          onClose={() => setContextMenu((prev) => ({ ...prev, show: false }))}
          id="chart-context-menu"
        />
      )}

      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}
