/**
 * Read-only share links for an AI screening report.
 *
 * A link is a row in AIReportShareLink plus a signed token in the URL. The
 * token names the row and carries the expiry, so a forged or edited token is
 * rejected before any database read, and an expired one is rejected even if
 * the row is gone. Revoking is a database flag (revokedAt) that the page
 * checks on every view, so a revoked link stops working straight away.
 *
 * Signed with a key derived from AUTH_SECRET, separate from the room-pass key.
 * Server only.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { SHARE_LINK_DAYS } from "./report-extras";

export { SHARE_LINK_DAYS };
const DAY_MS = 24 * 60 * 60 * 1000;

export type SharePayload = {
  /** AIReportShareLink id. */
  l: string;
  /** Expiry, epoch seconds. */
  e: number;
};

export type ShareCheck = { ok: true; linkId: string; expiresAt: Date } | { ok: false; reason: "malformed" | "signature" | "expired" };

function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set, share links cannot be signed.");
  return s;
}

function key(base: string): Buffer {
  return createHmac("sha256", base).update("ai-report-share:v1").digest();
}

function sign(body: string, base: string): string {
  return createHmac("sha256", key(base)).update(body).digest("base64url");
}

/** When a link created now should stop working. */
export function shareExpiry(nowMs = Date.now(), days = SHARE_LINK_DAYS): Date {
  return new Date(nowMs + days * DAY_MS);
}

export function signShareToken(linkId: string, expiresAt: Date, base = secret()): string {
  const payload: SharePayload = { l: linkId, e: Math.floor(expiresAt.getTime() / 1000) };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, base)}`;
}

/** Checks the signature (constant time) and the expiry. Revocation is checked by the caller against the row. */
export function verifyShareToken(raw: string | null | undefined, nowMs = Date.now(), base = secret()): ShareCheck {
  if (!raw || raw.length > 400) return { ok: false, reason: "malformed" };
  const dot = raw.indexOf(".");
  if (dot < 1 || dot === raw.length - 1 || raw.indexOf(".", dot + 1) !== -1) return { ok: false, reason: "malformed" };
  const body = raw.slice(0, dot);
  const want = Buffer.from(sign(body, base));
  const got = Buffer.from(raw.slice(dot + 1));
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: "signature" };
  let p: SharePayload;
  try {
    p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SharePayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!p || typeof p.l !== "string" || !p.l || typeof p.e !== "number" || !Number.isFinite(p.e)) return { ok: false, reason: "malformed" };
  if (p.e * 1000 <= nowMs) return { ok: false, reason: "expired" };
  return { ok: true, linkId: p.l, expiresAt: new Date(p.e * 1000) };
}

export type ShareLinkState = "active" | "expired" | "revoked";

/** Where a stored link stands, for the list in the share dialog. */
export function shareLinkState(link: { expiresAt: Date | string; revokedAt: Date | string | null }, nowMs = Date.now()): ShareLinkState {
  if (link.revokedAt) return "revoked";
  return new Date(link.expiresAt).getTime() <= nowMs ? "expired" : "active";
}
