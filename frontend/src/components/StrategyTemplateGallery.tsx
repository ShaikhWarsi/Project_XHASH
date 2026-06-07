import { useState, useEffect } from 'react'
import Card from './ui/Card'
import { useToastStore } from '../store/toast'
import { FileText, Play, Download } from 'lucide-react'

interface Template {
  name: string
  description: string
  code: string
}

export function StrategyTemplateGallery() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    let cancelled = false
    fetch('/api/finscript/templates')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data.templates || []
        setTemplates(list)
      })
      .catch(() => { if (!cancelled) setError('Failed to load templates') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const loadAndBacktest = async (tpl: Template) => {
    try {
      localStorage.setItem('finscript-strategy', tpl.code)
      window.open('/strategy/code?backtest=1', '_blank')
      addToast(`Loaded ${tpl.name} — ready to backtest`, 'info')
    } catch {
      addToast('Failed to load template', 'error')
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="h-4 w-3/4 mb-2" style={{ background: 'var(--bg-hover)', borderRadius: 2 }} />
            <div className="h-8 w-full mb-3" style={{ background: 'var(--bg-hover)', borderRadius: 2 }} />
            <div className="h-6 w-1/2" style={{ background: 'var(--bg-hover)', borderRadius: 2 }} />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</div>
  }

  if (templates.length === 0) {
    return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No strategy templates available.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((tpl) => (
        <div key={tpl.name} className="rounded-xl p-4 transition-all hover:shadow-lg"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-start gap-3 mb-3">
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={14} style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{tpl.name}</div>
              <div className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{tpl.description || 'No description'}</div>
            </div>
          </div>
          {tpl.code && (
            <pre className="text-[8px] p-2 rounded mb-3 overflow-hidden"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', maxHeight: 60 }}>
              {tpl.code.slice(0, 200)}{tpl.code.length > 200 ? '...' : ''}
            </pre>
          )}
          <div className="flex gap-2">
            <button onClick={() => loadAndBacktest(tpl)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 500 }}>
              <Play size={10} />
              Load & Backtest
            </button>
            <button onClick={() => { localStorage.setItem('finscript-strategy', tpl.code); addToast('Code copied to editor', 'info') }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', borderRadius: 4, background: 'var(--bg-hover)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 9 }}>
              <Download size={10} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
