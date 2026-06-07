# Zustand Store Contract

## Principles

1. **Single responsibility** — each store owns one domain
2. **No cross-store imports** — stores never import other stores
3. **Cross-store communication** — via `eventBus` from `utils/eventBus`
4. **Versioned persistence** — use `zustand/middleware` `persist` with `version` field
5. **No default exports** — always named export `useXxxStore`

## Store List

| Store | Persisted | Version | Key |
|-------|-----------|---------|-----|
| chartStore | No | 1 | — |
| signals | Yes (partial) | 1 | te-signals-storage |
| portfolio | Yes | 1 | te-portfolio-storage |
| backtest | Yes (config only) | 1 | te-backtest-config |
| agents | Yes | 1 | te-agents-storage |
| toast | No | — | — |
| connection | No | — | — |
| paperTrading | Yes | 1 | te-paper-trading |
| alerts | Yes | 1 | te-alerts-storage |
| workflows | Yes | 1 | te-workflows-storage |

## Adding Persistence

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useMyStore = create<MyStore>()(
  persist(
    (set, get) => ({
      // ... implementation
    }),
    {
      name: 'te-my-store',
      version: 1,
      migrate: (state: unknown) => state as Partial<MyStore>,
    },
  ),
)
```

## Migrations

When the store shape changes, increment the `version` field and implement `migrate`:

```ts
migrate: (state: unknown, version: number) => {
  if (version === 0) {
    // transform old shape to new shape
    return { ...state as any, newField: 'default' }
  }
  return state as Partial<MyStore>
}
```

## Event Bus

Events are defined in `utils/eventBus.ts`:

- `SIGNAL_SELECTED` — a signal was clicked
- `SYMBOL_CHANGED` — symbol changed in any tab
- `PORTFOLIO_UPDATED` — portfolio/metrics updated
- `REGIME_CHANGED` — market regime changed
- `BACKTEST_COMPLETE` — backtest finished
- `ORDER_PLACED` — order submitted
- `THEME_CHANGED` — theme toggled
- `TAB_CHANGED` — navigation tab changed
- `REFRESH_REQUESTED` — data refresh needed

Usage:

```ts
import { eventBus, EVENTS } from '../utils/eventBus'

// Emit
eventBus.emit(EVENTS.PORTFOLIO_UPDATED, portfolioData)

// Subscribe (returns unsubscribe fn)
const unsub = eventBus.on(EVENTS.PORTFOLIO_UPDATED, (data) => { ... })
```

## Time-Travel Debugging

Use `useStoreSnapshot` hook:

```ts
import { useStoreSnapshot, startStoreRecording } from '../hooks/useStoreSnapshot'

// Start recording
startStoreRecording()

// In component
const { record, restore, getHistory } = useStoreSnapshot()
record('before action')
// ... do something
const history = getHistory()
restore(0) // restore first snapshot
```
