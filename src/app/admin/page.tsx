import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { 
  Target, 
  Users, 
  FileText, 
  Code2, 
  ArrowRight, 
  Eye, 
  TrendingUp, 
  Award,
  ShieldAlert,
  Plus
} from "lucide-react";
import DashboardFeedHub from "./DashboardFeedHub";

// Simple relative time formatter helper for live feeds
function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDays}d ago`;
}

export default async function AdminDashboardPage() {
  // Query all executive platform data points in parallel for top speed
  const [
    totalUsers,
    totalChallengesCount,
    totalAttemptsCount,
    totalBlogsCount,
    totalSnippetsCount,
    totalSessionsCount,
    bannedUsersCount,
    passedAttemptsCount,
    snippetViewsAgg,
    blogViewsAgg,
    recentUsers,
    allSnippets,
    allBlogs,
    allChallenges,
    allAttempts,
    pendingBlogs,
    easyChallengesCount,
    mediumChallengesCount,
    hardChallengesCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.challenge.count(),
    prisma.challengeAttempt.count(),
    prisma.blogPost.count(),
    prisma.snippet.count(),
    prisma.interviewSession.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.challengeAttempt.count({ where: { status: "passed" } }),
    prisma.snippet.aggregate({ _sum: { viewCount: true } }),
    prisma.blogPost.aggregate({ _sum: { viewCount: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, image: true, createdAt: true }
    }),
    prisma.snippet.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        template: true,
        viewCount: true,
        pinned: true,
        createdAt: true,
        user: { select: { name: true, email: true, image: true } }
      }
    }),
    prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        status: true,
        viewCount: true,
        featured: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        _count: { select: { reactions: true, comments: true } }
      }
    }),
    prisma.challenge.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        category: true,
        featured: true,
        createdAt: true,
        _count: { select: { attempts: true } }
      }
    }),
    prisma.challengeAttempt.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true, email: true, image: true } },
        challenge: { select: { title: true, difficulty: true, slug: true } }
      }
    }),
    prisma.blogPost.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        user: { select: { name: true, email: true } }
      }
    }),
    prisma.challenge.count({ where: { difficulty: "easy" } }),
    prisma.challenge.count({ where: { difficulty: "medium" } }),
    prisma.challenge.count({ where: { difficulty: "hard" } })
  ]);

  const totalViews = (snippetViewsAgg._sum.viewCount || 0) + (blogViewsAgg._sum.viewCount || 0);
  const successRate = totalAttemptsCount > 0 ? Math.round((passedAttemptsCount / totalAttemptsCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Executive Welcome Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
            Internal Workspace
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1">SaaS Executive Dashboard</h2>
          <p className="text-sm text-muted mt-1">Real-time performance indicators and operational health logs.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/challenges/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/15"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            New Challenge
          </Link>
        </div>
      </div>

      {/* Primary KPI Indicator Rows (Elevated Solid Cards with Subtle Shadows) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* User Base KPI */}
        <div className="rounded-2xl border border-border bg-bg p-6 relative overflow-hidden group hover:border-border-strong hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
          <div className="flex items-center gap-3 text-muted mb-4">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">
              Audience Growth
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black tracking-tight tabular-nums text-fg">{totalUsers}</div>
            <div className="text-xs text-muted font-medium">registered members</div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>Banned Members</span>
            <span className={`font-bold font-mono px-2 py-0.5 rounded-full ${bannedUsersCount > 0 ? "bg-red-500/10 text-red-500" : "bg-muted/10"}`}>
              {bannedUsersCount}
            </span>
          </div>
        </div>

        {/* Development Analytics KPI */}
        <div className="rounded-2xl border border-border bg-bg p-6 relative overflow-hidden group hover:border-border-strong hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
          <div className="flex items-center gap-3 text-muted mb-4">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">
              Dev Analytics
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black tracking-tight tabular-nums text-fg">{totalAttemptsCount}</div>
            <div className="text-xs text-muted font-medium">challenge solutions</div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>Success Rate</span>
            <span className="font-bold font-mono text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-full">
              {successRate}% Passed
            </span>
          </div>
        </div>

        {/* Platform Engagement KPI */}
        <div className="rounded-2xl border border-border bg-bg p-6 relative overflow-hidden group hover:border-border-strong hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
          <div className="flex items-center gap-3 text-muted mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Eye className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.15em]">
              Engagement
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black tracking-tight tabular-nums text-fg">{totalViews}</div>
            <div className="text-xs text-muted font-medium">collective view sessions</div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>Blogs / Snippets</span>
            <span className="font-bold text-emerald-500 flex items-center gap-1 font-mono">
              <TrendingUp className="w-3 h-3" />
              {totalBlogsCount} / {totalSnippetsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Splits (Elevated Solid Blocks) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        
        {/* Left Side: Interactive Dashboard Catalog Feed Hub */}
        <div className="space-y-6">
          <DashboardFeedHub
            initialSnippets={allSnippets}
            initialBlogs={allBlogs}
            initialChallenges={allChallenges}
            initialAttempts={allAttempts}
          />
        </div>

        {/* Right Side: Pipelines & Distributions */}
        <div className="space-y-6">
          {/* Review Queue Pipe */}
          {pendingBlogs.length > 0 && (
            <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.01] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-red-500/15 bg-red-500/5 flex items-center gap-2 text-red-500">
                <ShieldAlert className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">Moderation Queue</h3>
                <span className="text-[10px] font-mono font-bold bg-red-500/20 px-2 py-0.5 rounded-full ml-auto">
                  {pendingBlogs.length}
                </span>
              </div>
              <div className="divide-y divide-red-500/10 p-2 space-y-1">
                {pendingBlogs.map((post) => (
                  <div key={post.id} className="p-3 hover:bg-red-500/5 rounded-xl transition flex flex-col gap-1.5">
                    <div className="text-xs font-bold text-fg line-clamp-1">{post.title}</div>
                    <div className="flex items-center justify-between text-[10px] text-muted">
                      <span>By {post.user.name || post.user.email}</span>
                      <Link href="/admin/blogs?status=PENDING" className="font-bold text-red-400 hover:underline">
                        Review →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Spotlight List */}
          <div className="rounded-2xl border border-border bg-bg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-panel/30 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-fg">Recent Signups</h3>
            </div>
            <div className="p-3 divide-y divide-border">
              {recentUsers.map((user) => (
                <div key={user.id} className="py-2.5 flex items-center gap-3 font-medium">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-muted relative shrink-0">
                    {user.image ? (
                      <Image src={user.image} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted">
                        {(user.name || "?")[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-fg truncate">
                      {user.name || "New Developer"}
                    </div>
                    <div className="text-[9px] text-muted truncate mt-0.5">
                      {user.email}
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-muted shrink-0">{formatRelativeTime(user.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Challenge Difficulty Distribution */}
          <div className="rounded-2xl border border-border bg-bg shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-black uppercase tracking-wider text-fg">Challenge Difficulty</h3>
            </div>
            
            {/* Visual Capsule Line */}
            {totalChallengesCount > 0 ? (
              <div className="space-y-4">
                <div className="h-2 rounded-full overflow-hidden flex bg-border">
                  <div 
                    style={{ width: `${(easyChallengesCount / totalChallengesCount) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title="Easy"
                  />
                  <div 
                    style={{ width: `${(mediumChallengesCount / totalChallengesCount) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title="Medium"
                  />
                  <div 
                    style={{ width: `${(hardChallengesCount / totalChallengesCount) * 100}%` }}
                    className="bg-red-500 h-full"
                    title="Hard"
                  />
                </div>

                {/* Details list */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <div className="text-[10px] font-black uppercase text-emerald-500">Easy</div>
                    <div className="text-sm font-mono font-bold text-fg mt-0.5">{easyChallengesCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <div className="text-[10px] font-black uppercase text-amber-500">Medium</div>
                    <div className="text-sm font-mono font-bold text-fg mt-0.5">{mediumChallengesCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-red-500/10">
                    <div className="text-[10px] font-black uppercase text-red-500">Hard</div>
                    <div className="text-sm font-mono font-bold text-fg mt-0.5">{hardChallengesCount}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-muted py-2">No challenges defined yet.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
