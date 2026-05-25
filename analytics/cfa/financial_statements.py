from __future__ import annotations

from typing import Optional, Dict, Any


class RatioAnalyzer:
    @staticmethod
    def liquidity_ratios(
        current_assets: float,
        current_liabilities: float,
        inventory: float = 0.0,
        cash: float = 0.0,
        marketable_securities: float = 0.0,
        accounts_receivable: float = 0.0,
    ) -> Dict[str, Any]:
        current_ratio = current_assets / current_liabilities if current_liabilities > 0 else None
        quick_ratio = (current_assets - inventory) / current_liabilities if current_liabilities > 0 else None
        cash_ratio = (cash + marketable_securities) / current_liabilities if current_liabilities > 0 else None

        return {
            "current_ratio": round(current_ratio, 4) if current_ratio is not None else None,
            "quick_ratio": round(quick_ratio, 4) if quick_ratio is not None else None,
            "cash_ratio": round(cash_ratio, 4) if cash_ratio is not None else None,
            "interpretation": {
                "current_ratio": "Above 2.0 = strong, below 1.0 = potential liquidity concerns",
                "quick_ratio": "Above 1.0 = strong, below 0.5 = concerning",
                "cash_ratio": "Above 0.5 = strong liquidity position",
            },
        }

    @staticmethod
    def solvency_ratios(
        total_assets: float,
        total_liabilities: float,
        total_equity: float,
        ebit: float,
        interest_expense: float,
        debt: float,
        ebitda: Optional[float] = None,
    ) -> Dict[str, Any]:
        debt_to_equity = total_liabilities / total_equity if total_equity > 0 else None
        debt_to_assets = total_liabilities / total_assets if total_assets > 0 else None
        interest_coverage = ebit / interest_expense if interest_expense > 0 else None
        equity_multiplier = total_assets / total_equity if total_equity > 0 else None

        return {
            "debt_to_equity": round(debt_to_equity, 4) if debt_to_equity is not None else None,
            "debt_to_assets": round(debt_to_assets, 4) if debt_to_assets is not None else None,
            "interest_coverage": round(interest_coverage, 4) if interest_coverage is not None else None,
            "equity_multiplier": round(equity_multiplier, 4) if equity_multiplier is not None else None,
            "interpretation": {
                "debt_to_equity": "Below 1.0 = conservative, above 2.0 = aggressive leverage",
                "interest_coverage": "Above 3.0 = safe, below 1.5 = distress risk",
            },
        }

    @staticmethod
    def profitability_ratios(
        net_income: float,
        revenue: float,
        total_assets: float,
        total_equity: float,
        ebit: float,
        ebitda: Optional[float] = None,
        gross_profit: Optional[float] = None,
    ) -> Dict[str, Any]:
        net_margin = net_income / revenue if revenue > 0 else None
        roa = net_income / total_assets if total_assets > 0 else None
        roe = net_income / total_equity if total_equity > 0 else None
        operating_margin = ebit / revenue if revenue > 0 else None
        gross_margin = gross_profit / revenue if gross_profit is not None and revenue > 0 else None
        ebitda_margin = ebitda / revenue if ebitda is not None and revenue > 0 else None

        return {
            "net_margin": round(net_margin, 4) if net_margin is not None else None,
            "operating_margin": round(operating_margin, 4) if operating_margin is not None else None,
            "gross_margin": round(gross_margin, 4) if gross_margin is not None else None,
            "ebitda_margin": round(ebitda_margin, 4) if ebitda_margin is not None else None,
            "return_on_assets": round(roa, 4) if roa is not None else None,
            "return_on_equity": round(roe, 4) if roe is not None else None,
            "interpretation": {
                "net_margin": "Varies by industry; 10-20% is healthy for most sectors",
                "roe": "Above 15% = strong, above 25% = exceptional",
                "roa": "Above 5% = efficient, above 10% = very efficient",
            },
        }

    @staticmethod
    def efficiency_ratios(
        revenue: float,
        total_assets: float,
        accounts_receivable: float,
        inventory: float,
        accounts_payable: float,
        cost_of_goods_sold: float,
    ) -> Dict[str, Any]:
        asset_turnover = revenue / total_assets if total_assets > 0 else None
        receivables_turnover = revenue / accounts_receivable if accounts_receivable > 0 else None
        inventory_turnover = cost_of_goods_sold / inventory if inventory > 0 else None
        payables_turnover = cost_of_goods_sold / accounts_payable if accounts_payable > 0 else None

        return {
            "asset_turnover": round(asset_turnover, 4) if asset_turnover is not None else None,
            "receivables_turnover": round(receivables_turnover, 4) if receivables_turnover is not None else None,
            "inventory_turnover": round(inventory_turnover, 4) if inventory_turnover is not None else None,
            "payables_turnover": round(payables_turnover, 4) if payables_turnover is not None else None,
            "interpretation": {
                "asset_turnover": "Higher = more efficient asset utilization",
                "inventory_turnover": "Higher = efficient inventory management, but too high may indicate stockouts",
            },
        }

    @staticmethod
    def comprehensive_analysis(
        current_assets: float,
        current_liabilities: float,
        total_assets: float,
        total_liabilities: float,
        total_equity: float,
        revenue: float,
        net_income: float,
        ebit: float,
        interest_expense: float,
        cost_of_goods_sold: float,
        inventory: float = 0.0,
        accounts_receivable: float = 0.0,
        accounts_payable: float = 0.0,
        cash: float = 0.0,
        marketable_securities: float = 0.0,
        gross_profit: Optional[float] = None,
        ebitda: Optional[float] = None,
    ) -> Dict[str, Any]:
        liquidity = RatioAnalyzer.liquidity_ratios(current_assets, current_liabilities, inventory, cash, marketable_securities, accounts_receivable)
        solvency = RatioAnalyzer.solvency_ratios(total_assets, total_liabilities, total_equity, ebit, interest_expense, total_liabilities, ebitda)
        profitability = RatioAnalyzer.profitability_ratios(net_income, revenue, total_assets, total_equity, ebit, ebitda, gross_profit)
        efficiency = RatioAnalyzer.efficiency_ratios(revenue, total_assets, accounts_receivable, inventory, accounts_payable, cost_of_goods_sold)

        return {
            "liquidity": liquidity,
            "solvency": solvency,
            "profitability": profitability,
            "efficiency": efficiency,
        }


