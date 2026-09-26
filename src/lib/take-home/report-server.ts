import "server-only";
import { prisma } from "@/lib/prisma";
import { diffFiles, diffStats } from "@/lib/ai-interview/diff";
import type { ReportRound } from "@/lib/ai-interview/console-server";
import { loadTakeHomes } from "./list-server";
import {
  countedAttempts,
  decisionOf,
  integritySummary,
  legacyState,
  needsReview,
  parseIds,
  parseLimits,
  sessionState,
  takeHomeScore,
  DEFAULT_QUESTION_MINUTES,
  type Decision,
  type IntegritySummary,
  type TakeHomeState,
} from "./status";
import { takeHomePassMarkOf, TAKE_HOME_PASS_MARK } from "./pass-mark";
import type { ReminderPlan } from "./reminders";

export type ReportTest = { name: string; status: string; error: string | null };

export type ReportQuestion = {
  key: string;
  kind: "challenge" | "prompt" | "playground";
  title: string;
  difficulty: string | null;
  category: string | null;
  minutes: number;
  answer: null | {
    attemptId: string | null;
    status: string;
    score: number | null;
    durationSec: number | null;
    passed: number | null;
    total: number | null;
    tests: ReportTest[];
    integrity: IntegritySummary | null;
    hasReplay: boolean;
    /** Code in the shape the AI screening diff view reads. */
    code: ReportRound | null;
    /** Prompt questions: what the candidate wrote and the grader said. */
    prompt: { text: string; feedback: string | null } | null;
  };
};

export type TakeHomeReport = {
  id: string;
  kind: "session" | "legacy";
  title: string;
  template: { id: string; name: string } | null;
  state: TakeHomeState;
  decision: Decision;
  needsReview: boolean;
  candidate: { id: string | null; name: string; email: string | null; stage: string | null };
  score: number | null;
  /** The take-home's pass mark (legacy invites use the default). */
  passMark: number;
  /**
   * Settings shared by every take-home sent in the same run: the pass mark
   * and the reminder schedule change for all of them together. Null on
   * legacy invites, which have neither.
   */
  settings: null | {
    /** How many take-homes a change applies to (this one included). */
    groupSize: number;
    reminders: ReminderPlan;
    startReminderSentAt: string | null;
    lastCallSentAt: string | null;
  };
  integrity: IntegritySummary;
  timeUsedMin: number | null;
  timeBudgetMin: number;
  sentAt: string;
  sentBy: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  deadlineAt: string | null;
  linkPath: string | null;
  questions: ReportQuestion[];
  /** Position in the review queue, for Previous and Next. */
  nav: { prevId: string | null; nextId: string | null; position: number | null; total: number };
  /** Other submitted take-homes with the same questions. */
  peers: number;
};

function parseMap(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === "string") out[k] = x;
      else if (x && typeof x === "object" && typeof (x as { code?: unknown }).code === "string") out[k] = (x as { code: string }).code;
    }
    return out;
  } catch {
    return {};
  }
}

function parseTests(raw: string | null | undefined): { passed: number | null; total: number | null; tests: ReportTest[] } {
  try {
    const v = JSON.parse(raw ?? "null");
    const tests: ReportTest[] = Array.isArray(v?.tests)
      ? v.tests.map((x: { name?: unknown; status?: unknown; error?: unknown }) => ({
          name: String(x?.name ?? "Test"),
          status: String(x?.status ?? "unknown"),
          error: typeof x?.error === "string" && x.error ? x.error : null,
        }))
      : [];
    return {
      passed: typeof v?.passed === "number" ? v.passed : null,
      total: typeof v?.total === "number" ? v.total : null,
      tests,
    };
  } catch {
    return { passed: null, total: null, tests: [] };
  }
}

const ATTEMPT_SELECT = {
  id: true,
  challengeId: true,
  stepId: true,
  status: true,
  score: true,
  durationSec: true,
  startedAt: true,
  finishedAt: true,
  files: true,
  testResults: true,
  integrityReport: { select: { suspicionScore: true, pasteCount: true, blurCount: true, totalBlurSec: true } },
  eventLog: { select: { id: true } },
} as const;

