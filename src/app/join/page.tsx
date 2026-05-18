import { Suspense } from "react";
import Link from "next/link";
import JoinForm from "./JoinForm";
import { Terminal, ShieldCheck, ArrowLeft, Sparkles } from "lucide-react";

export const metadata = {
  title: "Join Interview Session — Interviewpad",
};

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow visual elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Navigation link */}
        <Link
          href="/interview"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-all font-bold group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Interviews
        </Link>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 grid place-items-center mx-auto mb-4">
            <Terminal className="w-5 h-5 text-accent animate-pulse" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-fg flex items-center justify-center gap-1.5">
            Join Interview Session
            <Sparkles className="w-4 h-4 text-amber-500 fill-current" />
          </h1>
          <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
            Access secure, collaborative mock trials and live interviews directly by typing your session's code or share token.
          </p>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="rounded-3xl border border-border bg-bg/85 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden">
          <Suspense
            fallback={
              <div className="space-y-6 animate-pulse">
                <div className="h-4 bg-surface rounded w-1/3" />
                <div className="h-12 bg-surface rounded-2xl" />
                <div className="h-12 bg-accent/20 rounded-2xl animate-pulse" />
              </div>
            }
          >
            <JoinForm />
          </Suspense>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted font-semibold tracking-wider uppercase">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            End-To-End Secure
          </span>
          <span className="text-border/60">•</span>
          <span>Auto-Expiring Codes</span>
        </div>
      </div>
    </div>
  );
}
