"use server";

/**
 * Settings > Data and privacy actions: retention rules, candidate data
 * requests (find, send a copy, erase), export everything, and deleting the
 * workspace with a 30-day undo. Owners and admins can use all of them,
 * except scheduling or cancelling the deletion, which is for owners only.
 * Every change writes an audit entry.
 */
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { settingsAccess } from "@/lib/workspace/settings-server";
import { RETENTION_DEFAULTS, deletionFinalAt, formatWorkspaceDate, type DateFormat } from "@/lib/workspace/settings";
import {
  EXPORT_COOLDOWN_MINUTES,
  EXPORT_LINK_DAYS,
  dataRequestDueAt,
  deletionConfirmMatches,
  describeCounts,
  normalizeRequestEmail,
  parseRetentionPatch,
  periodLabel,
  retentionNeedsNewNotice,
  totalCount,
  withRetentionDefaults,
  type CandidateDataCounts,
  type DataRequestKind,
  type RetentionPatch,
} from "@/lib/workspace/data-privacy";
import { buildCandidateCopy, buildWorkspaceExport, candidateScope, emailManagers, eraseCandidateScope, settingsUrl } from "@/lib/workspace/data-privacy-server";
import { baseUrl } from "@/lib/interview/room-server";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

type Actor = {
  userId: string;
  email: string | null;
  owner: boolean;
  ws: { id: string; slug: string; name: string; timezone: string; dateFormat: string; deletionScheduledAt: Date | null };
};

/** The signed-in owner or admin of this workspace, or a message to show. */
async function editor(slug: string, opts: { ownerOnly?: boolean } = {}): Promise<Actor | Fail> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return fail("You are signed out. Sign in and try again.");
  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      timezone: true,
      dateFormat: true,
      deletionScheduledAt: true,
      members: { where: { userId: session.user.id }, select: { role: true, permissions: true } },
    },
  });
  if (!ws) return fail("Workspace not found.");
  const me = ws.members[0];
  if (!me) return fail("You are not a member of this workspace.");
  const access = await settingsAccess(me);
  if (opts.ownerOnly ? !access.owner : !access.canEdit) {
    return fail(opts.ownerOnly ? "Only owners can do this." : "Only owners and admins can do this.");
  }
  return { userId: session.user.id, email: session.user.email ?? null, owner: access.owner, ws };
}

const isFail = (x: Actor | Fail): x is Fail => "ok" in x;
const dateFor = (a: Actor, d: Date) => formatWorkspaceDate(d, { timezone: a.ws.timezone, dateFormat: a.ws.dateFormat as DateFormat });
const refresh = (slug: string) => revalidatePath(`/w/${slug}/settings/data-privacy`);

function audit(a: Actor, action: string, meta: Record<string, unknown>, target?: { type: string; id: string }) {
  return writeWorkspaceAuditEntry({
    workspaceId: a.ws.id,
    actorUserId: a.userId,
    actorEmail: a.email,
    action,
    targetType: target?.type ?? "workspace",
    targetId: target?.id ?? a.ws.id,
    // Audit rows with a tab link back to this page.
    meta: { tab: "data-privacy", ...meta },
  });
}

/* ── Retention rules ────────────────────────────────────────────────────── */

export type SaveRetentionResult = { ok: true; changed: number } | { ok: false; error: string; ruleErrors: Partial<Record<string, string>> };

const ruleText = (r: Pick<RetentionPatch, "enabled" | "amount" | "unit">) => (r.enabled ? `On, after ${periodLabel(r.amount, r.unit)}` : "Off");

/**
 * Save the edited rules. A rule that is turned off, turned on, or made
 * shorter has its pending notice cleared, so the nightly run emails admins
 * again before it erases anything.
 */
