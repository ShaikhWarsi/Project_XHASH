import { useEffect, useState } from 'react'
import { X, Rocket, BarChart3, FlaskConical, Users, BookOpen, ArrowRight, Check } from 'lucide-react'

const ONBOARDING_KEY = 'trading_engine_onboarding_done'

interface Step {
  icon: typeof Rocket
  title: string
  description: string
  action: string
}

const STEPS: Step[] = [
  {
    icon: Rocket,
    title: 'Welcome to Trading Engine',
    description: 'Your AI-augmented quantitative trading platform. Let\'s get you set up in 30 seconds.',
    action: 'Get Started',
  },
  {
    icon: BarChart3,
    title: 'Check System Health',
    description: 'First, make sure everything is running. Look at the status bar at the bottom — green means healthy, red means something needs attention.',
    action: 'Check Health Status',
  },
  {
    icon: FlaskConical,
    title: 'Run Your First Backtest',
    description: 'Go to Strategy → Backtest, enter AAPL as the ticker, set a date range, and click "Run Backtest". This will validate your setup works.',
    action: 'Try a Backtest',
  },
  {
    icon: Users,
    title: 'Explore the Features',
    description: 'Use the sidebar to navigate. Try Signals, Chart, Portfolio, and AI Agents. Each page has helpful empty states to guide you.',
    action: 'Start Exploring',
  },
]

export default function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY)
    if (!done) {
      setOpen(true)
      setDismissed(false)
    }
  }, [])

  const complete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setOpen(false)
    setDismissed(true)
  }

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      complete()
    }
  }

  const skip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setOpen(false)
    setDismissed(true)
  }

  if (!open || dismissed) return null

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
              <span className="font-semibold font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                Quick Start Guide
              </span>
            </div>
            <button
              onClick={skip}
              className="cursor-pointer"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', padding: 4 }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-primary)' }}
            >
              <Icon className="w-8 h-8" style={{ color: 'var(--accent-cyan)' }} />
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-sm font-semibold font-mono mb-2" style={{ color: 'var(--text-primary)' }}>
              {current.title}
            </h2>
            <p className="text-[11px] font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {current.description}
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  background: i === step ? 'var(--accent-cyan)' : 'var(--border-color)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={skip}
              className="flex-1 px-3 py-2 text-[10px] font-mono rounded-sm cursor-pointer"
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
              }}
            >
              Skip Tour
            </button>
            <button
              onClick={goNext}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-mono rounded-sm cursor-pointer border-none"
              style={{
                background: 'var(--accent-blue)',
                color: '#fff',
              }}
            >
              {step < STEPS.length - 1 ? (
                <>Next <ArrowRight className="w-3 h-3" /></>
              ) : (
                <><Check className="w-3 h-3" /> Done</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
