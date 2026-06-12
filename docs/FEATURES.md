# Feature Reference

Complete guide to every feature in the Trading Engine.

---

## Markets

### Dashboard (`/`)
The central hub. Shows portfolio value, performance metrics, active signals, and recent activity. Customizable with draggable widgets.

### Chart (`/markets/chart`)
Full-featured charting with:
- **Symbol search** — Type any symbol to chart it
- **Timeframes** — 1m, 5m, 15m, 1h, 4h, 1d, 1w
- **Indicators** — SMA, EMA, RSI, MACD, Bollinger Bands, Volume, and custom
- **Drawing tools** — Trend lines, horizontal lines, Fibonacci retracements, channels
- **Pattern detection** — Automatic detection of common chart patterns
- **AI Inspector** — Click "What is this?" to analyze patterns with AI
- **Time Machine** — Replay historical price action frame by frame
- **Compare** — Overlay multiple symbols on the same chart
- **Trade markers** — See where you entered/exited trades on the chart

### Watchlist (`/markets/watchlist`)
Track your favorite symbols in one place. Add/remove symbols, view quick quotes.

### Signals (`/markets/signals`)
All active trading signals from 23+ signal engines. View as a list, heatmap, or real-time stream. Filter by symbol, signal type, or direction.

### Market Structure (`/markets/structure`)
Smart Money Concepts analysis showing order blocks, fair value gaps, liquidity levels, and market structure shifts.

### Market Intel (`/markets/market-intel`)
News, macro signals, ETF flows, and stock analysis aggregated in one place.

### Advanced Charts (`/markets/advanced-charts`)
Multi-chart layouts for comparing multiple symbols or timeframes side by side.

### Screener (`/markets/screener`)
Screen stocks by technical criteria. Pre-built presets available.

### Correlation (`/markets/correlation`)
Correlation matrix showing relationships between symbols.

### Sector Heatmap (`/markets/sector-heatmap`)
Visual heatmap of sector performance.

### Options Chain (`/markets/options`)
Options chain viewer with greeks (delta, gamma, theta, vega, IV).

### Calendar (`/markets/calendar`)
Earnings calendar and economic event calendar.

### World Markets (`/markets/world-markets`)
Global market overview across major indices.

---

## Trading

### Orders (`/trading/orders`)
Order management with full CRUD. Supports market, limit, stop, stop-limit, bracket, and OCO orders. Undo/redo support for order operations.

### Trades (`/trading/trades`)
Historical trade log with P&L for each trade. Search by symbol. Execution analytics view.

### Portfolio (`/trading/portfolio`)
View your holdings with current prices, P&L, and allocation. Click any position for details.

### Paper Trading (`/trading/paper-trading`)
Simulated trading with $100,000 virtual account. Start/stop simulation, reset account, place paper orders.

### Portfolio Optimization (`/trading/portfolio-optimization`)
Optimize portfolio allocation using mean-variance, CVaR, or HRP methods. View the efficient frontier.

### What-If Analysis (`/trading/what-if`)
Analyze portfolio changes before making them. Compare current vs target allocation.

---

## Risk

### Risk Dashboard (`/risk`)
Real-time risk metrics:
- Value at Risk (VaR 95%)
- Conditional VaR (CVaR 95%)
- Max Drawdown
- Current drawdown
- Sharpe/Sortino ratios
- Exposure analysis
- Circuit breaker status
- Position limit monitoring
- Stop-loss tracking

### Attribution Analysis (`/risk/attribution`)
Break down returns by sector allocation, security selection, and timing.

---

## Strategy

### Backtest (`/strategy/backtest`)
Event-driven backtesting engine. Run strategies against historical data. Results include equity curve, trade log, and 20+ performance metrics.

### Strategy Lab (`/strategy/lab`)
Visual strategy builder — combine conditions without coding.

### Strategy Code (`/strategy/code`)
Write strategies in FinScript, a custom trading DSL. Features:
- 40+ built-in functions
- Technical indicators
- Position sizing
- Risk management rules
- Export to PineScript, MT5, TDX

### Optimizer (`/strategy/optimizer`)
Grid and random search optimization for strategy parameters. Walk-forward analysis support.

### Visual Strategy (`/strategy/visual`)
Node-based strategy editor using React Flow. Drag, connect, and configure nodes.

