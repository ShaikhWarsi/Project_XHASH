import { useState, useCallback, useEffect } from 'react'

const LS_KEY = 'colorblind_mode'

type Mode = 'default' | 'deuteranopia' | 'protanopia'

interface ColorblindToggleProps {
  onChange?: (mode: string) => void
}

const PALETTES: Record<Mode, Record<string, string>> = {
  default: {
    '--accent-green': '#22c55e',
    '--accent-red': '#ef4444',
    '--chart-candle-up': '#22c55e',
    '--chart-candle-down': '#ef4444',
  },
  deuteranopia: {
    '--accent-green': '#0066cc',
    '--accent-red': '#cc6600',
    '--chart-candle-up': '#0066cc',
    '--chart-candle-down': '#cc6600',
  },
  protanopia: {
    '--accent-green': '#0055aa',
    '--accent-red': '#aa5500',
    '--chart-candle-up': '#0055aa',
    '--chart-candle-down': '#aa5500',
  },
}

const PATTERN_DEFS: Record<string, string> = {
  deuteranopia: `
    <svg style="position:absolute;width:0;height:0">
      <defs>
        <pattern id="cb-up" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#0066cc" opacity="0.15"/>
          <line x1="0" y1="6" x2="6" y2="0" stroke="#0066cc" stroke-width="1" opacity="0.4"/>
        </pattern>
        <pattern id="cb-down" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#cc6600" opacity="0.15"/>
          <line x1="0" y1="0" x2="6" y2="6" stroke="#cc6600" stroke-width="1" opacity="0.4"/>
        </pattern>
      </defs>
    </svg>`,
  protanopia: `
    <svg style="position:absolute;width:0;height:0">
      <defs>
        <pattern id="cb-up" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#0055aa" opacity="0.15"/>
          <circle cx="3" cy="3" r="1" fill="#0055aa" opacity="0.4"/>
        </pattern>
        <pattern id="cb-down" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#aa5500" opacity="0.15"/>
          <rect x="1" y="1" width="2" height="2" fill="#aa5500" opacity="0.4"/>
        </pattern>
      </defs>
    </svg>`,
}

export default function ColorblindToggle({ onChange }: ColorblindToggleProps) {
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved === 'deuteranopia' || saved === 'protanopia') return saved
    } catch {}
    return 'default'
  })

  const selectMode = useCallback(
    (m: Mode) => {
      setMode(m)
      localStorage.setItem(LS_KEY, m)
      onChange?.(m)
    },
    [onChange],
  )

  const styleId = 'colorblind-override-style'
  const patternId = 'colorblind-patterns'

  useEffect(() => {
    let el = document.getElementById(styleId) as HTMLStyleElement | null
    const palette = PALETTES[mode]
    if (mode === 'default') {
      if (el) el.remove()
      document.getElementById(patternId)?.remove()
      return
    }
    if (!el) {
      el = document.createElement('style')
      el.id = styleId
      document.head.appendChild(el)
    }
    const rules = Object.entries(palette)
      .map(([key, val]) => `${key}: ${val};`)
      .join(' ')
    el.textContent = `:root { ${rules} }`

    let patternEl = document.getElementById(patternId)
    if (!patternEl) {
      patternEl = document.createElement('div')
      patternEl.id = patternId
      patternEl.style.position = 'absolute'
      patternEl.style.width = '0'
      patternEl.style.height = '0'
      document.body.appendChild(patternEl)
    }
    patternEl.innerHTML = PATTERN_DEFS[mode] || ''

    return () => {
      el?.remove()
      patternEl?.remove()
    }
  }, [mode])

  const modes: Mode[] = ['default', 'deuteranopia', 'protanopia']

  return (
    <div className="flex items-center gap-1 font-mono text-[10px]">
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => selectMode(m)}
          className="px-2 py-0.5 cursor-pointer text-[10px] font-mono transition-colors"
          style={{
            background: mode === m ? 'var(--bg-hover)' : 'transparent',
            color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
            border: '1px solid',
            borderColor: mode === m ? 'var(--border-color)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {m === 'default' ? 'Default' : m === 'deuteranopia' ? 'Deut' : 'Prot'}
        </button>
      ))}
    </div>
  )
}
