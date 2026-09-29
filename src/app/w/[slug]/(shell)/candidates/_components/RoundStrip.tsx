/**
 * A candidate's rounds as a row of short bars, one per round (skipped ones
 * left out): above bar, below bar, did not finish, waiting for review,
 * booked, not started. The round a row is about can be marked.
 */
import type { Segment } from "@/lib/interview/rounds";

const SEG: Record<Segment, { cls: string; label: string }> = {
  above: { cls: "bg-success", label: "above bar" },
  below: { cls: "bg-danger", label: "below bar" },
  dnf: { cls: "bg-warning", label: "did not finish" },
  review: { cls: "bg-secondary-soft", label: "waiting for review" },
  scheduled: { cls: "bg-secondary/40", label: "booked or sent" },
  open: { cls: "bg-border-strong", label: "not started" },
  off: { cls: "bg-panel", label: "stopped" },
};

export function RoundStrip({ items, className = "" }: { items: { seg: Segment; name: string; here?: boolean }[]; className?: string }) {
  const title = items.map((i, n) => `${n + 1}. ${i.name}: ${SEG[i.seg].label}${i.here ? " (this interview)" : ""}`).join("\n");
  return (
    <span className={`inline-flex items-center gap-[2px] shrink-0 ${className}`} title={title} role="img" aria-label={`Rounds: ${items.map((i) => `${i.name} ${SEG[i.seg].label}`).join(", ")}`}>
      {items.map((i, n) => (
        <span key={n} className={`block h-1.5 w-3 rounded-full ${SEG[i.seg].cls} ${i.here ? "ring-2 ring-fg/60 ring-offset-1 ring-offset-surface" : ""}`} />
      ))}
    </span>
  );
}
