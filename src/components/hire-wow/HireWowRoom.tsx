import { Video, Users, Bot, ShieldCheck } from "lucide-react";
import { RecruiterDemoCard } from "../../app/RecruiterDemoCard";
import WowReveal from "@/components/wow/WowReveal";

/**
 * The live room: the real interactive interview demo, framed in WOW —
 * plus live platform metrics and the capability strip. All copy preserved.
 */
export default function HireWowRoom({ roomStats }: { roomStats: { value: string; label: string }[] }) {
  return (
    <section className="relative overflow-hidden bg-[var(--wow-bg-2)] px-4 py-24 text-[var(--wow-fg)] transition-colors md:py-32">
      <div aria-hidden className="pointer-events-none absolute right-[-160px] top-1/4 h-[420px] w-[420px] rounded-full bg-[var(--wow-glow-a)] blur-[130px]" />
      <div className="relative mx-auto max-w-6xl">
        <WowReveal>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#8b93ff]"><Video className="h-3.5 w-3.5" /> live interview room</p>
          <h2 className="wow-font-display mt-3 text-5xl md:text-7xl">THE ROOM,<br />AS CANDIDATES <span className="wow-gradient-boss">SEE IT.</span></h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--wow-muted)]">
            Collaborative editor, live execution and integrity signals — in the
            browser, with nothing to install on either side. Your team watches,
            replays and scores. This demo is live: it types below.
          </p>
        </WowReveal>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <WowReveal className="lg:col-span-8">
            <div className="h-full overflow-hidden rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] backdrop-blur-sm">
              <RecruiterDemoCard />
            </div>
          </WowReveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1">
            {roomStats.map((s, i) => (
              <WowReveal key={s.label} delay={i * 0.07} className="h-full">
                <div className="flex h-full flex-col justify-center gap-2 rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-6 backdrop-blur-sm">
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8b93ff]">
                    <span className="h-[6px] w-[6px] rounded-full bg-[#8b93ff]" aria-hidden /> Live metric
                  </span>
                  <span className="wow-font-display text-4xl tabular-nums">{s.value}</span>
                  <span className="text-[12.5px] leading-snug text-[var(--wow-muted)]">{s.label}</span>
                </div>
              </WowReveal>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            { icon: Users, label: "Live cursors", desc: "See who types what, and when" },
            { icon: Bot, label: "AI co-pilot", desc: "Suggests follow-ups mid-session" },
            { icon: ShieldCheck, label: "Replay + signals", desc: "Paste, blur, keystroke timeline" },
          ].map((f, i) => (
            <WowReveal key={f.label} delay={i * 0.07}>
              <div className="flex h-full items-start gap-4 rounded-3xl border border-[var(--wow-card-border)] bg-[var(--wow-card)] p-5 backdrop-blur-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#8b93ff]/10 text-[#8b93ff]">
                  <f.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.18em]">{f.label}</span>
                  <span className="mt-1.5 block text-[12.5px] leading-relaxed text-[var(--wow-muted)]">{f.desc}</span>
                </span>
              </div>
            </WowReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
