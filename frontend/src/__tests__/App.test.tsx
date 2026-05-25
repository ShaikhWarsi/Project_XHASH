/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../contexts/ThemeContext'
import App from '../App'

vi.mock('../store/portfolio', () => ({
  usePortfolioStore: vi.fn(() => ({
    portfolio: null,
    metrics: null,
    trades: [],
    load: vi.fn().mockResolvedValue(undefined),
    updatePortfolio: vi.fn(),
    updateMetrics: vi.fn(),
  })),
}))

vi.mock('../store/signals', () => ({
  useSignalStore: vi.fn(() => ({
    signals: null,
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
  })),
}))

vi.mock('../api/client', () => ({
  connectDashboardSSE: vi.fn(() => ({ close: vi.fn() })),
  fetchQuote: vi.fn().mockResolvedValue({ c: 0, d: 0, dp: 0 }),
  fetchQuotes: vi.fn().mockResolvedValue({}),
  searchStocks: vi.fn(),
  getAlerts: vi.fn().mockResolvedValue([]),
  createAlert: vi.fn(),
  deleteAlert: vi.fn(),
  fetchPortfolio: vi.fn(),
  fetchMetrics: vi.fn(),
  fetchTrades: vi.fn(),
  fetchSignals: vi.fn(),
  fetchOHLCV: vi.fn().mockResolvedValue([]),
  fetchCompanyNews: vi.fn().mockResolvedValue([]),
  fetchPortfolioHistory: vi.fn().mockResolvedValue([]),
  api: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    defaults: { headers: { common: {} } },
  },
}))

vi.mock('../contexts/WorkspaceContext', () => ({
  WorkspaceProvider: ({ children }: any) => children,
  useWorkspace: vi.fn(() => ({
    saveWorkspace: vi.fn(),
    loadWorkspace: vi.fn(),
    listWorkspaces: vi.fn(() => []),
    deleteWorkspace: vi.fn(),
    currentWorkspace: null,
  })),
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    const hedgeFundEls = screen.getAllByText(/Hedge Fund|Warren Buffett/i)
    expect(hedgeFundEls.length).toBeGreaterThan(0)
  })

  it('renders navigation elements', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    const navLinks = screen.getAllByText(/Dashboard|Portfolio|Signals|Hedge Fund/i)
    expect(navLinks.length).toBeGreaterThan(2)
  })
})
