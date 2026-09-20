/**
 * Multi-file backend runs.
 *
 * The explorer encourages multi-file workspaces, but `/api/execute` used to
 * receive only the active file — any program importing a sibling module died
 * server-side with ModuleNotFoundError. This module splits a workspace file
 * map into the entry source plus Piston `extraFiles`, and validates the
 * client-supplied `files` payload on the route. Caps are shared so client
 * and server always agree.
 */

import { isNodeShimPath } from "@/lib/node-builtin-shims";

/** Superset of the shapes a workspace file map can hold. */
export type WorkspaceFiles = Record<
  string,
  string | { code?: string; hidden?: boolean }
>;

export type PistonExtraFile = { name: string; content: string };

/** Hard caps for the multi-file payload (mirrored by route validation). */
export const MAX_EXTRA_FILES = 20;
export const MAX_EXTRA_BYTES = 256 * 1024;

/** Cap for captured stdout/stderr per run (infinite-loop protection). */
export const MAX_OUTPUT_BYTES = 256 * 1024;

export function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

function isRunnableFile(path: string, file: WorkspaceFiles[string]): boolean {
  if (typeof file !== "string" && file.hidden) return false;
  if (isNodeShimPath(path)) return false;
  if (path.toLowerCase().endsWith("/package.json")) return false;
  return true;
}

/**
 * Split a workspace file map into the entry source + Piston extra files.
 * The active file is the entry; every other visible, non-scaffold file
 * travels alongside so sibling imports resolve server-side. Names are
 * Piston-relative (no leading slash); over-cap files are dropped.
 */
export function buildRunPayload(
  activeFilePath: string,
  files: WorkspaceFiles,
): { code: string; extraFiles: PistonExtraFile[] } {
  const entry = files[activeFilePath];
  const code = typeof entry === "string" ? entry : (entry?.code ?? "");
  const extraFiles: PistonExtraFile[] = [];
  let bytes = 0;
  for (const [path, file] of Object.entries(files)) {
    if (path === activeFilePath) continue;
    if (!isRunnableFile(path, file)) continue;
    const content = typeof file === "string" ? file : (file.code ?? "");
    const name = path.startsWith("/") ? path.slice(1) : path;
    if (!name || name.includes("..") || name.includes("\\")) continue;
    const size = byteLength(name) + byteLength(content);
    if (extraFiles.length >= MAX_EXTRA_FILES) break;
    if (bytes + size > MAX_EXTRA_BYTES) break;
    bytes += size;
    extraFiles.push({ name, content });
  }
  return { code, extraFiles };
}

export type ValidatedFiles =
  | { ok: true; files: PistonExtraFile[] }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Validate the client-supplied `files` payload on the route. Never trust
 * names (path traversal) or sizes (memory) from the client.
 */
export function validateExtraFiles(input: unknown): ValidatedFiles {
  if (input === undefined || input === null) return { ok: true, files: [] };
  if (!Array.isArray(input)) {
    return { ok: false, status: 400, error: "Invalid files payload." };
  }
  if (input.length > MAX_EXTRA_FILES) {
    return {
      ok: false,
      status: 413,
      error: `Too many files (max ${MAX_EXTRA_FILES}).`,
    };
  }
  const files: PistonExtraFile[] = [];
  let bytes = 0;
  for (const item of input) {
    if (!item || typeof item !== "object") {
      return { ok: false, status: 400, error: "Invalid files payload." };
    }
    const { name, content } = item as Record<string, unknown>;
    if (typeof name !== "string" || !name || typeof content !== "string") {
      return { ok: false, status: 400, error: "Invalid files payload." };
    }
    if (
      name.startsWith("/") ||
      name.includes("..") ||
      name.includes("\\") ||
      name.length > 256
    ) {
      return { ok: false, status: 400, error: `Invalid file name: ${name}.` };
    }
    bytes += byteLength(name) + byteLength(content);
    if (bytes > MAX_EXTRA_BYTES) {
      return { ok: false, status: 413, error: "Files payload too large." };
    }
    files.push({ name, content });
  }
  return { ok: true, files };
}

/** Stable serialization for cache keys: sibling edits must bust the cache. */
export function stableFilesKey(files: PistonExtraFile[]): string {
  return JSON.stringify(
    [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
  );
}

/**
 * Byte-truncate run output without splitting a UTF-8 sequence (backs off
 * over continuation bytes). Returns the text plus whether it was cut.
 */
export function capOutput(
  text: string,
  maxBytes: number = MAX_OUTPUT_BYTES,
): { text: string; truncated: boolean } {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length <= maxBytes) return { text, truncated: false };
  let end = maxBytes;
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return { text: new TextDecoder().decode(bytes.slice(0, end)), truncated: true };
}

/**
 * Apply the output cap to an execution result. The `truncated` flag flows
 * into the response so consoles can say so instead of silently cutting.
 */
export function applyOutputCap<
  T extends { stdout?: string; stderr?: string },
>(result: T): T & { truncated: boolean } {
  const out = capOutput(result.stdout ?? "");
  const err = capOutput(result.stderr ?? "");
  return {
    ...result,
    stdout: out.text,
    stderr: err.text,
    truncated: out.truncated || err.truncated,
  };
}

/**
 * localStorage key for the per-template stdin draft. Stdin is deliberately
 * local-only: it never enters saved snippets, only the run request.
 */
export function stdinKey(templateId: string): string {
  return `interviewpad_stdin:${templateId}`;
}

export type HarnessSubmission =
  | { ok: true; code: string; extraFiles: PistonExtraFile[] }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Resolve a harness-mode judge submission into entry code + sibling extras.
 *
 * Without `files` this is the legacy single-file path. With `files` (the
 * full workspace map), `entryPath` is required and must name a submitted
 * file; everything else validated becomes Piston extra files. Names are
 * traversal-checked before anything else touches them. Verified against
 * live Piston: nested extra paths (e.g. `pkg/helpers.py`) import fine.
 */
export function resolveHarnessSubmission(args: {
  code?: string;
  files?: Record<string, string> | null;
  entryPath?: string;
}): HarnessSubmission {
  const { code = "", files, entryPath } = args;
  if (!files || Object.keys(files).length === 0) {
    return { ok: true, code, extraFiles: [] };
  }
  if (!entryPath) {
    return {
      ok: false,
      status: 400,
      error: "entryPath is required when files are submitted.",
    };
  }
  const normEntry = entryPath.replace(/^\/+/, "");
  const entryKey = Object.keys(files).find(
    (k) => k.replace(/^\/+/, "") === normEntry,
  );
  if (entryKey === undefined) {
    return {
      ok: false,
      status: 400,
      error: `Entry file "${entryPath}" not found in submission.`,
    };
  }
  const entryCode = files[entryKey];
  if (typeof entryCode !== "string" || !entryCode) {
    return {
      ok: false,
      status: 400,
      error: `Entry file "${entryPath}" not found in submission.`,
    };
  }
  const validated = validateExtraFiles(
    Object.entries(files).map(([p, content]) => ({
      name: p.replace(/^\/+/, ""),
      content,
    })),
  );
  if (!validated.ok) return validated;
  // Split entry/extras with the same rules as interactive runs; the exact
  // map key guarantees the entry itself never lands in extras.
  const workspace: WorkspaceFiles = {};
  for (const [p, content] of Object.entries(files)) workspace[p] = content;
  const { extraFiles } = buildRunPayload(entryKey, workspace);
  return { ok: true, code: entryCode, extraFiles };
}
