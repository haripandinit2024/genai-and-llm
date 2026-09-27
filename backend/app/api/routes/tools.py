from fastapi import APIRouter

from app.schemas.tools import (
    ExplainRequest,
    ExplainResponse,
    RefactorRequest,
    RefactorResponse,
)
from app.services.explain import explain_response
from app.services.refactor import refactor_response

router = APIRouter(prefix="/api", tags=["tools"])


@router.post("/refactor", response_model=RefactorResponse, summary="Static-analysis refactor pass")
def refactor(payload: RefactorRequest) -> RefactorResponse:
    return refactor_response(payload.code)


@router.post("/explain", response_model=ExplainResponse, summary="Line-by-line explanation")
def explain(payload: ExplainRequest) -> ExplainResponse:
    return explain_response(payload.code)
