from fastapi import APIRouter

from app.agents.base import AGENTS
from app.core import config, state
from app.schemas.common import HealthResponse, SandboxInfo
from app.services.presets import PRESETS
from app.services.sandbox import sandbox_summary

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse, summary="Service health")
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="multicode-agent",
        version=config.APP_VERSION,
        uptime_seconds=state.uptime_seconds(),
        agents=len(AGENTS),
        presets=len(PRESETS),
        sandbox=SandboxInfo(**sandbox_summary()),
    )
