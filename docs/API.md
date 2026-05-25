# API Reference

The Trading Engine exposes 40+ REST endpoints via FastAPI. This document provides a comprehensive reference.

## Base URL

```
http://localhost:8000/api
```

## Authentication

No authentication is required by default. Configure `TRADING_ENGINE_API_KEY` and `JWT_SECRET_KEY` for protected endpoints.

## API Routes

### Signals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/signals` | List all signals |
| GET | `/signals/{signal_id}` | Get signal by ID |
| POST | `/signals/generate` | Generate signals |
| GET | `/signals/engines` | List signal engines |
| POST | `/signals/composite` | Create composite signal |

```bash
# Generate signals
curl -X POST http://localhost:8000/api/signals/generate \
  -H "Content-Type: application/json" \
  -d '{"ticker": "AAPL", "engines": ["smc", "harmonics"]}'
```

### Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portfolio` | Get current portfolio |
| GET | `/portfolio/history` | Portfolio history |
| GET | `/portfolio/positions` | Current positions |
| PUT | `/portfolio/positions/{symbol}` | Update position |
| DELETE | `/portfolio/positions/{symbol}` | Close position |

```bash
# Get portfolio
curl http://localhost:8000/api/portfolio

# Get position for symbol
curl http://localhost:8000/api/portfolio/positions/AAPL
```

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/market/bars` | Get OHLCV bars |
| GET | `/market/quote` | Get current quote |
| GET | `/market/search` | Search symbols |
| GET | `/market/fundamentals` | Get fundamentals |

```bash
# Get bars
curl "http://localhost:8000/api/market/bars?ticker=AAPL&timeframe=1d&start=2024-01-01&end=2024-12-31"

# Get quote
curl "http://localhost:8000/api/market/quote?ticker=AAPL"
```

### Backtest

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/backtest` | Run backtest |
| GET | `/backtest/{id}` | Get backtest results |
| GET | `/backtest/history` | List historical backtests |
| POST | `/backtest/{id}/monte-carlo` | Run Monte Carlo |
| POST | `/backtest/{id}/walk-forward` | Run walk-forward |

```bash
# Run backtest
curl -X POST http://localhost:8000/api/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["AAPL", "MSFT"],
    "start": "2020-01-01",
    "end": "2024-01-01",
    "initial_capital": 1000000
  }'
```

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List orders |
| POST | `/orders` | Place order |
| GET | `/orders/{id}` | Get order by ID |
| DELETE | `/orders/{id}` | Cancel order |

```bash
# Place order
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "side": "buy",
    "type": "market",
    "quantity": 100
  }'
```

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

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/metrics/performance` | Performance metrics |
| GET | `/metrics/risk` | Risk metrics |

### Agent (Hedge Fund Personas)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/hedge-fund` | Run hedge fund analysis |
| GET | `/agent/opinions/{ticker}` | Get agent opinions |
| GET | `/agent/personas` | List available personas |

```bash
# Run hedge fund analysis
curl -X POST http://localhost:8000/api/agent/hedge-fund \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "personas": ["buffett", "burry", "taleb"]
  }'
```

### Portfolio Optimization

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/portfolio_optimization` | Run optimizer |
| GET | `/portfolio_optimization/methods` | List methods |

```bash
# Optimize portfolio
curl -X POST http://localhost:8000/api/portfolio_optimization \
  -H "Content-Type: application/json" \
  -d '{
    "method": "risk_parity",
    "tickers": ["AAPL", "MSFT", "GOOGL"]
  }'
```

### CFA Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cfa/valuation/{ticker}` | Valuation metrics |
| GET | `/cfa/ratios/{ticker}` | Financial ratios |
| GET | `/cfa/fixed_income` | Fixed income analytics |

### FinScript

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/finscript/compile` | Compile strategy |
| POST | `/finscript/backtest` | Backtest strategy |
| POST | `/finscript/export` | Export strategy |

### Alpha Zoo

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alpha_zoo` | List alpha factors |
| GET | `/alpha_zoo/{factor_id}` | Get factor data |
| POST | `/alpha_zoo/backtest` | Backtest factors |

### Structure

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/structure/{ticker}` | Market structure |
| GET | `/structure/regime/{ticker}` | Current regime |

### Hypothesis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hypothesis` | List hypotheses |
| POST | `/hypothesis` | Create hypothesis |
| POST | `/hypothesis/{id}/test` | Test hypothesis |

### Geopolitical Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/geo_analysis` | Get geo analysis |
| POST | `/geo_analysis/impact` | Analyze impact |

### Swarm (Agent Swarms)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/swarm/run` | Run agent swarm |
| GET | `/swarm/{id}/status` | Get swarm status |

### Experiment

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/experiment/run` | Run experiment |
| GET | `/experiment/{id}` | Get results |

### RL Training

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rl_training/start` | Start training |
| GET | `/rl_training/{id}/status` | Training status |
| GET | `/rl_training/{id}/model` | Get trained model |

### Factor Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/factor_analysis/run` | Run factor analysis |
| GET | `/factor_analysis/{id}` | Get results |

### Chart

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chart/data` | Chart data |
| GET | `/chart/indicators` | Indicator data |

### China Markets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/china_markets/quotes` | China quotes |
| GET | `/china_markets/ohlcv` | China OHLCV |

### Global Market

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/global_market/overview` | Market overview |
| GET | `/global_market/indices` | Major indices |

### Paper Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/paper/order` | Paper order |
| GET | `/paper/positions` | Paper positions |
| DELETE | `/paper/reset` | Reset paper trading |

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

## Response Format

### Success

```json
{
  "status": "success",
  "data": { ... },
  "timestamp": "2024-01-15T10:30:00Z"
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
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Rate Limiting

Default: 100 requests per minute. Configure via `SlowAPI` settings.

## Interactive Docs

Access interactive API documentation at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
