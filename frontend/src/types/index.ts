import type { LucideIcon } from "lucide-react";

/** Shared icon component type (all icons come from lucide-react). */
export type IconComponent = LucideIcon;

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

export interface AgentListResponse {
  capabilities: string[];
  agents: Agent[];
}

export type VizType =
  | "sorting"
  | "binary_search"
  | "linked_list"
  | "stack_queue"
  | "tree";

export interface CodeBlockMeta {
  language: string;
  code: string;
  runnable: boolean;
  viz?: VizType | null;
}

export interface ExecutionInfo {
  ok: boolean;
  stdout: string;
  error: string | null;
  duration_ms: number;
  language: string;
  truncated: boolean;
  timed_out: boolean;
}

export interface ChatReply {
  reply: string;
  agent_id: string;
  code_blocks: CodeBlockMeta[];
  execution: ExecutionInfo | null;
  suggestions: string[];
}

export interface Preset {
  id: string;
  title: string;
  description: string;
  category: string;
  tag: string;
  prompt: string;
  complexity: string;
  viz?: VizType | null;
}

export interface PresetListResponse {
  categories: string[];
  presets: Preset[];
}

export interface SandboxInfo {
  timeout_seconds: number;
  max_output_chars: number;
  allowed_modules: number;
}

export interface HealthInfo {
  status: string;
  service: string;
  version: string;
  uptime_seconds: number;
  agents: number;
  presets: number;
  sandbox: SandboxInfo;
}

export type NoteSeverity = "improvement" | "warning" | "info";

export interface RefactorNote {
  title: string;
  detail: string;
  severity: NoteSeverity;
  line: number | null;
  applied: boolean;
}

export interface RefactorResult {
  language: string;
  original: string;
  refactored: string;
  changed: boolean;
  notes: RefactorNote[];
  stats: {
    lines_before: number;
    lines_after: number;
    applied_rewrites: number;
    findings: number;
  };
}

export interface ExplainStatement {
  line: number;
  code: string;
  explanation: string;
}

export interface ExplainResult {
  language: string;
  summary: string;
  complexity: { time: string; space: string; notes: string[] };
  statements: ExplainStatement[];
  counts: Record<string, number>;
}

export type TabKey = "chat" | "visualizer" | "performance" | "diff" | "presets";

export type ConnectionState = "checking" | "online" | "offline";

export interface ConsoleEntry {
  id: string;
  kind: "command" | "meta" | "stdout" | "error";
  text: string;
  at: number;
}
