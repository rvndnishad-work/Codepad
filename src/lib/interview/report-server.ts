/**
 * Data for the live interview report in a workspace: the scorecard, the
 * interviewer's take and notes, each round with the code saved from the
 * room, and integrity signals. Interviewers and workspace members only; the
 * caller checks access first. Server only.
 */
import { prisma } from "@/lib/prisma";
import { parseQuestionnaire } from "@/lib/ai-interview/questionnaire";
import { INTERVIEW_PASS_RATING } from "@/lib/crm/results";
import { formatOf, parsePanel } from "./wizard";
import { meetingProvider } from "./meeting";

export const REPORT_CRITERIA = [
  { id: "ProblemSolving", label: "Problem solving" },
  { id: "CodeQuality", label: "Code or answer quality" },
  { id: "Communication", label: "Communication" },
] as const;

export type ReportTone = "success" | "warning" | "danger" | "neutral";

/** The interviewer's take, from the End interview dialog. Never a pass on its own: the team decides. */
export const INTERVIEWER_TAKE: Record<string, { label: string; tone: ReportTone }> = {
  success: { label: "Recommend", tone: "success" },
  failed: { label: "Do not recommend", tone: "danger" },
  left_in_between: { label: "Did not finish", tone: "warning" },
  suspicious: { label: "Integrity concern", tone: "danger" },
};

export type ReportRound = {
  key: string;
  kind: "challenge" | "playground" | "prompt";
  title: string;
  meta: string | null;
  attempt: {
    status: string;
    score: number | null;
    tests: { passed: number; total: number } | null;
    durationSec: number | null;
    files: { path: string; code: string }[];
    pasteCount: number;
    blurCount: number;
  } | null;
};

export type ProctorSignal = { kind: string; severity: string; windowTitle: string; processName: string; detail: string };

export type InterviewReport = {
  id: string;
  workspaceSlug: string | null;
  title: string;
  status: string;
  formatLabel: string;
  candidate: { name: string; id: string | null; email: string | null };
  host: string;
  panel: string[];
  guests: string[];
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  plannedMin: number;
  /** Minutes between start and finish, when both are known. */
  tookMin: number | null;
  take: { id: string; label: string; tone: ReportTone } | null;
  meeting: { url: string; provider: string | null } | null;
  scorecard: {
    criteria: { id: string; label: string; value: number | null }[];
    average: number | null;
    bar: number;
    summary: string | null;
  };
  notes: string | null;
  brief: string | null;
  guide: { title: string | null; items: { q: string; a: string | null }[] };
  rounds: ReportRound[];
  integrity: { pasteCount: number; blurCount: number; blurSec: number; peak: number; measured: boolean };
  proctor: { peak: number; latest: number; scans: number; reports: number; signals: ProctorSignal[] } | null;
};

