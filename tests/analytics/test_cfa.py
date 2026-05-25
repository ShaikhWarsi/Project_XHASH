from __future__ import annotations

import json

import pytest


class TestDCFModel:
    def test_wacc(self):
        from analytics.cfa.valuation import DCFModel

        dcf = DCFModel()
        result = dcf.calculate_wacc(
            risk_free_rate=0.05,
            market_risk_premium=0.06,
            beta=1.2,
            cost_of_debt=0.04,
            tax_rate=0.21,
            market_value_equity=800_000_000,
            market_value_debt=200_000_000,
        )
        assert result["wacc_pct"] > 0
        assert 0.08 < result["wacc"] < 0.12
        assert abs(result["equity_weight"] - 80) < 1
        assert abs(result["debt_weight"] - 20) < 1

    def test_wacc_validation(self):
        from analytics.cfa.valuation import DCFModel

        dcf = DCFModel()
        with pytest.raises(ValueError):
            dcf.calculate_wacc(0.25, 0.06, 1.2, 0.04, 0.21, 800_000_000, 200_000_000)

    def test_free_cash_flow(self):
        from analytics.cfa.valuation import DCFModel

        dcf = DCFModel()
        result = dcf.calculate_free_cash_flow(
            ebit=100_000_000, tax_rate=0.21, depreciation=20_000_000,
            capex=30_000_000, change_in_nwc=5_000_000,
        )
        assert result["free_cash_flow"] > 0
        assert result["nopat"] == 79_000_000

    def test_terminal_value(self):
        from analytics.cfa.valuation import DCFModel

        dcf = DCFModel()
        result = dcf.calculate_terminal_value(
            final_year_fcf=100_000_000, terminal_growth_rate=0.025, wacc=0.09
        )
        assert result["terminal_value"] > 1_000_000_000
        assert result["method"] == "perpetuity_growth"

    def test_enterprise_value(self):
        from analytics.cfa.valuation import DCFModel

        dcf = DCFModel()
        ev_result = dcf.calculate_enterprise_value(
            fcf_projections=[100, 110, 121, 133, 146],
            terminal_value=2000,
            wacc=0.10,
        )
        assert ev_result["enterprise_value"] > 0
        assert ev_result["pv_of_terminal_value"] > 0
        assert len(ev_result["fcf_details"]) == 5

    def test_comprehensive_dcf(self):
        from analytics.cfa.valuation import DCFModel

        dcf = DCFModel("TestCo")
        result = dcf.comprehensive_dcf(
            wacc_inputs={
                "risk_free_rate": 0.05, "market_risk_premium": 0.06,
                "beta": 1.2, "cost_of_debt": 0.04, "tax_rate": 0.21,
                "market_value_equity": 800_000_000, "market_value_debt": 200_000_000,
            },
            fcf_inputs={
                "ebit": 100_000_000, "tax_rate": 0.21, "depreciation": 20_000_000,
                "capex": 30_000_000, "change_in_nwc": 5_000_000,
            },
            growth_rates=[0.10, 0.10, 0.08, 0.06, 0.04],
            terminal_growth_rate=0.025,
            balance_sheet={"cash": 50_000_000, "debt": 200_000_000},
            shares_outstanding=10_000_000,
        )
        assert result["summary"]["price_per_share"] > 0
        assert result["company_name"] == "TestCo"
        assert "enterprise_value" in result["summary"]

    def test_sensitivity_analysis(self):
        from analytics.cfa.valuation import DCFModel

        dcf = DCFModel()
        result = dcf.sensitivity_analysis(
            base_fcf=100,
            growth_rates=[0.10, 0.10, 0.08, 0.06, 0.04],
            terminal_growth_scenarios=[0.02, 0.025, 0.03],
            wacc_scenarios=[0.08, 0.09, 0.10],
            balance_sheet={"cash": 50, "debt": 200},
            shares_outstanding=10,
        )
        assert len(result["sensitivity_matrix"]) > 0
        for entry in result["sensitivity_matrix"]:
            assert entry["price_per_share"] > 0

    def test_beta_levering(self):
        from analytics.cfa.valuation import DCFModel

        unlevered = DCFModel.unlever_beta(1.2, 0.21, 0.5)
        assert unlevered < 1.2
        relevered = DCFModel.relever_beta(unlevered, 0.21, 0.5)
        assert abs(relevered - 1.2) < 0.01


