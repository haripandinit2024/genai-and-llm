import { useEffect, useRef, useState } from "react";

import type { Agent, Preset, VizType } from "../types";
import type { useChat } from "../hooks/useChat";
import { alertIcon, chromeIcon } from "../utils/icons";
import { Composer } from "./Composer";
import { Icon } from "./Icon";
import { MessageView } from "./MessageView";
import { WelcomeScreen } from "./WelcomeScreen";

interface ChatStudioProps {
  agent: Agent | null;
  presets: Preset[];
  chat: ReturnType<typeof useChat>;
  onVisualize: (viz: VizType) => void;
  consoleVisible: boolean;
  onToggleConsole: () => void;
}

export function ChatStudio({
  agent,
  presets,
  chat,
  onVisualize,
  consoleVisible,
  onToggleConsole,
}: ChatStudioProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages, chat.busy]);

  const submit = () => {
    const text = draft.trim();
    if (!text || chat.busy) return;
    setDraft("");
    void chat.send(text);
  };

  return (
    <div className="chat-view">
      <div className="messages-wrapper">
        {chat.messages.length === 0 && (
          <WelcomeScreen
            agent={agent}
            presets={presets}
            busy={chat.busy}
            onSelect={(prompt) => void chat.send(prompt)}
          />
        )}

        {chat.messages.map((message) => (
          <MessageView
            key={message.id}
            message={message}
            busy={chat.busy}
            onRun={(code, language) => void chat.runSnippet(code, language)}
            onVisualize={onVisualize}
          />
        ))}

        {chat.busy && (
          <div className="message-row assistant">
            <div className="message-avatar">
              <Icon icon={chromeIcon.assistant} size="lg" />
            </div>
            <div className="message-bubble">
              <div className="typing-dots">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {chat.error && (
        <div className="inline-alert">
          <Icon icon={alertIcon.error} size="base" />
          <span>{chat.error}</span>
        </div>
      )}

      <div className="composer-dock">
        <button
          className={`console-toggle${consoleVisible ? " active" : ""}`}
          onClick={onToggleConsole}
          title="Toggle the live output console"
        >
          <Icon icon={chromeIcon.console} size="base" />
          <span>Console</span>
          {chat.entries.length > 0 && <span className="nav-badge">{chat.entries.length}</span>}
        </button>

        <Composer
          value={draft}
          busy={chat.busy}
          suggestions={chat.suggestions}
          placeholder="Ask for code, refactoring, or an algorithm visualizer (try 'fibonacci', 'sorting', 'linked list')..."
          onChange={setDraft}
          onSubmit={submit}
          onStop={chat.stop}
        />
      </div>
    </div>
  );
}
