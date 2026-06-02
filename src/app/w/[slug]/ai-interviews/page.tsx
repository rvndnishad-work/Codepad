import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import {
  getWorkspaceCredits,
  workspacePlanAllowsAiScreening,
} from "@/lib/ai-interview/credits";
import { listTemplatesForWorkspace } from "@/lib/ai-interview/template-resolver";
import AIInterviewRecruiterConsole from "./AIInterviewRecruiterConsole";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

const PAGE_SIZE = 25;

export const metadata = {
  title: "AI Screening — Workspace",
  robots: { index: false, follow: false },
};

export default async function WorkspaceAiInterviewsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/ai-interviews`)}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      allowExternalMcp: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!workspace) notFound();

  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");

  // Plan gate — render a friendly upgrade prompt instead of 404.
  if (!workspacePlanAllowsAiScreening(workspace.planName)) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-10 text-center flex flex-col items-center gap-5 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-fg flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            AI Screening is a Growth feature
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-md">
            Upgrade this workspace to <span className="font-bold text-fg">Growth</span> or <span className="font-bold text-fg">Enterprise</span> to unlock automated AI-driven candidate screenings. Each completed screening uses one credit.
          </p>
        </div>
        <Link
          href={`/w/${slug}?section=billing`}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition shadow-md"
        >
          View plans &amp; upgrade
        </Link>
      </div>
    );
  }

  const canCreate = member.role === "OWNER" || member.role === "ADMIN" || member.role === "INTERVIEWER";

  const [rawSessions, totalSessions, credits, usedThisMonth, templates, externalMcpServers, candidateRows] = await Promise.all([
    prisma.aIInterviewSession.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        rounds: { orderBy: { order: "asc" } },
        batch: { select: { id: true, positionTitle: true } },
      },
    }),
    prisma.aIInterviewSession.count({ where: { workspaceId: workspace.id } }),
    getWorkspaceCredits(workspace.id),
    prisma.aIInterviewCreditLedger.aggregate({
      where: {
        workspaceId: workspace.id,
        kind: "CONSUMPTION",
        createdAt: { gte: startOfMonth() },
      },
      _sum: { amount: true },
    }),
    listTemplatesForWorkspace(workspace.id),
    // Available enabled external MCP servers + their current template bindings.
    // We only surface enabled servers in the UI — disabled ones can't be bound.
    prisma.externalMcpServer.findMany({
      where: { workspaceId: workspace.id, enabled: true },
      select: {
        id: true,
        name: true,
        templateBindings: { select: { templateId: true } },
      },
      orderBy: { name: "asc" },
    }),
    // CRM candidates available to invite into a screening batch. Exclude
    // rejected/archived dispositions and anyone without an email (can't invite).
    prisma.candidate.findMany({
      where: {
        workspaceId: workspace.id,
        email: { not: null },
        status: { notIn: ["rejected", "archived"] },
      },
      select: { id: true, name: true, email: true, stage: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalSessions / PAGE_SIZE));

  // Stats are workspace-wide, not page-local — recruiters expect "total"
  // numbers in the header tiles even when paginating deep into history.
  const completedAgg = await prisma.aIInterviewSession.aggregate({
    where: { workspaceId: workspace.id, status: "COMPLETED" },
    _count: true,
    _avg: { score: true },
  });
  const totalScreened = completedAgg._count;
  const avgScore = Math.round(completedAgg._avg.score ?? 0);

  const mappedSessions = rawSessions.map((s) => {
    let parsedHistory: unknown[] = [];
    try {
      parsedHistory = JSON.parse(s.chatHistory || "[]");
    } catch {
      parsedHistory = [];
    }

    let parsedFiles: Record<string, string> = {};
    try {
      parsedFiles = JSON.parse(s.filesJson || "{}");
    } catch {
      parsedFiles = {};
    }

    let parsedRatings = { CodeQuality: 0, ProblemSolving: 0, Communication: 0 };
    if (s.ratings) {
      try {
        parsedRatings = JSON.parse(s.ratings);
      } catch {
        // ignore
      }
    }

    // Per-round summaries (multi-round batches). Files parsed for the per-round
    // viewer; everything else is display metadata kept off the heavy path.
    const rounds = (s.rounds ?? []).map((r) => {
      let roundFiles: Record<string, string> = {};
      try {
        roundFiles = JSON.parse(r.filesJson || "{}");
      } catch {
        roundFiles = {};
      }
      let roundRatings: { CodeQuality: number; ProblemSolving: number; Communication: number } | null = null;
      if (r.ratings) {
        try {
          roundRatings = JSON.parse(r.ratings);
        } catch {
          roundRatings = null;
        }
      }
      return {
        id: r.id,
        order: r.order,
        paradigm: r.paradigm,
        language: r.language,
        frameworkLabel: r.frameworkLabel,
        sourceKind: r.sourceKind,
        score: r.score,
        status: r.status,
        ratings: roundRatings,
        filesJson: roundFiles,
      };
    });

    return {
      id: s.id,
      inviteToken: s.inviteToken,
      candidateName: s.candidateName,
      candidateEmail: s.candidateEmail,
      positionTitle: s.positionTitle,
      status: s.status,
      templateId: s.templateId,
      batchId: s.batchId,
      batchTitle: s.batch?.positionTitle ?? null,
      score: s.score,
      aiSummary: s.aiSummary,
      aiSuspicionScore: s.aiSuspicionScore,
      outboundCallCount: s.outboundCallCount,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      startedAt: s.startedAt?.toISOString() ?? null,
      finishedAt: s.finishedAt?.toISOString() ?? null,
      chatHistory: parsedHistory as { role: "user" | "assistant"; text: string }[],
      filesJson: parsedFiles,
      ratings: parsedRatings,
      rounds,
    };
  });

  // Pivot bindings into "for each custom template, which server ids are bound?"
  // — convenient lookup shape for the binding UI in the Templates modal.
  const bindingsByTemplate: Record<string, string[]> = {};
  for (const server of externalMcpServers) {
    for (const b of server.templateBindings) {
      (bindingsByTemplate[b.templateId] ??= []).push(server.id);
    }
  }

  const templateChoices = templates.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    estimatedMinutes: t.estimatedMinutes,
    custom: t.custom,
    boundExternalMcpServerIds: bindingsByTemplate[t.id] ?? [],
  }));

  const availableExternalMcpServers = externalMcpServers.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const candidates = candidateRows.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    stage: c.stage,
  }));

  return (
    <AIInterviewRecruiterConsole
      workspaceSlug={slug}
      initialSessions={mappedSessions}
      candidates={candidates}
      totalScreened={totalScreened}
      avgScore={avgScore}
      credits={credits}
      usedThisMonth={-(usedThisMonth._sum.amount ?? 0)}
      canCreate={canCreate}
      templates={templateChoices}
      availableExternalMcpServers={availableExternalMcpServers}
      workspaceAllowExternalMcp={workspace.allowExternalMcp}
      pagination={{
        page,
        totalPages,
        totalSessions,
        pageSize: PAGE_SIZE,
      }}
    />
  );
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