class TestTradingComps:
    def test_calculate_metrics(self):
        from analytics.cfa.valuation import TradingComps

        comps = TradingComps("Target")
        result = comps.calculate_metrics(
            price=100, shares_outstanding=1_000_000,
            earnings=50_000_000, ebitda=80_000_000,
            revenue=200_000_000, book_value=300_000_000,
            debt=50_000_000, cash=20_000_000,
        )
        assert result["market_cap"] == 100_000_000
        assert result["ev_ebitda"] is not None
        assert result["pe_ratio"] == 2.0


class TestStartupValuation:
    def test_berkus(self):
        from analytics.cfa.valuation import StartupValuation

        result = StartupValuation.berkus_method(
            idea_quality=500_000, prototype=500_000,
            team=500_000, strategic_relationships=250_000, sales=250_000,
        )
        assert result["pre_money_valuation"] > 0

    def test_vc_method(self):
        from analytics.cfa.valuation import StartupValuation

        result = StartupValuation.vc_method(
            exit_value=100_000_000, required_return_multiple=10.0,
            investment_amount=5_000_000,
        )
        assert result["terminal_value"] > 0

    def test_scorecard(self):
        from analytics.cfa.valuation import StartupValuation

        result = StartupValuation.scorecard_method(
            average_pre_money=5_000_000,
            strength_of_team=1.5, size_of_opportunity=1.2,
        )
        assert result["pre_money_valuation"] > 0
        assert result["method"] == "Scorecard"


class TestBondPricer:
    def test_price(self):
        from analytics.cfa.fixed_income import BondPricer

        pricer = BondPricer()
        result = pricer.calculate_price(ytm=0.05, coupon_rate=0.05, years_to_maturity=10)
        assert abs(result["price"] - 1000) < 1

    def test_price_premium(self):
        from analytics.cfa.fixed_income import BondPricer

        pricer = BondPricer()
        result = pricer.calculate_price(ytm=0.04, coupon_rate=0.05, years_to_maturity=10)
        assert result["price"] > 1000

    def test_ytm(self):
        from analytics.cfa.fixed_income import BondPricer

        pricer = BondPricer()
        result = pricer.calculate_ytm(price=925.61, coupon_rate=0.05, years_to_maturity=10)
        assert "error" not in result
        assert 0.05 < result["ytm"] < 0.07

    def test_ytc(self):
        from analytics.cfa.fixed_income import BondPricer

        pricer = BondPricer()
        result = pricer.calculate_ytc(
            price=980, coupon_rate=0.05,
            years_to_call=5, call_price=1050,
        )
        assert "error" not in result
        assert result["ytc_percent"] > 0

    def test_accrued_interest(self):
        from analytics.cfa.fixed_income import BondPricer

        pricer = BondPricer()
        result = pricer.calculate_accrued_interest(
            coupon_rate=0.05, days_since_last_coupon=45, frequency=2,
        )
        assert result["accrued_interest"] > 0

    def test_zero_coupon(self):
        from analytics.cfa.fixed_income import BondPricer

        pricer = BondPricer()
        result = pricer.calculate_price(ytm=0.05, face_value=1000, coupon_rate=0, years_to_maturity=10, frequency=0)
        assert result["bond_type"] == "zero_coupon"
        assert result["price"] < 1000


class TestDuration:
    def test_macaulay(self):
        from analytics.cfa.fixed_income import DurationCalculator

        dur = DurationCalculator()
        result = dur.calculate_macaulay(coupon_rate=0.05, years_to_maturity=10, ytm=0.05)
        assert 7 < result["macaulay_duration"] < 9

    def test_modified(self):
        from analytics.cfa.fixed_income import DurationCalculator

        dur = DurationCalculator()
        result = dur.calculate_modified(coupon_rate=0.05, years_to_maturity=10, ytm=0.05)
        assert result["modified_duration"] > 0
        assert result["dv01"] > 0

    def test_zero_coupon_duration(self):
        from analytics.cfa.fixed_income import DurationCalculator

        dur = DurationCalculator()
        result = dur.calculate_macaulay(coupon_rate=0, years_to_maturity=10, ytm=0.05, frequency=0)
        assert result["macaulay_duration"] == 10


