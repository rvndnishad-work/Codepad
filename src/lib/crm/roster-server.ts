/**
 * Loads roster rows (candidate plus results, next step and attention flag).
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { loadCandidateResults } from "@/lib/crm/results-server";
import { computeNextStep, daysSince, needsAttention, passCheck, resultStateText, resultTime, summarizeResults } from "@/lib/crm/results";
import { normalizeStage } from "@/lib/crm/stages";
import { parseTags } from "@/lib/crm/candidates-server";
import type { RosterRow } from "@/lib/crm/roster";

export async function loadRoster(
  workspaceId: string,
  workspaceSlug: string,
  opts: { batchId?: string; ids?: string[] } = {},
): Promise<RosterRow[]> {
  const candidates = await prisma.candidate.findMany({
    where: {
      workspaceId,
      ...(opts.batchId ? { batchId: opts.batchId } : {}),
      ...(opts.ids ? { id: { in: opts.ids } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      source: true,
      tags: true,
      stage: true,
      status: true,
      rejectReason: true,
      createdAt: true,
      updatedAt: true,
      stageChangedAt: true,
      batchId: true,
      ownerId: true,
    },
  });
  const results = await loadCandidateResults(
    workspaceId,
    workspaceSlug,
    opts.batchId || opts.ids ? candidates.map((c) => c.id) : undefined,
  );
  const now = Date.now();
  return candidates.map((c) => {
    const rs = results.get(c.id) ?? [];
    const summary = summarizeResults(rs);
    const stageChangedAt = (c.stageChangedAt ?? c.createdAt).toISOString();
    const next = computeNextStep({
      stage: c.stage,
      stageChangedAt,
      createdAt: c.createdAt.toISOString(),
      batchId: c.batchId,
      results: rs,
      now,
    });
    const daysInStage = daysSince(stageChangedAt, now);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      source: c.source,
      tags: parseTags(c.tags),
      stage: c.stage,
      status: c.status,
      rejectReason: c.rejectReason,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      stageChangedAt,
      daysInStage,
      batchId: c.batchId,
      ownerId: c.ownerId,
      results: rs,
      latest: summary.latest && summary.latest.score != null
        ? { score: summary.latest.score, title: summary.latest.title, kind: summary.latest.kind }
        : null,
      pending: pendingResult(rs),
      combined: summary.combined,
      byKind: summary.byKind,
      interviewRating: summary.interviewRating,
      takeHomeMinutes: summary.takeHomeMinutes,
      next,
      attention: c.status !== "archived" && needsAttention(next, c.stage, daysInStage),
      manualPass: normalizeStage(c.stage) === "PASSED" ? (passCheck(rs).reason ?? null) : null,
    };
  });
}

/** Members (for owner pickers) and batches (for batch pickers). */
export async function loadRosterLookups(workspaceId: string) {
  const [members, batches] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true, user: { select: { name: true, email: true } } },
    }),
    prisma.candidateBatch.findMany({
      where: { workspaceId },
      orderBy: [{ status: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, status: true },
    }),
  ]);
  return {
    members: members
      .map((m) => ({ id: m.userId, name: m.user.name || m.user.email || "Member", email: m.user.email }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    batches,
  };
}

/** What the signed-in member may do on the Candidates pages. */
export async function loadCandidatePerms(member: { role: string; permissions?: unknown }, isManager: boolean) {
  const { canMember } = await import("@/lib/permissions");
  const [canWrite, canPipeline, canDelete] = await Promise.all([
    canMember(member, "candidate:write"),
    canMember(member, "candidate:manage_pipeline"),
    canMember(member, "candidate:delete"),
  ]);
  return { canWrite, canPipeline, canDelete, isManager };
}

function pendingResult(rs: RosterRow["results"]): RosterRow["pending"] {
  if (rs.some((r) => r.score != null)) return null;
  const newest = [...rs].sort((a, b) => resultTime(b) - resultTime(a))[0];
  return newest ? { text: resultStateText(newest), title: newest.title, kind: newest.kind } : null;
}
