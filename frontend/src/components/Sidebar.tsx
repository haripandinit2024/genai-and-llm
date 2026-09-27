import type { Agent, ConnectionState, HealthInfo, TabKey } from "../types";
import { formatUptime } from "../utils/format";
import { SPLIT_ICON, agentIconFor, chromeIcon } from "../utils/icons";
import { VIEWS } from "../utils/views";
import { Icon } from "./Icon";

interface SidebarProps {
  activeTab: TabKey;
  splitMode: boolean;
  agents: Agent[];
  capabilities: string[];
  selectedAgent: string;
  messageCount: number;
  connection: ConnectionState;
  health: HealthInfo | null;
  onSelectTab: (tab: TabKey) => void;
  onToggleSplit: () => void;
  onSelectAgent: (id: string) => void;
  onClearConversation: () => void;
}

export function Sidebar({
  activeTab,
  splitMode,
  agents,
  capabilities,
  selectedAgent,
  messageCount,
  connection,
  health,
  onSelectTab,
  onToggleSplit,
  onSelectAgent,
  onClearConversation,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-header">
        <div className="brand-logo">
          <Icon icon={chromeIcon.brand} size="xxl" tone="inverse" strokeWidth={2.25} />
        </div>
        <div>
          <div className="brand-title">Multicode Agent</div>
          <div className="brand-subtitle">AI Code Studio</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-label">Studio Views &amp; Workbench</div>
        <div className="sidebar-nav-list">
          {VIEWS.map((view) => {
            const isChat = view.key === "chat";
            const active = !splitMode && activeTab === view.key;
            return (
              <button
                key={view.key}
                className={`sidebar-nav-item${active ? " active" : ""}`}
                onClick={() => onSelectTab(view.key)}
              >
                <span className="nav-label">
                  <Icon icon={view.icon} size="lg" />
                  <span>{view.label}</span>
                </span>
                {isChat && messageCount > 0 && <span className="nav-badge">{messageCount}</span>}
              </button>
            );
          })}

          <button
            className={`sidebar-nav-item split-toggle${splitMode ? " active" : ""}`}
            onClick={onToggleSplit}
          >
            <span className="nav-label">
              <Icon icon={SPLIT_ICON} size="lg" />
              <span>Split Workbench</span>
            </span>
            <span className="nav-badge">{splitMode ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-label">Assistant Agents</div>
        <div className="agent-list">
          {agents.length === 0 && <div className="sidebar-placeholder">Loading agents…</div>}
          {agents.map((agent) => (
            <button
              key={agent.id}
              className={`agent-card${agent.id === selectedAgent ? " active" : ""}`}
              onClick={() => onSelectAgent(agent.id)}
            >
              <div className="agent-card-header">
                <span className="nav-label">
                  <Icon icon={agentIconFor(agent.id)} size="base" tone="accent-glow" />
                  <span className="agent-name">{agent.name}</span>
                </span>
                <span className="agent-badge">{agent.capabilities[0] ?? "ai"}</span>
              </div>
              <div className="agent-desc">{agent.description}</div>
            </button>
          ))}
        </div>
      </div>

      {capabilities.length > 0 && (
        <div className="sidebar-section">
          <div className="section-label">Agent Capabilities</div>
          <div className="capabilities-grid">
            {capabilities.map((capability) => (
              <span className="capability-tag" key={capability}>
                {capability}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        {messageCount > 0 && (
          <button className="btn-code-action wide" onClick={onClearConversation}>
            <Icon icon={chromeIcon.clearThread} size="md" /> Clear conversation ({messageCount})
          </button>
        )}

        <div className="sidebar-status">
          <div className={`status-indicator ${connection === "checking" ? "checking" : connection === "online" ? "ok" : "down"}`} />
          <div>
            <div className="status-title">
              {connection === "checking"
                ? "Connecting…"
                : connection === "online"
                  ? "Backend online"
                  : "Backend offline"}
            </div>
            <div className="status-sub">
              {health
                ? `v${health.version} · up ${formatUptime(health.uptime_seconds)} · FastAPI :8001`
                : "FastAPI service expected on :8001"}
            </div>
          </div>
        </div>

        {health && (
          <div className="sidebar-facts">
            <span className="fact-chip">
              <Icon icon={chromeIcon.agentCount} size="xs" /> {health.agents} agents
            </span>
            <span className="fact-chip">
              <Icon icon={chromeIcon.presetCount} size="xs" /> {health.presets} presets
            </span>
            <span className="fact-chip">sandbox {health.sandbox.timeout_seconds}s</span>
          </div>
        )}
      </div>
    </aside>
  );
}
