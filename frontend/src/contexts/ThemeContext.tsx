import { createContext, useContext, useEffect, useState, useCallback, type ReactNode, useRef } from 'react'

export type ThemeName = 'classic' | 'matrix' | 'amber' | 'cyber' | 'terminal' | 'light' | 'auto'

const THEME_CYCLE: ThemeName[] = ['classic', 'matrix', 'amber', 'cyber', 'terminal', 'light', 'auto']

const DARK_THEMES: ThemeName[] = ['classic', 'matrix', 'amber', 'cyber', 'terminal']

function prefersDark(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(theme: ThemeName): ThemeName {
  if (theme === 'auto') return prefersDark() ? 'classic' : 'light'
  return theme
}

interface ThemeContextType {
  theme: ThemeName
  resolvedTheme: ThemeName
  setTheme: (t: ThemeName) => void
  cycleTheme: () => void
  density: 'normal' | 'compact'
  setDensity: (d: 'normal' | 'compact') => void
  fontSize: number
  setFontSize: (s: number) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const STORAGE_THEME = 'te_theme'
const STORAGE_DENSITY = 'te_density'
const STORAGE_FONTSIZE = 'te_fontsize'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() =>
    (typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_THEME) as ThemeName) : null) || 'classic'
  )
  const [resolvedTheme, setResolvedTheme] = useState<ThemeName>(() => resolveTheme(theme))
  const [density, setDensityState] = useState<'normal' | 'compact'>(() =>
    (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_DENSITY) as 'normal' | 'compact' : null) || 'normal'
  )
  const [fontSize, setFontSizeState] = useState<number>(() =>
    typeof window !== 'undefined' ? Number(localStorage.getItem(STORAGE_FONTSIZE)) || 14 : 14
  )
  const rootRef = useRef(document.documentElement)

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_THEME, t)
    setResolvedTheme(resolveTheme(t))
  }, [])

  const cycleTheme = useCallback(() => {
    const idx = THEME_CYCLE.indexOf(theme)
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length])
  }, [theme, setTheme])

  const setDensity = useCallback((d: 'normal' | 'compact') => {
    setDensityState(d)
    localStorage.setItem(STORAGE_DENSITY, d)
  }, [])

  const setFontSize = useCallback((s: number) => {
    setFontSizeState(s)
    localStorage.setItem(STORAGE_FONTSIZE, String(s))
  }, [])

  useEffect(() => {
    const resolved = resolveTheme(theme)
    setResolvedTheme(resolved)
    const root = rootRef.current
    root.className = `theme-${resolved}`
    root.style.setProperty('--font-size-base', `${fontSize}px`)
    root.style.setProperty('--font-size-xs', `${Math.max(fontSize - 3, 10)}px`)
    root.style.setProperty('--font-size-sm', `${fontSize - 1}px`)
    root.style.setProperty('--font-size-lg', `${fontSize + 1}px`)
    root.style.setProperty('--font-size-xl', `${fontSize + 6}px`)
    root.style.setProperty('--card-padding', density === 'compact' ? '0.75rem' : '1.25rem')
    root.style.setProperty('--card-radius', density === 'compact' ? '0.5rem' : '0.75rem')
    root.style.setProperty('--sidebar-width', density === 'compact' ? '180px' : '220px')
  }, [theme, density, fontSize])

  useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setResolvedTheme(resolveTheme('auto'))
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme, density, setDensity, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
