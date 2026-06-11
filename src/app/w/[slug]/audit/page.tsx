import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { listWorkspaceAudit } from "@/lib/workspace-audit";
import { canMember } from "@/lib/permissions";
import WorkspaceAuditClient from "./WorkspaceAuditClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    actor?: string;
    action?: string;
    start?: string;
    end?: string;
    cursor?: string;
  }>;
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
  const sp = await searchParams;

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

  // Distinct actions in this workspace's audit log — used to populate the
  // filter dropdown. Tiny query (DISTINCT over an indexed column).
  const distinctActions = await prisma.workspaceAuditLog.findMany({
    where: { workspaceId: workspace.id },
    select: { action: true },
    distinct: ["action"],
    take: 50,
  });

  // Parse filter inputs.
  const startDate = sp.start ? new Date(sp.start) : undefined;
  const endDate = sp.end ? new Date(sp.end) : undefined;

  const { rows, nextCursor } = await listWorkspaceAudit({
    workspaceId: workspace.id,
    actorUserId: sp.actor || undefined,
    action: sp.action || undefined,
    startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : undefined,
    cursor: sp.cursor || undefined,
  });

  return (
    <WorkspaceAuditClient
      slug={slug}
      workspaceName={workspace.name}
      members={workspace.members
        .map((m) => ({
          id: m.user.id,
          email: m.user.email ?? "",
          name: m.user.name ?? null,
        }))
        .filter((m) => m.email)}
      distinctActions={distinctActions.map((d) => d.action).sort()}
      rows={rows}
      activeFilter={{
        actor: sp.actor ?? null,
        action: sp.action ?? null,
        start: sp.start ?? null,
        end: sp.end ?? null,
      }}
      nextCursor={nextCursor}
      currentCursor={sp.cursor ?? null}
    />
  );
}
