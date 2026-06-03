import { useState, type ReactNode } from 'react'
import { PackageOpen } from 'lucide-react'

const QUOTES = [
  '"The trend is your friend." — Ed Seykota',
  '"Markets can remain irrational longer than you can remain solvent." — J.M. Keynes',
  '"Plan your trade, trade your plan." — Alexander Elder',
  '"The goal of a successful trader is to make the best trades. Money is secondary." — Alexander Elder',
  '"Risk comes from not knowing what you are doing." — Warren Buffett',
  '"The stock market is a device for transferring money from the impatient to the patient." — Warren Buffett',
  '"Be fearful when others are greedy, greedy when others are fearful." — Warren Buffett',
  '"It is not whether you are right or wrong that matters, but how much you make when you are right and how much you lose when you are wrong." — George Soros',
  '"Losses are part of the game. The key is to keep them small and manageable."',
  '"Don\'t focus on making money; focus on making good trades and the money will follow."',
  '"The best traders don\'t predict the future — they react to the present."',
  '"Every great trader was once a beginner. Keep learning."',
  '"Discipline is the bridge between goals and accomplishment."',
  '"In trading, consistency beats intensity."',
  '"The market is a battlefield — your strategy is your weapon."',
  '"Charts don\'t lie, but chart readers sometimes do."',
  '"Indicators are tools, not oracles. Use them wisely."',
  '"A good setup with poor risk management is still a bad trade."',
  '"The trend is your friend until the bend at the end."',
  '"Don\'t confuse a bull market with brains."',
]

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  sampleAction?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, description, action, compact, sampleAction }: EmptyStateProps) {
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '16px 0' : '32px 0',
        gap: compact ? 6 : 8,
      }}
    >
      <div style={{ opacity: 0.3 }}>
        {icon || <PackageOpen size={compact ? 20 : 28} />}
      </div>
      <div
        style={{
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            textAlign: 'center',
            maxWidth: 280,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {description}
        </div>
      )}
      <div
        style={{
          marginTop: 8, fontSize: 9, color: 'var(--text-muted)',
          textAlign: 'center', maxWidth: 280, fontStyle: 'italic',
          fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.4, opacity: 0.6,
        }}
      >
        {quote}
      </div>
      {action && <div style={{ marginTop: compact ? 4 : 8 }}>{action}</div>}
      {sampleAction && (
        <div style={{ marginTop: compact ? 4 : 8 }}>
          <button
            onClick={sampleAction.onClick}
            className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono rounded-sm cursor-pointer"
            style={{
              background: 'transparent',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--accent-cyan)',
            }}
          >
            Run Sample: {sampleAction.label}
          </button>
        </div>
      )}
    </div>
  )
}
