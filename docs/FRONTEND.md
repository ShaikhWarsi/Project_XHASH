# Frontend Guide

The Trading Engine includes a comprehensive 30-page React SPA with real-time updates, advanced charting, and interactive strategy building.

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
| HTTP | Axios |
| Build | Vite |

## Pages Overview

### Dashboard

**File:** [Dashboard.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Dashboard.tsx)

Main landing page showing:
- Portfolio NAV, cash, P&L
- Open positions table
- Real-time metrics (total return, Sharpe)
- SSE-powered live updates

### Portfolio

**File:** [Portfolio.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Portfolio.tsx)

- Holdings management
- Position details
- Allocation pie charts

### Chart

**File:** [Chart.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Chart.tsx)

- TradingView Lightweight Charts integration
- Multiple timeframes (1m to 1M)
- Drawing tools (trendlines, fibs, shapes)
- Indicator overlays (SMA, EMA, Bollinger, etc.)

### Signals

**File:** [Signals.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Signals.tsx)

- Signal scanner across tickers
- Filter by signal type, direction, confidence
- Real-time signal generation

### Backtest

**File:** [Backtest.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Backtest.tsx)

- Strategy backtesting interface
- Parameter configuration
- Equity curve visualization
- Performance metrics display

### Agents

**File:** [Agents.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Agents.tsx)

- AI agent council visualization
- Agent status monitoring
- Task assignment

### HedgeFund

**File:** [HedgeFund.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\HedgeFund.tsx)

- 16 hedge fund personas
- Persona-based analysis
- Opinion aggregation
- Visual persona cards

### RiskDashboard

**File:** [RiskDashboard.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\RiskDashboard.tsx)

- Real-time risk metrics
- VaR, CVaR display
- Drawdown charts
- Circuit breaker status

### StrategyLab

**File:** [StrategyLab.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\StrategyLab.tsx)

- Visual strategy builder
- Drag-and-drop components
- Condition definition
- Signal combination

### StrategyOptimizer

**File:** [StrategyOptimizer.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\StrategyOptimizer.tsx)

- Parameter optimization
- Grid search, random search
- Performance heatmaps
- Best parameters selection

### PortfolioOptimization

**File:** [PortfolioOptimization.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\PortfolioOptimization.tsx)

- Portfolio construction
- Optimizer selection (Mean-Variance, Risk Parity, etc.)
- Weight allocation visualization
- Constraints configuration

### RLTrainer

**File:** [RLTrainer.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\RLTrainer.tsx)

- Reinforcement learning training
- Environment configuration
- Training progress
- Model performance

### FactorAnalysis

**File:** [FactorAnalysis.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\FactorAnalysis.tsx)

- Alpha factor research
- Factor returns analysis
- IC analysis
- Factor correlation

### GeopoliticalAnalysis

**File:** [GeopoliticalAnalysis.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\GeopoliticalAnalysis.tsx)

- Macro event tracking
- Impact analysis
- Event correlation

### CfaAnalytics

**File:** [CfaAnalytics.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\CfaAnalytics.tsx)

- CFA-level financial analysis
- Valuation metrics
- Financial ratios
- Fixed income analytics

### HypothesisLab

**File:** [HypothesisLab.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\HypothesisLab.tsx)

- Statistical hypothesis testing
- A/B testing framework
- Results visualization

### DataPipeline

**File:** [DataPipeline.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\DataPipeline.tsx)

- ETL management
- Data source configuration
- Transformation rules
- Schedule management

### TaskOrchestration

**File:** [TaskOrchestration.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\TaskOrchestration.tsx)

- Workflow automation
- Task dependencies
- Execution monitoring

### SwarmDashboard

**File:** [SwarmDashboard.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\SwarmDashboard.tsx)

- Multi-agent swarm visualization
- Agent collaboration status
- Task distribution

### SocialTrading

**File:** [SocialTrading.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\SocialTrading.tsx)

- Copy trading
- Signal sharing
- Community features

### Plugins

**File:** [Plugins.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Plugins.tsx)

- Extension management
- Custom plugin installation
- Plugin marketplace

### VisualStrategy

**File:** [VisualStrategy.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\VisualStrategy.tsx)

- Node-based strategy editor
- React Flow integration
- Visual condition builder

### Structure

**File:** [Structure.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Structure.tsx)

- Market structure analysis
- Swing highs/lows
- Structure break detection

### HedgeFlow

**File:** [HedgeFlow.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\HedgeFlow.tsx)

- Agent flow builder
- Node-based agent orchestration
- Input/output connections

### AdvancedCharts

**File:** [AdvancedCharts.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\AdvancedCharts.tsx)

- Multi-chart layouts
- Symbol comparison
- Custom chart configurations

### MmcAnalysis

**File:** [MmcAnalysis.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\MmcAnalysis.tsx)

- MMC strategy analysis
- Order block detection
- Fair value gap analysis

### FactorZoo

**File:** [FactorZoo.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\FactorZoo.tsx)

- 158 alpha factor browser
- Factor performance visualization
- Custom factor creation

### StrategyCode

**File:** [StrategyCode.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\StrategyCode.tsx)

- Monaco code editor
- FinScript editing
- Syntax highlighting

### PaperTrading

**File:** [PaperTrading.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\PaperTrading.tsx)

- Simulated trading
- Order entry
- P&L tracking

### WatchlistPage

**File:** [WatchlistPage.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\WatchlistPage.tsx)

- Custom watchlists
- Quick quote viewing
- Watchlist management

### Orders

**File:** [Orders.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Orders.tsx)

- Order management
- Order status tracking
- Cancellation

### Trades

**File:** [Trades.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Trades.tsx)

- Trade history
- Trade details
- Export functionality

### Settings

**File:** [Settings.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Settings.tsx)

- Theme selection (4 themes)
- API key configuration
- Notification settings

## Components

### Layout Components

| Component | File | Description |
|-----------|------|-------------|
| Layout | [Layout.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\components\Layout.tsx) | Main app layout |
| Sidebar | [Sidebar.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\components\Sidebar.tsx) | Navigation sidebar |

### Chart Components

| Component | File | Description |
|-----------|------|-------------|
| ChartContainer | [ChartContainer.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\components\ChartContainer.tsx) | Chart wrapper |
| ChartEngine | [ChartEngine.ts](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\components\chart\ChartEngine.ts) | Chart logic |
| DrawingManager | [DrawingManager.ts](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\components\chart\drawings\DrawingManager.ts) | Drawing tools |

### Trading Components

| Component | File | Description |
|-----------|------|-------------|
| OrderBook | [OrderBook.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\components\OrderBook.tsx) | Order book display |
| OrderEntryPanel | [OrderEntryPanel.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\components\OrderEntryPanel.tsx) | Order entry form |
| PositionTable | [PositionTable.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\components\PositionTable.tsx) | Position display |

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

## API Client

```typescript
import { apiClient } from '../api/client'

// GET request
const data = await apiClient.get('/portfolio')

// POST request
const result = await apiClient.post('/backtest', { tickers: ['AAPL'] })
```

## WebSocket Connection

```typescript
import { useWebSocket } from '../hooks/useWebSocket'

const { connect, disconnect, subscribe } = useWebSocket()

// Subscribe to dashboard updates
useEffect(() => {
  const unsub = subscribe('dashboard', (data) => {
    setSnapshot(data)
  })
  return unsub
}, [])
```

## Theming

4 themes supported: Light, Dark, High Contrast, Custom

```typescript
import { useTheme } from '../contexts/ThemeContext'
const { theme, setTheme } = useTheme()
```

## Running Development

```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:5173`
