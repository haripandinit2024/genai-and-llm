"""Restricted, timeout-guarded Python execution used by the "Run Code" feature.

This is a *best-effort* guard for a local developer studio: it removes the most
dangerous builtins, allows only a curated set of pure-Python standard library
modules and aborts long running scripts. It is **not** a hardened security
boundary — keep the API on localhost (the default) and never expose it to
untrusted users.
"""

from __future__ import annotations

import ast
import builtins
import io
import sys
import threading
import time
from typing import Any

from app.core import config
from app.schemas.chat import ExecutionInfo

DEFAULT_TIMEOUT = config.SANDBOX_TIMEOUT_SECONDS
MAX_OUTPUT_CHARS = config.SANDBOX_MAX_OUTPUT_CHARS

#: Pure-Python standard library modules the sandbox is allowed to import.
ALLOWED_MODULES: frozenset[str] = frozenset(
    {
        "abc", "array", "base64", "bisect", "collections", "copy", "csv",
        "dataclasses", "datetime", "decimal", "enum", "fractions", "functools",
        "hashlib", "heapq", "html", "io", "itertools", "json", "math",
        "numbers", "operator", "pprint", "queue", "random", "re", "secrets",
        "statistics", "string", "textwrap", "time", "types", "typing",
        "unicodedata", "uuid",
    }
)

#: Modules that reach outside the sandbox (filesystem, network, processes).
BLOCKED_MODULES: frozenset[str] = frozenset(
    {
        "asyncio", "ctypes", "ftplib", "http", "importlib", "marshal",
        "multiprocessing", "os", "pathlib", "pickle", "pty", "requests",
        "shelve", "shutil", "signal", "socket", "sqlite3", "subprocess",
        "sys", "telnetlib", "threading", "tty", "urllib", "webbrowser",
    }
)

_BLOCKED_BUILTINS: frozenset[str] = frozenset(
    {
        "breakpoint", "compile", "delattr", "eval", "exec", "exit", "getattr",
        "globals", "help", "input", "locals", "memoryview", "open", "quit",
        "setattr", "vars",
    }
)

#: Executions are serialized so captured stdout can never interleave.
_EXEC_LOCK = threading.Lock()


class _ExecutionTimeout(Exception):
    """Raised from the trace hook when a script exceeds its deadline."""


class _OutputBuffer(io.StringIO):
    """StringIO that stops storing output once the cap is reached."""

    def __init__(self, limit: int) -> None:
        super().__init__()
        self._limit = limit
        self.truncated = False

    def write(self, text: str) -> int:  # type: ignore[override]
        if self.tell() >= self._limit:
            self.truncated = True
            return len(text)
        room = self._limit - self.tell()
        if len(text) > room:
            self.truncated = True
            text = text[:room]
        return super().write(text)


def _make_tracer(deadline: float):
    """Return a trace hook that aborts the script once ``deadline`` passes."""

    def tracer(frame, event, arg):
        if event == "line" and time.monotonic() > deadline:
            raise _ExecutionTimeout
        return tracer

    return tracer


def _guarded_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    root = (name or "").split(".")[0]
    if level and level > 0:
        raise ImportError("relative imports are not available in the sandbox")
    if root in BLOCKED_MODULES:
        raise ImportError(f"sandbox blocks the '{root}' module")
    if root not in ALLOWED_MODULES:
        raise ImportError(f"'{root}' is not in the sandbox allow-list")
    return builtins.__import__(name, globals, locals, fromlist, level)


#: Dunder builtins the sandbox keeps (class creation relies on __build_class__).
_ALLOWED_DUNDER_BUILTINS = ("__build_class__",)


def _sandbox_globals(output: _OutputBuffer) -> dict[str, Any]:
    safe = {
        name: getattr(builtins, name)
        for name in dir(builtins)
        if (not name.startswith("__") or name in _ALLOWED_DUNDER_BUILTINS)
        and name not in _BLOCKED_BUILTINS
    }
    safe["__import__"] = _guarded_import
    return {"__name__": "__main__", "__builtins__": safe, "__doc__": None}


