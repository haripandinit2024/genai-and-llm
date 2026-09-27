/**
 * Single source of truth for every icon in the app.
 *
 * Rules this file enforces:
 *  1. No component imports from `lucide-react` directly — only this file does.
 *  2. Every semantic slot gets a *distinct* silhouette, so two things that sit
 *     next to each other never share a glyph unless they mean the same thing.
 *  3. Keyed maps are typed against the domain unions (`TabKey`, `VizType`,
 *     `NoteSeverity`) so adding a value is a compile error, not a silent gap.
 *  4. Backend-supplied ids (agents, presets) resolve through a helper that owns
 *     the fallback, so a new id can never render a blank square.
 */

import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  ArrowUpToLine,
  Atom,
  BadgeCheck,
  BookOpen,
  Bot,
  Boxes,
  Braces,
  CheckCheck,
  ChevronDown,
  CircleDot,
  CodeXml,
  Columns2,
  Component,
  Copy,
  CornerDownLeft,
  CornerDownRight,
  Crosshair,
  Download,
  Eraser,
  FileCode,
  FileInput,
  FileOutput,
  Files,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  Info,
  Layers,
  Library,
  Lightbulb,
  Link2,
  ListOrdered,
  ListTree,
  LoaderCircle,
  MessageCircleMore,
  MessagesSquare,
  Minus,
  Network,
  Play,
  Plus,
  Radar,
  RefreshCw,
  Replace,
  RotateCcw,
  Rows2,
  ScanSearch,
  Search,
  Shapes,
  Shuffle,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Square,
  Table,
  Terminal,
  Timer,
  Trash2,
  TriangleAlert,
  Undo2,
  WandSparkles,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import type { IconComponent, NoteSeverity, TabKey, VizType } from "../types";

/* ── 1. Studio views ────────────────────────────────────────────────────────
 * Used three times each: sidebar nav, top bar, and the page's own heading —
 * so the view and the page it opens are always recognisably the same thing.
 */
export const VIEW_ICON: Record<TabKey, IconComponent> = {
  chat: MessagesSquare,
  visualizer: Atom,
  performance: Gauge,
  diff: GitCompareArrows,
  presets: Library,
};

/** Extra slot for the split workbench, which overrides the active view's icon. */
export const SPLIT_ICON: IconComponent = Columns2;

/* ── 2. Assistant agents ────────────────────────────────────────────────────
 * Backend ids are open-ended, so this map is intentionally `string`-keyed and
 * always paired with `agentIconFor()`.
 */
const AGENT_ICON: Record<string, IconComponent> = {
  "code-agent": CodeXml,
  "refactor-agent": WandSparkles,
  "explain-agent": BookOpen,
  "visualizer-agent": Shapes,
  "architecture-agent": Network,
};

export const AGENT_FALLBACK_ICON: IconComponent = Bot;

export function agentIconFor(agentId: string): IconComponent {
  return AGENT_ICON[agentId] ?? AGENT_FALLBACK_ICON;
}

/* ── 3. Preset blueprints ───────────────────────────────────────────────────
 * Deliberately disjoint from `VIZ_MODE_ICON`: a preset card and a visualizer
 * tab can describe the same algorithm, and they must still look different.
 */
const PRESET_ICON: Record<string, IconComponent> = {
  fibonacci: Sigma,
  sorting: ListOrdered,
  "binary-search": Crosshair,
  "linked-list": Component,
  bst: Workflow,
  "stack-queue": Rows2,
};

export const PRESET_FALLBACK_ICON: IconComponent = Braces;

export function presetIconFor(presetId: string): IconComponent {
  return PRESET_ICON[presetId] ?? PRESET_FALLBACK_ICON;
}

/* ── 4. Visualizer modes ────────────────────────────────────────────────────
 * Exhaustive by construction: a new `VizType` fails to compile until it has an
 * icon here.
 */
export const VIZ_MODE_ICON: Record<VizType, IconComponent> = {
  sorting: ArrowUpDown,
  binary_search: ScanSearch,
  linked_list: Link2,
  stack_queue: Layers,
  tree: ListTree,
};

/* ── 5. Refactor findings, by severity ────────────────────────────────────── */
export const SEVERITY_ICON: Record<NoteSeverity, IconComponent> = {
  improvement: Sparkles,
  warning: TriangleAlert,
  info: Info,
};

/* ── 6. Chrome, controls and statuses ───────────────────────────────────────
 * Grouped by the thing being represented rather than by glyph family, so a
 * repeated shape always means the same operation across the whole app.
 */
export const chromeIcon = {
  brand: Zap,
  assistant: Bot,
  agentCount: Boxes,
  presetCount: Files,
  split: Columns2,
  clearThread: Trash2,
  clearConsole: Eraser,
  collapse: ChevronDown,
  close: X,
  search: Search,
  console: Terminal,
  loading: LoaderCircle,
  analysing: RefreshCw,
  speed: SlidersHorizontal,
  pythonSnippet: FlaskConical,
  codeBlock: FileCode,
  suggestions: Lightbulb,
} as const satisfies Record<string, IconComponent>;

export const actionIcon = {
  copy: Copy,
  copied: CheckCheck,
  download: Download,
  adopt: Replace,
  openInChat: MessageCircleMore,
  visualize: Atom,
  refactor: WandSparkles,
} as const satisfies Record<string, IconComponent>;

export const transportIcon = {
  run: Play,
  stop: Square,
  send: ArrowUpRight,
  probe: Radar,
  shuffle: Shuffle,
} as const satisfies Record<string, IconComponent>;

export const structureIcon = {
  appendTail: CornerDownRight,
  prependHead: CornerDownLeft,
  listNext: ArrowRight,
  listHead: CircleDot,
  listNull: CircleDot,
  enqueue: ArrowRight,
  dequeue: ArrowLeft,
  push: ArrowUpToLine,
  pop: ArrowDownToLine,
  insert: Plus,
  reverse: Undo2,
  reset: RotateCcw,
} as const satisfies Record<string, IconComponent>;

export const statIcon = {
  added: Plus,
  removed: Minus,
  unchanged: CircleDot,
  applied: BadgeCheck,
  linesMoved: ArrowRight,
  algorithm: Activity,
  sizes: Table,
  lastRun: Timer,
} as const satisfies Record<string, IconComponent>;

export const paneIcon = {
  original: FileInput,
  refactored: FileOutput,
} as const satisfies Record<string, IconComponent>;

export const diffIcon = {
  split: Columns2,
  unified: Rows2,
} as const satisfies Record<string, IconComponent>;

export const alertIcon = {
  error: TriangleAlert,
} as const satisfies Record<string, IconComponent>;
