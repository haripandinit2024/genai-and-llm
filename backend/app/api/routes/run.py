from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas.tools import RunRequest, RunResponse
from app.services import code_templates
from app.services.sandbox import ALLOWED_MODULES, BLOCKED_MODULES, run_python

router = APIRouter(prefix="/api", tags=["sandbox"])


class SandboxInfoResponse(BaseModel):
    languages: list[str]
    allowed_modules: list[str]
    blocked_modules: list[str]
    notes: str


@router.post("/run", response_model=RunResponse, summary="Execute Python in the sandbox")
def run(payload: RunRequest) -> RunResponse:
    if payload.language.lower() not in code_templates.RUNTIME_LANGUAGES:
        raise HTTPException(
            status_code=422,
            detail=f"Live execution supports Python only (received '{payload.language}').",
        )
    return RunResponse(**run_python(payload.code, payload.timeout_seconds).model_dump())


@router.get("/sandbox", response_model=SandboxInfoResponse, summary="Sandbox capabilities")
def sandbox_info() -> SandboxInfoResponse:
    from app.core import config

    return SandboxInfoResponse(
        languages=sorted(code_templates.RUNTIME_LANGUAGES),
        allowed_modules=sorted(ALLOWED_MODULES),
        blocked_modules=sorted(BLOCKED_MODULES),
        notes=(
            "Best-effort local sandbox: no filesystem, network or process access, "
            f"{config.SANDBOX_TIMEOUT_SECONDS:g}s wall-clock limit, "
            f"{config.SANDBOX_MAX_OUTPUT_CHARS} character output cap."
        ),
    )
