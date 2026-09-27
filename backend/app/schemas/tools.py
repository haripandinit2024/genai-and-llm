from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.chat import ExecutionInfo


class RunRequest(BaseModel):
    code: str = Field(min_length=1)
    language: str = "python"
    timeout_seconds: Optional[float] = Field(default=None, gt=0, le=30)


class RunResponse(ExecutionInfo):
    pass


class RefactorRequest(BaseModel):
    code: str = Field(min_length=1)
    language: str = "python"


class RefactorNote(BaseModel):
    title: str
    detail: str
    severity: Literal["improvement", "warning", "info"] = "improvement"
    line: Optional[int] = None
    applied: bool = False


class RefactorStats(BaseModel):
    lines_before: int
    lines_after: int
    applied_rewrites: int
    findings: int


class RefactorResponse(BaseModel):
    language: str = "python"
    original: str
    refactored: str
    changed: bool = False
    notes: list[RefactorNote] = Field(default_factory=list)
    stats: RefactorStats


class ExplainRequest(BaseModel):
    code: str = Field(min_length=1)
    language: str = "python"


class ExplainStatement(BaseModel):
    line: int
    code: str
    explanation: str


class ComplexityReport(BaseModel):
    time: str
    space: str
    notes: list[str] = Field(default_factory=list)


class ExplainResponse(BaseModel):
    language: str = "python"
    summary: str
    complexity: ComplexityReport
    statements: list[ExplainStatement] = Field(default_factory=list)
    counts: dict[str, int] = Field(default_factory=dict)


class Preset(BaseModel):
    id: str
    title: str
    description: str
    category: str
    tag: str
    prompt: str
    complexity: str
    viz: Optional[str] = None


class PresetListResponse(BaseModel):
    categories: list[str] = Field(default_factory=list)
    presets: list[Preset] = Field(default_factory=list)
