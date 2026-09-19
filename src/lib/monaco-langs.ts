/**
 * File-extension → Monaco language + tab-dot color.
 *
 * Pure version of the maps previously local to `MonacoEditor.tsx`.
 * `languageFor` falls back to `plaintext` for unknown extensions.
 */

export const EXT_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  svelte: "html",
  vue: "html",
  py: "python",
  go: "go",
  java: "java",
  c: "cpp",
  cpp: "cpp",
  h: "cpp",
  hpp: "cpp",
  rs: "rust",
};

export const EXT_COLOR: Record<string, string> = {
  js: "#F7DF1E",
  jsx: "#61DAFB",
  ts: "#3178C6",
  tsx: "#3178C6",
  json: "#6D8086",
  html: "#E34F26",
  css: "#1572B6",
  scss: "#CF649A",
  svelte: "#FF3E00",
  vue: "#42B883",
  py: "#3776AB",
  go: "#00ADD8",
  java: "#007396",
  c: "#00599C",
  cpp: "#00599C",
  h: "#00599C",
  hpp: "#00599C",
  rs: "#CE412B",
};

export function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? "plaintext";
}

export function extColorFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_COLOR[ext] ?? "#8b8b8b";
}
