from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from copy import deepcopy

import numpy as np


class DCFModel:
    def __init__(self, company_name: str = "Target Company"):
        self.company_name = company_name

    def calculate_wacc(
        self,
        risk_free_rate: float,
        market_risk_premium: float,
        beta: float,
        cost_of_debt: float,
        tax_rate: float,
        market_value_equity: float,
        market_value_debt: float,
        country_risk_premium: float = 0.0,
        size_premium: float = 0.0,
    ) -> Dict[str, Any]:
        if not (0 <= risk_free_rate <= 0.20):
            raise ValueError(f"Risk-free rate {risk_free_rate:.2%} outside valid range")
        if not (0 <= market_risk_premium <= 0.20):
            raise ValueError(f"Market risk premium {market_risk_premium:.2%} outside valid range")
        if not (0.1 <= beta <= 3.0):
            raise ValueError(f"Beta {beta} outside valid range")
        if not (0 <= cost_of_debt <= 0.30):
            raise ValueError(f"Cost of debt {cost_of_debt:.2%} outside valid range")
        if market_value_equity < 0 or market_value_debt < 0:
            raise ValueError("Market values cannot be negative")

        cost_of_equity = risk_free_rate + beta * market_risk_premium + country_risk_premium + size_premium
        after_tax_cost_of_debt = cost_of_debt * (1 - tax_rate)
        total_value = market_value_equity + market_value_debt
        equity_weight = market_value_equity / total_value if total_value > 0 else 0
        debt_weight = market_value_debt / total_value if total_value > 0 else 0
        wacc = equity_weight * cost_of_equity + debt_weight * after_tax_cost_of_debt

        return {
            "wacc": wacc,
            "wacc_pct": wacc * 100,
            "cost_of_equity": cost_of_equity * 100,
            "cost_of_debt_pretax": cost_of_debt * 100,
            "cost_of_debt_aftertax": after_tax_cost_of_debt * 100,
            "equity_weight": equity_weight * 100,
            "debt_weight": debt_weight * 100,
            "inputs": {
                "risk_free_rate": risk_free_rate * 100,
                "market_risk_premium": market_risk_premium * 100,
                "beta": beta,
                "tax_rate": tax_rate * 100,
                "country_risk_premium": country_risk_premium * 100,
                "size_premium": size_premium * 100,
            },
        }

    @staticmethod
    def unlever_beta(levered_beta: float, tax_rate: float, debt_to_equity: float) -> float:
        return levered_beta / (1 + (1 - tax_rate) * debt_to_equity)

    @staticmethod
    def relever_beta(unlevered_beta: float, tax_rate: float, target_debt_to_equity: float) -> float:
        return unlevered_beta * (1 + (1 - tax_rate) * target_debt_to_equity)

    def calculate_free_cash_flow(
        self,
        ebit: float,
        tax_rate: float,
        depreciation: float,
        capex: float,
        change_in_nwc: float,
        stock_based_comp: float = 0.0,
        maintenance_capex: Optional[float] = None,
        growth_capex: Optional[float] = None,
    ) -> Dict[str, Any]:
        if maintenance_capex is not None and growth_capex is not None:
            total_capex = maintenance_capex + growth_capex
        else:
            total_capex = capex
            maintenance_capex = capex * 0.6
            growth_capex = capex * 0.4

        nopat = ebit * (1 - tax_rate)
        nopat_adjusted = nopat + stock_based_comp
        fcf = nopat_adjusted + depreciation - total_capex - change_in_nwc

        return {
            "ebit": ebit,
            "tax": ebit * tax_rate,
            "nopat": nopat,
            "free_cash_flow": fcf,
            "components": {
                "nopat_adjusted": nopat_adjusted,
                "depreciation": depreciation,
                "capex": total_capex,
                "capex_maintenance": maintenance_capex,
                "capex_growth": growth_capex,
                "change_in_nwc": change_in_nwc,
                "stock_based_comp": stock_based_comp,
            },
        }

    def project_cash_flows(self, base_year_fcf: float, growth_rates: List[float]) -> List[Dict[str, Any]]:
        projections = []
        current_fcf = base_year_fcf
        for year, growth_rate in enumerate(growth_rates, 1):
            current_fcf *= 1 + growth_rate
            projections.append({"year": year, "growth_rate": growth_rate * 100, "fcf": current_fcf})
        return projections

    def calculate_terminal_value(
        self,
        final_year_fcf: float,
        terminal_growth_rate: float,
        wacc: float,
        method: str = "perpetuity",
        exit_multiple: Optional[float] = None,
        exit_metric: Optional[float] = None,
    ) -> Dict[str, Any]:
        if method == "perpetuity":
            if wacc <= terminal_growth_rate:
                raise ValueError("WACC must be greater than terminal growth rate")
            terminal_value = final_year_fcf * (1 + terminal_growth_rate) / (wacc - terminal_growth_rate)
            return {
                "method": "perpetuity_growth",
                "terminal_value": terminal_value,
                "terminal_growth_rate": terminal_growth_rate * 100,
                "terminal_year_fcf": final_year_fcf,
                "wacc": wacc * 100,
            }
        elif method == "exit_multiple":
            if exit_multiple is None or exit_metric is None:
                raise ValueError("exit_multiple and exit_metric required for exit_multiple method")
            terminal_value = exit_multiple * exit_metric
            return {
                "method": "exit_multiple",
                "terminal_value": terminal_value,
                "exit_multiple": exit_multiple,
                "exit_metric": exit_metric,
            }
        else:
            raise ValueError(f"Unknown method: {method}")

    def calculate_enterprise_value(
        self,
        fcf_projections: List[float],
        terminal_value: float,
        wacc: float,
        mid_year_convention: bool = False,
    ) -> Dict[str, Any]:
        pv_fcf_list = []
        pv_fcf_total = 0.0

        for year, fcf in enumerate(fcf_projections, 1):
            discount_factor = (1 + wacc) ** (year - 0.5 if mid_year_convention else year)
            pv = fcf / discount_factor
            pv_fcf_total += pv
            pv_fcf_list.append({"year": year, "fcf": fcf, "discount_factor": discount_factor, "present_value": pv})

        terminal_year = len(fcf_projections)
        terminal_discount_factor = (1 + wacc) ** (terminal_year - 0.5 if mid_year_convention else terminal_year)
        pv_terminal_value = terminal_value / terminal_discount_factor
        enterprise_value = pv_fcf_total + pv_terminal_value

        return {
            "pv_of_fcf": pv_fcf_total,
            "pv_of_terminal_value": pv_terminal_value,
            "enterprise_value": enterprise_value,
            "terminal_value_contribution": (pv_terminal_value / enterprise_value * 100) if enterprise_value > 0 else 0,
            "fcf_details": pv_fcf_list,
            "wacc_used": wacc * 100,
            "mid_year_convention": mid_year_convention,
        }

    def calculate_equity_value(
        self,
        enterprise_value: float,
        cash: float,
        debt: float,
        minority_interest: float = 0,
        preferred_stock: float = 0,
        excess_cash: Optional[float] = None,
    ) -> Dict[str, Any]:
        cash_to_add = excess_cash if excess_cash is not None else cash
        equity_value = enterprise_value + cash_to_add - debt - minority_interest - preferred_stock
        return {
            "enterprise_value": enterprise_value,
            "add_cash": cash_to_add,
            "total_cash": cash,
            "less_debt": debt,
            "less_minority_interest": minority_interest,
            "less_preferred_stock": preferred_stock,
            "equity_value": equity_value,
        }

    def calculate_price_per_share(
        self,
        equity_value: float,
        shares_outstanding: float,
        diluted_shares: Optional[float] = None,
    ) -> Dict[str, Any]:
        shares = diluted_shares if diluted_shares else shares_outstanding
        price_per_share = equity_value / shares if shares > 0 else 0
        return {
            "equity_value": equity_value,
            "shares_outstanding_basic": shares_outstanding,
            "shares_outstanding_diluted": diluted_shares,
            "shares_used": shares,
            "price_per_share": price_per_share,
        }

    def comprehensive_dcf(
        self,
        wacc_inputs: Dict[str, float],
        fcf_inputs: Dict[str, float],
        growth_rates: List[float],
        terminal_growth_rate: float,
        balance_sheet: Dict[str, float],
        shares_outstanding: float,
    ) -> Dict[str, Any]:
        wacc_result = self.calculate_wacc(**wacc_inputs)
        wacc = wacc_result["wacc"]

        base_fcf_calc = self.calculate_free_cash_flow(**fcf_inputs)
        base_fcf = base_fcf_calc["free_cash_flow"]

        fcf_projections = self.project_cash_flows(base_fcf, growth_rates)
        fcf_values = [p["fcf"] for p in fcf_projections]

        terminal_value_result = self.calculate_terminal_value(fcf_values[-1], terminal_growth_rate, wacc)

        ev_result = self.calculate_enterprise_value(fcf_values, terminal_value_result["terminal_value"], wacc)

        equity_result = self.calculate_equity_value(
            ev_result["enterprise_value"],
            balance_sheet.get("cash", 0),
            balance_sheet.get("debt", 0),
            balance_sheet.get("minority_interest", 0),
            balance_sheet.get("preferred_stock", 0),
        )

        price_result = self.calculate_price_per_share(
            equity_result["equity_value"],
            shares_outstanding,
            balance_sheet.get("diluted_shares"),
        )

        return {
            "company_name": self.company_name,
            "wacc": wacc_result,
            "base_year_fcf": base_fcf_calc,
            "fcf_projections": fcf_projections,
            "terminal_value": terminal_value_result,
            "enterprise_value": ev_result,
            "equity_value": equity_result,
            "valuation_per_share": price_result,
            "summary": {
                "enterprise_value": ev_result["enterprise_value"],
                "equity_value": equity_result["equity_value"],
                "price_per_share": price_result["price_per_share"],
                "wacc": wacc * 100,
                "terminal_growth": terminal_growth_rate * 100,
            },
        }

    def sensitivity_analysis(
        self,
        base_fcf: float,
        growth_rates: List[float],
        terminal_growth_scenarios: List[float],
        wacc_scenarios: List[float],
        balance_sheet: Dict[str, float],
        shares_outstanding: float,
    ) -> Dict[str, Any]:
        sensitivity_matrix = []

        for terminal_growth in terminal_growth_scenarios:
            for wacc in wacc_scenarios:
                if wacc <= terminal_growth:
                    continue

                fcf_values = [p["fcf"] for p in self.project_cash_flows(base_fcf, growth_rates)]

                terminal_value = self.calculate_terminal_value(fcf_values[-1], terminal_growth, wacc)["terminal_value"]

                ev = self.calculate_enterprise_value(fcf_values, terminal_value, wacc)

                equity = self.calculate_equity_value(
                    ev["enterprise_value"],
                    balance_sheet.get("cash", 0),
                    balance_sheet.get("debt", 0),
                    balance_sheet.get("minority_interest", 0),
                    balance_sheet.get("preferred_stock", 0),
                )

                price = self.calculate_price_per_share(equity["equity_value"], shares_outstanding)

                sensitivity_matrix.append({
                    "wacc": wacc * 100,
                    "terminal_growth": terminal_growth * 100,
                    "price_per_share": price["price_per_share"],
                    "equity_value": equity["equity_value"],
                })

        return {
            "sensitivity_matrix": sensitivity_matrix,
            "wacc_range": [min(wacc_scenarios) * 100, max(wacc_scenarios) * 100],
            "terminal_growth_range": [min(terminal_growth_scenarios) * 100, max(terminal_growth_scenarios) * 100],
        }


