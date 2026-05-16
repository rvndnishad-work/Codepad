import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/tracks
// User-facing track creation. Same payload shape as the admin endpoint but:
//   - `authorId` is forced to the current user (anti-impersonation).
//   - `featured` is ignored (admin-only flag).
//   - Banned users are rejected.
//   - `published` defaults to false; the user flips the toggle when ready.
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // Block banned users from publishing community content.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true },
  });
  if (!user || user.banned) {
    return NextResponse.json({ error: "Account cannot publish content" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        slug?: string;
        title?: string;
        description?: string;
        tagline?: string;
        coverImage?: string;
        tech?: string;
        tags?: string[];
        difficulty?: string;
        published?: boolean;
        visibility?: string;
        items?: { challengeId: string; note?: string; videoUrl?: string; hint?: string }[];
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.slug?.trim() || !body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json(
      { error: "slug, title, and description are required" },
      { status: 400 }
    );
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "At least one challenge item is required" },
      { status: 400 }
    );
  }

  // Validate that every referenced challenge is actually published. Otherwise
  // users could compose a track from draft / hidden challenges and leak them
  // through the track detail page.
  const challengeIds = body.items.map((it) => it.challengeId);
  const validChallenges = await prisma.challenge.findMany({
    where: { id: { in: challengeIds }, published: true },
    select: { id: true },
  });
  if (validChallenges.length !== challengeIds.length) {
    return NextResponse.json(
      { error: "One or more challenges are unavailable" },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const track = await tx.challengeTrack.create({
        data: {
          slug: body.slug!.trim(),
          title: body.title!.trim(),
          description: body.description!,
          tagline: body.tagline || null,
          coverImage: body.coverImage || null,
          tech: body.tech || "general",
          tags: body.tags && body.tags.length ? JSON.stringify(body.tags) : null,
          difficulty: body.difficulty || "mixed",
          published: !!body.published,
          visibility: body.visibility === "private" ? "private" : "public",
          // featured is admin-only. Always false on user-created tracks.
          featured: false,
          authorId: userId,
        },
      });
      await tx.challengeTrackItem.createMany({
        data: body.items!.map((it, i) => ({
          trackId: track.id,
          challengeId: it.challengeId,
          position: i,
          note: it.note || null,
          videoUrl: it.videoUrl || null,
          hint: it.hint || null,
        })),
      });
      return track;
    });
    return NextResponse.json({ id: created.id, slug: created.slug });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A track with that slug already exists — try a different one" },
        { status: 409 }
      );
    }
    console.error("Track create error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
