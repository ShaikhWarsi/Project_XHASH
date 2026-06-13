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

export const MATRIX_THEME: ChartThemeColors = {
  bg: '#000000',
  card: '#0a0a0a',
  border: '#0d3b0d',
  text: '#00aa00',
  textPrimary: '#00ff00',
  up: '#00ff41',
  down: '#008000',
  accent: '#00cc00',
  accentYellow: '#66ff66',
  accentOrange: '#33cc33',
  accentPurple: '#009900',
  upColorway: ['#00ff41', '#33ff33', '#66ff66', '#99ff99', '#ccffcc'],
  downColorway: ['#008000', '#006600', '#004d00', '#003300', '#001a00'],
}

export const AMBER_THEME: ChartThemeColors = {
  bg: '#0a0800',
  card: '#0f0c00',
  border: '#332200',
  text: '#aa7700',
  textPrimary: '#ffb000',
  up: '#ffaa00',
  down: '#804000',
  accent: '#ff8800',
  accentYellow: '#ffcc44',
  accentOrange: '#ff6600',
  accentPurple: '#cc5500',
  upColorway: ['#ffaa00', '#ffbb33', '#ffcc66', '#ffdd99', '#ffeedd'],
  downColorway: ['#804000', '#663300', '#4d2600', '#331a00', '#1a0d00'],
}

export const CYBER_THEME: ChartThemeColors = {
  bg: '#0a0014',
  card: '#0f0020',
  border: '#2a0050',
  text: '#8844cc',
  textPrimary: '#cc66ff',
  up: '#aa44ff',
  down: '#6622aa',
  accent: '#8800ff',
  accentYellow: '#bb66ff',
  accentOrange: '#9933ff',
  accentPurple: '#7700cc',
  upColorway: ['#aa44ff', '#bb66ff', '#cc88ff', '#ddaaff', '#eeccee'],
  downColorway: ['#6622aa', '#551188', '#440d66', '#330944', '#220422'],
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

export type ThemeName = 'dark' | 'light' | 'classic' | 'matrix' | 'amber' | 'cyber' | 'terminal' | 'highcontrast' | 'sunlight' | 'auto'

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
    fetch('/api/user/preferences/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme }),
    }).catch((err) => console.warn('[ChartTheme] failed to persist theme:', err))
  } catch (e) { console.warn('[ChartTheme] failed to persist theme:', e) }
}

export const HIGHCONTRAST_THEME: ChartThemeColors = {
  bg: '#000000',
  card: '#0d0d0d',
  border: '#ffffff',
  text: '#cccccc',
  textPrimary: '#ffffff',
  up: '#00ff00',
  down: '#ff0000',
  accent: '#00aaff',
  accentYellow: '#ffff00',
  accentOrange: '#ff8800',
  accentPurple: '#ff00ff',
  upColorway: ['#00ff00', '#33ff33', '#66ff66', '#99ff99', '#ccffcc'],
  downColorway: ['#ff0000', '#cc0000', '#990000', '#660000', '#330000'],
}

export const SUNLIGHT_THEME: ChartThemeColors = {
  bg: '#fff5e6',
  card: '#ffffff',
  border: '#cccc99',
  text: '#555533',
  textPrimary: '#1a1a00',
  up: '#006600',
  down: '#cc0000',
  accent: '#0044cc',
  accentYellow: '#996600',
  accentOrange: '#cc4400',
  accentPurple: '#6600cc',
  upColorway: ['#006600', '#228833', '#44aa55', '#66cc77', '#88ee99'],
  downColorway: ['#cc0000', '#aa0000', '#880000', '#660000', '#440000'],
}

const THEME_PALETTE: Record<string, ChartThemeColors> = {
  dark: DARK_THEME,
  classic: DARK_THEME,
  matrix: MATRIX_THEME,
  amber: AMBER_THEME,
  cyber: CYBER_THEME,
  terminal: DARK_THEME,
  light: LIGHT_THEME,
  highcontrast: HIGHCONTRAST_THEME,
  sunlight: SUNLIGHT_THEME,
}

export function getThemeColors(theme: string): ChartThemeColors {
  if (theme === 'auto') return (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? DARK_THEME : LIGHT_THEME
  return THEME_PALETTE[theme] || DARK_THEME
}

export function applyThemeToDocument(theme: ChartThemeColors): void {
  try {
    const root = document.documentElement
    if (!root || !root.style) return
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
  } catch {
    console.debug('[ChartTheme] applyThemeToDocument failed')
  }
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
