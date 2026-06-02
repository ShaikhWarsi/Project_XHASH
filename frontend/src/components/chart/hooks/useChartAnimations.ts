import { useCallback, useEffect, useRef } from 'react'
import type { IChartApi } from 'lightweight-charts'

export function useChartAnimations(
  chart: IChartApi | null,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const flashRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number>(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    let overlay = overlayRef.current
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.style.position = 'absolute'
      overlay.style.top = '0'
      overlay.style.left = '0'
      overlay.style.width = '100%'
      overlay.style.height = '100%'
      overlay.style.pointerEvents = 'none'
      overlay.style.zIndex = '20'
      overlay.style.opacity = '0'
      overlay.style.transform = 'scale(0.97)'
      overlay.style.transition = 'opacity 200ms ease, transform 200ms ease'
      overlay.style.background = 'rgba(0,0,0,0.5)'
      overlay.style.borderRadius = '4px'
      container.appendChild(overlay)
      overlayRef.current = overlay
    }

    let flash = flashRef.current
    if (!flash) {
      flash = document.createElement('div')
      flash.style.position = 'absolute'
      flash.style.top = '0'
      flash.style.left = '0'
      flash.style.width = '100%'
      flash.style.height = '20px'
      flash.style.pointerEvents = 'none'
      flash.style.zIndex = '21'
      flash.style.opacity = '0'
      flash.style.background =
        'linear-gradient(180deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0) 100%)'
      flash.style.transition = 'opacity 150ms ease'
      container.appendChild(flash)
      flashRef.current = flash
    }

    return () => {
      if (overlay && container.contains(overlay)) container.removeChild(overlay)
      if (flash && container.contains(flash)) container.removeChild(flash)
    }
  }, [containerRef])

  const animateTimeframeChange = useCallback((cb: () => void) => {
    const overlay = overlayRef.current
    if (!overlay) {
      cb()
      return
    }

    overlay.style.opacity = '1'
    overlay.style.transform = 'scale(0.97)'

    const step1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mountedRef.current) return
        cb()

        overlay.style.opacity = '0'
        overlay.style.transform = 'scale(1)'
      })
    })
    rafRef.current = step1
  }, [])

  const flashLatestBar = useCallback(() => {
    const flash = flashRef.current
    if (!flash) return

    flash.style.opacity = '1'

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mountedRef.current || !flash) return
        flash.style.opacity = '0'
      })
    })
    rafRef.current = raf
  }, [])

  return { animateTimeframeChange, flashLatestBar }
}
