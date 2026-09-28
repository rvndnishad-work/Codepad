/**
 * Recording live interviews: LiveKit records the whole call (room composite
 * egress) straight into the private R2 bucket as one MP4. Each recording is
 * a row in InterviewRecording that follows the egress from recording to
 * processing to ready (or failed), and is deleted 7 days after it is made.
 *
 * Nothing records until the host presses Record and the candidate agreed,
 * in the lobby or when asked in the room. A ready recording
 * is charged once, in chargeRecordingCredits.
 *
 * Server only.
 */
import { randomUUID } from "crypto";
import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";
import type { InterviewRecording, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { r2Config, signedGetUrl } from "@/lib/storage/r2";
import { liveKitApiHost, liveKitConfig, videoRoomName, type LiveKitConfig } from "@/lib/video/livekit-server";
import { videoCallsOn } from "@/lib/video/addon";
import { includedPart } from "@/lib/billing/included-credits";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { liveRecordingKey, recordingExpiresAt, recordingExpiryLabel } from "./retention";
import {
  consentAskOpen,
  declinedLabel,
  recordControl,
  egressOutcome,
  recordingCredits,
  recordingDownloadName,
  recordingDurationLabel,
  recordingPending,
  recordingRefusal,
  reportRecordingState,
  shortError,
  type RecordingRefusalCode,
  type ReportRecording,
  type ReportRecordings,
  type RoomRecording,
} from "./live";

function egressClient(cfg: LiveKitConfig): EgressClient {
  return new EgressClient(liveKitApiHost(cfg), cfg.apiKey, cfg.apiSecret);
}

/** Recording is possible on this server: the bucket and LiveKit are both set up. */
export function recordingConfigured(): boolean {
  return !!r2Config() && !!liveKitConfig();
}

type Actor = { actorUserId: string | null; actorEmail?: string | null };

const SESSION_SELECT = {
  id: true,
  type: true,
  status: true,
  workspaceId: true,
  builtinVideo: true,
  recordVideo: true,
  candidateConsentAt: true,
  candidateName: true,
  workspace: { select: { planName: true, trialEndsAt: true, stripeSubscriptionId: true, videoEnabled: true } },
  user: { select: { name: true } },
} as const;

type SessionRow = Prisma.InterviewSessionGetPayload<{ select: typeof SESSION_SELECT }>;

async function creditBalance(tx: Prisma.TransactionClient | typeof prisma, workspaceId: string): Promise<number> {
  const agg = await tx.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

function builtinOn(s: SessionRow): boolean {
  return !!s.workspace && videoCallsOn(s.workspace) && s.builtinVideo;
}

async function startInputs(s: SessionRow, active?: boolean) {
  const running = active ?? !!(await prisma.interviewRecording.findFirst({ where: { interviewSessionId: s.id, status: "recording" }, select: { id: true } }));
  const credits = s.workspaceId ? await creditBalance(prisma, s.workspaceId) : 0;
  return {
    configured: recordingConfigured(),
    builtinVideo: builtinOn(s),
    recordVideo: s.recordVideo,
    status: s.status,
    candidateConsented: !!s.candidateConsentAt,
    credits,
    active: running,
  };
}

async function checkStart(s: SessionRow) {
  return recordingRefusal(await startInputs(s));
}

/* ── Asking the candidate in the room ───────────────────────────────────
 * An interview not set up to be recorded can still be recorded when the
 * candidate agrees in the room. Asking switches recordVideo on and clears
 * candidateConsentAt (an agreement to an unrecorded call does not count,
 * as when recording is switched on before the interview), so the
 * candidate's side sees an open question. Their answer either sets
 * candidateConsentAt and starts the recording, or switches recordVideo
 * back off. The request and the answer are audit entries; the request
 * carries who asked and the earlier agreement, and a no is read back so
 * the candidate is not asked again in this interview.
 */

type ConsentLog = {
  request: { actorUserId: string | null; actorEmail: string | null; askedBy: string | null; prevConsentAt: Date | null } | null;
  declined: boolean;
};

function metaOf(raw: string | null): Record<string, unknown> {
  try {
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function consentLog(s: { id: string; workspaceId: string | null }): Promise<ConsentLog> {
  if (!s.workspaceId) return { request: null, declined: false };
  try {
    const rows = await prisma.workspaceAuditLog.findMany({
      where: {
        workspaceId: s.workspaceId,
        targetType: "interviewSession",
        targetId: s.id,
        action: { in: [WORKSPACE_AUDIT_ACTIONS.RECORDING_CONSENT_REQUESTED, WORKSPACE_AUDIT_ACTIONS.RECORDING_CONSENT_DECLINED] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { action: true, actorUserId: true, actorEmail: true, meta: true },
    });
    const req = rows.find((r) => r.action === WORKSPACE_AUDIT_ACTIONS.RECORDING_CONSENT_REQUESTED);
    const meta = metaOf(req?.meta ?? null);
    const prev = typeof meta.prevConsentAt === "string" ? new Date(meta.prevConsentAt) : null;
    return {
      request: req
        ? {
            actorUserId: req.actorUserId,
            actorEmail: req.actorEmail,
            askedBy: typeof meta.askedBy === "string" ? meta.askedBy : null,
            prevConsentAt: prev && !Number.isNaN(prev.getTime()) ? prev : null,
          }
        : null,
      declined: rows.some((r) => r.action === WORKSPACE_AUDIT_ACTIONS.RECORDING_CONSENT_DECLINED),
    };
  } catch (err) {
    console.error("[recording] consent log read failed:", err);
    return { request: null, declined: false };
  }
}

/**
 * A host asked in the room and the candidate has not answered yet. The
 * room then asks in place, so a candidate who reloads is not sent back to
 * the lobby to agree (they could not say no there), and any agreement the
 * request cleared still counts for the workspace's own consent.
 */
export async function pendingRoomAsk(s: { id: string; workspaceId: string | null; recordVideo: boolean; candidateConsentAt: Date | null }): Promise<{ prevConsentAt: Date | null } | null> {
  if (!s.recordVideo || s.candidateConsentAt) return null;
  const log = await consentLog(s);
  return log.request ? { prevConsentAt: log.request.prevConsentAt } : null;
}

export type ConsentResult = { ok: true; started?: boolean } | { ok: false; code: RecordingRefusalCode | "missing" | "declined"; error: string };

/** The host asks the candidate, in the room, to record a call that was not set up to be recorded. */
export async function askRecordingConsent({ sessionId, actorUserId, actorEmail = null, askedBy }: { sessionId: string; askedBy: string } & Actor): Promise<ConsentResult> {
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: SESSION_SELECT });
  if (!s || s.type !== "live" || !s.workspaceId) return { ok: false, code: "missing", error: "This interview no longer exists." };
  const log = await consentLog(s);
  const c = recordControl({ ...(await startInputs(s)), declined: log.declined });
  // Already agreed, already asked, or already recording: nothing to ask.
  if (c.control === "start" || c.control === "waiting" || c.control === "recording") return { ok: true };
  if (c.control === "declined") return { ok: false, code: "declined", error: `${declinedLabel(s.candidateName)}. They are not asked again in this interview.` };
  if (c.control !== "ask") return { ok: false, code: c.code ?? "not_set_up", error: c.message ?? "Recording cannot start here." };

  const res = await prisma.interviewSession.updateMany({ where: { id: s.id, recordVideo: false }, data: { recordVideo: true, candidateConsentAt: null } });
  if (res.count) {
    await writeWorkspaceAuditEntry({
      workspaceId: s.workspaceId,
      actorUserId,
      actorEmail,
      action: WORKSPACE_AUDIT_ACTIONS.RECORDING_CONSENT_REQUESTED,
      targetType: "interviewSession",
      targetId: s.id,
      meta: { candidateName: s.candidateName, askedBy, prevConsentAt: s.candidateConsentAt?.toISOString() ?? null },
    });
  }
  return { ok: true };
}

/**
 * The candidate answers in the room. Yes stores the agreement and, when a
 * host asked in the room, starts the recording right away, so it does not
 * depend on the host's tab. No switches recording back off for this
 * interview and gives back any earlier agreement the request cleared.
 */
export async function answerRecordingConsent({ sessionId, allow }: { sessionId: string; allow: boolean }): Promise<ConsentResult> {
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: SESSION_SELECT });
  if (!s || s.type !== "live" || !s.workspaceId) return { ok: false, code: "missing", error: "This interview no longer exists." };
  const open = consentAskOpen({ recordVideo: s.recordVideo, builtinVideo: builtinOn(s), status: s.status, candidateConsented: !!s.candidateConsentAt });
  if (!open) return { ok: true };
  const log = await consentLog(s);
  const who = { candidateName: s.candidateName, source: "candidate" };

  if (!allow) {
    const res = await prisma.interviewSession.updateMany({
      where: { id: s.id, recordVideo: true, candidateConsentAt: null },
      data: { recordVideo: false, candidateConsentAt: log.request?.prevConsentAt ?? null },
    });
    if (res.count) {
      await writeWorkspaceAuditEntry({ workspaceId: s.workspaceId, action: WORKSPACE_AUDIT_ACTIONS.RECORDING_CONSENT_DECLINED, targetType: "interviewSession", targetId: s.id, meta: who });
    }
    return { ok: true };
  }

  const res = await prisma.interviewSession.updateMany({ where: { id: s.id, recordVideo: true, candidateConsentAt: null }, data: { candidateConsentAt: new Date() } });
  if (!res.count) return { ok: true };
  await writeWorkspaceAuditEntry({ workspaceId: s.workspaceId, action: WORKSPACE_AUDIT_ACTIONS.RECORDING_CONSENT_GIVEN, targetType: "interviewSession", targetId: s.id, meta: who });
  if (!log.request) return { ok: true, started: false };
  const started = await startLiveRecording({ sessionId: s.id, actorUserId: log.request.actorUserId, actorEmail: log.request.actorEmail });
  return { ok: true, started: started.ok };
}

export type StartResult = { ok: true; recordingId: string } | { ok: false; code: RecordingRefusalCode | "missing" | "egress_failed"; error: string };

/** Stored on a recording that LiveKit never started. */
const START_FAILED = "The recording did not start.";

export async function startLiveRecording({ sessionId, actorUserId, actorEmail = null }: { sessionId: string } & Actor): Promise<StartResult> {
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: SESSION_SELECT });
  if (!s || s.type !== "live" || !s.workspaceId) return { ok: false, code: "missing", error: "This interview no longer exists." };

  const refusal = await checkStart(s);
  const r2 = r2Config();
  const lk = liveKitConfig();
  if (refusal) return { ok: false, code: refusal.code, error: refusal.message };
  if (!r2 || !lk) return { ok: false, code: "not_set_up", error: "Recording is not set up yet." };

  const id = randomUUID().replace(/-/g, "");
  const storageKey = liveRecordingKey(s.workspaceId, s.id, id);
  await prisma.interviewRecording.create({
    data: {
      id,
      workspaceId: s.workspaceId,
      interviewSessionId: s.id,
      storageKey,
      status: "recording",
      mime: "video/mp4",
      startedById: actorUserId,
      expiresAt: recordingExpiresAt(),
    },
  });

  try {
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: storageKey,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey: r2.accessKeyId,
          secret: r2.secretAccessKey,
          bucket: r2.bucket,
          endpoint: r2.endpoint,
          region: "auto",
          forcePathStyle: true,
        }),
      },
    });
    const info = await egressClient(lk).startRoomCompositeEgress(videoRoomName(s.id), output, { layout: "speaker" });
    await prisma.interviewRecording.update({ where: { id }, data: { egressId: info.egressId } });
  } catch (err) {
    console.error("[recording] egress start failed:", err);
    await prisma.interviewRecording.update({
      where: { id },
      // The raw egress error is logged above; the report shows plain words.
      data: { status: "failed", endedAt: new Date(), error: START_FAILED },
    });
    return { ok: false, code: "egress_failed", error: "Recording did not start. Make sure someone is on the call, then try again." };
  }

  await writeWorkspaceAuditEntry({
    workspaceId: s.workspaceId,
    actorUserId,
    actorEmail,
    action: WORKSPACE_AUDIT_ACTIONS.RECORDING_STARTED,
    targetType: "interviewSession",
    targetId: s.id,
    meta: { candidateName: s.candidateName, recordingId: id },
  });
  return { ok: true, recordingId: id };
}

