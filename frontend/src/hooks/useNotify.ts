import { useCallback } from 'react'
import { useToastStore, type ToastType } from '../store/toast'

export function useNotify() {
  const addToast = useToastStore((s) => s.addToast)

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast])
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast])
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast])
  const warn = useCallback((msg: string) => addToast(msg, 'warning'), [addToast])

  return { success, error, info, warn }
}
