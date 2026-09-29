/**
 * Read models for the Connections pages: the ATS connection summary, its
 * sync log, and the per-candidate "From Greenhouse" card. Server only.
 */
import { prisma } from "@/lib/prisma";
import { parseAtsSettings, type AtsSettings } from "./settings";
import { describeStatus } from "./greenhouse";
import { loadRequestState } from "./writeback";
import { screeningNoun } from "./dispatch";

const DAY_MS = 86_400_000;

export type AtsSummary = {
  provider: string;
  /** Greenhouse partner connection (vs an older signed-webhook one). */
  partner: boolean;
  settings: AtsSettings;
  connectedAt: string;
  connectedBy: string | null;
  imported30d: number;
  decisionsSent30d: number;
  lastSyncAt: string | null;
  needsAttention: number;
  mappedJobs: number;
};

export async function loadAtsSummary(workspaceId: string): Promise<AtsSummary | null> {
  const row = await prisma.atsIntegration.findUnique({ where: { workspaceId } });
  if (!row) return null;
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [imported, decided, last, attention, mapped, by] = await Promise.all([
    prisma.atsTestRequest.count({ where: { workspaceId, createdAt: { gte: since } } }),
    prisma.atsTestRequest.count({ where: { workspaceId, reportedAt: { gte: since } } }),
    prisma.atsSyncEvent.findFirst({ where: { workspaceId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.atsSyncEvent.count({ where: { workspaceId, status: { in: ["failed", "waiting"] }, resolvedAt: null } }),
    prisma.atsJobMapping.count({ where: { workspaceId, provider: row.provider, screeningKind: { not: "none" } } }),
    row.connectedById ? prisma.user.findUnique({ where: { id: row.connectedById }, select: { name: true, email: true } }) : null,
  ]);
  return {
    provider: row.provider,
    partner: !!row.partnerKeyHash,
    settings: parseAtsSettings(row.settings),
    connectedAt: row.createdAt.toISOString(),
    connectedBy: by?.name || by?.email || null,
    imported30d: imported,
    decisionsSent30d: decided,
    lastSyncAt: last?.createdAt.toISOString() ?? null,
    needsAttention: attention,
    mappedJobs: mapped,
  };
}

export type SyncEventView = {
  id: string;
  createdAt: string;
  direction: "in" | "out";
  status: string;
  summary: string;
  detail: string | null;
  httpStatus: number | null;
  candidateId: string | null;
  requestId: string | null;
  resolved: boolean;
  /** Waiting imports that can be sent from the log. */
  canSend: boolean;
};

export async function loadSyncLog(workspaceId: string, opts: { candidateId?: string; take?: number } = {}): Promise<SyncEventView[]> {
  const rows = await prisma.atsSyncEvent.findMany({
    where: { workspaceId, ...(opts.candidateId ? { candidateId: opts.candidateId } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 50,
  });
  const waitingIds = rows.filter((r) => r.status === "waiting" && r.requestId && !r.resolvedAt).map((r) => r.requestId!);
  const unsent = waitingIds.length
    ? await prisma.atsTestRequest.findMany({ where: { id: { in: waitingIds }, sessionId: null }, select: { id: true } })
    : [];
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    direction: r.direction === "out" ? "out" : "in",
    status: r.status,
    summary: r.summary,
    detail: r.detail,
    httpStatus: r.httpStatus,
    candidateId: r.candidateId,
    requestId: r.requestId,
    resolved: !!r.resolvedAt,
    canSend: r.status === "waiting" && !r.resolvedAt && unsent.some((u) => u.id === r.requestId),
  }));
}

export type CandidateAtsCard = {
  provider: string;
  profileUrl: string | null;
  job: string | null;
  screening: string;
  importedAt: string;
  /** What Greenhouse sees now, in words. */
  sentBack: string;
  /** What goes next, or null when nothing is left to send. */
  nextToSend: string | null;
  waitingRequestId: string | null;
  log: SyncEventView[];
};

/** The "From Greenhouse" side card on a candidate profile. Null when they did not come from an ATS. */
export async function loadCandidateAtsCard(workspaceId: string, candidateId: string): Promise<CandidateAtsCard | null> {
  const [candidate, request] = await Promise.all([
    prisma.candidate.findFirst({ where: { id: candidateId, workspaceId }, select: { atsRef: true, atsProfileUrl: true, source: true } }),
    prisma.atsTestRequest.findFirst({ where: { workspaceId, candidateId }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!candidate || (!request && !candidate.atsRef)) return null;
  const provider = request?.provider ?? candidate.atsRef?.split(":")[0] ?? candidate.source ?? "ats";
  const log = await loadSyncLog(workspaceId, { candidateId, take: 8 });
  if (!request) {
    return {
      provider,
      profileUrl: candidate.atsProfileUrl,
      job: null,
      screening: "None requested",
      importedAt: log.at(-1)?.createdAt ?? new Date().toISOString(),
      sentBack: "Nothing yet",
      nextToSend: null,
      waitingRequestId: null,
      log,
    };
  }
  const state = await loadRequestState(request.id, workspaceId);
  const ps = state?.status.partner_status ?? "invited";
  let nextToSend: string | null;
  if (ps === "complete") nextToSend = request.reportedAt ? null : "Your decision, on the next sync";
  else if (ps === "completed_awaiting_decision") nextToSend = "Your decision";
  else if (ps === "waiting_for_recruiter") nextToSend = `Send the ${screeningNoun(request.screeningKind)} first`;
  else if (ps === "invite_failed") nextToSend = "The invite failed. See the sync log.";
  else nextToSend = "Your decision, once the screening is done";
  return {
    provider,
    profileUrl: candidate.atsProfileUrl,
    job: request.jobName,
    screening: screeningNoun(request.screeningKind),
    importedAt: request.createdAt.toISOString(),
    sentBack: request.reportedAt ? `${request.reportedDecision === "passed" ? "Passed" : "Not passed"}, with a profile link` : describeStatus(ps),
    nextToSend,
    waitingRequestId: ps === "waiting_for_recruiter" && !request.sessionId ? request.id : null,
    log,
  };
}
