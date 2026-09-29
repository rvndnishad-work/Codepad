/**
 * Workspace interview room: rounds on the shared stage and where their code
 * lives in the room document. Pure, shared by the server and the browser.
 */

export type RoundKind = "challenge" | "playground" | "prompt";
export type RoundRef = { kind: RoundKind; id: string; step: number };

const PREFIX: Record<RoundKind, string> = { challenge: "c", playground: "p", prompt: "q" };
const KIND: Record<string, RoundKind> = { c: "challenge", p: "playground", q: "prompt" };

/** "c:<challengeId>:<step>", "p:<snippetId>", "q:<promptScenarioId>". */
export function roundKey(r: RoundRef): string {
  return r.kind === "challenge" ? `c:${r.id}:${r.step}` : `${PREFIX[r.kind]}:${r.id}`;
}

export function parseRound(raw: string | null | undefined): RoundRef | null {
  if (!raw) return null;
  const m = /^([cpq]):([A-Za-z0-9_-]{1,64})(?::(\d{1,2}))?$/.exec(raw);
  if (!m) return null;
  const kind = KIND[m[1]];
  if (kind !== "challenge" && m[3] !== undefined) return null;
  return { kind, id: m[2], step: m[3] ? parseInt(m[3], 10) : 0 };
}

/** Name of the shared text holding one file of one round. */
export function roundText(key: string, path: string): string {
  return `round:${key}:${path}`;
}

/** Shared map with per-round settings (language picked, last test run). */
export const ROUND_META = "roundMeta";

export type RoomAction =
  | { type: "start" }
  | { type: "end"; verdict?: "success" | "failed" | "left_in_between" | "suspicious" | null }
  | { type: "round"; round: string | null };

/** Minutes and seconds, "4:05" or "1:02:03". */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}
