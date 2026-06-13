import { useState, useCallback } from 'react'
import OverlayPanel from './OverlayPanel'

export function useNewsOverlay() {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  const panel = (
    <OverlayPanel open={open} onClose={() => setOpen(false)} title="News">
      <div className="text-muted">News feed content here.</div>
    </OverlayPanel>
  )
  return { open, toggle, panel }
}
