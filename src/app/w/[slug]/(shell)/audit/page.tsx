import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { canMember } from "@/lib/permissions";
import {
  auditWhere,
  describeAuditRow,
  pageWindow,
  parseAuditQuery,
  parseMeta,
  AUDIT_PAGE_SIZE,
} from "@/lib/workspace/audit-timeline";
import WorkspaceAuditClient, { type TimelineRow } from "./WorkspaceAuditClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return {
    title: `Audit log · ${slug} — Interviewpad`,
    robots: { index: false, follow: false },
  };
}

export default async function WorkspaceAuditPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = parseAuditQuery(await searchParams);

  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/audit`)}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          userId: true,
          role: true,
          permissions: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });
  if (!workspace) notFound();

  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");
  // Audit log is a compliance surface, not for everyone.
  if (!(await canMember(member, "audit:read"))) {
    redirect(`/w/${slug}`);
  }

  const now = new Date();
  const where = auditWhere(workspace.id, query, now);
  const total = await prisma.workspaceAuditLog.count({ where });
  const win = pageWindow(query.page, total, AUDIT_PAGE_SIZE);
  const raw = await prisma.workspaceAuditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: win.skip,
    take: win.take,
  });

  const names: Record<string, string> = {};
  for (const m of workspace.members) {
    const n = m.user.name?.trim() || m.user.email;
    if (n) names[m.user.id] = n;
  }

  const rows: TimelineRow[] = raw.map((r) => {
    const meta = parseMeta(r.meta);
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      ip: r.ip,
      meta,
      ...describeAuditRow({ ...r, meta }, names),
    };
  });

  return (
    <WorkspaceAuditClient
      slug={slug}
      query={{ ...query, page: win.page }}
      members={workspace.members
        .map((m) => ({ id: m.user.id, label: m.user.name?.trim() || m.user.email || "Unnamed member" }))
        .sort((a, b) => a.label.localeCompare(b.label))}
      rows={rows}
      paging={{ page: win.page, pages: win.pages, total, first: win.first, last: win.last }}
      now={now.toISOString()}
    />
  );
}
