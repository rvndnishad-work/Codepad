import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// Track invitation tokens are opaque, URL-safe, ~22 chars. 128 bits of
// entropy is plenty for magic links that never enter a search index.
function makeToken(): string {
  return randomBytes(16).toString("base64url");
}

// Permissive but real email validation. We don't want to over-reject (real
// users have addresses with `+` and dots in odd places), so the rule is just
// "has an @ with non-empty parts on either side, plus a dot in the domain."
function looksLikeEmail(raw: string): boolean {
  const e = raw.trim().toLowerCase();
  if (e.length < 5 || e.length > 254) return false;
  const at = e.indexOf("@");
  if (at <= 0 || at >= e.length - 3) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  return local.length > 0 && /\./.test(domain) && !/\s/.test(e);
}

// GET /api/tracks/[id]/invites
// Returns the invitation list for the track. Only the author or admin can
// see it (knowing who's been invited shouldn't be a public surface).
export async function GET(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;
  const track = await prisma.challengeTrack.findUnique({
    where: { id },
    select: { id: true, authorId: true, slug: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }
  if (track.authorId !== userId && !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.trackInvitation.findMany({
    where: { trackId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      status: true,
      token: true,
      acceptedAt: true,
      createdAt: true,
      user: { select: { id: true, name: true, image: true } },
    },
  });
  return NextResponse.json({ trackSlug: track.slug, invitations });
}

// POST /api/tracks/[id]/invites
// Body: { emails: string[] }
// Creates one invitation per email. Idempotent: re-inviting an existing
// (trackId, email) pair returns the existing row instead of erroring.
export async function POST(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;

  const track = await prisma.challengeTrack.findUnique({
    where: { id },
    select: { id: true, authorId: true, slug: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }
  if (track.authorId !== userId && !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { emails?: unknown } | null;
  if (!body || !Array.isArray(body.emails)) {
    return NextResponse.json({ error: "emails[] required" }, { status: 400 });
  }
  const cleaned: string[] = [];
  for (const e of body.emails) {
    if (typeof e !== "string") continue;
    const lower = e.trim().toLowerCase();
    if (!looksLikeEmail(lower)) continue;
    if (cleaned.includes(lower)) continue;
    cleaned.push(lower);
  }
  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No valid email addresses provided" }, { status: 400 });
  }

  // Cap per-request batch so an over-eager paste doesn't blow up. Authors who
  // need more can repeat the call; we don't (yet) enforce a per-track cap.
  if (cleaned.length > 50) {
    return NextResponse.json(
      { error: "Up to 50 invitations per request" },
      { status: 400 }
    );
  }

  // Look up existing rows for these emails on this track so we can upsert in
  // a single query each.
  const existing = await prisma.trackInvitation.findMany({
    where: { trackId: id, email: { in: cleaned } },
    select: { id: true, email: true },
  });
  const existingByEmail = new Map(existing.map((e) => [e.email, e.id]));

  const toCreate = cleaned.filter((e) => !existingByEmail.has(e));
  if (toCreate.length > 0) {
    await prisma.trackInvitation.createMany({
      data: toCreate.map((email) => ({
        trackId: id,
        email,
        token: makeToken(),
        invitedById: userId,
        status: "pending",
      })),
    });
  }

  const all = await prisma.trackInvitation.findMany({
    where: { trackId: id, email: { in: cleaned } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      token: true,
      status: true,
      acceptedAt: true,
      createdAt: true,
      user: { select: { id: true, name: true, image: true } },
    },
  });
  return NextResponse.json({ trackSlug: track.slug, invitations: all });
}
