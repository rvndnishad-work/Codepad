import { Video } from "lucide-react";
import { RecruiterDemoCard } from "../../app/RecruiterDemoCard";
import WowReveal from "@/components/wow/WowReveal";
import { ProctoringDemo } from "./HireWowFeatures";

/** `live` marks counts read from the database; the rest are fixed capabilities. */
export type RoomStat = { value: string; label: string; live: boolean };

/**
 * The live room and its integrity feed, side by side: the interview demo on
 * the left, the proctor feed it produces on the right, platform numbers below.
 */
export default function HireWowRoom({ roomStats }: { roomStats: RoomStat[] }) {
  return (
    <section className="relative overflow-hidden bg-surface px-4 py-24 text-fg transition-colors md:py-32">
      <div aria-hidden className="pointer-events-none absolute right-[-160px] top-1/4 h-[420px] w-[420px] rounded-full bg-secondary/15 blur-[130px]" />
      <div className="relative mx-auto max-w-7xl">
        <WowReveal>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-secondary"><Video className="h-3.5 w-3.5" /> live interview room</p>
          <h2 className="wow-font-display mt-3 text-5xl md:text-7xl">THE ROOM,<br />AS CANDIDATES <span className="wow-gradient-boss">SEE IT.</span></h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            A shared editor with live cursors, real execution and an AI
            co-pilot suggesting follow-ups, in the browser with nothing to
            install. Tab switches, pastes and timing are disclosed to the
            candidate and land on the replay for a person to read: the system
            flags, the panel decides.
          </p>
        </WowReveal>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <WowReveal className="lg:col-span-7">
            <div className="h-full overflow-hidden rounded-3xl border border-border bg-panel backdrop-blur-sm">
              <RecruiterDemoCard />
            </div>
          </WowReveal>
          <WowReveal delay={0.07} className="lg:col-span-5">
            <div className="flex h-[440px] w-full">
              <ProctoringDemo />
            </div>
          </WowReveal>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {roomStats.map((s, i) => (
            <WowReveal key={s.label} delay={i * 0.07} className="h-full">
              <div className="flex h-full flex-col justify-center gap-2 rounded-3xl border border-border bg-panel p-6 backdrop-blur-sm">
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
                  <span className="h-[6px] w-[6px] rounded-full bg-secondary" aria-hidden /> {s.live ? "Live count" : "Built in"}
                </span>
                <span className="wow-font-display text-4xl tabular-nums">{s.value}</span>
                <span className="text-[12.5px] leading-snug text-muted">{s.label}</span>
              </div>
            </WowReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
