from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional, Dict, Any, List, Tuple

import numpy as np
from scipy import optimize, interpolate

from .base import BondType, CouponFrequency, DayCountConvention, ValidationError


class BondPricer:
    def __init__(self):
        pass

    def calculate_price(
        self,
        ytm: float,
        face_value: float = 1000.0,
        coupon_rate: float = 0.05,
        years_to_maturity: float = 10.0,
        frequency: int = 2,
    ) -> Dict[str, Any]:
        if frequency == 0:
            price = face_value / ((1 + ytm) ** years_to_maturity)
            return {
                "price": round(price, 4),
                "pv_coupons": 0.0,
                "pv_principal": round(price, 4),
                "num_periods": years_to_maturity,
                "bond_type": "zero_coupon",
            }

        periods = int(years_to_maturity * frequency)
        periodic_rate = ytm / frequency
        coupon_payment = (coupon_rate * face_value) / frequency

        if periodic_rate > 0:
            pv_coupons = coupon_payment * (1 - (1 + periodic_rate) ** -periods) / periodic_rate
        else:
            pv_coupons = coupon_payment * periods

        pv_principal = face_value / ((1 + periodic_rate) ** periods)
        price = pv_coupons + pv_principal

        return {
            "price": round(price, 4),
            "pv_coupons": round(pv_coupons, 4),
            "pv_principal": round(pv_principal, 4),
            "num_periods": periods,
            "periodic_coupon": round(coupon_payment, 4),
            "periodic_rate": round(periodic_rate, 6),
            "premium_discount": round(price - face_value, 4),
            "price_percent": round((price / face_value) * 100, 4),
        }

    def calculate_ytm(
        self,
        price: float,
        face_value: float = 1000.0,
        coupon_rate: float = 0.05,
        years_to_maturity: float = 10.0,
        frequency: int = 2,
    ) -> Dict[str, Any]:
        coupon_payment = (coupon_rate * face_value) / frequency if frequency > 0 else 0
        periods = int(years_to_maturity * frequency) if frequency > 0 else years_to_maturity

        def price_diff(y):
            if frequency == 0:
                return face_value / ((1 + y) ** years_to_maturity) - price
            periodic_rate = y / frequency
            if periodic_rate <= -1:
                return float("inf")
            pv_coupons = coupon_payment * (1 - (1 + periodic_rate) ** -periods) / periodic_rate if periodic_rate != 0 else coupon_payment * periods
            pv_principal = face_value / ((1 + periodic_rate) ** periods)
            return pv_coupons + pv_principal - price

        try:
            ytm = optimize.brentq(price_diff, -0.99, 2.0, xtol=1e-10)
        except (ValueError, RuntimeError):
            try:
                ytm = optimize.newton(price_diff, coupon_rate, tol=1e-10)
            except (RuntimeError, ValueError):
                return {"error": "Could not converge to YTM solution"}

        current_yield = (coupon_rate * face_value) / price if price > 0 else 0
        bey = ytm if frequency == 2 else 2 * ((1 + ytm / frequency) ** (frequency / 2) - 1)
        eay = (1 + ytm / frequency) ** frequency - 1 if frequency > 0 else ytm

        return {
            "ytm": round(ytm, 6),
            "ytm_percent": round(ytm * 100, 4),
            "current_yield": round(current_yield, 6),
            "current_yield_percent": round(current_yield * 100, 4),
            "bond_equivalent_yield": round(bey, 6),
            "effective_annual_yield": round(eay, 6),
            "price_used": price,
            "is_premium": price > face_value,
            "is_discount": price < face_value,
        }

    def calculate_ytc(
        self,
        price: float,
        face_value: float = 1000.0,
        coupon_rate: float = 0.05,
        years_to_call: float = 5.0,
        call_price: float = 1050.0,
        frequency: int = 2,
    ) -> Dict[str, Any]:
        coupon_payment = (coupon_rate * face_value) / frequency
        periods = int(years_to_call * frequency)

        def price_diff(y):
            periodic_rate = y / frequency
            if periodic_rate <= -1:
                return float("inf")
            pv_coupons = coupon_payment * (1 - (1 + periodic_rate) ** -periods) / periodic_rate if periodic_rate != 0 else coupon_payment * periods
            pv_call = call_price / ((1 + periodic_rate) ** periods)
            return pv_coupons + pv_call - price

        try:
            ytc = optimize.brentq(price_diff, -0.99, 2.0, xtol=1e-10)
        except (ValueError, RuntimeError):
            try:
                ytc = optimize.newton(price_diff, coupon_rate, tol=1e-10)
            except (RuntimeError, ValueError):
                return {"error": "Could not converge to YTC solution"}

        return {
            "ytc": round(ytc, 6),
            "ytc_percent": round(ytc * 100, 4),
            "years_to_call": years_to_call,
            "call_price": call_price,
            "call_premium": round(call_price - face_value, 2),
        }

    def calculate_ytw(
        self,
        price: float,
        face_value: float = 1000.0,
        coupon_rate: float = 0.05,
        years_to_maturity: float = 10.0,
        call_schedule: Optional[List[Tuple[float, float]]] = None,
        frequency: int = 2,
    ) -> Dict[str, Any]:
        yields = []

        ytm_result = self.calculate_ytm(price, face_value, coupon_rate, years_to_maturity, frequency)
        if "ytm" in ytm_result:
            yields.append(("YTM", ytm_result["ytm"], years_to_maturity))

        if call_schedule:
            for years_to_call, call_price in call_schedule:
                ytc_result = self.calculate_ytc(price, face_value, coupon_rate, years_to_call, call_price, frequency)
                if "ytc" in ytc_result:
                    yields.append((f"YTC_{years_to_call}y", ytc_result["ytc"], years_to_call))

        if not yields:
            return {"error": "No valid yields calculated"}

        min_yield = min(yields, key=lambda x: x[1])

        return {
            "ytw": round(min_yield[1], 6),
            "ytw_percent": round(min_yield[1] * 100, 4),
            "ytw_type": min_yield[0],
            "ytw_horizon": min_yield[2],
            "all_yields": [{"type": y[0], "yield": round(y[1], 6), "horizon": y[2]} for y in yields],
        }

    def calculate_accrued_interest(
        self,
        coupon_rate: float,
        face_value: float = 1000.0,
        days_since_last_coupon: int = 45,
        days_in_coupon_period: int = 180,
        day_count: DayCountConvention = DayCountConvention.THIRTY_360,
        frequency: int = 2,
    ) -> Dict[str, Any]:
        coupon_payment = (coupon_rate * face_value) / frequency

        if day_count == DayCountConvention.THIRTY_360:
            accrual_fraction = days_since_last_coupon / 360 * frequency
        elif day_count == DayCountConvention.ACT_365:
            accrual_fraction = days_since_last_coupon / 365 * frequency
        elif day_count == DayCountConvention.ACT_360:
            accrual_fraction = days_since_last_coupon / 360 * frequency
        else:
            accrual_fraction = days_since_last_coupon / days_in_coupon_period

        accrued_interest = coupon_payment * accrual_fraction

        return {
            "accrued_interest": round(accrued_interest, 4),
            "accrual_fraction": round(accrual_fraction, 6),
            "coupon_payment": round(coupon_payment, 4),
            "days_since_last_coupon": days_since_last_coupon,
            "days_in_period": days_in_coupon_period,
            "day_count_convention": day_count.value,
        }


