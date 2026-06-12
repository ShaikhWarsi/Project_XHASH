## ✅ FIXED IN v0.5.0 — User Readiness Update

The following issues have been addressed with enhanced error handling, user-friendly messages, and comprehensive documentation:

- **Global**: Enhanced API error handling with user-friendly messages and suggestions
- **Global**: Added ConnectionStatus component showing detailed system health
- **Global**: Added StartupDiagnostic modal for first-run issues detection
- **Global**: Added OnboardingModal for new user guidance
- **Global**: Created USER_GUIDE.md, TROUBLESHOOTING.md, FEATURES.md, SHORTCUTS.md
- **Bug #9**: Audit log page shows "No audit logs yet" message
- **Bug #17**: Trades page shows EmptyState with suggestion to try paper trading
- **Bug #21**: NaN values handled with safer null checks in HeatmapCell and elsewhere
- **Bug #25**: Signals stream shows "Waiting for signals..." instead of blank screen

---

## 🔴 CRITICAL BUGS (will break things at runtime)
### 1. Missing logger import in api/routes/orders.py
logger is used on line 83 but never imported/defined. The _load_orders() function will throw NameError if the orders file exists. Fix: add import logging and logger = logging.getLogger(__name__) at the top.

orders.py:L83

### 2. Route mismatch: /chart vs /markets/chart
Three files navigate to /chart?symbol=... but the actual route is /markets/chart . Clicking the link in Signals, Watchlist, or StockSearch lands on a 404. Files affected:

- Signals.tsx:L144
- WatchlistPage.tsx:L88
- StockSearch.tsx:L72
### 3. Two conflicting event bus implementations
- utils/eventBus.ts (module-level singleton, used by stores)
- contexts/EventBusContext.tsx (React context-based, used in components)
Events emitted from usePortfolioStore / useSignalStore go to the module-level bus; React components subscribe via the context . They never talk to each other. Real-time cross-page updates silently fail.

### 4. SignalsStream filter param name mismatch
Frontend sends ?symbol= and ?engine= , but the backend expects ?symbols= and ?engines= (plural). Filtering in SignalsStream.tsx is completely non-functional. SignalsStream.tsx:L35-37 vs signals_stream.py:L72-77

### 5. LivePricesContext contract mismatch (silent NaN/undefined)
/ws/prices backend only emits { price: <number> } per symbol. The frontend PriceData interface expects change , changePercent , volume , marketCap . Result: every page reading getQuote() or using getPrice() for anything beyond .price gets undefined , leading to NaN in math (e.g. position unrealized PnL %, exposure %, ticker sparklines) — corrupting OrderBook, Portfolio, HeatMap, and Ticker. ws.py:L90-95 vs LivePricesContext.tsx:L6-13

### 6. AppState sync property getters create new event loops
portfolio , signals , metrics sync @property getters call asyncio.new_event_loop() + loop.run_until_complete() . Called from an async context (e.g. from FastAPI handler or async_snapshot ) this either deadlocks the worker or raises RuntimeError: ... got Future <...> attached to a different loop . Sync access is used by code that looks innocent. state.py:L130-200

### 7. Database _init_done never set to True
init_db() in lifespan doesn't set _init_done = True , so on the very first request the lazy get_session() re-creates the engine — wasting startup work and possibly causing InvalidRequestError if the second engine collides with the first. database.py:L18-57

### 8. Status bar health check is /api/health in code but backend has no /api prefix
In dev the Vite proxy rewrites /api/health → /health . In production , this 404s and shows "DOWN" forever because the frontend ships the hard-coded /api/... path. Same problem for /api/stream/live , /ws/prices , etc. StatusBar.tsx:L77-83

### 9. Audit log is a stub
/api/audit/logs always returns {logs: []} . AuditLogPage renders an empty list with no empty-state message or warning that the feature is unimplemented. audit_routes.py:L13

### 10. Order book uses mock-random data even when WebSocket connected is "true"
ws_orderbook generates random bids/asks every tick (no real L2 depth). OrderBook.tsx displays this as if it were real market data, including a "depth heatmap" based on garbage. Crypto/stock traders will be misled. ws.py:L151-185

