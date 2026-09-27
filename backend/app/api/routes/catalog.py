from fastapi import APIRouter
from pydantic import BaseModel

from app.agents.base import AGENTS, ALL_CAPABILITIES
from app.schemas.tools import PresetListResponse
from app.services.presets import preset_list

router = APIRouter(prefix="/api", tags=["catalog"])


class AgentSummary(BaseModel):
    id: str
    name: str
    description: str
    capabilities: list[str]


class AgentListResponse(BaseModel):
    capabilities: list[str]
    agents: list[AgentSummary]


@router.get("/agents", response_model=AgentListResponse, summary="Available assistant agents")
def list_agents() -> AgentListResponse:
    return AgentListResponse(
        capabilities=ALL_CAPABILITIES,
        agents=[
            AgentSummary(
                id=agent.id,
                name=agent.name,
                description=agent.description,
                capabilities=agent.capabilities,
            )
            for agent in AGENTS.values()
        ],
    )


@router.get("/presets", response_model=PresetListResponse, summary="Preset algorithm library")
def list_presets() -> PresetListResponse:
    return preset_list()