class DurationCalculator:
    def calculate_macaulay(
        self,
        face_value: float = 1000.0,
        coupon_rate: float = 0.05,
        years_to_maturity: float = 10.0,
        ytm: float = 0.05,
        frequency: int = 2,
    ) -> Dict[str, Any]:
        if frequency == 0:
            price = face_value / ((1 + ytm) ** years_to_maturity)
            return {"macaulay_duration": years_to_maturity, "price": round(price, 4)}

        periods = int(years_to_maturity * frequency)
        periodic_rate = ytm / frequency
        coupon = (coupon_rate * face_value) / frequency

        weighted_cf_sum = 0.0
        price = 0.0
        cash_flow_details = []

        for t in range(1, periods + 1):
            time_in_years = t / frequency
            cf = coupon if t < periods else coupon + face_value
            discount_factor = 1 / ((1 + periodic_rate) ** t)
            pv_cf = cf * discount_factor
            weighted_cf = time_in_years * pv_cf

            price += pv_cf
            weighted_cf_sum += weighted_cf

            cash_flow_details.append({
                "period": t,
                "time_years": round(time_in_years, 4),
                "cash_flow": round(cf, 2),
                "pv": round(pv_cf, 4),
            })

        macaulay_duration = weighted_cf_sum / price if price > 0 else 0

        return {
            "macaulay_duration": round(macaulay_duration, 4),
            "macaulay_duration_periods": round(macaulay_duration * frequency, 4),
            "price": round(price, 4),
            "cash_flow_details": cash_flow_details,
        }

    def calculate_modified(
        self,
        face_value: float = 1000.0,
        coupon_rate: float = 0.05,
        years_to_maturity: float = 10.0,
        ytm: float = 0.05,
        frequency: int = 2,
    ) -> Dict[str, Any]:
        mac_result = self.calculate_macaulay(face_value, coupon_rate, years_to_maturity, ytm, frequency)
        macaulay_duration = mac_result["macaulay_duration"]
        price = mac_result["price"]

        modified_duration = macaulay_duration / (1 + ytm / frequency) if frequency > 0 else macaulay_duration / (1 + ytm)
        dollar_duration = modified_duration * price / 100
        dv01 = modified_duration * price * 0.0001

        return {
            "modified_duration": round(modified_duration, 4),
            "macaulay_duration": round(macaulay_duration, 4),
            "dollar_duration": round(dollar_duration, 4),
            "dv01": round(dv01, 4),
            "price": round(price, 4),
        }

    def calculate_effective(
        self,
        price: float,
        price_up: float,
        price_down: float,
        delta_yield: float = 0.01,
    ) -> Dict[str, Any]:
        if price <= 0 or delta_yield <= 0:
            return {"error": "Invalid inputs"}

        effective_duration = (price_down - price_up) / (2 * price * delta_yield)

        return {
            "effective_duration": round(effective_duration, 4),
            "delta_yield": delta_yield,
            "delta_yield_bps": round(delta_yield * 10000, 0),
            "price_base": round(price, 4),
            "price_up": round(price_up, 4),
            "price_down": round(price_down, 4),
        }


