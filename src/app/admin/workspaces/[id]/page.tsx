import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { planLabel } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace } from "./_data";
import { Card, Kpi, Kv, Pill, fmtDate, fmtUsd } from "./_ui";

export const metadata = { title: "Workspace overview — Interviewpad Admin" };

const DAY = 86_400_000;

type Props = { params: Promise<{ id: string }> };

export default async function WorkspaceOverviewPage({ params }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY);
  const [balance, screenings30, takeHomes30, interviews30, lastActive, ats, lockedBy, deletionBy] = await Promise.all([
    prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId: id }, _sum: { amount: true } }),
    prisma.aIInterviewSession.count({ where: { workspaceId: id, createdAt: { gte: since30 } } }),
    prisma.interviewSession.count({ where: { workspaceId: id, type: "take-home", createdAt: { gte: since30 } } }),
    prisma.interviewSession.count({ where: { workspaceId: id, type: { not: "take-home" }, createdAt: { gte: since30 } } }),
    prisma.workspaceMember.aggregate({ where: { workspaceId: id }, _max: { lastActiveAt: true } }),
    prisma.atsIntegration.findUnique({ where: { workspaceId: id }, select: { provider: true } }),
    ws.lockedById ? prisma.user.findUnique({ where: { id: ws.lockedById }, select: { name: true, email: true } }) : null,
    ws.deletionRequestedById ? prisma.user.findUnique({ where: { id: ws.deletionRequestedById }, select: { name: true, email: true } }) : null,
  ]);
  const credits = balance._sum.amount ?? 0;
  const yes = (b: boolean) => <Pill tone={b ? "ok" : "off"}>{b ? "On" : "Off"}</Pill>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi label="Members" value={ws.counts.members} hint={ws.counts.pendingInvites ? `${ws.counts.pendingInvites} invites pending` : "No pending invites"} />
        <Kpi label="Candidates" value={ws.counts.candidates} />
        <Kpi label="AI screenings" value={ws.counts.aiScreenings} hint={`${screenings30} in 30 days`} />
        <Kpi label="Take homes" value={ws.counts.takeHomes} hint={`${takeHomes30} in 30 days`} />
        <Kpi label="Interviews" value={ws.counts.interviews} hint={`${interviews30} in 30 days`} />
        <Kpi label="AI credits" value={credits} hint={`${Math.min(ws.includedCreditsLeft, Math.max(0, credits))} included`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Card title="Plan and billing">
          <Kv k="Plan">{planLabel(ws.planName)}</Kv>
          <Kv k="Stripe status">{ws.stripeStatus ?? <span className="text-muted">None</span>}</Kv>
          <Kv k="MRR">{ws.stripeMrrCents != null ? fmtUsd(ws.stripeMrrCents) : <span className="text-muted">Not synced</span>}</Kv>
          <Kv k="Seats billed">{ws.stripeSeatQuantity ?? <span className="text-muted">Not synced</span>}</Kv>
          <Kv k="Trial ends">{ws.trialEndsAt ? fmtDate(ws.trialEndsAt) : <span className="text-muted">No trial</span>}</Kv>
          <Kv k="Trial ended (recorded)">{ws.trialEndedAt ? fmtDate(ws.trialEndedAt) : <span className="text-muted">No</span>}</Kv>
          <Kv k="Included credits left">{ws.includedCreditsLeft}</Kv>
          <Kv k="Last monthly grant">
            {ws.includedCreditsGrantedAt ? `${ws.includedCreditsLastGrant} on ${fmtDate(ws.includedCreditsGrantedAt)}` : <span className="text-muted">Never</span>}
          </Kv>
          <Kv k="Low credit threshold">{ws.lowCreditThreshold ?? <span className="text-muted">Off</span>}</Kv>
          <Kv k="Video add-on">{ws.videoEnabled ? `On since ${fmtDate(ws.videoEnabledAt)}` : "Off"}</Kv>
        </Card>

        <Card title="Access and security">
          <Kv k="Locked">
            {ws.lockedAt ? (
              <span>
                <Pill tone="bad">Locked</Pill> {fmtDate(ws.lockedAt)}
                {lockedBy ? ` by ${lockedBy.name ?? lockedBy.email}` : ""}
              </span>
            ) : (
              "No"
            )}
          </Kv>
          {ws.lockedReason && <Kv k="Lock reason">{ws.lockedReason}</Kv>}
          <Kv k="Deletion scheduled">
            {ws.deletionScheduledAt ? (
              <span>
                <Pill tone="bad">Erased {fmtDate(new Date(ws.deletionScheduledAt.getTime() + 30 * DAY))}</Pill>
                {deletionBy ? ` by ${deletionBy.name ?? deletionBy.email}` : ""}
              </span>
            ) : (
              "No"
            )}
          </Kv>
          <Kv k="Two-factor for everyone">
            {yes(ws.require2faForAll)}
            {ws.require2faForAll && ws.require2faFrom ? ` from ${fmtDate(ws.require2faFrom)}` : ""}
          </Kv>
          <Kv k="Allowed email domains">{ws.allowedEmailDomains.length ? ws.allowedEmailDomains.join(", ") : <span className="text-muted">Any</span>}</Kv>
          <Kv k="Join without invite">{ws.joinWithoutInvite ? `Yes, as ${ws.joinRole.toLowerCase()}` : "No"}</Kv>
          <Kv k="Sign-in lasts">{ws.sessionMaxAgeDays ? `${ws.sessionMaxAgeDays} days` : <span className="text-muted">Site default</span>}</Kv>
          <Kv k="External tools in screenings">{yes(ws.allowExternalMcp)}</Kv>
        </Card>

        <Card title="Activity">
          <Kv k="Last member activity">{lastActive._max.lastActiveAt ? fmtDate(lastActive._max.lastActiveAt, true) : <span className="text-muted">Never</span>}</Kv>
          <Kv k="ATS">{ats?.provider ?? <span className="text-muted">Not connected</span>}</Kv>
          <Kv k="Hiring type">{ws.hiringType.replace("_", " ")}</Kv>
          <Kv k="Recordings">{ws.counts.recordings}</Kv>
          <Kv k="Workspace questions">
            <Link className="text-secondary-soft hover:underline" href={`/admin/workspaces/${id}/challenges`}>
              {ws.counts.challenges}
            </Link>
          </Kv>
          <Kv k="Question attempts">
            <Link className="text-secondary-soft hover:underline" href={`/admin/workspaces/${id}/attempts`}>
              {ws.counts.attempts}
            </Link>
          </Kv>
          <Kv k="Stripe customer">{ws.stripeCustomerId ? <span className="font-mono text-xs">{ws.stripeCustomerId}</span> : <span className="text-muted">None</span>}</Kv>
          <Kv k="Stripe subscription">
            {ws.stripeSubscriptionId ? <span className="font-mono text-xs">{ws.stripeSubscriptionId}</span> : <span className="text-muted">None</span>}
          </Kv>
        </Card>
      </div>
    </div>
  );
}
