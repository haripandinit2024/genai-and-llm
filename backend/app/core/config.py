"""Central runtime configuration for the Multicode Agent backend.

Every value can be overridden with an environment variable so the service can be
deployed without touching code.
"""

from __future__ import annotations

import os


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value.strip() if value and value.strip() else default


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env_str(name, str(default)))
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(_env_str(name, str(default)))
    except ValueError:
        return default


def _env_list(name: str, default: tuple[str, ...]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return list(default)
    return [item.strip() for item in raw.split(",") if item.strip()]


APP_NAME = "Multicode Agent"
APP_DESCRIPTION = (
    "AI code-agent backend: multi-agent chat, sandboxed execution, "
    "static refactoring analysis and algorithm analytics."
)
APP_VERSION = "0.2.0"

HOST = _env_str("MULTICODE_HOST", "127.0.0.1")
PORT = _env_int("MULTICODE_PORT", 8001)

# Vite dev server origins are allowed by default; add deployments with
# MULTICODE_CORS_ORIGINS="https://app.example.com,http://localhost:4173".
CORS_ORIGINS = _env_list(
    "MULTICODE_CORS_ORIGINS",
    (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ),
)

# ── Sandbox limits ──
SANDBOX_TIMEOUT_SECONDS = _env_float("MULTICODE_SANDBOX_TIMEOUT", 5.0)
SANDBOX_MAX_OUTPUT_CHARS = _env_int("MULTICODE_SANDBOX_MAX_OUTPUT", 20_000)
SANDBOX_MAX_CODE_CHARS = _env_int("MULTICODE_SANDBOX_MAX_CODE", 40_000)
