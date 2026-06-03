import { useState, useEffect } from 'react'
import { api } from '../api/client'

export interface Persona {
  id: string
  name: string
  style: string
  color: string
  key: string
}

const DEFAULT_PERSONAS: Persona[] = []

const COLOR_PALETTE = ['green', 'red', 'blue', 'yellow', 'purple', 'cyan', 'orange', 'pink']

export function usePersonas(): { personas: Persona[]; loading: boolean } {
  const [personas, setPersonas] = useState<Persona[]>(DEFAULT_PERSONAS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api.get('/api/agent/personas').then((res: any) => {
      if (cancelled) return
      if (res.data && Array.isArray(res.data.personas)) {
        setPersonas(res.data.personas.map((p: any, i: number) => ({
          id: p.id || p.key || `persona_${i}`,
          name: p.name,
          style: p.style || p.description || '',
          color: p.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
          key: p.key || p.id || `persona_${i}`,
        })))
      }
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { personas, loading }
}
