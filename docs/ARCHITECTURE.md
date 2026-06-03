# Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Frontend (React + TypeScript)                       │
│   Dashboard │ Portfolio │ Signals │ Chart │ Backtest                 │
│   Agents (Council) │ Hedge Flow │ Risk │ Settings                    │
│   Right Sidebar (News/Calendar/Chat/Co-Move/Earnings)                │
│   AI Features (Briefing/Strategy/Indicator/Inspector/Terminal)        │
│   Multi-Window │ Distraction-Free │ DnD (Symbol/Price/Date)          │
└───────────────────────────┬─────────────────────────────────────────┘
                           │ REST + SSE + WebSocket + BroadcastChannel
┌───────────────────────────▼─────────────────────────────────────────┐
│                   FastAPI REST API                                    │
│   60+ Endpoints | JWT Auth | SSE Streaming | WebSocket               │
│   LLM (complete + streaming) | AI (7 feature endpoints)              │
└───────┬───────────┬───────────┬───────────┬─────────────────────────┘
        │           │           │           │
┌───────▼───┐ ┌─────▼─────┐ ┌───▼───┐ ┌───▼──────────┐
│  Signals   │ │  Agents   │ │ Risk  │ │  Execution   │
│   23+      │ │  16 HF    │ │Engine │ │  Backtest    │
│   Engines  │ │  8 Quant  │ │Limits │ │  Paper       │
│   Regime   │ │  8 LLM    │ │Stops  │ │  Alpaca      │
│   ML       │ │Renaissance│ │Sizing │ │  CCXT/IBKR   │
└───────────┘ └───────────┘ └───────┘ └──────────────┘
```

## Directory Structure — New Additions

```
trading-engine/
├── api/                       # FastAPI application
│   ├── app.py                # 60+ router registrations
│   ├── routes/
│   │   ├── llm.py            # GET /llm/models, POST /llm/complete, POST /llm/complete-stream
│   │   ├── briefing.py       # GET /api/ai/briefing — market + portfolio LLM briefing
│   │   ├── network_co_movement.py # POST /api/ai/co-movement — news-driven correlation
│   │   ├── earnings_summary.py    # POST /api/ai/earnings-summary — bull/bear/risk extraction
│   │   ├── ai_strategy.py    # POST /api/ai/generate-strategy + evaluate-strategy
│   │   ├── ai_indicator.py   # POST /api/ai/generate-indicator — JS plugin code gen
│   │   ├── ai_inspector.py   # POST /api/ai/inspect-pattern — streaming pattern analysis (SSE)
│   │   └── llm_query.py      # POST /api/llm/query — portfolio-aware NL queries
│   │
│   └── services/
│       ├── agent_service.py  # Agent registry, persona lookup
│       ├── motd_service.py   # Config-driven message-of-the-day
│       └── chat_service.py   # In-memory chat broadcast
│
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── api/
│   │   │   └── llm.ts        # All LLM + AI API functions (15 exported functions)
│   │   │
│   │   ├── components/
│   │   │   ├── AIBriefing.tsx          # Modal overlay with portfolio+market briefing
│   │   │   ├── StreamResponse.tsx      # Reusable SSE streaming text renderer
│   │   │   ├── NewsCoMovement.tsx      # Headline → correlated tickers panel
│   │   │   ├── EarningsSummary.tsx     # Earnings transcript summary panel
│   │   │   ├── StrategyGenerator.tsx   # NL → FinScript → review → backtest
│   │   │   ├── IndicatorGenerator.tsx  # NL → JS indicator → add to chart
│   │   │   ├── AIInspector.tsx         # Streaming pattern analysis modal
│   │   │   ├── LLMPanel.tsx            # Updated: General Chat + Ask Terminal modes
│   │   │   ├── StatusBar.tsx           # Updated: BRIEF button in status bar
│   │   │   └── rightsidebar/
│   │   │       ├── RightSidebar.tsx    # 5 tabs: News, Calendar, Chat, Co-Move, Earnings
│   │   │       ├── NewsPanel.tsx       # Yahoo Finance + Market Intel headlines
│   │   │       ├── CalendarPanel.tsx   # Macro events + earnings + dividends
│   │   │       └── ChatPanel.tsx       # WebSocket team/AI chat
│   │   │
│   │   ├── contexts/
│   │   │   ├── DistractionFreeContext.tsx  # Ctrl+Shift+D chrome toggle
│   │   │   ├── MultiWindowContext.tsx      # BroadcastChannel cross-tab sync
│   │   │   └── SymbolDragContext.tsx       # Native DnD for symbol dragging
│   │   │
│   │   ├── hooks/
│   │   │   ├── useMultiWindow.ts          # BroadcastChannel hook
│   │   │   └── useHeldTickers.ts          # Portfolio dedup ticker hook
│   │   │
│   │   └── utils/
│   │       ├── broadcastChannels.ts       # Channel name constants + getTabId()
│   │       └── tickSound.ts              # Web Audio API tick chirp
```

## AI Feature Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LLM Infrastructure                             │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │ /llm/complete│   │ /llm/complete│   │ /llm/models              │ │
│  │ (POST)       │   │ -stream (POST)│   │ (GET)                    │ │
│  │ Non-streaming│   │ SSE streaming│   │ Model listing             │ │
│  └──────┬───────┘   └──────┬───────┘   └──────────────────────────┘ │
│         │                  │                                         │
└─────────┼──────────────────┼─────────────────────────────────────────┘
          │                  │
┌─────────▼──────────────────▼─────────────────────────────────────────┐
│                        AI Feature Endpoints                           │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Briefing │  │Co-Move   │  │Earnings  │  │Strategy  │  │Indicator││
│  │ GET      │  │POST      │  │POST      │  │POST      │  │POST     ││
│  └──────────┘  └──────────┘  └──────────┘  └─────┬────┘  └────┬───┘│
│                                                    │            │    │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────▼────────────▼──┐│
│  │Inspector │  │LLM Query │  │  /ai/generate + /ai/evaluate        ││
│  │POST(SSE) │  │POST      │  │  (Strategy + Indicator)             ││
│  └──────────┘  └──────────┘  └────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow — All AI Features

```
User Action                    Backend                          LLM Provider
     │                            │                                │
     ├─ Briefing button ──────>  GET /api/ai/briefing ──────>  OpenAI GPT-4o-mini
     │                            │  gather: portfolio,          │
     │                            │  regime, movers, risk        │
     │                            │<──── formatted briefing ─────┘
     │                            │
     ├─ Send query ───────────>  POST /api/llm/query ────────>  OpenAI GPT-4o-mini
     │  (LLMPanel Data Mode)      │  inject: portfolio,          │
     │                            │  risk, trades context        │
     │                            │<──── data-driven answer ─────┘
     │
     ├─ Describe strategy ────>  POST /api/ai/generate-strategy  OpenAI GPT-4o
     │  (StrategyGenerator)       │<──── FinScript code ──────────┘
     │  Review → Run ─────────>  POST /api/ai/evaluate-strategy
     │                            │  finscript.execute(code, data)
     │                            │<──── trades + metrics ───────
     │
     ├─ Describe indicator ───>  POST /api/ai/generate-indicator  OpenAI GPT-4o
     │  (IndicatorGenerator)      │<──── JavaScript code ─────────┘
     │  Add to Chart              │  registerPlugin() at runtime
     │
     ├─ Inspect pattern ──────>  POST /api/ai/inspect-pattern    OpenAI GPT-4o
     │  (AIInspector)             │  SSE stream ──────────────>  streaming tokens
     │<───── streaming text ──────┘<────────────────────────────┘
     │
     ├─ Co-Move headline ─────>  POST /api/ai/co-movement ────>  OpenAI
     │  (NewsCoMovement)          │<──── correlated tickers ──────┘
     │
     └─ Paste transcript ─────>  POST /api/ai/earnings-summary    OpenAI
        (EarningsSummary)          │<──── bull/bear/risk ──────────┘
