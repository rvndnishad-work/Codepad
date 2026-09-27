import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { planSummary } from "@/lib/billing/summary";
import { PLAN_COMPARISON, PLAN_ORDER, WORKSPACE_PLANS, priceLabel } from "@/lib/billing/plans";
import { seatUsage } from "@/lib/workspace/members";
import { getWorkspaceCredits } from "@/lib/ai-interview/credits";
import BillingClient, { type BillingTab } from "./BillingClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; billing_success?: string; billing_cancel?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Billing and plan · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

export default async function BillingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab: BillingTab = sp.tab === "invoices" ? "invoices" : "plan";

  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/billing`)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      planName: true,
      trialEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();
  const me = workspace.members.find((m) => m.userId === session.user.id);
  if (!me) redirect("/dashboard");
  if (!(await canMember(me, "billing:read"))) redirect(`/w/${slug}`);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [canManage, pendingInvites, credits, takeHomeSessions, takeHomeLegacy, aiScreenings, interviews] = await Promise.all([
    canMember(me, "billing:manage"),
    prisma.workspaceInvite.count({ where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: now } } }),
    getWorkspaceCredits(workspace.id),
    prisma.interviewSession.count({ where: { workspaceId: workspace.id, type: "take-home", createdAt: { gte: monthStart } } }),
    prisma.takeHomeAssignment.count({ where: { workspaceId: workspace.id, createdAt: { gte: monthStart } } }),
    prisma.aIInterviewSession.count({ where: { workspaceId: workspace.id, practice: false, createdAt: { gte: monthStart } } }),
    prisma.interviewSession.count({ where: { workspaceId: workspace.id, type: { not: "take-home" }, createdAt: { gte: monthStart } } }),
  ]);

  const summary = planSummary(workspace, now);
  const seats = seatUsage(workspace, { members: workspace.members.length, pendingInvites }, now);
  const subscribed = Boolean(workspace.stripeCustomerId && workspace.stripeSubscriptionId);

  return (
    <BillingClient
      slug={slug}
      tab={tab}
      notice={sp.billing_success ? "success" : sp.billing_cancel ? "cancel" : null}
      planName={workspace.planName}
      summary={summary}
      seats={seats}
      credits={credits}
      aiScreening={growthToolsEnabled(workspace, now)}
      month={{
        takeHomes: takeHomeSessions + takeHomeLegacy,
        aiScreenings,
        interviews,
        label: now.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }),
      }}
      canManage={canManage}
      subscribed={subscribed}
      stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY)}
      compare={{
        plans: PLAN_ORDER.map((k) => ({
          key: k,
          name: WORKSPACE_PLANS[k].name,
          price: priceLabel(WORKSPACE_PLANS[k]),
          seats: WORKSPACE_PLANS[k].seatsLabel,
        })),
        rows: PLAN_COMPARISON,
      }}
    />
  );
}