class TestConvexity:
    def test_convexity(self):
        from analytics.cfa.fixed_income import ConvexityCalculator

        conv = ConvexityCalculator()
        result = conv.calculate_convexity(coupon_rate=0.05, years_to_maturity=10, ytm=0.05)
        assert result["convexity"] > 0

    def test_price_change(self):
        from analytics.cfa.fixed_income import ConvexityCalculator

        conv = ConvexityCalculator()
        result = conv.price_change_with_convexity(
            modified_duration=7.5, convexity=60, price=1000, yield_change=0.01
        )
        assert result["estimated_new_price"] < 1000
        assert result["convexity_effect_pct"] > 0


class TestYieldCurve:
    def test_bootstrap(self):
        from analytics.cfa.fixed_income import YieldCurveBuilder

        builder = YieldCurveBuilder()
        bonds = [
            {"price": 950, "coupon_rate": 0, "maturity": 1, "face_value": 1000},
            {"price": 980, "coupon_rate": 0.04, "maturity": 2, "face_value": 1000},
        ]
        result = builder.bootstrap_spot_curve(bonds)
        assert result["num_points"] == 2
        assert result["spot_curve"][0]["spot_rate_pct"] > 0

    def test_nelson_siegel(self):
        from analytics.cfa.fixed_income import YieldCurveBuilder

        builder = YieldCurveBuilder()
        maturities = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30]
        yields_rates = [0.045, 0.046, 0.047, 0.048, 0.049, 0.050, 0.051, 0.052, 0.053, 0.054]
        result = builder.fit_nelson_siegel(maturities, yields_rates)
        assert "error" not in result
        assert result["fit_statistics"]["r_squared"] > 0.9

    def test_forward_curve(self):
        from analytics.cfa.fixed_income import YieldCurveBuilder

        builder = YieldCurveBuilder()
        spot_rates = [(1, 0.05), (2, 0.055), (3, 0.06)]
        result = builder.calculate_forward_curve(spot_rates)
        assert result["num_points"] > 0

    def test_curve_shape(self):
        from analytics.cfa.fixed_income import YieldCurveBuilder

        builder = YieldCurveBuilder()
        result = builder.analyze_curve_shape(
            [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30],
            [0.045, 0.046, 0.047, 0.048, 0.049, 0.050, 0.051, 0.052, 0.053, 0.054],
        )
        assert result["curve_shape"] == "Normal (Upward Sloping)"
        assert result["slope_bps"] > 0


class TestSpreadAnalyzer:
    def test_g_spread(self):
        from analytics.cfa.fixed_income import SpreadAnalyzer

        result = SpreadAnalyzer.calculate_g_spread(bond_ytm=0.055, treasury_ytm=0.045)
        assert abs(result["g_spread_bps"] - 100) < 1


class TestBlackScholes:
    def test_call_price(self):
        from analytics.cfa.derivatives import BlackScholesPricingEngine

        bs = BlackScholesPricingEngine()
        result = bs.price(
            spot_price=100, strike_price=100, time_to_expiry=1,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        )
        assert result["fair_value"] > 0
        assert "greeks" in result
        assert result["greeks"]["delta"] > 0.5

    def test_put_price(self):
        from analytics.cfa.derivatives import BlackScholesPricingEngine

        bs = BlackScholesPricingEngine()
        result = bs.price(
            spot_price=100, strike_price=100, time_to_expiry=1,
            risk_free_rate=0.05, volatility=0.20, option_type="put",
        )
        assert result["fair_value"] > 0
        assert result["greeks"]["delta"] < 0

    def test_atm_call_delta(self):
        from analytics.cfa.derivatives import BlackScholesPricingEngine

        bs = BlackScholesPricingEngine()
        result = bs.price(
            spot_price=100, strike_price=100, time_to_expiry=1,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        )
        assert 0.5 < result["greeks"]["delta"] < 0.7

    def test_otm_call(self):
        from analytics.cfa.derivatives import BlackScholesPricingEngine

        bs = BlackScholesPricingEngine()
        result = bs.price(
            spot_price=100, strike_price=150, time_to_expiry=1,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        )
        assert result["fair_value"] < 5

    def test_terminal_payoff(self):
        from analytics.cfa.derivatives import BlackScholesPricingEngine

        bs = BlackScholesPricingEngine()
        result = bs.price(
            spot_price=120, strike_price=100, time_to_expiry=0,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        )
        assert result["fair_value"] == 20.0
        assert result["terminal"]


