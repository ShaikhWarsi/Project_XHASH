import { useEffect, useRef, useCallback, useState } from 'react'
import { createSyncChannel, getTabId, setPrimaryTabId, TE_SYNC, type SyncEvent } from '../utils/broadcastChannels'

interface UseMultiWindowOptions {
  onEvent?: (event: SyncEvent) => void
}

export function useMultiWindow(options?: UseMultiWindowOptions) {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const tabIdRef = useRef(getTabId())
  const [lastEvent, setLastEvent] = useState<SyncEvent | null>(null)

  useEffect(() => {
    const tabId = tabIdRef.current
    const channel = createSyncChannel(TE_SYNC)
    channelRef.current = channel

    if (channel) {
      channel.onmessage = (event: MessageEvent) => {
        const syncEvent = event.data as SyncEvent
        if (syncEvent.tabId === tabId) return
        setLastEvent(syncEvent)
        options?.onEvent?.(syncEvent)
      }
    }

    const existing = getPrimaryTabId()
    if (!existing) {
      setPrimaryTabId(tabId)
    }

    return () => {
      if (channel) {
        channel.onmessage = null
        channel.close()
      }
    }
  }, [options])

  const broadcast = useCallback((type: SyncEvent['type'], payload: Record<string, unknown> = {}) => {
    if (!channelRef.current) return
    const event: SyncEvent = {
      type,
      payload,
      tabId: tabIdRef.current,
      timestamp: Date.now(),
    }
    channelRef.current.postMessage(event)
  }, [])

  return { broadcast, lastEvent, tabId: tabIdRef.current }
}
