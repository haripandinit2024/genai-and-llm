import { useEffect, useRef } from "react";

import type { ConsoleEntry, ExecutionInfo } from "../types";
import { formatDuration } from "../utils/format";
import { chromeIcon } from "../utils/icons";
import { Icon } from "./Icon";

interface ConsoleDrawerProps {
  entries: ConsoleEntry[];
  lastExecution: ExecutionInfo | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClear: () => void;
  onClose: () => void;
}

export function ConsoleDrawer({
  entries,
  lastExecution,
  collapsed,
  onToggleCollapse,
  onClear,
  onClose,
}: ConsoleDrawerProps) {
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collapsed) return;
    const element = outputRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [entries, collapsed]);

  const status = lastExecution
    ? lastExecution.ok
      ? "success"
      : lastExecution.timed_out
        ? "timeout"
        : "error"
    : "idle";

  return (
    <section className={`console-panel${collapsed ? " collapsed" : ""}`}>
      <header className="console-header">
        <div className="console-title">
          <Icon icon={chromeIcon.console} size="base" />
          <span>Live Output Console</span>
          <span className={`console-status ${status}`}>{status}</span>
          {lastExecution && (
            <span className="console-metric">exit {lastExecution.ok ? "0" : "1"}</span>
          )}
          {lastExecution && (
            <span className="console-metric">{formatDuration(lastExecution.duration_ms)}</span>
          )}
          <span className="console-metric">{entries.length} lines</span>
        </div>
        <div className="console-tools">
          <button
            className="icon-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand console" : "Collapse console"}
            aria-label={collapsed ? "Expand console" : "Collapse console"}
            aria-expanded={!collapsed}
          >
            <Icon
              icon={chromeIcon.collapse}
              size="base"
              style={{ transform: collapsed ? "rotate(180deg)" : "none" }}
            />
          </button>
          <button
            className="icon-btn"
            onClick={onClear}
            title="Clear output"
            aria-label="Clear output"
          >
            <Icon icon={chromeIcon.clearConsole} size="base" />
          </button>
          <button className="icon-btn" onClick={onClose} title="Close console" aria-label="Close console">
            <Icon icon={chromeIcon.close} size="base" />
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="console-output" ref={outputRef}>
          {entries.length === 0 ? (
            <div className="console-empty">
              No output yet — generate a snippet and press <strong>Run Code</strong>.
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className={`console-entry ${entry.kind}`}>
                {entry.text}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
