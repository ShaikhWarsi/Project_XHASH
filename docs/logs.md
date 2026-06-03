# X_KA_HASH — Full Bug Log (284 Issues)

> Generated 2026-06-02 from deep audit of frontend, backend API routes, and core subsystems.
> Legend: `🔴 CRITICAL` `🟠 HIGH` `🟡 MEDIUM` `🟢 LOW`
> Categories: BUG | SEC (Security) | STUB (Mock data masquerading as real) | PERF (Performance) | UX | MISS (Missing feature) | ARCH (Architecture) | DEP (Deprecation) | RACE (Concurrency) | LEAK (Resource leak) | DEAD (Dead code)

---

## Changelog — 3 June 2026 (v0.3.0 → v0.4.0)

### What We Did

A major feature release adding 7 AI-powered features, desktop-grade UI/UX enhancements, streaming infrastructure, and comprehensive cross-tab support.

#### New AI Features (7 endpoints + 7 components)

| Feature | Endpoint | Frontend | Description |
|---------|----------|----------|-------------|
| **AI Briefing** | `GET /api/ai/briefing` | `AIBriefing.tsx` + `StatusBar.tsx` BRIEF button | LLM-generated portfolio + market overview on demand. Gathers portfolio, regime (SPY trend), top movers, risk metrics into a 3-paragraph briefing. |
| **Ask the Terminal** | `POST /api/llm/query` | `LLMPanel.tsx` "Data Query" mode | Portfolio-aware natural language queries. Injects portfolio positions, risk metrics, and recent trades into LLM context. User asks "What's my biggest position?" and gets a data-driven answer. |
| **Strategy Generator** | `POST /api/ai/generate-strategy` + `POST /api/ai/evaluate-strategy` | `StrategyGenerator.tsx` | Describe a strategy in plain English → LLM generates FinScript code → human reviews → runs backtest against FinScript engine. |
| **Indicator Generator** | `POST /api/ai/generate-indicator` | `IndicatorGenerator.tsx` | Describe an indicator → LLM generates JavaScript using `indicator({...})` plugin API → "Add to Chart" registers at runtime via `registerPlugin()`. |
| **Chart Inspector** | `POST /api/ai/inspect-pattern` (SSE streaming) | `AIInspector.tsx` | Click "What is this?" on a detected pattern → streaming LLM analysis (explanation, historical analogs, trading implications, confidence assessment). |
| **News Co-Movement** | `POST /api/ai/co-movement` | `NewsCoMovement.tsx` + RightSidebar "Co-Move" tab | Enter headline + tickers → AI shows correlated movers with direction, confidence, and reasoning. |
| **Earnings Call Summary** | `POST /api/ai/earnings-summary` | `EarningsSummary.tsx` + RightSidebar "Earnings" tab | Paste earnings transcript → AI extracts bull case (3-5 points), bear case (3-5 points), and single biggest risk. |

#### New UI/UX Features

| Feature | Details |
|---------|---------|
| **Multi-Window** | `Ctrl+N` / `Ctrl+Shift+N` opens new browser windows. Theme, symbol, and backtest events sync across tabs via `BroadcastChannel('te-sync')`. Each tab has a unique `tabId`. |
| **Drag Symbol Anywhere** | Native HTML5 DnD: drag from `SymbolSearch` → drop on `DropZone` (chart, order entry, compare, widget). MIME type: `text/plain`. |
| **Drag Price to Alert** | Drag a price level from chart → drops on `PriceDragTarget` (Alert button) → opens `AlertDialog` with pre-filled price. MIME type: `application/x-price-level`. |
| **Drag Date to Backtest** | Drag a date from chart → drops on `DateDropTarget` (backtest start input) → calls `setConfig({ start: date })`. `makeDateDraggable`/`extractDateFromDrag` utilities. |
| **Distraction-Free Mode** | `Ctrl+Shift+D` toggles: hides Sidebar, StatusStrip, MenuBar, FunctionKeyRibbon, TickerBar, MotdBanner, BreakingNewsBanner, FavoritesBar, TabBar, breadcrumbs, quick-create, StatusBar, RightSidebar. Shows floating "Exit Focus" button. |
| **High-Contrast / Sunlight Themes** | `.theme-highcontrast` (black/white/max contrast) and `.theme-sunlight` (warm sunlight-optimized). Added to `ThemeName` enum, `ChartTheme` palette, and `THEME_CYCLE`. |
| **Right Sidebar** | Collapsible 320px panel with CSS transition. 5 tabs: News, Calendar, Chat, Co-Move, Earnings. Toggle with `Ctrl+Shift+R` or right-edge button. |
| **MotdBanner** | Dismissible server-pushed announcement banner (info/warning/important). Fetched from `GET /api/motd`. Admin sets via `POST /api/motd`. |
| **useHeldTickers** | New hook returning deduplicated tickers from portfolio positions. Used by RightSidebar panels. |
| **Tick Sound** | Web Audio API sine chirp (800→400 Hz, 80ms) for Bar Replay playback. |

#### Streaming Infrastructure

| Component | File | Description |
|-----------|------|-------------|
| Backend SSE | `api/routes/llm.py:106` | `POST /llm/complete-stream` — token-by-token streaming for OpenAI and Anthropic |
| Frontend reader | `frontend/src/api/llm.ts:31` | `llmCompleteStream()` — `fetch` + `ReadableStream` reader with SSE line parser |
| Reusable component | `frontend/src/components/StreamResponse.tsx` | Renders streaming text with blinking cursor. Handles loading, error, completion. |

#### New Backend Routes

| File | Route(s) | Description |
|------|----------|-------------|
| `api/routes/briefing.py` | `GET /api/ai/briefing` | Briefing generation |
| `api/routes/network_co_movement.py` | `POST /api/ai/co-movement` | News co-movement analysis |
| `api/routes/earnings_summary.py` | `POST /api/ai/earnings-summary` | Earnings call summary |
| `api/routes/ai_strategy.py` | `POST /api/ai/generate-strategy`, `POST /api/ai/evaluate-strategy` | Strategy generator |
| `api/routes/ai_indicator.py` | `POST /api/ai/generate-indicator` | Indicator generator |
| `api/routes/ai_inspector.py` | `POST /api/ai/inspect-pattern` | Pattern inspector (streaming) |
| `api/routes/llm_query.py` | `POST /api/llm/query` | Portfolio-aware query |
| `api/routes/llm.py` (modified) | `POST /llm/complete-stream` | SSE streaming endpoint |

#### New Frontend Components

| Component | File | Dependencies |
|-----------|------|-------------|
| AIBriefing | `frontend/src/components/AIBriefing.tsx` | `briefingGet()` API, `Skeleton` |
| StreamResponse | `frontend/src/components/StreamResponse.tsx` | None (standalone) |
| NewsCoMovement | `frontend/src/components/NewsCoMovement.tsx` | `coMovementGet()` API, `Card` |
| EarningsSummary | `frontend/src/components/EarningsSummary.tsx` | `earningsSummaryGet()` API, `Card`, `Skeleton` |
| StrategyGenerator | `frontend/src/components/StrategyGenerator.tsx` | `generateStrategy()`, `evaluateStrategy()`, `Card`, `Skeleton` |
| IndicatorGenerator | `frontend/src/components/IndicatorGenerator.tsx` | `generateIndicator()`, `Card`, `useToastStore` |
| AIInspector | `frontend/src/components/AIInspector.tsx` | `inspectPattern()`, `StreamResponse`, `Card` |

#### Modified Frontend Files

| File | Changes |
|------|---------|
| `StatusBar.tsx` | Added BRIEF button that opens `AIBriefing` modal. Imported `ScrollText` icon. |
| `LLMPanel.tsx` | Added mode selector (General Chat / Ask Terminal). "Data Query" mode calls `/api/llm/query` and shows context badges (portfolio, risk, trades). |
| `RightSidebar.tsx` | Added Co-Move and Earnings tabs. Imported `NewsCoMovement` and `EarningsSummary` components. Uses `Brain` and `TrendingUp` icons. |
| `Layout.tsx` | Already handles DistractionFree, MultiWindow, RightSidebar shortcuts. |
| `api/llm.ts` | Added 10 new API functions for all AI features + streaming. |

#### API Signature Updates

```typescript
// New in api/llm.ts:
llmCompleteStream(model, prompt, onToken)          // SSE streaming reader
briefingGet()                                        // GET /api/ai/briefing
coMovementGet(headline, tickers, priceChanges)       // POST /api/ai/co-movement
earningsSummaryGet(symbol, transcriptText)           // POST /api/ai/earnings-summary
generateStrategy(description, symbol?)                // POST /api/ai/generate-strategy
evaluateStrategy(code, symbol?, start?, end?)         // POST /api/ai/evaluate-strategy
generateIndicator(description)                        // POST /api/ai/generate-indicator
inspectPattern(symbol, pattern, summary?, signals?)   // POST /api/ai/inspect-pattern (returns Response)
llmQuery(query, messageHistory?)                      // POST /api/ai/llm/query
```

#### Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| BroadcastChannel `te-sync` for multi-window | No server dependency, same-origin only, built into all modern browsers |
| Native HTML5 Drag & Drop | No third-party library; works with all frameworks |
| SSE for streaming (not WebSocket) | Simpler for one-directional LLM token streaming; native fetch + ReadableStream |
| Skeleton loading for AI responses | Consistent pattern from existing codebase |
| LLM fallback for AI endpoints | If LLM call fails, all endpoints return useful fallback data from real sources |
| Human review for strategy code | Safety: generated FinScript could contain dangerous patterns; user must click "Review & Approve" |

---

## A. FRONTEND (60 Issues)

### A1 🔴 CRITICAL — Bugs That Break Correctness

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| F1 | `components/chart/TimeAndSales.tsx` | 16,22,43 | `generateTrades()` fabricates trades via `Math.random()` — users see fake trade tape as if live | BUG | Remove synthetic generator; show empty state or wire WS |
| F2 | `pages/AdvancedCharts.tsx` | 26-43 | `IS_DEMO_DATA=true` hardcoded; `generateDemoData()` uses `Math.random()` — users see placeholder candles | STUB | Remove demo flag; fetch real OHLCV |
| F3 | `components/OrderBook.tsx` | 28-42 | `generateDepth()` returns random bid/ask levels — fake liquidity presented as real | STUB | Remove random fallback; render "No depth available" |
| F4 | `pages/AuditLogPage.tsx` | 40 | Literally renders "The audit log feature is not fully implemented" | MISS | Wire to `/api/audit/logs` or remove route |
| F5 | `components/BreakingNewsBanner.tsx` | 13-29 | `NEWS_ROTATION` contains fabricated hardcoded headlines users believe are real | STUB | Fetch from `/api/market/news`; show empty state when none |
| F6 | `components/OrderEntryPanel.tsx` | 17,25 | `initialSymbol` / `currentPrice` props never sync after mount; stale after watchlist click | BUG | `useEffect` to sync props or `key` to force remount |
| F7 | `components/chart/TimeAndSales.tsx` | 42-52 | `setTimeout` chain leak — cleanup clears only first timer; subsequent timers orphaned | LEAK | Use `useRef` for timer handle; guard `setTrades` with mounted ref |
| F8 | `components/chart/overlays/SignalTimelineRenderer.ts` | 189,281 | `renderSingle` uses stub `mapperPriceY` that always returns `canvas.height/2` — all signals plot at center | BUG | Accept real `CoordMapper`; compute `mapper.priceToY(item.signal.price)` |
| F9 | `components/chart/drawings/DrawingSnap.ts` | 10-22 | `findNearestPrice` uses pixel `crosshairX` as array index — `data[Math.round(crosshairX)]` fails for 4K+ charts | BUG | Use `mapper.xToTime(crosshairX)` then `data.findIndex` |
| F10 | `pages/Chart.tsx` | 333-367 | 60-second bar bucketing hardcoded regardless of interval — 1d chart appends new bar every tick | BUG | Bucket by `intervalSeconds(interval)`; reset on symbol/interval change |
| F11 | `store/portfolio.ts` | 36 | `eventBus.emit(EVENTS.SYMBOL_CHANGED, portfolio, metrics)` sends full portfolio as symbol — listeners misbehave | BUG | Use `PORTFOLIO_UPDATED` event for portfolio payload |
| F12 | `api/client.ts` | 156-256 | `connectDashboardSSE` — `esRef.current === es` check fails after first reconnect; SSE silently dies after 1 network blip | BUG | Replace with `!disconnected` flag or hoist timer variable |
| F13 | `api/client.ts` | 244-256 | `connectDashboardSSE` returns `{ close() } as EventSource` — missing `addEventListener`, `onmessage`, `onerror` | BUG | Return actual EventSource; implement full interface |
| F14 | `components/chart/workspace/WorkspaceDetacher.ts` | 11,24,180 | `window.open('', id)` opens empty popup; writes body referencing `detached-chart.html` that doesn't exist | BUG | Inline HTML; add `clearInterval` on close; validate `targetOrigin` |
| F15 | `pages/Dashboard.tsx` | 153-160 | SSE snapshot triggers `EVENTS.REFRESH_REQUESTED` AND `loadPortfolio()` — double-fetch every 1-2s | BUG | Use `EVENTS.SNAPSHOT_UPDATED`; only update local store, not network |

### A2 🟠 HIGH — Data/UX/Performance Bugs

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| F16 | `contexts/LivePricesContext.tsx` | 23 | `maxRetries: 999` — WS reconnects forever; hammers backend when tab hidden | PERF | Cap at 20; exponential backoff; `visibilitychange` pause |
| F17 | `pages/Settings.tsx` | 33 | `parseInt(saved, 10)` returns `NaN`; stored as `'NaN'` permanently in localStorage | BUG | Validate with `Number.isFinite` before persisting |
| F18 | `pages/StrategyLab.tsx` | 27 | `strategy: 'hybrid'` hardcoded — ignores user's strategy selector | BUG | Pass user-selected strategy from form state |
| F19 | `pages/Signals.tsx` | 26 | `setInterval(load, 5000)` polls every 5s with no abort/visibility pause — requests pile up | PERF | Use AbortController + `visibilitychange` + SSE |
| F20 | `pages/SignalsStream.tsx` | 36 | Raw `fetch('/api/signals/stream')` bypasses axios instance, retry, timeout, VITE_API_BASE | BUG | Use `api.get('/signals/stream', { responseType: 'stream' })` |
| F21 | `pages/HypothesisLab.tsx` | 47 | Calls `api.get('/hypotheses/')` with trailing slash — inconsistent with rest of API | BUG | Remove trailing slash |
| F22 | `pages/Backtest.tsx` | 18-64 | Local `EquityCurveChart` duplicates the one in `components/EquityCurveChart.tsx` — drifted implementations | ARCH | Extract shared component |
| F23 | `pages/WorkflowLab.tsx` | 22,31 | Duplicates hyperopt API calls from `HyperoptPage.tsx` — drift risk | ARCH | Extract shared helper in `api/client.ts` |
| F24 | `pages/DataPipeline.tsx` | 21 | `STAGE_CONFIG` missing `compute` key — `STAGE_CONFIG[stage].icon` throws TypeError | BUG | Add `compute` entry or guard with `?.icon` |
| F25 | `components/chart/ChartTheme.ts` | — | Only handles dark/light themes; `matrix`/`amber`/`cyber`/`terminal` all map to dark chart palettes | MISS | Add full color palettes for all 7 themes |
| F26 | `hooks/useWebSocket.ts` | 18-19 | `urlRef.current = url` executed during render body, not in effect | BUG | Move assign into `useEffect` |
| F27 | `components/StatusBar.tsx` | 31 | `themeIcons` contains dead entries `matrix`/`amber` not in `THEME_CYCLE` | DEAD | Sync maps or remove |
| F28 | `components/chart/TimeAndSales.tsx` | 22-23 | `isOpen` variable always `true` — dead code; `scheduleRef` closure bug | BUG | Remove dead variable; use `useRef` |
| F29 | `components/LiveTimeAndSales.tsx` vs `chart/TimeAndSales.tsx` | — | Two near-identical Time & Sales implementations — will diverge | ARCH | Keep one, delete other |
| F30 | `components/ChartContainer.tsx` | 101 | `useEffect` dep includes `onCrosshairMove` — inline function recreates chart every render | PERF | Wrap callback in `useRef` |
| F31 | `components/ChartContainer.tsx` | 57-66 | Fallback values `'var(--chart-bg)'` are literal strings, not valid CSS colors — chart receives invalid colors | BUG | Use real hex fallbacks |
| F32 | `components/ChartContainer.tsx` | 75-93 | Missing `area` type handler — `type='area'` silently does nothing | MISS | Add `else if (type === 'area')` with `AreaSeries` |
| F33 | `pages/WatchlistPage.tsx` | — | N+1 API calls — each watchlist row triggers individual quote fetch | PERF | Batch via `/api/quotes?symbols=...` |
| F34 | `pages/Chart.tsx` | 295-318 | `setOnError` callback stack grows on each engine rebuild — stale toasts accumulate | LEAK | Clear previous callback before rebinding |
| F35 | `pages/Chart.tsx` | 357-365 | WS volume doubles on duplicate ticks — no dedup by tick id | BUG | Dedup via message id; update only close/high/low |
| F36 | `pages/Chart.tsx` | 792-804 | `handleFetchSignals` returns flat array but render expects map — `Object.entries` produces wrong keys | BUG | Return `{plugin: sigs[]}` or use `.map` |
| F37 | `pages/Chart.tsx` | 772-781 | `handleDetectLevels` returns level count but never draws lines on chart | BUG | Pipe `lvls` to `engine.setLevels()` |
| F38 | `pages/Chart.tsx` | 1093-1104 | Patterns button toggles state that is never rendered — dead feature | DEAD | Either render or remove |
| F39 | `contexts/LivePricesContext.tsx` | — | WS price tick replaces entire prices map — previously known symbols cleared to null | BUG | Merge: `setPrices(prev => ({...prev, [symbol]: price}))` |

