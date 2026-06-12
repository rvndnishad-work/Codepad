import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import AdminInterviewActions from "./AdminInterviewActions";
import { requireAdminAccess } from "@/lib/permissions/staff";

interface AdminInterviewDetailPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  in_progress: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  completed: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  abandoned: "text-muted bg-muted/10 border-border",
};

const ATTEMPT_COLOR: Record<string, string> = {
  in_progress: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  passed: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  failed: "text-red-500 bg-red-500/10 border-red-500/20",
  abandoned: "text-muted bg-muted/10 border-border",
};

function safeChallengeIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m ${sec % 60}s`;
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return `${hours}h ${remMin}m`;
}

export default async function AdminInterviewDetailPage({ params }: AdminInterviewDetailPageProps) {
  await requireAdminAccess();
  const { id } = await params;

  const session = await prisma.interviewSession.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!session) notFound();

  const challengeIds = safeChallengeIds(session.challengeIds);

  const [challenges, attempts] = await Promise.all([
    prisma.challenge.findMany({
      where: { id: { in: challengeIds } },
      select: { id: true, slug: true, title: true, difficulty: true },
    }),
    prisma.challengeAttempt.findMany({
      where: { sessionId: id },
      orderBy: { startedAt: "asc" },
      select: {
        id: true,
        challengeId: true,
        stepId: true,
        status: true,
        testResults: true,
        durationSec: true,
        startedAt: true,
        finishedAt: true,
      },
    }),
  ]);

  const challengesById = new Map(challenges.map((c) => [c.id, c]));
  const attemptsByChallengeId = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = attemptsByChallengeId.get(a.challengeId) ?? [];
    list.push(a);
    attemptsByChallengeId.set(a.challengeId, list);
  }

  const statusClass = STATUS_COLOR[session.status] ?? STATUS_COLOR.abandoned;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const shareUrl = `${siteUrl}/interview/${session.id}?token=${session.shareToken}`;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/interviews"
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted hover:text-fg transition"
      >
        <ArrowLeft className="w-3 h-3" />
        All sessions
      </Link>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusClass}`}
              >
                {session.status.replace("_", " ")}
              </span>
              <span className="text-[10px] font-mono text-muted/60">{session.id}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight truncate">{session.title}</h2>
            <div className="mt-2 flex items-center gap-3 text-xs text-muted">
              <Link href={`/u/${session.user.id}`} className="hover:text-accent transition flex items-center gap-1.5">
                {session.user.name ?? "Anonymous"}
                <span className="text-muted/50">·</span>
                <span className="font-mono text-muted/60">{session.user.email}</span>
              </Link>
            </div>
          </div>

          <AdminInterviewActions
            sessionId={session.id}
            status={session.status}
            shareUrl={shareUrl}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Stat icon={Clock} label="Time cap" value={formatDuration(session.totalSec)} />
          <Stat icon={Calendar} label="Created" value={session.createdAt.toLocaleDateString()} />
          <Stat
            icon={Calendar}
            label="Started"
            value={session.startedAt ? session.startedAt.toLocaleString() : "—"}
          />
          <Stat
            icon={Calendar}
            label="Finished"
            value={session.finishedAt ? session.finishedAt.toLocaleString() : "—"}
          />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-bg p-4">
          <div className="text-[10px] font-black uppercase tracking-wider text-muted mb-2">
            Interviewer-view share URL
          </div>
          <div className="text-[11px] font-mono break-all text-fg/80">{shareUrl}</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted mb-3">
          Challenges in this session ({challengeIds.length})
        </h3>

        {challengeIds.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            This session has no challenges attached.
          </div>
        ) : (
          <ol className="space-y-3">
            {challengeIds.map((cid, i) => {
              const c = challengesById.get(cid);
              const cAttempts = attemptsByChallengeId.get(cid) ?? [];
              return (
                <li key={cid} className="rounded-2xl border border-border bg-surface overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                          #{(i + 1).toString().padStart(2, "0")}
                        </span>
                        {c?.difficulty && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-accent">
                            {c.difficulty}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-fg truncate">
                        {c?.title ?? `Deleted challenge (${cid.slice(0, 8)}…)`}
                      </div>
                    </div>
                    {c && (
                      <Link
                        href={`/admin/challenges/${c.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg hover:bg-elevated transition shrink-0"
                      >
                        Edit
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  <div className="px-5 py-4">
                    {cAttempts.length === 0 ? (
                      <p className="text-xs text-muted">No attempts recorded yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {cAttempts.map((a) => {
                          const tests = parseTestResults(a.testResults);
                          const aClass = ATTEMPT_COLOR[a.status] ?? ATTEMPT_COLOR.abandoned;
                          return (
                            <li
                              key={a.id}
                              className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-elevated/40"
                            >
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${aClass}`}
                              >
                                {a.status === "passed" ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : a.status === "failed" ? (
                                  <XCircle className="w-3 h-3" />
                                ) : (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                                {a.status.replace("_", " ")}
                              </span>
                              {tests && (
                                <span className="text-[11px] text-muted">
                                  Tests: <span className="font-bold text-fg">{tests.passed}/{tests.total}</span>
                                </span>
                              )}
                              <span className="text-[11px] text-muted">
                                Duration:{" "}
                                <span className="font-bold text-fg">{formatDuration(a.durationSec)}</span>
                              </span>
                              <span className="text-[11px] text-muted ml-auto font-mono">
                                {a.startedAt.toLocaleString()}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm font-bold text-fg truncate">{value}</div>
    </div>
  );
}

function parseTestResults(raw: string | null): { passed: number; total: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.passed === "number" && typeof parsed?.total === "number") {
      return { passed: parsed.passed, total: parsed.total };
    }
  } catch {
    // ignore
  }
  return null;
}
