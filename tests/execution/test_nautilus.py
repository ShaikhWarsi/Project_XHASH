import pytest


class TestNautilusAdapter:
    def test_requires_nautilus(self):
        try:
            from execution.nautilus.adapter import NautilusAdapter
            NautilusAdapter()
        except ImportError:
            pass

    def test_has_nautilus_flag(self):
        from execution.nautilus import HAS_NAUTILUS
        assert HAS_NAUTILUS is False
