import { useState } from 'react'
import Card from '../components/ui/Card'
import * as cfa from '../api/cfa'
import { api } from '../api/client'

type Tab = 'wacc' | 'dcf' | 'comps' | 'startup' | 'vc' | 'bonds' | 'ytm' | 'options' | 'greeks' | 'ratios' | 'dupont' | 'precedent' | 'strategies' | 'duration'

const TABS: { key: Tab; label: string }[] = [
  { key: 'wacc', label: 'WACC' },
  { key: 'dcf', label: 'DCF' },
  { key: 'comps', label: 'Comps' },
  { key: 'startup', label: 'Startup' },
  { key: 'vc', label: 'VC Method' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'ytm', label: 'Bond YTM' },
  { key: 'options', label: 'Options' },
  { key: 'greeks', label: 'Greeks' },
  { key: 'ratios', label: 'Ratios' },
  { key: 'dupont', label: 'DuPont' },
  { key: 'precedent', label: 'Precedent' },
  { key: 'strategies', label: 'Strategies' },
]

function NumberInput({ label, value, onChange, step }: {
  label: string; value: number; onChange: (v: number) => void; step?: number
}) {
  return (
    <div>
      <label className="block text-xs text-secondary mb-0.5">
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step ?? 0.01}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1.5 rounded-md text-sm bg-hover border border-input text-primary outline-none"
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--input-border)'}
      />
    </div>
  )
}

