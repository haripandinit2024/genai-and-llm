import { useState } from "react";

import type { VizType } from "../types";
import { actionIcon, chromeIcon, transportIcon } from "../utils/icons";
import { extensionFor } from "../utils/format";
import { Icon } from "./Icon";

interface CodeBlockProps {
  language: string;
  code: string;
  viz?: VizType | null;
  busy?: boolean;
  onRun?: (code: string, language: string) => void;
  onVisualize?: (viz: VizType) => void;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CodeBlock({ language, code, viz, busy, onRun, onVisualize }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");
  const runnable = language.toLowerCase() === "python" || language.toLowerCase() === "py";

  const handleCopy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snippet.${extensionFor(language)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="code-block-container">
      <div className="code-header">
        <span className="code-lang">
          <Icon icon={chromeIcon.codeBlock} size="sm" />
          {language || "code"}
          <span className="code-meta">{lines.length} lines</span>
        </span>
        <div className="code-actions">
          {viz && onVisualize && (
            <button className="btn-code-action viz-btn" onClick={() => onVisualize(viz)}>
              <Icon icon={actionIcon.visualize} size="sm" /> Visualize
            </button>
          )}
          {runnable && onRun && (
            <button
              className="btn-code-action run-btn"
              disabled={busy}
              onClick={() => onRun(code, language)}
            >
              <Icon icon={transportIcon.run} size="sm" /> Run Code
            </button>
          )}
          <button className="btn-code-action" onClick={handleDownload}>
            <Icon icon={actionIcon.download} size="sm" /> Download
          </button>
          <button className="btn-code-action" onClick={handleCopy}>
            <Icon icon={copied ? actionIcon.copied : actionIcon.copy} size="sm" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="code-body">
        <div className="code-gutter" aria-hidden="true">
          {lines.map((_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>
        <pre className="code-content">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
