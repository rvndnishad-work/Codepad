export type PillTone = "ok" | "warn" | "bad" | "off" | "info";

const TONE: Record<PillTone, string> = {
  ok: "bg-success/10 text-success",
  warn: "bg-warning/10 text-warning",
  bad: "bg-danger/10 text-danger",
  off: "bg-panel text-muted",
  info: "bg-secondary/10 text-secondary",
};

/** Small status pill, readable in both themes. */
export default function Pill({ tone, children, title }: { tone: PillTone; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-xs font-medium whitespace-nowrap ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
