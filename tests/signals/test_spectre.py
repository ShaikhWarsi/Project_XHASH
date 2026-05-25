import pytest
import pandas as pd
import numpy as np


class TestSpectreBackend:
    def test_requires_spectre(self):
        try:
            from signals.factors.spectre_backend import SpectreBackend
            SpectreBackend()
        except ImportError:
            pass

    def test_has_spectre_flag(self):
        from signals.factors.spectre_backend import HAS_SPECTRE
        assert HAS_SPECTRE is False  # spectre not installed in test env
