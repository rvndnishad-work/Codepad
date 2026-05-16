import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/tracks/[id]
// Author-edit-self path (parallels the admin endpoint, but ownership-gated).
// The `featured` field is silently ignored unless the caller is an admin —
// users can flip publish state on their own tracks but never self-feature.
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  const track = await prisma.challengeTrack.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const callerIsAdmin = isAdmin(session);
  const callerIsAuthor = track.authorId === userId;
  if (!callerIsAdmin && !callerIsAuthor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        slug?: string;
        title?: string;
        description?: string;
        tagline?: string | null;
        coverImage?: string | null;
        tech?: string;
        tags?: string[];
        difficulty?: string;
        published?: boolean;
        visibility?: string;
        featured?: boolean;
        items?: { challengeId: string; note?: string; videoUrl?: string; hint?: string }[];
      }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Same published-only safety check as create: prevent users from referencing
  // draft challenges in an item list.
  if (Array.isArray(body.items) && body.items.length > 0) {
    const ids = body.items.map((it) => it.challengeId);
    const validCount = await prisma.challenge.count({
      where: { id: { in: ids }, published: true },
    });
    if (validCount !== ids.length) {
      return NextResponse.json(
        { error: "One or more challenges are unavailable" },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.challengeTrack.update({
        where: { id },
        data: {
          slug: body.slug?.trim(),
          title: body.title?.trim(),
          description: body.description,
          tagline: body.tagline === undefined ? undefined : body.tagline || null,
          coverImage: body.coverImage === undefined ? undefined : body.coverImage || null,
          tech: body.tech,
          tags:
            body.tags === undefined
              ? undefined
              : body.tags.length
              ? JSON.stringify(body.tags)
              : null,
          difficulty: body.difficulty,
          published: body.published,
          visibility:
            body.visibility === undefined
              ? undefined
              : body.visibility === "private"
              ? "private"
              : "public",
          // featured can only be touched by admins.
          featured: callerIsAdmin ? body.featured : undefined,
        },
      });
      if (Array.isArray(body.items)) {
        await tx.challengeTrackItem.deleteMany({ where: { trackId: id } });
        if (body.items.length > 0) {
          await tx.challengeTrackItem.createMany({
            data: body.items.map((it, i) => ({
              trackId: id,
              challengeId: it.challengeId,
              position: i,
              note: it.note || null,
              videoUrl: it.videoUrl || null,
              hint: it.hint || null,
            })),
          });
        }
      }
      return t;
    });
    return NextResponse.json({ id: updated.id, slug: updated.slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Slug already in use by another track" },
        { status: 409 }
      );
    }
    console.error("Track update error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;
  const track = await prisma.challengeTrack.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }
  if (track.authorId !== userId && !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await prisma.challengeTrack.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track delete error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
