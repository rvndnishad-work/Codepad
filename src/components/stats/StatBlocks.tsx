import { type ReactNode } from "react";

// Shared stat-card visual primitives used by the homepage and the /challenges
// header. Kept in one place so the design language stays consistent across
// surfaces — change the icon-chip styling here and both pages update.

export type StatTone = "emerald" | "amber" | "accent" | "rose";

const toneClasses: Record<StatTone, string> = {
  emerald: "text-emerald-500 bg-emerald-500/10",
  amber: "text-amber-500 bg-amber-500/10",
  accent: "text-accent bg-accent/10",
  rose: "text-rose-500 bg-rose-500/10",
};

export function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  tone: StatTone;
}) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 flex flex-col gap-3 hover:border-border-strong transition-colors h-full">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-black text-fg leading-none mb-1.5">
          {value}
        </div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

export function DifficultyCard({
  easy,
  medium,
  hard,
  total,
}: {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}) {
  const safeTotal = Math.max(1, total);
  const pe = (easy / safeTotal) * 100;
  const pm = (medium / safeTotal) * 100;
  const ph = (hard / safeTotal) * 100;
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 flex flex-col gap-3 hover:border-border-strong transition-colors h-full">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted font-bold">
          Difficulty mix
        </span>
        <span className="text-[10px] text-muted/60 font-mono">{total} total</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-border">
        <div className="bg-emerald-500" style={{ width: `${pe}%` }} />
        <div className="bg-amber-500" style={{ width: `${pm}%` }} />
        <div className="bg-rose-500" style={{ width: `${ph}%` }} />
      </div>
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-emerald-500">{easy} easy</span>
        <span className="text-amber-500">{medium} med</span>
        <span className="text-rose-500">{hard} hard</span>
      </div>
    </div>
  );
}

/**
 * Personal progress variant of the stat card — shows `solved / total` with a
 * thin segmented progress bar split by difficulty. Used on /challenges when
 * the user is signed in. Falls back to a plain "X / Y solved" stat when no
 * difficulty breakdown is passed.
 */
export function ProgressCard({
  solved,
  total,
  byDifficulty,
}: {
  solved: number;
  total: number;
  byDifficulty?: { easy: number; medium: number; hard: number };
}) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-border bg-panel p-5 flex flex-col gap-3 hover:border-border-strong transition-colors h-full">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-accent bg-accent/10`}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="10" />
        </svg>
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-black text-fg leading-none mb-1.5 tabular-nums">
          {solved}
          <span className="text-muted/40 text-lg font-bold">/{total}</span>
        </div>
        <div className="text-xs text-muted">
          Solved <span className="text-fg/60">· {pct}%</span>
        </div>
      </div>
      {byDifficulty && total > 0 && (
        <div
          className="flex h-1.5 rounded-full overflow-hidden bg-border mt-auto"
          aria-hidden
        >
          <div
            className="bg-emerald-500"
            style={{ width: `${(byDifficulty.easy / total) * 100}%` }}
          />
          <div
            className="bg-amber-500"
            style={{ width: `${(byDifficulty.medium / total) * 100}%` }}
          />
          <div
            className="bg-rose-500"
            style={{ width: `${(byDifficulty.hard / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
