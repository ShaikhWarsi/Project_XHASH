import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { fetchLogFiles, fetchLogContent, clearLogs, type LogFile } from '../api/pythonStrategy'
import { ArrowLeft, Trash2, RefreshCw, FileText } from 'lucide-react'

export default function PythonStrategyLogs() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [logFiles, setLogFiles] = useState<LogFile[]>([])
  const [selectedLog, setSelectedLog] = useState<string | null>(null)
  const [logContent, setLogContent] = useState('')
  const [loading, setLoading] = useState(true)
  const addToast = useToastStore((s) => s.addToast)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const files = await fetchLogFiles(id)
      setLogFiles(files)
      if (files.length > 0 && !selectedLog) {
        setSelectedLog(files[0].name)
      }
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [id, addToast, selectedLog])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedLog && id) {
      fetchLogContent(id, selectedLog).then(setLogContent).catch(() => setLogContent(''))
    }
  }, [selectedLog, id])

  const handleClear = async () => {
    if (!id) return
    if (!confirm('Clear all log files?')) return
    try {
      await clearLogs(id)
      setLogFiles([])
      setSelectedLog(null)
      setLogContent('')
      addToast('Logs cleared', 'success')
    } catch (err: any) {
      addToast(`Failed: ${err?.message}`, 'error')
    }
  }

  const autoRefresh = () => {
    if (id) {
      fetchLogFiles(id).then(setLogFiles).catch((err) => console.warn('[PythonStrategyLogs] failed:', err))
      if (selectedLog) {
        fetchLogContent(id, selectedLog).then(setLogContent).catch((err) => console.warn('[PythonStrategyLogs] failed:', err))
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(autoRefresh, 5000)
    return () => clearInterval(interval)
  }, [id, selectedLog])

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton width={200} height={16} />
        <Skeleton height={300} variant="rect" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
          <FileText size={12} className="inline mr-1" /> Strategy Logs
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/openalgo/python-strategy')}><ArrowLeft size={12} /> Back</Button>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /></Button>
          <Button variant="ghost" size="sm" onClick={handleClear}><Trash2 size={12} /> Clear</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <div style={{ gridColumn: 'span 1' }}>
        <Card title="Log Files">
          {logFiles.length === 0 ? (
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>No log files</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {logFiles.map((f) => (
                <button key={f.name} onClick={() => setSelectedLog(f.name)}
                  className="text-left px-2 py-1 text-[9px] font-mono rounded-sm outline-none transition-colors"
                  style={{
                    background: selectedLog === f.name ? 'var(--accent-cyan)' : 'transparent',
                    color: selectedLog === f.name ? '#fff' : 'var(--text-primary)',
                  }}>
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </Card>
        </div>

        <div style={{ gridColumn: 'span 3' }}>
        <Card title={selectedLog ?? 'Select a log file'}>
          {selectedLog ? (
            <pre className="font-mono text-[9px] whitespace-pre-wrap" style={{ color: 'var(--text-primary)', maxHeight: '500px', overflow: 'auto' }}>
              {logContent || 'Loading...'}
            </pre>
          ) : (
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Select a log file to view</p>
          )}
        </Card>
        </div>
      </div>
    </div>
  )
}
