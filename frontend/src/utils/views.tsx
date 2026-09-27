import type { IconComponent, TabKey } from "../types";
import { VIEW_ICON } from "./icons";

export interface ViewMeta {
  key: TabKey;
  label: string;
  icon: IconComponent;
  title: string;
  subtitle: string;
}

export const VIEWS: ViewMeta[] = [
  {
    key: "chat",
    label: "Chat Studio",
    icon: VIEW_ICON.chat,
    title: "Chat Studio",
    subtitle: "Pair with an assistant agent and run code in the sandbox",
  },
  {
    key: "visualizer",
    label: "Visualizer Studio",
    icon: VIEW_ICON.visualizer,
    title: "Algorithm & Data Structure Visualizer",
    subtitle: "Step-by-step animation models for sorting, search, lists and trees",
  },
  {
    key: "performance",
    label: "Benchmarks",
    icon: VIEW_ICON.performance,
    title: "Empirical Performance & Complexity Analytics",
    subtitle: "Live browser benchmarks and Big-O reference bounds",
  },
  {
    key: "diff",
    label: "Diff Viewer",
    icon: VIEW_ICON.diff,
    title: "Refactoring & Diff Studio",
    subtitle: "Static-analysis findings with side-by-side and unified diffs",
  },
  {
    key: "presets",
    label: "Presets Library",
    icon: VIEW_ICON.presets,
    title: "Preset Algorithm & Feature Library",
    subtitle: "Verified blueprints you can load straight into the chat studio",
  },
];

export function viewMeta(key: TabKey): ViewMeta {
  return VIEWS.find((view) => view.key === key) ?? VIEWS[0];
}
