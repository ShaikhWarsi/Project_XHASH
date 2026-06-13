import { lazy, Suspense, type ReactNode } from 'react'
import StrategyPortfolio from './pages/StrategyPortfolio'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/Toast'
import { LivePricesProvider } from './contexts/LivePricesContext'
import { EventBusProvider } from './contexts/EventBusContext'
import { AudioAlertProvider } from './contexts/AudioAlertContext'
import { InterfaceModeProvider } from './contexts/InterfaceModeContext'
import { WebSocketProvider } from './contexts/WebSocketProvider'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ChartPage = lazy(() => import('./pages/Chart'))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'))
const Signals = lazy(() => import('./pages/Signals'))
const Structure = lazy(() => import('./pages/Structure'))
const AdvancedCharts = lazy(() => import('./pages/AdvancedCharts'))
const MarketIntel = lazy(() => import('./pages/MarketIntel'))
const Orders = lazy(() => import('./pages/Orders'))
const Trades = lazy(() => import('./pages/Trades'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const PaperTrading = lazy(() => import('./pages/PaperTrading'))
const PortfolioOptimization = lazy(() => import('./pages/PortfolioOptimization'))
const PortfolioWhatIf = lazy(() => import('./pages/PortfolioWhatIf'))

const RiskDashboard = lazy(() => import('./pages/RiskDashboard'))
const AttributionAnalysis = lazy(() => import('./pages/AttributionAnalysis'))
const Backtest = lazy(() => import('./pages/Backtest'))
const StrategyLab = lazy(() => import('./pages/StrategyLab'))
const StrategyCode = lazy(() => import('./pages/StrategyCode'))
const StrategyOptimizer = lazy(() => import('./pages/StrategyOptimizer'))
const VisualStrategy = lazy(() => import('./pages/VisualStrategy'))
const Agents = lazy(() => import('./pages/Agents'))
const HedgeFlow = lazy(() => import('./pages/HedgeFlow'))
const HypothesisLab = lazy(() => import('./pages/HypothesisLab'))
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
const DataPipeline = lazy(() => import('./pages/DataPipeline'))
const TaskOrch = lazy(() => import('./pages/TaskOrchestration'))
const SignalEnginePage = lazy(() => import('./pages/SignalEnginePage'))

const ChinaMarketsPage = lazy(() => import('./pages/ChinaMarketsPage'))
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'))
const Settings = lazy(() => import('./pages/Settings'))
const PluginsPage = lazy(() => import('./pages/Plugins'))
const MultiSymbolCompare = lazy(() => import('./pages/MultiSymbolCompare'))
const MarketScreener = lazy(() => import('./pages/MarketScreener'))
const Infrastructure = lazy(() => import('./pages/Infrastructure'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))
const BotsPage = lazy(() => import('./pages/BotsPage'))
const AlertsPage = lazy(() => import('./pages/Alerts'))
const OptionsChainPage = lazy(() => import('./pages/OptionsChainPage'))
const MarketsCalendarPage = lazy(() => import('./pages/MarketsCalendarPage'))
const EventCalendarPage = lazy(() => import('./pages/EventCalendarPage'))
const VolSurfacePage = lazy(() => import('./pages/VolSurfacePage'))
const WorldMarketsPage = lazy(() => import('./pages/WorldMarketsPage'))
const CurrencyMatrixPage = lazy(() => import('./pages/CurrencyMatrixPage'))
const BondYieldsPage = lazy(() => import('./pages/BondYieldsPage'))

const CorrelationMatrixPage = lazy(() => import('./pages/CorrelationMatrixPage'))
const SectorHeatmapPage = lazy(() => import('./pages/SectorHeatmapPage'))
const AltDataPage = lazy(() => import('./components/AltDataPage'))
const EventsAnalytics = lazy(() => import('./components/EventsAnalytics'))
const PromptToTradePage = lazy(() => import('./pages/PromptToTradePage'))
const AIStrategyGenerator = lazy(() => import('./pages/AIStrategyGenerator'))
const AIIndicatorGenerator = lazy(() => import('./pages/AIIndicatorGenerator'))
const StrategyHealthCheck = lazy(() => import('./pages/StrategyHealthCheck'))
const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const ExplainableStops = lazy(() => import('./pages/ExplainableStops'))
const AIBriefingPage = lazy(() => import('./pages/AIBriefingPage'))
const AIRiskReport = lazy(() => import('./pages/AIRiskReport'))
const MultiAgentAnalysis = lazy(() => import('./pages/MultiAgentAnalysis'))
const MonteCarlo = lazy(() => import('./pages/MonteCarlo'))
const WalkForward = lazy(() => import('./pages/WalkForward'))
const ScenarioAnalysis = lazy(() => import('./pages/ScenarioAnalysis'))
const Renaissance = lazy(() => import('./pages/Renaissance'))
const MemoryLog = lazy(() => import('./pages/MemoryLog'))
const Calibration = lazy(() => import('./pages/Calibration'))
const Reflection = lazy(() => import('./pages/Reflection'))
const WallClock = lazy(() => import('./pages/WallClock'))
const DebugPage = lazy(() => import('./pages/Debug'))

const ApiKeyPage = lazy(() => import('./pages/ApiKey'))
const LatencyDashboard = lazy(() => import('./pages/LatencyDashboard'))
const TrafficDashboard = lazy(() => import('./pages/TrafficDashboard'))
const PnLTracker = lazy(() => import('./pages/PnLTracker'))
const ActionCenter = lazy(() => import('./pages/ActionCenter'))
const HealthMonitor = lazy(() => import('./pages/HealthMonitor'))
const MasterContractStatusPage = lazy(() => import('./pages/MasterContractStatus'))
const MasterContractViewPage = lazy(() => import('./pages/MasterContractView'))
const SandboxPage = lazy(() => import('./pages/SandboxPage'))
const Analyzer = lazy(() => import('./pages/Analyzer'))
const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard'))
const SecurityAdmin = lazy(() => import('./pages/SecurityAdmin'))
const GTTOrders = lazy(() => import('./pages/GTTOrders'))
const PythonStrategyIndex = lazy(() => import('./pages/PythonStrategyIndex'))
const PythonStrategyNew = lazy(() => import('./pages/PythonStrategyNew'))
const PythonStrategyEdit = lazy(() => import('./pages/PythonStrategyEdit'))
const PythonStrategyLogs = lazy(() => import('./pages/PythonStrategyLogs'))
const PythonStrategySchedule = lazy(() => import('./pages/PythonStrategySchedule'))
const FlowIndex = lazy(() => import('./pages/FlowIndex'))
const FlowEditor = lazy(() => import('./pages/FlowEditor'))
const WebSocketProxyDashboard = lazy(() => import('./pages/WebSocketProxyDashboard'))
const MCPOAuthConfig = lazy(() => import('./pages/MCPOAuthConfig'))
const TelegramBotDashboard = lazy(() => import('./pages/TelegramBotDashboard'))
const Playground = lazy(() => import('./pages/Playground'))
const WhatsAppBotPage = lazy(() => import('./pages/WhatsAppBotPage'))
const Historify = lazy(() => import('./pages/Historify'))
const HistorifyCharts = lazy(() => import('./pages/HistorifyCharts'))
const WebhookBridges = lazy(() => import('./pages/WebhookBridges'))
const StrategyPortfolioView = lazy(() => import('./pages/StrategyPortfolioView'))
const MultiQuotesPage = lazy(() => import('./pages/MultiQuotesPage'))
const MarketTimingsPage = lazy(() => import('./pages/MarketTimingsPage'))
const MarketHolidaysPage = lazy(() => import('./pages/MarketHolidaysPage'))
const ChartinkIndex = lazy(() => import('./pages/chartink/ChartinkIndex'))
const NewChartinkStrategy = lazy(() => import('./pages/chartink/NewChartinkStrategy'))
const ViewChartinkStrategy = lazy(() => import('./pages/chartink/ViewChartinkStrategy'))
const ConfigureChartinkSymbols = lazy(() => import('./pages/chartink/ConfigureChartinkSymbols'))
 
import Skeleton from './components/Skeleton'

function PageFallback() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton width={200} height={16} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Skeleton height={64} variant="rect" />
        <Skeleton height={64} variant="rect" />
        <Skeleton height={64} variant="rect" />
        <Skeleton height={64} variant="rect" />
      </div>
      <Skeleton height={200} variant="rect" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <Skeleton height={120} variant="rect" />
        <Skeleton height={120} variant="rect" />
      </div>
    </div>
  )
}

