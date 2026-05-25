import { api } from './client'

export interface HyperoptResult {
  symbol: string
  n_trials: number
  best_params: Record<string, unknown>
  best_sharpe: number
}

export interface MultiTimeframeResult {
  symbol: string
  params: Record<string, unknown>
  timeframes: Record<string, unknown>
  composite_score: number
  n_timeframes: number
}

export interface FullOptimizeResult {
  symbol: string
  n_trials: number
  best_params: Record<string, unknown>
  best_composite: number
  timeframe_results: Record<string, unknown>
}

export interface SearchSpace {
  [key: string]: { min: number; max: number; step?: number }
}

export async function fetchHyperoptSpace(): Promise<{ search_space: SearchSpace }> {
  const { data } = await api.get('/hyperopt/space')
  return data
}

export async function runHyperoptOptimize(
  symbol: string,
  nTrials = 50,
  searchSpace?: SearchSpace,
): Promise<HyperoptResult> {
  const { data } = await api.post('/hyperopt/optimize', {
    symbol,
    n_trials: nTrials,
    search_space: searchSpace,
  })
  return data
}

export async function runHyperoptMultiTimeframe(
  symbol: string,
  params: Record<string, unknown>,
  timeframes = ['1d', '1wk', '1mo'],
): Promise<MultiTimeframeResult> {
  const { data } = await api.post('/hyperopt/multi-timeframe', {
    symbol,
    params,
    timeframes,
  })
  return data
}

export async function runHyperoptFull(
  symbol: string,
  nTrials = 50,
  searchSpace?: SearchSpace,
): Promise<FullOptimizeResult> {
  const { data } = await api.post('/hyperopt/full-optimize', {
    symbol,
    n_trials: nTrials,
    search_space: searchSpace,
  })
  return data
}
