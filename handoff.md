# Handoff — Session 2026-06-02

## What Was Fixed

### Backend Won't Start

**Root cause**: The `data` package (and others) weren't installed as importable packages. `uvicorn` runs under **Python 3.11** (`C:\Users\rachi\AppData\Local\Programs\Python\Python311\`), but the default `python` on PATH is **Python 3.13**. Running `pip install -e .` installs to Python 3.13 by default, so `import data` failed under Python 3.11.

**Fix**:
- `run.bat` now uses the explicit Python 3.11 path:
  ```
  "C:\Users\rachi\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn ...
  ```
- Ran `pip install -e D:\Project_XHASH-main` using Python 3.11's pip to register all local packages (`data*`, `core*`, `signals*`, etc.)

### Vite Proxy Port Mismatch

`vite.config.ts` proxied `/api` and `/ws` to `localhost:8001`, but `run.bat` starts the backend on **port 8000**.

**Fix**: Changed both proxy targets from `8001` to `8000`.

### Chart.tsx 500 Error (Lazy Import Failure)

Two imported modules didn't exist:
- `../components/chart/data/TickEngine`
- `../components/chart/data/StreamingIndicatorCalculator`

These are only used as `useRef<TickEngine | null>(null)` — never instantiated or called.

**Fix**: Created stub files at `frontend/src/components/chart/data/TickEngine.ts` and `StreamingIndicatorCalculator.ts` that export empty classes.

### run.bat Windows Closing Immediately

`cmd /c` closes the window when the command finishes (or errors). Changed to `cmd /k` to keep windows open.

### First Backend Launch Is Slow (~20-30s)

Alembic migration fails (`No 'script_location' key found`), falls back to `Base.metadata.create_all`. The database file and tables are created on first run. Subsequent launches are fast.

---

## Current State

### Frontend (port 5173)
- **Vite dev server** starts and serves the app ✓
- **Sidebar** renders with NavLinks ✓
- **Chart page** loads without 500 errors (stubs work) ✓
- **Dashboard** loads but API calls may still be slow on first backend launch

### Backend (port 8000)
- **Starts correctly** using Python 3.11 ✓
- **Health endpoint**: `/health` returns ok ✓
- **Portfolio endpoint**: `/portfolio` returns demo data ✓
- **Bars endpoint**: `/bars/AAPL` returns yfinance OHLCV data ✓
- **Trades endpoint**: TODO — need to check if it's implemented

---

## What Still Doesn't Work

### Charts Not Rendering (Main Issue)

The Chart page loads without JS errors (the stubs fixed the 500), but **candlestick chart data may not be visible**. Possible causes to investigate in the next session:

1. **yfinance data fetch timing**: The backend fetches from yfinance on every `/bars/{symbol}` call — if yfinance is slow or blocked, the response takes >5s.
2. **MultiChartGrid rendering**: Check if `MultiChartGrid` component at `frontend/src/components/chart/MultiChartGrid.tsx` properly passes data to the chart engine.
3. **Chart engine initialization**: The `handleEngineReady` callback sets `chartRef.current = engine`. The data fetch happens in parallel. If the engine isn't ready when data arrives, `setChartData` silently skips (`if (!chartRef.current) return`).
4. **Data format mismatch**: `fetchOHLCV` returns `BarData[]`. `setChartData` maps it for lightweight-charts. Verify the `time` field format matches what lightweight-charts expects (Unix timestamp in seconds as integer, or UTCTimestamp).

### Dashboard Timeouts (30s)

`fetchPortfolioHistory()` and `fetchTrades()` time out at 30s. Backend responds to `/portfolio` and `/health` but maybe `/portfolio/history` and `/trades` endpoints aren't registered. Check:
- `api/routes/portfolio.py` — has `@router.get("")` and `@router.get("/history")` — should work
- `api/routes/trades.py` — check the route

### Missing Dependency

The copy in this session installed the editable package to Python 3.11, but **this needs to be done once**. If the repo is cloned fresh, `pip install -e .` must be run with Python 3.11 specifically.

---

## Run Commands

Run `run.bat` from the project root. It opens two windows:
1. **Backend API** — `http://localhost:8000`
2. **Frontend** — `http://localhost:5173`

Wait ~20-30s on first launch for the backend to initialize (creates SQLite database + tables).

---

## Debugging Tips for Next Session

1. Open **F12 console** to see `[Chart]` logs (I added `console.log` calls then removed them — re-add if needed)
2. Test backend directly: `curl http://localhost:8000/health`
3. Test chart data: `curl "http://localhost:8000/bars/AAPL?interval=1d&range=1mo"`
4. Check if yfinance is accessible from the machine (firewall/proxy)
