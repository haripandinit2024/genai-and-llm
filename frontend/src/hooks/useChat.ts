import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, api } from "../services/api";
import type { ChatMessage, ConsoleEntry, ExecutionInfo } from "../types";
import { formatClock, formatDuration } from "../utils/format";

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function executionEntries(info: ExecutionInfo): ConsoleEntry[] {
  const at = Date.now();
  const flags = [
    info.ok ? "status=0" : "status=1",
    `time=${formatDuration(info.duration_ms)}`,
    info.truncated ? "output=truncated" : null,
    info.timed_out ? "timed_out=true" : null,
  ]
    .filter(Boolean)
    .join("  ");

  const entries: ConsoleEntry[] = [
    { id: createId(), kind: "meta", text: `[${formatClock(at)}] ${flags}`, at },
  ];

  info.stdout
    .split("\n")
    .filter((line) => line.length > 0)
    .forEach((line) => entries.push({ id: createId(), kind: "stdout", text: line, at }));
  if (info.error) {
    info.error
      .split("\n")
      .forEach((line) => entries.push({ id: createId(), kind: "error", text: line, at }));
  }
  if (!info.stdout && !info.error) {
    entries.push({ id: createId(), kind: "meta", text: "(no output)", at });
  }
  return entries;
}

function executionMarkdown(info: ExecutionInfo): string {
  const status = info.ok ? "completed" : "raised an error";
  const body = info.stdout.trim() || "(no output)";
  const error = info.error ? `\n\n**Error**\n\`\`\`text\n${info.error}\n\`\`\`` : "";
  return (
    `I ran the snippet in the sandbox — it **${status}** in ${formatDuration(info.duration_ms)}.\n\n` +
    `**Output**\n\`\`\`text\n${body}\n\`\`\`${error}`
  );
}

export function useChat(agentId: string) {
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [lastExecution, setLastExecution] = useState<ExecutionInfo | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const threadsRef = useRef(threads);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const messages = threads[agentId] ?? [];

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      setThreads((previous) => ({
        ...previous,
        [agentId]: [...(previous[agentId] ?? []), message],
      }));
    },
    [agentId],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      const history: ChatMessage[] = [
        ...(threadsRef.current[agentId] ?? []),
        { id: createId(), role: "user", content: text, createdAt: Date.now() },
      ];
      setThreads((previous) => ({ ...previous, [agentId]: history }));
      setBusy(true);
      setError(null);
      setEntries((previous) => [
        ...previous,
        {
          id: createId(),
          kind: "command",
          text: `▶ ${text.split("\n")[0].slice(0, 120)}`,
          at: Date.now(),
        },
      ]);

      const controller = new AbortController();
      requestRef.current = controller;

      try {
        const reply = await api.chat(
          agentId,
          history.map((message) => ({ role: message.role, content: message.content })),
          controller.signal,
        );
        appendMessage({
          id: createId(),
          role: "assistant",
          content: reply.reply,
          createdAt: Date.now(),
        });
        setSuggestions(reply.suggestions ?? []);
        if (reply.execution) {
          setLastExecution(reply.execution);
          setEntries((previous) => [...previous, ...executionEntries(reply.execution!)]);
        }
      } catch (caught) {
        const message = caught instanceof ApiError ? caught.message : "Unexpected error.";
        setError(message);
        appendMessage({
          id: createId(),
          role: "assistant",
          content: `⚠️ **Request failed** — ${message}`,
          createdAt: Date.now(),
        });
      } finally {
        requestRef.current = null;
        setBusy(false);
      }
    },
    [agentId, appendMessage, busy],
  );

  const runSnippet = useCallback(
    async (code: string, language: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setEntries((previous) => [
        ...previous,
        {
          id: createId(),
          kind: "command",
          text: `▶ Executing ${language} sandbox script...`,
          at: Date.now(),
        },
      ]);

      try {
        const result = (await api.run(code, language)) as ExecutionInfo;
        setLastExecution(result);
        setEntries((previous) => [...previous, ...executionEntries(result)]);
        appendMessage({
          id: createId(),
          role: "assistant",
          content: executionMarkdown(result),
          createdAt: Date.now(),
        });
      } catch (caught) {
        const message = caught instanceof ApiError ? caught.message : "Unexpected error.";
        setError(message);
        setEntries((previous) => [
          ...previous,
          { id: createId(), kind: "error", text: message, at: Date.now() },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [appendMessage, busy],
  );

  const clearConversation = useCallback(() => {
    setThreads((previous) => ({ ...previous, [agentId]: [] }));
    setEntries([]);
    setLastExecution(null);
    setError(null);
  }, [agentId]);

  const clearConsole = useCallback(() => setEntries([]), []);

  const stop = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
  }, []);

  return {
    messages,
    busy,
    error,
    send,
    runSnippet,
    clearConversation,
    entries,
    clearConsole,
    stop,
    lastExecution,
    suggestions,
  };
}
