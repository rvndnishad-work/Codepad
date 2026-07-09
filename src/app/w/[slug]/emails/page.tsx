/**
 * Workspace Email activity (IP-27 follow-on). Recruiter-facing, OWNER/ADMIN
 * only — mirrors the audit-log route's gating. Strictly scoped to this
 * workspace's EmailLog rows (workspaceId filter); the global suppression list
 * is admin-only and intentionally NOT surfaced here (cross-workspace data).
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { canMember } from "@/lib/permissions";
import { Mail } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title: `Email activity · ${slug} — Interviewpad`,
    robots: { index: false, follow: false },
  };
}

const STATUS_TONE: Record<string, string> = {
  queued: "text-muted bg-panel border-border",
  sent: "text-sky-300 bg-sky-500/10 border-sky-500/25",
  delivered: "text-emerald-300 bg-emerald-500/10 border-emerald-500/25",
  opened: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  clicked: "text-emerald-200 bg-emerald-500/20 border-emerald-500/40",
  bounced: "text-rose-300 bg-rose-500/10 border-rose-500/25",
  complained: "text-rose-300 bg-rose-500/15 border-rose-500/30",
  failed: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  suppressed: "text-muted bg-panel border-border",
};

// Friendly labels for the template keys recruiters will recognize.
const TEMPLATE_LABEL: Record<string, string> = {
  "ai-screening-invite": "AI screening invite",
  "screening-completed": "AI screening completed",
  "take-home-invite": "Take-home invite",
  "take-home-session-invite": "Take-home invite",
  "take-home-reminder": "Take-home reminder",
  "take-home-submitted-candidate": "Take-home receipt (candidate)",
  "take-home-submitted-recruiter": "Take-home submitted (you)",
};

function timeAgo(d: Date | null | undefined): string {
  if (!d) return "—";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default async function WorkspaceEmailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/emails`)}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();

  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");
  // Same compliance gating as the audit log.
  if (!(await canMember(member, "email:read"))) {
    redirect(`/w/${slug}`);
  }

  const [logs, statusCounts] = await Promise.all([
    prisma.emailLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        template: true,
        recipientEmail: true,
        status: true,
        errorReason: true,
        createdAt: true,
        lastEventAt: true,
      },
    }),
    prisma.emailLog.groupBy({
      by: ["status"],
      where: { workspaceId: workspace.id },
      _count: { status: true },
    }),
  ]);

  const counts = Object.fromEntries(statusCounts.map((c) => [c.status, c._count.status]));
  const total = statusCounts.reduce((a, c) => a + c._count.status, 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-500/80 flex items-center gap-1.5">
          <Mail className="w-3 h-3" /> Workspace
        </div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight mt-1">Email activity</h1>
        <p className="text-xs text-muted mt-1">
          Delivery status for emails this workspace has sent — invites, reminders,
          and submission notifications. Updated as recipients open or bounce.
        </p>
      </div>

      {/* Status rollup */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {["sent", "delivered", "opened", "clicked", "bounced", "failed"].map((s) => (
          <div key={s} className={`rounded-lg border p-2.5 ${STATUS_TONE[s] ?? "border-border"}`}>
            <div className="text-[9px] uppercase tracking-wider font-semibold opacity-80">{s}</div>
            <div className="text-xl font-bold tabular-nums mt-0.5">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <Mail className="w-6 h-6 text-muted/50 mx-auto mb-2" />
          <p className="text-sm font-semibold text-fg">No emails sent yet</p>
          <p className="text-xs text-muted mt-1">
            Assign a take-home or AI screening and its emails will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated/50">
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Recipient</th>
                <th className="px-4 py-2.5 font-semibold">Sent</th>
                <th className="px-4 py-2.5 font-semibold">Last event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-panel/30">
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${
                        STATUS_TONE[l.status] ?? "border-border text-muted"
                      }`}
                      title={l.errorReason ?? undefined}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-fg">
                    {TEMPLATE_LABEL[l.template] ?? l.template}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-fg truncate max-w-[240px]">
                    {l.recipientEmail}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-muted whitespace-nowrap">
                    {timeAgo(l.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-muted whitespace-nowrap">
                    {timeAgo(l.lastEventAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-muted/70">{total} emails sent from this workspace.</p>
    </div>
  );
}
