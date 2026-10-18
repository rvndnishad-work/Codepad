import Link from "next/link";
import { Activity, CheckCircle2, Clock, Code2, Building2, Mail, Wrench, AlertTriangle } from "lucide-react";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadUserPermissions } from "@/lib/permissions/access";
import { actionLabel } from "@/lib/admin/audit";
import { getAllSwitches, switchDef, type SwitchValue } from "@/lib/admin/switches";
import { addDays, sumDailyStats, utcDay } from "@/lib/admin/stats/daily-rollup";
import { jobsSummary, loadEmail24h, loadJobStatuses, loadMaintenance, loadServices, type Tone } from "./jobs/health";
import { developerUserWhere } from "@/lib/users/user-type";
import { Pill, btnCls, cardCls, timeAgo } from "./jobs/ui";

export const metadata = {
  title: "Home — Interviewpad Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Admin home. Any staff role lands here: everyone sees the queues their
 * permissions let them act on; platform admins also get health, both sides
 * in brief (from the nightly AdminDailyStat roll-up) and recent admin
 * activity. Every number is a count, aggregate or roll-up read.
 */

type Queue = { key: string; count: number; label: string; href: string };

const LOW_CREDIT_THRESHOLD = 10;

async function lowCreditWorkspaces(): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`
    SELECT count(*) AS n FROM "Workspace" w
    WHERE EXISTS (SELECT 1 FROM "AIScreeningBatch" b WHERE b."workspaceId" = w.id AND b.status = 'ACTIVE')
      AND COALESCE((SELECT sum(l.amount) FROM "AIInterviewCreditLedger" l WHERE l."workspaceId" = w.id), 0) < ${LOW_CREDIT_THRESHOLD}`);
  return Number(rows[0]?.n ?? 0);
}

async function loadQueues(can: (p: string) => boolean, isAdmin: boolean): Promise<Queue[]> {
  const zero = Promise.resolve(0);
  const moderate = can("content:moderate") || can("content:curate");
  const [blogs, experiences, creators, reports, lowCredits, pastDue] = await Promise.all([
    moderate ? prisma.blogPost.count({ where: { status: "PENDING" } }) : zero,
    can("content:moderate") ? prisma.prepExperience.count({ where: { status: "pending" } }) : zero,
    can("creator:review") ? prisma.creatorApplication.count({ where: { status: "PENDING" } }) : zero,
    can("comment:moderate") || can("content:moderate") ? prisma.contentReport.count({ where: { status: "open" } }) : zero,
    isAdmin ? lowCreditWorkspaces() : zero,
    isAdmin ? prisma.workspace.count({ where: { stripeStatus: "past_due" } }) : zero,
  ]);
  const out: Queue[] = [];
  if (moderate) out.push({ key: "blogs", count: blogs, label: "Blogs awaiting review", href: "/admin/blogs?status=PENDING" });
  if (can("content:moderate"))
    out.push({ key: "exp", count: experiences, label: "Experiences to moderate", href: "/admin/interview-questions/experiences?status=pending" });
  if (can("creator:review")) out.push({ key: "creators", count: creators, label: "Creator applications", href: "/admin/creators?status=PENDING" });
  if (can("comment:moderate") || can("content:moderate"))
    out.push({ key: "reports", count: reports, label: "Open content reports", href: "/admin/inbox#reports" });
  if (isAdmin) {
    out.push({ key: "credits", count: lowCredits, label: "Workspaces low on credits", href: "/admin/recruiters#needs-attention" });
    out.push({ key: "pastdue", count: pastDue, label: "Payment past due", href: "/admin/workspaces?status=past_due" });
  }
  return out;
}

const SIDE_METRICS = [
  "signups",
  "playground_runs",
  "playground_errors",
  "challenge_attempts",
  "challenge_passed",
  "ai_credits_used",
  "ai_credits_bought",
  "ai_credits_included",
  "live_interviews",
  "recording_seconds",
] as const;
type SideSums = Record<(typeof SIDE_METRICS)[number], number>;

