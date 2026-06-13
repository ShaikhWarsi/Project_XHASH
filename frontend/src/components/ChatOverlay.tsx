import { useState, useCallback } from 'react'
import OverlayPanel from './OverlayPanel'

export function useChatOverlay() {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  const panel = (
    <OverlayPanel open={open} onClose={() => setOpen(false)} title="Chat" width={360}>
      <div className="text-muted">Chat content here.</div>
    </OverlayPanel>
  )
  return { open, toggle, panel }
}
