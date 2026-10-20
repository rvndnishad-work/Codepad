import type { SandpackFiles } from "@codesandbox/sandpack-react";
/**
 * One-shot code handoff into the live Sandpack playground.
 *
 * "Open in Playground" buttons (e.g. on interview-question detail pages) link to
 *   /play?template=<id>#code=<encoded>
 * The code rides in the URL **hash** so it never hits the server (no length
 * limits on request lines, nothing logged), and `Playground.tsx` decodes it on
 * mount and drops it into the template's entry file.
 *
 * Encoding = URL-safe base64 of the UTF-8 bytes. btoa/atob/escape/unescape are
 * globals in both the browser and Node 16+, so this module is isomorphic: the
 * RSC detail page encodes, the client Playground decodes.
 */

const HASH_KEY = "code";
const FILES_KEY = "files";

export function encodePlaygroundCode(code: string): string {
  const b64 = btoa(unescape(encodeURIComponent(code)));
  // URL-safe so the value needs no further escaping inside the hash.
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a URL-safe-base64 value stored under `key` in a location hash. */
function decodeHashValue(hash: string, key: string): string | null {
  const m = hash.match(new RegExp(`[#&]${key}=([^&]+)`));
  if (!m) return null;
  try {
    let b64 = decodeURIComponent(m[1]).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
}

/** Decode the `#code=…` value out of a location hash. Returns null if absent/garbled. */
export function decodePlaygroundCode(hash: string): string | null {
  return decodeHashValue(hash, HASH_KEY);
}

/**
 * Decode the `#files=…` value (a path -> source map) for multi-file handoffs.
 * Returns null if absent/garbled.
 */
export function decodePlaygroundFiles(hash: string): Record<string, string> | null {
  const raw = decodeHashValue(hash, FILES_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" && !Array.isArray(obj) ? (obj as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export function encodePlaygroundFiles(files: Record<string, string>): string {
  return encodePlaygroundCode(JSON.stringify(files));
}

/**
 * Build the full `/play` href for a handoff. Pass `from` (an internal path like
 * the originating question URL) to get a "Back" button in the playground — it
 * rides in the query string so it survives the hash being cleared on mount.
 */
export function playgroundHref(code: string, templateId = "empty-react", from?: string): string {
  const fromParam = from ? `&from=${encodeURIComponent(from)}` : "";
  return `/play?template=${templateId}${fromParam}#${HASH_KEY}=${encodePlaygroundCode(code)}`;
}

/**
 * Build a `/play` href for a multi-file handoff (component-wise solutions).
 * `files` is a path -> source map (e.g. { "/App.js": "...", "/src/Otp.js": "..." })
 * merged over the template; extra files appear in the playground file explorer.
 */
export function playgroundFilesHref(
  files: Record<string, string>,
  templateId = "empty-react",
  from?: string,
): string {
  const fromParam = from ? `&from=${encodeURIComponent(from)}` : "";
  return `/play?template=${templateId}${fromParam}#${FILES_KEY}=${encodePlaygroundFiles(files)}`;
}

/**
 * Merges a multi-file hand-off over the template. The template's own sample
 * files (e.g. Vue's AppHeader.vue/Counter.vue) are dropped unless the
 * hand-off still uses them, so the explorer shows only the solution's files.
 * Hidden scaffolding and entry files (main.ts, polyfills.ts, index.html,
 * package.json) always stay.
 */
export const ENTRY_FILE = /^\/(?:src\/)?(?:main|polyfills|index)\.[a-z]+$|^\/(?:public\/)?index\.html$|^\/package\.json$/;
export function mergeHandoff(template: SandpackFiles, handoff: SandpackFiles): SandpackFiles {
  const sources = Object.values(handoff)
    .map((f) => (typeof f === "string" ? f : (f as { code?: string }).code ?? ""))
    .join("\n");
  const out: SandpackFiles = {};
  for (const [path, file] of Object.entries(template)) {
    const hidden = typeof file === "object" && (file as { hidden?: boolean }).hidden === true;
    const stem = path.split("/").pop()!.replace(/\.[^.]+$/, "");
    // Still imported by a hand-off file, e.g. `from "./components/Counter.vue"`.
    const used = /^[\w-]+$/.test(stem) && new RegExp(`/${stem}(?:\\.\\w+)?["']`).test(sources);
    if (hidden || path in handoff || ENTRY_FILE.test(path) || used) out[path] = file;
  }
  return { ...out, ...handoff };
}

