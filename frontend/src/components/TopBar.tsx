import type { Agent, HealthInfo, TabKey } from "../types";
import { SPLIT_ICON } from "../utils/icons";
import { viewMeta } from "../utils/views";
import { Icon } from "./Icon";

interface TopBarProps {
  activeTab: TabKey;
  splitMode: boolean;
  agent: Agent | null;
  messageCount: number;
  health: HealthInfo | null;
}

export function TopBar({ activeTab, splitMode, agent, messageCount, health }: TopBarProps) {
  const meta = viewMeta(activeTab);

  return (
    <header className="topbar">
      <div className="topbar-title">
        <Icon icon={splitMode ? SPLIT_ICON : meta.icon} size="xl" tone="accent" />
        <span>{splitMode ? "Split Workbench — Chat + Visualizer" : meta.title}</span>
      </div>

      <div className="topbar-meta">
        <span className="topbar-subtitle">
          {splitMode ? "Both panes stay live and share the active agent" : meta.subtitle}
        </span>

        <div className="topbar-chips">
          <span className="capability-chip">{agent?.name ?? "Assistant"}</span>
          {messageCount > 0 && (
            <span className="capability-chip success">{messageCount} messages</span>
          )}
          {health && <span className="capability-chip">sandbox ready</span>}
        </div>
      </div>
    </header>
  );
}
