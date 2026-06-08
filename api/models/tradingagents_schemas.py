from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ScrapeSourceOut(BaseModel):
    source: str
    items: list[dict] = Field(default_factory=list)
    fetched_at: str = ""


class ScrapeBundleOut(BaseModel):
    ticker: str
    sources: list[ScrapeSourceOut] = Field(default_factory=list)


class AnalystReportOut(BaseModel):
    name: str
    content: str
    at: str = ""


class DebateRoundOut(BaseModel):
    speaker: str
    round: int = 0
    content: str
    at: str = ""


class PortfolioDecisionOut(BaseModel):
    rating: str = ""
    executive_summary: str = ""
    investment_thesis: str = ""
    price_target: Optional[float] = None
    time_horizon: Optional[str] = None
    raw: str = ""


class ReportBundleOut(BaseModel):
    ticker: str
    scrape: Optional[ScrapeBundleOut] = None
    analysts: list[AnalystReportOut] = Field(default_factory=list)
    invest_debate: list[DebateRoundOut] = Field(default_factory=list)
    research_plan: str = ""
    trader_plan: str = ""
    risk_debate: list[DebateRoundOut] = Field(default_factory=list)
    final: PortfolioDecisionOut = Field(default_factory=PortfolioDecisionOut)


class AnalyzeRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    trade_date: Optional[str] = None
    max_debate_rounds: int = Field(default=1, ge=0, le=10)
    max_risk_rounds: int = Field(default=1, ge=0, le=10)
    deep_model: Optional[str] = None
    quick_model: Optional[str] = None


class ScrapeRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    days: int = Field(default=7, ge=1, le=90)


class AnalyzeResponse(BaseModel):
    run_id: str
    ticker: str
    status: str = "queued"


class RunSummaryOut(BaseModel):
    id: str
    ticker: str
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error: Optional[str] = None


class RunListResponse(BaseModel):
    runs: list[RunSummaryOut]


class SSEEventOut(BaseModel):
    event: str
    data: dict[str, Any]
    ts: str = ""


class RunStatusOut(BaseModel):
    id: str
    ticker: str
    status: str
    current_stage: Optional[str] = None
    current_node: Optional[str] = None
    tool_call_count: int = 0
    elapsed_ms: int = 0
    cancel_requested: bool = False
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error: Optional[str] = None
    error_detail: Optional[str] = None


class EventOut(BaseModel):
    id: int
    run_id: str
    event_type: str
    event_data: dict[str, Any] = Field(default_factory=dict)
    node_name: Optional[str] = None
    created_at: Optional[datetime] = None


class EventListResponse(BaseModel):
    events: list[EventOut] = Field(default_factory=list)
    total: int = 0


class CancelResponse(BaseModel):
    success: bool
    message: str = ""


class DebugInfoOut(BaseModel):
    backend_up: bool = False
    database_up: bool = False
    lm_studio_up: bool = False
    lm_studio_model: str = ""
    lm_studio_context: int = 0
    last_runs: list[RunSummaryOut] = Field(default_factory=list)
    uptime_seconds: int = 0
    version: str = "0.1.0"