/**
 * Stops the interview's active recording. LiveKit then finishes the file
 * and uploads it, which takes a few minutes; the row waits in processing.
 */
export async function stopLiveRecording({
  sessionId,
  actorUserId = null,
  actorEmail = null,
  reason = null,
}: { sessionId: string; reason?: string | null } & Partial<Actor>): Promise<{ stopped: number }> {
  const rows = await prisma.interviewRecording.findMany({
    where: { interviewSessionId: sessionId, status: "recording" },
    select: { id: true, egressId: true, workspaceId: true },
  });
  if (!rows.length) return { stopped: 0 };
  const lk = liveKitConfig();
  for (const r of rows) {
    if (lk && r.egressId) {
      try {
        await egressClient(lk).stopEgress(r.egressId);
      } catch (err) {
        // Already ended (the room closed, or it failed): sync picks up the outcome.
        console.warn("[recording] stop egress:", err instanceof Error ? err.message : err);
      }
    }
    await prisma.interviewRecording.updateMany({
      where: { id: r.id, status: "recording" },
      data: r.egressId ? { status: "processing", endedAt: new Date() } : { status: "failed", endedAt: new Date(), error: "The recording never started." },
    });
  }
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: { candidateName: true } });
  await writeWorkspaceAuditEntry({
    workspaceId: rows[0].workspaceId,
    actorUserId,
    actorEmail,
    action: WORKSPACE_AUDIT_ACTIONS.RECORDING_STOPPED,
    targetType: "interviewSession",
    targetId: sessionId,
    meta: { candidateName: s?.candidateName ?? null, ...(reason ? { reason } : {}) },
  });
  return { stopped: rows.length };
}