type AttemptRow = {
  id: string;
  challengeId: string;
  stepId: string | null;
  status: string;
  score: number | null;
  durationSec: number | null;
  startedAt: Date;
  finishedAt: Date | null;
  files: string | null;
  testResults: string | null;
  integrityReport: { suspicionScore: number; pasteCount: number; blurCount: number; totalBlurSec: number } | null;
  eventLog: { id: string } | null;
};

async function startersFor(attempts: AttemptRow[], challengeIds: string[]): Promise<Map<string, Record<string, string>>> {
  const steps = await prisma.challengeStep.findMany({
    where: { challengeId: { in: challengeIds } },
    orderBy: { position: "asc" },
    select: { id: true, challengeId: true, starterFiles: true },
  });
  const byStep = new Map(steps.map((s) => [s.id, parseMap(s.starterFiles)]));
  const out = new Map<string, Record<string, string>>();
  for (const cid of challengeIds) {
    const a = attempts.find((x) => x.challengeId === cid);
    const step = (a?.stepId && byStep.get(a.stepId)) || byStep.get(steps.find((s) => s.challengeId === cid)?.id ?? "");
    if (step) out.set(cid, step);
  }
  return out;
}

function answerOf(
  a: AttemptRow,
  q: { title: string; minutes: number },
  order: number,
  starter: Record<string, string> | undefined,
): NonNullable<ReportQuestion["answer"]> {
  const files = parseMap(a.files);
  const tests = parseTests(a.testResults);
  const diffs = Object.keys(files).length ? diffFiles(starter ?? {}, files) : null;
  const integrity = a.integrityReport ? integritySummary([a.integrityReport]) : null;
  return {
    attemptId: a.id,
    status: a.status,
    score: a.score,
    durationSec: a.durationSec,
    passed: tests.passed,
    total: tests.total,
    tests: tests.tests,
    integrity,
    hasReplay: !!a.eventLog,
    prompt: null,
    code: {
      id: a.id,
      order,
      title: q.title,
      description: "",
      kind: "dsa",
      label: q.title,
      language: null,
      frameworkLabel: null,
      minutes: q.minutes,
      status: "COMPLETED",
      score: a.score,
      ratings: null,
      theory: null,
      starter: starter ?? {},
      files,
      diffs,
      stats: diffs ? diffStats(diffs) : null,
      linesWritten: null,
    },
  };
}

/** One take-home report, scoped to the workspace so a guessed id cannot cross tenants. */
export async function loadTakeHomeReport(workspaceId: string, id: string, now: Date = new Date()): Promise<TakeHomeReport | null> {
  const base = await loadSession(workspaceId, id, now) ?? (await loadLegacy(workspaceId, id, now));
  if (!base) return null;

  // Review order: oldest submission first, as the queue lists it.
  const rows = await loadTakeHomes(workspaceId, now);
  const queue = rows.filter((r) => r.needsReview).sort((x, y) => ((x.submittedAt ?? x.sentAt) < (y.submittedAt ?? y.sentAt) ? -1 : 1));
  const i = queue.findIndex((r) => r.id === id);
  const peers = rows.filter(
    (r) => r.id !== id && r.state === "submitted" && (base.template ? r.templateId === base.template.id : r.title === base.title),
  ).length;

  return {
    ...base,
    peers,
    nav: {
      prevId: i > 0 ? queue[i - 1].id : null,
      nextId: i >= 0 ? (queue[i + 1]?.id ?? null) : (queue[0]?.id ?? null),
      position: i >= 0 ? i + 1 : null,
      total: queue.length,
    },
  };
}

type BaseReport = Omit<TakeHomeReport, "nav" | "peers">;

