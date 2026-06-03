import { useEffect, useState, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  rotation: number
  rotationSpeed: number
}

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899']
const PARTICLE_COUNT = 100

export default function Confetti({ active, onComplete }: { active: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([])
  const animRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }

    const initial: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 6 + 3,
      life: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }))

    particlesRef.current = initial
    setParticles(initial)
    let completed = false

    const animate = () => {
      const updated = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1,
          life: p.life - 0.008,
          rotation: p.rotation + p.rotationSpeed,
        }))
        .filter(p => p.life > 0)

      particlesRef.current = updated
      setParticles(updated)

      if (updated.length > 0) {
        animRef.current = requestAnimationFrame(animate)
      } else if (!completed) {
        completed = true
        onComplete?.()
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [active, onComplete])

  if (!active || particles.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 9999, overflow: 'hidden',
    }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 1,
            opacity: Math.max(0, p.life),
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}
