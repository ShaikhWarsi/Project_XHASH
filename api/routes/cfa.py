from __future__ import annotations

from typing import Optional, List

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from analytics.cfa.valuation import DCFModel, TradingComps, PrecedentTransactions, StartupValuation, FootballField
from analytics.cfa.fixed_income import BondPricer, DurationCalculator, ConvexityCalculator, YieldCurveBuilder, SpreadAnalyzer
from analytics.cfa.derivatives import (
    BlackScholesPricingEngine, BinomialPricingEngine,
    OnePeriodBinomialModel, TwoPeriodBinomialModel,
    ImpliedVolatilityCalculator, PutCallParity,
    DeltaHedging, CoveredCallStrategy, OptionGreeksCalculator,
)
from analytics.cfa.financial_statements import RatioAnalyzer, DuPontAnalyzer, EarningsQualityAnalyzer

router = APIRouter(prefix="/v1/cfa", tags=["cfa"])


class WACCRequest(BaseModel):
    risk_free_rate: float
    market_risk_premium: float
    beta: float
    cost_of_debt: float
    tax_rate: float
    market_value_equity: float
    market_value_debt: float
    country_risk_premium: float = 0.0
    size_premium: float = 0.0


class DCFRequest(BaseModel):
    wacc_inputs: dict
    fcf_inputs: dict
    growth_rates: List[float]
    terminal_growth_rate: float
    balance_sheet: dict
    shares_outstanding: float


class BondPriceRequest(BaseModel):
    ytm: float
    face_value: float = 1000.0
    coupon_rate: float = 0.05
    years_to_maturity: float = 10.0
    frequency: int = 2


class BondYTMRequest(BaseModel):
    price: float
    face_value: float = 1000.0
    coupon_rate: float = 0.05
    years_to_maturity: float = 10.0
    frequency: int = 2


class OptionPriceRequest(BaseModel):
    spot_price: float
    strike_price: float
    time_to_expiry: float
    risk_free_rate: float
    volatility: float
    option_type: str = "call"
    dividend_yield: float = 0.0


class BinomialOptionRequest(OptionPriceRequest):
    steps: int = 50
    exercise_style: str = "european"


class RatioAnalysisRequest(BaseModel):
    current_assets: float
    current_liabilities: float
    total_assets: float
    total_liabilities: float
    total_equity: float
    revenue: float
    net_income: float
    ebit: float
    interest_expense: float
    cost_of_goods_sold: float
    inventory: float = 0.0
    accounts_receivable: float = 0.0
    accounts_payable: float = 0.0
    cash: float = 0.0
    marketable_securities: float = 0.0


# ── Valuation endpoints ──────────────────────────────────


@router.post("/wacc")
async def calculate_wacc(req: WACCRequest):
    """Calculate Weighted Average Cost of Capital."""
    dcf = DCFModel()
    return dcf.calculate_wacc(
        req.risk_free_rate, req.market_risk_premium, req.beta,
        req.cost_of_debt, req.tax_rate, req.market_value_equity,
        req.market_value_debt, req.country_risk_premium, req.size_premium,
    )


@router.post("/dcf")
async def comprehensive_dcf(req: DCFRequest):
    """Complete DCF valuation from inputs to price per share."""
    dcf = DCFModel()
    return dcf.comprehensive_dcf(
        req.wacc_inputs, req.fcf_inputs, req.growth_rates,
        req.terminal_growth_rate, req.balance_sheet, req.shares_outstanding,
    )


@router.post("/dcf/sensitivity")
async def dcf_sensitivity(
    base_fcf: float = Query(...),
    growth_rates: str = Query(..., description="JSON list of growth rates"),
    terminal_growth_scenarios: str = Query(..., description="JSON list of terminal growth rates"),
    wacc_scenarios: str = Query(..., description="JSON list of WACC values"),
    cash: float = Query(0),
    debt: float = Query(0),
    shares_outstanding: float = Query(...),
):
    """Two-way sensitivity analysis (WACC vs Terminal Growth)."""
    import json
    dcf = DCFModel()
    balance_sheet = {"cash": cash, "debt": debt}
    return dcf.sensitivity_analysis(
        base_fcf, json.loads(growth_rates),
        json.loads(terminal_growth_scenarios), json.loads(wacc_scenarios),
        balance_sheet, shares_outstanding,
    )


