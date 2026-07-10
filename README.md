# Trading Engine

**Version 0.4.0** — AI-Augmented Quantitative Trading Platform

Hybrid system combining classical quant signals, LLM agent reasoning, comprehensive risk management, and a feature-rich desktop-grade frontend.

## Quick Start

```bash
# Install
pip install -e ".[dev,llm,live,ml]"
cd frontend && npm install

# Run (two terminals)
python scripts/dashboard.py          # API on :8000
cd frontend && npm run dev           # UI on :5173

# Or with Docker
docker compose up
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   Frontend (React + TypeScript)                    │
│  Dashboard │ Portfolio │ Signals │ Trades │ Chart │ Backtest     │
│  Agents │ Hedge Flow │ Strategy Lab │ AI Features │ Right Sidebar│
└──────────────────────┬───────────────────────────────────────────┘
                       │ REST + SSE + WebSocket
┌──────────────────────▼───────────────────────────────────────────┐
│              FastAPI REST API (60+ route modules)                 │
│  Portfolio │ Signals │ Backtest │ Agents │ LLM │ FinScript       │
│  AI: Briefing │ Co-Movement │ Earnings │ Strategy │ Indicator    │
│  Chart Inspector │ LLM Query │ Streaming SSE                     │
└──┬──────────┬──────────┬──────────┬─────────────────────────────┘
   │          │          │          │
┌──▼──┐  ┌───▼───┐  ┌──▼───┐  ┌──▼──────────┐
│Signals│  │Agents │  │ Risk │  │ Execution   │
│23+   │  │16 HF  │  │Engine│  │ Backtest    │
│Engines│  │8 Quant│  │Limits│  │ Paper       │
│Regime │  │8 LLM  │  │Stops │  │ Alpaca      │
│ML     │  │Renaiss│  │Sizing│  │ CCXT / IBKR │
└──────┘  └───────┘  └──────┘  └─────────────┘
```

## Key Features

| Area | Capabilities |
|------|-------------|
| **Signals** | SMC (order blocks, FVGs, BOS/CHOCH), harmonics, H&S, flags/pennants, price action, regime detection (trend, vol, Wasserstein), ML pattern mining, vision-based detection |
| **Agents** | 16 hedge fund personas (Buffett, Burry, Graham, Taleb, etc.), 8 quant agents, 8 LLM agents, Renaissance-style teams, debate system |
| **Risk** | Position limits, ATR stop-loss, Kelly sizing, circuit breakers, composite risk engine |
| **Backtesting** | Event-driven engine, Monte Carlo (1000+), walk-forward, scenario stress tests, synthetic data |
| **FinScript** | Custom trading DSL: lexer, parser, AST, interpreter, 40+ built-in functions, PineScript/MT5/TDX export |
| **Analytics** | 22+ metrics (Sharpe, Sortino, Calmar, VaR, CVaR), attribution, CFA toolkit |
| **Data** | yfinance, OpenBB, Alpaca, CCXT, Databento, FRED, Finnhub, SEC, news, Twitter, World Bank |
| **Execution** | Backtest, paper trading, Alpaca, CCXT (100+ exchanges), Interactive Brokers |
| **API** | FastAPI, 60+ REST endpoints, SSE streaming, WebSocket, JWT auth, API key auth |
| **Frontend** | 30-page SPA, TradingView charts, React Flow, Zustand, 7 themes, multi-window, distraction-free mode |
| **AI Features** | AI Briefing, Ask the Terminal, Strategy Generator, Indicator Generator, Chart Inspector, News Co-Movement, Earnings Call Summary |
| **UI/UX** | High-contrast/sunlight themes, distraction-free mode, drag-and-drop (symbol, price, date), multi-window sync, right sidebar (news/calendar/chat) |

## CLI Commands

```bash
# Backtest
trading-engine-backtest --tickers AAPL,MSFT --start 2024-01-01

# Live paper trading
trading-engine-live --mode paper --tickers BTC/USD

# Dashboard API server
trading-engine-dashboard --port 8000
```

## Project Structure

