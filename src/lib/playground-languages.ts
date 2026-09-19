/**
 * Run-routing helpers: which language a file executes as, and whether it
 * runs server-side via `/api/execute` (Piston) or in the browser bundler.
 *
 * Pure version of the helpers previously local to `Playground.tsx`.
 * Keep `BACKEND_LANGUAGES` in sync with `challengeSurface()` in
 * `lib/templates.ts` and `supportsNpm()` in `lib/template-filetypes.ts`:
 * all three must agree on the server-side set.
 */

/** Languages that execute server-side via /api/execute */
export const BACKEND_LANGUAGES = new Set([
  "python",
  "go",
  "java",
  "cpp",
  "rust",
  "node",
  "ts-node",
]);

export function getLanguageFromPath(
  filePath: string,
  fallback: string,
): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py") return "python";
  if (ext === "go") return "go";
  if (ext === "java") return "java";
  if (ext === "cpp" || ext === "h" || ext === "hpp") return "cpp";
  if (ext === "rs") return "rust";
  if (ext === "js" || ext === "jsx")
    return fallback === "node" ? "node" : "javascript";
  if (ext === "ts" || ext === "tsx") return "typescript";
  return fallback;
}

export function isBackendLanguage(lang: string, templateId?: string): boolean {
  const l = lang.toLowerCase();
  if (templateId === "ts-node" && l === "typescript") return true;
  return BACKEND_LANGUAGES.has(l);
}
