# Architecture

Deep dive for contributors. The short version lives in the [README](../README.md).

## 1. Request flow

```
Browser (React + Vite)
   │  fetch /api/...                       (dev: Vite proxy → :8001)
   ▼
FastAPI app (app/main.py)
   │  routers: health · catalog · chat · run · tools
   ▼
Services (pure Python, no I/O)
   ├── generator.py      chat orchestration per agent
   ├── code_templates.py curated snippets, keyword routing, language detection
   ├── sandbox.py        timeout-guarded exec()
   ├── refactor.py       AST findings + validated textual rewrites
   ├── explain.py        statement walkthrough + complexity heuristics
   ├── blueprints.py     architecture / visualization markdown
   └── presets.py        preset library
```

Nothing in `services/` imports FastAPI, so every service is unit-testable in
isolation (`tests/test_api.py` exercises them directly as well as over HTTP).

## 2. Chat turn lifecycle

1. `POST /api/chat` → `ChatRequest { agent_id, messages[] }`.
2. `generate_reply()` resolves the agent and normalises the message history.
3. Agent-specific routing:
   - **explain-agent** → `explain.explain_python()` (requires a Python block)
   - **refactor-agent** → `refactor.refactor_python()`
   - **visualizer-agent** → `blueprints.visualization_plan()`
   - **architecture-agent** → `blueprints.architecture_blueprint()`
4. **code-agent** precedence: pasted Python + a run keyword → sandbox ⇢ pasted
   Python alone → "press Run Code" ⇢ run keyword with earlier code → run the
   history block ⇢ greeting ⇢ template match ⇢ dynamic intent snippet ⇢ guidance.
5. `_finalize()` re-parses the markdown reply, marks each block `runnable` for
   Python and attaches a `viz` hint (template hint first, then content heuristics).
6. The frontend renders `reply` as markdown and uses `execution` (when present)
   to append entries to the Live Output Console.

## 3. Sandbox execution

`run_python(code, timeout)`:

| Stage | What happens |
| --- | --- |
| Size guard | Reject snippets over `MULTICODE_SANDBOX_MAX_CODE`. |
| Parse | `ast.parse` → friendly `SyntaxError` with line number. |
| Static scan | Blocked imports and removed builtins are reported before execution. |
| Namespace | Filtered `builtins` + guarded `__import__`; one shared globals dict so functions/classes resolve module names. |
| Watchdog | `sys.settrace` hook raises `_ExecutionTimeout` once the deadline passes. |
| Capture | Custom `StringIO` truncates stdout at the configured cap. |
| Concurrency | A module lock serialises executions so `sys.stdout` swaps cannot interleave. |

## 4. Refactor pass

`refactor_python(code)` parses once and produces:

- **Findings** (advisory): bare `except`, `== None`, mutable defaults, unused
  imports, missing docstrings, shadowed builtin parameters, nested-loop depth,
  naive multi-branch recursion.
- **Rewrites** (applied only if the result still compiles): `except Exception:`,
  `is None` / `is not None`, `for i in range(len(x))` → `enumerate` with body
  re-indexing, and `@lru_cache(maxsize=None)` for non-method naive recursion
  (with the import inserted after the docstring/`__future__` block).

Rewrites are textual, so comments and formatting survive; each transform is
re-validated with `compile()` and reverted on failure.

## 5. Complexity heuristics

`explain._estimate_complexity()` combines loop nesting depth, self-recursion
counts and memoization decorators, divide-and-conquer markers (`// 2`), and
comparison-sort usage. The result is explicitly labelled a static estimate and
the notes explain which signal fired.

## 6. Frontend structure

| Layer | Responsibility |
| --- | --- |
| `services/api.ts` | All HTTP with timeouts, `AbortController` support and friendly offline errors. |
| `hooks/` | `useChat` (threads per agent, sandbox runs, console entries), `useAgents`, `usePresets`, `useBackendHealth` (20 s polling). |
| `components/` | Presentational units: Sidebar, TopBar, ChatStudio, CodeBlock, ConsoleDrawer, Composer, Visualizer, PerformanceDashboard, CodeDiffViewer, PresetGallery. |
| `pages/` | One page per studio view; pages own their view-specific wiring. |
| `utils/` | markdown renderer, LCS line diff, formatting helpers, view metadata. |

`App.tsx` only holds shell state (active view, split mode, selected agent, viz
request) and composes hooks with pages.

## 7. Extension points

**Add a code template**

1. Append the snippet to `_CODE_TEMPLATES` in `services/code_templates.py`.
2. Add a `KEYWORD_ROUTES` entry with trigger keywords and an optional `viz` hint.
3. Add the template key to the parametrized test — it will be parsed *and*
   executed in the sandbox automatically.

**Add an agent**

1. Register it in `agents/base.py` with capabilities.
2. Add a routing branch in `generator.generate_reply()`.
3. Add suggestions in `_AGENT_SUGGESTIONS` and an icon in the frontend
   `Sidebar.AGENT_ICONS`.

**Add a studio view**

1. Create `pages/MyPage.tsx` (+ `components/MyView.tsx`).
2. Add a `VIEWS` entry in `utils/views.tsx` (sidebar + top bar are data driven).
3. Render it in `App.tsx` for its `TabKey`.

**Add a preset** — append to `services/presets.py`; the gallery and the chat
welcome screen both read from `GET /api/presets`.

**Swap in a hosted LLM** — `generator.generate_reply()` is the only seam. Keep
the response shape (`reply`, `code_blocks`, `execution`) and the UI needs no
changes.