class TestBinomial:
    def test_one_period(self):
        from analytics.cfa.derivatives import OnePeriodBinomialModel

        model = OnePeriodBinomialModel()
        result = model.price(
            spot_price=100, strike_price=100, time_to_expiry=1,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        )
        assert result["option_price"] > 0

    def test_two_period(self):
        from analytics.cfa.derivatives import TwoPeriodBinomialModel

        model = TwoPeriodBinomialModel()
        result = model.price(
            spot_price=100, strike_price=100, time_to_expiry=1,
            risk_free_rate=0.05, volatility=0.20, option_type="call",
        )
        assert result["option_price"] > 0

    def test_american_vs_european(self):
        from analytics.cfa.base import OptionType, ExerciseStyle
        from analytics.cfa.derivatives import BinomialPricingEngine

        engine = BinomialPricingEngine()
        euro = engine.price(
            spot_price=100, strike_price=110, time_to_expiry=1,
            risk_free_rate=0.05, volatility=0.30, option_type="put",
            exercise_style=ExerciseStyle.EUROPEAN, steps=100,
        )
        amer = engine.price(
            spot_price=100, strike_price=110, time_to_expiry=1,
            risk_free_rate=0.05, volatility=0.30, option_type="put",
            exercise_style=ExerciseStyle.AMERICAN, steps=100,
        )
        assert amer["fair_value"] >= euro["fair_value"]


class TestImpliedVolatility:
    def test_iv_calculation(self):
        from analytics.cfa.derivatives import ImpliedVolatilityCalculator

        result = ImpliedVolatilityCalculator.calculate_iv(
            option_price=10, spot_price=100, strike_price=100,
            time_to_expiry=1, risk_free_rate=0.05, option_type="call",
        )
        assert "error" not in result
        assert result["implied_volatility_pct"] > 0


class TestPutCallParity:
    def test_parity(self):
        from analytics.cfa.derivatives import PutCallParity, BlackScholesPricingEngine

        bs = BlackScholesPricingEngine()
        call = bs.price(spot_price=100, strike_price=100, time_to_expiry=1, risk_free_rate=0.05, volatility=0.20, option_type="call")
        put = bs.price(spot_price=100, strike_price=100, time_to_expiry=1, risk_free_rate=0.05, volatility=0.20, option_type="put")

        result = PutCallParity.european_parity(
            call_price=call["fair_value"], put_price=put["fair_value"],
            spot_price=100, strike_price=100,
            risk_free_rate=0.05, time_to_expiry=1,
        )
        assert result["parity_holds"]


