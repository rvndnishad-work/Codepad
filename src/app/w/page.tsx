import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Building2, Mail, Plus, Trash2, UserPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/permissions/staff";
import {
  hubRowState,
  humanize,
  planDisplay,
  plural,
  relativeTime,
  setupStepAction,
  setupSteps,
  type HubRowState,
  type PlanDisplay,
} from "@/lib/workspace/display";
import { countReviewQueue } from "@/lib/workspace/review-queue";
import { deletionFinalAt, formatWorkspaceDate, type DateFormat } from "@/lib/workspace/settings";
import { canMember } from "@/lib/permissions";
import { effectivePlan } from "@/lib/billing/trial";
import WorkspaceAppBar, { WorkspaceInitial } from "./_components/WorkspaceAppBar";
import JoinWorkspaceButton from "./_components/JoinWorkspaceButton";
import RestoreWorkspaceButton from "./_components/RestoreWorkspaceButton";
import HubNotice from "./_components/HubNotice";
import { findJoinableWorkspaces } from "@/lib/workspace/join";

export const metadata: Metadata = {
  title: "Workspaces",
  description:
    "Pick a recruiting workspace to manage candidates, interviews, take-homes, and your hiring team.",
};

/*
 * The hub is a router, not a dashboard: one row per workspace, each with its
 * identity, one state (work to review, setup progress, or nothing) and one
 * action. The same row works for one workspace or twenty, and the Overview
 * page keeps the full checklist and numbers.
 */

// Buttons grow to 44px on phones so they are comfortable to tap.
const BTN = "inline-flex items-center justify-center gap-1.5 h-11 sm:h-9 px-3.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors";
const BTN_OUTLINE = `${BTN} border border-border-strong text-fg hover:bg-panel hover:border-fg/40`;
const BTN_PRIMARY = `${BTN} bg-secondary text-bg hover:brightness-110`;

/** "Just now" -> "just now", "22 Oct" stays as is. For mid-sentence relative times. */
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type Row = {
  name: string;
  slug: string;
  role: string;
  plan: PlanDisplay;
  candidates: number;
  state: HubRowState;
  /** "Active 5 min ago" once there is candidate activity, else "Created yesterday". */
  activity: string;
  activityAt: number;
  /** Set while the workspace waits out its deletion window. */
  deleting: { finalAt: string; byYou: boolean; since: string; canRestore: boolean } | null;
};