class DuPontAnalyzer:
    @staticmethod
    def three_factor(
        net_income: float,
        revenue: float,
        total_assets: float,
        total_equity: float,
    ) -> Dict[str, Any]:
        profit_margin = net_income / revenue if revenue > 0 else 0
        asset_turnover = revenue / total_assets if total_assets > 0 else 0
        equity_multiplier = total_assets / total_equity if total_equity > 0 else 0
        roe = profit_margin * asset_turnover * equity_multiplier

        return {
            "roe": round(roe, 4),
            "roe_pct": round(roe * 100, 4),
            "profit_margin": round(profit_margin, 4),
            "asset_turnover": round(asset_turnover, 4),
            "equity_multiplier": round(equity_multiplier, 4),
            "decomposition": f"ROE = {round(profit_margin, 4)} x {round(asset_turnover, 4)} x {round(equity_multiplier, 4)} = {round(roe, 4)}",
        }

    @staticmethod
    def five_factor(
        net_income: float,
        revenue: float,
        total_assets: float,
        total_equity: float,
        ebt: float,
        ebit: float,
    ) -> Dict[str, Any]:
        tax_burden = net_income / ebt if ebt > 0 else 0
        interest_burden = ebt / ebit if ebit > 0 else 0
        profit_margin = ebit / revenue if revenue > 0 else 0
        asset_turnover = revenue / total_assets if total_assets > 0 else 0
        equity_multiplier = total_assets / total_equity if total_equity > 0 else 0
        roe = tax_burden * interest_burden * profit_margin * asset_turnover * equity_multiplier

        return {
            "roe": round(roe, 4),
            "roe_pct": round(roe * 100, 4),
            "tax_burden": round(tax_burden, 4),
            "interest_burden": round(interest_burden, 4),
            "ebit_margin": round(profit_margin, 4),
            "asset_turnover": round(asset_turnover, 4),
            "equity_multiplier": round(equity_multiplier, 4),
            "leverage_impact": round(equity_multiplier, 4) - 1,
            "decomposition": f"ROE = {round(tax_burden, 4)} x {round(interest_burden, 4)} x {round(profit_margin, 4)} x {round(asset_turnover, 4)} x {round(equity_multiplier, 4)} = {round(roe, 4)}",
        }


class EarningsQualityAnalyzer:
    @staticmethod
    def analyze(
        net_income: float,
        cash_from_operations: float,
        revenue: float,
        total_assets: float,
        accounts_receivable: float,
    ) -> Dict[str, Any]:
        accruals_ratio = (net_income - cash_from_operations) / total_assets if total_assets > 0 else None
        cash_flow_coverage = cash_from_operations / net_income if net_income > 0 else None
        revenue_receivable_ratio = accounts_receivable / revenue if revenue > 0 else None

        if accruals_ratio is not None:
            if abs(accruals_ratio) < 0.05:
                quality = "High"
            elif abs(accruals_ratio) < 0.15:
                quality = "Moderate"
            else:
                quality = "Low"

        return {
            "earnings_quality": quality,
            "accruals_ratio": round(accruals_ratio, 4) if accruals_ratio is not None else None,
            "cash_flow_coverage": round(cash_flow_coverage, 4) if cash_flow_coverage is not None else None,
            "revenue_to_receivables": round(revenue_receivable_ratio, 4) if revenue_receivable_ratio is not None else None,
            "interpretation": {
                "accruals_ratio": "Lower absolute value = higher quality earnings",
                "cash_flow_coverage": "Above 1.0 = earnings supported by cash, below 1.0 = potential red flag",
            },
        }
