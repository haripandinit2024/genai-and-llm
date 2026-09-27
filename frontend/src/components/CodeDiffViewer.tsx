import { useMemo, useState } from "react";

import { ApiError, api } from "../services/api";
import type { RefactorResult } from "../types";
import { diffLines, summariseDiff } from "../utils/diff";
import {
  VIEW_ICON,
  SEVERITY_ICON,
  actionIcon,
  alertIcon,
  chromeIcon,
  diffIcon,
  paneIcon,
  statIcon,
} from "../utils/icons";
import { Icon } from "./Icon";

const DEFAULT_ORIGINAL = `def fibonacci(n):
    # Unoptimized recursive approach O(2^n)
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n - 1) + fibonacci(n - 2)

for i in range(len(values)):
    print(values[i])

print(fibonacci(10))`;

interface CodeDiffViewerProps {
  initialOriginal?: string;
}

export function CodeDiffViewer({ initialOriginal = DEFAULT_ORIGINAL }: CodeDiffViewerProps) {
  const [original, setOriginal] = useState(initialOriginal);
  const [result, setResult] = useState<RefactorResult | null>(null);
  const [viewMode, setViewMode] = useState<"side" | "unified">("side");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refactored = result?.refactored ?? original;
  const rows = useMemo(() => diffLines(original, refactored), [original, refactored]);
  const summary = useMemo(() => summariseDiff(rows), [rows]);

  const runRefactor = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.refactor(original));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Refactor request failed.");
    } finally {
      setBusy(false);
    }
  };

  const copyRefactored = async () => {
    try {
      await navigator.clipboard.writeText(refactored);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard access was blocked by the browser.");
    }
  };

  return (
    <div className="diff-view">
      <div className="diff-toolbar">
        <div>
          <h2 className="view-heading">
            <Icon icon={VIEW_ICON.diff} size="xl" tone="accent" /> Refactoring &amp; Diff Studio
          </h2>
          <p className="view-subheading">
            Findings come from a real AST pass; rewrites are applied only when the result still compiles.
          </p>
        </div>

        <div className="diff-toolbar-actions">
          <div className="segmented" role="group" aria-label="Diff layout">
            <button
              className={viewMode === "side" ? "active" : ""}
              aria-pressed={viewMode === "side"}
              onClick={() => setViewMode("side")}
            >
              <Icon icon={diffIcon.split} size="sm" /> Split diff
            </button>
            <button
              className={viewMode === "unified" ? "active" : ""}
              aria-pressed={viewMode === "unified"}
              onClick={() => setViewMode("unified")}
            >
              <Icon icon={diffIcon.unified} size="sm" /> Unified diff
            </button>
          </div>

          <button className="btn-viz-control primary" disabled={busy} onClick={() => void runRefactor()}>
            <Icon icon={busy ? chromeIcon.analysing : actionIcon.refactor} size="md" spin={busy} />
            {busy ? "Analysing…" : "Run refactor pass"}
          </button>
        </div>
      </div>

      <div className="diff-stats">
        <span className="diff-chip added">
          <Icon icon={statIcon.added} size="xs" /> {summary.added} added
        </span>
        <span className="diff-chip removed">
          <Icon icon={statIcon.removed} size="xs" /> {summary.removed} removed
        </span>
        <span className="diff-chip">
          <Icon icon={statIcon.unchanged} size="xs" /> {summary.unchanged} unchanged
        </span>
        {result && (
          <>
            <span className="diff-chip applied">
              <Icon icon={statIcon.applied} size="xs" /> {result.stats.applied_rewrites} rewrites
              applied
            </span>
            <span className="diff-chip">{result.stats.findings} findings</span>
            <span className="diff-chip">
              {result.stats.lines_before}
              <Icon icon={statIcon.linesMoved} size="xs" />
              {result.stats.lines_after} lines
            </span>
          </>
        )}
        {result?.changed && (
          <>
            <button className="btn-code-action" onClick={() => void copyRefactored()}>
              <Icon icon={copied ? actionIcon.copied : actionIcon.copy} size="sm" />
              {copied ? "Copied" : "Copy result"}
            </button>
            <button
              className="btn-code-action"
              onClick={() => {
                setOriginal(result.refactored);
                setResult(null);
              }}
            >
              <Icon icon={actionIcon.adopt} size="sm" /> Adopt result as input
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="inline-alert">
          <Icon icon={alertIcon.error} size="base" />
          <span>{error}</span>
        </div>
      )}

      <div className={`diff-body ${viewMode}`}>
        <div className="diff-pane">
          <header className="diff-pane-header">
            <span className="pane-title original">
              <Icon icon={paneIcon.original} size="sm" /> Original (editable)
            </span>
            <span className="pane-meta">{original.split("\n").length} lines</span>
          </header>
          <textarea
            className="diff-editor"
            spellCheck={false}
            value={original}
            onChange={(event) => setOriginal(event.target.value)}
          />
        </div>

        <div className="diff-pane">
          <header className="diff-pane-header">
            <span className="pane-title refactored">
              <Icon icon={paneIcon.refactored} size="sm" />
              {result ? "Refactored & idiomatic" : "Diff preview"}
            </span>
            <span className="pane-meta">
              {result ? (result.changed ? "changed" : "unchanged") : "run a pass to see the diff"}
            </span>
          </header>

          <div className={`diff-lines ${viewMode}`}>
            {rows.map((row, index) => {
              if (viewMode === "unified") {
                const marker = row.type === "add" ? "+" : row.type === "remove" ? "−" : " ";
                return (
                  <div className={`diff-row ${row.type}`} key={index}>
                    <span className="diff-gutter">{row.leftNumber ?? ""}</span>
                    <span className="diff-gutter">{row.rightNumber ?? ""}</span>
                    <span className="diff-marker">{marker}</span>
                    <span className="diff-text">{row.left ?? row.right ?? ""}</span>
                  </div>
                );
              }

              return (
                <div className="diff-row pair" key={index}>
                  <span className={`diff-cell ${row.type === "remove" ? "remove" : row.left ? "" : "filler"}`}>
                    <span className="diff-gutter">{row.leftNumber ?? ""}</span>
                    <span className="diff-text">{row.left ?? ""}</span>
                  </span>
                  <span className={`diff-cell ${row.type === "add" ? "add" : row.right ? "" : "filler"}`}>
                    <span className="diff-gutter">{row.rightNumber ?? ""}</span>
                    <span className="diff-text">{row.right ?? ""}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="findings">
        <div className="findings-header">
          <span className="section-label-inline">Refactor findings</span>
          <span className="pane-meta">
            {result ? `${result.notes.length} note(s)` : "No analysis run yet"}
          </span>
        </div>

        {!result && (
          <p className="empty-state">
            Press <strong>Run refactor pass</strong> to analyse the snippet: bare excepts,
            <code> range(len(...))</code>, mutable defaults, unused imports, naive recursion and more.
          </p>
        )}

        <div className="findings-list">
          {result?.notes.map((note, index) => (
            <div className={`finding ${note.severity}${note.applied ? " applied" : ""}`} key={index}>
              <span className={`finding-icon ${note.severity}`}>
                <Icon icon={SEVERITY_ICON[note.severity]} size="base" />
              </span>
              <div className="finding-body">
                <div className="finding-title">
                  {note.title}
                  {note.line !== null && <span className="finding-line">line {note.line}</span>}
                  {note.applied && (
                    <span className="finding-badge">
                      <Icon icon={statIcon.applied} size="xs" /> applied
                    </span>
                  )}
                </div>
                <div className="finding-detail">{note.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
