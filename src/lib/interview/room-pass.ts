/**
 * Room passes: signed, expiring links into one workspace interview room.
 *
 * A pass names one room, one person (the candidate, or one emailed
 * interviewer) and an expiry. It is signed with a key derived from the
 * server secret and the room's share token, so rotating the share token
 * voids every pass issued for that room. The join route swaps the pass for
 * an httpOnly cookie, so it never stays in the address bar. Server only.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type RoomPassRole = "candidate" | "guest";

export type RoomPass = {
  /** Interview session id. */
  s: string;
  r: RoomPassRole;
  /** InterviewGuest id, for emailed interviewers. */
  g?: string;
  /** Expiry, epoch seconds. */
  e: number;
  /** Nonce, so two passes issued in the same second differ. */
  n: string;
};

/** Cookie holding the pass for one room. Scoped by name, not path, because
 * the room's API routes live under /api. */
export function roomCookieName(sessionId: string): string {
  return `ipr_${sessionId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

const HOUR = 3600;
/** Links stay valid this long after the planned end, for overruns and late reports. */
const GRACE_AFTER_END = 24 * HOUR;
/** Unscheduled interviews: the link works this long from when it is issued. */
const UNSCHEDULED_TTL = 14 * 24 * HOUR;
/** Never longer than this, however far out the interview is. */
const MAX_TTL = 60 * 24 * HOUR;

/** When a pass issued now should stop working. */
export function passExpiry(s: { scheduledAt: Date | null; totalSec: number }, nowMs = Date.now()): number {
  const now = Math.floor(nowMs / 1000);
  const planned = s.scheduledAt ? Math.floor(s.scheduledAt.getTime() / 1000) + s.totalSec + GRACE_AFTER_END : now + UNSCHEDULED_TTL;
  return Math.min(Math.max(planned, now + 2 * HOUR), now + MAX_TTL);
}

function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set, room links cannot be signed.");
  return s;
}

function roomKey(shareToken: string, base = secret()): Buffer {
  return createHmac("sha256", base).update(`interview-room-pass:${shareToken}`).digest();
}

function sign(body: string, shareToken: string, base?: string): string {
  return createHmac("sha256", roomKey(shareToken, base)).update(body).digest("base64url");
}

export function signRoomPass(
  p: { sessionId: string; role: RoomPassRole; guestId?: string; expiresAt: number },
  shareToken: string,
  base?: string,
): string {
  const pass: RoomPass = { s: p.sessionId, r: p.role, e: p.expiresAt, n: randomBytes(6).toString("base64url") };
  if (p.guestId) pass.g = p.guestId;
  const body = Buffer.from(JSON.stringify(pass)).toString("base64url");
  return `${body}.${sign(body, shareToken, base)}`;
}

export type PassCheck = { ok: true; pass: RoomPass } | { ok: false; reason: "malformed" | "signature" | "room" | "expired" };

/** Checks a pass against the room it claims to open. Constant time on the signature. */
export function verifyRoomPass(
  raw: string | null | undefined,
  room: { id: string; shareToken: string },
  nowMs = Date.now(),
  base?: string,
): PassCheck {
  if (!raw || raw.length > 600) return { ok: false, reason: "malformed" };
  const dot = raw.indexOf(".");
  if (dot < 1 || dot === raw.length - 1) return { ok: false, reason: "malformed" };
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const want = Buffer.from(sign(body, room.shareToken, base));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: "signature" };
  let pass: RoomPass;
  try {
    pass = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RoomPass;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!pass || typeof pass.s !== "string" || (pass.r !== "candidate" && pass.r !== "guest") || typeof pass.e !== "number") {
    return { ok: false, reason: "malformed" };
  }
  if (pass.r === "guest" && typeof pass.g !== "string") return { ok: false, reason: "malformed" };
  if (pass.s !== room.id) return { ok: false, reason: "room" };
  if (pass.e * 1000 <= nowMs) return { ok: false, reason: "expired" };
  return { ok: true, pass };
}

/** Reads one cookie from a raw Cookie header. */
export function cookieFrom(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}