function ids(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function json<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function files(raw: string | null): { path: string; code: string }[] {
  const v = json<Record<string, unknown>>(raw, {});
  if (!v || typeof v !== "object") return [];
  return Object.entries(v)
    .map(([path, c]) => ({ path: path.replace(/^\//, ""), code: typeof c === "string" ? c : typeof (c as { code?: unknown })?.code === "string" ? (c as { code: string }).code : "" }))
    .filter((f) => f.code.trim());
}

function tests(raw: string | null): { passed: number; total: number } | null {
  const v = json<{ passed?: unknown; total?: unknown } | null>(raw, null);
  return v && typeof v.passed === "number" && typeof v.total === "number" && v.total > 0 ? { passed: v.passed, total: v.total } : null;
}

const SEVERITY: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

/** Everything the report shows, or null when the interview does not exist. */
export async function loadInterviewReport(id: string): Promise<InterviewReport | null> {
  const s = await prisma.interviewSession.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      format: true,
      candidateName: true,
      candidateId: true,
      candidate: { select: { name: true, email: true } },
      scheduledAt: true,
      startedAt: true,
      finishedAt: true,
      totalSec: true,
      verdict: true,
      notes: true,
      meetingUrl: true,
      panelJson: true,
      interviewerBrief: true,
      guideTemplateId: true,
      guideJson: true,
      workspaceId: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      userId: true,
      user: { select: { name: true, email: true } },
      workspace: { select: { slug: true } },
      guests: { select: { email: true }, orderBy: { createdAt: "asc" } },
      rubric: { select: { ratings: true, notes: true } },
      proctorReport: true,
    },
  });
  if (!s) return null;

  const challengeIds = ids(s.challengeIds);
  const playgroundIds = ids(s.playgroundIds);
  const promptIds = ids(s.promptScenarioIds);
  const panelIds = parsePanel(s.panelJson);

  const [cs, ps, qs, attempts, panelUsers, tpl] = await Promise.all([
    challengeIds.length ? prisma.challenge.findMany({ where: { id: { in: challengeIds } }, select: { id: true, title: true, difficulty: true } }) : [],
    playgroundIds.length ? prisma.snippet.findMany({ where: { id: { in: playgroundIds }, userId: s.userId }, select: { id: true, title: true, template: true } }) : [],
    promptIds.length ? prisma.promptScenario.findMany({ where: { id: { in: promptIds } }, select: { id: true, title: true, category: true } }) : [],
    prisma.challengeAttempt.findMany({
      where: { sessionId: s.id },
      orderBy: { startedAt: "desc" },
      select: { challengeId: true, status: true, score: true, testResults: true, durationSec: true, files: true, integrityReport: true },
    }),
    panelIds.length ? prisma.user.findMany({ where: { id: { in: panelIds } }, select: { name: true, email: true } }) : [],
    s.guideTemplateId && s.workspaceId
      ? prisma.aIInterviewTemplate.findFirst({ where: { id: s.guideTemplateId, workspaceId: s.workspaceId }, select: { title: true, testsCode: true } })
      : null,
  ]);

  // Latest attempt per challenge; a graded Submit and the end-of-room snapshot never both exist.
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) if (!latest.has(a.challengeId)) latest.set(a.challengeId, a);

  const cById = new Map(cs.map((c) => [c.id, c]));
  const pById = new Map(ps.map((p) => [p.id, p]));
  const qById = new Map(qs.map((q) => [q.id, q]));
  const rounds: ReportRound[] = [
    ...challengeIds.flatMap((cid): ReportRound[] => {
      const c = cById.get(cid);
      if (!c) return [];
      const a = latest.get(cid);
      return [
        {
          key: `c:${cid}`,
          kind: "challenge",
          title: c.title,
          meta: c.difficulty,
          attempt: a
            ? {
                status: a.status,
                score: a.score,
                tests: tests(a.testResults),
                durationSec: a.durationSec,
                files: files(a.files),
                pasteCount: a.integrityReport?.pasteCount ?? 0,
                blurCount: a.integrityReport?.blurCount ?? 0,
              }
            : null,
        },
      ];
    }),
    ...playgroundIds.flatMap((pid): ReportRound[] => {
      const p = pById.get(pid);
      return p ? [{ key: `p:${pid}`, kind: "playground", title: p.title, meta: p.template, attempt: null }] : [];
    }),
    ...promptIds.flatMap((qid): ReportRound[] => {
      const q = qById.get(qid);
      return q ? [{ key: `q:${qid}`, kind: "prompt", title: q.title, meta: q.category, attempt: null }] : [];
    }),
  ];

  // Browser telemetry across every attempt in this interview.
  const integrity = { pasteCount: 0, blurCount: 0, blurSec: 0, peak: 0, measured: false };
  for (const a of attempts) {
    const r = a.integrityReport;
    if (!r) continue;
    integrity.measured = true;
    integrity.pasteCount += r.pasteCount;
    integrity.blurCount += r.blurCount;
    integrity.blurSec += r.totalBlurSec;
    integrity.peak = Math.max(integrity.peak, r.suspicionScore);
  }

  const ratings = json<Record<string, unknown>>(s.rubric?.ratings, {});
  const criteria = REPORT_CRITERIA.map((c) => {
    const v = ratings?.[c.id];
    return { id: c.id, label: c.label, value: typeof v === "number" && v >= 1 && v <= 5 ? v : null };
  });
  const scored = criteria.filter((c) => c.value != null).map((c) => c.value as number);

  const p = s.proctorReport;
  const signals = p
    ? json<Record<string, unknown>[]>(p.signalsData, [])
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          kind: String(x.kind ?? "signal"),
          severity: String(x.severity ?? "info"),
          windowTitle: String(x.window_title ?? ""),
          processName: String(x.process_name ?? ""),
          detail: String(x.detail ?? ""),
        }))
        .sort((a, b) => (SEVERITY[b.severity] ?? 0) - (SEVERITY[a.severity] ?? 0))
    : [];

  const fmt = formatOf(s.format);
  const take = s.verdict && INTERVIEWER_TAKE[s.verdict] ? { id: s.verdict, ...INTERVIEWER_TAKE[s.verdict] } : null;

  return {
    id: s.id,
    workspaceSlug: s.workspace?.slug ?? null,
    title: s.title,
    status: s.status,
    formatLabel: fmt?.label ?? "Live interview",
    candidate: { name: s.candidate?.name?.trim() || s.candidateName?.trim() || "Candidate", id: s.candidateId, email: s.candidate?.email ?? null },
    host: s.user.name ?? s.user.email ?? "Interviewer",
    panel: panelUsers.map((u) => u.name ?? u.email ?? "Teammate"),
    guests: s.guests.map((g) => g.email),
    scheduledAt: s.scheduledAt?.toISOString() ?? null,
    startedAt: s.startedAt?.toISOString() ?? null,
    finishedAt: s.finishedAt?.toISOString() ?? null,
    plannedMin: Math.round(s.totalSec / 60),
    tookMin: s.startedAt && s.finishedAt ? Math.max(0, Math.round((s.finishedAt.getTime() - s.startedAt.getTime()) / 60000)) : null,
    take,
    meeting: s.meetingUrl ? { url: s.meetingUrl, provider: meetingProvider(s.meetingUrl) } : null,
    scorecard: {
      criteria,
      average: scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null,
      bar: INTERVIEW_PASS_RATING,
      summary: s.rubric?.notes?.trim() || null,
    },
    notes: s.notes?.trim() || null,
    brief: s.interviewerBrief?.trim() || null,
    guide: {
      title: tpl?.title ?? (s.guideJson ? "Picked questions" : null),
      items: [...(tpl ? parseQuestionnaire(tpl.testsCode) : []), ...(s.guideJson ? parseQuestionnaire(s.guideJson) : [])].map((i) => ({ q: i.q, a: i.a ?? null })),
    },
    rounds,
    integrity,
    proctor: p ? { peak: p.peakSuspicion, latest: p.suspicionScore, scans: p.scannedWindows, reports: p.reportCount, signals } : null,
  };
}
