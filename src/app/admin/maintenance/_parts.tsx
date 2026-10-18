import Link from "next/link";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";

/** "Sat 4 Oct, 01:00 UTC". Times on these pages are shown in UTC. */
export function fmtUtc(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const day = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `${day}, ${date.toISOString().slice(11, 16)} UTC`;
}

export function fmtWindow(startsAt: Date | null, endsAt: Date | null, createdAt?: Date): string {
  const start = startsAt ?? createdAt ?? null;
  const from = start ? fmtUtc(start) : "now";
  if (!endsAt) return `${from}, until brought back`;
  const sameDay = start && start.toISOString().slice(0, 10) === endsAt.toISOString().slice(0, 10);
  return `${from} to ${sameDay ? `${endsAt.toISOString().slice(11, 16)} UTC` : fmtUtc(endsAt)}`;
}

export function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 48) return m ? `${h} h ${m} min` : `${h} h`;
  return `${Math.round(h / 24)} days`;
}

export function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export type PillTone = "ok" | "warn" | "bad" | "off";
const TONES: Record<PillTone, string> = {
  ok: "bg-success/10 text-success border-success/25",
  warn: "bg-warning/10 text-warning border-warning/25",
  bad: "bg-danger/10 text-danger border-danger/25",
  off: "bg-panel text-muted border-border",
};

export function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full border text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function OpsHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="text-xs font-semibold text-secondary-soft">Operations</div>
        <h1 className="text-2xl font-semibold tracking-tight mt-0.5">{title}</h1>
        <p className="text-sm text-muted mt-1 max-w-2xl">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function OpsTabs({ active }: { active: "pages" | "switches" | "history" }) {
  return (
    <UnderlineTabs
      label="Maintenance sections"
      active={active}
      tabs={[
        { id: "pages", label: "Pages and areas", href: "/admin/maintenance" },
        { id: "switches", label: "Feature switches", href: "/admin/switches" },
        { id: "history", label: "History", href: "/admin/maintenance?tab=history" },
      ]}
    />
  );
}

export function PrevNext({
  page,
  total,
  perPage,
  href,
}: {
  page: number;
  total: number;
  perPage: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const btn = "h-8 px-3 inline-flex items-center rounded-lg border border-border text-sm";
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-muted">
      <span>
        Page {page} of {pages} · {total} in all
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={`${btn} hover:bg-panel text-fg`}>Previous</Link>
        ) : (
          <span className={`${btn} text-subtle`}>Previous</span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={`${btn} hover:bg-panel text-fg`}>Next</Link>
        ) : (
          <span className={`${btn} text-subtle`}>Next</span>
        )}
      </div>
    </div>
  );
}
