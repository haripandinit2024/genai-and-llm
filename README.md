# Multicode Agent — AI Code Studio

A local, dependency-light **code studio**: multi-agent chat, a sandboxed Python
runner, an algorithm visualizer, a static-analysis refactoring studio with real
diffs, an empirical benchmark dashboard and a preset library — served by one
FastAPI backend and one React (Vite) frontend.

> The engine is **deterministic and fully offline**: no API keys, no network
> calls, no telemetry. Every snippet is validated with Python's `ast` module
> before it reaches the UI, and every result shown in the interface is produced
> by real code — nothing is hard-coded for display.

---

## 1. Features

| Studio view | What it does |
| --- | --- |
| **Chat Studio** | Five assistant agents, quick actions from the preset library, markdown + code rendering with copy/download, and a **Run Code** button that executes Python in the sandbox and streams the real output into the Live Output Console. |
| **Split Workbench** | Chat on the left, live visualizer on the right (the Visualize button from any code block feeds the right pane). |
| **Visualizer Studio** | Step-by-step animation models for sorting (bubble/selection/insertion), binary search, linked lists, stack **and** queue (independent structures), and a real binary search tree drawn from the insert sequence. Runs are cancellable. |
| **Benchmarks** | Live in-browser benchmark engine (warm-up + median of 5 runs at 100 → 10 000 items) plus a Big-O reference chart. |
| **Diff Viewer** | `POST /api/refactor` runs an AST pass (bare `except`, `range(len(...))`, mutable defaults, unused imports, missing docstrings, naive recursion, shadowed builtins, nested loops), applies safe rewrites, and renders split or unified line diffs with the findings list. |
| **Presets Library** | 12 backend-served blueprints, searchable and filterable, one click to load into the chat studio. |

**The five agents**

| id | Name | Focus |
| --- | --- | --- |
| `code-agent` | Code Assistant | Generates, explains and runs code; template + dynamic generator. |
| `refactor-agent` | Refactor Expert | Static-analysis refactorer with applied rewrites and findings. |
| `explain-agent` | Explain Code | Line-by-line `ast` walkthrough with complexity estimation. |
| `visualizer-agent` | Algorithm Animator | Animation script + runnable reference implementation. |
| `architecture-agent` | System Architect | Component diagram, REST contract, scaling notes and performance budget. |

---

## 2. Requirements

- Python **3.11+** (uses `ast.unparse`, `X | Y` type syntax)
- Node **18+**
- No database, no API keys, no external services

---

## 3. Quick start

```bash
# 1. backend
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8001

# 2. frontend (new terminal)
cd frontend
npm install
npm run dev          # http://localhost:5174  (proxies /api → :8001)
```

Or run both with one command (and a verification script):

```bash
./scripts/dev.sh     # backend + frontend together
./scripts/check.sh   # pytest + tsc + production build
```

**Single-service mode:** after `npm run build`, the backend serves the compiled
studio from `frontend/dist` at `http://127.0.0.1:8001/`, so you only need to run
uvicorn.

---

## 4. Project layout

```
multicode-agent/
├── backend/
│   ├── app/
│   │   ├── agents/base.py          # agent registry (id, name, prompt, capabilities)
│   │   ├── api/routes/             # health, catalog, chat, run, tools
│   │   ├── core/                   # config (env driven) + uptime state
│   │   ├── schemas/                # pydantic contracts (chat, tools, common)
│   │   ├── services/
│   │   │   ├── sandbox.py          # timeout-guarded Python execution
│   │   │   ├── code_templates.py   # curated templates + keyword routing
│   │   │   ├── generator.py        # chat orchestration per agent
│   │   │   ├── refactor.py         # AST findings + safe rewrites
│   │   │   ├── explain.py          # line-by-line explanations, complexity
│   │   │   ├── blueprints.py       # architecture + visualization markdown
│   │   │   └── presets.py          # preset library
│   │   └── main.py                 # app wiring, CORS, static dist mount
│   └── tests/test_api.py           # 56 tests: endpoints, sandbox, templates
├── frontend/
│   └── src/
│       ├── components/             # Sidebar, TopBar, ChatStudio, CodeBlock,
│       │                           # ConsoleDrawer, Composer, Visualizer, …
│       ├── pages/                  # one page per studio view
│       ├── hooks/                  # useChat, useAgents, usePresets, useBackendHealth
│       ├── services/api.ts         # typed API client with timeouts
│       ├── types/                  # shared types (mirrors the backend schemas)
│       └── utils/                  # markdown, diff, formatting, view metadata
├── docs/ARCHITECTURE.md            # request flow, extension points
├── scripts/                        # dev.sh, check.sh, smoke_ui.mjs
└── workspace/                      # scratch space for experiments
```

---

