# Frontend Guide

The Trading Engine includes a comprehensive 30-page React SPA with real-time updates, advanced charting, interactive strategy building, AI-powered features, multi-window support, and desktop-grade UI/UX.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| Language | TypeScript |
| State | Zustand |
| Routing | React Router 7 |
| Charts | TradingView Lightweight Charts, Plotly.js |
| UI Flow | React Flow |
| Styling | Tailwind CSS |
| HTTP | Fetch API |
| Build | Vite |
| Cross-Tab Sync | BroadcastChannel API |
| Drag & Drop | Native HTML5 API |
| AI Streaming | SSE (Server-Sent Events) |

## Pages Overview

### Dashboard
Portfolio NAV, cash, P&L, open positions table, real-time metrics, SSE-powered live updates.

### Portfolio
Holdings management, position details, allocation pie charts.

### Chart
TradingView Lightweight Charts — Heikin-Ashi, Point & Figure, bar, candle types. Drawing tools (trendlines, fibs, speed/resistance lines). Indicator overlays. TimeMachine/Bar Replay with tick sound. Snap to OHLC toggle. Pattern detection (head & shoulders, double top/bottom, triangles, flags, wedges). Drag price to alert. AI Inspector integration.

### Signals
Signal scanner across tickers. Filter by type, direction, confidence.

### Backtest
Strategy backtesting with parameter config, equity curve, performance metrics. Drag date from chart to pre-fill start date.

### Agents
AI agent council visualization, status monitoring, task assignment.

### HedgeFund
16 hedge fund personas with persona-based analysis and visual cards.

### RiskDashboard
Real-time risk metrics, VaR/CVaR, drawdown charts, circuit breaker status.

### StrategyLab
Visual strategy builder + **AI Strategy Generator** (natural language → FinScript code → review → backtest).

### StrategyOptimizer
Parameter optimization, grid/random search, performance heatmaps.

### PortfolioOptimization
Portfolio construction, optimizer selection, weight visualization.

### RLTrainer
Reinforcement learning training with environment config and progress tracking.

### FactorAnalysis
Alpha factor research, returns analysis, IC analysis, correlation.

### GeopoliticalAnalysis
Macro event tracking, impact analysis, event correlation.

### CfaAnalytics
CFA-level financial analysis, valuation metrics, financial ratios.

### HypothesisLab
Statistical hypothesis testing, A/B testing framework.

### DataPipeline
ETL management, data source config, transformation rules.

### TaskOrchestration
Workflow automation, task dependencies, execution monitoring.

### SwarmDashboard
Multi-agent swarm visualization, collaboration status.

### SocialTrading
Copy trading, signal sharing, community features.

### Plugins
Extension management, custom plugin installation.

### VisualStrategy
Node-based strategy editor with React Flow integration.

### Structure
Market structure analysis, swing highs/lows, structure break detection.

### HedgeFlow
Agent flow builder, node-based orchestration.

### AdvancedCharts
Multi-chart layouts, symbol comparison.

### MmcAnalysis
MMC strategy analysis, order block detection, fair value gap.

### FactorZoo
158 alpha factor browser, factor performance, custom factor creation.

### StrategyCode
Monaco code editor, FinScript editing, syntax highlighting.

### PaperTrading
Simulated trading, order entry, P&L tracking.

### WatchlistPage
Custom watchlists, quick quote viewing.

### Orders
Order management, status tracking, cancellation.

### Trades
Trade history, details, export.

### Settings
7 theme selection, API key config, notification settings.

## Components

### AI Features

| Component | File | Description |
|-----------|------|-------------|
| AIBriefing | [AIBriefing.tsx](../frontend/src/components/AIBriefing.tsx) | Modal overlay with LLM-generated portfolio + market briefing. Triggered by BRIEF button in StatusBar. Shows skeleton loading, portfolio value, market regime badge, top movers. |
| StreamResponse | [StreamResponse.tsx](../frontend/src/components/StreamResponse.tsx) | Reusable component that reads an SSE stream and renders text token-by-token with a blinking cursor. Handles loading, error, and completion states. Used by AIInspector. |
| NewsCoMovement | [NewsCoMovement.tsx](../frontend/src/components/NewsCoMovement.tsx) | Right sidebar panel. User enters a headline + comma-separated tickers. AI analyzes which tickers are co-moving in response. Shows direction (↑↓), confidence %, and reasoning. |
| EarningsSummary | [EarningsSummary.tsx](../frontend/src/components/EarningsSummary.tsx) | Right sidebar panel. User enters a symbol + pastes transcript text. AI extracts bull case (3-5 bullets), bear case (3-5 bullets), and single biggest risk. |
| StrategyGenerator | [StrategyGenerator.tsx](../frontend/src/components/StrategyGenerator.tsx) | Full strategy generation workflow: (1) describe strategy in plain English (2) AI generates FinScript code (3) review with yellow warning banner (4) run backtest via FinScript engine (5) see metrics + trades. |
| IndicatorGenerator | [IndicatorGenerator.tsx](../frontend/src/components/IndicatorGenerator.tsx) | Describe an indicator in plain English → AI generates JavaScript using `indicator({...})` plugin API → "Add to Chart" registers it at runtime via `registerPlugin()`. |
| AIInspector | [AIInspector.tsx](../frontend/src/components/AIInspector.tsx) | Streaming modal that shows when user clicks "What is this?" on a detected pattern. Displays confidence/target/stop grid, then streams LLM analysis (explanation, historical analogs, trading implications, confidence assessment). |

