import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const submitSchema = z.object({
  files: z.record(z.string(), z.union([z.string(), z.object({ code: z.string() })])),
  testResults: z.object({
    passed: z.number().int().min(0),
    total: z.number().int().min(0),
    tests: z
      .array(
        z.object({
          path: z.string(),
          name: z.string(),
          status: z.enum(["pass", "fail", "idle", "running"]),
          error: z.string().nullable().optional(),
        })
      )
      .max(200),
  }),
  durationSec: z.number().int().min(0).max(60 * 60 * 24),
  sessionId: z.string().optional().nullable(),
  stepId: z.string().optional().nullable(),
  token: z.string().optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { files, testResults, durationSec, sessionId, stepId, token } = parsed.data;

  const session = await auth();
  let candidateUserId = session?.user?.id;

  if (!candidateUserId && token) {
    const assignment = await prisma.takeHomeAssignment.findUnique({
      where: { token },
      select: { candidateEmail: true },
    });
    if (assignment) {
      const candidateUser = await prisma.user.findFirst({
        where: { email: { equals: assignment.candidateEmail } },
        select: { id: true },
      });
      if (candidateUser) {
        candidateUserId = candidateUser.id;
      }
    }
  }

  if (!candidateUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(clientKey(req, candidateUserId), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const challenge = await prisma.challenge.findUnique({
    where: { slug },
    select: { id: true, published: true },
  });
  if (!challenge || !challenge.published) {
    return NextResponse.json({ error: "challenge not found" }, { status: 404 });
  }

  const status =
    testResults.total > 0 && testResults.passed === testResults.total
      ? "passed"
      : "failed";

  if (token) {
    try {
      const updated = await prisma.takeHomeAssignment.update({
        where: { token },
        data: { status: "SUBMITTED", submittedAt: new Date() },
        select: {
          id: true,
          candidateName: true,
          candidateId: true,
          workspaceId: true,
          workspace: { select: { slug: true } },
          challenge: { select: { title: true } },
        },
      });
      // IP-44: notify workspace owners/admins. Fire-and-forget — failure
      // here must not roll back the submission.
      const { notifyTakeHomeSubmitted } = await import("@/lib/notifications/triggers");
      if (updated.workspaceId && updated.workspace?.slug) {
        void notifyTakeHomeSubmitted({
          workspaceId: updated.workspaceId,
          workspaceSlug: updated.workspace.slug,
          candidateName: updated.candidateName,
          challengeTitle: updated.challenge.title,
          takeHomeId: updated.id,
          candidateId: updated.candidateId,
        });
      }
    } catch (e) {
      console.error("Failed to update take-home assignment status on submit:", e);
    }
  }

  // Calculate grading engine score
  let score: number | null = null;
  if (stepId) {
    const step = await prisma.challengeStep.findUnique({
      where: { id: stepId },
      select: { testCasesJson: true },
    });
    if (step && step.testCasesJson) {
      try {
        const visualCases = JSON.parse(step.testCasesJson) as { name: string; weight: number }[];
        if (visualCases.length > 0) {
          let calculatedScore = 0;
          let totalWeight = 0;
          visualCases.forEach((tc) => {
            const matchedTest = testResults.tests.find((t) => t.name === tc.name);
            const passed = matchedTest && matchedTest.status === "pass";
            const weight = Number(tc.weight) || 0;
            totalWeight += weight;
            if (passed) {
              calculatedScore += weight;
            }
          });
          score = totalWeight > 0 ? Math.round((calculatedScore / totalWeight) * 100) : 0;
        }
      } catch (e) {
        console.error("Failed to calculate score:", e);
      }
    }
  }

  // Fallback: simple passed percentage
  if (score === null && testResults.total > 0) {
    score = Math.round((testResults.passed / testResults.total) * 100);
  }

  const attempt = await prisma.challengeAttempt.create({
    data: {
      userId: candidateUserId,
      challengeId: challenge.id,
      stepId: stepId ?? null,
      status,
      files: JSON.stringify(files),
      testResults: JSON.stringify(testResults),
      durationSec,
      sessionId: sessionId ?? null,
      score,
      finishedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ id: attempt.id, status: attempt.status });
}
