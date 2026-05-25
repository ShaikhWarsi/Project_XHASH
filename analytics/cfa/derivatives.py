from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

import numpy as np
from scipy.stats import norm
from scipy.optimize import brentq, minimize

from .base import OptionType, ExerciseStyle, UnderlyingType, MarketData, PricingResult, OptionGreeks, ValidationError


def _resolve_option_type(option_type):
    if isinstance(option_type, str):
        return OptionType.CALL if option_type.lower() == "call" else OptionType.PUT
    return option_type


class BlackScholesPricingEngine:
    def price(
        self,
        spot_price: float,
        strike_price: float,
        time_to_expiry: float,
        risk_free_rate: float,
        volatility: float,
        option_type: OptionType = OptionType.CALL,
        dividend_yield: float = 0.0,
    ) -> Dict[str, Any]:
        option_type = _resolve_option_type(option_type)
        if time_to_expiry <= 0:
            intrinsic = max(0, spot_price - strike_price) if option_type == OptionType.CALL else max(0, strike_price - spot_price)
            return {
                "fair_value": round(intrinsic, 4),
                "intrinsic_value": round(intrinsic, 4),
                "time_value": 0,
                "terminal": True,
            }

        d1 = (np.log(spot_price / strike_price) + (risk_free_rate - dividend_yield + 0.5 * volatility ** 2) * time_to_expiry) / (volatility * np.sqrt(time_to_expiry))
        d2 = d1 - volatility * np.sqrt(time_to_expiry)

        if option_type == OptionType.CALL:
            price = spot_price * np.exp(-dividend_yield * time_to_expiry) * norm.cdf(d1) - strike_price * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(d2)
            intrinsic = max(0, spot_price - strike_price)
            n_d1 = norm.pdf(d1)
            n_d2 = norm.cdf(d2)
            delta = np.exp(-dividend_yield * time_to_expiry) * norm.cdf(d1)
            theta = (-spot_price * n_d1 * volatility * np.exp(-dividend_yield * time_to_expiry) / (2 * np.sqrt(time_to_expiry))
                     - risk_free_rate * strike_price * np.exp(-risk_free_rate * time_to_expiry) * n_d2
                     + dividend_yield * spot_price * np.exp(-dividend_yield * time_to_expiry) * norm.cdf(d1)) / 365
            rho = strike_price * time_to_expiry * np.exp(-risk_free_rate * time_to_expiry) * n_d2 / 100
        else:
            price = strike_price * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(-d2) - spot_price * np.exp(-dividend_yield * time_to_expiry) * norm.cdf(-d1)
            intrinsic = max(0, strike_price - spot_price)
            n_d1 = norm.pdf(d1)
            n_d2 = norm.cdf(-d2)
            delta = -np.exp(-dividend_yield * time_to_expiry) * norm.cdf(-d1)
            theta = (-spot_price * n_d1 * volatility * np.exp(-dividend_yield * time_to_expiry) / (2 * np.sqrt(time_to_expiry))
                     + risk_free_rate * strike_price * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(-d2)
                     - dividend_yield * spot_price * np.exp(-dividend_yield * time_to_expiry) * norm.cdf(-d1)) / 365
            rho = -strike_price * time_to_expiry * np.exp(-risk_free_rate * time_to_expiry) * norm.cdf(-d2) / 100

        gamma = n_d1 * np.exp(-dividend_yield * time_to_expiry) / (spot_price * volatility * np.sqrt(time_to_expiry))
        vega = spot_price * n_d1 * np.sqrt(time_to_expiry) * np.exp(-dividend_yield * time_to_expiry) / 100

        return {
            "fair_value": round(price, 4),
            "intrinsic_value": round(intrinsic, 4),
            "time_value": round(price - intrinsic, 4),
            "greeks": {
                "delta": round(delta, 4),
                "gamma": round(gamma, 4),
                "theta": round(theta, 6),
                "vega": round(vega, 4),
                "rho": round(rho, 6),
            },
            "d1": round(d1, 6),
            "d2": round(d2, 6),
            "model": "Black-Scholes-Merton",
        }


