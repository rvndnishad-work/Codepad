import { prisma } from "@/lib/prisma";
import { canMember } from "@/lib/permissions";
import { appOrigin } from "@/lib/interview/links";
import { getSettingsPageContext } from "@/lib/workspace/settings-server";
import { auditWhere, describeAuditRow, parseMeta, type AuditQuery } from "@/lib/workspace/audit-timeline";
import { timezoneLabel, timezoneList } from "@/lib/workspace/screening-defaults";
import GeneralSettings, { type RecentChange } from "./GeneralSettings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `General settings · ${ws.name} — Interviewpad` : "Workspace not found", robots: { index: false } };
}

const RECENT_QUERY: AuditQuery = { category: "settings", actor: "", range: "all", from: "", to: "", page: 1 };

/** Settings > General: name, web address, logo, time zone, date format and owners. */
export default async function GeneralSettingsPage({ params }: Props) {
  const { slug } = await params;
  const ctx = await getSettingsPageContext(slug);
  const now = new Date();

  const [members, recentRaw, meMember, origin] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: ctx.workspace.id },
      select: { userId: true, role: true, user: { select: { name: true, email: true } } },
    }),
    prisma.workspaceAuditLog.findMany({
      where: auditWhere(ctx.workspace.id, RECENT_QUERY, now),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 6,
      select: { id: true, action: true, actorEmail: true, actorUserId: true, targetType: true, targetId: true, meta: true, createdAt: true },
    }),
    prisma.workspaceMember.findUnique({ where: { id: ctx.me.memberId }, select: { role: true, permissions: true } }),
    appOrigin(),
  ]);

  const names: Record<string, string> = {};
  for (const m of members) {
    const n = m.user.name?.trim() || m.user.email;
    if (n) names[m.userId] = n;
  }
  const recent: RecentChange[] = recentRaw.map((r) => {
    const s = describeAuditRow(
      { action: r.action, actorEmail: r.actorEmail, actorUserId: r.actorUserId, targetType: r.targetType, targetId: r.targetId, meta: parseMeta(r.meta) },
      names,
    );
    return { id: r.id, title: s.title, detail: s.detail, actor: s.actor, at: r.createdAt.toISOString(), path: s.path };
  });

  const owners = members
    .filter((m) => m.role === "OWNER")
    .map((m) => ({ userId: m.userId, name: m.user.name?.trim() || m.user.email || "Unnamed member", email: m.user.email, me: m.userId === ctx.me.userId }));

  const zones = timezoneList();
  if (!zones.includes(ctx.settings.timezone)) zones.push(ctx.settings.timezone);
  const timezones = zones.map((z) => ({ value: z, label: timezoneLabel(z, now) }));

  return (
    <GeneralSettings
      slug={slug}
      workspaceId={ctx.workspace.id}
      origin={origin}
      now={now.toISOString()}
      canEdit={ctx.canEdit}
      owner={ctx.owner}
      initial={{
        name: ctx.settings.name,
        slug: ctx.settings.slug,
        timezone: ctx.settings.timezone,
        dateFormat: ctx.settings.dateFormat,
      }}
      logoUrl={ctx.settings.logoUrl}
      timezones={timezones}
      owners={owners}
      recent={recent}
      canReadAudit={meMember ? await canMember(meMember, "audit:read") : false}
    />
  );
}
