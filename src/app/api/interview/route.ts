import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createInterviewSession } from "@/lib/interview/create-server";

const createSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    candidateName: z.string().max(80).optional().nullable(),
    candidateEmail: z.string().email().optional().or(z.literal("")).nullable(),
    workspaceSlug: z.string().optional().nullable(),
    candidateId: z.string().optional().nullable(),
    type: z.enum(["mock", "live"]).optional(),
    sourceType: z.enum(["challenge", "playground", "prompt", "combined"]).optional().default("challenge"),
    challengeIds: z.array(z.string().min(1)).max(10).optional(),
    playgroundIds: z.array(z.string().min(1)).max(10).optional(),
    promptScenarioIds: z.array(z.string().min(1)).max(10).optional(),
    scenario: z.string().max(2000).nullable().optional(),
    totalSec: z.number().int().min(60).max(60 * 60 * 4), // 1 min – 4 hrs
    creatorRole: z.enum(["interviewer", "candidate"]).optional().default("candidate"),
    /** JSON of the chosen TechStack (from the Tech-Stack selector). */
    stackJson: z.string().max(2000).optional().nullable(),
    /** Planned meeting time (IP-90). ISO datetime, optional. */
    scheduledAt: z.string().datetime().optional().nullable(),
  })
  .refine(
    (d) =>
      d.sourceType === "playground"
        ? (d.playgroundIds?.length ?? 0) >= 1
        : d.sourceType === "prompt"
        ? (d.promptScenarioIds?.length ?? 0) >= 1
        : d.sourceType === "combined"
        ? (d.challengeIds?.length ?? 0) + (d.playgroundIds?.length ?? 0) + (d.promptScenarioIds?.length ?? 0) >= 1
        : (d.challengeIds?.length ?? 0) >= 1,
    {
      message:
        "Pick at least one challenge, playground, or prompt scenario for your interview rounds",
    }
  );

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

  // Resolve Workspace context
  let workspaceId: string | null = null;
  if (parsed.data.workspaceSlug) {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: parsed.data.workspaceSlug },
      select: { id: true, members: { where: { userId: session.user.id }, select: { id: true }, take: 1 } },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    if (workspace.members.length === 0) {
      return NextResponse.json({ error: "Forbidden: You are not a member of this workspace" }, { status: 403 });
    }
    workspaceId = workspace.id;
  }

  const type = parsed.data.type ?? "mock";
  const result = await createInterviewSession({
    ownerId: session.user.id,
    actor: { id: session.user.id, email: session.user.email ?? null },
    title: parsed.data.title ?? "Interview Session",
    type,
    creatorRole: parsed.data.creatorRole,
    challengeIds: parsed.data.challengeIds ?? [],
    playgroundIds: parsed.data.playgroundIds ?? [],
    promptScenarioIds: parsed.data.promptScenarioIds ?? [],
    scenario: parsed.data.scenario ?? null,
    totalSec: parsed.data.totalSec,
    stackJson: parsed.data.stackJson ?? null,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    workspaceId,
    candidateId: parsed.data.candidateId ?? null,
    candidateName: parsed.data.candidateName ?? null,
    candidateEmail: parsed.data.candidateEmail || null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const interview = { id: result.id, shareToken: result.shareToken, shortCode: result.shortCode };

  return NextResponse.json(interview, { status: 201 });
}
