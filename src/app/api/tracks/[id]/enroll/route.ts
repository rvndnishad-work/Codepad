import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// Caps the number of *active* enrollments per user. Hitting the cap auto-
// stashes the oldest active enrollment so the new one can take its slot
// without forcing the user to manually free a seat. Configurable via env
// later if needed; 5 is the value cited in the feature plan.
const MAX_ACTIVE_ENROLLMENTS = 5;

// POST /api/tracks/[id]/enroll
// Idempotent: if the user already has an enrollment for this track, we
// move it back to "active" and touch lastVisitedAt. Otherwise create one.
// If the active cap is reached, auto-stash the oldest active enrollment.
export async function POST(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const track = await prisma.challengeTrack.findUnique({
      where: { id },
      select: { id: true, published: true },
    });
    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }
    if (!track.published) {
      return NextResponse.json(
        { error: "Track is not yet published" },
        { status: 403 }
      );
    }

    const existing = await prisma.challengeTrackEnrollment.findUnique({
      where: { userId_trackId: { userId, trackId: id } },
    });

    if (existing) {
      const updated = await prisma.challengeTrackEnrollment.update({
        where: { id: existing.id },
        data: {
          status: "active",
          lastVisitedAt: new Date(),
          // If they had completed and re-started, clear completedAt so the
          // "completed" badge doesn't follow them around mid-restart.
          completedAt: existing.status === "completed" ? null : existing.completedAt,
        },
      });
      return NextResponse.json({ id: updated.id, status: updated.status });
    }

    // Enforce active cap by auto-stashing the oldest active enrollment that
    // isn't this one. This keeps the dashboard tidy and matches the plan's
    // §9 #2 cap-at-5 rule.
    const activeCount = await prisma.challengeTrackEnrollment.count({
      where: { userId, status: "active" },
    });
    if (activeCount >= MAX_ACTIVE_ENROLLMENTS) {
      const oldest = await prisma.challengeTrackEnrollment.findFirst({
        where: { userId, status: "active" },
        orderBy: { lastVisitedAt: "asc" },
      });
      if (oldest) {
        await prisma.challengeTrackEnrollment.update({
          where: { id: oldest.id },
          data: { status: "stashed" },
        });
      }
    }

    const created = await prisma.challengeTrackEnrollment.create({
      data: { userId, trackId: id, status: "active" },
    });
    return NextResponse.json({ id: created.id, status: created.status });
  } catch (err) {
    console.error("Track enroll error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/tracks/[id]/enroll
// Body: { status: "active" | "stashed" | "abandoned" | "completed" }
// User-driven status transitions: stash, un-stash, abandon, manually mark
// complete (rare — we'd usually auto-set this when the last challenge passes,
// but exposing it gives the user an override).
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const allowed = ["active", "stashed", "abandoned", "completed"] as const;
  if (!body || !body.status || !allowed.includes(body.status as (typeof allowed)[number])) {
    return NextResponse.json(
      { error: `status must be one of ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.challengeTrackEnrollment.findUnique({
      where: { userId_trackId: { userId, trackId: id } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 404 });
    }
    const updated = await prisma.challengeTrackEnrollment.update({
      where: { id: existing.id },
      data: {
        status: body.status,
        lastVisitedAt: new Date(),
        completedAt: body.status === "completed" ? new Date() : existing.completedAt,
      },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    console.error("Track enroll PATCH error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
