import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import CommandPalette from '../components/CommandPalette'

const onThemeChange = vi.fn()

const renderPalette = () =>
  render(
    <BrowserRouter>
      <CommandPalette onThemeChange={onThemeChange} />
    </BrowserRouter>,
  )

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    renderPalette()
    expect(screen.queryByPlaceholderText('type command...')).toBeNull()
  })

  it('opens with Ctrl+K', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByPlaceholderText('type command...')).toBeDefined()
  })

  it('opens with Cmd+K', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByPlaceholderText('type command...')).toBeDefined()
  })

  it('closes with Escape', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByPlaceholderText('type command...')).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByPlaceholderText('type command...')).toBeNull()
  })

  it('renders nav categories when open', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByText('MARKETS')).toBeDefined()
    expect(screen.getByText('TRADING')).toBeDefined()
  })

  it('shows no results when query matches nothing', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    const input = screen.getByPlaceholderText('type command...')
    fireEvent.change(input, { target: { value: 'zzzznonexistent' } })
    expect(screen.getByText('No results')).toBeDefined()
  })

  it('filters commands when typing', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    const input = screen.getByPlaceholderText('type command...')
    fireEvent.change(input, { target: { value: 'Dashboard' } })
    expect(screen.getByText('Dashboard')).toBeDefined()
  })

  it('navigates on enter with selected item', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    const input = screen.getByPlaceholderText('type command...')
    fireEvent.change(input, { target: { value: 'Dashboard' } })
    fireEvent.keyDown(input, { key: 'Enter' })
  })

  it('closes when clicking overlay', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByPlaceholderText('type command...')).toBeDefined()
    const overlay = document.querySelector('.fixed.inset-0')
    if (overlay) fireEvent.click(overlay)
    expect(screen.queryByPlaceholderText('type command...')).toBeNull()
  })

  it('renders footer hints', () => {
    renderPalette()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getByText('↑↓ navigate')).toBeDefined()
    expect(screen.getByText('↵ select')).toBeDefined()
    expect(screen.getByText('esc close')).toBeDefined()
  })
})
