import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions/staff";
import {
  ensureTotpEnrolledOrRedirect,
  PAID_PLANS,
  WORKSPACE_ADMIN_ROLES,
} from "@/lib/totp-gate";
import WorkspaceSidebar from "./WorkspaceSidebar";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function WorkspaceLayout({ children, params }: Props) {
  const { slug } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/w/${slug}`)}`);
  }

  const userId = session.user.id;

  const activeWorkspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: {
        include: { user: { select: { name: true, image: true, email: true } } },
      },
      _count: {
        select: {
          challenges: true,
          sessions: true,
          takeHomes: true,
          candidates: true,
        },
      },
    },
  });

  if (!activeWorkspace) notFound();

  const myRole = activeWorkspace.members.find((m) => m.userId === userId)?.role;
  if (!myRole) redirect("/dashboard");

  // IP-42 AC #6: owners/admins of a paid-plan workspace must carry a second
  // factor before reaching workspace surfaces (candidate data, integrations).
  const mustEnroll2fa =
    (WORKSPACE_ADMIN_ROLES as readonly string[]).includes(myRole) &&
    (PAID_PLANS as readonly string[]).includes(activeWorkspace.planName);
  await ensureTotpEnrolledOrRedirect(userId, mustEnroll2fa);

  // Replay count = submitted take-homes + finished interview sessions
  const submittedTakeHomes = await prisma.takeHomeAssignment.count({
    where: { workspaceId: activeWorkspace.id, status: "SUBMITTED", attemptId: { not: null } },
  });
  const finishedSessions = await prisma.interviewSession.count({
    where: { workspaceId: activeWorkspace.id, finishedAt: { not: null } },
  });

  const myMemberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: { select: { name: true, slug: true, planName: true } },
    },
  });

  const showAdmin = await isStaff(session);

  return (
    <div className="bg-bg text-fg flex flex-col md:flex-row relative font-sans h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar — client component owns the collapse state + tooltips. */}
      <WorkspaceSidebar
        slug={slug}
        workspaceName={activeWorkspace.name}
        planName={activeWorkspace.planName}
        memberships={myMemberships.map((m) => ({
          name: m.workspace.name,
          slug: m.workspace.slug,
          planName: m.workspace.planName,
        }))}
        counts={{
          challenges: activeWorkspace._count.challenges,
          interviews: activeWorkspace._count.sessions,
          takeHomes: activeWorkspace._count.takeHomes,
          candidates: activeWorkspace._count.candidates,
          replays: submittedTakeHomes + finishedSessions,
          members: activeWorkspace.members.length,
        }}
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }}
        isAdmin={showAdmin}
      />

      {/* Main content — scrolls independently of the sidebar. min-h-0 (not
          h-full) so on mobile it takes the height left over below the compact
          sidebar bar instead of overflowing the clipped container. */}
      <main className="flex-1 min-w-0 min-h-0 relative z-10 bg-bg overflow-y-auto">
        <div className="workspace-content mx-auto w-full max-w-5xl p-4 md:p-8 space-y-6">{children}</div>
      </main>
    </div>
  );
}
