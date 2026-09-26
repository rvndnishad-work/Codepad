/**
 * Signed OAuth `state` for the calendar connect flow. It carries who started
 * the flow and for which workspace, and expires after ten minutes, so the
 * callback cannot be replayed or pointed at someone else's account.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isCalendarProvider, type CalendarProvider } from "./providers";

export type CalendarState = { u: string; w: string; s: string; p: CalendarProvider; n: string; exp: number; r?: string };

const TTL_MS = 10 * 60_000;

function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
}

const sign = (body: string, key: string) => createHmac("sha256", `calendar-state:${key}`).update(body).digest("base64url");

export function signState(v: { userId: string; workspaceId: string; slug: string; provider: CalendarProvider; returnTo?: string | null }, now = Date.now(), key = secret()): string {
  const payload: CalendarState = { u: v.userId, w: v.workspaceId, s: v.slug, p: v.provider, n: randomBytes(8).toString("hex"), exp: now + TTL_MS, ...(v.returnTo ? { r: v.returnTo } : {}) };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

export function verifyState(raw: string | null | undefined, now = Date.now(), key = secret()): CalendarState | null {
  if (!raw || raw.length > 2000) return null;
  const [body, mac] = raw.split(".");
  if (!body || !mac) return null;
  const want = Buffer.from(sign(body, key));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const v = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CalendarState;
    if (typeof v.u !== "string" || typeof v.w !== "string" || typeof v.s !== "string" || !isCalendarProvider(v.p) || typeof v.exp !== "number") return null;
    if (v.exp < now) return null;
    if (v.r !== undefined && typeof v.r !== "string") return null;
    return v;
  } catch {
    return null;
  }
}
