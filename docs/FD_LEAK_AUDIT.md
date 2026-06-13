# FD Leak Audit — X_KA_HASH

## Current State

### Async SQLAlchemy Engines
- `persistence/database.py` — Primary engine (`_engine`) for `trading_engine.db`
  - ✅ Uses `NullPool` for SQLite URLs (configured)
  - ✅ `close_db()` calls `engine.dispose()` on shutdown
- `persistence/multi_db.py` — Multi-database for logs, latency, health, sandbox, auth
  - ✅ Uses `NullPool` for all SQLite URLs (configured)
  - ✅ `close_all()` disposes all engines on shutdown
- All engines are created once at startup and reused as singletons

### httpx Client Singletons
- `api/utils/httpx_client.py` — Shared singleton pattern
  - ✅ `get_async_client()` returns module-level singleton
  - ✅ `get_sync_client()` returns module-level singleton
  - ✅ `cleanup()` properly calls `.aclose()` / `.close()`
  - ⚠️ `api/routes/tradingagents_routes.py:259` creates ad-hoc `httpx.AsyncClient(timeout=5)` — should use `get_async_client()` to avoid FD leaks
  - ⚠️ `api/routes/health_routes.py:24` uses `httpx.get()` (sync, ad-hoc) — should use `get_sync_client()`

### Subprocess Management
- `api/services/python_strategy_service.py` — Python Strategy Host
  - ✅ `_launch_strategy()` spawns subprocess with `subprocess.Popen`
  - ✅ `stop_strategy()` sends SIGTERM, fallback SIGKILL after timeout
  - ✅ `_reap_dead_strategies()` periodically cleans zombie processes
  - ✅ Uses `subprocess.PIPE` for stdout/stderr — read loop prevents buffer deadlock
- `openalgo-main/blueprints/python_strategy.py` — Legacy Python Strategy Host
  - ⚠️ Similar subprocess management but uses `log_handle` (file handle) passed to child — ensure parent closes its copy after fork

### File Handle Usage (`open()`)
All `open()` calls in `api/` use context managers (`with open(...) as f:`), so they are safe:
- `api/services/workflow/graph.py` — workflow JSON persistence
- `api/services/swarm/store.py` — swarm state persistence
- `api/services/motd_service.py` — MOTD file I/O
- `api/services/hypotheses/registry.py` — hypotheses config I/O
- `api/services/backtest_cache.py` — cache file I/O
- `api/routes/workspace_routes.py` — workspace config I/O
- `api/routes/prompts.py` — prompts file I/O
- `api/routes/orders.py` — orders file I/O
- `api/routes/finscript.py` — script file I/O

### ThreadPoolExecutor / ProcessPoolExecutor
- `api/state.py` — `ThreadPoolExecutor(max_workers=1)` — module-level, reused
- `api/agent_jobs.py` — `ThreadPoolExecutor` — lazy singleton via `_get_executor()`
- `agents/llm/base.py` — `ThreadPoolExecutor(max_workers=1)` — module-level, reused
- All others in `openalgo-main/` are either module-level singletons or used with `with` context manager

## Known Safe Patterns
- **httpx**: `get_async_client()` returns singleton, `cleanup()` on shutdown
- **WebSocket**: `ConnectionManager` tracks connections, cleanup on disconnect
- **Flow executor**: no per-request clients (uses shared httpx client via `get_async_client()`)
- **Database**: all engines use `NullPool` for SQLite, disposed on shutdown
- **File I/O**: all uses context managers — no leaked file handles

## Open Items
- [ ] `api/routes/tradingagents_routes.py:259` — ad-hoc `httpx.AsyncClient` should be replaced with `get_async_client()`
- [ ] `api/routes/health_routes.py:24` — ad-hoc `httpx.get()` should use `get_sync_client()`
- [ ] Verify `openalgo-main/blueprints/python_strategy.py` closes parent-side `log_handle` after `Popen`

## Best Practices
1. Always use `get_async_client()` / `get_sync_client()` instead of creating ad-hoc httpx clients
2. WebSocket connections are tracked by `ConnectionManager` — ensure disconnect cleanup
3. Subprocesses used by Python Strategy Host are managed and reaped
4. SQLite connections should use `NullPool` (not `QueuePool`) to avoid FD leaks
5. All `open()` calls should use context managers (`with` statement)
6. ThreadPoolExecutor should be module-level singletons, not created per-request
