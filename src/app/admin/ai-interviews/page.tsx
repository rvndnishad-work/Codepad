import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminAiInterviewsConsole from "./AdminAiInterviewsConsole";

export const metadata = {
  title: "AI Screening — Credit Operations",
  robots: { index: false, follow: false },
};

export default async function AdminAiInterviewsPage() {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) {
    redirect("/");
  }

  const monthStart = startOfMonth();

  // Pull workspaces that *could* use AI screening so admins can grant credits
  // even before the workspace has any activity. Includes FREE/STARTER so admins
  // can comp credits during onboarding conversations.
  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      _count: { select: { aiInterviewSessions: true } },
      aiCreditLedger: {
        select: { amount: true, kind: true, createdAt: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const workspaceRows = workspaces.map((w) => {
    let balance = 0;
    let usedThisMonth = 0;
    let lastActivity: Date | null = null;
    for (const entry of w.aiCreditLedger) {
      balance += entry.amount;
      if (entry.kind === "CONSUMPTION" && entry.createdAt >= monthStart) {
        usedThisMonth += -entry.amount;
      }
      if (!lastActivity || entry.createdAt > lastActivity) {
        lastActivity = entry.createdAt;
      }
    }
    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
      planName: w.planName,
      sessionCount: w._count.aiInterviewSessions,
      balance,
      usedThisMonth,
      lastActivity: lastActivity?.toISOString() ?? null,
    };
  });

  // Recent ledger entries across all workspaces — most useful audit view.
  const recentLedger = await prisma.aIInterviewCreditLedger.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      workspace: { select: { name: true, slug: true } },
      session: {
        select: {
          id: true,
          candidateName: true,
          candidateEmail: true,
          positionTitle: true,
          score: true,
          status: true,
        },
      },
    },
  });

  const recentSessions = await prisma.aIInterviewSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      workspace: { select: { name: true, slug: true } },
    },
  });

  // Aggregate totals
  const totalGranted = workspaceRows.reduce(
    (acc, w) => acc + Math.max(0, w.balance + w.usedThisMonth),
    0
  );
  const totalConsumedThisMonth = workspaceRows.reduce(
    (acc, w) => acc + w.usedThisMonth,
    0
  );
  const activeWorkspaces = workspaceRows.filter((w) => w.sessionCount > 0).length;

  return (
    <AdminAiInterviewsConsole
      workspaces={workspaceRows}
      recentLedger={recentLedger.map((e) => ({
        id: e.id,
        workspaceId: e.workspaceId,
        workspaceName: e.workspace.name,
        workspaceSlug: e.workspace.slug,
        kind: e.kind,
        amount: e.amount,
        note: e.note,
        adminUserId: e.adminUserId,
        sessionId: e.sessionId,
        candidateName: e.session?.candidateName ?? null,
        createdAt: e.createdAt.toISOString(),
      }))}
      recentSessions={recentSessions.map((s) => ({
        id: s.id,
        workspaceName: s.workspace.name,
        workspaceSlug: s.workspace.slug,
        candidateName: s.candidateName,
        candidateEmail: s.candidateEmail,
        positionTitle: s.positionTitle,
        status: s.status,
        score: s.score,
        templateId: s.templateId,
        startedAt: s.startedAt?.toISOString() ?? null,
        finishedAt: s.finishedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      }))}
      stats={{
        totalGranted,
        totalConsumedThisMonth,
        activeWorkspaces,
        totalWorkspaces: workspaceRows.length,
      }}
    />
  );
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
