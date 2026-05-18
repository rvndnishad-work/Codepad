import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid, customAlphabet } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  candidateName: z.string().max(80).optional().nullable(),
  type: z.enum(["mock", "live"]).optional(),
  challengeIds: z.array(z.string().min(1)).min(1).max(10),
  totalSec: z.number().int().min(60).max(60 * 60 * 4), // 1 min – 4 hrs
  creatorRole: z.enum(["interviewer", "candidate"]).optional().default("candidate"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rl = rateLimit(clientKey(req, session.user.id), 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify all challenges exist and are published.
  const challenges = await prisma.challenge.findMany({
    where: { id: { in: parsed.data.challengeIds }, published: true },
    select: { id: true },
  });
  const validIds = new Set(challenges.map((c) => c.id));
  const ordered = parsed.data.challengeIds.filter((id) => validIds.has(id));
  if (ordered.length === 0) {
    return NextResponse.json({ error: "no valid challenges" }, { status: 400 });
  }

  const generateShortCode = customAlphabet("0123456789", 4);
  let shortCode = generateShortCode();
  let retries = 0;
  
  // Prevent collision on 4-digit code
  while (retries < 10) {
    const exists = await prisma.interviewSession.findUnique({ where: { shortCode } });
    if (!exists) break;
    shortCode = generateShortCode();
    retries++;
  }
  
  // Fallback to 6-char alphanumeric if space is highly saturated/bad luck
  if (retries >= 10) {
    shortCode = nanoid(6).toUpperCase();
  }

  const interview = await prisma.interviewSession.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title ?? "Interview Session",
      candidateName: parsed.data.candidateName ?? null,
      type: parsed.data.type ?? "mock",
      challengeIds: JSON.stringify(ordered),
      totalSec: parsed.data.totalSec,
      shareToken: nanoid(24),
      shortCode,
      status: "scheduled",
      creatorRole: parsed.data.creatorRole,
    },
    select: { id: true, shareToken: true, shortCode: true },
  });

  return NextResponse.json(interview, { status: 201 });
}
