import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";

const takeHomeSchema = z.object({
  candidateName: z.string().min(2).max(100),
  candidateEmail: z.string().email(),
  challengeId: z.string(),
  timeLimitMin: z.number().int().min(15).max(1440),
  daysToExpire: z.number().int().min(1).max(90),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const activeUserId = session.user.id;

  // Verify workspace exists and user is a member
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: { members: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const isMember = workspace.members.some((m) => m.userId === activeUserId);
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden: You are not in this workspace." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = takeHomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { candidateName, candidateEmail, challengeId, timeLimitMin, daysToExpire } = parsed.data;

  // Verify challenge is accessible
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, title: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Create expiring parameters
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysToExpire);

  try {
    const normalizedEmail = candidateEmail.toLowerCase().trim();

    // Upsert the first-class Candidate row so this candidate appears in the
    // workspace's CRM roster going forward. New rows start at stage=TAKE_HOME
    // (they're receiving a take-home, so APPLIED would already be stale).
    // EXISTING rows keep their stage — auto-forward-transition is IP-69.
    const candidate = await prisma.candidate.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email: normalizedEmail } },
      update: { name: candidateName },
      create: {
        workspaceId: workspace.id,
        name: candidateName,
        email: normalizedEmail,
        source: "take-home",
        status: "active",
        stage: "TAKE_HOME",
        stageChangedAt: new Date(),
      },
    });

    const takeHome = await prisma.takeHomeAssignment.create({
      data: {
        workspaceId: workspace.id,
        challengeId,
        candidateName,
        candidateEmail: normalizedEmail,
        candidateId: candidate.id,
        token,
        status: "PENDING",
        expiresAt,
        timeLimitMin,
      },
    });

    return NextResponse.json({
      ok: true,
      takeHome: {
        id: takeHome.id,
        candidateName: takeHome.candidateName,
        candidateEmail: takeHome.candidateEmail,
        token: takeHome.token,
        status: takeHome.status,
        expiresAt: takeHome.expiresAt.toISOString(),
        timeLimitMin: takeHome.timeLimitMin,
        startedAt: null,
        submittedAt: null,
        challengeTitle: challenge.title,
        attemptId: null,
        score: null,
      },
    });
  } catch (err) {
    console.error("Take-home generation failed:", err);
    return NextResponse.json({ error: "Failed to generate take-home invitation" }, { status: 500 });
  }
}
