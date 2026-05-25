from __future__ import annotations

from typing import Optional


class DiscordIntegration:
    """Discord bot integration for trade notifications.

    Adapter interface for fintwit-bot-main Discord commands.
    """

    def __init__(self, webhook_url: Optional[str] = None, bot_token: Optional[str] = None):
        self.webhook_url = webhook_url
        self.bot_token = bot_token

    async def send_trade_alert(self, symbol: str, action: str, quantity: int, price: float):
        message = f"**{action.upper()}** {quantity} {symbol} @ ${price:.2f}"
        if self.webhook_url:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                await session.post(self.webhook_url, json={"content": message})
        return message

    async def send_daily_summary(self, summary: str):
        if self.webhook_url:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                await session.post(self.webhook_url, json={"content": f"```{summary}```"})