### Layout Components

| Component | File | Description |
|-----------|------|-------------|
| Layout | [Layout.tsx](../frontend/src/components/Layout.tsx) | Main app layout. Handles distraction-free mode, multi-window keyboard shortcuts, right sidebar toggle, swipe gestures on mobile. |
| StatusBar | [StatusBar.tsx](../frontend/src/components/StatusBar.tsx) | Bottom bar with live/paper indicator, latency, portfolio value, positions/orders/signals counts, clock, theme toggle, detail expand, **BRIEF button**. |
| StatusStrip | [StatusStrip.tsx](../frontend/src/components/StatusStrip.tsx) | Top strip with WS status, last tick, P99 latency, market session, stale ms, equity. |
| Sidebar | [Sidebar.tsx](../frontend/src/components/Sidebar.tsx) | Navigation sidebar with route links. |

### Right Sidebar

| Tab | Component | Description |
|-----|-----------|-------------|
| News | [NewsPanel.tsx](../frontend/src/components/rightsidebar/NewsPanel.tsx) | Groups yfinance + market intel headlines by ticker from held positions. Click navigates to chart. |
| Calendar | [CalendarPanel.tsx](../frontend/src/components/rightsidebar/CalendarPanel.tsx) | Today's macro events, earnings, dividends. Click ticker → chart. |
| Chat | [ChatPanel.tsx](../frontend/src/components/rightsidebar/ChatPanel.tsx) | Team/AI WebSocket chat with typing indicator. In-memory broadcast. |
| Co-Move | [NewsCoMovement.tsx](../frontend/src/components/NewsCoMovement.tsx) | Headline correlation analysis via AI. |
| Earnings | [EarningsSummary.tsx](../frontend/src/components/EarningsSummary.tsx) | Earnings transcript summarization via AI. |

### Chart Components

| Component | File | Description |
|-----------|------|-------------|
| ChartContainer | [ChartContainer.tsx](../frontend/src/components/ChartContainer.tsx) | Chart wrapper with series type handling. |
| ChartEngine | [ChartEngine.ts](../frontend/src/components/chart/ChartEngine.ts) | Core chart logic. Heikin-Ashi, Point & Figure, OHLC. seekToIndex() for Bar Replay. snapToOHLC flag. |
| PatternDetector | [PatternDetector.ts](../frontend/src/components/chart/patterns/PatternDetector.ts) | Detects head & shoulders, double top/bottom, triangles, flags, wedges. Renders with target/SL lines. |
| IndicatorManager | [IndicatorManager.ts](../frontend/src/components/chart/drawings/indicators/IndicatorManager.ts) | Manages runtime indicator registration via `addIndicator()`. |
| IndicatorPlugin | [IndicatorPlugin.ts](../frontend/src/components/chart/drawings/indicators/IndicatorPlugin.ts) | Plugin system for custom indicators with `indicator({...})` API. |

### Trading Components

| Component | File | Description |
|-----------|------|-------------|
| OrderBook | [OrderBook.tsx](../frontend/src/components/OrderBook.tsx) | Order book depth display. |
| OrderEntryPanel | [OrderEntryPanel.tsx](../frontend/src/components/OrderEntryPanel.tsx) | Order entry form. |
| PositionTable | [PositionTable.tsx](../frontend/src/components/PositionTable.tsx) | Position display. |

### Drag & Drop Components

| Component | File | Description |
|-----------|------|-------------|
| DropZone | [DropZone.tsx](../frontend/src/components/dragndrop/DropZone.tsx) | Accepts `text/plain` (symbol) drops. Kind: chart, order, compare, widget. |
| PriceDragTarget | [PriceDragTarget.tsx](../frontend/src/components/dragndrop/PriceDragTarget.tsx) | Accepts `application/x-price-level` drops. Opens AlertDialog with pre-filled price. |
| DateDropTarget | [DateDropTarget.tsx](../frontend/src/components/dragndrop/DateDropTarget.tsx) | Accepts `application/x-date` drops. Calls `setConfig({ start: date })`. |
| SymbolDragContext | [SymbolDragContext.tsx](../frontend/src/contexts/SymbolDragContext.tsx) | Context provider for symbol dragging. |

## Contexts

