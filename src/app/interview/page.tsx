import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Play,
  CheckCircle,
  Clock,
  Radio,
  Share2,
  Calendar,
  ExternalLink,
  ChevronRight,
  Activity,
  Award,
  Users,
  ShieldAlert,
  Flame,
  CheckCircle2,
  ListTodo,
  Sparkles,
  Layers,
  Zap,
  Monitor,
  Lock,
  ShieldCheck,
  Terminal,
  HelpCircle,
  Code,
  Eye,
  Laptop,
  MessageSquare,
  BadgeCheck,
} from "lucide-react";
import CopyLinkButton from "./CopyLinkButton";
import DeleteSessionButton from "./DeleteSessionButton";
import CandidateInterviewView from "./CandidateInterviewView";
import UserTypeChooser from "./UserTypeChooser";
import { getB2bSettings, getInterviewArenaSettings } from "@/lib/settings";

export const metadata = {
  title: "Mock & Live Interview Sessions — Interviewpad",
};

export default async function InterviewDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string }>;
}) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/interview")}`);
  }

  const sp = searchParams ? await searchParams : {};
  const queryRole = sp.role ?? null;
  const userId = session.user.id;
  const dbUserType = (session.user as { userType?: string | null } | undefined)?.userType ?? null;

  // Legacy users who haven't set a type yet — prompt them once
  if (dbUserType === null || dbUserType === undefined) {
    return (
      <div className="min-h-screen bg-bg text-fg py-16 px-6">
        <UserTypeChooser />
      </div>
    );
  }

  const isForcedCandidate = queryRole === "candidate";
  const userType = isForcedCandidate ? "candidate" : dbUserType;

  // Candidate experience: focused on joining + practicing
  if (userType === "candidate") {
    return (
      <div className="min-h-screen bg-bg text-fg py-10 px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <CandidateInterviewView userId={userId} userName={session.user?.name ?? null} />
        </div>
      </div>
    );
  }

  // Recruiter (and admin) experience: full management dashboard below

  // Fetch workspaces of recruiter
  const userWorkspaces = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true }
  });
  const workspaceIds = userWorkspaces.map(w => w.workspaceId);

  // Load first workspace details for health widget
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: {
      workspace: {
        include: {
          atsIntegration: true,
          members: true,
          takeHomes: {
            where: {
              status: "PENDING"
            }
          }
        }
      }
    }
  });
  const workspace = workspaceMember?.workspace ?? null;
  const b2bSettings = await getB2bSettings().catch(() => ({ freeSeatLimit: 3 }));
  const arenaSettings = await getInterviewArenaSettings();

  // Retrieve all interview slots created by the logged-in candidate
  const interviews = await prisma.interviewSession.findMany({
    where: { userId },
    include: { rubric: true },
    orderBy: { createdAt: "desc" },
  });

  // Fetch challenge + playground titles so we can list queue chips on the slots
  function parseStringIds(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  }

  const allChallengeIds = Array.from(
    new Set(interviews.flatMap((i) => parseStringIds(i.challengeIds)))
  );
  const allPlaygroundIds = Array.from(
    new Set(interviews.flatMap((i) => parseStringIds(i.playgroundIds)))
  );

  const [challenges, snippets] = await Promise.all([
    allChallengeIds.length > 0
      ? prisma.challenge.findMany({
          where: { id: { in: allChallengeIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    allPlaygroundIds.length > 0
      ? prisma.snippet.findMany({
          where: { id: { in: allPlaygroundIds }, userId },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);
  const challengeMap = new Map(challenges.map((c) => [c.id, c.title]));
  const playgroundMap = new Map(snippets.map((s) => [s.id, s.title]));

  // Calculate dynamic HUD Stats from active interviews
  const totalSlots = interviews.length;
  const completedSlots = interviews.filter((i) => i.status === "completed").length;
  const inProgressSlots = interviews.filter((i) => i.status === "in_progress").length;
  const scheduledSlots = interviews.filter((i) => i.status === "scheduled").length;

  const metBarCount = interviews.filter((i) => i.verdict === "success").length;
  const failedCount = interviews.filter((i) => i.verdict === "failed").length;
  const suspiciousCount = interviews.filter((i) => i.verdict === "suspicious").length;
  const walkoutCount = interviews.filter((i) => i.verdict === "left_in_between").length;

  const passRate = completedSlots > 0 ? Math.round((metBarCount / completedSlots) * 100) : 0;

  // 1. Replays awaiting review (completed sessions with no verdict)
  const replaysAwaitingReview = interviews.filter((i) => i.status === "completed" && !i.verdict);

  // 2. Take-homes expiring in next 24h
  const expiringTakeHomes = workspace
    ? await prisma.takeHomeAssignment.findMany({
        where: {
          workspaceId: workspace.id,
          status: { in: ["PENDING", "ACTIVE"] },
          expiresAt: {
            gt: new Date(),
            lt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
        include: { challenge: true },
      })
    : [];

  // 3. Completed sessions without a scorecard
  const sessionsWithoutScorecard = interviews.filter((i) => i.status === "completed" && !i.rubric);

  return (
    <div className="min-h-screen bg-bg text-fg font-sans py-12 px-6 lg:px-8 relative overflow-hidden">
      
      {/* Soft color blobs for premium dark high-tech aesthetics */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/3 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl space-y-12 relative z-10">

        {/* Floating Premium Workspace Notification Banner */}
        {userType === "recruiter" && (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.03] to-teal-500/[0.01] p-4 backdrop-blur-md">
            <div className="absolute top-0 left-0 h-full w-[4px] bg-emerald-500" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-sm font-bold text-fg flex items-center gap-1.5">
                    Hiring & Enterprise Workspace Active
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      PRO
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Collaborate with teammates, curate shared code challenge templates, track candidate focus-losses, and invite co-interviewers in real-time.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-950/30 shrink-0"
              >
                Go to Workspaces
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Elite Command & Branding Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-panel/90 to-surface/40 p-8 md:p-10 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent-soft)_0%,transparent_40%)] opacity-[0.06] pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent">
                <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                  1-to-1 Live Editor · Collaborative Sandbox
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg leading-tight">
                  Skip the screen-share, build{" "}
                  <span className="bg-gradient-to-r from-accent to-indigo-400 bg-clip-text text-transparent">
                    real playgrounds.
                  </span>
                </h1>
                <p className="text-sm text-muted leading-relaxed max-w-xl">
                  Share a secure, magic token link and meet inside the same live environment. Write code in Monaco, run assertions using Jest, and toggle between test files with no installation or account creation required for your candidate.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:justify-end">
              {arenaSettings.showScheduleToRecruiter && (
                <Link
                  href="/interview/new?type=live&role=interviewer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent to-indigo-500 hover:brightness-110 text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:shadow-lg hover:shadow-accent/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4 transition-transform hover:rotate-90 shrink-0" />
                  Schedule Interview
                </Link>
              )}
              {arenaSettings.showMockToRecruiter && (
                <Link
                  href="/interview/new?type=mock&role=candidate"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-elevated border border-border hover:brightness-125 text-fg font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-indigo-400 animate-pulse" />
                  Mock Interview
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Stepper & Bento Card — EMPTY STATE ONLY */}
        {interviews.length === 0 && (
          <>
            {/* Dynamic Stepper: The Multiplayer Live Pipeline */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted/80 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent" />
                  The Live Multiplayer Interview Pipeline
                </h2>
                <p className="text-xs text-muted/60">How professional workspaces handle technical evaluations end-to-end.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-border bg-surface/50 p-5 space-y-3 relative hover:border-accent/40 transition duration-200">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center text-accent font-bold font-mono text-sm border border-accent/20">
                    1
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-fg">Configure Queue</h3>
                  <p className="text-[11px] text-muted/80 leading-relaxed">
                    Add challenge tracks or playground templates from your shared team library directly into the active session queue.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-surface/50 p-5 space-y-3 relative hover:border-accent/40 transition duration-200">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 font-bold font-mono text-sm border border-indigo-500/20">
                    2
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-fg">Secure Invite</h3>
                  <p className="text-[11px] text-muted/80 leading-relaxed">
                    Generate a secure, expiring token link. Candidates enter in one-click, bypassing logins or development environment setup.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-surface/50 p-5 space-y-3 relative hover:border-accent/40 transition duration-200">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400 font-bold font-mono text-sm border border-sky-500/20">
                    3
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-fg">Co-Pilot & Screen</h3>
                  <p className="text-[11px] text-muted/80 leading-relaxed">
                    Evaluate typing live with zero latency. Run code dynamically on Sandpack and watch logs/terminal outputs stream in real-time.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-surface/50 p-5 space-y-3 relative hover:border-accent/40 transition duration-200">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm border border-emerald-500/20">
                    4
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-fg">Review & Score</h3>
                  <p className="text-[11px] text-muted/80 leading-relaxed">
                    Collaborate with multiple evaluators, leave hidden private notes, track anti-cheat logs, and record a definitive verdict.
                  </p>
                </div>
              </div>
            </div>

            {/* Premium Professional Workspace Showcase Card */}
            <div className="rounded-3xl border border-border bg-gradient-to-br from-panel to-bg p-6 md:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/3 blur-[100px] pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-fg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Professional Workspace Integration
                  </h2>
                  <p className="text-xs text-muted">A central operating hub tailored specifically for high-growth engineering teams.</p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure Proctoring Active
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Code className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-fg">Shared Challenge Libraries</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Consolidate your technical assessment questions. Keep boilerplate templates, data structures, and assertions standardized across your hiring team.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                    <Eye className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-fg">Anti-Cheat Tab Proctoring</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Monitor focus switches and clipboard operations. Interviewpad flags copy-paste actions and logs them in real-time on your evaluator dashboard.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-fg">Multi-Evaluator Panels</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Two heads are better than one. Invite secondary evaluators to observe the sandbox, chat, leave internal notes, and score collaborative sessions.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-fg">Internal Scoring & Verdicts</h4>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Grade automatically against test criteria. Supplement execution stats with private feedback channels, performance scoring, and definitive verdict labels.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 1. HUD Statistics Grid Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Pass Rate */}
          <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between gap-4 transition hover:bg-elevated">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Met Bar Rate</span>
              <h2 className="text-2xl font-black text-emerald-400 font-mono leading-none">{passRate}%</h2>
              <p className="text-[10px] text-muted">from {completedSlots} completed rounds</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total slots */}
          <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between gap-4 transition hover:bg-elevated">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Total Slots</span>
              <h2 className="text-2xl font-black text-fg font-mono leading-none">{totalSlots}</h2>
              <p className="text-[10px] text-muted">active candidate playrooms</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Active Live Rooms */}
          <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between gap-4 transition hover:bg-elevated">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Live / In Progress</span>
              <h2 className="text-2xl font-black text-sky-400 font-mono leading-none">{inProgressSlots}</h2>
              <p className="text-[10px] text-muted">currently active sandboxes</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          {/* Card 4: Upcoming Scheduled */}
          <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between gap-4 transition hover:bg-elevated">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted/80">Awaiting Action</span>
              <h2 className="text-2xl font-black text-amber-400 font-mono leading-none">{scheduledSlots}</h2>
              <p className="text-[10px] text-muted">scheduled queues remaining</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Empty State */}
        {interviews.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-16 text-center space-y-6 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-accent/15 grid place-items-center mx-auto">
              <Briefcase className="w-7 h-7 text-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-fg">No interview rounds scheduled yet</h3>
              <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                Set up a structured interview session with technical challenges. Invite other evaluators for cooperative multiplayer review panels, or complete mock sessions to test your own code skills.
              </p>
            </div>
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-accent hover:bg-accent-soft text-bg font-black text-xs uppercase tracking-wider transition shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Create Your First Session
            </Link>
          </div>
        ) : (
          
          /* 2. Main Two-Column Layout Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Interview Lists (8/12 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Verdict Analytics Summary Panel */}
              <div className="rounded-2xl border border-border bg-gradient-to-br from-panel/90 to-surface/40 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                    Verdict Analytics Summary
                  </h3>
                  <span className="text-[10px] font-mono text-muted/60">Historical Performance</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* MET BAR (Passed) */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-bg/40 border border-border/50">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-emerald-400 font-bold">Passed (Met Bar)</span>
                      <span className="text-fg font-black">{metBarCount}</span>
                    </div>
                    <div className="h-2 w-full bg-bg/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${totalSlots > 0 ? (metBarCount / totalSlots) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-muted">{totalSlots > 0 ? Math.round((metBarCount / totalSlots) * 100) : 0}% of sessions</p>
                  </div>

                  {/* FAILED */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-bg/40 border border-border/50">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-rose-400 font-bold">Failed</span>
                      <span className="text-fg font-black">{failedCount}</span>
                    </div>
                    <div className="h-2 w-full bg-bg/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-full"
                        style={{ width: `${totalSlots > 0 ? (failedCount / totalSlots) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-muted">{totalSlots > 0 ? Math.round((failedCount / totalSlots) * 100) : 0}% of sessions</p>
                  </div>

                  {/* SUSPICIOUS */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-bg/40 border border-border/50">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-amber-400 font-bold">Suspicious</span>
                      <span className="text-fg font-black">{suspiciousCount}</span>
                    </div>
                    <div className="h-2 w-full bg-bg/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${totalSlots > 0 ? (suspiciousCount / totalSlots) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-muted">{totalSlots > 0 ? Math.round((suspiciousCount / totalSlots) * 100) : 0}% of sessions</p>
                  </div>

                  {/* WALKOUTS */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-bg/40 border border-border/50">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-muted/80 font-bold">Walkout</span>
                      <span className="text-fg font-black">{walkoutCount}</span>
                    </div>
                    <div className="h-2 w-full bg-bg/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-border rounded-full"
                        style={{ width: `${totalSlots > 0 ? (walkoutCount / totalSlots) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-muted">{totalSlots > 0 ? Math.round((walkoutCount / totalSlots) * 100) : 0}% of sessions</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-muted">Active Sessions Queue</span>
                  <span className="text-[10px] font-bold text-muted/60">{interviews.length} slots loaded</span>
                </div>

                {interviews.map((slot) => {
                  const isPlaygroundSlot = (slot.sourceType ?? "challenge") === "playground";
                  const parsedIds: string[] = parseStringIds(
                    isPlaygroundSlot ? slot.playgroundIds : slot.challengeIds
                  );
                  const titleFor = isPlaygroundSlot
                    ? (id: string) => playgroundMap.get(id) || "Untitled playground"
                    : (id: string) => challengeMap.get(id) || "Loading challenge...";

                  const dateLabel = formatRelativeTime(slot.createdAt);

                  const isScheduled = slot.status === "scheduled";
                  const isInProgress = slot.status === "in_progress";
                  const isCompleted = slot.status === "completed";

                  const statusBg = isScheduled
                    ? "bg-amber-500/15 text-amber-400"
                    : isInProgress
                      ? "bg-sky-500/15 text-sky-400"
                      : "bg-emerald-500/15 text-emerald-400";

                  const statusText = isScheduled
                    ? "Scheduled"
                    : isInProgress
                      ? "In Progress"
                      : "Completed";

                  const isLive = slot.type === "live";
                  const typeBg = isLive
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-indigo-500/15 text-indigo-400";
                  const typeText = isLive ? "Live Screen" : "Mock Practice";

                  const sourceBg = isPlaygroundSlot
                    ? "bg-violet-500/15 text-violet-400"
                    : "bg-cyan-500/15 text-cyan-400";
                  const sourceText = isPlaygroundSlot ? "Playground" : "Challenge";

                  const href = `/interview/${slot.id}`;
                  const inviteUrl = `${process.env.NEXTAUTH_URL || ""}/interview/${slot.id}?token=${slot.shareToken}`;

                  return (
                    <div
                      key={slot.id}
                      className="group rounded-2xl border border-border bg-surface hover:bg-elevated p-6 flex flex-col gap-4 transition-all duration-200"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="space-y-2.5 min-w-0 flex-1">

                          {/* Meta pills row (status / source / type / verdict) */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBg}`}>
                              {statusText}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${sourceBg}`}>
                              {sourceText}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeBg}`}>
                              {typeText}
                            </span>
                            {slot.verdict && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                slot.verdict === "success"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : slot.verdict === "failed"
                                    ? "bg-rose-500/15 text-rose-400"
                                    : slot.verdict === "left_in_between"
                                      ? "bg-zinc-500/15 text-zinc-400"
                                      : "bg-amber-500/15 text-amber-400"
                              }`}>
                                {slot.verdict === "success" && "Passed"}
                                {slot.verdict === "failed" && "Failed"}
                                {slot.verdict === "left_in_between" && "Walkout"}
                                {slot.verdict === "suspicious" && "Suspicious"}
                              </span>
                            )}
                          </div>

                          {/* Title, candidate, date — primary text block */}
                          <div className="space-y-1">
                            <h3 className="text-base font-black text-fg truncate group-hover:text-accent transition-colors">
                              {slot.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                              {slot.candidateName && (
                                <span className="flex items-center gap-1.5">
                                  <span className="text-muted/60 font-mono uppercase tracking-wider text-[9px]">Candidate</span>
                                  <span className="text-fg font-semibold">{slot.candidateName}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-muted/80">
                                <Calendar className="w-3 h-3 text-muted/60" />
                                {dateLabel}
                              </span>
                            </div>
                          </div>

                          {/* Queue chips (challenges OR playgrounds, capped at 3 visible) */}
                          {parsedIds.length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted/80 pt-1">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-muted/50 font-mono">
                                Queue ({parsedIds.length}):
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                {parsedIds.slice(0, 3).map((id, idx) => {
                                  const title = titleFor(id);
                                  return (
                                    <span
                                      key={id}
                                      className="px-2 py-0.5 rounded bg-bg/60 text-[10px] text-fg/80 max-w-[150px] truncate"
                                      title={title}
                                    >
                                      {idx + 1}. {title}
                                    </span>
                                  );
                                })}
                                {parsedIds.length > 3 && (
                                  <span
                                    className="px-2 py-0.5 rounded bg-bg/40 text-[10px] text-muted/80"
                                    title={parsedIds
                                      .slice(3)
                                      .map((id, i) => `${i + 4}. ${titleFor(id)}`)
                                      .join("\n")}
                                  >
                                    +{parsedIds.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons — unified h-10, no wrap */}
                        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                          <CopyLinkButton inviteUrl={inviteUrl} />

                          <Link
                            href={href}
                            className={`h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 shrink-0 flex-1 md:flex-initial justify-center hover:scale-[1.02] active:scale-[0.98] hover:translate-y-[-1px] ${
                              isScheduled
                                ? "bg-gradient-to-r from-accent to-accent-soft hover:brightness-110 text-bg"
                                : isInProgress
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white"
                                  : "bg-bg border border-border text-muted hover:text-fg hover:bg-surface"
                            }`}
                          >
                            {isScheduled ? (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Start
                              </>
                            ) : isInProgress ? (
                              <>
                                <Radio className="w-3.5 h-3.5 animate-pulse" />
                                Resume
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Revisit
                              </>
                            )}
                          </Link>

                          <DeleteSessionButton sessionId={slot.id} />
                        </div>
                      </div>

                      {/* Evaluator comments log block */}
                      {slot.notes && (
                        <div className="p-4 rounded-xl bg-bg/60 text-[11px] leading-relaxed text-muted/95 max-w-4xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-0.5 h-full bg-accent/60" />
                          <span className="font-black uppercase tracking-widest text-accent text-[9px] block mb-1 pl-2">
                            Evaluator Notes Log
                          </span>
                          <p className="whitespace-pre-wrap font-mono text-[10px] text-muted pl-2">{slot.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Right Column: Widgets / Analytics (4/12 cols) */}
            <aside className="lg:col-span-4 space-y-6">
              
              {/* Widget 1: Action Items Rail */}
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-accent animate-pulse" />
                    Action Items
                  </h3>
                  {(replaysAwaitingReview.length + expiringTakeHomes.length + sessionsWithoutScorecard.length) > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {replaysAwaitingReview.length + expiringTakeHomes.length + sessionsWithoutScorecard.length} Alert{(replaysAwaitingReview.length + expiringTakeHomes.length + sessionsWithoutScorecard.length) !== 1 && 's'}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Replays Awaiting Review */}
                  {replaysAwaitingReview.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        Replays Awaiting Review ({replaysAwaitingReview.length})
                      </h4>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {replaysAwaitingReview.map(r => (
                          <Link
                            key={r.id}
                            href={`/interview/${r.id}`}
                            className="block p-2 rounded-lg bg-bg/50 hover:bg-bg border border-border/40 hover:border-indigo-500/30 transition text-[11px] space-y-0.5 group"
                          >
                            <div className="font-bold text-fg group-hover:text-indigo-400 transition truncate">{r.title}</div>
                            <div className="text-muted/70 text-[10px] flex items-center justify-between">
                              <span>Candidate: {r.candidateName || "Guest"}</span>
                              <span>{formatRelativeTime(r.createdAt)}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expiring Take-Homes */}
                  {expiringTakeHomes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        Expiring Take-Homes ({expiringTakeHomes.length})
                      </h4>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {expiringTakeHomes.map(t => {
                          const hrsLeft = Math.max(0, Math.ceil((new Date(t.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000)));
                          return (
                            <div
                              key={t.id}
                              className="p-2 rounded-lg bg-bg/50 border border-border/40 text-[11px] space-y-0.5"
                            >
                              <div className="font-bold text-fg truncate">{t.candidateName}</div>
                              <div className="text-[10px] text-muted/70 flex items-center justify-between">
                                <span className="truncate max-w-[130px]">{t.challenge.title}</span>
                                <span className="text-amber-400 font-semibold">{hrsLeft}h left</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sessions Without Scorecards */}
                  {sessionsWithoutScorecard.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                        Scorecard Needed ({sessionsWithoutScorecard.length})
                      </h4>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {sessionsWithoutScorecard.map(s => (
                          <Link
                            key={s.id}
                            href={`/interview/${s.id}`}
                            className="block p-2 rounded-lg bg-bg/50 hover:bg-bg border border-border/40 hover:border-rose-500/30 transition text-[11px] space-y-0.5 group"
                          >
                            <div className="font-bold text-fg group-hover:text-rose-400 transition truncate">{s.title}</div>
                            <div className="text-[10px] text-muted/70 flex items-center justify-between">
                              <span>Candidate: {s.candidateName || "Guest"}</span>
                              <span>Needs Scorecard</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clean State */}
                  {replaysAwaitingReview.length === 0 && expiringTakeHomes.length === 0 && sessionsWithoutScorecard.length === 0 && (
                    <div className="p-4 rounded-xl bg-bg/30 border border-dashed border-border/80 text-center space-y-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                      <p className="text-[11px] text-fg font-semibold">All action items resolved!</p>
                      <p className="text-[9px] text-muted">No pending scorecards, replays, or expiring take-homes.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Widget 2: Workspace Health */}
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    Workspace Health
                  </h3>
                  <span className="text-[9px] font-mono text-muted/60 uppercase">Live telemetry</span>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* Workspace & Plan */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-bg/50 border border-border/30">
                    <span className="text-muted text-[11px] font-medium">Workspace Plan</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                      workspace?.planName === "GROWTH"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : workspace?.planName === "STARTER"
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          : workspace?.planName === "ENTERPRISE"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }`}>
                      {workspace?.planName || "FREE"}
                    </span>
                  </div>

                  {/* Seat Utilization */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-muted font-sans text-[11px] font-medium">Seat Utilization</span>
                      <span className="text-fg font-black">
                        {workspace?.members.length ?? 1} / {workspace?.planName === "FREE" ? b2bSettings.freeSeatLimit : "Unlimited"}
                      </span>
                    </div>
                    {workspace?.planName === "FREE" && (
                      <div className="h-1.5 w-full bg-bg/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (((workspace?.members.length ?? 1) / b2bSettings.freeSeatLimit) * 100))}%`
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* ATS Integration */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-bg/50 border border-border/30">
                    <span className="text-muted text-[11px] font-medium">ATS Integration</span>
                    {workspace?.atsIntegration ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {workspace.atsIntegration.provider}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted/60 font-semibold">Not Connected</span>
                    )}
                  </div>

                  {/* Pending Take-Homes */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-bg/50 border border-border/30">
                    <span className="text-muted text-[11px] font-medium">Pending Take-Homes</span>
                    <span className="text-fg font-black font-mono">
                      {workspace?.takeHomes.length ?? 0}
                    </span>
                  </div>
                </div>
              </div>

            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return "created just now";
  }
  if (diffMin < 60) {
    return `created ${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;
  }
  if (diffHr < 24) {
    return `created ${diffHr} ${diffHr === 1 ? "hour" : "hours"} ago`;
  }
  if (diffDays < 7) {
    return `created ${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  }

  // Fallback to absolute date format: "18 May 2026"
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
