import type { ChatMessage, VizType } from "../types";
import { renderTextContent, splitCodeBlocks } from "../utils/markdown";
import { chromeIcon } from "../utils/icons";
import { formatClock } from "../utils/format";
import { CodeBlock } from "./CodeBlock";
import { Icon } from "./Icon";

interface MessageViewProps {
  message: ChatMessage;
  busy?: boolean;
  onRun?: (code: string, language: string) => void;
  onVisualize?: (viz: VizType) => void;
}

export function MessageView({ message, busy, onRun, onVisualize }: MessageViewProps) {
  const parts = splitCodeBlocks(message.content);

  return (
    <div className={`message-row ${message.role}`}>
      <div className="message-avatar">
        {message.role === "user" ? "U" : <Icon icon={chromeIcon.assistant} size="lg" />}
      </div>
      <div className="message-bubble">
        {parts.map((part, index) =>
          part.type === "code" ? (
            <CodeBlock
              key={index}
              language={part.language}
              code={part.content}
              busy={busy}
              onRun={onRun}
              onVisualize={onVisualize}
            />
          ) : (
            <div className="text-content" key={index}>
              {renderTextContent(part.content)}
            </div>
          ),
        )}
        <div className="message-meta">{formatClock(message.createdAt)}</div>
      </div>
    </div>
  );
}
