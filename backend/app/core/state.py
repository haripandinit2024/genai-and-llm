"""Small process-level runtime state (uptime tracking)."""

from __future__ import annotations

import time

STARTED_AT = time.monotonic()


def uptime_seconds() -> float:
    """Seconds since the process started serving requests."""

    return round(time.monotonic() - STARTED_AT, 3)
