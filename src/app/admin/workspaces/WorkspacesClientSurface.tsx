import Link from "next/link";
import { planLabel, workspaceStatusPills } from "@/lib/admin/workspace-actions";
import { Empty, Pill, Table, fmtDate, fmtUsd, td } from "./[id]/_ui";

/**
 * The workspaces table. Plain rows, server paged by the page; every action
 * (plan, lock, deletion) lives on the workspace detail page, where it goes
 * through Stripe and the audit log. The old hard delete and the LOCKED plan
 * are gone.
 */
export type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  planName: string;
  createdAt: Date;
  trialEndsAt: Date | null;
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  stripePastDueSince: Date | null;
  lockedAt: Date | null;
  deletionScheduledAt: Date | null;
  members: number;
  seatsBilled: number | null;
  mrrCents: number | null;
  credits: number;
  lastActive: Date | null;
};

export default function WorkspacesClientSurface({ rows, filtered }: { rows: WorkspaceRow[]; filtered: boolean }) {
  if (rows.length === 0) return <Empty>{filtered ? "No workspaces match." : "No workspaces yet."}</Empty>;
  return (
    <Table head={["Workspace", "Plan", "Status", "Members / seats billed", "MRR", "AI credits", "Last activity", "Created"]}>
      {rows.map((w) => {
        const pills = workspaceStatusPills(w);
        const unbilled = w.seatsBilled !== null && w.members > w.seatsBilled;
        return (
          <tr key={w.id} className="hover:bg-panel/40">
            <td className="px-4 py-2.5">
              <Link href={`/admin/workspaces/${w.id}`} className="font-medium text-fg hover:underline">
                {w.name}
              </Link>
              <div className="text-xs text-muted font-mono">{w.slug}</div>
            </td>
            <td className={td}>{planLabel(w.planName)}</td>
            <td className={td}>
              <span className="flex flex-wrap gap-1">
                {pills.length ? pills.map((p) => <Pill key={p.label} tone={p.tone}>{p.label}</Pill>) : <span className="text-muted">None</span>}
              </span>
            </td>
            <td className={`${td} tabular-nums whitespace-nowrap`}>
              {w.members} / {w.seatsBilled ?? <span className="text-muted">none</span>}
              {unbilled && (
                <span className="ml-1.5">
                  <Pill tone="warn">{w.members - w.seatsBilled!} unbilled</Pill>
                </span>
              )}
            </td>
            <td className={`${td} tabular-nums`}>{w.mrrCents != null ? fmtUsd(w.mrrCents) : <span className="text-muted">None</span>}</td>
            <td className={`${td} tabular-nums`}>{w.credits}</td>
            <td className={`${td} text-muted whitespace-nowrap`}>{w.lastActive ? fmtDate(w.lastActive) : "Never"}</td>
            <td className={`${td} text-muted whitespace-nowrap`}>{fmtDate(w.createdAt)}</td>
          </tr>
        );
      })}
    </Table>
  );
}
