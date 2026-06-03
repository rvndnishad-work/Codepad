import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { 
  Trophy, 
  User, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Star, 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from "lucide-react";

export const metadata = {
  title: "Executive Candidate Report — Interviewpad Recruiter",
};

export default async function CandidateReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const session = await auth().catch(() => null);
  const interview = await prisma.interviewSession.findUnique({
    where: { id },
    include: {
      rubric: true,
    },
  });

  if (!interview) notFound();

  // Access: owner OR holder of correct shareToken.
  const isOwner = !!session?.user?.id && session.user.id === interview.userId;
  const hasShareToken = !!token && token === interview.shareToken;
  if (!isOwner && !hasShareToken) {
    if (!session?.user?.id) {
      redirect(`/login?next=${encodeURIComponent(`/interview/${id}/report?token=${token}`)}`);
    }
    notFound();
  }

  // Parse Rubric
  let rubricRatings: Record<string, number> = {
    CodeQuality: 3,
    Communication: 3,
    ProblemSolving: 3,
  };
  let rubricNotes = "";
  if (interview.rubric) {
    try {
      rubricRatings = JSON.parse(interview.rubric.ratings);
      rubricNotes = interview.rubric.notes || "";
    } catch (e) {
      // Fallback
    }
  }

  // Parse Challenge IDs & Details
  function parseIds(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  }
  const challengeIds = parseIds(interview.challengeIds);

  const [challenges, attempts] = await Promise.all([
    challengeIds.length > 0
      ? prisma.challenge.findMany({
          where: { id: { in: challengeIds } },
          select: { id: true, title: true, difficulty: true },
        })
      : Promise.resolve([]),
    prisma.challengeAttempt.findMany({
      where: { sessionId: interview.id },
      include: {
        integrityReport: true,
      },
    }),
  ]);

  const challengeById = new Map(challenges.map((c) => [c.id, c]));
  
  // Aggregate integrity metrics
  let totalPasteCount = 0;
  let totalBlurCount = 0;
  let totalBlurSec = 0;
  let maxSuspicionScore = 0;

  const attemptSummaries = attempts.map((attempt) => {
    const chal = challengeById.get(attempt.challengeId);
    const integrity = attempt.integrityReport;
    if (integrity) {
      totalPasteCount += integrity.pasteCount;
      totalBlurCount += integrity.blurCount;
      totalBlurSec += integrity.totalBlurSec;
      if (integrity.suspicionScore > maxSuspicionScore) {
        maxSuspicionScore = integrity.suspicionScore;
      }
    }
    return {
      title: chal?.title || "Unknown Step",
      difficulty: chal?.difficulty || "medium",
      status: attempt.status,
      score: attempt.score,
      durationSec: attempt.durationSec,
      suspicionScore: integrity?.suspicionScore || 0,
    };
  });

  const durationMin = interview.startedAt && interview.finishedAt
    ? Math.round((interview.finishedAt.getTime() - interview.startedAt.getTime()) / 60000)
    : 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] p-6 sm:p-12 font-sans select-none print:bg-white print:text-black print:p-0">
      
      {/* PRINT-ONLY CSS RULES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border-color: #e4e4e7 !important;
          }
          .print-bg-card {
            background-color: #fafafa !important;
            border: 1px solid #e4e4e7 !important;
          }
          .print-text-dark {
            color: #18181b !important;
          }
          .print-text-muted {
            color: #71717a !important;
          }
        }
      `}} />

      {/* TOP CONTROL BAR (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between no-print bg-[#18181b] border border-[#27272a] rounded-2xl p-4 shadow-xl">
        <Link
          href={`/interview/${interview.id}?token=${interview.shareToken}`}
          className="flex items-center gap-2 text-xs font-bold text-muted hover:text-fg transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lobby
        </Link>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.print();
            }
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-soft text-bg text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md hover:-translate-y-0.5 active:scale-95"
        >
          <Printer className="w-4 h-4" />
          Print / PDF Export
        </button>
      </div>

      {/* EXECUTIVE REPORT WRAPPER */}
      <div className="max-w-4xl mx-auto bg-[#18181b] border border-[#27272a] rounded-3xl shadow-2xl overflow-hidden print:bg-white print:border-none print:shadow-none print:rounded-none">
        
        {/* Header Block */}
        <div className="p-8 border-b border-[#27272a] print:border-b-2 print:border-zinc-200 bg-gradient-to-r from-accent/5 via-transparent to-transparent print:from-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-accent print:text-zinc-500">
                Interviewpad Recruiter Platform
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight mt-1 print:text-zinc-900">
                Executive Candidate Report
              </h1>
              <p className="text-xs text-muted mt-1.5 print:text-zinc-500">
                A standardized competency score evaluation for modern engineering hires.
              </p>
            </div>
            {interview.verdict && (
              <div className={`self-start sm:self-center px-4 py-2 rounded-xl border font-black uppercase tracking-wider text-xs shadow-md print:bg-zinc-100 print:text-zinc-800 ${
                interview.verdict === "success"
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500 dark:text-emerald-400"
                  : interview.verdict === "failed"
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-500 dark:text-rose-400"
                    : "bg-amber-500/10 border-amber-500/25 text-amber-500 dark:text-amber-400"
              }`}>
                Verdict: {interview.verdict.replace(/_/g, ' ')}
              </div>
            )}
          </div>
        </div>

        {/* Candidate & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#27272a] print:divide-zinc-200 border-b border-[#27272a] print:border-b-2 print:border-zinc-200 bg-[#121214]/50 print:bg-zinc-50">
          <div className="p-5 flex items-center gap-3">
            <User className="w-5 h-5 text-accent shrink-0 print:text-zinc-400" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted print:text-zinc-500">Candidate</div>
              <div className="text-xs font-bold mt-0.5 print:text-zinc-900">{interview.candidateName || "Anonymous Candidate"}</div>
            </div>
          </div>
          <div className="p-5 flex items-center gap-3">
            <FileText className="w-5 h-5 text-accent shrink-0 print:text-zinc-400" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted print:text-zinc-500">Session ID</div>
              <div className="text-xs font-mono font-bold mt-0.5 print:text-zinc-900">{interview.id.substring(0, 8)}...</div>
            </div>
          </div>
          <div className="p-5 flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent shrink-0 print:text-zinc-400" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted print:text-zinc-500">Duration</div>
              <div className="text-xs font-bold mt-0.5 print:text-zinc-900">{durationMin} min</div>
            </div>
          </div>
          <div className="p-5 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-accent shrink-0 print:text-zinc-400" />
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted print:text-zinc-500">Date Evaluated</div>
              <div className="text-xs font-bold mt-0.5 print:text-zinc-900">
                {interview.finishedAt ? new Date(interview.finishedAt).toLocaleDateString() : "Pending"}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* SECTION 1: Evaluation Rubrics */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-accent print:text-zinc-700 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Structured Evaluation Rubric
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: "Code Quality", val: rubricRatings.CodeQuality, desc: "Cleanliness, modular safety, typing and readability standards." },
                { name: "Communication", val: rubricRatings.Communication, desc: "Process transparency, collaborative responses, and clarity." },
                { name: "Problem Solving", val: rubricRatings.ProblemSolving, desc: "Logical clarity, performance constraints, and bug remediation." }
              ].map((metric) => (
                <div key={metric.name} className="p-5 rounded-2xl border border-[#27272a] bg-[#121214]/30 print:bg-zinc-50 print:border-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold print:text-zinc-800">{metric.name}</span>
                    <span className="text-xs font-mono font-black text-accent print:text-zinc-900">{metric.val} / 5</span>
                  </div>
                  <div className="w-full bg-[#27272a] print:bg-zinc-200 h-2 rounded-full overflow-hidden flex gap-0.5 mt-2.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div
                        key={star}
                        className={`h-full flex-1 ${
                          star <= metric.val
                            ? "bg-gradient-to-r from-amber-400 to-orange-500 print:bg-amber-400 print:from-amber-400 print:to-amber-400"
                            : "bg-surface/30"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted mt-3.5 leading-relaxed print:text-zinc-500">
                    {metric.desc}
                  </p>
                </div>
              ))}
            </div>

            {rubricNotes && (
              <div className="p-5 rounded-2xl border border-[#27272a] bg-[#121214]/20 print:bg-zinc-50 print:border-zinc-200 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted block print:text-zinc-500">
                  Comprehensive Notes & Performance Feedback
                </span>
                <p className="text-xs text-fg/80 italic leading-relaxed whitespace-pre-wrap print:text-zinc-800">
                  {rubricNotes}
                </p>
              </div>
            )}
          </div>

          {/* SECTION 2: Integrity & Trust Report */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-accent print:text-zinc-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Candidate Integrity & Telemetry Report
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-[#27272a] bg-[#121214]/30 print:bg-zinc-50 print:border-zinc-200 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted print:text-zinc-500">AI Suspicion index</span>
                <div className="mt-3.5 flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${
                    maxSuspicionScore > 60 ? "text-rose-500" : maxSuspicionScore > 30 ? "text-amber-500" : "text-emerald-500"
                  }`}>
                    {maxSuspicionScore}
                  </span>
                  <span className="text-[10px] text-muted">/ 100</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-[#27272a] bg-[#121214]/30 print:bg-zinc-50 print:border-zinc-200 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted print:text-zinc-500">Out-Of-Tab Blurs</span>
                <div className="mt-3.5 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-fg print:text-zinc-900">{totalBlurCount}</span>
                  <span className="text-[10px] text-muted">events</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-[#27272a] bg-[#121214]/30 print:bg-zinc-50 print:border-zinc-200 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted print:text-zinc-500">Time spent Unfocused</span>
                <div className="mt-3.5 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-fg print:text-zinc-900">{totalBlurSec}</span>
                  <span className="text-[10px] text-muted">seconds</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-[#27272a] bg-[#121214]/30 print:bg-zinc-50 print:border-zinc-200 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted print:text-zinc-500">Clipboard Pastes</span>
                <div className="mt-3.5 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-fg print:text-zinc-900">{totalPasteCount}</span>
                  <span className="text-[10px] text-muted">instances</span>
                </div>
              </div>
            </div>

            {maxSuspicionScore > 30 && (
              <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 print:bg-zinc-50 print:border-zinc-200 text-rose-500 dark:text-rose-400 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">High Suspicion Telemetry Event Flagged</h4>
                  <p className="text-[11px] text-muted mt-1 leading-relaxed print:text-zinc-700">
                    The candidate exhibited frequent tab switching behaviors or pasted large blocks of code from the clipboard. Compare keyboard playback speed and focus metrics to ensure strict integrity constraints.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Step-by-Step Challenge Performance */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-accent print:text-zinc-700 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Technical Assessment Breakdown
            </h2>

            <div className="border border-[#27272a] rounded-2xl overflow-hidden print:border-zinc-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#121214]/80 text-[10px] font-black uppercase tracking-wider text-muted border-b border-[#27272a] print:bg-zinc-50 print:border-zinc-200 print:text-zinc-700">
                    <th className="p-4">Step Name</th>
                    <th className="p-4">Difficulty</th>
                    <th className="p-4">Execution Status</th>
                    <th className="p-4">Grade Score</th>
                    <th className="p-4">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a] print:divide-zinc-200 text-xs text-fg/90 print:text-zinc-800">
                  {attemptSummaries.map((summary, idx) => {
                    const isPass = summary.status === "passed";
                    return (
                      <tr key={idx} className="hover:bg-bg/20 transition-all print:hover:bg-transparent">
                        <td className="p-4 font-bold">{summary.title}</td>
                        <td className="p-4 capitalize">
                          <span className={`text-[10px] font-extrabold uppercase ${
                            summary.difficulty === "easy" ? "text-emerald-500" : summary.difficulty === "hard" ? "text-rose-500" : "text-amber-500"
                          }`}>
                            {summary.difficulty}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 font-bold">
                            {isPass ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-500">Passed</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-rose-500" />
                                <span className="text-rose-500">Did Not Pass</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono font-black">
                          {summary.score != null ? `${summary.score}%` : "0%"}
                        </td>
                        <td className="p-4">
                          {summary.durationSec ? `${Math.round(summary.durationSec / 60)} min` : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                  {attemptSummaries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted italic print:text-zinc-500">
                        No technical challenges were registered or attempted during this interview.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="p-6 bg-[#121214]/50 border-t border-[#27272a] flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-muted print:bg-transparent print:border-zinc-200 print:text-zinc-500">
          <span>Interviewpad Candidate Report • Confidential Evaluation Summary</span>
          <span>Generated: {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
