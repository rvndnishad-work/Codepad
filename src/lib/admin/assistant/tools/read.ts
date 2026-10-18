/**
 * Read tools: named, typed lookups over Postgres through Prisma. No raw SQL.
 * Every executor takes a limit, counts with _count / groupBy / aggregate and
 * runs independent queries together.
 */
import { prisma } from "@/lib/prisma";
import { CRON_JOBS } from "@/lib/admin/cron-run";
import { getAllSwitches, switchDef } from "@/lib/admin/switches";
import { actionLabel } from "@/lib/admin/audit";
import { emailOut } from "../mask";
import type { ToolDef } from "../types";

const DAY = 24 * 60 * 60 * 1000;
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, dflt: number) => (typeof v === "number" ? v : dflt);

/** Credit balance per workspace (sum of the ledger). */
export async function balances(workspaceIds: string[]): Promise<Map<string, number>> {
  if (!workspaceIds.length) return new Map();
  const rows = await prisma.aIInterviewCreditLedger.groupBy({
    by: ["workspaceId"],
    where: { workspaceId: { in: workspaceIds } },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.workspaceId, r._sum.amount ?? 0]));
}

/** Screenings invited but not started (each will use a credit) per workspace. */
async function pendingScreenings(workspaceIds: string[]): Promise<Map<string, number>> {
  if (!workspaceIds.length) return new Map();
  const rows = await prisma.aIInterviewSession.groupBy({
    by: ["workspaceId"],
    where: { workspaceId: { in: workspaceIds }, status: "PENDING", practice: false, batch: { status: "ACTIVE" } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.workspaceId, r._count._all]));
}

