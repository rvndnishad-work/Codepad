import { type ReactNode } from "react";

// Shared stat primitives used by the homepage and the /challenges header.
// Kept in one place so the design language stays consistent across surfaces.
//
// These are readouts, not cards: a square frame, the measurement's name set as
// monospaced metadata above, and the figure itself in the display voice with
// tabular figures so a column of them aligns. Tone is carried by a single
// 5px marker square — the same marker the signal strip uses — rather than by
// a coloured rounded icon chip.

export type StatTone = "emerald" | "amber" | "accent" | "rose";

const markerClasses: Record<StatTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  accent: "bg-accent",
  rose: "bg-rose-500",
};

const iconClasses: Record<StatTone, string> = {
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  accent: "text-accent",
  rose: "text-rose-500",
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
    <div className="ip-frame flex h-full flex-col justify-between gap-6 p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-start gap-2">
          <span className={`mt-1 h-[5px] w-[5px] shrink-0 ${markerClasses[tone]}`} aria-hidden />
          <span className="ip-label">{label}</span>
        </span>
        <span className={`shrink-0 opacity-40 ${iconClasses[tone]}`} aria-hidden>
          {icon}
        </span>
      </div>
      <div className="ip-nums text-3xl font-bold leading-none text-fg">{value}</div>
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
    <div className="ip-frame flex h-full flex-col justify-between gap-6 p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <span className="ip-label">Difficulty mix</span>
        <span className="ip-nums font-mono text-[11px] text-subtle">{total}</span>
      </div>
      <div>
        {/* Square-ended segments: this is a measurement bar, not a pill. */}
        <div className="flex h-1.5 overflow-hidden bg-border" aria-hidden>
          <div className="bg-emerald-500" style={{ width: `${pe}%` }} />
          <div className="bg-amber-500" style={{ width: `${pm}%` }} />
          <div className="bg-rose-500" style={{ width: `${ph}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between font-mono text-[11px]">
          <span className="text-emerald-600 dark:text-emerald-400">{easy} easy</span>
          <span className="text-amber-600 dark:text-amber-400">{medium} med</span>
          <span className="text-rose-600 dark:text-rose-400">{hard} hard</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Personal progress variant — `solved / total` with a segmented bar split by
 * difficulty. Used on /challenges when the user is signed in.
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
    <div className="ip-frame flex h-full flex-col justify-between gap-6 p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-start gap-2">
          <span className="mt-1 h-[5px] w-[5px] shrink-0 bg-accent" aria-hidden />
          <span className="ip-label">Solved</span>
        </span>
        <span className="ip-nums font-mono text-[11px] text-subtle">{pct}%</span>
      </div>
      <div>
        <div className="ip-nums text-3xl font-bold leading-none text-fg">
          {solved}
          <span className="text-lg font-semibold text-subtle">/{total}</span>
        </div>
        {byDifficulty && total > 0 && (
          <div className="mt-4 flex h-1.5 overflow-hidden bg-border" aria-hidden>
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
    </div>
  );
}