class ConvexityCalculator:
    def calculate_convexity(
        self,
        face_value: float = 1000.0,
        coupon_rate: float = 0.05,
        years_to_maturity: float = 10.0,
        ytm: float = 0.05,
        frequency: int = 2,
    ) -> Dict[str, Any]:
        if frequency == 0:
            price = face_value / ((1 + ytm) ** years_to_maturity)
            convexity = years_to_maturity * (years_to_maturity + 1) / ((1 + ytm) ** 2)
            return {"convexity": round(convexity, 4), "price": round(price, 4), "bond_type": "zero_coupon"}

        periods = int(years_to_maturity * frequency)
        periodic_rate = ytm / frequency
        coupon = (coupon_rate * face_value) / frequency

        price = 0.0
        convexity_sum = 0.0

        for t in range(1, periods + 1):
            cf = coupon if t < periods else coupon + face_value
            discount_factor = 1 / ((1 + periodic_rate) ** t)
            pv_cf = cf * discount_factor
            price += pv_cf
            convexity_sum += t * (t + 1) * pv_cf

        convexity = convexity_sum / (price * ((1 + periodic_rate) ** 2) * (frequency ** 2)) if price > 0 else 0

        return {
            "convexity": round(convexity, 4),
            "dollar_convexity": round(convexity * price / 100, 4),
            "price": round(price, 4),
        }

    def price_change_with_convexity(
        self,
        modified_duration: float,
        convexity: float,
        price: float,
        yield_change: float,
    ) -> Dict[str, Any]:
        duration_effect = -modified_duration * yield_change
        convexity_effect = 0.5 * convexity * (yield_change ** 2)
        total_pct_change = duration_effect + convexity_effect

        return {
            "yield_change": yield_change,
            "yield_change_bps": round(yield_change * 10000, 0),
            "duration_effect_pct": round(duration_effect * 100, 4),
            "convexity_effect_pct": round(convexity_effect * 100, 4),
            "total_change_pct": round(total_pct_change * 100, 4),
            "duration_effect_dollar": round(duration_effect * price, 4),
            "convexity_effect_dollar": round(convexity_effect * price, 4),
            "total_change_dollar": round(total_pct_change * price, 4),
            "original_price": round(price, 4),
            "estimated_new_price": round(price * (1 + total_pct_change), 4),
        }


