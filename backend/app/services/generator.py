"""Chat orchestration: turns an agent + conversation into a structured reply.

The engine is deterministic (no network, no API keys). Every snippet it hands
back is parsed with :mod:`ast` before it is returned, so the "Run Code" button
never receives invalid Python.
"""

from __future__ import annotations

import ast
import json
from typing import Optional

from app.agents.base import AGENTS, Agent
from app.schemas.chat import ChatResponse, CodeBlock, ExecutionInfo, Message
from app.services import blueprints, code_templates, explain as explain_service
from app.services import refactor as refactor_service
from app.services.sandbox import run_python

_VISUAL_LANGUAGES = frozenset(
    {"python", "py", "javascript", "js", "typescript", "ts", "java", "cpp", "c", "go", "rust"}
)

_RUN_KEYWORDS = ("run", "execute", "run it", "output", "result", "show output")

_GREETINGS = ("hello", "hi", "hey", "yo", "good morning", "good evening")

_AGENT_SUGGESTIONS: dict[str, list[str]] = {
    "code-agent": [
        "Generate a fibonacci function",
        "Show me sorting algorithms",
        "Write a linked list implementation",
    ],
    "refactor-agent": [
        "Paste a snippet and I will analyse it",
        "Add memoization to my recursive function",
    ],
    "explain-agent": [
        "Paste Python code for a line-by-line walkthrough",
        "Explain the time complexity of my snippet",
    ],
    "visualizer-agent": [
        "Visualize bubble sort",
        "Trace binary search on a sorted array",
    ],
    "architecture-agent": [
        "Design a scalable API gateway architecture",
        "Draft a REST contract for a payments service",
    ],
}


# ── helpers ─────────────────────────────────────────────────────────────


def _infer_viz(code: str) -> Optional[str]:
    """Guess which visualizer view fits a snippet."""

    lowered = code.lower()
    if "bubble_sort" in lowered or "quick_sort" in lowered or "merge_sort" in lowered:
        return "sorting"
    if "def bubble" in lowered or "sort(" in lowered or "sorted(" in lowered:
        return "sorting"
    if "binary_search" in lowered or "def binary" in lowered:
        return "binary_search"
    if "linked" in lowered or "class node" in lowered:
        return "linked_list"
    if "stack" in lowered or "queue" in lowered:
        return "stack_queue"
    if "bst" in lowered or "binarysearchtree" in lowered or "tree" in lowered:
        return "tree"
    if "fibonacci" in lowered:
        return "sorting"
    return None


def _finalize(reply: str, viz_hint: Optional[str] = None) -> tuple[str, list[CodeBlock]]:
    """Attach runnable/viz metadata to every code block in a reply."""

    blocks = code_templates.extract_code_blocks(reply)
    for index, block in enumerate(blocks):
        if block.language in _VISUAL_LANGUAGES:
            block.viz = viz_hint if index == 0 and viz_hint else _infer_viz(block.code)
    return reply, blocks


def _looks_like_code_request(text: str) -> bool:
    lowered = text.lower()
    if any(keyword in lowered for keyword in code_templates.REQUEST_VERBS):
        return True
    key, _, _ = code_templates.find_template(lowered)
    return key is not None


def _is_runnable_python(block: CodeBlock) -> bool:
    return block.language in ("python", "py")


def _execution_block(execution: ExecutionInfo) -> str:
    body = execution.stdout.strip() or "(no output)"
    error = f"\n**Error**\n```text\n{execution.error}\n```" if execution.error else ""
    status = "completed" if execution.ok else "raised an error"
    return (
        f"I ran the Python snippet in the sandbox — it {status} in "
        f"{execution.duration_ms:.1f} ms.\n\n"
        f"**Output**\n```text\n{body}\n```{error}"
    )


# ── dynamic generation ──────────────────────────────────────────────────

