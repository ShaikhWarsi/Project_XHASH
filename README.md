# Trading Engine

**Version 0.3.0** — AI-Augmented Quantitative Trading Platform

Hybrid system combining classical quant signals, LLM agent reasoning, and comprehensive risk management.

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
┌─────────────────────────────────────────────────────┐
│                   Frontend (React + TypeScript)       │
│  Dashboard │ Portfolio │ Signals │ Trades │ Chart    │
│  Backtest │ Agents (Council) │ Hedge Flow │ Settings │
└──────────────────────┬──────────────────────────────┘
                       │ REST + SSE
┌──────────────────────▼──────────────────────────────┐
│              FastAPI REST API (15 route modules)     │
│  40+ endpoints: portfolio, signals, backtest, auth  │
│  SSE streaming, CFA analysis, market data, config   │
└──┬──────────┬──────────┬──────────┬────────────────┘
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
| **Agents** | 16 hedge fund personas (Buffett, Burry, Graham, Taleb, etc.), 8 quant agents, 8 LLM agents, Renaissance-style teams |
| **Risk** | Position limits, ATR stop-loss, Kelly sizing, circuit breakers, composite risk engine |
| **Backtesting** | Event-driven engine, Monte Carlo (1000+), walk-forward, scenario stress tests, synthetic data |
| **FinScript** | Custom trading DSL: lexer, parser, AST, interpreter, 40+ built-in functions |
| **Analytics** | 22+ metrics (Sharpe, Sortino, Calmar, VaR, CVaR), attribution, CFA toolkit |
| **Data** | yfinance, OpenBB, Alpaca, CCXT, Databento, FRED, Finnhub, SEC, news, Twitter, World Bank |
| **Execution** | Backtest, paper trading, Alpaca, CCXT (100+ exchanges), Interactive Brokers |
| **API** | FastAPI, 40+ REST endpoints, SSE streaming, JWT auth, API key auth |
| **Frontend** | 12-page SPA, TradingView charts, React Flow, Zustand, 4 themes |

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
finscript/      — Custom trading DSL (lexer/parser/interpreter)
integrations/   — Discord, Slack, Telegram, SMS, Email, TradingView
persistence/    — SQLAlchemy async ORM, Alembic migrations
frontend/       — React/TypeScript SPA (12 pages)
config/         — Settings + strategy defaults
```

## Environment Variables

See `.env.example` for all config vars. Key ones:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `TRADING_ENGINE_API_KEY` | No | — | API key auth for REST endpoints |
| `JWT_SECRET_KEY` | No | (auto-generated) | JWT signing secret |
| `CORS_ORIGINS` | No | `localhost:5173` | Allowed CORS origins |
| `FINNHUB_API_KEY` | No | — | Market data (quotes, news, search) |

## Testing

```bash
# Backend
pytest --cov=.

# Frontend
cd frontend && npm run test
```

## License

Proprietary — all rights reserved.
