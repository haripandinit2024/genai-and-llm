import type { ReactNode } from "react";

export interface ContentPart {
  type: "text" | "code";
  language: string;
  content: string;
}

const FENCE_RE = /```(\w+)?[ \t]*\n([\s\S]*?)```/g;

/** Split a markdown message into prose and fenced code blocks. */
export function splitCodeBlocks(text: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  FENCE_RE.lastIndex = 0;
  while ((match = FENCE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", language: "", content: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: "code",
      language: (match[1] || "text").toLowerCase(),
      content: match[2].replace(/\n$/, ""),
    });
    lastIndex = FENCE_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", language: "", content: text.slice(lastIndex) });
  }
  return parts;
}

const INLINE_RE = /\*\*(.+?)\*\*|`([^`]+)`|\*([^*]+)\*/g;
let keySeed = 0;

/** Render inline markdown: **bold**, `code` and *italic*. */
export function renderInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(line)) !== null) {
    if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index));
    if (match[1] !== undefined) nodes.push(<strong key={keySeed++}>{match[1]}</strong>);
    else if (match[2] !== undefined) nodes.push(
      <code className="inline-code" key={keySeed++}>
        {match[2]}
      </code>,
    );
    else nodes.push(<em key={keySeed++}>{match[3]}</em>);
    lastIndex = INLINE_RE.lastIndex;
  }

  if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
  return nodes.length ? nodes : [line];
}

const BULLET_RE = /^(\s*)([-•*]|\d+\.)\s+(.*)$/;
const HEADING_RE = /^(#{1,4})\s+(.*)$/;

/** Render a prose chunk (bullets, headings, paragraphs). */
export function renderTextContent(content: string): ReactNode[] {
  return content.split("\n").map((line, index) => {
    if (!line.trim()) return <div className="md-spacer" key={index} />;

    const heading = line.match(HEADING_RE);
    if (heading) {
      return (
        <p className={`md-heading md-heading-${heading[1].length}`} key={index}>
          {renderInline(heading[2])}
        </p>
      );
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      return (
        <div className="md-bullet" key={index} style={{ marginLeft: `${bullet[1].length * 4}px` }}>
          <span className="bullet-marker">{bullet[2]}</span>
          <span>{renderInline(bullet[3])}</span>
        </div>
      );
    }

    return (
      <p className="md-line" key={index}>
        {renderInline(line)}
      </p>
    );
  });
}
