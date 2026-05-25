import { useCallback, useRef } from 'react'

export function createUndoRedo<T>(initial: T) {
  const past: T[] = []
  const future: T[] = []
  let present = initial

  return {
    get present() { return present },
    push: (state: T, _description = 'action') => {
      past.push(present)
      future.length = 0
      present = state
    },
    undo: (): T | null => {
      if (past.length === 0) return null
      future.push(present)
      present = past.pop()!
      return present
    },
    redo: (): T | null => {
      if (future.length === 0) return null
      past.push(present)
      present = future.pop()!
      return present
    },
    get canUndo() { return past.length > 0 },
    get canRedo() { return future.length > 0 },
    reset: (state: T) => {
      past.length = 0
      future.length = 0
      present = state
    },
    get historySize() { return past.length },
  }
}

export function useUndoRedo<T>(initial: T) {
  const stackRef = useRef(createUndoRedo(initial))

  const push = useCallback((state: T, description?: string) => {
    stackRef.current.push(state, description)
  }, [])

  const undo = useCallback((): T | null => {
    return stackRef.current.undo()
  }, [])

  const redo = useCallback((): T | null => {
    return stackRef.current.redo()
  }, [])

  const reset = useCallback((state: T) => {
    stackRef.current.reset(state)
  }, [])

  return {
    undoStack: stackRef.current,
    push,
    undo,
    redo,
    reset,
    canUndo: stackRef.current.canUndo,
    canRedo: stackRef.current.canRedo,
  }
}
