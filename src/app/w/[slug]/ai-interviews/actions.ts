"use server";

/**
 * Server actions behind the AI screening pages. Each returns a result object
 * instead of throwing, because production builds replace thrown messages with
 * a generic digest and the recruiter would never see why something failed.
 */
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAiCreditPack, normalizeEngagementLevel } from "@/lib/ai-interview/credits";
import { effectivePlanAllowsAiScreening } from "@/lib/billing/trial";
import { validateStarterFilesJson } from "@/lib/ai-interview/template-resolver";
import type { RoundSpecInput } from "@/lib/ai-interview/rounds";
import { getStripe } from "@/lib/stripe";
import { canMember } from "@/lib/permissions";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { loadCreditSummary } from "@/lib/ai-interview/console-server";
import { creditCheck, DEFAULT_EXPIRY_DAYS, EXPIRY_CHOICES, expiryDate, REMINDER_CHOICES } from "@/lib/ai-interview/console";
import { createSessions, sanitizeRoundSpec, snapshotStarters } from "@/lib/ai-interview/screening-create";
import { deliverInvite } from "@/lib/ai-interview/invites";
import { plural } from "@/lib/workspace/display";
import { parseQuestionnaire, serializeQuestionnaire, validateQuestionnaire } from "@/lib/ai-interview/questionnaire";

type Member = { userId: string; role: string; permissions?: unknown };

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

class ActionError extends Error {}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ActionError) return { ok: false, error: err.message };
  console.error("[ai-screening action]", err);
  return { ok: false, error: "Something went wrong. Try again." };
}

/**
 * The caller must be signed in, a member of the workspace, on a plan with AI
 * screening, and allowed to run interviews.
 */
async function assertWorkspaceWriter(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new ActionError("Sign in again to continue.");

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new ActionError("Workspace not found.");

  const member = workspace.members.find((m: Member) => m.userId === session.user.id);
  if (!member) throw new ActionError("You are not a member of this workspace.");
  if (!effectivePlanAllowsAiScreening(workspace)) throw new ActionError("This workspace plan does not include AI screening.");
  if (!(await canMember(member, "interview:conduct"))) throw new ActionError("You do not have permission to manage AI screenings.");

  return { workspace, member, userId: session.user.id, email: session.user.email ?? null };
}

type Writer = Awaited<ReturnType<typeof assertWorkspaceWriter>>;

function audit(w: Writer, action: string, targetType: string, targetId: string, meta: Record<string, unknown>) {
  void writeWorkspaceAuditEntry({
    workspaceId: w.workspace.id,
    actorUserId: w.userId,
    actorEmail: w.email,
    action,
    targetType,
    targetId,
    meta,
  });
}

function refresh(slug: string, extra: string[] = []) {
  revalidatePath(`/w/${slug}/ai-interviews`, "layout");
  revalidatePath(`/w/${slug}`);
  for (const p of extra) revalidatePath(p);
}

async function resolveOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() is unavailable outside a request.
  }
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** CRM candidates for the picked ids plus any people typed or pasted in. */
async function resolvePeople(
  workspaceId: string,
  candidateIds: string[],
  newPeople: { name: string; email: string }[],
): Promise<{ id: string; name: string; email: string }[]> {
  const ids = [...new Set(candidateIds.filter(Boolean))];
  const picked = ids.length
    ? await prisma.candidate.findMany({ where: { id: { in: ids }, workspaceId }, select: { id: true, name: true, email: true } })
    : [];
  if (picked.length !== ids.length) throw new ActionError("Some selected candidates are no longer in this workspace. Reload and try again.");
  const noEmail = picked.filter((c) => !c.email?.trim());
  if (noEmail.length) throw new ActionError(`These candidates have no email address: ${noEmail.map((c) => c.name).join(", ")}.`);

  const out = picked.map((c) => ({ id: c.id, name: c.name, email: c.email!.trim().toLowerCase() }));
  const seen = new Set(out.map((c) => c.email));
  const { upsertCandidateForWorkflow } = await import("@/lib/crm/auto-create");
  for (const p of newPeople) {
    const email = p.email?.trim().toLowerCase();
    const name = p.name?.trim() || email?.split("@")[0] || "";
    if (!email || !EMAIL_RE.test(email)) throw new ActionError(`"${p.email}" is not a valid email address.`);
    if (seen.has(email)) continue;
    seen.add(email);
    const { candidateId } = await upsertCandidateForWorkflow({
      workspaceId,
      name,
      email,
      source: "ai-interview-create",
      initialStage: "SCREENING",
    });
    const row = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { name: true } });
    out.push({ id: candidateId, name: row?.name ?? name, email });
  }
  if (!out.length) throw new ActionError("Add at least one candidate.");
  return out;
}

