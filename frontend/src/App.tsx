import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/Toast'
import { LivePricesProvider } from './contexts/LivePricesContext'
import { EventBusProvider } from './contexts/EventBusContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { AudioAlertProvider } from './contexts/AudioAlertContext'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ChartPage = lazy(() => import('./pages/Chart'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const Signals = lazy(() => import('./pages/Signals'))
const Structure = lazy(() => import('./pages/Structure'))
const AdvancedCharts = lazy(() => import('./pages/AdvancedCharts'))
const Orders = lazy(() => import('./pages/Orders'))
const Trades = lazy(() => import('./pages/Trades'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const PaperTrading = lazy(() => import('./pages/PaperTrading'))
const PortfolioOptimization = lazy(() => import('./pages/PortfolioOptimization'))
const PortfolioWhatIf = lazy(() => import('./pages/PortfolioWhatIf'))
const SocialTrading = lazy(() => import('./pages/SocialTrading'))
const LiveTradingWizard = lazy(() => import('./pages/LiveTradingWizard'))
const RiskDashboard = lazy(() => import('./pages/RiskDashboard'))
const AttributionAnalysis = lazy(() => import('./pages/AttributionAnalysis'))
const Backtest = lazy(() => import('./pages/Backtest'))
const StrategyLab = lazy(() => import('./pages/StrategyLab'))
const StrategyCode = lazy(() => import('./pages/StrategyCode'))
const StrategyOptimizer = lazy(() => import('./pages/StrategyOptimizer'))
const VisualStrategy = lazy(() => import('./pages/VisualStrategy'))
const Agents = lazy(() => import('./pages/Agents'))
const HedgeFund = lazy(() => import('./pages/HedgeFund'))
const HedgeFlow = lazy(() => import('./pages/HedgeFlow'))
const SwarmDashboard = lazy(() => import('./pages/SwarmDashboard'))
const HypothesisLab = lazy(() => import('./pages/HypothesisLab'))
const DebateArena = lazy(() => import('./pages/DebateArena'))
const RLTrainer = lazy(() => import('./pages/RLTrainer'))
const LLMPage = lazy(() => import('./pages/LLMPage'))
const PersonaCouncil = lazy(() => import('./pages/PersonaCouncil'))
const CfaAnalytics = lazy(() => import('./pages/CfaAnalytics'))
const FactorAnalysisPage = lazy(() => import('./pages/FactorAnalysis'))
const FactorZoo = lazy(() => import('./pages/FactorZoo'))
const MmcAnalysis = lazy(() => import('./pages/MmcAnalysis'))
const HyperoptPage = lazy(() => import('./pages/HyperoptPage'))
const GeopoliticalAnalysis = lazy(() => import('./pages/GeopoliticalAnalysis'))
const WorkflowLab = lazy(() => import('./pages/WorkflowLab'))
const SqlResearch = lazy(() => import('./pages/SqlResearch'))
const ExperimentLab = lazy(() => import('./pages/ExperimentLab'))
const DataPipeline = lazy(() => import('./pages/DataPipeline'))
const TaskOrch = lazy(() => import('./pages/TaskOrchestration'))
const SignalEnginePage = lazy(() => import('./pages/SignalEnginePage'))
const SignalsStream = lazy(() => import('./pages/SignalsStream'))
const ChinaMarketsPage = lazy(() => import('./pages/ChinaMarketsPage'))
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'))
const Settings = lazy(() => import('./pages/Settings'))
const PluginsPage = lazy(() => import('./pages/Plugins'))
const MultiSymbolCompare = lazy(() => import('./pages/MultiSymbolCompare'))
const MarketScreener = lazy(() => import('./pages/MarketScreener'))
const Infrastructure = lazy(() => import('./pages/Infrastructure'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))
const BotsPage = lazy(() => import('./pages/BotsPage'))

import Spinner from './components/Spinner'

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner size={24} label="Loading page..." />
    </div>
  )
}

function LazyPage({ children, category = 'page' }: { children: ReactNode; category?: 'page' | 'widget' | 'chart' | 'data' }) {
  return <Suspense fallback={<PageFallback />}><ErrorBoundary componentName="Page" category={category}>{children}</ErrorBoundary></Suspense>
}

