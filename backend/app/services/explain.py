"""AST-based line-by-line explanation and complexity estimation."""

from __future__ import annotations

import ast
from dataclasses import dataclass, field

from app.schemas.tools import ComplexityReport, ExplainResponse, ExplainStatement

_MAX_STATEMENTS = 40


@dataclass
class _Statement:
    line: int
    code: str
    explanation: str


@dataclass
class ExplainOutcome:
    language: str = "python"
    summary: str = ""
    complexity: ComplexityReport = field(
        default_factory=lambda: ComplexityReport(time="O(1)", space="O(1)", notes=[])
    )
    statements: list[_Statement] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=dict)
    syntax_error: str = ""

    def to_response(self) -> ExplainResponse:
        return ExplainResponse(
            language=self.language,
            summary=self.summary,
            complexity=self.complexity,
            statements=[
                ExplainStatement(line=item.line, code=item.code, explanation=item.explanation)
                for item in self.statements
            ],
            counts=self.counts,
        )

    def to_markdown(self) -> str:
        if self.syntax_error:
            return (
                "I could not analyse that snippet because it does not parse.\n\n"
                f"**SyntaxError** — {self.syntax_error}"
            )

        lines = [
            "Here is a line-by-line walkthrough produced with Python's `ast` module.",
            "",
            f"**Summary** — {self.summary}",
            "",
            f"**Complexity** — time `{self.complexity.time}`, space `{self.complexity.space}`",
        ]
        lines.extend(f"- {note}" for note in self.complexity.notes)

        lines += ["", "**Statement walkthrough**"]
        for statement in self.statements[:_MAX_STATEMENTS]:
            snippet = statement.code.strip()
            if len(snippet) > 90:
                snippet = snippet[:87] + "..."
            lines.append(f"- `{statement.line}` `{snippet}` — {statement.explanation}")

        remaining = len(self.statements) - _MAX_STATEMENTS
        if remaining > 0:
            lines.append(f"- … and {remaining} more statements.")

        counts = ", ".join(f"{value} {key}" for key, value in self.counts.items() if value)
        if counts:
            lines += ["", f"**Inventory** — {counts}"]
        return "\n".join(lines)


