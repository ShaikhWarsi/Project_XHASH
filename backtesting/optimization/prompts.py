from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

SYSTEM_PROMPT = """You are a quantitative trading strategy optimizer. Your task is to propose improved parameter sets for trading indicators based on:
1. The indicator code and its tunable parameters
2. The current market regime
3. Results from previous rounds (if any)
4. Your understanding of what works in different market conditions

Rules:
- Return ONLY a valid JSON array of candidate parameter sets
- Each candidate must have all the parameters from the indicator
- Vary parameters intelligently (not randomly) based on market regime
- In bull trends: favor faster entries, wider stops
- In bear trends: favor faster exits, tighter stops
- In range: favor mean-reversion parameters
- In high volatility: favor wider bands, slower signals
- Include brief comments explaining your reasoning"""


def build_round_prompt(
    indicator_code: str,
    indicator_params: Dict[str, Any],
    regime: Optional[Dict[str, Any]],
    previous_results: Optional[List[Dict[str, Any]]],
    round_number: int,
    n_candidates: int,
) -> str:
    regime_text = "No regime data available"
    if regime:
        regime_text = f"Market Regime: {regime.get('label', 'unknown')} (confidence: {regime.get('confidence', 0):.0%})"

    prev_text = "No previous rounds"
    if previous_results:
        prev_text = "Previous round results:\n"
        for i, r in enumerate(previous_results[:5], 1):
            score = r.get("score", {}).get("overallScore", "N/A")
            params = r.get("params", {})
            prev_text += f"  {i}. Score: {score}, Params: {params}\n"

    params_text = "\n".join([f"  {k}: {v}" for k, v in indicator_params.items()])

    return f"""Round {round_number}

{regime_text}

Indicator Parameters:
{params_text}

{prev_text}

Propose {n_candidates} distinct candidate parameter sets for round {round_number}.
Return as a JSON array of objects with:
- "name": short descriptive name
- "params": dict of parameter name -> value
- "reasoning": one-sentence rationale

Each candidate must include ALL parameters listed above.
Vary temperature progressively: round {round_number} allows more exploration than round 1.

Output ONLY the JSON array, no other text."""


PARAM_RANGE_REGEX = re.compile(r"range\s*=\s*(\d+)\s*:\s*(\d+)\s*:\s*([\d.]+)", re.I)


def extract_indicator_params(code: str) -> Dict[str, Any]:
    params = {}
    for line in code.split("\n"):
        line = line.strip()
        if not line.startswith("# @param"):
            continue
        parts = line.replace("# @param", "").strip().split()
        if len(parts) >= 3:
            name = parts[0]
            ptype = parts[1]
            default = parts[2]
            param_info = {"type": ptype, "default": default}
            full_line = line
            m = PARAM_RANGE_REGEX.search(full_line)
            if m:
                param_info["range"] = {"min": int(m.group(1)), "max": int(m.group(2)), "step": float(m.group(3))}
            params[name] = param_info
    return params


def parse_llm_candidates(response: str) -> List[Dict[str, Any]]:
    import json
    text = response.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    text = text.strip()
    if text.startswith("["):
        try:
            candidates = json.loads(text)
            if isinstance(candidates, list):
                return candidates
        except json.JSONDecodeError:
            pass
    try:
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            candidates = json.loads(text[start:end])
            if isinstance(candidates, list):
                return candidates
    except (json.JSONDecodeError, ValueError):
        pass
    return []