const find_workspace: ToolDef = {
  kind: "read",
  decl: {
    name: "find_workspace",
    description: "Find hiring workspaces by name, slug or id. Returns up to 8 matches with plan, trial, Stripe status and credit balance.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Name, slug or id", maxLength: 120 } },
      required: ["query"],
    },
  },
  async run(args) {
    const q = str(args.query);
    const rows = await prisma.workspace.findMany({
      where: {
        OR: [
          { id: q },
          { slug: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, slug: true, planName: true, trialEndsAt: true, stripeStatus: true,
        lockedAt: true, _count: { select: { members: true } },
      },
    });
    const bal = await balances(rows.map((r) => r.id));
    return {
      summary: rows.length === 1 ? `Looked up workspace ${rows[0].name}` : `Searched workspaces for "${q}", ${rows.length} found`,
      href: rows.length === 1 ? `/admin/workspaces/${rows[0].id}` : undefined,
      data: rows.map((r) => ({
        id: r.id, name: r.name, slug: r.slug, plan: r.planName, trialEndsAt: iso(r.trialEndsAt),
        stripeStatus: r.stripeStatus, locked: !!r.lockedAt, members: r._count.members, credits: bal.get(r.id) ?? 0,
      })),
    };
  },
};

const get_workspace: ToolDef = {
  kind: "read",
  decl: {
    name: "get_workspace",
    description:
      "Full picture of one workspace: plan, trial, Stripe snapshot (status, seats, MRR, period end, past due since), members and owners, credit balance with a 30-day ledger summary, and active screening batches with pending invites.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Workspace id or slug", maxLength: 120 },
        reveal: { type: "boolean", description: "Return owner emails unmasked. Only when the admin asks for them." },
      },
      required: ["id"],
    },
  },
  async run(args) {
    const id = str(args.id);
    const reveal = args.reveal === true;
    const ws = await prisma.workspace.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: {
        id: true, name: true, slug: true, planName: true, createdAt: true, trialEndsAt: true, trialEndedAt: true,
        stripeCustomerId: true, stripeStatus: true, stripeSeatQuantity: true, stripeMrrCents: true, stripeInterval: true,
        stripeCurrentPeriodEnd: true, stripePastDueSince: true, stripeSyncedAt: true,
        lockedAt: true, lockedReason: true, deletionScheduledAt: true, videoEnabled: true,
        includedCreditsLeft: true, lowCreditThreshold: true,
        _count: { select: { members: true, candidates: true } },
      },
    });
    if (!ws) return { summary: `No workspace "${id}"`, data: { error: "Workspace not found" } };
    const since = new Date(Date.now() - 30 * DAY);
    const [owners, balanceAgg, ledger30, batches] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: { workspaceId: ws.id, role: "OWNER" },
        take: 3,
        select: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId: ws.id }, _sum: { amount: true } }),
      prisma.aIInterviewCreditLedger.groupBy({
        by: ["kind"],
        where: { workspaceId: ws.id, createdAt: { gte: since } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.aIScreeningBatch.findMany({
        where: { workspaceId: ws.id, status: "ACTIVE" },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, positionTitle: true, createdAt: true, _count: { select: { sessions: true } } },
      }),
    ]);
    const pendingByBatch = batches.length
      ? await prisma.aIInterviewSession.groupBy({
          by: ["batchId"],
          where: { batchId: { in: batches.map((b) => b.id) }, status: "PENDING" },
          _count: { _all: true },
        })
      : [];
    const pending = new Map(pendingByBatch.map((p) => [p.batchId, p._count._all]));
    return {
      summary: `Looked up workspace ${ws.name}`,
      href: `/admin/workspaces/${ws.id}`,
      data: {
        id: ws.id, name: ws.name, slug: ws.slug, plan: ws.planName, createdAt: iso(ws.createdAt),
        trialEndsAt: iso(ws.trialEndsAt), trialEndedAt: iso(ws.trialEndedAt),
        stripe: {
          customer: !!ws.stripeCustomerId, status: ws.stripeStatus, seats: ws.stripeSeatQuantity,
          mrr: ws.stripeMrrCents == null ? null : ws.stripeMrrCents / 100, interval: ws.stripeInterval,
          currentPeriodEnd: iso(ws.stripeCurrentPeriodEnd), pastDueSince: iso(ws.stripePastDueSince), syncedAt: iso(ws.stripeSyncedAt),
        },
        locked: ws.lockedAt ? { at: iso(ws.lockedAt), reason: ws.lockedReason } : null,
        deletionScheduledAt: iso(ws.deletionScheduledAt),
        videoAddon: ws.videoEnabled,
        members: ws._count.members,
        candidates: ws._count.candidates,
        owners: owners.map((o) => ({ id: o.user.id, name: o.user.name, email: emailOut(o.user.email, reveal) })),
        credits: {
          balance: balanceAgg._sum.amount ?? 0,
          includedLeft: ws.includedCreditsLeft,
          lowCreditThreshold: ws.lowCreditThreshold,
          last30Days: ledger30.map((l) => ({ kind: l.kind, total: l._sum.amount ?? 0, entries: l._count._all })),
        },
        activeBatches: batches.map((b) => ({
          id: b.id, position: b.positionTitle, createdAt: iso(b.createdAt), invites: b._count.sessions, pending: pending.get(b.id) ?? 0,
        })),
      },
    };
  },
};

