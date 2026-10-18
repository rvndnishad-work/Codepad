import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { ROLE_LABELS } from "@/lib/workspace/members";
import { pageOf } from "@/lib/admin/workspace-actions";
import { getAdminWorkspace } from "../_data";
import { Empty, ListFilters, Pager, Pill, Table, fmtDate, one, td, urlWith } from "../_ui";
import { MemberActions, RevokeInvite } from "./MemberActions";

export const metadata = { title: "Workspace members — Interviewpad Admin" };

const PAGE_SIZE = 50;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspaceMembersPage({ params, searchParams }: Props) {
  await requireAdminAccess("platform:admin");
  const { id } = await params;
  const sp = await searchParams;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  const q = one(sp.q)?.trim() ?? "";
  const where = {
    workspaceId: id,
    ...(q ? { user: { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } } : {}),
  };
  const total = await prisma.workspaceMember.count({ where });
  const paging = pageOf(one(sp.page), total, PAGE_SIZE);
  const now = new Date();
  const [members, invites, everyone] = await Promise.all([
    prisma.workspaceMember.findMany({
      where,
      orderBy: [{ role: "asc" }, { id: "asc" }],
      skip: paging.skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        role: true,
        lastActiveAt: true,
        user: { select: { id: true, name: true, email: true, lastSignInAt: true, totpEnabledAt: true } },
      },
    }),
    prisma.workspaceInvite.findMany({
      where: { workspaceId: id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
    }),
    // Everyone who can take over work when someone is removed (small: one workspace).
    prisma.workspaceMember.findMany({
      where: { workspaceId: id, role: { not: "VIEWER" } },
      take: 200,
      select: { id: true, role: true, user: { select: { name: true, email: true } } },
    }),
  ]);
  // There is no join date on a membership; the accepted invite is the best record of it.
  const emails = members.map((m) => m.user.email).filter((e): e is string => !!e);
  const accepted = emails.length
    ? await prisma.workspaceInvite.findMany({ where: { workspaceId: id, email: { in: emails }, acceptedAt: { not: null } }, select: { email: true, acceptedAt: true } })
    : [];
  const joined = new Map(accepted.map((a) => [a.email.toLowerCase(), a.acceptedAt]));
  const takeovers = everyone.map((m) => ({ id: m.id, label: `${m.user.name ?? m.user.email ?? "Member"} (${ROLE_LABELS[m.role] ?? m.role})` }));
  const base = `/admin/workspaces/${id}/members`;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          <h2 className="flex-1 text-[15px] font-semibold text-fg">Members</h2>
          <ListFilters q={q} />
        </div>
        {members.length === 0 ? (
          <Empty>{q ? "No members match." : "No members."}</Empty>
        ) : (
          <Table head={["Member", "Role", "Joined", "Last active", "Last sign-in", "Two-factor", ""]}>
            {members.map((m) => {
              const j = m.user.email ? joined.get(m.user.email.toLowerCase()) : null;
              return (
                <tr key={m.id} className="hover:bg-panel/40">
                  <td className={td}>
                    <div className="font-medium text-fg">{m.user.name ?? "No name"}</div>
                    <div className="text-xs text-muted">{m.user.email}</div>
                  </td>
                  <td className={td}>{ROLE_LABELS[m.role] ?? m.role}</td>
                  <td className={`${td} text-muted whitespace-nowrap`}>{j ? fmtDate(j) : "Not recorded"}</td>
                  <td className={`${td} text-muted whitespace-nowrap`}>{m.lastActiveAt ? fmtDate(m.lastActiveAt, true) : "Never"}</td>
                  <td className={`${td} text-muted whitespace-nowrap`}>{m.user.lastSignInAt ? fmtDate(m.user.lastSignInAt, true) : "Not recorded"}</td>
                  <td className={td}>{m.user.totpEnabledAt ? <Pill tone="ok">On</Pill> : <Pill tone={ws.require2faForAll ? "warn" : "off"}>Off</Pill>}</td>
                  <td className={`${td} text-right`}>
                    <MemberActions
                      workspaceId={id}
                      member={{ id: m.id, role: m.role, name: m.user.name ?? m.user.email ?? "this member" }}
                      takeovers={takeovers.filter((t) => t.id !== m.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
        <Pager page={paging.page} pages={paging.pages} total={total} href={(p) => urlWith(base, { q, page: p })} />
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[15px] font-semibold text-fg">Pending invites</h2>
        </div>
        {invites.length === 0 ? (
          <Empty>No pending invites.</Empty>
        ) : (
          <Table head={["Email", "Role", "Sent", "Expires", ""]}>
            {invites.map((i) => (
              <tr key={i.id} className="hover:bg-panel/40">
                <td className={td}>{i.email}</td>
                <td className={td}>{ROLE_LABELS[i.role] ?? i.role}</td>
                <td className={`${td} text-muted`}>{fmtDate(i.createdAt)}</td>
                <td className={td}>{i.expiresAt < now ? <Pill tone="off">Expired {fmtDate(i.expiresAt)}</Pill> : fmtDate(i.expiresAt)}</td>
                <td className={`${td} text-right`}>
                  <RevokeInvite workspaceId={id} inviteId={i.id} email={i.email} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
