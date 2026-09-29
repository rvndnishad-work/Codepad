/**
 * Settings > Data and privacy, server side: finding and erasing a
 * candidate's data, the retention rules the nightly cron runs, the
 * "export everything" zip, and erasing a whole workspace once its 30-day
 * undo window has passed. Pure rules live in data-privacy.ts.
 */
import "server-only";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { cancelInterviewEvent } from "@/lib/calendar/server";
import { closeVideoRoomAfter } from "@/lib/video/close-after";
import { collectRecordingKeys, deleteRecordingKeys, markInterviewRecordingsDeleted, readRecordingObject } from "@/lib/recording/objects-server";
import { sendEmail } from "@/lib/email";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { ERASED_NAME } from "@/lib/crm/candidates-server";
import { baseUrl } from "@/lib/interview/room-server";
import { DELETION_GRACE_DAYS, RETENTION_DEFAULTS, formatWorkspaceDate, type DateFormat, type RetentionKind } from "./settings";
import {
  EMPTY_COUNTS,
  PASSED_STAGES,
  PASSED_STATUSES,
  RETENTION_COPY,
  candidateMatchesRule,
  latestDate,
  planRetentionStep,
  redactMeta,
  toCsv,
  withRetentionDefaults,
  type CandidateDataCounts,
} from "./data-privacy";

const DAY_MS = 24 * 60 * 60 * 1000;
const ERASED_EMAIL = "erased@invalid";
/** Most candidates one rule erases in one night; the rest follow the next night. */
export const RETENTION_BATCH = 500;
/** Recordings bigger than this in total are listed, not attached, in a copy. */
const COPY_AUDIO_MAX_BYTES = 10 * 1024 * 1024;

/* ── Who to email ───────────────────────────────────────────────────────── */

/** Owner and admin emails for a workspace. */
export async function managerEmails(workspaceId: string): Promise<string[]> {
  const rows = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: { in: [...MANAGER_ROLES] } },
    select: { user: { select: { email: true } } },
  });
  return [...new Set(rows.map((r) => r.user.email?.trim().toLowerCase()).filter((e): e is string => !!e))];
}

/** Email every owner and admin, one message each. Returns how many went out. */
export async function emailManagers(
  workspaceId: string,
  props: { subject: string; badge: string; heading: string; paragraphs: string[]; cta?: { label: string; url: string } | null },
  recipients?: string[],
): Promise<number> {
  const to = recipients ?? (await managerEmails(workspaceId));
  let sent = 0;
  for (const email of to) {
    const res = await sendEmail({
      template: "data-privacy-notice",
      to: email,
      workspaceId,
      props: { ...props, footer: "You get this because you are an owner or admin of this workspace on Interviewpad." },
    }).catch(() => null);
    if (res?.sent) sent++;
  }
  return sent;
}

export function settingsUrl(slug: string, tab = "data-privacy"): string {
  return `${baseUrl()}/w/${slug}/settings/${tab}`;
}

/* ── One person's data ──────────────────────────────────────────────────── */

/** Everything in a workspace that belongs to one person, as ids. */
export type CandidateScope = {
  emails: string[];
  names: string[];
  candidateIds: string[];
  takeHomeIds: string[];
  interviewSessionIds: string[];
  aiSessionIds: string[];
  attemptIds: string[];
  counts: CandidateDataCounts;
};

const ci = (email: string) => ({ equals: email, mode: "insensitive" as const });

/**
 * Collect the records for one person, by email and/or candidate ids:
 * candidate rows, notes, take homes, AI screenings and their recordings,
 * interviews and scorecards, and emails sent to them.
 */
