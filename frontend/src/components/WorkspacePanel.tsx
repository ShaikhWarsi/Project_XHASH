import { useState, useCallback, type ReactNode, createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import { GripVertical, PanelRightClose, PanelRightOpen } from 'lucide-react'

export type PanelPosition = 'left' | 'right' | 'bottom' | 'center'

interface PanelConfig {
  id: string
  position: PanelPosition
  label: string
  content: ReactNode
  defaultSize?: number
  minSize?: number
}

interface WorkspacePanelContextType {
  panels: PanelConfig[]
  setPanels: Dispatch<SetStateAction<PanelConfig[]>>
  addPanel: (panel: PanelConfig) => void
  removePanel: (id: string) => void
}

const WorkspacePanelContext = createContext<WorkspacePanelContextType | null>(null)

export function useWorkspacePanel() {
  const ctx = useContext(WorkspacePanelContext)
  if (!ctx) throw new Error('useWorkspacePanel must be used within WorkspacePanelProvider')
  return ctx
}

export function WorkspacePanelProvider({ children, initialPanels = [] }: { children: ReactNode; initialPanels?: PanelConfig[] }) {
  const [panels, setPanels] = useState<PanelConfig[]>(initialPanels)

  const addPanel = useCallback((panel: PanelConfig) => {
    setPanels((prev) => {
      if (prev.find((p) => p.id === panel.id)) return prev
      return [...prev, panel]
    })
  }, [])

  const removePanel = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return (
    <WorkspacePanelContext.Provider value={{ panels, setPanels, addPanel, removePanel }}>
      {children}
    </WorkspacePanelContext.Provider>
  )
}

interface WorkspaceLayoutProps {
  main: ReactNode
  panels?: PanelConfig[]
  defaultSidebarWidth?: number
  defaultBottomHeight?: number
}

export default function WorkspaceLayout({ main, panels = [], defaultSidebarWidth = 320, defaultBottomHeight = 250 }: WorkspaceLayoutProps) {
  const leftPanels = panels.filter((p) => p.position === 'left')
  const rightPanels = panels.filter((p) => p.position === 'right')
  const bottomPanels = panels.filter((p) => p.position === 'bottom')

  const [leftWidth, setLeftWidth] = useState(defaultSidebarWidth)
  const [rightWidth, setRightWidth] = useState(defaultSidebarWidth)
  const [bottomHeight, setBottomHeight] = useState(defaultBottomHeight)
  const [leftOpen, setLeftOpen] = useState(leftPanels.length > 0)
  const [rightOpen, setRightOpen] = useState(rightPanels.length > 0)
  const [bottomOpen, setBottomOpen] = useState(bottomPanels.length > 0)

  return (
    <div className="flex-1 flex" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {leftPanels.length > 0 && (
        <div style={{ width: leftOpen ? leftWidth : 0, overflow: 'hidden', borderRight: leftOpen ? '1px solid var(--border-color)' : 'none', display: 'flex', flexDirection: 'column', transition: 'width 0.15s ease', flexShrink: 0 }}>
          {leftOpen && (
            <>
              <div className="flex items-center justify-between shrink-0" style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 9, fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                <span>{leftPanels[0]?.label || 'Panel'}</span>
                <button onClick={() => setLeftOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <PanelRightClose size={10} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {leftPanels.map((p) => <div key={p.id}>{p.content}</div>)}
              </div>
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  const startX = e.clientX
                  const startW = leftWidth
                  const handler = (ev: MouseEvent) => {
                    const newW = Math.max(150, Math.min(600, startW + ev.clientX - startX))
                    setLeftWidth(newW)
                  }
                  document.addEventListener('mousemove', handler)
                  document.addEventListener('mouseup', () => document.removeEventListener('mousemove', handler), { once: true })
                }}
                style={{ position: 'absolute', right: -2, top: 0, bottom: 0, width: 4, cursor: 'col-resize', zIndex: 10 }}
              />
            </>
          )}
        </div>
      )}

      {!leftOpen && leftPanels.length > 0 && (
        <button onClick={() => setLeftOpen(true)} title="Open left panel"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRight: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 3px', display: 'flex', alignItems: 'center', writingMode: 'vertical-lr', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <PanelRightOpen size={10} style={{ marginBottom: 4 }} />
          {leftPanels[0]?.label}
        </button>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {main}
          </div>
          {bottomPanels.length > 0 && (
            <div style={{ height: bottomOpen ? bottomHeight : 0, overflow: 'hidden', borderTop: bottomOpen ? '1px solid var(--border-color)' : 'none', display: 'flex', flexDirection: 'column', transition: 'height 0.15s ease', flexShrink: 0 }}>
              {bottomOpen && (
                <>
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault()
                      const startY = e.clientY
                      const startH = bottomHeight
                      const handler = (ev: MouseEvent) => {
                        const newH = Math.max(80, Math.min(500, startH + startY - ev.clientY))
                        setBottomHeight(newH)
                      }
                      document.addEventListener('mousemove', handler)
                      document.addEventListener('mouseup', () => document.removeEventListener('mousemove', handler), { once: true })
                    }}
                    style={{ height: 4, cursor: 'row-resize', background: 'transparent', flexShrink: 0, position: 'relative' }}
                  />
                  <div className="flex items-center justify-between shrink-0" style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 9, fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                    <span>{bottomPanels[0]?.label || 'Panel'}</span>
                    <button onClick={() => setBottomOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                      <PanelRightClose size={10} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {bottomPanels.map((p) => <div key={p.id}>{p.content}</div>)}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {!bottomOpen && bottomPanels.length > 0 && (
          <button onClick={() => setBottomOpen(true)} title="Open bottom panel"
            style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
            <PanelRightOpen size={10} />
            {bottomPanels[0]?.label}
          </button>
        )}
      </div>

      {rightPanels.length > 0 && (
        <div style={{ width: rightOpen ? rightWidth : 0, overflow: 'hidden', borderLeft: rightOpen ? '1px solid var(--border-color)' : 'none', display: 'flex', flexDirection: 'column', transition: 'width 0.15s ease', flexShrink: 0 }}>
          {rightOpen && (
            <>
              <div className="flex items-center justify-between shrink-0" style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: 9, fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                <span>{rightPanels[0]?.label || 'Panel'}</span>
                <button onClick={() => setRightOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <PanelRightClose size={10} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {rightPanels.map((p) => <div key={p.id}>{p.content}</div>)}
              </div>
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  const startX = e.clientX
                  const startW = rightWidth
                  const handler = (ev: MouseEvent) => {
                    const newW = Math.max(150, Math.min(600, startW - ev.clientX + startX))
                    setRightWidth(newW)
                  }
                  document.addEventListener('mousemove', handler)
                  document.addEventListener('mouseup', () => document.removeEventListener('mousemove', handler), { once: true })
                }}
                style={{ position: 'absolute', left: -2, top: 0, bottom: 0, width: 4, cursor: 'col-resize', zIndex: 10 }}
              />
            </>
          )}
        </div>
      )}

      {!rightOpen && rightPanels.length > 0 && (
        <button onClick={() => setRightOpen(true)} title="Open right panel"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderLeft: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 3px', display: 'flex', alignItems: 'center', writingMode: 'vertical-lr', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {rightPanels[0]?.label}
          <PanelRightOpen size={10} style={{ marginTop: 4 }} />
        </button>
      )}
    </div>
  )
}
