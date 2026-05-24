import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const assignment = await prisma.takeHomeAssignment.findUnique({
    where: { token },
    include: { challenge: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const now = new Date();
  const isPastExpiration = now > assignment.expiresAt;

  if (assignment.status === "EXPIRED" || (assignment.status === "PENDING" && isPastExpiration)) {
    if (assignment.status === "PENDING") {
      await prisma.takeHomeAssignment.update({
        where: { token },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json({ error: "Assignment has expired" }, { status: 400 });
  }

  if (assignment.status === "SUBMITTED") {
    return NextResponse.json({ error: "Assignment has already been completed" }, { status: 400 });
  }

  let attemptId = assignment.attemptId;
  const activeChallengeSlug = assignment.challenge.slug;

  if (assignment.status === "PENDING") {
    // Fetch step 0 details
    const firstStep = await prisma.challengeStep.findFirst({
      where: { challengeId: assignment.challengeId, position: 0 },
      select: { id: true, starterFiles: true },
    });

    if (!firstStep) {
      return NextResponse.json(
        { error: "Challenge questions have not been set up properly." },
        { status: 500 }
      );
    }

    // Upsert candidate User by email so attempts belong to a valid record
    let candidateUser = await prisma.user.findFirst({
      where: { email: { equals: assignment.candidateEmail } },
    });

    if (!candidateUser) {
      candidateUser = await prisma.user.create({
        data: {
          name: assignment.candidateName,
          email: assignment.candidateEmail.toLowerCase(),
          portfolioPublic: false,
        },
      });
    }

    // Auto-create ChallengeAttempt
    const attempt = await prisma.challengeAttempt.create({
      data: {
        userId: candidateUser.id,
        challengeId: assignment.challengeId,
        stepId: firstStep.id,
        status: "in_progress",
        files: firstStep.starterFiles,
        testResults: JSON.stringify({ passed: 0, total: 0, tests: [] }),
        durationSec: 0,
      },
    });

    // Update assignment to ACTIVE and link the attemptId
    await prisma.takeHomeAssignment.update({
      where: { token },
      data: {
        status: "ACTIVE",
        startedAt: now,
        attemptId: attempt.id,
      },
    });

    attemptId = attempt.id;
  }

  return NextResponse.json({ ok: true, slug: activeChallengeSlug, attemptId });
}
