# Troubleshooting Guide

Common issues and how to fix them.

---

## Startup Issues

### API Server Won't Start

**Symptom:** Running `python scripts/dashboard.py` gives errors.

**Fixes:**

1. **Python version too old:**
   ```bash
   python --version  # Should be 3.11+
   ```

2. **Missing dependencies:**
   ```bash
   pip install -e ".[all]"
   ```

3. **Port 8000 already in use:**
   ```bash
   # On Windows:
   netstat -ano | findstr :8000
   # Kill the process or use a different port:
   python scripts/dashboard.py --port 8001
   ```

4. **Database corruption:**
   ```bash
   rm trading_engine.db  # Delete database file
   python scripts/dashboard.py  # Recreates on startup
   ```

### Frontend Won't Load

**Symptom:** Browser shows blank page or build errors.

**Fixes:**

1. **Node.js too old:**
   ```bash
   node --version  # Should be 18+
   ```

2. **Clear node_modules:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

3. **Port 5173 in use:**
   The dev server will auto-use a different port. Check the terminal output.

---

## Connection Issues

### "DOWN" in Status Bar

**Symptom:** The status bar shows "DOWN" with a red dot.

**Causes & Fixes:**

1. **API server not running** (most common):
   ```bash
   python scripts/dashboard.py
   ```
   Keep this terminal open. Refresh your browser.

2. **Wrong API base URL:**
   Check your `.env` file has the right `VITE_API_BASE`. Default is `/api`.

3. **CORS error:**
   Make sure `CORS_ORIGINS` in `.env` includes your frontend URL:
   ```
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

### WebSocket Keeps Disconnecting

**Symptom:** Real-time data (prices, signals) stops updating.

**Fixes:**
1. Check internet connection
2. Check firewall rules — WebSocket uses port 8000 by default
3. Restart the API server
4. The system will auto-reconnect (up to 10 attempts with exponential backoff)

### "Connection refused" Errors

**Symptom:** Console shows `ERR_CONNECTION_REFUSED`.

**Fix:** The API server is not running.
```bash
python scripts/dashboard.py
```

---

## Data Issues

### No Chart Data / Empty Charts

**Symptom:** Charts show no price data.

**Possible causes:**

1. **API server not running**
2. **Invalid symbol** — Try `AAPL` or `SPY` (known working symbols)
3. **No internet** — yfinance requires internet access
4. **Rate limited by yfinance** — Wait 1 minute and try again
5. **Symbol delisted** — Try a different symbol

### "No data available" on Signals Page

**Symptom:** Signals page shows "Waiting for signals..."

**Cause:** Signal engines run in background tasks and take time to compute.

**Fixes:**
1. Wait 1-2 minutes after starting the server
2. Check that background tasks are running:
   ```bash
   curl http://localhost:8000/health
   ```
   Look for `background_tasks_running: > 0`
3. If signals never appear, restart the API server

### Portfolio Shows Nothing

**Symptom:** Dashboard/Portfolio shows empty.

**Fix:** You need to have trades or a paper trading account active:
1. Go to **Paper Trading** → Start Simulation
2. Place a paper order
3. Return to Portfolio

### NaN Values Everywhere

**Symptom:** Numbers show as "NaN" or "undefined".

**Causes:**
1. LivePrices WebSocket not sending full data — only `{ price }` is sent
2. Missing data from provider
3. Division by zero

**Fixes:**
1. Restart the API server
2. Check the Status Bar — ensure it shows "LIVE" not "DOWN"
3. Wait for data to populate (can take 30-60 seconds)

---

## AI Feature Issues

### "LM Studio Not Running"

**Symptom:** AI agents give errors about LM Studio.

**Fix:**
1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Install and open LM Studio
3. Download a model (e.g., Llama 3, Mistral)
4. Start the local inference server (typically on port 1234)
5. Verify it's running: `curl http://localhost:1234/v1/models`
6. Check `LMSTUDIO_BASE_URL` in `.env` (default: `http://localhost:1234/v1`)

### "API Key Not Configured"

