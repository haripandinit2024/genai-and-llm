from typing import Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str = Field(default="user", description="'user' or 'assistant'")
    content: str = Field(default="")


class ChatRequest(BaseModel):
    agent_id: str = Field(default="code-agent")
    messages: list[Message] = Field(default_factory=list)


class CodeBlock(BaseModel):
    """A fenced code block extracted from an assistant reply."""

    language: str = "text"
    code: str = ""
    runnable: bool = False
    viz: Optional[str] = Field(
        default=None,
        description="Suggested visualizer view: sorting | binary_search | linked_list | stack_queue | tree",
    )


class ExecutionInfo(BaseModel):
    """Result of executing a snippet inside the sandbox."""

    ok: bool = False
    stdout: str = ""
    error: Optional[str] = None
    duration_ms: float = 0.0
    language: str = "python"
    truncated: bool = False
    timed_out: bool = False


class ChatResponse(BaseModel):
    reply: str
    agent_id: str = "code-agent"
    code_blocks: list[CodeBlock] = Field(default_factory=list)
    execution: Optional[ExecutionInfo] = None
    suggestions: list[str] = Field(default_factory=list)
