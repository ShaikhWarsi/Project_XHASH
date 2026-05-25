import { describe, it, expect } from 'vitest'
import { createUndoRedo } from '../components/UndoRedoManager'

describe('createUndoRedo', () => {
  it('returns initial present state', () => {
    const stack = createUndoRedo({ count: 0 })
    expect(stack.present).toEqual({ count: 0 })
  })

  it('push updates present', () => {
    const stack = createUndoRedo({ count: 0 })
    stack.push({ count: 1 }, 'increment')
    expect(stack.present).toEqual({ count: 1 })
  })

  it('undo returns previous state', () => {
    const stack = createUndoRedo({ count: 0 })
    stack.push({ count: 1 }, 'increment')
    const result = stack.undo()
    expect(result).toEqual({ count: 0 })
    expect(stack.present).toEqual({ count: 0 })
  })

  it('redo returns undone state', () => {
    const stack = createUndoRedo({ count: 0 })
    stack.push({ count: 1 }, 'increment')
    stack.undo()
    const result = stack.redo()
    expect(result).toEqual({ count: 1 })
    expect(stack.present).toEqual({ count: 1 })
  })

  it('canUndo is true after push', () => {
    const stack = createUndoRedo({ count: 0 })
    expect(stack.canUndo).toBe(false)
    stack.push({ count: 1 }, 'increment')
    expect(stack.canUndo).toBe(true)
  })

  it('canRedo is true after undo', () => {
    const stack = createUndoRedo({ count: 0 })
    expect(stack.canRedo).toBe(false)
    stack.push({ count: 1 }, 'increment')
    stack.undo()
    expect(stack.canRedo).toBe(true)
  })

  it('undo returns null when no history', () => {
    const stack = createUndoRedo({ count: 0 })
    expect(stack.undo()).toBeNull()
  })

  it('redo returns null when nothing to redo', () => {
    const stack = createUndoRedo({ count: 0 })
    expect(stack.redo()).toBeNull()
  })

  it('push clears future after undo', () => {
    const stack = createUndoRedo({ count: 0 })
    stack.push({ count: 1 }, 'first')
    stack.undo()
    stack.push({ count: 2 }, 'second')
    expect(stack.redo()).toBeNull()
  })

  it('reset clears history', () => {
    const stack = createUndoRedo({ count: 0 })
    stack.push({ count: 1 }, 'first')
    stack.reset({ count: 5 })
    expect(stack.present).toEqual({ count: 5 })
    expect(stack.canUndo).toBe(false)
    expect(stack.canRedo).toBe(false)
  })

  it('historySize returns correct count', () => {
    const stack = createUndoRedo({ count: 0 })
    expect(stack.historySize).toBe(0)
    stack.push({ count: 1 }, 'first')
    expect(stack.historySize).toBe(1)
    stack.push({ count: 2 }, 'second')
    expect(stack.historySize).toBe(2)
  })
})
