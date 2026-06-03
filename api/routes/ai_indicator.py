from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

INDICATOR_SYSTEM_PROMPT = """You generate JavaScript code for custom trading indicators using this API:

indicator({
  id: 'unique_id',
  name: 'Indicator Name',
  description: 'Description',
  category: 'momentum', // overlap | momentum | volatility | volume
  defaultParams: { period: 14 },
  paramsMeta: {
    period: { label: 'Period', type: 'int', min: 1, max: 100, default: 14 },
  },
  outputType: 'line', // line | histogram | multi_line
  paneType: 'overlay', // overlay | separate
  color: '#ff0000',
  computeFn: (data, params) => {
    // data is Array<{time, open, high, low, close, volume}>
    // Return Array<{time: Time, value: number}>
    return data.map((d, i) => ({ time: d.time, value: ... }))
  },
})

Rules:
- Use only JavaScript, no TypeScript type annotations
- The computeFn must return an array of {time, value} objects
- Helper functions for SMA, EMA, RSI, etc. must be defined inside computeFn
- id must be unique (use prefix 'ai_' + short random string)
- Return ONLY valid JavaScript code in a ```javascript code block
- Do NOT use import or require statements"""


class GenerateIndicatorRequest(BaseModel):
    description: str


@router.post("/generate-indicator")
async def generate_indicator(req: GenerateIndicatorRequest):
    if not req.description.strip():
        raise HTTPException(status_code=400, detail="description is required")

    prompt = f"""Indicator Description: {req.description}

Generate a complete custom indicator for this description. Use 'ai_' + 6 random hex chars for the id."""

    try:
        from .llm import _call_openai
        content = await _call_openai("gpt-4o", INDICATOR_SYSTEM_PROMPT + "\n\n" + prompt, 0.3, 4096)

        code_match = re.search(r"```(?:javascript|js)?\n?(.*?)```", content, re.DOTALL)
        code = code_match.group(1).strip() if code_match else content.strip()

        name_match = re.search(r"name:\s*'([^']+)'", code)
        name = name_match.group(1) if name_match else "Custom Indicator"

        id_match = re.search(r"id:\s*'([^']+)'", code)
        indicator_id = id_match.group(1) if id_match else f"ai_{__import__('uuid').uuid4().hex[:6]}"

        warnings = []
        if not code_match:
            warnings.append("Could not extract code block, using raw response")
        if name == "Custom Indicator":
            warnings.append("Could not determine indicator name from generated code")

        return {
            "code": code,
            "name": name,
            "id": indicator_id,
            "warnings": warnings,
        }
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM dependencies not available")
    except Exception as e:
        logger.warning("Indicator generation failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")