export default function App() {
  return (
    <BrowserRouter>
      <LivePricesProvider>
        <EventBusProvider>
          <WorkspaceProvider>
            <AudioAlertProvider>
              <ToastContainer />
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<LazyPage><PersonaCouncil /></LazyPage>} />
                  <Route path="/markets/dashboard" element={<LazyPage><Dashboard /></LazyPage>} />
                  <Route path="/markets/chart" element={<LazyPage><ChartPage /></LazyPage>} />
                  <Route path="/markets/watchlist" element={<LazyPage><WatchlistPage /></LazyPage>} />
                  <Route path="/markets/signals" element={<LazyPage><Signals /></LazyPage>} />
                  <Route path="/markets/structure" element={<LazyPage><Structure /></LazyPage>} />
                  <Route path="/markets/advanced-charts" element={<LazyPage><AdvancedCharts /></LazyPage>} />
                  <Route path="/markets/compare" element={<LazyPage><MultiSymbolCompare /></LazyPage>} />
                  <Route path="/markets/screener" element={<LazyPage><MarketScreener /></LazyPage>} />
                  <Route path="/trading/orders" element={<LazyPage><Orders /></LazyPage>} />
                  <Route path="/trading/trades" element={<LazyPage><Trades /></LazyPage>} />
                  <Route path="/trading/portfolio" element={<LazyPage><Portfolio /></LazyPage>} />
                  <Route path="/trading/paper-trading" element={<LazyPage><PaperTrading /></LazyPage>} />
                  <Route path="/trading/portfolio-optimization" element={<LazyPage><PortfolioOptimization /></LazyPage>} />
                  <Route path="/trading/what-if" element={<LazyPage><PortfolioWhatIf /></LazyPage>} />
                  <Route path="/trading/social-trading" element={<LazyPage><SocialTrading /></LazyPage>} />
                  <Route path="/trading/live" element={<LazyPage><LiveTradingWizard /></LazyPage>} />
                  <Route path="/risk" element={<LazyPage><RiskDashboard /></LazyPage>} />
                  <Route path="/risk/attribution" element={<LazyPage><AttributionAnalysis /></LazyPage>} />
                  <Route path="/strategy/backtest" element={<LazyPage><Backtest /></LazyPage>} />
                  <Route path="/strategy/lab" element={<LazyPage><StrategyLab /></LazyPage>} />
                  <Route path="/strategy/code" element={<LazyPage><StrategyCode /></LazyPage>} />
                  <Route path="/strategy/optimizer" element={<LazyPage><StrategyOptimizer /></LazyPage>} />
                  <Route path="/strategy/visual" element={<LazyPage><VisualStrategy /></LazyPage>} />
                  <Route path="/ai/agents" element={<LazyPage><Agents /></LazyPage>} />
                  <Route path="/ai/hedge-fund" element={<LazyPage><HedgeFund /></LazyPage>} />
                  <Route path="/ai/hedge-flow" element={<LazyPage><HedgeFlow /></LazyPage>} />
                  <Route path="/ai/swarm" element={<LazyPage><SwarmDashboard /></LazyPage>} />
                  <Route path="/ai/hypothesis-lab" element={<LazyPage><HypothesisLab /></LazyPage>} />
                  <Route path="/ai/debate" element={<LazyPage><DebateArena /></LazyPage>} />
                  <Route path="/ai/rl-training" element={<LazyPage><RLTrainer /></LazyPage>} />
                  <Route path="/ai/llm" element={<LazyPage><LLMPage /></LazyPage>} />
                  <Route path="/ai/persona-council" element={<LazyPage><PersonaCouncil /></LazyPage>} />
                  <Route path="/research/cfa" element={<LazyPage><CfaAnalytics /></LazyPage>} />
                  <Route path="/research/factor-analysis" element={<LazyPage><FactorAnalysisPage /></LazyPage>} />
                  <Route path="/research/factor-zoo" element={<LazyPage><FactorZoo /></LazyPage>} />
                  <Route path="/research/mmc" element={<LazyPage><MmcAnalysis /></LazyPage>} />
                  <Route path="/research/hyperopt" element={<LazyPage><HyperoptPage /></LazyPage>} />
                  <Route path="/research/geo" element={<LazyPage><GeopoliticalAnalysis /></LazyPage>} />
                  <Route path="/research/workflow-lab" element={<LazyPage><WorkflowLab /></LazyPage>} />
                  <Route path="/research/sql" element={<LazyPage><SqlResearch /></LazyPage>} />
                  <Route path="/research/experiments" element={<LazyPage><ExperimentLab /></LazyPage>} />
                  <Route path="/data/pipeline" element={<LazyPage><DataPipeline /></LazyPage>} />
                  <Route path="/data/task-orchestration" element={<LazyPage><TaskOrch /></LazyPage>} />
                  <Route path="/data/signal-engines" element={<LazyPage><SignalEnginePage /></LazyPage>} />
                  <Route path="/data/signals-stream" element={<LazyPage><SignalsStream /></LazyPage>} />
                  <Route path="/data/china-markets" element={<LazyPage><ChinaMarketsPage /></LazyPage>} />
                  <Route path="/data/workflows" element={<LazyPage><WorkflowPage /></LazyPage>} />
                  <Route path="/settings" element={<LazyPage><Settings /></LazyPage>} />
                  <Route path="/settings/plugins" element={<LazyPage><PluginsPage /></LazyPage>} />
                  <Route path="/settings/infrastructure" element={<LazyPage><Infrastructure /></LazyPage>} />
                  <Route path="/settings/audit-log" element={<LazyPage><AuditLogPage /></LazyPage>} />
                  <Route path="/settings/bots" element={<LazyPage><BotsPage /></LazyPage>} />
                </Route>
              </Routes>
            </AudioAlertProvider>
          </WorkspaceProvider>
        </EventBusProvider>
      </LivePricesProvider>
    </BrowserRouter>
  )
}
