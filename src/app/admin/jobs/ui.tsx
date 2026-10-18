/** Small presentational pieces shared by Home, Jobs and Audit. Server-safe. */
import type { Tone } from "./health";

const PILL: Record<Tone | "info", string> = {
  ok: "bg-success/15 text-success",
  warn: "bg-warning/15 text-warning",
  bad: "bg-danger/15 text-danger",
  off: "bg-panel text-muted",
  info: "bg-secondary/15 text-secondary-soft",
};

export function Pill({ tone, children, className = "" }: { tone: Tone | "info"; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center h-[22px] px-2 rounded-full text-xs font-medium whitespace-nowrap ${PILL[tone]} ${className}`}>
      {children}
    </span>
  );
}

const DOT: Record<Tone, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  bad: "bg-danger",
  off: "bg-subtle",
};

export function Dot({ tone }: { tone: Tone }) {
  return <span aria-hidden className={`inline-block w-2 h-2 rounded-full shrink-0 ${DOT[tone]}`} />;
}

export function timeAgo(d: Date | string | null | undefined, now = Date.now()): string {
  if (!d) return "Never";
  const t = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(0, Math.floor((now - t.getTime()) / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86400);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export function duration(start: Date, end: Date | null): string {
  if (!end) return "—";
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

export const cardCls = "rounded-xl border border-border bg-surface";

const BTN = {
  primary: "bg-secondary text-bg hover:brightness-110",
  ghost: "border border-border bg-surface text-fg hover:bg-panel",
  quiet: "text-muted hover:text-fg hover:bg-panel",
} as const;

/** Same look as the workspace Btn, for links and plain buttons on server pages. */
export function btnCls(variant: keyof typeof BTN = "ghost", size: "sm" | "md" = "sm"): string {
  const s = size === "md" ? "h-9 px-3.5" : "h-8 px-3";
  return `inline-flex items-center justify-center gap-1.5 ${s} rounded-lg text-[13px] font-medium whitespace-nowrap transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${BTN[variant]}`;
}

export const inputCls =
  "h-9 rounded-lg border border-border bg-bg px-3 text-[13px] text-fg placeholder:text-subtle focus:outline-none focus:border-secondary/60 focus:ring-2 focus:ring-secondary/20";
