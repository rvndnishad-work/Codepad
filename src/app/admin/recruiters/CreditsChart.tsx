import type { HiringStats } from "@/lib/admin/stats/hiring";
import { bucketDays, num, shortDay } from "./kpis";

/**
 * AI credits used a day as plain div bars: muted indigo, the peak in the full
 * indigo step, first and last date under the bars. 12 months is shown by week.
 */
export default function CreditsChart({ stats }: { stats: HiringStats }) {
  const c = stats.credits;
  const weekly = stats.range === 365;
  const bars = bucketDays(c.days, weekly ? 7 : 1);
  const max = Math.max(1, ...bars.map((b) => b.used));
  let peakIdx = -1;
  bars.forEach((b, i) => {
    if (b.used > 0 && (peakIdx < 0 || b.used >= bars[peakIdx].used)) peakIdx = i;
  });
  const peak = peakIdx >= 0 ? bars[peakIdx] : null;
  const gap = bars.length > 60 ? "gap-px" : bars.length > 31 ? "gap-0.5" : "gap-1.5";
  const label = (b: (typeof bars)[number]) => (weekly ? `week of ${shortDay(b.start)}` : shortDay(b.start));

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="credits-chart">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="credits-chart" className="flex-1 text-[15px] font-semibold text-fg">
          AI credits {weekly ? "a week" : "a day"}
        </h2>
        <span className="inline-flex h-6 items-center rounded-full bg-panel px-2.5 text-xs font-medium text-muted">
          Included {num(c.included)}
          {c.estimated ? " est." : ""}
        </span>
        <span className="inline-flex h-6 items-center rounded-full bg-panel px-2.5 text-xs font-medium text-muted">Bought {num(c.bought)}</span>
        <span className="inline-flex h-6 items-center rounded-full bg-warning/10 px-2.5 text-xs font-medium text-warning">Refunded {num(c.refunded)}</span>
      </div>

      {c.used === 0 ? (
        <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
          No AI credits used in this range.
        </div>
      ) : (
        <div className={`flex h-[120px] items-end pt-2 ${gap}`} role="img" aria-label={`AI credits used ${weekly ? "per week" : "per day"}; peak ${peak ? num(peak.used) : 0}`}>
          {bars.map((b, i) => (
            <div
              key={b.start}
              title={`${label(b)}: ${num(b.used)} used${b.refunded ? `, ${num(b.refunded)} refunded` : ""}`}
              className={`min-w-0 flex-1 rounded-t-[3px] ${i === peakIdx ? "bg-[rgb(var(--c-accent-2))]" : "bg-secondary/50"}`}
              style={{ height: `${b.used > 0 ? Math.max(3, (b.used / max) * 100) : 1}%` }}
            />
          ))}
        </div>
      )}

      <div className="flex justify-between gap-2 text-xs text-muted">
        <span>{bars.length ? shortDay(bars[0].start) : ""}</span>
        <span className="truncate">{peak ? `Peak ${num(peak.used)} ${weekly ? "in the " : "on "}${label(peak)}` : ""}</span>
        <span>{bars.length ? shortDay(bars[bars.length - 1].end) : ""}</span>
      </div>
      {c.estimated && (
        <p className="text-xs text-subtle">
          The ledger does not say which pool a screening used, so the included and bought split is an estimate until the daily roll-up covers the range.
        </p>
      )}
    </section>
  );
}