class YieldCurveBuilder:
    def __init__(self):
        self._spot_curve = None

    def bootstrap_spot_curve(
        self,
        bonds: List[Dict[str, float]],
        frequency: int = 2,
    ) -> Dict[str, Any]:
        spot_rates = []
        discount_factors = []

        for bond in sorted(bonds, key=lambda x: x.get("maturity", 0)):
            price = bond.get("price", 1000)
            coupon_rate = bond.get("coupon_rate", 0)
            maturity = bond.get("maturity", 1)
            face_value = bond.get("face_value", 1000)

            coupon = (coupon_rate * face_value) / frequency
            periods = int(maturity * frequency)

            if coupon_rate == 0 or len(spot_rates) == 0:
                spot = (face_value / price) ** (1 / maturity) - 1
            else:
                pv_coupons = 0
                for i, sr in enumerate(spot_rates):
                    t = (i + 1) / frequency
                    if t < maturity:
                        pv_coupons += coupon / ((1 + sr) ** t)

                remaining = price - pv_coupons
                final_cf = coupon + face_value
                spot = (final_cf / remaining) ** (1 / maturity) - 1 if remaining > 0 else 0

            spot_rates.append(spot)
            discount_factors.append(1 / ((1 + spot) ** maturity))

        curve_points = [
            {
                "maturity": bonds[i].get("maturity", i + 1),
                "spot_rate": round(spot_rates[i], 6),
                "spot_rate_pct": round(spot_rates[i] * 100, 4),
                "discount_factor": round(discount_factors[i], 6),
            }
            for i in range(len(spot_rates))
        ]

        return {"spot_curve": curve_points, "num_points": len(curve_points), "method": "bootstrap"}

    def calculate_forward_curve(
        self,
        spot_rates: List[Tuple[float, float]],
        forward_periods: Optional[List[Tuple[float, float]]] = None,
    ) -> Dict[str, Any]:
        if forward_periods is None:
            maturities_list = [sr[0] for sr in spot_rates]
            forward_periods = [(maturities_list[i], maturities_list[i + 1]) for i in range(len(maturities_list) - 1)]

        mat_array = np.array([sr[0] for sr in spot_rates])
        rate_array = np.array([sr[1] for sr in spot_rates])
        spot_interp = interpolate.interp1d(mat_array, rate_array, kind="linear", fill_value="extrapolate")

        forward_rates = []
        for t1, t2 in forward_periods:
            s1 = float(spot_interp(t1))
            s2 = float(spot_interp(t2))
            if t2 > t1:
                forward = ((1 + s2) ** t2 / (1 + s1) ** t1) ** (1 / (t2 - t1)) - 1
                forward_rates.append({
                    "start": t1,
                    "end": t2,
                    "period": f"{t1}y x {t2}y",
                    "forward_rate": round(forward, 6),
                    "forward_rate_pct": round(forward * 100, 4),
                    "spot_t1": round(s1, 6),
                    "spot_t2": round(s2, 6),
                })

        return {"forward_curve": forward_rates, "num_points": len(forward_rates)}

    def fit_nelson_siegel(
        self,
        maturities: List[float],
        yields: List[float],
    ) -> Dict[str, Any]:
        maturities_arr = np.array(maturities)
        yields_arr = np.array(yields)

        def nelson_siegel(t, b0, b1, b2, tau):
            if tau <= 0:
                return np.full_like(t, np.inf)
            x = t / tau
            with np.errstate(divide="ignore", invalid="ignore"):
                factor1 = np.where(x > 0, (1 - np.exp(-x)) / x, 1)
                factor2 = factor1 - np.exp(-x)
            return b0 + b1 * factor1 + b2 * factor2

        def objective(params):
            return np.sum((nelson_siegel(maturities_arr, *params) - yields_arr) ** 2)

        b0_init = yields[-1]
        b1_init = yields[0] - yields[-1]

        try:
            result = optimize.minimize(
                objective, [b0_init, b1_init, 0, 2],
                method="Nelder-Mead", options={"maxiter": 1000}
            )
            b0, b1, b2, tau = result.x
        except (RuntimeError, ValueError):
            return {"error": "Failed to fit Nelson-Siegel model"}

        fitted_maturities = np.linspace(0.25, max(maturities), 50)
        fitted_yields = nelson_siegel(fitted_maturities, b0, b1, b2, tau)
        fitted_at_data = nelson_siegel(maturities_arr, b0, b1, b2, tau)
        rmse = float(np.sqrt(np.mean((yields_arr - fitted_at_data) ** 2)))
        r_squared = float(1 - np.sum((yields_arr - fitted_at_data) ** 2) / max(np.sum((yields_arr - np.mean(yields_arr)) ** 2), 1e-10))

        return {
            "parameters": {
                "beta0": round(b0, 6),
                "beta1": round(b1, 6),
                "beta2": round(b2, 6),
                "tau": round(tau, 4),
            },
            "fitted_curve": [{"maturity": round(m, 2), "yield": round(y, 6)} for m, y in zip(fitted_maturities, fitted_yields)],
            "fit_statistics": {"rmse": round(rmse, 6), "r_squared": round(r_squared, 4)},
        }

    def analyze_curve_shape(
        self,
        maturities: List[float],
        yields: List[float],
    ) -> Dict[str, Any]:
        maturities_arr = np.array(maturities)
        yields_arr = np.array(yields)

        short_rate = yields_arr[0]
        long_rate = yields_arr[-1]
        mid_idx = len(yields_arr) // 2
        mid_rate = yields_arr[mid_idx]
        slope = long_rate - short_rate

        if slope > 0.005:
            shape = "Normal (Upward Sloping)"
        elif slope < -0.005:
            shape = "Inverted (Downward Sloping)"
        else:
            shape = "Flat"

        if mid_rate > short_rate and mid_rate > long_rate:
            shape = "Humped"
        elif mid_rate < short_rate and mid_rate < long_rate:
            shape = "U-Shaped"

        def get_rate_at_maturity(target):
            for i, m in enumerate(maturities_arr):
                if abs(m - target) < 0.1:
                    return yields_arr[i]
            return None

        spread_2s10s = None
        spread_3m10y = None
        rate_2y = get_rate_at_maturity(2)
        rate_10y = get_rate_at_maturity(10)
        rate_3m = get_rate_at_maturity(0.25)

        if rate_2y is not None and rate_10y is not None:
            spread_2s10s = rate_10y - rate_2y
        if rate_3m is not None and rate_10y is not None:
            spread_3m10y = rate_10y - rate_3m

        return {
            "curve_shape": shape,
            "short_rate": round(float(short_rate), 4),
            "long_rate": round(float(long_rate), 4),
            "slope": round(float(slope), 4),
            "slope_bps": round(float(slope) * 10000, 1),
            "spread_2s10s_bps": round(spread_2s10s * 10000, 1) if spread_2s10s is not None else None,
            "spread_3m10y_bps": round(spread_3m10y * 10000, 1) if spread_3m10y is not None else None,
        }


