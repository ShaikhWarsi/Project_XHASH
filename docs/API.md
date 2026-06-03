# API Reference

The Trading Engine exposes 60+ REST endpoints via FastAPI. This document provides a comprehensive reference, including all new AI feature endpoints added in v0.4.0.

## Base URL

```
http://localhost:8000/api
```

## Authentication

No authentication is required by default. Configure `TRADING_ENGINE_API_KEY` and `JWT_SECRET_KEY` for protected endpoints. AI endpoints (`/api/ai/*`, `/llm/*`) require `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variables.

## API Routes

### LLM (Language Model)

| Method | Endpoint | Description | Streaming |
|--------|----------|-------------|-----------|
| GET | `/llm/models` | List available models | No |
| POST | `/llm/complete` | Complete an LLM prompt (non-streaming) | No |
| POST | `/llm/complete-stream` | SSE streaming completion | **Yes** |

```bash
# List models
curl http://localhost:8000/llm/models

# Complete (non-streaming)
curl -X POST http://localhost:8000/llm/complete \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-mini", "prompt": "Summarize the market"}'

# Complete (streaming SSE)
curl -N -X POST http://localhost:8000/llm/complete-stream \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "prompt": "Explain double top pattern"}'
```

### LLM Query (Portfolio-Aware)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/llm/query` | Ask natural-language questions about portfolio, risk, trades |

```bash
# Ask about portfolio
curl -X POST http://localhost:8000/llm/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is my biggest position?"}'

# With conversation history
curl -X POST http://localhost:8000/llm/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How much exposure do I have to tech?",
    "message_history": [
      {"role": "user", "content": "Show my portfolio"}
    ]
  }'
```

### AI Briefing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/briefing` | LLM-generated market + portfolio briefing |

```bash
# Get briefing
curl http://localhost:8000/api/ai/briefing

# Response:
# {
#   "briefing": "PORTFOLIO OVERVIEW...",
#   "generated_at": "2026-06-03",
#   "data_summary": {
#     "portfolio": { "total_value": 1000000, ... },
#     "regime": { "trend": "bullish", ... },
#     "movers": [...],
#     "risk": { ... }
#   }
# }
```

### News Co-Movement

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/co-movement` | Analyze which tickers are co-moving on a news headline |

```bash
curl -X POST http://localhost:8000/api/ai/co-movement \
  -H "Content-Type: application/json" \
  -d '{
    "headline": "Apple reports record Q4 earnings",
    "tickers": ["AAPL", "MSFT", "GOOGL", "NVDA", "AMZN"],
    "price_changes": {
      "AAPL": 3.2, "MSFT": -0.5, "GOOGL": 0.8, "NVDA": 1.1, "AMZN": -0.3
    }
  }'
```

### Earnings Call Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/earnings-summary` | Extract bull/bear/risk from earnings transcript |

```bash
curl -X POST http://localhost:8000/api/ai/earnings-summary \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "transcript_text": "In Q4 2025, Apple reported revenue of $124.3 billion..."
  }'
```

### AI Strategy Generator

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-strategy` | Natural language → FinScript code |
| POST | `/api/ai/evaluate-strategy` | Run FinScript code as backtest |

```bash
# Generate strategy
curl -X POST http://localhost:8000/api/ai/generate-strategy \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Buy when RSI crosses below 30 and 50-day SMA is above 200-day SMA. Sell after 5 bars.",
    "symbol": "AAPL"
  }'

# Evaluate strategy (review → run)
curl -X POST http://localhost:8000/api/ai/evaluate-strategy \
  -H "Content-Type: application/json" \
  -d '{
    "code": "if crossover(rsi(close, 14), 30)\n  buy()\nend",
    "symbol": "AAPL",
    "start": "2024-01-01",
    "end": "2024-12-31"
  }'
```

### AI Indicator Generator

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-indicator` | Natural language → JavaScript indicator plugin code |

```bash
curl -X POST http://localhost:8000/api/ai/generate-indicator \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Green when price is above 50-day SMA AND RSI(14) is between 40 and 60"
  }'
```

### AI Chart Inspector

| Method | Endpoint | Description | Streaming |
|--------|----------|-------------|-----------|
| POST | `/api/ai/inspect-pattern` | Streaming LLM analysis of chart pattern | **Yes** (SSE) |

```bash
# Streams SSE tokens
curl -N -X POST http://localhost:8000/api/ai/inspect-pattern \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "pattern": {
      "type": "head_and_shoulders",
      "confidence": 0.85,
      "priceTarget": 180.50,
      "stopLoss": 210.00,
      "description": "Strong Head & Shoulders — target $180.50"
    },
    "price_data_summary": "AAPL ranging 190-210 over 3 months",
    "recent_signals": []
  }'
```

### Signals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/signals` | List all signals |
| GET | `/signals/{signal_id}` | Get signal by ID |
| POST | `/signals/generate` | Generate signals |
| GET | `/signals/engines` | List signal engines |
| POST | `/signals/composite` | Create composite signal |

### Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portfolio` | Get current portfolio |
| GET | `/portfolio/history` | Portfolio history |
| GET | `/portfolio/positions` | Current positions |
| PUT | `/portfolio/positions/{symbol}` | Update position |
| DELETE | `/portfolio/positions/{symbol}` | Close position |

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/market/bars` | Get OHLCV bars |
| GET | `/market/quote` | Get current quote |
| GET | `/market/search` | Search symbols |
| GET | `/market/fundamentals` | Get fundamentals |
| GET | `/market/news/{symbol}` | News by symbol |
| GET | `/market/news` | Market news by category |

### Backtest

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/backtest` | Run backtest |
| GET | `/backtest/{id}` | Get backtest results |
| GET | `/backtest/history` | List historical backtests |
| POST | `/backtest/{id}/monte-carlo` | Run Monte Carlo |
| POST | `/backtest/{id}/walk-forward` | Run walk-forward |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List orders |
| POST | `/orders` | Place order |
| GET | `/orders/{id}` | Get order by ID |
| DELETE | `/orders/{id}` | Cancel order |

### Positions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/positions` | List all positions |
| GET | `/positions/{symbol}` | Get position by symbol |

### Trades

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trades` | List trades |
| GET | `/trades/{id}` | Get trade by ID |
| GET | `/trades/history` | Trade history |

### Risk

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/risk/state` | Current risk state |
| GET | `/risk/limits` | Get risk limits |
| PUT | `/risk/limits` | Update risk limits |
| GET | `/risk/circuit-breaker` | Circuit breaker status |
| POST | `/risk/circuit-breaker/reset` | Reset circuit breaker |

### News / Calendar / Chat (Right Sidebar)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/news/for-tickers` | Get news for specific tickers |
| POST | `/api/calendar/today` | Today's macro events + earnings + dividends |
| WS | `/ws/chat` | WebSocket chat (in-memory broadcast) |
| GET | `/api/motd` | Message-of-the-day |
| POST | `/api/motd` | Set message-of-the-day (admin) |

### Agent (Hedge Fund Personas)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/hedge-fund` | Run hedge fund analysis |
| GET | `/agent/opinions/{ticker}` | Get agent opinions |
| GET | `/agent/personas` | List available personas |

### FinScript

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/finscript/templates` | List strategy templates |
| GET | `/finscript/templates/{name}` | Get template code |
| POST | `/finscript/evaluate` | Run FinScript code |

### Paper Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/paper/order` | Paper order |
| GET | `/paper/positions` | Paper positions |
| DELETE | `/paper/reset` | Reset paper trading |

### Global Market

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/global-market/overview` | Market overview |
| GET | `/global-market/indices` | Major indices |
| GET | `/global-market/news` | Market news |

### Stream (SSE)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stream/dashboard` | Dashboard updates |
| GET | `/stream/market` | Market data stream |
| GET | `/stream/trades` | Trade stream |

### WebSocket

| Method | Endpoint | Description |
|--------|----------|-------------|
| WS | `/ws` | WebSocket connection |
| WS | `/ws/news` | News broadcast |
| WS | `/ws/prices` | Price updates |
| WS | `/ws/chat` | Chat messages |

## Streaming Response Format (SSE)

The `/llm/complete-stream` and `/api/ai/inspect-pattern` endpoints use SSE:

```
data: {"token": "The"}
data: {"token": " pattern"}
data: {"token": " indicates"}
data: {"token": " bullish"}
data: {"token": " momentum"}
data: {"done": true}
```

## Request/Response Formats

### AI Features

**Briefing Response:**
```json
{
  "briefing": "PORTFOLIO OVERVIEW\nTotal value: $1,000,000...",
  "generated_at": "2026-06-03",
  "data_summary": {
    "portfolio": { "total_value": 1000000, "cash": 200000, "position_count": 5 },
    "regime": { "trend": "bullish", "spy_change_pct": 8.3 },
    "movers": [{"symbol": "NVDA", "change_pct": 3.2, "price": 950.50}],
    "risk": {}
  }
}
```

**Co-Movement Response:**
```json
{
  "co_movements": [
    {
      "ticker": "AAPL",
      "co_move_direction": "up",
      "confidence": 0.92,
      "reasoning": "Direct earnings beat drives positive sentiment"
    }
  ],
  "source": "llm"
}
```

**Earnings Summary Response:**
```json
{
  "symbol": "AAPL",
  "summary": "BULL:\n- Revenue grew 12% YoY to $124B...",
  "generated_at": "2026-06-03T10:30:00"
}
```

**Strategy Generation Response:**
```json
{
  "code": "if crossover(rsi(close, 14), 30)\n  buy()\nend",
  "explanation": "Strategy buys when RSI crosses above 30...",
  "symbol": "AAPL",
  "warnings": []
}
```

**Indicator Generation Response:**
```json
{
  "code": "indicator({ id: 'ai_abc123', name: 'Green Zone', ... })",
  "name": "Green Zone",
  "id": "ai_abc123",
  "warnings": []
}
```

### Success

```json
{
  "status": "success",
  "data": { ... },
  "timestamp": "2026-06-03T10:30:00Z"
}
```

### Error

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_SYMBOL",
    "message": "Symbol XYZ is not valid"
  },
  "timestamp": "2026-06-03T10:30:00Z"
}
```

## Rate Limiting

Default: 100 requests per minute. Configure via `SlowAPI` settings.

## Environment Variables for AI

| Variable | Required For | Purpose |
|----------|-------------|---------|
| `OPENAI_API_KEY` | All AI features | Primary LLM provider for all 7 AI endpoints |
| `ANTHROPIC_API_KEY` | Alternative | Fallback model provider |

Without these keys, AI endpoints return error 503 with a clear message.

## Interactive Docs

Access interactive API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
