import { ShieldCheck, Lock, KeyRound, ScrollText, Network, History } from "lucide-react";

/**
 * Security & trust band for the recruiter page. Every claim here maps to a
 * real, shipped mechanism in the codebase — keep it that way. Static server
 * component: no JS shipped for this section.
 */
const ITEMS = [
  {
    icon: Network,
    title: "Network-isolated execution",
    body: "Candidate code never runs on the app server — it executes in a network-disabled sandbox with CPU, memory, and output limits.",
  },
  {
    icon: ShieldCheck,
    title: "Server-side grading",
    body: "Hidden tests run on our infrastructure, not in the candidate's browser. Submitted scores can't be forged client-side.",
  },
  {
    icon: History,
    title: "Session replay & integrity signals",
    body: "Keystroke timelines, paste events, and focus changes are captured per attempt and surfaced on the scorecard.",
  },
  {
    icon: KeyRound,
    title: "Two-factor authentication",
    body: "TOTP-based 2FA with single-use backup codes protects recruiter and admin accounts.",
  },
  {
    icon: Lock,
    title: "Secrets encrypted at rest",
    body: "ATS keys and integration tokens are AES-256-GCM encrypted and never returned to the browser after saving.",
  },
  {
    icon: ScrollText,
    title: "Audit trails",
    body: "Workspace actions, security events, and AI tool calls are written to append-only audit logs.",
  },
];

export default function TrustBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest mb-3 px-3 py-1.5 rounded-full text-indigo-400 bg-indigo-500/10">
          <ShieldCheck className="w-3.5 h-3.5" />
          Built for trust
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-fg tracking-tight">
          Your candidates&apos; work, <span className="text-indigo-400">handled seriously.</span>
        </h2>
        <p className="text-muted text-base md:text-lg max-w-2xl mx-auto mt-3">
          Hiring data is sensitive. These aren&apos;t roadmap promises — they&apos;re how the platform works today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-border bg-panel p-6 hover:border-indigo-500/30 transition-colors"
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mb-4">
              <item.icon className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-fg font-black text-base mb-1.5">{item.title}</h3>
            <p className="text-muted text-sm leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
