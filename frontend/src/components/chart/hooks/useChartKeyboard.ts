import { useEffect, useRef, useState, useCallback } from 'react'
import type { IChartApi, Time } from 'lightweight-charts'
import type { ToolType } from '../DrawingTypes'

interface CrosshairPosition {
  time: Time
  price: number
}

interface ChartKeyboardState {
  locked: boolean
  crosshairIndex: number | null
}

interface ChartEngineActions {
  chart?: IChartApi
  data?: { time: Time; open: number; high: number; low: number; close: number }[]
  activeTool?: ToolType
  exportChart?: () => void
  toggleFullscreen?: () => void
  toggleReplayMode?: () => void
  focusIndicatorSearch?: () => void
  toggleStructureOverlay?: () => void
  toggleDepthChart?: () => void
  toggleVolumeProfile?: () => void
  openSymbolSearch?: () => void
  openOrderEntry?: (side: 'BUY' | 'SELL') => void
  deselectTool?: () => void
}

export function useChartKeyboard(
  chartRef: React.RefObject<ChartEngineActions | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
): ChartKeyboardState {
  const chartEngine = chartRef.current as ChartEngineActions
  const [locked, setLocked] = useState(false)
  const [crosshairIndex, setCrosshairIndex] = useState<number | null>(null)
  const lockedRef = useRef(false)
  const crosshairIndexRef = useRef<number | null>(null)
  const dateBufferRef = useRef('')
  const dateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const crosshairPosRef = useRef<CrosshairPosition | null>(null)

  const moveCrosshairX = useCallback((direction: 1 | -1) => {
    const data = chartEngine.data
    if (!data || data.length === 0) return
    const current = crosshairIndexRef.current
    const next = current === null
      ? direction === 1 ? 0 : data.length - 1
      : Math.max(0, Math.min(data.length - 1, current + direction))

    if (lockedRef.current) return
    crosshairIndexRef.current = next
    setCrosshairIndex(next)

    const fromIdx = Math.max(0, next - 20)
    const toIdx = Math.min(data.length - 1, next + 20)
    chartEngine.chart?.timeScale().setVisibleRange({
      from: data[fromIdx].time,
      to: data[toIdx].time,
    } as any)
  }, [chartEngine])

  const moveCrosshairY = useCallback((direction: 1 | -1) => {
    const data = chartEngine.data
    const idx = crosshairIndexRef.current
    if (!data || idx === null) return
    if (lockedRef.current) return
    const bar = data[idx]
    const delta = bar.close * 0.005
    const price = direction === 1
      ? bar.close + delta
      : bar.close - delta
    crosshairPosRef.current = { time: bar.time, price }
  }, [chartEngine])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') {
          (target as HTMLElement).blur()
        }
        return
      }

      const ctrl = e.ctrlKey || e.metaKey

      if (dateBufferRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault()
          const dateStr = dateBufferRef.current
          dateBufferRef.current = ''
          if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current)
          dateTimeoutRef.current = null

          const parsed = Date.parse(dateStr)
          if (!isNaN(parsed) && chartEngine.data) {
            const targetTime = { year: new Date(parsed).getFullYear(), month: new Date(parsed).getMonth() + 1, day: new Date(parsed).getDate() } as Time
            const idx = chartEngine.data.findIndex((d) => {
              const dt = d.time as any
              if (typeof dt === 'object' && dt !== null) {
                const y = dt.year ?? dt.y
                const m = dt.month ?? dt.m
                const day = dt.day ?? dt.d
                return y === (targetTime as any).year && m === (targetTime as any).month && day === (targetTime as any).day
              }
              return false
            })
            if (idx >= 0) {
              setCrosshairIndex(idx)
              chartEngine.chart?.timeScale().setVisibleRange({
                from: chartEngine.data[Math.max(0, idx - 10)].time,
                to: chartEngine.data[Math.min(chartEngine.data.length - 1, idx + 10)].time,
              } as any)
            }
          }
          return
        }

        if (e.key === 'Escape') {
          e.preventDefault()
          dateBufferRef.current = ''
          if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current)
          dateTimeoutRef.current = null
          return
        }

        if (e.key.match(/^[\d\-]$/)) {
          dateBufferRef.current += e.key
          if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current)
          dateTimeoutRef.current = setTimeout(() => {
            dateBufferRef.current = ''
            dateTimeoutRef.current = null
          }, 3000)
          e.preventDefault()
          return
        }

        dateBufferRef.current = ''
        if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current)
        dateTimeoutRef.current = null
      }

      if (e.key === 'g' && !ctrl && !e.shiftKey) {
        e.preventDefault()
        dateBufferRef.current = ''
        return
      }

      if (e.key === 'G' || (e.key === 'g' && e.shiftKey)) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          moveCrosshairX(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          moveCrosshairX(1)
          break
        case 'ArrowUp':
          e.preventDefault()
          moveCrosshairY(-1)
          break
        case 'ArrowDown':
          e.preventDefault()
          moveCrosshairY(1)
          break
        case '+':
        case '=':
          e.preventDefault()
          ;(chartEngine.chart?.timeScale() as any).zoomIn?.()
          break
        case '-':
          e.preventDefault()
          ;(chartEngine.chart?.timeScale() as any).zoomOut?.()
          break
        case 'L':
          if (e.shiftKey && !ctrl) {
            e.preventDefault()
            lockedRef.current = !lockedRef.current
            setLocked(lockedRef.current)
          }
          break
        case 'Escape':
          e.preventDefault()
          chartEngine?.deselectTool?.()
          break
        case 'E':
          if (ctrl) {
            e.preventDefault()
            chartEngine?.exportChart?.()
          }
          break
        case 'F':
          if (!ctrl && !e.shiftKey) {
            e.preventDefault()
            chartEngine?.toggleFullscreen?.()
          }
          break
        case 'R':
          if (!ctrl && !e.shiftKey) {
            e.preventDefault()
            chartEngine?.toggleReplayMode?.()
          }
          break
        case 'I':
          if (!ctrl && !e.shiftKey) {
            e.preventDefault()
            chartEngine?.focusIndicatorSearch?.()
          }
          break
        case 'S':
          if (!ctrl && !e.shiftKey) {
            e.preventDefault()
            chartEngine?.toggleStructureOverlay?.()
          }
          break
        case 'B':
          if (!ctrl && !e.shiftKey) {
            e.preventDefault()
            chartEngine?.openOrderEntry?.('BUY')
          }
          break
        case 's':
          if (!ctrl && !e.shiftKey) {
            e.preventDefault()
            chartEngine?.openOrderEntry?.('SELL')
          }
          break
        case 'D':
          if (!ctrl && !e.shiftKey) {
            e.preventDefault()
            chartEngine?.toggleDepthChart?.()
          }
          break
        case 'V':
          if (!ctrl && !e.shiftKey) {
            e.preventDefault()
            chartEngine?.toggleVolumeProfile?.()
          }
          break
        case ' ':
          if (ctrl) {
            e.preventDefault()
            chartEngine?.openSymbolSearch?.()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (dateTimeoutRef.current) clearTimeout(dateTimeoutRef.current)
    }
  }, [chartEngine, containerRef, moveCrosshairX, moveCrosshairY])

  return { locked, crosshairIndex }
}
