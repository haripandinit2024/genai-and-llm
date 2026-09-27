import type {
  AgentListResponse,
  ChatReply,
  ExplainResult,
  HealthInfo,
  PresetListResponse,
  RefactorResult,
} from "../types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = 30_000, signal } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const payload = await response.json();
        if (payload && typeof payload.detail === "string") detail = payload.detail;
      } catch {
        /* response had no JSON body */
      }
      throw new ApiError(detail, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new ApiError("The request timed out. Is the backend still running on port 8001?", 408);
    }
    throw new ApiError(
      "Cannot reach the backend. Start it with `uvicorn app.main:app --reload --port 8001`.",
      0,
    );
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export const api = {
  health: () => request<HealthInfo>("/api/health", { timeoutMs: 8_000 }),

  agents: () => request<AgentListResponse>("/api/agents"),

  presets: () => request<PresetListResponse>("/api/presets"),

  chat: (agentId: string, messages: { role: string; content: string }[], signal?: AbortSignal) =>
    request<ChatReply>("/api/chat", {
      method: "POST",
      body: { agent_id: agentId, messages },
      signal,
    }),

  run: (code: string, language = "python", timeoutSeconds?: number) =>
    request<ChatReply["execution"] & object>("/api/run", {
      method: "POST",
      body: { code, language, timeout_seconds: timeoutSeconds },
      timeoutMs: 20_000,
    }),

  refactor: (code: string) =>
    request<RefactorResult>("/api/refactor", { method: "POST", body: { code } }),

  explain: (code: string) =>
    request<ExplainResult>("/api/explain", { method: "POST", body: { code } }),
};
