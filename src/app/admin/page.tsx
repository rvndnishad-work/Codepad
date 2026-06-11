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
import { requireAdminAccess } from "@/lib/permissions/staff";

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

// Server-side SVG Sparkline chart builder for premium data trends
function renderSparkline(data: number[], strokeColor: string, gradId: string) {
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 28 - ((val - minVal) / range) * 24; // Scale with padding
    return { x, y };
  });

  const linePath = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaPath = `${linePath} L 100,32 L 0,32 Z`;

  return (
    <svg className="w-full h-10 overflow-visible mt-3" viewBox="0 0 100 32" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function AdminDashboardPage() {
  await requireAdminAccess();
  const now = new Date();
  
  // Calculate 7 days ago window
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    return d;
  }).reverse(); // Ascending chronological order

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
    hardChallengesCount,
    dailyCounts
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
    prisma.challenge.count({ where: { difficulty: "hard" } }),
    // Generate chronological trends over the last 7 days
    Promise.all(
      last7Days.map(async (dayStart) => {
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        const [users, attempts, blogs, snippets] = await Promise.all([
          prisma.user.count({
            where: { createdAt: { gte: dayStart, lt: dayEnd } }
          }),
          prisma.challengeAttempt.count({
            where: { startedAt: { gte: dayStart, lt: dayEnd } }
          }),
          prisma.blogPost.count({
            where: { createdAt: { gte: dayStart, lt: dayEnd } }
          }),
          prisma.snippet.count({
            where: { createdAt: { gte: dayStart, lt: dayEnd } }
          })
        ]);

        return {
          users,
          attempts,
          engagement: blogs + snippets
        };
      })
    )
  ]);

  const totalViews = (snippetViewsAgg._sum.viewCount || 0) + (blogViewsAgg._sum.viewCount || 0);
  const successRate = totalAttemptsCount > 0 ? Math.round((passedAttemptsCount / totalAttemptsCount) * 100) : 0;

  // Extract trend arrays
  const audienceTrend = dailyCounts.map((d) => d.users);
  const devTrend = dailyCounts.map((d) => d.attempts);
  const engagementTrend = dailyCounts.map((d) => d.engagement);

  return (
    <div className="space-y-8">
      {/* Executive Welcome Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">
            Internal Operations Center
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-1 text-fg">Executive Command</h2>
          <p className="text-sm text-muted mt-1">Real-time SaaS performance indicators and system telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/challenges/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-accent/15"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            New Challenge
          </Link>
        </div>
      </div>

      {/* Premium Glassmorphic KPI Cards with Custom Glowing Spotlight Fills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* User Base KPI - Glowing Accent: Yellow */}
        <div className="rounded-2xl border border-accent/15 bg-gradient-to-br from-accent/[0.07] via-panel/30 to-panel/20 backdrop-blur-md p-6 relative overflow-hidden group hover:border-accent/40 hover:shadow-[0_0_30px_rgba(255,230,0,0.06)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="flex items-center justify-between text-muted mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-fg">
                Audience Growth
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-muted bg-panel/40 border border-border px-2 py-0.5 rounded-full">
              7D Trend
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black tracking-tight tabular-nums text-fg">{totalUsers}</div>
            <div className="text-xs text-muted font-medium">registered members</div>
          </div>
          
          {/* Sparkline chart */}
          {renderSparkline(audienceTrend, "#FFE600", "grad-audience")}

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>Banned Status</span>
            <span className={`font-black font-mono px-2 py-0.5 rounded-lg border text-[10px] uppercase tracking-wider ${bannedUsersCount > 0 ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-panel border border-border text-muted"}`}>
              {bannedUsersCount} Banned
            </span>
          </div>
        </div>

        {/* Development Analytics KPI - Glowing Accent: Violet */}
        <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.07] via-panel/30 to-panel/20 backdrop-blur-md p-6 relative overflow-hidden group hover:border-violet-500/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="flex items-center justify-between text-muted mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <Code2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-fg">
                Dev Analytics
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-muted bg-panel/40 border border-border px-2 py-0.5 rounded-full">
              7D Trend
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black tracking-tight tabular-nums text-fg">{totalAttemptsCount}</div>
            <div className="text-xs text-muted font-medium">solutions parsed</div>
          </div>

          {/* Sparkline chart */}
          {renderSparkline(devTrend, "#A78BFA", "grad-dev")}

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>Success rate</span>
            <span className="font-black font-mono text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg">
              {successRate}% Passed
            </span>
          </div>
        </div>

        {/* Platform Engagement KPI - Glowing Accent: Emerald */}
        <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.07] via-panel/30 to-panel/20 backdrop-blur-md p-6 relative overflow-hidden group hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.06)] transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="flex items-center justify-between text-muted mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-fg">
                Engagement
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-muted bg-panel/40 border border-border px-2 py-0.5 rounded-full">
              7D Trend
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black tracking-tight tabular-nums text-fg">{totalViews}</div>
            <div className="text-xs text-muted font-medium">view sessions</div>
          </div>

          {/* Sparkline chart */}
          {renderSparkline(engagementTrend, "#34D399", "grad-engagement")}

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
            <span>Blogs / Snippets</span>
            <span className="font-black text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
              <TrendingUp className="w-3.5 h-3.5" />
              {totalBlogsCount} B / {totalSnippetsCount} S
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Splits (Elevated Solid Blocks) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        
        {/* Left Side: Interactive Dashboard Catalog Feed Hub */}
        <div className="space-y-6 min-w-0">
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
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] backdrop-blur-sm shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-red-500/25 bg-red-500/5 flex items-center gap-2 text-red-400">
                <ShieldAlert className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">Moderation Queue</h3>
                <span className="text-[10px] font-mono font-bold bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-full ml-auto">
                  {pendingBlogs.length}
                </span>
              </div>
              <div className="divide-y divide-red-500/10 p-2 space-y-1">
                {pendingBlogs.map((post) => (
                  <div key={post.id} className="p-3 hover:bg-red-500/5 rounded-xl transition flex flex-col gap-1.5">
                    <div className="text-xs font-bold text-fg line-clamp-1">{post.title}</div>
                    <div className="flex items-center justify-between text-[10px] text-muted">
                      <span>By {post.user.name || post.user.email}</span>
                      <Link href="/admin/blogs?status=PENDING" className="font-black uppercase tracking-wider text-[9px] text-red-400 hover:text-red-300">
                        Review →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}          {/* User Spotlight List */}
          <div className="rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.04] via-panel/30 to-panel/20 backdrop-blur-md shadow-md overflow-hidden">
            <div className="px-5 py-4 border-b border-indigo-500/15 bg-panel/30 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.1em] text-fg">Recent Signups</h3>
            </div>
            <div className="p-3 space-y-1">
              {recentUsers.map((user) => (
                <div key={user.id} className="p-2 hover:bg-panel/40 rounded-xl transition flex items-center gap-3 font-medium border border-transparent hover:border-border">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-bg border border-border flex items-center justify-center relative shrink-0">
                    {user.image ? (
                      <Image src={user.image} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-muted">
                        {(user.name || "?")[0].toUpperCase()}
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
          <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.04] via-panel/30 to-panel/20 backdrop-blur-md shadow-md p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.1em] text-fg">Challenge Breakdown</h3>
            </div>
            
            {/* Visual Capsule Line */}
            {totalChallengesCount > 0 ? (
              <div className="space-y-4">
                <div className="h-2.5 rounded-full overflow-hidden flex bg-bg border border-border p-[1.5px]">
                  <div 
                    style={{ width: `${(easyChallengesCount / totalChallengesCount) * 100}%` }}
                    className="bg-emerald-500 rounded-full h-full transition-all duration-300"
                    title="Easy"
                  />
                  <div 
                    style={{ width: `${(mediumChallengesCount / totalChallengesCount) * 100}%` }}
                    className="bg-amber-500 rounded-full h-full transition-all duration-300"
                    title="Medium"
                  />
                  <div 
                    style={{ width: `${(hardChallengesCount / totalChallengesCount) * 100}%` }}
                    className="bg-red-500 rounded-full h-full transition-all duration-300"
                    title="Hard"
                  />
                </div>

                {/* Details list */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[9px] font-black uppercase text-emerald-400">Easy</div>
                    <div className="text-xs font-mono font-black text-fg mt-0.5">{easyChallengesCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[9px] font-black uppercase text-amber-400">Medium</div>
                    <div className="text-xs font-mono font-black text-fg mt-0.5">{mediumChallengesCount}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="text-[9px] font-black uppercase text-red-400">Hard</div>
                    <div className="text-xs font-mono font-black text-fg mt-0.5">{hardChallengesCount}</div>
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

