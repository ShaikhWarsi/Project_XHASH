# Trading Engine Documentation

**Version 0.3.0** — AI-Augmented Quantitative Trading Platform

Welcome to the Trading Engine documentation. This is a comprehensive quantitative trading platform combining classical quant signals, LLM agent reasoning, and comprehensive risk management.

## 📚 Documentation Structure

### Getting Started
- [Quick Start Guide](QUICKSTART.md) - Installation and first steps
- [Architecture Overview](ARCHITECTURE.md) - System architecture and design

### Core Systems
- [Signal Generation](SIGNALS.md) - 23+ signal engines and pattern recognition
- [AI Agents](AGENTS.md) - Hedge fund personas and LLM-driven analysis
- [Risk Management](RISK.md) - Position limits, stop-loss, circuit breakers
- [Backtesting](BACKTESTING.md) - Multi-market backtesting engines
- [Analytics](ANALYTICS.md) - Performance metrics and portfolio optimization
- [FinScript DSL](FINSCRIPT.md) - Custom trading strategy language

### Reference
- [API Reference](API.md) - 40+ REST endpoints
- [Frontend Guide](FRONTEND.md) - 30-page React SPA overview

## 🔑 Key Features

| Category | Capabilities |
|----------|-------------|
| **Signals** | SMC, Harmonics, Head & Shoulders, Flags/Pennants, Price Action, ML Pattern Mining, Regime Detection |
| **Agents** | 16 Hedge Fund Personas (Buffett, Burry, Taleb, etc.), 8 LLM Agents, Renaissance-Style Teams |
| **Risk** | Position Limits, ATR Stop-Loss, Kelly Sizing, Circuit Breakers, Composite Risk Engine |
| **Backtesting** | Event-Driven Engine, Monte Carlo (1000+), Walk-Forward, Scenario Stress Tests |
| **Analytics** | 22+ Metrics (Sharpe, Sortino, Calmar, VaR, CVaR), Attribution, CFA Toolkit |
| **Execution** | Backtest, Paper Trading, Alpaca, CCXT (100+ exchanges), Interactive Brokers |

## 🚀 Quick Links

```bash
# Install
pip install -e ".[dev,llm,live,ml]"

# Run API
python scripts/dashboard.py

# Run Frontend
cd frontend && npm run dev
```

## 📊 Project Statistics

- **Signal Engines**: 23+
- **Alpha Factors**: 158+
- **Hedge Fund Personas**: 16
- **LLM Agents**: 8+
- **Performance Metrics**: 22+
- **API Endpoints**: 40+
- **Frontend Pages**: 30

## 🔗 Resources

- [Original README](../README.md) - Project README with setup instructions
- [API Documentation](http://localhost:8000/docs) - Interactive API docs (when running)
- [Frontend](http://localhost:5173) - Web interface (when running)

## License

Proprietary — all rights reserved.
