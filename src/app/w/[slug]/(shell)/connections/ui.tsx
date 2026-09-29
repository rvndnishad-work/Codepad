"use client";

/** Small shared pieces for the Connections pages. */

export type Tone = "positive" | "negative" | "attention" | "neutral" | "accent";

const CHIP: Record<Tone, string> = {
  positive: "bg-success/10 text-success",
  negative: "bg-danger/10 text-danger",
  attention: "bg-warning/10 text-warning",
  neutral: "bg-panel text-muted",
  accent: "bg-secondary/10 text-secondary",
};

export function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center h-[22px] px-2 rounded-full text-xs font-medium whitespace-nowrap ${CHIP[tone]}`}>{children}</span>
  );
}

export const btn =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel transition disabled:opacity-50 disabled:cursor-not-allowed";
export const btnSm =
  "inline-flex items-center justify-center gap-1 h-[30px] px-2.5 rounded-lg border border-border bg-surface text-[13px] font-medium text-fg hover:bg-panel transition disabled:opacity-50";
export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-surface text-sm font-medium text-danger hover:bg-danger/5 transition disabled:opacity-50";
export const input =
  "h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/40";

export function formatWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export async function copyText(text: string, toast: { success: (m: string) => void; error: (m: string) => void }) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    toast.error("Could not copy. Select the text and copy it yourself.");
  }
}
