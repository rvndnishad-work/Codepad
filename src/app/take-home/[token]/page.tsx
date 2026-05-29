import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { headers } from "next/headers";
import { Award, Clock, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, Play, ChevronDown, Sparkles } from "lucide-react";
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

  // IP-38: mobile-handoff lobby. Bail to the QR/email lobby before doing any
  // DB work so a phone-arriving candidate doesn't trigger a status mutation
  // they can't follow through on.
  const hdrs = await headers();
  const showLobby = shouldRenderMobileLobby({
    userAgent: hdrs.get("user-agent"),
    searchParams: sp,
    cookieHeader: hdrs.get("cookie"),
  });
  if (showLobby) {
    const host = hdrs.get("host") ?? "interviewpad.in";
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    const fullUrl = `${proto}://${host}/take-home/${token}`;
    return (
      <MobileLobby
        url={fullUrl}
        title="Open your take-home on desktop"
        subtitle="Take-homes use a full IDE — scan the code below with your laptop to continue."
        tokenLabel="take-home"
        emailEnabled={!!process.env.RESEND_API_KEY}
      />
    );
  }

  const assignment = await prisma.takeHomeAssignment.findUnique({
    where: { token },
    include: {
      challenge: {
        include: {
          steps: {
            orderBy: { position: "asc" }
          }
        }
      }
    },
  });

  if (!assignment) notFound();

  const now = new Date();
  const isPastExpiration = now > assignment.expiresAt;

  // Auto-expire if pending and expired
  if (assignment.status === "PENDING" && isPastExpiration) {
    await prisma.takeHomeAssignment.update({
      where: { token },
      data: { status: "EXPIRED" },
    });
    assignment.status = "EXPIRED";
  }

  // Redirect to attempt page if already active
  if (assignment.status === "ACTIVE") {
    redirect(`/challenges/${assignment.challenge.slug}/attempt?token=${token}`);
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F3F4F6] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Glow Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-accent/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-2xl bg-[#161B2E]/60 border border-border backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 transition-all duration-300 hover:border-accent/30">
        
        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/35 flex items-center justify-center text-accent font-black text-xl shadow-lg">
              C
            </div>
            <span className="font-extrabold text-sm tracking-widest text-[#F3F4F6] uppercase">Interviewpad</span>
          </Link>
        </div>

        {/* 1. EXPIRED STATE */}
        {assignment.status === "EXPIRED" && (
          <div className="text-center space-y-6 py-6 animate-fade-in">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/25 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-[#F3F4F6]">Assessment Expired</h2>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                This take-home assignment invitation has expired. Expiration deadlines are set by recruiters to ensure pipeline integrity.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-bg/50 border border-border max-w-md mx-auto text-xs space-y-2 text-left text-muted/80">
              <div className="flex justify-between">
                <span>Challenge Name:</span>
                <span className="font-bold text-fg">{assignment.challenge.title}</span>
              </div>
              <div className="flex justify-between">
                <span>Invitation Sent To:</span>
                <span className="font-mono text-fg">{assignment.candidateEmail}</span>
              </div>
              <div className="flex justify-between">
                <span>Expiration Deadline:</span>
                <span className="font-bold text-rose-400">{assignment.expiresAt.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted/60 leading-normal max-w-sm mx-auto">
              Please contact your recruiter or hiring manager to request a new invitation link.
            </p>
          </div>
        )}

        {/* 2. SUBMITTED STATE */}
        {assignment.status === "SUBMITTED" && (
          <div className="text-center space-y-6 py-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-[#F3F4F6]">Assessment Completed</h2>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                Thank you! Your assessment code has been securely submitted, scored, and synced to the recruitment scorecard dashboard.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-bg/50 border border-border max-w-md mx-auto text-xs space-y-2 text-left text-muted/80">
              <div className="flex justify-between">
                <span>Candidate:</span>
                <span className="font-bold text-fg">{assignment.candidateName}</span>
              </div>
              <div className="flex justify-between">
                <span>Challenge:</span>
                <span className="font-bold text-fg">{assignment.challenge.title}</span>
              </div>
              <div className="flex justify-between">
                <span>Completion Status:</span>
                <span className="font-black text-emerald-400 uppercase">SUBMITTED</span>
              </div>
            </div>
            <p className="text-[11px] text-muted/60 max-w-sm mx-auto leading-normal">
              No further action is required. Your recruiter will contact you shortly regarding the next stages of the review process.
            </p>
          </div>
        )}

        {/* 3. LOBBY STATE (PENDING) */}
        {assignment.status === "PENDING" && (() => {
          const firstStep = assignment.challenge.steps[0];
          const testCasesJson = firstStep?.testCasesJson || "[]";
          let firstTestCase: { name: string; input: string; expected: string } | null = null;
          let testCasesCount = 0;
          try {
            const parsed = JSON.parse(testCasesJson);
            if (Array.isArray(parsed)) {
              const nonHidden = parsed.filter((tc: any) => !tc.isHidden);
              firstTestCase = nonHidden[0] || null;
              testCasesCount = nonHidden.length;
            }
          } catch (e) {
            console.error("Failed to parse step test cases:", e);
          }

          const templateType = firstStep?.template || assignment.challenge.template || "";
          let allowedLanguages = "JavaScript / TypeScript";
          if (templateType === "test-ts" || templateType.includes("ts")) {
            allowedLanguages = "TypeScript / Node.js";
          } else if (templateType === "python" || templateType.includes("python")) {
            allowedLanguages = "Python 3";
          } else if (templateType === "react" || templateType.includes("react")) {
            allowedLanguages = "React / TypeScript";
          } else if (templateType === "vanilla" || templateType.includes("vanilla")) {
            allowedLanguages = "JavaScript / HTML";
          }

          return (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-[#F3F4F6]">
                  Technical Assessment Lobby
                </h2>
                <p className="text-xs md:text-sm text-muted leading-relaxed max-w-md mx-auto">
                  Welcome, <span className="text-[#F3F4F6] font-bold">{assignment.candidateName}</span>. Please review the details, rules, and proctoring parameters below before starting your assessment.
                </p>
              </div>

              {/* Stats Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-2">
                <div className="p-4 rounded-2xl border border-border bg-bg/40 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-accent" /> Assessment
                  </span>
                  <span className="text-xs font-bold text-[#F3F4F6] mt-2.5 truncate">{assignment.challenge.title}</span>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-bg/40 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-accent" /> Time Limit
                  </span>
                  <span className="text-xs font-bold text-[#F3F4F6] mt-2.5">{assignment.timeLimitMin} minutes</span>
                </div>
                <div className="p-4 rounded-2xl border border-border bg-bg/40 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-accent" /> Expires
                  </span>
                  <span className="text-xs font-bold text-amber-400 mt-2.5 truncate" title={assignment.expiresAt.toLocaleString()}>
                    {assignment.expiresAt.toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* "What to Expect" Details Block */}
              <div className="p-5 rounded-2xl border border-border bg-[#101424]/40 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#F3F4F6] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent" />
                  What to expect
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium border-b border-border/40 pb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-muted">Difficulty:</span>
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        assignment.challenge.difficulty === "easy"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : assignment.challenge.difficulty === "hard"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {assignment.challenge.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-muted">Allowed Languages:</span>
                    <div className="text-[#F3F4F6] font-bold">{allowedLanguages}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-muted">Expected Duration:</span>
                    <div className="text-[#F3F4F6] font-bold">{assignment.challenge.estimatedMinutes || assignment.timeLimitMin} mins</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-widest text-muted">Grader Test Cases:</span>
                    <div className="text-[#F3F4F6] font-bold">
                      {testCasesCount > 0 ? `${testCasesCount} sample cases + hidden grader cases` : "Automated grading suite"}
                    </div>
                  </div>
                </div>

                {/* Collapsible sample test case disclosure */}
                {firstTestCase && (
                  <div className="rounded-xl border border-border/60 bg-[#161B2E]/50 p-3.5 space-y-2">
                    <details className="group [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between cursor-pointer focus:outline-none">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted hover:text-fg transition-colors flex items-center gap-1">
                          View Sample Test Case
                        </span>
                        <span className="text-muted group-open:rotate-180 transition-transform duration-200">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                      </summary>
                      <div className="mt-3.5 space-y-3 pt-3 border-t border-border/40 font-mono text-[10px] leading-relaxed text-muted">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted/60">Test Title:</span>
                          <div className="text-fg font-bold pl-1">{firstTestCase.name || "Sample Case"}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1 p-2 rounded bg-bg/60 border border-border/40">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted/60 block mb-1">Input arguments:</span>
                            <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap">{firstTestCase.input}</pre>
                          </div>
                          <div className="space-y-1 p-2 rounded bg-bg/60 border border-border/40">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted/60 block mb-1">Expected Output:</span>
                            <pre className="text-indigo-400 overflow-x-auto whitespace-pre-wrap">{firstTestCase.expected}</pre>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {/* Interactive Proctoring & Protocol Disclosures */}
              <div className="space-y-3 pt-4 border-t border-border/20">
                <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  Assessment Protocol & Disclosures
                </h3>

                <div className="space-y-2.5">
                  {/* Disclosure Item 1: Proctoring & Keystroke Masking */}
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2.5">
                    <details className="group [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Privacy-Aware AI Proctoring
                        </span>
                        <span className="text-indigo-400 group-open:rotate-180 transition-transform duration-200">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                      </summary>
                      <div className="mt-2.5 pl-6 pt-2 border-t border-indigo-500/10 text-[11px] text-muted/95 leading-relaxed space-y-2">
                        <p>
                          To maintain evaluation fairness, the coding workspace captures session telemetry events. Specifically, we log and analyze:
                        </p>
                        <ul className="list-disc list-inside space-y-1.5 text-muted/80 pl-1">
                          <li><strong>Copy-Paste telemetry</strong> to flag fully pre-written block insertions.</li>
                          <li><strong>Screen focus transitions</strong> (out-of-tab blurs) when navigating away from the workspace.</li>
                          <li><strong>Keystroke rhythm intervals</strong> (inter-arrival typing speed patterns) to identify automated streaming.</li>
                        </ul>
                        <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/15 mt-2 flex gap-2">
                          <span className="text-[10px] font-semibold text-indigo-300 leading-normal">
                            🔒 <strong>Candidate Privacy Shield:</strong> All alphanumeric keyboard inputs are completely masked at the browser boundary (e.g., recorded as <code>key: &quot;alphanumeric&quot;</code>). We never log actual characters, passwords, drafts, or sensitive text inputs.
                          </span>
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* Disclosure Item 2: Timer & Auto-Capture Protocol */}
                  <div className="rounded-xl border border-border bg-[#101424]/40 p-4 space-y-2.5">
                    <details className="group [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none">
                        <span className="text-xs font-black uppercase tracking-wider text-fg hover:text-accent transition-colors flex items-center gap-2">
                          <Clock className="w-4 h-4 text-accent" />
                          Countdown & Auto-Submit Rules
                        </span>
                        <span className="text-muted group-open:rotate-180 transition-transform duration-200">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                      </summary>
                      <div className="mt-2.5 pl-6 pt-2 border-t border-border/40 text-[11px] text-muted/90 leading-relaxed space-y-2">
                        <p>
                          Please review the operational rules for the timed attempt:
                        </p>
                        <ul className="list-disc list-inside space-y-1 pl-1">
                          <li>Once initiated, the clock runs continuously for <strong>{assignment.timeLimitMin} minutes</strong>.</li>
                          <li>Closing the tab, losing internet connection, or restarting your computer <strong>will not pause or reset the timer</strong>.</li>
                          <li>When the timer reaches zero, the workspace will immediately freeze, capture your current code files, and auto-submit your attempt.</li>
                        </ul>
                      </div>
                    </details>
                  </div>

                  {/* Disclosure Item 3: System Recommendations */}
                  <div className="rounded-xl border border-border bg-[#101424]/40 p-4 space-y-2.5">
                    <details className="group [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none">
                        <span className="text-xs font-black uppercase tracking-wider text-fg hover:text-accent transition-colors flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-accent" />
                          System & Environment Checklist
                        </span>
                        <span className="text-muted group-open:rotate-180 transition-transform duration-200">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </span>
                      </summary>
                      <div className="mt-2.5 pl-6 pt-2 border-t border-border/40 text-[11px] text-muted/90 leading-relaxed space-y-2">
                        <p>
                          We recommend the following setup for an optimal experience:
                        </p>
                        <ul className="list-disc list-inside space-y-1 pl-1">
                          <li>Use a modern Chromium-based browser (Chrome, Edge, or Brave) for optimal Monaco Editor performance.</li>
                          <li>Ensure a stable network connection to allow real-time saving and file synchronization.</li>
                          <li>Find a quiet, distraction-free environment to avoid accidental tab-switching or blur alerts.</li>
                        </ul>
                      </div>
                    </details>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-4">
                <StartButton token={token} />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