### A3 🟡 MEDIUM — Design/Architecture Bugs

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| F40 | `pages/PersonaCouncil.tsx` | 79-126 | SSE parser splits only on `\n`, fails on `\r\n` — multi-line events dropped | BUG | Split on `/\r?\n/` |
| F41 | `pages/PersonaCouncil.tsx` | 70-78 | Sends both `agentKey` and `agent_key` — backend expects snake_case only; falls back to "Unknown" | BUG | Pick one casing consistently |
| F42 | `api/client.ts` | 133-150 | `OHLCV_CACHE` no AbortSignal — symbol-change race overwrites with stale data | BUG | Pass AbortSignal; ignore aborted responses |
| F43 | `api/client.ts` | 49-63 | `DEDUP_MAP` unbounded — 10k unique key memory leak | PERF | LRU cap at 100 entries |
| F44 | `api/client.ts` | 65-79 | `setApiKey` attaches Bearer token to ALL requests — leaks to health/market endpoints | SEC | Per-request interceptor scoping |
| F45 | `pages/Plugins.tsx` | 117-131 | Clipboard import uses `JSON.parse` with no schema validation — self-XSS vector | SEC | Whitelist fields; validate types |
| F46 | `components/OrderEntryPanel.tsx` | — | No large-order confirmation — $1M order same UX as $10 | UX | Add `ConfirmOrderModal` above configurable threshold |
| F47 | `pages/LiveTradingWizard.tsx` | — | No broker credential validation — no "test connection" step, secret not masked | SEC | Add test step + mask secret field |
| F48 | `pages/SqlResearch.tsx` | — | No destructive-query confirmation for DROP/DELETE | SEC | Add confirmation dialog |
| F49 | `components/EquityCurveChart.tsx` | 42,217 | `Math.min(...arr)` / `Math.max(...arr)` stack overflow on 100k+ points | PERF | Use `reduce` loop |
| F50 | `components/chart/VolumeProfile.tsx` | 20-21 | Same `Math.min/max(...arr)` spread overflow | PERF | Use `reduce` loop |
| F51 | `contexts/ThemeContext.tsx` | 44-46 | `Number(localStorage.getItem(...))` accepts NaN; "0" overridden to 14 | BUG | `parseInt` + `Number.isFinite` + bounds check |
| F52 | `components/chart/ChartTheme.ts` | — | `DARK_THEME`/`LIGHT_THEME` only; 5 themes use dark by default | BUG | Add full palettes for all themes |
| F53 | `store/chartStore.ts` | 16 | `theme: 'dark' | 'light'` while context has 7 — type mismatch | ARCH | Delete theme from chartStore or widen union |
| F54 | `contexts/EventBusContext.tsx` vs `utils/eventBus.ts` | — | Two event bus implementations — stores emit to singleton, components subscribe via context, never meet | ARCH | Pick one implementation |
| F55 | `components/Sidebar.tsx` | — | No keyboard navigation; `^1..8` on Windows shows caret not Ctrl | UX | `role="navigation"` + arrow keys + visible focus |
| F56 | `pages/Chart.tsx` | 188-189 | `wsUrl` rebuilt on every render — keystroke toggles WS reconnect | PERF | `useMemo` for wsUrl |
| F57 | `services/DrawingManager.ts` | 160-162 | `restoreSnapshot` doesn't reset `historyIndex` — undo/redo after load inconsistent | BUG | Reset history on restore |
| F58 | `components/MarketTickerBar.tsx` | — | Quotes fetched once on mount, never refreshed — sparklines are stale | UX | Subscribe via LivePricesContext |
| F59 | `components/Layout.tsx` | 41-43 | `chartMode` hides news banner/status bar on chart routes only — compliance risk for some feeds | UX | Per-component opt-out via context |
| F60 | `pages/Chart.tsx` | 1319-1331 | "Library" save/load button toggles silently; user can't append/rename library entries | UX | Split Save… / Load… buttons with list picker |

---

## B. BACKEND API ROUTES (116 Issues)