---

## AI

### AI Agents (`/ai/agents`)
Multi-agent analysis system with:
- 16 hedge fund personas (Buffett, Burry, Taleb, etc.)
- 8 LLM agents (Valuation, Sentiment, Technicals, etc.)
- Renaissance-style collaborative teams
- Bull/bear debate system
- Consensus scoring

### Persona Council (`/ai/persona-council`)
Multi-agent council visualization. Select personas, enter a symbol, and run analysis. Each agent provides their thesis, and the council produces a consensus.

### LLM Chat (`/ai/llm`)
Chat interface for AI-powered market queries. Supports:
- Multiple LLM providers
- Data Query mode (includes your portfolio context)
- Model selection
- Conversation history

### Strategy Generator (`/ai/strategy-generator`)
Natural language → FinScript code generator. Describe your strategy in plain English, review the generated code, and run a backtest.

### Indicator Generator (`/ai/indicator-generator`)
Natural language → JavaScript indicator plugin. Describe your indicator and add it to your chart at runtime.

### Chart Inspector (`/ai/ai-inspector`)
Streaming AI analysis of chart patterns. Click "What is this?" on detected patterns for AI-generated explanation, analogs, and trading implications.

### AI Briefing (`/ai/briefing`)
Comprehensive market briefing with portfolio overview, regime analysis, top movers, and risk assessment. Available from the status bar.

### AI Risk Report (`/ai/risk-report`)
AI-generated risk analysis with personalized recommendations.

### Explainable Stops (`/ai/explain-stops`)
AI-recommended stop-loss levels with explanations for each level.

### Prompt Library (`/ai/prompt-library`)
Save and manage reusable prompts for AI analysis.

---

## Research

### CFA Analytics (`/research/cfa`)
Professional financial analysis:
- DCF valuation
- Comparable company analysis
- Financial ratio analysis
- Health scoring

### Factor Analysis (`/research/factor-analysis`)
Research alpha factors:
- Test factor predictive power
- View decay over time
- Compare multiple factors
- Statistical significance testing

### Factor Zoo (`/research/factor-zoo`)
158 pre-built alpha factors organized by category (momentum, value, quality, growth, volatility, etc.).

### MMC Analysis (`/research/mmc`)
Smart Money Concepts analysis with order blocks, FVGs, liquidity sweeps, and market structure.

### Monte Carlo (`/research/monte-carlo`)
1000+ simulated scenarios for portfolio. View return distributions and identify tail risks.

### Walk-Forward (`/research/walkforward`)
Walk-forward optimization to validate strategy robustness and prevent overfitting.

### Scenario Analysis (`/research/scenario`)
Stress-test your portfolio against specific scenarios (market crash, rate shock, inflation, etc.).

### Geopolitical Analysis (`/research/geo`)
Analyze geopolitical events and their potential market impact.

### SQL Research (`/research/sql`)
Write SQL queries directly against the database for custom research.

### Renaissance (`/research/renaissance`)
Renaissance-style collaborative team analysis with research, risk, and trading teams.

### Memory Log (`/research/memory-log`)
View agent memory and decision history for transparency.

---

## Data

### Data Pipeline (`/data/pipeline`)
ETL pipeline management for market data ingestion.

### Signal Engines (`/data/signal-engines`)
View and configure the 23+ signal engines. Monitor their status and output.

### Task Orchestration (`/data/task-orchestration`)
Schedule and manage data processing tasks.

### Workflows (`/data/workflows`)
Create and manage data workflows.

---

## Settings

### General (`/settings`)
- Theme selection (7 themes)
- API key management
- Notification configuration (Discord, Slack, Telegram, Email)
- Interface mode (terminal or chat)

### Plugins (`/settings/plugins`)
Manage platform extensions and add-ons.

### Infrastructure (`/settings/infrastructure`)
System health monitoring:
- Database status
- Background task status
- API server metrics

### Bots (`/settings/bots`)
Configure automated trading bots.

### Calibration (`/settings/calibration`)
Calibrate agent parameters and behavior.

### Reflection (`/settings/reflection`)
Agent performance review and improvement.

### Audit Log (`/settings/audit-log`)
View system audit trail of all mutations.
