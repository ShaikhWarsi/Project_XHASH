import { useState, useEffect } from 'react'

interface ThemeColors {
  bgPrimary: string
  bgCard: string
  bgInput: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  borderColor: string
  accentBlue: string
  accentGreen: string
  accentRed: string
  accentYellow: string
  accentCyan: string
  accentPurple: string
}

const COLOR_LABELS: Record<keyof ThemeColors, string> = {
  bgPrimary: 'Background',
  bgCard: 'Card BG',
  bgInput: 'Input BG',
  textPrimary: 'Primary Text',
  textSecondary: 'Secondary Text',
  textMuted: 'Muted Text',
  borderColor: 'Border',
  accentBlue: 'Blue',
  accentGreen: 'Green',
  accentRed: 'Red',
  accentYellow: 'Yellow',
  accentCyan: 'Cyan',
  accentPurple: 'Purple',
}

const DEFAULT_LIGHT: ThemeColors = {
  bgPrimary: '#ffffff',
  bgCard: '#f6f8fa',
  bgInput: '#ffffff',
  textPrimary: '#1f2328',
  textSecondary: '#656d76',
  textMuted: '#8b949e',
  borderColor: '#d0d7de',
  accentBlue: '#0969da',
  accentGreen: '#1a7f37',
  accentRed: '#cf222e',
  accentYellow: '#bf8700',
  accentCyan: '#1b7c83',
  accentPurple: '#8250df',
}

const DEFAULT_DARK: ThemeColors = {
  bgPrimary: '#0d1117',
  bgCard: '#151c23',
  bgInput: '#0a0e14',
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  textMuted: '#5d6b7e',
  borderColor: '#1a2332',
  accentBlue: '#3b82f6',
  accentGreen: '#22c55e',
  accentRed: '#ef4444',
  accentYellow: '#f59e0b',
  accentCyan: '#06b6d4',
  accentPurple: '#a855f7',
}

interface Props {
  isDark: boolean
  currentColors?: Partial<ThemeColors>
  onSave: (colors: ThemeColors) => void
  onClose: () => void
}

export default function CustomThemeEditor({ isDark, currentColors, onSave, onClose }: Props) {
  const defaults = isDark ? DEFAULT_DARK : DEFAULT_LIGHT
  const [colors, setColors] = useState<ThemeColors>({ ...defaults, ...currentColors })
  const [preset, setPreset] = useState<'custom' | 'default'>('custom')

  const applyPreset = (p: 'dark' | 'light' | 'default') => {
    if (p === 'dark') {
      setColors(DEFAULT_DARK)
      setPreset('default')
    } else if (p === 'light') {
      setColors(DEFAULT_LIGHT)
      setPreset('default')
    } else {
      setColors(isDark ? DEFAULT_DARK : DEFAULT_LIGHT)
      setPreset('default')
    }
  }

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
    setPreset('custom')
  }

  const resetToDefaults = () => {
    setColors(isDark ? DEFAULT_DARK : DEFAULT_LIGHT)
    setPreset('default')
  }

  const handleExport = () => {
    const cssVars = Object.entries(colors).map(([key, val]) => {
      const varName = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `  --${varName}: ${val};`
    }).join('\n')
    const css = `:root {\n${cssVars}\n}`
    navigator.clipboard?.writeText(css)
  }

  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 10000, width: 480, maxHeight: '80vh', overflow: 'auto',
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: 8, padding: 16,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>Theme Editor</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        <button onClick={() => applyPreset('dark')} style={{
          padding: '4px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
          background: 'transparent', border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
        }}>Dark</button>
        <button onClick={() => applyPreset('light')} style={{
          padding: '4px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
          background: 'transparent', border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)',
        }}>Light</button>
        <button onClick={resetToDefaults} style={{
          padding: '4px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
          background: 'transparent', border: '1px solid var(--border-color)',
          color: 'var(--text-muted)',
        }}>Reset</button>
        <button onClick={handleExport} style={{
          padding: '4px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
          background: 'var(--accent-blue)', border: 'none', color: '#fff', marginLeft: 'auto',
        }}>Export CSS</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map(key => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="color"
              value={colors[key]}
              onChange={e => updateColor(key, e.target.value)}
              style={{ width: 28, height: 28, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 8 }}>{COLOR_LABELS[key]}</div>
              <input
                type="text"
                value={colors[key]}
                onChange={e => updateColor(key, e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-input, #0a0e14)',
                  border: '1px solid var(--border-color, #1a2332)',
                  color: 'var(--text-primary)', padding: '1px 4px', fontSize: 9,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 4, padding: 8, background: colors.bgPrimary, borderRadius: 4, border: `1px solid ${colors.borderColor}` }}>
        <span style={{ background: colors.accentBlue, width: 8, height: 8, borderRadius: '50%' }} />
        <span style={{ background: colors.accentGreen, width: 8, height: 8, borderRadius: '50%' }} />
        <span style={{ background: colors.accentRed, width: 8, height: 8, borderRadius: '50%' }} />
        <span style={{ background: colors.accentYellow, width: 8, height: 8, borderRadius: '50%' }} />
        <span style={{ background: colors.accentCyan, width: 8, height: 8, borderRadius: '50%' }} />
        <span style={{ background: colors.accentPurple, width: 8, height: 8, borderRadius: '50%' }} />
        <div style={{ marginLeft: 8, color: colors.textPrimary, fontSize: 8 }}>Sample Text</div>
        <div style={{ color: colors.textSecondary, fontSize: 8 }}>Secondary</div>
        <div style={{ color: colors.textMuted, fontSize: 8 }}>Muted</div>
      </div>

      <button onClick={() => onSave(colors)} style={{
        marginTop: 12, width: '100%', padding: '6px 12px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer',
        background: 'var(--accent-blue, #3b82f6)', border: 'none', color: '#fff',
      }}>
        Apply Theme
      </button>
    </div>
  )
}