export default async function WorkspaceHubPage({ searchParams }: { searchParams: Promise<{ deleted?: string; removed?: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/w")}`);
  }
  const userId = session.user.id;

  const [allMemberships, invites, isAdmin, joinable] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId },
      orderBy: { workspace: { name: "asc" } },
      select: {
        role: true,
        permissions: true,
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            planName: true,
            trialEndsAt: true,
            stripeSubscriptionId: true,
            createdAt: true,
            deletionScheduledAt: true,
            deletionRequestedById: true,
            timezone: true,
            dateFormat: true,
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
          select: { token: true, role: true, expiresAt: true, workspace: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    isStaff(session),
    // Settings > Security: workspaces that let this email domain join without an invite.
    findJoinableWorkspaces(userId, session.user.email).catch(() => []),
  ]);

  // System workspaces (double-underscore slugs, e.g. __ai-practice__) are
  // internal tenants. Filtered in JS: Prisma's startsWith doesn't escape `_`
  // (a LIKE wildcard), so a DB-side filter would exclude everything.
  const memberships = allMemberships.filter((m) => !m.workspace.slug.startsWith("__"));
  const reviewCounts = await Promise.all(memberships.map((m) => countReviewQueue(m.workspace.id)));

  const rows: Row[] = await Promise.all(memberships.map(async ({ role, permissions, workspace: ws }, i) => {
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
    const lastCandidate = ws.candidates[0]?.updatedAt ?? null;
    const activityAt = lastCandidate ?? ws.createdAt;
    const finalAt = deletionFinalAt(ws);
    const deleting =
      finalAt && ws.deletionScheduledAt
        ? {
            finalAt: formatWorkspaceDate(finalAt, { timezone: ws.timezone, dateFormat: ws.dateFormat as DateFormat }),
            byYou: ws.deletionRequestedById === userId,
            since: lowerFirst(relativeTime(ws.deletionScheduledAt)),
            canRestore: await canMember({ role, permissions }, "workspace:manage"),
          }
        : null;
    return {
      name: ws.name,
      slug: ws.slug,
      role,
      plan,
      candidates: c.candidates,
      state: hubRowState({ role, candidates: c.candidates, toReview: reviewCounts[i], steps, deletionFinalAt: finalAt }),
      activity: `${lastCandidate ? "Active" : "Created"} ${lowerFirst(relativeTime(activityAt))}`,
      activityAt: activityAt.getTime(),
      deleting,
    };
  }));

  // Work waiting for a decision first, then whatever was touched most
  // recently; workspaces on their way out go last.
  rows.sort((a, b) => {
    const da = a.deleting ? 1 : 0;
    const db = b.deleting ? 1 : 0;
    const ra = a.state.kind === "review" ? a.state.count : 0;
    const rb = b.state.kind === "review" ? b.state.count : 0;
    return da - db || rb - ra || b.activityAt - a.activityAt;
  });

  const user = { name: session.user.name, email: session.user.email, image: session.user.image };
  const switcher = rows.map((r) => ({ name: r.name, slug: r.slug, planLabel: r.deleting ? "Deleting" : r.plan.label }));
  const attention = invites.length + joinable.length;
  const only = rows.length === 1 ? rows[0] : null;
  // Every workspace this person has is being deleted: creating one is the way forward.
  const allDeleting = rows.length > 0 && rows.every((r) => r.deleting);
  const query = await searchParams;
  const justDeleted = rows.find((r) => r.deleting && r.slug === query.deleted) ?? null;
  // Only the name, trimmed to a sane length: it came from the URL.
  const justRemoved = query.removed?.trim().slice(0, 80) || null;

  return (
    <div className="min-h-dvh bg-bg text-fg font-sans flex flex-col">
      <WorkspaceAppBar workspaces={switcher} user={user} isAdmin={isAdmin} />

      <main className="w-full max-w-[960px] mx-auto px-4 md:px-6 py-8 md:py-10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em]">Workspaces</h1>
          {rows.length > 0 && (
            <Link href="/w/create" className={allDeleting ? BTN_PRIMARY : BTN_OUTLINE}>
              <Plus className="w-4 h-4" strokeWidth={2.25} aria-hidden />
              New workspace
            </Link>
          )}
        </div>

        {attention > 0 && (
          <section aria-labelledby="attention-title" className="flex flex-col gap-2">
            <SectionTitle id="attention-title">Needs your attention</SectionTitle>
            <ul className="rounded-xl border border-border bg-surface overflow-hidden">
              {invites.map((inv) => (
                <AttentionRow
                  key={inv.token}
                  icon={<Mail className="w-4 h-4" aria-hidden />}
                  text={
                    <>
                      <span className="text-fg font-semibold">{inv.workspace.name}</span> invited you as{" "}
                      {humanize(inv.role).toLowerCase()}
                    </>
                  }
                  detail={`Expires ${lowerFirst(relativeTime(inv.expiresAt))}`}
                  action={
                    <Link href={`/invite/${inv.token}`} className={BTN_OUTLINE}>
                      Review invite
                    </Link>
                  }
                />
              ))}
              {joinable.map((w) => (
                <AttentionRow
                  key={w.slug}
                  icon={<UserPlus className="w-4 h-4" aria-hidden />}
                  text={
                    <>
                      <span className="text-fg font-semibold">{w.name}</span> is open to everyone with your email domain
                    </>
                  }
                  detail={`You would join as ${humanize(w.role).toLowerCase()}${w.members > 0 ? ` · ${plural(w.members, "member")}` : ""}`}
                  action={<JoinWorkspaceButton slug={w.slug} name={w.name} />}
                />
              ))}
            </ul>
          </section>
        )}

        {rows.length > 0 ? (
          <section aria-labelledby="workspaces-title" className="flex flex-col gap-2">
            <SectionTitle id="workspaces-title" hidden={attention === 0}>
              Your workspaces
            </SectionTitle>
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <ul>
                {rows.map((r) => (
                  <WorkspaceRow key={r.slug} row={r} hideNext={r === only && r.state.kind === "setup"} />
                ))}
              </ul>
              {only?.state.kind === "setup" && <NextStepPanel row={only} state={only.state} />}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-surface px-6 py-12 flex flex-col items-center text-center gap-4">
            <span className="w-12 h-12 rounded-xl bg-panel border border-border flex items-center justify-center text-secondary">
              <Building2 className="w-5 h-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-semibold">You are not in a workspace yet</h2>
              <p className="mt-1.5 text-sm text-muted max-w-md">
                A workspace is your team&apos;s private space for candidates, assessments and interviews. The first 14
                days include every Growth feature, with no card needed.
              </p>
            </div>
            <Link href="/w/create" className={BTN_PRIMARY}>
              Create workspace <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </section>
        )}

        <footer className="mt-4 pt-5 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[13px] text-subtle">
          <p>
            {allDeleting
              ? "Need a fresh start? Create a new workspace; the trial starts again."
              : invites.length === 0
                ? "Invitations from teammates appear on this page when you sign in with the invited email."
                : "Each workspace keeps its own candidates, assessments, members and billing."}
          </p>
          <Link
            href="/hire"
            className="inline-flex items-center gap-1 min-h-11 sm:min-h-0 font-medium text-secondary-soft hover:text-fg transition-colors"
          >
            How hiring works <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </footer>
      </main>
      {justDeleted ? <HubNotice slug={justDeleted.slug} name={justDeleted.name} /> : justRemoved ? <HubNotice removed={justRemoved} /> : null}
    </div>
  );
}