/**
 * Before an interview's call closes (ended, cancelled or deleted): stops
 * every egress still running in its room, found through LiveKit by room
 * name so it works even after the interview row is gone. Best effort.
 */
export async function stopRoomRecordings(sessionId: string): Promise<void> {
  try {
    await stopLiveRecording({ sessionId, reason: "The interview ended" });
  } catch (err) {
    console.error("[recording] stop on close failed:", err);
  }
  const lk = liveKitConfig();
  if (!lk) return;
  try {
    const client = egressClient(lk);
    const running = await client.listEgress({ roomName: videoRoomName(sessionId), active: true });
    for (const e of running) {
      await client.stopEgress(e.egressId).catch(() => undefined);
    }
  } catch {
    // No room, or LiveKit unreachable. Closing the room ends any egress anyway.
  }
}

/** Egress older than this with no answer from LiveKit is given up on. */
const LOST_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Brings a recording row up to date with LiveKit, and charges it once it
 * is ready. Called lazily from the report and the recording API. Returns
 * the row as it now stands. Never throws.
 */
export async function syncLiveRecording(rec: InterviewRecording): Promise<InterviewRecording> {
  try {
    if (rec.status === "ready" && rec.creditsCharged === 0) {
      await chargeRecordingCredits(rec.id);
      return (await prisma.interviewRecording.findUnique({ where: { id: rec.id } })) ?? rec;
    }
    if (!recordingPending(rec.status)) return rec;
    const lk = liveKitConfig();
    if (!lk) return rec;
    if (!rec.egressId) {
      if (Date.now() - rec.startedAt.getTime() < 60_000) return rec;
      return await prisma.interviewRecording.update({ where: { id: rec.id }, data: { status: "failed", endedAt: rec.endedAt ?? new Date(), error: "The recording never started." } });
    }

    const [info] = await egressClient(lk).listEgress({ egressId: rec.egressId });
    if (!info) {
      if (Date.now() - rec.startedAt.getTime() < LOST_AFTER_MS) return rec;
      return await prisma.interviewRecording.update({ where: { id: rec.id }, data: { status: "failed", endedAt: rec.endedAt ?? new Date(), error: "The recording was lost." } });
    }

    const out = egressOutcome(info);
    if (out.status === rec.status) return rec;
    const endedAt = rec.endedAt ?? (info.endedAt ? new Date(Number(info.endedAt / BigInt(1_000_000))) : new Date());
    const claimed = await prisma.interviewRecording.updateMany({
      where: { id: rec.id, status: rec.status },
      data:
        out.status === "ready"
          ? { status: "ready", sizeBytes: out.sizeBytes, seconds: out.seconds, endedAt, error: null }
          : out.status === "failed"
            ? { status: "failed", endedAt, error: out.error }
            : { status: out.status, ...(out.status === "processing" ? { endedAt } : {}) },
    });
    if (claimed.count && out.status === "ready") await chargeRecordingCredits(rec.id);
    return (await prisma.interviewRecording.findUnique({ where: { id: rec.id } })) ?? rec;
  } catch (err) {
    console.error("[recording] sync failed:", err);
    return rec;
  }
}

