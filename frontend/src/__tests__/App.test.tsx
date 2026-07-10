import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal()
  const LazyShell: React.FC = () => <div data-testid="lazy-page" />
  return { ...actual, lazy: () => LazyShell }
})

import App from '../App'
import { ThemeProvider } from '../contexts/ThemeContext'

// Suppress network errors from StatusBar API calls during App-level rendering
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}

describe('App', () => {
  it('renders lazily-loaded route pages', async () => {
    renderApp()
    await waitFor(() => {
      expect(screen.getAllByTestId('lazy-page').length).toBeGreaterThan(0)
    })
  })
})