### B1 🔴 CRITICAL

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| R1 | `api/app.py` | 232 | `logger.info("No authentication — all routes open")` — every trading endpoint wide open | SEC | Add auth middleware or dev-mode gate with visible warning |
| R2 | `api/routes/orders.py` | 105-136 | `POST /orders` no auth, no margin check, no buying-power check — appends to in-memory list | SEC | Add risk validation + auth |
| R3 | `api/routes/config.py` | 42-45 | `PUT /config` unauthenticated global mutation — any client can override limits | SEC | Add auth |
| R4 | `api/routes/config.py` | 48-51 | `POST /config/api-key` accepts key but never persists or validates — flips boolean only | STUB | Persist to DB; validate key |
| R5 | `api/routes/market_data.py` | 142-237 | Watchlist/alerts keyed on `user_id="default"` — anyone can delete others' alerts | SEC | Use real user identity |
| R6 | `api/routes/research/sql_research.py` | 36-46 | Unauthenticated SQL endpoint — regex on first keyword is only DML protection | SEC | Use parameterized queries; add auth |
| R7 | `api/routes/finscript.py` | 49-69 | `POST /finscript/evaluate` accepts arbitrary code — RCE vector if interpreter uses exec/eval | SEC | Sandbox with RestrictedPython |
| R8 | `api/routes/audit_routes.py` | 13-25 | In-memory audit log with unlimited POST — anyone can flood | SEC | Add size cap + auth |
| R9 | `api/routes/providers_routes.py` | 77-94 | Enable/disable providers silently do nothing — return success but never call registry | STUB | Actually toggle provider state |
| R10 | `api/routes/providers_routes.py` | 218-223 | `POST /providers/test` logs keys but saves nothing, tests nothing | STUB | Implement real credential test |
| R11 | `api/routes/analytics_routes.py` | 12-22 | `GET /analytics/attribution` returns hardcoded mock — ignores portfolio_id | STUB | Compute from real positions |
| R12 | `api/routes/analytics_routes.py` | 25-33 | `GET /analytics/fixed-income` returns hardcoded mock (yield:4.25, duration:6.8) | STUB | Compute from real bond holdings |
| R13 | `api/routes/analytics_routes.py` | 36-44 | `GET /analytics/derivatives` returns hardcoded Greeks | STUB | Compute from real options positions |
| R14 | `api/routes/analytics_routes.py` | 47-56 | `GET /analytics/geopolitical` returns hardcoded fake events | STUB | Fetch from real news API |
| R15 | `api/routes/analytics_routes.py` | 59-61 | `POST /analytics/sql` ignores body, returns hardcoded rows | STUB | Execute real SQL |
| R16 | `api/routes/analytics_routes.py` | 64-68 | `GET /analytics/fast` returns hardcoded momentum/volatility | STUB | Compute from real data |
| R17 | `api/routes/china_markets_routes.py` | 74-92 | `_CHINA_STOCKS` and `_CHINA_INDICES` are hardcoded fakes with pinned prices | STUB | Fetch from Shanghai/Shenzhen exchange |
| R18 | `api/routes/ws.py` | 163-191 | `ws_orderbook` generates `random.uniform(200, 5000)` bid/ask sizes — fake depth | STUB | Return real book or empty snapshot |
| R19 | `api/routes/ws.py` | 195-229 | `ws_trades` generates random buy/sell/price — fake trade tape | STUB | Return real trades or empty |
| R20 | `api/routes/ws.py` | 88-94 | `ws_prices` returns stub `change:0, changePercent:0, volume:0, marketCap:0` — only price is real | STUB | Compute real change/volume |
| R21 | `api/routes/positions.py` | 30-33 | Hardcoded zero stubs: `dayPnl:0, dayPnlPercent:0, exposurePercent:0` | STUB | Compute from real positions |
| R22 | `api/routes/risk.py` | 58 | `beta: 1.0` hardcoded | STUB | Compute from market returns |
| R23 | `api/routes/integrations_routes.py` | 13-70 | `_DEFAULT_BOTS` hardcoded with fake last_active timestamps | STUB | Persist bot states to DB |
| R24 | `api/routes/integrations_routes.py` | 88-90 | `GET /integrations/bots/{name}/test` returns success without actually testing | STUB | Send real test message |
| R25 | `api/routes/swarm_routes.py` | 104-108 | `_execute_run_tasks` defined but NEVER CALLED from any route — runs sit in `pending` forever | BUG | Wire to `POST /swarm/runs` |
| R26 | `api/routes/cfa.py` | 486-511 | `bond/one-pager` passes `frequency` as `ytm` then duplicates `frequency` as kwarg — `TypeError` at runtime | BUG | Fix arg order: `dur.calculate_modified(face, coupon, ytm, freq)` |
| R27 | `api/routes/agents/admin.py` | 18-25 | Token creation has no auth — anyone can mint agent tokens | SEC | Require existing valid token |
| R28 | `api/routes/agents/admin.py` | 113-138 | Audit listing unauthenticated — anyone gets full audit history | SEC | Add auth |
| R29 | `api/routes/portfolio_optimization.py` | 46 | Floor-division `n = len(prices) // len(symbols)` silently drops trailing prices | BUG | Validate divisible lengths or return 400 |
| R30 | `api/routes/factor_analysis.py` | 39-45 | Same silent data loss in `_build_panel` and `_build_factor` | BUG | Same fix |
| R31 | `api/routes/screener_routes.py` | 239 | Sort key `(False, ...) > (True, ...)` with `reverse=True` — non-matches sort first | BUG | Fix tuple sort order |
| R32 | `api/routes/alpha_zoo_routes.py` | 131-135 | `ic`, `rank_ic`, `ret` all compute Pearson correlation — `method="spearman"` parens wrong | BUG | Fix assigment: `ic = factor.corr(...); rank_ic = factor.corr(..., method="spearman")`; `ret = factor.corr(...)` |
| R33 | `api/routes/signals_stream.py` | 32 | Engine filter `s.type.value in engines or s.type in engines` — enum compared to str is always False | BUG | Cast properly: `s.type.value in engines` |
| R34 | `api/routes/signals.py` | 88-101 | `body.get("symbol", "AAPL")` — empty string silently falls through to "AAPL" | BUG | Reject empty symbol with 400 |
| R35 | `api/routes/paper.py` | 166 | SELL only matches existing SELL positions — buy-to-close opens new short instead | BUG | Match across sides for closing |
| R36 | `api/routes/paper.py` | 36-191 | Module-level globals mutated without async lock — concurrent requests corrupt P&L counters | RACE | Add `asyncio.Lock` around read/modify/write |
| R37 | `api/routes/hyperopt_routes.py` | 16-81 | `n_trials` no upper bound — client can set 10,000,000 | PERF | Cap at 1000 |
| R38 | `api/routes/rl_training.py` | 32-51 | `total_timesteps` no upper bound — client can request 1e9 | PERF | Cap at 1,000,000 |
| R39 | `api/routes/rl_training.py` | 54-71 | `model_path: str` from user — path traversal risk if loading from disk | SEC | Validate path against allowlist |
| R40 | `api/routes/llm.py` | 60-93 | No per-user quota on LLM calls — attacker can rack up API costs against server key | SEC | Add per-IP cost cap |
| R41 | `api/routes/hypothesis_routes.py` | 46-47 | Sync yfinance inside async handler — blocks event loop | PERF | Wrap in `asyncio.to_thread` |
| R42 | `api/routes/geo_analysis_routes.py` | 90,116 | Sync yfinance calls in async handler | PERF | `asyncio.to_thread` |
| R43 | `api/routes/alpha_zoo_routes.py` | 82-92 | Sync yfinance loop for 10+ symbols in async handler | PERF | `asyncio.to_thread` |
| R44 | `api/routes/renaissance.py` | 43-57 | Sync `yf.Ticker().history()` called synchronously inside async | PERF | `asyncio.to_thread` |
| R45 | `api/routes/screener_routes.py` | 219-237 | Sync yfinance in loop for scan | PERF | `asyncio.to_thread` |
| R46 | `api/routes/paper.py` | 54-66 | Sync `_update_prices` called from async handlers | PERF | `asyncio.to_thread` |
| R47 | `api/routes/global_market.py` | 40-96 | Sync yfinance for news and sentiment in async handlers | PERF | `asyncio.to_thread` |
| R48 | `api/routes/stream.py` | 33-35 | Lambda closure; `yf.download` failure leaves cache stale — subsequent calls retry forever | BUG | Clear cache key on failure |
| R49 | `api/routes/providers_v2.py` | 46-50 | `@router.on_event("startup")` — deprecated since FastAPI 0.110; runs twice if `lifespan` also registers | DEP | Use `lifespan` context in `app.py` |
| R50 | `api/routes/details.py` | — | `datetime.utcnow()` used in 76 places across routes (orders, flows, providers, etc.) | DEP | Replace with `datetime.now(timezone.utc)` |

### B2 🟠 HIGH

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| R51 | `api/routes/signals.py` | 42,80 | `GET /signals/` + `GET /signals/latest` — relies on `redirect_slashes=True` which breaks SSE EventSource | BUG | Use distinct paths without slash dependency |
| R52 | `api/routes/hedge_fund.py` | 30,115 | `HedgeFundRequest`/`BacktestRequest` no caps — 100 tickers * 17 agents loops in `to_thread` | PERF | Cap tickers and agents |
| R53 | `api/routes/renaissance.py` | 155-183 | No Pydantic model; symbol as query param; 10 tickers + 17 agents unbounded | PERF | Add Pydantic model with limits |
| R54 | `api/routes/hedge_fund.py` | 115-153 | Backtest loop over `bdate_range(start, end)` — 20 years = 5000+ days, each calling `orchestrator.deliberate()` synchronously | PERF | Add cancellation; return progress |
| R55 | `api/routes/renaissance.py` | 108 | `asyncio.get_event_loop()` deprecated in Python 3.10+ in async context | DEP | Use `asyncio.to_thread()` |
| R56 | `api/routes/llm.py` | 30-50,59-93 | Sync OpenAI/Anthropic SDK calls inside async endpoint — 30s blocks event loop | PERF | Wrap in `asyncio.to_thread` with timeout |
| R57 | `api/routes/bars_routes.py` | 51-57 | Duplicate `try/except` with identical code in both branches — dead code from refactor | DEAD | Remove duplicate |
| R58 | `api/routes/portfolio_optimization.py` | 34-37 | `n_points: int = 30` no upper bound — 100k points locks worker | PERF | Cap at 1000 |
| R59 | `api/routes/portfolio_whatif.py` | 13-44 | No validation on weight values — negative weights, sums != 1.0 accepted | BUG | Validate weight constraints |
| R60 | `api/routes/portfolio_whatif.py` | 37 | Tax-impact 5bps hardcoded with no config knob | MISS | Make configurable |
| R61 | `api/routes/signals.py` | 88-117 | `POST /signals/spectre` and `/signals/tsfresh` use `body: dict` — no Pydantic model | MISS | Add Pydantic models |
| R62 | `api/routes/pairlists_routes.py` | 35-82 | 13 raw query params, no Pydantic; symbols list unbounded | MISS | Add Pydantic model |
| R63 | `api/routes/market_data.py` | 153-232 | `POST /market/watchlist` and `/alerts` use `body: dict` | MISS | Add Pydantic models |
| R64 | `api/routes/structure.py` | 30-47 | `_empty_state` always returns fake structure report — no "not implemented" marker | STUB | Return 501 or explicit indicator |
| R65 | `api/routes/metrics.py` | 29-34 | Returns `null` stub when attribution missing — frontend can't distinguish from computed nulls | STUB | Return 404 or explicit empty |
| R66 | `api/routes/experiment_routes.py` | 23-30 | `max_variants`, `max_rounds`, `candidates_per_round` unbounded | PERF | Cap values |
| R67 | `api/routes/debate_routes.py` | 15-93 | `bull_agents`/`bear_agents` comma-separated query strings — no validation | PERF | Validate agent names; cap rounds |
| R68 | `api/routes/cfa.py` | 48-56 | `BondPriceRequest`/`BondYTMRequest` lack `ge=0` bounds — accepts negative coupon | BUG | Add pydantic validators |
| R69 | `api/routes/cfa.py` | 115-138,289-317 | JSON-encoded strings as query params for bonds — awful API design, no schema | ARCH | Accept proper Pydantic body |
| R70 | `api/routes/strategies/list.py` | 30-55 | Returns `BacktestRun` records labelled "strategies" — semantic confusion | ARCH | Use correct name |
| R71 | `api/routes/orders.py` | 148-156 | `DELETE /orders/{order_id}` marks CANCELED but no broker cancel | STUB | Wire to broker cancel API |
| R72 | `api/routes/risk.py` | 30 | Case-sensitive side match `"LONG" or "long"` — fragile | BUG | Use `.upper()` |
| R73 | `api/routes/llm.py` | 88-90 | Fragile `ImportError` parsing `str(e).split("'")[1]` — fails on non-standard error text | BUG | Use `getattr(e, 'name', str(e))` |
| R74 | `api/routes/llm.py` | 86 | Fake token-usage count `len(prompt) // 4` — not real usage | STUB | Call LLM API for real usage |
| R75 | `api/routes/llm.py` | 14-19 | `DEFAULT_MODELS` has `gpt-4o`, `claude-3-opus` — no Claude 3.5/4, no streaming | MISS | Update model list |
| R76 | `api/routes/workflow_routes.py` | 43-47 | `__import__` pattern breaks static analysis — should use normal import | ARCH | Replace with `from api.services.workflow.graph import ...` |
| R77 | `api/routes/mcp_routes.py` | 14-22 | Accesses private `mcp._tool_manager._tools` — breaks on library upgrade | BUG | Use public API |
| R78 | `api/routes/mcp_routes.py` | 26-31 | `GET /mcp/providers` imports `mcp_server` then ignores it | DEAD | Remove unused import |
| R79 | `api/routes/flows.py` | 35-62 | `json.dumps` of Pydantic models — fails on datetime/Decimal without `default=str` | BUG | Add `default=str` |
| R80 | `api/routes/workflow_routes.py` | __import__ | `__import__("api.services.workflow.graph")` breaks tooling | ARCH | Use static import |