function SectionTitle({ id, hidden, children }: { id: string; hidden?: boolean; children: React.ReactNode }) {
  return (
    <h2 id={id} className={`text-xs font-semibold uppercase tracking-[0.06em] text-subtle px-1 ${hidden ? "sr-only" : ""}`}>
      {children}
    </h2>
  );
}

function AttentionRow({
  icon,
  text,
  detail,
  action,
}: {
  icon: React.ReactNode;
  text: React.ReactNode;
  detail: string;
  action: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)] sm:grid-cols-[32px_minmax(0,1fr)_auto] gap-x-4 gap-y-3 items-center px-4 sm:px-5 py-4 border-t border-border first:border-t-0">
      <span
        aria-hidden
        className="w-8 h-8 rounded-lg bg-panel border border-border flex items-center justify-center text-secondary-soft"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{text}</p>
        <p className="mt-0.5 text-[13px] text-subtle">{detail}</p>
      </div>
      <div className="col-start-2 sm:col-start-3 flex [&>*]:flex-1 sm:[&>*]:flex-none">{action}</div>
    </li>
  );
}

function WorkspaceRow({ row, hideNext }: { row: Row; hideNext?: boolean }) {
  const { state } = row;
  if (row.deleting) return <DeletingRow row={row} deleting={row.deleting} />;
  const fact =
    state.kind === "setup"
      ? hideNext
        ? null
        : `Next: ${lowerFirst(state.next.title)}`
      : row.candidates > 0
        ? plural(row.candidates, "candidate")
        : null;
  return (
    <li className="group relative border-t border-border first:border-t-0 hover:bg-panel transition-colors">
      <div className="grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[44px_minmax(0,1fr)_auto] gap-x-4 gap-y-3 items-center px-4 sm:px-5 py-4">
        <WorkspaceInitial name={row.name} size="lg" />
        <div className="min-w-0">
          {/* The name is the row's one link; the stretched pseudo-element makes the whole row click. */}
          <Link
            href={`/w/${row.slug}`}
            className="text-[15px] font-semibold text-fg group-hover:text-secondary-soft transition-colors after:absolute after:inset-0 after:content-['']"
          >
            {row.name}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-subtle">
            <PlanChip plan={row.plan} />
            <span className="text-muted">{humanize(row.role)}</span>
            {/* The separator travels with its item, so a wrapped line never ends in a lone dot. */}
            {[fact, row.activity].filter(Boolean).map((item) => (
              <span key={item}>
                <span aria-hidden className="mr-2">
                  ·
                </span>
                {item}
              </span>
            ))}
          </p>
        </div>
        <div className="relative z-10 col-start-2 sm:col-start-3 flex items-center gap-3 sm:gap-4 sm:justify-end">
          <RowState state={state} />
          {/* A lone workspace gets its buttons in the next-step panel below instead. */}
          {!hideNext && (
            <Link
              href={`/w/${row.slug}`}
              aria-label={`${state.kind === "setup" ? "Continue setup of" : "Open"} ${row.name}`}
              className={`${state.kind === "review" ? BTN_PRIMARY : BTN_OUTLINE} flex-1 sm:flex-none`}
            >
              {state.kind === "setup" ? "Continue setup" : "Open"}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * A workspace inside its deletion window: nobody can use it, so the row
 * shows only that and the way back. It still opens the deletion screen, so
 * links from the email keep working.
 */
function DeletingRow({ row, deleting }: { row: Row; deleting: NonNullable<Row["deleting"]> }) {
  return (
    <li className="relative border-t border-border first:border-t-0">
      <div className="grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[44px_minmax(0,1fr)_auto] gap-x-4 gap-y-3 items-center px-4 sm:px-5 py-4">
        <span className="opacity-50">
          <WorkspaceInitial name={row.name} size="lg" />
        </span>
        <div className="min-w-0">
          <Link href={`/w/${row.slug}`} className="text-[15px] font-semibold text-muted hover:text-fg transition-colors">
            {row.name}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-subtle">
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11.5px] font-medium bg-danger/10 border border-danger/30 text-danger">
              <Trash2 className="w-3 h-3" aria-hidden />
              Deleting · erased {deleting.finalAt}
            </span>
            <span>{deleting.byYou ? `You scheduled this ${deleting.since}` : `Scheduled by an owner ${deleting.since}`}</span>
          </p>
        </div>
        <div className="col-start-2 sm:col-start-3 flex items-center sm:justify-end">
          {deleting.canRestore ? (
            <RestoreWorkspaceButton slug={row.slug} name={row.name} className="flex-1 sm:flex-none" />
          ) : (
            <span className="text-[13px] text-subtle">Ask an owner to restore it</span>
          )}
        </div>
      </div>
      <p className="px-4 sm:px-5 pb-4 -mt-1 text-[13px] text-subtle">
        Nobody can use {row.name} until it is restored. Its candidates, screenings and settings are kept until {deleting.finalAt}.
      </p>
    </li>
  );
}

function PlanChip({ plan }: { plan: PlanDisplay }) {
  return plan.onTrial ? (
    <span className="inline-flex items-center h-5 px-2 rounded-full text-[11.5px] border border-secondary/60 text-secondary-soft">
      Trial · {plural(plan.trialDaysLeft ?? 0, "day")} left
    </span>
  ) : (
    <span className="inline-flex items-center h-5 px-2 rounded-full text-[11.5px] border border-border-strong text-muted">
      {plan.label}
    </span>
  );
}

function RowState({ state }: { state: HubRowState }) {
  if (state.kind === "review") {
    return (
      <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30 whitespace-nowrap">
        {state.count} to review
      </span>
    );
  }
  if (state.kind === "setup") {
    const pct = Math.round((state.done / state.total) * 100);
    return (
      <div className="flex-1 sm:flex-none sm:w-[150px] flex flex-col gap-1.5 min-w-0">
        <span className="text-xs text-muted sm:text-right whitespace-nowrap">
          <span className="text-fg font-semibold">
            {state.done} of {state.total}
          </span>{" "}
          setup steps
        </span>
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={0}
          aria-valuemax={state.total}
          aria-valuenow={state.done}
          className="h-1.5 w-full rounded-full bg-border overflow-hidden"
        >
          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }
  return null;
}

function NextStepPanel({ row, state }: { row: Row; state: Extract<HubRowState, { kind: "setup" }> }) {
  const action = setupStepAction(state.next.id, row.slug, { aiIncluded: row.plan.growthFeatures });
  return (
    <div className="border-t border-border bg-bg/50 px-4 sm:px-5 py-4 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          Next: {lowerFirst(state.next.title)}
        </p>
        <p className="mt-0.5 text-[13px] text-muted">{state.next.body}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link href={`/w/${row.slug}`} className={BTN_OUTLINE}>
          Open workspace
        </Link>
        <Link href={action.href} className={BTN_PRIMARY}>
          {action.label}
        </Link>
      </div>
    </div>
  );
}
