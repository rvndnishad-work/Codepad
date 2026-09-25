import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, Building2, ChevronRight, ClipboardList, Mail, Plus, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/permissions/staff";
import { planDisplay, humanize, plural, relativeTime, setupSteps } from "@/lib/workspace/display";
import { countReviewQueue } from "@/lib/workspace/review-queue";
import { effectivePlan } from "@/lib/billing/trial";
import WorkspaceAppBar, { WorkspaceInitial } from "./_components/WorkspaceAppBar";

export const metadata: Metadata = {
  title: "Workspaces",
  description:
    "Pick a recruiting workspace to manage candidates, interviews, take-homes, and your hiring team.",
};

const GRID = "md:grid-cols-[minmax(0,1fr)_150px_110px_220px_110px_20px]";

export default async function WorkspaceHubPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/w")}`);
  }
  const userId = session.user.id;

  const [allMemberships, invites, isAdmin] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId },
      orderBy: { workspace: { name: "asc" } },
      select: {
        role: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            planName: true,
            trialEndsAt: true,
            stripeSubscriptionId: true,
            createdAt: true,
            _count: {
              select: {
                members: true,
                candidates: true,
                takeHomes: true,
                challenges: true,
                sessions: true,
                aiInterviewSessions: true,
                invites: { where: { acceptedAt: null } },
              },
            },
            candidates: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
          },
        },
      },
    }),
    session.user.email
      ? prisma.workspaceInvite.findMany({
          where: {
            email: { equals: session.user.email, mode: "insensitive" },
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: { token: true, role: true, workspace: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    isStaff(session),
  ]);

  // System workspaces (double-underscore slugs, e.g. __ai-practice__) are
  // internal tenants. Filtered in JS: Prisma's startsWith doesn't escape `_`
  // (a LIKE wildcard), so a DB-side filter would exclude everything.
  const memberships = allMemberships.filter((m) => !m.workspace.slug.startsWith("__"));
  const reviewCounts = await Promise.all(memberships.map((m) => countReviewQueue(m.workspace.id)));

  const rows = memberships.map(({ role, workspace: ws }, i) => {
    const plan = planDisplay(ws);
    const c = ws._count;
    const steps = setupSteps(
      {
        assessments: c.takeHomes + c.challenges + c.sessions,
        candidates: c.candidates,
        aiScreenings: c.aiInterviewSessions,
        members: c.members,
        pendingInvites: c.invites,
      },
      { seatLimit: effectivePlan(ws).seatLimit, aiIncluded: plan.growthFeatures },
    );
    const lastActive = ws.candidates[0]?.updatedAt ?? ws.createdAt;
    return {
      name: ws.name,
      slug: ws.slug,
      role: humanize(role),
      plan,
      candidates: c.candidates,
      toReview: reviewCounts[i],
      setupDone: steps.filter((s) => s.done).length,
      setupTotal: steps.length,
      lastActive: relativeTime(lastActive),
    };
  });

  const user = { name: session.user.name, email: session.user.email, image: session.user.image };
  const switcher = rows.map((r) => ({ name: r.name, slug: r.slug, planLabel: r.plan.label }));

  return (
    <div className="min-h-dvh bg-bg text-fg font-sans flex flex-col">
      <WorkspaceAppBar workspaces={switcher} user={user} isAdmin={isAdmin} />

      <main className="w-full max-w-[1120px] mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col gap-7">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[28px] font-semibold tracking-[-0.02em]">Workspaces</h1>
            <p className="mt-1.5 text-[15px] text-muted max-w-xl">
              {rows.length > 0
                ? "Each workspace keeps its own candidates, assessments, members and billing."
                : "A workspace is your team's private space for candidates, assessments and interviews."}
            </p>
          </div>
          <Link
            href="/w/create"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" strokeWidth={2.25} aria-hidden />
            Create workspace
          </Link>
        </div>

        {invites.length > 0 && (
          <section aria-labelledby="invites-title" className="rounded-xl border border-secondary/40 bg-surface">
            <h2 id="invites-title" className="px-5 pt-4 pb-2 text-[15px] font-semibold">
              {invites.length === 1 ? "You have an invitation" : `You have ${invites.length} invitations`}
            </h2>
            <ul>
              {invites.map((inv) => (
                <li key={inv.token} className="flex items-center gap-3 px-5 py-3 border-t border-border">
                  <Mail className="w-4 h-4 text-secondary shrink-0" aria-hidden />
                  <span className="flex-1 text-sm text-muted">
                    <span className="text-fg font-medium">{inv.workspace.name}</span> invited you as{" "}
                    {humanize(inv.role).toLowerCase()}
                  </span>
                  <Link
                    href={`/invite/${inv.token}`}
                    className="h-8 inline-flex items-center px-3 rounded-lg border border-border text-[13px] font-medium hover:bg-panel transition-colors"
                  >
                    Review invite
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {rows.length > 0 ? (
          <section aria-label="Your workspaces" className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className={`hidden md:grid ${GRID} gap-5 px-6 py-3 text-xs font-medium text-subtle`}>
              <span>Workspace</span>
              <span>Plan</span>
              <span>Your role</span>
              <span>Activity</span>
              <span>Last active</span>
              <span />
            </div>
            <ul>
              {rows.map((r) => (
                <li key={r.slug} className="border-t border-border first:border-t-0 md:first:border-t">
                  <Link
                    href={`/w/${r.slug}`}
                    className={`grid grid-cols-[minmax(0,1fr)_20px] ${GRID} items-center gap-x-5 gap-y-2 px-4 md:px-6 py-4 hover:bg-panel transition-colors`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <WorkspaceInitial name={r.name} size="lg" />
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold truncate">{r.name}</div>
                        <div className="font-mono text-xs text-subtle truncate mt-0.5">/w/{r.slug}</div>
                      </div>
                    </div>
                    <ChevronRight className="md:hidden w-5 h-5 text-subtle row-span-2 self-center" aria-hidden />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:contents">
                      <span>
                        {r.plan.onTrial ? (
                          <span className="inline-block text-xs text-fg border border-secondary rounded-full px-2.5 py-0.5">
                            Trial · {plural(r.plan.trialDaysLeft ?? 0, "day")} left
                          </span>
                        ) : (
                          <span className="inline-block text-xs text-muted border border-border-strong rounded-full px-2.5 py-0.5">
                            {r.plan.label}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-muted">{r.role}</span>
                      <span className="text-sm text-muted">
                        {r.candidates === 0 ? (
                          `Setup ${r.setupDone} of ${r.setupTotal} done`
                        ) : (
                          <>
                            {plural(r.candidates, "candidate")}
                            {r.toReview > 0 && <span className="text-warning"> · {r.toReview} to review</span>}
                          </>
                        )}
                      </span>
                      <span className="text-[13px] text-subtle">{r.lastActive}</span>
                    </div>
                    <ChevronRight className="hidden md:block w-5 h-5 text-subtle" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-surface px-6 py-12 flex flex-col items-center text-center gap-4">
            <span className="w-12 h-12 rounded-xl bg-panel border border-border flex items-center justify-center text-secondary">
              <Building2 className="w-5 h-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold">You are not in a workspace yet</h2>
              <p className="mt-1.5 text-sm text-muted max-w-md">
                Create one for your team to start sending assessments. The first 14 days include every Growth
                feature, with no card needed.
              </p>
            </div>
            <Link
              href="/w/create"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110 transition"
            >
              Create workspace <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Mail,
              title: "Have an invite?",
              body: "Invitations from teammates show up here once you sign in with the invited email. Ask an owner to resend one that expired.",
            },
            {
              icon: Users,
              title: "One workspace per team",
              body: "Split hiring by department or client. Candidates, members and billing never cross between workspaces.",
            },
            {
              icon: rows.length > 0 ? BookOpen : ClipboardList,
              title: "New to Interviewpad?",
              body: "See how take-homes, AI screening and live interviews fit together before you invite candidates.",
              href: "/hire",
              link: "How hiring works",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-border p-5 flex flex-col gap-2">
              <card.icon className="w-[18px] h-[18px] text-secondary" aria-hidden />
              <h2 className="text-sm font-semibold">{card.title}</h2>
              <p className="text-sm leading-relaxed text-muted">{card.body}</p>
              {card.href && (
                <Link href={card.href} className="text-sm font-medium text-secondary-soft hover:text-fg transition-colors mt-auto">
                  {card.link}
                </Link>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
