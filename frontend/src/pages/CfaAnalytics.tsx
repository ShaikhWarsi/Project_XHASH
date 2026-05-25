import { useState } from 'react'
import Card from '../components/ui/Card'
import * as cfa from '../api/cfa'

type Tab = 'wacc' | 'dcf' | 'comps' | 'startup' | 'vc' | 'bonds' | 'ytm' | 'options' | 'greeks' | 'ratios' | 'dupont'

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
        {renderResult()}
      </Card>
    </div>
  )
}

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

function DcfForm({ onCalculate }: { onCalculate: () => void }) {
  const [fcf1, setFcf1] = useState(50000)
  const [fcf2, setFcf2] = useState(55000)
  const [fcf3, setFcf3] = useState(60000)
  const [fcf4, setFcf4] = useState(65000)
  const [fcf5, setFcf5] = useState(70000)
  const [tg, setTg] = useState(0.03)
  const [shares, setShares] = useState(1000000)
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
        <NumberInput label="Shares Outstanding" value={shares} onChange={setShares} step={10000} />
      </div>
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate DCF</button>
    </div>
  )
}

function CompsForm({ onCalculate }: { onCalculate: () => void }) {
  const [price, setPrice] = useState(150)
  const [shares, setShares] = useState(1000000)
  const [earnings, setEarnings] = useState(500000)
  const [ebitda, setEbitda] = useState(800000)
  const [revenue, setRevenue] = useState(2000000)
  const [bv, setBv] = useState(3000000)
  const [debt, setDebt] = useState(500000)
  const [cash, setCash] = useState(200000)
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
    </div>
  )
}

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

function BondsForm({ onCalculate }: { onCalculate: () => void }) {
  const [ytm, setYtm] = useState(0.05)
  const [face, setFace] = useState(1000)
  const [coupon, setCoupon] = useState(0.05)
  const [years, setYears] = useState(10)
  const [freq, setFreq] = useState(2)
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
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate Bond Price</button>
    </div>
  )
}

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

function DuPontForm({ onCalculate }: { onCalculate: () => void }) {
  const [ni, setNi] = useState(100000)
  const [rev, setRev] = useState(800000)
  const [ta, setTa] = useState(1000000)
  const [te, setTe] = useState(400000)
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
      <button onClick={onCalculate} className="px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-blue)] text-white border-none cursor-pointer">Calculate DuPont</button>
    </div>
  )
}

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