export async function candidateScope(workspaceId: string, by: { email?: string; candidateIds?: string[] }): Promise<CandidateScope> {
  const candidates = await prisma.candidate.findMany({
    where: {
      workspaceId,
      OR: [...(by.email ? [{ email: ci(by.email) }] : []), ...(by.candidateIds?.length ? [{ id: { in: by.candidateIds } }] : [])],
    },
    select: { id: true, name: true, email: true },
  });
  const candidateIds = candidates.map((c) => c.id);
  const emails = [...new Set([...(by.email ? [by.email] : []), ...candidates.map((c) => c.email?.trim().toLowerCase()).filter((e): e is string => !!e)])];
  const byCandidate = candidateIds.length ? [{ candidateId: { in: candidateIds } }] : [];
  // Records sent to the email that are not tied to some other candidate row.
  const ownedOrUnlinked = { OR: [{ candidateId: null }, ...(candidateIds.length ? [{ candidateId: { in: candidateIds } }] : [])] };
  const byEmail = emails.map((e) => ({ candidateEmail: ci(e), ...ownedOrUnlinked }));
  const personFilter = [...byCandidate, ...byEmail];

  if (!personFilter.length) {
    return { emails, names: [], candidateIds: [], takeHomeIds: [], interviewSessionIds: [], aiSessionIds: [], attemptIds: [], counts: { ...EMPTY_COUNTS } };
  }

  const [takeHomes, sessions, aiSessions, notes, emailCount] = await Promise.all([
    prisma.takeHomeAssignment.findMany({ where: { workspaceId, OR: personFilter }, select: { id: true, attemptId: true, candidateName: true } }),
    candidateIds.length
      ? prisma.interviewSession.findMany({ where: { workspaceId, candidateId: { in: candidateIds } }, select: { id: true, type: true } })
      : Promise.resolve([]),
    prisma.aIInterviewSession.findMany({ where: { workspaceId, OR: personFilter }, select: { id: true, candidateName: true } }),
    candidateIds.length ? prisma.candidateNote.count({ where: { candidateId: { in: candidateIds } } }) : Promise.resolve(0),
    emails.length ? prisma.emailLog.count({ where: { workspaceId, recipientEmail: { in: emails } } }) : Promise.resolve(0),
  ]);
  const sessionIds = sessions.map((s) => s.id);
  const liveIds = sessions.filter((s) => s.type !== "take-home").map((s) => s.id);
  const aiIds = aiSessions.map((s) => s.id);
  const [recordings, scorecards, sessionAttempts] = await Promise.all([
    aiIds.length ? prisma.aIInterviewAudio.count({ where: { sessionId: { in: aiIds } } }) : Promise.resolve(0),
    liveIds.length ? prisma.interviewScorecard.count({ where: { sessionId: { in: liveIds } } }) : Promise.resolve(0),
    sessionIds.length ? prisma.challengeAttempt.findMany({ where: { sessionId: { in: sessionIds } }, select: { id: true } }) : Promise.resolve([]),
  ]);
  const names = [...new Set([...candidates.map((c) => c.name), ...takeHomes.map((t) => t.candidateName), ...aiSessions.map((s) => s.candidateName)])].filter(
    (n) => n && n !== ERASED_NAME,
  );

  return {
    emails,
    names,
    candidateIds,
    takeHomeIds: takeHomes.map((t) => t.id),
    interviewSessionIds: sessionIds,
    aiSessionIds: aiIds,
    attemptIds: [...takeHomes.map((t) => t.attemptId).filter((a): a is string => !!a), ...sessionAttempts.map((a) => a.id)],
    counts: {
      candidates: candidates.length,
      notes,
      takeHomes: takeHomes.length + sessions.length - liveIds.length,
      aiScreenings: aiIds.length,
      recordings,
      interviews: liveIds.length,
      scorecards,
      emails: emailCount,
    },
  };
}

const parseJson = (s: string | null | undefined): unknown => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

/**
 * A copy of one person's data as plain JSON, for a "send a copy" request.
 * Voice recordings are included as base64 while they fit in an email.
 */
