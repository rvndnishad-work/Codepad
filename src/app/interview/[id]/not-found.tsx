import Link from "next/link";
import { Briefcase, Home, ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export const metadata = {
  title: "Session not found — Interviewpad",
};

export default function InterviewNotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-lg text-center">
        <div className="absolute -inset-x-10 -inset-y-6 bg-hero-glow opacity-50 pointer-events-none" />
        <div
          className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"
          style={{ backgroundSize: "24px 24px" }}
        />
        <div className="relative">
          <div className="flex justify-center mb-6">
            <LogoMark size={56} />
          </div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-muted uppercase mb-2">
            404 · Interview session
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-fg leading-tight">
            This session isn't available
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-accent to-violet-400 mt-1">
              (or your invite has expired).
            </span>
          </h1>
          <p className="mt-4 text-muted text-sm max-w-md mx-auto leading-relaxed">
            The session may have been deleted by the interviewer, or the share
            link / token is no longer valid. Ask your interviewer for a fresh
            invite link.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-2 items-center justify-center">
            <Link
              href="/interview"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-soft text-bg text-sm font-bold shadow-soft transition"
            >
              <Briefcase className="w-4 h-4" />
              Your sessions
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-panel hover:bg-elevated text-fg text-sm font-medium transition"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