@router.get("/comps")
async def trading_comps(
    price: float = Query(...),
    shares_outstanding: float = Query(...),
    earnings: float = Query(...),
    ebitda: float = Query(...),
    revenue: float = Query(...),
    book_value: float = Query(...),
    debt: float = Query(...),
    cash: float = Query(...),
):
    """Calculate valuation multiples for trading comparables."""
    comps = TradingComps()
    return comps.calculate_metrics(price, shares_outstanding, earnings, ebitda, revenue, book_value, debt, cash)


@router.post("/startup/berkus")
async def startup_berkus(
    idea_quality: float = Query(0),
    prototype: float = Query(0),
    team: float = Query(0),
    strategic_relationships: float = Query(0),
    sales: float = Query(0),
    maximum_value: float = Query(2_000_000),
):
    """Berkus method for startup valuation."""
    return StartupValuation.berkus_method(idea_quality, prototype, team, strategic_relationships, sales, maximum_value)


@router.post("/startup/vc")
async def startup_vc(
    exit_value: float = Query(...),
    required_return_multiple: float = Query(10.0),
    investment_amount: Optional[float] = Query(None),
    dilution: float = Query(0.0),
):
    """Venture Capital method for startup valuation."""
    return StartupValuation.vc_method(exit_value, required_return_multiple, investment_amount, dilution)


@router.post("/startup/scorecard")
async def startup_scorecard(
    average_pre_money: float = Query(...),
    strength_of_team: float = Query(1.0),
    size_of_opportunity: float = Query(1.0),
    product_technology: float = Query(1.0),
    competitive_environment: float = Query(1.0),
    marketing_sales: float = Query(1.0),
    need_for_additional_investment: float = Query(1.0),
    other_factors: float = Query(1.0),
):
    """Scorecard method for startup valuation."""
    return StartupValuation.scorecard_method(
        average_pre_money, strength_of_team, size_of_opportunity,
        product_technology, competitive_environment,
        marketing_sales, need_for_additional_investment, other_factors,
    )


# ── Fixed Income endpoints ───────────────────────────────


@router.post("/bond/price")
async def bond_price(req: BondPriceRequest):
    """Calculate bond price given yield to maturity."""
    pricer = BondPricer()
    return pricer.calculate_price(req.ytm, req.face_value, req.coupon_rate, req.years_to_maturity, req.frequency)


@router.post("/bond/ytm")
async def bond_ytm(req: BondYTMRequest):
    """Calculate yield to maturity given bond price."""
    pricer = BondPricer()
    return pricer.calculate_ytm(req.price, req.face_value, req.coupon_rate, req.years_to_maturity, req.frequency)


@router.post("/bond/ytc")
async def bond_ytc(
    price: float = Query(...),
    face_value: float = Query(1000.0),
    coupon_rate: float = Query(0.05),
    years_to_call: float = Query(5.0),
    call_price: float = Query(1050.0),
    frequency: int = Query(2),
):
    """Calculate yield to call for callable bonds."""
    pricer = BondPricer()
    return pricer.calculate_ytc(price, face_value, coupon_rate, years_to_call, call_price, frequency)


@router.post("/bond/ytw")
async def bond_ytw(
    price: float = Query(...),
    face_value: float = Query(1000.0),
    coupon_rate: float = Query(0.05),
    years_to_maturity: float = Query(10.0),
    call_schedule_json: Optional[str] = Query(None, description="JSON list of [years_to_call, call_price] tuples"),
    frequency: int = Query(2),
):
    """Calculate yield to worst (minimum of YTM and all YTCs)."""
    import json
    pricer = BondPricer()
    call_schedule = json.loads(call_schedule_json) if call_schedule_json else None
    return pricer.calculate_ytw(price, face_value, coupon_rate, years_to_maturity, call_schedule, frequency)


@router.get("/bond/accrued-interest")
async def bond_accrued_interest(
    coupon_rate: float = Query(...),
    face_value: float = Query(1000.0),
    days_since_last_coupon: int = Query(45),
    days_in_coupon_period: int = Query(180),
    frequency: int = Query(2),
):
    """Calculate accrued interest since last coupon payment."""
    pricer = BondPricer()
    return pricer.calculate_accrued_interest(coupon_rate, face_value, days_since_last_coupon, days_in_coupon_period, frequency=frequency)


@router.get("/bond/duration")
async def bond_duration(
    face_value: float = Query(1000.0),
    coupon_rate: float = Query(0.05),
    years_to_maturity: float = Query(10.0),
    ytm: float = Query(0.05),
    frequency: int = Query(2),
):
    """Calculate Macaulay and Modified duration, DV01."""
    dur = DurationCalculator()
    return {**dur.calculate_modified(face_value, coupon_rate, years_to_maturity, ytm, frequency)}