```

## Multi-Window Architecture

```
Window A                         BroadcastChannel('te-sync')    Window B
    │                                   │                          │
    ├─ Theme Change ─────────────────>  │  > THEME_CHANGED ───────>  theme sync
    ├─ Symbol Change ────────────────>  │  > SYMBOL_CHANGED ──────>  symbol sync
    └─ Backtest Complete ───────────>  │  > BACKTEST_COMPLETE ───>  notification
                                       │
    Each window filters its own messages via tabId to prevent echo loops
```

## Drag-and-Drop Architecture

```
Source Components         MIME Types                     Drop Targets
    │                        │                              │
SymbolSearch ───────────>  text/plain ──────────────────>  DropZone(kind="chart")
PriceDragSource ────────>  application/x-price-level ──>  PriceDragTarget (Alert)
DateDragSource ─────────>  application/x-date ─────────>  DateDropTarget (Backtest)
    │                                                      OrderEntry
    │                                                      Compare
```

## Right Sidebar Architecture

```
RightSidebar (320px fixed, CSS transition)
├── News tab        → NewsPanel       → POST /api/news/for-tickers
├── Calendar tab    → CalendarPanel   → POST /api/calendar/today
├── Chat tab        → ChatPanel       → WS /ws/chat
├── Co-Move tab     → NewsCoMovement  → POST /api/ai/co-movement
└── Earnings tab    → EarningsSummary → POST /api/ai/earnings-summary
```

## Core Data Flow

```
Market Data → Signal Engines → Signals → Agent Analysis
                                    ↓
                              Risk Engine ←→ Portfolio State
                                    ↓
                              Order Execution
                                    ↓
                              Trade Recording
                                    ↓
                              Analytics & Reporting
```

## Signal Pipeline

1. **Data Ingestion**: Bars, quotes, order book
2. **Preprocessing**: Indicator calculation, normalization
3. **Signal Generation**: Pattern recognition, regime detection
4. **Composite**: Multi-signal aggregation
5. **Scoring**: Confidence and strength assignment
6. **Output**: QuantSignal objects with metadata

## API Design

- **REST**: Synchronous requests/responses
- **SSE**: Real-time streaming (dashboard updates, AI pattern inspection)
- **WebSocket**: Market data streaming, chat
- **BroadcastChannel**: Cross-tab synchronization (themes, symbols, backtest)
- **Authentication**: JWT + API Key support
- **Rate Limiting**: 100 requests/minute default

## State Management

- **Frontend**: Zustand stores for UI state
- **Multi-Window**: BroadcastChannel API (same-origin only, no server)
- **Backend**: In-memory state + SQLAlchemy persistence
- **Real-time**: SSE push to connected clients

## Environment Variables for AI Features

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | For AI features | Powers all 7 AI endpoints + streaming |
| `ANTHROPIC_API_KEY` | Alternative | Used when OpenAI key unavailable |
