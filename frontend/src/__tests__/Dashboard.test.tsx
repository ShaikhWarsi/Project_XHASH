import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { EventBusProvider } from '../contexts/EventBusContext'
import { AudioAlertProvider } from '../contexts/AudioAlertContext'
import Dashboard from '../pages/Dashboard'

vi.mock('../store/portfolio', () => ({
  usePortfolioStore: vi.fn(() => ({
    portfolio: null,
    metrics: null,
    load: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('../store/signals', () => ({
  useSignalStore: vi.fn(() => ({
    signals: null,
    load: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('../api/client', () => ({
  connectDashboardSSE: vi.fn(() => ({
    close: vi.fn(),
  })),
  fetchPortfolioHistory: vi.fn().mockResolvedValue([]),
  fetchTrades: vi.fn().mockResolvedValue([]),
}))

describe('Dashboard', () => {
  it('renders NAV and cash metrics after loading', async () => {
    render(
      <BrowserRouter>
        <EventBusProvider>
          <AudioAlertProvider>
            <Dashboard />
          </AudioAlertProvider>
        </EventBusProvider>
      </BrowserRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('NAV')).toBeDefined()
    })
    expect(screen.getByText('CASH')).toBeDefined()
    expect(screen.getByText('POS')).toBeDefined()
  })

  it('renders data rows for all status labels', async () => {
    render(
      <BrowserRouter>
        <EventBusProvider>
          <AudioAlertProvider>
            <Dashboard />
          </AudioAlertProvider>
        </EventBusProvider>
      </BrowserRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('P&L')).toBeDefined()
    })
  })
})
