import { useState, useEffect, useRef, useCallback } from 'react'

export default function StreamResponse({
  fetchStream,
  className = '',
}: {
  fetchStream: (onToken: (token: string) => void) => Promise<void>
  className?: string
}) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortedRef = useRef(false)

  const start = useCallback(async () => {
    setText('')
    setDone(false)
    setError(null)
    abortedRef.current = false
    try {
      await fetchStream((token: string) => {
        if (!abortedRef.current) {
          setText((prev) => prev + token)
        }
      })
      if (!abortedRef.current) setDone(true)
    } catch (err: any) {
      if (!abortedRef.current) setError(err?.message || 'Stream failed')
    }
  }, [fetchStream])

  useEffect(() => {
    start()
    return () => { abortedRef.current = true }
  }, [start])

  if (error) return <div className="text-down text-[10px] font-mono-data">{error}</div>

  return (
    <div className={`font-mono-data text-[10px] text-primary whitespace-pre-wrap leading-relaxed ${className}`}>
      {text || ' '}
      {!done && (
        <span
          className="inline-block w-[2px] h-[12px] ml-[1px] align-middle"
          style={{
            background: 'var(--accent-cyan)',
            animation: 'blink 1s step-end infinite',
          }}
        />
      )}
    </div>
  )
}
