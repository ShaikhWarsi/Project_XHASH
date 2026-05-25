from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    GROQ = "groq"
    GOOGLE = "google"


class AgentModelConfig(BaseModel):
    agent_id: str
    model_name: Optional[str] = None
    model_provider: Optional[ModelProvider] = None


class GraphNodeData(BaseModel):
    label: Optional[str] = None
    ticker: Optional[str] = None
    agent_key: Optional[str] = None
    agentKey: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    tickers: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    initialCash: Optional[float] = None
    direction: Optional[float] = None
    confidence: Optional[float] = None


class GraphNode(BaseModel):
    id: str
    type: str
    position: Dict[str, float]
    data: GraphNodeData = Field(default_factory=GraphNodeData)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class PortfolioPosition(BaseModel):
    ticker: str
    quantity: int
    price: Optional[float] = None


class HedgeFundRequest(BaseModel):
    tickers: List[str]
    start_date: str
    end_date: str
    initial_cash: float = 100000.0
    margin_requirement: float = 0.0
    model_name: str = "gpt-4o"
    model_provider: ModelProvider = ModelProvider.OPENAI
    graph_nodes: List[GraphNode] = Field(default_factory=list)
    graph_edges: List[GraphEdge] = Field(default_factory=list)
    portfolio_positions: List[PortfolioPosition] = Field(default_factory=list)
    agent_model_configs: List[AgentModelConfig] = Field(default_factory=list)
    api_keys: Optional[Dict[str, str]] = None


class BacktestRequest(BaseModel):
    tickers: List[str]
    start_date: str
    end_date: str
    initial_capital: float = 100000.0
    margin_requirement: float = 0.0
    engine_type: str = "default"
    leverage: float = 1.0
    model_name: str = "gpt-4o"
    model_provider: ModelProvider = ModelProvider.OPENAI
    graph_nodes: List[GraphNode] = Field(default_factory=list)
    graph_edges: List[GraphEdge] = Field(default_factory=list)
    portfolio_positions: List[PortfolioPosition] = Field(default_factory=list)
    agent_model_configs: List[AgentModelConfig] = Field(default_factory=list)
    api_keys: Optional[Dict[str, str]] = None


class BacktestDayResult(BaseModel):
    date: str
    portfolio_value: float
    cash: float
    long_exposure: float
    short_exposure: float
    gross_exposure: float
    net_exposure: float
    decisions: Dict[str, Any] = Field(default_factory=dict)


class BacktestPerformanceMetrics(BaseModel):
    sharpe_ratio: Optional[float] = None
    sortino_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    max_drawdown_date: Optional[str] = None
    total_return: Optional[float] = None
    total_days: Optional[int] = None


class ErrorResponse(BaseModel):
    detail: str


# Flow schemas
class FlowCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    viewport: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None
    is_template: bool = False
    tags: Optional[List[str]] = None


class FlowUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[GraphNode]] = None
    edges: Optional[List[GraphEdge]] = None
    viewport: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None
    is_template: Optional[bool] = None
    tags: Optional[List[str]] = None


class FlowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list)
    viewport: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None
    is_template: bool = False
    tags: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FlowSummaryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_template: bool = False
    tags: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FlowRunStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class FlowRunCreateRequest(BaseModel):
    request_data: Dict[str, Any]


class FlowRunUpdateRequest(BaseModel):
    status: Optional[FlowRunStatus] = None
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class FlowRunResponse(BaseModel):
    id: int
    flow_id: int
    status: FlowRunStatus
    request_data: Optional[Dict[str, Any]] = None
    results: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FlowRunSummaryResponse(BaseModel):
    id: int
    flow_id: int
    status: FlowRunStatus
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# API Key schemas
class ApiKeyCreateRequest(BaseModel):
    provider: str
    key_value: str
    description: Optional[str] = None
    is_active: bool = True


class ApiKeyUpdateRequest(BaseModel):
    key_value: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ApiKeyResponse(BaseModel):
    id: int
    provider: str
    key_value: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApiKeySummaryResponse(BaseModel):
    id: int
    provider: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApiKeyBulkItem(BaseModel):
    provider: str
    key_value: str
    description: Optional[str] = None
    is_active: bool = True


class ApiKeyBulkUpdateRequest(BaseModel):
    api_keys: List[ApiKeyBulkItem]
