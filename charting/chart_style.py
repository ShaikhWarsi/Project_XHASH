from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, ClassVar

import plotly.graph_objects as go
import plotly.io as pio


DARK_COLORS = {
    "bg": "#0a0e14",
    "card": "#0d1117",
    "border": "#1a2332",
    "text": "#5d6b7e",
    "textPrimary": "#e8eaed",
    "up": "#26a69a",
    "down": "#ef5350",
    "upColorway": ["#26a69a", "#00bcd4", "#66bb6a", "#4caf50", "#009688"],
    "downColorway": ["#ef5350", "#e57373", "#f44336", "#d32f2f", "#b71c1c"],
    "accent": "#3b82f6",
    "accentYellow": "#ffd54f",
    "accentOrange": "#ff9800",
    "accentPurple": "#ab47bc",
    "lineColor": "#ffed00",
}

LIGHT_COLORS = {
    "bg": "#ffffff",
    "card": "#f5f5f5",
    "border": "#e0e0e0",
    "text": "#616161",
    "textPrimary": "#212121",
    "up": "#26a69a",
    "down": "#ef5350",
    "upColorway": ["#26a69a", "#00bcd4", "#66bb6a", "#4caf50", "#009688"],
    "downColorway": ["#ef5350", "#e57373", "#f44336", "#d32f2f", "#b71c1c"],
    "accent": "#1a73e8",
    "accentYellow": "#f9a825",
    "accentOrange": "#ef6c00",
    "accentPurple": "#8e24aa",
    "lineColor": "#ff6f00",
}


class ChartStyle:
    STYLES_DIR = Path(__file__).parent / "styles"

    instance: ClassVar[ChartStyle | None] = None
    initialized: bool = False

    def __new__(cls, *args, **kwargs):
        if cls.instance is None:
            cls.instance = super().__new__(cls)
        return cls.instance

    def __init__(self, plt_style: str = "dark", styles_dir: Path | None = None):
        if self.initialized:
            return
        self.initialized = True

        self.plt_style = plt_style
        self.palette: dict[str, Any] = DARK_COLORS.copy()
        self.plotly_template: dict[str, Any] = {}
        self.load_style(plt_style)
        self.apply_style()

    def load_style(self, style: str) -> None:
        if style == "light":
            self.palette = LIGHT_COLORS.copy()
        else:
            self.palette = DARK_COLORS.copy()

        user_file = self.STYLES_DIR / f"{style}.pltstyle.json"
        if user_file.exists():
            try:
                with open(user_file) as f:
                    custom = json.load(f)
                self.palette.update(custom)
            except (json.JSONDecodeError, OSError):
                pass

    def apply_style(self) -> None:
        p = self.palette
        template = go.layout.Template(
            layout={
                "paper_bgcolor": p["bg"],
                "plot_bgcolor": p["card"],
                "font": {"color": p["text"], "size": 11},
                "xaxis": {
                    "gridcolor": p["border"],
                    "linecolor": p["border"],
                    "zerolinecolor": p["border"],
                    "tickfont": {"color": p["text"]},
                },
                "yaxis": {
                    "gridcolor": p["border"],
                    "linecolor": p["border"],
                    "zerolinecolor": p["border"],
                    "tickfont": {"color": p["text"]},
                },
                "colorway": p["upColorway"] + p["downColorway"],
                "legend": {
                    "font": {"color": p["text"]},
                    "bgcolor": p["card"],
                    "bordercolor": p["border"],
                },
                "hoverlabel": {
                    "bgcolor": p["card"],
                    "font": {"color": p["textPrimary"]},
                    "bordercolor": p["border"],
                },
            }
        )
        pio.templates["trading_engine"] = template
        pio.templates.default = "trading_engine"

    def get_colors(self, reverse: bool = False) -> list[str]:
        colors = self.palette["upColorway"] + self.palette["downColorway"]
        if reverse:
            colors = list(reversed(colors))
        return colors

    @property
    def up_color(self) -> str:
        return self.palette["up"]

    @property
    def down_color(self) -> str:
        return self.palette["down"]

    @property
    def bg_color(self) -> str:
        return self.palette["bg"]

    @property
    def card_color(self) -> str:
        return self.palette["card"]

    @property
    def border_color(self) -> str:
        return self.palette["border"]

    @property
    def text_color(self) -> str:
        return self.palette["text"]

    def to_css_variables(self) -> dict[str, str]:
        return {
            "--bg-primary": self.palette["bg"],
            "--bg-card": self.palette["card"],
            "--border-color": self.palette["border"],
            "--text-primary": self.palette["textPrimary"],
            "--text-secondary": self.palette["text"],
            "--color-up": self.palette["up"],
            "--color-down": self.palette["down"],
            "--accent-blue": self.palette["accent"],
            "--accent-yellow": self.palette["accentYellow"],
            "--accent-orange": self.palette["accentOrange"],
            "--accent-purple": self.palette["accentPurple"],
        }

    @staticmethod
    def available_themes() -> list[str]:
        return ["dark", "light"]
