import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface WorkspaceSnapshot {
  name: string
  savedAt: string
  widgetLayout?: Record<string, any>
  widgetOrder?: string[]
  widgetVisibility?: Record<string, boolean>
  widgetSizes?: Record<string, number>
  settings?: Record<string, any>
}

interface WorkspaceContextType {
  workspaces: Record<string, WorkspaceSnapshot>
  currentWorkspace: string
  saveWorkspace: (name: string, data?: Partial<WorkspaceSnapshot>) => void
  loadWorkspace: (name: string) => WorkspaceSnapshot | null
  deleteWorkspace: (name: string) => void
  listWorkspaces: () => string[]
  captureWidgetState: (storageKey: string) => void
  applyWidgetState: (storageKey: string, name: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)
const STORAGE_KEY = 'te_workspaces'
const CURRENT_KEY = 'te_current_workspace'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Record<string, WorkspaceSnapshot>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })
  const [currentWorkspace, setCurrent] = useState(() => localStorage.getItem(CURRENT_KEY) || '')
  const wsRef = useRef(workspaces)
  wsRef.current = workspaces

  const persist = (ws: Record<string, WorkspaceSnapshot>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ws))
    setWorkspaces(ws)
  }

  const saveWorkspace = useCallback((name: string, data?: Partial<WorkspaceSnapshot>) => {
    const existing = wsRef.current[name] || {}
    const next = {
      ...wsRef.current,
      [name]: {
        name,
        savedAt: new Date().toISOString(),
        ...existing,
        ...data,
      },
    }
    persist(next)
    setCurrent(name)
    localStorage.setItem(CURRENT_KEY, name)
  }, [])

  const loadWorkspace = useCallback((name: string) => {
    const ws = wsRef.current[name] || null
    if (ws) {
      setCurrent(name)
      localStorage.setItem(CURRENT_KEY, name)
      if (ws.widgetOrder) {
        try {
          const orderKey = ws.name === currentWorkspace ? '' : `${name}_order`
          if (ws.widgetOrder) localStorage.setItem(`dashboard_widget_order`, JSON.stringify(ws.widgetOrder))
          if (ws.widgetVisibility) localStorage.setItem(`dashboard_widget_order_visible`, JSON.stringify(ws.widgetVisibility))
          if (ws.widgetSizes) localStorage.setItem(`dashboard_widget_order_sizes`, JSON.stringify(ws.widgetSizes))
        } catch {}
      }
    }
    return ws
  }, [currentWorkspace])

  const deleteWorkspace = useCallback((name: string) => {
    const next = { ...wsRef.current }
    delete next[name]
    persist(next)
    if (currentWorkspace === name) {
      setCurrent('')
      localStorage.removeItem(CURRENT_KEY)
    }
  }, [currentWorkspace])

  const listWorkspaces = useCallback(() => Object.keys(wsRef.current), [])

  const captureWidgetState = useCallback((storageKey: string) => {
    try {
      const order = JSON.parse(localStorage.getItem(storageKey) || 'null')
      const visibility = JSON.parse(localStorage.getItem(`${storageKey}_visible`) || 'null')
      const sizes = JSON.parse(localStorage.getItem(`${storageKey}_sizes`) || 'null')
      const name = wsRef.current[currentWorkspace]?.name || 'default'
      saveWorkspace(name, {
        widgetLayout: { [storageKey]: { order, visibility, sizes } },
        widgetOrder: order,
        widgetVisibility: visibility,
        widgetSizes: sizes,
      })
    } catch {}
  }, [currentWorkspace, saveWorkspace])

  const applyWidgetState = useCallback((storageKey: string, name: string) => {
    const ws = wsRef.current[name]
    if (!ws) return
    try {
      const layout = ws.widgetLayout?.[storageKey]
      if (layout?.order) localStorage.setItem(storageKey, JSON.stringify(layout.order))
      if (layout?.visibility) localStorage.setItem(`${storageKey}_visible`, JSON.stringify(layout.visibility))
      if (layout?.sizes) localStorage.setItem(`${storageKey}_sizes`, JSON.stringify(layout.sizes))
      window.dispatchEvent(new StorageEvent('storage', { key: storageKey }))
    } catch {}
  }, [])

  return (
    <WorkspaceContext.Provider value={{
      workspaces, currentWorkspace, saveWorkspace, loadWorkspace, deleteWorkspace,
      listWorkspaces, captureWidgetState, applyWidgetState,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
