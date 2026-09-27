from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.generator import generate_reply

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse, summary="Send a conversation turn")
def chat(payload: ChatRequest) -> ChatResponse:
    return generate_reply(payload.agent_id, payload.messages)