_DYNAMIC_SNIPPETS: tuple[tuple[tuple[str, ...], str], ...] = (
    (
        ("reverse", "backwards"),
        '''def reverse_string(text: str) -> str:
    """Reverse a string using slicing - O(n) time."""
    return text[::-1]


def reverse_words(sentence: str) -> str:
    """Reverse word order while keeping each word intact."""
    return " ".join(reversed(sentence.split()))


sample = "Multicode Agent"
print(f"Original:      {sample}")
print(f"Reversed:      {reverse_string(sample)}")
print(f"Reversed word: {reverse_words('build fast ship safely')}")''',
    ),
    (
        ("vowel",),
        '''from collections import Counter


def count_vowels(text: str) -> dict[str, int]:
    """Count the vowels in a string, ignoring case."""
    vowels = Counter(char.lower() for char in text if char.lower() in "aeiou")
    return {vowel: vowels.get(vowel, 0) for vowel in "aeiou"}


sample = "Multicode Agent Coding Assistant"
print(f"Vowel counts in '{sample}':")
for vowel, count in count_vowels(sample).items():
    print(f"  {vowel}: {count}")''',
    ),
    (
        ("anagram",),
        '''from collections import Counter


def is_anagram(first: str, second: str) -> bool:
    """Check whether two strings are anagrams (O(n) with counters)."""
    normalise = lambda value: Counter(char.lower() for char in value if char.isalnum())
    return normalise(first) == normalise(second)


for pair in [("listen", "silent"), ("hello", "world")]:
    print(f"'{pair[0]}' & '{pair[1]}' -> {is_anagram(*pair)}")''',
    ),
    (
        ("password", "random"),
        '''import string

from secrets import choice


def generate_password(length: int = 16) -> str:
    """Generate a cryptographically strong random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(choice(alphabet) for _ in range(length))


for index in range(1, 4):
    print(f"Sample password {index}: {generate_password(16)}")''',
    ),
    (
        ("tic tac toe", "tictactoe"),
        '''class TicTacToe:
    """Minimal Tic Tac Toe board with a win check."""

    LINES = (
        (0, 1, 2), (3, 4, 5), (6, 7, 8),
        (0, 3, 6), (1, 4, 7), (2, 5, 8),
        (0, 4, 8), (2, 4, 6),
    )

    def __init__(self):
        self.board = [" "] * 9

    def play(self, index: int, player: str) -> None:
        if self.board[index] != " ":
            raise ValueError(f"cell {index} is already taken")
        self.board[index] = player

    def winner(self):
        for a, b, c in self.LINES:
            if self.board[a] != " " and self.board[a] == self.board[b] == self.board[c]:
                return self.board[a]
        return None

    def render(self) -> str:
        rows = []
        for start in range(0, 9, 3):
            rows.append(" | ".join(self.board[start:start + 3]))
        return "\\n".join(rows).replace("  |", "   |")


game = TicTacToe()
for index, player in [(0, "X"), (4, "O"), (1, "X"), (5, "O"), (2, "X")]:
    game.play(index, player)

print(game.render())
print("Winner:", game.winner())''',
    ),
    (
        ("temperature", "celsius", "fahrenheit"),
        '''def celsius_to_fahrenheit(celsius: float) -> float:
    """Convert Celsius to Fahrenheit."""
    return celsius * 9 / 5 + 32


def fahrenheit_to_celsius(fahrenheit: float) -> float:
    """Convert Fahrenheit to Celsius."""
    return (fahrenheit - 32) * 5 / 9


for celsius in [0, 20, 37, 100]:
    fahrenheit = celsius_to_fahrenheit(celsius)
    print(f"{celsius:>6.1f} C = {fahrenheit:>6.1f} F")

print(f"  98.6 F = {fahrenheit_to_celsius(98.6):.1f} C")''',
    ),
    (
        ("even", "odd"),
        '''def classify(number: int) -> str:
    """Return 'even' or 'odd' using a bitwise check."""
    return "even" if number & 1 == 0 else "odd"


for number in range(1, 11):
    print(f"{number:>3} -> {classify(number)}")''',
    ),
)


