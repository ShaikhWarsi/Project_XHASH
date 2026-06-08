"""Fallback for structured output when the local model doesn't support it.

Wraps ``with_structured_output`` calls; on failure (the model doesn't
support function-calling or json_schema), falls back to free-text
generation + regex extraction via ``parse_rating``.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Optional

from integrations.tradingagents.agents.utils.rating import parse_rating

logger = logging.getLogger(__name__)


def invoke_structured_or_freetext(
    llm: Any,
    messages: list,
    schema_cls: Any,
    ticker: str = "",
) -> Any:
    """Try structured output; fall back to free-text + regex extraction.

    Args:
        llm: The langchain ChatOpenAI (or compatible) instance.
        messages: List of langchain message objects (HumanMessage, SystemMessage, etc.).
        schema_cls: Pydantic model class (e.g. ``ResearchPlan``, ``TraderProposal``).
        ticker: Ticker symbol (used for logging).

    Returns:
        An instance of ``schema_cls`` (may be partially populated on fallback).
    """
    try:
        structured = llm.with_structured_output(schema_cls)
        result = structured.invoke(messages)
        logger.info("Structured output succeeded for %s", ticker or "unknown")
        return result
    except (NotImplementedError, Exception) as exc:
        logger.warning(
            "Structured output failed for %s (%s); falling back to free-text",
            ticker or "unknown", exc,
        )

    try:
        raw = llm.invoke(messages).content
    except Exception as exc:
        logger.error("LLM invocation failed for %s: %s", ticker or "unknown", exc)
        return schema_cls()

    return _regex_extract(raw, schema_cls, ticker)


def _regex_extract(raw: str, schema_cls: Any, ticker: str = "") -> Any:
    """Extract fields from free-text LLM output using regex heuristics."""
    rating = parse_rating(raw)

    fields = {}
    for field_name, field_info in schema_cls.model_fields.items():
        if field_name == "recommendation" or field_name == "rating":
            fields[field_name] = rating
        elif field_info.annotation is str:
            snippet = _extract_section(raw, field_name)
            fields[field_name] = snippet or raw[:500]
        elif field_info.annotation in (Optional[float], float, type(None)):
            fields[field_name] = _extract_float(raw, field_name)

    try:
        return schema_cls(**fields)
    except Exception:
        logger.warning("Failed to build %s from regex extraction; returning empty", schema_cls.__name__)
        return schema_cls()


_SECTION_RE = re.compile(r"\*\*(.*?)\*\*\s*:\s*(.*?)(?=\n\*\*|\Z)", re.DOTALL)


def _extract_section(text: str, field_name: str) -> Optional[str]:
    pretty = field_name.replace("_", " ").title()
    pattern = rf"\*\*{re.escape(pretty)}\*\*\s*:\s*(.*?)(?=\n\*\*|\Z)"
    m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()
    for key_variant in (field_name, field_name.lower(), field_name.replace("_", " ")):
        m = re.search(rf"{re.escape(key_variant)}[:\s]+(.+?)(?:\n|$)", text, re.IGNORECASE | re.DOTALL)
        if m:
            return m.group(1).strip()[:500]
    return None


def _extract_float(text: str, field_name: str) -> Optional[float]:
    pretty = field_name.replace("_", " ").title()
    m = re.search(rf"\*\*{re.escape(pretty)}\*\*\s*:\s*\$?([\d,.]+)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            pass
    m = re.search(rf"(?:price\s*target|target\s*price)[:\s]+\$?([\d,.]+)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            pass
    return None
