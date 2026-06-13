# Telegram Chart Rendering

## Overview

X_KA_HASH supports rendering Plotly charts as PNG images for delivery via the Telegram bot. This enables users to receive chart snapshots directly in their Telegram chat.

## Architecture

Unlike OpenAlgo (which uses Flask + eventlet and suffers from `asyncio.run()` conflicts), X_KA_HASH uses **FastAPI + uvicorn** with a fully async event loop. There is no eventlet conflict.

The Telegram bot service at `api/services/telegram_bot_service.py` handles incoming bot commands and outgoing messages. Chart rendering is offloaded to a background thread using `asyncio.to_thread()` to avoid blocking the async event loop.

## Chart Rendering Flow

1. User sends `/chart SYMBOL` command to the Telegram bot
2. Bot webhook handler receives the update
3. Handler calls chart generation function which builds a Plotly figure
4. Figure is exported to PNG via `asyncio.to_thread(plotly.io.to_image, fig, format="png")`
5. PNG bytes are sent to Telegram via `sendPhoto` API
6. Response is delivered to the user

## Requirements

- `kaleido` — required for Plotly static image export
- OR `orca` — alternative image export engine (slower, legacy)

Install with:

```bash
pip install kaleido
```

## Code Reference

The primary rendering integration point is in `api/services/telegram_bot_service.py`. Chart-specific rendering logic should be added as a helper that accepts a Plotly `Figure` object and returns PNG bytes:

```python
import plotly.io as pio

async def figure_to_png(fig) -> bytes:
    return await asyncio.to_thread(pio.to_image, fig, format="png", width=800, height=500)
```

## Troubleshooting

### Kaleido crashes on Windows

Ensure Kaleido is installed correctly. If issues persist, fall back to Orca:

```bash
pip install plotly-orca psutil
```

### Headless Chromium/chrome issues

Kaleido bundles a headless Chromium for rendering. If you see errors related to Chromium:

1. Install system dependencies for Chromium
2. Set environment variable `PLOTLY_KALEIDO_EXECUTABLE_PATH` to a custom Chromium path
3. Or switch to Orca as the rendering backend

### Blank images

Ensure the Plotly figure is fully constructed before exporting. Call `fig.update_layout()` with explicit `width` and `height` values.

### Timeout errors

Large charts may take several seconds to render. Increase the timeout in the Telegram API call:

```python
await client.post(url, files={"photo": png_bytes}, timeout=30)
```

## Related Files

- `api/services/telegram_bot_service.py` — Bot webhook handler and message sending
- `api/routes/telegram.py` — Telegram webhook route (if applicable)
- `frontend/src/pages/TelegramBotDashboard.tsx` — Bot configuration UI
