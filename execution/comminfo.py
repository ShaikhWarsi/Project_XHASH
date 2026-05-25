from __future__ import annotations

COMM_PERC = 0
COMM_FIXED = 1


class CommInfo:
    """Commission model ported from Backtrader.

    Supports percentage and fixed commission, futures (stocklike=False),
    margin, leverage, short credit interest, and multiplier.
    """

    def __init__(
        self,
        commission: float = 0.001,
        mult: float = 1.0,
        margin: float | None = None,
        commtype: int | None = None,
        stocklike: bool = True,
        percabs: bool = True,
        interest: float = 0.0,
        interest_long: bool = False,
        leverage: float = 1.0,
        automargin: bool = False,
    ):
        self.commission = commission
        self.mult = mult
        self.margin = margin
        self.stocklike = stocklike
        self.percabs = percabs
        self.interest = interest
        self.interest_long = interest_long
        self.leverage = leverage
        self.automargin = automargin

        if commtype is not None:
            self._commtype = commtype
        elif self.margin:
            self._stocklike = False
            self._commtype = COMM_FIXED
        else:
            self._stocklike = True
            self._commtype = COMM_PERC

        if self._commtype == COMM_PERC and not self.percabs:
            self.commission /= 100.0

    def get_commission(self, size: int, price: float) -> float:
        if self._commtype == COMM_PERC:
            return abs(size) * self.commission * price
        return abs(size) * self.commission

    def get_margin(self, price: float) -> float:
        if not self.automargin:
            return self.margin or 0.0
        elif self.automargin is True or self.automargin < 0:
            return price * self.mult
        return price * self.automargin

    def get_size(self, cash: float, price: float) -> int:
        if not self._stocklike:
            margin = self.get_margin(price)
            if margin <= 0:
                return 0
            return int(self.leverage * (cash // margin))
        if price <= 0:
            return 0
        return int(self.leverage * (cash // price))

    def get_operation_cost(self, size: int, price: float) -> float:
        if not self._stocklike:
            return abs(size) * self.get_margin(price)
        return abs(size) * price

    def get_value_size(self, size: int, price: float) -> float:
        if not self._stocklike:
            return abs(size) * self.get_margin(price)
        return size * price

    def get_value(self, position_size: int, position_price: float, price: float) -> float:
        if not self._stocklike:
            return abs(position_size) * self.get_margin(price)
        if position_size >= 0:
            return position_size * price
        value = position_price * position_size
        value += (position_price - price) * position_size
        return value

    def profit_and_loss(self, size: int, price: float, newprice: float) -> float:
        return size * (newprice - price) * self.mult

    def cash_adjust(self, size: int, price: float, newprice: float) -> float:
        if not self._stocklike:
            return size * (newprice - price) * self.mult
        return 0.0

    def get_credit_interest(self, size: int, price: float, days: float, days_360: bool = False) -> float:
        if size >= 0 and not self.interest_long:
            return 0.0
        divisor = 360.0 if days_360 else 365.0
        return days * price * abs(size) * (self.interest / divisor)