```
core/           — Types, enums, events, errors
data/           — Market data providers + cache + realtime
signals/        — Signal pipeline (23+ engines, regime, ML, vision)
agents/         — Classical quant, LLM, hedge fund persona, Renaissance
risk/           — Position limits, stop-loss, sizing, circuit breakers
execution/      — Backtest, paper, Alpaca, CCXT, IBKR
backtesting/    — Engine, Monte Carlo, walk-forward, scenario, synthetic
analytics/      — Metrics, attribution, reports, CFA, visualization
api/            — FastAPI REST + SSE + auth
  routes/       — 60+ route modules (including 7 new AI endpoints)
    llm.py            — LLM completion + streaming SSE
    briefing.py       — AI Briefing on demand
    network_co_movement.py — News-driven correlation analysis
    earnings_summary.py   — Earnings call bull/bear/risk summary
    ai_strategy.py        — Natural language → FinScript strategy
    ai_indicator.py       — Natural language → custom indicator
    ai_inspector.py       — Chart pattern LLM analysis (streaming)
    llm_query.py          — Portfolio-aware natural language query
finscript/      — Custom trading DSL (lexer/parser/interpreter)
integrations/   — Discord, Slack, Telegram, SMS, Email, TradingView
persistence/    — SQLAlchemy async ORM, Alembic migrations
frontend/       — React/TypeScript SPA (30 pages)
  src/
    components/
      rightsidebar/  — News, Calendar, Chat, Co-Movement, Earnings tabs
      AIBriefing.tsx       — Modal briefing overlay
      NewsCoMovement.tsx   — News-driven co-movement panel
      EarningsSummary.tsx  — Earnings call summary panel
      StrategyGenerator.tsx — NL → FinScript code gen + backtest
      IndicatorGenerator.tsx — NL → JS indicator plugin gen
      AIInspector.tsx      — Streaming pattern analysis modal
      StreamResponse.tsx   — Reusable SSE streaming text component
    contexts/
      DistractionFreeContext.tsx — Hide chrome for focus mode
      MultiWindowContext.tsx     — BroadcastChannel cross-tab sync
      SymbolDragContext.tsx      — Native HTML5 DnD for symbols
    utils/
      broadcastChannels.ts — Channel name constants + getTabId()
      tickSound.ts         — Web Audio API tick chirp
    api/
      llm.ts               — All LLM + AI API functions
config/         — Settings + strategy defaults
```

## Changelog — 3 June 2026

### New AI Features (7 endpoints + 7 components)
- **AI Briefing** — Button-driven market + portfolio briefing with LLM-generated analysis (portfolio, regime, top movers, risk)
- **Ask the Terminal** — LLMPanel now has a "Data Query" mode that injects portfolio/risk/trade context into prompts
- **AI Strategy Generator** — Describe a strategy in plain English → get FinScript code → review → run backtest
- **AI Indicator Generator** — Describe an indicator → get JavaScript code → add to chart at runtime
- **AI Chart Inspector** — Click "What is this?" on a detected pattern → streaming LLM analysis (explanation, analogs, trading implications)
- **News Co-Movement** — Right sidebar tab: enter headline + tickers → AI shows correlated movers
- **Earnings Call Summary** — Paste transcript → AI extracts bull case, bear case, and single biggest risk

### New UI/UX Features
- **Multi-Window** — `Ctrl+N` / `Ctrl+Shift+N` opens new windows; theme and symbol changes sync via `BroadcastChannel`
- **Drag Symbol Anywhere** — Drag from SymbolSearch → drop on chart, order entry, compare, or widget
- **Drag Price to Alert** — Drag a price level from the chart → drops on Alert button to pre-fill
- **Drag Date to Backtest** — Drag a date from the chart → drops on backtest start date input
- **Distraction-Free Mode** — `Ctrl+Shift+D` hides all chrome; floating "Exit Focus" button
- **High-Contrast / Sunlight Themes** — Two new themes: max-contrast black/white and warm sunlight-optimized
- **Right Sidebar** — Collapsible News, Calendar, Chat tabs with keyboard shortcut `Ctrl+Shift+R`

### Streaming Infrastructure
- `/llm/complete-stream` — SSE endpoint for token-by-token LLM responses (used by Chart Inspector)
- `llmCompleteStream()` — Frontend `ReadableStream` reader

## Environment Variables

See `.env.example` for all config vars. Key ones:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `TRADING_ENGINE_API_KEY` | No | — | API key auth for REST endpoints |
| `JWT_SECRET_KEY` | No | (auto-generated) | JWT signing secret |
| `CORS_ORIGINS` | No | `localhost:5173` | Allowed CORS origins |
| `FINNHUB_API_KEY` | No | — | Market data (quotes, news, search) |
| `OPENAI_API_KEY` | For AI features | — | OpenAI LLM provider |
| `ANTHROPIC_API_KEY` | For AI features | — | Anthropic LLM provider |

## Testing

```bash
# Backend
pytest --cov=.

# Frontend
cd frontend && npm run test
```

## Documentation

| Guide | Description |
|-------|-------------|
| [User Guide](docs/USER_GUIDE.md) | Complete guide to every page, feature, and button |
| [Quick Start](docs/QUICKSTART.md) | Installation and first steps |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Fix common issues step by step |
| [Feature Reference](docs/FEATURES.md) | Every feature explained |
| [Keyboard Shortcuts](docs/SHORTCUTS.md) | All keyboard shortcuts |
| [Architecture](docs/ARCHITECTURE.md) | System architecture |
| [API Reference](docs/API.md) | REST API documentation |
| [Signal Engines](docs/SIGNALS.md) | Signal generation docs |
| [AI Agents](docs/AGENTS.md) | Hedge fund personas and LLM agents |
| [Risk Management](docs/RISK.md) | Risk engine documentation |
| [Backtesting](docs/BACKTESTING.md) | Backtesting engine docs |
| [FinScript](docs/FINSCRIPT.md) | Custom trading DSL docs |

## License

MIT — see [LICENSE](LICENSE) for details.