export default function CfaAnalytics() {
  const [tab, setTab] = useState<Tab>('wacc')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const renderResult = () => {
    if (loading) return <div className="text-sm text-muted py-4">Calculating...</div>
    if (error) return <div className="text-sm text-down py-4">{error}</div>
    if (!result) return <div className="text-sm text-muted py-4">Enter values and calculate</div>
    return (
      <div className="space-y-1 text-sm max-h-96 overflow-y-auto">
        {Object.entries(result).map(([k, v]) => (
          <div key={k} className="flex justify-between py-1" style={{ borderBottom: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)' }}>
            <span className="text-secondary capitalize">
              {k.replace(/_/g, ' ')}
            </span>
            <span className="text-primary font-mono">
              {typeof v === 'number' ? (Math.abs(v) > 1 ? v.toFixed(4) : v.toFixed(6)) : String(v)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const wrap = (fn: () => Promise<Record<string, unknown>>) => async () => {
    setLoading(true); setError(''); setResult(null)
    try { setResult(await fn()) }
    catch (e: unknown) { setError((e as Error).message) }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">
        CFA Analytics
      </h1>

      <div className="flex gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setResult(null); setError('') }}
            className="px-3 py-1.5 rounded-md text-sm cursor-pointer"
            style={{
              background: tab === t.key ? 'color-mix(in srgb, var(--accent-blue) 15%, transparent)' : 'var(--bg-secondary)',
              color: tab === t.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
              border: `1px solid ${tab === t.key ? 'var(--accent-blue)' : 'var(--border-color)'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card title={TABS.find((t) => t.key === tab)?.label || ''}>
        {tab === 'wacc' && <WaccForm onCalculate={wrap(cfa.calcWACC.bind(null, {
          risk_free_rate: 0.04, market_risk_premium: 0.06, beta: 1.2,
          cost_of_debt: 0.05, tax_rate: 0.21, market_value_equity: 1000000,
          market_value_debt: 500000,
        }))} />}
        {tab === 'dcf' && <DcfForm onCalculate={wrap(() => cfa.calcDCF({
          wacc_inputs: { risk_free_rate: 0.04, market_risk_premium: 0.06, beta: 1.2, cost_of_debt: 0.05, tax_rate: 0.21, market_value_equity: 1000000, market_value_debt: 500000 },
          fcf_inputs: { year1: 50000, year2: 55000, year3: 60000, year4: 65000, year5: 70000 },
          growth_rates: [0.1, 0.09, 0.08, 0.07, 0.06],
          terminal_growth_rate: 0.03,
          balance_sheet: { total_debt: 500000, cash: 200000 },
          shares_outstanding: 1000000,
        }))} />}
        {tab === 'comps' && <CompsForm onCalculate={wrap(() => cfa.calcComps({
          price: 150, shares_outstanding: 1000000, earnings: 500000,
          ebitda: 800000, revenue: 2000000, book_value: 3000000,
          debt: 500000, cash: 200000,
        }))} />}
        {tab === 'startup' && <StartupForm onCalculate={wrap(() => cfa.calcStartupBerkus({
          idea_quality: 0.5, prototype: 0.5, team: 0.5,
          strategic_relationships: 0.3, sales: 0.2, maximum_value: 5000000,
        }))} />}
        {tab === 'vc' && <VcForm onCalculate={wrap(() => cfa.calcStartupVC({
          exit_value: 50000000, investment_amount: 5000000,
          required_return_multiple: 10.0, dilution: 0.0,
        }))} />}
        {tab === 'bonds' && <BondsForm onCalculate={wrap(() => cfa.calcBondPrice({
          ytm: 0.05, face_value: 1000, coupon_rate: 0.05,
          years_to_maturity: 10, frequency: 2,
        }))} />}
        {tab === 'ytm' && <YtmForm onCalculate={wrap(() => cfa.calcBondYTM({
          price: 950, face_value: 1000, coupon_rate: 0.05,
          years_to_maturity: 10, frequency: 2,
        }))} />}
        {tab === 'options' && <OptionsForm onCalculate={wrap(() => cfa.calcOptionPrice({
          spot_price: 100, strike_price: 105, time_to_expiry: 1,
          risk_free_rate: 0.05, volatility: 0.2,
        }))} />}
        {tab === 'greeks' && <GreeksForm onCalculate={wrap(() => cfa.calcOptionGreeks({
          spot_price: 100, strike_price: 105, time_to_expiry: 1,
          risk_free_rate: 0.05, volatility: 0.2,
        }))} />}
        {tab === 'ratios' && <RatiosForm onCalculate={wrap(() => cfa.calcRatioAnalysis({
          current_assets: 500000, current_liabilities: 200000,
          total_assets: 1000000, total_liabilities: 600000,
          total_equity: 400000, revenue: 800000, net_income: 100000,
          ebit: 150000, interest_expense: 20000, cost_of_goods_sold: 400000,
        }))} />}
        {tab === 'dupont' && <DuPontForm onCalculate={wrap(() => cfa.calcDuPont({
          net_income: 100000, revenue: 800000,
          total_assets: 1000000, total_equity: 400000,
        }))} />}
        {tab === 'precedent' && <PrecedentForm />}
        {tab === 'strategies' && <StrategiesForm />}
        {tab !== 'precedent' && tab !== 'strategies' && renderResult()}
      </Card>
    </div>
  )
}

/* ────────── DCF ────────── */

function DcfForm({ onCalculate }: { onCalculate: () => void }) {
  const [fcf1, setFcf1] = useState(50000)
  const [fcf2, setFcf2] = useState(55000)
  const [fcf3, setFcf3] = useState(60000)
  const [fcf4, setFcf4] = useState(65000)
  const [fcf5, setFcf5] = useState(70000)
  const [tg, setTg] = useState(0.03)
  const [currentPrice, setCurrentPrice] = useState(50)
  const [totalDebt, setTotalDebt] = useState(500000)
  const [cashEq, setCashEq] = useState(200000)
  const [shares, setShares] = useState(1000000)
  const [calculated, setCalculated] = useState(false)

  const handleCalc = () => {
    setCalculated(true)
    onCalculate()
  }

  const fcf = [fcf1, fcf2, fcf3, fcf4, fcf5]

  const computeEV = (wacc: number, g: number) => {
    let pv = 0
    for (let t = 0; t < 5; t++) {
      pv += fcf[t] / Math.pow(1 + wacc, t + 1)
    }
    if (wacc <= g) return Infinity
    const tv = (fcf[4] * (1 + g)) / (wacc - g)
    pv += tv / Math.pow(1 + wacc, 5)
    return pv
  }

  const waccRows = [0.08, 0.09, 0.10, 0.11, 0.12]
  const tgCols = [0.02, 0.025, 0.03, 0.035, 0.04]

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Projected free cash flows & terminal growth. Uses default WACC params from the WACC tab.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="FCF Year 1" value={fcf1} onChange={setFcf1} step={1000} />
        <NumberInput label="FCF Year 2" value={fcf2} onChange={setFcf2} step={1000} />
        <NumberInput label="FCF Year 3" value={fcf3} onChange={setFcf3} step={1000} />
        <NumberInput label="FCF Year 4" value={fcf4} onChange={setFcf4} step={1000} />
        <NumberInput label="FCF Year 5" value={fcf5} onChange={setFcf5} step={1000} />
        <NumberInput label="Terminal Growth" value={tg} onChange={setTg} />
        <NumberInput label="Current Price" value={currentPrice} onChange={setCurrentPrice} />
        <NumberInput label="Total Debt" value={totalDebt} onChange={setTotalDebt} step={10000} />
        <NumberInput label="Cash & Equiv" value={cashEq} onChange={setCashEq} step={10000} />
        <NumberInput label="Shares Outstanding" value={shares} onChange={setShares} step={10000} />
      </div>
      <button onClick={handleCalc} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate DCF</button>

      {calculated && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-primary mb-2">SENSITIVITY TABLE</h4>
          <p className="text-[10px] text-muted mb-2">Intrinsic value per share (WACC × Terminal Growth)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-1 border border-default text-secondary">WACC \ TG</th>
                  {tgCols.map((g) => (
                    <th key={g} className="p-1 border border-default text-secondary">{(g * 100).toFixed(1)}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waccRows.map((wacc) => (
                  <tr key={wacc}>
                    <td className="p-1 border border-default text-secondary font-bold">{(wacc * 100).toFixed(0)}%</td>
                    {tgCols.map((g) => {
                      const ev = computeEV(wacc, g)
                      const iv = ev === Infinity ? Infinity : (ev - totalDebt + cashEq) / shares
                      const cls = iv === Infinity ? '' : iv >= currentPrice ? 'text-up' : 'text-down'
                      return (
                        <td
                          key={g}
                          className={`p-1 border border-default ${cls}`}
                          style={{
                            background: iv === Infinity ? 'var(--bg-secondary)' : iv >= currentPrice ? 'color-mix(in srgb, var(--accent-green) 12%, transparent)' : 'color-mix(in srgb, var(--accent-red) 12%, transparent)',
                          }}
                        >
                          {iv === Infinity ? '∞' : iv.toFixed(2)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ────────── WACC ────────── */

function WaccForm({ onCalculate }: { onCalculate: () => void }) {
  const [rf, setRf] = useState(0.04)
  const [mrp, setMrp] = useState(0.06)
  const [beta, setBeta] = useState(1.2)
  const [cod, setCod] = useState(0.05)
  const [tax, setTax] = useState(0.21)
  const [mve, setMve] = useState(1000000)
  const [mvd, setMvd] = useState(500000)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label="Risk Free Rate" value={rf} onChange={setRf} />
        <NumberInput label="Market Risk Premium" value={mrp} onChange={setMrp} />
        <NumberInput label="Beta" value={beta} onChange={setBeta} />
        <NumberInput label="Cost of Debt" value={cod} onChange={setCod} />
        <NumberInput label="Tax Rate" value={tax} onChange={setTax} />
        <NumberInput label="Market Val Equity" value={mve} onChange={setMve} step={10000} />
        <NumberInput label="Market Val Debt" value={mvd} onChange={setMvd} step={10000} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate WACC</button>
    </div>
  )
}

/* ────────── COMPS ────────── */

function CompsForm({ onCalculate }: { onCalculate: () => void }) {
  const [price, setPrice] = useState(150)
  const [shares, setShares] = useState(1000000)
  const [earnings, setEarnings] = useState(500000)
  const [ebitda, setEbitda] = useState(800000)
  const [revenue, setRevenue] = useState(2000000)
  const [bv, setBv] = useState(3000000)
  const [debt, setDebt] = useState(500000)
  const [cash, setCash] = useState(200000)

  const [tickerInput, setTickerInput] = useState('AAPL,MSFT,GOOGL')
  const [compsData, setCompsData] = useState<any[] | null>(null)
  const [compsLoading, setCompsLoading] = useState(false)
  const [compsError, setCompsError] = useState('')

  const loadComps = async () => {
    setCompsLoading(true)
    setCompsError('')
    setCompsData(null)
    try {
      const tickers = tickerInput.split(',').map((t) => t.trim()).filter(Boolean)
      const { data } = await api.post('/cfa/comps', { tickers })
      setCompsData(Array.isArray(data) ? data : data.comps || data.results || [])
    } catch (e: any) {
      setCompsError(e?.response?.data?.detail || e?.message || 'Error loading comps')
    } finally {
      setCompsLoading(false)
    }
  }

  const medianEVEBITDA = compsData && compsData.length > 0
    ? compsData.map((c) => c.ev_ebitda).filter((v) => v != null && isFinite(v)).sort((a: number, b: number) => a - b)[Math.floor(compsData.filter((c) => c.ev_ebitda != null && isFinite(c.ev_ebitda)).length / 2)]
    : null

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Calculates P/E, EV/EBITDA, P/B, P/S multiples from company financials.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Stock Price" value={price} onChange={setPrice} />
        <NumberInput label="Shares Out" value={shares} onChange={setShares} step={10000} />
        <NumberInput label="Earnings" value={earnings} onChange={setEarnings} step={10000} />
        <NumberInput label="EBITDA" value={ebitda} onChange={setEbitda} step={10000} />
        <NumberInput label="Revenue" value={revenue} onChange={setRevenue} step={10000} />
        <NumberInput label="Book Value" value={bv} onChange={setBv} step={10000} />
        <NumberInput label="Total Debt" value={debt} onChange={setDebt} step={10000} />
        <NumberInput label="Cash" value={cash} onChange={setCash} step={10000} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate Comps</button>

      <div className="border-t border-default pt-3 mt-4">
        <h4 className="text-sm font-bold text-primary mb-2">COMPARABLES</h4>
        <p className="text-[10px] text-muted mb-2">Load peer company data for comparison.</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            placeholder="Ticker list (comma-separated)"
            className="flex-1 px-2 py-1.5 rounded-md text-sm bg-hover border border-input text-primary outline-none"
          />
          <button onClick={loadComps} disabled={compsLoading}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--accent-cyan)] text-black border-none cursor-pointer">
            {compsLoading ? 'Loading...' : 'Load Comps'}
          </button>
        </div>
        {compsError && <div className="text-xs text-down py-1">{compsError}</div>}
        {compsData && compsData.length > 0 && (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-[10px] font-mono border-collapse">
              <thead>
                <tr className="text-secondary">
                  <th className="text-left p-1 border border-default">Ticker</th>
                  <th className="text-right p-1 border border-default">Price</th>
                  <th className="text-right p-1 border border-default">Market Cap</th>
                  <th className="text-right p-1 border border-default">EV/EBITDA</th>
                  <th className="text-right p-1 border border-default">P/E</th>
                  <th className="text-right p-1 border border-default">P/B</th>
                  <th className="text-right p-1 border border-default">Rev Growth</th>
                  <th className="text-right p-1 border border-default">Gross Margin</th>
                </tr>
              </thead>
              <tbody>
                {compsData.map((c: any, i: number) => {
                  const evebitda = c.ev_ebitda
                  const isHigh = evebitda != null && medianEVEBITDA != null && evebitda > medianEVEBITDA * 1.1
                  const isLow = evebitda != null && medianEVEBITDA != null && evebitda < medianEVEBITDA * 0.9
                  return (
                    <tr key={c.ticker || i}>
                      <td className="p-1 border border-default text-primary font-bold">{c.ticker || c.symbol}</td>
                      <td className="p-1 border border-default text-right text-primary">{c.price != null ? c.price.toFixed(2) : '-'}</td>
                      <td className="p-1 border border-default text-right text-primary">{c.market_cap != null ? (c.market_cap / 1e9).toFixed(1) + 'B' : '-'}</td>
                      <td className="p-1 border border-default text-right" style={{ color: isHigh ? 'var(--accent-red)' : isLow ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        {evebitda != null ? evebitda.toFixed(2) : '-'}
                      </td>
                      <td className="p-1 border border-default text-right text-primary">{c.pe != null ? c.pe.toFixed(2) : '-'}</td>
                      <td className="p-1 border border-default text-right text-primary">{c.pb != null ? c.pb.toFixed(2) : '-'}</td>
                      <td className="p-1 border border-default text-right text-primary">{c.revenue_growth != null ? (c.revenue_growth * 100).toFixed(1) + '%' : '-'}</td>
                      <td className="p-1 border border-default text-right text-primary">{c.gross_margin != null ? (c.gross_margin * 100).toFixed(1) + '%' : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ────────── STARTUP ────────── */

function StartupForm({ onCalculate }: { onCalculate: () => void }) {
  const [idea, setIdea] = useState(0.5)
  const [proto, setProto] = useState(0.5)
  const [team, setTeam] = useState(0.5)
  const [rels, setRels] = useState(0.3)
  const [sales, setSales] = useState(0.2)
  const [maxVal, setMaxVal] = useState(5000000)
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Berkus method startup valuation based on qualitative factors (0–1 each).
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Idea Quality" value={idea} onChange={setIdea} />
        <NumberInput label="Prototype" value={proto} onChange={setProto} />
        <NumberInput label="Team Quality" value={team} onChange={setTeam} />
        <NumberInput label="Relationships" value={rels} onChange={setRels} />
        <NumberInput label="Sales Traction" value={sales} onChange={setSales} />
        <NumberInput label="Max Value ($)" value={maxVal} onChange={setMaxVal} step={100000} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate Berkus</button>
    </div>
  )
}

/* ────────── VC ────────── */

function VcForm({ onCalculate }: { onCalculate: () => void }) {
  const [tv, setTv] = useState(50000000)
  const [inv, setInv] = useState(5000000)
  const [exit, setExit] = useState(5)
  const [target, setTarget] = useState(0.3)
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Venture Capital Method: estimates post-money valuation based on terminal value and target return.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Terminal Value ($)" value={tv} onChange={setTv} step={1000000} />
        <NumberInput label="Investment ($)" value={inv} onChange={setInv} step={100000} />
        <NumberInput label="Exit Year" value={exit} onChange={setExit} />
        <NumberInput label="Target Return" value={target} onChange={setTarget} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate VC Method</button>
    </div>
  )
}

/* ────────── BONDS ────────── */

function BondsForm({ onCalculate }: { onCalculate: () => void }) {
  const [ytm, setYtm] = useState(0.05)
  const [face, setFace] = useState(1000)
  const [coupon, setCoupon] = useState(0.05)
  const [years, setYears] = useState(10)
  const [freq, setFreq] = useState(2)
  const [durationResult, setDurationResult] = useState<{
    macaulay: number; modified: number; convexity: number
  } | null>(null)

  const calcDuration = () => {
    const n = years * freq
    const c = (coupon * face) / freq
    const r = ytm / freq
    let price = 0
    for (let t = 1; t <= n; t++) {
      price += c / Math.pow(1 + r, t)
    }
    price += face / Math.pow(1 + r, n)

    let macaulay = 0
    for (let t = 1; t <= n; t++) {
      macaulay += (t / freq) * (c / Math.pow(1 + r, t))
    }
    macaulay += (n / freq) * (face / Math.pow(1 + r, n))
    macaulay /= price

    const modified = macaulay / (1 + ytm / freq)
    let convexity = 0
    for (let t = 1; t <= n; t++) {
      convexity += (t / freq) * ((t / freq) + 1 / freq) * (c / Math.pow(1 + r, t))
    }
    convexity += (n / freq) * ((n / freq) + 1 / freq) * (face / Math.pow(1 + r, n))
    convexity /= price * Math.pow(1 + ytm / freq, 2)

    setDurationResult({ macaulay, modified, convexity })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Bond pricing from YTM, face value, coupon rate, term, and payment frequency.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="YTM" value={ytm} onChange={setYtm} />
        <NumberInput label="Face Value" value={face} onChange={setFace} step={100} />
        <NumberInput label="Coupon Rate" value={coupon} onChange={setCoupon} />
        <NumberInput label="Years to Mat" value={years} onChange={setYears} />
        <NumberInput label="Frequency" value={freq} onChange={setFreq} />
      </div>
      <div className="flex gap-2">
        <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate Bond Price</button>
        <button onClick={calcDuration} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-cyan)] text-black border-none cursor-pointer">Calculate Duration</button>
      </div>

      {durationResult && (
        <div className="border-t border-default pt-3 mt-2">
          <h4 className="text-sm font-bold text-primary mb-2">BOND DURATION</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)' }}>
              <span className="text-secondary">Macaulay Duration</span>
              <span className="text-primary font-mono">{durationResult.macaulay.toFixed(4)} yrs</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)' }}>
              <span className="text-secondary">Modified Duration</span>
              <span className="text-primary font-mono">{durationResult.modified.toFixed(4)}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)' }}>
              <span className="text-secondary">Convexity</span>
              <span className="text-primary font-mono">{durationResult.convexity.toFixed(4)}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-muted space-y-1">
            <p><strong>Macaulay:</strong> ∑ t·PV(CF<sub>t</sub>) / Price</p>
            <p><strong>Modified:</strong> Macaulay / (1 + YTM/freq)</p>
            <p><strong>Convexity:</strong> ∑ t·(t+1)·PV(CF<sub>t</sub>) / [Price·(1+YTM/freq)²]</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ────────── YTM ────────── */

function YtmForm({ onCalculate }: { onCalculate: () => void }) {
  const [price, setPrice] = useState(950)
  const [face, setFace] = useState(1000)
  const [coupon, setCoupon] = useState(0.05)
  const [years, setYears] = useState(10)
  const [freq, setFreq] = useState(2)
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Calculate yield-to-maturity from bond price, face value, coupon, and term.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Bond Price" value={price} onChange={setPrice} step={10} />
        <NumberInput label="Face Value" value={face} onChange={setFace} step={100} />
        <NumberInput label="Coupon Rate" value={coupon} onChange={setCoupon} />
        <NumberInput label="Years to Mat" value={years} onChange={setYears} />
        <NumberInput label="Frequency" value={freq} onChange={setFreq} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate YTM</button>
    </div>
  )
}

/* ────────── OPTIONS ────────── */

function OptionsForm({ onCalculate }: { onCalculate: () => void }) {
  const [spot, setSpot] = useState(100)
  const [strike, setStrike] = useState(105)
  const [expiry, setExpiry] = useState(1)
  const [rf, setRf] = useState(0.05)
  const [vol, setVol] = useState(0.2)
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Black-Scholes option pricing with Greeks.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Spot Price" value={spot} onChange={setSpot} />
        <NumberInput label="Strike Price" value={strike} onChange={setStrike} />
        <NumberInput label="Time to Exp (yr)" value={expiry} onChange={setExpiry} />
        <NumberInput label="Risk Free Rate" value={rf} onChange={setRf} />
        <NumberInput label="Volatility" value={vol} onChange={setVol} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate Option Price</button>
    </div>
  )
}

/* ────────── GREEKS ────────── */

function GreeksForm({ onCalculate }: { onCalculate: () => void }) {
  const [spot, setSpot] = useState(100)
  const [strike, setStrike] = useState(105)
  const [expiry, setExpiry] = useState(1)
  const [rf, setRf] = useState(0.05)
  const [vol, setVol] = useState(0.2)
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Black-Scholes Greeks: Delta, Gamma, Vega, Theta, Rho.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Spot Price" value={spot} onChange={setSpot} />
        <NumberInput label="Strike Price" value={strike} onChange={setStrike} />
        <NumberInput label="Time to Exp (yr)" value={expiry} onChange={setExpiry} />
        <NumberInput label="Risk Free Rate" value={rf} onChange={setRf} />
        <NumberInput label="Volatility" value={vol} onChange={setVol} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate Greeks</button>
    </div>
  )
}

/* ────────── DuPONT ────────── */

function DuPontForm({ onCalculate }: { onCalculate: () => void }) {
  const [ni, setNi] = useState(100000)
  const [rev, setRev] = useState(800000)
  const [ta, setTa] = useState(1000000)
  const [te, setTe] = useState(400000)
  const [showViz, setShowViz] = useState(false)

  const handleCalc = () => {
    setShowViz(true)
    onCalculate()
  }

  const netMargin = ni / rev
  const assetTurnover = rev / ta
  const equityMultiplier = ta / te
  const roe = netMargin * assetTurnover * equityMultiplier
  const maxComp = Math.max(netMargin, assetTurnover, equityMultiplier)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        DuPont analysis decomposes ROE into profit margin × asset turnover × equity multiplier.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Net Income" value={ni} onChange={setNi} step={10000} />
        <NumberInput label="Revenue" value={rev} onChange={setRev} step={10000} />
        <NumberInput label="Total Assets" value={ta} onChange={setTa} step={10000} />
        <NumberInput label="Total Equity" value={te} onChange={setTe} step={10000} />
      </div>
      <button onClick={handleCalc} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate DuPont</button>

      {showViz && (
        <div className="border-t border-default pt-3 mt-2">
          <h4 className="text-sm font-bold text-primary mb-2">DuPont Decomposition</h4>
          <div className="mb-3">
            <div className="flex text-[10px] font-mono mb-1">
              <span className="text-secondary">ROE = </span>
              <span className="text-up ml-1">{(roe * 100).toFixed(2)}%</span>
            </div>
            <div className="h-5 w-full flex rounded overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
              <div
                className="h-full flex items-center justify-center text-[9px] font-bold text-black"
                style={{ width: `${(netMargin / maxComp) * 100}%`, background: 'var(--accent-blue)' }}
                title={`Net Margin: ${(netMargin * 100).toFixed(2)}%`}
              >
                {(netMargin * 100).toFixed(1)}%
              </div>
              <div
                className="h-full flex items-center justify-center text-[9px] font-bold text-black"
                style={{ width: `${(assetTurnover / maxComp) * 100}%`, background: 'var(--accent-green)' }}
                title={`Asset Turnover: ${assetTurnover.toFixed(4)}`}
              >
                {assetTurnover.toFixed(2)}x
              </div>
              <div
                className="h-full flex items-center justify-center text-[9px] font-bold text-black"
                style={{ width: `${(equityMultiplier / maxComp) * 100}%`, background: 'var(--accent-yellow)' }}
                title={`Equity Multiplier: ${equityMultiplier.toFixed(2)}`}
              >
                {equityMultiplier.toFixed(2)}x
              </div>
            </div>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-secondary">Net Margin (NI/Rev)</span>
              <span className="font-mono text-primary">{(netMargin * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Asset Turnover (Rev/Assets)</span>
              <span className="font-mono text-primary">{assetTurnover.toFixed(4)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Equity Multiplier (Assets/Equity)</span>
              <span className="font-mono text-primary">{equityMultiplier.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between font-bold pt-1" style={{ borderTop: '1px solid var(--border-color)' }}>
              <span className="text-primary">ROE</span>
              <span className="font-mono text-up">{(roe * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ────────── RATIOS ────────── */

function RatiosForm({ onCalculate }: { onCalculate: () => void }) {
  const [ca, setCa] = useState(500000)
  const [cl, setCl] = useState(200000)
  const [ta, setTa] = useState(1000000)
  const [tl, setTl] = useState(600000)
  const [te, setTe] = useState(400000)
  const [rev, setRev] = useState(800000)
  const [ni, setNi] = useState(100000)
  const [ebit, setEbit] = useState(150000)
  const [ie, setIe] = useState(20000)
  const [cogs, setCogs] = useState(400000)
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Comprehensive financial ratio analysis from balance sheet data.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Current Assets" value={ca} onChange={setCa} step={10000} />
        <NumberInput label="Current Liab" value={cl} onChange={setCl} step={10000} />
        <NumberInput label="Total Assets" value={ta} onChange={setTa} step={10000} />
        <NumberInput label="Total Liab" value={tl} onChange={setTl} step={10000} />
        <NumberInput label="Total Equity" value={te} onChange={setTe} step={10000} />
        <NumberInput label="Revenue" value={rev} onChange={setRev} step={10000} />
        <NumberInput label="Net Income" value={ni} onChange={setNi} step={10000} />
        <NumberInput label="EBIT" value={ebit} onChange={setEbit} step={10000} />
        <NumberInput label="Interest Exp" value={ie} onChange={setIe} step={1000} />
        <NumberInput label="COGS" value={cogs} onChange={setCogs} step={10000} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate Ratios</button>
    </div>
  )
}

/* ────────── PRECEDENT TRANSACTIONS ────────── */

function PrecedentForm() {
  const [sector, setSector] = useState('Technology')
  const [dealMin, setDealMin] = useState(0)
  const [dealMax, setDealMax] = useState(100000)
  const [dateFrom, setDateFrom] = useState('2023-01-01')
  const [dateTo, setDateTo] = useState('2024-12-31')
  const [data, setData] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const search = async () => {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const { data: res } = await api.post('/cfa/precedents', {
        sector,
        deal_size_min: dealMin * 1e6,
        deal_size_max: dealMax * 1e6,
        date_from: dateFrom,
        date_to: dateTo,
      })
      setData(Array.isArray(res) ? res : res.transactions || res.results || [])
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Error searching precedents')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Search precedent M&A transactions by sector, deal size, and date range.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-secondary mb-0.5">Sector</label>
          <input
            type="text"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md text-sm bg-hover border border-input text-primary outline-none"
          />
        </div>
        <NumberInput label="Deal Size Min ($M)" value={dealMin} onChange={setDealMin} step={100} />
        <NumberInput label="Deal Size Max ($M)" value={dealMax} onChange={setDealMax} step={100} />
        <div>
          <label className="block text-xs text-secondary mb-0.5">Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md text-sm bg-hover border border-input text-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-secondary mb-0.5">Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md text-sm bg-hover border border-input text-primary outline-none"
          />
        </div>
      </div>
      <button onClick={search} disabled={loading}
        className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">
        {loading ? 'Searching...' : 'Search'}
      </button>

      {error && <div className="text-xs text-down py-1">{error}</div>}
      {data && data.length === 0 && <div className="text-xs text-muted py-2">No transactions found.</div>}
      {data && data.length > 0 && (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[10px] font-mono border-collapse">
            <thead>
              <tr className="text-secondary">
                <th className="text-left p-1 border border-default">Date</th>
                <th className="text-left p-1 border border-default">Target</th>
                <th className="text-left p-1 border border-default">Acquirer</th>
                <th className="text-right p-1 border border-default">EV/EBITDA</th>
                <th className="text-right p-1 border border-default">EV/Revenue</th>
                <th className="text-right p-1 border border-default">Premium</th>
                <th className="text-right p-1 border border-default">Deal Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t: any, i: number) => (
                <tr key={t.target + t.date + i || i}>
                  <td className="p-1 border border-default text-primary">{t.date || '-'}</td>
                  <td className="p-1 border border-default text-primary font-bold">{t.target || '-'}</td>
                  <td className="p-1 border border-default text-primary">{t.acquirer || '-'}</td>
                  <td className="p-1 border border-default text-right text-primary">{t.ev_ebitda != null ? t.ev_ebitda.toFixed(2) : '-'}</td>
                  <td className="p-1 border border-default text-right text-primary">{t.ev_revenue != null ? t.ev_revenue.toFixed(2) : '-'}</td>
                  <td className="p-1 border border-default text-right text-primary">{t.premium != null ? (t.premium * 100).toFixed(1) + '%' : '-'}</td>
                  <td className="p-1 border border-default text-right text-primary">{t.deal_value != null ? '$' + (t.deal_value / 1e6).toFixed(1) + 'M' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ────────── OPTION STRATEGIES ────────── */

const STRATEGIES = [
  'Covered Call', 'Protective Put', 'Bull Call Spread',
  'Bear Put Spread', 'Iron Condor', 'Straddle', 'Strangle',
]

function payoffAtExpiry(S: number, K: number, strategy: string, K2?: number): number {
  switch (strategy) {
    case 'Covered Call':
      return S - Math.max(0, S - K)
    case 'Protective Put':
      return S + Math.max(0, K - S)
    case 'Bull Call Spread':
      return (K2 ? Math.max(0, S - K) - Math.max(0, S - K2) : 0)
    case 'Bear Put Spread':
      return (K2 ? Math.max(0, K2 - S) - Math.max(0, K - S) : 0)
    case 'Iron Condor': {
      const lowerK = K
      const upperK = K2 || K * 1.4
      const putSpread = Math.max(0, lowerK * 0.85 - S) - Math.max(0, lowerK - S)
      const callSpread = Math.max(0, S - upperK) - Math.max(0, S - upperK * 1.15)
      return -(putSpread + callSpread)
    }
    case 'Straddle':
      return Math.max(0, S - K) + Math.max(0, K - S)
    case 'Strangle':
      return (K2 ? Math.max(0, S - K2) + Math.max(0, K - S) : Math.max(0, S - K * 1.2) + Math.max(0, K * 0.8 - S))
    default:
      return 0
  }
}

function StrategiesForm() {
  const [spot, setSpot] = useState(100)
  const [strike, setStrike] = useState(100)
  const [strike2, setStrike2] = useState(120)
  const [expiry, setExpiry] = useState(1)
  const [rf, setRf] = useState(0.05)
  const [vol, setVol] = useState(0.2)
  const [strategy, setStrategy] = useState('Covered Call')

  const rangeStart = 0
  const rangeEnd = spot * 2.5
  const step = (rangeEnd - rangeStart) / 100
  const points: { s: number; pnl: number }[] = []
  let breakevens: number[] = []

  const currentStrike2 = strategy === 'Bull Call Spread' || strategy === 'Bear Put Spread' || strategy === 'Iron Condor' || strategy === 'Strangle' ? strike2 : undefined

  for (let s = rangeStart; s <= rangeEnd; s += step) {
    const pnl = payoffAtExpiry(s, strike, strategy, currentStrike2)
    points.push({ s, pnl })
  }

  if (strategy === 'Covered Call') {
    breakevens = [strike]
  } else if (strategy === 'Protective Put') {
    breakevens = [strike]
  } else if (strategy === 'Straddle') {
    breakevens = [strike]
  } else if (strategy === 'Strangle') {
    breakevens = [strike * 0.8, strike * 1.2]
  } else if (strategy === 'Bull Call Spread') {
    breakevens = [strike + (strike2 - strike) * 0.5]
  } else if (strategy === 'Bear Put Spread') {
    breakevens = [strike + (strike2 - strike) * 0.5]
  } else if (strategy === 'Iron Condor') {
    breakevens = [strike * 0.9, strike2 * 1.05]
  }

  const allPnl = points.map((p) => p.pnl)
  const maxPnl = Math.max(...allPnl.map(Math.abs), 10)
  const padding = maxPnl * 0.15

  const svgW = 500
  const svgH = 300
  const xScale = (s: number) => ((s - rangeStart) / (rangeEnd - rangeStart)) * svgW
  const yScale = (pnl: number) => svgH / 2 - (pnl / (maxPnl + padding)) * (svgH / 2)

  const pathD = points.map((p, i) => {
    const x = xScale(p.s)
    const y = yScale(p.pnl)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Visualize option strategy payoffs at expiry.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberInput label="Spot Price" value={spot} onChange={setSpot} />
        <NumberInput label="Strike 1" value={strike} onChange={setStrike} />
        <NumberInput label="Strike 2" value={strike2} onChange={setStrike2} />
        <NumberInput label="Time to Exp (yr)" value={expiry} onChange={setExpiry} />
        <NumberInput label="Risk Free Rate" value={rf} onChange={setRf} />
        <NumberInput label="Volatility" value={vol} onChange={setVol} />
      </div>
      <div>
        <label className="block text-xs text-secondary mb-1">Strategy</label>
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="w-full px-2 py-1.5 rounded-md text-sm bg-hover border border-input text-primary outline-none"
        >
          {STRATEGIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="border border-default rounded p-2 bg-[var(--bg-card)]">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ maxHeight: 320 }}>
          <line x1={0} y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="var(--border-color)" strokeWidth={1} />
          <line x1={xScale(spot)} y1={0} x2={xScale(spot)} y2={svgH} stroke="var(--border-color)" strokeWidth={0.5} strokeDasharray="4,4" />
          {breakevens.map((b, i) => (
            b > 0 && b < rangeEnd ? (
              <line key={i} x1={xScale(b)} y1={0} x2={xScale(b)} y2={svgH} stroke="var(--accent-green)" strokeWidth={0.5} strokeDasharray="2,2" />
            ) : null
          ))}
          <path d={pathD} fill="none" stroke="var(--accent-blue)" strokeWidth={2} />
          {breakevens.map((b, i) => (
            b > 0 && b < rangeEnd ? (
              <circle key={i} cx={xScale(b)} cy={yScale(0)} r={3} fill="var(--accent-green)" />
            ) : null
          ))}
          <text x={5} y={12} fill="var(--text-muted)" fontSize={9}>P&L</text>
          <text x={svgW - 5} y={svgH - 3} fill="var(--text-muted)" fontSize={9} textAnchor="end">Underlying Price</text>
        </svg>
      </div>

      <div className="text-[10px] text-muted space-y-1">
        <p>Dashed line: Current spot. Green dots: Breakeven(s).</p>
        <p className="font-bold text-primary">{strategy} Payoff</p>
      </div>
    </div>
  )
}
