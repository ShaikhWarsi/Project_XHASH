# Component Decomposition Plan

## 1. Chart.tsx (1932 lines) → 5 components

**ChartHeader** - Top bar areas:
- MarketTickerBarEnhanced + ChartToolbar + LayoutPresets + secondary toolbar (timeframe, compare, indicators, settings, layout, theme) + comparison chips

**ChartSidebar** - Indicator settings drawer panel (lines 1224-1255)

**ChartBody** - Main chart area (DropZone → MultiChartGrid + loading/error + indicators + inline pickers/params + portals + overlays)

**ChartFooter** - Everything below the chart:
- OHLC title bar (symbol, price, change, OHLCV, snapshot, presets, period pills)
- ChartLegend + bottom toolbar rail + SignalTimeline + TimeMachine
- Status bar with all toggle buttons (Alert through Workspace)
- Popup panels (ObjectTree, Templates, LayerPanel, Workspace, Patterns, Levels, Export menu, Library menu, DrawingProperties)

**ChartPanels** - Modal overlay panels:
- Technical Analysis, Correlation, Signals widget, SymbolSearch, OrderEntry, AlertDialog, ScriptEditor, ContextMenu, ShortcutsOverlay

## 2. ChartEngine.ts (695 lines) → 4 classes

Create `frontend/src/components/chart/engine/`:
- **ChartCore.ts** — construction, destroy, resize, theme, chart + overlay canvas creation
- **ChartDataManager.ts** — series management (main/volume/indicators), setData, updateLastBar, add/removeIndicator, seekToIndex
- **ChartOverlayRenderer.ts** — renderOverlay, drawSignalMarkers, drawRegimeZones, drawStructureOverlay, requestRender
- **ChartDrawingController.ts** — setupCanvasEvents (mousedown/mousemove/mouseup/dblclick), clickHandler, passThrough, selectTool, snapToOHLC, makeDrawingEvent

ChartEngine.ts becomes a compose wrapper delegating to the 4 classes.
Types (SignalMarker, StructureOverlay, RegimeZone, ChartOptions, ChartCallbacks) → `engine/types.ts`

Importers of ChartEngine (MultiChartGrid, SignalTimeline, SignalTimelineIntegrated, pages/Chart, pages/Structure) keep working via re-exports.

## 3. DrawingManager.ts (410 lines) → separate storage/IO

- **DrawingStorage.ts** — saveToStorage, loadFromStorage, migrateStorage, saveToLibrary, loadFromLibrary, listLibraries
- **DrawingHistory.ts** — saveHistory, undo, redo, canUndo, canRedo, restoreSnapshot

## 4. ChartContainer.tsx (244 lines) → use existing hook

- `useChartFullscreen` hook already exists — use it in ChartContainer to reduce inline fullscreen logic
- `ChartAnnotations` already separate

## Execution Order

1. Create `engine/types.ts` — extract SignalMarker, StructureOverlay, RegimeZone, ChartOptions, ChartCallbacks
2. Create `engine/ChartCore.ts`, `ChartDataManager.ts`, `ChartOverlayRenderer.ts`, `ChartDrawingController.ts`
3. Rewrite `ChartEngine.ts` as compose wrapper
4. Create `drawings/DrawingStorage.ts`, `drawings/DrawingHistory.ts`
5. Refactor `DrawingManager.ts` to use extracted classes
6. Create `ChartHeader.tsx`, `ChartBody.tsx`, `ChartSidebar.tsx`, `ChartFooter.tsx`, `ChartPanels.tsx`
7. Reduce `pages/Chart.tsx` to use new components
8. Clean up `ChartContainer.tsx` — use existing useChartFullscreen hook

## Backward Compatibility

- `ChartEngine` class must remain the default export from `components/chart/ChartEngine` (re-export)
- Types must be exported from same location
- DrawingManager stays as default export from `drawings/DrawingManager` (just thinned out)

## Verification

- `npm run build` passes
- Chart page renders without visual regressions
- All imports resolve (ChartEngine used in 5 files, ChartContainer in 2)
