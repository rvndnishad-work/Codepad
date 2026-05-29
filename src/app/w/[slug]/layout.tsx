import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  Plus,
} from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { isAdmin } from "@/lib/admin";
import {
  ensureTotpEnrolledOrRedirect,
  PAID_PLANS,
  WORKSPACE_ADMIN_ROLES,
} from "@/lib/totp-gate";
import WorkspaceSidebarNav from "./WorkspaceSidebarNav";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

const PLAN_BADGES: Record<string, string> = {
  FREE: "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.06]",
  GROWTH: "text-indigo-600 dark:text-indigo-300 border-indigo-500/25 bg-indigo-500/[0.08]",
  ENTERPRISE: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.06]",
  LOCKED: "text-rose-600 dark:text-rose-400 border-rose-500/25 bg-rose-500/[0.06]",
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

  const showAdmin = isAdmin(session);

  return (
    <div className="bg-bg text-fg flex flex-col md:flex-row relative font-sans h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar — full height of the viewport minus global navbar */}
      <aside className="w-full md:w-64 md:h-full bg-surface/60 border-b md:border-b-0 md:border-r border-border backdrop-blur-md flex flex-col shrink-0 relative z-30">
        {/* Active workspace header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-[11px] shrink-0 select-none">
              {activeWorkspace.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-fg truncate">{activeWorkspace.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider ${
                    PLAN_BADGES[activeWorkspace.planName] || PLAN_BADGES.FREE
                  }`}
                >
                  {activeWorkspace.planName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace switcher */}
        <div className="px-3 py-4 flex-1 overflow-y-auto space-y-5">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-2.5 mb-1.5">
              Your workspaces
            </div>

            {myMemberships.map((membership) => {
              const ws = membership.workspace;
              const isActive = ws.slug === slug;
              return (
                <Link
                  key={ws.slug}
                  href={`/w/${ws.slug}`}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
                      : "text-muted hover:text-fg hover:bg-panel/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-500" : "text-muted/60"}`} />
                    <span className="truncate">{ws.name}</span>
                  </div>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider shrink-0 ${
                      isActive ? "text-indigo-500/80" : "text-muted/50"
                    }`}
                  >
                    {ws.planName}
                  </span>
                </Link>
              );
            })}

            <Link
              href="/w/create"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-muted/70 hover:text-fg hover:bg-panel/30 transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New workspace</span>
            </Link>
          </div>

          <WorkspaceSidebarNav
            slug={slug}
            planName={activeWorkspace.planName}
            counts={{
              challenges: activeWorkspace._count.challenges,
              interviews: activeWorkspace._count.sessions,
              takeHomes: activeWorkspace._count.takeHomes,
              candidates: activeWorkspace._count.candidates,
              replays: submittedTakeHomes + finishedSessions,
              members: activeWorkspace.members.length,
            }}
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-between px-2.5 py-2 rounded-md bg-panel/40 border border-border text-muted hover:text-fg hover:border-accent/40 transition-colors text-[11px] font-semibold"
          >
            <span>Personal dashboard</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </Link>

          <div className="flex items-center justify-between p-1.5 rounded-md border border-border bg-bg/40 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-7 h-7 rounded-md border border-border bg-surface shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xs font-semibold shrink-0">
                  {session.user?.name?.substring(0, 1).toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-fg truncate">
                  {session.user?.name || "Anonymous"}
                </div>
                <div className="text-[10px] text-muted truncate">
                  {session.user?.email || "No email"}
                </div>
              </div>
            </div>
            <UserMenu
              user={{
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
              }}
              isAdmin={showAdmin}
            />
          </div>
        </div>
      </aside>

      {/* Main content — scrolls independently of the sidebar */}
      <main className="flex-1 min-w-0 relative z-10 bg-bg overflow-y-auto h-full">
        <div className="mx-auto w-full max-w-5xl p-4 md:p-8 space-y-6">{children}</div>
      </main>
    </div>
  );
}