def _imports(tree: ast.AST) -> list[str]:
    modules: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.extend(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            modules.append((node.module or "").split(".")[0])
    return modules


def _bound_names(tree: ast.AST) -> set[str]:
    """Names the module defines itself (functions, classes, assignments)."""

    bound: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            bound.add(node.name)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            bound.add(node.id)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for alias in node.names:
                bound.add(alias.asname or alias.name.split(".")[0])
    return bound


def _blocked_builtin_usage(tree: ast.AST) -> str | None:
    """Report the first use of a builtin the sandbox removed."""

    bound = _bound_names(tree)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            name = node.func.id
            if name in _BLOCKED_BUILTINS and name not in bound:
                return name
    return None


def _failure(message: str, started: float, *, stdout: str = "") -> ExecutionInfo:
    return ExecutionInfo(
        ok=False,
        stdout=stdout,
        error=message,
        duration_ms=round((time.perf_counter() - started) * 1000, 3),
        language="python",
    )


def run_python(code: str, timeout: float | None = None) -> ExecutionInfo:
    """Execute Python ``code`` and capture stdout, errors and duration."""

    started = time.perf_counter()
    limit = min(timeout or DEFAULT_TIMEOUT, 30.0)

    if len(code) > config.SANDBOX_MAX_CODE_CHARS:
        return _failure(
            f"Snippet rejected: larger than {config.SANDBOX_MAX_CODE_CHARS} characters.",
            started,
        )

    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return _failure(f"SyntaxError: {exc.msg} (line {exc.lineno})", started)

    for module in _imports(tree):
        if module in BLOCKED_MODULES:
            return _failure(
                f"ImportError: the sandbox blocks '{module}' "
                "(filesystem, network and process access are disabled).",
                started,
            )
        if module and module not in ALLOWED_MODULES:
            return _failure(
                f"ImportError: '{module}' is not in the sandbox allow-list. "
                f"Available: {', '.join(sorted(ALLOWED_MODULES))}.",
                started,
            )

    blocked_builtin = _blocked_builtin_usage(tree)
    if blocked_builtin:
        return _failure(
            f"SecurityError: {blocked_builtin}() is disabled inside the sandbox.",
            started,
        )

    output = _OutputBuffer(MAX_OUTPUT_CHARS)
    deadline = time.monotonic() + limit
    outcome: dict[str, Any] = {"error": None, "timed_out": False}

    def _target() -> None:
        previous_stdout = sys.stdout
        sys.stdout = output
        sys.settrace(_make_tracer(deadline))
        try:
            # A single namespace is required so module-level names resolve inside
            # the functions and classes defined by the snippet.
            exec(compile(tree, "<sandbox>", "exec"), _sandbox_globals(output))
        except _ExecutionTimeout:
            outcome["error"] = f"TimeoutError: execution exceeded {limit:g}s"
            outcome["timed_out"] = True
        except RecursionError:
            outcome["error"] = "RecursionError: maximum recursion depth exceeded"
        except SystemExit as exc:
            outcome["error"] = f"SystemExit: {exc.code}"
        except BaseException as exc:  # noqa: BLE001 - report anything the snippet raises
            outcome["error"] = f"{type(exc).__name__}: {exc}"
        finally:
            sys.settrace(None)
            sys.stdout = previous_stdout

    with _EXEC_LOCK:
        worker = threading.Thread(target=_target, name="sandbox-exec", daemon=True)
        worker.start()
        worker.join(limit + 1.0)
        if worker.is_alive():
            return ExecutionInfo(
                ok=False,
                stdout=output.getvalue().strip(),
                error=f"TimeoutError: execution exceeded {limit:g}s",
                duration_ms=round((time.perf_counter() - started) * 1000, 3),
                language="python",
                truncated=output.truncated,
                timed_out=True,
            )

    stdout = output.getvalue().rstrip("\n")
    duration_ms = round((time.perf_counter() - started) * 1000, 3)
    error = outcome["error"]

    return ExecutionInfo(
        ok=error is None,
        stdout=stdout,
        error=error,
        duration_ms=duration_ms,
        language="python",
        truncated=output.truncated,
        timed_out=bool(outcome["timed_out"]),
    )


def sandbox_summary() -> dict[str, Any]:
    return {
        "timeout_seconds": DEFAULT_TIMEOUT,
        "max_output_chars": MAX_OUTPUT_CHARS,
        "allowed_modules": len(ALLOWED_MODULES),
    }
