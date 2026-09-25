/**
 * Data loaders for the recruiter's AI screening pages: the review queue, the
 * candidate report, the screenings list and compare view, and question sets.
 * Server-only. The pure rules these build on live in `./console`.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkspaceCredits } from "./credits";
import { listTemplatesForWorkspace } from "./template-resolver";
import { getStarterFilesByRoundId, inferStarterForSubmission, resolveRoundsContent } from "./round-content";
import { resolveSessionRounds, type SessionRound } from "./rounds";
import { diffFiles, diffStats, type DiffStats, type FileDiff } from "./diff";
import {
  awaitsDecision,
  heldCredits,
  integrity,
  isMeaningfulLine,
  parseSummary,
  ratingPercent,
  REVIEW_STAGES,
  suggestion,
  type Integrity,
  type QueueSort,
  type QueueView,
  type Suggestion,
  type SummarySection,
} from "./console";
import { roundLabel } from "./round-label";
import { parseAnswers, parseTheoryRound, parseTheorySettings, type TheoryAnswer, type TheorySettings } from "./theory";
import { classifyChallenge, type CuratableChallenge } from "@/lib/interview/stack";

export const QUEUE_PAGE_SIZE = 25;

/* ── Credits ─────────────────────────────────────────────────────────────── */

export type CreditSummary = { balance: number; held: number; available: number; usedThisMonth: number };

