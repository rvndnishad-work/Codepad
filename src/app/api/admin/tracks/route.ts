import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// POST /api/admin/tracks
// Creates a new ChallengeTrack plus its ordered ChallengeTrackItem rows.
// Body shape:
//   { slug, title, description, tagline?, coverImage?, tech, tags?,
//     difficulty, published, featured, items: [{challengeId, note?}, ...] }
//
// `items` order in the array IS the position. We assign 0..N-1 inside a
// single transaction so a half-created track can never exist.
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        featured?: boolean;
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
          featured: !!body.featured,
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
    // Likely a uniqueness violation on slug — surface a friendlier error.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A track with that slug already exists" },
        { status: 409 }
      );
    }
    console.error("Track create error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