async function assertCredits(workspaceId: string, invites: number, level: string) {
  const credits = await loadCreditSummary(workspaceId);
  const check = creditCheck(credits.balance, credits.held, invites, level);
  if (!check.ok) {
    throw new ActionError(
      `These invites need ${plural(check.needed, "credit")} and ${check.available} ${check.available === 1 ? "is" : "are"} free. Buy credits or invite fewer people.`,
    );
  }
}

/** Sends invites a few at a time and reports how many went out. */
async function sendAll(
  sessions: Parameters<typeof deliverInvite>[0][],
  workspace: { id: string; name: string },
  opts: { reminder?: boolean } = {},
): Promise<{ sent: number; failed: number }> {
  const origin = await resolveOrigin();
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < sessions.length; i += 5) {
    const chunk = sessions.slice(i, i + 5);
    const res = await Promise.all(chunk.map((s) => deliverInvite(s, workspace, origin, opts)));
    for (const r of res) r.sent ? sent++ : failed++;
  }
  return { sent, failed };
}

function clampChoice(v: unknown, choices: readonly number[], fallback: number): number {
  const n = Number(v);
  return choices.includes(n) ? n : fallback;
}

/* ── New screening ───────────────────────────────────────────────────────── */

export type NewScreeningInput = {
  positionTitle: string;
  candidateIds: string[];
  newPeople: { name: string; email: string }[];
  rounds: RoundSpecInput[];
  engagementLevel: string;
  expiresAfterDays: number;
  reminderAfterDays: number;
  maxExtensions: number;
  extensionMinutes: number;
};

/** Challenge rounds may use the public bank or this workspace's own library, nothing else. */
async function assertChallengesVisible(workspaceId: string, rounds: { sourceKind: string; sourceId?: string }[]) {
  const ids = [...new Set(rounds.filter((r) => r.sourceKind === "challenge" && r.sourceId).map((r) => r.sourceId!))];
  if (!ids.length) return;
  const found = await prisma.challenge.count({
    where: { id: { in: ids }, OR: [{ published: true, workspaceId: null }, { workspaceId }] },
  });
  if (found !== ids.length) throw new ActionError("One of the questions is no longer available. Pick another one.");
}

export async function createScreeningAction(
  slug: string,
  input: NewScreeningInput,
): Promise<Result<{ batchId: string; sent: number; failed: number; invited: number }>> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const positionTitle = input.positionTitle?.trim();
    if (!positionTitle) throw new ActionError("Give the role a name.");
    if (positionTitle.length > 120) throw new ActionError("The role name is too long.");
    const rounds = (input.rounds ?? []).map(sanitizeRoundSpec);
    if (!rounds.length) throw new ActionError("Pick at least one thing to test.");
    if (rounds.length > 6) throw new ActionError("A screening can have at most 6 rounds.");
    await assertChallengesVisible(w.workspace.id, rounds);

    const level = normalizeEngagementLevel(input.engagementLevel);
    const expiresAfterDays = clampChoice(input.expiresAfterDays, EXPIRY_CHOICES, DEFAULT_EXPIRY_DAYS);
    const reminderAfterDays = clampChoice(input.reminderAfterDays, REMINDER_CHOICES, 0);
    const maxExtensions = Math.max(0, Math.min(5, Math.floor(Number(input.maxExtensions) || 0)));
    const extensionMinutes = Math.max(1, Math.min(60, Math.floor(Number(input.extensionMinutes) || 5)));

    const count = new Set(input.candidateIds ?? []).size + (input.newPeople?.length ?? 0);
    if (!count) throw new ActionError("Add at least one candidate.");
    if (count > 200) throw new ActionError("Invite at most 200 people at a time.");
    await assertCredits(w.workspace.id, count, level);

    const people = await resolvePeople(w.workspace.id, input.candidateIds ?? [], input.newPeople ?? []);
    const starters = await snapshotStarters(rounds, w.workspace.id);
    const expiresAt = expiryDate(new Date(), expiresAfterDays);

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.aIScreeningBatch.create({
        data: {
          workspaceId: w.workspace.id,
          positionTitle,
          createdByUserId: w.userId,
          status: "ACTIVE",
          engagementLevel: level,
          expiresAfterDays,
          reminderAfterDays: reminderAfterDays || null,
          roundSpecs: {
            create: rounds.map((r, order) => ({
              order,
              paradigm: r.paradigm,
              language: r.language,
              frameworkLabel: r.frameworkLabel,
              sourceKind: r.sourceKind,
              sourceId: r.sourceId,
              templateId: r.templateId,
              estimatedMinutes: r.estimatedMinutes ?? 30,
            })),
          },
        },
      });
      const sessions = await createSessions(tx, {
        workspaceId: w.workspace.id,
        batchId: batch.id,
        positionTitle,
        candidates: people,
        rounds,
        starters,
        settings: { engagementLevel: level, expiresAt, maxExtensions, extensionMinutes },
      });
      return { batchId: batch.id, sessions };
    });

    const { sent, failed } = await sendAll(result.sessions, w.workspace);
    audit(w, WORKSPACE_AUDIT_ACTIONS.AI_SCREENING_CREATED, "aiScreeningBatch", result.batchId, {
      positionTitle,
      invited: people.length,
      rounds: rounds.length,
      engagementLevel: level,
      expiresAfterDays,
      reminderAfterDays,
      emailsFailed: failed,
    });
    refresh(slug);
    return { ok: true, batchId: result.batchId, sent, failed, invited: people.length };
  } catch (err) {
    return fail(err);
  }
}

