import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import {
  Users, FileText, Plus, Sparkles, Building2, BookOpenCheck,
  Briefcase, Bug, MessageSquareCode, Map, Code2, Newspaper, Eye, Heart,
  ListTodo, BellRing, UserPlus, ArrowRight, Activity, Trophy,
} from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { techLabel, compactNumber } from "@/lib/interview-questions/shared";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);
  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDays}d ago`;
}

const TREND_DAYS = 14;

/** Bucket timestamps into ascending daily counts over the last TREND_DAYS. */
function bucketByDay(dates: Date[]): number[] {
  const buckets = new Array(TREND_DAYS).fill(0);
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const windowStart = startOfToday.getTime() - (TREND_DAYS - 1) * dayMs;
  for (const d of dates) {
    const idx = Math.floor((d.getTime() - windowStart) / dayMs);
    if (idx >= 0 && idx < TREND_DAYS) buckets[idx]++;
  }
  return buckets;
}

function trendWindowStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (TREND_DAYS - 1));
  return d;
}

function renderSparkline(data: number[], strokeColor: string, gradId: string) {
  const maxVal = Math.max(...data, 1);
  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 28 - (val / maxVal) * 24,
  }));
  const linePath = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaPath = `${linePath} L 100,32 L 0,32 Z`;
  return (
    <svg className="w-full h-10 overflow-visible mt-3" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Uniform KPI card: header, value line and footer sit at fixed positions and
 * the middle band has a constant height whether it holds a sparkline or not,
 * so the four cards line up regardless of content.
 */
function KpiCard({
  icon: Icon,
  iconClass,
  title,
  badge,
  value,
  suffix,
  middle,
  footerLeft,
  footerRight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  badge: string;
  value: string;
  suffix: string;
  middle: React.ReactNode;
  footerLeft: React.ReactNode;
  footerRight: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg/40 p-5 flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconClass}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted whitespace-nowrap truncate">{title}</span>
        </div>
        <span className="text-[9px] font-mono font-bold text-muted border border-border px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">{badge}</span>
      </div>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-3xl font-black tabular-nums shrink-0">{value}</span>
        <span className="text-xs text-muted whitespace-nowrap truncate">{suffix}</span>
      </div>
      {/* Fixed-height middle band — sparkline (40px + 12px gap) or equivalent. */}
      <div className="h-[52px] flex items-end">{middle}</div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2 text-[11px] text-muted">
        <span className="min-w-0 truncate">{footerLeft}</span>
        <span className="whitespace-nowrap shrink-0">{footerRight}</span>
      </div>
    </div>
  );
}

const SESSION_STATUS_META: Record<string, { label: string; dot: string }> = {
  scheduled: { label: "Scheduled", dot: "bg-sky-400" },
  in_progress: { label: "In progress", dot: "bg-amber-400" },
  completed: { label: "Completed", dot: "bg-emerald-400" },
  abandoned: { label: "Abandoned", dot: "bg-rose-400" },
  PENDING: { label: "Pending", dot: "bg-sky-400" },
  ACTIVE: { label: "Active", dot: "bg-amber-400" },
  COMPLETED: { label: "Completed", dot: "bg-emerald-400" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  await requireAdminAccess();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since = trendWindowStart();

  const [
    // People
    totalUsers, bannedUsers, newUsers7d, recentUsers,
    // Question bank
    totalQuestions, publishedQuestions, questionAgg, questionsByTech, topQuestions, companies, pendingExperiences,
    // Practice surfaces
    totalChallenges, challengeAttempts, passedAttempts,
    reviewChallenges, reviewAttempts, promptScenarios, promptAttempts, journeys,
    // Hiring
    workspaces, candidates, liveByStatus, aiByStatus, activeBatches,
    // Community
    totalBlogs, pendingBlogs, totalSnippets, snippetViews, blogViews,
    // Ops queues
    pendingCreatorApps, unresolvedAlerts, openTodos,
    // Trends (raw timestamps, bucketed below)
    userDates, challengeAttemptDates, reviewAttemptDates, promptAttemptDates, liveSessionDates, aiSessionDates,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    }),

    prisma.prepQuestion.count(),
    prisma.prepQuestion.count({ where: { status: "published" } }),
    prisma.prepQuestion.aggregate({ _sum: { views: true, likes: true } }),
    prisma.prepQuestion.groupBy({
      by: ["technology"],
      where: { status: "published" },
      _count: { _all: true },
      _sum: { views: true },
    }),
    prisma.prepQuestion.findMany({
      where: { status: "published" },
      orderBy: { views: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, views: true, likes: true, technology: true },
    }),
    prisma.company.count(),
    prisma.prepExperience.count({ where: { status: "pending" } }),

    prisma.challenge.count(),
    prisma.challengeAttempt.count(),
    prisma.challengeAttempt.count({ where: { status: "passed" } }),
    prisma.reviewChallenge.count(),
    prisma.reviewAttempt.count(),
    prisma.promptScenario.count(),
    prisma.promptAttempt.count(),
    prisma.prepJourney.count(),

    prisma.workspace.count(),
    prisma.candidate.count(),
    prisma.interviewSession.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.aIInterviewSession.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.aIScreeningBatch.count({ where: { status: "ACTIVE" } }),

    prisma.blogPost.count(),
    prisma.blogPost.count({ where: { status: "PENDING" } }),
    prisma.snippet.count(),
    prisma.snippet.aggregate({ _sum: { viewCount: true } }),
    prisma.blogPost.aggregate({ _sum: { viewCount: true } }),

    prisma.creatorApplication.count({ where: { status: "PENDING" } }),
    prisma.gemmaAlert.count({ where: { status: "UNRESOLVED" } }),
    prisma.adminTodo.count({ where: { status: { not: "DONE" } } }),

    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.challengeAttempt.findMany({ where: { startedAt: { gte: since } }, select: { startedAt: true } }),
    prisma.reviewAttempt.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.promptAttempt.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.interviewSession.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.aIInterviewSession.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  // Derived numbers
  const questionViews = questionAgg._sum.views ?? 0;
  const questionLikes = questionAgg._sum.likes ?? 0;
  const contentViews = (snippetViews._sum.viewCount ?? 0) + (blogViews._sum.viewCount ?? 0) + questionViews;
  const practiceAttempts = challengeAttempts + reviewAttempts + promptAttempts;
  const passRate = challengeAttempts > 0 ? Math.round((passedAttempts / challengeAttempts) * 100) : 0;
  const liveTotal = liveByStatus.reduce((s, r) => s + r._count._all, 0);
  const aiTotal = aiByStatus.reduce((s, r) => s + r._count._all, 0);

  const techRows = questionsByTech
    .map((r) => ({
      slug: r.technology ?? "",
      label: r.technology ? techLabel(r.technology) : "Untagged",
      count: r._count._all,
      views: r._sum.views ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
  const maxTechCount = Math.max(...techRows.map((t) => t.count), 1);

  // Trend series (14-day daily buckets)
  const usersTrend = bucketByDay(userDates.map((r) => r.createdAt));
  const practiceTrend = bucketByDay([
    ...challengeAttemptDates.map((r) => r.startedAt),
    ...reviewAttemptDates.map((r) => r.createdAt),
    ...promptAttemptDates.map((r) => r.createdAt),
  ]);
  const hiringTrend = bucketByDay([
    ...liveSessionDates.map((r) => r.createdAt),
    ...aiSessionDates.map((r) => r.createdAt),
  ]);
  const practice14d = practiceTrend.reduce((a, b) => a + b, 0);
  const hiring14d = hiringTrend.reduce((a, b) => a + b, 0);

  // Ops queues — rendered only when non-empty.
  const queues = [
    { count: pendingBlogs, label: "Blogs awaiting review", href: "/admin/blogs?status=PENDING", icon: Newspaper },
    { count: pendingExperiences, label: "Experiences to moderate", href: "/admin/interview-questions/experiences", icon: MessageSquareCode },
    { count: pendingCreatorApps, label: "Creator applications", href: "/admin/creators", icon: UserPlus },
    { count: unresolvedAlerts, label: "Unresolved Gemma alerts", href: "/admin/copilot", icon: BellRing },
    { count: openTodos, label: "Open tickets", href: "/admin/todos", icon: ListTodo },
  ].filter((item) => item.count > 0);

  const surfaces = [
    { icon: FileText, label: "Interview questions", value: publishedQuestions, sub: `${techRows.length} technologies`, href: "/admin/interview-questions" },
    { icon: Code2, label: "Coding challenges", value: totalChallenges, sub: `${compactNumber(challengeAttempts)} attempts`, href: "/admin/challenges" },
    { icon: Bug, label: "Review-the-AI-code", value: reviewChallenges, sub: `${compactNumber(reviewAttempts)} attempts`, href: "/interview/ai-code-review" },
    { icon: Sparkles, label: "Prompt arena", value: promptScenarios, sub: `${compactNumber(promptAttempts)} attempts`, href: "/interview/prompt-practice" },
    { icon: Map, label: "Prep journeys", value: journeys, sub: "guided plans", href: "/interview" },
    { icon: Building2, label: "Companies", value: companies, sub: "question index", href: "/admin/interview-questions/companies" },
  ];

  const card = "rounded-2xl border border-border bg-bg/40";
  const cardHead = "px-5 py-3.5 border-b border-border flex items-center gap-2";
  const cardTitle = "text-[10px] font-black uppercase tracking-[0.2em] text-muted";

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Internal operations</div>
          <h2 className="text-2xl font-black tracking-tight mt-1 text-fg">Mission Control</h2>
          <p className="text-sm text-muted mt-1">Everything the platform is doing, at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/interview-questions/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-xs font-bold hover:border-accent/40 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Question
          </Link>
          <Link
            href="/admin/challenges/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Challenge
          </Link>
        </div>
      </div>

      {/* ── Needs attention ────────────────────────────────────────────────── */}
      {queues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {queues.map((queue) => (
            <Link
              key={queue.label}
              href={queue.href}
              className="group flex items-center gap-3 p-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-500/50 transition w-full sm:w-auto sm:min-w-[220px]"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                <queue.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black leading-none tabular-nums text-amber-500">{queue.count}</div>
                <div className="text-[10px] font-bold text-muted truncate group-hover:text-fg transition-colors">{queue.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <KpiCard
          icon={Users}
          iconClass="bg-accent/10 border-accent/20 text-accent"
          title="Community"
          badge="14d"
          value={compactNumber(totalUsers)}
          suffix="users"
          middle={renderSparkline(usersTrend, "#FFE600", "grad-users")}
          footerLeft={<span className="font-bold text-emerald-500">+{newUsers7d} this week</span>}
          footerRight={<span className={bannedUsers > 0 ? "text-rose-400 font-bold" : ""}>{bannedUsers} banned</span>}
        />
        <KpiCard
          icon={BookOpenCheck}
          iconClass="bg-sky-500/10 border-sky-500/20 text-sky-400"
          title="Questions"
          badge={`${techRows.length} techs`}
          value={compactNumber(publishedQuestions)}
          suffix={`published${totalQuestions > publishedQuestions ? ` · ${totalQuestions - publishedQuestions} draft` : ""}`}
          middle={
            <div className="w-full flex items-center gap-4 pb-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {compactNumber(questionViews)} views</span>
              <span className="inline-flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> {compactNumber(questionLikes)} likes</span>
            </div>
          }
          footerLeft={<>Top: {techRows[0] ? `${techRows[0].label} (${techRows[0].count})` : "—"}</>}
          footerRight={
            <Link href="/admin/interview-questions" className="font-black uppercase tracking-wider text-[9px] text-sky-400 hover:underline">Manage →</Link>
          }
        />
        <KpiCard
          icon={Activity}
          iconClass="bg-violet-500/10 border-violet-500/20 text-violet-400"
          title="Practice"
          badge="14d"
          value={compactNumber(practiceAttempts)}
          suffix="attempts all-time"
          middle={renderSparkline(practiceTrend, "#A78BFA", "grad-practice")}
          footerLeft={<>{practice14d} in the last 14 days</>}
          footerRight={<span className="font-bold text-violet-400">{passRate}% pass rate</span>}
        />
        <KpiCard
          icon={Briefcase}
          iconClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          title="Hiring"
          badge="14d"
          value={compactNumber(liveTotal + aiTotal)}
          suffix={`interviews · ${liveTotal} live · ${aiTotal} AI`}
          middle={renderSparkline(hiringTrend, "#34D399", "grad-hiring")}
          footerLeft={<>{workspaces} workspaces · {compactNumber(candidates)} candidates</>}
          footerRight={<span className="font-bold text-emerald-400">{hiring14d} new / 14d</span>}
        />
      </div>

      {/* ── Content arsenal + hiring pipeline ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr),340px] gap-4 items-stretch">
        <div className="flex flex-col gap-4 min-w-0">
          {/* Question bank by technology */}
          <div className={card}>
            <div className={cardHead}>
              <BookOpenCheck className="w-4 h-4 text-sky-400" />
              <h3 className={cardTitle}>Question bank by technology</h3>
              <Link href="/admin/interview-questions" className="ml-auto text-[9px] font-black uppercase tracking-wider text-muted hover:text-accent inline-flex items-center gap-1 transition-colors">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-5 space-y-2.5">
              {techRows.map((tech) => (
                <Link
                  key={tech.slug || "untagged"}
                  href={tech.slug ? `/admin/interview-questions?tech=${tech.slug}` : "/admin/interview-questions"}
                  className="group grid grid-cols-[minmax(0,150px),1fr,auto] sm:grid-cols-[180px,1fr,150px] items-center gap-3"
                >
                  <span className="text-xs font-bold truncate group-hover:text-accent transition-colors">{tech.label}</span>
                  <div className="h-2 rounded-full bg-bg border border-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500/80 to-sky-400/50 group-hover:from-sky-400 group-hover:to-sky-300/70 transition-colors"
                      style={{ width: `${Math.max((tech.count / maxTechCount) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-muted text-right tabular-nums whitespace-nowrap">
                    <span className="font-black text-fg">{tech.count}</span> · {compactNumber(tech.views)} views
                  </span>
                </Link>
              ))}
              {techRows.length === 0 && <p className="text-xs text-muted">No published questions yet.</p>}
            </div>
          </div>

          {/* Prep surfaces */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 auto-rows-fr gap-3">
            {surfaces.map((s) => (
              <Link key={s.label} href={s.href} className={`${card} p-4 hover:border-accent/40 transition group`}>
                <div className="flex items-center gap-2 text-muted">
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest truncate">{s.label}</span>
                </div>
                <div className="text-2xl font-black tabular-nums mt-2 group-hover:text-accent transition-colors">{compactNumber(s.value)}</div>
                <div className="text-[10px] text-muted mt-0.5">{s.sub}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right rail: hiring pipeline + top questions */}
        <div className="flex flex-col gap-4">
          <div className={card}>
            <div className={cardHead}>
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <h3 className={cardTitle}>Hiring pipeline</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">Live interviews</div>
                <div className="space-y-1.5">
                  {liveByStatus.map((row) => {
                    const meta = SESSION_STATUS_META[row.status] ?? { label: row.status, dot: "bg-zinc-400" };
                    return (
                      <div key={row.status} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        <span className="text-muted flex-1">{meta.label}</span>
                        <span className="font-mono font-black tabular-nums">{row._count._all}</span>
                      </div>
                    );
                  })}
                  {liveByStatus.length === 0 && <p className="text-xs text-muted">No sessions yet.</p>}
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">AI screenings</div>
                <div className="space-y-1.5">
                  {aiByStatus.map((row) => {
                    const meta = SESSION_STATUS_META[row.status] ?? { label: row.status, dot: "bg-zinc-400" };
                    return (
                      <div key={row.status} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        <span className="text-muted flex-1">{meta.label}</span>
                        <span className="font-mono font-black tabular-nums">{row._count._all}</span>
                      </div>
                    );
                  })}
                  {aiByStatus.length === 0 && <p className="text-xs text-muted">No AI sessions yet.</p>}
                </div>
                <div className="flex items-center justify-between mt-3 text-[11px]">
                  <span className="text-muted">Active batches</span>
                  <span className="font-mono font-black">{activeBatches}</span>
                </div>
              </div>
              <Link href="/admin/ai-interviews" className="block text-center text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:underline pt-1">
                Open console →
              </Link>
            </div>
          </div>

          <div className={`${card} flex-1`}>
            <div className={cardHead}>
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className={cardTitle}>Most-viewed questions</h3>
            </div>
            <div className="p-3 space-y-1">
              {topQuestions.map((question, i) => (
                <Link
                  key={question.id}
                  href={`/interview-question/${question.slug}`}
                  target="_blank"
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-elevated/50 transition group"
                >
                  <span className="text-[10px] font-mono font-black text-muted w-4 text-right shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-xs font-bold leading-snug line-clamp-2 flex-1 group-hover:text-accent transition-colors">{question.title}</span>
                  <span className="text-[10px] font-mono text-muted shrink-0 inline-flex items-center gap-1 mt-0.5">
                    <Eye className="w-3 h-3" />{compactNumber(question.views)}
                  </span>
                </Link>
              ))}
              {topQuestions.length === 0 && <p className="text-xs text-muted p-2">No published questions yet.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── People & community ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div className={card}>
          <div className={cardHead}>
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <h3 className={cardTitle}>Recent signups</h3>
            <Link href="/admin/users" className="ml-auto text-[9px] font-black uppercase tracking-wider text-muted hover:text-accent inline-flex items-center gap-1 transition-colors">
              All users <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 space-y-1">
            {recentUsers.map((user) => (
              <div key={user.id} className="p-2 rounded-xl hover:bg-elevated/50 transition flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-bg border border-border flex items-center justify-center relative shrink-0">
                  {user.image ? (
                    <Image src={user.image} alt="" fill className="object-cover" />
                  ) : (
                    <span className="text-[10px] font-black text-muted">{(user.name || "?")[0].toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{user.name || "New developer"}</div>
                  <div className="text-[9px] text-muted truncate mt-0.5">{user.email}</div>
                </div>
                <span className="text-[9px] font-mono text-muted shrink-0">{formatRelativeTime(user.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} flex flex-col`}>
          <div className={cardHead}>
            <Newspaper className="w-4 h-4 text-rose-400" />
            <h3 className={cardTitle}>Community content</h3>
          </div>
          <div className="p-4 flex-1 grid grid-cols-2 gap-3 content-start">
            <Link href="/admin/blogs" className="p-3 rounded-xl border border-border hover:border-accent/40 transition group">
              <div className="text-xl font-black tabular-nums group-hover:text-accent transition-colors">{compactNumber(totalBlogs)}</div>
              <div className="text-[10px] text-muted">blog posts{pendingBlogs > 0 ? ` · ${pendingBlogs} pending` : ""}</div>
            </Link>
            <Link href="/admin/snippets" className="p-3 rounded-xl border border-border hover:border-accent/40 transition group">
              <div className="text-xl font-black tabular-nums group-hover:text-accent transition-colors">{compactNumber(totalSnippets)}</div>
              <div className="text-[10px] text-muted">snippets</div>
            </Link>
            <Link href="/admin/comments" className="p-3 rounded-xl border border-border hover:border-accent/40 transition group">
              <div className="text-xl font-black tabular-nums group-hover:text-accent transition-colors">{compactNumber(questionLikes)}</div>
              <div className="text-[10px] text-muted">question likes</div>
            </Link>
            <div className="p-3 rounded-xl border border-border">
              <div className="text-xl font-black tabular-nums">{compactNumber(companies)}</div>
              <div className="text-[10px] text-muted">companies indexed</div>
            </div>
            <div className="col-span-2 self-end pt-3 border-t border-border flex items-center justify-between text-[11px]">
              <span className="text-muted inline-flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Total content views</span>
              <span className="font-mono font-black">{compactNumber(contentViews)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
