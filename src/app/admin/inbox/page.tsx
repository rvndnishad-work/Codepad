import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  FileText,
  Target,
  Briefcase,
  ArrowRight,
  Clock,
  CheckCircle2,
  Inbox,
  AlertTriangle,
} from "lucide-react";

const STALE_SESSION_HOURS = 6;

function relativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export default async function AdminInboxPage() {
  const staleCutoff = new Date(Date.now() - STALE_SESSION_HOURS * 60 * 60 * 1000);

  const [pendingBlogs, communityDraftChallenges, staleSessions, needsChangesBlogs] =
    await Promise.all([
      prisma.blogPost.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 25,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.challenge.findMany({
        where: { published: false, authorId: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 25,
        include: { author: { select: { id: true, name: true, email: true } } },
      }),
      prisma.interviewSession.findMany({
        where: {
          status: "in_progress",
          startedAt: { lt: staleCutoff },
        },
        orderBy: { startedAt: "asc" },
        take: 25,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.blogPost.count({ where: { status: "NEEDS_CHANGES" } }),
    ]);

  const totalActionable =
    pendingBlogs.length + communityDraftChallenges.length + staleSessions.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Inbox className="w-5 h-5 text-accent" />
            Moderation inbox
          </h2>
          <p className="text-sm text-muted mt-1">
            Items waiting on a decision. Sorted oldest first within each queue.
          </p>
        </div>

        {totalActionable === 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All clear
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            {totalActionable} pending
          </div>
        )}
      </div>

      <Queue
        title="Pending blogs"
        icon={FileText}
        emptyMessage="No blogs waiting for review."
        count={pendingBlogs.length}
        secondaryNote={
          needsChangesBlogs > 0
            ? `${needsChangesBlogs} blog${needsChangesBlogs === 1 ? "" : "s"} marked “Needs changes” awaiting the author.`
            : null
        }
        actionLabel="Review all"
        actionHref="/admin/blogs?status=PENDING"
      >
        {pendingBlogs.length === 0 ? null : (
          <ul className="divide-y divide-border">
            {pendingBlogs.map((b) => (
              <li key={b.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-panel/20 transition-all duration-200">
                <div className="flex items-start gap-3 min-w-0">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/blogs?q=${encodeURIComponent(b.slug)}`}
                      className="font-black text-fg hover:text-accent transition truncate block text-sm"
                    >
                      {b.title}
                    </Link>
                    <div className="text-[11px] text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>by {b.user.name ?? "Anonymous"}</span>
                      <span className="text-muted/30">·</span>
                      <span className="font-mono text-[10px]">submitted {relativeTime(b.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    href={`/blog/${b.slug}`}
                    target="_blank"
                    className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-border text-muted hover:text-fg hover:bg-panel/40 transition shrink-0"
                  >
                    Preview
                  </Link>
                  <Link
                    href={`/admin/blogs?q=${encodeURIComponent(b.slug)}`}
                    className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg bg-accent text-bg hover:opacity-90 transition shrink-0"
                  >
                    Review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Queue>

      <Queue
        title="Community challenges awaiting review"
        icon={Target}
        emptyMessage="No community-authored draft challenges."
        count={communityDraftChallenges.length}
        actionLabel="See all"
        actionHref="/admin/challenges"
      >
        {communityDraftChallenges.length === 0 ? null : (
          <ul className="divide-y divide-border">
            {communityDraftChallenges.map((c) => (
              <li key={c.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-panel/20 transition-all duration-200">
                <div className="flex items-start gap-3 min-w-0">
                  <Target className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/challenges/${c.id}/edit`}
                      className="font-black text-fg hover:text-accent transition truncate block text-sm"
                    >
                      {c.title}
                    </Link>
                    <div className="text-[11px] text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>by {c.author?.name ?? "Anonymous"}</span>
                      <span className="text-muted/30">·</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-panel/40`}>
                        {c.difficulty}
                      </span>
                      <span className="text-muted/30">·</span>
                      <span className="font-mono text-[10px]">updated {relativeTime(c.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    href={`/admin/challenges/${c.id}/edit`}
                    className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg bg-accent text-bg hover:opacity-90 transition shrink-0"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Queue>

      <Queue
        title={`Stalled interview sessions (in-progress for >${STALE_SESSION_HOURS}h)`}
        icon={Briefcase}
        emptyMessage="No stalled sessions."
        count={staleSessions.length}
        actionLabel="All sessions"
        actionHref="/admin/interviews?status=in_progress"
      >
        {staleSessions.length === 0 ? null : (
          <ul className="divide-y divide-border">
            {staleSessions.map((s) => (
              <li key={s.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-panel/20 transition-all duration-200">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/interviews/${s.id}`}
                      className="font-black text-fg hover:text-accent transition truncate block text-sm"
                    >
                      {s.title}
                    </Link>
                    <div className="text-[11px] text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>{s.user.name ?? "Anonymous"}</span>
                      <span className="text-muted/30">·</span>
                      <span className="font-mono text-[10px]">started {s.startedAt ? relativeTime(s.startedAt) : "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    href={`/admin/interviews/${s.id}`}
                    className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg bg-accent text-bg hover:opacity-90 transition shrink-0"
                  >
                    Inspect
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Queue>
    </div>
  );
}

function Queue({
  title,
  icon: Icon,
  count,
  emptyMessage,
  secondaryNote,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  emptyMessage: string;
  secondaryNote?: string | null;
  actionLabel: string;
  actionHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-panel/30 backdrop-blur-md shadow-lg overflow-hidden group/queue relative">
      {/* Background ambient spotlight card glows */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/[0.01] rounded-full blur-2xl pointer-events-none" />
      
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 bg-panel/40">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-muted group-hover/queue:text-accent transition-colors duration-300" />
          <h3 className="text-sm font-black tracking-tight text-fg">{title}</h3>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-panel/40 border border-border text-muted">
            {count}
          </span>
        </div>
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg transition-colors"
        >
          {actionLabel}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {count === 0 ? (
        <div className="px-5 py-10 text-center relative z-10">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
          <p className="text-xs text-muted font-medium">{emptyMessage}</p>
          {secondaryNote && (
            <p className="text-[11px] text-muted/50 mt-2 font-mono">{secondaryNote}</p>
          )}
        </div>
      ) : (
        <div className="relative z-10">
          {children}
          {secondaryNote && (
            <div className="px-5 py-3 border-t border-border text-[11px] text-muted/70 bg-panel/10 font-mono">
              {secondaryNote}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
