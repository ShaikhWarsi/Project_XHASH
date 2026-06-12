# Trading Engine Documentation

**Version 0.4.0** — AI-Augmented Quantitative Trading Platform

Welcome to the Trading Engine documentation. This is a comprehensive quantitative trading platform combining classical quant signals, LLM agent reasoning, comprehensive risk management, and a desktop-grade frontend with AI-powered features.

## Documentation Structure

### Getting Started
- [Quick Start Guide](QUICKSTART.md) — Installation and first steps
- [User Guide](USER_GUIDE.md) — Complete guide to all features and pages
- [Troubleshooting Guide](TROUBLESHOOTING.md) — Fix common issues step by step
- [Architecture Overview](ARCHITECTURE.md) — System architecture and design

### Core Systems
- [Signal Generation](SIGNALS.md) — 23+ signal engines and pattern recognition
- [AI Agents](AGENTS.md) — Hedge fund personas and LLM-driven analysis
- [Risk Management](RISK.md) — Position limits, stop-loss, circuit breakers
- [Backtesting](BACKTESTING.md) — Multi-market backtesting engines
- [Analytics](ANALYTICS.md) — Performance metrics and portfolio optimization
- [FinScript DSL](FINSCRIPT.md) — Custom trading strategy language

### Reference
- [API Reference](API.md) — 60+ REST endpoints (including 7 new AI endpoints)
- [Frontend Guide](FRONTEND.md) — 30-page React SPA overview with all new components
- [Feature Reference](FEATURES.md) — Complete list of every feature and button
- [Keyboard Shortcuts](SHORTCUTS.md) — All keyboard shortcuts reference

## Key Features

| Category | Capabilities |
|----------|-------------|
| **Signals** | SMC, Harmonics, Head & Shoulders, Flags/Pennants, Price Action, ML Pattern Mining, Regime Detection |
| **Agents** | 16 Hedge Fund Personas (Buffett, Burry, Taleb, etc.), 8 LLM Agents, Renaissance-Style Teams, Debate System |
| **Risk** | Position Limits, ATR Stop-Loss, Kelly Sizing, Circuit Breakers, Composite Risk Engine |
| **Backtesting** | Event-Driven Engine, Monte Carlo (1000+), Walk-Forward, Scenario Stress Tests |
| **Analytics** | 22+ Metrics (Sharpe, Sortino, Calmar, VaR, CVaR), Attribution, CFA Toolkit |
| **Execution** | Backtest, Paper Trading, Alpaca, CCXT (100+ exchanges), Interactive Brokers |
| **AI Features** | AI Briefing on Demand, Ask the Terminal (NL Portfolio Query), Strategy Generator (NL → FinScript), Indicator Generator (NL → JS Plugin), Chart Inspector (Streaming Pattern Analysis), News Co-Movement, Earnings Call Summary |
| **Frontend** | 30-page SPA, Multi-Window Sync, Distraction-Free Mode, DnD (Symbol/Price/Date), Right Sidebar (News/Calendar/Chat), 7 Themes, TradingView Charts |

## Quick Links

```bash
# Install
pip install -e ".[dev,llm,live,ml]"

# Run API
python scripts/dashboard.py

# Run Frontend
cd frontend && npm run dev
```

## Changelog — 3 June 2026

### v0.3.0 → v0.4.0

**AI Features (7 new)**
- `GET /api/ai/briefing` — Portfolio + market LLM briefing
- `POST /api/ai/co-movement` — News-driven ticker correlation analysis
- `POST /api/ai/earnings-summary` — Earnings transcript bull/bear/risk extraction
- `POST /api/ai/generate-strategy` — Natural language → FinScript code generation
- `POST /api/ai/evaluate-strategy` — Run generated FinScript as backtest
- `POST /api/ai/generate-indicator` — Natural language → JS indicator plugin code
- `POST /api/ai/inspect-pattern` — Streaming chart pattern LLM analysis
- `POST /api/llm/query` — Portfolio-aware natural language data query
- `POST /api/llm/complete-stream` — SSE streaming endpoint for any LLM prompt

**Frontend (7 new components)**
- AIBriefing — Modal overlay with LLM-generated market+portfolio summary
- StreamResponse — Reusable SSE streaming text component
- NewsCoMovement — Right sidebar panel for headline correlation analysis
- EarningsSummary — Right sidebar panel for call transcript summarization
- StrategyGenerator — Describe/write strategy → review → backtest
- IndicatorGenerator — Describe → generate JS → add to chart at runtime
- AIInspector — Streaming modal for chart pattern explainability

**Frontend (new infrastructure)**
- Multi-window via BroadcastChannel (`te-sync` channel)
- Distraction-free mode (`Ctrl+Shift+D`)
- Native HTML5 drag-and-drop (symbol, price level, date)
- Right sidebar with News/Calendar/Chat/Co-Move/Earnings tabs
- High-contrast and sunlight themes
- `useHeldTickers` hook (portfolio dedup)
- MotdBanner (config-driven server announcements)

## Project Statistics

- **Signal Engines**: 23+
- **Alpha Factors**: 158+
- **Hedge Fund Personas**: 16
- **LLM Agents**: 8+
- **AI Endpoints**: 8
- **Performance Metrics**: 22+
- **API Endpoints**: 60+
- **Frontend Pages**: 30
- **Frontend Components**: 100+

## Resources

- [Original README](../README.md) — Project README with setup instructions
- [API Documentation](http://localhost:8000/docs) — Interactive API docs (when running)
- [Frontend](http://localhost:5173) — Web interface (when running)

## License

Proprietary — all rights reserved.
