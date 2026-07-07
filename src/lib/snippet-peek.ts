/**
 * Server-side "code peek" for user snippets: pick the most interesting file
 * from a Snippet.files JSON map and return a small syntax-highlighted preview
 * for cards (homepage Explore Trends, etc.).
 *
 * Highlighting happens on the server so card consumers ship zero extra JS —
 * the client just renders the returned HTML inside an `.iq-hl` wrapper.
 */
import { highlight, trimForPeek } from "@/lib/code-peek";

export type SnippetPeek = {
  /** Display name of the previewed file, e.g. "App.tsx". */
  fileName: string;
  /** Highlighted HTML for the first few lines of the file. */
  html: string;
};

const SKIP_FILE = /(^|\/)(package(-lock)?\.json|tsconfig[^/]*\.json|vite\.config\.[^/]+|\.gitignore|readme\.md)$/i;
const SKIP_EXT = /\.(json|lock|md|svg|png|jpe?g|gif|ico|map)$/i;

/** Files we'd rather show, most interesting first. */
const PREFERRED = [
  /(^|\/)(index|main|app)\.(tsx|jsx)$/i,
  /(^|\/)app\.(vue|svelte)$/i,
  /(^|\/)(index|main|app|script)\.(ts|js|mjs)$/i,
  /(^|\/)(main|app|index)\.py$/i,
  /\.(tsx|jsx|vue|svelte)$/i,
  /\.(ts|js|mjs|py|go|java|cpp|cs|rb|rs|sql)$/i,
  /\.html?$/i,
  /\.css$/i,
];

const EXT_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  vue: "xml",
  svelte: "xml",
  html: "xml",
  htm: "xml",
  css: "css",
  py: "python",
  go: "go",
  java: "java",
  cpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  rs: "rust",
  sql: "sql",
};

const MAX_LINES = 7;
const MAX_LINE_CHARS = 88;

/** Extract a highlighted preview from a Snippet.files JSON string. */
export function snippetPeek(filesJson: string): SnippetPeek | null {
  let files: Record<string, string>;
  try {
    const parsed = JSON.parse(filesJson);
    if (!parsed || typeof parsed !== "object") return null;
    files = parsed as Record<string, string>;
  } catch {
    return null;
  }

  const candidates = Object.entries(files).filter(
    ([path, content]) =>
      typeof content === "string" &&
      content.trim().length > 0 &&
      !SKIP_FILE.test(path) &&
      !SKIP_EXT.test(path),
  );
  if (candidates.length === 0) return null;

  let chosen: [string, string] | undefined;
  for (const re of PREFERRED) {
    chosen = candidates.find(([path]) => re.test(path));
    if (chosen) break;
  }
  // Nothing matched a preference → take the largest file (most likely the code).
  chosen ??= candidates.sort((a, b) => b[1].length - a[1].length)[0];

  const [path, content] = chosen;
  const fileName = path.split("/").filter(Boolean).pop() ?? path;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const lang = EXT_LANG[ext] ?? "plaintext";

  // Drop leading blank lines, cap the number of lines, then cap line length so
  // one minified line can't blow the card open.
  const body = content.replace(/^\s*\n+/, "");
  const trimmed = trimForPeek(body, MAX_LINES)
    .split("\n")
    .map((l) => (l.length > MAX_LINE_CHARS ? l.slice(0, MAX_LINE_CHARS - 1) + "…" : l))
    .join("\n");

  return { fileName, html: highlight(trimmed, lang) };
}