/** Invite more people to an existing screening, with its rounds and settings. */
export async function addToScreeningAction(
  slug: string,
  batchId: string,
  input: { candidateIds: string[]; newPeople: { name: string; email: string }[] },
): Promise<Result<{ invited: number; sent: number; failed: number; skipped: number }>> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const batch = await prisma.aIScreeningBatch.findFirst({
      where: { id: batchId, workspaceId: w.workspace.id },
      include: { roundSpecs: { orderBy: { order: "asc" } }, sessions: { select: { candidateId: true, candidateEmail: true } } },
    });
    if (!batch) throw new ActionError("That screening no longer exists.");
    if (!batch.roundSpecs.length) throw new ActionError("That screening has no rounds to send.");

    const people = await resolvePeople(w.workspace.id, input.candidateIds ?? [], input.newPeople ?? []);
    const already = new Set(batch.sessions.flatMap((s) => [s.candidateId, s.candidateEmail.toLowerCase()]).filter(Boolean));
    const fresh = people.filter((p) => !already.has(p.id) && !already.has(p.email));
    const skipped = people.length - fresh.length;
    if (!fresh.length) throw new ActionError(people.length === 1 ? "They are already in this screening." : "Everyone picked is already in this screening.");
    await assertCredits(w.workspace.id, fresh.length, batch.engagementLevel);

    const rounds: RoundSpecInput[] = batch.roundSpecs.map((r) => ({
      paradigm: r.paradigm as RoundSpecInput["paradigm"],
      language: r.language ?? undefined,
      frameworkLabel: r.frameworkLabel ?? undefined,
      sourceKind: r.sourceKind as RoundSpecInput["sourceKind"],
      sourceId: r.sourceId ?? undefined,
      templateId: r.templateId ?? undefined,
      estimatedMinutes: r.estimatedMinutes,
    }));
    const starters = await snapshotStarters(rounds, w.workspace.id);
    const sessions = await prisma.$transaction((tx) =>
      createSessions(tx, {
        workspaceId: w.workspace.id,
        batchId: batch.id,
        positionTitle: batch.positionTitle,
        candidates: fresh,
        rounds,
        starters,
        settings: {
          engagementLevel: batch.engagementLevel,
          expiresAt: expiryDate(new Date(), batch.expiresAfterDays ?? DEFAULT_EXPIRY_DAYS),
          maxExtensions: 1,
          extensionMinutes: 5,
        },
      }),
    );
    const { sent, failed } = await sendAll(sessions, w.workspace);
    audit(w, WORKSPACE_AUDIT_ACTIONS.AI_SCREENING_CANDIDATES_ADDED, "aiScreeningBatch", batch.id, {
      positionTitle: batch.positionTitle,
      invited: fresh.length,
      emailsFailed: failed,
    });
    refresh(slug);
    return { ok: true, invited: fresh.length, sent, failed, skipped };
  } catch (err) {
    return fail(err);
  }
}

