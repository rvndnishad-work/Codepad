import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  Radio,
  Trophy,
  ShieldCheck,
  Sparkles,
  Layers,
  Monitor,
  Terminal,
  Users,
  Play,
  Code,
  Zap,
  Activity,
  Calendar,
  History,
} from "lucide-react";
import JoinInterviewBox from "./JoinInterviewBox";
import DeleteSessionButton from "./DeleteSessionButton";
import { getInterviewArenaSettings } from "@/lib/settings";

type Props = {
  userId: string;
  userName: string | null;
};

export default async function CandidateInterviewView({ userId, userName }: Props) {
  const arenaSettings = await getInterviewArenaSettings();

  // Practice sessions the candidate created themselves
  const myPracticeSessions = await prisma.interviewSession.findMany({
    where: { userId, type: "mock" },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      rubric: true,
    }
  });

  const stats = {
    practiceCount: myPracticeSessions.length,
    completed: myPracticeSessions.filter((s) => s.status === "completed").length,
    inFlight: myPracticeSessions.filter((s) => s.status === "in_progress").length,
    scheduled: myPracticeSessions.filter((s) => s.status === "scheduled").length,
  };

  const firstName = userName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-10 font-sans">
      {/* Hero — candidate-focused */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-panel/90 to-surface/40 p-8 md:p-12 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent-soft)_0%,transparent_40%)] opacity-[0.06] pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-start justify-between">
          <div className="flex-1 min-w-0 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest font-mono">Candidate Practice & Prep</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg leading-tight">
                Welcome to your personal prep console, <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-indigo-400 to-accent bg-clip-text text-transparent">{firstName}</span>.
              </h1>
              <p className="text-sm md:text-base text-muted max-w-xl leading-relaxed">
                Accelerate your technical preparation. Join scheduled mock rounds from teammates, practice challenging code tasks in complete privacy, or run a self-paced multiplayer session with friends.
              </p>
            </div>
          </div>

          {/* Join box — primary CTA for candidates */}
          <div className="w-full lg:w-[380px] shrink-0">
            <JoinInterviewBox />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Total Practices" value={stats.practiceCount} icon={Trophy} accent="purple" />
        <StatTile label="Completed" value={stats.completed} icon={CheckCircle2} accent="emerald" />
        <StatTile label="In Progress" value={stats.inFlight} icon={Activity} accent="indigo" />
        <StatTile label="Scheduled" value={stats.scheduled} icon={Calendar} accent="amber" />
      </div>

      {/* "Your Personal Practice Workspace" Showcase Card */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-panel to-bg p-6 md:p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/3 blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6 relative z-10">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Your Personal Practice Workspace
            </h2>
            <p className="text-xs text-muted">A dedicated sandbox loaded with enterprise features, 100% free for practice.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 animate-pulse text-indigo-400" /> Sandbox Ready
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Monitor className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-fg">Multiplayer Monaco Canvas</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Familiarize yourself with the editor. Autocomplete, multi-cursor, and syntax highlighting behave exactly like VS Code.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-fg">Local Jest Assertions</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Verify your code immediately. Run test assertions inside a secure Sandpack JSDOM sandbox and review detailed logs.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-fg">Peer Review Mock Rooms</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Create mock interview sessions and invite friends or mentors to join. Type, debug, and run code together in real-time.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Trophy className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-fg">Automated Grading & Scores</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Submit your code to check performance. Review grades, scores, execution durations, and historical test reports.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column: Practice History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm h-full flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-panel/30 shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-accent" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg">
                  Your Practice History
                </h3>
              </div>
              <span className="text-[10px] text-muted font-bold font-mono px-2 py-0.5 rounded bg-bg/50 border border-border">
                {myPracticeSessions.length} total
              </span>
            </div>

            {myPracticeSessions.length === 0 ? (
              <div className="px-5 py-16 text-center flex-1 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-panel border border-border flex items-center justify-center text-muted mb-4 shadow-sm">
                  <Code className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 max-w-[280px] mb-6">
                  <p className="text-sm text-fg font-bold">No practice sessions yet</p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Start a mock interview or solve a challenge from the bank to begin tracking your progress here.
                  </p>
                </div>
                <Link
                  href="/challenges"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-bg text-[11px] font-black uppercase tracking-wider hover:bg-accent-soft active:scale-95 transition-all shadow-md shadow-accent/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Practicing
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-y-auto max-h-[500px]">
                {myPracticeSessions.map((session) => {
                  const isScheduled = session.status === "scheduled";
                  const isInProgress = session.status === "in_progress";
                  const isCompleted = session.status === "completed";

                  const statusColor = isScheduled
                    ? "text-amber-500 border-amber-500/25 bg-amber-500/10"
                    : isInProgress
                      ? "text-sky-500 border-sky-500/25 bg-sky-500/10"
                      : "text-emerald-500 border-emerald-500/25 bg-emerald-500/10";
                  
                  const statusText = isScheduled
                    ? "Scheduled"
                    : isInProgress
                      ? "In Progress"
                      : "Completed";

                  const href = `/interview/${session.id}`;

                  return (
                    <li key={session.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-panel/30 transition-colors group">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Link href={href} className="font-bold text-sm text-fg group-hover:text-accent transition-colors block truncate">
                          {session.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted/60" />
                            {new Date(session.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </span>
                          
                          {session.verdict && (
                            <>
                              <span className="text-muted/30 font-mono">•</span>
                              <span className={`font-bold ${
                                session.verdict === "success" ? "text-emerald-400"
                                : session.verdict === "failed" ? "text-rose-400"
                                : "text-amber-400"
                              }`}>
                                {session.verdict === "success" ? "Passed" : session.verdict === "failed" ? "Failed" : "Review Needed"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${statusColor}`}>
                          {statusText}
                        </span>

                        <Link
                          href={href}
                          className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            isCompleted
                              ? "bg-surface border border-border text-fg hover:border-accent/50 hover:text-accent"
                              : "bg-accent/10 border border-accent/20 text-accent hover:bg-accent hover:text-bg"
                          }`}
                        >
                          {isCompleted ? "Revisit" : isInProgress ? "Resume" : "Start"}
                          <ArrowRight className="w-3 h-3" />
                        </Link>

                        {/* Owner-only delete. API enforces the same check
                            (src/app/api/interview/[id]/route.ts DELETE) so
                            even crafted requests can't touch someone else's
                            session. */}
                        <DeleteSessionButton sessionId={session.id} size="sm" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Practice Shortcuts & Tips */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border bg-panel/30">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg">
                  Self-Paced Practice
                </h3>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Practice makes perfect. Spin up an editor session or browse challenges.
              </p>
            </div>
            <div className="p-5 space-y-2.5">
              {arenaSettings.showMockToDeveloper && (
                <Link
                  href="/interview/new?type=mock&role=candidate"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-accent to-indigo-500 hover:brightness-110 active:scale-95 text-white text-[11px] font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Mock Interview
                </Link>
              )}
              <Link
                href="/challenges"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-panel/50 border border-border text-muted hover:text-fg hover:border-accent/40 active:scale-95 text-[11px] font-bold uppercase tracking-wider transition-all"
              >
                <Code className="w-3.5 h-3.5" />
                Browse Challenge Bank
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] p-5 space-y-3 shadow-inner">
            <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Sandbox Guidelines</h3>
            </div>
            <ul className="space-y-3 text-[11px] text-muted leading-relaxed font-sans">
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[8px] mt-0.5 border border-indigo-500/20 shrink-0">1</span>
                <div className="space-y-0.5">
                  <p className="text-fg font-semibold">Quiet room and stable link</p>
                  <p className="text-[10px] text-muted/70">Most live screening sessions run between 45 to 90 minutes.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[8px] mt-0.5 border border-indigo-500/20 shrink-0">2</span>
                <div className="space-y-0.5">
                  <p className="text-fg font-semibold">Desktop browser recommended</p>
                  <p className="text-[10px] text-muted/70">You will need ample screen space for code, tests, and preview panes.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[8px] mt-0.5 border border-indigo-500/20 shrink-0">3</span>
                <div className="space-y-0.5">
                  <p className="text-fg font-semibold">Live multiplayer active</p>
                  <p className="text-[10px] text-muted/70">Recruiters observe you live. Keep talking and explaining your thoughts.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: any;
  accent: "indigo" | "amber" | "emerald" | "purple";
}) {
  const colors: Record<typeof accent, string> = {
    indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-500",
  };
  return (
    <div className="p-5 rounded-2xl border border-border bg-surface transition-all hover:bg-elevated hover:shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${colors[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-black text-fg tabular-nums leading-none">{value}</div>
    </div>
  );
}