export async function saveRetentionRulesAction(slug: string, rules: unknown): Promise<SaveRetentionResult> {
  const a = await editor(slug);
  if (isFail(a)) return { ...a, ruleErrors: {} };
  if (!Array.isArray(rules) || !rules.length) return { ok: false, error: "Nothing to save.", ruleErrors: {} };

  const parsed: RetentionPatch[] = [];
  const ruleErrors: Partial<Record<string, string>> = {};
  for (const r of rules) {
    const p = parseRetentionPatch(r);
    if (p.ok) parsed.push(p.value);
    else ruleErrors[String((r as { kind?: unknown })?.kind ?? "rule")] = p.error;
  }
  if (Object.keys(ruleErrors).length) return { ok: false, error: "Check the highlighted rules.", ruleErrors };

  const existing = withRetentionDefaults(await prisma.retentionRule.findMany({ where: { workspaceId: a.ws.id } }));
  let changed = 0;
  for (const next of parsed) {
    const before = existing.find((e) => e.kind === next.kind)!;
    if (before.enabled === next.enabled && before.amount === next.amount && before.unit === next.unit) continue;
    const resetNotice = retentionNeedsNewNotice(before, next);
    await prisma.retentionRule.upsert({
      where: { workspaceId_kind: { workspaceId: a.ws.id, kind: next.kind } },
      create: { workspaceId: a.ws.id, kind: next.kind, enabled: next.enabled, amount: next.amount, unit: next.unit, updatedById: a.userId },
      update: {
        enabled: next.enabled,
        amount: next.amount,
        unit: next.unit,
        updatedById: a.userId,
        ...(resetNotice ? { noticeSentAt: null, nextNoticeAt: null } : {}),
      },
    });
    await audit(a, WORKSPACE_AUDIT_ACTIONS.RETENTION_RULE_CHANGED, {
      kind: next.kind,
      label: RETENTION_DEFAULTS[next.kind].label,
      from: ruleText(before),
      to: ruleText(next),
    });
    changed++;
  }
  if (changed) refresh(slug);
  return { ok: true, changed };
}

/* ── Candidate data requests ────────────────────────────────────────────── */

export type FindResult = { ok: true; email: string; counts: CandidateDataCounts; total: number } | Fail;

/** Look up everything the workspace holds for one email. Changes nothing. */
export async function findCandidateDataAction(slug: string, emailInput: string): Promise<FindResult> {
  const a = await editor(slug);
  if (isFail(a)) return a;
  const email = normalizeRequestEmail(emailInput);
  if (!email) return fail("Enter an email address like name@example.com.");
  const scope = await candidateScope(a.ws.id, { email });
  return { ok: true, email, counts: scope.counts, total: totalCount(scope.counts) };
}

function isKind(v: unknown): v is DataRequestKind {
  return v === "COPY" || v === "ERASE";
}

/** Log a request to handle later. It is due 30 days from today. */
export async function logDataRequestAction(slug: string, emailInput: string, kind: DataRequestKind): Promise<{ ok: true; dueAt: string } | Fail> {
  const a = await editor(slug);
  if (isFail(a)) return a;
  const email = normalizeRequestEmail(emailInput);
  if (!email) return fail("Enter an email address like name@example.com.");
  if (!isKind(kind)) return fail("Choose a copy or an erase.");
  const open = await prisma.dataRequest.findFirst({ where: { workspaceId: a.ws.id, email, kind, status: "OPEN" }, select: { id: true } });
  if (open) return fail("There is already an open request like this for that email.");
  const now = new Date();
  const dueAt = dataRequestDueAt(now);
  const row = await prisma.dataRequest.create({ data: { workspaceId: a.ws.id, email, kind, dueAt, requestedById: a.userId } });
  await audit(a, WORKSPACE_AUDIT_ACTIONS.DATA_REQUEST_CREATED, { email, kind, dueAt: dueAt.toISOString() }, { type: "dataRequest", id: row.id });
  refresh(slug);
  return { ok: true, dueAt: dueAt.toISOString() };
}

export async function cancelDataRequestAction(slug: string, requestId: string): Promise<{ ok: true } | Fail> {
  const a = await editor(slug);
  if (isFail(a)) return a;
  const r = await prisma.dataRequest.updateMany({
    where: { id: requestId, workspaceId: a.ws.id, status: "OPEN" },
    data: { status: "CANCELLED", completedAt: new Date(), completedById: a.userId },
  });
  if (!r.count) return fail("That request is no longer open.");
  refresh(slug);
  return { ok: true };
}