class TradingComps:
    def __init__(self, company_name: str = "Target Company"):
        self.company_name = company_name

    def calculate_metrics(
        self,
        price: float,
        shares_outstanding: float,
        earnings: float,
        ebitda: float,
        revenue: float,
        book_value: float,
        debt: float,
        cash: float,
    ) -> Dict[str, Any]:
        market_cap = price * shares_outstanding
        enterprise_value = market_cap + debt - cash

        return {
            "market_cap": market_cap,
            "enterprise_value": enterprise_value,
            "pe_ratio": price / (earnings / shares_outstanding) if earnings > 0 and shares_outstanding > 0 else None,
            "ev_ebitda": enterprise_value / ebitda if ebitda > 0 else None,
            "ev_revenue": enterprise_value / revenue if revenue > 0 else None,
            "price_book": price / (book_value / shares_outstanding) if book_value > 0 and shares_outstanding > 0 else None,
            "price_earnings": price / (earnings / shares_outstanding) if earnings > 0 and shares_outstanding > 0 else None,
        }

    def compare_comps(
        self,
        target_metrics: Dict[str, float],
        comp_metrics_list: List[Dict[str, float]],
    ) -> Dict[str, Any]:
        stats = {}
        for metric in ["pe_ratio", "ev_ebitda", "ev_revenue", "price_book"]:
            values = [c.get(metric) for c in comp_metrics_list if c.get(metric) is not None]
            if values:
                stats[metric] = {
                    "target": target_metrics.get(metric),
                    "mean": float(np.mean(values)),
                    "median": float(np.median(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values)),
                    "count": len(values),
                }

        return {"company": self.company_name, "target_metrics": target_metrics, "peer_stats": stats}


