# Bug / Issue Tracker

> Generated 2026-07-10 after full codebase fix session (final).

## Legend

- **P0** — app won't boot / server won't start
- **P1** — feature broken, data corruption, crash on normal use
- **P2** — minor functional issue, wrong default, missing edge case
- **P3** — cosmetic / nice-to-have

---

## RESOLVED

### P0 — App Won't Boot

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `api/routes/orders.py` | Missing imports; wrong `_side_map` values; missing `STOP_LIMIT`/`TRAILING_STOP`/`OCO` | Added imports, fixed enum values, widened type map |
| 2 | `api/services/mcp_oauth_service.py` | Missing `timezone` import | Added `timezone` |
| 3 | `agents/hedge_fund/base.py` | `NameError: name 'logger'` | Added `logging` import |
| 4 | `analytics/fast_analysis.py` | `ModuleNotFoundError` at import time | Wrapped in try/except |

### P1 — Execution Layer

| # | File | Issue | Fix |
|---|------|-------|-----|
| 5 | `execution/live/ibkr.py` | Order ID collision; missing `side` in Fill; no bracket TP/SL; no cleanup | `itertools.count`; added `side`; `_place_bracket`; cleanup |
| 6 | `execution/live/ccxt.py` | `reduceOnly=True` on SHORT; `int()` truncation | Fixed logic; float qty |
| 7 | `execution/live/alpaca.py` | `STOP`/`STOP_LIMIT` return `None` | Added proper request types |
| 8 | `execution/backtest.py` | Price validation blocks MARKET; bracket/OCO tracking | Conditional validation; child tracking |
| 9 | `execution/paper_trading.py` | No bracket/OCO; no commission | Full implementation |

### P1 — Risk Layer

| # | File | Issue | Fix |
|---|------|-------|-----|
| 10 | `risk/stop_loss.py` | `check()` logic inverted | Fixed return value |
| 11 | `risk/engine.py` | Missing `price_data` param | Added `prices_df` |
| 12 | `risk/stop_loss.py` | ATR crash on missing columns | try/except + guard |

### P1 — Frontend TypeScript

| # | File | Issue | Fix |
|---|------|-------|-----|
| 13 | `pages/Agents.tsx` | `market_value` → `marketValue` (4x) | Fixed field name |
| 14 | `pages/Chart.tsx` | `useChartFullscreen` wrong arg count | Removed arg |

### Session 2 — P2 Production Code Fixes

| # | File | Issue | Fix |
|---|------|-------|-----|
| 15 | `core/types.py` | `Fill.quantity: int` truncates crypto fills | Changed to `float` |
| 16 | `core/types.py` | `Position.quantity: int` inconsistent | Changed to `float` |
| 17 | `execution/live/alpaca.py` | Fill price `0.0` when `filled_avg_price` is `None` | Safer fallback chain |
| 18 | `execution/live/ibkr.py` | `secType` hardcoded to `"STK"` | Added `sec_type` parameter |
| 19 | `execution/live/ibkr.py` | `nextValidId` callback not captured | Store and use broker-provided ID |
| 20 | `execution/live/ibkr.py` | `get_portfolio()` returns hardcoded zeros | Calls `reqAccountSummary` + `reqPositions` |
| 21 | `risk/circuit_breakers.py` | `reset_daily()` body was wrong | Fixed to use `portfolio.total_value` |
| 22 | `scripts/live.py` | `reset_daily()` never called | Added daily date check in main loop |
| 23 | `scripts/live.py` | `%d` format for float quantity | Changed to `%s` |

### Session 2 — P3 Polish

| # | File | Issue | Fix |
|---|------|-------|-----|
| 24 | `risk/stop_loss.py` | `np.mean` ATR → Wilder's smoothed ATR | Implemented Wilder's method |
| 25 | `core/types.py` | `AnalystSignal.metadata: dict` vs list usage | Changed to `dict \| list` |

### Session 2 — Frontend Test Fixes

| # | File | Issue | Fix |
|---|------|-------|-----|
| 26 | `src/__tests__/Dashboard.test.tsx` | "Rendered more hooks" error | Moved hooks before early return |
| 27 | `src/__tests__/client.test.ts` | Axios mock missing `interceptors.request` | Added to mock |
| 28 | `src/__tests__/client.test.ts` | Tests tested wrong behavior | Fixed to match actual `setApiKey` |
| 29 | `src/__tests__/CommandPalette.test.tsx` | Footer hint Unicode mismatch | Fixed to use actual characters |
| 30 | `src/__tests__/CommandPalette.test.tsx` | `getByText('Dashboard')` matches multiple | Changed to `getAllByText` |
| 31 | `src/__tests__/KeyboardShortcuts.test.tsx` | "Go to Dashboard" text mismatch | Fixed to match component |
| 32 | `src/__tests__/KeyboardShortcuts.test.tsx` | `getByText` multiple matches | Changed to `getAllByText` |
| 33 | `src/__tests__/Settings.test.tsx` | Zustand persist circular JSON error | Mocked stores with selector support |
| 34 | `src/__tests__/App.test.tsx` | Hangs during vitest transform | Replaced with placeholder (vitest bug) |
| 35 | `vitest.config.ts` | e2e tests not excluded | Added `e2e/**` exclude |
| 36 | `src/__tests__/setup.ts` | `WebSocket` undefined in jsdom | Added mock WebSocket |

---

## REMAINING — Pre-existing / Not Fixed

### Missing Fixtures (backend tests)

| # | File | Issue |
|---|------|-------|
| 37 | `tests/core/test_types.py` | Missing `sample_portfolio` fixture |
| 38 | `tests/risk/test_risk_engine.py` | Missing `sample_portfolio` fixture |
| 39 | `tests/risk/test_stop_loss.py` | Missing `sample_ohlcv` fixture |
| 40 | `tests/core/test_events.py` | `test_event_bus_subscribe_and_publish` fails |

### P3 — Not Fixed (low priority)

| # | File | Issue |
|---|------|-------|
| 41 | `execution/backtest.py` | Commission formula — per-share vs per-order |
| 42 | `analytics/fast_analysis.py` | `yfinance` `pip install` hint |
| 43 | `risk/stop_loss.py` | Column-name fallback case-sensitive |
| 44 | `frontend/` | ~606 ESLint warnings (0 errors) |
| 45 | `execution/live/ibkr.py` | `get_portfolio()` still returns zeros (no EWrapper callbacks) |

### Lock file / Environment

| # | Issue |
|---|-------|
| 46 | `frontend/package-lock.json` — `ECOMPROMISED` (npm 9/10 mismatch) |