/** Mark the open request done, or record a done one when none was logged. */
async function recordCompleted(a: Actor, email: string, kind: DataRequestKind, counts: CandidateDataCounts, itemCount: number) {
  const now = new Date();
  const open = await prisma.dataRequest.findFirst({
    where: { workspaceId: a.ws.id, email, kind, status: "OPEN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const data = { status: "DONE", completedAt: now, completedById: a.userId, itemCount, summary: counts };
  const row = open
    ? await prisma.dataRequest.update({ where: { id: open.id }, data, select: { id: true } })
    : await prisma.dataRequest.create({
        data: { workspaceId: a.ws.id, email, kind, dueAt: dataRequestDueAt(now), requestedById: a.userId, ...data },
        select: { id: true },
      });
  await audit(a, WORKSPACE_AUDIT_ACTIONS.DATA_REQUEST_COMPLETED, { email, kind, itemCount }, { type: "dataRequest", id: row.id });
}

/** Email the person a JSON copy of everything the workspace holds about them. */
export async function sendCandidateCopyAction(slug: string, emailInput: string): Promise<{ ok: true; itemCount: number } | Fail> {
  const a = await editor(slug);
  if (isFail(a)) return a;
  const email = normalizeRequestEmail(emailInput);
  if (!email) return fail("Enter an email address like name@example.com.");
  const scope = await candidateScope(a.ws.id, { email });
  const itemCount = totalCount(scope.counts);
  if (!itemCount) return fail("There is nothing for that email in this workspace.");

  const copy = await buildCandidateCopy(a.ws.id, scope, a.ws.name);
  const res = await sendEmail({
    template: "data-privacy-notice",
    to: email,
    workspaceId: a.ws.id,
    attachments: [{ filename: "your-data.json", content: Buffer.from(JSON.stringify(copy, null, 2)).toString("base64") }],
    props: {
      subject: `A copy of your data from ${a.ws.name}`,
      badge: "Your data",
      heading: `Here is a copy of the data ${a.ws.name} holds about you.`,
      paragraphs: [
        `You asked ${a.ws.name} for a copy of your data. It is attached as your-data.json: ${describeCounts(scope.counts)}.`,
        "The file opens in any text editor. If you have questions about it, contact the team you applied to.",
      ],
      cta: null,
      footer: `${a.ws.name} uses Interviewpad to run technical screenings.`,
    },
  });
  if (!res.sent) return fail("The email could not be sent. Try again in a few minutes.");
  await recordCompleted(a, email, "COPY", scope.counts, itemCount);
  refresh(slug);
  return { ok: true, itemCount };
}

/** The same copy as a download, for the owner or admin to keep or send another way. */
export async function downloadCandidateCopyAction(slug: string, emailInput: string): Promise<{ ok: true; json: string; filename: string } | Fail> {
  const a = await editor(slug);
  if (isFail(a)) return a;
  const email = normalizeRequestEmail(emailInput);
  if (!email) return fail("Enter an email address like name@example.com.");
  const scope = await candidateScope(a.ws.id, { email });
  if (!totalCount(scope.counts)) return fail("There is nothing for that email in this workspace.");
  const copy = await buildCandidateCopy(a.ws.id, scope, a.ws.name);
  return { ok: true, json: JSON.stringify(copy, null, 2), filename: `data-${email.replace(/[^a-z0-9]+/g, "-")}.json` };
}

/**
 * Erase everything for one email, then email the person to confirm. The
 * confirmation's own line in the email log is removed afterwards, so the
 * only trace left is the request record itself.
 */
export async function eraseCandidateDataAction(slug: string, emailInput: string, confirm: string): Promise<{ ok: true; itemCount: number } | Fail> {
  const a = await editor(slug);
  if (isFail(a)) return a;
  const email = normalizeRequestEmail(emailInput);
  if (!email) return fail("Enter an email address like name@example.com.");
  if (normalizeRequestEmail(confirm) !== email) return fail("Type the email address to confirm.");
  const scope = await candidateScope(a.ws.id, { email });
  if (!totalCount(scope.counts)) return fail("There is nothing for that email in this workspace.");

  const summary = describeCounts(scope.counts);
  const itemCount = await eraseCandidateScope(a.ws.id, scope);
  await recordCompleted(a, email, "ERASE", scope.counts, itemCount);

  await sendEmail({
    template: "data-privacy-notice",
    to: email,
    props: {
      subject: `${a.ws.name} has erased your data`,
      badge: "Your data",
      heading: `${a.ws.name} has erased your data.`,
      paragraphs: [
        `As you asked, ${a.ws.name} erased the data it held about you on Interviewpad: ${summary}.`,
        "Scores from your screenings may stay in the workspace reports without your name or email. They can no longer be linked to you.",
      ],
      cta: null,
      footer: `${a.ws.name} uses Interviewpad to run technical screenings.`,
    },
  }).catch(() => null);
  await prisma.emailLog
    .deleteMany({
      where: { recipientEmail: email, template: "data-privacy-notice", workspaceId: null, createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } },
    })
    .catch(() => null);

  refresh(slug);
  return { ok: true, itemCount };
}

/* ── Export everything ──────────────────────────────────────────────────── */

/**
 * Start an export. The zip is checked in the background, then the person
 * who asked gets an email with a download link that works for 7 days for
 * owners and admins who are signed in.
 */
export async function requestExportAction(slug: string): Promise<{ ok: true } | Fail> {
  const a = await editor(slug);
  if (isFail(a)) return a;
  const recent = await prisma.workspaceExport.findFirst({
    where: {
      workspaceId: a.ws.id,
      OR: [{ status: { in: ["PENDING", "RUNNING"] } }, { createdAt: { gte: new Date(Date.now() - EXPORT_COOLDOWN_MINUTES * 60 * 1000) } }],
    },
    select: { id: true },
  });
  if (recent) return fail(`An export was started in the last ${EXPORT_COOLDOWN_MINUTES} minutes. Use that one or try again later.`);

  const row = await prisma.workspaceExport.create({ data: { workspaceId: a.ws.id, status: "RUNNING", requestedById: a.userId } });
  await audit(a, WORKSPACE_AUDIT_ACTIONS.WORKSPACE_EXPORT_REQUESTED, {}, { type: "workspaceExport", id: row.id });

  const origin = baseUrl();
  after(async () => {
    try {
      const built = await buildWorkspaceExport(a.ws.id);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + EXPORT_LINK_DAYS * 24 * 60 * 60 * 1000);
      const url = `${origin}/api/workspace-exports/${row.id}`;
      await prisma.workspaceExport.update({
        where: { id: row.id },
        data: { status: "READY", readyAt: now, expiresAt, url, sizeBytes: built.zip.length },
      });
      if (a.email) {
        await sendEmail({
          template: "data-privacy-notice",
          to: a.email,
          workspaceId: a.ws.id,
          props: {
            subject: `Your export of ${a.ws.name} is ready`,
            badge: "Export",
            heading: `Your export of ${a.ws.name} is ready.`,
            paragraphs: [
              `It is a zip of CSV and JSON files: candidates, notes, take homes, AI screenings, interviews, scorecards, members, the audit log and the email log.`,
              `The link works for ${EXPORT_LINK_DAYS} days, until ${dateFor(a, expiresAt)}, and only for owners and admins who are signed in. It downloads the latest data each time.`,
            ],
            cta: { label: "Download the export", url },
            footer: "You get this because you asked for an export of this workspace on Interviewpad.",
          },
        });
      }
    } catch (err) {
      console.error("[export] build failed:", err);
      await prisma.workspaceExport
        .update({ where: { id: row.id }, data: { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "Export failed" } })
        .catch(() => null);
    }
  });

  refresh(slug);
  return { ok: true };
}

/* ── Delete the workspace ───────────────────────────────────────────────── */

/**
 * Schedule the workspace for deletion. Members lose access straight away;
 * owners can undo it for 30 days, after which a nightly job erases it.
 */
export async function scheduleDeletionAction(slug: string, confirmName: string): Promise<{ ok: true; finalAt: string } | Fail> {
  const a = await editor(slug, { ownerOnly: true });
  if (isFail(a)) return a;
  if (!deletionConfirmMatches(confirmName, a.ws.name)) return fail("Type the workspace name exactly to confirm.");
  if (a.ws.deletionScheduledAt) return fail("This workspace is already scheduled for deletion.");

  const now = new Date();
  await prisma.workspace.update({ where: { id: a.ws.id }, data: { deletionScheduledAt: now, deletionRequestedById: a.userId } });
  const finalAt = deletionFinalAt({ deletionScheduledAt: now })!;
  await audit(a, WORKSPACE_AUDIT_ACTIONS.WORKSPACE_DELETION_SCHEDULED, { finalAt: finalAt.toISOString() });

  const when = dateFor(a, finalAt);
  after(() =>
    emailManagers(a.ws.id, {
      subject: `${a.ws.name} will be deleted on ${when}`,
      badge: "Workspace deletion",
      heading: `${a.ws.name} will be deleted on ${when}.`,
      paragraphs: [
        `${a.email ?? "An owner"} scheduled the workspace for deletion. Nobody can use it from now on.`,
        `Until ${when}, an owner can undo this from the workspace. After that, its candidates, screenings, interviews and settings are erased for good.`,
      ],
      cta: { label: "Open the workspace", url: `${baseUrl()}/w/${a.ws.slug}` },
    }).then(() => undefined),
  );

  revalidatePath(`/w/${slug}`, "layout");
  return { ok: true, finalAt: finalAt.toISOString() };
}

/** Undo a scheduled deletion. Owners only. */
export async function cancelDeletionAction(slug: string): Promise<{ ok: true } | Fail> {
  const a = await editor(slug, { ownerOnly: true });
  if (isFail(a)) return a;
  if (!a.ws.deletionScheduledAt) return { ok: true };
  await prisma.workspace.update({ where: { id: a.ws.id }, data: { deletionScheduledAt: null, deletionRequestedById: null } });
  await audit(a, WORKSPACE_AUDIT_ACTIONS.WORKSPACE_DELETION_CANCELLED, {});
  after(() =>
    emailManagers(a.ws.id, {
      subject: `${a.ws.name} will not be deleted`,
      badge: "Workspace deletion",
      heading: `${a.ws.name} will not be deleted.`,
      paragraphs: [`${a.email ?? "An owner"} cancelled the deletion. Everyone can use the workspace again.`],
      cta: { label: "Open the workspace", url: settingsUrl(a.ws.slug) },
    }).then(() => undefined),
  );
  revalidatePath(`/w/${slug}`, "layout");
  return { ok: true };
}