/* ── Per-invite actions ──────────────────────────────────────────────────── */

async function ownedSessions(workspaceId: string, ids: string[]) {
  return prisma.aIInterviewSession.findMany({
    where: { id: { in: [...new Set(ids)] }, workspaceId, practice: false },
    include: { rounds: { select: { estimatedMinutes: true } }, batch: { select: { expiresAfterDays: true } } },
  });
}

/**
 * Send the invite email again. An expired invite is reopened with a fresh
 * expiry, so it holds credits again.
 */
export async function resendInviteAction(slug: string, sessionId: string): Promise<Result<{ sent: boolean; reason?: string }>> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const [s] = await ownedSessions(w.workspace.id, [sessionId]);
    if (!s) throw new ActionError("That invite no longer exists.");
    if (s.status !== "PENDING" && s.status !== "EXPIRED") throw new ActionError("This candidate has already started, so there is nothing to resend.");
    let expiresAt = s.expiresAt;
    if (s.status === "EXPIRED" || (expiresAt && expiresAt.getTime() <= Date.now())) {
      await assertCredits(w.workspace.id, 1, s.engagementLevel);
      expiresAt = expiryDate(new Date(), s.batch?.expiresAfterDays ?? DEFAULT_EXPIRY_DAYS);
      await prisma.aIInterviewSession.update({ where: { id: s.id }, data: { status: "PENDING", expiresAt, reminderSentAt: null } });
    }
    const origin = await resolveOrigin();
    const res = await deliverInvite({ ...s, expiresAt }, w.workspace, origin);
    audit(w, WORKSPACE_AUDIT_ACTIONS.AI_SCREENING_INVITE_RESENT, "aiInterviewSession", s.id, {
      candidateName: s.candidateName,
      reopened: s.status === "EXPIRED",
      emailStatus: res.status,
    });
    refresh(slug);
    return { ok: true, sent: res.sent, reason: res.reason };
  } catch (err) {
    return fail(err);
  }
}

/** Email a reminder to people who have not started yet. */
export async function remindAction(slug: string, sessionIds: string[]): Promise<Result<{ sent: number; failed: number; skipped: number }>> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const rows = await ownedSessions(w.workspace.id, sessionIds);
    const now = Date.now();
    const due = rows.filter((s) => s.status === "PENDING" && !s.startedAt && (!s.expiresAt || s.expiresAt.getTime() > now));
    if (!due.length) throw new ActionError("Nobody picked is waiting to start.");
    const { sent, failed } = await sendAll(due, w.workspace, { reminder: true });
    for (const s of due) {
      audit(w, WORKSPACE_AUDIT_ACTIONS.AI_SCREENING_REMINDED, "aiInterviewSession", s.id, { candidateName: s.candidateName });
    }
    refresh(slug);
    return { ok: true, sent, failed, skipped: rows.length - due.length };
  } catch (err) {
    return fail(err);
  }
}

/** Close unstarted invites now. Their links stop working and credits are freed. */
export async function cancelInvitesAction(slug: string, sessionIds: string[]): Promise<Result<{ cancelled: number }>> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const rows = await ownedSessions(w.workspace.id, sessionIds);
    const open = rows.filter((s) => s.status === "PENDING" && !s.startedAt);
    if (!open.length) throw new ActionError("Only invites that have not started can be cancelled.");
    const now = new Date();
    const res = await prisma.aIInterviewSession.updateMany({
      where: { id: { in: open.map((s) => s.id) }, status: "PENDING", startedAt: null },
      data: { status: "EXPIRED", expiresAt: now },
    });
    for (const s of open) {
      audit(w, WORKSPACE_AUDIT_ACTIONS.AI_SCREENING_CANCELLED, "aiInterviewSession", s.id, { candidateName: s.candidateName });
    }
    refresh(slug);
    return { ok: true, cancelled: res.count };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Delete a screening session. Finished ones are evidence for a decision, so
 * the audit entry keeps who deleted it, the score and when it finished.
 */
