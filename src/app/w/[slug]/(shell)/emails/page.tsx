/**
 * Workspace Email activity. Recruiter-facing, gated on `email:read` like the
 * audit log. Strictly scoped to this workspace's EmailLog rows; the global
 * suppression list is admin-only and is not listed here (cross-workspace
 * data), though a row can say its address was blocked.
 */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { canMember } from "@/lib/permissions";
import {
  EMAIL_PAGE_SIZE,
  canOfferResend,
  resendPathFor,
  emailWhere,
  groupCounts,
  parseEmailQuery,
  templateLabel,
} from "@/lib/workspace/email-activity";
import { pageWindow } from "@/lib/workspace/audit-timeline";
import EmailsClient, { type EmailRow } from "./EmailsClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return {
    title: `Email activity · ${slug} — Interviewpad`,
    robots: { index: false, follow: false },
  };
}

export default async function WorkspaceEmailsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = parseEmailQuery(await searchParams);
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}/emails`)}`);
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) notFound();

  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) redirect("/dashboard");
  // Same compliance gating as the audit log.
  if (!(await canMember(member, "email:read"))) {
    redirect(`/w/${slug}`);
  }
  // Resend reuses the take-home and AI screening resend actions, which check
  // these permissions again on the server.
  const [canResendTakeHome, canResendScreening] = await Promise.all([
    canMember(member, "takehome:create").catch(() => false),
    canMember(member, "interview:conduct").catch(() => false),
  ]);

  // A search can match a candidate's name as well as the address.
  const nameMatches = query.q
    ? (
        await prisma.candidate.findMany({
          where: { workspaceId: workspace.id, name: { contains: query.q, mode: "insensitive" }, email: { not: null } },
          select: { email: true },
          take: 50,
        })
      ).map((c) => c.email as string)
    : [];

  // Chip counts respect the template and search filters, not the status one.
  const countWhere = emailWhere(workspace.id, { ...query, status: "all" }, nameMatches);
  const where = emailWhere(workspace.id, query, nameMatches);

  const [byStatus, total, templates] = await Promise.all([
    prisma.emailLog.groupBy({ by: ["status"], where: countWhere, _count: { status: true } }),
    prisma.emailLog.count({ where }),
    prisma.emailLog.findMany({
      where: { workspaceId: workspace.id },
      select: { template: true },
      distinct: ["template"],
      take: 50,
    }),
  ]);
  const win = pageWindow(query.page, total, EMAIL_PAGE_SIZE);
  const logs = await prisma.emailLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: win.skip,
    take: win.take,
    select: {
      id: true,
      template: true,
      recipientEmail: true,
      status: true,
      errorReason: true,
      providerId: true,
      sessionId: true,
      createdAt: true,
      lastEventAt: true,
    },
  });

  // Put a name and a link on each recipient that is a candidate here.
  const people = await prisma.candidate.findMany({
    where: {
      workspaceId: workspace.id,
      email: { in: [...new Set(logs.map((l) => l.recipientEmail))], mode: "insensitive" },
    },
    select: { id: true, name: true, email: true },
  });
  const byEmail = new Map(people.map((p) => [(p.email ?? "").toLowerCase(), p]));

  const rows: EmailRow[] = logs.map((l) => {
    const person = byEmail.get(l.recipientEmail.toLowerCase());
    return {
      id: l.id,
      template: l.template,
      templateLabel: templateLabel(l.template),
      recipientEmail: l.recipientEmail,
      candidateId: person?.id ?? null,
      candidateName: person?.name ?? null,
      status: l.status,
      errorReason: l.errorReason,
      providerId: l.providerId,
      hasSession: !!l.sessionId,
      createdAt: l.createdAt.toISOString(),
      lastEventAt: l.lastEventAt?.toISOString() ?? null,
      canResend:
        canOfferResend(l) &&
        (resendPathFor(l.template) === "take-home" ? canResendTakeHome : canResendScreening),
    };
  });

  const counts = groupCounts(Object.fromEntries(byStatus.map((c) => [c.status, c._count.status])));

  return (
    <EmailsClient
      slug={slug}
      query={{ ...query, page: win.page }}
      rows={rows}
      counts={counts}
      templates={templates
        .map((t) => ({ id: t.template, label: templateLabel(t.template) }))
        .sort((a, b) => a.label.localeCompare(b.label))}
      paging={{ page: win.page, pages: win.pages, total, first: win.first, last: win.last }}
      now={new Date().toISOString()}
    />
  );
}
