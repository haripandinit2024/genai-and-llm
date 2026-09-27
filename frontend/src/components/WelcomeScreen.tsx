import type { Agent, IconComponent, Preset } from "../types";
import { chromeIcon, presetIconFor } from "../utils/icons";
import { Icon } from "./Icon";

const RUN_SNIPPET = {
  label: "Run Python Script",
  icon: chromeIcon.pythonSnippet,
  text: "```python\nfor index in range(5):\n    print(f'Square of {index}: {index * index}')\n```\nPlease run this code",
};

interface WelcomeScreenProps {
  agent: Agent | null;
  presets: Preset[];
  busy: boolean;
  onSelect: (prompt: string) => void;
}

export function WelcomeScreen({ agent, presets, busy, onSelect }: WelcomeScreenProps) {
  const quickActions: { label: string; icon: IconComponent; text: string; hint: string }[] = [
    ...presets.slice(0, 4).map((preset) => ({
      label: preset.title,
      icon: presetIconFor(preset.id),
      text: preset.prompt,
      hint: preset.complexity,
    })),
    { ...RUN_SNIPPET, hint: "sandbox" },
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-title">
        Welcome to Multicode Agent{agent ? ` · ${agent.name}` : ""}
      </div>
      <p className="welcome-subtitle">
        {agent?.description ??
          "Select an agent to begin pair programming with the offline code engine."}
        {" "}Everything runs locally — the sandbox executes Python and reports real output.
      </p>

      <div className="quick-actions-grid">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="quick-action-card"
            disabled={busy}
            onClick={() => onSelect(action.text)}
          >
            <span className="quick-action-head">
              <Icon icon={action.icon} size="base" tone="accent-glow" />
              <span className="quick-action-label">{action.label}</span>
            </span>
            <span className="quick-action-hint">{action.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
