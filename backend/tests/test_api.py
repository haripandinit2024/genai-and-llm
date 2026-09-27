import ast

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import code_templates
from app.services.generator import _DYNAMIC_SNIPPETS, generate_dynamic_code, _prompt_scaffold
from app.services.presets import PRESETS
from app.services.sandbox import run_python

client = TestClient(app)


# ── Health & catalog ────────────────────────────────────────────────────


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "multicode-agent"
    assert data["agents"] >= 5
    assert data["sandbox"]["timeout_seconds"] > 0


def test_list_agents():
    response = client.get("/api/agents")
    assert response.status_code == 200
    data = response.json()
    assert "agents" in data
    assert len(data["agents"]) >= 3
    assert "code_generation" in data["capabilities"]
    ids = [agent["id"] for agent in data["agents"]]
    assert {"code-agent", "refactor-agent", "explain-agent"} <= set(ids)


def test_list_presets():
    response = client.get("/api/presets")
    assert response.status_code == 200
    data = response.json()
    assert len(data["presets"]) == len(PRESETS)
    assert "Algorithms" in data["categories"]
    assert all(preset["prompt"] for preset in data["presets"])


def test_sandbox_capabilities():
    data = client.get("/api/sandbox").json()
    assert "python" in data["languages"]
    assert "os" in data["blocked_modules"]
    assert "math" in data["allowed_modules"]


# ── Chat ────────────────────────────────────────────────────────────────


def _chat(agent_id: str, content: str):
    response = client.post(
        "/api/chat", json={"agent_id": agent_id, "messages": [{"role": "user", "content": content}]}
    )
    assert response.status_code == 200
    return response.json()


def test_chat_fizzbuzz():
    payload = {"agent_id": "code-agent", "messages": [{"role": "user", "content": "fizzbuzz"}]}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "FizzBuzz" in body["reply"]
    assert body["code_blocks"] and body["code_blocks"][0]["runnable"] is True


def test_chat_run_python():
    code_msg = "```python\nprint('Hello from test!')\n```\nPlease run this code"
    body = _chat("code-agent", code_msg)
    assert "Hello from test!" in body["reply"]
    assert "Output" in body["reply"]
    assert body["execution"]["ok"] is True
    assert body["execution"]["duration_ms"] >= 0


def test_chat_fibonacci_has_viz_hint():
    body = _chat("code-agent", "Generate a fibonacci function")
    assert "fibonacci" in body["reply"].lower()
    assert body["code_blocks"][0]["viz"] == "sorting"


def test_chat_refactor():
    code_msg = "```python\ndef add(a, b):\n    return a + b\n```"
    body = _chat("refactor-agent", code_msg)
    assert "review" in body["reply"]
    assert "Missing docstring" in body["reply"]


def test_chat_explain():
    code_msg = "```python\nx = 10\nprint(x)\n```"
    body = _chat("explain-agent", code_msg)
    assert "walkthrough" in body["reply"]
    assert "Complexity" in body["reply"]


def test_chat_architecture_blueprint():
    body = _chat("architecture-agent", "Design a scalable API gateway microservices architecture")
    assert "API Gateway" in body["reply"]
    assert "Performance budget" in body["reply"]


def test_chat_visualizer_plan():
    body = _chat("visualizer-agent", "visualize binary search")
    assert "binary search" in body["reply"].lower()
    assert body["code_blocks"][0]["viz"] == "binary_search"


def test_chat_unknown_prompt_returns_guidance():
    body = _chat("code-agent", "what is the meaning of life")
    assert "Try one of these" in body["reply"]


def test_chat_every_preset_prompt_produces_valid_python():
    for preset in PRESETS:
        body = _chat("code-agent" if preset.category != "System Design" else "architecture-agent", preset.prompt)
        assert body["reply"].strip(), f"empty reply for {preset.id}"
        for block in body["code_blocks"]:
            if block["language"] in ("python", "py"):
                ast.parse(block["code"])  # must be valid Python


def test_chat_runs_previous_snippet():
    messages = [
        {"role": "user", "content": "```python\nprint('second turn')\n```"},
        {"role": "assistant", "content": "Say run and I will execute it."},
        {"role": "user", "content": "run"},
    ]
    response = client.post("/api/chat", json={"agent_id": "code-agent", "messages": messages})
    assert "second turn" in response.json()["reply"]


# ── Sandbox ─────────────────────────────────────────────────────────────


def test_run_endpoint_success():
    response = client.post("/api/run", json={"code": "print(sum(range(10)))"})
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["stdout"] == "45"


def test_run_endpoint_reports_errors():
    body = client.post("/api/run", json={"code": "1 / 0"}).json()
    assert body["ok"] is False
    assert "ZeroDivisionError" in body["error"]


def test_run_endpoint_blocks_filesystem():
    body = client.post("/api/run", json={"code": "import os\nprint(os.listdir('.'))"}).json()
    assert body["ok"] is False
    assert "blocks 'os'" in body["error"]


