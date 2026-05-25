from __future__ import annotations

import json
from datetime import datetime
from typing import Optional

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.types import Fill, PortfolioState, QuantSignal

from .models import BacktestRun, PortfolioSnapshot, PriceAlert, SignalRecord, Trade, WatchlistItem


class TradeRepository:

    @staticmethod
    async def record_trade(session: AsyncSession, fill: Fill, strategy: str = "") -> Trade:
        trade = Trade(
            symbol=fill.symbol,
            side=fill.side.value if hasattr(fill.side, "value") else str(fill.side),
            quantity=fill.quantity,
            price=fill.price,
            commission=getattr(fill, "commission", 0.0),
            timestamp=fill.timestamp if hasattr(fill, "timestamp") else datetime.utcnow(),
            strategy=strategy,
        )
        session.add(trade)
        await session.commit()
        return trade

    @staticmethod
    async def get_trades(session: AsyncSession, symbol: Optional[str] = None, limit: int = 100) -> list[Trade]:
        stmt = select(Trade).order_by(desc(Trade.timestamp)).limit(limit)
        if symbol:
            stmt = stmt.where(Trade.symbol == symbol)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_performance_summary(session: AsyncSession) -> dict:
        result = await session.execute(
            select(
                func.count(Trade.id).label("total_trades"),
                func.sum(Trade.pnl).label("total_pnl"),
                func.avg(Trade.pnl).label("avg_pnl"),
            )
        )
        row = result.one()
        return {
            "total_trades": row.total_trades or 0,
            "total_pnl": float(row.total_pnl or 0.0),
            "avg_pnl": float(row.avg_pnl or 0.0),
        }


class SignalRepository:

    @staticmethod
    async def record_signal(session: AsyncSession, signal: QuantSignal) -> SignalRecord:
        record = SignalRecord(
            symbol=signal.symbol,
            signal_type=signal.type.value if hasattr(signal.type, "value") else str(signal.type),
            direction=signal.direction.value if hasattr(signal.direction, "value") else int(signal.direction),
            strength=signal.strength,
            confidence=signal.confidence,
            price=signal.price,
            level=signal.level,
            timestamp=signal.timestamp if hasattr(signal, "timestamp") else datetime.utcnow(),
            metadata_json=json.dumps(getattr(signal, "metadata", {}) or {}),
        )
        session.add(record)
        await session.commit()
        return record

    @staticmethod
    async def get_recent_signals(session: AsyncSession, symbol: Optional[str] = None, limit: int = 50) -> list[SignalRecord]:
        stmt = select(SignalRecord).order_by(desc(SignalRecord.timestamp)).limit(limit)
        if symbol:
            stmt = stmt.where(SignalRecord.symbol == symbol)
        result = await session.execute(stmt)
        return list(result.scalars().all())


class PortfolioRepository:

    @staticmethod
    async def snapshot(session: AsyncSession, portfolio: PortfolioState) -> PortfolioSnapshot:
        positions_dict = {}
        for sym, pos in portfolio.positions.items():
            positions_dict[sym] = {
                "quantity": pos.quantity,
                "side": str(pos.side.value if hasattr(pos.side, "value") else pos.side),
                "entry_price": pos.entry_price,
                "current_price": pos.current_price,
                "unrealized_pnl": pos.unrealized_pnl,
                "market_value": pos.market_value,
            }
        snap = PortfolioSnapshot(
            cash=portfolio.cash,
            total_value=portfolio.total_value,
            equity=portfolio.total_value - sum(p.unrealized_pnl for p in portfolio.positions.values()),
            positions_json=json.dumps(positions_dict),
            margin_used=getattr(portfolio, "margin_used", 0.0),
        )
        session.add(snap)
        await session.commit()
        return snap

    @staticmethod
    async def get_history(session: AsyncSession, limit: int = 500) -> list[PortfolioSnapshot]:
        stmt = select(PortfolioSnapshot).order_by(desc(PortfolioSnapshot.timestamp)).limit(limit)
        result = await session.execute(stmt)
        return list(reversed(result.scalars().all()))


