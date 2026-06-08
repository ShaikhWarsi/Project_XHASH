import { useState, useEffect } from 'react'
import { useTradingAgentsStore } from '../store/tradingagents'
import { listRuns } from '../api/tradingagents'
import { useToastStore } from '../store/toast'
import RunControls from '../components/tradingagents/RunControls'
import ScraperConsole from '../components/tradingagents/ScraperConsole'
import AnalystReportCard from '../components/tradingagents/AnalystReportCard'
import DebateThread from '../components/tradingagents/DebateThread'
import RiskDebateGrid from '../components/tradingagents/RiskDebateGrid'
import FinalDecisionCard from '../components/tradingagents/FinalDecisionCard'
import PipelineProgress from '../components/tradingagents/PipelineProgress'

type Tab = 'scraper' | 'analysts' | 'invest-debate' | 'risk-debate' | 'final'

const TABS: { key: Tab; label: string }[] = [
  { key: 'scraper', label: 'Scraper Console' },
  { key: 'analysts', label: 'Analyst Reports' },
  { key: 'invest-debate', label: 'Bull / Bear Debate' },
  { key: 'risk-debate', label: 'Risk Debate' },
  { key: 'final', label: 'Final Decision' },
]

const TAB_ICONS: Record<Tab, string> = {
  scraper: '📡',
  analysts: '📋',
  'invest-debate': '⚔️',
  'risk-debate': '🛡️',
  final: '🎯',
}

export default function MultiAgentAnalysis() {
  const [activeTab, setActiveTab] = useState<Tab>('scraper')
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const { report, runHistory, setRunHistory } = useTradingAgentsStore()

  useEffect(() => {
    setHistoryLoading(true)
    setHistoryError(null)
    listRuns(10).then((runs) => {
      setRunHistory(runs)
      setHistoryLoading(false)
    }).catch((err) => {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to load run history'
      setHistoryError(msg)
      setHistoryLoading(false)
      useToastStore.getState().addToast(msg, 'error')
    })
  }, [setRunHistory])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>🧠</span>
        <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
          Multi-Agent Analysis
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>
          TradingAgents + LM Studio
        </span>
      </div>

      {/* Run Controls */}
      <RunControls />

      {/* Pipeline Progress */}
      <PipelineProgress />

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)',
        padding: '0 8px', background: 'var(--bg-card)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 14px', fontSize: 11, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              background: activeTab === tab.key ? 'var(--bg-hover)' : 'transparent',
              color: activeTab === tab.key ? 'var(--accent-green)' : 'var(--text-muted)',
              border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--accent-green)' : '2px solid transparent',
              cursor: 'pointer', transition: 'none',
            }}
          >
            {TAB_ICONS[tab.key]} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'scraper' && <ScraperConsole />}

        {activeTab === 'analysts' && (
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 12 }}>
            {report?.analysts && report.analysts.length > 0
              ? report.analysts.map((a, i) => <AnalystReportCard key={i} report={a} />)
              : <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No analyst reports yet.</div>
            }
          </div>
        )}

        {activeTab === 'invest-debate' && (
          <div style={{ padding: 16 }}>
            <DebateThread
              rounds={report?.invest_debate || []}
              title="Bull / Bear Investment Debate"
            />
            {report?.research_plan && (
              <div style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  RESEARCH MANAGER PLAN
                </div>
                <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                  {report.research_plan}
                </pre>
              </div>
            )}
            {report?.trader_plan && (
              <div style={{ marginTop: 8, border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  TRADER PROPOSAL
                </div>
                <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                  {report.trader_plan}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'risk-debate' && (
          <div style={{ padding: 16 }}>
            <RiskDebateGrid
              rounds={report?.risk_debate || []}
              title="Risk Management Debate"
            />
          </div>
        )}

        {activeTab === 'final' && (
          report?.final
            ? <FinalDecisionCard decision={report.final} />
            : <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>No final decision yet.</div>
        )}
      </div>

      {/* Run History */}
      <div style={{
        borderTop: '1px solid var(--border-color)', padding: '8px 16px',
        maxHeight: 120, overflowY: 'auto',
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
          RECENT RUNS
        </div>
        {historyLoading ? (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 0' }}>
            Loading...
          </div>
        ) : historyError ? (
          <div style={{ fontSize: 10, color: '#ef4444', padding: '4px 0' }}>
            {historyError}
          </div>
        ) : runHistory.length === 0 ? (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 0' }}>
            No runs yet. Start an analysis above.
          </div>
        ) : (
          runHistory.map((run) => (
            <div key={run.id} style={{
              display: 'flex', gap: 12, fontSize: 10, padding: '2px 0',
              fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)',
            }}>
              <span style={{ fontWeight: 600 }}>{run.ticker}</span>
              <span style={{ color: run.status === 'done' ? '#22c55e' : run.status === 'failed' ? '#ef4444' : '#facc15' }}>
                {run.status}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {run.started_at ? new Date(run.started_at).toLocaleString() : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