/** Live fallback for a fresh install, before the first nightly roll-up. */
async function liveSums(from: Date, to: Date): Promise<SideSums> {
  const range = { gte: from, lt: to };
  const [signups, runs, errors, attempts, passed, ledger, live, rec] = await Promise.all([
    prisma.user.count({ where: { createdAt: range, ...developerUserWhere } }),
    prisma.activityEvent.count({ where: { kind: "playground_run", createdAt: range } }),
    prisma.activityEvent.count({ where: { kind: "playground_run", ok: false, createdAt: range } }),
    prisma.challengeAttempt.count({ where: { startedAt: range } }),
    prisma.challengeAttempt.count({ where: { startedAt: range, status: "passed" } }),
    prisma.aIInterviewCreditLedger.groupBy({
      by: ["kind"],
      where: { createdAt: range, kind: { in: ["CONSUMPTION", "PURCHASE", "INCLUDED", "TRIAL"] } },
      _sum: { amount: true },
    }),
    prisma.interviewSession.count({ where: { startedAt: range, workspaceId: { not: null }, type: { not: "take-home" } } }),
    prisma.interviewRecording.aggregate({ where: { startedAt: range }, _sum: { seconds: true } }),
  ]);
  const k = (kind: string) => ledger.find((l) => l.kind === kind)?._sum.amount ?? 0;
  return {
    signups,
    playground_runs: runs,
    playground_errors: errors,
    challenge_attempts: attempts,
    challenge_passed: passed,
    ai_credits_used: -k("CONSUMPTION"),
    ai_credits_bought: k("PURCHASE"),
    ai_credits_included: k("INCLUDED") + k("TRIAL"),
    live_interviews: live,
    recording_seconds: rec._sum.seconds ?? 0,
  };
}

async function loadSides(now: Date) {
  const today = utcDay(now);
  const from = addDays(today, -30);
  const prevFrom = addDays(today, -60);
  const [cur, prev, mrr] = await Promise.all([
    sumDailyStats(from, today, SIDE_METRICS),
    sumDailyStats(prevFrom, from, ["signups"]),
    prisma.workspace.aggregate({
      where: { stripeStatus: { in: ["active", "past_due"] } },
      _sum: { stripeMrrCents: true },
      _count: { _all: true },
    }),
  ]);
  const fromRollup = cur.days > 0;
  const sums: SideSums = fromRollup ? (cur.sums as SideSums) : await liveSums(new Date(now.getTime() - 30 * 86_400_000), now);
  const prevSignups = fromRollup
    ? prev.days > 0
      ? prev.sums.signups
      : null
    : await prisma.user.count({
        where: {
          createdAt: { gte: new Date(now.getTime() - 60 * 86_400_000), lt: new Date(now.getTime() - 30 * 86_400_000) },
          ...developerUserWhere,
        },
      });
  return { sums, prevSignups, fromRollup, mrrCents: mrr._sum.stripeMrrCents, paid: mrr._count._all };
}

const STATE_TONE: Record<string, Tone> = { on: "ok", read_only: "warn", off: "off" };
const STATE_WORD: Record<string, string> = { on: "on", read_only: "read only", off: "off" };

function switchPills(all: SwitchValue[], featured: string[], side: "hiring" | "developer") {
  const keys = new Set(featured);
  // Featured switches, plus any other switch on this side that is not fully on.
  for (const s of all) if (s.state !== "on" && switchDef(s.key)?.side === side) keys.add(s.key);
  return all.filter((s) => keys.has(s.key));
}

const nf = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function pct(n: number, d: number): string {
  if (d === 0) return "0%";
  const v = (n / d) * 100;
  return `${v < 10 && v > 0 ? v.toFixed(1) : Math.round(v)}%`;
}