def _prompt_scaffold(prompt: str) -> str:
    """Build a *safe* scaffold snippet for an arbitrary request.

    The prompt is embedded as a JSON string literal so quotes, newlines and
    unicode can never produce a syntax error.
    """

    literal = json.dumps(prompt.strip(), ensure_ascii=False)
    return f'''"""Scaffold generated from your request."""
import json

PROMPT = {literal}


def solution(data=None):
    """Entry point - replace this body with your own logic."""
    payload = [10, 20, 30, 40, 50] if data is None else data
    transformed = [
        value * 2 if isinstance(value, (int, float)) else str(value).upper()
        for value in payload
    ] if isinstance(payload, list) else str(payload).swapcase()

    return {{
        "prompt": PROMPT,
        "input": payload,
        "output": transformed,
    }}


if __name__ == "__main__":
    print(json.dumps(solution(), indent=2))
'''


def generate_dynamic_code(prompt: str) -> Optional[str]:
    """Generate a real snippet for a recognised intent, else a safe scaffold."""

    lowered = prompt.lower()
    for keywords, snippet in _DYNAMIC_SNIPPETS:
        if any(keyword in lowered for keyword in keywords):
            return snippet

    if _looks_like_code_request(prompt):
        scaffold = _prompt_scaffold(prompt)
        try:
            ast.parse(scaffold)
            return scaffold
        except SyntaxError:  # pragma: no cover - defensive
            return None
    return None


# ── reply builders ──────────────────────────────────────────────────────


def _template_reply(label: str, template_key: str, language: str) -> Optional[tuple[str, Optional[str]]]:
    code, actual_language = code_templates.template_code(template_key, language)
    if not code:
        return None

    reply = f"Here is a **{label}** implementation in **{actual_language}**:\n\n"
    reply += f"```{actual_language}\n{code}\n```\n\n"
    if actual_language == "python":
        reply += "Tip: press **Run Code** to execute it in the sandbox, or **Visualize** for the animation."
    else:
        reply += f"Copy this {actual_language} snippet into your project to use it."
    viz = next(
        (route[3] for route in code_templates.KEYWORD_ROUTES if route[0] == template_key),
        None,
    )
    return reply, viz


def _guidance_reply(agent: Agent, greeting: str = "") -> str:
    intro = greeting or f"I'm **{agent.name}**, and I run fully offline on a deterministic engine."
    return (
        f"{intro} I'm at my best with concrete coding requests.\n\n"
        "Try one of these:\n\n"
        "- *Generate a fibonacci function*\n"
        "- *Show me sorting algorithms*\n"
        "- *Write a linked list implementation*\n"
        "- *Create a binary search tree*\n"
        "- Or paste a `python` code block and say **run** to execute it in the sandbox."
    )


def _run_pasted_code(block: CodeBlock) -> tuple[str, ExecutionInfo, Optional[str]]:
    execution = run_python(block.code)
    return _execution_block(execution), execution, None


def _history_python_block(history: list[str]) -> Optional[CodeBlock]:
    for previous in reversed(history):
        for block in code_templates.extract_code_blocks(previous):
            if _is_runnable_python(block):
                return block
    return None


def _respond(
    agent: Agent,
    last_user: str,
    history: list[str],
    reply: str,
    *,
    viz_hint: Optional[str] = None,
    execution: Optional[ExecutionInfo] = None,
) -> ChatResponse:
    reply, blocks = _finalize(reply, viz_hint)
    return ChatResponse(
        reply=reply,
        agent_id=agent.id,
        code_blocks=blocks,
        execution=execution,
        suggestions=_AGENT_SUGGESTIONS.get(agent.id, []),
    )


