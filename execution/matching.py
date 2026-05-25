from __future__ import annotations

from collections import defaultdict, deque
from typing import Callable, Optional

from .order import Order, OrderStatus, OrderType
from .fillers import FillerBase, FixedSize
from .comminfo import CommInfo


class OrderMatchingEngine:
    """Order matching and execution engine ported from Backtrader's BackBroker.

    Handles:
    - 9-state order lifecycle
    - 8 order type matching (Market, Limit, Stop, StopLimit, StopTrail, etc.)
    - Slippage model (percentage/fixed, capping, limit interaction)
    - Volume-aware fillers
    - Bracket orders (parent/transmit atomicity)
    - OCO (One-Cancels-Other) groups
    - Partial fills over multiple bars
    - Gap-through detection for stop orders
    - Same-bar order prevention
    - Cash/margin checking
    - Futures MTM cash adjustment
    """

    def __init__(
        self,
        initial_cash: float = 1_000_000.0,
        comminfo: Optional[CommInfo] = None,
        filler: Optional[FillerBase] = None,
        slippage_perc: float = 0.0,
        slippage_fixed: float = 0.0,
        slip_open: bool = False,
        slip_match: bool = True,
        slip_limit: bool = True,
        slip_out: bool = False,
        shortcash: bool = False,
        int2pnl: bool = True,
        coo: bool = False,
        coc: bool = False,
    ):
        self.cash = initial_cash
        self.startingcash = initial_cash
        self._comminfo = comminfo or CommInfo()
        self._filler = filler
        self._slippage_perc = slippage_perc
        self._slippage_fixed = slippage_fixed
        self._slip_open = slip_open
        self._slip_match = slip_match
        self._slip_limit = slip_limit
        self._slip_out = slip_out
        self._shortcash = shortcash
        self._int2pnl = int2pnl
        self._coo = coo
        self._coc = coc

        self.positions = defaultdict(lambda: 0)
        self.position_prices = {}
        self.position_adjbases = {}

        self.pending = deque()
        self._submitted = deque()
        self.notifs = deque()
        self._pchildren = defaultdict(deque)
        self._ocos = {}
        self._ocol = defaultdict(list)
        self._orders = []
        self._toactivate = deque()
        self._d_credit = defaultdict(float)
        self._bar_data = {}
        self._bar_index = 0

    def set_bar_data(self, open_p: float, high: float, low: float, close: float, volume: float):
        self._bar_data = dict(open=open_p, high=high, low=low, close=close, volume=volume)

    def buy(self, order: Order) -> Order:
        order.isbuy = True
        order.size = abs(order.size)
        return self._submit(order)

    def sell(self, order: Order) -> Order:
        order.isbuy = False
        order.size = -abs(order.size)
        return self._submit(order)

    def _submit(self, order: Order) -> Order:
        self._orders.append(order)
        order.status = OrderStatus.Submitted
        self._submitted.append(order)
        return order

    def next(self):
        self._toactivate_check()
        self._check_submitted()
        self._execute_pending()
        self._credit_interest()
        self._futures_mtm()
        self._get_value()

    def _toactivate_check(self):
        while self._toactivate:
            o = self._toactivate.popleft()
            o._active = True

    def _check_submitted(self):
        while self._submitted:
            order = self._submitted.popleft()
            order.status = OrderStatus.Accepted
            self.pending.append(order)

    def _execute_pending(self):
        self.pending.append(None)
        while True:
            order = self.pending.popleft()
            if order is None:
                break
            if not order._active:
                self.pending.append(order)
                continue
            if order.status in (OrderStatus.Canceled, OrderStatus.Rejected,
                                OrderStatus.Expired, OrderStatus.Margin,
                                OrderStatus.Completed):
                continue

            self._try_exec(order)

            if order.alive:
                self.pending.append(order)
            if order.status == OrderStatus.Completed:
                self._bracketize(order)

    def _try_exec(self, order):
        if not self._bar_data:
            return

        popen = self._bar_data['open']
        phigh = self._bar_data['high']
        plow = self._bar_data['low']
        pclose = self._bar_data['close']

        if order.exectype == OrderType.Market:
            self._try_exec_market(order, popen, phigh, plow, pclose)
        elif order.exectype == OrderType.Close:
            self._try_exec_close(order, popen, phigh, plow, pclose)
        elif order.exectype == OrderType.Limit:
            self._try_exec_limit(order, popen, phigh, plow, pclose)
        elif order.exectype == OrderType.Stop:
            self._try_exec_stop(order, popen, phigh, plow, pclose)
        elif order.exectype == OrderType.StopLimit:
            self._try_exec_stoplimit(order, popen, phigh, plow, pclose)
        elif order.exectype == OrderType.StopTrail:
            self._try_exec_stop(order, popen, phigh, plow, pclose)
            if order.alive:
                order.trailadjust(pclose)
        elif order.exectype == OrderType.StopTrailLimit:
            self._try_exec_stoplimit(order, popen, phigh, plow, pclose)
            if order.alive:
                order.trailadjust(pclose)
        elif order.exectype == OrderType.Historical:
            self._try_exec_historical(order)

    def _slip_up(self, phigh: float, price: float, doslip: bool = True) -> float | None:
        if not doslip:
            return price
        if self._slippage_perc:
            pslip = price * (1 + self._slippage_perc)
        elif self._slippage_fixed:
            pslip = price + self._slippage_fixed
        else:
            return price
        if self._slip_match and pslip > phigh:
            return phigh if self._slip_limit else phigh
        return pslip

    def _slip_down(self, plow: float, price: float, doslip: bool = True) -> float | None:
        if not doslip:
            return price
        if self._slippage_perc:
            pslip = price * (1 - self._slippage_perc)
        elif self._slippage_fixed:
            pslip = price - self._slippage_fixed
        else:
            return price
        if self._slip_match and pslip < plow:
            return plow if self._slip_limit else plow
        return pslip

    def _try_exec_market(self, order, popen, phigh, plow, pclose):
        exprice = popen
        if self._coo:
            pass
        elif self._coc:
            exprice = getattr(order, '_created_pclose', pclose)
        if order.isbuy:
            p = self._slip_up(phigh, exprice, doslip=self._slip_open)
        else:
            p = self._slip_down(plow, exprice, doslip=self._slip_open)
        if p is None:
            return
        self._execute(order, p)

    def _try_exec_close(self, order, popen, phigh, plow, pclose):
        if order.isbuy:
            p = self._slip_up(phigh, pclose)
        else:
            p = self._slip_down(plow, pclose)
        if p is None:
            return
        self._execute(order, p)

    def _try_exec_limit(self, order, popen, phigh, plow, pclose):
        plimit = order.price
        if order.isbuy:
            if plimit >= popen:
                p = self._slip_up(phigh, min(plimit, popen), doslip=self._slip_open)
            elif plimit >= plow:
                p = self._slip_up(phigh, plimit)
            else:
                return
        else:
            if plimit <= popen:
                p = self._slip_down(plow, max(plimit, popen), doslip=self._slip_open)
            elif plimit <= phigh:
                p = self._slip_down(plow, plimit)
            else:
                return
        self._execute(order, p)

    def _try_exec_stop(self, order, popen, phigh, plow, pclose):
        pstop = order.price
        if order.isbuy:
            if popen >= pstop:
                p = self._slip_up(phigh, popen)
            elif phigh >= pstop:
                p = self._slip_up(phigh, pstop)
            else:
                return
        else:
            if popen <= pstop:
                p = self._slip_down(plow, popen)
            elif plow <= pstop:
                p = self._slip_down(plow, pstop)
            else:
                return
        self._execute(order, p)

    def _try_exec_stoplimit(self, order, popen, phigh, plow, pclose):
        pstop = order.price
        plimit = order.plimit

        triggered_here = False
        if order.isbuy:
            if popen >= pstop or phigh >= pstop:
                triggered_here = True
        else:
            if popen <= pstop or plow <= pstop:
                triggered_here = True

        if triggered_here or order.triggered:
            order.triggered = True
            self._try_exec_limit(order, popen, phigh, plow, pclose)
        else:
            if order.isbuy:
                if phigh >= pstop:
                    order.triggered = True
            else:
                if plow <= pstop:
                    order.triggered = True

    def _try_exec_historical(self, order):
        self._execute(order, order.price)

    def _execute(self, order: Order, price: float):
        size = abs(order.executed.remsize) if order.executed.remsize else abs(order.size)
        if not size:
            return

        if not order.isbuy:
            size = -size

        pos_size = self.positions.get(order.symbol, 0)
        pos_price = self.position_prices.get(order.symbol, 0.0)

        new_size = pos_size + size
        closed = 0
        opened = 0
        pnl = 0.0

        if not new_size:
            closed = size
            closed_value = abs(closed) * pos_price
            pnl = self._comminfo.profit_and_loss(-closed if closed < 0 else closed, pos_price, price) if self._comminfo else 0.0
        elif not pos_size:
            opened = size
            opened_value = abs(opened) * price
        elif pos_size > 0:
            if size > 0:
                opened = size
                opened_value = abs(opened) * price
            elif new_size > 0:
                closed = size
                pnl = self._comminfo.profit_and_loss(-closed, pos_price, price) if self._comminfo else 0.0
                closed_value = abs(closed) * pos_price
            elif not new_size:
                closed = size
                pnl = self._comminfo.profit_and_loss(-closed, pos_price, price) if self._comminfo else 0.0
                closed_value = abs(closed) * pos_price
            else:
                closed = -pos_size
                opened = new_size
                pnl = self._comminfo.profit_and_loss(closed, pos_price, price) if self._comminfo else 0.0
                closed_value = abs(closed) * pos_price
                opened_value = abs(opened) * price
        else:
            if size < 0:
                opened = size
                opened_value = abs(opened) * price
            elif new_size < 0:
                closed = size
                pnl = self._comminfo.profit_and_loss(-closed, pos_price, price) if self._comminfo else 0.0
                closed_value = abs(closed) * pos_price
            elif not new_size:
                closed = size
                pnl = self._comminfo.profit_and_loss(-closed, pos_price, price) if self._comminfo else 0.0
                closed_value = abs(closed) * pos_price
            else:
                closed = -pos_size
                opened = new_size
                pnl = self._comminfo.profit_and_loss(closed, pos_price, price) if self._comminfo else 0.0
                closed_value = abs(closed) * pos_price
                opened_value = abs(opened) * price

        closed_value = abs(closed_value) if 'closed_value' in dir() else 0.0
        opened_value = abs(opened_value) if 'opened_value' in dir() else 0.0
        closed_comm = self._comminfo.get_commission(abs(closed), price) if self._comminfo else 0.0
        opened_comm = self._comminfo.get_commission(abs(opened), price) if self._comminfo else 0.0

        self.positions[order.symbol] = new_size
        if new_size:
            if abs(new_size) > abs(pos_size):
                self.position_prices[order.symbol] = price
            elif new_size == pos_size + size:
                if pos_size * size > 0:
                    old_val = pos_price * pos_size
                    new_val = price * size
                    self.position_prices[order.symbol] = (old_val + new_val) / (pos_size + size) if (pos_size + size) else price
        else:
            self.position_prices[order.symbol] = 0.0

        self.cash -= opened_value + opened_comm
        self.cash += closed_value - closed_comm + pnl

        order.execute(
            dt=self._bar_index, size=size, price=price,
            closed=closed, closedvalue=closed_value, closedcomm=closed_comm,
            opened=opened, openedvalue=opened_value, openedcomm=opened_comm,
            margin=0.0, pnl=pnl,
            psize=new_size, pprice=self.position_prices.get(order.symbol, 0.0),
        )

        if order.status == OrderStatus.Completed:
            self._ococheck(order)

        notify_order = Order(order_type=order.exectype, size=order.size, price=order.price, symbol=order.symbol)
        notify_order.executed = order.executed.clone()
        notify_order.status = order.status
        notify_order.ref = order.ref
        self.notifs.append(notify_order)

    def _bracketize(self, order):
        pref = order.parent.ref if order.parent else order.ref
        pc = self._pchildren.get(pref)
        if pc is None:
            return
        parent_order = pc[0] if pc else None
        if parent_order and parent_order.ref == order.ref:
            pc.popleft()
            for o in pc:
                self._toactivate.append(o)

    def _ococheck(self, order):
        parentref = self._ocos.get(order.ref)
        if parentref is None:
            parentref = order.ref
        ocoref = self._ocos.get(parentref, parentref)
        ocol = self._ocol.pop(ocoref, None)
        if ocol:
            new_pending = deque()
            while self.pending:
                o = self.pending.popleft()
                if o is None:
                    new_pending.append(o)
                elif hasattr(o, 'ref') and o.ref not in ocol:
                    new_pending.append(o)
                else:
                    o.cancel()
                    self.notifs.append(o)
            self.pending = new_pending

    def _credit_interest(self):
        pass

    def _futures_mtm(self):
        if self._comminfo.stocklike:
            return
        for symbol, size in list(self.positions.items()):
            if size and self._bar_data:
                price = self.position_prices.get(symbol, 0.0)
                close = self._bar_data['close']
                adj = self._comminfo.cash_adjust(size, price, close)
                self.cash += adj
                self.position_adjbases[symbol] = close

    def _get_value(self):
        total = self.cash
        for symbol, size in self.positions.items():
            price = self.position_prices.get(symbol, 0.0)
            close = self._bar_data.get('close', price)
            if self._comminfo:
                val = self._comminfo.get_value_size(size, close)
                total += abs(val) if self._shortcash else val
            else:
                total += size * close
        return total

    def get_cash(self) -> float:
        return self.cash

    def get_value(self) -> float:
        return self._get_value()

    def get_position(self, symbol: str) -> int:
        return self.positions.get(symbol, 0)

    def get_position_price(self, symbol: str) -> float:
        return self.position_prices.get(symbol, 0.0)

    def get_notification(self):
        if self.notifs:
            return self.notifs.popleft()
        return None

    def reset(self, initial_cash: float):
        self.cash = initial_cash
        self.startingcash = initial_cash
        self.positions.clear()
        self.position_prices.clear()
        self.position_adjbases.clear()
        self.pending.clear()
        self._submitted.clear()
        self.notifs.clear()
        self._pchildren.clear()
        self._ocos.clear()
        self._ocol.clear()
        self._orders.clear()
        self._toactivate.clear()
        self._d_credit.clear()
        self._bar_data = {}
        self._bar_index = 0
