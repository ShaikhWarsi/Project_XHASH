from __future__ import annotations

from .base import PersonaAgent
from .orchestrator import HedgeFundOrchestrator
from .warren_buffett import WarrenBuffettAgent
from .ben_graham import BenGrahamAgent
from .charlie_munger import CharlieMungerAgent
from .michael_burry import MichaelBurryAgent
from .bill_ackman import BillAckmanAgent
from .stanley_druckenmiller import StanleyDruckenmillerAgent
from .rakesh_jhunjhunwala import RakeshJhunjhunwalaAgent
from .mohnish_pabrai import MohnishPabraiAgent
from .nassim_taleb import NassimTalebAgent
from .peter_lynch import PeterLynchAgent
from .phil_fisher import PhilFisherAgent
from .cathie_wood import CathieWoodAgent
from .aswath_damodaran import AswathDamodaranAgent
from .sentiment_analyst import SentimentAnalystPersona
from .news_sentiment import NewsSentimentPersona
from .growth_agent import GrowthPersona

__all__ = [
    "PersonaAgent",
    "HedgeFundOrchestrator",
    "WarrenBuffettAgent",
    "BenGrahamAgent",
    "CharlieMungerAgent",
    "MichaelBurryAgent",
    "BillAckmanAgent",
    "StanleyDruckenmillerAgent",
    "RakeshJhunjhunwalaAgent",
    "MohnishPabraiAgent",
    "NassimTalebAgent",
    "PeterLynchAgent",
    "PhilFisherAgent",
    "CathieWoodAgent",
    "AswathDamodaranAgent",
    "SentimentAnalystPersona",
    "NewsSentimentPersona",
    "GrowthPersona",
]
