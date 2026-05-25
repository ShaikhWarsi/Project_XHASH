import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

const ThrowComponent = () => {
  throw new Error('Test error')
}

function ToggleErrorBoundary() {
  const [shouldThrow, setShouldThrow] = useState(true)
  return (
    <div>
      <button onClick={() => setShouldThrow(false)}>Fix Error</button>
      <ErrorBoundary>
        {shouldThrow ? <ThrowComponent /> : <div>Recovered content</div>}
      </ErrorBoundary>
    </div>
  )
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Safe content')).toBeDefined()
  })

  it('catches errors and shows fallback', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Test error')).toBeDefined()
    expect(screen.getByText('Retry')).toBeDefined()
    spy.mockRestore()
  })

  it('renders custom fallback when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Custom error UI')).toBeDefined()
    spy.mockRestore()
  })

  it('calls onError callback when error is caught', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <ThrowComponent />
      </ErrorBoundary>,
    )
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0][0].message).toBe('Test error')
    spy.mockRestore()
  })

  it('try again button resets error state when children no longer throw', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ToggleErrorBoundary />)

    expect(screen.getByText('Test error')).toBeDefined()

    fireEvent.click(screen.getByText('Fix Error'))
    fireEvent.click(screen.getByText('Retry'))

    expect(screen.getByText('Recovered content')).toBeDefined()
    spy.mockRestore()
  })
})
