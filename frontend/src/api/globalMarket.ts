import { api } from './client'

export interface MarketIndex {
  symbol: string
  price: number
  change: number
  change_pct: number
}

export interface MarketHeatmap {
  sector: string
  change: number
  volume: number
  market_cap: number
}

export interface MarketSentiment {
  source: string
  score: number
  articles: number
  summary: string
}

export interface MarketNews {
  headline: string
  summary: string
  url: string
  source: string
  datetime: number
  sentiment: number
}

export async function fetchMarketOverview(): Promise<{ indices: MarketIndex[] }> {
  const { data } = await api.get('/market/overview')
  return data
}

export async function fetchMarketHeatmap(): Promise<{ sectors: MarketHeatmap[] }> {
  const { data } = await api.get('/market/heatmap')
  return data
}

export async function fetchMarketSentiment(): Promise<{ sentiment: MarketSentiment[] }> {
  const { data } = await api.get('/market/sentiment')
  return data
}

export async function fetchMarketNews(): Promise<{ news: MarketNews[] }> {
  const { data } = await api.get('/market/news')
  return data
}
