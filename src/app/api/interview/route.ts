import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid, customAlphabet } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { templatesById } from "@/lib/templates";
import { upsertCandidateForWorkflow } from "@/lib/crm/auto-create";
import { advanceCandidateStage } from "@/lib/crm/advance";

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

  // Resolve Workspace context
  let workspaceId: string | null = null;
  let candidateId: string | null = parsed.data.candidateId ?? null;

  if (parsed.data.workspaceSlug) {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: parsed.data.workspaceSlug },
      include: { members: true },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    const isMember = workspace.members.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden: You are not a member of this workspace" }, { status: 403 });
    }
    workspaceId = workspace.id;
  }

  // Handle Candidate CRM Sync — single linkage path via the shared upsert
  // helper. Email is the dedup key: participants named without an email get
  // NO CRM row (the old unconditional create spawned a duplicate candidate on
  // every interview); their name stays denormalized on the session below.
  if (workspaceId) {
    if (candidateId) {
      const candidateExists = await prisma.candidate.findFirst({
        where: { id: candidateId, workspaceId },
      });
      if (!candidateExists) {
        return NextResponse.json({ error: "Candidate not found in this workspace" }, { status: 400 });
      }
    } else {
      const candidateName = parsed.data.candidateName?.trim() || "Candidate";
      const candidateEmail = parsed.data.candidateEmail?.trim()?.toLowerCase() || null;

      if (candidateEmail) {
        const { candidateId: linkedId } = await upsertCandidateForWorkflow({
          workspaceId,
          name: candidateName,
          email: candidateEmail,
          source: "interview-schedule",
          initialStage: "ONSITE",
        });
        candidateId = linkedId;
      }
    }

    // IP-69: a live interview means the candidate reached the onsite round —
    // forward-advance existing rows still sitting earlier in the pipeline.
    if (candidateId && (parsed.data.type ?? "mock") === "live") {
      await advanceCandidateStage({
        workspaceId,
        candidateId,
        toStage: "ONSITE",
        source: "auto:interview-created",
        actorUserId: session.user.id,
        actorEmail: session.user.email ?? null,
      });
    }
  }

  // Denormalize candidateName from Candidate record if omitted in the payload
  let finalCandidateName = parsed.data.candidateName ?? null;
  if (candidateId && !finalCandidateName) {
    const candidateRow = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { name: true },
    });
    if (candidateRow) {
      finalCandidateName = candidateRow.name;
    }
  }

  const interview = await prisma.interviewSession.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title ?? "Interview Session",
      candidateName: finalCandidateName,
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
      stackJson: parsed.data.stackJson ?? null,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      workspaceId,
      candidateId,
    },
    select: { id: true, shareToken: true, shortCode: true },
  });

  // IP-90: tell the candidate. Workspace live sessions with a reachable email
  // get an invite email (join link + code + time) and, when the candidate has
  // an Interviewpad account, an in-app notification. Fire-and-forget — the
  // session exists either way and the recruiter can still copy the link.
  if (workspaceId && (parsed.data.type ?? "mock") === "live") {
    const inviteEmail =
      parsed.data.candidateEmail?.trim()?.toLowerCase() ||
      (candidateId
        ? (
            await prisma.candidate.findUnique({
              where: { id: candidateId },
              select: { email: true },
            })
          )?.email ?? null
        : null);

    if (inviteEmail) {
      void (async () => {
        try {
          const ws = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { name: true },
          });
          const { sendEmail } = await import("@/lib/email");
          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const res = await sendEmail({
            template: "interview-invite",
            to: inviteEmail,
            props: {
              candidateName: finalCandidateName || "there",
              workspaceName: ws?.name ?? "the team",
              title: parsed.data.title ?? "Interview Session",
              joinUrl: `${baseUrl}/interview/${interview.id}?token=${interview.shareToken}`,
              shortCode: interview.shortCode,
              scheduledAt: parsed.data.scheduledAt ?? null,
              durationMin: Math.round(parsed.data.totalSec / 60),
            },
            workspaceId,
            sessionId: interview.id,
            idempotencyKey: `interview-invite:${interview.id}`,
          });
          if (!res.sent) console.warn(`[interview-invite] ${inviteEmail}: ${res.reason}`);

          const { notifyInterviewScheduled } = await import("@/lib/notifications/triggers");
          await notifyInterviewScheduled({
            sessionId: interview.id,
            shareToken: interview.shareToken,
            title: parsed.data.title ?? "Interview Session",
            type: "live",
            candidateEmail: inviteEmail,
            actorId: session.user.id,
          });
        } catch (err) {
          console.error("[interview-invite] dispatch failed:", err);
        }
      })();
    }
  }

  return NextResponse.json(interview, { status: 201 });
}
