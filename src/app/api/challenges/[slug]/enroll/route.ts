import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

// Same cap as the Track equivalent so the dashboard stays focused.
const MAX_ACTIVE_ENROLLMENTS = 5;

// POST /api/challenges/[slug]/enroll
// Idempotent: existing enrollment is flipped back to "active" and
// lastVisitedAt is touched. If the cap is hit, auto-stash the oldest
// active enrollment so the new one can take its place.
export async function POST(_req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { slug } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, published: true, visibility: true, authorId: true },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }
  if (!challenge.published) {
    return NextResponse.json(
      { error: "Challenge is not yet published" },
      { status: 403 }
    );
  }
  // Private challenges still allow enrolling for anyone who can already view
  // them (the detail page enforces invite acceptance before we get here).
  // We don't re-check the invite here — that's the read path's job.

  const existing = await prisma.challengeEnrollment.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  });

  if (existing) {
    const updated = await prisma.challengeEnrollment.update({
      where: { id: existing.id },
      data: {
        status: "active",
        lastVisitedAt: new Date(),
        completedAt:
          existing.status === "completed" ? null : existing.completedAt,
      },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  const activeCount = await prisma.challengeEnrollment.count({
    where: { userId, status: "active" },
  });
  if (activeCount >= MAX_ACTIVE_ENROLLMENTS) {
    const oldest = await prisma.challengeEnrollment.findFirst({
      where: { userId, status: "active" },
      orderBy: { lastVisitedAt: "asc" },
    });
    if (oldest) {
      await prisma.challengeEnrollment.update({
        where: { id: oldest.id },
        data: { status: "stashed" },
      });
    }
  }

  const created = await prisma.challengeEnrollment.create({
    data: { userId, challengeId: challenge.id, status: "active" },
  });
  return NextResponse.json({ id: created.id, status: created.status });
}

// PATCH /api/challenges/[slug]/enroll
// Body: { status: "active" | "stashed" | "abandoned" | "completed" }
// User-driven status transition — used by the dashboard Stash/Remove
// actions and (eventually) by a "Mark complete" override.
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { slug } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const allowed = ["active", "stashed", "abandoned", "completed"] as const;
  if (!body || !body.status || !allowed.includes(body.status as (typeof allowed)[number])) {
    return NextResponse.json(
      { error: `status must be one of ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  const existing = await prisma.challengeEnrollment.findUnique({
    where: { userId_challengeId: { userId, challengeId: challenge.id } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 404 });
  }
  const updated = await prisma.challengeEnrollment.update({
    where: { id: existing.id },
    data: {
      status: body.status,
      lastVisitedAt: new Date(),
      completedAt: body.status === "completed" ? new Date() : existing.completedAt,
    },
  });
  return NextResponse.json({ id: updated.id, status: updated.status });
}