### B3 🟡 MEDIUM

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| R81 | `api/routes/orders.py` | 75-96 | Module-level `_orders` list with `threading.Lock` — multi-worker only one has new order | ARCH | Use DB-backed storage |
| R82 | `api/routes/orders.py` | 42-57 | `OrderRequest` has bracket/OCO fields stored but never acted on — looks real, isn't | STUB | Implement bracket/OCO logic |
| R83 | `api/routes/workspace_routes.py` | 16-19 | Bare relative path `"chart_workspaces.json"` — depends on CWD; concurrent workers stomp | ARCH | Use absolute path |
| R84 | `api/routes/strategy_clone.py` | 46-47 | Mutates global `sm.strategies` dict with no lock | RACE | Add async lock |
| R85 | `api/routes/audit_routes.py` | 13 | `_audit_logs` list unbounded — memory leak | LEAK | Cap at 10000 |
| R86 | `api/routes/hypothesis_routes.py` | 15-16 | `_execution_results` dict unbounded — memory leak | LEAK | Add TTL eviction |
| R87 | `api/routes/renaissance.py` | 16-17 | `_run_results` dict unbounded — memory leak | LEAK | Add TTL eviction |
| R88 | `api/routes/screener_routes.py` | 17-18 | `_SCREENER_CACHE` unbounded — memory leak | LEAK | Add LRU eviction |
| R89 | `api/routes/signals.py` | 7-9 | Imports `HTTPException`, `Query` unused in `/` route | DEAD | Remove unused imports |
| R90 | `api/routes/positions.py` | 5 | `APIRouter(tags=["positions"])` with no prefix — inconsistent routing | ARCH | Use consistent prefix |
| R91 | `api/routes/positions.py` | 14-19 | 6 repeated `isinstance` defensive patterns — code smell | ARCH | Extract helper function |
| R92 | `api/routes/portfolio.py` | 30-35 | Realized P&L only handles dict/int/float — skips Decimal, objects | BUG | Handle all numeric types |
| R93 | `api/routes/screener_routes.py` | 18-26 | Cache TTL 300s but no invalidation — stale data persists | BUG | Add manual refresh endpoint |
| R94 | `api/routes/risk.py` | 58 | `beta` hardcoded alongside side-detection logic duplicated with `risk_live.py:32-40` | DEAD | Consolidate |
| R95 | `api/routes/market_data.py` | 17-19 | Finnhub/YFinance imported at module level — failure kills entire module | ARCH | Lazy import |
| R96 | `api/routes/market_intel.py` | 43,55 | `limit` not declared via `Query()` — no OpenAPI validation | MISS | Add `Query()` |
| R97 | `api/routes/orders.py` | 139-145 | Anyone can fetch any order — no permission scope | SEC | Add user scoping |
| R98 | `api/routes/swarm_routes.py` | 119-132 | SwarmStore has `reap_stale_runs` but no scheduled reaper — stale runs accumulate | MISS | Add background task |
| R99 | `api/routes/agents/jobs.py` | 51-53 | `stream_progress` has no exit condition — StreamingResponse held forever | LEAK | Add timeout |
| R100 | `api/routes/agents/markets.py` | 92-93 | Hardcoded `start=datetime(2020,1,1)` — ignores `before_time` param | BUG | Use params properly |
| R101 | `api/routes/ws.py` | 143 | `hasattr(app_state, 'async_get_open_orders')` masks missing method | ARCH | Use explicit check |
| R102 | `api/routes/audit_routes.py` | 23 | `entry["timestamp"]` overwrites client-supplied timestamp | BUG | Only set if absent |
| R103 | `api/routes/audit_routes.py` | 17 | `limit` no `le=500` check — arbitrary negative values accepted | MISS | Add `Query(100, le=500)` |
| R104 | `api/routes/portfolio.py` | 30 | `realized_gains` value cast partial | BUG | Handle all value shapes |
| R105 | `api/routes/cfa.py` | 96-193 | No `response_model` — API contract implicit | ARCH | Add response models |
| R106 | `api/routes/chart_routes.py` | 42-47 | `interval_map` missing `1wk`/`1mo` — falls back to `"15m"` silently | BUG | Add missing intervals |
| R107 | `api/routes/swarm_routes.py` | 144-159 | `prompt.replace("{run_id}", ...)` — no escaping; template injection risk | BUG | Use proper template engine |
| R108 | `api/routes/finscript.py` | 14-18 | `TEMPLATES_DIR` depends on 3-level-up filesystem — breaks in packaged install | ARCH | Use `importlib.resources` |
| R109 | `api/routes/flows.py` | 35 | `json.dumps` without `default=str` — datetime serialization crash | BUG | Add `default=str` |

### B4 🟢 LOW / Polish

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| R110 | `api/routes/agents/markets.py` | 18-24 | `_MARKET_MAP` hardcoded — new providers need code changes | ARCH | Registry-driven |
| R111 | `api/routes/providers_v2.py` | 181-202 | `POST /search` should be GET for caching | ARCH | Change to GET |
| R112 | `api/routes/llm.py` | 88-90 | Raised info about pip install command — internal dep names leaked | SEC | Generic error message |
| R113 | `api/routes/structure.py` | 7-9 | Unused imports `create_engine`, `SignalDir`, `RegimeType` | DEAD | Remove |
| R114 | `api/routes/global_market.py` | 32-37 | `category` query param no validation — any string accepted | MISS | Validate against allowed values |
| R115 | `api/auth/routes.py` | — | Agent auth model exists but not wired to main API | ARCH | Extend agent auth to all routes |
| R116 | `api/routes/portfolio_whatif.py` | 37 | `round(turnover * 0.0005, 6)` magic number | ARCH | Extract as constant with config |

---

## C. CORE SUBSYSTEMS (109 Issues)