## 5. API reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Status, version, uptime, agent/preset counts, sandbox limits. |
| `GET` | `/api/agents` | Agent catalogue plus the capability list. |
| `GET` | `/api/presets` | Preset blueprints grouped by category. |
| `GET` | `/api/sandbox` | Allowed/blocked modules and sandbox limits. |
| `POST` | `/api/chat` | `{ agent_id, messages[] }` → `{ reply, code_blocks[], execution?, suggestions[] }`. |
| `POST` | `/api/run` | `{ code, language, timeout_seconds? }` → `{ ok, stdout, error, duration_ms, truncated, timed_out }`. |
| `POST` | `/api/refactor` | `{ code }` → `{ original, refactored, changed, notes[], stats }`. |
| `POST` | `/api/explain` | `{ code }` → `{ summary, complexity, statements[], counts }`. |

Interactive docs: <http://127.0.0.1:8001/docs>

Example:

```bash
curl -s -X POST http://127.0.0.1:8001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"code-agent","messages":[{"role":"user","content":"Generate a fibonacci function"}]}'
```

---

## 6. Configuration

Copy `.env.example` and override anything you need (see
`backend/app/core/config.py` for the source of truth):

| Variable | Default | Meaning |
| --- | --- | --- |
| `MULTICODE_HOST` / `MULTICODE_PORT` | `127.0.0.1` / `8001` | Bind address for uvicorn. |
| `MULTICODE_CORS_ORIGINS` | localhost dev origins | Comma separated allow-list. |
| `MULTICODE_SANDBOX_TIMEOUT` | `5` | Wall-clock seconds per execution. |
| `MULTICODE_SANDBOX_MAX_OUTPUT` | `20000` | Captured stdout characters. |
| `VITE_API_BASE_URL` | *(empty → dev proxy)* | Absolute backend URL for the frontend. |
| `MULTICODE_BACKEND_URL` | `http://127.0.0.1:8001` | Dev-proxy target used by `npm run dev`. |

---

## 7. Sandbox model

`POST /api/run` and the chat "run" flow execute Python in-process with four
layers of protection:

1. **Static checks** — snippets that import a blocked module or call a removed
   builtin are rejected with an explanatory error before anything runs.
2. **Restricted builtins** — `open`, `eval`, `exec`, `compile`, `input`,
   `__import__`, `getattr`/`setattr`, `globals`/`locals` and friends are removed.
3. **Import allow-list** — pure-Python standard library only
   (`math`, `random`, `json`, `collections`, `functools`, `dataclasses`,
   `datetime`, `re`, …). Filesystem, network, process and import-machinery
   modules are refused.
4. **Limits** — a trace-hook watchdog aborts runaway loops (default 5 s), stdout
   is capped and executions are serialized so output can never interleave.

> ⚠️ This is a **best-effort local sandbox**, not a security boundary. Keep the
> API bound to localhost and never expose it to untrusted users.

---

## 8. Testing & verification

```bash
cd backend && python -m pip install -r requirements-dev.txt
cd backend && python -m pytest -q          # 56 tests
cd frontend && npx tsc --noEmit            # strict typecheck
cd frontend && npm run build               # production bundle
./scripts/check.sh                         # all of the above
```

The backend suite covers every endpoint, every template (each Python template is
parsed *and executed* in the sandbox), sandbox escape attempts, timeout and
output-truncation behaviour, the refactor rewrites and the explainer heuristics.

**UI smoke test** (drives a headless Chrome through all five studio views):

```bash
# with backend (:8001) and `npm run dev` (:5174) running
chrome --headless=new --remote-debugging-port=9222 --user-data-dir=.chrome-profile about:blank
node scripts/smoke_ui.mjs
```

It asserts: shell renders, backend reachable, a snippet is generated, **Run Code**
streams real sandbox output, stack and queue are independent, the BST draws its
nodes, presets load, the refactor pass reports findings, and benchmarks produce
measurements.

---

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Backend offline" chip | The API is not running — start uvicorn on port 8001 (or set `MULTICODE_BACKEND_URL` for the dev proxy). |
| `[Errno 10048]` / port already in use | Another instance is still running: stop it, or start uvicorn with `--port 8002` and update `MULTICODE_BACKEND_URL`. |
| CORS error in the browser console | Add your origin to `MULTICODE_CORS_ORIGINS` (comma separated). |
| `ImportError: the sandbox blocks 'os'` | Expected: the sandbox has no filesystem/network access. |
| `TimeoutError: execution exceeded 5s` | Raise `MULTICODE_SANDBOX_TIMEOUT`, or pass `timeout_seconds` to `/api/run` (max 30 s). |

---

## 10. Design notes

- **Determinism over magic.** The chat engine picks a curated template, a
  recognised intent snippet, or a *safe scaffold* (the prompt is embedded as a
  JSON string literal, so quotes/newlines can never break the Python syntax).
  Unknown prompts return guidance instead of fabricated code.
- **Everything runs or it is labelled.** Code blocks carry `runnable` and `viz`
  metadata so the UI only offers **Run Code** for Python and **Visualize** when a
  view actually matches.
- **Honest metrics.** Benchmarks show measured medians/min/max with the sample
  methodology; complexity badges are labelled as theoretical bounds.
- **Optional next step.** The single seam for a hosted LLM is
  `app/services/generator.py` (`generate_reply`); everything else — sandbox,
  refactor pass, explainer, visualizer, benchmarks — works without one.
