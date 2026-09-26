import { prisma } from "@/lib/prisma";
import { buildCatalog } from "@/lib/connections/catalog";
import { loadAtsSummary } from "@/lib/ats/connection-server";
import { connectionsViewer } from "./_lib";
import ConnectionsCatalog from "./ConnectionsCatalog";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Connections", robots: { index: false, follow: false } };

export default async function ConnectionsPage({ params }: Props) {
  const { slug } = await params;
  const v = await connectionsViewer(slug, "connections");
  const wsId = v.workspace.id;

  const [ats, endpoints, apiKeys] = await Promise.all([
    loadAtsSummary(wsId),
    prisma.webhookEndpoint.findMany({ where: { workspaceId: wsId }, select: { active: true, failureCount: true } }),
    prisma.mcpApiKey.count({ where: { workspaceId: wsId, revokedAt: null } }),
  ]);

  const cards = buildCatalog({
    slug,
    growth: v.growth,
    canManage: v.canManage,
    ats: ats
      ? {
          provider: ats.provider,
          partner: ats.partner,
          setupComplete: ats.settings.setupComplete,
          imported30d: ats.imported30d,
          decisionsSent30d: ats.decisionsSent30d,
          lastSyncAt: ats.lastSyncAt,
          needsAttention: ats.needsAttention,
        }
      : null,
    webhooks: {
      endpoints: endpoints.length,
      failing: endpoints.filter((e) => e.active && e.failureCount > 0).length,
      paused: endpoints.filter((e) => !e.active).length,
    },
    apiKeys,
  });

  return <ConnectionsCatalog cards={cards} canManage={v.canManage} />;
}