export async function buildCandidateCopy(workspaceId: string, scope: CandidateScope, workspaceName: string) {
  const [candidates, notes, takeHomes, sessions, aiSessions, emails] = await Promise.all([
    prisma.candidate.findMany({
      where: { id: { in: scope.candidateIds } },
      select: {
        name: true,
        email: true,
        phone: true,
        source: true,
        stage: true,
        status: true,
        tags: true,
        notes: true,
        rejectReason: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.candidateNote.findMany({
      where: { candidateId: { in: scope.candidateIds } },
      select: { body: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.takeHomeAssignment.findMany({
      where: { id: { in: scope.takeHomeIds } },
      select: {
        candidateName: true,
        candidateEmail: true,
        status: true,
        expiresAt: true,
        startedAt: true,
        submittedAt: true,
        createdAt: true,
        challenge: { select: { title: true } },
        attempt: { select: { files: true, testResults: true, score: true, durationSec: true } },
      },
    }),
    prisma.interviewSession.findMany({
      where: { id: { in: scope.interviewSessionIds } },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        scheduledAt: true,
        startedAt: true,
        finishedAt: true,
        deadlineAt: true,
        candidateConsentAt: true,
        createdAt: true,
        scorecards: { where: { status: "submitted" }, select: { reviewerName: true, ratingsJson: true, notes: true, recommendation: true, submittedAt: true } },
      },
    }),
    prisma.aIInterviewSession.findMany({
      where: { id: { in: scope.aiSessionIds } },
      select: {
        positionTitle: true,
        candidateName: true,
        candidateEmail: true,
        status: true,
        score: true,
        aiSummary: true,
        chatHistory: true,
        consentAt: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true,
        rounds: { select: { order: true, paradigm: true, status: true, score: true, filesJson: true, answersJson: true }, orderBy: { order: "asc" } },
        audioClips: {
          select: { question: true, followUp: true, seq: true, mime: true, seconds: true, createdAt: true, bytes: true, storageKey: true },
          orderBy: [{ question: "asc" }, { followUp: "asc" }, { seq: "asc" }],
        },
      },
    }),
    prisma.emailLog.findMany({
      where: { workspaceId, recipientEmail: { in: scope.emails } },
      select: { template: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const attempts = scope.attemptIds.length
    ? await prisma.challengeAttempt.findMany({
        where: { id: { in: scope.attemptIds }, sessionId: { in: scope.interviewSessionIds } },
        select: { sessionId: true, files: true, testResults: true, score: true, durationSec: true, finishedAt: true },
      })
    : [];

  // Clips in the recordings bucket are fetched while there is room under the cap.
  const bucketBytes = new Map<string, Uint8Array>();
  let fetched = 0;
  for (const a of aiSessions.flatMap((s) => s.audioClips)) {
    if (a.bytes) {
      fetched += a.bytes.length;
      continue;
    }
    if (!a.storageKey || fetched >= COPY_AUDIO_MAX_BYTES) continue;
    const data = await readRecordingObject(a.storageKey, COPY_AUDIO_MAX_BYTES - fetched);
    if (data) {
      bucketBytes.set(a.storageKey, data);
      fetched += data.length;
    }
  }

  let audioBytes = 0;
  const copy = {
    about: `A copy of the data ${workspaceName} holds about you on Interviewpad, made on ${new Date().toISOString()}.`,
    email: scope.emails[0] ?? null,
    candidateRecords: candidates.map((c) => ({ ...c, tags: parseJson(c.tags) })),
    notes,
    takeHomes: [
      ...takeHomes.map((t) => ({
        title: t.challenge.title,
        name: t.candidateName,
        email: t.candidateEmail,
        status: t.status,
        sentAt: t.createdAt,
        expiresAt: t.expiresAt,
        startedAt: t.startedAt,
        submittedAt: t.submittedAt,
        score: t.attempt?.score ?? null,
        durationSec: t.attempt?.durationSec ?? null,
        code: parseJson(t.attempt?.files),
        testResults: parseJson(t.attempt?.testResults),
      })),
      ...sessions
        .filter((s) => s.type === "take-home")
        .map((s) => ({
          title: s.title,
          status: s.status,
          sentAt: s.createdAt,
          deadlineAt: s.deadlineAt,
          startedAt: s.startedAt,
          finishedAt: s.finishedAt,
          answers: attempts
            .filter((a) => a.sessionId === s.id)
            .map((a) => ({
              score: a.score,
              durationSec: a.durationSec,
              finishedAt: a.finishedAt,
              code: parseJson(a.files),
              testResults: parseJson(a.testResults),
            })),
        })),
    ],
    aiScreenings: aiSessions.map((s) => ({
      position: s.positionTitle,
      name: s.candidateName,
      email: s.candidateEmail,
      status: s.status,
      score: s.score,
      summary: s.aiSummary,
      consentAt: s.consentAt,
      invitedAt: s.createdAt,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      conversation: parseJson(s.chatHistory),
      rounds: s.rounds.map((r) => ({
        order: r.order,
        kind: r.paradigm,
        status: r.status,
        score: r.score,
        code: parseJson(r.filesJson),
        answers: parseJson(r.answersJson),
      })),
      voiceRecordings: s.audioClips.map((a) => {
        const data = a.bytes ?? (a.storageKey ? bucketBytes.get(a.storageKey) : undefined) ?? null;
        const size = data?.length ?? 0;
        const include = !!data && audioBytes + size <= COPY_AUDIO_MAX_BYTES;
        if (include) audioBytes += size;
        return {
          question: a.question + 1,
          followUp: a.followUp,
          part: a.seq + 1,
          seconds: a.seconds,
          recordedAt: a.createdAt,
          mime: a.mime,
          ...(include && data
            ? { base64: Buffer.from(data).toString("base64") }
            : { note: data ? "Too large to attach. Reply to this email to get it another way." : "Could not attach this recording. Reply to this email to get it another way." }),
        };
      }),
    })),
    interviews: sessions
      .filter((s) => s.type !== "take-home")
      .map((s) => ({
        title: s.title,
        status: s.status,
        scheduledAt: s.scheduledAt,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        consentAt: s.candidateConsentAt,
        scorecards: s.scorecards.map((c) => ({
          interviewer: c.reviewerName,
          ratings: parseJson(c.ratingsJson),
          notes: c.notes,
          recommendation: c.recommendation,
          submittedAt: c.submittedAt,
        })),
      })),
    emailsSent: emails,
  };
  return copy;
}

/**
 * Erase one person's data. Candidate rows and their notes go; take homes,
 * AI screenings and interviews stay for workspace reporting but lose the
 * name, email, conversation, recordings, code replays and share links;
 * emails sent to them are removed from the email log, and their name and
 * email are taken out of audit entries about them.
 */
export async function eraseCandidateScope(workspaceId: string, scope: CandidateScope): Promise<number> {
  const { candidateIds, takeHomeIds, interviewSessionIds, aiSessionIds, attemptIds, emails } = scope;
  const recordingKeys = await collectRecordingKeys({ aiSessionIds, interviewSessionIds });
  // Their interviews still to come are called off: nobody is left to join them.
  const upcomingIds = (
    await prisma.interviewSession.findMany({
      where: { id: { in: interviewSessionIds }, workspaceId, type: { not: "take-home" }, status: "scheduled", startedAt: null },
      select: { id: true },
    })
  ).map((s) => s.id);
  await prisma.$transaction([
    prisma.sessionEventLog.deleteMany({ where: { attemptId: { in: attemptIds } } }),
    prisma.takeHomeAssignment.updateMany({
      where: { id: { in: takeHomeIds }, workspaceId },
      data: { candidateName: ERASED_NAME, candidateEmail: ERASED_EMAIL },
    }),
    // The round links are cleared here, not left to the cascade: Postgres re-checks
    // a row this transaction already changed, and the rounds are gone by then.
    prisma.interviewSession.updateMany({ where: { id: { in: interviewSessionIds }, workspaceId }, data: { candidateName: ERASED_NAME, candidateRoundId: null } }),
    prisma.interviewSession.updateMany({ where: { id: { in: upcomingIds }, status: "scheduled" }, data: { status: "cancelled", cancelledAt: new Date() } }),
    prisma.aIInterviewSession.updateMany({
      where: { id: { in: aiSessionIds }, workspaceId },
      data: { candidateName: ERASED_NAME, candidateEmail: ERASED_EMAIL, chatHistory: "[]", candidateRoundId: null },
    }),
    prisma.aIInterviewRound.updateMany({ where: { sessionId: { in: aiSessionIds } }, data: { chatHistory: null } }),
    prisma.aIInterviewAudio.deleteMany({ where: { sessionId: { in: aiSessionIds } } }),
    prisma.aIReportShareLink.deleteMany({ where: { sessionId: { in: aiSessionIds } } }),
    prisma.emailLog.deleteMany({ where: { workspaceId, recipientEmail: { in: emails } } }),
    prisma.atsSyncEvent.deleteMany({ where: { workspaceId, candidateId: { in: candidateIds } } }),
    prisma.candidate.deleteMany({ where: { id: { in: candidateIds }, workspaceId } }),
  ]);
  for (const id of upcomingIds) {
    await cancelInterviewEvent(id).catch((err) => console.error("[erase] calendar cancel failed", err));
    closeVideoRoomAfter(id);
  }
  // Interview videos go too; their rows stay, marked deleted.
  await markInterviewRecordingsDeleted(interviewSessionIds).catch((err) => console.error("[recordings] could not mark videos deleted", err));
  await deleteRecordingKeys(recordingKeys);

  // Take their name and email out of audit entries about them. The entries
  // themselves stay, so the log still shows what happened.
  const targetIds = [...candidateIds, ...takeHomeIds, ...interviewSessionIds, ...aiSessionIds];
  const needles = [...scope.names, ...emails];
  if (needles.length) {
    const rows = await prisma.workspaceAuditLog.findMany({
      where: {
        workspaceId,
        OR: [...(targetIds.length ? [{ targetId: { in: targetIds } }] : []), ...emails.map((e) => ({ meta: { contains: e, mode: "insensitive" as const } }))],
      },
      select: { id: true, meta: true },
      take: 5000,
    });
    for (const r of rows) {
      const next = redactMeta(r.meta, needles);
      if (next !== r.meta) await prisma.workspaceAuditLog.update({ where: { id: r.id }, data: { meta: next } }).catch(() => null);
    }
  }
  return (
    scope.counts.candidates +
    scope.counts.notes +
    takeHomeIds.length +
    interviewSessionIds.length +
    aiSessionIds.length +
    scope.counts.recordings +
    scope.counts.emails
  );
}

/* ── Retention rules ────────────────────────────────────────────────────── */

type CandidateRuleKind = "INACTIVE_CANDIDATES" | "NOT_PASSED";

/** Candidates a candidate rule covers at `cutoff`, up to `limit`. */
export async function candidatesForRule(workspaceId: string, kind: CandidateRuleKind, cutoff: Date, limit = RETENTION_BATCH): Promise<string[]> {
  const notPassed = { stage: { notIn: [...PASSED_STAGES] }, status: { notIn: [...PASSED_STATUSES] } };
  const where =
    kind === "NOT_PASSED"
      ? {
          workspaceId,
          ...notPassed,
          stage: "REJECTED",
          OR: [{ stageChangedAt: { lt: cutoff } }, { stageChangedAt: null, updatedAt: { lt: cutoff } }],
        }
      : { workspaceId, ...notPassed, updatedAt: { lt: cutoff }, OR: [{ stageChangedAt: null }, { stageChangedAt: { lt: cutoff } }] };

  const out: string[] = [];
  let cursor: string | undefined;
  // Page through, because recent screenings can rule a candidate back out.
  for (let page = 0; page < 20 && out.length < limit; page++) {
    const rows = await prisma.candidate.findMany({
      where,
      orderBy: { id: "asc" },
      take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        stage: true,
        status: true,
        stageChangedAt: true,
        updatedAt: true,
        candidateNotes: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        takeHomes: { select: { createdAt: true, submittedAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        sessions: { select: { createdAt: true, finishedAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        aiInterviewSessions: { select: { createdAt: true, finishedAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!rows.length) break;
    cursor = rows[rows.length - 1].id;
    for (const c of rows) {
      const lastActivityAt = latestDate(
        c.candidateNotes[0]?.createdAt,
        c.takeHomes[0]?.createdAt,
        c.takeHomes[0]?.submittedAt,
        c.sessions[0]?.createdAt,
        c.sessions[0]?.finishedAt,
        c.aiInterviewSessions[0]?.createdAt,
        c.aiInterviewSessions[0]?.finishedAt,
      );
      if (candidateMatchesRule(kind, { ...c, lastActivityAt }, cutoff)) out.push(c.id);
      if (out.length >= limit) break;
    }
    if (rows.length < 200) break;
  }
  return out;
}

/** Take-home attempts (legacy and session) that belong to a workspace. */
async function workspaceAttemptFilter(workspaceId: string) {
  const takeHomeSessions = await prisma.interviewSession.findMany({ where: { workspaceId, type: "take-home" }, select: { id: true } });
  return {
    OR: [
      { takeHomeAssignment: { workspaceId } },
      { challenge: { workspaceId } },
      ...(takeHomeSessions.length ? [{ sessionId: { in: takeHomeSessions.map((s) => s.id) } }] : []),
    ],
  };
}

/** How many items a rule covers at `cutoff` (candidate rules count up to a cap). */
export async function countForRule(workspaceId: string, kind: RetentionKind, cutoff: Date): Promise<number> {
  if (kind === "VOICE_RECORDINGS") {
    return prisma.aIInterviewAudio.count({ where: { createdAt: { lt: cutoff }, session: { workspaceId } } });
  }
  if (kind === "CODE_REPLAYS") {
    return prisma.sessionEventLog.count({ where: { createdAt: { lt: cutoff }, attempt: await workspaceAttemptFilter(workspaceId) } });
  }
  return (await candidatesForRule(workspaceId, kind, cutoff, 5000)).length;
}

/** Erase what a rule covers at `cutoff`. Returns how many items went and whether more remain. */
export async function eraseForRule(workspaceId: string, kind: RetentionKind, cutoff: Date): Promise<{ erased: number; more: boolean }> {
  if (kind === "VOICE_RECORDINGS") {
    const where = { createdAt: { lt: cutoff }, session: { workspaceId } };
    const keyed = await prisma.aIInterviewAudio.findMany({ where: { ...where, storageKey: { not: null } }, select: { storageKey: true } });
    const r = await prisma.aIInterviewAudio.deleteMany({ where });
    await deleteRecordingKeys(keyed.map((k) => k.storageKey).filter((k): k is string => !!k));
    return { erased: r.count, more: false };
  }
  if (kind === "CODE_REPLAYS") {
    const r = await prisma.sessionEventLog.deleteMany({ where: { createdAt: { lt: cutoff }, attempt: await workspaceAttemptFilter(workspaceId) } });
    return { erased: r.count, more: false };
  }
  const ids = await candidatesForRule(workspaceId, kind, cutoff);
  let erased = 0;
  // Candidates one at a time, so each person's records are matched by their own email.
  for (const id of ids) {
    const scope = await candidateScope(workspaceId, { candidateIds: [id] });
    if (!scope.candidateIds.length) continue;
    await eraseCandidateScope(workspaceId, scope);
    erased++;
  }
  return { erased, more: ids.length >= RETENTION_BATCH };
}

export type RetentionRunSummary = { rules: number; notices: number; erased: number; errors: number };

/**
 * Nightly retention run over every enabled rule. For each rule: email the
 * 7-day notice, wait, or erase what the notice announced. Workspaces
 * waiting to be deleted are skipped.
 */
export async function runRetention(now = new Date()): Promise<RetentionRunSummary> {
  const rules = await prisma.retentionRule.findMany({
    where: { enabled: true, workspace: { deletionScheduledAt: null } },
    select: {
      id: true,
      kind: true,
      enabled: true,
      amount: true,
      unit: true,
      noticeSentAt: true,
      nextNoticeAt: true,
      lastRunAt: true,
      lastErasedCount: true,
      workspace: { select: { id: true, slug: true, name: true, timezone: true, dateFormat: true } },
    },
    orderBy: { workspaceId: "asc" },
  });

  const summary: RetentionRunSummary = { rules: rules.length, notices: 0, erased: 0, errors: 0 };
  for (const row of rules) {
    const [rule] = withRetentionDefaults([row]);
    const kind = rule.kind;
    const ws = row.workspace;
    const copy = RETENTION_COPY[kind];
    const label = RETENTION_DEFAULTS[kind].label;
    try {
      const plan = planRetentionStep(rule, now);
      if (plan.step === "off") continue;
      if (plan.step === "wait") {
        await prisma.retentionRule.update({ where: { id: row.id }, data: { lastRunAt: now } });
        continue;
      }
      if (plan.step === "notice") {
        const count = await countForRule(ws.id, kind, plan.cutoff);
        if (count === 0) {
          await prisma.retentionRule.update({ where: { id: row.id }, data: { lastRunAt: now } });
          continue;
        }
        const when = formatWorkspaceDate(plan.dueAt, { timezone: ws.timezone, dateFormat: ws.dateFormat as DateFormat });
        const noun = copy.noun[count === 1 ? 0 : 1];
        const recipients = await emailManagers(ws.id, {
          subject: `${ws.name}: ${count} ${noun} will be erased on ${when}`,
          badge: "Data retention",
          heading: `${count} ${noun} will be erased on ${when}.`,
          paragraphs: [
            `Your rule "${label}" in ${ws.name} covers ${count === 1 ? "this" : "these"} ${noun}. ${count === 1 ? "It is" : "They are"} erased for good on ${when}.`,
            kind === "INACTIVE_CANDIDATES"
              ? "Passed candidates are never erased by a rule. To keep someone, add a note to their profile, or change the rule before that date."
              : kind === "NOT_PASSED"
                ? "Passed candidates are never erased by a rule. To keep them, turn the rule off or make its period longer before that date."
                : "To keep them, turn the rule off or make its period longer before that date.",
          ],
          cta: { label: "Review the rule", url: settingsUrl(ws.slug) },
        });
        await prisma.retentionRule.update({ where: { id: row.id }, data: { lastRunAt: now, noticeSentAt: now, nextNoticeAt: plan.dueAt } });
        await writeWorkspaceAuditEntry({
          workspaceId: ws.id,
          action: WORKSPACE_AUDIT_ACTIONS.RETENTION_NOTICE_SENT,
          targetType: "retentionRule",
          targetId: row.id,
          meta: { kind, label, dueAt: plan.dueAt.toISOString(), count, recipients, source: "auto:retention", tab: "data-privacy" },
        });
        summary.notices++;
        continue;
      }
      // Erase what the notice announced.
      const { erased, more } = await eraseForRule(ws.id, kind, plan.cutoff);
      await prisma.retentionRule.update({
        where: { id: row.id },
        data: {
          lastRunAt: now,
          lastErasedCount: erased,
          // Keep the announced batch open while there is more of it to erase.
          ...(more ? {} : { noticeSentAt: null, nextNoticeAt: null }),
        },
      });
      if (erased > 0) {
        await writeWorkspaceAuditEntry({
          workspaceId: ws.id,
          action: WORKSPACE_AUDIT_ACTIONS.RETENTION_ITEMS_ERASED,
          targetType: "retentionRule",
          targetId: row.id,
          meta: { kind, label, count: erased, source: "auto:retention", tab: "data-privacy" },
        });
      }
      summary.erased += erased;
    } catch (err) {
      summary.errors++;
      console.error(`[retention] rule ${row.id} (${kind}) failed:`, err);
    }
  }
  return summary;
}

/* ── Export everything ──────────────────────────────────────────────────── */

const README = (name: string, at: Date) => `Export of ${name} from Interviewpad, made ${at.toISOString()}.

Each CSV file is one kind of record. ai-screenings.json holds the full AI
screening conversations, rounds and answers. Voice recordings are not in
this export; open a screening in the app to play them.

Dates are in UTC (ISO 8601).
`;

/** Build the "export everything" zip for a workspace. */
export async function buildWorkspaceExport(workspaceId: string): Promise<{ zip: Buffer; files: number; rows: number }> {
  const ws = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      createdAt: true,
      timezone: true,
      dateFormat: true,
      members: { select: { role: true, lastActiveAt: true, user: { select: { name: true, email: true } } } },
    },
  });

  const [batches, candidates, notes, takeHomes, sessions, aiSessions, scorecards, audit, emails, credits, requests, rules] = await Promise.all([
    prisma.candidateBatch.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.candidate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      include: { batch: { select: { name: true } }, owner: { select: { email: true } } },
    }),
    prisma.candidateNote.findMany({ where: { candidate: { workspaceId } }, orderBy: { createdAt: "asc" }, include: { author: { select: { email: true } } } }),
    prisma.takeHomeAssignment.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      include: { challenge: { select: { title: true } }, attempt: { select: { score: true, durationSec: true } } },
    }),
    prisma.interviewSession.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.aIInterviewSession.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      include: { rounds: { orderBy: { order: "asc" } } },
    }),
    prisma.interviewScorecard.findMany({ where: { session: { workspaceId } }, orderBy: { createdAt: "asc" } }),
    prisma.workspaceAuditLog.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.emailLog.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.aIInterviewCreditLedger.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.dataRequest.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
    prisma.retentionRule.findMany({ where: { workspaceId } }),
  ]);

  const zip = new JSZip();
  const now = new Date();
  let rows = 0;
  const csv = (file: string, columns: string[], data: Record<string, unknown>[]) => {
    rows += data.length;
    zip.file(file, toCsv(columns, data));
  };

  zip.file("README.txt", README(ws.name, now));
  zip.file(
    "workspace.json",
    JSON.stringify(
      { name: ws.name, webAddress: ws.slug, plan: ws.planName, createdAt: ws.createdAt, timezone: ws.timezone, dateFormat: ws.dateFormat, exportedAt: now },
      null,
      2,
    ),
  );
  csv(
    "members.csv",
    ["name", "email", "role", "lastActiveAt"],
    ws.members.map((m) => ({ name: m.user.name, email: m.user.email, role: m.role, lastActiveAt: m.lastActiveAt })),
  );
  csv("batches.csv", ["id", "name", "roleTitle", "status", "deadline", "targetHires", "createdAt"], batches);
  csv(
    "candidates.csv",
    [
      "id",
      "name",
      "email",
      "phone",
      "source",
      "stage",
      "status",
      "rejectReason",
      "rejectReasonNote",
      "tags",
      "batch",
      "owner",
      "atsRef",
      "notes",
      "createdAt",
      "updatedAt",
    ],
    candidates.map((c) => ({ ...c, batch: c.batch?.name ?? null, owner: c.owner?.email ?? null })),
  );
  csv(
    "candidate-notes.csv",
    ["candidateId", "author", "body", "createdAt"],
    notes.map((n) => ({ candidateId: n.candidateId, author: n.author?.email ?? null, body: n.body, createdAt: n.createdAt })),
  );
  csv(
    "take-homes.csv",
    [
      "id",
      "kind",
      "candidateId",
      "candidateName",
      "candidateEmail",
      "title",
      "status",
      "passMark",
      "score",
      "durationSec",
      "sentAt",
      "deadlineAt",
      "startedAt",
      "finishedAt",
    ],
    [
      ...takeHomes.map((t) => ({
        id: t.id,
        kind: "assignment",
        candidateId: t.candidateId,
        candidateName: t.candidateName,
        candidateEmail: t.candidateEmail,
        title: t.challenge.title,
        status: t.status,
        score: t.attempt?.score ?? null,
        durationSec: t.attempt?.durationSec ?? null,
        sentAt: t.createdAt,
        deadlineAt: t.expiresAt,
        startedAt: t.startedAt,
        finishedAt: t.submittedAt,
      })),
      ...sessions
        .filter((s) => s.type === "take-home")
        .map((s) => ({
          id: s.id,
          kind: "session",
          candidateId: s.candidateId,
          candidateName: s.candidateName,
          title: s.title,
          status: s.status,
          passMark: s.takeHomePassMark,
          sentAt: s.createdAt,
          deadlineAt: s.deadlineAt,
          startedAt: s.startedAt,
          finishedAt: s.finishedAt,
        })),
    ],
  );
  csv(
    "interviews.csv",
    [
      "id",
      "candidateId",
      "candidateName",
      "title",
      "type",
      "format",
      "status",
      "verdict",
      "passMark",
      "scheduledAt",
      "startedAt",
      "finishedAt",
      "candidateConsentAt",
      "createdAt",
    ],
    sessions.filter((s) => s.type !== "take-home").map((s) => ({ ...s, passMark: s.scorecardPassMark })),
  );
  csv("scorecards.csv", ["sessionId", "reviewerName", "status", "recommendation", "ratingsJson", "notes", "submittedAt"], scorecards);
  csv(
    "ai-screenings.csv",
    ["id", "candidateId", "candidateName", "candidateEmail", "positionTitle", "status", "score", "consentAt", "invitedAt", "startedAt", "finishedAt"],
    aiSessions.map((s) => ({ ...s, invitedAt: s.createdAt })),
  );
  rows += aiSessions.length;
  zip.file(
    "ai-screenings.json",
    JSON.stringify(
      aiSessions.map((s) => ({
        id: s.id,
        candidateId: s.candidateId,
        candidateName: s.candidateName,
        positionTitle: s.positionTitle,
        score: s.score,
        ratings: parseJson(s.ratings),
        summary: s.aiSummary,
        conversation: parseJson(s.chatHistory),
        rounds: s.rounds.map((r) => ({
          order: r.order,
          kind: r.paradigm,
          language: r.language,
          status: r.status,
          score: r.score,
          ratings: parseJson(r.ratings),
          code: parseJson(r.filesJson),
          answers: parseJson(r.answersJson),
        })),
      })),
      null,
      2,
    ),
  );
  csv("audit-log.csv", ["createdAt", "actorEmail", "action", "targetType", "targetId", "meta"], audit);
  csv("emails.csv", ["createdAt", "template", "recipientEmail", "status", "errorReason"], emails);
  csv("credits.csv", ["createdAt", "kind", "amount", "sessionId", "note"], credits);
  csv("data-requests.csv", ["createdAt", "email", "kind", "status", "dueAt", "completedAt", "itemCount"], requests);
  csv("retention-rules.csv", ["kind", "enabled", "amount", "unit", "lastRunAt", "lastErasedCount"], withRetentionDefaults(rules));

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return { zip: buf, files: Object.keys(zip.files).length, rows };
}

/* ── Delete the workspace ───────────────────────────────────────────────── */

/** Workspaces whose 30-day undo window has passed. */
export async function workspacesDueForErase(now = new Date(), take = 10) {
  return prisma.workspace.findMany({
    where: { deletionScheduledAt: { not: null, lte: new Date(now.getTime() - DELETION_GRACE_DAYS * DAY_MS) } },
    select: { id: true },
    take,
  });
}

/**
 * Erase a workspace for good. Cancels its subscription first (and stops if
 * that fails, so nobody keeps paying for a workspace that is gone), then
 * removes records that are not cleaned up by the database on their own:
 * interviews, take-home attempts, workspace questions and the email log.
 * Everything else goes with the workspace row.
 */
export async function eraseWorkspace(workspaceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, stripeSubscriptionId: true, deletionScheduledAt: true },
  });
  if (!ws) return { ok: true };
  if (!ws.deletionScheduledAt) return { ok: false, error: "Deletion was cancelled." };
  // Never before the undo window has passed, whoever calls this.
  if (ws.deletionScheduledAt.getTime() + DELETION_GRACE_DAYS * DAY_MS > Date.now())
    return { ok: false, error: "The undo window has not passed yet." };

  if (ws.stripeSubscriptionId) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      await getStripe().subscriptions.cancel(ws.stripeSubscriptionId);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      // Already gone at Stripe: nothing to cancel.
      if (code !== "resource_missing")
        return { ok: false, error: `Could not cancel the subscription: ${err instanceof Error ? err.message : "unknown error"}` };
    }
  }

  const recipients = await managerEmails(workspaceId);
  const recordingKeys = await collectRecordingKeys({ workspaceId });
  const sessions = await prisma.interviewSession.findMany({ where: { workspaceId }, select: { id: true } });
  const legacy = await prisma.takeHomeAssignment.findMany({ where: { workspaceId, attemptId: { not: null } }, select: { attemptId: true } });
  const sessionIds = sessions.map((s) => s.id);
  const attemptIds = legacy.map((l) => l.attemptId).filter((a): a is string => !!a);

  for (let i = 0; i < sessionIds.length; i += 1000) {
    await prisma.challengeAttempt.deleteMany({ where: { sessionId: { in: sessionIds.slice(i, i + 1000) } } });
  }
  for (let i = 0; i < attemptIds.length; i += 1000) {
    await prisma.challengeAttempt.deleteMany({ where: { id: { in: attemptIds.slice(i, i + 1000) } } });
  }
  await prisma.interviewSession.deleteMany({ where: { workspaceId } });
  await prisma.challenge.deleteMany({ where: { workspaceId } });
  await prisma.emailLog.deleteMany({ where: { workspaceId } });
  await prisma.workspace.delete({ where: { id: workspaceId } });
  await deleteRecordingKeys(recordingKeys);

  for (const email of recipients) {
    await sendEmail({
      template: "data-privacy-notice",
      to: email,
      props: {
        subject: `${ws.name} has been deleted`,
        badge: "Workspace deleted",
        heading: `${ws.name} has been deleted.`,
        paragraphs: [
          `The ${DELETION_GRACE_DAYS}-day window to undo it has passed, so the workspace and its candidates, screenings, interviews and settings are now erased. This cannot be undone.`,
          ...(ws.stripeSubscriptionId ? ["The subscription was cancelled, so there are no further charges."] : []),
        ],
        cta: null,
        footer: "You get this because you were an owner or admin of this workspace on Interviewpad.",
      },
    }).catch(() => null);
  }
  return { ok: true };
}
