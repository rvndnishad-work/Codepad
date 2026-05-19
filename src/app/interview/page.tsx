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
} from "lucide-react";
import CopyLinkButton from "./CopyLinkButton";
import DeleteSessionButton from "./DeleteSessionButton";

export const metadata = {
  title: "Mock & Live Interview Sessions — Interviewpad",
};

export default async function InterviewDashboardPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/interview")}`);
  }

  const userId = session.user.id;

  // Retrieve all interview slots created by the logged-in candidate
  const interviews = await prisma.interviewSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all challenge titles so we can list challenge queues beautifully on the slots
  const allChallengeIds = Array.from(
    new Set(
      interviews.flatMap((i) => {
        try {
          const parsed = JSON.parse(i.challengeIds);
          return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
        } catch {
          return [];
        }
      })
    )
  );

  const challenges = await prisma.challenge.findMany({
    where: { id: { in: allChallengeIds } },
    select: { id: true, title: true },
  });
  const challengeMap = new Map(challenges.map((c) => [c.id, c.title]));

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

  return (
    <div className="min-h-screen bg-bg text-fg font-sans py-12 px-6 lg:px-8 relative overflow-hidden">
      
      {/* Single soft glow behind hero */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-7xl space-y-10 relative z-10">

        {/* Elite Hero Command Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 md:p-10">
          {/* Radial Light Halo behind Hero */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.04] via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent">
                <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">
                  Live · Multiplayer
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg leading-tight">
                  Skip the{" "}
                  <span className="bg-gradient-to-r from-accent to-accent-soft bg-clip-text text-transparent">
                    screen-share.
                  </span>
                </h1>
                <p className="text-sm text-muted leading-relaxed max-w-xl">
                  Share one link and you're both inside the same live editor — typing, running tests, and switching files in real time. Spin up a coding round in under a minute, no setup on the candidate's end.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 md:justify-end">
              <Link
                href="/interview/new?type=live&role=interviewer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent to-accent-soft hover:brightness-110 text-bg font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:translate-y-[-1px] group cursor-pointer"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                Schedule interview
              </Link>
              <Link
                href="/interview/new?type=mock&role=candidate"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-elevated hover:brightness-125 text-fg font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:translate-y-[-1px] cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Mock interview
              </Link>
            </div>
          </div>
        </div>

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
            <div className="lg:col-span-8 space-y-4">
              
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-muted">Active Sessions Queue</span>
                <span className="text-[10px] font-bold text-muted/60">{interviews.length} slots loaded</span>
              </div>

              {interviews.map((slot) => {
                const parsedIds: string[] = (() => {
                  try {
                    const parsed = JSON.parse(slot.challengeIds);
                    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
                  } catch {
                    return [];
                  }
                })();

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

                const href = `/interview/${slot.id}`;
                const inviteUrl = `${process.env.NEXTAUTH_URL || ""}/interview/${slot.id}?token=${slot.shareToken}`;

                return (
                  <div
                    key={slot.id}
                    className="group rounded-2xl border border-border bg-surface hover:bg-elevated p-6 flex flex-col gap-4 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                      <div className="space-y-2.5 min-w-0 flex-1">

                        {/* Meta pills row (status / type / verdict only) */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBg}`}>
                            {statusText}
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
                              {slot.verdict === "success" && "Met bar"}
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

                        {/* Challenge queue (capped at 3 visible) */}
                        {parsedIds.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted/80 pt-1">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-muted/50 font-mono">
                              Queue ({parsedIds.length}):
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              {parsedIds.slice(0, 3).map((cid, idx) => {
                                const title = challengeMap.get(cid) || "Loading challenge...";
                                return (
                                  <span
                                    key={cid}
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
                                    .map((cid, i) => `${i + 4}. ${challengeMap.get(cid) || "Untitled"}`)
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

            {/* Right Column: Widgets / Analytics (4/12 cols) */}
            <aside className="lg:col-span-4 space-y-6">
              
              {/* Widget 1: Analytics distribution */}
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    Verdict Analytics
                  </h3>
                  <span className="text-[10px] font-mono text-muted/50">historical</span>
                </div>
                
                <div className="space-y-3.5 text-xs">
                  
                  {/* MET BAR */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-emerald-400">Met Bar (Passed)</span>
                      <span className="text-fg font-black">{metBarCount}</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${totalSlots > 0 ? (metBarCount / totalSlots) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* FAILED */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-rose-400">Failed</span>
                      <span className="text-fg font-black">{failedCount}</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-full"
                        style={{ width: `${totalSlots > 0 ? (failedCount / totalSlots) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* SUSPICIOUS */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-amber-400">Suspicious (Cheat Flag)</span>
                      <span className="text-fg font-black">{suspiciousCount}</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${totalSlots > 0 ? (suspiciousCount / totalSlots) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* WALKOUTS */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-muted/70">Walkout / Abandoned</span>
                      <span className="text-fg font-black">{walkoutCount}</span>
                    </div>
                    <div className="h-1.5 w-full bg-bg/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-border rounded-full"
                        style={{ width: `${totalSlots > 0 ? (walkoutCount / totalSlots) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Widget 2: Interviewer Checklist */}
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-accent" />
                    Interviewer Systems Check
                  </h3>
                </div>

                <ul className="space-y-3 text-[11px] font-sans text-muted">
                  <li className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[8px] mt-0.5">✓</span>
                    <div className="space-y-0.5">
                      <p className="text-fg font-bold">Real-time collaborative editor</p>
                      <p className="text-[10px] text-muted/70">Both sides type, run, and switch files on the same canvas.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[8px] mt-0.5">✓</span>
                    <div className="space-y-0.5">
                      <p className="text-fg font-bold">Sandpack Jest sandbox</p>
                      <p className="text-[10px] text-muted/70">Local JSDOM runners primed for assertion testing.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[8px] mt-0.5">✓</span>
                    <div className="space-y-0.5">
                      <p className="text-fg font-bold">Monaco editor</p>
                      <p className="text-[10px] text-muted/70">Syntax highlighting, IntelliSense, and multi-cursor.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[8px] mt-0.5">✓</span>
                    <div className="space-y-0.5">
                      <p className="text-fg font-bold">Single shareable link</p>
                      <p className="text-[10px] text-muted/70">Candidate joins in one click — no install, no account.</p>
                    </div>
                  </li>
                </ul>
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