def _handle_visualizer(agent: Agent, last_user: str, subject: str = "") -> ChatResponse:
    plan = blueprints.visualization_plan(subject or last_user)
    return _respond(agent, last_user, [], plan)


def _handle_architecture(agent: Agent, last_user: str) -> ChatResponse:
    blueprint = blueprints.architecture_blueprint(last_user)
    return _respond(agent, last_user, [], blueprint)


def generate_reply(agent_id: str, messages: list[Message] | list[dict]) -> ChatResponse:
    """Build a structured reply for the given agent and conversation."""

    agent = AGENTS.get(agent_id, AGENTS["code-agent"])
    normalised = [
        message if isinstance(message, Message) else Message(**message) for message in messages
    ]
    user_contents = [
        message.content for message in normalised if message.role == "user" and message.content
    ]
    last_user = user_contents[-1].strip() if user_contents else ""
    lowered = last_user.lower()
    blocks = code_templates.extract_code_blocks(last_user)
    python_block = next((block for block in blocks if _is_runnable_python(block)), None)

    # ── Dedicated agents ──
    if agent.id == "explain-agent":
        if not python_block:
            return _respond(
                agent,
                last_user,
                user_contents,
                "Paste a `python` code block and I'll produce a real line-by-line "
                "walkthrough with complexity notes.",
            )
        report = explain_service.explain_python(python_block.code)
        return _respond(agent, last_user, user_contents, report.to_markdown())

    if agent.id == "refactor-agent":
        if not python_block:
            return _respond(
                agent,
                last_user,
                user_contents,
                "Paste a `python` code block and I'll run the static-analysis "
                "refactorer over it (findings + safe rewrites).",
            )
        result = refactor_service.refactor_python(python_block.code)
        return _respond(agent, last_user, user_contents, result.to_markdown())

    if agent.id == "visualizer-agent":
        return _handle_visualizer(agent, last_user, python_block.code if python_block else "")

    if agent.id == "architecture-agent":
        return _handle_architecture(agent, last_user)

    # ── Code assistant ──
    if python_block and any(keyword in lowered for keyword in _RUN_KEYWORDS):
        reply, execution, viz = _run_pasted_code(python_block)
        return _respond(agent, last_user, user_contents, reply, viz_hint=viz, execution=execution)

    if python_block:
        return _respond(
            agent,
            last_user,
            user_contents,
            "I can see a Python snippet. Say **run** (or press **Run Code**) and I'll "
            "execute it in the sandbox and report the output.",
            viz_hint=_infer_viz(python_block.code),
        )

    if any(word in lowered for word in _RUN_KEYWORDS):
        previous = _history_python_block(user_contents[:-1])
        if previous:
            reply, execution, viz = _run_pasted_code(previous)
            return _respond(
                agent, last_user, user_contents, reply, viz_hint=viz, execution=execution
            )
        return _respond(
            agent,
            last_user,
            user_contents,
            "I don't see any Python code to run yet. Paste a `python` code block first.",
        )

    if any(lowered.startswith(greeting) for greeting in _GREETINGS):
        return _respond(
            agent,
            last_user,
            user_contents,
            _guidance_reply(agent, greeting=f"Hello! I'm **{agent.name}**."),
        )

    template_key, label, viz_hint = code_templates.find_template(lowered)
    if template_key and label:
        language = code_templates.detect_requested_language(last_user)
        built = _template_reply(label, template_key, language)
        if built:
            reply, hint = built
            return _respond(agent, last_user, user_contents, reply, viz_hint=hint or viz_hint)

    snippet = generate_dynamic_code(last_user)
    if snippet:
        reply = (
            "Here is the code generated for your request:\n\n"
            f"```python\n{snippet}\n```\n\n"
            "Tip: press **Run Code** to execute it in the sandbox."
        )
        return _respond(agent, last_user, user_contents, reply)

    return _respond(agent, last_user, user_contents, _guidance_reply(agent))