class SpreadAnalyzer:
    @staticmethod
    def calculate_g_spread(bond_ytm: float, treasury_ytm: float) -> Dict[str, Any]:
        g_spread = bond_ytm - treasury_ytm
        return {
            "g_spread": round(g_spread, 6),
            "g_spread_bps": round(g_spread * 10000, 1),
            "bond_ytm": round(bond_ytm, 6),
            "treasury_ytm": round(treasury_ytm, 6),
        }

    @staticmethod
    def calculate_i_spread(bond_ytm: float, swap_rate: float) -> Dict[str, Any]:
        i_spread = bond_ytm - swap_rate
        return {
            "i_spread": round(i_spread, 6),
            "i_spread_bps": round(i_spread * 10000, 1),
            "bond_ytm": round(bond_ytm, 6),
            "swap_rate": round(swap_rate, 6),
        }

    @staticmethod
    def calculate_z_spread(
        bond_price: float,
        cash_flows: List[Tuple[float, float]],
        spot_rates: List[Tuple[float, float]],
    ) -> Dict[str, Any]:
        mat_array = np.array([sr[0] for sr in spot_rates])
        rate_array = np.array([sr[1] for sr in spot_rates])
        spot_interp = interpolate.interp1d(mat_array, rate_array, kind="linear", fill_value="extrapolate")

        def price_with_spread(z_spread):
            pv = 0.0
            for t, cf in cash_flows:
                spot = float(spot_interp(t))
                pv += cf / ((1 + spot + z_spread) ** t)
            return pv

        def objective(z_spread):
            return (price_with_spread(z_spread[0]) - bond_price) ** 2

        try:
            result = optimize.minimize(objective, [0.01], method="Nelder-Mead")
            z_spread = result.x[0]
        except (RuntimeError, ValueError):
            return {"error": "Failed to calculate Z-spread"}

        return {
            "z_spread": round(z_spread, 6),
            "z_spread_bps": round(z_spread * 10000, 1),
            "bond_price": round(bond_price, 4),
            "calculated_price": round(price_with_spread(z_spread), 4),
        }

    @staticmethod
    def calculate_oas(
        bond_price: float,
        cash_flows: List[Tuple[float, float]],
        spot_rates: List[Tuple[float, float]],
        option_value: float = 0,
    ) -> Dict[str, Any]:
        z_result = SpreadAnalyzer.calculate_z_spread(bond_price, cash_flows, spot_rates)
        if "error" in z_result:
            return z_result

        z_spread = z_result["z_spread"]
        oas = z_spread - option_value

        return {
            "oas": round(oas, 6),
            "oas_bps": round(oas * 10000, 1),
            "z_spread_bps": z_result["z_spread_bps"],
            "option_cost": round(option_value, 6),
        }
