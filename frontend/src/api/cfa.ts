import { api } from './client'

interface WACCInput {
  risk_free_rate: number
  market_risk_premium: number
  beta: number
  cost_of_debt: number
  tax_rate: number
  market_value_equity: number
  market_value_debt: number
  country_risk_premium?: number
  size_premium?: number
}

interface DCFInput {
  wacc_inputs: Record<string, number>
  fcf_inputs: Record<string, number>
  growth_rates: number[]
  terminal_growth_rate: number
  balance_sheet: Record<string, number>
  shares_outstanding: number
}

interface BondPriceInput {
  ytm: number
  face_value?: number
  coupon_rate?: number
  years_to_maturity?: number
  frequency?: number
}

interface BondYTMInput {
  price: number
  face_value?: number
  coupon_rate?: number
  years_to_maturity?: number
  frequency?: number
}

interface OptionPriceInput {
  spot_price: number
  strike_price: number
  time_to_expiry: number
  risk_free_rate: number
  volatility: number
  option_type?: string
  dividend_yield?: number
}

interface RatioInput {
  current_assets: number
  current_liabilities: number
  total_assets: number
  total_liabilities: number
  total_equity: number
  revenue: number
  net_income: number
  ebit: number
  interest_expense: number
  cost_of_goods_sold: number
  inventory?: number
  accounts_receivable?: number
  accounts_payable?: number
  cash?: number
  marketable_securities?: number
}

export async function calcWACC(input: WACCInput): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/wacc', input)
  return data
}

export async function calcDCF(input: DCFInput): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/dcf', input)
  return data
}

export async function calcComps(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await api.get('/v1/cfa/comps', { params })
  return data
}

export async function calcStartupBerkus(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/startup/berkus', null, { params })
  return data
}

export async function calcStartupVC(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/startup/vc', null, { params })
  return data
}

export async function calcBondPrice(input: BondPriceInput): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/bond/price', input)
  return data
}

export async function calcBondYTM(input: BondYTMInput): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/bond/ytm', input)
  return data
}

export async function calcOptionPrice(input: OptionPriceInput): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/options/price', input)
  return data
}

export async function calcOptionGreeks(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/options/greeks', null, { params })
  return data
}

export async function calcRatioAnalysis(input: RatioInput): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/ratios', input)
  return data
}

export async function calcDuPont(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await api.post('/v1/cfa/dupont', null, { params })
  return data
}