**Symptom:** LLM features show key errors.

**Fix:**
1. Go to Settings page
2. Add your API key (OpenAI, Anthropic, or Groq)
3. Or add it to `.env` file and restart the server

### AI Response Is Slow

**Symptom:** AI takes a long time to respond.

**Possible causes:**
1. Large model loaded in LM Studio — try a smaller model
2. Rate limited by API provider
3. Complex analysis with many agents

**Fixes:**
1. Use a smaller/faster model
2. Reduce the number of agents in analysis
3. Wait — some analyses take 30-60 seconds

---

## Backtest Issues

### Backtest Returns No Trades

**Symptom:** Backtest completes but shows 0 trades.

**Possible causes:**

1. **Date range too short** — Try at least 1 year of data
2. **Wrong ticker** — Verify the symbol exists
3. **Strategy conditions too strict** — Try a simpler strategy
4. **No price data for selected dates** — Check yfinance coverage
5. **Capital too low** — Increase initial capital (try $100,000)

**Fix:**
```
Ticker: AAPL
Start: 2023-01-01
End: 2024-01-01
Capital: $100,000
Strategy: SMA Crossover
```
This should work. If not, check the API server is running.

### Backtest Results Seem Wrong

**Symptom:** Returns are too high or impossible.

**Possible causes:**
1. **Look-ahead bias** — Strategy uses future data (unlikely with our engine)
2. **Overfitting** — Strategy optimized too specifically
3. **Survivorship bias** — Using current index members

**Verification:**
1. Run the backtest with the same settings twice — results should match
2. Test with a different date range
3. Use Walk-Forward Analysis to validate robustness

---

## Settings & Configuration

### Changes to .env Not Taking Effect

**Fix:** Restart the API server after changing `.env` file.
```bash
# Stop the server (Ctrl+C), then:
python scripts/dashboard.py
```

### Theme Changes Not Sticking

**Fix:** Themes are stored in your browser. If they don't persist:
1. Check that localStorage is enabled in your browser
2. Try clearing site data and reapplying the theme

### API Key Not Working

**Fixes:**
1. Verify the key is correct (copy-paste, no extra spaces)
2. Check the key is active on the provider's website
3. Restart the API server after adding the key
4. For OpenAI: check you have credits/ quota

---

## Error Messages Explained

| Error | Meaning | Fix |
|-------|---------|-----|
| `500 Internal Server Error` | Server crashed | Check terminal output, restart server |
| `503 Service Unavailable` | Server starting or shutting down | Wait and refresh |
| `429 Too Many Requests` | Rate limit hit | Wait 30 seconds |
| `401 Unauthorized` | Invalid API key | Check API key in Settings |
| `403 Forbidden` | No permission | Check API key permissions |
| `404 Not Found` | Page/resource missing | Check URL, feature may not exist |
| `NetworkError` | Can't reach server | Start the API server |
| `ERR_CONNECTION_REFUSED` | Server not running | Start `python scripts/dashboard.py` |
| `ERR_NETWORK` | Internet issue or server down | Check connection + server |
| `ECONNABORTED` | Request timed out | Server overloaded, try again |
| `[object Object]` | Component crashed | Refresh page, check console |

---

## Diagnostic Commands

Run these in a terminal to diagnose issues:

```bash
# Quick health check
curl http://localhost:8000/health

# Detailed health (recommended)
curl http://localhost:8000/health/detailed

# Check LLM providers
curl http://localhost:8000/health/llm

# Check data providers
curl http://localhost:8000/health/data

# Check LM Studio
curl http://localhost:8000/health/llm | findstr lm_studio

# Test data fetch
curl http://localhost:8000/bars/AAPL

# View API metrics
curl http://localhost:8000/request-metrics
```

---

## Getting More Help

1. **Read the User Guide** — `docs/USER_GUIDE.md`
2. **Check the BUGS.md** — Known issues and workarounds
3. **Run the debug page** — Open `/debug` in the browser
4. **Check server logs** — Look at the terminal running the API
5. **Browser console** — Press F12 → Console tab for errors
