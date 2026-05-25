import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import KeyboardShortcutListener from '../components/KeyboardShortcuts'

describe('KeyboardShortcutListener', () => {
  const renderShortcuts = () =>
    render(
      <BrowserRouter>
        <KeyboardShortcutListener />
      </BrowserRouter>,
    )

  it('toggles modal with ? key', () => {
    renderShortcuts()
    expect(screen.queryByText('Keyboard Shortcuts')).toBeNull()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.queryByText('Keyboard Shortcuts')).toBeNull()
  })

  it('closes modal with Escape', () => {
    renderShortcuts()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Keyboard Shortcuts')).toBeNull()
  })

  it('closes modal when clicking overlay', () => {
    renderShortcuts()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined()
    const overlay = document.querySelector('.fixed.inset-0')
    if (overlay) fireEvent.click(overlay)
    expect(screen.queryByText('Keyboard Shortcuts')).toBeNull()
  })

  it('renders shortcut descriptions when open', () => {
    renderShortcuts()
    fireEvent.keyDown(window, { key: '?' })
    expect(screen.getByText('Go to Dashboard')).toBeDefined()
    expect(screen.getByText('Go to Orders')).toBeDefined()
    expect(screen.getByText('Command palette')).toBeDefined()
  })

  it('navigates on g-key sequence', () => {
    renderShortcuts()
    fireEvent.keyDown(window, { key: 'g' })
    fireEvent.keyDown(window, { key: 'd' })
    expect(screen.queryByText('Keyboard Shortcuts')).toBeNull()
  })
})