| Context | File | Description |
|---------|------|-------------|
| ThemeContext | [ThemeContext.tsx](../frontend/src/contexts/ThemeContext.tsx) | 7 themes: classic, cyber, terminal, light, auto, highcontrast, sunlight. |
| DistractionFreeContext | [DistractionFreeContext.tsx](../frontend/src/contexts/DistractionFreeContext.tsx) | Toggle `Ctrl+Shift+D`. Hides all chrome, shows floating "Exit Focus" button. |
| MultiWindowContext | [MultiWindowContext.tsx](../frontend/src/contexts/MultiWindowContext.tsx) | BroadcastChannel sync for theme/symbol/backtest changes across tabs. |
| SymbolDragContext | [SymbolDragContext.tsx](../frontend/src/contexts/SymbolDragContext.tsx) | Manages drag state for symbol dragging across components. |
| TabProvider | [TabContext.tsx](../frontend/src/contexts/TabContext.tsx) | Tab state management. |
| InterfaceModeContext | [InterfaceModeContext.tsx](../frontend/src/contexts/InterfaceModeContext.tsx) | Terminal vs Chat mode toggle (`Ctrl+Shift+C`). |

## Hooks

| Hook | File | Description |
|------|------|-------------|
| useMultiWindow | [useMultiWindow.ts](../frontend/src/hooks/useMultiWindow.ts) | BroadcastChannel subscribe/broadcast with self-message filtering. |
| useHeldTickers | [useHeldTickers.ts](../frontend/src/hooks/useHeldTickers.ts) | Returns deduplicated tickers from portfolio positions. Used by RightSidebar. |
| useWebSocket | [useWebSocket.ts](../frontend/src/hooks/useWebSocket.ts) | WebSocket connection with retry and cleanup. |
| useBreakpoint | [useBreakpoint.ts](../frontend/src/hooks/useBreakpoint.ts) | Mobile/desktop responsive breakpoint detection. |
| useHelp | [useHelp.ts](../frontend/src/hooks/useHelp.ts) | Help overlay toggle. |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle distraction-free mode |
| `Ctrl+Shift+R` | Toggle right sidebar |
| `Ctrl+Shift+C` | Toggle terminal/chat mode |
| `Ctrl+N` | Open new window (multi-window) |
| `Ctrl+Shift+N` | Open new window (alternative) |
| `?` | Show help overlay |

## Multi-Window Sync

Uses `BroadcastChannel('te-sync')` to synchronize:

| Event | Payload | Effect |
|-------|---------|--------|
| `THEME_CHANGED` | `{ theme }` | All windows update theme |
| `SYMBOL_CHANGED` | `{ symbol }` | All windows navigate to symbol |
| `BACKTEST_COMPLETE` | `{ id, symbol, return }` | Notification in other windows |

Each tab has a unique `tabId` (generated once via `crypto.randomUUID()` + localStorage) to filter its own broadcasts.

## Drag & Drop MIME Types

| MIME Type | Source | Target |
|-----------|--------|--------|
| `text/plain` | SymbolSearch items | DropZone (chart/order/compare/widget) |
| `application/x-price-level` | Chart price levels | PriceDragTarget (alert button) |
| `application/x-date` | Chart dates | DateDropTarget (backtest start) |

The `makeDateDraggable` and `extractDateFromDrag` utility functions handle the date MIME type.

## State Management

Uses Zustand stores:

```typescript
// Portfolio store
import { usePortfolioStore } from '../store/portfolio'
const { portfolio, load } = usePortfolioStore()

// Backtest store
import { useBacktestStore } from '../store/backtest'
const { results, run } = useBacktestStore()

// Signals store
import { useSignalStore } from '../store/signals'
const { signals, load } = useSignalStore()
```

## API Client (LLM & AI)

All AI functions are in `api/llm.ts`:

```typescript
import { llmComplete, llmCompleteStream, briefingGet, coMovementGet,
  earningsSummaryGet, generateStrategy, evaluateStrategy,
  generateIndicator, inspectPattern, llmQuery } from '../api/llm'

// Streaming (used by AIInspector)
await llmCompleteStream('gpt-4o', prompt, (token) => {
  setText(prev => prev + token)
})

// Non-streaming (used by Briefing, Strategy, etc.)
const briefing = await briefingGet()
const strategy = await generateStrategy('Buy when RSI < 30')
const result = await evaluateStrategy(strategy.code)
const indicator = await generateIndicator('Green when price > SMA')
const query = await llmQuery('What is my biggest position?')
```

## Theming

7 themes: `classic`, `cyber`, `terminal`, `light`, `auto`, `highcontrast`, `sunlight`

```typescript
import { useTheme } from '../contexts/ThemeContext'
const { theme, setTheme } = useTheme()
```

Theme cycles in order: `classic → cyber → terminal → light → auto → highcontrast → sunlight → classic`

## Running Development

```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:5173`

## TypeScript

All new components pass TypeScript strict mode with zero errors:

```bash
cd frontend && npx tsc --noEmit --pretty
```