def test_run_endpoint_blocks_open_builtin():
    body = client.post("/api/run", json={"code": "open('secret.txt')"}).json()
    assert body["ok"] is False
    assert "SecurityError" in body["error"]


def test_run_endpoint_syntax_error():
    body = client.post("/api/run", json={"code": "def broken(:\n    pass"}).json()
    assert body["ok"] is False
    assert "SyntaxError" in body["error"]


def test_run_endpoint_times_out():
    body = client.post(
        "/api/run", json={"code": "while True:\n    pass", "timeout_seconds": 0.5}
    ).json()
    assert body["ok"] is False
    assert body["timed_out"] is True


def test_run_endpoint_rejects_non_python():
    response = client.post("/api/run", json={"code": "console.log(1)", "language": "javascript"})
    assert response.status_code == 422


def test_sandbox_truncates_large_output():
    body = client.post("/api/run", json={"code": "print('x' * 50000)"}).json()
    assert body["ok"] is True
    assert body["truncated"] is True


# ── Templates & dynamic generation ──────────────────────────────────────


@pytest.mark.parametrize("template_key", sorted(code_templates._CODE_TEMPLATES))
def test_every_python_template_runs_in_sandbox(template_key):
    code, language = code_templates.template_code(template_key, "python")
    assert code, f"{template_key} has no python template"
    assert language == "python"
    ast.parse(code)
    result = run_python(code, timeout=10)
    assert result.ok, f"{template_key} failed: {result.error}"


def test_every_template_has_valid_javascript_when_present():
    for template_key, variants in code_templates._CODE_TEMPLATES.items():
        for language, code in variants.items():
            assert code.strip(), f"{template_key}/{language} is empty"
            if language == "python":
                ast.parse(code)


@pytest.mark.parametrize("index", range(len(_DYNAMIC_SNIPPETS)))
def test_dynamic_snippets_run(index):
    code = _DYNAMIC_SNIPPETS[index][1]
    ast.parse(code)
    result = run_python(code, timeout=10)
    assert result.ok, f"dynamic snippet {index} failed: {result.error}"


def test_prompt_scaffold_is_injection_safe():
    nasty = 'def evil():\n    """break" me"""\nprint("\\n unicode ✓")'
    code = _prompt_scaffold(nasty)
    ast.parse(code)
    result = run_python(code, timeout=10)
    assert result.ok, result.error
    assert "evil" in result.stdout


def test_dynamic_generation_handles_unknown_prompt():
    assert generate_dynamic_code("write a function to reverse a string")
    assert generate_dynamic_code("what is the meaning of life") is None


def test_language_detection_ignores_json():
    assert code_templates.detect_requested_language("parse this json payload") == "python"
    assert code_templates.detect_requested_language("write it in javascript") == "javascript"


# ── Refactor tool ───────────────────────────────────────────────────────


def test_refactor_rewrites_bare_except_and_none_compare():
    code = (
        "def read(value):\n"
        "    try:\n"
        "        return value\n"
        "    except:\n"
        "        return None\n"
        "\n"
        "if read(1) == None:\n"
        "    print('empty')\n"
    )
    body = client.post("/api/refactor", json={"code": code}).json()
    assert "except Exception:" in body["refactored"]
    assert "is None" in body["refactored"]
    assert body["changed"] is True
    assert body["stats"]["applied_rewrites"] >= 2


def test_refactor_adds_memoization():
    code = "def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n"
    body = client.post("/api/refactor", json={"code": code}).json()
    assert "from functools import lru_cache" in body["refactored"]
    assert "@lru_cache(maxsize=None)" in body["refactored"]
    assert any(note["title"] == "Naive exponential recursion" for note in body["notes"])


def test_refactor_suggests_enumerate():
    code = "def total(values):\n    result = 0\n    for i in range(len(values)):\n        result += values[i]\n    return result\n"
    body = client.post("/api/refactor", json={"code": code}).json()
    assert "for i, item in enumerate(values):" in body["refactored"]
    assert "item" in body["refactored"]
    assert "values[i]" not in body["refactored"]


def test_refactor_handles_syntax_error():
    body = client.post("/api/refactor", json={"code": "def broken(:\n    pass"}).json()
    assert body["changed"] is False
    assert "Syntax error" in body["notes"][0]["title"]


# ── Explain tool ────────────────────────────────────────────────────────


def test_explain_reports_statements_and_complexity():
    code = (
        "def fib(n):\n"
        "    if n < 2:\n"
        "        return n\n"
        "    return fib(n - 1) + fib(n - 2)\n"
        "\n"
        "print(fib(10))\n"
    )
    body = client.post("/api/explain", json={"code": code}).json()
    assert body["complexity"]["time"] == "O(2^n)"
    assert any("fib" in statement["explanation"] for statement in body["statements"])
    assert body["counts"]["functions"] == 1


def test_explain_handles_syntax_error():
    body = client.post("/api/explain", json={"code": "def broken(:\n    pass"}).json()
    assert "Unparseable" in body["summary"]