function LazyPage({ children, category = 'page' }: { children: ReactNode; category?: 'page' | 'widget' | 'chart' | 'data' }) {
  return <ErrorBoundary componentName="Page" category={category}><Suspense fallback={<PageFallback />}>{children}</Suspense></ErrorBoundary>
}

export default function App() {
  return (
    <ErrorBoundary componentName="Global" category="page">
    <BrowserRouter>
      <InterfaceModeProvider>
      <WebSocketProvider>
      <LivePricesProvider>
        <EventBusProvider>
            <AudioAlertProvider>
              <ToastContainer />
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<LazyPage><Dashboard /></LazyPage>} />
                  <Route path="/markets/dashboard" element={<LazyPage><Dashboard /></LazyPage>} />
                  <Route path="/markets/persona-council" element={<LazyPage><PersonaCouncil /></LazyPage>} />
                  <Route path="/markets/chart" element={<LazyPage><ChartPage /></LazyPage>} />
                  <Route path="/markets/watchlist" element={<LazyPage><WatchlistPage /></LazyPage>} />
                  <Route path="/markets/signals" element={<LazyPage><Signals /></LazyPage>} />
                  <Route path="/markets/structure" element={<LazyPage><Structure /></LazyPage>} />
                  <Route path="/markets/advanced-charts" element={<LazyPage><AdvancedCharts /></LazyPage>} />
                  <Route path="/markets/market-intel" element={<LazyPage><MarketIntel /></LazyPage>} />
                  <Route path="/markets/compare" element={<LazyPage><MultiSymbolCompare /></LazyPage>} />
                  <Route path="/markets/screener" element={<LazyPage><MarketScreener /></LazyPage>} />
                  <Route path="/trading/orders" element={<LazyPage><Orders /></LazyPage>} />
                  <Route path="/trading/trades" element={<LazyPage><Trades /></LazyPage>} />
                  <Route path="/trading/portfolio" element={<LazyPage><Portfolio /></LazyPage>} />
                  <Route path="/trading/paper-trading" element={<LazyPage><PaperTrading /></LazyPage>} />
                  <Route path="/trading/portfolio-optimization" element={<LazyPage><PortfolioOptimization /></LazyPage>} />
                  <Route path="/trading/what-if" element={<LazyPage><PortfolioWhatIf /></LazyPage>} />
                  <Route path="/risk" element={<LazyPage><RiskDashboard /></LazyPage>} />
                  <Route path="/risk/attribution" element={<LazyPage><AttributionAnalysis /></LazyPage>} />
                  <Route path="/strategy/backtest" element={<LazyPage><Backtest /></LazyPage>} />
                  <Route path="/strategy/lab" element={<LazyPage><StrategyLab /></LazyPage>} />
                  <Route path="/strategy/code" element={<LazyPage><StrategyCode /></LazyPage>} />
                  <Route path="/strategy/optimizer" element={<LazyPage><StrategyOptimizer /></LazyPage>} />
                  <Route path="/strategy/visual" element={<LazyPage><VisualStrategy /></LazyPage>} />
                  <Route path="/ai/agents" element={<LazyPage><Agents /></LazyPage>} />
                  <Route path="/ai/hedge-flow" element={<LazyPage><HedgeFlow /></LazyPage>} />
                  <Route path="/ai/hypothesis-lab" element={<LazyPage><HypothesisLab /></LazyPage>} />
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
                  <Route path="/research/experiments" element={<LazyPage><HyperoptPage /></LazyPage>} />
                  <Route path="/data/pipeline" element={<LazyPage><DataPipeline /></LazyPage>} />
                  <Route path="/data/task-orchestration" element={<LazyPage><TaskOrch /></LazyPage>} />
                  <Route path="/data/signal-engines" element={<LazyPage><SignalEnginePage /></LazyPage>} />
                  <Route path="/data/china-markets" element={<LazyPage><ChinaMarketsPage /></LazyPage>} />
                  <Route path="/data/workflows" element={<LazyPage><WorkflowPage /></LazyPage>} />
                  <Route path="/settings" element={<LazyPage><Settings /></LazyPage>} />
                  <Route path="/settings/plugins" element={<LazyPage><PluginsPage /></LazyPage>} />
                  <Route path="/settings/infrastructure" element={<LazyPage><Infrastructure /></LazyPage>} />
                  <Route path="/settings/audit-log" element={<LazyPage><AuditLogPage /></LazyPage>} />
                  <Route path="/settings/bots" element={<LazyPage><BotsPage /></LazyPage>} />
                  <Route path="/markets/options" element={<LazyPage><OptionsChainPage /></LazyPage>} />
                  <Route path="/markets/calendar" element={<LazyPage><MarketsCalendarPage /></LazyPage>} />
                  <Route path="/markets/event-calendar" element={<LazyPage><EventCalendarPage /></LazyPage>} />
                  <Route path="/markets/correlation" element={<LazyPage><CorrelationMatrixPage /></LazyPage>} />
                  <Route path="/markets/sector-heatmap" element={<LazyPage><SectorHeatmapPage /></LazyPage>} />
                  <Route path="/markets/world-markets" element={<LazyPage><WorldMarketsPage /></LazyPage>} />
                  <Route path="/markets/currency-matrix" element={<LazyPage><CurrencyMatrixPage /></LazyPage>} />
                  <Route path="/markets/bond-yields" element={<LazyPage><BondYieldsPage /></LazyPage>} />
                  <Route path="/markets/vol-surface" element={<LazyPage><VolSurfacePage /></LazyPage>} />
                  <Route path="/markets/events" element={<LazyPage><EventsAnalytics /></LazyPage>} />
                  <Route path="/research/alt-data" element={<LazyPage><AltDataPage /></LazyPage>} />
                  <Route path="/alerts" element={<LazyPage><AlertsPage /></LazyPage>} />
                  <Route path="/ai/prompt-to-trade" element={<LazyPage><PromptToTradePage /></LazyPage>} />
                  <Route path="/ai/strategy-generator" element={<LazyPage><AIStrategyGenerator /></LazyPage>} />
                  <Route path="/ai/indicator-generator" element={<LazyPage><AIIndicatorGenerator /></LazyPage>} />
                  <Route path="/ai/strategy-health" element={<LazyPage><StrategyHealthCheck /></LazyPage>} />
                  <Route path="/ai/prompt-library" element={<LazyPage><PromptLibrary /></LazyPage>} />
                  <Route path="/ai/explain-stops" element={<LazyPage><ExplainableStops /></LazyPage>} />
                  <Route path="/ai/briefing" element={<LazyPage><AIBriefingPage /></LazyPage>} />
                  <Route path="/ai/risk-report" element={<LazyPage><AIRiskReport /></LazyPage>} />
                  <Route path="/ai/multi-agent-analysis" element={<LazyPage><MultiAgentAnalysis /></LazyPage>} />
                  <Route path="/research/monte-carlo" element={<LazyPage><MonteCarlo /></LazyPage>} />
                  <Route path="/research/walkforward" element={<LazyPage><WalkForward /></LazyPage>} />
                  <Route path="/research/scenario" element={<LazyPage><ScenarioAnalysis /></LazyPage>} />
                  <Route path="/research/renaissance" element={<LazyPage><Renaissance /></LazyPage>} />
                  <Route path="/research/memory-log" element={<LazyPage><MemoryLog /></LazyPage>} />
                  <Route path="/settings/calibration" element={<LazyPage><Calibration /></LazyPage>} />
                  <Route path="/settings/reflection" element={<LazyPage><Reflection /></LazyPage>} />
                  <Route path="/settings/wall-clock" element={<LazyPage><WallClock /></LazyPage>} />
                  <Route path="/debug" element={<LazyPage><DebugPage /></LazyPage>} />
                  <Route path="/openalgo/apikey" element={<LazyPage><ApiKeyPage /></LazyPage>} />
                  <Route path="/openalgo/latency" element={<LazyPage><LatencyDashboard /></LazyPage>} />
                  <Route path="/openalgo/traffic" element={<LazyPage><TrafficDashboard /></LazyPage>} />
                  <Route path="/openalgo/pnl" element={<LazyPage><PnLTracker /></LazyPage>} />
                  <Route path="/openalgo/action-center" element={<LazyPage><ActionCenter /></LazyPage>} />
                  <Route path="/openalgo/health" element={<LazyPage><HealthMonitor /></LazyPage>} />
                  <Route path="/openalgo/master-contract" element={<LazyPage><MasterContractStatusPage /></LazyPage>} />
                  <Route path="/openalgo/master-contract/view" element={<LazyPage><MasterContractViewPage /></LazyPage>} />
                  <Route path="/openalgo/sandbox" element={<LazyPage><SandboxPage /></LazyPage>} />
                  <Route path="/openalgo/analyzer" element={<LazyPage><Analyzer /></LazyPage>} />
                  <Route path="/openalgo/security" element={<LazyPage><SecurityDashboard /></LazyPage>} />
                  <Route path="/openalgo/security-admin" element={<LazyPage><SecurityAdmin /></LazyPage>} />
                  <Route path="/openalgo/gtt" element={<LazyPage><GTTOrders /></LazyPage>} />
                  <Route path="/openalgo/python-strategy" element={<LazyPage><PythonStrategyIndex /></LazyPage>} />
                  <Route path="/openalgo/python-strategy/new" element={<LazyPage><PythonStrategyNew /></LazyPage>} />
                  <Route path="/openalgo/python-strategy/edit/:id" element={<LazyPage><PythonStrategyEdit /></LazyPage>} />
                  <Route path="/openalgo/python-strategy/logs/:id" element={<LazyPage><PythonStrategyLogs /></LazyPage>} />
                  <Route path="/openalgo/python-strategy/schedule/:id" element={<LazyPage><PythonStrategySchedule /></LazyPage>} />
                  <Route path="/openalgo/flow" element={<LazyPage><FlowIndex /></LazyPage>} />
                  <Route path="/openalgo/flow/edit/:id" element={<LazyPage><FlowEditor /></LazyPage>} />
                  <Route path="/openalgo/ws-proxy" element={<LazyPage><WebSocketProxyDashboard /></LazyPage>} />
                  <Route path="/openalgo/telegram-bot" element={<LazyPage><TelegramBotDashboard /></LazyPage>} />
                  <Route path="/openalgo/mcp-oauth" element={<LazyPage><MCPOAuthConfig /></LazyPage>} />
                  <Route path="/openalgo/webhook-bridges" element={<LazyPage><WebhookBridges /></LazyPage>} />
                  <Route path="/openalgo/chartink" element={<LazyPage><ChartinkIndex /></LazyPage>} />
                  <Route path="/openalgo/chartink/new" element={<LazyPage><NewChartinkStrategy /></LazyPage>} />
                  <Route path="/openalgo/chartink/view/:id" element={<LazyPage><ViewChartinkStrategy /></LazyPage>} />
                  <Route path="/openalgo/chartink/symbols" element={<LazyPage><ConfigureChartinkSymbols /></LazyPage>} />
                  <Route path="/openalgo/historify" element={<LazyPage><Historify /></LazyPage>} />
                  <Route path="/openalgo/historify/charts" element={<LazyPage><HistorifyCharts /></LazyPage>} />
                  <Route path="/openalgo/playground" element={<LazyPage><Playground /></LazyPage>} />
                  <Route path="/openalgo/multiquotes" element={<LazyPage><MultiQuotesPage /></LazyPage>} />
                  <Route path="/openalgo/market-timings" element={<LazyPage><MarketTimingsPage /></LazyPage>} />
                  <Route path="/openalgo/market-holidays" element={<LazyPage><MarketHolidaysPage /></LazyPage>} />
                  <Route path="/openalgo/whatsapp" element={<LazyPage><WhatsAppBotPage /></LazyPage>} />
                  <Route path="/openalgo/strategy-portfolio" element={<StrategyPortfolio />} />
                  <Route path="/openalgo/strategy-portfolio/view/:id" element={<LazyPage><StrategyPortfolioView /></LazyPage>} />
                </Route>
              </Routes>
            </AudioAlertProvider>
        </EventBusProvider>
      </LivePricesProvider>
    </WebSocketProvider>
  </InterfaceModeProvider>
</BrowserRouter>
    </ErrorBoundary>
  )
}