## 🟠 HIGH-PRIORITY ISSUES (degrade UX / cause incorrect data)
### 11. Duplicate route registration: /signals and /signals/
@router.get("/") + @router.get("/latest") — works only because FastAPI's redirect_slashes=True defaults. With redirect_slashes=False (often the case behind a reverse proxy), it 307-redirects and breaks the SSE EventSource. signals.py:L42, L80

### 12. /stream/live calls yf.download for entire portfolio every 60 s
Heavy synchronous call inside an async generator that holds the SSE connection — backpressure / event loop starvation when many clients connect. The 60-second window also means portfolio values are nearly always stale. stream.py:L13-39

### 13. Hard-coded CORS origins
CORS_ORIGINS env var exists but defaults to http://localhost:5173,http://localhost:3000 . Any other deploy URL gets CORS errors. app.py:L201-208

### 14. No authentication on any endpoint
logger.info("No authentication — all routes open") is in production code. Orders, broker credentials, audit logs — all publicly mutable. app.py:L210

### 15. Chart drawing events use absolute client coords without container offset on overlay
The overlay pointerEvents: 'none' is set on the canvas, so drawing tools (trend lines, fibs) cannot receive mouse events . Drawing tools are effectively broken in the overlay layer. ChartEngine.ts:L100-105

### 16. AdvancedCharts.tsx uses generateDemoData() — never fetches real data
The "Advanced Charts" page shows 150 bars of pure Math.random() synthetic data labeled as SPY/AAPL/etc. Volume bars are also random. AdvancedCharts.tsx:L31-42

### 17. fetchTrades() returns nothing on a fresh install
The portfolio is in-memory + DB; on first run, no trades have been persisted. The Trades page silently shows an empty list with no "No trades yet — place a paper order" message. Trades.tsx:L60-66

### 18. Trade markers time format mismatch
fetchTrades() returns ISO timestamps; the Equity Curve truncates to YYYY-MM-DD then compares with BarData.time (unix seconds). Time-markers are misplaced on every chart. Dashboard.tsx:L142-148

### 20. OrderEntryPanel and LiveTradingWizard have no submit wiring
The wizard lists brokers + form fields but does not call any backend endpoint to save credentials or test connection . Brokers.tsx page is purely cosmetic. LiveTradingWizard.tsx:L50-90

### 21. RiskDashboard expects portfolioHeatmap & maxDrawdown/beta but the backend field names match — yet HeatmapCell requires return which is never populated
sector_map.get_sector_exposures() returns {sector, exposure} only — no return field. HeatmapCell calls ret.toFixed(2) → undefined.toFixed → renders "NaN%". RiskDashboard.tsx:L17-30 vs sector_map.py

### 22. PersonaCouncil and Agents use a hand-rolled SSE parser that drops multi-line events
The frontend reads chunk.split('\n') and processes one line at a time. Real SSE servers batch multiple data: ... lines per event; this parser drops everything after the first line per event and mis-parses JSON. Agents.tsx:L72-95

### 23. PersonaCouncil sends agentKey (camelCase), backend expects agent_key (snake_case)
The AppNode data type is { agentKey: '...' } — backend schema is agent_key . The hedge-fund run silently fails to detect any agent and falls back to a single Buffett agent. The "council" never runs the council. PersonaCouncil.tsx:L82-90 vs hedge_fund.py:L77

### 24. connectDashboardSSE re-assigns to esRef.current but esRef is a const
Works because esRef.current is mutable, but a stale es.close() from a previous handler may fire after the new EventSource is set, killing the new connection. Race condition during reconnect storms. client.ts:L155-200

### 25. fetchSignals() returns {signals, composite_scores, regime} for /signals/latest but the actual handler uses app_state.async_get_signals() with no fallback to live computation
Until a signal engine has populated app_state._signals , the Signals page is empty (with no helpful empty-state). Most installs start in this state and the user has no way to trigger a refresh beyond clicking "run" in CLI. Signals.tsx:L100-103

### 26. Many chart buttons are wired to addToast only and do nothing
"Add Signal", "Save Workspace", "Export", "Detect Levels" — the handlers exist but most mutate only chartRef.current state that's not actually rendered. Visual feedback (toast) succeeds, but the chart doesn't change.

### 27. OrderEntryPanel accepts bracket/OCO but OrderRequest validator doesn't enforce the bracket fields
A user can submit {bracketTakeProfit: -10} and the backend's gt=0 validator catches it — but the order executor ( execution/backtest.py ) doesn't read these fields, so they have no effect. orders.py:L34-44

