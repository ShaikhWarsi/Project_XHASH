import { useState, useCallback, useEffect } from 'react'
import { DEFAULT_TOURS, type TourStep } from '../data/onboardingTour'

interface Props {
  tourId?: string
  onComplete?: () => void
  onSkip?: () => void
}

export default function TourOverlay({ tourId = 'getting-started', onComplete, onSkip }: Props) {
  const tour = DEFAULT_TOURS.find(t => t.id === tourId) ?? DEFAULT_TOURS[0]
  const [currentStep, setCurrentStep] = useState(0)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('tour-dismissed') === 'true'
  })

  const step = tour?.steps[currentStep]

  useEffect(() => {
    if (step?.target && step.position !== 'center') {
      const el = document.querySelector(step.target)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('tour-highlight')
        return () => el.classList.remove('tour-highlight')
      }
    }
  }, [step])

  const next = useCallback(() => {
    if (currentStep < (tour?.steps.length ?? 0) - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      localStorage.setItem('tour-dismissed', 'true')
      setDismissed(true)
      onComplete?.()
    }
  }, [currentStep, tour, onComplete])

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const skip = useCallback(() => {
    localStorage.setItem('tour-dismissed', 'true')
    setDismissed(true)
    onSkip?.()
  }, [onSkip])

  const reset = useCallback(() => {
    localStorage.removeItem('tour-dismissed')
    setDismissed(false)
    setCurrentStep(0)
  }, [])

  if (dismissed || !step) return null

  const totalSteps = tour?.steps.length ?? 0
  const progress = ((currentStep + 1) / totalSteps) * 100
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
      }} />

      <div style={{
        position: 'absolute',
        top: step.position === 'center' ? '50%' : 40,
        left: '50%', transform: 'translate(-50%, 0)',
        pointerEvents: 'auto',
        width: 360,
        background: 'var(--bg-card, #0d1117)',
        border: '1px solid var(--border-color, #1a2332)',
        borderRadius: 8, padding: 16,
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        ...(step.position === 'center' ? { transform: 'translate(-50%, -50%)', top: '50%' } : {}),
      }}>
        <div style={{
          width: '100%', height: 3, background: 'rgba(255,255,255,0.1)',
          borderRadius: 2, marginBottom: 12, overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'var(--accent-blue, #3b82f6)',
            borderRadius: 2, transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: 8, marginBottom: 4 }}>
          Step {currentStep + 1} of {totalSteps}
        </div>

        <div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {step.title}
        </div>

        <div style={{ color: 'var(--text-secondary)', fontSize: 10, lineHeight: 1.5, marginBottom: 12 }}>
          {step.description}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={skip}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: 9,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Skip Tour
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            {!isFirst && (
              <button
                onClick={prev}
                style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                padding: '4px 12px', borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                background: 'var(--accent-blue, #3b82f6)', border: 'none',
                color: '#fff', fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