class PrecedentTransactions:
    def __init__(self):
        self.transactions: List[Dict[str, Any]] = []

    def add_transaction(self, transaction: Dict[str, Any]):
        self.transactions.append(transaction)

    def analyze(self) -> Dict[str, Any]:
        if not self.transactions:
            return {"error": "No transactions in database"}

        multiples = {}
        for mult_key in ["ev_revenue", "ev_ebitda", "pe_ratio"]:
            values = [t.get(mult_key) for t in self.transactions if t.get(mult_key) is not None]
            if values:
                multiples[mult_key] = {
                    "mean": float(np.mean(values)),
                    "median": float(np.median(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values)),
                    "std": float(np.std(values)),
                }

        total_value = sum(t.get("transaction_value", 0) for t in self.transactions)
        return {
            "num_transactions": len(self.transactions),
            "total_value": total_value,
            "multiples": multiples,
            "date_range": {
                "earliest": min(t.get("date", "") for t in self.transactions),
                "latest": max(t.get("date", "") for t in self.transactions),
            },
        }


class StartupValuation:
    @staticmethod
    def berkus_method(
        idea_quality: float = 0.0,
        prototype: float = 0.0,
        team: float = 0.0,
        strategic_relationships: float = 0.0,
        sales: float = 0.0,
        maximum_value: float = 2_000_000,
    ) -> Dict[str, Any]:
        total_adjustment = idea_quality + prototype + team + strategic_relationships + sales
        total_adjustment = max(0, min(total_adjustment, 20_000_000))
        valuation = max(maximum_value - 2_000_000 + total_adjustment, 0)
        return {
            "method": "Berkus",
            "pre_money_valuation": round(valuation, 2),
            "components": {
                "idea_quality": idea_quality,
                "prototype": prototype,
                "team": team,
                "strategic_relationships": strategic_relationships,
                "sales": sales,
            },
            "max_value": maximum_value,
        }

    @staticmethod
    def vc_method(
        exit_value: float,
        required_return_multiple: float = 10.0,
        investment_amount: Optional[float] = None,
        dilution: float = 0.0,
    ) -> Dict[str, Any]:
        terminal_value = exit_value / (1 + required_return_multiple)
        current_value = terminal_value / (1 + dilution) if dilution > 0 else terminal_value
        result = {
            "method": "VC Method",
            "terminal_value": terminal_value,
            "exit_value": exit_value,
            "required_return": required_return_multiple,
            "implied_ownership": (investment_amount / terminal_value * 100) if investment_amount and terminal_value > 0 else None,
        }
        if investment_amount is not None:
            result["ownership"] = investment_amount / terminal_value * 100 if terminal_value > 0 else 0
            result["current_value"] = current_value
        return result

    @staticmethod
    def scorecard_method(
        average_pre_money: float,
        strength_of_team: float = 1.0,
        size_of_opportunity: float = 1.0,
        product_technology: float = 1.0,
        competitive_environment: float = 1.0,
        marketing_sales: float = 1.0,
        need_for_additional_investment: float = 1.0,
        other_factors: float = 1.0,
    ) -> Dict[str, Any]:
        factor_weights = {
            "strength_of_team": 0.30,
            "size_of_opportunity": 0.25,
            "product_technology": 0.15,
            "competitive_environment": 0.10,
            "marketing_sales": 0.10,
            "need_for_additional_investment": 0.05,
            "other_factors": 0.05,
        }

        weighted_score = (
            strength_of_team * factor_weights["strength_of_team"]
            + size_of_opportunity * factor_weights["size_of_opportunity"]
            + product_technology * factor_weights["product_technology"]
            + competitive_environment * factor_weights["competitive_environment"]
            + marketing_sales * factor_weights["marketing_sales"]
            + need_for_additional_investment * factor_weights["need_for_additional_investment"]
            + other_factors * factor_weights["other_factors"]
        )

        valuation = average_pre_money * weighted_score

        return {
            "method": "Scorecard",
            "average_pre_money": average_pre_money,
            "weighted_score": round(weighted_score, 4),
            "pre_money_valuation": round(valuation, 2),
            "factors": {
                "strength_of_team": {"multiplier": strength_of_team, "weight": factor_weights["strength_of_team"]},
                "size_of_opportunity": {"multiplier": size_of_opportunity, "weight": factor_weights["size_of_opportunity"]},
                "product_technology": {"multiplier": product_technology, "weight": factor_weights["product_technology"]},
                "competitive_environment": {"multiplier": competitive_environment, "weight": factor_weights["competitive_environment"]},
                "marketing_sales": {"multiplier": marketing_sales, "weight": factor_weights["marketing_sales"]},
                "need_for_additional_investment": {"multiplier": need_for_additional_investment, "weight": factor_weights["need_for_additional_investment"]},
                "other_factors": {"multiplier": other_factors, "weight": factor_weights["other_factors"]},
            },
        }


class FootballField:
    def __init__(self, company_name: str = "Target Company"):
        self.company_name = company_name
        self.valuations: List[Dict[str, Any]] = []

    def add_valuation(self, method: str, low: float, high: float, midpoint: float):
        self.valuations.append({"method": method, "low": low, "high": high, "midpoint": midpoint})

    def summarize(self) -> Dict[str, Any]:
        if not self.valuations:
            return {"error": "No valuations added"}

        midpoints = [v["midpoint"] for v in self.valuations]
        return {
            "company": self.company_name,
            "valuations": self.valuations,
            "aggregate": {
                "mean_midpoint": float(np.mean(midpoints)),
                "median_midpoint": float(np.median(midpoints)),
                "overall_low": min(v["low"] for v in self.valuations),
                "overall_high": max(v["high"] for v in self.valuations),
            },
        }
