"""Bench runner: compute IC stats for every alpha in a zoo over one universe.

Categorisation thresholds:
- ``alive``     : ic_mean > 0.02 and ic_positive_ratio >= 0.55 and |t| > 2
- ``reversed``  : ic_mean < -0.02 and |t| > 2
- ``dead``      : everything else
"""

from __future__ import annotations

import logging
import math
import time
from typing import Any, Callable

import pandas as pd

from .factor_analysis_core import compute_ic_series
from .registry import Registry, RegistryError, SkipAlpha, get_default_registry

logger = logging.getLogger(__name__)

ProgressCb = Callable[[int, int, str], None]


def t_stat(ic_mean: float, ic_std: float, n: int) -> float:
    """Two-sided t-statistic of the IC series."""
    if not (n > 0 and ic_std > 0 and math.isfinite(ic_std)):
        return 0.0
    return ic_mean / (ic_std / math.sqrt(n))


def categorise(row: dict[str, Any]) -> str:
    """Bucket a per-alpha row into alive / reversed / dead."""
    ic_mean = row["ic_mean"]
    pos = row["ic_positive_ratio"]
    t = t_stat(ic_mean, row["ic_std"], row["ic_count"])
    if ic_mean > 0.02 and pos >= 0.55 and abs(t) > 2:
        return "alive"
    if ic_mean < -0.02 and abs(t) > 2:
        return "reversed"
    return "dead"


def theme_breakdown(rows: list[dict[str, Any]]) -> dict[str, dict[str, int]]:
    """Aggregate alive/reversed/dead counts by theme tag."""
    by_theme: dict[str, dict[str, int]] = {}
    for row in rows:
        cat = row["_category"]
        themes = row.get("theme", []) or ["uncategorised"]
        for theme in themes:
            bucket = by_theme.setdefault(
                theme, {"alive": 0, "reversed": 0, "dead": 0, "count": 0}
            )
            bucket[cat] += 1
            bucket["count"] += 1
    return by_theme


def _compute_forward_returns(panel: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Compute forward 1-bar returns from close prices.

    Returns next-bar's (close[t+1] / close[t]) - 1, aligned to the panel dates.
    """
    close = panel.get("close")
    if close is None:
        raise ValueError("panel missing 'close' key")
    returns = close.pct_change().shift(-1)
    returns = returns.dropna(how="all")
    return returns


def run_bench(
    zoo: str,
    alpha_ids: list[str],
    panel: dict[str, pd.DataFrame],
    on_progress: ProgressCb | None = None,
    registry: Registry | None = None,
) -> dict[str, Any]:
    """Run a bench over a list of alpha IDs and return the summary.

    Args:
        zoo: Zoo id (for metadata).
        alpha_ids: List of alpha IDs to bench.
        panel: Universe panel with OHLCV data.
        on_progress: Optional callback after every alpha.
        registry: Optional pre-built registry.

    Returns:
        Dict with keys: ``status``, ``n_alphas_tested``, ``n_skipped``,
        ``alive``, ``reversed``, ``dead``, ``by_theme``, ``top5_by_ir``,
        ``rows``, ``skipped``, ``wall_seconds``.
    """
    start = time.monotonic()
    entry: dict[str, Any] = {"status": "pending", "zoo": zoo}

    reg = registry if registry is not None else get_default_registry()

    try:
        return_df = _compute_forward_returns(panel)
    except Exception as exc:
        entry["status"] = "error"
        entry["error"] = f"forward returns failed: {exc}"
        entry["wall_seconds"] = round(time.monotonic() - start, 2)
        return entry

    rows: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    n_total = len(alpha_ids)
    for idx, aid in enumerate(alpha_ids, start=1):
        try:
            factor_df = reg.compute(aid, panel)
            ic = compute_ic_series(factor_df, return_df)
            if ic.empty:
                skipped.append({"id": aid, "reason": "empty IC series", "kind": "typed"})
            else:
                ic_mean = float(ic.mean())
                ic_std = float(ic.std())
                ir = ic_mean / ic_std if ic_std > 0 else 0.0
                meta = reg.get(aid).meta or {}
                rows.append({
                    "id": aid,
                    "ic_mean": round(ic_mean, 6),
                    "ic_std": round(ic_std, 6),
                    "ir": round(ir, 4),
                    "ic_positive_ratio": round(float((ic > 0).mean()), 4),
                    "ic_count": int(len(ic)),
                    "theme": meta.get("theme", []),
                    "formula_latex": meta.get("formula_latex", ""),
                })
        except (SkipAlpha, RegistryError, RuntimeError, KeyError, ValueError) as exc:
            skipped.append({"id": aid, "reason": str(exc), "kind": "typed"})
        except Exception as exc:
            logger.exception("bench: unexpected failure on %s", aid)
            skipped.append({"id": aid, "reason": f"unexpected: {exc}", "kind": "unexpected"})

        if on_progress is not None:
            try:
                on_progress(idx, n_total, aid)
            except Exception:
                logger.exception("on_progress callback raised; ignoring")

    for row in rows:
        row["_category"] = categorise(row)

    counts = {"alive": 0, "reversed": 0, "dead": 0}
    for row in rows:
        counts[row["_category"]] += 1

    rows_by_ir = sorted(rows, key=lambda r: r["ir"], reverse=True)
    rows_by_ic = sorted(rows, key=lambda r: r["ic_mean"])

    def _slim(r: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": r["id"],
            "ic_mean": r["ic_mean"],
            "ir": r["ir"],
            "theme": r["theme"],
            "formula_latex": r["formula_latex"],
            "category": r["_category"],
        }

    entry.update({
        "status": "ok",
        "n_alphas_tested": len(rows),
        "n_skipped": len(skipped),
        "alive": counts["alive"],
        "reversed": counts["reversed"],
        "dead": counts["dead"],
        "by_theme": theme_breakdown(rows),
        "top5_by_ir": [_slim(r) for r in rows_by_ir[:5]],
        "dead_examples": [_slim(r) for r in rows_by_ic[:5]],
        "rows": rows,
        "skipped": skipped,
        "wall_seconds": round(time.monotonic() - start, 2),
    })
    return entry
