# Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Frontend (React + TypeScript)                 │
│     Dashboard │ Portfolio │ Signals │ Chart │ Backtest      │
│     Agents (Council) │ Hedge Flow │ Risk │ Settings        │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST + SSE + WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│                  FastAPI REST API                             │
│              40+ Endpoints | JWT Auth | SSE                  │
└───────┬───────────┬───────────┬───────────┬─────────────────┘
        │           │           │           │
┌───────▼───┐ ┌─────▼─────┐ ┌───▼───┐ ┌───▼──────────┐
│  Signals   │ │  Agents   │ │ Risk  │ │  Execution   │
│   23+      │ │  16 HF    │ │Engine │ │  Backtest    │
│   Engines  │ │  8 Quant  │ │Limits │ │  Paper       │
│   Regime   │ │  8 LLM    │ │Stops  │ │  Alpaca      │
│   ML       │ │Renaissance│ │Sizing │ │  CCXT/IBKR   │
└───────────┘ └───────────┘ └───────┘ └──────────────┘
```

## Directory Structure

```
trading-engine/
├── core/                  # Core types and utilities
│   ├── enums.py          # SignalType, Timeframe, OrderSide, etc.
│   ├── types.py          # Bar, Order, PortfolioState, QuantSignal
│   ├── events.py         # Event system
│   ├── errors.py         # Custom exceptions
│   └── position.py       # Position management
│
├── signals/               # Signal generation pipeline
│   ├── base.py           # SignalEngine abstract base class
│   ├── engine_registry.py # Signal engine registration
│   ├── composite.py      # Composite signal aggregation
│   ├── indicators/       # Technical indicator implementations
│   │   ├── smc.py        # Smart Money Concepts
│   │   ├── harmonics.py  # Harmonic patterns
│   │   ├── head_shoulders.py
│   │   ├── patterns.py   # Candlestick patterns
│   │   ├── price_action.py
│   │   ├── support_resistance.py
│   │   └── market_structure.py
│   ├── ml/               # Machine learning signals
│   │   ├── pattern_mining.py
│   │   ├── meta_labeling.py
│   │   └── validation.py
│   ├── rl/               # Reinforcement learning
│   │   ├── trainer.py
│   │   └── environment.py
│   ├── factors/          # GPU-accelerated factors
│   └── alpha_zoo/        # 158 pre-built alpha factors
│       └── zoo/          # Qlib158, GTJA191 factors
│
├── agents/                # AI agent system
│   ├── base.py           # TradingAgent abstract base
│   ├── orchestrator.py   # Agent coordination
│   ├── hedge_fund/       # Investor persona agents
│   │   ├── warren_buffett.py
│   │   ├── ben_graham.py
│   │   ├── michael_burry.py
│   │   ├── nassim_taleb.py
│   │   └── ... (12 more personas)
│   ├── llm/              # LLM-powered agents
│   │   ├── valuation_agent.py
│   │   ├── sentiment_agent.py
│   │   ├── fundamentals_agent.py
│   │   └── ... (4 more agents)
│   ├── debate/           # Bull/Bear debate system
│   │   ├── bull_researcher.py
│   │   ├── bear_researcher.py
│   │   └── ... (debate orchestration)
│   └── renaissance/      # Renaissance-style teams
│       ├── research_team.py
│       ├── risk_team.py
│       └── trading_team.py
│
├── risk/                 # Risk management
│   ├── engine.py         # Central RiskEngine
│   ├── limits.py         # PositionLimits
│   ├── stop_loss.py      # StopLossTracker
│   ├── position_sizing.py # Kelly, fixed fractional
│   └── circuit_breakers.py
│
├── execution/            # Order execution
│   ├── backtest/         # Backtest execution
│   ├── paper/            # Paper trading
│   └── live/             # Live broker integration
│
├── backtesting/          # Backtesting infrastructure
│   ├── engine.py         # Main BacktestEngine
│   ├── engine_factory.py # Engine creation
│   ├── metrics.py        # Performance metrics
│   ├── monte_carlo.py    # Monte Carlo simulations
│   ├── walkforward.py    # Walk-forward analysis
│   ├── scenario.py       # Scenario testing
│   ├── synthetic_data.py # Synthetic data generation
│   └── market_engines/   # Multi-market support
│       ├── base.py
│       ├── global_equity.py
│       ├── global_futures.py
│       ├── china_a.py
│       ├── china_futures.py
│       ├── forex.py
│       └── crypto.py
│
├── analytics/            # Analytics and reporting
│   ├── metrics.py        # 22+ performance metrics
│   ├── attribution.py    # Performance attribution
│   ├── reports.py        # Report generation
│   ├── dashboard.py      # Dashboard data
│   ├── optimizers/       # Portfolio optimization
│   │   ├── mean_variance.py
│   │   ├── risk_parity.py
│   │   ├── equal_volatility.py
│   │   └── max_diversification.py
│   ├── cfa/              # CFA analytics
│   │   ├── portfolio.py
│   │   ├── fixed_income.py
│   │   ├── derivatives.py
│   │   ├── valuation.py
│   │   └── financial_statements.py
│   ├── benchmarks/       # Benchmark implementations
│   └── hypothesis/       # Hypothesis testing
│
├── finscript/            # Custom trading DSL
│   ├── lexer.py          # Tokenizer
│   ├── parser.py         # Parser
│   ├── ast.py            # Abstract syntax tree
│   ├── interpreter.py    # Execution engine
│   ├── builtins.py       # Built-in functions (40+)
│   ├── compiler/         # Strategy compiler
│   └── export/           # Export targets
│       ├── pine_script.py # TradingView
│       ├── mt5.py         # MetaTrader 5
│       └── tdx.py        # TD Ameritrade
│
├── integrations/          # Third-party integrations
│   ├── discord_bot.py
│   ├── slack_bot.py
│   ├── telegram_bot.py
│   ├── sms_notifier.py
│   ├── email_notifier.py
│   ├── twitter.py
│   └── tradingview.py
│
├── persistence/          # Data persistence
│   ├── database.py       # SQLAlchemy async setup
│   ├── models.py         # ORM models
│   ├── repositories.py   # Data access layer
│   └── migrate.py        # Migration utilities
│
├── api/                  # FastAPI application
│   ├── app.py            # Application factory
│   ├── routes/           # API route modules (30+)
│   ├── models/           # Pydantic schemas
│   ├── services/         # Business logic services
│   ├── auth/             # Authentication
│   └── websocket_manager.py
│
├── llm/                  # LLM integration
│   ├── client.py          # LLM client wrapper
│   ├── capabilities.py    # Model capabilities
│   └── models.py         # Model definitions
│
├── config/               # Configuration
│   └── strategies/        # Strategy defaults
│
├── scripts/               # CLI entrypoints
│   ├── run.py            # Backtest CLI
│   ├── live.py           # Live trading CLI
│   └── dashboard.py       # API server CLI
│
├── frontend/              # React SPA
│   ├── src/
│   │   ├── pages/         # 30 page components
│   │   ├── components/    # Reusable components
│   │   ├── api/          # API client
│   │   ├── store/        # Zustand stores
│   │   └── contexts/     # React contexts
│   └── package.json
│
└── tests/                 # Test suite
    ├── unit/
    ├── integration/
    └── conftest.py
