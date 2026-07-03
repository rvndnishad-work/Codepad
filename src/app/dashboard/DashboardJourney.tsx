import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Flame,
  Map,
  Sparkles,
} from "lucide-react";
import TechSvg from "@/components/TechSvg";
import { getJourneyOverview } from "@/lib/prep-journey/query";

/**
 * Dashboard entry point for Prep Journeys: a create-CTA when the user has no
 * plan, otherwise a compact progress strip with today's queue. Server
 * component — all interactivity lives on /prep.
 */
export default async function DashboardJourney({ userId }: { userId: string }) {
  const overview = await getJourneyOverview(userId);

  // ── Empty state: invite the user to build a plan ──
  if (!overview) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/[0.10] via-accent/[0.04] to-transparent p-6 md:p-8 mb-8">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-bg/60 border border-border text-muted mb-3">
              <Map className="w-3.5 h-3.5 text-accent" />
              New — Prep Journey
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              Preparing for interviews? Get a day-by-day plan.
            </h2>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">
              Pick frontend, backend or full-stack, choose your tech stack and daily time — we build a
              schedule from the question bank and challenges, and track everything you solve.
            </p>
          </div>
          <Link
            href="/prep/new"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-bg text-sm font-black hover:bg-accent-soft transition shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            Create my journey
          </Link>
        </div>
      </div>
    );
  }

  const pct =
    overview.totalItems > 0
      ? Math.round((overview.completedItems / overview.totalItems) * 100)
      : 0;
  const previewItems = overview.todayItems.slice(0, 3);
  const isCompleted = overview.status === "completed";

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 md:p-7 mb-8 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-accent/[0.06] blur-3xl pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Progress summary */}
        <div className="flex items-center gap-5 lg:w-[300px] shrink-0">
          <MiniRing pct={pct} />
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted">
              <Map className="w-3 h-3 text-accent" /> Prep Journey
            </div>
            <div className="font-black tracking-tight text-lg leading-tight mt-0.5">{overview.title}</div>
            <div className="flex items-center gap-3 mt-1 text-xs font-bold text-muted">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Day {overview.currentDay}/{overview.totalDays}
              </span>
              <span className="inline-flex items-center gap-1">
                <Flame className={`w-3.5 h-3.5 ${overview.streak > 0 ? "text-orange-500" : ""}`} />
                {overview.streak}
              </span>
            </div>
          </div>
        </div>

        {/* Today's queue preview */}
        <div className="min-w-0 flex-1">
          {isCompleted ? (
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Journey complete — every item done. 🎉
            </p>
          ) : (
            <div className="space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-muted">Today</div>
              {previewItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs font-semibold min-w-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-muted/50 shrink-0" />
                  )}
                  <TechSvg tech={item.technology ?? ""} className="w-3.5 h-3.5 shrink-0" />
                  <span className={`truncate ${item.completed ? "text-muted line-through" : "text-fg/85"}`}>
                    {item.title}
                  </span>
                </div>
              ))}
              {overview.todayItems.length > previewItems.length && (
                <div className="text-[11px] text-muted font-semibold pl-5">
                  +{overview.todayItems.length - previewItems.length} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={isCompleted ? "/prep/new" : "/prep"}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition shadow-md self-start lg:self-center"
        >
          {isCompleted ? "Start a new journey" : "Continue"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function MiniRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-border" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-black">{pct}%</div>
    </div>
  );
}
