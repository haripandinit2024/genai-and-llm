from dataclasses import dataclass, field


@dataclass
class Agent:
    id: str
    name: str
    description: str
    system_prompt: str
    capabilities: list[str] = field(default_factory=list)


AGENTS: dict[str, Agent] = {
    "code-agent": Agent(
        id="code-agent",
        name="Code Assistant",
        description="Helps write, debug, and explain code in any language.",
        system_prompt=(
            "You are a helpful software engineering assistant. "
            "You answer questions about code, write examples, and explain concepts clearly."
        ),
        capabilities=["code_generation", "debugging", "explaining", "review"],
    ),
    "refactor-agent": Agent(
        id="refactor-agent",
        name="Refactor Expert",
        description="Suggests clean, idiomatic refactors for existing code.",
        system_prompt=(
            "You are a senior refactoring specialist. "
            "You analyze code and suggest safe, minimal, idiomatic improvements."
        ),
        capabilities=["code_generation", "review"],
    ),
    "explain-agent": Agent(
        id="explain-agent",
        name="Explain Code",
        description="Explains what a snippet does line by line.",
        system_prompt=(
            "You are a code teacher. You explain code in plain language, "
            "step by step, with concrete examples."
        ),
        capabilities=["explaining"],
    ),
    "visualizer-agent": Agent(
        id="visualizer-agent",
        name="Algorithm Animator",
        description="Generates step-by-step visual animation models for data structures.",
        system_prompt=(
            "You are an algorithm visualizer specialist. You break down complex algorithms "
            "into interactive array states, tree branches, and pointer manipulations."
        ),
        capabilities=["visualization", "animation", "algorithm_trace"],
    ),
    "architecture-agent": Agent(
        id="architecture-agent",
        name="System Architect",
        description="Designs modular software architectures and Big-O performance analyses.",
        system_prompt=(
            "You are a software architect. You design robust system models, API blueprints, "
            "and detailed time/space complexity benchmarks."
        ),
        capabilities=["architecture", "complexity_analysis", "system_design"],
    ),
}

ALL_CAPABILITIES = sorted({c for a in AGENTS.values() for c in a.capabilities})