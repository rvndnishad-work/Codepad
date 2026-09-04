import { ShieldCheck, Lock, KeyRound, ScrollText, Network, History } from "lucide-react";
import WowReveal from "@/components/wow/WowReveal";

/** Same six shipped mechanisms as the classic trust band — WOW cards. */
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
    body: "Attempt timelines and integrity signals are captured per attempt (with the candidate's knowledge) and surfaced on the scorecard.",
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

export default function HireWowTrust() {
  return (
    <section className="relative bg-[var(--wow-bg)] px-4 py-24 text-[var(--wow-fg)] transition-colors md:py-32">
      <div className="mx-auto max-w-6xl">
        <WowReveal>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#8b93ff]"><ShieldCheck className="h-3.5 w-3.5" /> built for trust</p>
          <h2 className="wow-font-display mt-3 text-5xl md:text-7xl">CANDIDATES' WORK,<br /><span className="wow-gradient-boss">HANDLED SERIOUSLY.</span></h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--wow-muted)]">
            Hiring data is sensitive. None of these are roadmap promises — each
            one names a mechanism that is running today.
          </p>
        </WowReveal>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <WowReveal key={item.title} delay={(i % 3) * 0.07}>
              <article className="group flex h-full flex-col gap-3 rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-[#8b93ff]/60">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#8b93ff]/10 text-[#8b93ff] transition group-hover:bg-[#8b93ff]/20">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-[var(--wow-faint)]">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="text-[15px] font-bold tracking-[-0.015em]">{item.title}</h3>
                <p className="text-[12.5px] leading-relaxed text-[var(--wow-muted)]">{item.body}</p>
              </article>
            </WowReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