class OptionGreeksCalculator:
    def __init__(self):
        self.bs = BlackScholesPricingEngine()

    def calculate_all(
        self,
        spot_price: float,
        strike_price: float,
        time_to_expiry: float,
        risk_free_rate: float,
        volatility: float,
        option_type: OptionType = OptionType.CALL,
        dividend_yield: float = 0.0,
    ) -> Dict[str, Any]:
        option_type = _resolve_option_type(option_type)
        result = self.bs.price(spot_price, strike_price, time_to_expiry, risk_free_rate, volatility, option_type, dividend_yield)
        return result["greeks"]


class OnePeriodBinomialModel:
    def price(
        self,
        spot_price: float,
        strike_price: float,
        time_to_expiry: float,
        risk_free_rate: float,
        volatility: float,
        option_type: OptionType = OptionType.CALL,
        dividend_yield: float = 0.0,
    ) -> Dict[str, Any]:
        option_type = _resolve_option_type(option_type)
        dt = time_to_expiry
        u = np.exp(volatility * np.sqrt(dt))
        d = 1 / u

        prob_up = (np.exp((risk_free_rate - dividend_yield) * dt) - d) / (u - d)

        stock_up = spot_price * u
        stock_down = spot_price * d

        if option_type == OptionType.CALL:
            payoff_up = max(0, stock_up - strike_price)
            payoff_down = max(0, stock_down - strike_price)
        else:
            payoff_up = max(0, strike_price - stock_up)
            payoff_down = max(0, strike_price - stock_down)

        option_price = (prob_up * payoff_up + (1 - prob_up) * payoff_down) * np.exp(-risk_free_rate * dt)

        return {
            "option_price": round(option_price, 4),
            "stock_up": round(stock_up, 4),
            "stock_down": round(stock_down, 4),
            "payoff_up": round(payoff_up, 4),
            "payoff_down": round(payoff_down, 4),
            "probability_up": round(prob_up, 6),
            "model": "One-Period Binomial",
        }


class TwoPeriodBinomialModel:
    def price(
        self,
        spot_price: float,
        strike_price: float,
        time_to_expiry: float,
        risk_free_rate: float,
        volatility: float,
        option_type: OptionType = OptionType.CALL,
        dividend_yield: float = 0.0,
    ) -> Dict[str, Any]:
        option_type = _resolve_option_type(option_type)
        dt = time_to_expiry / 2
        u = np.exp(volatility * np.sqrt(dt))
        d = 1 / u

        q = (np.exp((risk_free_rate - dividend_yield) * dt) - d) / (u - d)

        S_uu = spot_price * u * u
        S_ud = spot_price * u * d
        S_dd = spot_price * d * d

        if option_type == OptionType.CALL:
            payoff_uu = max(0, S_uu - strike_price)
            payoff_ud = max(0, S_ud - strike_price)
            payoff_dd = max(0, S_dd - strike_price)
        else:
            payoff_uu = max(0, strike_price - S_uu)
            payoff_ud = max(0, strike_price - S_ud)
            payoff_dd = max(0, strike_price - S_dd)

        V_u = (q * payoff_uu + (1 - q) * payoff_ud) * np.exp(-risk_free_rate * dt)
        V_d = (q * payoff_ud + (1 - q) * payoff_dd) * np.exp(-risk_free_rate * dt)
        option_price = (q * V_u + (1 - q) * V_d) * np.exp(-risk_free_rate * dt)

        return {
            "option_price": round(option_price, 4),
            "tree": {
                "S": round(spot_price, 4),
                "S_u": round(spot_price * u, 4),
                "S_d": round(spot_price * d, 4),
                "S_uu": round(S_uu, 4),
                "S_ud": round(S_ud, 4),
                "S_dd": round(S_dd, 4),
                "V_0": round(option_price, 4),
                "V_u": round(V_u, 4),
                "V_d": round(V_d, 4),
            },
            "probability_up": round(q, 6),
            "model": "Two-Period Binomial",
        }


