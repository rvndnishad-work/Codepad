import FeaturePaused from "@/components/FeaturePaused";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { growthToolsEnabled, trialActive } from "@/lib/billing/trial";
import { videoAddonAvailable } from "@/lib/video/addon";
import { subscriptionBilling } from "@/lib/video/addon-server";
import { getEffectivePricing } from "@/lib/billing/pricing-copy-store";
import { planSummary } from "@/lib/billing/summary";
import { PLAN_ORDER, WORKSPACE_PLANS, planComparison, priceLabel } from "@/lib/billing/plans";
import { seatUsage } from "@/lib/workspace/members";
import { getWorkspaceCredits } from "@/lib/ai-interview/credits";
import { loadCreditSummary } from "@/lib/ai-interview/console-server";
import { loadLedgerPage, loadUsageMonths } from "@/lib/billing/usage-server";
import { settingsAccess } from "@/lib/workspace/settings-server";
import BillingClient, { type BillingTab } from "./BillingClient";
import type { UsageData } from "./UsageTab";
import { INCLUDED_CREDITS_PER_SEAT, addOneMonth, planIncludesCredits } from "@/lib/billing/included-credits";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; page?: string; billing_success?: string; billing_cancel?: string; credits_purchase?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Billing and usage · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

export default async function BillingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab: BillingTab = sp.tab === "invoices" || sp.tab === "usage" ? sp.tab : "plan";

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
      lowCreditThreshold: true,
      includedCreditsLeft: true,
      includedCreditsGrantedAt: true,
      videoEnabled: true,
      videoEnabledAt: true,
      videoAddonItemId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();
  const me = workspace.members.find((m) => m.userId === session.user.id);
  if (!me) redirect("/dashboard");
  if (!(await canMember(me, "billing:read"))) redirect(`/w/${slug}`);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [canManage, pendingInvites, credits, takeHomeSessions, takeHomeLegacy, aiScreenings, interviews, videoCalls, stripeBilling, pricing] = await Promise.all([
    canMember(me, "billing:manage"),
    prisma.workspaceInvite.count({ where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: now } } }),
    getWorkspaceCredits(workspace.id),
    prisma.interviewSession.count({ where: { workspaceId: workspace.id, type: "take-home", createdAt: { gte: monthStart } } }),
    prisma.takeHomeAssignment.count({ where: { workspaceId: workspace.id, createdAt: { gte: monthStart } } }),
    prisma.aIInterviewSession.count({ where: { workspaceId: workspace.id, practice: false, createdAt: { gte: monthStart } } }),
    prisma.interviewSession.count({ where: { workspaceId: workspace.id, type: { not: "take-home" }, createdAt: { gte: monthStart } } }),
    // Live interviews that ran on built-in video this month.
    prisma.interviewSession.count({
      where: {
        workspaceId: workspace.id,
        builtinVideo: true,
        type: { not: "take-home" },
        status: { in: ["in_progress", "completed"] },
        startedAt: { gte: monthStart },
      },
    }),
    subscriptionBilling(workspace.stripeSubscriptionId, workspace.videoAddonItemId),
    getEffectivePricing(),
  ]);
  const interval = stripeBilling.interval;

  // A subscribed workspace keeps the seat price it signed up at, so the hint
  // shows that; otherwise the current Growth price.
  const billedSeatMonthly =
    stripeBilling.seatCents === null ? null : Math.round(stripeBilling.interval === "year" ? stripeBilling.seatCents / 12 : stripeBilling.seatCents);
  const summary = planSummary(workspace, now, undefined, billedSeatMonthly === null ? pricing.growth : { ...pricing.growth, monthlyCents: billedSeatMonthly });
  const seats = seatUsage(workspace, { members: workspace.members.length, pendingInvites }, now);
  const subscribed = Boolean(workspace.stripeCustomerId && workspace.stripeSubscriptionId);
  const aiScreening = growthToolsEnabled(workspace, now);

  let usage: UsageData | null = null;
  if (tab === "usage") {
    const [summary, months, ledger, access] = await Promise.all([
      loadCreditSummary(workspace.id),
      loadUsageMonths(workspace.id, now),
      loadLedgerPage(workspace.id, Number.parseInt(sp.page ?? "1", 10) || 1),
      settingsAccess(me),
    ]);
    usage = {
      credits: summary,
      included: {
        left: workspace.includedCreditsLeft,
        perMonth: planIncludesCredits(workspace.planName) ? workspace.members.length * INCLUDED_CREDITS_PER_SEAT : 0,
        nextAt: workspace.includedCreditsGrantedAt ? addOneMonth(workspace.includedCreditsGrantedAt).toISOString() : null,
      },
      packs: pricing.packs.map((p) => ({ id: p.id, label: p.label, credits: p.credits, priceCents: p.priceCents, badge: p.badge })),
      months,
      ledger: {
        rows: ledger.rows.map((r) => ({
          id: r.id,
          createdAt: new Date(r.createdAt).toISOString(),
          label: r.label,
          detail: r.detail,
          amount: r.amount,
          balanceAfter: r.balanceAfter,
        })),
        page: ledger.page,
        pages: ledger.pages,
        total: ledger.total,
      },
      lowCreditThreshold: workspace.lowCreditThreshold,
      canEditAlert: access.canEdit,
      aiScreening,
      purchase: sp.credits_purchase === "success" ? "success" : sp.credits_purchase === "cancel" ? "cancel" : null,
    };
  }

  return (
    <>
    <FeaturePaused featureKey="credit-checkout" wrapperClassName="mb-4" />
    <BillingClient
      slug={slug}
      tab={tab}
      notice={sp.billing_success ? "success" : sp.billing_cancel ? "cancel" : null}
      planName={workspace.planName}
      summary={summary}
      seats={seats}
      credits={credits}
      aiScreening={aiScreening}
      usage={usage}
      month={{
        takeHomes: takeHomeSessions + takeHomeLegacy,
        aiScreenings,
        interviews,
        label: now.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" }),
      }}
      canManage={canManage}
      subscribed={subscribed}
      video={{
        available: videoAddonAvailable(workspace, now),
        onTrial: trialActive(workspace, now),
        on: workspace.videoEnabled,
        onSince: workspace.videoEnabledAt ? workspace.videoEnabledAt.toISOString() : null,
        billed: Boolean(workspace.videoAddonItemId),
        callsThisMonth: videoCalls,
        interval,
        // A billed add-on keeps the price it was added at; otherwise the current price.
        priceCents: stripeBilling.addonCents ?? (interval === "year" ? pricing.videoAddon.annualCents : pricing.videoAddon.monthlyCents),
      }}
      stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY)}
      compare={{
        plans: PLAN_ORDER.map((k) => ({
          key: k,
          name: WORKSPACE_PLANS[k].name,
          price: priceLabel(WORKSPACE_PLANS[k], pricing.growth),
          seats: WORKSPACE_PLANS[k].seatsLabel,
        })),
        rows: planComparison(pricing.videoAddon.monthlyCents),
      }}
    />
    </>
  );
}