### C1 🔴 CRITICAL

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| C1 | `data/` directory | root | `data/` directory does NOT exist on disk but is imported by 38+ files — entry points crash on import | BUG | Create `data/` stub with expected submodules |
| C2 | `persistence/database.py` | 30,46 | `_run_alembic_upgrade` falls back to `Base.metadata.create_all(engine)` — migrations silently skipped, schema changes lost | BUG | Fail loudly if alembic can't run |
| C3 | `persistence/models.py` | 14,28,55,89,120,145 | `default=datetime.utcnow` on all timestamp columns — broken in Python 3.13+ | DEP | Use `default=lambda: datetime.now(timezone.utc)` with `timezone=True` |
| C4 | `risk/limits.py` | 38 | `p.quantity > 0` only counts long positions — shorts under-reported, portfolio appears safer than it is | BUG | Change to `p.quantity != 0` |
| C5 | `risk/stop_loss.py` | — | No logic for `OrderSide.SHORT` exits — short positions never get stop-lossed | BUG | Add symmetric SHORT stop-loss: `if side == SHORT and price >= stop_price: close` |
| C6 | `execution/live/ccxt.py` | 49-50 | `params["reduceOnly"] = False` set for every order — SHORT exit can accidentally open new long | BUG | Branch on `side`: `reduceOnly = (action == "close")` |
| C7 | `execution/live/alpaca.py` | — | Paper/live mode via URL env var with no runtime check — misconfigured URL executes real orders | SEC | Assert `BASE_URL` contains `paper-api` if paper mode |
| C8 | `execution/strategy_lifecycle.py` | 94 | Last `asyncio.new_event_loop()` call in codebase — deadlock if called from running event loop | RACE | Use `asyncio.run_coroutine_threadsafe` |
| C9 | `signals/ml/pattern_mining.py` | — | May use future bars for pattern detection — lookahead bias | BUG | Use `shift(1)` or roll anchored to past |
| C10 | `signals/ml/meta_labeling.py` | 275-306 | Target may leak primary signal — lookahead bias | BUG | Compute from future returns, not model predictions |
| C11 | `signals/alpha_zoo/registry.py` | 296 | `spec.loader.exec_module(module)` — executes arbitrary module code on load; user input is RCE | SEC | Sandbox with `importlib.util.spec_from_file_location` |
| C12 | `finscript/interpreter.py` | 60-170 | No sandboxing — Finscript program can `import os; os.system("rm -rf /")` | SEC | Use `RestrictedPython` or whitelist |
| C13 | `integrations/tradingview.py` | — | Webhook endpoint no HMAC verification — anyone who finds URL sends fake alerts | SEC | Verify `X-TradingView-Signature` |
| C14 | `integrations/email_notifier.py` | — | `smtplib.SMTP` without TLS — credentials in plaintext over network | SEC | Enforce `SMTP_USE_TLS=true` |
| C15 | `llm/client.py` | ~77 | API keys may be logged at DEBUG level | SEC | Never log keys; mask if needed |
| C16 | `mcp_server.py` | 36 | `from data.providers.yfinance import YFinanceDataSource` — fails because `data/` doesn't exist | BUG | Create data module |
| C17 | `mcp_server.py` | 40-200 | All `@mcp.tool()` decorators inside `if mcp is not None:` — if `fastmcp` not installed, zero tools exposed silently | BUG | Fail at startup with clear error |
| C18 | `scripts/run.py` | 21 | Imports from missing `data` module | BUG | Create data module |
| C19 | `scripts/live.py` | 21 | Imports from missing `data` module | BUG | Create data module |
| C20 | `pyproject.toml` | — | `requires-python=">=3.11"` but code uses `datetime.utcnow` — 3.13 removes it | DEP | Fix all `utcnow` calls or pin `<3.13` |

### C2 🟠 HIGH — Data Integrity / Concurrency

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| C21 | `persistence/database.py` | 21,47 | Circular import risk: `database.py` and `models.py` both import each other's `Base` | ARCH | Keep `Base` in leaf module |
| C22 | `persistence/database.py` | 34-40 | `async_engine` created at module import — `DATABASE_URL` cannot be monkeypatched for tests | ARCH | Factory function |
| C23 | `persistence/models.py` | 60-80 | No `index` on commonly-queried columns (`agent_name`, `created_at`) — full table scans | PERF | Add `index=True` |
| C24 | `persistence/repositories.py` | 37-239 | No transaction boundaries — partial failure leaves session in bad state | RACE | Wrap multi-statement in `async with session.begin()` |
| C25 | `persistence/repositories.py` | 121-140 | Upsert pattern read-then-write race — two concurrent creates produce duplicate | RACE | Use `INSERT ... ON CONFLICT` |
| C26 | `api/state.py` | 18-25 | `_sync_run` creates new `ThreadPoolExecutor(max_workers=1)` on every call — thread churn | PERF | Module-level executor |
| C27 | `api/state.py` | 23 | `max_workers=1` serializes all sync access — one slow getter blocks all others | PERF | `os.cpu_count() or 4` |
| C28 | `api/state.py` | 130-216 | Sync property getters wrap coroutine calls — can deadlock from event loop thread | RACE | Refactor to async methods |
| C29 | `agents/llm/base.py` | 42-47 | Same `ThreadPoolExecutor(max_workers=1)` per analysis — alloc/shutdown churn | PERF | Module-level executor |
| C30 | `agents/llm/base.py` | 60-80 | No timeout on LLM API calls — slow provider blocks agent for minutes | LEAK | Wrap in `asyncio.wait_for(..., timeout=30)` |
| C31 | `agents/orchestrator.py` | — | Agents run sequentially — 5 agents × 5s = 25s latency | PERF | Use `asyncio.gather(return_exceptions=True)` |
| C32 | `agents/memory.py` | — | Process-local memory, lost on restart — agents forget everything | MISS | Persist to DB |
| C33 | `agents/portfolio_manager.py` | — | No validation weights sum to 1.0 — agent can propose 200% leverage | BUG | Add `abs(sum(weights) - 1.0) < 1e-6` |
| C34 | `agents/hedge_fund/orchestrator.py` | — | Runs 16 personas sequentially — same perf issue as C31 | PERF | Parallelize |
| C35 | `signals/rl/environment.py` | 22 | `gym.Env if HAS_RL else object` — callers crash on `.step()` when RL not installed | BUG | Raise ImportError at import time |
| C36 | `signals/rl/trainer.py` | 122 | `evaluate()` return shape — if returns dict instead of `(mean_reward, std_reward)`, SB3 crashes | BUG | Match SB3 expected format |
| C37 | `signals/regime/wasserstein.py` | — | Wasserstein O(n³) — no caching, recomputed every bar | PERF | Cache with TTL |
| C38 | `signals/indicators/market_structure.py` vs `structure.py` | — | Two parallel market structure implementations — drift risk | DEAD | Pick one |
| C39 | `risk/engine.py` | — | Validates orders synchronously inside async context — blocks event loop | PERF | Pre-compute correlation offline |
| C40 | `risk/position_sizing.py` | — | No correlation adjustment — two correlated positions get full size each | BUG | Scale by `1/sqrt(1 + sum(corr))` |
| C41 | `execution/live/ccxt.py` | 43,74 | `return None` on errors — caller can't distinguish "no order" from "error" | BUG | Raise or return typed result |
| C42 | `execution/live/alpaca.py` | 41,65,78 | Same silent `None` return on error | BUG | Raise or return typed result |
| C43 | `execution/live/ibkr.py` | 66,92 | Same `return None` + connection management — check `connect()` timeout and reuse | BUG | Add timeout; reuse connection |
| C44 | `execution/paper_trading.py` | 32 | `return None` on order submit failure — caller doesn't know if accepted | BUG | Return typed result |
| C45 | `execution/paper_trading.py` | — | Fill model assumes next-bar-open — no slippage, no partial fills, overstates performance | BUG | Add `slippage_bps`, `rejection_rate` |
| C46 | `execution/backtest.py` | 12-50 | Parallel position math implementation to `core/position.py` — drift risk | ARCH | Consolidate |
| C47 | `execution/matching.py` | 137-444 | Multiple `return` early-exits — unhandled order types silently return | BUG | Log warning for unhandled types |
| C48 | `backtesting/engine.py` | 201 | `datetime.utcnow()` | DEP | `datetime.now(timezone.utc)` |
| C49 | `backtesting/engine.py` | — | No handling of corporate actions — prices assumed raw but yfinance returns split-adjusted | BUG | Document or adjust |
| C50 | `backtesting/synthetic_data.py` | — | Bootstrap destroys autocorrelation — need block bootstrap for time series | BUG | Use `arch.bootstrap` |
| C51 | `backtesting/walkforward.py` | — | No anchored vs rolling mode — both have different statistical properties | MISS | Add `mode: Literal["anchored", "rolling"]` |
| C52 | `backtesting/monte_carlo.py` | — | Seed management — no `seed` parameter means non-reproducible | BUG | Accept `seed: int` |
| C53 | `analytics/metrics.py` | — | Sharpe annualization assumes returns in decimal — if in USD, formula breaks | BUG | Document and assert decimal format |
| C54 | `analytics/attribution.py` | — | Brinson attribution assumes long-only — short positions miscount | BUG | Branch on side |
| C55 | `analytics/reports.py` | — | Jinja2 templates likely not autoescaped — XSS in user trade notes | SEC | Enable Jinja2 autoescape |
| C56 | `llm/client.py` | — | No rate limiting — agent loop calling 5+ LLM calls blows TPM limits | MISS | Add `asyncio.Semaphore(N)` + token bucket |
| C57 | `llm/client.py` | 12 providers | Inconsistent retry/backoff across providers — some have built-in retry, others don't | BUG | Centralize retry policy |
| C58 | `integrations/discord_bot.py` | — | Webhook URL in env — logged at debug level leaks secret | SEC | Mask in logs |
| C59 | `integrations/telegram_bot.py` | — | Bot token in env — leaked in logs; attacker impersonates bot | SEC | Redact in logs |
| C60 | `integrations/sms_notifier.py` | — | Twilio auth_token not validated at startup | SEC | Validate at startup |
| C61 | `integrations/slack_bot.py` | — | Same webhook URL leak as Discord | SEC | Mask in logs |
| C62 | `mcp_server.py` | — | No auth on MCP tools — any local process calls any tool | SEC | Add token-based auth |
| C63 | `mcp_server.py` | — | No rate limiting on MCP tools — attacker drives up LLM costs | MISS | Add per-tool rate limiter |
| C64 | `scripts/live.py` | 115-193 | Exception during mid-loop skips `disconnect()` — resource leak | LEAK | Wrap in `try/finally` |
| C65 | `scripts/live.py` | — | `executor.connect()` → loop → `executor.disconnect()` — connection leak on exception | LEAK | Ensure cleanup |
| C66 | `scripts/dashboard.py` | — | Plotly Dash + asyncio — known deadlock issues with Tornado | RACE | Use separate process or `dash>=2.16` async |
| C67 | `config/__init__.py` | — | No `pydantic-settings` validation — env var typos silently default | BUG | Use `BaseSettings` with env file |
| C68 | `config/__init__.py` | — | No `.env.example` — operators don't know which vars to set | MISS | Create `.env.example` |
| C69 | `config/__init__.py` | — | No startup validation — empty `OPENAI_API_KEY` fails on first LLM call only | BUG | Validate at startup |
| C70 | `alembic/env.py` | 19 | Only imports `persistence/models.py` — models outside this file not auto-detected | BUG | Import all model modules |
| C71 | `alembic/versions/0001_initial_schema.py` | 42 | `datetime.utcnow()` in migration — should be deterministic | DEP | Use `sa.func.now()` |
| C72 | `analyzers/mmc/__init__.py` | 2 | Eagerly imports all submodules — one error kills entire package | ARCH | Lazy import inside functions |

