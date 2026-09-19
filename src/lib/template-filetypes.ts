/**
 * Which file extensions the explorer may create, per playground template.
 *
 * Pure version of the mapping previously inline in `FileExplorer.tsx`.
 * `allowedExtsForTemplate` returns extension strings; callers intersect with
 * `FILE_TYPES`. `defaultExtForTemplate` is the extension pre-selected by the
 * toolbar "New file" button and the context-menu "New File" row.
 */

/** Default web-frontend set (React/Vue/Svelte/Solid/Angular/empty-react…). */
export const FRONTEND_EXTS = [
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".css",
  ".html",
  ".json",
  ".md",
] as const;

export function allowedExtsForTemplate(templateId?: string): string[] {
  if (!templateId) return [...FRONTEND_EXTS];
  const id = templateId.toLowerCase();
  if (id === "python") return [".py", ".json", ".md"];
  if (id === "go") return [".go", ".json", ".md"];
  if (id === "java") return [".java", ".json", ".md"];
  if (id === "rust") return [".rs", ".toml", ".md"];
  if (id === "cpp") return [".cpp", ".h", ".c", ".json", ".md"];
  if (id === "node" || id === "ts-node" || id === "empty-js" || id === "empty-ts") {
    return [".js", ".ts", ".json", ".md"];
  }
  // Default frontend list (covers empty-react and every framework template,
  // plus non-catalog ids such as the "vanilla" used by challenge attempts).
  return [...FRONTEND_EXTS];
}

export function defaultExtForTemplate(templateId?: string): string {
  return allowedExtsForTemplate(templateId)[0] ?? ".js";
}

/**
 * Whether the npm Dependencies panel does anything for this template.
 * `node`/`ts-node` execute single-file via Piston (`/api/execute`) — edits to
 * package.json install nothing server-side — so like the other native
 * runtimes they must not offer the panel.
 */
const SERVER_RUNTIMES = new Set([
  "python",
  "go",
  "java",
  "cpp",
  "rust",
  "node",
  "ts-node",
]);

export function supportsNpm(templateId?: string): boolean {
  return !templateId || !SERVER_RUNTIMES.has(templateId.toLowerCase());
}

/**
 * Touch affordance for the context-menu "New File" row.
 * Fine pointers get instant-create on click (hover reveals the type flyout);
 * coarse pointers (touch) have no hover, so the first tap must open the type
 * list inline instead of committing to the default extension unseen.
 */
export type NewFileRowAction = "create" | "toggle";

export function newFileRowAction(coarsePointer: boolean): NewFileRowAction {
  return coarsePointer ? "toggle" : "create";
}

/** Guarded coarse-pointer detection (SSR- and jsdom-safe). */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(hover: none)").matches;
}

/**
 * Explorer template id for an AI-interview round. Frontend rounds always run
 * the React surface (`template="react"`, entry `/App.js`), but the explorer
 * must follow the round — not a hardcode — so a future Vue/Svelte round
 * offers the right file types without anyone rediscovering this call site.
 */
export function aiExplorerTemplateId(round: {
  kind: string;
  frameworkLabel?: string | null;
  language?: string | null;
}): string {
  if (round.kind !== "frontend") return "react";
  const fw = (round.frameworkLabel ?? "").toLowerCase();
  if (fw.includes("vue")) return "vue";
  if (fw.includes("svelte")) return "svelte";
  if (fw.includes("angular")) return "angular";
  if (fw.includes("solid")) return "solid";
  return "react";
}
