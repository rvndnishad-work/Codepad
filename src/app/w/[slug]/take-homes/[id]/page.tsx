import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  Award,
  Beaker,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Layers,
  Mail,
  XCircle,
} from "lucide-react";

/**
 * Session take-home review (IP-88 convergence): per-question breakdown for a
 * multi-question take-home. Replaces the old "Review" link that dumped
 * recruiters onto the live-interview page. Access control comes from the
 * /w/[slug] layout (membership-gated); we additionally scope the lookup by
 * workspace slug so a guessed id can't cross tenants.
 */

type Props = { params: Promise<{ slug: string; id: string }> };

function parseIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  completed: { label: "Completed", cls: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]" },
  in_progress: { label: "In progress", cls: "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]" },
  expired: { label: "Expired", cls: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]" },
  scheduled: { label: "Sent", cls: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]" },
};

export default async function TakeHomeSessionReviewPage({ params }: Props) {
  const { slug, id } = await params;

  const session = await prisma.interviewSession.findFirst({
    where: { id, type: "take-home", workspace: { slug } },
    select: {
      id: true,
      title: true,
      status: true,
      candidateName: true,
      candidateId: true,
      deadlineAt: true,
      createdAt: true,
      finishedAt: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      questionTimeLimitsJson: true,
      candidate: { select: { email: true } },
    },
  });
  if (!session) notFound();

  const challengeIds = parseIds(session.challengeIds);
  const playgroundIds = parseIds(session.playgroundIds);
  const promptScenarioIds = parseIds(session.promptScenarioIds);
  const limits: Record<string, number> = (() => {
    try {
      return JSON.parse(session.questionTimeLimitsJson ?? "{}");
    } catch {
      return {};
    }
  })();

  const [challenges, attempts, promptAttempts, promptScenarios] = await Promise.all([
    challengeIds.length
      ? prisma.challenge.findMany({
          where: { id: { in: challengeIds } },
          select: { id: true, title: true, difficulty: true },
        })
      : Promise.resolve([]),
    prisma.challengeAttempt.findMany({
      where: { sessionId: session.id },
      select: { id: true, challengeId: true, status: true, score: true, durationSec: true, finishedAt: true },
      orderBy: { startedAt: "asc" },
    }),
    prisma.promptAttempt.findMany({
      where: { sessionId: session.id },
      select: { id: true, scenarioId: true, score: true, createdAt: true },
    }),
    promptScenarioIds.length
      ? prisma.promptScenario.findMany({
          where: { id: { in: promptScenarioIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);

  const challengeById = new Map(challenges.map((c) => [c.id, c]));
  const scenarioById = new Map(promptScenarios.map((s) => [s.id, s]));
  // Latest finished attempt wins per challenge.
  const attemptByChallenge = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    if (a.status === "passed" || a.status === "failed") attemptByChallenge.set(a.challengeId, a);
  }
  const promptAttemptByScenario = new Map(promptAttempts.map((a) => [a.scenarioId, a]));

  const scoredAttempts = challengeIds
    .map((cid) => attemptByChallenge.get(cid))
    .filter((a): a is NonNullable<typeof a> => !!a && a.score !== null);
  const avgScore = scoredAttempts.length
    ? Math.round(scoredAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / scoredAttempts.length)
    : null;
  const doneCount = challengeIds.filter((cid) => attemptByChallenge.has(cid)).length;

  const badge = STATUS_BADGES[session.status] ?? STATUS_BADGES.scheduled;
  const totalQuestions = challengeIds.length + playgroundIds.length + promptScenarioIds.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3 border-b border-border pb-5">
        <Link
          href={`/w/${slug}?section=assessments&view=take-homes`}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> All take-homes
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">{session.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted">
              <span className="font-semibold text-fg">
                {session.candidateId ? (
                  <Link href={`/w/${slug}/candidates/${session.candidateId}`} className="hover:text-accent transition-colors">
                    {session.candidateName || "Unknown candidate"}
                  </Link>
                ) : (
                  session.candidateName || "Unknown candidate"
                )}
              </span>
              {session.candidate?.email && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <Mail className="w-3 h-3" /> {session.candidate.email}
                </span>
              )}
              {session.deadlineAt && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Deadline {session.deadlineAt.toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center self-start md:self-auto px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted/80 mb-1.5">Average score</div>
          <div className="text-2xl font-black tabular-nums text-fg">
            {avgScore !== null ? `${avgScore}%` : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted/80 mb-1.5">Questions done</div>
          <div className="text-2xl font-black tabular-nums text-fg">
            {doneCount}<span className="text-sm text-muted font-semibold">/{totalQuestions}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted/80 mb-1.5">Submitted</div>
          <div className="text-sm font-bold text-fg mt-2">
            {session.finishedAt ? session.finishedAt.toLocaleString() : "Not yet"}
          </div>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-fg">Question breakdown</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-elevated/60 border-b border-border text-muted uppercase text-[10px] tracking-[0.14em]">
              <th className="px-4 py-3 font-semibold">Question</th>
              <th className="px-4 py-3 font-semibold">Result</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {challengeIds.map((cid, i) => {
              const c = challengeById.get(cid);
              const a = attemptByChallenge.get(cid);
              return (
                <tr key={cid} className="hover:bg-panel/30 transition-colors">
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-fg">{i + 1}. {c?.title ?? "(deleted challenge)"}</div>
                        <div className="text-[10px] text-muted uppercase tracking-wider">
                          challenge{c?.difficulty ? ` · ${c.difficulty}` : ""} · {limits[cid] ?? 30}m budget
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {a ? (
                      a.status === "passed" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500"><CheckCircle2 className="w-3.5 h-3.5" /> Passed</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500"><XCircle className="w-3.5 h-3.5" /> Failed</span>
                      )
                    ) : (
                      <span className="text-[11px] text-muted/60 italic">Not attempted</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-xs font-bold tabular-nums text-fg">
                    {a?.score !== null && a?.score !== undefined ? `${a.score}%` : "—"}
                  </td>
                  <td className="px-4 py-3 align-middle text-[11px] text-muted tabular-nums">
                    {a?.durationSec ? (
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.round(a.durationSec / 60)}m</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-right">
                    {a && (
                      <Link
                        href={`/w/${slug}/attempts/${a.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent/10 border border-accent/25 text-[11px] font-semibold text-accent hover:bg-accent/15 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> Open attempt
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {promptScenarioIds.map((pid, i) => {
              const s = scenarioById.get(pid);
              const a = promptAttemptByScenario.get(pid);
              return (
                <tr key={pid} className="hover:bg-panel/30 transition-colors">
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-fg">
                          {challengeIds.length + i + 1}. {s?.title ?? "(deleted scenario)"}
                        </div>
                        <div className="text-[10px] text-muted uppercase tracking-wider">prompt · {limits[pid] ?? 30}m budget</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {a ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500"><CheckCircle2 className="w-3.5 h-3.5" /> Submitted</span>
                    ) : (
                      <span className="text-[11px] text-muted/60 italic">Not attempted</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle text-xs font-bold tabular-nums text-fg">
                    {a?.score !== null && a?.score !== undefined ? `${a.score}%` : "—"}
                  </td>
                  <td className="px-4 py-3 align-middle text-[11px] text-muted">—</td>
                  <td className="px-4 py-3 align-middle text-right" />
                </tr>
              );
            })}
            {playgroundIds.map((pid, i) => (
              <tr key={pid} className="hover:bg-panel/30 transition-colors">
                <td className="px-4 py-3 align-middle">
                  <div className="flex items-center gap-2">
                    <Beaker className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-fg">
                        {challengeIds.length + promptScenarioIds.length + i + 1}. Playground task
                      </div>
                      <div className="text-[10px] text-muted uppercase tracking-wider">playground · {limits[pid] ?? 30}m budget</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className="text-[11px] text-muted/60 italic">Not candidate-runnable yet</span>
                </td>
                <td className="px-4 py-3 align-middle text-xs text-muted">—</td>
                <td className="px-4 py-3 align-middle text-[11px] text-muted">—</td>
                <td className="px-4 py-3 align-middle text-right" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {avgScore !== null && (
        <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Scores are automated test-case pass ratios per challenge. Open an individual attempt for
            the full test log, submitted files, and session replay.
          </p>
        </div>
      )}
    </div>
  );
}