@router.get("/bond/convexity")
async def bond_convexity(
    face_value: float = Query(1000.0),
    coupon_rate: float = Query(0.05),
    years_to_maturity: float = Query(10.0),
    ytm: float = Query(0.05),
    frequency: int = Query(2),
):
    """Calculate bond convexity."""
    conv = ConvexityCalculator()
    return conv.calculate_convexity(face_value, coupon_rate, years_to_maturity, ytm, frequency)


@router.post("/yield-curve/bootstrap")
async def yield_curve_bootstrap(
    bonds_json: str = Query(..., description="JSON list of bond dicts with price, coupon_rate, maturity, face_value"),
    frequency: int = Query(2),
):
    """Bootstrap spot rate curve from bond prices."""
    import json
    builder = YieldCurveBuilder()
    bonds = json.loads(bonds_json)
    return builder.bootstrap_spot_curve(bonds, frequency)


@router.post("/yield-curve/nelson-siegel")
async def yield_curve_nelson_siegel(
    maturities_json: str = Query(..., description="JSON list of maturities"),
    yields_json: str = Query(..., description="JSON list of yields"),
):
    """Fit Nelson-Siegel model to yield curve."""
    import json
    builder = YieldCurveBuilder()
    return builder.fit_nelson_siegel(json.loads(maturities_json), json.loads(yields_json))


@router.get("/spread/g-spread")
async def g_spread(
    bond_ytm: float = Query(...),
    treasury_ytm: float = Query(...),
):
    """Calculate G-spread (Government spread)."""
    return SpreadAnalyzer.calculate_g_spread(bond_ytm, treasury_ytm)


@router.get("/spread/i-spread")
async def i_spread(
    bond_ytm: float = Query(...),
    swap_rate: float = Query(...),
):
    """Calculate I-spread (Interpolated spread over swaps)."""
    return SpreadAnalyzer.calculate_i_spread(bond_ytm, swap_rate)


# ── Derivatives endpoints ────────────────────────────────


@router.post("/options/price")
async def option_price(req: OptionPriceRequest):
    """Price European option using Black-Scholes-Merton with Greeks."""
    from analytics.cfa.base import OptionType as OT
    bs = BlackScholesPricingEngine()
    opt_type = OT.CALL if req.option_type.lower() == "call" else OT.PUT
    return bs.price(req.spot_price, req.strike_price, req.time_to_expiry, req.risk_free_rate, req.volatility, opt_type, req.dividend_yield)


@router.post("/options/binomial")
async def option_binomial(req: BinomialOptionRequest):
    """Price option using binomial tree (supports American exercise)."""
    from analytics.cfa.base import OptionType as OT, ExerciseStyle as ES
    engine = BinomialPricingEngine()
    opt_type = OT.CALL if req.option_type.lower() == "call" else OT.PUT
    ex_style = ES.AMERICAN if req.exercise_style.lower() == "american" else ES.EUROPEAN
    return engine.price(req.spot_price, req.strike_price, req.time_to_expiry, req.risk_free_rate, req.volatility, opt_type, req.dividend_yield, req.steps, ex_style)


@router.post("/options/implied-volatility")
async def implied_volatility(
    option_price: float = Query(...),
    spot_price: float = Query(...),
    strike_price: float = Query(...),
    time_to_expiry: float = Query(...),
    risk_free_rate: float = Query(...),
    option_type: str = Query("call"),
    dividend_yield: float = Query(0.0),
):
    """Calculate implied volatility from option price."""
    from analytics.cfa.base import OptionType as OT
    opt_type = OT.CALL if option_type.lower() == "call" else OT.PUT
    return ImpliedVolatilityCalculator.calculate_iv(option_price, spot_price, strike_price, time_to_expiry, risk_free_rate, opt_type, dividend_yield)


@router.post("/options/put-call-parity")
async def put_call_parity(
    call_price: float = Query(...),
    put_price: float = Query(...),
    spot_price: float = Query(...),
    strike_price: float = Query(...),
    risk_free_rate: float = Query(...),
    time_to_expiry: float = Query(...),
    dividend_yield: float = Query(0.0),
):
    """Verify European put-call parity."""
    return PutCallParity.european_parity(call_price, put_price, spot_price, strike_price, risk_free_rate, time_to_expiry, dividend_yield)


