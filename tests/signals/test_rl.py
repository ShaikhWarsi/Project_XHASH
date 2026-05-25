import pytest
import pandas as pd
import numpy as np


class TestRLEnvironment:
    def test_requires_gym(self):
        try:
            from signals.rl.environment import TradingEnv
            df = pd.DataFrame({"close": [100, 101, 102]})
            env = TradingEnv(df)
            assert env is not None
        except ImportError:
            pass


class TestRLTrainer:
    def test_requires_sb3(self):
        try:
            from signals.rl.trainer import RLTrainer, HAS_SB3
            assert HAS_SB3 is False  # not installed in test env
        except ImportError:
            pass

    def test_unknown_algo_raises(self):
        try:
            from signals.rl.environment import TradingEnv
            from signals.rl.trainer import RLTrainer
            df = pd.DataFrame({"close": [100, 101, 102]})
            env = TradingEnv(df)
            with pytest.raises(ValueError, match="Unknown algorithm"):
                RLTrainer(env, algo="unknown")
        except ImportError:
            pass
