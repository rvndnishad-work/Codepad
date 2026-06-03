import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import GemmaConsole from "./GemmaConsole";

export const metadata = {
  title: "Gemma RAG Operations Copilot — Admin",
  robots: { index: false, follow: false },
};

export default async function GemmaCopilotPage() {
  const session = await auth().catch(() => null);
  if (!isAdmin(session)) redirect("/");

  // Fetch unresolved Gemma alerts sorted by severity (CRITICAL/HIGH first) then recency
  const unresolvedAlerts = await prisma.gemmaAlert.findMany({
    where: { status: "UNRESOLVED" },
    orderBy: { createdAt: "desc" }
  });

  // Custom priority mapping for client-side sorting
  const severityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  unresolvedAlerts.sort((a, b) => {
    return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
  });

  // Query high-level stats for telemetry cards
  const [
    totalUsers,
    bannedUsers,
    totalSessions,
    stalledSessionsCount,
    suspiciousAttemptsCount,
    pendingBlogsCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.interviewSession.count(),
    prisma.interviewSession.count({
      where: {
        status: "in_progress",
        startedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) }
      }
    }),
    prisma.challengeAttempt.count({
      where: {
        aiSuspicionScore: { gte: 60 }
      }
    }),
    prisma.blogPost.count({ where: { status: "PENDING" } })
  ]);

  const healthyRate = totalSessions > 0 
    ? Math.round(((totalSessions - stalledSessionsCount) / totalSessions) * 100) 
    : 100;

  return (
    <GemmaConsole
      initialAlerts={unresolvedAlerts.map(a => ({
        id: a.id,
        type: a.type,
        title: a.title,
        body: a.body,
        severity: a.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        status: a.status,
        proposedAction: a.proposedAction ? JSON.parse(a.proposedAction) : null,
        targetId: a.targetId,
        createdAt: a.createdAt.toISOString()
      }))}
      telemetry={{
        totalUsers,
        bannedUsers,
        stalledSessionsCount,
        suspiciousAttemptsCount,
        pendingBlogsCount,
        healthyRate
      }}
    />
  );
}
