/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePortfolioStore } from '../store/portfolio'

vi.mock('../api/client', () => ({
  fetchPortfolio: vi.fn(),
  fetchMetrics: vi.fn(),
  fetchTrades: vi.fn(),
}))

describe('usePortfolioStore', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      portfolio: null,
      metrics: null,
      trades: [],
      loading: false,
      error: null,
    })
  })

  it('initial state is null/empty', () => {
    const state = usePortfolioStore.getState()
    expect(state.portfolio).toBeNull()
    expect(state.metrics).toBeNull()
    expect(state.trades).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('updatePortfolio sets portfolio', () => {
    const mockPortfolio = { cash: 1000, total_value: 5000, margin_used: 0, margin_req: 0, realized_gains: 0, positions: {} }
    usePortfolioStore.getState().updatePortfolio(mockPortfolio as any)
    expect(usePortfolioStore.getState().portfolio).toEqual(mockPortfolio)
  })

  it('updateMetrics sets metrics', () => {
    const mockMetrics = { total_return: 0.1, sharpe_ratio: 1.5 } as any
    usePortfolioStore.getState().updateMetrics(mockMetrics)
    expect(usePortfolioStore.getState().metrics).toEqual(mockMetrics)
  })

  it('load sets loading state', async () => {
    const { fetchPortfolio, fetchMetrics, fetchTrades } = await import('../api/client')
    ;(fetchPortfolio as any).mockResolvedValue({ cash: 5000, total_value: 10000 } as any)
    ;(fetchMetrics as any).mockResolvedValue({ total_return: 0.05 } as any)
    ;(fetchTrades as any).mockResolvedValue([])

    const loadPromise = usePortfolioStore.getState().load()
    expect(usePortfolioStore.getState().loading).toBe(true)
    await loadPromise
    expect(usePortfolioStore.getState().loading).toBe(false)
  })

  it('load sets error on failure', async () => {
    const { fetchPortfolio } = await import('../api/client')
    ;(fetchPortfolio as any).mockRejectedValue(new Error('Network error'))

    await usePortfolioStore.getState().load()
    expect(usePortfolioStore.getState().error).toContain('Network error')
    expect(usePortfolioStore.getState().loading).toBe(false)
  })
})