def _targets(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{_targets(node.value)}.{node.attr}"
    if isinstance(node, ast.Subscript):
        return f"{_targets(node.value)}[...]"
    if isinstance(node, (ast.Tuple, ast.List)):
        return ", ".join(_targets(item) for item in node.elts)
    return ast.dump(node)[:24]


def _call_name(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{_call_name(node.value)}.{node.attr}"
    return "function"


def _summarise(node: ast.AST, source: list[str]) -> str:
    """One-sentence explanation for a single statement."""

    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        params = [arg.arg for arg in node.args.args + node.args.kwonlyargs]
        returns = f" returning `{ast.unparse(node.returns)}`" if node.returns else ""
        decorators = f" decorated with `{', '.join(ast.unparse(d) for d in node.decorator_list)}`" if node.decorator_list else ""
        doc = " Includes a docstring." if ast.get_docstring(node) else ""
        return (
            f"Defines the function `{node.name}()` with {len(params)} parameter(s) "
            f"({', '.join(params) or 'none'}){returns}{decorators}.{doc}"
        )
    if isinstance(node, ast.ClassDef):
        return f"Declares the class `{node.name}` with {len(node.bases)} base class(es)."
    if isinstance(node, ast.Assign):
        names = ", ".join(_targets(target) for target in node.targets)
        return f"Assigns `{ast.unparse(node.value)}` to `{names}`."
    if isinstance(node, ast.AnnAssign):
        return f"Annotates `{_targets(node.target)}` as `{ast.unparse(node.annotation)}`."
    if isinstance(node, ast.AugAssign):
        return f"Updates `{_targets(node.target)}` in place with `{ast.unparse(node.value)}`."
    if isinstance(node, (ast.For, ast.AsyncFor)):
        return f"Iterates `{ast.unparse(node.target)}` over `{ast.unparse(node.iter)}`."
    if isinstance(node, ast.While):
        return f"Loops while `{ast.unparse(node.test)}` stays true."
    if isinstance(node, ast.If):
        branch = "the `else` branch runs otherwise" if node.orelse else "no `else` branch"
        return f"Branches when `{ast.unparse(node.test)}`; {branch}."
    if isinstance(node, ast.Return):
        return f"Returns `{ast.unparse(node.value)}`." if node.value else "Returns `None` early."
    if isinstance(node, ast.Raise):
        return f"Raises `{ast.unparse(node.exc)}`." if node.exc else "Re-raises the current exception."
    if isinstance(node, ast.Try):
        handlers = ", ".join(
            ast.unparse(handler.type) if handler.type else "Exception" for handler in node.handlers
        )
        return f"Guards risky work and handles: {handlers or 'nothing'}."
    if isinstance(node, ast.With):
        return f"Opens a context manager `{ast.unparse(node.items[0].context_expr)}`."
    if isinstance(node, ast.Import):
        return f"Imports {', '.join(alias.name for alias in node.names)}."
    if isinstance(node, ast.ImportFrom):
        return f"Imports {', '.join(alias.name for alias in node.names)} from `{node.module}`."
    if isinstance(node, ast.Expr):
        return _summarise(node.value, source)
    if isinstance(node, ast.Call):
        name = _call_name(node.func)
        if name == "print":
            return "Writes the result to standard output."
        return f"Calls `{name}()` with {len(node.args)} argument(s)."
    if isinstance(node, ast.Raise):
        return "Raises an exception."
    if isinstance(node, ast.Assert):
        return f"Asserts that `{ast.unparse(node.test)}` holds."
    if isinstance(node, ast.Break):
        return "Breaks out of the innermost loop."
    if isinstance(node, ast.Continue):
        return "Skips to the next loop iteration."
    if isinstance(node, ast.Pass):
        return "Placeholder that intentionally does nothing."
    if isinstance(node, ast.Delete):
        return f"Deletes `{', '.join(_targets(target) for target in node.targets)}`."
    if isinstance(node, ast.Lambda):
        return "Defines an anonymous function."
    if isinstance(node, ast.Global):
        return f"Marks {', '.join(node.names)} as module level state."
    if isinstance(node, ast.ListComp):
        return f"Builds a list by applying `{ast.unparse(node.elt)}` over `{ast.unparse(node.generators[0].iter)}`."
    if isinstance(node, ast.DictComp):
        return "Builds a dict comprehension."
    if isinstance(node, ast.SetComp):
        return "Builds a set comprehension."
    return f"Executes `{type(node).__name__}`."


def _loop_depth(node: ast.AST, depth: int = 0) -> int:
    best = depth
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.For, ast.AsyncFor, ast.While)):
            best = max(best, _loop_depth(child, depth + 1))
        elif not isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            best = max(best, _loop_depth(child, depth))
    return best


def _recursive_functions(tree: ast.Module) -> list[tuple[str, int, bool]]:
    """Return ``(name, self_calls, memoized)`` for every recursive function."""

    found: list[tuple[str, int, bool]] = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        self_calls = 0
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                name = _call_name(child.func).split(".")[-1]
                if name == node.name:
                    self_calls += 1
        if self_calls:
            decorators = " ".join(ast.unparse(decorator) for decorator in node.decorator_list)
            memoized = "cache" in decorators
            found.append((node.name, self_calls, memoized))
    return found