### C3 🟡 MEDIUM — Design / Architecture

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| C73 | `persistence/repositories.py` | 25,87,156 | `datetime.utcnow()` in all repos | DEP | Replace |
| C74 | `agents/portfolio_manager.py` | 67,134 | `datetime.utcnow()` | DEP | Replace |
| C75 | `agents/risk_manager.py` | 45,98 | `datetime.utcnow()` | DEP | Replace |
| C76 | `agents/calibration.py` | — | `sklearn.calibration.CalibrationDisplay` requires matplotlib — heavy dep if lazy | PERF | Make import lazy |
| C77 | `agents/memory.py` | — | No deduplication of similar memory entries — bloat | PERF | Hash or embed + cosine-similarity |
| C78 | `agents/risk_manager.py` | — | Risk thresholds hardcoded — can't tune without code changes | MISS | Move to config YAML |
| C79 | `agents/base.py` | — | `analyze()` may be declared sync — forces ThreadPoolExecutor workaround | ARCH | Declare as `async def` |
| C80 | `agents/orchestrator.py` | — | Error handling — one agent raising aborts the rest | BUG | `return_exceptions=True` and aggregate |
| C81 | `agents/wall_time/tracker.py` | — | Likely stub — check if it actually tracks anything | DEAD | Implement or remove |
| C82 | `agents/memory_log/memory.py` | 3 | Re-exports from `trading_memory` — verify target file exists | DEAD | Verify |
| C83 | `signals/rl/environment.py` | — | SB3 version not pinned in `pyproject.toml` — v2.x API breaks | DEP | Pin `stable-baselines3>=2.0,<3.0` |
| C84 | `signals/ml/validation.py` | — | "Walk-forward" may be simple train/test split without purging | BUG | Verify expanding/rolling windows |
| C85 | `signals/regime/market_regime.py` | — | HMM no convergence check — returns -inf on degenerate data | BUG | Catch and fall back to last regime |
| C86 | `signals/conditions/evaluator.py` | 41,209,270 | Sync `ConditionGroup.evaluate` called from async code with large DataFrame | PERF | Make async or document |
| C87 | `risk/circuit_breakers.py` | — | Hardcoded thresholds (e.g., 20% drawdown) — no config | ARCH | `CircuitBreakerConfig.from_env()` |
| C88 | `execution/exchanges/factory.py` | 73 | `return None` when no exchange matches — caller gets `AttributeError` | BUG | Raise `ValueError` |
| C89 | `execution/grid_bot.py` | 105,115,138 | `return None` on state queries — caller assumes alive when crashed | BUG | Return state explicitly |
| C90 | `execution/backtest.py` | 12-50 | Parallel position math to `core/position.py` — formulas will diverge | ARCH | Consolidate |
| C91 | `backtesting/scenario.py` | — | Stress scenarios hardcoded (2008, COVID) — can't add without code changes | MISS | Load from YAML |
| C92 | `analytics/metrics.py` | — | Sortino includes zero-return days in downside denominator | BUG | Filter `returns[returns < 0]` |
| C93 | `llm/client.py` | — | Default model `gpt-4` — expensive; should default to `gpt-4o-mini` | ARCH | Make explicit |
| C94 | `llm/capabilities.py` | — | Capability detection hardcoded per provider — new model requires code change | MISS | Probe at runtime |
| C95 | `finscript/parser.py` | — | Grammar ambiguity `a > b > c` — precedence may be wrong | BUG | Document precedence |
| C96 | `finscript/lexer.py` | — | No `1_000_000` or `1e6` numeric literal support | MISS | Add regex |
| C97 | `integrations/twitter.py` | — | Twitter API v2 4-tuple keys — no rotation mechanism | MISS | Add key rotation |
| C98 | `alembic/env.py` | — | Offline mode uses sync `engine_from_config` — async app uses wrong driver | BUG | Use `connectable.connect()` properly |
| C99 | `analyzers/mmc/mmc_adapter.py` | — | Backtrader→modern translation — likely lossy | ARCH | Verify translation |

### C4 🟢 LOW / Polish

| # | File | Line | Issue | Cat | Fix |
|---|------|------|-------|-----|-----|
| C100 | `persistence/migrate.py` | — | Likely orphaned — check if wired into `init_db` | DEAD | Verify |
| C101 | `core/state.py` | — | Doesn't exist in `core/` — state logic is actually in `api/state.py` | MISS | Document or move |
| C102 | `execution/order.py` | 227,233 | `return` with no value inside property setter — may skip cleanup | BUG | Verify |
| C103 | `signals/indicators/smc.py` | — | SMC may not handle market gaps/halts — edge case | BUG | Document |
| C104 | `signals/alpha_zoo/registry.py` | 123 | `ast.literal_eval(meta_node)` — fragile | ARCH | Use typed config |
| C105 | `signals/alpha_zoo/registry.py` | 123,296 | If alpha loads from disk at import time — syntax error kills app | BUG | Lazy load |
| C106 | `pyproject.toml` | — | No upper bound on `numpy`/`pandas` — Pandas 3.0 breaks type hints | DEP | Pin |
| C107 | `pyproject.toml` | — | All optional deps unpinned — `pip install .[all]` may break | DEP | Pin with `~=` |
| C108 | `llm/client.py` | — | 12 providers, inconsistent retry policies | ARCH | Centralize |
| C109 | `alembic/env.py` | 19 | Only imports one models file — others missed | BUG | Import all model modules |

---

## SUMMARY

| Layer | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | Total |
|-------|------------|---------|-----------|--------|-------|
| **Frontend** | 15 | 24 | 15 | 6 | **60** |
| **API Routes** | 33 | 47 | 28 | 8 | **116** |
| **Core Subsystems** | 20 | 45 | 27 | 17 | **109** |
| **TOTAL** | **68** | **116** | **70** | **31** | **285** |

### By Category

| Bug | Security | Stub | Performance | UX | Missing | Architecture | Deprecation | Race | Leak | Dead |
|-----|----------|------|-------------|----|---------|-------------|-------------|------|------|------|
| 107 | 21 | 20 | 29 | 16 | 24 | 28 | 14 | 7 | 9 | 10 |

> Note: Some issues span multiple subcategories; counted by primary category.



















-------------------------------
















