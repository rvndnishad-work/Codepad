import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Briefcase,
  Mail,
  Phone,
  Award,
  ExternalLink,
  Play,
  CheckCircle2,
  AlertTriangle,
  Star,
} from "lucide-react";
import CandidateNotesEditor from "./CandidateNotesEditor";
import CandidateStatusControl from "./CandidateStatusControl";

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

const STATUS_BADGES: Record<string, string> = {
  active: "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]",
  hired: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
  rejected: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
  archived: "text-muted border-border bg-panel/50",
};

const TAKEHOME_STATUS_BADGES: Record<string, string> = {
  PENDING: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
  ACTIVE: "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]",
  SUBMITTED: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
  EXPIRED: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id }, select: { name: true } });
  return { title: candidate ? `${candidate.name} — Candidate` : "Candidate not found" };
}

export default async function CandidateDetailPage({ params }: Props) {
  const { slug, id } = await params;

  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/login");

  // Resolve workspace + membership
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      members: { select: { userId: true } },
    },
  });
  if (!workspace) notFound();
  if (!workspace.members.some((m) => m.userId === session.user!.id)) {
    redirect("/dashboard");
  }

  const candidate = await prisma.candidate.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      takeHomes: {
        orderBy: { createdAt: "desc" },
        include: {
          challenge: { select: { title: true, slug: true } },
          attempt: { select: { id: true, score: true } },
        },
      },
      sessions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          verdict: true,
          shareToken: true,
          totalSec: true,
          startedAt: true,
          finishedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!candidate) notFound();

  const tags: string[] = candidate.tags ? JSON.parse(candidate.tags) : [];

  // Aggregate score: average of submitted attempt scores
  const submittedScores = candidate.takeHomes
    .map((th) => th.attempt?.score)
    .filter((s): s is number => typeof s === "number");
  const avgScore = submittedScores.length
    ? Math.round(submittedScores.reduce((a, b) => a + b, 0) / submittedScores.length)
    : null;

  // Combined timeline of all activity
  type TimelineEvent = {
    kind: "take-home" | "interview";
    id: string;
    title: string;
    timestamp: Date;
    status: string;
    detail?: string;
    score?: number | null;
    href: string;
    secondary: string;
  };

  const timeline: TimelineEvent[] = [
    ...candidate.takeHomes.map((th) => ({
      kind: "take-home" as const,
      id: th.id,
      title: th.challenge.title,
      timestamp: th.submittedAt ?? th.startedAt ?? th.createdAt,
      status: th.status,
      score: th.attempt?.score ?? null,
      href: th.attempt
        ? `/w/${workspace.slug}/attempts/${th.attempt.id}`
        : `/take-home/${th.token}`,
      secondary: `Take-home · ${th.timeLimitMin} min limit`,
    })),
    ...candidate.sessions.map((s) => {
      const isDone = !!s.finishedAt;
      const isLive = !!s.startedAt && !isDone;
      return {
        kind: "interview" as const,
        id: s.id,
        title: s.title,
        timestamp: s.finishedAt ?? s.startedAt ?? s.createdAt,
        status: isDone ? "COMPLETED" : isLive ? "LIVE" : "SCHEDULED",
        score: null,
        href: `/interview/${s.shareToken}`,
        secondary: `Interview · ${Math.round(s.totalSec / 60)} min · ${s.type}`,
      };
    }),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const created = candidate.createdAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
      <Link
        href={`/w/${slug}?section=candidates`}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-fg transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All candidates
      </Link>

      {/* Pipeline alert banners */}
      {candidate.status === "do_not_hire" && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">Do not hire</div>
            <div className="text-[11px] text-rose-600/80 dark:text-rose-300/80 mt-0.5">
              This candidate has been flagged. Do not progress them for any role without explicit override.
            </div>
          </div>
        </div>
      )}
      {candidate.status === "future_hire" && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-400">
          <Star className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">Future hire</div>
            <div className="text-[11px] text-amber-600/80 dark:text-amber-300/80 mt-0.5">
              Strong signal. Revisit this candidate when there&apos;s an appropriate opening.
            </div>
          </div>
        </div>
      )}

      {/* Candidate header */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-14 h-14 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-lg font-semibold shrink-0">
            {candidate.name.substring(0, 1).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-fg tracking-tight truncate">{candidate.name}</h2>
              <CandidateStatusControl
                workspaceSlug={slug}
                candidateId={candidate.id}
                initialStatus={candidate.status}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
              {candidate.email && (
                <a
                  href={`mailto:${candidate.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-fg transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span className="font-mono">{candidate.email}</span>
                </a>
              )}
              {candidate.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono">{candidate.phone}</span>
                </span>
              )}
              {candidate.source && (
                <span className="inline-flex items-center gap-1.5 capitalize">
                  Source: <span className="text-fg font-medium">{candidate.source}</span>
                </span>
              )}
              <span className="text-muted/60">Added {created}</span>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-panel/50 border border-border text-[10px] font-medium text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Take-homes</span>
            <div className="w-7 h-7 rounded-lg border border-indigo-500/20 bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">{candidate.takeHomes.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Interviews</span>
            <div className="w-7 h-7 rounded-lg border border-violet-500/20 bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">{candidate.sessions.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Submitted</span>
            <div className="w-7 h-7 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">{submittedScores.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Avg score</span>
            <div className="w-7 h-7 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-fg tabular-nums">
            {avgScore !== null ? `${avgScore}%` : <span className="text-muted/60">—</span>}
          </div>
        </div>
      </div>

      {/* Two-column: timeline (left) + notes (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Activity timeline</h3>
            </div>
            {timeline.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted/60 italic">
                No assignments or interviews yet.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {timeline.map((ev) => {
                  const ts = ev.timestamp.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const Icon = ev.kind === "take-home" ? Clock : Briefcase;
                  const iconColor =
                    ev.kind === "take-home" ? "text-purple-500" : "text-violet-500";
                  const iconBg =
                    ev.kind === "take-home"
                      ? "bg-purple-500/10 border-purple-500/20"
                      : "bg-violet-500/10 border-violet-500/20";
                  const statusColor =
                    ev.kind === "take-home"
                      ? TAKEHOME_STATUS_BADGES[ev.status] || ""
                      : ev.status === "COMPLETED"
                      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]"
                      : ev.status === "LIVE"
                      ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]"
                      : "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]";

                  return (
                    <li key={`${ev.kind}-${ev.id}`} className="px-4 py-3 flex items-start gap-3 hover:bg-panel/30 transition-colors">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={ev.href}
                            className="font-semibold text-fg text-sm hover:text-accent transition-colors truncate"
                          >
                            {ev.title}
                          </Link>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
                            {ev.status}
                          </span>
                          {ev.score !== null && ev.score !== undefined && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <Award className="w-3 h-3" />
                              <span className="tabular-nums">{ev.score}%</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted mt-0.5">
                          {ev.secondary} · {ts}
                        </div>
                      </div>
                      <Link
                        href={ev.href}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted hover:text-fg hover:bg-panel/40 transition-colors shrink-0"
                        title="Open"
                      >
                        {ev.kind === "take-home" && ev.status === "SUBMITTED" ? (
                          <Play className="w-3.5 h-3.5" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <CandidateNotesEditor
            workspaceSlug={slug}
            candidateId={candidate.id}
            initialNotes={candidate.notes ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