/** Every recording of one interview, newest first, brought up to date. */
export async function syncedRecordings(sessionId: string): Promise<InterviewRecording[]> {
  const rows = await prisma.interviewRecording.findMany({ where: { interviewSessionId: sessionId }, orderBy: { startedAt: "desc" } });
  return Promise.all(rows.map((r) => syncLiveRecording(r)));
}

/**
 * Charges a ready recording: recordingCredits() AI credits (1 per started
 * hour), once. The claim on creditsCharged makes a second call a no-op.
 * Included credits go first, like screenings. The balance may dip below
 * zero: the call already happened, and starting checked there was credit.
 */
export async function chargeRecordingCredits(recordingId: string): Promise<{ charged: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const rec = await tx.interviewRecording.findUnique({
      where: { id: recordingId },
      select: { id: true, workspaceId: true, status: true, seconds: true, creditsCharged: true, interviewSession: { select: { candidateName: true } } },
    });
    if (!rec || rec.status !== "ready" || rec.creditsCharged > 0) return null;
    const cost = recordingCredits(rec.seconds);
    if (cost <= 0) return null;
    const claimed = await tx.interviewRecording.updateMany({ where: { id: rec.id, creditsCharged: 0 }, data: { creditsCharged: cost } });
    if (!claimed.count) return null;

    const who = rec.interviewSession.candidateName?.trim();
    await tx.aIInterviewCreditLedger.create({
      data: {
        workspaceId: rec.workspaceId,
        kind: "CONSUMPTION",
        amount: -cost,
        note: `Interview recording${who ? ` with ${who}` : ""}, ${cost} ${cost === 1 ? "hour" : "hours"}`,
      },
    });
    const ws = await tx.workspace.findUnique({ where: { id: rec.workspaceId }, select: { includedCreditsLeft: true } });
    const fromIncluded = includedPart(cost, ws?.includedCreditsLeft ?? 0);
    if (fromIncluded > 0) {
      await tx.workspace.updateMany({
        where: { id: rec.workspaceId, includedCreditsLeft: { gte: fromIncluded } },
        data: { includedCreditsLeft: { decrement: fromIncluded } },
      });
    }
    return { workspaceId: rec.workspaceId, cost, balance: await creditBalance(tx, rec.workspaceId) };
  });
  if (!result) return { charged: 0 };

  // Low-credit notices, after the charge so they can never undo it.
  try {
    const { notifyAiCreditsLowIfNeeded } = await import("@/lib/notifications/triggers");
    await notifyAiCreditsLowIfNeeded({ workspaceId: result.workspaceId, balance: result.balance });
    const { checkLowCredits } = await import("@/lib/billing/credit-alerts");
    await checkLowCredits(result.workspaceId, result.balance);
  } catch (err) {
    console.error("[recording] low-credit check failed:", err);
  }
  return { charged: result.cost };
}