async function loadSession(workspaceId: string, id: string, now: Date): Promise<BaseReport | null> {
  const s = await prisma.interviewSession.findFirst({
    where: { id, workspaceId, type: "take-home" },
    select: {
      id: true,
      title: true,
      status: true,
      candidateName: true,
      candidateAccessToken: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      questionTimeLimitsJson: true,
      deadlineAt: true,
      createdAt: true,
      finishedAt: true,
      takeHomeTemplate: { select: { id: true, name: true } },
      user: { select: { name: true, email: true } },
      candidate: { select: { id: true, name: true, email: true, stage: true } },
      setupGroupId: true,
      takeHomePassMark: true,
      reminderStartAfterHours: true,
      reminderBeforeDeadlineHours: true,
      remindersOff: true,
      reminderSentAt: true,
      startReminderSentAt: true,
    },
  });
  if (!s) return null;
  const groupSize = s.setupGroupId
    ? await prisma.interviewSession.count({ where: { workspaceId, type: "take-home", setupGroupId: s.setupGroupId } })
    : 1;

  const challengeIds = parseIds(s.challengeIds);
  const promptIds = parseIds(s.promptScenarioIds);
  const playgroundIds = parseIds(s.playgroundIds);
  const limits = parseLimits(s.questionTimeLimitsJson);

  const [challenges, attempts, prompts, promptAttempts] = await Promise.all([
    prisma.challenge.findMany({ where: { id: { in: challengeIds } }, select: { id: true, title: true, difficulty: true, category: true } }),
    prisma.challengeAttempt.findMany({ where: { sessionId: s.id }, select: ATTEMPT_SELECT, orderBy: { startedAt: "asc" } }),
    promptIds.length ? prisma.promptScenario.findMany({ where: { id: { in: promptIds } }, select: { id: true, title: true, difficulty: true, category: true } }) : [],
    promptIds.length
      ? prisma.promptAttempt.findMany({ where: { sessionId: s.id }, orderBy: { createdAt: "asc" }, select: { scenarioId: true, score: true, promptText: true, feedback: true, durationSec: true } })
      : [],
  ]);
  const counted = countedAttempts(attempts, challengeIds);
  const starters = await startersFor([...counted.values()], challengeIds);
  const byId = new Map(challenges.map((c) => [c.id, c]));

  const questions: ReportQuestion[] = challengeIds.map((cid, i) => {
    const c = byId.get(cid);
    const q = { title: c?.title ?? "Deleted question", minutes: limits[cid] ?? DEFAULT_QUESTION_MINUTES };
    const a = counted.get(cid);
    return {
      key: cid,
      kind: "challenge",
      title: q.title,
      difficulty: c?.difficulty ?? null,
      category: c?.category ?? null,
      minutes: q.minutes,
      answer: a ? answerOf(a, q, i, starters.get(cid)) : null,
    };
  });
  for (const pid of promptIds) {
    const p = prompts.find((x) => x.id === pid);
    const a = promptAttempts.find((x) => x.scenarioId === pid);
    questions.push({
      key: pid,
      kind: "prompt",
      title: p?.title ?? "Deleted prompt task",
      difficulty: p?.difficulty ?? null,
      category: p?.category ?? null,
      minutes: limits[pid] ?? DEFAULT_QUESTION_MINUTES,
      answer: a
        ? {
            attemptId: null,
            status: "submitted",
            score: a.score,
            durationSec: a.durationSec,
            passed: null,
            total: null,
            tests: [],
            integrity: null,
            hasReplay: false,
            code: null,
            prompt: { text: a.promptText, feedback: a.feedback },
          }
        : null,
    });
  }
  for (const pid of playgroundIds) {
    questions.push({ key: pid, kind: "playground", title: "Playground task", difficulty: null, category: null, minutes: limits[pid] ?? DEFAULT_QUESTION_MINUTES, answer: null });
  }

  const picked = challengeIds.map((cid) => counted.get(cid)).filter((a): a is NonNullable<typeof a> => !!a);
  const state = sessionState({ status: s.status, deadlineAt: s.deadlineAt, answered: picked.length }, now);
  const stage = s.candidate?.stage ?? null;
  const open = state === "not_started" || state === "in_progress";
  const started = picked.length ? picked.reduce((m, a) => (a.startedAt < m ? a.startedAt : m), picked[0].startedAt) : null;

  return {
    id: s.id,
    kind: "session",
    title: s.title,
    template: s.takeHomeTemplate,
    state,
    decision: decisionOf(stage),
    needsReview: needsReview(state, stage),
    candidate: { id: s.candidate?.id ?? null, name: s.candidate?.name ?? s.candidateName ?? "Unknown candidate", email: s.candidate?.email ?? null, stage },
    score: takeHomeScore(picked.map((a) => a.score)),
    passMark: takeHomePassMarkOf(s.takeHomePassMark),
    settings: {
      groupSize: Math.max(1, groupSize),
      reminders: { startAfterHours: s.reminderStartAfterHours, beforeDeadlineHours: s.reminderBeforeDeadlineHours, off: s.remindersOff },
      startReminderSentAt: s.startReminderSentAt?.toISOString() ?? null,
      lastCallSentAt: s.reminderSentAt?.toISOString() ?? null,
    },
    integrity: integritySummary(picked.map((a) => a.integrityReport)),
    timeUsedMin: picked.length ? Math.round(picked.reduce((n, a) => n + (a.durationSec ?? 0), 0) / 60) : null,
    timeBudgetMin: challengeIds.reduce((n, cid) => n + (limits[cid] ?? DEFAULT_QUESTION_MINUTES), 0),
    sentAt: s.createdAt.toISOString(),
    sentBy: s.user?.name ?? s.user?.email ?? null,
    startedAt: started?.toISOString() ?? null,
    submittedAt: s.finishedAt?.toISOString() ?? null,
    deadlineAt: s.deadlineAt?.toISOString() ?? null,
    linkPath: open && s.candidateAccessToken ? `/take-home/s/${s.candidateAccessToken}` : null,
    questions,
  };
}

