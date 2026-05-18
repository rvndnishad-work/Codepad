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
          <ul className="divide-y divide-border/50">
            {pendingBlogs.map((b) => (
              <li key={b.id} className="px-5 py-3 flex items-center gap-4 hover:bg-elevated/30 transition">
                <Clock className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/blogs?q=${encodeURIComponent(b.slug)}`}
                    className="font-bold text-fg hover:text-accent transition truncate block"
                  >
                    {b.title}
                  </Link>
                  <div className="text-[11px] text-muted mt-0.5">
                    by {b.user.name ?? "Anonymous"}{" "}
                    <span className="text-muted/40">·</span>{" "}
                    submitted {relativeTime(b.createdAt)}
                  </div>
                </div>
                <Link
                  href={`/blog/${b.slug}`}
                  target="_blank"
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg text-muted hover:text-fg hover:bg-elevated transition shrink-0"
                >
                  Preview
                </Link>
                <Link
                  href={`/admin/blogs?q=${encodeURIComponent(b.slug)}`}
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-accent text-bg hover:opacity-90 transition shrink-0"
                >
                  Review
                </Link>
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
          <ul className="divide-y divide-border/50">
            {communityDraftChallenges.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center gap-4 hover:bg-elevated/30 transition">
                <Target className="w-3.5 h-3.5 text-blue-500/70 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/challenges/${c.id}/edit`}
                    className="font-bold text-fg hover:text-accent transition truncate block"
                  >
                    {c.title}
                  </Link>
                  <div className="text-[11px] text-muted mt-0.5">
                    by {c.author?.name ?? "Anonymous"}{" "}
                    <span className="text-muted/40">·</span>{" "}
                    <span className="uppercase tracking-wider">{c.difficulty}</span>{" "}
                    <span className="text-muted/40">·</span>{" "}
                    updated {relativeTime(c.updatedAt)}
                  </div>
                </div>
                <Link
                  href={`/admin/challenges/${c.id}/edit`}
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-accent text-bg hover:opacity-90 transition shrink-0"
                >
                  Edit
                </Link>
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
          <ul className="divide-y divide-border/50">
            {staleSessions.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-center gap-4 hover:bg-elevated/30 transition">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/interviews/${s.id}`}
                    className="font-bold text-fg hover:text-accent transition truncate block"
                  >
                    {s.title}
                  </Link>
                  <div className="text-[11px] text-muted mt-0.5">
                    {s.user.name ?? "Anonymous"}{" "}
                    <span className="text-muted/40">·</span>{" "}
                    started {s.startedAt ? relativeTime(s.startedAt) : "—"}
                  </div>
                </div>
                <Link
                  href={`/admin/interviews/${s.id}`}
                  className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-accent text-bg hover:opacity-90 transition shrink-0"
                >
                  Inspect
                </Link>
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
    <section className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 bg-elevated/30">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-muted" />
          <h3 className="text-sm font-bold text-fg">{title}</h3>
          <span className="text-[10px] font-black uppercase tracking-wider tabular-nums px-2 py-0.5 rounded-full bg-bg border border-border text-muted">
            {count}
          </span>
        </div>
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg transition"
        >
          {actionLabel}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {count === 0 ? (
        <div className="px-5 py-8 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500/40 mx-auto mb-2" />
          <p className="text-xs text-muted">{emptyMessage}</p>
          {secondaryNote && (
            <p className="text-[11px] text-muted/60 mt-2">{secondaryNote}</p>
          )}
        </div>
      ) : (
        <>
          {children}
          {secondaryNote && (
            <div className="px-5 py-3 border-t border-border/50 text-[11px] text-muted/70 bg-bg/60">
              {secondaryNote}
            </div>
          )}
        </>
      )}
    </section>
  );
}