/**
 * What the room shows: whether the call is being recorded, and for
 * interviewers whether Record would work and why not.
 */
export async function roomRecordingState(sessionId: string, interviewer: boolean): Promise<RoomRecording> {
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: SESSION_SELECT });
  if (!s) return { recording: false, startedAt: null };
  const pending = await prisma.interviewRecording.findMany({
    where: { interviewSessionId: sessionId, status: "recording" },
    orderBy: { startedAt: "desc" },
  });
  const synced = await Promise.all(pending.map((r) => syncLiveRecording(r)));
  const active = synced.find((r) => r.status === "recording") ?? null;
  // A row without an egress id is still starting (and may fail): nobody is
  // told the call is recorded until LiveKit has accepted it.
  const live = active?.egressId ? active : null;
  const base: RoomRecording = { recording: !!live, startedAt: live?.startedAt.toISOString() ?? null };
  if (!interviewer) {
    const open = !active && consentAskOpen({ recordVideo: s.recordVideo, builtinVideo: builtinOn(s), status: s.status, candidateConsented: !!s.candidateConsentAt });
    if (!open) return base;
    const log = await consentLog(s);
    return { ...base, ask: { by: log.request?.askedBy ?? s.user?.name ?? null } };
  }
  // A no only matters while recording is off again; skip the read otherwise.
  const declined = !active && !s.recordVideo ? (await consentLog(s)).declined : false;
  const c = recordControl({ ...(await startInputs(s, !!active)), declined });
  return {
    ...base,
    canStart: c.control === "start",
    reason: c.message,
    code: c.code,
    control: c.control,
    candidateName: s.candidateName,
  };
}

