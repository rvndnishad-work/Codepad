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

  const rl = rateLimit(clientKey(req, session.user.id), 30, 60_000);
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

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { files, testResults, durationSec, sessionId } = parsed.data;
  const status =
    testResults.total > 0 && testResults.passed === testResults.total
      ? "passed"
      : "failed";

  const attempt = await prisma.challengeAttempt.create({
    data: {
      userId: session.user.id,
      challengeId: challenge.id,
      status,
      files: JSON.stringify(files),
      testResults: JSON.stringify(testResults),
      durationSec,
      sessionId: sessionId ?? null,
      finishedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ id: attempt.id, status: attempt.status });
}
