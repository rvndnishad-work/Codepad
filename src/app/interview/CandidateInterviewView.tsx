import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  KeyRound,
  Clock,
  CheckCircle2,
  Radio,
  Trophy,
  BookOpen,
  ShieldCheck,
  Sparkles,
  Layers,
  Monitor,
  Terminal,
  Users,
  Play,
  Code,
  Zap,
} from "lucide-react";
import JoinInterviewBox from "./JoinInterviewBox";
import { getInterviewArenaSettings } from "@/lib/settings";

type Props = {
  userId: string;
  userName: string | null;
};

/**
 * Candidate-focused landing for /interview.
 *
 * For candidates, the primary verbs are:
 *   1. JOIN an interview a recruiter sent them
 *   2. PRACTICE on their own (mock interview / take-home)
 *   3. REVIEW their past sessions
 *
 * Hosting is intentionally de-emphasized — recruiters live in the
 * workspace shell at /w/[slug], not here.
 */
export default async function CandidateInterviewView({ userId, userName }: Props) {
  const arenaSettings = await getInterviewArenaSettings();

  // Pull take-homes assigned to this candidate (by email match — best-effort,
  // since TakeHomeAssignment stores email inline rather than a userId FK).
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const myTakeHomes = me?.email
    ? await prisma.takeHomeAssignment.findMany({
        where: { candidateEmail: me.email.toLowerCase() },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          challenge: { select: { title: true } },
          workspace: { select: { name: true } },
          attempt: { select: { score: true } },
        },
      })
    : [];

  // Practice sessions the candidate created themselves
  const myPracticeSessions = await prisma.interviewSession.findMany({
    where: { userId, type: "mock" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = {
    invitesReceived: myTakeHomes.length,
    completed: myTakeHomes.filter((th) => th.status === "SUBMITTED").length,
    inFlight: myTakeHomes.filter((th) => th.status === "ACTIVE" || th.status === "PENDING").length,
    practiceCount: myPracticeSessions.length,
  };

  const firstName = userName?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-10">
      {/* Hero — candidate-focused */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-panel/90 to-surface/40 p-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent-soft)_0%,transparent_40%)] opacity-[0.06] pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start justify-between">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest font-mono">Candidate Practice & Prep</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-fg leading-tight">
              Welcome to your personal prep console, <span className="bg-gradient-to-r from-indigo-400 to-accent bg-clip-text text-transparent">{firstName}</span>.
            </h1>
            <p className="text-sm text-muted max-w-xl leading-relaxed">
              Accelerate your technical preparation. Join scheduled mock rounds from teammates, practice challenging code tasks in complete privacy, or run a self-paced multiplayer session with friends.
            </p>
          </div>

          {/* Join box — primary CTA for candidates */}
          <div className="w-full lg:w-[350px] shrink-0">
            <JoinInterviewBox />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Take-home Invites" value={stats.invitesReceived} icon={KeyRound} accent="indigo" />
        <StatTile label="In Flight Rounds" value={stats.inFlight} icon={Radio} accent="amber" />
        <StatTile label="Completed Tasks" value={stats.completed} icon={CheckCircle2} accent="emerald" />
        <StatTile label="Practice Playrooms" value={stats.practiceCount} icon={Trophy} accent="purple" />
      </div>

      {/* "Your Personal Practice Workspace" Showcase Card */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-panel to-bg p-6 md:p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/3 blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Two-column: take-homes + practice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Take-homes assigned to me */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-panel/30">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg">
                Assigned Take-Home Tests
              </h3>
            </div>
            <span className="text-[10px] text-muted font-bold font-mono px-2 py-0.5 rounded bg-bg/50 border border-border">{myTakeHomes.length} total</span>
          </div>

          {myTakeHomes.length === 0 ? (
            <div className="px-5 py-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-panel border border-border flex items-center justify-center mx-auto text-muted">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-fg font-bold">No assignments yet</p>
                <p className="text-[11px] text-muted max-w-xs mx-auto leading-relaxed">
                  When a recruiter sends you a take-home screening assessment, it will show up here.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {myTakeHomes.map((th) => {
                const statusColor =
                  th.status === "SUBMITTED" ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]"
                  : th.status === "ACTIVE" ? "text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/[0.08]"
                  : th.status === "EXPIRED" ? "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]"
                  : "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]";
                const expired = th.expiresAt.getTime() < Date.now();
                const href = th.status === "SUBMITTED"
                  ? "#"
                  : expired
                  ? "#"
                  : `/take-home/${th.token}`;
                return (
                  <li key={th.id} className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-panel/30 transition-colors">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link href={href} className="font-bold text-sm text-fg hover:text-accent transition-colors truncate block">
                        {th.challenge.title}
                      </Link>
                      <div className="text-[11px] text-muted flex items-center gap-x-2 gap-y-1 flex-wrap">
                        <span>From <span className="text-fg font-semibold">{th.workspace?.name ?? "—"}</span></span>
                        <span className="text-muted/40 font-mono">•</span>
                        <span>{th.timeLimitMin} min limit</span>
                        {th.attempt?.score !== null && th.attempt?.score !== undefined && (
                          <>
                            <span className="text-muted/40 font-mono">•</span>
                            <span className="text-emerald-400 font-bold">
                              Score: {th.attempt.score}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${statusColor}`}>
                        {th.status}
                      </span>
                      {th.status !== "SUBMITTED" && !expired && (
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/15 border border-accent/20 text-[11px] font-bold text-accent hover:bg-accent hover:text-bg transition-colors"
                        >
                          Start <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Practice + tips column */}
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
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-accent to-indigo-500 hover:brightness-110 active:scale-95 text-white text-[11px] font-bold uppercase tracking-wider transition-all"
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
                <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[8px] mt-0.5 border border-indigo-500/20">1</span>
                <div className="space-y-0.5">
                  <p className="text-fg font-semibold">Quiet room and stable link</p>
                  <p className="text-[10px] text-muted/70">Most live screening sessions run between 45 to 90 minutes.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[8px] mt-0.5 border border-indigo-500/20">2</span>
                <div className="space-y-0.5">
                  <p className="text-fg font-semibold">Desktop browser recommended</p>
                  <p className="text-[10px] text-muted/70">You will need ample screen space for code, tests, and preview panes.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[8px] mt-0.5 border border-indigo-500/20">3</span>
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
  icon: typeof BookOpen;
  accent: "indigo" | "amber" | "emerald" | "purple";
}) {
  const colors: Record<typeof accent, string> = {
    indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-500",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-500",
  };
  return (
    <div className="p-4 rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${colors[accent]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-fg tabular-nums">{value}</div>
    </div>
  );
}
