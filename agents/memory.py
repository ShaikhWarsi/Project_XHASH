from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class AgentMemory:
    """Persistent memory for trading agents.

    Features:
    - Session checkpointing
    - Reflection storage
    - Debate history
    - Symbol analysis memory
    """

    agent_id: str
    session_id: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    reflections: list[dict] = field(default_factory=list)
    debate_history: list[dict] = field(default_factory=list)
    symbol_analysis: dict[str, dict] = field(default_factory=dict)
    preferences: dict[str, Any] = field(default_factory=dict)
    performance_metrics: dict[str, float] = field(default_factory=dict)


class AgentMemoryStore:
    """Persistent storage for agent memories.

    Manages:
    - Memory creation/loading
    - Checkpointing
    - Reflection persistence
    """

    def __init__(self, storage_path: Optional[str] = None):
        if storage_path is None:
            storage_path = str(Path.home() / ".trading-engine" / "agent_memory")

        self._path = Path(storage_path)
        self._path.mkdir(parents=True, exist_ok=True)
        self._memories: dict[str, AgentMemory] = {}

    def _get_memory_path(self, agent_id: str, session_id: str) -> Path:
        return self._path / f"{agent_id}_{session_id}.json"

    def create_memory(
        self,
        agent_id: str,
        session_id: str,
    ) -> AgentMemory:
        memory = AgentMemory(
            agent_id=agent_id,
            session_id=session_id,
        )
        self._memories[f"{agent_id}:{session_id}"] = memory
        self._save_memory(memory)
        return memory

    def get_memory(
        self,
        agent_id: str,
        session_id: str,
    ) -> Optional[AgentMemory]:
        key = f"{agent_id}:{session_id}"

        if key in self._memories:
            return self._memories[key]

        path = self._get_memory_path(agent_id, session_id)

        if path.exists():
            try:
                data = json.loads(path.read_text())
                memory = AgentMemory(**data)
                self._memories[key] = memory
                return memory
            except Exception as e:
                logger.error(f"Error loading memory: {e}")

        return self.create_memory(agent_id, session_id)

    def _save_memory(self, memory: AgentMemory) -> None:
        memory.updated_at = datetime.now(timezone.utc)
        path = self._get_memory_path(memory.agent_id, memory.session_id)
        path.write_text(json.dumps(asdict(memory), indent=2, default=str))

    def _reflection_hash(self, reflection: dict) -> str:
        import hashlib
        content = json.dumps(reflection, sort_keys=True, default=str)
        return hashlib.md5(content.encode()).hexdigest()

    def add_reflection(
        self,
        agent_id: str,
        session_id: str,
        reflection: dict,
    ) -> Optional[AgentMemory]:
        memory = self.get_memory(agent_id, session_id)
        if not memory:
            return None

        reflection["timestamp"] = datetime.now(timezone.utc).isoformat()
        h = self._reflection_hash(reflection)
        existing = {self._reflection_hash(r) for r in memory.reflections}
        if h not in existing:
            memory.reflections.append(reflection)
            self._save_memory(memory)
        return memory

    def add_debate(
        self,
        agent_id: str,
        session_id: str,
        debate: dict,
    ) -> Optional[AgentMemory]:
        memory = self.get_memory(agent_id, session_id)
        if not memory:
            return None

        debate["timestamp"] = datetime.now(timezone.utc).isoformat()
        h = self._reflection_hash(debate)
        existing = {self._reflection_hash(d) for d in memory.debate_history}
        if h not in existing:
            memory.debate_history.append(debate)
            self._save_memory(memory)
        return memory

    def update_symbol_analysis(
        self,
        agent_id: str,
        session_id: str,
        symbol: str,
        analysis: dict,
    ) -> Optional[AgentMemory]:
        memory = self.get_memory(agent_id, session_id)
        if not memory:
            return None

        memory.symbol_analysis[symbol] = {
            **analysis,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._save_memory(memory)
        return memory

    def get_symbol_history(
        self,
        agent_id: str,
        session_id: str,
        symbol: str,
    ) -> Optional[dict]:
        memory = self.get_memory(agent_id, session_id)
        if not memory:
            return None

        return memory.symbol_analysis.get(symbol)

    def list_sessions(self, agent_id: str) -> list[str]:
        sessions = []
        for path in self._path.glob(f"{agent_id}_*.json"):
            name = path.stem
            session_id = name[len(agent_id) + 1:]
            sessions.append(session_id)
        return sessions

    def delete_memory(self, agent_id: str, session_id: str) -> bool:
        key = f"{agent_id}:{session_id}"

        if key in self._memories:
            del self._memories[key]

        path = self._get_memory_path(agent_id, session_id)

        if path.exists():
            path.unlink()
            return True

        return False
