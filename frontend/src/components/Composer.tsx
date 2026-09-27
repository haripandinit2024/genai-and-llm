import { FormEvent, KeyboardEvent, useEffect, useRef } from "react";

import { chromeIcon, transportIcon } from "../utils/icons";
import { Icon } from "./Icon";

interface ComposerProps {
  value: string;
  busy: boolean;
  suggestions: string[];
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
}

export function Composer({
  value,
  busy,
  suggestions,
  placeholder,
  onChange,
  onSubmit,
  onStop,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [value]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="composer-container">
      {suggestions.length > 0 && (
        <div className="suggestion-row">
          <Icon icon={chromeIcon.suggestions} size="md" tone="accent-glow" />
          {suggestions.slice(0, 3).map((suggestion) => (
            <button
              key={suggestion}
              className="suggestion-chip"
              disabled={busy}
              onClick={() => onChange(suggestion)}
              title="Load this prompt into the composer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form className="composer-form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={value}
          rows={1}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {busy ? (
          <button type="button" className="btn-send stop" onClick={onStop}>
            <Icon icon={transportIcon.stop} size="md" /> Stop
          </button>
        ) : (
          <button type="submit" className="btn-send" disabled={!value.trim()}>
            Send <Icon icon={transportIcon.send} size="base" />
          </button>
        )}
      </form>
      <div className="composer-hint">
        <span>
          <kbd>Enter</kbd> to send · <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
        </span>
        <span>Python snippets run in the sandboxed "Run Code" engine</span>
      </div>
    </div>
  );
}
