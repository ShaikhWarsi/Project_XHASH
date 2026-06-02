import { useState, useRef, useEffect, useCallback } from 'react'
import type { ChartAlert, ChartAlertSystem } from './ChartAlertSystem'

interface ChartAlertMarkerProps {
  alerts: ChartAlert[]
  alertSystem: ChartAlertSystem
  canvasElement: HTMLCanvasElement | null
  chartContainer: HTMLDivElement | null
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  alert: ChartAlert | null
}

const ANIMATION_DURATION = 300

export function ChartAlertMarker({ alerts, alertSystem, canvasElement, chartContainer }: ChartAlertMarkerProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, alert: null })
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; alert: ChartAlert } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previousAlertCount = useRef(alerts.length)

  useEffect(() => {
    if (alerts.length > previousAlertCount.current) {
      const newIds = new Set(alerts.slice(previousAlertCount.current).map((a) => a.id))
      setAnimatingIds(newIds)
      const timer = setTimeout(() => setAnimatingIds(new Set()), ANIMATION_DURATION)
      previousAlertCount.current = alerts.length
      return () => clearTimeout(timer)
    }
    previousAlertCount.current = alerts.length
  }, [alerts.length])

  const handleClick = useCallback((e: React.MouseEvent, alert: ChartAlert) => {
    e.stopPropagation()
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      alert,
    })
    setContextMenu(null)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, alert: ChartAlert) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, alert })
    setTooltip({ visible: false, x: 0, y: 0, alert: null })
  }, [])

  const handleDelete = useCallback((alertId: string) => {
    alertSystem.removeAlert(alertId)
    setContextMenu(null)
    setTooltip({ visible: false, x: 0, y: 0, alert: null })
  }, [alertSystem])

  const closeAll = useCallback(() => {
    setTooltip({ visible: false, x: 0, y: 0, alert: null })
    setContextMenu(null)
  }, [])

  useEffect(() => {
    if (tooltip.visible || contextMenu) {
      const handler = () => closeAll()
      document.addEventListener('click', handler)
      return () => document.removeEventListener('click', handler)
    }
  }, [tooltip.visible, contextMenu, closeAll])

  if (!chartContainer || !canvasElement) return null

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
      {alerts.map((alert) => {
        const isNew = animatingIds.has(alert.id)
        return (
          <button
            key={alert.id}
            onClick={(e) => handleClick(e, alert)}
            onContextMenu={(e) => handleContextMenu(e, alert)}
            style={{
              position: 'absolute',
              pointerEvents: 'auto',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
              opacity: isNew ? 0 : 1,
              transform: isNew ? 'translateY(10px)' : 'translateY(0)',
              transition: `opacity ${ANIMATION_DURATION}ms ease-out, transform ${ANIMATION_DURATION}ms ease-out`,
            }}
            title={`Alert: $${alert.price?.toFixed(2)}`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle
                cx="6" cy="6" r="5"
                fill={alert.triggered ? '#5d6b7e' : alert.color}
                stroke={alert.triggered ? '#5d6b7e' : '#fff'}
                strokeWidth="1"
                opacity={alert.triggered ? 0.5 : 1}
              />
              {alert.triggered && (
                <text x="6" y="7" textAnchor="middle" fill="#fff" fontSize="7">✓</text>
              )}
            </svg>
          </button>
        )
      })}

      {tooltip.visible && tooltip.alert && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            pointerEvents: 'auto',
            background: '#0d1117',
            border: '1px solid #1a2332',
            borderRadius: 6,
            padding: '10px 12px',
            zIndex: 1000,
            minWidth: 180,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: '#e8eaed',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 6, color: tooltip.alert.color }}>
            {tooltip.alert.type.replace(/_/g, ' ').toUpperCase()}
          </div>
          <div style={{ marginBottom: 3, color: '#5d6b7e' }}>
            Price: <span style={{ color: '#e8eaed' }}>${tooltip.alert.price?.toFixed(2)}</span>
          </div>
          {tooltip.alert.note && (
            <div style={{ marginBottom: 3, color: '#5d6b7e' }}>
              Note: <span style={{ color: '#e8eaed' }}>{tooltip.alert.note}</span>
            </div>
          )}
          <div style={{ color: '#5d6b7e', fontSize: 10 }}>
            Created: {new Date(tooltip.alert.createdAt).toLocaleString()}
          </div>
          {tooltip.alert.triggeredAt && (
            <div style={{ color: '#5d6b7e', fontSize: 10 }}>
              Triggered: {new Date(tooltip.alert.triggeredAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            pointerEvents: 'auto',
            background: '#0d1117',
            border: '1px solid #1a2332',
            borderRadius: 6,
            padding: '4px 0',
            zIndex: 1000,
            minWidth: 140,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div
            onClick={() => handleDelete(contextMenu.alert.id)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#ef5350',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1a2332')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Delete Alert
          </div>
        </div>
      )}
    </div>
  )
}
