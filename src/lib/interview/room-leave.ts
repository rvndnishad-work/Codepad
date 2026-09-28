/**
 * "The candidate left on purpose": when a candidate confirms Leave (the
 * call's hang up or the Leave button), their browser writes this note into
 * the shared room document before it disconnects. The interviewer's room
 * shows it, so a hang up is not mistaken for a dropped connection. The
 * note is cleared when the candidate comes back.
 */
import type * as Y from "yjs";

export const LEFT_MAP = "presence";
export const LEFT_KEY = "candidateLeft";

export type LeftVia = "hangup" | "leave";
export type LeftNote = { at: number; via: LeftVia };

export function parseLeftNote(raw: unknown): LeftNote | null {
  if (typeof raw !== "string") return null;
  try {
    const j = JSON.parse(raw) as Partial<LeftNote>;
    if (typeof j.at !== "number" || !Number.isFinite(j.at)) return null;
    return { at: j.at, via: j.via === "hangup" ? "hangup" : "leave" };
  } catch {
    return null;
  }
}

export function markLeft(doc: Y.Doc, note: LeftNote): void {
  doc.getMap<string>(LEFT_MAP).set(LEFT_KEY, JSON.stringify(note));
}

/** The candidate is back: clears the note. Returns whether there was one. */
export function clearLeft(doc: Y.Doc): boolean {
  const m = doc.getMap<string>(LEFT_MAP);
  if (!m.has(LEFT_KEY)) return false;
  m.delete(LEFT_KEY);
  return true;
}
