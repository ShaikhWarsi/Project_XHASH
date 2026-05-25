from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, date
from enum import Enum
from typing import Optional, Dict, Any, List, Tuple, Union


class BondType(Enum):
    ZERO_COUPON = "zero_coupon"
    FIXED_RATE = "fixed_rate"
    FLOATING_RATE = "floating_rate"
    CALLABLE = "callable"
    PUTABLE = "putable"
    CONVERTIBLE = "convertible"
    INFLATION_LINKED = "inflation_linked"


class CouponFrequency(Enum):
    ANNUAL = 1
    SEMI_ANNUAL = 2
    QUARTERLY = 4
    MONTHLY = 12
    ZERO = 0


class DayCountConvention(Enum):
    ACT_360 = "ACT/360"
    ACT_365 = "ACT/365"
    ACT_ACT = "ACT/ACT"
    THIRTY_360 = "30/360"
    THIRTY_360_EU = "30E/360"


class OptionType(Enum):
    CALL = "call"
    PUT = "put"


class ExerciseStyle(Enum):
    EUROPEAN = "european"
    AMERICAN = "american"
    BERMUDAN = "bermudan"


class UnderlyingType(Enum):
    EQUITY = "equity"
    BOND = "bond"
    COMMODITY = "commodity"
    CURRENCY = "currency"
    INTEREST_RATE = "interest_rate"
    INDEX = "index"


class Position(Enum):
    LONG = "long"
    SHORT = "short"


class DurationType(Enum):
    MACAULAY = "macaulay"
    MODIFIED = "modified"
    EFFECTIVE = "effective"
    KEY_RATE = "key_rate"
    DOLLAR = "dollar"


class CurveType(Enum):
    SPOT = "spot"
    FORWARD = "forward"
    PAR = "par"
    ZERO = "zero"


class InterpolationMethod(Enum):
    LINEAR = "linear"
    CUBIC_SPLINE = "cubic_spline"
    NELSON_SIEGEL = "nelson_siegel"
    SVENSSON = "svensson"


class SpreadType(Enum):
    G_SPREAD = "g_spread"
    I_SPREAD = "i_spread"
    Z_SPREAD = "z_spread"
    OAS = "oas"


@dataclass
class MarketData:
    spot_price: float
    risk_free_rate: float
    dividend_yield: float = 0.0
    volatility: float = 0.0
    time_to_expiry: float = 0.0
    strike_price: Optional[float] = None
    forward_price: Optional[float] = None

    def __post_init__(self):
        if self.spot_price <= 0:
            raise ValueError("Spot price must be positive")
        if self.volatility < 0:
            raise ValueError("Volatility cannot be negative")
        if self.time_to_expiry < 0:
            raise ValueError("Time to expiry cannot be negative")


@dataclass
class PricingResult:
    fair_value: float
    intrinsic_value: Optional[float] = None
    time_value: Optional[float] = None
    greeks: Optional[Dict[str, float]] = None
    confidence_interval: Optional[tuple] = None
    calculation_details: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.intrinsic_value is not None and self.time_value is None:
            self.time_value = self.fair_value - self.intrinsic_value


@dataclass
class BondCashFlow:
    date: date
    amount: float
    period: int
    is_principal: bool = False


@dataclass
class BondSpecification:
    face_value: float = 1000.0
    coupon_rate: float = 0.05
    maturity_date: Optional[date] = None
    issue_date: Optional[date] = None
    settlement_date: Optional[date] = None
    frequency: CouponFrequency = CouponFrequency.SEMI_ANNUAL
    day_count: DayCountConvention = DayCountConvention.THIRTY_360
    bond_type: BondType = BondType.FIXED_RATE
    call_schedule: List[Tuple[date, float]] = field(default_factory=list)
    put_schedule: List[Tuple[date, float]] = field(default_factory=list)


@dataclass
class OptionGreeks:
    delta: float = 0.0
    gamma: float = 0.0
    theta: float = 0.0
    vega: float = 0.0
    rho: float = 0.0
    vanna: float = 0.0
    volga: float = 0.0
    charm: float = 0.0
    vomma: float = 0.0


class ValidationError(Exception):
    pass


class CFAError(Exception):
    pass