```

## Core Data Flow

```
Market Data → Signal Engines → Signals → Agent Analysis
                                    ↓
                              Risk Engine ←→ Portfolio State
                                    ↓
                              Order Execution
                                    ↓
                              Trade Recording
                                    ↓
                              Analytics & Reporting
```

## Signal Pipeline

1. **Data Ingestion**: Bars, quotes, order book
2. **Preprocessing**: Indicator calculation, normalization
3. **Signal Generation**: Pattern recognition, regime detection
4. **Composite**: Multi-signal aggregation
5. **Scoring**: Confidence and strength assignment
6. **Output**: QuantSignal objects with metadata

## Agent Pipeline

1. **Signal Input**: Receive quant signals
2. ** Persona Analysis**: Each agent analyzes from their perspective
3. **Debate**: Bull vs Bear discussion
4. **Consensus**: Final recommendation generation
5. **Risk Review**: Risk team validation
6. **Portfolio Update**: Position adjustments

## Risk Pipeline

1. **Order Submission**: New order arrives
2. **Circuit Breaker Check**: Global risk state
3. **Position Limit Check**: Per-symbol, sector limits
4. **Stop Loss Check**: Existing protective stops
5. **Position Sizing Check**: Kelly/fractional limits
6. **Execution or Rejection**: Order either executes or is rejected

## API Design

- **REST**: Synchronous requests/responses
- **SSE**: Real-time dashboard updates
- **WebSocket**: Market data streaming
- **Authentication**: JWT + API Key support
- **Rate Limiting**: 100 requests/minute default

## State Management

- **Frontend**: Zustand stores for UI state
- **Backend**: In-memory state + SQLAlchemy persistence
- **Real-time**: SSE push to connected clients
