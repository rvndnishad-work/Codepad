import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { headers } from "next/headers";
import {
  Clock, CheckCircle2, AlertTriangle, Play, Lock, Layers, Beaker, Brain, Calendar,
} from "lucide-react";
import MobileLobby from "@/components/MobileLobby";
import { shouldRenderMobileLobby } from "@/lib/device";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function TakeHomeSessionRunner({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};

  // Mobile handoff first (IP-38) — take-homes need a desktop IDE.
  const hdrs = await headers();
  if (shouldRenderMobileLobby({ userAgent: hdrs.get("user-agent"), searchParams: sp, cookieHeader: hdrs.get("cookie") })) {
    const host = hdrs.get("host") ?? "interviewpad.in";
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    return (
      <MobileLobby
        url={`${proto}://${host}/take-home/s/${token}`}
        title="Open your take-home on desktop"
        subtitle="Take-homes use a full IDE — scan to continue on your laptop."
        tokenLabel="take-home"
        emailEnabled={!!process.env.RESEND_API_KEY}
      />
    );
  }

  const session = await prisma.interviewSession.findUnique({
    where: { candidateAccessToken: token },
    select: {
      id: true, title: true, candidateName: true, status: true, deadlineAt: true,
      challengeIds: true, playgroundIds: true, promptScenarioIds: true, questionTimeLimitsJson: true,
      workspace: { select: { name: true } },
    },
  });
  if (!session) notFound();

  const now = new Date();
  const challengeIds = parseIds(session.challengeIds);
  const playgroundIds = parseIds(session.playgroundIds);
  const promptScenarioIds = parseIds(session.promptScenarioIds);
  const limits: Record<string, number> = (() => {
    try { return JSON.parse(session.questionTimeLimitsJson ?? "{}"); } catch { return {}; }
  })();

  // Attempts already made in this session.
  const [challengeRows, attempts, promptAttempts] = await Promise.all([
    challengeIds.length
      ? prisma.challenge.findMany({ where: { id: { in: challengeIds } }, select: { id: true, slug: true, title: true, difficulty: true } })
      : Promise.resolve([]),
    prisma.challengeAttempt.findMany({ where: { sessionId: session.id }, select: { challengeId: true, status: true, score: true } }),
    prisma.promptAttempt.findMany({ where: { sessionId: session.id }, select: { scenarioId: true } }),
  ]);
  const challengeById = new Map(challengeRows.map((c) => [c.id, c]));
  const doneChallengeIds = new Set(attempts.filter((a) => a.status === "passed" || a.status === "failed").map((a) => a.challengeId));
  const donePromptIds = new Set(promptAttempts.map((a) => a.scenarioId));

  const started = attempts.length > 0 || promptAttempts.length > 0;
  const pastDeadline = !!session.deadlineAt && now > session.deadlineAt && !started;

  // Completion = every DSA challenge has a finished attempt. (Prompt/playground
  // candidate execution lands in a follow-up — see IP-88 notes.) Idempotent.
  const allChallengesDone = challengeIds.length > 0 && challengeIds.every((id) => doneChallengeIds.has(id));
  if (allChallengesDone && session.status !== "completed") {
    await prisma.interviewSession.update({
      where: { id: session.id },
      data: { status: "completed", finishedAt: new Date() },
    }).catch(() => null);
    session.status = "completed";
  }

  const wsName = session.workspace?.name ?? "the team";
  const totalQuestions = challengeIds.length + playgroundIds.length + promptScenarioIds.length;

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-bg text-fg flex flex-col items-center px-4 py-10 font-sans relative overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-120px] left-[-80px] w-[34rem] h-[34rem] rounded-full blur-[140px] bg-accent/[0.06] dark:bg-accent/10" />
        <div className="absolute bottom-[-120px] right-[-80px] w-[34rem] h-[34rem] rounded-full blur-[150px] bg-indigo-500/[0.05] dark:bg-indigo-500/10" />
      </div>
      <div className="w-full max-w-3xl bg-surface/70 border border-border backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-sm relative z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-black text-xl">C</div>
            <span className="font-extrabold text-sm tracking-widest uppercase text-fg">Interviewpad</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );

  if (pastDeadline) {
    return shell(
      <div className="text-center space-y-4 py-6">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 rounded-full flex items-center justify-center mx-auto text-rose-500"><AlertTriangle className="w-8 h-8" /></div>
        <h2 className="text-2xl font-black tracking-tight">Take-home expired</h2>
        <p className="text-sm text-muted max-w-md mx-auto">The deadline to start this take-home has passed. Please contact {wsName} for a new invitation.</p>
      </div>
    );
  }

  if (session.status === "completed") {
    return shell(
      <div className="text-center space-y-4 py-6">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-500"><CheckCircle2 className="w-8 h-8" /></div>
        <h2 className="text-2xl font-black tracking-tight">All done — thank you!</h2>
        <p className="text-sm text-muted max-w-md mx-auto">Your take-home has been submitted to {wsName}. There&apos;s nothing more to do; they&apos;ll review your work and follow up.</p>
      </div>
    );
  }

  // Build the ordered checklist (DSA → playgrounds → prompts, preserving curation order within each).
  type Row = { key: string; kind: "challenge" | "playground" | "prompt"; title: string; minutes: number; done: boolean; href: string | null; runnable: boolean };
  const rows: Row[] = [];
  for (const id of challengeIds) {
    const c = challengeById.get(id);
    if (!c) continue;
    rows.push({
      key: `c:${id}`, kind: "challenge", title: c.title, minutes: limits[id] ?? 30,
      done: doneChallengeIds.has(id), runnable: true,
      href: `/challenges/${c.slug}/attempt?session=${session.id}&token=${token}`,
    });
  }
  for (const id of playgroundIds) {
    rows.push({ key: `pg:${id}`, kind: "playground", title: "Open playground task", minutes: limits[id] ?? 30, done: false, runnable: false, href: null });
  }
  for (const id of promptScenarioIds) {
    rows.push({ key: `pr:${id}`, kind: "prompt", title: "Prompt challenge", minutes: limits[id] ?? 30, done: donePromptIds.has(id), runnable: false, href: null });
  }

  const KindIcon = { challenge: Layers, playground: Beaker, prompt: Brain };

  return shell(
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-black tracking-tight">{session.title}</h2>
        <p className="text-xs md:text-sm text-muted max-w-md mx-auto">
          Welcome{session.candidateName ? `, ${session.candidateName}` : ""}. This take-home from{" "}
          <span className="text-fg font-bold">{wsName}</span> has {totalQuestions} question{totalQuestions === 1 ? "" : "s"}, each separately timed. Complete them in any order.
        </p>
      </div>

      {session.deadlineAt && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-400">
          <Calendar className="w-3.5 h-3.5" /> Start by {session.deadlineAt.toLocaleString()}
        </div>
      )}

      <ul className="space-y-2.5">
        {rows.map((r, i) => {
          const Icon = KindIcon[r.kind];
          return (
            <li key={r.key} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-bg/40">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.done ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400" : "bg-accent/10 border border-accent/20 text-accent"}`}>
                {r.done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{i + 1}. {r.title}</div>
                <div className="text-[10px] text-muted uppercase tracking-wider flex items-center gap-1.5">
                  {r.kind} · <Clock className="w-3 h-3" /> {r.minutes}m
                </div>
              </div>
              {r.done ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">Done</span>
              ) : r.runnable && r.href ? (
                <Link href={r.href} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-bg text-[11px] font-bold uppercase tracking-wider hover:opacity-90 shrink-0">
                  <Play className="w-3 h-3" /> Start
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted/60 shrink-0" title="Available soon">
                  <Lock className="w-3 h-3" /> Soon
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-muted/60 text-center leading-relaxed">
        Each question&apos;s timer starts when you open it and auto-submits when it runs out.
        Your progress is saved as you go.
      </p>
    </div>
  );
}
