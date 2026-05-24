import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Award, Clock, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, Play } from "lucide-react";
import StartButton from "./StartButton";

type Props = { params: Promise<{ token: string }> };

export default async function TakeHomeLobbyPage({ params }: Props) {
  const { token } = await params;
  const assignment = await prisma.takeHomeAssignment.findUnique({
    where: { token },
    include: { challenge: true },
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
            <span className="font-extrabold text-sm tracking-widest text-[#F3F4F6] uppercase">Codepad</span>
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
        {assignment.status === "PENDING" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-[#F3F4F6]">
                Technical Assessment Lobby
              </h2>
              <p className="text-xs md:text-sm text-muted leading-relaxed max-w-md mx-auto">
                Welcome, <span className="text-[#F3F4F6] font-bold">{assignment.candidateName}</span>. Please review the details and rules below before starting your assessment.
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

            {/* Test integrity warning box */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-start gap-3.5">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400">Security & Integrity</h4>
                <p className="text-[11px] text-muted/80 leading-relaxed">
                  This workspace logs operational telemetry. Large code pastes, inhuman typing speeds, or leaving the active browser window tab are analyzed and flagged on the interviewer reviews panel.
                </p>
              </div>
            </div>

            {/* Rules list */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Test Protocol Rules</h3>
              <ul className="space-y-2 text-xs text-muted/90 leading-relaxed pl-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>Once clicked, the <strong>countdown timer begins ticking</strong> and cannot be paused. Closing the browser window will not halt the clock.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>The test will automatically lock, capture your code files, and submit when your time expires.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>Ensure you have a stable network connection and are in a distraction-free environment.</span>
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <div className="pt-4">
              <StartButton token={token} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
