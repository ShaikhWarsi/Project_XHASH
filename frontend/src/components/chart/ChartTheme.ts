export interface ChartThemeColors {
  bg: string
  card: string
  border: string
  text: string
  textPrimary: string
  up: string
  down: string
  accent: string
  accentYellow: string
  accentOrange: string
  accentPurple: string
  upColorway: string[]
  downColorway: string[]
}

export const DARK_THEME: ChartThemeColors = {
  bg: '#0a0e14',
  card: '#0d1117',
  border: '#1a2332',
  text: '#5d6b7e',
  textPrimary: '#e8eaed',
  up: '#26a69a',
  down: '#ef5350',
  accent: '#3b82f6',
  accentYellow: '#ffd54f',
  accentOrange: '#ff9800',
  accentPurple: '#ab47bc',
  upColorway: ['#26a69a', '#00bcd4', '#66bb6a', '#4caf50', '#009688'],
  downColorway: ['#ef5350', '#e57373', '#f44336', '#d32f2f', '#b71c1c'],
}

export const LIGHT_THEME: ChartThemeColors = {
  bg: '#ffffff',
  card: '#f5f5f5',
  border: '#e0e0e0',
  text: '#616161',
  textPrimary: '#212121',
  up: '#26a69a',
  down: '#ef5350',
  accent: '#1a73e8',
  accentYellow: '#f9a825',
  accentOrange: '#ef6c00',
  accentPurple: '#8e24aa',
  upColorway: ['#26a69a', '#00bcd4', '#66bb6a', '#4caf50', '#009688'],
  downColorway: ['#ef5350', '#e57373', '#f44336', '#d32f2f', '#b71c1c'],
}

export type ThemeName = 'dark' | 'light'

const THEME_STORAGE_KEY = 'trading-engine-theme'

export function getStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

export function storeTheme(theme: ThemeName): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {}
}

export function getThemeColors(theme: ThemeName): ChartThemeColors {
  return theme === 'light' ? LIGHT_THEME : DARK_THEME
}

export function applyThemeToDocument(theme: ChartThemeColors): void {
  const root = document.documentElement
  root.style.setProperty('--bg-primary', theme.bg)
  root.style.setProperty('--bg-card', theme.card)
  root.style.setProperty('--border-color', theme.border)
  root.style.setProperty('--text-primary', theme.textPrimary)
  root.style.setProperty('--text-secondary', theme.text)
  root.style.setProperty('--color-up', theme.up)
  root.style.setProperty('--color-down', theme.down)
  root.style.setProperty('--accent-blue', theme.accent)
  root.style.setProperty('--accent-yellow', theme.accentYellow)
  root.style.setProperty('--accent-orange', theme.accentOrange)
  root.style.setProperty('--accent-purple', theme.accentPurple)
}

export function getLightweightChartTheme(theme: ChartThemeColors): Record<string, any> {
  return {
    layout: {
      background: { color: theme.bg },
      textColor: theme.text,
    },
    grid: {
      vertLines: { color: theme.border },
      horzLines: { color: theme.border },
    },
    crosshair: {
      vertLine: { color: theme.accent, width: 1, labelBackgroundColor: theme.accent },
      horzLine: { color: theme.accent, width: 1, labelBackgroundColor: theme.accent },
    },
    timeScale: {
      borderColor: theme.border,
    },
    rightPriceScale: {
      borderColor: theme.border,
    },
  }
}
