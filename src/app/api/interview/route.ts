import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid, customAlphabet } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { templatesById } from "@/lib/templates";

const createSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    candidateName: z.string().max(80).optional().nullable(),
    type: z.enum(["mock", "live"]).optional(),
    sourceType: z.enum(["challenge", "playground", "prompt", "combined"]).optional().default("challenge"),
    challengeIds: z.array(z.string().min(1)).max(10).optional(),
    playgroundIds: z.array(z.string().min(1)).max(10).optional(),
    promptScenarioIds: z.array(z.string().min(1)).max(10).optional(),
    scenario: z.string().max(2000).nullable().optional(),
    totalSec: z.number().int().min(60).max(60 * 60 * 4), // 1 min – 4 hrs
    creatorRole: z.enum(["interviewer", "candidate"]).optional().default("candidate"),
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

  // Resolve and validate the source material.
  // - challenge: published rows from the global Challenge bank.
  // - playground: Snippets owned by the current user (any visibility).
  // - prompt: published prompt scenarios.
  let orderedChallengeIds: string[] = [];
  let orderedPlaygroundIds: string[] = [];
  let orderedPromptScenarioIds: string[] = [];

  const requestedPlaygrounds = parsed.data.playgroundIds ?? [];
  if (requestedPlaygrounds.length > 0) {
    const templateIds = requestedPlaygrounds.filter((id) => id.startsWith("template:"));
    const snippetIds = requestedPlaygrounds.filter((id) => !id.startsWith("template:"));

    const owned = await prisma.snippet.findMany({
      where: { id: { in: snippetIds }, userId: session.user.id },
      select: { id: true },
    });
    const validSnippetIds = new Set(owned.map((s) => s.id));

    const finalIds: string[] = [];
    for (const reqId of requestedPlaygrounds) {
      if (reqId.startsWith("template:")) {
        const templateKey = reqId.substring("template:".length);
        const tDef = templatesById[templateKey];
        if (tDef) {
          const slug = nanoid(10);
          const newSnippet = await prisma.snippet.create({
            data: {
              slug,
              title: `${tDef.title} Session`,
              template: tDef.id,
              files: JSON.stringify(tDef.files),
              visibility: "private",
              userId: session.user.id,
            },
            select: { id: true },
          });
          finalIds.push(newSnippet.id);
        }
      } else if (validSnippetIds.has(reqId)) {
        finalIds.push(reqId);
      }
    }
    orderedPlaygroundIds = finalIds;
  }

  const requestedPrompts = parsed.data.promptScenarioIds ?? [];
  if (requestedPrompts.length > 0) {
    const scenarios = await prisma.promptScenario.findMany({
      where: { id: { in: requestedPrompts }, published: true },
      select: { id: true },
    });
    const validIds = new Set(scenarios.map((p) => p.id));
    orderedPromptScenarioIds = requestedPrompts.filter((id) => validIds.has(id));
  }

  const requestedChallenges = parsed.data.challengeIds ?? [];
  if (requestedChallenges.length > 0) {
    const challenges = await prisma.challenge.findMany({
      where: { id: { in: requestedChallenges }, published: true },
      select: { id: true },
    });
    const validIds = new Set(challenges.map((c) => c.id));
    orderedChallengeIds = requestedChallenges.filter((id) => validIds.has(id));
  }

  // Validate that we have at least what sourceType demands
  if (parsed.data.sourceType === "playground" && orderedPlaygroundIds.length === 0) {
    return NextResponse.json({ error: "no valid playgrounds" }, { status: 400 });
  } else if (parsed.data.sourceType === "prompt" && orderedPromptScenarioIds.length === 0) {
    return NextResponse.json({ error: "no valid prompt scenarios" }, { status: 400 });
  } else if (parsed.data.sourceType === "challenge" && orderedChallengeIds.length === 0) {
    return NextResponse.json({ error: "no valid challenges" }, { status: 400 });
  } else if (parsed.data.sourceType === "combined") {
    const totalCount = orderedChallengeIds.length + orderedPlaygroundIds.length + orderedPromptScenarioIds.length;
    if (totalCount === 0) {
      return NextResponse.json({ error: "no valid rounds selected" }, { status: 400 });
    }
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
      sourceType: parsed.data.sourceType,
      challengeIds: JSON.stringify(orderedChallengeIds),
      playgroundIds: JSON.stringify(orderedPlaygroundIds),
      promptScenarioIds: JSON.stringify(orderedPromptScenarioIds),
      scenario: parsed.data.scenario ?? null,
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
