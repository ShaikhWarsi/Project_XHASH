# Trading Engine v0.3.0 — Comprehensive Audit Report

## Executive Summary

**Trading Engine** is an **AI-Augmented Quantitative Trading Platform** — a sophisticated hybrid system combining classical quant signals, LLM agent reasoning, and comprehensive risk management. Version 0.3.0 represents a production-ready trading infrastructure with 23+ signal engines, 16+ hedge fund personas, and full-stack capabilities from data ingestion to live execution.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                Frontend (React + TypeScript)                 │
│  30-page SPA: Dashboard, Charts, Agents, Backtest, etc.       │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST + SSE + WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│               FastAPI Backend (40+ endpoints)                │
│  Signals │ Agents │ Risk │ Execution │ Analytics │ Auth     │
└────┬──────────┬──────────┬──────────┬──────────────────────┘
     │          │          │          │
┌────▼───┐ ┌────▼────┐ ┌───▼───┐ ┌──▼──────────┐
│Signals │ │ Agents   │ │ Risk  │ │ Execution   │
│23+     │ │16 HF    │ │Engine │ │ Backtest    │
│Engines │ │8 Quant  │ │Limits │ │ Paper       │
│Regime  │ │8 LLM    │ │Stops  │ │ Alpaca      │
│ML      │ │Renaissance│ │Sizing│ │ CCXT/IBKR  │
└────────┘ └─────────┘ └───────┘ └─────────────┘
```

---

## Signal Generation (23+ Engines)

### 1. Smart Money Concepts (SMC)

| Engine | File | Description |
|--------|------|-------------|
| Order Blocks | [smc.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\smc.py) | Institutional order block detection |
| Fair Value Gaps (FVG) | [smc.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\smc.py) | Imbalance zones |
| Break of Structure (BOS) | [smc.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\smc.py) | Trend continuation signals |
| Change of Character (CHOCH) | [smc.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\smc.py) | Trend reversal detection |

### 2. Pattern Recognition

| Engine | File | Description |
|--------|------|-------------|
| Head & Shoulders | [head_shoulders.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\head_shoulders.py) | Classical reversal pattern |
| Flags & Pennants | [flags_pennants.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\flags_pennants.py) | Continuation patterns |
| Harmonic Patterns | [harmonics.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\harmonics.py) | Gartley, Butterfly, Bat, Crab, Shark |
| Price Action | [price_action.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\price_action.py) | Candlestick patterns |
| Support/Resistance | [support_resistance.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\support_resistance.py) | Key level detection |
| Market Structure | [market_structure.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\indicators\market_structure.py) | Structure break analysis |

### 3. Regime Detection

| Engine | File | Description |
|--------|------|-------------|
| Trend Regime | [structure.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\structure_state.py) | Bull/Bear/Range detection |
| Volatility Regime | [structure.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\structure_state.py) | High/Low volatility states |
| Wasserstein Distance | [structure.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\structure_state.py) | Distribution-based regime |

### 4. Machine Learning

| Engine | File | Description |
|--------|------|-------------|
| Pattern Mining | [pattern_mining.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\ml\pattern_mining.py) | ML-based pattern discovery |
| Meta-Labeling | [meta_labeling.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\ml\meta_labeling.py) | Secondary ML signals |
| Feature Store | [feature_store.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\features\feature_store.py) | tsfresh feature extraction |
| RL Trainer | [trainer.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\rl\trainer.py) | Reinforcement learning training |

### 5. Alpha Zoo (158+ Pre-built Alphas)

Located in [signals/alpha_zoo/zoo/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\signals\alpha_zoo\zoo):

- **Qlib158**: 158 quantitative factors (MA, ROC, RSI, Correlation, Rank, etc.)
- **GTJA191**: Chinese quantitative factors

---

## Agent System

### 1. Hedge Fund Personas (16 Agents)

Located in [agents/hedge_fund/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\):

| Persona | Strategy Style | File |
|---------|---------------|------|
| Warren Buffett | Value / Moat | [warren_buffett.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\warren_buffett.py) |
| Ben Graham | Deep Value / Margin of Safety | [ben_graham.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\ben_graham.py) |
| Michael Burry | Deep Value / Contrarian | [michael_burry.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\michael_burry.py) |
| Stanley Druckenmiller | Macro / Momentum | [stanley_druckenmiller.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\stanley_druckenmiller.py) |
| Nassim Taleb | Tail Risk / Antifragility | [nassim_taleb.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\nassim_taleb.py) |
| Peter Lynch | GARP | [peter_lynch.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\peter_lynch.py) |
| Charlie Munger | Value / Psychology | [charlie_munger.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\charlie_munger.py) |
| Mohnish Pabrai | Clone / Asymmetric | [mohnish_pabrai.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\mohnish_pabrai.py) |
| Bill Ackman | Activist / High-conviction | [bill_ackman.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\bill_ackman.py) |
| Cathie Wood | Innovation / Growth | [cathie_wood.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\cathie_wood.py) |
| Phil Fisher | Growth / Quality | [phil_fisher.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\phil_fisher.py) |
| Rakesh Jhunjhunwala | Contrarian / Growth | [rakesh_jhunjhunwala.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\hedge_fund\rakesh_jhunjhunwala.py) |

### 2. LLM Agents (8 Agents)

Located in [agents/llm/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\llm\):

- Valuation Agent
- Sentiment Agent
- Fundamentals Agent
- Technicals Agent
- Portfolio Manager Agent
- Risk Manager Agent
- Growth Agent
- News Sentiment Agent

### 3. Renaissance-Style Teams

Located in [agents/renaissance/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\renaissance\):

- Research Team
- Risk Team
- Trading Team
- Orchestrator

### 4. Debate System

Located in [agents/debate/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\agents\debate\):

- Bull Researcher / Bear Researcher
- Aggressive / Conservative / Neutral Debator
- Research Manager
- Portfolio Manager

---

## Risk Management

### Core Components ([risk/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\risk\))

| Component | File | Capabilities |
|-----------|------|-------------|
| **Risk Engine** | [engine.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\risk\engine.py) | Central validation hub for all risk checks |
| **Position Limits** | [limits.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\risk\limits.py) | Per-symbol, sector, global limits |
| **Stop Loss** | [stop_loss.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\risk\stop_loss.py) | ATR-based trailing stops |
| **Position Sizing** | [position_sizing.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\risk\position_sizing.py) | Kelly criterion, fixed fractional |
| **Circuit Breakers** | [circuit_breakers.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\risk\circuit_breakers.py) | Drawdown pause, volatility halts |

---

## Backtesting

### Engine Types ([backtesting/market_engines/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\market_engines\))

| Market | File | Assets |
|--------|------|--------|
| Global Equity | [global_equity.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\market_engines\global_equity.py) | US, EU stocks |
| Global Futures | [global_futures.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\market_engines\global_futures.py) | CME, ICE |
| China A-Share | [china_a.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\market_engines\china_a.py) | SSE, SZSE |
| China Futures | [china_futures.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\market_engines\china_futures.py) | CFFEX |
| Forex | [forex.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\market_engines\forex.py) | Majors, minors, exotics |
| Crypto | [crypto.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\market_engines\crypto.py) | BTC, ETH, altcoins |

### Advanced Features

- **Monte Carlo**: 1000+ simulation runs ([monte_carlo.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\monte_carlo.py))
- **Walk-Forward**: Rolling window validation ([walkforward.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\walkforward.py))
- **Scenario Testing**: Stress test scenarios ([scenario.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\scenario.py))
- **Synthetic Data**: Generated test data ([synthetic_data.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\backtesting\synthetic_data.py))

---

## Analytics & Metrics

### Performance Metrics ([analytics/metrics.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\analytics\metrics.py))

| Category | Metrics |
|----------|---------|
| **Returns** | Total, Annualized, Cumulative, Alpha |
| **Risk** | Volatility, Max Drawdown, VaR 95%, CVaR 95% |
| **Risk-Adjusted** | Sharpe, Sortino, Calmar, Martin Ratio |
| **Trading** | Win Rate, Profit Factor, Avg Win/Loss, Expectancy |
| **Stability** | Batting Average, Capture Ratios |

### Portfolio Optimizers ([analytics/optimizers/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\analytics\optimizers\))

- Mean-Variance (Markowitz)
- Risk Parity
- Equal Volatility
- Maximum Diversification

### CFA Analytics ([analytics/cfa/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\analytics\cfa\))

- Portfolio Theory
- Fixed Income
- Derivatives
- Financial Statements
- Valuation

---

## FinScript DSL

A custom trading strategy language with full compiler stack:

| Component | File | Description |
|-----------|------|-------------|
| Lexer | [lexer.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\lexer.py) | Tokenization |
| Parser | [parser.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\parser.py) | AST generation |
| AST | [ast.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\ast.py) | Abstract syntax tree |
| Interpreter | [interpreter.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\interpreter.py) | Execution engine |
| Builtins | [builtins.py](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\builtins.py) | 40+ built-in functions |

**Export Targets:**

- [TradingView Pine Script](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\export\pine_script.py)
- [MetaTrader 5](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\export\mt5.py)
- [TD Ameritrade](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\finscript\export\tdx.py)

---

## Integrations

### Messaging ([integrations/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\integrations\))

- Discord Bot
- Slack Bot
- Telegram Bot
- SMS Notifier
- Email Notifier

### Data Sources

- Twitter / X
- TradingView
- OpenBB
- yfinance
- Alpaca
- CCXT (100+ exchanges)
- Interactive Brokers

---

## Frontend (React SPA)

### 30 Pages

| Page | File | Purpose |
|------|------|---------|
| Dashboard | [Dashboard.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Dashboard.tsx) | Portfolio overview, P&L |
| Portfolio | [Portfolio.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Portfolio.tsx) | Holdings management |
| Chart | [Chart.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Chart.tsx) | TradingView charts |
| Signals | [Signals.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Signals.tsx) | Signal scanner |
| Backtest | [Backtest.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Backtest.tsx) | Strategy backtesting |
| Agents | [Agents.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Agents.tsx) | AI agent council |
| HedgeFund | [HedgeFund.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\HedgeFund.tsx) | Persona-based analysis |
| RiskDashboard | [RiskDashboard.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\RiskDashboard.tsx) | Risk monitoring |
| StrategyLab | [StrategyLab.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\StrategyLab.tsx) | Visual strategy builder |
| StrategyOptimizer | [StrategyOptimizer.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\StrategyOptimizer.tsx) | Parameter optimization |
| PortfolioOptimization | [PortfolioOptimization.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\PortfolioOptimization.tsx) | Portfolio construction |
| RLTrainer | [RLTrainer.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\RLTrainer.tsx) | Reinforcement learning |
| FactorAnalysis | [FactorAnalysis.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\FactorAnalysis.tsx) | Alpha factor research |
| GeopoliticalAnalysis | [GeopoliticalAnalysis.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\GeopoliticalAnalysis.tsx) | Macro events |
| CfaAnalytics | [CfaAnalytics.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\CfaAnalytics.tsx) | CFA-level analysis |
| HypothesisLab | [HypothesisLab.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\HypothesisLab.tsx) | Hypothesis testing |
| DataPipeline | [DataPipeline.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\DataPipeline.tsx) | ETL management |
| TaskOrchestration | [TaskOrchestration.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\TaskOrchestration.tsx) | Workflow automation |
| SwarmDashboard | [SwarmDashboard.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\SwarmDashboard.tsx) | Agent swarm |
| SocialTrading | [SocialTrading.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\SocialTrading.tsx) | Copy trading |
| Plugins | [Plugins.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Plugins.tsx) | Extensibility |
| VisualStrategy | [VisualStrategy.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\VisualStrategy.tsx) | Node-based strategy |
| Structure | [Structure.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Structure.tsx) | Market structure |
| HedgeFlow | [HedgeFlow.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\HedgeFlow.tsx) | Agent flow builder |
| AdvancedCharts | [AdvancedCharts.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\AdvancedCharts.tsx) | Multi-chart layouts |
| MmcAnalysis | [MmcAnalysis.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\MmcAnalysis.tsx) | MMC strategy |
| FactorZoo | [FactorZoo.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\FactorZoo.tsx) | Alpha factor browser |
| StrategyCode | [StrategyCode.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\StrategyCode.tsx) | Code editor |
| PaperTrading | [PaperTrading.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\PaperTrading.tsx) | Simulated trading |
| WatchlistPage | [WatchlistPage.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\WatchlistPage.tsx) | Custom watchlists |
| Orders | [Orders.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Orders.tsx) | Order management |
| Trades | [Trades.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Trades.tsx) | Trade history |
| Settings | [Settings.tsx](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\frontend\src\pages\Settings.tsx) | Configuration |

### Frontend Tech Stack

- **React 19** + TypeScript
- **Zustand** (state management)
- **React Flow** (node-based UI)
- **TradingView Lightweight Charts** (charts)
- **Plotly.js** (visualization)
- **Tailwind CSS** (styling)
- **Monaco Editor** (code editing)
- **4 themes** support

---

## API Endpoints (40+ Routes)

Located in [api/routes/](file:///c:\Users\Mohammad\OneDrive\Desktop\Finance\aa\trademania\trading-engine\api\routes\):

| Route Module | Description |
|--------------|-------------|
| signals | Signal generation & history |
| portfolio | Portfolio state & positions |
| market_data | OHLCV, quotes, fundamentals |
| metrics | Performance calculations |
| stream | SSE real-time streaming |
| trades | Trade execution & history |
| backtest | Backtesting engine |
| chart | Chart data & cache |
| hedge_fund | Persona analysis |
| flows | Agent flow orchestration |
| structure | Market structure |
| cfa | CFA analytics |
| mmc | MMC strategy |
| config | System configuration |
| orders | Order management |
| positions | Position tracking |
| risk | Risk metrics |
| paper | Paper trading |
| ws | WebSocket streaming |
| global_market | Market overview |
| agent | Agent orchestration |
| portfolio_optimization | Portfolio builders |
| factor_analysis | Alpha research |
| rl_training | RL model training |
| finscript | DSL execution |
| ta_routes | Technical analysis |
| alpha_zoo | 158 alpha factors |
| geo_analysis | Geopolitical data |
| experiment | Strategy experiments |
| swarm | Agent swarms |
| hypothesis | Hypothesis testing |
| china_markets | China A-share data |

---

## Technology Stack

### Backend

| Category | Technology |
|----------|-------------|
| Framework | FastAPI + Uvicorn |
| Language | Python 3.11+ |
| ORM | SQLAlchemy (async) + Alembic |
| Data | Pandas, NumPy, SciPy |
| ML | scikit-learn, XGBoost, LightGBM |
| Finance | vectorbt, OpenBB, yfinance |
| Deep Learning | PyTorch (spectre) |
| RL | Stable Baselines3 |
| Cache | In-memory + Redis support |
| Auth | JWT + API Key |

### Frontend

| Category | Technology |
|----------|-------------|
| Framework | React 19 |
| Language | TypeScript |
| Build | Vite |
| State | Zustand |
| Charts | TradingView, Plotly |
| Flow | React Flow |
| HTTP | Axios |
| Routing | React Router 7 |

### Infrastructure

- Docker + Docker Compose
- Poetry/pip installation
- Pytest testing
- Ruff linting

---

## Project Structure Summary

```
trading-engine/
├── core/           # Types, enums, events, errors
├── signals/        # 23+ signal engines + ML
│   ├── indicators/ # Chart patterns (SMC, harmonics, etc.)
│   ├── ml/        # Pattern mining, meta-labeling, RL
│   ├── factors/    # Spectre GPU acceleration
│   └── alpha_zoo/ # 158 pre-built alphas
├── agents/         # AI agent system
│   ├── hedge_fund/ # 16 investor personas
│   ├── llm/       # 8 LLM agents
│   ├── debate/    # Bull/Bear debate system
│   └── renaissance/ # Renaissance-style teams
├── risk/          # Risk management
├── execution/     # Order execution
├── backtesting/   # Backtest engine + optimizers
│   └── market_engines/ # Multi-market support
├── analytics/     # Metrics, attribution, CFA
├── finscript/     # Custom DSL + exporters
├── integrations/  # Discord, Slack, Telegram, etc.
├── persistence/   # Database + migrations
├── api/           # FastAPI routes (40+)
├── llm/           # LLM client + capabilities
├── frontend/      # React SPA (30 pages)
├── scripts/       # CLI entrypoints
└── config/        # Strategy defaults
```

---

## Key Capabilities Summary

| Feature | Count/Details |
|---------|---------------|
| Signal Engines | 23+ |
| Alpha Factors | 158+ (Qlib + GTJA) |
| Hedge Fund Personas | 16 |
| LLM Agents | 8+ |
| Performance Metrics | 22+ |
| Portfolio Optimizers | 4 |
| Market Engines | 6 (Equity, Futures, Forex, Crypto, China A, China Futures) |
| Frontend Pages | 30 |
| API Endpoints | 40+ |
| Technical Indicators | 40+ built-ins |
| Export Targets | 3 (Pine, MT5, TD) |
| Integrations | 8+ (Discord, Slack, Telegram, SMS, Email, Twitter, TradingView) |

---

## Notable Advanced Features

1. **MCP Server Support** — Model Context Protocol for AI integration
2. **Geopolitical Analysis** — Macro event impact modeling
3. **Hypothesis Lab** — Statistical hypothesis testing framework
4. **Swarm Intelligence** — Multi-agent collaborative decision making
5. **Visual Strategy Builder** — Node-based strategy design
6. **Real-time SSE Streaming** — Live portfolio updates
7. **Walk-Forward Optimization** — Robustness validation
8. **Monte Carlo Simulation** — 1000+ equity curve scenarios
9. **Circuit Breakers** — Automated trading halts
10. **Multi-Theme Support** — 4 visual themes
