# AI Agent Systems

The Trading Engine features a sophisticated multi-agent system with hedge fund personas, LLM-powered analysts, and Renaissance-style collaborative teams.

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Orchestrator                      │
│                   (coordinates all agents)                  │
└───────┬─────────────────┬─────────────────┬─────────────────┘
        │                 │                 │
┌───────▼──────┐ ┌────────▼────────┐ ┌─────▼─────────────┐
│ Hedge Fund   │ │  LLM Agents     │ │ Renaissance Teams │
│ Personas    │ │                 │ │                   │
│ (16 agents) │ │ (8 agents)      │ │ - Research Team   │
│             │ │                 │ │ - Risk Team       │
│             │ │                 │ │ - Trading Team    │
└─────────────┘ └─────────────────┘ └───────────────────┘
```

## Hedge Fund Personas

Located in [agents/hedge_fund/](../../agents/hedge_fund/)

### Available Personas

| Persona | Strategy Style | Key Metrics |
|---------|---------------|-------------|
| **Warren Buffett** | Value / Moat | Intrinsic value, ROIC, moat width |
| **Ben Graham** | Deep Value / Margin of Safety | P/E, P/B, debt ratio |
| **Michael Burry** | Deep Value / Contrarian | Short interest, fundamentals |
| **Stanley Druckenmiller** | Macro / Momentum | Central bank policy, momentum |
| **Nassim Taleb** | Tail Risk / Antifragility | Convexity, antifragility score |
| **Peter Lynch** | GARP | Earnings growth, PEG ratio |
| **Charlie Munger** | Value / Psychology | Multi-disciplinary analysis |
| **Mohnish Pabrai** | Clone / Asymmetric | Clone scoring, asymmetric bets |
| **Bill Ackman** | Activist / High-conviction | Activist catalyst, valuation |
| **Cathie Wood** | Innovation / Growth | Innovation score, disruption |
| **Phil Fisher** | Growth / Quality | Growth factors, quality score |
| **Rakesh Jhunjhunwala** | Contrarian / Growth | Contrarian indicator |

### Base Class

```python
from agents.hedge_fund.base import PersonaAgent

class WarrenBuffett(PersonaAgent):
    def _score_ticker(
        self,
        ticker: str,
        df: Optional[pd.DataFrame],
        quant_signals: list,
        composite_score: float,
        regime: object,
        portfolio: PortfolioState,
    ) -> AnalystSignal:
        # Buffett-specific scoring logic
        intrinsic_value = self._calculate_intrinsic_value(df)
        moat_score = self._assess_moat(df)
        score = self._combine_scores(intrinsic_value, moat_score, composite_score)
        return AnalystSignal(ticker=ticker, signal=score, confidence=0.85)
```

### Usage

```python
from agents.hedge_fund.warren_buffett import WarrenBuffett

buffett = WarrenBuffett()
result = buffett.analyze(
    tickers=["AAPL", "MSFT"],
    portfolio=portfolio_state,
    signals=signal_matrix,
    risk_limits=risk_limits
)
```

## LLM Agents

Located in [agents/llm/](../../agents/llm/)

### Agent Types

| Agent | Role | Capabilities |
|-------|------|--------------|
| **ValuationAgent** | Fundamental analysis | DCF, relative valuation |
| **SentimentAgent** | Sentiment analysis | News, social media parsing |
| **FundamentalsAgent** | Financial analysis | Earnings, balance sheet |
| **TechnicalsAgent** | Technical analysis | Chart pattern commentary |
| **PortfolioManagerAgent** | Portfolio construction | Allocation, rebalancing |
| **RiskManagerAgent** | Risk assessment | VaR, stress testing |
| **GrowthAgent** | Growth analysis | Growth metrics, trends |
| **NewsSentimentAgent** | News analysis | Real-time news scoring |

### Base Implementation

```python
from agents.llm.base import LLMAgent
from agents.llm.schemas import AgentResponse

