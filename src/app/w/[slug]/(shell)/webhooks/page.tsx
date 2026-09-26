import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock, Webhook } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { canMember } from "@/lib/permissions";
import { summarizeDelivery, TEST_EVENT } from "@/lib/events/catalog";
import { MAX_ATTEMPTS, AUTO_PAUSE_AFTER } from "@/lib/events/policy";
import WebhooksClient, { type DeliveryView, type EndpointView } from "./WebhooksClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ endpoint?: string }>;
};

export const metadata = { title: "Webhooks", robots: { index: false, follow: false } };

const DELIVERY_PAGE = 30;

export default async function WebhooksPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/webhooks`)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");

  if (!growthToolsEnabled(workspace)) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center flex flex-col items-center gap-4 max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-fg flex items-center justify-center gap-2">
            <Webhook className="w-5 h-5 text-secondary" /> Webhooks are part of Growth
          </h1>
          <p className="text-sm text-muted leading-relaxed max-w-md">
            Webhooks send a signed POST to your own URL when a screening finishes, a take home comes in, or a
            recruiter makes a decision. Upgrade to Growth or Enterprise to add endpoints.
          </p>
        </div>
        <Link
          href={`/w/${slug}?section=billing`}
          className="inline-flex items-center h-9 px-4 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition"
        >
          See plans
        </Link>
      </div>
    );
  }

  const canManage = await canMember(member, "integration:manage");
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });
  const ids = endpoints.map((e) => e.id);
  const realEvents = { endpointId: { in: ids }, event: { not: TEST_EVENT } };

  const [deliveredWeek, firstTryWeek, lastDelivery] = ids.length
    ? await Promise.all([
        prisma.webhookDelivery.groupBy({
          by: ["endpointId"],
          where: { ...realEvents, status: "succeeded", createdAt: { gte: weekAgo } },
          _count: { _all: true },
        }),
        prisma.webhookDelivery.groupBy({
          by: ["endpointId"],
          where: { ...realEvents, status: "succeeded", attempts: 1, createdAt: { gte: weekAgo } },
          _count: { _all: true },
        }),
        prisma.webhookDelivery.groupBy({
          by: ["endpointId"],
          where: { endpointId: { in: ids } },
          _max: { createdAt: true },
        }),
      ])
    : [[], [], []];
  const countOf = (rows: { endpointId: string; _count: { _all: number } }[], id: string) =>
    rows.find((r) => r.endpointId === id)?._count._all ?? 0;

  const views: EndpointView[] = endpoints.map((e) => ({
    id: e.id,
    url: e.url,
    events: e.events,
    active: e.active,
    pausedAt: e.pausedAt?.toISOString() ?? null,
    pausedReason: e.pausedReason,
    failureCount: e.failureCount,
    createdAt: e.createdAt.toISOString(),
    deliveredThisWeek: countOf(deliveredWeek, e.id),
    firstTryThisWeek: countOf(firstTryWeek, e.id),
    hasDeliveries: lastDelivery.some((r) => r.endpointId === e.id && r._max.createdAt),
  }));

  const selected = views.find((v) => v.id === sp.endpoint) ?? views[0] ?? null;
  const deliveries: DeliveryView[] = selected
    ? (
        await prisma.webhookDelivery.findMany({
          where: { endpointId: selected.id },
          orderBy: { createdAt: "desc" },
          take: DELIVERY_PAGE,
        })
      ).map((d) => ({
        id: d.id,
        event: d.event,
        eventId: d.eventId,
        status: d.status,
        attempts: d.attempts,
        responseCode: d.responseCode,
        lastError: d.lastError,
        nextAttemptAt: d.nextAttemptAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
        summary: summarizeDelivery(d.event, d.payload),
        payload: JSON.stringify(d.payload, null, 2),
      }))
    : [];

  return (
    <WebhooksClient
      slug={slug}
      canManage={canManage}
      endpoints={views}
      selectedId={selected?.id ?? null}
      deliveries={deliveries}
      maxAttempts={MAX_ATTEMPTS}
      autoPauseAfter={AUTO_PAUSE_AFTER}
    />
  );
}
