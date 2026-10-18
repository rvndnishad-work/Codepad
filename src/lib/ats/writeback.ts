/**
 * Results back to the ATS. Server only.
 *
 * Greenhouse reads results by polling test_status; it only hears "complete"
 * once a recruiter has passed or not passed the candidate AND the screening
 * is closed (see buildTestStatus). When that happens we also PATCH the
 * callback URL Greenhouse gave us so it picks the result up without waiting
 * for its next poll. A score alone never passes anyone.
 */
import { prisma } from "@/lib/prisma";
import { loadCandidateResults } from "@/lib/crm/results-server";
import { appOrigin } from "@/lib/interview/links";
import { loadRoundsSummary } from "@/lib/interview/rounds-server";
import { atsRoundsText } from "@/lib/interview/rounds-view";
import { buildTestStatus, callbackHostAllowed, type TestStatus } from "./greenhouse";
import { parseAtsSettings } from "./settings";
import { logSyncEvent } from "./sync-log";
import { providerName } from "./import";
import { screeningNoun } from "./dispatch";

const PATCH_TIMEOUT_MS = 8000;

export type RequestState = {
  status: TestStatus;
  request: {
    id: string;
    workspaceId: string;
    provider: string;
    candidateId: string;
    candidateName: string;
    callbackUrl: string | null;
    reportedAt: Date | null;
    screeningKind: string;
  };
  score: number | null;
};

/** Where Greenhouse (and anyone reading the result) is sent: the candidate profile. */
export async function candidateProfileUrl(slug: string, candidateId: string): Promise<string> {
  return `${await appOrigin()}/w/${slug}/candidates/${candidateId}`;
}

/** The current test_status for one request, scoped to its workspace. */
export async function loadRequestState(requestId: string, workspaceId?: string): Promise<RequestState | null> {
  const req = await prisma.atsTestRequest.findFirst({
    where: { id: requestId, ...(workspaceId ? { workspaceId } : {}) },
    include: {
      candidate: { select: { id: true, name: true, stage: true, stageChangedAt: true } },
      workspace: { select: { slug: true, atsIntegration: { select: { settings: true } } } },
    },
  });
  if (!req) return null;
  const settings = parseAtsSettings(req.workspace.atsIntegration?.settings);
  let result: { state: "invited" | "in_progress" | "submitted" | "scored" | "expired"; score: number | null } | null = null;
  if (req.sessionId) {
    const results = await loadCandidateResults(req.workspaceId, req.workspace.slug, [req.candidateId]);
    const r = results.get(req.candidateId)?.find((x) => x.id === req.sessionId);
    // A session we sent but can no longer find (deleted) counts as closed.
    result = r ? { state: r.state, score: r.score } : { state: "expired", score: null };
  }
  // Round results ride along once a recruiter has decided, like the rest of the result.
  const decided = req.candidate.stage === "PASSED" || req.candidate.stage === "REJECTED";
  const summary = decided ? await loadRoundsSummary(req.workspaceId, req.workspace.slug, req.candidateId).catch(() => null) : null;
  const status = buildTestStatus({
    requestStatus: req.status,
    requestCreatedAt: req.createdAt,
    result,
    candidateStage: req.candidate.stage,
    stageChangedAt: req.candidate.stageChangedAt,
    profileUrl: await candidateProfileUrl(req.workspace.slug, req.candidateId),
    includeScore: settings.sendScore,
    screeningLabel: req.jobName ? `${screeningNoun(req.screeningKind)} for ${req.jobName}` : screeningNoun(req.screeningKind),
    rounds: summary ? atsRoundsText(summary, { includeScore: settings.sendScore }) : null,
  });
  return {
    status,
    request: {
      id: req.id,
      workspaceId: req.workspaceId,
      provider: req.provider,
      candidateId: req.candidateId,
      candidateName: req.candidate.name,
      callbackUrl: req.callbackUrl,
      reportedAt: req.reportedAt,
      screeningKind: req.screeningKind,
    },
    score: result?.score ?? null,
  };
}

export type ReportOutcome = "not_ready" | "already_reported" | "sent" | "failed" | "recorded";

/** PATCH the Greenhouse callback. Returns the HTTP status, or an error message. */
async function patchCallback(url: string): Promise<{ ok: boolean; httpStatus: number | null; error?: string }> {
  if (!callbackHostAllowed(url)) {
    return { ok: false, httpStatus: null, error: "The callback address is not a Greenhouse address, so we did not call it." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PATCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "User-Agent": "Codepad-Greenhouse/1.0" },
      body: "{}",
      signal: controller.signal,
      redirect: "manual",
    });
    if (res.status >= 200 && res.status < 300) return { ok: true, httpStatus: res.status };
    return { ok: false, httpStatus: res.status, error: explainStatus(res.status) };
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    return { ok: false, httpStatus: null, error: aborted ? `Greenhouse did not answer within ${PATCH_TIMEOUT_MS / 1000} seconds.` : "Could not reach Greenhouse." };
  } finally {
    clearTimeout(timer);
  }
}

