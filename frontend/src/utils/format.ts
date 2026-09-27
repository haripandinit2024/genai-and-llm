const EXTENSIONS: Record<string, string> = {
  python: "py",
  py: "py",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  java: "java",
  c: "c",
  cpp: "cpp",
  csharp: "cs",
  go: "go",
  rust: "rs",
  ruby: "rb",
  php: "php",
  swift: "swift",
  kotlin: "kt",
  sql: "sql",
  html: "html",
  css: "css",
  bash: "sh",
  sh: "sh",
  json: "json",
  yaml: "yaml",
  text: "txt",
};

export const PYTHON_LANGUAGES = new Set(["python", "py"]);

export function extensionFor(language: string): string {
  return EXTENSIONS[language.toLowerCase()] ?? "txt";
}

export function isPython(language: string): boolean {
  return PYTHON_LANGUAGES.has(language.toLowerCase());
}

export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds)) return "—";
  if (milliseconds < 1) return `${milliseconds.toFixed(2)} ms`;
  if (milliseconds < 1000) return `${milliseconds.toFixed(1)} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${total % 60}s`;
  return `${total}s`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function truncateWithEllipsis(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
