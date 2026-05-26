/**
 * Bound the candidate's submitted files payload. Candidates can paste large
 * libraries or base64-encoded images into Sandpack which would otherwise blow
 * up the chatHistory + filesJson columns and balloon Gemini cost on every turn.
 *
 * 200KB is generous — typical solutions are <30KB. Real malicious payloads
 * (a copy of jQuery, a base64 image) easily exceed this.
 */
export const MAX_FILES_JSON_BYTES = 200 * 1024;

/** Threshold at which the client should start warning the candidate. */
export const FILES_JSON_WARN_BYTES = Math.floor(MAX_FILES_JSON_BYTES * 0.8);

export type FilesSizeCheck =
  | { ok: true; bytes: number }
  | { ok: false; bytes: number; reason: string };

export function checkFilesSize(files: Record<string, string> | string): FilesSizeCheck {
  const serialized = typeof files === "string" ? files : JSON.stringify(files);
  // Byte length (not char count) — multi-byte chars otherwise undercount.
  const bytes = typeof Buffer !== "undefined"
    ? Buffer.byteLength(serialized, "utf8")
    : new TextEncoder().encode(serialized).length;
  if (bytes > MAX_FILES_JSON_BYTES) {
    return {
      ok: false,
      bytes,
      reason: `Files payload is ${(bytes / 1024).toFixed(1)}KB — exceeds the ${MAX_FILES_JSON_BYTES / 1024}KB limit. Remove large pasted content (libraries, base64 images, etc.) and try again.`,
    };
  }
  return { ok: true, bytes };
}
