import { useState, useCallback, useEffect, useRef } from 'react'
import { PictureInPicture2, ExternalLink } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const PIP_CHANNEL = 'opencode:pip'

export default function PictureInPicture({ symbol }: { symbol?: string }) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const location = useLocation()
  const bcRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    bcRef.current = new BroadcastChannel(PIP_CHANNEL)
    return () => { bcRef.current?.close() }
  }, [])

  useEffect(() => {
    if (pipWindow && !pipWindow.closed) {
      bcRef.current?.postMessage({ type: 'symbol', symbol: symbol || location.pathname })
    }
  }, [symbol, location.pathname, pipWindow])

  const openPiP = useCallback(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.focus()
      return
    }
    const base = window.location.origin
    const symbolParam = symbol ? `?symbol=${symbol}` : ''
    const w = window.open(
      `${base}/markets/chart${symbolParam}&pip=true`,
      'pip-chart',
      'width=480,height=360,menubar=no,toolbar=no,location=no,status=no'
    )
    if (w) setPipWindow(w)
  }, [pipWindow, symbol])

  const closePiP = useCallback(() => {
    if (pipWindow && !pipWindow.closed) pipWindow.close()
    setPipWindow(null)
  }, [pipWindow])

  const isOpen = pipWindow && !pipWindow.closed

  return (
    <button
      onClick={isOpen ? closePiP : openPiP}
      title={isOpen ? 'Close Picture-in-Picture' : 'Open Picture-in-Picture'}
      className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono-data cursor-pointer rounded-sm border border-default bg-card hover:bg-hover transition-colors"
      style={{ color: isOpen ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
    >
      {isOpen ? <PictureInPicture2 size={10} /> : <ExternalLink size={10} />}
      <span>{isOpen ? 'PiP' : 'POP'}</span>
    </button>
  )
}
