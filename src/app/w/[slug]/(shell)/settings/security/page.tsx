import { prisma } from "@/lib/prisma";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { keysOverLimit } from "@/lib/workspace/security";
import SecurityClient from "./SecurityClient";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Security settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

/**
 * Settings > Security: two-factor for everyone, sign-in length and sign out
 * everyone, allowed email domains and joining without an invite, the longest
 * API key lifetime, and single sign-on (Enterprise, not built).
 */
export default async function SecuritySettingsPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getSettingsPageContext(slug);
  const { workspace, settings, canEdit, owner, me } = ctx;

  const [members, keys, meUser] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { user: { name: "asc" } },
      select: { id: true, role: true, user: { select: { name: true, email: true, totpEnabledAt: true } } },
    }),
    canEdit
      ? prisma.mcpApiKey.findMany({
          where: { workspaceId: workspace.id, revokedAt: null },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: { id: true, label: true, keyPreview: true, expiresAt: true, revokedAt: true, lastUsedAt: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.user.findUnique({ where: { id: me.userId }, select: { totpEnabledAt: true } }),
  ]);

  const now = new Date();
  const flaggedKeys = keysOverLimit(settings, keys, now);

  return (
    <SecurityClient
      slug={slug}
      canEdit={canEdit}
      owner={owner}
      paidPlan={workspace.planName === "GROWTH" || workspace.planName === "ENTERPRISE"}
      myTwoFactorOn={Boolean(meUser?.totpEnabledAt)}
      now={now.toISOString()}
      initial={{
        require2faForAll: settings.require2faForAll,
        require2faFrom: settings.require2faFrom ? settings.require2faFrom.toISOString().slice(0, 10) : "",
        sessionMaxAgeDays: settings.sessionMaxAgeDays,
        allowedEmailDomains: settings.allowedEmailDomains,
        joinWithoutInvite: settings.joinWithoutInvite,
        joinRole: settings.joinRole,
        apiKeyMaxLifetimeDays: settings.apiKeyMaxLifetimeDays,
      }}
      saved={{
        require2faForAll: settings.require2faForAll,
        require2faFrom: settings.require2faFrom?.toISOString() ?? null,
        require2faRemindedAt: settings.require2faRemindedAt?.toISOString() ?? null,
        sessionsRevokedAt: settings.sessionsRevokedAt?.toISOString() ?? null,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
      }}
      members={members.map((m) => ({
        id: m.id,
        name: m.user.name?.trim() || m.user.email || "Unknown",
        email: m.user.email,
        role: m.role,
        twoFactorOn: Boolean(m.user.totpEnabledAt),
      }))}
      flaggedKeys={flaggedKeys.map((k) => ({
        id: k.id,
        label: k.label,
        keyPreview: k.keyPreview,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))}
      liveKeyCount={keys.filter((k) => !k.expiresAt || k.expiresAt > now).length}
      workspaceName={workspace.name}
    />
  );
}