export function explainStatus(status: number): string {
  if (status === 401 || status === 403) return "Greenhouse refused the request. Check that the Codepad integration is still enabled in Greenhouse, then retry.";
  if (status === 404 || status === 410) return "Greenhouse no longer knows this test. It may have been removed from the candidate.";
  if (status === 429) return "Greenhouse asked us to slow down. Retry in a few minutes.";
  if (status >= 500) return "Greenhouse had a problem on its side. Retry in a few minutes.";
  return `Greenhouse answered with ${status}.`;
}

function outcomeSummary(name: string, status: TestStatus, score: number | null): string {
  const decision = status.metadata?.Decision ?? "Result";
  const parts = [`${name}: ${decision}`];
  if (status.partner_score != null) parts.push(`score ${status.partner_score}`);
  else if (score != null) parts.push("score not sent");
  parts.push("profile link");
  return parts.join(", ");
}

/**
 * Sends the result for one request if it is ready and not sent yet.
 * `force` resends even if it was reported before (the Retry button).
 */
export async function reportIfReady(requestId: string, opts: { force?: boolean } = {}): Promise<ReportOutcome> {
  const state = await loadRequestState(requestId);
  if (!state) return "not_ready";
  const { status, request } = state;
  if (status.partner_status !== "complete") return "not_ready";
  if (request.reportedAt && !opts.force) return "already_reported";

  const decision = status.metadata?.Decision === "Passed" ? "passed" : "not_passed";
  const summary = outcomeSummary(request.candidateName, status, state.score);

  if (!request.callbackUrl) {
    // Lever, Ashby and other signed-webhook connections have no callback;
    // they get decisions through the Webhooks page.
    await prisma.atsTestRequest.update({ where: { id: request.id }, data: { status: "reported", reportedAt: new Date(), reportedDecision: decision } });
    await logSyncEvent({
      workspaceId: request.workspaceId,
      provider: request.provider,
      direction: "out",
      status: "info",
      summary: `${summary}. ${providerName(request.provider)} reads decisions through your webhooks.`,
      candidateId: request.candidateId,
      requestId: request.id,
    });
    return "recorded";
  }

  const res = await patchCallback(request.callbackUrl);
  if (res.ok) {
    await prisma.atsTestRequest.update({ where: { id: request.id }, data: { status: "reported", reportedAt: new Date(), reportedDecision: decision } });
    // Earlier failures for this request are now handled.
    await prisma.atsSyncEvent.updateMany({
      where: { requestId: request.id, direction: "out", status: "failed", resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
  }
  await logSyncEvent({
    workspaceId: request.workspaceId,
    provider: request.provider,
    direction: "out",
    status: res.ok ? "sent" : "failed",
    summary,
    detail: res.ok ? null : res.error,
    httpStatus: res.httpStatus,
    candidateId: request.candidateId,
    requestId: request.id,
  });
  return res.ok ? "sent" : "failed";
}

type EventData = {
  candidate?: { id?: string | null } | null;
  screening?: { id?: string } | null;
  takeHome?: { id?: string } | null;
};

/**
 * Listener for the workspace event bus: candidate.decided,
 * screening.completed and takehome.submitted. Finds the open ATS requests the
 * event touches and reports any that are now ready.
 */
export async function onAtsWorkspaceEvent(workspaceId: string, event: string, data: EventData): Promise<void> {
  const sessionId = data.screening?.id ?? data.takeHome?.id ?? null;
  const candidateId = data.candidate?.id ?? null;
  if (!sessionId && !candidateId) return;
  const open = await prisma.atsTestRequest.findMany({
    where: {
      workspaceId,
      reportedAt: null,
      OR: [...(sessionId ? [{ sessionId }] : []), ...(candidateId ? [{ candidateId }] : [])],
    },
    select: { id: true },
    take: 20,
  });
  for (const r of open) {
    const outcome = await reportIfReady(r.id);
    if (outcome === "not_ready" && event !== "candidate.decided") await noteCompletedWaiting(r.id);
  }
}

/** One "completed, waiting for a decision" line in the sync log. */
async function noteCompletedWaiting(requestId: string): Promise<void> {
  const state = await loadRequestState(requestId);
  if (!state || state.status.partner_status !== "completed_awaiting_decision") return;
  const already = await prisma.atsSyncEvent.count({ where: { requestId, status: "info", summary: { contains: "waiting for a decision" } } });
  if (already) return;
  await logSyncEvent({
    workspaceId: state.request.workspaceId,
    provider: state.request.provider,
    direction: "out",
    status: "info",
    summary: `${state.request.candidateName}: ${screeningNoun(state.request.screeningKind)} completed, waiting for a decision`,
    candidateId: state.request.candidateId,
    requestId,
  });
}

/** "Sync now": re-check every open request in the workspace. */
export async function syncOpenRequests(workspaceId: string): Promise<{ checked: number; sent: number; failed: number }> {
  const open = await prisma.atsTestRequest.findMany({
    where: { workspaceId, reportedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    take: 200,
  });
  let sent = 0;
  let failed = 0;
  for (const r of open) {
    const o = await reportIfReady(r.id);
    if (o === "sent" || o === "recorded") sent++;
    if (o === "failed") failed++;
  }
  return { checked: open.length, sent, failed };
}

