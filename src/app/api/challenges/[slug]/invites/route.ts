import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

// 128 bits of entropy, URL-safe — same pattern as the Track equivalent.
function makeToken(): string {
  return randomBytes(16).toString("base64url");
}

// "has an @ with non-empty parts and a dot in the domain" — permissive but
// not insane. Identical helper to the Track invites route so a copy-paste
// from one to the other behaves the same.
function looksLikeEmail(raw: string): boolean {
  const e = raw.trim().toLowerCase();
  if (e.length < 5 || e.length > 254) return false;
  const at = e.indexOf("@");
  if (at <= 0 || at >= e.length - 3) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  return local.length > 0 && /\./.test(domain) && !/\s/.test(e);
}

// Look up a Challenge by slug and authorise the caller as author OR admin.
// Returns the resolved challenge id and slug, or a NextResponse error to
// bubble up.
async function authorise(
  slug: string,
  userId: string,
  callerIsAdmin: boolean
): Promise<
  | { kind: "ok"; id: string; slug: string }
  | { kind: "error"; response: NextResponse }
> {
  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, slug: true, authorId: true },
  });
  if (!challenge) {
    return {
      kind: "error",
      response: NextResponse.json({ error: "Challenge not found" }, { status: 404 }),
    };
  }
  if (challenge.authorId !== userId && !callerIsAdmin) {
    return {
      kind: "error",
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { kind: "ok", id: challenge.id, slug: challenge.slug };
}

// GET /api/challenges/[slug]/invites — author/admin only.
export async function GET(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { slug } = await params;
  const result = await authorise(slug, userId, await staffCan(session, "content:curate"));
  if (result.kind === "error") return result.response;

  const invitations = await prisma.challengeInvitation.findMany({
    where: { challengeId: result.id },
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
  return NextResponse.json({ challengeSlug: result.slug, invitations });
}

// POST /api/challenges/[slug]/invites — batch invite by email.
// Idempotent: re-inviting an email that already has a row returns the
// existing token instead of generating a new one.
export async function POST(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { slug } = await params;
  const result = await authorise(slug, userId, await staffCan(session, "content:curate"));
  if (result.kind === "error") return result.response;

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
    return NextResponse.json(
      { error: "No valid email addresses provided" },
      { status: 400 }
    );
  }
  if (cleaned.length > 50) {
    return NextResponse.json(
      { error: "Up to 50 invitations per request" },
      { status: 400 }
    );
  }

  const existing = await prisma.challengeInvitation.findMany({
    where: { challengeId: result.id, email: { in: cleaned } },
    select: { id: true, email: true },
  });
  const existingByEmail = new Map(existing.map((e) => [e.email, e.id]));

  const toCreate = cleaned.filter((e) => !existingByEmail.has(e));
  if (toCreate.length > 0) {
    await prisma.challengeInvitation.createMany({
      data: toCreate.map((email) => ({
        challengeId: result.id,
        email,
        token: makeToken(),
        invitedById: userId,
        status: "pending",
      })),
    });
  }

  const all = await prisma.challengeInvitation.findMany({
    where: { challengeId: result.id, email: { in: cleaned } },
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
  return NextResponse.json({ challengeSlug: result.slug, invitations: all });
}
