import sys, asyncio, os, signal
sys.path.insert(0, '.')
from api.app import app
import uvicorn

async def main():
    config = uvicorn.Config(app, host='127.0.0.1', port=8000, log_level='info')
    server = uvicorn.Server(config)
    await server.serve()

asyncio.run(main())