class BinomialPricingEngine:
    def price(
        self,
        spot_price: float,
        strike_price: float,
        time_to_expiry: float,
        risk_free_rate: float,
        volatility: float,
        option_type: OptionType = OptionType.CALL,
        dividend_yield: float = 0.0,
        steps: int = 50,
        exercise_style: ExerciseStyle = ExerciseStyle.EUROPEAN,
    ) -> Dict[str, Any]:
        option_type = _resolve_option_type(option_type)
        if time_to_expiry <= 0:
            payoff = max(0, spot_price - strike_price) if option_type == OptionType.CALL else max(0, strike_price - spot_price)
            return {"fair_value": round(payoff, 4), "model": "Binomial Tree", "steps": steps}

        dt = time_to_expiry / steps
        u = np.exp(volatility * np.sqrt(dt))
        d = 1 / u
        prob_up = (np.exp((risk_free_rate - dividend_yield) * dt) - d) / (u - d)

        stock_tree = np.zeros((steps + 1, steps + 1))
        option_tree = np.zeros((steps + 1, steps + 1))

        for j in range(steps + 1):
            stock_tree[steps, j] = spot_price * (u ** (steps - j)) * (d ** j)
            payoff = stock_tree[steps, j] - strike_price if option_type == OptionType.CALL else strike_price - stock_tree[steps, j]
            option_tree[steps, j] = max(0, payoff)

        for i in range(steps - 1, -1, -1):
            for j in range(i + 1):
                stock_tree[i, j] = spot_price * (u ** (i - j)) * (d ** j)
                european_value = (prob_up * option_tree[i + 1, j] + (1 - prob_up) * option_tree[i + 1, j + 1]) * np.exp(-risk_free_rate * dt)

                if exercise_style == ExerciseStyle.AMERICAN:
                    exercise_value = max(0, stock_tree[i, j] - strike_price) if option_type == OptionType.CALL else max(0, strike_price - stock_tree[i, j])
                    option_tree[i, j] = max(european_value, exercise_value)
                else:
                    option_tree[i, j] = european_value

        fair_value = option_tree[0, 0]

        return {
            "fair_value": round(fair_value, 4),
            "model": "Binomial Tree",
            "steps": steps,
            "exercise_style": exercise_style.value,
            "u": round(u, 6),
            "d": round(d, 6),
            "prob_up": round(prob_up, 6),
            "dt": round(dt, 6),
        }


class ImpliedVolatilityCalculator:
    @staticmethod
    def calculate_iv(
        option_price: float,
        spot_price: float,
        strike_price: float,
        time_to_expiry: float,
        risk_free_rate: float,
        option_type: OptionType = OptionType.CALL,
        dividend_yield: float = 0.0,
    ) -> Dict[str, Any]:
        option_type = _resolve_option_type(option_type)

        def objective(vol):
            bs = BlackScholesPricingEngine()
            result = bs.price(spot_price, strike_price, time_to_expiry, risk_free_rate, vol[0], option_type, dividend_yield)
            return (result["fair_value"] - option_price) ** 2

        try:
            result = minimize(objective, [0.2], bounds=[(0.001, 5.0)], method="L-BFGS-B")
            implied_vol = result.x[0]
            return {"implied_volatility": round(implied_vol, 6), "implied_volatility_pct": round(implied_vol * 100, 4)}
        except (RuntimeError, ValueError):
            return {"error": "Could not calculate implied volatility"}


class PutCallParity:
    @staticmethod
    def european_parity(
        call_price: float,
        put_price: float,
        spot_price: float,
        strike_price: float,
        risk_free_rate: float,
        time_to_expiry: float,
        dividend_yield: float = 0.0,
    ) -> Dict[str, Any]:
        pv_strike = strike_price * np.exp(-risk_free_rate * time_to_expiry)
        pv_spot = spot_price * np.exp(-dividend_yield * time_to_expiry)
        left_side = call_price + pv_strike
        right_side = put_price + pv_spot
        arbitrage_profit = abs(left_side - right_side)

        return {
            "call_synthetic": round(put_price + pv_spot - pv_strike, 4),
            "put_synthetic": round(call_price + pv_strike - pv_spot, 4),
            "arbitrage_profit": round(arbitrage_profit, 4),
            "parity_holds": arbitrage_profit < 1e-4,
        }


