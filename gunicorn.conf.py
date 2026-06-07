"""Gunicorn config for production deployment.

Usage:
    gunicorn -c gunicorn.conf.py api.app:create_app

Requires: pip install gunicorn uvicorn
"""

import os

workers = int(os.environ.get("UVICORN_WORKERS", "4"))
worker_class = "uvicorn.workers.UvicornWorker"
bind = os.environ.get("UVICORN_BIND", "0.0.0.0:8001")
graceful_timeout = int(os.environ.get("GRACEFUL_TIMEOUT", "60"))
timeout = int(os.environ.get("WORKER_TIMEOUT", "120"))
keepalive = int(os.environ.get("KEEPALIVE", "5"))
max_requests = int(os.environ.get("MAX_REQUESTS", "10000"))
max_requests_jitter = int(os.environ.get("MAX_REQUESTS_JITTER", "1000"))

accesslog = os.environ.get("ACCESS_LOG", "-")
errorlog = os.environ.get("ERROR_LOG", "-")
loglevel = os.environ.get("LOG_LEVEL", "info")

# Preload app for faster worker spawn
preload_app = True
