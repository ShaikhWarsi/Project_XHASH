import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '../utils/routes'

const PINNED_KEY = 'te_pinned_tabs'

interface TabItem {
  id: string
  path: string
  label: string
  pinned?: boolean
}

interface TabContextValue {
  tabs: TabItem[]
  activeTab: string | null
  openTab: (path: string) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  togglePinTab: (id: string) => void
}

const TabContext = createContext<TabContextValue | null>(null)

const MAX_TABS = 12

function getLabelForPath(path: string): string {
  const route = ROUTES.find((r) => r.path === path)
  if (route) return route.label
  const parts = path.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return last ? last.replace(/-/g, ' ') : 'Dashboard'
}

const HOME_TAB: TabItem = { id: '/', path: '/', label: 'Dashboard' }

function loadPinnedTabs(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]') }
  catch { return [] }
}

function savePinnedTabs(pinned: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(pinned))
}

export function TabProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const pinnedRef = useRef<string[]>(loadPinnedTabs())
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const pinned = pinnedRef.current
    if (pinned.length === 0) return [HOME_TAB]
    return [
      HOME_TAB,
      ...pinned.map((id) => ({ id, path: id, label: getLabelForPath(id), pinned: true })),
    ]
  })
  const [activeTab, setActiveTab] = useState<string>('/')
  const prevPathRef = useRef(location.pathname)

  useEffect(() => {
    const path = location.pathname
    if (path === prevPathRef.current) return
    prevPathRef.current = path

    setActiveTab(path)

    setTabs((prev) => {
      const existing = prev.find((t) => t.id === path)
      if (existing) return prev
      if (prev.length >= MAX_TABS) return prev
      const newTab: TabItem = { id: path, path, label: getLabelForPath(path) }
      return [...prev, newTab]
    })
  }, [location.pathname])

  const openTab = useCallback((path: string) => {
    navigate(path)
  }, [navigate])

  const closeTab = useCallback((id: string) => {
    if (id === '/' || pinnedRef.current.includes(id)) return
    let nextPath: string | null = null
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const isActiveClose = activeTab === id
      const next = prev.filter((t) => t.id !== id)
      if (isActiveClose && next.length > 0) {
        nextPath = next[Math.min(idx, next.length - 1)].path
      }
      return next
    })
    if (nextPath) navigate(nextPath)
  }, [navigate, activeTab])

  const togglePinTab = useCallback((id: string) => {
    if (id === '/') return
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx === -1) return prev
      const newPinned = [...pinnedRef.current]
      const pinnedIdx = newPinned.indexOf(id)
      if (pinnedIdx >= 0) {
        newPinned.splice(pinnedIdx, 1)
      } else {
        newPinned.push(id)
      }
      pinnedRef.current = newPinned
      savePinnedTabs(newPinned)
      return prev.map((t) => t.id === id ? { ...t, pinned: newPinned.includes(id) } : t)
    })
  }, [])

  return (
    <TabContext.Provider value={{ tabs, activeTab, openTab, closeTab, setActiveTab, togglePinTab }}>
      {children}
    </TabContext.Provider>
  )
}

export function useTabs() {
  const ctx = useContext(TabContext)
  if (!ctx) throw new Error('useTabs must be used within TabProvider')
  return ctx
}