const get_credit_ledger: ToolDef = {
  kind: "read",
  decl: {
    name: "get_credit_ledger",
    description: "AI credit ledger of a workspace: balance, totals by kind over the window, and the latest 15 entries.",
    parameters: {
      type: "object",
      properties: {
        workspaceId: { type: "string", maxLength: 60 },
        days: { type: "integer", minimum: 1, maximum: 365, description: "Window in days, default 30" },
      },
      required: ["workspaceId"],
    },
  },
  async run(args) {
    const workspaceId = str(args.workspaceId);
    const days = num(args.days, 30);
    const since = new Date(Date.now() - days * DAY);
    const [ws, total, byKind, recent] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
      prisma.aIInterviewCreditLedger.aggregate({ where: { workspaceId }, _sum: { amount: true } }),
      prisma.aIInterviewCreditLedger.groupBy({
        by: ["kind"],
        where: { workspaceId, createdAt: { gte: since } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.aIInterviewCreditLedger.findMany({
        where: { workspaceId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { kind: true, amount: true, note: true, createdAt: true },
      }),
    ]);
    if (!ws) return { summary: "Workspace not found", data: { error: "Workspace not found" } };
    return {
      summary: `Read credit ledger, ${days} days`,
      href: `/admin/workspaces/${workspaceId}/billing`,
      data: {
        workspace: ws.name,
        balance: total._sum.amount ?? 0,
        windowDays: days,
        byKind: byKind.map((k) => ({ kind: k.kind, total: k._sum.amount ?? 0, entries: k._count._all })),
        recent: recent.map((r) => ({ kind: r.kind, amount: r.amount, note: r.note, at: iso(r.createdAt) })),
      },
    };
  },
};

const list_workspaces_needing_attention: ToolDef = {
  kind: "read",
  decl: {
    name: "list_workspaces_needing_attention",
    description: "Workspaces that need a look: Stripe past due or unpaid, trials ending in 7 days, and low credits while a screening batch is active.",
    parameters: { type: "object", properties: {} },
  },
  async run() {
    const now = new Date();
    const [pastDue, trials, activeBatchWs] = await Promise.all([
      prisma.workspace.findMany({
        where: { stripeStatus: { in: ["past_due", "unpaid"] } },
        take: 10,
        orderBy: { stripePastDueSince: "asc" },
        select: { id: true, name: true, planName: true, stripeStatus: true, stripePastDueSince: true },
      }),
      prisma.workspace.findMany({
        where: { trialEndsAt: { gte: now, lte: new Date(now.getTime() + 7 * DAY) } },
        take: 10,
        orderBy: { trialEndsAt: "asc" },
        select: { id: true, name: true, trialEndsAt: true },
      }),
      prisma.aIScreeningBatch.findMany({
        where: { status: "ACTIVE" },
        distinct: ["workspaceId"],
        take: 200,
        select: { workspaceId: true, workspace: { select: { name: true } } },
      }),
    ]);
    const ids = activeBatchWs.map((b) => b.workspaceId);
    const [bal, pend] = await Promise.all([balances(ids), pendingScreenings(ids)]);
    const lowCredits = activeBatchWs
      .map((b) => ({ id: b.workspaceId, name: b.workspace.name, credits: bal.get(b.workspaceId) ?? 0, pendingScreenings: pend.get(b.workspaceId) ?? 0 }))
      .filter((w) => w.pendingScreenings > 0 && (w.credits < 10 || w.credits < w.pendingScreenings))
      .sort((a, b) => a.credits - a.pendingScreenings - (b.credits - b.pendingScreenings))
      .slice(0, 10);
    return {
      summary: `Checked past due, trials and low credits (${pastDue.length + trials.length + lowCredits.length} found)`,
      data: {
        pastDue: pastDue.map((w) => ({ id: w.id, name: w.name, plan: w.planName, status: w.stripeStatus, since: iso(w.stripePastDueSince) })),
        trialsEnding: trials.map((w) => ({ id: w.id, name: w.name, endsAt: iso(w.trialEndsAt) })),
        lowCreditsWithActiveBatch: lowCredits,
      },
    };
  },
};

const find_user: ToolDef = {
  kind: "read",
  decl: {
    name: "find_user",
    description: "Find people by name or email. Emails come back masked unless reveal is true (only when the admin asks for the address).",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 120 },
        reveal: { type: "boolean", description: "Unmask emails" },
      },
      required: ["query"],
    },
  },
  async run(args) {
    const q = str(args.query);
    const reveal = args.reveal === true;
    const rows = await prisma.user.findMany({
      where: {
        OR: [{ id: q }, { email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }],
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, userType: true, banned: true, deletedAt: true, createdAt: true, lastSignInAt: true,
        _count: { select: { workspaces: true } },
      },
    });
    return {
      summary: `Searched people for "${q}", ${rows.length} found${reveal ? ", emails shown" : ""}`,
      href: rows.length === 1 ? `/admin/users/${rows[0].id}` : undefined,
      data: rows.map((u) => ({
        id: u.id, name: u.name, email: emailOut(u.email, reveal), type: u.userType, suspended: u.banned,
        deleted: !!u.deletedAt, joined: iso(u.createdAt), lastSignIn: iso(u.lastSignInAt), workspaces: u._count.workspaces,
      })),
    };
  },
};