async function loadLegacy(workspaceId: string, id: string, now: Date): Promise<BaseReport | null> {
  const a = await prisma.takeHomeAssignment.findFirst({
    where: { id, workspaceId },
    select: {
      id: true,
      status: true,
      token: true,
      candidateName: true,
      candidateEmail: true,
      timeLimitMin: true,
      expiresAt: true,
      createdAt: true,
      startedAt: true,
      submittedAt: true,
      challengeId: true,
      challenge: { select: { title: true, difficulty: true, category: true } },
      candidate: { select: { id: true, name: true, stage: true } },
      attempt: { select: ATTEMPT_SELECT },
    },
  });
  if (!a) return null;
  const state = legacyState({ status: a.status, expiresAt: a.expiresAt }, now);
  const stage = a.candidate?.stage ?? null;
  const att = a.attempt && (a.attempt.status === "passed" || a.attempt.status === "failed") ? a.attempt : null;
  const starters = att ? await startersFor([att], [a.challengeId]) : new Map<string, Record<string, string>>();
  const q = { title: a.challenge.title, minutes: a.timeLimitMin };
  const open = state === "not_started" || state === "in_progress";
  return {
    id: a.id,
    kind: "legacy",
    title: a.challenge.title,
    template: null,
    state,
    decision: decisionOf(stage),
    needsReview: needsReview(state, stage),
    candidate: { id: a.candidate?.id ?? null, name: a.candidate?.name ?? a.candidateName, email: a.candidateEmail, stage },
    score: att?.score ?? null,
    passMark: TAKE_HOME_PASS_MARK,
    settings: null,
    integrity: integritySummary([att?.integrityReport]),
    timeUsedMin: att?.durationSec != null ? Math.round(att.durationSec / 60) : null,
    timeBudgetMin: a.timeLimitMin,
    sentAt: a.createdAt.toISOString(),
    sentBy: null,
    startedAt: (a.startedAt ?? att?.startedAt)?.toISOString() ?? null,
    submittedAt: a.submittedAt?.toISOString() ?? null,
    deadlineAt: a.expiresAt.toISOString(),
    linkPath: open ? `/take-home/${a.token}` : null,
    questions: [
      {
        key: a.challengeId,
        kind: "challenge",
        title: q.title,
        difficulty: a.challenge.difficulty,
        category: a.challenge.category,
        minutes: q.minutes,
        answer: att ? answerOf(att, q, 0, starters.get(a.challengeId)) : null,
      },
    ],
  };
}

/** Which take-home report an old attempt link belongs to. */
export async function takeHomeForAttempt(workspaceId: string, attemptId: string): Promise<{ id: string; q: string } | null> {
  const a = await prisma.challengeAttempt.findUnique({
    where: { id: attemptId },
    select: { challengeId: true, sessionId: true, takeHomeAssignment: { select: { id: true, workspaceId: true } } },
  });
  if (!a) return null;
  if (a.takeHomeAssignment?.workspaceId === workspaceId) return { id: a.takeHomeAssignment.id, q: a.challengeId };
  if (a.sessionId) {
    const s = await prisma.interviewSession.findFirst({ where: { id: a.sessionId, workspaceId, type: "take-home" }, select: { id: true } });
    if (s) return { id: s.id, q: a.challengeId };
  }
  return null;
}