export async function deleteSessionAction(slug: string, sessionId: string): Promise<Result> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const s = await prisma.aIInterviewSession.findFirst({
      where: { id: sessionId, workspaceId: w.workspace.id },
      select: { id: true, candidateName: true, candidateEmail: true, positionTitle: true, status: true, score: true, finishedAt: true, batchId: true },
    });
    if (!s) throw new ActionError("That screening no longer exists.");
    await prisma.aIInterviewSession.delete({ where: { id: s.id } });
    audit(w, WORKSPACE_AUDIT_ACTIONS.AI_SCREENING_DELETED, "aiInterviewSession", s.id, {
      candidateName: s.candidateName,
      candidateEmail: s.candidateEmail,
      positionTitle: s.positionTitle,
      status: s.status,
      score: s.score,
      finishedAt: s.finishedAt?.toISOString() ?? null,
      batchId: s.batchId,
    });
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * How many times, and by how many minutes each, the candidate may extend
 * their own time. Takes effect immediately.
 */
export async function updateExtensionPolicyAction(
  slug: string,
  input: { sessionId: string; maxExtensions: number; extensionMinutes: number },
): Promise<Result<{ maxExtensions: number; extensionMinutes: number }>> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const maxExtensions = Math.max(0, Math.min(5, Math.floor(Number(input.maxExtensions) || 0)));
    const extensionMinutes = Math.max(1, Math.min(60, Math.floor(Number(input.extensionMinutes) || 5)));
    const res = await prisma.aIInterviewSession.updateMany({
      where: { id: input.sessionId, workspaceId: w.workspace.id },
      data: { maxExtensions, extensionMinutes },
    });
    if (!res.count) throw new ActionError("That screening no longer exists.");
    refresh(slug);
    return { ok: true, maxExtensions, extensionMinutes };
  } catch (err) {
    return fail(err);
  }
}

/* ── Credits ─────────────────────────────────────────────────────────────── */

/**
 * Stripe Checkout for a one-time credit pack. Owners and admins only; the
 * webhook credits the workspace on `checkout.session.completed`.
 */
export async function createCreditPackCheckoutAction(slug: string, packId: string): Promise<Result<{ url: string }>> {
  try {
    const { workspace, member } = await assertWorkspaceWriter(slug);
    if (!(await canMember(member, "billing:manage"))) throw new ActionError("Only workspace owners and admins can buy credits.");
    const pack = getAiCreditPack(packId);
    if (!pack) throw new ActionError("Unknown credit pack.");
    if (!process.env.STRIPE_SECRET_KEY) throw new ActionError("Payments are not set up in this environment.");

    const stripe = getStripe();
    const origin = await resolveOrigin();
    const returnUrl = `${origin}/w/${slug}/ai-interviews`;
    const stripeCustomerId = await ensureStripeCustomer(workspace.id, workspace.name, stripe);
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Interviewpad AI Credits — ${pack.label}`,
              description: `${pack.credits} AI screening credits for "${workspace.name}".`,
            },
            unit_amount: pack.priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}?credits_purchase=success`,
      cancel_url: `${returnUrl}?credits_purchase=cancel`,
      metadata: {
        kind: "AI_CREDIT_PACK",
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
        packId: pack.id,
        credits: String(pack.credits),
      },
      payment_intent_data: {
        metadata: { kind: "AI_CREDIT_PACK", workspaceId: workspace.id, packId: pack.id, credits: String(pack.credits) },
      },
    });
    if (!checkout.url) throw new ActionError("Stripe did not return a checkout link.");
    return { ok: true, url: checkout.url };
  } catch (err) {
    return fail(err);
  }
}

