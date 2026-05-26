import type { ReactNode } from 'react'
import { X, RefreshCw, Settings, GripHorizontal } from 'lucide-react'

interface BaseWidgetProps {
  id: string
  title: string
  onRemove?: () => void
  onRefresh?: () => void
  onConfigure?: () => void
  children: ReactNode
  isLoading?: boolean
  error?: string | null
  headerColor?: string
}

function WidgetButton({
  onClick, disabled, title, danger, children,
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="bg-none border-none cursor-pointer flex items-center p-0.5 rounded-sm transition-all"
      style={{
        color: danger ? 'var(--accent-red)' : 'var(--text-muted)',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = danger ? 'rgba(239,68,68,0.15)' : 'var(--bg-hover)'
          e.currentTarget.style.color = danger ? 'var(--accent-red)' : 'var(--text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = danger ? 'var(--accent-red)' : 'var(--text-muted)'
      }}
    >
      {children}
    </button>
  )
}

export default function BaseWidget({
  title, onRemove, onRefresh, onConfigure, children,
  isLoading = false, error = null, headerColor,
}: BaseWidgetProps) {
  return (
    <div
      className="flex flex-col overflow-hidden transition-colors"
      style={{
        height: '100%',
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--card-radius)',
      }}
    >
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          padding: '0 8px',
          minHeight: '28px',
        }}
      >
        <div
          className="flex items-center gap-1.5 flex-1 overflow-hidden select-none cursor-move py-1"
          style={{ userSelect: 'none' }}
        >
          <GripHorizontal size={10} className="shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
          <div
            className="shrink-0 rounded-sm"
            style={{
              width: '2px', height: '10px',
              backgroundColor: headerColor || 'var(--accent-cyan)',
            }}
          />
          <span
            className="font-mono-data text-[9px] font-bold tracking-wider overflow-hidden text-ellipsis whitespace-nowrap uppercase"
            style={{ color: headerColor || 'var(--accent-cyan)' }}
          >
            {title}
          </span>
          {isLoading && (
            <div
              className="shrink-0 rounded-full"
              style={{
                width: '8px', height: '8px',
                border: '1.5px solid var(--text-muted)',
                borderTop: '1.5px solid var(--accent-cyan)',
                animation: 'widgetSpin 0.8s linear infinite',
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {onConfigure && (
            <WidgetButton onClick={onConfigure} title="Configure">
              <Settings size={10} />
            </WidgetButton>
          )}
          {onRefresh && (
            <WidgetButton onClick={onRefresh} disabled={isLoading} title="Refresh">
              <RefreshCw size={10} style={{ animation: isLoading ? 'widgetSpin 1s linear infinite' : 'none' }} />
            </WidgetButton>
          )}
          {onRemove && (
            <WidgetButton onClick={onRemove} title="Remove" danger>
              <X size={10} />
            </WidgetButton>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto relative">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-3 gap-1.5">
            <div className="flex items-center justify-center rounded-full" style={{ width: 24, height: 24, backgroundColor: 'rgba(239,68,68,0.15)' }}>
              <X size={12} style={{ color: 'var(--accent-red)' }} />
            </div>
            <div className="font-mono-data text-[9px] font-bold tracking-wider uppercase" style={{ color: 'var(--accent-red)' }}>ERROR</div>
            <div className="font-mono-data text-[8px] text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{error}</div>
            {onRefresh && (
              <button onClick={onRefresh} className="bg-none font-mono-data text-[8px] font-bold cursor-pointer px-2 py-1 rounded-sm mt-1"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                RETRY
              </button>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="rounded-full" style={{
              width: 24, height: 24,
              border: '2px solid var(--border-color)',
              borderTop: '2px solid var(--accent-cyan)',
              animation: 'widgetSpin 0.8s linear infinite',
            }} />
            <div className="font-mono-data text-[8px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
              LOADING DATA...
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      <style>{`
        @keyframes widgetSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