TIER 1 — Critical (financial safety / data integrity) — Days 1-3
1. Fix logger import in api/routes/orders.py:83
NameError on first order load. Add import logging; logger = logging.getLogger(__name__).
2. Remove fake WS orderbook + trades in api/routes/ws.py:163-229
Currently emits random.uniform() bids/asks/trades. Wrap in if settings.DEV_MODE: and add [SIMULATED] tag; real mode returns last-known book or empty snapshot.
3. Add DEV_MODE flag in config/
Centralize all mock switches. Add settings.DEV_MODE = bool(os.getenv("DEV_MODE")). Default True until real data wired.
4. Strip Math.random from OrderBook.tsx, TimeAndSales.tsx, AdvancedCharts.tsx
Show "Live data unavailable — set DEV_MODE=false" instead of fake data.
5. Hardcoded NEWS_ROTATION in BreakingNewsBanner.tsx:13-29
Replace with fetch('/api/market/news') (the route already exists). Add empty state.
6. Fix Route mismatch /chart vs /markets/chart in 3 places
Signals.tsx:144, WatchlistPage.tsx:88, StockSearch.tsx:72.
7. Fix SignalsStream plural param mismatch
FE sends ?symbol= BE expects ?symbols=. (SignalsStream.tsx:35-37 vs signals_stream.py:72-77).
8. Wire AuditLogPage to /api/audit/logs (currently stub returning [])
Even just persisting the in-memory list to JSON file is fine for dev mode. Add empty-state message either way.
9. Fix LivePricesContext contract mismatch
/ws/prices returns only {price}. Frontend reads change, changePercent, volume, marketCap. Add server-side fields or strip from frontend types. Currently causes NaN everywhere.
10. OrderEntryPanel — sync props on symbol change
Use useEffect to update symbol/price when props change. Currently stale after watchlist click.
11. cfa.py:486-511 bond/one-pager signature mismatch — runtime TypeError
dur.calculate_modified(face, coupon, ytm, freq, frequency=freq) — wrong arg order.
12. alpha_zoo_routes.py:131-135 ic/rank_ic/ret all compute Pearson
Wrong parens — spearman kwarg never applied. Three metrics mis-named.
13. screener_routes.py:239 sort key puts non-matches first
(False, …) > (True, …) after reverse=True. Bug — breaks scan results.
14. signals_stream.py:32 engine filter unreliable
enum in [str] always False. Fix comparison.
15. paper.py:166 SELL only matches SELL positions
A buy-to-close creates a new short position instead of closing the long. Real money bug.
TIER 2 — Wiring / dead routes — Days 3-5
16. Wire swarm_routes._execute_run_tasks into POST /swarm/runs
Function defined at line 61, never called. Runs sit in pending forever.
17. Wire OrderEntryPanel and LiveTradingWizard to real broker endpoints
Currently no submit handler. Add /api/broker/test and POST /api/broker/connect stubs (dev-mode = store in memory, return success).
18. PersonaCouncil SSE parser — chunk.split('\n') drops multi-line events
Use /\r?\n/ and properly handle data: prefix accumulation.
19. PersonaCouncil field name mismatch agentKey vs agent_key
Backend expects snake_case. Frontend sends camelCase. Council always falls back to single agent.
20. Two event bus implementations
utils/eventBus.ts (singleton) vs contexts/EventBusContext.tsx (provider). Pick one. The stores emit to singleton, components subscribe via context — they never meet.
21. Register 6 orphaned routes in sidebar
/settings/audit-log, /settings/bots, /ai/hedge-flow, /trading/live, /data/china-markets, /data/workflows — routes exist, no nav link.
22. Build 4 empty page placeholders
Alerts.tsx, BotsPage.tsx, WorkflowPage.tsx, ChinaMarketsPage.tsx are 11-13 line stubs. Either implement or remove from sidebar.
23. Hardcoded strategy: 'hybrid' in StrategyLab.tsx:27
Form has a strategy selector but always sends 'hybrid'. Pass real value.
24. signals.py:88-101 body.get("symbol", "AAPL") swallows empty string
Reject empty symbol with 400.
25. LiveTradingWizard — no submit wiring (15 minutes)
Just POST the form to a new /api/broker/save endpoint and toast success.
TIER 3 — Real-time / streaming fixes — Days 5-7
26. signals.py duplicate route registration
GET /signals/ + GET /signals/latest rely on redirect_slashes=True which breaks SSE. Use distinct paths.
27. /stream/live blocks event loop with sync yfinance
Wrap in asyncio.to_thread. Cache 30s per symbol.
28. LivePricesContext.maxRetries: 999 reconnect storm
Cap at 20, exponential backoff, document.visibilitychange pause.
29. connectDashboardSSE race — esRef.current === es check fails after first reconnect
Silent SSE death after network blip.
30. connectDashboardSSE returns hand-rolled object cast as EventSource
Missing addEventListener, onmessage, onerror. Will break any consumer that uses standard API.
31. dedupGet doesn't cancel on unmount
Shared promise resolves after component unmount → setState warning.
32. StatusBar fetch('/api/health') bypasses VITE_API_BASE
404 in production deploys. Use api.get('/health').
33. StatusBar polls /api/signals/latest every 30s
With 1000 symbols, blocks event loop. Cache on BE side or stream.
34. MarketTickerBar re-fetches 29 symbols every 5s, no dedup or abort
Add AbortController + visibility pause + dedup.
35. fetchOHLCV cache has no AbortController
Symbol change race — stale response wins. Add signal to chain.
36. MultiTimeframeOverlay fetches have no abort
4 HTF fetches with no cleanup. Leak on toggle.
37. signals.ts 5s polling with no abort or visibility pause
Standard pattern of frontend abuse. SSE instead.
38. app_state.portfolio_history datetime.utcnow() deprecation
97 sites across codebase. Will break on 3.13+.
39. api/state.py:130-216 sync property getters create new event loops
Deadlock / RuntimeError. Refactor or document threading model.
40. agents/llm/base.py:42-47 same ThreadPoolExecutor(max_workers=1) per call
Use module-level executor.
TIER 4 — Chart engine / drawing tools — Days 7-10
41. renderSingle in SignalTimelineRenderer.ts:189 uses stub mapperPriceY
All signal markers plot at canvas center. Pass real CoordMapper.
42. DrawingSnap.findNearestPrice uses pixel as array index
data[Math.round(crosshairX)] works by accident for 1000 bars, fails for 6000+. Use mapper.xToTime.
43. Chart.tsx:333-367 grid math hardcodes 60-second bucketing
1d/1w/1m intervals all get 1-minute bars. Use intervalToSeconds().
44. ChartContainer.tsx:75-93 missing area series handler
type='area' silently does nothing. Add else if branch.
45. ChartContainer.tsx:57-66 CSS var fallbacks invalid
fallback: 'var(--chart-bg)' — chart lib receives literal string. Use real hex fallbacks.
46. ChartContainer.tsx:101 recreates chart on onCrosshairMove change
Inline arrow → effect re-runs every render. Use ref.
47. ChartTheme.ts only handles dark/light
ThemeContext has 7 themes. matrix/amber/cyber/terminal all map to dark chart.
48. chartStore.theme typed 'dark' | 'light' but context has 7
Type mismatch — dead store field.
49. Chart.tsx:357-365 volume doubles on duplicate WS tick
No tick-id dedup. Cumulative corruption.
50. EquityCurveChart / VolumeProfile Math.min(...arr) stack overflow
100k points = RangeError. Use reduce.
51. WorkspaceDetacher opens non-existent detached-chart.html
window.open + document.write of a file that doesn't exist. Either inline the HTML or remove the feature.
52. DrawingManager onChanged callback stack grows unbounded
Each handleEngineReady adds a closure; old ones never removed. Reset before binding.
53. Chart.tsx "Patterns" button toggles state never rendered
setShowPatterns flips, no JSX consumes it. Either render or remove.
54. Chart.tsx "Detect Levels" returns count but never draws
setLevels(lvls) updates badge, no engine.setLevels(). Feature is a lie.
55. TimeAndSales setTimeout chain leak
scheduleRef reassigned in inner callback; cleanup kills wrong timer. Use ref.
TIER 5 — Bloomberg-grade feature additions — Days 10-14
56. Bloomberg-style Command Palette (Cmd+K)
Global fuzzy search across symbols, pages, actions. Already stubbed in CommandPalette.tsx — wire it.
57. Multi-monitor workspace detaching (real)
Generate the actual detached-chart.html via Vite multi-page entry. Currently WorkspaceDetacher is a lie.
58. Real-time Options chain
Add /api/options/chain/{symbol} route. Render greeks/IV/OI in a Bloomberg-style table. Currently no UI.
59. Sector heatmap with drill-down
RiskDashboard.tsx already has the structure but return field never populated. Wire sector_map.get_sector_exposures() to compute it.
60. Earnings calendar + dividend feed
Add /api/calendar/earnings and /api/calendar/dividends routes (Finnhub has both). Render in a dedicated /markets/calendar page.
Implementation order (3 weeks)
Week	Tier	Goal
1	Tier 1 + 2	Fix everything that breaks immediately
2	Tier 3 + 4	Real-time + chart engine usable
3	Tier 5	Bloomberg-grade additions
Top 5 quick wins (do first, < 1 hour each)
1. api/routes/orders.py — add import logging; logger = logging.getLogger(__name__) (#1)
2. config/__init__.py — add DEV_MODE flag + .env.example entry (#3)
3. ws.py — gate ws_orderbook/ws_trades on DEV_MODE, return real empty payload otherwise (#2)
4. api/routes/cfa.py:486-511 — fix the duplicate frequency arg in bond/one-pager (#11)
5. BreakingNewsBanner.tsx — replace hardcoded array with fetch('/api/market/news') (#5)
Out of scope (not in this round)
- DB migration (deferred per your call)
- Auth beyond local-only
- Adding new LLM providers
- Full mobile responsive
- i18n
- Test coverage (currently 0; recommend adding a smoke test in week 3)
