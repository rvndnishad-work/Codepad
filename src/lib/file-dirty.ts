/**
 * Per-tab dirty tracking for the editor tab strip.
 *
 * Compares live file contents against the last-saved snapshot (code only —
 * hidden flags and object identity are irrelevant). A path missing from the
 * snapshot is dirty: it was created after the last save. A null snapshot
 * (never saved) reports clean so brand-new playgrounds don't light up.
 */

import type { SandpackFiles } from "@codesandbox/sandpack-react";

function codeOf(
  file: SandpackFiles[string] | undefined,
): string | undefined {
  if (file === undefined) return undefined;
  return typeof file === "string" ? file : (file.code ?? "");
}

/** Normalize a file map to plain `{ code }` entries for snapshotting. */
export function snapshotFiles(files: SandpackFiles): SandpackFiles {
  const snap: SandpackFiles = {};
  for (const [path, file] of Object.entries(files)) {
    const code = codeOf(file) ?? "";
    snap[path] = { code };
  }
  return snap;
}

export function isFileDirty(
  saved: SandpackFiles | null | undefined,
  live: SandpackFiles,
  path: string,
): boolean {
  if (!saved) return false;
  const savedCode = codeOf(saved[path]);
  if (savedCode === undefined) return true;
  return codeOf(live[path]) !== savedCode;
}