def _estimate_complexity(tree: ast.Module, source: str) -> ComplexityReport:
    depth = _loop_depth(tree)
    recursive = _recursive_functions(tree)
    notes: list[str] = []

    if recursive:
        names = ", ".join(f"`{name}` ({calls} self-call(s){', memoized' if memo else ''})" for name, calls, memo in recursive)
        notes.append(f"Recursive functions: {names}")

    exponential = [name for name, calls, memo in recursive if calls >= 2 and not memo]
    memoized = [name for name, _, memo in recursive if memo]
    divide_and_conquer = "// 2" in source or "//2" in source

    if exponential:
        time = "O(2^n)"
        notes.append(f"`{', '.join(exponential)}` branches into multiple recursive calls — add memoization.")
    elif memoized:
        time = "O(n)"
    elif divide_and_conquer and recursive:
        time = "O(n log n)"
    elif depth >= 2:
        time = f"O(n^{depth})"
    elif depth == 1 or recursive:
        time = "O(n)"
    else:
        time = "O(1)"

    if "sorted(" in source or ".sort(" in source:
        notes.append("Uses a comparison sort: O(n log n) lower bound.")
        if time == "O(n)":
            time = "O(n log n)"

    if depth:
        notes.append(f"Maximum loop nesting depth: {depth}.")

    grows = any(
        isinstance(node, (ast.ListComp, ast.DictComp, ast.SetComp))
        or (isinstance(node, ast.Call) and _call_name(node.func).endswith("append"))
        for node in ast.walk(tree)
    )
    space = "O(n)" if grows or recursive else "O(1)"
    if recursive:
        notes.append("Recursion consumes O(depth) stack space.")

    notes.append("Static estimate — profile with real data to confirm.")
    return ComplexityReport(time=time, space=space, notes=notes)


def _inventory(tree: ast.Module, source: str) -> dict[str, int]:
    loops = sum(isinstance(node, (ast.For, ast.AsyncFor, ast.While)) for node in ast.walk(tree))
    branches = sum(isinstance(node, ast.If) for node in ast.walk(tree))
    handlers = sum(isinstance(node, ast.Try) for node in ast.walk(tree))
    calls = sum(isinstance(node, ast.Call) for node in ast.walk(tree))
    functions = sum(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) for node in ast.walk(tree))
    classes = sum(isinstance(node, ast.ClassDef) for node in ast.walk(tree))
    comments = sum(1 for line in source.splitlines() if line.strip().startswith("#"))
    return {
        "lines": len(source.splitlines()),
        "functions": functions,
        "classes": classes,
        "loops": loops,
        "branches": branches,
        "try blocks": handlers,
        "calls": calls,
        "comments": comments,
    }


def explain_python(code: str) -> ExplainOutcome:
    """Explain a Python snippet statement by statement."""

    source = code.rstrip("\n")
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        return ExplainOutcome(
            summary="Unparseable snippet",
            syntax_error=f"{exc.msg} (line {exc.lineno})",
            counts={"lines": len(source.splitlines())},
        )

    lines = source.splitlines()
    statements: list[_Statement] = []
    seen: set[tuple[int, str]] = set()

    for node in ast.walk(tree):
        if not isinstance(node, ast.stmt):
            continue
        text = lines[node.lineno - 1] if 0 < node.lineno <= len(lines) else ""
        key = (node.lineno, type(node).__name__)
        if key in seen:
            continue
        seen.add(key)
        statements.append(
            _Statement(line=node.lineno, code=text, explanation=_summarise(node, lines))
        )

    statements.sort(key=lambda item: item.line)

    functions = [node.name for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
    classes = [node.name for node in tree.body if isinstance(node, ast.ClassDef)]
    summary_parts = [f"{len(lines)} lines analysed"]
    if functions:
        summary_parts.append(f"defines {', '.join(f'`{name}()`' for name in functions[:4])}")
    if classes:
        summary_parts.append(f"declares {', '.join(f'`{name}`' for name in classes[:4])}")
    summary = "; ".join(summary_parts) + "."

    return ExplainOutcome(
        summary=summary,
        complexity=_estimate_complexity(tree, source),
        statements=statements,
        counts=_inventory(tree, source),
    )


def explain_response(code: str) -> ExplainResponse:
    """Convenience wrapper returning the API schema directly."""

    return explain_python(code).to_response()