/**
 * The report's Recording section: every recording of the interview, synced
 * with LiveKit, with fresh signed links to watch and download the ready
 * ones. Null when the interview was not set up to record and has none.
 * Members only; the caller checks.
 */
export async function reportRecordings(sessionId: string): Promise<ReportRecordings | null> {
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: { recordVideo: true, builtinVideo: true, candidateName: true } });
  if (!s) return null;
  const rows = await syncedRecordings(sessionId);
  if (!rows.length && !s.recordVideo) return null;
  const cfg = r2Config();
  const now = new Date();
  const items = await Promise.all(
    rows.map(async (r): Promise<ReportRecording> => {
      const state = reportRecordingState(r, !!cfg, now);
      let playUrl: string | null = null;
      let downloadUrl: string | null = null;
      if (state === "ready" && cfg) {
        try {
          // An hour: long enough to watch the whole call in one go.
          [playUrl, downloadUrl] = await Promise.all([
            signedGetUrl(cfg, r.storageKey, { seconds: 3600, contentType: r.mime }),
            signedGetUrl(cfg, r.storageKey, { seconds: 3600, contentType: r.mime, downloadName: recordingDownloadName(s.candidateName, r.startedAt) }),
          ]);
        } catch (err) {
          console.error("[recording] sign failed:", err);
        }
      }
      return {
        id: r.id,
        state,
        startedAt: r.startedAt.toISOString(),
        duration: recordingDurationLabel(r.seconds),
        expiry: state === "deleted" ? null : recordingExpiryLabel(r.expiresAt, now),
        playUrl,
        downloadUrl,
        error: state === "failed" ? r.error : null,
      };
    }),
  );
  return { configured: !!cfg, recordVideo: s.recordVideo && s.builtinVideo, items };
}
