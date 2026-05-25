from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from integrations.email_notifier import EmailNotifier
from integrations.slack_bot import SlackNotifier
from integrations.sms_notifier import SMSNotifier
from integrations.telegram_bot import TelegramNotifier


class TestTelegramNotifier:
    @pytest.fixture
    def bot(self):
        return TelegramNotifier(bot_token="123:abc", chat_id="123456")

    @patch("integrations.telegram_bot.requests.post")
    def test_send_message(self, mock_post, bot):
        mock_post.return_value = MagicMock(ok=True, json=lambda: {"ok": True})
        result = bot.send_message("Hello")
        assert result["ok"] is True
        mock_post.assert_called_once()

    @patch("integrations.telegram_bot.requests.post")
    def test_notify_trade(self, mock_post, bot):
        mock_post.return_value = MagicMock(ok=True, json=lambda: {"ok": True})
        result = bot.notify_trade("AAPL", "BUY", 100, 150.50)
        assert result["ok"] is True

    @patch("integrations.telegram_bot.requests.post")
    def test_notify_alert(self, mock_post, bot):
        mock_post.return_value = MagicMock(ok=True, json=lambda: {"ok": True})
        result = bot.notify_alert("Test", "Message", "WARN")
        assert result["ok"] is True

    @patch("integrations.telegram_bot.requests.post")
    def test_send_photo(self, mock_post, bot):
        mock_post.return_value = MagicMock(ok=True, json=lambda: {"ok": True})
        result = bot.send_photo("https://example.com/photo.jpg", "caption")
        assert result["ok"] is True


class TestSlackNotifier:
    @pytest.fixture
    def bot(self):
        return SlackNotifier(bot_token="xoxb-test", default_channel="#trading")

    @patch("integrations.slack_bot.requests.post")
    def test_send_message(self, mock_post, bot):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"ok": True})
        result = bot.send_message("Hello")
        assert result["ok"] is True

    @patch("integrations.slack_bot.requests.post")
    def test_notify_trade(self, mock_post, bot):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"ok": True})
        result = bot.notify_trade("AAPL", "BUY", 100, 150.50)
        assert result["ok"] is True
        call_args = mock_post.call_args[1]["json"]
        assert call_args["channel"] == "#trading"

    @patch("integrations.slack_bot.requests.post")
    def test_notify_alert(self, mock_post, bot):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"ok": True})
        result = bot.notify_alert("Alert", "Details", "ERROR")
        assert result["ok"] is True


class TestEmailNotifier:
    @pytest.fixture
    def notifier(self):
        return EmailNotifier(smtp_host="smtp.test.com", username="user@test.com", password="pass", from_addr="from@test.com")  # TODO: use env vars for CI

    @patch("integrations.email_notifier.smtplib.SMTP")
    def test_send(self, mock_smtp, notifier):
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        result = notifier.send("to@test.com", "Subject", "Body")
        assert result["status"] == "sent"
        assert result["to"] == "to@test.com"

    @patch("integrations.email_notifier.smtplib.SMTP")
    def test_notify_trade(self, mock_smtp, notifier):
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        result = notifier.notify_trade("to@test.com", "AAPL", "BUY", 100, 150.50)
        assert result["status"] == "sent"

    @patch("integrations.email_notifier.smtplib.SMTP")
    def test_notify_alert(self, mock_smtp, notifier):
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        result = notifier.notify_alert("to@test.com", "Alert", "Details", "CRITICAL")
        assert result["status"] == "sent"


class TestSMSNotifier:
    @pytest.fixture
    def notifier(self):
        return SMSNotifier(provider="twilio", account_sid="sid", auth_token="token", from_number="+123")

    def test_send_raises_without_twilio(self, notifier):
        with pytest.raises(Exception):
            notifier.send("+456", "Hello")

    def test_notify_trade_raises_without_twilio(self, notifier):
        with pytest.raises(Exception):
            notifier.notify_trade("+456", "AAPL", "BUY", 100, 150.50)
