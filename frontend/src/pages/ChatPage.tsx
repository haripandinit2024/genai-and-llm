import { useState } from "react";

import { ChatStudio } from "../components/ChatStudio";
import { ConsoleDrawer } from "../components/ConsoleDrawer";
import type { useChat } from "../hooks/useChat";
import type { Agent, Preset, VizType } from "../types";

interface ChatPageProps {
  agent: Agent | null;
  presets: Preset[];
  chat: ReturnType<typeof useChat>;
  onVisualize: (viz: VizType) => void;
  /** Split mode shows the chat pane only — the console collapses by default. */
  compact?: boolean;
}

export function ChatPage({ agent, presets, chat, onVisualize, compact = false }: ChatPageProps) {
  const [consoleVisible, setConsoleVisible] = useState(!compact);
  const [collapsed, setCollapsed] = useState(compact);

  return (
    <div className="chat-page">
      <ChatStudio
        agent={agent}
        presets={presets}
        chat={chat}
        onVisualize={onVisualize}
        consoleVisible={consoleVisible}
        onToggleConsole={() => {
          setConsoleVisible((previous) => !previous);
          setCollapsed(false);
        }}
      />

      {consoleVisible && (
        <ConsoleDrawer
          entries={chat.entries}
          lastExecution={chat.lastExecution}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((previous) => !previous)}
          onClear={chat.clearConsole}
          onClose={() => setConsoleVisible(false)}
        />
      )}
    </div>
  );
}