const get_user: ToolDef = {
  kind: "read",
  decl: {
    name: "get_user",
    description: "One person: account state, suspension, roles, workspaces and activity counts. Email masked unless reveal is true.",
    parameters: {
      type: "object",
      properties: { id: { type: "string", maxLength: 60 }, reveal: { type: "boolean" } },
      required: ["id"],
    },
  },
  async run(args) {
    const id = str(args.id);
    const reveal = args.reveal === true;
    const u = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, userType: true, createdAt: true, lastSignInAt: true, deletedAt: true,
        banned: true, bannedReason: true, bannedUntil: true, totpEnabledAt: true,
        roles: { take: 10, select: { role: { select: { key: true } } } },
        workspaces: { take: 5, select: { role: true, workspace: { select: { id: true, name: true } } } },
        _count: { select: { workspaces: true, attempts: true, blogs: true, snippets: true } },
      },
    });
    if (!u) return { summary: "User not found", data: { error: "User not found" } };
    return {
      summary: `Looked up ${u.name || "a user"}`,
      href: `/admin/users/${u.id}`,
      data: {
        id: u.id, name: u.name, email: emailOut(u.email, reveal), type: u.userType, joined: iso(u.createdAt),
        lastSignIn: iso(u.lastSignInAt), deleted: iso(u.deletedAt), twoFactor: !!u.totpEnabledAt,
        suspension: u.banned ? { reason: u.bannedReason, until: iso(u.bannedUntil) } : null,
        roles: u.roles.map((r) => r.role.key),
        workspaces: u.workspaces.map((w) => ({ id: w.workspace.id, name: w.workspace.name, role: w.role })),
        counts: u._count,
      },
    };
  },
};

