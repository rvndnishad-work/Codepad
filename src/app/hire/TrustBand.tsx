import { ShieldCheck, Lock, KeyRound, ScrollText, Network, History } from "lucide-react";
import RevealOnScroll from "@/components/scroll/RevealOnScroll";
import SectionHeading from "@/components/home/SectionHeading";

/**
 * Security & trust band for the recruiter page. Every claim here maps to a
 * real, shipped mechanism in the codebase — keep it that way.
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

export default function TrustBand() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          index="06"
          tone="secondary"
          eyebrow="Built for trust"
          eyebrowIcon={<ShieldCheck className="h-3 w-3" />}
          title="Your candidates' work,"
          highlight="handled seriously."
          lede="Hiring data is sensitive. None of these are roadmap promises — each one names a mechanism that is running today."
        />

        {/* Six clauses on one sheet. Each is numbered, because a security
            claim you can cite is worth more than a security claim in a card. */}
        <RevealOnScroll className="ip-frame grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => (
            <div key={item.title} className="flex flex-col gap-3 bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="ip-index text-secondary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <item.icon className="h-4 w-4 text-subtle" />
                <span className="ip-rule-soft min-w-2 flex-1" aria-hidden />
              </div>
              <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-fg">
                {item.title}
              </h3>
              <p className="text-[12.5px] leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </RevealOnScroll>
      </div>
    </section>
  );
}
