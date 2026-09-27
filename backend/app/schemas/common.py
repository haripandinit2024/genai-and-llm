from pydantic import BaseModel, Field


class SandboxInfo(BaseModel):
    timeout_seconds: float
    max_output_chars: int
    allowed_modules: int


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: float
    agents: int
    presets: int
    sandbox: SandboxInfo


class ErrorResponse(BaseModel):
    detail: str = Field(description="Human readable error message")
