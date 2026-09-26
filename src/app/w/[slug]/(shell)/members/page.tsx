import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canMember,
  expandRolePermissions,
  loadRolePermissions,
  WORKSPACE_PERMISSIONS,
} from "@/lib/permissions";
import { seatUsage, WORKSPACE_ROLES, ROLE_LABELS } from "@/lib/workspace/members";
import MembersClient, { type MembersTab } from "./MembersClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Members · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

const TABS: MembersTab[] = ["people", "invites", "roles"];

export default async function MembersPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const tab: MembersTab = TABS.includes(sp.tab as MembersTab) ? (sp.tab as MembersTab) : "people";

  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent(`/w/${slug}/members`)}`);

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: {
        select: {
          id: true,
          userId: true,
          role: true,
          permissions: true,
          lastActiveAt: true,
          user: { select: { name: true, email: true, image: true, totpEnabledAt: true } },
        },
      },
    },
  });
  if (!workspace) notFound();

  const me = workspace.members.find((m) => m.userId === session.user.id);
  if (!me) redirect("/dashboard");
  if (!(await canMember(me, "member:read"))) redirect(`/w/${slug}`);

  const now = new Date();
  const [invites, owned, roles, roleMap, canInvite, canRemove, canSetRoles] = await Promise.all([
    prisma.workspaceInvite.findMany({
      where: { workspaceId: workspace.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    }),
    prisma.candidate.groupBy({
      by: ["ownerId"],
      where: { workspaceId: workspace.id, ownerId: { not: null }, status: { not: "archived" } },
      _count: { _all: true },
    }),
    prisma.role.findMany({
      where: { scope: "WORKSPACE" },
      select: { key: true, label: true, description: true },
    }),
    loadRolePermissions(),
    canMember(me, "member:invite"),
    canMember(me, "member:remove"),
    canMember(me, "member:set_role"),
  ]);

  // Role -> concrete workspace permissions (wildcards expanded). This is the
  // same data canMember() resolves against, so the Roles tab cannot drift
  // from what the checks decide.
  const workspacePerms = new Set<string>(WORKSPACE_PERMISSIONS);
  const roleBasePermissions: Record<string, string[]> = {};
  for (const [key, perms] of roleMap) {
    roleBasePermissions[key] = [...expandRolePermissions(perms)].filter((p) => workspacePerms.has(p));
  }

  const ownedBy = new Map(owned.map((o) => [o.ownerId, o._count._all]));
  const pendingLive = invites.filter((i) => i.expiresAt > now).length;
  const seats = seatUsage(workspace, { members: workspace.members.length, pendingInvites: pendingLive }, now);

  const roleOrder = (r: string) => {
    const i = (WORKSPACE_ROLES as readonly string[]).indexOf(r);
    return i === -1 ? 99 : i;
  };
  const members = [...workspace.members]
    .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || (a.user.name ?? a.user.email ?? "").localeCompare(b.user.name ?? b.user.email ?? ""))
    .map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      permissions: (m.permissions ?? null) as Record<string, boolean> | null,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      twoFactor: Boolean(m.user.totpEnabledAt),
      lastActiveAt: m.lastActiveAt ? m.lastActiveAt.toISOString() : null,
      ownedCandidates: ownedBy.get(m.userId) ?? 0,
    }));

  const roleColumns = [...WORKSPACE_ROLES].map((key) => {
    const r = roles.find((x) => x.key === key);
    return { key, label: r?.label ?? ROLE_LABELS[key] ?? key, description: r?.description ?? null };
  });

  return (
    <MembersClient
      slug={slug}
      tab={tab}
      now={now.toISOString()}
      me={{ memberId: me.id, role: me.role, canInvite, canRemove, canSetRoles }}
      members={members}
      invites={invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
        expired: i.expiresAt <= now,
      }))}
      seats={seats}
      roleColumns={roleColumns}
      roleBasePermissions={roleBasePermissions}
    />
  );
}