class TestCoveredCall:
    def test_write_call(self):
        from analytics.cfa.derivatives import CoveredCallStrategy

        cc = CoveredCallStrategy(stock_price=100, shares=100)
        result = cc.write_call(strike_price=110, premium=5)
        assert result["total_premium"] == 500
        assert result["net_basis"] == 9500

    def test_payoff_assigned(self):
        from analytics.cfa.derivatives import CoveredCallStrategy

        cc = CoveredCallStrategy(stock_price=100, shares=100)
        cc.write_call(strike_price=110, premium=5)
        result = cc.calculate_payoff(stock_price_at_expiry=120)
        # Called away: stock gains + premium - option loss = (120-100)*100 + 500 - (120-110)*100
        assert result["total_payoff"] == 1500

    def test_payoff_below_strike(self):
        from analytics.cfa.derivatives import CoveredCallStrategy

        cc = CoveredCallStrategy(stock_price=100, shares=100)
        cc.write_call(strike_price=110, premium=5)
        result = cc.calculate_payoff(stock_price_at_expiry=90)
        # Stock loss + premium kept = (90-100)*100 + 500 = -500
        assert result["total_payoff"] == -500

    def test_breakeven(self):
        from analytics.cfa.derivatives import CoveredCallStrategy

        cc = CoveredCallStrategy(stock_price=100, shares=100)
        cc.write_call(strike_price=110, premium=5)
        result = cc.breakeven_analysis()
        assert result["breakeven_price"] == 95

    def test_max_profit_loss(self):
        from analytics.cfa.derivatives import CoveredCallStrategy

        cc = CoveredCallStrategy(stock_price=100, shares=100)
        cc.write_call(strike_price=110, premium=5)
        result = cc.max_profit_and_loss()
        assert result["max_profit"]["per_share"] == 15
        assert result["max_loss"]["per_share"] == 95


class TestRatioAnalyzer:
    def test_liquidity(self):
        from analytics.cfa.financial_statements import RatioAnalyzer

        result = RatioAnalyzer.liquidity_ratios(
            current_assets=500_000, current_liabilities=200_000,
            inventory=100_000, cash=50_000,
        )
        assert result["current_ratio"] == 2.5
        assert result["quick_ratio"] == 2.0

    def test_solvency(self):
        from analytics.cfa.financial_statements import RatioAnalyzer

        result = RatioAnalyzer.solvency_ratios(
            total_assets=1_000_000, total_liabilities=400_000,
            total_equity=600_000, ebit=100_000, interest_expense=20_000,
            debt=400_000,
        )
        assert result["debt_to_equity"] < 1.0
        assert result["interest_coverage"] == 5.0

    def test_profitability(self):
        from analytics.cfa.financial_statements import RatioAnalyzer

        result = RatioAnalyzer.profitability_ratios(
            net_income=100_000, revenue=1_000_000,
            total_assets=2_000_000, total_equity=1_000_000,
            ebit=150_000,
        )
        assert result["net_margin"] == 0.1
        assert result["return_on_assets"] == 0.05
        assert result["return_on_equity"] == 0.1

    def test_comprehensive(self):
        from analytics.cfa.financial_statements import RatioAnalyzer

        result = RatioAnalyzer.comprehensive_analysis(
            current_assets=500_000, current_liabilities=200_000,
            total_assets=2_000_000, total_liabilities=800_000,
            total_equity=1_200_000, revenue=1_000_000,
            net_income=100_000, ebit=150_000, interest_expense=30_000,
            cost_of_goods_sold=600_000,
        )
        assert "liquidity" in result
        assert "solvency" in result
        assert "profitability" in result
        assert "efficiency" in result


class TestDuPont:
    def test_three_factor(self):
        from analytics.cfa.financial_statements import DuPontAnalyzer

        result = DuPontAnalyzer.three_factor(
            net_income=100_000, revenue=1_000_000,
            total_assets=2_000_000, total_equity=1_000_000,
        )
        assert result["roe"] == 0.1
        assert result["roe_pct"] == 10.0

    def test_five_factor(self):
        from analytics.cfa.financial_statements import DuPontAnalyzer

        result = DuPontAnalyzer.five_factor(
            net_income=100_000, revenue=1_000_000,
            total_assets=2_000_000, total_equity=1_000_000,
            ebt=120_000, ebit=150_000,
        )
        assert result["roe_pct"] > 0


class TestEarningsQuality:
    def test_high_quality(self):
        from analytics.cfa.financial_statements import EarningsQualityAnalyzer

        result = EarningsQualityAnalyzer.analyze(
            net_income=100_000, cash_from_operations=110_000,
            revenue=1_000_000, total_assets=2_000_000,
            accounts_receivable=150_000,
        )
        assert result["earnings_quality"] in ("High", "Moderate")
        assert result["cash_flow_coverage"] > 1.0