### 28. fetchPortfolioHistory() returns a list[dict] not paginated
After running for a few months, this returns 10k+ entries and the dashboard re-renders them all in a single React state. Will eventually freeze the tab. state.py:L21

### 29. AlphaZoo, Hypotheses V2, MCP, Renaissance routes are registered but have no UI linking to them
The sidebar/registry knows about 30+ routes. Dead links still hit 404 . 6 routes have no sidebar entry at all ( /settings/audit-log , /settings/bots work; /ai/hedge-flow and /trading/live are orphaned in the menu).

### 30. Layout.tsx chart-mode check hard-codes only /markets/chart
Any other route that opens a chart (e.g. PersonaCouncil embedded chart, MultiSymbolCompare, AdvancedCharts) is still wrapped in the dashboard chrome (menu, ticker bar, breadcrumbs) — wasting vertical space. Layout.tsx:L40-42

## 🟡 MEDIUM (visualization, design, missing features)
### 31. Equity curve canvas re-creates on every parent render
Every state change in Dashboard.tsx causes EquityCurveChart to re-paint from scratch — no useMemo or diffing. With multi-symbol compare and benchmarks, the canvas can hit 30+ fps drops.

### 32. No tooltip on KpiCards
Hovering over a KPI does nothing. They look interactive (hover styles) but are <div> not buttons.

### 33. Dark/light theme doesn't propagate to all components
MultiChartGrid , OrderBook , EquityCurveChart read CSS vars at mount but never re-apply on theme change. After a theme switch, those components keep stale colors.

### 34. TabBar and FavoritesBar are not persisted to backend
Multiple browser tabs / devices show different layouts with no sync. Refreshing browser loses everything.

### 35. StructuredOverlay.renderLiquidityLevel() references level.direction but the API returns 'LONG' | 'SHORT' strings — chart code does strict equality with === 'BULLISH'
Liquidity levels never render. Order blocks may or may not, depending on capitalisation. structure.py

### 36. MMCAnalysis page calls /mmc/analyze which has no rate limit and runs heavy SMC algo on every render
User typing in the symbol field causes a re-render storm that hits the analyzer 5+ times.

### 37. The "Run Analysis" button on PersonaCouncil has no spinner on the streaming chunks
The loading flag is set to false only after the entire stream finishes. User sees no progress even though the backend sends progress events that are dropped by the bug in #22.

### 38. AppState.portfolio_history uses datetime.utcnow() (deprecated in Python 3.12+)
Will emit DeprecationWarning spam and break in 3.13+.

### 39. DrawingsManager saves drawings to localStorage keyed by symbol/interval, but with no migration
A user upgrading to v2 of the chart library will see "drawings disappeared" with no warning.

### 40. HedgeFlow and WorkflowLab have separate implementations but share the same /api/flows endpoint with different shapes
Saving a hedge-fund flow fails when the workflow schema includes nodes with data.label (workflow) instead of data.agent_key (hedge).

## 🟢 LOW (polish, accessibility, perf)
### 41. MarketTickerBar re-fetches all 29 symbols every 5s with no dedup or abort
On slow networks, requests pile up and setTickers calls stack, freezing the ticker.

### 42. No keyboard accessibility on KpiCards, DraggableGrid, or context menu
Tab navigation is broken across the whole app.

### 43. EquityCurveChart re-computes Math.min(...eqValues) and Math.max(...eqValues) on every render — O(n) each
For 10k points this is 200k operations per frame.

### 44. FavoritesBar and TabBar don't handle empty state — collapsed to 0px and look like a bug.
### 45. agents/llm/sentiment_agent.py is imported but never wired in any UI route. 80% of the agent/llm infrastructure is dead code.
### 46. StatusBar calls /api/signals/latest every 30s, each request scans the entire in-memory signal matrix. With 1000 symbols, this blocks the event loop.
### 47. pulse-glow CSS animation defined in index.css is missing in any actual stylesheet dump — referenced 8 times but does nothing.
### 48. fetchOHLCV has no cache layer — every chart open re-downloads 1y of bars from yfinance.
### 49. Sidebar localStorage.getItem('sidebar_hidden_groups') is read on every render — should be in initial state.
### 50. alembic migrations exist (0001_initial_schema.py) but lifespan calls Base.metadata.create_all directly — migrations will be skipped forever.