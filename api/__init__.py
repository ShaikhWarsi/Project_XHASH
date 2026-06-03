import os

from .app import create_app

DEV_MODE = os.getenv("DEV_MODE", "true").lower() in ("true", "1", "yes")

__all__ = ["create_app", "DEV_MODE"]