async function ensureStripeCustomer(workspaceId: string, workspaceName: string, stripe: import("stripe").Stripe): Promise<string> {
  const row = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { stripeCustomerId: true } });
  if (row?.stripeCustomerId) return row.stripeCustomerId;
  const customer = await stripe.customers.create({ name: workspaceName, metadata: { workspaceId } });
  await prisma.workspace.update({ where: { id: workspaceId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/* ── Question sets ───────────────────────────────────────────────────────── */

export type QuestionInput = {
  title: string;
  description: string;
  starterFilesJson: string;
  testsCode: string;
  estimatedMinutes: number;
  kind?: string;
  language?: string;
  frameworkLabel?: string;
};

function sanitizeQuestion(input: QuestionInput) {
  const title = input.title?.trim() ?? "";
  if (!title) throw new ActionError("Give the question a title.");
  if (title.length > 80) throw new ActionError("Titles are limited to 80 characters.");
  const description = input.description?.trim() ?? "";
  if (!description) throw new ActionError("Describe the task for the candidate.");
  const estimatedMinutes = Number(input.estimatedMinutes);
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > 180) {
    throw new ActionError("Time must be between 5 and 180 minutes.");
  }
  const kindRaw = (input.kind ?? "frontend").trim().toLowerCase();
  const kind = ["frontend", "backend", "dsa", "conversation"].includes(kindRaw) ? kindRaw : "frontend";
  const frameworkLabel = input.frameworkLabel?.trim().slice(0, 60) || null;
  if (kind === "conversation") {
    // No code: the brief is the description, and the questions to cover (with
    // optional reference answers) are kept in testsCode, which only the
    // interviewer and grader see. See questionnaire.ts for the format.
    let items;
    try {
      items = validateQuestionnaire(parseQuestionnaire(input.testsCode));
    } catch (err) {
      throw new ActionError(err instanceof Error ? err.message : "The questions are not valid.");
    }
    return { title, description, starterFiles: "{}", testsCode: serializeQuestionnaire(items), estimatedMinutes, kind, language: null, frameworkLabel };
  }
  let starterFiles: string;
  try {
    starterFiles = validateStarterFilesJson(input.starterFilesJson);
  } catch (err) {
    throw new ActionError(err instanceof Error ? err.message : "The starter files are not valid.");
  }
  const language = input.language?.trim() || null;
  if (kind !== "frontend" && !language) throw new ActionError("Backend and algorithm questions need a language.");
  return { title, description, starterFiles, testsCode: (input.testsCode ?? "").trim(), estimatedMinutes, kind, language, frameworkLabel };
}

/** Create a team question, or update one when `id` is given. */
export async function saveQuestionAction(slug: string, input: QuestionInput & { id?: string }): Promise<Result<{ id: string }>> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const data = sanitizeQuestion(input);
    let id: string;
    if (input.id) {
      const res = await prisma.aIInterviewTemplate.updateMany({ where: { id: input.id, workspaceId: w.workspace.id }, data });
      if (!res.count) throw new ActionError("Only your team questions can be edited.");
      id = input.id;
    } else {
      id = (await prisma.aIInterviewTemplate.create({ data: { ...data, workspaceId: w.workspace.id } })).id;
    }
    audit(w, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_SAVED, "aiInterviewTemplate", id, { title: data.title, created: !input.id });
    refresh(slug);
    return { ok: true, id };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteQuestionAction(slug: string, id: string): Promise<Result> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const row = await prisma.aIInterviewTemplate.findFirst({ where: { id, workspaceId: w.workspace.id }, select: { title: true } });
    if (!row) throw new ActionError("Only your team questions can be deleted.");
    await prisma.aIInterviewTemplate.delete({ where: { id } });
    audit(w, WORKSPACE_AUDIT_ACTIONS.AI_QUESTION_SET_DELETED, "aiInterviewTemplate", id, { title: row.title });
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Let the AI interviewer call an external MCP server during this question.
 * Three gates must all hold at runtime: this binding, the server enabled, and
 * the workspace allowing external MCP.
 */
export async function setQuestionServerAction(slug: string, templateId: string, serverId: string, bound: boolean): Promise<Result> {
  try {
    const w = await assertWorkspaceWriter(slug);
    const [tpl, server] = await Promise.all([
      prisma.aIInterviewTemplate.findFirst({ where: { id: templateId, workspaceId: w.workspace.id }, select: { id: true } }),
      prisma.externalMcpServer.findFirst({ where: { id: serverId, workspaceId: w.workspace.id, enabled: true }, select: { id: true } }),
    ]);
    if (!tpl) throw new ActionError("Only team questions can use external tools.");
    if (!server) throw new ActionError("That server is missing or turned off. Turn it on under External MCP first.");
    if (bound) {
      await prisma.templateExternalMcp.upsert({
        where: { templateId_externalMcpServerId: { templateId: tpl.id, externalMcpServerId: server.id } },
        create: { templateId: tpl.id, externalMcpServerId: server.id },
        update: {},
      });
    } else {
      await prisma.templateExternalMcp.deleteMany({ where: { templateId: tpl.id, externalMcpServerId: server.id } });
    }
    refresh(slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
