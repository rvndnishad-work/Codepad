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

export function encodePlaygroundCode(code: string): string {
  const b64 = btoa(unescape(encodeURIComponent(code)));
  // URL-safe so the value needs no further escaping inside the hash.
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode the `#code=…` value out of a location hash. Returns null if absent/garbled. */
export function decodePlaygroundCode(hash: string): string | null {
  const m = hash.match(new RegExp(`[#&]${HASH_KEY}=([^&]+)`));
  if (!m) return null;
  try {
    let b64 = decodeURIComponent(m[1]).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return null;
  }
}

/** Build the full `/play` href for a handoff. */
export function playgroundHref(code: string, templateId = "empty-react"): string {
  return `/play?template=${templateId}#${HASH_KEY}=${encodePlaygroundCode(code)}`;
}
