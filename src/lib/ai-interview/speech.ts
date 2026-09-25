/**
 * Browser speech recognition hands back a list of phrases per session. On
 * desktop Chrome each phrase is new speech, but Chrome on Android (and some
 * other engines) re-sends the whole utterance so far as every phrase:
 * "18", "18 years", "18 years of experience". Appending those verbatim
 * produced answers like "18 18 years 18 years of experience".
 *
 * `joinPhrases` rebuilds the text from the full list each time and folds a
 * phrase into the one before it when either repeats the other.
 */
export function joinPhrases(phrases: readonly string[]): string {
  const out: string[] = [];
  for (const raw of phrases) {
    const p = raw.replace(/\s+/g, " ").trim();
    if (!p) continue;
    const last = out[out.length - 1];
    if (last !== undefined) {
      const a = norm(last);
      const b = norm(p);
      if (b.startsWith(a)) {
        out[out.length - 1] = p; // the new phrase extends the last one
        continue;
      }
      if (a.startsWith(b)) continue; // an older, shorter copy of the last one
    }
    out.push(p);
  }
  return out.join(" ");
}

/** Text of a recognition event's full result list, repeats folded. */
export function transcriptOf(results: ArrayLike<ArrayLike<{ transcript: string }>>): string {
  const phrases: string[] = [];
  for (let i = 0; i < results.length; i++) phrases.push(results[i][0]?.transcript ?? "");
  return joinPhrases(phrases);
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
