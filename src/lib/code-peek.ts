import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import type { TemplateDef } from "./templates";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("python", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("sql", sql);

export type Showpiece = {
  path: string;
  code: string;
  lang: string;
};

const PREFERRED_PATHS = [
  "/index.py",
  "/main.go",
  "/Main.java",
  "/main.cpp",
  "/main.rs",
  "/App.tsx",
  "/App.jsx",
  "/App.js",
  "/src/App.tsx",
  "/src/App.jsx",
  "/src/App.js",
  "/src/App.vue",
  "/App.vue",
  "/src/App.svelte",
  "/App.svelte",
  "/src/+page.svelte",
  "/+page.svelte",
  "/src/routes/+page.svelte",
  "/src/app/app.component.ts",
  "/src/main.tsx",
  "/src/main.ts",
  "/src/main.js",
  "/src/index.tsx",
  "/src/index.ts",
  "/src/index.jsx",
  "/src/index.js",
  "/index.tsx",
  "/index.ts",
  "/index.jsx",
  "/index.js",
  "/main.js",
];

function langFor(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".go")) return "go";
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".cpp") || path.endsWith(".h") || path.endsWith(".hpp")) return "cpp";
  if (path.endsWith(".rs")) return "rust";
  if (
    path.endsWith(".vue") ||
    path.endsWith(".svelte") ||
    path.endsWith(".html")
  ) {
    return "xml";
  }
  if (path.endsWith(".css")) return "css";
  return "plaintext";
}

function fileCode(entry: unknown): { code: string; hidden: boolean } | null {
  if (typeof entry === "string") return { code: entry, hidden: false };
  if (entry && typeof entry === "object" && "code" in entry) {
    const e = entry as { code: string; hidden?: boolean };
    return { code: e.code, hidden: !!e.hidden };
  }
  return null;
}

function isLowSignal(path: string): boolean {
  return (
    path.endsWith(".css") ||
    path.endsWith(".html") ||
    path.endsWith(".json") ||
    path.endsWith(".md")
  );
}

export function pickShowpiece(t: TemplateDef): Showpiece | null {
  const files = t.files as Record<string, unknown>;

  for (const path of PREFERRED_PATHS) {
    const entry = fileCode(files[path]);
    if (!entry || entry.hidden || !entry.code.trim()) continue;
    return { path, code: entry.code, lang: langFor(path) };
  }

  // Fallback: first non-hidden, non-low-signal file in declaration order.
  for (const [path, raw] of Object.entries(files)) {
    if (isLowSignal(path)) continue;
    const entry = fileCode(raw);
    if (!entry || entry.hidden || !entry.code.trim()) continue;
    return { path, code: entry.code, lang: langFor(path) };
  }

  // Last resort: any non-hidden file (including CSS) so the card isn't blank.
  for (const [path, raw] of Object.entries(files)) {
    const entry = fileCode(raw);
    if (!entry || entry.hidden || !entry.code.trim()) continue;
    return { path, code: entry.code, lang: langFor(path) };
  }

  return null;
}

/** Trim trailing blank lines and cap at `maxLines` so cards stay predictable. */
export function trimForPeek(code: string, maxLines: number): string {
  const lines = code.replace(/\s+$/g, "").split("\n");
  if (lines.length <= maxLines) return lines.join("\n");
  return lines.slice(0, maxLines).join("\n");
}

export function highlight(code: string, lang: string): string {
  const language = hljs.getLanguage(lang) ? lang : "plaintext";
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
