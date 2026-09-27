"""Static-analysis refactoring for Python snippets.

Findings come from a real AST pass (bare excepts, mutable defaults, unused
imports, missing docstrings, quadratic loops, naive recursion, shadowed
builtins). Safe rewrites are applied textually so comments and formatting
survive, and every rewrite is re-validated with :func:`compile` before it is
accepted.
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from typing import Callable, Optional

from app.schemas.tools import RefactorNote, RefactorResponse, RefactorStats

_BUILTIN_NAMES = frozenset(
    {
        "list", "dict", "set", "tuple", "str", "int", "float", "bool", "type",
        "id", "sum", "min", "max", "len", "input", "print", "format", "next",
        "object", "filter", "map", "vars", "hash", "bytes", "range", "slice",
    }
)

_RANGE_LEN_RE = re.compile(
    r"^(?P<indent>[ \t]*)for[ \t]+(?P<var>[A-Za-z_]\w*)[ \t]+in[ \t]+"
    r"range\([ \t]*len\([ \t]*(?P<seq>[A-Za-z_]\w*)[ \t]*\)[ \t]*\)[ \t]*:(?P<comment>[ \t]*#.*)?$"
)
_NONE_COMPARE_RE = re.compile(r"(?P<left>[\w\.\[\]\(\)\"']+)[ \t]*(?P<op>==|!=)[ \t]*None\b")
_BARE_EXCEPT_RE = re.compile(r"^(?P<indent>[ \t]*)except[ \t]*:(?P<comment>[ \t]*#.*)?$")
_CACHE_DECORATORS = ("lru_cache", "cache")


@dataclass
class _Note:
    title: str
    detail: str
    severity: str = "improvement"
    line: Optional[int] = None
    rewrite: Optional[str] = None


@dataclass
class RefactorOutcome:
    """Refactoring result with markdown / API renderings."""

    original: str
    refactored: str
    notes: list[_Note] = field(default_factory=list)
    applied: set[str] = field(default_factory=set)

    @property
    def changed(self) -> bool:
        return self.refactored.strip() != self.original.strip()

    def to_response(self) -> RefactorResponse:
        return RefactorResponse(
            original=self.original,
            refactored=self.refactored,
            changed=self.changed,
            notes=[
                RefactorNote(
                    title=note.title,
                    detail=note.detail,
                    severity=note.severity,  # type: ignore[arg-type]
                    line=note.line,
                    applied=bool(note.rewrite and note.rewrite in self.applied),
                )
                for note in self.notes
            ],
            stats=RefactorStats(
                lines_before=len(self.original.splitlines()),
                lines_after=len(self.refactored.splitlines()),
                applied_rewrites=len(self.applied),
                findings=len(self.notes),
            ),
        )

    def to_markdown(self) -> str:
        applied = [note for note in self.notes if note.rewrite and note.rewrite in self.applied]
        advisory = [note for note in self.notes if not (note.rewrite and note.rewrite in self.applied)]

        lines = ["Here is my refactoring review based on a real AST pass.", ""]
        if applied:
            lines.append("**Rewrites applied**")
            for note in applied:
                location = f" (line {note.line})" if note.line else ""
                lines.append(f"- ✅ **{note.title}**{location} — {note.detail}")
            lines.append("")
        if advisory:
            lines.append("**Findings for you to decide**")
            for note in advisory:
                location = f" (line {note.line})" if note.line else ""
                icon = "⚠️" if note.severity == "warning" else "•"
                lines.append(f"- {icon} **{note.title}**{location} — {note.detail}")
            lines.append("")

        if self.changed:
            lines += [
                f"**Refactored code** ({len(applied)} rewrite(s) applied, "
                f"{len(self.original.splitlines())} → {len(self.refactored.splitlines())} lines)",
                f"```python\n{self.refactored}\n```",
                "",
                "Formatting and comments are preserved — only the rewrites above changed.",
            ]
        else:
            lines += [
                "**No safe rewrites were needed.**",
                "The snippet is already idiomatic for the patterns this pass understands; "
                "the findings above are stylistic or architectural.",
            ]
        return "\n".join(lines)


# ── analysis helpers ────────────────────────────────────────────────────


def _is_mutable_default(node: ast.AST) -> bool:
    if isinstance(node, (ast.List, ast.Dict, ast.Set)):
        return True
    if isinstance(node, ast.Call):
        func = node.func
        name = func.attr if isinstance(func, ast.Attribute) else getattr(func, "id", "")
        return name in {"list", "dict", "set", "deque", "OrderedDict", "defaultdict"}
    return False


def _imported_names(tree: ast.Module) -> dict[str, tuple[int, str]]:
    imports: dict[str, tuple[int, str]] = {}
    for node in tree.body:
        if isinstance(node, ast.Import):
            for alias in node.names:
                name = alias.asname or alias.name.split(".")[0]
                statement = f"import {alias.name}"
                if alias.asname:
                    statement += f" as {alias.asname}"
                imports[name] = (node.lineno, statement)
        elif isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name == "*":
                    continue
                name = alias.asname or alias.name
                statement = f"from {node.module} import {alias.name}"
                if alias.asname:
                    statement += f" as {alias.asname}"
                imports[name] = (node.lineno, statement)
    return imports


def _used_names(tree: ast.Module) -> set[str]:
    used: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            used.add(node.id)
        elif isinstance(node, ast.Attribute):
            base = node
            while isinstance(base, ast.Attribute):
                base = base.value
            if isinstance(base, ast.Name):
                used.add(base.id)
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            # names referenced from string literals (e.g. __all__)
            used.update(re.findall(r"[A-Za-z_]\w*", node.value))
    return used


def _max_loop_depth(node: ast.AST, depth: int = 0) -> int:
    best = depth
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.For, ast.AsyncFor, ast.While)):
            best = max(best, _max_loop_depth(child, depth + 1))
        elif not isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            best = max(best, _max_loop_depth(child, depth))
    return best


def _functions(node: ast.AST, parent: Optional[ast.AST] = None):
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
            yield child, parent
        yield from _functions(child, child)


def _naive_recursion(func: ast.AST) -> bool:
    decorators = getattr(func, "decorator_list", [])
    for decorator in decorators:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        name = target.attr if isinstance(target, ast.Attribute) else getattr(target, "id", "")
        if name in _CACHE_DECORATORS:
            return False

    calls = 0
    for node in ast.walk(func):
        if isinstance(node, ast.Call):
            func_node = node.func
            name = func_node.attr if isinstance(func_node, ast.Attribute) else getattr(func_node, "id", "")
            if name == getattr(func, "name", ""):
                calls += 1
    return calls >= 2


def _analyse(tree: ast.Module, code: str, applied: set[str]) -> list[_Note]:
    notes: list[_Note] = []

    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler) and node.type is None:
            notes.append(
                _Note(
                    title="Bare `except:` swallows every error",
                    detail="Catches SystemExit and KeyboardInterrupt too. Use `except Exception:`.",
                    severity="warning",
                    line=node.lineno,
                    rewrite="bare_except",
                )
            )
        elif isinstance(node, ast.Compare):
            if any(isinstance(op, (ast.Eq, ast.NotEq)) for op in node.ops) and any(
                isinstance(comparator, ast.Constant) and comparator.value is None
                for comparator in node.comparators
            ):
                notes.append(
                    _Note(
                        title="Identity comparison with None",
                        detail="Use `is None` / `is not None` instead of `== None`.",
                        line=node.lineno,
                        rewrite="none_compare",
                    )
                )

    for func, parent in _functions(tree):
        if func.args.defaults or func.args.kw_defaults:
            for default in list(func.args.defaults) + [d for d in func.args.kw_defaults if d]:
                if _is_mutable_default(default):
                    notes.append(
                        _Note(
                            title="Mutable default argument",
                            detail=(
                                f"`{func.name}()` uses a mutable default; it is shared between "
                                "calls. Use `None` and create the value inside the body."
                            ),
                            severity="warning",
                            line=func.lineno,
                        )
                    )
                    break
        if not ast.get_docstring(func):
            notes.append(
                _Note(
                    title="Missing docstring",
                    detail=f"`{func.name}()` has no docstring; document intent and complexity.",
                    severity="info",
                    line=func.lineno,
                )
            )
        if _naive_recursion(func) and not isinstance(parent, ast.ClassDef):
            notes.append(
                _Note(
                    title="Naive exponential recursion",
                    detail=(
                        f"`{func.name}()` calls itself more than once per level — O(2^n) without "
                        "memoization."
                    ),
                    severity="warning",
                    line=func.lineno,
                    rewrite="lru_cache",
                )
            )
        for arg in list(func.args.args) + list(func.args.posonlyargs) + list(func.args.kwonlyargs):
            if arg.arg in _BUILTIN_NAMES:
                notes.append(
                    _Note(
                        title="Parameter shadows a builtin",
                        detail=f"Rename `{arg.arg}` so `{arg.arg}()` stays available inside the function.",
                        severity="info",
                        line=func.lineno,
                    )
                )
                break

    imports = _imported_names(tree)
    used = _used_names(tree)
    for name, (line, statement) in imports.items():
        if name not in used:
            notes.append(
                _Note(
                    title="Unused import",
                    detail=f"`{statement}` is never used — drop it to keep the module clean.",
                    severity="info",
                    line=line,
                )
            )

    depth = _max_loop_depth(tree)
    if depth >= 2:
        notes.append(
            _Note(
                title=f"Nested loops ({depth} levels)",
                detail=f"Loop nesting of depth {depth} means O(n^{depth}); check for an O(n) or O(n log n) formulation.",
                severity="info",
                line=None,
            )
        )

    for match in _RANGE_LEN_RE.finditer(code):
        notes.append(
            _Note(
                title="`range(len(...))` indexing",
                detail="Prefer `enumerate(...)` to iterate values directly and avoid index bookkeeping.",
                line=code[: match.start()].count("\n") + 1,
                rewrite="enumerate",
            )
        )

    return notes


# ── rewrites ────────────────────────────────────────────────────────────


def _validate(code: str) -> bool:
    try:
        compile(code, "<refactor>", "exec")
    except SyntaxError:
        return False
    return True


def _rewrite(code: str, transform: Callable[[str], str], key: str, applied: set[str]) -> str:
    """Apply a rewrite only when the result still compiles."""

    candidate = transform(code)
    if candidate != code and _validate(candidate):
        applied.add(key)
        return candidate
    return code


def _apply_bare_except(code: str) -> str:
    lines = code.splitlines()
    for index, line in enumerate(lines):
        match = _BARE_EXCEPT_RE.match(line)
        if match:
            comment = match.group("comment") or ""
            lines[index] = f"{match.group('indent')}except Exception:{comment}"
    return "\n".join(lines) + ("\n" if code.endswith("\n") else "")


def _apply_none_compare(code: str) -> str:
    def replace(match: re.Match[str]) -> str:
        operator = "is not" if match.group("op") == "!=" else "is"
        return f"{match.group('left')} {operator} None"

    return _NONE_COMPARE_RE.sub(replace, code)


def _apply_enumerate(code: str) -> str:
    lines = code.splitlines()
    index = 0
    while index < len(lines):
        match = _RANGE_LEN_RE.match(lines[index])
        if not match:
            index += 1
            continue

        indent = match.group("indent")
        var = match.group("var")
        seq = match.group("seq")
        comment = match.group("comment") or ""

        body_start = index + 1
        body_end = body_start
        while body_end < len(lines):
            line = lines[body_end]
            if line.strip() and not line.startswith(indent + " ") and not line.startswith(indent + "\t"):
                if len(line) - len(line.lstrip()) <= len(indent):
                    break
            body_end += 1

        body = lines[body_start:body_end]
        body_text = "\n".join(body)
        indexed = re.compile(rf"\b{re.escape(seq)}\[{re.escape(var)}\]")
        renamed = re.compile(rf"\bitem\b")
        if not indexed.search(body_text) or renamed.search(body_text):
            index += 1
            continue

        lines[index] = f"{indent}for {var}, item in enumerate({seq}):{comment}"
        lines[body_start:body_end] = [indexed.sub("item", line) for line in body]
        index = body_end

    return "\n".join(lines) + ("\n" if code.endswith("\n") else "")


def _apply_lru_cache(code: str) -> str:
    try:
        tree = ast.parse(code)
    except SyntaxError:  # pragma: no cover - guarded by the caller
        return code

    targets: list[tuple[int, str]] = []
    for func, parent in _functions(tree):
        if isinstance(parent, ast.ClassDef):
            continue
        if _naive_recursion(func):
            indent = " " * func.col_offset
            targets.append((func.lineno, f"{indent}@lru_cache(maxsize=None)"))

    if not targets:
        return code

    lines = code.splitlines()
    for lineno, decorator_line in sorted(targets, reverse=True):
        lines.insert(lineno - 1, decorator_line)

    imports = _imported_names(tree)
    if "lru_cache" not in imports:
        index = _import_insert_index(tree)
        lines.insert(index, "from functools import lru_cache")
        follow_up = index + 1
        if follow_up >= len(lines) or lines[follow_up].strip():
            lines.insert(follow_up, "")

    return "\n".join(lines) + ("\n" if code.endswith("\n") else "")


def _import_insert_index(tree: ast.Module) -> int:
    """Insert new imports after the module docstring and ``__future__`` imports."""

    index = 0
    body = tree.body
    position = 0
    if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
        if isinstance(body[0].value.value, str):
            index = body[0].end_lineno or 1
    while position < len(body):
        node = body[position]
        if isinstance(node, ast.ImportFrom) and node.module == "__future__":
            index = node.end_lineno or index
        position += 1
    return index


_PIPELINE: tuple[tuple[str, Callable[[str], str]], ...] = (
    ("bare_except", _apply_bare_except),
    ("none_compare", _apply_none_compare),
    ("enumerate", _apply_enumerate),
    ("lru_cache", _apply_lru_cache),
)


def refactor_python(code: str) -> RefactorOutcome:
    """Analyse and rewrite a Python snippet."""

    original = code.rstrip("\n")
    try:
        tree = ast.parse(original)
    except SyntaxError as exc:
        return RefactorOutcome(
            original=original,
            refactored=original,
            notes=[
                _Note(
                    title="Syntax error — analysis skipped",
                    detail=f"{exc.msg} (line {exc.lineno}). Fix the syntax and run the pass again.",
                    severity="warning",
                    line=exc.lineno,
                )
            ],
        )

    outcome = RefactorOutcome(original=original, refactored=original)
    outcome.notes = _analyse(tree, original, outcome.applied)

    text = original
    for key, transform in _PIPELINE:
        text = _rewrite(text, transform, key, outcome.applied)
    outcome.refactored = text
    return outcome


def refactor_response(code: str) -> RefactorResponse:
    """Convenience wrapper returning the API schema directly."""

    return refactor_python(code).to_response()
