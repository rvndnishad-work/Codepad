/**
 * A candidate's rounds as a row of short bars, one per round (skipped ones
 * left out): above bar, below bar, did not finish, waiting for review,
 * booked or sent, not started, stopped. The round a row is about can be
 * marked. `RoundLegend` explains the colours under a list that shows them.
 */
import type { CSSProperties } from "react";
import type { Segment } from "@/lib/interview/rounds";

const STRIPES: CSSProperties = {
  backgroundImage: "repeating-linear-gradient(135deg, rgb(var(--c-danger)) 0 3px, transparent 3px 6px)",
};

const SEG: Record<Segment, { cls: string; label: string; style?: CSSProperties }> = {
  above: { cls: "bg-success", label: "above bar" },
  below: { cls: "bg-danger", label: "below bar" },
  dnf: { cls: "border border-danger/70", label: "did not finish", style: STRIPES },
  review: { cls: "bg-warning", label: "awaiting review" },
  scheduled: { cls: "border-[1.5px] border-secondary-soft", label: "scheduled or invited" },
  open: { cls: "bg-border-strong", label: "not started" },
  off: { cls: "border border-border-strong", label: "skipped or stopped" },
};

const SIZE = { sm: "h-1.5 w-3", md: "h-[7px] w-[18px]", full: "h-1.5 flex-1 min-w-0" } as const;

export function RoundStrip({
  items,
  className = "",
  size = "sm",
  then = null,
}: {
  items: { seg: Segment; name: string; here?: boolean }[];
  className?: string;
  size?: keyof typeof SIZE;
  /** The plan continues in this ATS after its last round ("Greenhouse"). */
  then?: string | null;
}) {
  const lines = items.map((i, n) => `${n + 1}. ${i.name}: ${SEG[i.seg].label}${i.here ? " (this interview)" : ""}`);
  if (then) lines.push(`Then ${then}: later rounds are not tracked here`);
  const title = lines.join("\n");
  return (
    <span
      className={`${size === "full" ? "flex w-full gap-1" : `inline-flex ${size === "md" ? "gap-[3px]" : "gap-[2px]"} shrink-0`} items-center ${className}`}
      title={title}
      role="img"
      aria-label={`Rounds: ${items.map((i) => `${i.name} ${SEG[i.seg].label}`).join(", ")}${then ? `, then ${then}` : ""}`}
    >
      {items.map((i, n) => (
        <span
          key={n}
          style={SEG[i.seg].style}
          className={`block box-border ${SIZE[size]} rounded-full ${SEG[i.seg].cls} ${i.here ? "ring-2 ring-fg/60 ring-offset-1 ring-offset-surface" : ""}`}
        />
      ))}
      {then &&
        (size === "sm" ? (
          <span className="text-[10px] leading-none text-subtle pl-0.5" aria-hidden>
            →
          </span>
        ) : (
          <span className="shrink-0 whitespace-nowrap pl-1 text-[11px] leading-none text-subtle" aria-hidden>
            then {then}
          </span>
        ))}
    </span>
  );
}

export function RoundLegend({ className = "" }: { className?: string }) {
  return (
    <ul aria-label="What the round colours mean" className={`flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted ${className}`}>
      {(Object.keys(SEG) as Segment[]).map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <span style={SEG[k].style} className={`block box-border ${SIZE.md} rounded-full ${SEG[k].cls}`} aria-hidden />
          {SEG[k].label.charAt(0).toUpperCase() + SEG[k].label.slice(1)}
        </li>
      ))}
    </ul>
  );
}
