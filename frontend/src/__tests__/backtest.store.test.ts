/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBacktestStore } from '../store/backtest'

vi.mock('../api/client', () => ({
  runBacktest: vi.fn(),
}))

describe('useBacktestStore', () => {
  beforeEach(() => {
    useBacktestStore.setState({
      result: null,
      running: false,
      error: null,
        config: {
          tickers: 'AAPL,MSFT,GOOGL',
          start: '2024-01-01',
          end: '2024-12-31',
          capital: 100000,
          strategy: 'hybrid',
          engine_type: 'default',
          leverage: 1.0,
          agents: ['buffett', 'burry', 'druckenmiller'],
        },
    })
  })

  it('initial state has default config', () => {
    const state = useBacktestStore.getState()
    expect(state.config.tickers).toBe('AAPL,MSFT,GOOGL')
    expect(state.config.capital).toBe(100000)
    expect(state.result).toBeNull()
    expect(state.running).toBe(false)
  })

  it('setConfig merges partial config', () => {
    useBacktestStore.getState().setConfig({ capital: 200000, strategy: 'momentum' })
    const config = useBacktestStore.getState().config
    expect(config.capital).toBe(200000)
    expect(config.strategy).toBe('momentum')
    expect(config.tickers).toBe('AAPL,MSFT,GOOGL')
  })

  it('clear resets result and error', () => {
    useBacktestStore.setState({ result: { total_return: 0.15 } as any, error: 'some error' })
    useBacktestStore.getState().clear()
    expect(useBacktestStore.getState().result).toBeNull()
    expect(useBacktestStore.getState().error).toBeNull()
  })

  it('run sets running state', async () => {
    const { runBacktest } = await import('../api/client')
    ;(runBacktest as any).mockResolvedValue({ total_return: 0.2 })

    const runPromise = useBacktestStore.getState().run()
    expect(useBacktestStore.getState().running).toBe(true)
    await runPromise
    expect(useBacktestStore.getState().running).toBe(false)
  })

  it('run sets error on failure', async () => {
    const { runBacktest } = await import('../api/client')
    ;(runBacktest as any).mockRejectedValue(new Error('Backend error'))

    await useBacktestStore.getState().run()
    expect(useBacktestStore.getState().error).toContain('Backend error')
    expect(useBacktestStore.getState().running).toBe(false)
  })
})