@router.post("/options/greeks")
async def option_greeks(
    spot_price: float = Query(...),
    strike_price: float = Query(...),
    time_to_expiry: float = Query(...),
    risk_free_rate: float = Query(...),
    volatility: float = Query(...),
    option_type: str = Query("call"),
    dividend_yield: float = Query(0.0),
):
    """Calculate all option Greeks (Delta, Gamma, Theta, Vega, Rho)."""
    from analytics.cfa.base import OptionType as OT
    calc = OptionGreeksCalculator()
    opt_type = OT.CALL if option_type.lower() == "call" else OT.PUT
    return calc.calculate_all(spot_price, strike_price, time_to_expiry, risk_free_rate, volatility, opt_type, dividend_yield)


@router.post("/options/covered-call")
async def covered_call(
    stock_price: float = Query(...),
    strike_price: float = Query(...),
    premium: float = Query(...),
    shares: int = Query(100),
    stock_price_at_expiry: Optional[float] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
):
    """Covered call strategy analysis."""
    cc = CoveredCallStrategy(stock_price, shares)
    result = cc.write_call(strike_price, premium)

    if stock_price_at_expiry is not None:
        result["payoff"] = cc.calculate_payoff(stock_price_at_expiry)

    if min_price is not None and max_price is not None:
        result["payoff_profile"] = cc.payoff_profile(min_price, max_price, 20)

    result["breakeven"] = cc.breakeven_analysis()
    result["max_profit_loss"] = cc.max_profit_and_loss()
    return result


# ── Financial Statement Analysis endpoints ───────────────


@router.post("/ratios")
async def financial_ratios(req: RatioAnalysisRequest):
    """Comprehensive financial ratio analysis."""
    return RatioAnalyzer.comprehensive_analysis(
        req.current_assets, req.current_liabilities,
        req.total_assets, req.total_liabilities, req.total_equity,
        req.revenue, req.net_income, req.ebit, req.interest_expense,
        req.cost_of_goods_sold, req.inventory,
        req.accounts_receivable, req.accounts_payable,
        req.cash, req.marketable_securities,
    )


@router.post("/dupont")
async def dupont_analysis(
    net_income: float = Query(...),
    revenue: float = Query(...),
    total_assets: float = Query(...),
    total_equity: float = Query(...),
):
    """Three-factor DuPont decomposition of ROE."""
    return DuPontAnalyzer.three_factor(net_income, revenue, total_assets, total_equity)


@router.post("/dupont/5-factor")
async def dupont_five_factor(
    net_income: float = Query(...),
    revenue: float = Query(...),
    total_assets: float = Query(...),
    total_equity: float = Query(...),
    ebt: float = Query(...),
    ebit: float = Query(...),
):
    """Five-factor DuPont decomposition of ROE."""
    return DuPontAnalyzer.five_factor(net_income, revenue, total_assets, total_equity, ebt, ebit)


@router.post("/earnings-quality")
async def earnings_quality(
    net_income: float = Query(...),
    cash_from_operations: float = Query(...),
    revenue: float = Query(...),
    total_assets: float = Query(...),
    accounts_receivable: float = Query(...),
):
    """Analyze earnings quality using accruals ratio and cash flow coverage."""
    return EarningsQualityAnalyzer.analyze(net_income, cash_from_operations, revenue, total_assets, accounts_receivable)


# ── Bonds one-pager endpoint ─────────────────────────────


@router.get("/bond/one-pager")
async def bond_one_pager(
    price: float = Query(...),
    face_value: float = Query(1000.0),
    coupon_rate: float = Query(0.05),
    years_to_maturity: float = Query(10.0),
    frequency: int = Query(2),
    ytm: Optional[float] = Query(None),
):
    """Comprehensive bond analytics in one call."""
    pricer = BondPricer()
    dur = DurationCalculator()
    conv = ConvexityCalculator()

    result = {}

    if ytm is not None:
        result["price"] = pricer.calculate_price(ytm, face_value, coupon_rate, years_to_maturity, frequency)

    result["ytm"] = pricer.calculate_ytm(price, face_value, coupon_rate, years_to_maturity, frequency)

    result["duration"] = dur.calculate_modified(face_value, coupon_rate, years_to_maturity, frequency, frequency=frequency)

    result["convexity"] = conv.calculate_convexity(face_value, coupon_rate, years_to_maturity, frequency, frequency=frequency)

    return result
