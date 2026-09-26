import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { isStaff } from "@/lib/permissions/staff";
import {
  ensureTotpEnrolledOrRedirect,
  PAID_PLANS,
  WORKSPACE_ADMIN_ROLES,
} from "@/lib/totp-gate";
import WorkspaceShell from "./WorkspaceShell";
import { planDisplay, TAKE_HOME_REVIEW_STAGES } from "@/lib/workspace/display";
import { touchMemberActivity } from "@/lib/workspace/activity";

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
          aiInterviewTemplates: { where: { kind: "conversation" } },
          candidates: { where: { status: { not: "archived" } } },
        },
      },
    },
  });

  if (!activeWorkspace) notFound();

  const myMember = activeWorkspace.members.find((m) => m.userId === userId);
  const myRole = myMember?.role;
  if (!myMember || !myRole) redirect("/dashboard");
  // "Last active" on the Members page; written at most once an hour.
  await touchMemberActivity(myMember);

  // IP-42 AC #6: owners/admins of a paid-plan workspace must carry a second
  // factor before reaching workspace surfaces (candidate data, integrations).
  const mustEnroll2fa =
    (WORKSPACE_ADMIN_ROLES as readonly string[]).includes(myRole) &&
    (PAID_PLANS as readonly string[]).includes(activeWorkspace.planName);
  await ensureTotpEnrolledOrRedirect(userId, mustEnroll2fa);

  // Sidebar badges: submitted take-homes waiting on a decision, and live interviews.
  const reviewWhere = { OR: [{ candidateId: null }, { candidate: { stage: { in: [...TAKE_HOME_REVIEW_STAGES] } } }] };
  const [takeHomeSessionsToReview, takeHomeLegacyToReview, liveInterviews] = await Promise.all([
    prisma.interviewSession.count({ where: { workspaceId: activeWorkspace.id, type: "take-home", status: "completed", ...reviewWhere } }),
    prisma.takeHomeAssignment.count({ where: { workspaceId: activeWorkspace.id, status: "SUBMITTED", ...reviewWhere } }),
    prisma.interviewSession.count({ where: { workspaceId: activeWorkspace.id, type: { not: "take-home" } } }),
  ]);

  const myMemberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: { name: true, slug: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true },
      },
    },
  });

  const showAdmin = await isStaff(session);

  const plan = planDisplay(activeWorkspace);
  // System workspaces (double-underscore slugs) are internal tenants and
  // never appear in the switcher.
  const switcher = myMemberships
    .filter((m) => !m.workspace.slug.startsWith("__"))
    .sort((a, b) => a.workspace.name.localeCompare(b.workspace.name))
    .map((m) => ({
      name: m.workspace.name,
      slug: m.workspace.slug,
      planLabel: planDisplay(m.workspace).label,
    }));

  return (
    <WorkspaceShell
      current={{ name: activeWorkspace.name, slug, planLabel: plan.label }}
      workspaces={switcher}
      plan={plan}
      counts={{
        challenges: activeWorkspace._count.challenges + activeWorkspace._count.aiInterviewTemplates,
        interviews: liveInterviews,
        takeHomeReview: takeHomeSessionsToReview + takeHomeLegacyToReview,
        candidates: activeWorkspace._count.candidates,
        members: activeWorkspace.members.length,
      }}
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      isAdmin={showAdmin}
    >
      {children}
    </WorkspaceShell>
  );
}
