# Quick Start Guide

## Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- pip or poetry

## Installation

### 1. Clone the Repository

```bash
cd trading-engine
```

### 2. Install Python Dependencies

```bash
# Basic installation
pip install -e .

# With all features (recommended)
pip install -e ".[all]"

# Or with specific feature sets
pip install -e ".[dev,llm,live,ml]"  # Common setup
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Running Locally (Two Terminals)

**Terminal 1 - API Server:**
```bash
python scripts/dashboard.py
```
API will be available at `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will be available at `http://localhost:5173`

### Option 2: Docker

```bash
docker compose up
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `TRADING_ENGINE_API_KEY` | No | — | API key authentication |
| `JWT_SECRET_KEY` | No | auto-generated | JWT signing secret |
| `CORS_ORIGINS` | No | localhost:5173 | Allowed CORS origins |
| `FINNHUB_API_KEY` | No | — | Market data (quotes, news) |
| `OPENAI_API_KEY` | No | — | LLM agent features |
| `ALPACA_API_KEY` | No | — | Live/paper trading |
| `ALPACA_SECRET_KEY` | No | — | Live/paper trading |

## First Steps

### 1. Access the Dashboard

Open browser to `http://localhost:5173`

### 2. Run a Backtest

Navigate to **Backtest** page:
1. Select tickers (e.g., `AAPL,MSFT`)
2. Choose date range
3. Configure initial capital
4. Click "Run Backtest"

### 3. Generate Signals

Navigate to **Signals** page:
1. Select signal engines (SMC, Harmonics, etc.)
2. Choose timeframe
3. View generated signals

### 4. Analyze with Agents

Navigate to **HedgeFund** page:
1. Enter a ticker symbol
2. Select personas (Buffett, Burry, Taleb, etc.)
3. View AI-generated analysis

## CLI Commands

### Backtest
```bash
trading-engine-backtest --tickers AAPL,MSFT --start 2024-01-01
```

### Live Paper Trading
```bash
trading-engine-live --mode paper --tickers BTC/USD
```

### Dashboard API Server
```bash
trading-engine-dashboard --port 8000
```

## Testing

### Backend Tests
```bash
pytest --cov=.
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## Troubleshooting

### Import Errors
Make sure all dependencies are installed:
```bash
pip install -e ".[all]"
```

### Connection Refused (API)
Ensure the API server is running on port 8000:
```bash
python scripts/dashboard.py
```

### Frontend Build Errors
Clear node modules and reinstall:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read [Architecture Overview](ARCHITECTURE.md) for system design
- Explore [Signal Generation](SIGNALS.md) for trading signals
- Learn about [AI Agents](AGENTS.md) for automated analysis
- Review [Risk Management](RISK.md) for protection mechanisms
