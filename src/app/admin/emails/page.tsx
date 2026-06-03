/**
 * Admin email observability (IP-25 AC #6).
 *
 * Shows:
 *   - last 100 EmailLog rows with status, template, recipient, age
 *   - per-status counts across the most-recent rows
 *   - the EmailSuppression list (hard bounces + complaints from Resend webhook)
 *
 * Read-only for now. Admin-only via the parent /admin layout (which already
 * 404s non-admins). 2FA enrollment is also required (IP-42 AC #6 gate).
 */
import { prisma } from "@/lib/prisma";
import { Mail, AlertTriangle, ShieldOff } from "lucide-react";

export const metadata = {
  title: "Emails — Interviewpad Admin",
  robots: { index: false, follow: false },
};

const STATUS_TONE: Record<string, string> = {
  queued: "text-muted bg-muted/10 border-muted/20",
  sent: "text-sky-300 bg-sky-500/10 border-sky-500/25",
  delivered: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  opened: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  clicked: "text-emerald-200 bg-emerald-500/20 border-emerald-500/40",
  bounced: "text-rose-300 bg-rose-500/10 border-rose-500/25",
  complained: "text-rose-300 bg-rose-500/15 border-rose-500/30",
  failed: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  suppressed: "text-muted bg-panel border-border",
};

function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const t = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(0, Math.floor((Date.now() - t.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default async function AdminEmailsPage() {
  const [logs, statusCounts, suppressions, suppressionTotal] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        template: true,
        recipientEmail: true,
        status: true,
        errorReason: true,
        providerId: true,
        createdAt: true,
        lastEventAt: true,
      },
    }),
    prisma.emailLog.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.emailSuppression.findMany({
      orderBy: { addedAt: "desc" },
      take: 50,
      select: { id: true, address: true, reason: true, addedAt: true, note: true },
    }),
    prisma.emailSuppression.count(),
  ]);

  const counts = Object.fromEntries(statusCounts.map((c) => [c.status, c._count.status]));
  const total = statusCounts.reduce((acc, c) => acc + c._count.status, 0);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400 flex items-center gap-1.5">
            <Mail className="w-3 h-3" /> Transactional email
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">Emails</h1>
          <p className="text-xs text-muted mt-1">
            Last 100 sends + per-status rollup. Updated by the Resend webhook
            ({" "}<code className="font-mono text-[11px]">/api/webhooks/resend</code>{" "}).
          </p>
        </div>
      </header>

      {/* Status rollup */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {["queued", "sent", "delivered", "opened", "bounced", "complained", "failed", "suppressed"].map((s) => (
          <div
            key={s}
            className={`rounded-xl border p-3 ${STATUS_TONE[s] ?? "border-border"}`}
          >
            <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{s}</div>
            <div className="text-2xl font-bold tabular-nums mt-0.5">{counts[s] ?? 0}</div>
          </div>
        ))}
      </section>
      <p className="text-[11px] text-muted -mt-4">{total} total log rows.</p>

      {/* Log table */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Recent sends</h2>
        {logs.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
            No emails sent yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-elevated/50">
                <tr className="text-[10px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">Template</th>
                  <th className="px-4 py-2.5 font-bold">Recipient</th>
                  <th className="px-4 py-2.5 font-bold">Sent</th>
                  <th className="px-4 py-2.5 font-bold">Last event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-panel/40">
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
                          STATUS_TONE[l.status] ?? "border-border text-muted"
                        }`}
                        title={l.errorReason ?? undefined}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-fg">{l.template}</td>
                    <td className="px-4 py-2.5 text-xs text-fg truncate max-w-[280px]">
                      {l.recipientEmail}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted whitespace-nowrap">{timeAgo(l.createdAt)}</td>
                    <td className="px-4 py-2.5 text-[11px] text-muted whitespace-nowrap">{timeAgo(l.lastEventAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Suppression list */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
          <ShieldOff className="w-3.5 h-3.5" /> Suppression list
          <span className="text-[10px] text-muted/70 normal-case tracking-normal font-normal">
            {suppressionTotal} addresses
          </span>
        </h2>
        {suppressions.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-xs text-muted">
            No suppressed addresses. (Resend webhook auto-adds hard bounces + complaints.)
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-elevated/50">
                <tr className="text-[10px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5 font-bold">Address</th>
                  <th className="px-4 py-2.5 font-bold">Reason</th>
                  <th className="px-4 py-2.5 font-bold">Added</th>
                  <th className="px-4 py-2.5 font-bold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {suppressions.map((s) => (
                  <tr key={s.id} className="hover:bg-panel/40">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-fg">{s.address}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${
                          s.reason === "complaint"
                            ? "text-rose-300 border-rose-500/30 bg-rose-500/10"
                            : "text-amber-300 border-amber-500/30 bg-amber-500/10"
                        }`}
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {s.reason}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted whitespace-nowrap">{timeAgo(s.addedAt)}</td>
                    <td className="px-4 py-2.5 text-[11px] text-muted truncate max-w-[300px]">{s.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
