# Changelog

## 0.4.0 (2026-06-03)

### AI Features (7 endpoints + 7 components)
- AI Briefing — portfolio + market LLM analysis
- Ask the Terminal — context-aware LLM queries
- AI Strategy Generator — natural language → FinScript
- AI Indicator Generator — natural language → JS indicator
- AI Chart Inspector — streaming LLM pattern analysis
- News Co-Movement — headline-driven correlation
- Earnings Call Summary — bull/bear/risk extraction

### UI/UX
- Multi-Window sync via BroadcastChannel
- Drag symbol/price/date across the app
- Distraction-Free Mode (Ctrl+Shift+D)
- High-Contrast / Sunlight themes
- Collapsible right sidebar (news/calendar/chat)

### Streaming
- `/llm/complete-stream` SSE endpoint
- Frontend ReadableStream reader

## 0.3.0 (2026-05-15)

### Core
- 23+ signal engines (SMC, harmonics, H&S, flags/pennants, price action, regime, ML)
- 16 hedge fund agent personas + 8 quant + 8 LLM
- Event-driven backtesting engine
- Monte Carlo, walk-forward, scenario stress tests
- FinScript DSL (lexer, parser, interpreter, 40+ builtins)

### Risk
- Position limits, ATR stop-loss, Kelly sizing, circuit breakers

### Execution
- Backtest, paper trading, Alpaca, CCXT, Interactive Brokers

### API
- 60+ REST endpoints, SSE streaming, WebSocket
- JWT + API key authentication
- /health, /metrics, trading endpoints

### Frontend
- 30-page React/TypeScript SPA
- TradingView charts, React Flow, Zustand
- 7 themes, responsive layout
