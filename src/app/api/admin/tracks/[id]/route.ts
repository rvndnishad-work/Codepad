import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/admin/tracks/[id]
// Update a track's scalar fields and/or replace its ordered item list.
// Items are replaced wholesale (delete-then-create-many) inside a transaction
// because partial updates on an ordered join table are error-prone — we'd
// have to reconcile positions, deal with reorders, etc. Wholesale replace is
// simple and correct.
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
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

  try {
    const existing = await prisma.challengeTrack.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

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
          featured: body.featured,
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
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.challengeTrack.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track delete error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
