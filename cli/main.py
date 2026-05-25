"""Interactive CLI for Trading-Engine with Typer + Rich."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

try:
    import typer
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.layout import Layout
    from rich.live import Live
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.markdown import Markdown
    from rich import box
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

app = typer.Typer(name="trading-engine", help="AI-Augmented Quantitative Trading Platform")
console = Console() if HAS_RICH else None


@app.command()
def analyze(
    ticker: str = typer.Argument(..., help="Stock ticker symbol"),
    provider: str = typer.Option("openai", "--provider", "-p", help="LLM provider"),
    model: str = typer.Option("gpt-4", "--model", "-m", help="LLM model"),
    days: int = typer.Option(365, "--days", "-d", help="Historical data days"),
    capital: float = typer.Option(100000.0, "--capital", "-c", help="Portfolio capital"),
    language: str = typer.Option("en", "--lang", "-l", help="Output language"),
    debate: bool = typer.Option(False, "--debate", help="Use bull/bear debate pipeline"),
):
    """Run full analysis pipeline for a ticker."""
    if not HAS_RICH:
        print("Install rich for a better CLI experience: pip install rich typer")
        from scripts.run import run_analysis
        result = run_analysis(ticker, provider, model, days, capital)
        print(json.dumps(result, indent=2))
        return

    console.print(Panel(f"[bold cyan]Trading-Engine Analysis[/]\n[dim]{ticker} | {provider}/{model} | {language}[/]", box=box.ROUNDED))

    from core.enums import Timeframe
    from data.providers.yfinance import YFinanceDataSource

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task1 = progress.add_task("[yellow]Fetching market data...", total=None)
        provider_inst = YFinanceDataSource()
        end = datetime.now()
        start = end - timedelta(days=days)
        df = provider_inst.fetch_bars(ticker, Timeframe.D1, start, end)
        progress.update(task1, completed=True)

        if df.empty:
            console.print("[red]No data fetched. Check ticker symbol.[/]")
            return

        task2 = progress.add_task("[yellow]Running signal engines...", total=None)
        from signals.composite import SignalAggregator
        from core.types import SignalMatrix, PortfolioState
        agg = SignalAggregator()
        matrix = agg.compute(df, ticker)
        progress.update(task2, completed=True)

        task3 = progress.add_task("[yellow]Running LLM analysis...", total=None)
        portfolio = PortfolioState(cash=capital, total_value=capital)
        from agents.llm.base import LLMAgent
        from core.enums import AgentRole
        from llm.client import LLMClient
        llm_client = LLMClient(provider=provider, model=model) if provider != "openai" else LLMClient.deep()
        agent = LLMAgent("cli_analyst", "CLI Analyst", "You are a professional financial analyst.", llm_client=llm_client, language=language)
        results = agent.analyze([ticker], portfolio, matrix, None, current_prices={ticker: float(df['close'].iloc[-1])})
        progress.update(task3, completed=True)

    result = results.get(ticker, {})
    signal_table = Table(title=f"Signal Analysis: {ticker}", box=box.SIMPLE)
    signal_table.add_column("Metric", style="cyan")
    signal_table.add_column("Value", style="green")
    signal_table.add_row("Signal", result.signal if hasattr(result, 'signal') else "N/A")
    signal_table.add_row("Confidence", f"{result.confidence:.2%}" if hasattr(result, 'confidence') else "N/A")
    signal_table.add_row("Close Price", f"${float(df['close'].iloc[-1]):.2f}")
    signal_table.add_row("Data Points", str(len(df)))
    signal_table.add_row("Date Range", f"{df.index[0].date() if hasattr(df.index[0], 'date') else 'N/A'} to {df.index[-1].date() if hasattr(df.index[-1], 'date') else 'N/A'}")
    console.print(signal_table)

    if hasattr(result, 'reasoning') and result.reasoning:
        console.print(Panel(Markdown(result.reasoning), title="Analysis Reasoning", border_style="blue"))


@app.command()
def backtest(
    tickers: str = typer.Argument(..., help="Comma-separated tickers"),
    strategy: str = typer.Option("sma_cross", "--strategy", "-s", help="Strategy name"),
    start: str = typer.Option("", "--start", help="Start date YYYY-MM-DD"),
    end: str = typer.Option("", "--end", help="End date YYYY-MM-DD"),
    capital: float = typer.Option(100000.0, "--capital", "-c", help="Initial capital"),
    engine: str = typer.Option("default", "--engine", "-e", help="Market engine type (default/us_equity/hk_equity/china_a/crypto/forex/china_futures/global_futures)"),
    leverage: Optional[float] = typer.Option(None, "--leverage", "-l", help="Leverage multiplier (overrides engine default)"),
):
    """Run a backtest."""
    if not HAS_RICH:
        print("Install rich for a better CLI: pip install rich typer")
        return
    console.print(Panel(f"[bold cyan]Backtest[/]\n[dim]{tickers} | {strategy} | {engine} | ${capital:,.0f}[/]", box=box.ROUNDED))
    from scripts.run import run_backtest
    ticker_list = [t.strip() for t in tickers.split(",")]
    if not start:
        start = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    if not end:
        end = datetime.now().strftime("%Y-%m-%d")
    result = run_backtest(strategy, ticker_list, start, end, capital, engine_type=engine, leverage=leverage)
    result_table = Table(title="Backtest Results", box=box.SIMPLE)
    result_table.add_column("Metric", style="cyan")
    result_table.add_column("Value", style="green")
    for key, value in result.items():
        result_table.add_row(key.replace("_", " ").title(), str(value))
    console.print(result_table)


@app.command()
def debate(
    ticker: str = typer.Argument(..., help="Stock ticker"),
    rounds: int = typer.Option(2, "--rounds", "-r", help="Debate rounds"),
    provider: str = typer.Option("openai", "--provider", "-p", help="LLM provider"),
):
    """Run the bull/bear debate pipeline for a ticker."""
    if not HAS_RICH:
        print("Install rich: pip install rich typer")
        return
    console.print(Panel(f"[bold cyan]Bull vs Bear Debate[/]\n[dim]{ticker} | {rounds} rounds[/]", box=box.ROUNDED))
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        progress.add_task("[yellow]Running debate pipeline...", total=None)
        from agents.debate import DebateOrchestrator
        from data.providers.yfinance import YFinanceDataSource
        from core.enums import Timeframe
        from signals.composite import SignalAggregator
        provider_inst = YFinanceDataSource()
        end = datetime.now()
        start = end - timedelta(days=365)
        df = provider_inst.fetch_bars(ticker, Timeframe.D1, start, end)
        agg = SignalAggregator()
        matrix = agg.compute(df, ticker)
        from core.types import PortfolioState
        portfolio = PortfolioState(cash=100000, total_value=100000)
        from agents.technical_analyst import TechnicalAnalystAgent
        from agents.sentiment_analyst import SentimentAnalystAgent
        ta = TechnicalAnalystAgent()
        sa = SentimentAnalystAgent()
        tech_signals = ta.analyze([ticker], portfolio, matrix, None)
        sent_signals = sa.analyze([ticker], portfolio, matrix, None)
        analyst_reports = {}
        if ticker in tech_signals:
            analyst_reports["technical"] = tech_signals[ticker]
        if ticker in sent_signals:
            analyst_reports["sentiment"] = sent_signals[ticker]
        orchestrator = DebateOrchestrator(debate_rounds=rounds)
        result = orchestrator.run(ticker, analyst_reports)
        progress.update(progress.task_ids[0], completed=True)

    decision = result.get("decision", {})
    console.print(Panel(f"[bold]Final Decision: {decision.get('rating', 'N/A').upper()}[/]\n{decision.get('executive_summary', '')}", border_style="green" if decision.get('rating') in ('buy', 'overweight') else "red"))
    if decision.get('investment_thesis'):
        console.print(Panel(Markdown(decision['investment_thesis']), title="Investment Thesis", border_style="blue"))
    wt = result.get("wall_time", {})
    if wt:
        time_table = Table(title="Wall Times", box=box.SIMPLE)
        time_table.add_column("Agent", style="cyan")
        time_table.add_column("Total (s)", style="green")
        for agent, info in wt.items():
            time_table.add_row(agent, str(info.get('total_seconds', 0)))
        console.print(time_table)


@app.command()
def list_providers():
    """List all supported LLM providers."""
    if not HAS_RICH:
        print("Install rich: pip install rich typer")
        return
    from llm.client import LLMClient
    table = Table(title="Supported LLM Providers", box=box.SIMPLE)
    table.add_column("Provider", style="cyan")
    table.add_column("Type", style="green")
    for p in sorted(LLMClient.SUPPORTED_PROVIDERS):
        table.add_row(p, "OpenAI-compatible" if p not in ("anthropic", "google", "ollama") else "Native")
    console.print(table)


@app.command()
def list_alphas(zoo: Optional[str] = None):
    """List available alpha factors in the Alpha Zoo."""
    if not HAS_RICH:
        print("Install rich: pip install rich typer")
        return
    from signals.alpha_zoo import Registry as AlphaRegistry
    registry = AlphaRegistry()
    alphas = registry.list(zoo=zoo)
    health = registry.health()
    table = Table(title=f"Alpha Zoo ({health['loaded']} loaded, {health['failed']} failed)", box=box.SIMPLE)
    table.add_column("Alpha ID", style="cyan")
    table.add_column("Zoo", style="green")
    for aid in sorted(alphas)[:50]:
        try:
            a = registry.get(aid)
            table.add_row(aid, a.zoo)
        except KeyError:
            table.add_row(aid, "?")
    console.print(table)


@app.command()
def optimize(method: str = typer.Argument("mean_variance", help="mean_variance, risk_parity, equal_vol, max_div")):
    """Run portfolio optimization (requires returns input via stdin)."""
    if not HAS_RICH:
        print("Install rich: pip install rich typer")
        return
    import sys
    input_data = sys.stdin.read()
    if not input_data:
        console.print("[yellow]Pipe in returns JSON: echo '{\"AAPL\": [...], \"MSFT\": [...]}' | trading-engine optimize[/]")
        return
    try:
        import pandas as pd
        try:
            data = json.loads(input_data)
        except json.JSONDecodeError:
            console.print("[red]Invalid JSON input[/]")
            return
        df = pd.DataFrame(data)
        if method == "mean_variance":
            from analytics.optimizers import MeanVarianceOptimizer
            opt = MeanVarianceOptimizer()
        elif method == "risk_parity":
            from analytics.optimizers import RiskParityOptimizer
            opt = RiskParityOptimizer()
        elif method == "equal_vol":
            from analytics.optimizers import EqualVolatilityOptimizer
            opt = EqualVolatilityOptimizer()
        elif method == "max_div":
            from analytics.optimizers import MaxDiversificationOptimizer
            opt = MaxDiversificationOptimizer()
        else:
            console.print(f"[red]Unknown method: {method}[/]")
            return
        result = opt.optimize(df)
        table = Table(title=f"Optimization: {method}", box=box.SIMPLE)
        table.add_column("Asset", style="cyan")
        table.add_column("Weight", style="green")
        for asset, weight in result.get("weights", {}).items():
            table.add_row(asset, f"{weight:.4f}")
        table.add_row("[bold]Expected Return[/]", f"{result.get('expected_return', 0):.4f}")
        table.add_row("[bold]Volatility[/]", f"{result.get('volatility', 0):.4f}")
        if "sharpe" in result:
            table.add_row("[bold]Sharpe[/]", f"{result['sharpe']:.4f}")
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/]")


@app.command()
def analyze_journal(filepath: str = typer.Argument(..., help="Path to CSV/Excel trade journal")):
    """Analyze a broker trade journal."""
    if not HAS_RICH:
        print("Install rich: pip install rich typer")
        return
    from data.trade_journal import parse_journal_file, TradeJournalAnalyzer
    df = parse_journal_file(filepath)
    if df is None or df.empty:
        console.print("[red]Could not parse file or file is empty[/]")
        return
    analyzer = TradeJournalAnalyzer(df)
    profile = analyzer.profile()
    biases = analyzer.bias_diagnostics()
    profile_table = Table(title="Trade Journal Profile", box=box.SIMPLE)
    profile_table.add_column("Metric", style="cyan")
    profile_table.add_column("Value", style="green")
    for key, value in profile.items():
        profile_table.add_row(key.replace("_", " ").title(), str(value))
    console.print(profile_table)
    if "error" not in biases:
        bias_table = Table(title="Behavioral Diagnostics", box=box.SIMPLE)
        bias_table.add_column("Bias", style="cyan")
        bias_table.add_column("Severity", style="yellow")
        bias_table.add_column("Detail", style="white")
        for bias, data in biases.items():
            bias_table.add_row(bias.replace("_", " ").title(), data.get("severity", "?"), data.get("detail", ""))
        console.print(bias_table)


@app.command()
def memory(ticker: str = typer.Argument(..., help="Ticker to check memory for")):
    """Show trading memory for a ticker."""
    if not HAS_RICH:
        print("Install rich: pip install rich typer")
        return
    from agents.memory_log import TradingMemoryLog
    log = TradingMemoryLog()
    context = log.get_context(ticker)
    if context:
        console.print(Markdown(f"## Memory for {ticker}\n\n{context}"))
    else:
        console.print(f"[yellow]No memory entries for {ticker}[/]")


@app.command()
def serve(
    host: str = typer.Option("0.0.0.0", "--host", help="Host to bind"),
    port: int = typer.Option(8000, "--port", "-p", help="Port"),
    reload: bool = typer.Option(False, "--reload", help="Enable hot reload"),
):
    """Start the Trading-Engine API server."""
    from scripts.dashboard import run_server
    run_server(host=host, port=port, reload=reload)


@app.command()
def mcp(transport: str = typer.Option("stdio", "--transport", help="stdio or sse")):
    """Start the MCP server."""
    from mcp_server import main
    sys.argv = ["mcp_server.py", f"--transport={transport}"] if transport != "stdio" else ["mcp_server.py"]
    main()


def main():
    app()