class DeltaHedging:
    def __init__(self):
        self.bs = BlackScholesPricingEngine()

    def calculate_hedge_ratio(
        self,
        spot_price: float,
        strike_price: float,
        time_to_expiry: float,
        risk_free_rate: float,
        volatility: float,
        option_type: OptionType = OptionType.CALL,
        dividend_yield: float = 0.0,
    ) -> Dict[str, Any]:
        result = self.bs.price(spot_price, strike_price, time_to_expiry, risk_free_rate, volatility, option_type, dividend_yield)
        delta = result["greeks"]["delta"]
        return {"delta": delta, "hedge_ratio": round(-delta, 4), "hedge_direction": "short" if option_type == OptionType.CALL else "long"}


class CoveredCallStrategy:
    def __init__(self, stock_price: float, shares: int = 100):
        self.stock_price = stock_price
        self.shares = shares
        self.stock_value = stock_price * shares
        self.strike_price: Optional[float] = None
        self.premium_received: float = 0.0

    def write_call(self, strike_price: float, premium: float) -> Dict[str, Any]:
        self.strike_price = strike_price
        self.premium_received = premium * self.shares

        return {
            "strategy": "Covered Call",
            "stock_price": self.stock_price,
            "stock_value": self.stock_value,
            "call_strike": strike_price,
            "premium_per_share": premium,
            "total_premium": self.premium_received,
            "net_basis": self.stock_value - self.premium_received,
        }

    def calculate_payoff(self, stock_price_at_expiry: float) -> Dict[str, Any]:
        if self.strike_price is None:
            raise ValueError("No call option written")

        stock_value_final = stock_price_at_expiry * self.shares
        stock_pnl = stock_value_final - self.stock_value
        call_payoff = -max(0, stock_price_at_expiry - self.strike_price) * self.shares
        total_payoff = stock_pnl + call_payoff + self.premium_received

        return {
            "stock_price_at_expiry": stock_price_at_expiry,
            "stock_pnl": round(stock_pnl, 2),
            "call_payoff": round(call_payoff, 2),
            "premium_kept": round(self.premium_received, 2),
            "total_payoff": round(total_payoff, 2),
            "total_return_pct": round(total_payoff / self.stock_value * 100, 4) if self.stock_value > 0 else 0,
        }

    def payoff_profile(self, min_price: float, max_price: float, num_points: int = 50) -> List[Dict[str, Any]]:
        prices = np.linspace(min_price, max_price, num_points)
        return [self.calculate_payoff(float(p)) for p in prices]

    def breakeven_analysis(self) -> Dict[str, Any]:
        if self.strike_price is None:
            raise ValueError("No call option written")

        breakeven = self.stock_price - (self.premium_received / self.shares)
        return {
            "initial_stock_price": self.stock_price,
            "premium_per_share": self.premium_received / self.shares,
            "breakeven_price": round(breakeven, 2),
            "downside_protection_pct": round(self.premium_received / self.stock_value * 100, 4) if self.stock_value > 0 else 0,
        }

    def max_profit_and_loss(self) -> Dict[str, Any]:
        if self.strike_price is None:
            raise ValueError("No call option written")

        premium_per_share = self.premium_received / self.shares
        max_profit_per_share = (self.strike_price - self.stock_price) + premium_per_share
        max_loss_per_share = self.stock_price - premium_per_share

        return {
            "max_profit": {
                "per_share": round(max_profit_per_share, 2),
                "total": round(max_profit_per_share * self.shares, 2),
                "occurs_when": f"Stock >= ${self.strike_price} at expiry",
            },
            "max_loss": {
                "per_share": round(max_loss_per_share, 2),
                "total": round(max_loss_per_share * self.shares, 2),
                "occurs_when": "Stock goes to $0",
            },
            "risk_reward_ratio": round(abs(max_profit_per_share / max_loss_per_share), 4) if abs(max_loss_per_share) > 0 else float("inf"),
        }
