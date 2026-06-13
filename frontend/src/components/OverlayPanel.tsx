import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface OverlayPanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export default function OverlayPanel({ open, onClose, title, children, width = 400 }: OverlayPanelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div
        ref={ref}
        className="h-full overflow-y-auto bg-primary border-l border-default"
        style={{
          width,
          animation: 'slide-in-right 0.15s ease-out',
        }}
      >
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-default">
          <span className="text-xs font-mono-data font-semibold">{title}</span>
          <button onClick={onClose} className="cursor-pointer bg-transparent border-none text-muted hover:text-primary p-0.5">
            <X size={14} />
          </button>
        </div>
        <div className="p-3 text-xs">
          {children}
        </div>
      </div>
      <style>{`@keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  )
}
