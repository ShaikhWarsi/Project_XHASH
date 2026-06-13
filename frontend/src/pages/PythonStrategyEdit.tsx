import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { fetchStrategy, fetchStrategyContent, updateStrategyContent, type PythonStrategy } from '../api/pythonStrategy'
import { ArrowLeft, Save, Play, Square, Terminal } from 'lucide-react'
import Editor from '@monaco-editor/react'

export default function PythonStrategyEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [strategy, setStrategy] = useState<PythonStrategy | null>(null)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [s, c] = await Promise.all([fetchStrategy(id), fetchStrategyContent(id)])
      setStrategy(s)
      setContent(c)
      setOriginalContent(c)
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [id, addToast])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      await updateStrategyContent(id, content)
      setOriginalContent(content)
      addToast('Saved', 'success')
    } catch (err: any) {
      addToast(`Save failed: ${err?.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleRunning = async () => {
    if (!id || !strategy) return
    try {
      if (strategy.is_running) {
        const { stopStrategy } = await import('../api/pythonStrategy')
        await stopStrategy(id)
      } else {
        const { startStrategy } = await import('../api/pythonStrategy')
        await startStrategy(id)
      }
      load()
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={400} variant="rect" />
      </div>
    )
  }

  if (!strategy) {
    return (
      <Card>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Strategy not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/python-strategy')}><ArrowLeft size={12} /> Back</Button>
      </Card>
    )
  }

  const dirty = content !== originalContent

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <Terminal size={12} className="inline mr-1" /> {strategy.name}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/python-strategy')}><ArrowLeft size={12} /> Back</Button>
          <Button variant="ghost" size="sm" onClick={handleToggleRunning}>
            {strategy.is_running ? <><Square size={12} /> Stop</> : <><Play size={12} /> Start</>}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>
            <Save size={12} /> Save
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
        <span>{strategy.filename}</span>
        <span>·</span>
        <span>{strategy.exchange}</span>
        <span>·</span>
        <span>{strategy.schedule_start}-{strategy.schedule_stop}</span>
        {dirty && <span style={{ color: 'var(--accent-yellow)' }}>· unsaved changes</span>}
      </div>

      <div className="rounded-sm overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
        <Editor
          height="600px"
          language="python"
          theme="vs-dark"
          value={content}
          onChange={(val) => setContent(val ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            scrollBeyondLastLine: false,
            readOnly: strategy.is_running,
          }}
        />
      </div>
    </div>
  )
}
