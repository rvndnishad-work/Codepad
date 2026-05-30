import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { headers } from "next/headers";
import { Award, Clock, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, ChevronDown, Sparkles } from "lucide-react";
import StartButton from "./StartButton";
import MobileLobby from "@/components/MobileLobby";
import { shouldRenderMobileLobby } from "@/lib/device";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TakeHomeLobbyPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = (await searchParams) ?? {};

  // IP-38: mobile-handoff lobby.
  const hdrs = await headers();
  const showLobby = shouldRenderMobileLobby({
    userAgent: hdrs.get("user-agent"),
    searchParams: sp,
    cookieHeader: hdrs.get("cookie"),
  });
  if (showLobby) {
    const host = hdrs.get("host") ?? "interviewpad.in";
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    return (
      <MobileLobby
        url={`${proto}://${host}/take-home/${token}`}
        title="Open your take-home on desktop"
        subtitle="Take-homes use a full IDE — scan the code below with your laptop to continue."
        tokenLabel="take-home"
        emailEnabled={!!process.env.RESEND_API_KEY}
      />
    );
  }

  const assignment = await prisma.takeHomeAssignment.findUnique({
    where: { token },
    include: { challenge: { include: { steps: { orderBy: { position: "asc" } } } } },
  });
  if (!assignment) notFound();

  const now = new Date();
  if (assignment.status === "PENDING" && now > assignment.expiresAt) {
    await prisma.takeHomeAssignment.update({ where: { token }, data: { status: "EXPIRED" } });
    assignment.status = "EXPIRED";
  }
  if (assignment.status === "ACTIVE") {
    redirect(`/challenges/${assignment.challenge.slug}/attempt?token=${token}`);
  }

  const wide = assignment.status === "PENDING";

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col items-center px-4 py-10 relative overflow-hidden font-sans">
      {/* Ambient glows — subtle in light, richer in dark. */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-120px] left-[-80px] w-[36rem] h-[36rem] rounded-full blur-[140px] bg-accent/[0.06] dark:bg-accent/10" />
        <div className="absolute bottom-[-120px] right-[-80px] w-[36rem] h-[36rem] rounded-full blur-[150px] bg-indigo-500/[0.05] dark:bg-indigo-500/10" />
      </div>

      <div className={`w-full ${wide ? "max-w-6xl" : "max-w-xl"} relative z-10 space-y-6`}>
        {/* Brand */}
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-black text-xl">C</div>
            <span className="font-extrabold text-sm tracking-widest text-fg uppercase">Interviewpad</span>
          </Link>
        </div>

        {/* EXPIRED */}
        {assignment.status === "EXPIRED" && (
          <div className="rounded-3xl border border-border bg-surface/70 backdrop-blur-xl shadow-sm p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 rounded-full flex items-center justify-center mx-auto text-rose-500"><AlertTriangle className="w-8 h-8" /></div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">Assessment expired</h2>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">This take-home invitation has expired. Deadlines are set by recruiters to keep the pipeline fair.</p>
            </div>
            <div className="p-4 rounded-2xl bg-panel/50 border border-border max-w-md mx-auto text-xs space-y-2 text-left text-muted">
              <Row label="Challenge" value={assignment.challenge.title} />
              <Row label="Invitation sent to" value={assignment.candidateEmail} mono />
              <Row label="Expired" value={assignment.expiresAt.toLocaleString()} valueClass="text-rose-500 dark:text-rose-400 font-bold" />
            </div>
            <p className="text-[11px] text-muted/70 max-w-sm mx-auto">Please contact your recruiter to request a new invitation link.</p>
          </div>
        )}

        {/* SUBMITTED */}
        {assignment.status === "SUBMITTED" && (
          <div className="rounded-3xl border border-border bg-surface/70 backdrop-blur-xl shadow-sm p-8 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-500"><CheckCircle2 className="w-8 h-8" /></div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">Assessment completed</h2>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">Thank you! Your submission was securely received, scored, and synced to the recruiter dashboard.</p>
            </div>
            <div className="p-4 rounded-2xl bg-panel/50 border border-border max-w-md mx-auto text-xs space-y-2 text-left text-muted">
              <Row label="Candidate" value={assignment.candidateName} />
              <Row label="Challenge" value={assignment.challenge.title} />
              <Row label="Status" value="Submitted" valueClass="text-emerald-500 dark:text-emerald-400 font-bold uppercase" />
            </div>
            <p className="text-[11px] text-muted/70 max-w-sm mx-auto">No further action is required — your recruiter will follow up on next steps.</p>
          </div>
        )}

        {/* PENDING — full-width 2-column lobby */}
        {assignment.status === "PENDING" && (() => {
          const firstStep = assignment.challenge.steps[0];
          let firstTestCase: { name: string; input: string; expected: string } | null = null;
          let testCasesCount = 0;
          try {
            const parsed = JSON.parse(firstStep?.testCasesJson || "[]");
            if (Array.isArray(parsed)) {
              const nonHidden = parsed.filter((tc: { isHidden?: boolean }) => !tc.isHidden);
              firstTestCase = nonHidden[0] || null;
              testCasesCount = nonHidden.length;
            }
          } catch { /* ignore */ }

          const templateType = firstStep?.template || assignment.challenge.template || "";
          const allowedLanguages =
            templateType.includes("ts") ? "TypeScript / Node.js"
            : templateType.includes("python") ? "Python 3"
            : templateType.includes("react") ? "React / TypeScript"
            : templateType.includes("vanilla") ? "JavaScript / HTML"
            : "JavaScript / TypeScript";
          const diff = assignment.challenge.difficulty;
          const diffCls = diff === "easy"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
            : diff === "hard"
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25";

          return (
            <div className="space-y-5 animate-fade-in">
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">Technical assessment lobby</h2>
                <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed">
                  Welcome, <span className="text-fg font-bold">{assignment.candidateName}</span>. Review the details and rules below, then start when you&apos;re ready.
                </p>
              </div>

              {/* Stat row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Stat icon={<Award className="w-3.5 h-3.5 text-accent" />} label="Assessment" value={assignment.challenge.title} />
                <Stat icon={<Clock className="w-3.5 h-3.5 text-accent" />} label="Time limit" value={`${assignment.timeLimitMin} minutes`} />
                <Stat icon={<Calendar className="w-3.5 h-3.5 text-accent" />} label="Expires" value={assignment.expiresAt.toLocaleDateString()} valueClass="text-amber-600 dark:text-amber-400" />
              </div>

              {/* 2-column: details + start | rules. Stretch so both cards match
                  height; switches to one column on tablets/phones (< md). */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* LEFT: what to expect + acknowledge/start (single card; start pinned to bottom) */}
                <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-5 flex flex-col gap-4 h-full">
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-accent" /> What to expect</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Difficulty"><span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-black uppercase tracking-wider ${diffCls}`}>{diff}</span></Field>
                    <Field label="Allowed languages"><span className="text-sm text-fg font-bold">{allowedLanguages}</span></Field>
                    <Field label="Expected duration"><span className="text-sm text-fg font-bold">{assignment.challenge.estimatedMinutes || assignment.timeLimitMin} mins</span></Field>
                    <Field label="Grader test cases"><span className="text-sm text-fg font-bold">{testCasesCount > 0 ? `${testCasesCount} samples + hidden` : "Automated suite"}</span></Field>
                  </div>
                  {firstTestCase && (
                    <details className="group [&_summary::-webkit-details-marker]:hidden rounded-xl border border-border bg-panel/50 p-3.5">
                      <summary className="flex items-center justify-between cursor-pointer text-[11px] font-black uppercase tracking-wider text-muted hover:text-fg">
                        View sample test case
                        <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2 font-mono text-[11px] text-muted">
                        <div><span className="text-[10px] font-black uppercase tracking-widest text-muted/60">Test:</span> <span className="text-fg font-bold">{firstTestCase.name || "Sample"}</span></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2 rounded bg-bg border border-border"><span className="text-[9px] font-black uppercase tracking-widest text-muted/60 block mb-1">Input</span><pre className="text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap">{firstTestCase.input}</pre></div>
                          <div className="p-2 rounded bg-bg border border-border"><span className="text-[9px] font-black uppercase tracking-widest text-muted/60 block mb-1">Expected</span><pre className="text-indigo-600 dark:text-indigo-400 whitespace-pre-wrap">{firstTestCase.expected}</pre></div>
                        </div>
                      </div>
                    </details>
                  )}
                  {/* Acknowledge + start, pinned to the bottom of the card. */}
                  <div className="mt-auto pt-4 border-t border-border/50">
                    <StartButton token={token} />
                  </div>
                </div>

                {/* RIGHT: protocol & disclosures (accordion) */}
                <div className="rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-5 space-y-3 h-full">
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-accent" /> Protocol & disclosures</h3>
                  <Disclosure open name="lobby-disclosures" icon={<CheckCircle2 className="w-4 h-4" />} title="Privacy-aware AI proctoring" tone="indigo">
                    <p>The workspace captures session telemetry to keep evaluation fair:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted/80">
                      <li><strong>Copy-paste</strong> telemetry to flag pre-written blocks.</li>
                      <li><strong>Tab-focus</strong> transitions when you navigate away.</li>
                      <li><strong>Keystroke rhythm</strong> to detect automated streaming.</li>
                    </ul>
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                      🔒 Your actual keystrokes are masked at the browser boundary — we never log characters, passwords, or text.
                    </div>
                  </Disclosure>
                  <Disclosure name="lobby-disclosures" icon={<Clock className="w-4 h-4 text-accent" />} title="Countdown & auto-submit">
                    <ul className="list-disc list-inside space-y-1">
                      <li>The clock runs continuously for <strong>{assignment.timeLimitMin} minutes</strong> once started.</li>
                      <li>Closing the tab or losing connection <strong>won&apos;t pause the timer</strong>.</li>
                      <li>At zero, the workspace freezes and auto-submits your work.</li>
                    </ul>
                  </Disclosure>
                  <Disclosure name="lobby-disclosures" icon={<Sparkles className="w-4 h-4 text-accent" />} title="System checklist">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use a modern Chromium browser (Chrome / Edge / Brave).</li>
                      <li>Ensure a stable connection for real-time saving.</li>
                      <li>Find a quiet, distraction-free spot.</li>
                    </ul>
                  </Disclosure>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function Row({ label, value, mono, valueClass }: { label: string; value: string | null; mono?: boolean; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}:</span>
      <span className={`${mono ? "font-mono" : "font-bold"} text-fg ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

function Stat({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-surface/60 backdrop-blur-xl">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">{icon} {label}</span>
      <div className={`text-base font-bold mt-2 truncate ${valueClass ?? "text-fg"}`} title={value}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Disclosure({ title, icon, children, open, tone, name }: { title: string; icon: React.ReactNode; children: React.ReactNode; open?: boolean; tone?: "indigo"; name?: string }) {
  const border = tone === "indigo" ? "border-indigo-500/20 bg-indigo-500/[0.04]" : "border-border bg-panel/40";
  const titleColor = tone === "indigo" ? "text-indigo-600 dark:text-indigo-400" : "text-fg";
  // `name` makes sibling <details> an exclusive accordion (native HTML — opening
  // one auto-closes the others sharing the same name).
  return (
    <details open={open} name={name} className={`group [&_summary::-webkit-details-marker]:hidden rounded-xl border ${border} p-3.5`}>
      <summary className={`flex items-center justify-between cursor-pointer select-none text-xs font-black uppercase tracking-wider ${titleColor}`}>
        <span className="flex items-center gap-2">{icon} {title}</span>
        <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="mt-2.5 pt-2 border-t border-border/50 text-xs text-muted leading-relaxed space-y-2">{children}</div>
    </details>
  );
}