export default async function AdminHomePage() {
  const session = await auth().catch(() => null);
  const perms = session?.user?.id ? await loadUserPermissions(session.user.id) : new Set<string>();
  const has = perms as ReadonlySet<string>;
  const can = (p: string) => has.has("*") || has.has(p) || has.has("platform:admin");
  const isAdmin = has.has("*") || has.has("platform:admin");
  const now = new Date();
  const today = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  if (!isAdmin) {
    const queues = await loadQueues(can, false);
    const waiting = queues.reduce((a, q) => a + q.count, 0);
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Home</h1>
          <p className="text-sm text-muted">
            {today}. {waiting === 0 ? "Nothing is waiting for you." : `${nf.format(waiting)} item${waiting === 1 ? "" : "s"} waiting for you.`}
          </p>
        </header>
        <QueueChips queues={queues} />
        <Link href="/admin/inbox" className="text-sm text-secondary-soft hover:underline underline-offset-2 self-start">
          Open the inbox
        </Link>
      </div>
    );
  }

  const [queues, statuses, email, maintenance, services, sides, switches, recent] = await Promise.all([
    loadQueues(can, true),
    loadJobStatuses(now),
    loadEmail24h(),
    loadMaintenance(now),
    loadServices(),
    loadSides(now),
    getAllSwitches(),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const jobs = jobsSummary(statuses);
  const down = services.filter((s) => s.tone === "bad");
  const notSet = services.filter((s) => s.tone === "off");
  const servicesTone: Tone = down.length > 0 ? "bad" : notSet.length > 0 ? "warn" : "ok";
  const servicesText =
    down.length > 0
      ? `${down.map((s) => s.name).join(", ")} down`
      : notSet.length > 0
        ? `${notSet.map((s) => s.name).join(", ")} not configured`
        : `${services.map((s) => s.name).join(", ")} ok`;

  const actorIds = [...new Set(recent.map((r) => r.actorId).filter((x): x is string => !!x))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name?.trim() || a.email || "Someone"]));

  const needs = jobs.failing;
  const siteLine = maintenance.tone === "ok" ? "Site is live" : maintenance.label;
  const jobLine = needs === 0 ? "all jobs ok" : needs === 1 ? "one job needs you" : `${needs} jobs need you`;

  const s = sides.sums;
  const signupChange =
    sides.prevSignups && sides.prevSignups > 0 ? Math.round(((s.signups - sides.prevSignups) / sides.prevSignups) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-[26px] font-semibold tracking-[-0.02em] text-fg">Home</h1>
          <p className="text-sm text-muted">
            {today}. {siteLine}, {jobLine}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/assistant" className={btnCls("ghost", "md")}>
            Ask the assistant
          </Link>
          <Link href="/admin/maintenance" className={btnCls("primary", "md")}>
            Schedule maintenance
          </Link>
        </div>
      </header>

      <section aria-label="Health" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <HealthCard icon={Wrench} tone={maintenance.tone} label="Site" href="/admin/maintenance">
          {maintenance.tone === "ok" ? "Live, no maintenance" : maintenance.label}
        </HealthCard>
        <HealthCard icon={Clock} tone={jobs.tone} label="Scheduled jobs" href="/admin/jobs">
          {jobs.ran} of {jobs.total} ok
          {jobs.failing > 0 && <span className="text-danger">, {jobs.failing} failing</span>}
          {jobs.failing === 0 && jobs.late > 0 && <span className="text-warning">, {jobs.late} late</span>}
        </HealthCard>
        <HealthCard icon={Mail} tone={email.tone} label="Email, 24 h" href="/admin/emails">
          {nf.format(email.total)} sent, {nf.format(email.failed)} failed or bounced
        </HealthCard>
        <HealthCard icon={Activity} tone={servicesTone} label="Services" href="/admin/jobs">
          {servicesText}
        </HealthCard>
      </section>

      <QueueChips queues={queues} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SideCard
          icon={Building2}
          title="Recruiters, last 30 days"
          href="/admin/recruiters"
          stats={[
            {
              label: "Revenue a month",
              value: sides.mrrCents == null ? "—" : money.format(sides.mrrCents / 100),
              sub: sides.mrrCents == null ? "Stripe not synced yet" : `from Stripe, ${nf.format(sides.paid)} paid`,
            },
            {
              label: "AI credits used",
              value: nf.format(s.ai_credits_used),
              sub: `${nf.format(s.ai_credits_included)} included, ${nf.format(s.ai_credits_bought)} bought`,
            },
            {
              label: "Live interviews",
              value: nf.format(s.live_interviews),
              sub: `${nf.format(Math.round(s.recording_seconds / 3600))} h recorded`,
            },
          ]}
          switches={switchPills(switches, ["ai-screening", "take-home", "live-interviews", "video-addon"], "hiring")}
        />
        <SideCard
          icon={Code2}
          title="Developers, last 30 days"
          href="/admin/developers"
          stats={[
            {
              label: "Sign-ups",
              value: nf.format(s.signups),
              sub: signupChange == null ? "No earlier month to compare" : `${signupChange >= 0 ? "+" : ""}${signupChange}% on the month before`,
            },
            {
              label: "Playground runs",
              value: nf.format(s.playground_runs),
              sub: `${pct(s.playground_errors, s.playground_runs)} failed in Piston`,
            },
            {
              label: "Challenge pass rate",
              value: pct(s.challenge_passed, s.challenge_attempts),
              sub: `${nf.format(s.challenge_attempts)} attempts`,
            },
          ]}
          switches={switchPills(switches, ["playground-run", "challenges", "prompt-arena", "creator-checkout"], "developer")}
        />
      </section>
      {!sides.fromRollup && (
        <p className="-mt-3 text-[13px] text-subtle">Counted live: the nightly roll-up has not run yet.</p>
      )}

      <section aria-label="Recent admin activity" className={`${cardCls} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <h2 className="text-[15px] font-semibold text-fg flex-1">Recent admin activity</h2>
          <Link href="/admin/audit" className="text-[13px] text-secondary-soft hover:underline underline-offset-2">
            Full audit log
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">No admin actions recorded yet.</p>
        ) : (
          <ul>
            {recent.map((r, i) => {
              const who =
                r.via === "system" ? "System" : (r.actorId && actorName.get(r.actorId)) || r.actorEmail || "Someone";
              return (
                <li
                  key={r.id}
                  className={`grid grid-cols-[1fr_auto] sm:grid-cols-[110px_1fr_150px] gap-x-4 gap-y-1 items-center px-4 py-2.5 text-sm ${i === 0 ? "" : "border-t border-border"}`}
                >
                  <span className="text-[13px] text-subtle order-2 sm:order-none">{timeAgo(r.createdAt, now.getTime())}</span>
                  <span className="min-w-0 text-fg">
                    <span className="font-medium">{who}</span>
                    {r.via === "assistant" && <span className="text-muted"> via the assistant</span>}{" "}
                    <span className="text-muted">{actionLabel(r.action).toLowerCase()}</span>
                    {r.targetLabel && <span> {r.targetLabel}</span>}
                    {r.note && <span className="text-muted">, note: {r.note.length > 80 ? `${r.note.slice(0, 80)}…` : r.note}</span>}
                  </span>
                  <span className="hidden sm:flex justify-end">
                    <Pill tone={r.via === "system" ? "off" : "info"}>{actionGroup(r.action)}</Pill>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

const GROUP_LABEL: Record<string, string> = {
  switch: "Feature switch",
  maintenance: "Maintenance",
  workspace: "Workspace",
  user: "User",
  role: "Roles",
  setting: "Settings",
  pricing: "Pricing",
  content: "Content",
  broadcast: "Notification",
  email: "Email",
  job: "Jobs",
  audit: "Audit log",
};

function actionGroup(action: string): string {
  if (action.startsWith("workspace.credits")) return "Credits";
  const g = action.split(".")[0];
  return GROUP_LABEL[g] ?? g;
}

const TILE: Record<Tone, string> = {
  ok: "bg-success/15 text-success",
  warn: "bg-warning/15 text-warning",
  bad: "bg-danger/15 text-danger",
  off: "bg-panel text-muted",
};

function HealthCard({
  icon: Icon,
  tone,
  label,
  href,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  label: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${cardCls} px-4 py-3.5 flex items-center gap-3 hover:bg-panel/60 transition ${tone === "bad" ? "border-danger/40" : ""}`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TILE[tone]}`}>
        {tone === "bad" ? <AlertTriangle className="w-3.5 h-3.5" /> : tone === "ok" && label === "Site" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-subtle">{label}</span>
        <span className="block text-sm font-medium text-fg truncate">{children}</span>
      </span>
    </Link>
  );
}

function QueueChips({ queues }: { queues: Queue[] }) {
  if (queues.length === 0) return null;
  return (
    <section aria-label="Queues" className="flex flex-wrap gap-2.5">
      {queues.map((q) => (
        <Link
          key={q.key}
          href={q.href}
          className={`${cardCls} flex items-center gap-3 px-3.5 py-2.5 min-w-[200px] hover:bg-panel/60 transition`}
        >
          <span className={`text-[22px] font-semibold tabular-nums ${q.count === 0 ? "text-subtle" : "text-fg"}`}>{nf.format(q.count)}</span>
          <span className="text-[13px] text-muted">{q.label}</span>
        </Link>
      ))}
    </section>
  );
}

function SideCard({
  icon: Icon,
  title,
  href,
  stats,
  switches,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  stats: { label: string; value: string; sub: string }[];
  switches: SwitchValue[];
}) {
  return (
    <div className={`${cardCls} p-5 flex flex-col gap-4`}>
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-panel text-muted flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </span>
        <h2 className="text-[15px] font-semibold text-fg flex-1">{title}</h2>
        <Link href={href} className="text-[13px] text-secondary-soft hover:underline underline-offset-2">
          Open dashboard
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((st) => (
          <div key={st.label} className="min-w-0">
            <div className="text-xs font-semibold text-subtle">{st.label}</div>
            <div className="text-[22px] font-semibold tabular-nums text-fg">{st.value}</div>
            <div className="text-[13px] text-muted">{st.sub}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {switches.map((sw) => (
          <Link key={sw.key} href="/admin/switches" title={sw.message || undefined}>
            <Pill tone={STATE_TONE[sw.state] ?? "off"}>
              {switchDef(sw.key)?.label ?? sw.key} {STATE_WORD[sw.state] ?? sw.state}
            </Pill>
          </Link>
        ))}
      </div>
    </div>
  );
}
