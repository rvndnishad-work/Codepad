/**
 * Local drafts and code links for playgrounds that have no saved snippet.
 *
 * A guest (or a signed-in user who has not pressed Save yet) loses their work
 * on refresh unless it lives somewhere. Drafts keep the visible files per
 * template in localStorage so the next visit can offer "Restore your last
 * session". Code links carry the same files in the URL hash through the
 * existing #files= handoff, so sharing needs no account and no server write.
 */

import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { isNodeShimPath } from "./node-builtin-shims";
import { playgroundFilesHref } from "./playground-handoff";

export type PlaygroundDraft = {
  v: 1;
  /** Epoch ms of the last write. */
  at: number;
  title: string;
  files: Record<string, string>;
};

/** Drafts beyond this size are not stored (localStorage is ~5 MB per origin). */
export const MAX_DRAFT_BYTES = 512 * 1024;

/** Links beyond this length may be cut off by chat apps and mail clients. */
export const LONG_LINK_CHARS = 16_000;

export function draftKey(templateId: string): string {
  return `play:draft:${templateId}`;
}

function codeOf(file: SandpackFiles[string] | undefined): string | null {
  if (file === undefined) return null;
  return typeof file === "string" ? file : file.code;
}

function isHidden(file: SandpackFiles[string] | undefined): boolean {
  return typeof file === "object" && file !== null && file.hidden === true;
}

/** The files a person can see and edit, as a plain path -> code map. */
export function visibleFiles(files: SandpackFiles): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, file] of Object.entries(files)) {
    if (isNodeShimPath(path) || isHidden(file)) continue;
    out[path] = codeOf(file) ?? "";
  }
  return out;
}

/** True when the visible files are exactly the template's, so there is nothing to keep. */
export function matchesTemplate(files: Record<string, string>, template: SandpackFiles): boolean {
  const base = visibleFiles(template);
  const a = Object.keys(files);
  if (a.length !== Object.keys(base).length) return false;
  return a.every((p) => base[p] === files[p]);
}

export function serializeDraft(title: string, files: Record<string, string>, now = Date.now()): string | null {
  const draft: PlaygroundDraft = { v: 1, at: now, title, files };
  const json = JSON.stringify(draft);
  return json.length > MAX_DRAFT_BYTES ? null : json;
}

export function parseDraft(raw: string | null): PlaygroundDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || typeof d.at !== "number" || typeof d.title !== "string") return null;
    if (!d.files || typeof d.files !== "object" || Array.isArray(d.files)) return null;
    for (const v of Object.values(d.files)) if (typeof v !== "string") return null;
    return d as PlaygroundDraft;
  } catch {
    return null;
  }
}

/**
 * Rebuild a Sandpack file map from a draft: keep the template's hidden
 * scaffolding and shims, drop visible template files the draft deleted, and
 * lay the draft's files on top.
 */
export function applyDraft(base: SandpackFiles, draft: Record<string, string>): SandpackFiles {
  const out: SandpackFiles = {};
  for (const [path, file] of Object.entries(base)) {
    if (isNodeShimPath(path) || isHidden(file) || path in draft) out[path] = file;
  }
  for (const [path, code] of Object.entries(draft)) {
    const prev = base[path];
    out[path] = isHidden(prev) ? { ...(prev as object), code, hidden: false } : code;
  }
  return out;
}

/** Absolute /play URL that opens this template with these files. */
export function codeLinkUrl(origin: string, templateId: string, files: Record<string, string>): string {
  return origin + playgroundFilesHref(files, templateId);
}

/** "2 minutes ago" style label for the restore banner. */
export function draftAgeLabel(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? "1 minute ago" : `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
