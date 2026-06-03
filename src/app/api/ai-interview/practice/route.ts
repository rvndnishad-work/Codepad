import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { AI_INTERVIEW_TEMPLATES, getTemplateById } from "@/lib/ai-interview/scaffolds";

/**
 * Candidate self-serve AI mock interview (practice mode).
 *
 * GET  → list the builtin practice templates (frontend / backend / dsa).
 * POST → create a credit-free practice session for the signed-in candidate and
 *        return its inviteToken. Practice sessions live under a reserved
 *        workspace and skip the credit ledger (see consumeCreditIfFirstTurn).
 */

const PRACTICE_WORKSPACE_SLUG = "__ai-practice__";

async function getPracticeWorkspaceId(): Promise<string> {
  // Upsert keeps it a singleton and is race-safe on the unique slug.
  const ws = await prisma.workspace.upsert({
    where: { slug: PRACTICE_WORKSPACE_SLUG },
    update: {},
    create: { name: "AI Practice", slug: PRACTICE_WORKSPACE_SLUG },
    select: { id: true },
  });
  return ws.id;
}

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return NextResponse.json({
    templates: AI_INTERVIEW_TEMPLATES.map((t) => ({
      id: t.id,
      title: t.title,
      kind: t.kind ?? "frontend",
      language: t.language ?? null,
      frameworkLabel: t.frameworkLabel ?? null,
      estimatedMinutes: t.estimatedMinutes,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Cap practice creation per user — practice runs are free but still hit the
  // Gemini quota once started.
  const rl = rateLimit(`ai-practice:${clientKey(req, session.user.id)}`, 8, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "You've started a lot of practice interviews. Please try again later." },
      { status: 429, headers: { "retry-after": String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }

  const body = await req.json().catch(() => null);
  const templateId = String(body?.templateId ?? "");
  // Only builtin templates are allowed — never a workspace-private custom one.
  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Unknown practice template." }, { status: 400 });
  }

  const workspaceId = await getPracticeWorkspaceId();

  const created = await prisma.aIInterviewSession.create({
    data: {
      workspaceId,
      practice: true,
      candidateName: session.user.name?.trim() || "Candidate",
      candidateEmail: session.user.email ?? "",
      positionTitle: `Practice — ${template.title}`,
      status: "PENDING",
      chatHistory: "[]",
      filesJson: JSON.stringify(template.starterFiles),
      templateId,
    },
    select: { inviteToken: true },
  });

  return NextResponse.json({ inviteToken: created.inviteToken }, { status: 201 });
}