class WatchlistRepository:

    @staticmethod
    async def add_item(session: AsyncSession, user_id: str, symbol: str, company: str = "") -> WatchlistItem | None:
        existing = await session.execute(
            select(WatchlistItem).where(
                WatchlistItem.user_id == user_id,
                WatchlistItem.symbol == symbol,
            )
        )
        if existing.scalar_one_or_none():
            return None
        item = WatchlistItem(user_id=user_id, symbol=symbol, company=company)
        session.add(item)
        await session.commit()
        return item

    @staticmethod
    async def remove_item(session: AsyncSession, user_id: str, symbol: str) -> bool:
        stmt = select(WatchlistItem).where(
            WatchlistItem.user_id == user_id,
            WatchlistItem.symbol == symbol,
        )
        result = await session.execute(stmt)
        item = result.scalar_one_or_none()
        if item:
            await session.delete(item)
            await session.commit()
            return True
        return False

    @staticmethod
    async def list_items(session: AsyncSession, user_id: str) -> list[WatchlistItem]:
        stmt = select(WatchlistItem).where(WatchlistItem.user_id == user_id).order_by(WatchlistItem.added_at)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def check_item(session: AsyncSession, user_id: str, symbol: str) -> bool:
        stmt = select(WatchlistItem).where(
            WatchlistItem.user_id == user_id,
            WatchlistItem.symbol == symbol,
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none() is not None


class AlertRepository:

    @staticmethod
    async def create_alert(session: AsyncSession, user_id: str, symbol: str, target_price: float, condition: str) -> PriceAlert:
        from datetime import timedelta
        import datetime as _dt
        alert = PriceAlert(
            user_id=user_id,
            symbol=symbol,
            target_price=target_price,
            condition=condition,
            expires_at=_dt.datetime.utcnow() + timedelta(days=90),
        )
        session.add(alert)
        await session.commit()
        return alert

    @staticmethod
    async def delete_alert(session: AsyncSession, alert_id: int, user_id: str) -> bool:
        stmt = select(PriceAlert).where(
            PriceAlert.id == alert_id,
            PriceAlert.user_id == user_id,
        )
        result = await session.execute(stmt)
        alert = result.scalar_one_or_none()
        if alert:
            await session.delete(alert)
            await session.commit()
            return True
        return False

    @staticmethod
    async def get_alerts(session: AsyncSession, user_id: str) -> list[PriceAlert]:
        stmt = select(PriceAlert).where(PriceAlert.user_id == user_id).order_by(PriceAlert.created_at.desc())
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def trigger_alert(session: AsyncSession, alert_id: int) -> bool:
        stmt = select(PriceAlert).where(PriceAlert.id == alert_id)
        result = await session.execute(stmt)
        alert = result.scalar_one_or_none()
        if alert:
            alert.triggered = 1
            alert.active = 0
            await session.commit()
            return True
        return False


class BacktestRepository:

    @staticmethod
    async def save_run(session: AsyncSession, config: dict, metrics: dict, equity_curve: list) -> BacktestRun:
        run = BacktestRun(
            config_json=json.dumps(config),
            metrics_json=json.dumps(metrics),
            equity_curve_json=json.dumps(equity_curve),
            total_return=metrics.get("total_return", 0.0),
            sharpe_ratio=metrics.get("sharpe_ratio", 0.0),
            max_drawdown=metrics.get("max_drawdown", 0.0),
        )
        session.add(run)
        await session.commit()
        return run

    @staticmethod
    async def list_runs(session: AsyncSession, limit: int = 20) -> list[BacktestRun]:
        stmt = select(BacktestRun).order_by(desc(BacktestRun.timestamp)).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_run(session: AsyncSession, run_id: int) -> Optional[BacktestRun]:
        stmt = select(BacktestRun).where(BacktestRun.id == run_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
