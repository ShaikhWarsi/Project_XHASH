import { useState, useCallback, useEffect, useRef } from 'react'

export function useChartFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const scrollPos = useRef(0)

  const enter = useCallback(() => {
    setIsFullscreen(true)
  }, [])

  const exit = useCallback(() => {
    setIsFullscreen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsFullscreen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (isFullscreen) {
      scrollPos.current = window.scrollY
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      window.scrollTo(0, scrollPos.current)
    }
  }, [isFullscreen])

  return { isFullscreen, toggle, enter, exit }
}