export async function loadCreditSummary(workspaceId: string): Promise<CreditSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [balance, pending, used] = await Promise.all([
    getWorkspaceCredits(workspaceId),
    prisma.aIInterviewSession.findMany({
      where: { workspaceId, status: "PENDING", startedAt: null, practice: false },
      select: { engagementLevel: true, status: true, startedAt: true, expiresAt: true },
    }),
    prisma.aIInterviewCreditLedger.aggregate({
      where: { workspaceId, kind: "CONSUMPTION", createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ]);
  const held = heldCredits(pending, now);
  return { balance, held, available: Math.max(0, balance - held), usedThisMonth: -(used._sum.amount ?? 0) };
}

/* ── Review queue ────────────────────────────────────────────────────────── */

function reviewWhere(workspaceId: string): Prisma.AIInterviewSessionWhereInput {
  return {
    workspaceId,
    practice: false,
    status: "COMPLETED",
    OR: [{ candidateId: null }, { candidate: { stage: { in: [...REVIEW_STAGES] } } }],
  };
}

function viewWhere(workspaceId: string, view: QueueView): Prisma.AIInterviewSessionWhereInput {
  switch (view) {
    case "review":
      return reviewWhere(workspaceId);
    case "progress":
      return { workspaceId, practice: false, status: "ACTIVE" };
    case "invited":
      return { workspaceId, practice: false, status: { in: ["PENDING", "EXPIRED"] } };
    default:
      return { workspaceId, practice: false };
  }
}

export type QueueCounts = Record<QueueView, number>;

export async function loadQueueCounts(workspaceId: string): Promise<QueueCounts> {
  const [review, progress, invited, all] = await Promise.all(
    (["review", "progress", "invited", "all"] as const).map((v) => prisma.aIInterviewSession.count({ where: viewWhere(workspaceId, v) })),
  );
  return { review, progress, invited, all };
}

export type QueueRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  screeningId: string | null;
  screeningTitle: string | null;
  status: string;
  stage: string | null;
  candidateId: string | null;
  score: number | null;
  suggestion: Suggestion | null;
  integrity: Integrity | null;
  rounds: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string | null;
  inviteEmailStatus: string | null;
  awaitsDecision: boolean;
};

export type QueueQuery = { view: QueueView; q: string; screening: string; sort: QueueSort; page: number };

function orderFor(view: QueueView, sort: QueueSort): Prisma.AIInterviewSessionOrderByWithRelationInput[] {
  if (sort === "name") return [{ candidateName: "asc" }];
  if (sort === "score") return [{ score: { sort: "desc", nulls: "last" } }, { finishedAt: { sort: "desc", nulls: "last" } }];
  if (view === "review") return [{ finishedAt: { sort: "desc", nulls: "last" } }];
  return [{ updatedAt: "desc" }];
}

function queueWhere(workspaceId: string, query: Pick<QueueQuery, "view" | "q" | "screening">): Prisma.AIInterviewSessionWhereInput {
  const and: Prisma.AIInterviewSessionWhereInput[] = [viewWhere(workspaceId, query.view)];
  const q = query.q.trim();
  if (q) {
    and.push({
      OR: [
        { candidateName: { contains: q, mode: "insensitive" } },
        { candidateEmail: { contains: q, mode: "insensitive" } },
        { positionTitle: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (query.screening && query.screening !== "all") and.push({ batchId: query.screening });
  return { AND: and };
}

const queueSelect = {
  id: true,
  templateId: true,
  filesJson: true,
  starterFilesJson: true,
  candidateId: true,
  candidateName: true,
  candidateEmail: true,
  positionTitle: true,
  status: true,
  score: true,
  ratings: true,
  aiSuspicionScore: true,
  batchId: true,
  createdAt: true,
  startedAt: true,
  finishedAt: true,
  expiresAt: true,
  inviteEmailStatus: true,
  batch: { select: { positionTitle: true } },
  candidate: { select: { stage: true } },
  rounds: true,
} satisfies Prisma.AIInterviewSessionSelect;

type QueueSession = Prisma.AIInterviewSessionGetPayload<{ select: typeof queueSelect }>;

export async function loadQueue(workspaceId: string, query: QueueQuery): Promise<{ rows: QueueRow[]; total: number; pages: number }> {
  const where = queueWhere(workspaceId, query);
  const total = await prisma.aIInterviewSession.count({ where });
  const pages = Math.max(1, Math.ceil(total / QUEUE_PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page), pages);
  const sessions = await prisma.aIInterviewSession.findMany({
    where,
    orderBy: orderFor(query.view, query.sort),
    skip: (page - 1) * QUEUE_PAGE_SIZE,
    take: QUEUE_PAGE_SIZE,
    select: queueSelect,
  });
  const rows = await Promise.all(
    sessions.map(async (s) => {
      const lines = s.status === "COMPLETED" ? await linesWrittenFor(s, workspaceId) : null;
      return toQueueRow(s, lines);
    }),
  );
  return { rows, total, pages };
}

function toQueueRow(s: QueueSession, linesWritten: number | null): QueueRow {
  const stage = s.candidate?.stage ?? null;
  return {
    id: s.id,
    name: s.candidateName,
    email: s.candidateEmail,
    role: s.positionTitle,
    screeningId: s.batchId,
    screeningTitle: s.batch?.positionTitle ?? null,
    status: s.status,
    stage,
    candidateId: s.candidateId,
    score: s.status === "COMPLETED" ? s.score : null,
    suggestion: s.status === "COMPLETED" ? suggestion(s.score, linesWritten) : null,
    integrity: integrity(s.aiSuspicionScore),
    rounds: Math.max(1, s.rounds.length),
    createdAt: s.createdAt.toISOString(),
    startedAt: s.startedAt?.toISOString() ?? null,
    finishedAt: s.finishedAt?.toISOString() ?? null,
    expiresAt: s.expiresAt?.toISOString() ?? null,
    inviteEmailStatus: s.inviteEmailStatus,
    awaitsDecision: awaitsDecision(s.status, stage, !!s.candidateId),
  };
}

function parseFiles(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function meaningfulAdded(diffs: FileDiff[]): number {
  return diffs.reduce((n, d) => n + d.added.filter(isMeaningfulLine).length, 0);
}

/** Meaningful lines the candidate added across rounds; null when no starter is known. */
async function linesWrittenFor(s: QueueSession, workspaceId: string): Promise<number | null> {
  try {
    const starters = await getStarterFilesByRoundId(s as never, workspaceId);
    const rounds = resolveSessionRounds(s as never);
    let total = 0;
    let known = false;
    for (const r of rounds) {
      const starter = starters.get(r.id);
      const files = parseFiles(r.filesJson);
      if (!starter || !Object.keys(files).length) continue;
      known = true;
      total += meaningfulAdded(diffFiles(starter, files));
    }
    return known ? total : null;
  } catch {
    return null;
  }
}

/** Ids of the review queue in score order, for previous and next in the report. */
async function reviewOrder(workspaceId: string): Promise<string[]> {
  const rows = await prisma.aIInterviewSession.findMany({
    where: reviewWhere(workspaceId),
    orderBy: orderFor("review", "score"),
    select: { id: true },
    take: 500,
  });
  return rows.map((r) => r.id);
}

/* ── Screening options (for the queue filter and New screening) ──────────── */

export type ScreeningOption = { id: string; title: string; createdAt: string };

export async function loadScreeningOptions(workspaceId: string): Promise<ScreeningOption[]> {
  const rows = await prisma.aIScreeningBatch.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, positionTitle: true, createdAt: true },
    take: 200,
  });
  return rows.map((b) => ({ id: b.id, title: b.positionTitle, createdAt: b.createdAt.toISOString() }));
}

/* ── Candidate report ────────────────────────────────────────────────────── */

export type Ratings = { code: number | null; problem: number | null; communication: number | null };

function parseRatings(raw: string | null | undefined): Ratings | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as { CodeQuality?: number; ProblemSolving?: number; Communication?: number };
    const out = { code: ratingPercent(r.CodeQuality), problem: ratingPercent(r.ProblemSolving), communication: ratingPercent(r.Communication) };
    return out.code == null && out.problem == null && out.communication == null ? null : out;
  } catch {
    return null;
  }
}

export type ReportRound = {
  id: string;
  order: number;
  title: string;
  description: string;
  kind: "frontend" | "backend" | "dsa" | "conversation" | "theory";
  label: string;
  language: string | null;
  frameworkLabel: string | null;
  minutes: number;
  status: string;
  score: number | null;
  ratings: Ratings | null;
  /** Theory rounds: every question with its reference answer and what was said. Recruiters only. */
  theory: ReportTheory | null;
  starter: Record<string, string>;
  files: Record<string, string>;
  /** Null when the starter is unknown (very old invites). */
  diffs: FileDiff[] | null;
  stats: DiffStats | null;
  linesWritten: number | null;
};

export type ReportTheory = {
  settings: TheorySettings;
  questions: {
    q: string;
    ref: string | null;
    tech: string | null;
    difficulty: string | null;
    answer: TheoryAnswer | null;
    /** Recordings of the spoken answer (follow-up 0 is the main answer), when replay was on. */
    clips: { id: string; followUp: number; seconds: number }[];
  }[];
};

export type ReportNote = { id: string; body: string; author: string; createdAt: string; mine: boolean };

export type ReportData = {
  id: string;
  status: string;
  candidate: { id: string | null; name: string; email: string; stage: string | null };
  role: string;
  screening: { id: string; title: string } | null;
  score: number | null;
  suggestion: Suggestion | null;
  integrity: Integrity | null;
  suspicion: number | null;
  ratings: Ratings | null;
  summary: SummarySection[];
  chat: { role: "user" | "assistant"; text: string; roundId?: string }[];
  rounds: ReportRound[];
  notes: ReportNote[];
  timeSpentSec: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string | null;
  inviteToken: string;
  inviteSentAt: string | null;
  inviteEmailStatus: string | null;
  inviteEmailError: string | null;
  reminderSentAt: string | null;
  engagementLevel: string;
  outboundCallCount: number;
  extension: { extraMinutes: number; used: number; max: number; minutesEach: number };
  awaitsDecision: boolean;
  nav: { prevId: string | null; nextId: string | null; position: number | null; total: number };
};

export async function loadReport(workspaceId: string, sessionId: string, viewerId: string): Promise<ReportData | null> {
  const s = await prisma.aIInterviewSession.findFirst({
    where: { id: sessionId, workspaceId, practice: false },
    include: {
      rounds: { orderBy: { order: "asc" } },
      batch: { select: { id: true, positionTitle: true } },
      candidate: {
        select: {
          id: true,
          stage: true,
          candidateNotes: {
            orderBy: { createdAt: "desc" },
            take: 50,
            select: { id: true, body: true, createdAt: true, authorId: true, author: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!s) return null;

  const sessionRounds = resolveSessionRounds(s);
  const [contents, starters, order, clipRows] = await Promise.all([
    resolveRoundsContent(sessionRounds, workspaceId),
    getStarterFilesByRoundId(s, workspaceId).catch(() => new Map<string, Record<string, string>>()),
    reviewOrder(workspaceId),
    prisma.aIInterviewAudio.findMany({
      where: { sessionId: s.id },
      orderBy: [{ question: "asc" }, { followUp: "asc" }, { seq: "asc" }, { createdAt: "asc" }],
      select: { id: true, roundId: true, question: true, followUp: true, seconds: true },
    }),
  ]);

  const rawRounds = new Map(s.rounds.map((x) => [x.id, x]));
  const rounds: ReportRound[] = [];
  for (const r of sessionRounds) {
    const c = contents.find((x) => x.roundId === r.id);
    const files = parseFiles(r.filesJson);
    let starter = starters.get(r.id) ?? null;
    if (!starter && r.legacy && Object.keys(files).length) {
      starter = await inferStarterForSubmission(files, workspaceId).catch(() => null);
    }
    const hasWork = Object.keys(files).length > 0;
    const diffs = starter && hasWork ? diffFiles(starter, files) : null;
    rounds.push({
      id: r.id,
      order: r.order,
      title: c?.title ?? `Round ${r.order + 1}`,
      description: c?.description ?? "",
      kind: c?.kind ?? (r.paradigm ?? "frontend"),
      label: roundLabel({ paradigm: c?.kind ?? r.paradigm ?? "frontend", language: c?.language ?? r.language, frameworkLabel: c?.frameworkLabel ?? r.frameworkLabel }),
      language: c?.language ?? r.language,
      frameworkLabel: c?.frameworkLabel ?? r.frameworkLabel,
      minutes: c?.estimatedMinutes ?? r.estimatedMinutes,
      status: r.status,
      score: r.legacy ? s.score : r.score,
      ratings: parseRatings(r.ratings),
      starter: starter ?? c?.starterFiles ?? {},
      files: hasWork ? files : (starter ?? c?.starterFiles ?? {}),
      diffs,
      stats: diffs ? diffStats(diffs) : null,
      linesWritten: diffs ? meaningfulAdded(diffs) : null,
      theory: r.paradigm === "theory" ? reportTheory(rawRounds.get(r.id), clipRows.filter((c) => c.roundId === r.id)) : null,
    });
  }

  const known = rounds.filter((r) => r.linesWritten != null);
  const linesWritten = known.length ? known.reduce((n, r) => n + (r.linesWritten ?? 0), 0) : null;

  let chat: { role: "user" | "assistant"; text: string; roundId?: string }[] = [];
  try {
    const parsed = JSON.parse(s.chatHistory || "[]");
    if (Array.isArray(parsed)) {
      chat = parsed
        .filter((m) => m && typeof m.text === "string")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          text: String(m.text),
          ...(typeof m.roundId === "string" ? { roundId: m.roundId } : {}),
        }));
    }
  } catch {
    chat = [];
  }

  const stage = s.candidate?.stage ?? null;
  const pos = order.indexOf(s.id);
  const completed = s.status === "COMPLETED";

  return {
    id: s.id,
    status: s.status,
    candidate: { id: s.candidateId, name: s.candidateName, email: s.candidateEmail, stage },
    role: s.positionTitle,
    screening: s.batch ? { id: s.batch.id, title: s.batch.positionTitle } : null,
    score: completed ? s.score : null,
    suggestion: completed ? suggestion(s.score, linesWritten) : null,
    integrity: integrity(s.aiSuspicionScore),
    suspicion: s.aiSuspicionScore,
    ratings: parseRatings(s.ratings),
    summary: parseSummary(s.aiSummary),
    chat,
    rounds,
    notes: (s.candidate?.candidateNotes ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      author: n.author?.name ?? n.author?.email ?? "A teammate",
      createdAt: n.createdAt.toISOString(),
      mine: n.authorId === viewerId,
    })),
    timeSpentSec: s.timeSpentSec,
    createdAt: s.createdAt.toISOString(),
    startedAt: s.startedAt?.toISOString() ?? null,
    finishedAt: s.finishedAt?.toISOString() ?? null,
    expiresAt: s.expiresAt?.toISOString() ?? null,
    inviteToken: s.inviteToken,
    inviteSentAt: s.inviteSentAt?.toISOString() ?? null,
    inviteEmailStatus: s.inviteEmailStatus,
    inviteEmailError: s.inviteEmailError,
    reminderSentAt: s.reminderSentAt?.toISOString() ?? null,
    engagementLevel: s.engagementLevel,
    outboundCallCount: s.outboundCallCount,
    extension: { extraMinutes: s.extraMinutes, used: s.extensionCount, max: s.maxExtensions, minutesEach: s.extensionMinutes },
    awaitsDecision: awaitsDecision(s.status, stage, !!s.candidateId),
    nav: {
      prevId: pos > 0 ? order[pos - 1] : null,
      nextId: pos >= 0 && pos < order.length - 1 ? order[pos + 1] : pos < 0 && order.length ? order[0] : null,
      position: pos >= 0 ? pos + 1 : null,
      total: order.length,
    },
  };
}

function reportTheory(
  raw: { theoryJson: string | null; answersJson: string | null } | undefined,
  clips: { id: string; question: number; followUp: number; seconds: number }[],
): ReportTheory | null {
  const data = parseTheoryRound(raw?.theoryJson);
  if (!data) return null;
  const answers = parseAnswers(raw?.answersJson).items;
  return {
    settings: data.settings,
    questions: data.items.map((it, i) => ({
      q: it.q,
      ref: it.a ?? null,
      tech: it.tech ?? null,
      difficulty: it.difficulty ?? null,
      answer: answers[i] ?? null,
      clips: clips.filter((c) => c.question === i).map((c) => ({ id: c.id, followUp: c.followUp, seconds: c.seconds })),
    })),
  };
}

/** The latest screening for a candidate, for old `?candidate=` links. */
export async function latestSessionForCandidate(workspaceId: string, candidateId: string): Promise<string | null> {
  const s = await prisma.aIInterviewSession.findFirst({
    where: { workspaceId, candidateId, practice: false },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return s?.id ?? null;
}

/* ── Screenings ──────────────────────────────────────────────────────────── */

export type ScreeningRow = {
  id: string;
  title: string;
  createdAt: string;
  createdBy: string | null;
  engagementLevel: string;
  rounds: string[];
  invited: number;
  started: number;
  finished: number;
  expired: number;
  toReview: number;
  avgScore: number | null;
  expiresAfterDays: number | null;
};

export async function loadScreenings(workspaceId: string): Promise<ScreeningRow[]> {
  const batches = await prisma.aIScreeningBatch.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      roundSpecs: { orderBy: { order: "asc" } },
      sessions: { select: { status: true, score: true, candidateId: true, candidate: { select: { stage: true } } } },
    },
  });
  const creators = await prisma.user.findMany({
    where: { id: { in: [...new Set(batches.map((b) => b.createdByUserId))] } },
    select: { id: true, name: true, email: true },
  });
  const who = new Map(creators.map((u) => [u.id, u.name ?? u.email ?? null]));
  return batches.map((b) => {
    const done = b.sessions.filter((s) => s.status === "COMPLETED");
    const scored = done.map((s) => s.score).filter((v): v is number => v != null);
    return {
      id: b.id,
      title: b.positionTitle,
      createdAt: b.createdAt.toISOString(),
      createdBy: who.get(b.createdByUserId) ?? null,
      engagementLevel: b.engagementLevel,
      rounds: b.roundSpecs.map((r) => roundLabel(r)),
      invited: b.sessions.length,
      started: b.sessions.filter((s) => s.status === "ACTIVE" || s.status === "COMPLETED").length,
      finished: done.length,
      expired: b.sessions.filter((s) => s.status === "EXPIRED").length,
      toReview: done.filter((s) => awaitsDecision(s.status, s.candidate?.stage, !!s.candidateId)).length,
      avgScore: scored.length ? Math.round(scored.reduce((a, v) => a + v, 0) / scored.length) : null,
      expiresAfterDays: b.expiresAfterDays,
    };
  });
}

export type CompareRow = {
  id: string;
  name: string;
  email: string;
  candidateId: string | null;
  stage: string | null;
  status: string;
  score: number | null;
  suggestion: Suggestion | null;
  integrity: Integrity | null;
  roundScores: (number | null)[];
  finishedAt: string | null;
  expiresAt: string | null;
  inviteEmailStatus: string | null;
  reminderSentAt: string | null;
  awaitsDecision: boolean;
};

export type ScreeningDetail = {
  id: string;
  title: string;
  createdAt: string;
  engagementLevel: string;
  expiresAfterDays: number | null;
  reminderAfterDays: number | null;
  rounds: { title: string; label: string; minutes: number; kind: string }[];
  roundSpecs: {
    paradigm: string;
    language: string | null;
    frameworkLabel: string | null;
    sourceKind: string;
    sourceId: string | null;
    templateId: string | null;
    estimatedMinutes: number;
    theory: TheorySettings | null;
  }[];
  people: CompareRow[];
};

export async function loadScreening(workspaceId: string, batchId: string): Promise<ScreeningDetail | null> {
  const b = await prisma.aIScreeningBatch.findFirst({
    where: { id: batchId, workspaceId },
    include: {
      roundSpecs: { orderBy: { order: "asc" } },
      sessions: {
        orderBy: [{ score: { sort: "desc", nulls: "last" } }, { candidateName: "asc" }],
        include: { rounds: { orderBy: { order: "asc" } }, candidate: { select: { stage: true } } },
      },
    },
  });
  if (!b) return null;

  // Titles for the shared rounds, resolved like a session's rounds.
  const pseudo: SessionRound[] = b.roundSpecs.map((r) => ({
    id: r.id,
    legacy: false,
    order: r.order,
    paradigm: r.paradigm as SessionRound["paradigm"],
    language: r.language,
    frameworkLabel: r.frameworkLabel,
    sourceKind: r.sourceKind as SessionRound["sourceKind"],
    sourceId: r.sourceId,
    templateId: r.templateId,
    estimatedMinutes: r.estimatedMinutes,
    filesJson: "{}",
    chatHistory: null,
    score: null,
    ratings: null,
    status: "PENDING",
    startedAt: null,
    finishedAt: null,
  }));
  const contents = await resolveRoundsContent(pseudo, workspaceId);

  return {
    id: b.id,
    title: b.positionTitle,
    createdAt: b.createdAt.toISOString(),
    engagementLevel: b.engagementLevel,
    expiresAfterDays: b.expiresAfterDays,
    reminderAfterDays: b.reminderAfterDays,
    rounds: b.roundSpecs.map((r, i) => ({
      title: contents[i]?.title ?? `Round ${i + 1}`,
      label: roundLabel(r),
      minutes: r.estimatedMinutes,
      kind: r.paradigm,
    })),
    roundSpecs: b.roundSpecs.map((r) => ({
      paradigm: r.paradigm,
      language: r.language,
      frameworkLabel: r.frameworkLabel,
      sourceKind: r.sourceKind,
      sourceId: r.sourceId,
      templateId: r.templateId,
      estimatedMinutes: r.estimatedMinutes,
      theory: r.paradigm === "theory" ? parseTheorySettings(r.theoryJson) : null,
    })),
    people: b.sessions.map((s) => {
      const stage = s.candidate?.stage ?? null;
      const done = s.status === "COMPLETED";
      return {
        id: s.id,
        name: s.candidateName,
        email: s.candidateEmail,
        candidateId: s.candidateId,
        stage,
        status: s.status,
        score: done ? s.score : null,
        suggestion: done ? suggestion(s.score) : null,
        integrity: integrity(s.aiSuspicionScore),
        roundScores: b.roundSpecs.map((_, i) => s.rounds[i]?.score ?? null),
        finishedAt: s.finishedAt?.toISOString() ?? null,
        expiresAt: s.expiresAt?.toISOString() ?? null,
        inviteEmailStatus: s.inviteEmailStatus,
        reminderSentAt: s.reminderSentAt?.toISOString() ?? null,
        awaitsDecision: awaitsDecision(s.status, stage, !!s.candidateId),
      };
    }),
  };
}

/* ── Question sets ───────────────────────────────────────────────────────── */

export type QuestionItem = {
  id: string;
  title: string;
  description: string;
  minutes: number;
  custom: boolean;
  kind: "frontend" | "backend" | "dsa" | "conversation";
  language: string | null;
  frameworkLabel: string | null;
  label: string;
  starterFiles: Record<string, string>;
  testsCode: string;
  uses: number;
  boundServerIds: string[];
};

export type QuestionSets = {
  items: QuestionItem[];
  servers: { id: string; name: string }[];
  allowExternalMcp: boolean;
};

export async function loadQuestionSets(workspaceId: string): Promise<QuestionSets> {
  const [templates, servers, ws, roundUses, legacyUses] = await Promise.all([
    listTemplatesForWorkspace(workspaceId),
    prisma.externalMcpServer.findMany({
      where: { workspaceId, enabled: true },
      select: { id: true, name: true, templateBindings: { select: { templateId: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { allowExternalMcp: true } }),
    prisma.aIInterviewRound.groupBy({
      by: ["templateId"],
      where: { session: { workspaceId }, templateId: { not: null } },
      _count: { _all: true },
    }),
    prisma.aIInterviewSession.groupBy({
      by: ["templateId"],
      where: { workspaceId, batchId: null },
      _count: { _all: true },
    }),
  ]);
  const uses = new Map<string, number>();
  for (const r of roundUses) if (r.templateId) uses.set(r.templateId, (uses.get(r.templateId) ?? 0) + r._count._all);
  for (const r of legacyUses) uses.set(r.templateId, (uses.get(r.templateId) ?? 0) + r._count._all);
  const bound: Record<string, string[]> = {};
  for (const s of servers) for (const b of s.templateBindings) (bound[b.templateId] ??= []).push(s.id);

  return {
    items: templates.map((t) => {
      const kind = t.kind ?? "frontend";
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        minutes: t.estimatedMinutes,
        custom: t.custom,
        kind,
        language: t.language ?? null,
        frameworkLabel: t.frameworkLabel ?? null,
        label: roundLabel({ paradigm: kind, language: t.language, frameworkLabel: t.frameworkLabel }),
        starterFiles: t.starterFiles ?? {},
        testsCode: t.testsCode ?? "",
        uses: uses.get(t.id) ?? 0,
        boundServerIds: bound[t.id] ?? [],
      };
    }),
    servers: servers.map((s) => ({ id: s.id, name: s.name })),
    allowExternalMcp: !!ws?.allowExternalMcp,
  };
}

/* ── Talent pool for New screening ───────────────────────────────────────── */

export type PoolCandidate = { id: string; name: string; email: string; stage: string };

export async function loadTalentPool(workspaceId: string): Promise<PoolCandidate[]> {
  const rows = await prisma.candidate.findMany({
    where: { workspaceId, email: { not: null }, status: { notIn: ["rejected", "archived"] } },
    select: { id: true, name: true, email: true, stage: true },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  return rows.map((c) => ({ id: c.id, name: c.name, email: c.email ?? "", stage: c.stage }));
}

/* ── Question bank for New screening ─────────────────────────────────────── */

export type PoolChallenge = CuratableChallenge & { title: string; difficulty: string; mine: boolean };

/**
 * The published challenge bank, classified by stack (same as
 * /api/interview/stack-pool), plus this workspace's own question library.
 */
export async function loadChallengePool(workspaceId?: string): Promise<PoolChallenge[]> {
  const parse = (raw: string | null | undefined): string[] => {
    if (!raw) return [];
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };
  const rows = await prisma.challenge.findMany({
    where: workspaceId ? { OR: [{ published: true, workspaceId: null }, { workspaceId }] } : { published: true, workspaceId: null },
    orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      workspaceId: true,
      title: true,
      difficulty: true,
      category: true,
      tags: true,
      steps: { select: { judgingMode: true, languagesJson: true }, orderBy: { position: "asc" }, take: 1 },
    },
  });
  return rows.map((c) => {
    const step = c.steps?.[0];
    const meta = classifyChallenge({
      judgingMode: step?.judgingMode,
      languages: parse(step?.languagesJson),
      tags: parse(c.tags),
      category: c.category,
    });
    return { id: c.id, title: c.title, difficulty: c.difficulty, paradigm: meta.paradigm, languages: meta.languages, frameworks: meta.frameworks, mine: !!c.workspaceId };
  });
}