const get_audit_log: ToolDef = {
  kind: "read",
  decl: {
    name: "get_audit_log",
    description: "Platform audit log of admin, assistant and system actions, newest first. Filter by action prefix, target, actor email or days.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: 'Action key or prefix, e.g. "workspace.credits" or "switch.set"', maxLength: 80 },
        targetType: { type: "string", maxLength: 40 },
        targetId: { type: "string", maxLength: 60 },
        actorEmail: { type: "string", maxLength: 120 },
        days: { type: "integer", minimum: 1, maximum: 365 },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
  },
  async run(args) {
    const days = num(args.days, 7);
    const limit = num(args.limit, 20);
    const where = {
      createdAt: { gte: new Date(Date.now() - days * DAY) },
      ...(args.action ? { action: { startsWith: str(args.action) } } : {}),
      ...(args.targetType ? { targetType: str(args.targetType) } : {}),
      ...(args.targetId ? { targetId: str(args.targetId) } : {}),
      ...(args.actorEmail ? { actorEmail: { contains: str(args.actorEmail), mode: "insensitive" as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { action: true, via: true, actorEmail: true, targetType: true, targetLabel: true, targetId: true, note: true, createdAt: true },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);
    return {
      summary: `Read audit log, ${days} days`,
      href: "/admin/audit",
      data: {
        total,
        rows: rows.map((r) => ({
          at: iso(r.createdAt), what: actionLabel(r.action), action: r.action, via: r.via, by: r.actorEmail,
          target: r.targetLabel ?? r.targetId, targetType: r.targetType, note: r.note,
        })),
      },
    };
  },
};

const list_failed_jobs: ToolDef = {
  kind: "read",
  decl: {
    name: "list_failed_jobs",
    description: "Scheduled jobs that failed in the last 48 hours (with error text) and jobs that are late or have not run.",
    parameters: { type: "object", properties: {} },
  },
  async run() {
    const now = Date.now();
    const [failed, failCounts, lastRuns] = await Promise.all([
      prisma.cronRun.findMany({
        where: { ok: false, startedAt: { gte: new Date(now - 2 * DAY) } },
        orderBy: { startedAt: "desc" },
        take: 20,
        select: { job: true, startedAt: true, error: true, summary: true },
      }),
      prisma.cronRun.groupBy({
        by: ["job"],
        where: { ok: false, startedAt: { gte: new Date(now - 2 * DAY) } },
        _count: { _all: true },
      }),
      prisma.cronRun.groupBy({
        by: ["job"],
        where: { startedAt: { gte: new Date(now - 3 * DAY) } },
        _max: { startedAt: true },
      }),
    ]);
    const last = new Map(lastRuns.map((r) => [r.job, r._max.startedAt]));
    const late = CRON_JOBS.flatMap((j) => {
      const at = last.get(j.job);
      const graceMs = Math.max(2 * j.expectedMinutes, 15) * 60_000;
      if (at && now - at.getTime() <= graceMs) return [];
      return [{ job: j.job, every: j.every, lastRun: iso(at ?? null), note: at ? "late" : "no run in 3 days" }];
    });
    return {
      summary: `Checked jobs: ${failed.length ? `${failCounts.length} failing` : "no failures"}, ${late.length} late`,
      href: "/admin/jobs",
      data: {
        failuresByJob: failCounts.map((f) => ({ job: f.job, failures48h: f._count._all })),
        recentFailures: failed.map((f) => ({ job: f.job, at: iso(f.startedAt), error: f.error?.slice(0, 300), summary: f.summary?.slice(0, 200) })),
        late,
      },
    };
  },
};

const get_moderation_queue: ToolDef = {
  kind: "read",
  decl: {
    name: "get_moderation_queue",
    description: "What is waiting for moderation: pending blog posts (oldest first), open content reports, pending interview experiences, creator applications and open alerts.",
    parameters: { type: "object", properties: {} },
  },
  async run() {
    const [blogCount, blogs, reportCount, reports, experiences, creatorApps, alerts] = await Promise.all([
      prisma.blogPost.count({ where: { status: "PENDING" } }),
      prisma.blogPost.findMany({
        where: { status: "PENDING" },
        orderBy: { updatedAt: "asc" },
        take: 8,
        select: { id: true, title: true, updatedAt: true, user: { select: { name: true } } },
      }),
      prisma.contentReport.count({ where: { status: "open" } }),
      prisma.contentReport.findMany({
        where: { status: "open" },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: { id: true, targetType: true, targetId: true, reason: true, createdAt: true },
      }),
      prisma.prepExperience.count({ where: { status: "pending" } }),
      prisma.creatorApplication.count({ where: { status: "PENDING" } }),
      prisma.gemmaAlert.groupBy({ by: ["severity"], where: { status: "UNRESOLVED" }, _count: { _all: true } }),
    ]);
    const now = Date.now();
    return {
      summary: `Read moderation queue (${blogCount} blogs, ${reportCount} reports)`,
      href: "/admin/blogs?status=PENDING",
      data: {
        pendingBlogs: {
          total: blogCount,
          oldest: blogs.map((b) => ({ id: b.id, title: b.title, author: b.user?.name, waitingDays: Math.floor((now - b.updatedAt.getTime()) / DAY) })),
        },
        openReports: { total: reportCount, oldest: reports.map((r) => ({ ...r, createdAt: iso(r.createdAt) })) },
        pendingExperiences: experiences,
        pendingCreatorApplications: creatorApps,
        openAlertsBySeverity: alerts.map((a) => ({ severity: a.severity, count: a._count._all })),
      },
    };
  },
};

const get_switches: ToolDef = {
  kind: "read",
  decl: {
    name: "get_switches",
    description: "Every feature switch with its state (on, read_only, off), message and resume time.",
    parameters: { type: "object", properties: {} },
  },
  async run() {
    const all = await getAllSwitches();
    const notOn = all.filter((s) => s.state !== "on");
    return {
      summary: `Read feature switches (${notOn.length} not on)`,
      href: "/admin/switches",
      data: all.map((s) => ({
        key: s.key, label: switchDef(s.key)?.label, state: s.state,
        ...(s.state !== "on" ? { message: s.message, resumeAt: iso(s.resumeAt), note: s.updatedNote, changedAt: iso(s.updatedAt) } : {}),
      })),
    };
  },
};

const get_maintenance: ToolDef = {
  kind: "read",
  decl: {
    name: "get_maintenance",
    description: "Maintenance rules that are active now or scheduled, with area, paths, window and message.",
    parameters: { type: "object", properties: {} },
  },
  async run() {
    const now = new Date();
    const rules = await prisma.maintenanceRule.findMany({
      where: { endedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      orderBy: { startsAt: "asc" },
      take: 20,
      select: { id: true, area: true, paths: true, message: true, startsAt: true, endsAt: true, bannerHours: true },
    });
    const data = rules.map((r) => ({
      id: r.id, area: r.area, paths: r.paths.slice(0, 6), message: r.message,
      startsAt: iso(r.startsAt), endsAt: iso(r.endsAt), bannerHours: r.bannerHours,
      state: !r.startsAt || r.startsAt <= now ? "active" : "upcoming",
    }));
    return {
      summary: `Read maintenance (${data.filter((d) => d.state === "active").length} active, ${data.filter((d) => d.state === "upcoming").length} upcoming)`,
      href: "/admin/maintenance",
      data,
    };
  },
};

const RANGE_DAYS: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };

const get_platform_stats: ToolDef = {
  kind: "read",
  decl: {
    name: "get_platform_stats",
    description: "Platform numbers over a range: signups, active users, playground runs, challenge attempts, AI credits used and bought, screenings. Uses the daily roll-up; falls back to live counts when the roll-up has no rows.",
    parameters: {
      type: "object",
      properties: { range: { type: "string", enum: ["1d", "7d", "30d", "90d"] } },
    },
  },
  async run(args) {
    const range = str(args.range) || "7d";
    const days = RANGE_DAYS[range] ?? 7;
    const from = new Date(Date.now() - days * DAY);
    const sums = await prisma.adminDailyStat.groupBy({
      by: ["metric"],
      where: { day: { gte: from }, dim: "" },
      _sum: { value: true },
    });
    if (sums.length > 0) {
      const [screenings, workspaces] = await Promise.all([
        prisma.aIInterviewSession.count({ where: { createdAt: { gte: from }, practice: false } }),
        prisma.workspace.count({ where: { createdAt: { gte: from } } }),
      ]);
      return {
        summary: `Read platform stats, ${range} (daily roll-up)`,
        data: {
          source: "daily roll-up (whole UTC days; today not included)",
          range,
          metrics: Object.fromEntries(sums.map((s) => [s.metric, Math.round((s._sum.value ?? 0) * 100) / 100])),
          live: { aiScreeningsCreated: screenings, newWorkspaces: workspaces },
        },
      };
    }
    const where = { createdAt: { gte: from } };
    const [signups, attempts, screenings, workspaces, used, bought, blogs] = await Promise.all([
      prisma.user.count({ where }),
      prisma.challengeAttempt.count({ where: { startedAt: { gte: from } } }),
      prisma.aIInterviewSession.count({ where: { ...where, practice: false } }),
      prisma.workspace.count({ where }),
      prisma.aIInterviewCreditLedger.aggregate({ where: { ...where, kind: "CONSUMPTION" }, _sum: { amount: true } }),
      prisma.aIInterviewCreditLedger.aggregate({ where: { ...where, kind: "PURCHASE" }, _sum: { amount: true } }),
      prisma.blogPost.count({ where }),
    ]);
    return {
      summary: `Read platform stats, ${range} (live counts)`,
      data: {
        source: "live counts (no daily roll-up rows yet)",
        range,
        metrics: {
          signups, challenge_attempts: attempts, ai_screenings_created: screenings, new_workspaces: workspaces,
          ai_credits_used: -(used._sum.amount ?? 0), ai_credits_bought: bought._sum.amount ?? 0, blog_posts: blogs,
        },
      },
    };
  },
};

const list_trials_ending: ToolDef = {
  kind: "read",
  decl: {
    name: "list_trials_ending",
    description: "Workspaces whose trial ends within the given days, soonest first, with members, credits and whether they have a paid subscription.",
    parameters: {
      type: "object",
      properties: { days: { type: "integer", minimum: 1, maximum: 60, description: "Default 7" } },
    },
  },
  async run(args) {
    const days = num(args.days, 7);
    const now = new Date();
    const rows = await prisma.workspace.findMany({
      where: { trialEndsAt: { gte: now, lte: new Date(now.getTime() + days * DAY) } },
      orderBy: { trialEndsAt: "asc" },
      take: 25,
      select: {
        id: true, name: true, planName: true, trialEndsAt: true, stripeStatus: true, createdAt: true,
        _count: { select: { members: true, candidates: true, aiScreeningBatches: true } },
      },
    });
    const bal = await balances(rows.map((r) => r.id));
    return {
      summary: `Listed trials ending in ${days} days (${rows.length})`,
      href: "/admin/workspaces",
      data: rows.map((w) => ({
        id: w.id, name: w.name, plan: w.planName, endsAt: iso(w.trialEndsAt), stripeStatus: w.stripeStatus,
        members: w._count.members, candidates: w._count.candidates, screeningBatches: w._count.aiScreeningBatches,
        credits: bal.get(w.id) ?? 0,
      })),
    };
  },
};

const search_content: ToolDef = {
  kind: "read",
  decl: {
    name: "search_content",
    description: "Search interview questions, coding challenges and blog posts by title. Returns up to 5 of each with status.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 120 },
        type: { type: "string", enum: ["all", "question", "challenge", "blog"] },
      },
      required: ["query"],
    },
  },
  async run(args) {
    const q = str(args.query);
    const type = str(args.type) || "all";
    const title = { contains: q, mode: "insensitive" as const };
    const [questions, challenges, blogs] = await Promise.all([
      type === "all" || type === "question"
        ? prisma.prepQuestion.findMany({ where: { title }, take: 5, select: { id: true, title: true, status: true, technology: true, views: true } })
        : [],
      type === "all" || type === "challenge"
        ? prisma.challenge.findMany({ where: { title }, take: 5, select: { id: true, title: true, published: true, archivedAt: true, difficulty: true } })
        : [],
      type === "all" || type === "blog"
        ? prisma.blogPost.findMany({ where: { title }, take: 5, select: { id: true, title: true, status: true, viewCount: true, user: { select: { name: true } } } })
        : [],
    ]);
    return {
      summary: `Searched content for "${q}"`,
      data: {
        questions,
        challenges: challenges.map((c) => ({ ...c, archivedAt: iso(c.archivedAt) })),
        blogs: blogs.map((b) => ({ id: b.id, title: b.title, status: b.status, views: b.viewCount, author: b.user?.name })),
      },
    };
  },
};

export const READ_TOOLS: ToolDef[] = [
  find_workspace,
  get_workspace,
  get_credit_ledger,
  list_workspaces_needing_attention,
  find_user,
  get_user,
  get_audit_log,
  list_failed_jobs,
  get_moderation_queue,
  get_switches,
  get_maintenance,
  get_platform_stats,
  list_trials_ending,
  search_content,
];
