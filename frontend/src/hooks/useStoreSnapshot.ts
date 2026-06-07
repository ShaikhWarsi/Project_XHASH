import { useCallback, useRef } from 'react'
import { useChartStore } from '../store/chartStore'
import { useSignalStore } from '../store/signals'
import { usePortfolioStore } from '../store/portfolio'
import { useBacktestStore } from '../store/backtest'
import { useAgentStore } from '../store/agents'
import { useToastStore } from '../store/toast'

interface StoreSnapshot {
  timestamp: number
  label: string
  stores: {
    chart: ReturnType<typeof useChartStore.getState>
    signals: ReturnType<typeof useSignalStore.getState>
    portfolio: ReturnType<typeof usePortfolioStore.getState>
    backtest: ReturnType<typeof useBacktestStore.getState>
    agents: ReturnType<typeof useAgentStore.getState>
  }
}

const MAX_HISTORY = 50
let _snapshotHistory: StoreSnapshot[] = []
let _isRecording = false

export function startStoreRecording() {
  _isRecording = true
  _snapshotHistory = []
}

export function stopStoreRecording(): StoreSnapshot[] {
  _isRecording = false
  return [..._snapshotHistory]
}

export function takeStoreSnapshot(label = 'auto'): StoreSnapshot | null {
  if (!_isRecording) return null
  const snapshot: StoreSnapshot = {
    timestamp: Date.now(),
    label,
    stores: {
      chart: useChartStore.getState(),
      signals: useSignalStore.getState(),
      portfolio: usePortfolioStore.getState(),
      backtest: useBacktestStore.getState(),
      agents: useAgentStore.getState(),
    },
  }
  _snapshotHistory.push(snapshot)
  if (_snapshotHistory.length > MAX_HISTORY) {
    _snapshotHistory.shift()
  }
  return snapshot
}

export function getSnapshotHistory(): StoreSnapshot[] {
  return _snapshotHistory
}

export function useStoreSnapshot() {
  const snapshotsRef = useRef<StoreSnapshot[]>([])

  const record = useCallback((label?: string) => {
    const snap = takeStoreSnapshot(label)
    if (snap) snapshotsRef.current = [..._snapshotHistory]
    return snap
  }, [])

  const clear = useCallback(() => {
    _snapshotHistory = []
    snapshotsRef.current = []
  }, [])

  const restore = useCallback((index: number) => {
    const snap = _snapshotHistory[index]
    if (!snap) return
    useChartStore.setState(snap.stores.chart)
    useSignalStore.setState(snap.stores.signals)
    usePortfolioStore.setState(snap.stores.portfolio)
    useBacktestStore.setState(snap.stores.backtest)
    useAgentStore.setState(snap.stores.agents)
  }, [])

  return { snapshots: snapshotsRef, record, clear, restore, getHistory: getSnapshotHistory }
}