class ValuationAgent(LLMAgent):
    name = "Valuation Analyst"
    description = "Analyzes stock valuations using fundamental metrics"

    async def analyze(self, ticker: str, **kwargs) -> AgentResponse:
        prompt = self._build_prompt(ticker, **kwargs)
        response = await self.llm.generate(prompt)
        return self._parse_response(response)
```

### LLM Client

```python
from llm.client import LLMClient

client = LLMClient(model="gpt-4o")
response = await client.generate(
    prompt="Analyze AAPL valuation",
    system="You are a value investing expert."
)
```

### Model Capabilities

Located in [llm/capabilities.py](../../llm/capabilities.py)

```python
from llm.capabilities import get_capabilities

caps = get_capabilities("o1-preview")
# Supports thinking mode, reasoning content roundtrip
```

## Renaissance-Style Teams

Located in [agents/renaissance/](../../agents/renaissance/)

### Team Structure

```python
class RenaissanceOrchestrator:
    """Multi-agent team like Renaissance Technologies"""

    def __init__(self):
        self.research_team = ResearchTeam()
        self.risk_team = RiskTeam()
        self.trading_team = TradingTeam()

    async def run_cycle(self, tickers: list[str]) -> TradingDecision:
        research = await self.research_team.analyze(tickers)
        risk = await self.risk_team.review(research)
        decision = await self.trading_team.execute(research, risk)
        return decision
```

### Research Team
- Alpha discovery
- Factor research
- Hypothesis generation

### Risk Team
- Risk assessment
- Exposure limits
- Correlation analysis

### Trading Team
- Execution strategies
- Transaction cost analysis
- Order routing

## Debate System

Located in [agents/debate/](../../agents/debate/)

Implements bull vs bear debate for generating balanced analysis:

```python
from agents.debate.orchestrator import DebateOrchestrator

orchestrator = DebateOrchestrator()

# Run debate on a ticker
result = await orchestrator.debate(
    ticker="AAPL",
    context={"signals": signals, "regime": regime}
)
```

### Debate Participants

| Role | Perspective |
|------|-------------|
| Bull Researcher | Bullish thesis builder |
| Bear Researcher | Bearish thesis builder |
| Aggressive Debator | Concorde/dismiss arguments |
| Conservative Debator | Moderate/safe stance |
| Neutral Debator | Balanced assessment |
| Research Manager | Coordinates research |
| Portfolio Manager | Final portfolio decision |

## Agent Output Format

```python
@dataclass
class AnalystSignal:
    ticker: str
    signal: float              # -1.0 to 1.0 (bearish to bullish)
    confidence: float          # 0.0 to 1.0
    thesis: str               # Investment thesis text
    risks: list[str]          # Risk factors
    metrics: dict             # Supporting metrics
    agent_name: str           # Which agent produced it
    timestamp: datetime
```

## Council Mode (Multi-Agent)

```python
from agents.orchestrator import AgentCouncil

council = AgentCouncil(
    personas=["buffett", "burry", "taleb", "lynch"],
    llm_agents=["valuation", "sentiment", "technicals"]
)

decision = council.deliberate(
    tickers=["AAPL", "MSFT"],
    signals=signal_matrix,
    portfolio=portfolio_state
)
```

## Reflection Service

Located in [agents/reflection_service.py](../../agents/reflection_service.py)

Enables agents to review and improve their past decisions:

```python
from agents.reflection_service import ReflectionService

reflection = ReflectionService()
insights = await reflection.analyze_performance(
    agent_id="buffett",
    lookback_days=30
)
```

## Using Agents from API

```bash
# Run hedge fund analysis
curl -X POST http://localhost:8000/api/agent/hedge-fund \
  -d '{"ticker": "AAPL", "personas": ["buffett", "burry"]}'

# Get agent opinions
curl http://localhost:8000/api/agent/opinions/AAPL
```
