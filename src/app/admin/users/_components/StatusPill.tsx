import type { AccountState } from "@/lib/auth-gate";
import { fmtDayTime, fmtShort } from "../_lib/format";

const STYLE: Record<AccountState, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-success/10 text-success border-success/25" },
  unverified: { label: "Unverified", cls: "bg-warning/10 text-warning border-warning/25" },
  suspended: { label: "Suspended", cls: "bg-danger/10 text-danger border-danger/25" },
  deleted: { label: "Deleted", cls: "bg-panel text-muted border-border" },
};

export default function StatusPill({ state, until }: { state: AccountState; until?: string | null }) {
  const s = STYLE[state];
  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-full border text-xs font-medium whitespace-nowrap ${s.cls}`}
      title={state === "suspended" && until ? `Until ${fmtDayTime(until)}` : undefined}
    >
      {s.label}
      {state === "suspended" && until && (
        <span className="font-normal opacity-80">· until {fmtShort(until)}</span>
      )}
    </span>
  );
}

export function SmallPill({ tone, children }: { tone: "ok" | "warn" | "bad" | "off"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-success/10 text-success border-success/25",
    warn: "bg-warning/10 text-warning border-warning/25",
    bad: "bg-danger/10 text-danger border-danger/25",
    off: "bg-panel text-muted border-border",
  }[tone];
  return <span className={`inline-flex items-center h-6 px-2 rounded-full border text-xs font-medium whitespace-nowrap ${cls}`}>{children}</span>;
}
