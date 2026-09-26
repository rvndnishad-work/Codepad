/**
 * Invite links land here. The signed pass in `?k=` is checked and swapped for
 * an httpOnly cookie for this one room, then the browser goes on to the
 * lobby with a clean address bar (nothing to leak in a screenshot, the
 * history or a referrer).
 *
 * Links sent before the workspace room existed (`?t=<share token>` for the
 * candidate, `?g=<guest key>` for an emailed interviewer) are accepted while
 * the interview is still open and get the same cookie.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guestFor } from "@/lib/interview/guests";
import { passExpiry, roomCookieName, signRoomPass, verifyRoomPass } from "@/lib/interview/room-pass";

const OPEN = new Set(["scheduled", "in_progress"]);

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const url = new URL(req.url);
  const lobby = new URL(`/w/${encodeURIComponent(slug)}/interviews/${encodeURIComponent(id)}/lobby`, url);
  const fail = (why: string) => {
    lobby.searchParams.set("link", why);
    return NextResponse.redirect(lobby, { status: 303 });
  };

  const s = await prisma.interviewSession.findUnique({
    where: { id },
    select: { id: true, shareToken: true, status: true, scheduledAt: true, totalSec: true, type: true, creatorRole: true, workspace: { select: { slug: true } } },
  });
  if (!s || s.type !== "live" || s.workspace?.slug !== slug) return fail("invalid");

  let pass: string | null = null;
  const k = url.searchParams.get("k");
  const t = url.searchParams.get("t");
  const g = url.searchParams.get("g");
  if (k) {
    const check = verifyRoomPass(k, s);
    if (!check.ok) return fail(check.reason === "expired" ? "expired" : "invalid");
    pass = k;
  } else if (t && OPEN.has(s.status) && t === s.shareToken && s.creatorRole === "interviewer") {
    pass = signRoomPass({ sessionId: s.id, role: "candidate", expiresAt: passExpiry(s) }, s.shareToken);
  } else if (g && OPEN.has(s.status)) {
    const guest = await guestFor(s.id, g);
    if (!guest) return fail("invalid");
    pass = signRoomPass({ sessionId: s.id, role: "guest", guestId: guest.id, expiresAt: passExpiry(s) }, s.shareToken);
  } else {
    return fail(t || g ? "expired" : "invalid");
  }

  const check = verifyRoomPass(pass, s);
  const exp = check.ok ? check.pass.e : Math.floor(Date.now() / 1000) + 3600;
  const res = NextResponse.redirect(lobby, { status: 303 });
  res.cookies.set(roomCookieName(s.id), pass, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: Math.max(60, exp - Math.floor(Date.now() / 1000)),
  });
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
