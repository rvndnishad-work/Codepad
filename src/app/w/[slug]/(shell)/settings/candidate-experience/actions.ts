"use server";

/**
 * Candidate experience actions that do not fit the generic settings save:
 * the reply-to address (it needs a confirmation email), the wording of each
 * candidate email, and the preview and test email for that wording.
 *
 * Brand colour, sender name, privacy notice, consent and help contact save
 * through saveWorkspaceSettingsAction like every other tab.
 */
import { randomBytes } from "crypto";
import * as React from "react";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/render";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { rateLimitDistributed } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { TEMPLATES, type TemplateName, type TemplateProps } from "@/emails";
import { appOrigin } from "@/lib/interview/links";
import { sampleCandidateEmail } from "@/lib/candidate-email";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { settingsAccess } from "@/lib/workspace/settings-server";
import { SETTINGS_FIELDS, replyToAddress, senderDisplayName } from "@/lib/workspace/settings";
import {
  CANDIDATE_EMAILS,
  REPLY_TO_LINK_DAYS,
  applyWording,
  candidateBrand,
  isCandidateEmailKey,
  makeReplyToToken,
  parseWording,
  placeholderVars,
  type CandidateEmailKey,
} from "@/lib/workspace/candidate-experience";

const TAB = "candidate-experience";

type Fail = { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };
const fail = (error: string, fieldErrors?: Partial<Record<string, string>>): Fail => ({ ok: false, error, fieldErrors });

/**
 * The signed-in member and the workspace, or a reason they cannot go on.
 * Changes need an owner or admin; `readOnly` lets any member preview.
 */
async function editorFor(slug: string, opts: { readOnly?: boolean } = {}) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return { error: "You are signed out. Sign in and try again." } as const;
  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      logoUrl: true,
      brandColor: true,
      senderName: true,
      helpEmail: true,
      privacyNoticeUrl: true,
      replyToEmail: true,
      replyToConfirmedAt: true,
      members: { where: { userId: session.user.id }, select: { role: true, permissions: true } },
    },
  });
  if (!ws) return { error: "Workspace not found." } as const;
  const me = ws.members[0];
  if (!me) return { error: "You are not a member of this workspace." } as const;
  const access = await settingsAccess(me);
  if (!access.canEdit && !opts.readOnly) return { error: "Only owners and admins can change settings." } as const;
  return {
    ws,
    user: { id: session.user.id, email: session.user.email ?? null, name: session.user.name ?? null },
    growth: growthToolsEnabled(ws),
  } as const;
}

const GROWTH_ONLY = "Available on the Growth plan. Start a trial or upgrade in Billing and usage.";

/* ── Reply-to ───────────────────────────────────────────────────────────── */

export type ReplyToResult = { ok: true; email: string | null; confirmed: boolean } | Fail;

/**
 * Set a reply-to address and email it a confirmation link. Candidate
 * replies keep going to the previous behaviour until someone confirms.
 */
export async function requestReplyToAction(slug: string, rawEmail: string): Promise<ReplyToResult> {
  const ctx = await editorFor(slug);
  if ("error" in ctx) return fail(ctx.error!);
  if (!ctx.growth) return fail(GROWTH_ONLY);

  const parsed = SETTINGS_FIELDS.helpEmail.parse(rawEmail);
  if (!parsed.ok || !parsed.value) return fail("Enter an email address like jobs@company.com.", { replyToEmail: parsed.ok ? "Enter an email address." : parsed.error });
  const email = parsed.value as string;

  const limit = await rateLimitDistributed(`settings:reply-to:${ctx.ws.id}`, 5, 60 * 60_000);
  if (!limit.ok) return fail("Too many confirmation emails. Try again in an hour.");

  const token = makeReplyToToken(randomBytes(24).toString("hex"));
  await prisma.workspace.update({
    where: { id: ctx.ws.id },
    data: { replyToEmail: email, replyToConfirmedAt: null, replyToToken: token },
  });

  const origin = await appOrigin();
  const res = await sendEmail({
    template: "reply-to-confirm",
    to: email,
    props: {
      workspaceName: ctx.ws.name,
      requestedBy: ctx.user.name || ctx.user.email || "A workspace admin",
      confirmUrl: `${origin}/email/reply-to/${encodeURIComponent(token)}`,
      days: REPLY_TO_LINK_DAYS,
    },
    workspaceId: ctx.ws.id,
  });

  await writeWorkspaceAuditEntry({
    workspaceId: ctx.ws.id,
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: WORKSPACE_AUDIT_ACTIONS.REPLY_TO_CONFIRMATION_SENT,
    targetType: "workspace",
    targetId: ctx.ws.id,
    meta: { tab: TAB, email },
  });
  revalidatePath(`/w/${slug}/settings/${TAB}`);
  if (!res.sent) return fail("The address is saved, but the confirmation email did not go out. Try sending it again.");
  return { ok: true, email, confirmed: false };
}

/** Stop using a custom reply-to. */
export async function removeReplyToAction(slug: string): Promise<ReplyToResult> {
  const ctx = await editorFor(slug);
  if ("error" in ctx) return fail(ctx.error!);
  const before = ctx.ws.replyToEmail;
  if (!before) return { ok: true, email: null, confirmed: false };
  await prisma.workspace.update({
    where: { id: ctx.ws.id },
    data: { replyToEmail: null, replyToConfirmedAt: null, replyToToken: null },
  });
  await writeWorkspaceAuditEntry({
    workspaceId: ctx.ws.id,
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: WORKSPACE_AUDIT_ACTIONS.WORKSPACE_SETTINGS_CHANGED,
    targetType: "workspace",
    targetId: ctx.ws.id,
    meta: { tab: TAB, field: "replyToEmail", label: "Reply-to address", from: before, to: "Not set" },
  });
  revalidatePath(`/w/${slug}/settings/${TAB}`);
  return { ok: true, email: null, confirmed: false };
}

/* ── Email wording ──────────────────────────────────────────────────────── */

export type WordingResult = { ok: true; subject: string | null; body: string | null; edited: boolean } | Fail;

/** Save the subject and opening text of one candidate email. Blank or default text means "use the built-in wording". */
export async function saveEmailWordingAction(slug: string, key: string, draft: { subject?: string; body?: string }): Promise<WordingResult> {
  if (!isCandidateEmailKey(key)) return fail("Unknown email.");
  const ctx = await editorFor(slug);
  if ("error" in ctx) return fail(ctx.error!);
  if (!ctx.growth) return fail(GROWTH_ONLY);

  const parsed = parseWording(key, { subject: draft?.subject ?? "", body: draft?.body ?? "" });
  if (!parsed.ok) return fail("Check the highlighted fields.", parsed.errors);

  const existing = await prisma.candidateEmailTemplate.findUnique({
    where: { workspaceId_key: { workspaceId: ctx.ws.id, key } },
    select: { subject: true, body: true },
  });
  const reset = !parsed.subject && !parsed.body;
  const unchanged = (existing?.subject ?? null) === parsed.subject && (existing?.body ?? null) === parsed.body;
  if (unchanged) return { ok: true, subject: parsed.subject, body: parsed.body, edited: !reset };

  if (reset) {
    await prisma.candidateEmailTemplate.deleteMany({ where: { workspaceId: ctx.ws.id, key } });
  } else {
    await prisma.candidateEmailTemplate.upsert({
      where: { workspaceId_key: { workspaceId: ctx.ws.id, key } },
      create: { workspaceId: ctx.ws.id, key, subject: parsed.subject, body: parsed.body, updatedById: ctx.user.id },
      update: { subject: parsed.subject, body: parsed.body, updatedById: ctx.user.id },
    });
  }
  await writeWorkspaceAuditEntry({
    workspaceId: ctx.ws.id,
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: WORKSPACE_AUDIT_ACTIONS.EMAIL_TEMPLATE_CHANGED,
    targetType: "workspace",
    targetId: ctx.ws.id,
    meta: { tab: TAB, key, label: CANDIDATE_EMAILS[key].label, ...(reset ? { reset: true } : {}) },
  });
  revalidatePath(`/w/${slug}/settings/${TAB}`);
  return { ok: true, subject: parsed.subject, body: parsed.body, edited: !reset };
}

/** Go back to the built-in wording for one email. */
export async function resetEmailWordingAction(slug: string, key: string): Promise<WordingResult> {
  if (!isCandidateEmailKey(key)) return fail("Unknown email.");
  const ctx = await editorFor(slug);
  if ("error" in ctx) return fail(ctx.error!);
  const { count } = await prisma.candidateEmailTemplate.deleteMany({ where: { workspaceId: ctx.ws.id, key } });
  if (count) {
    await writeWorkspaceAuditEntry({
      workspaceId: ctx.ws.id,
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: WORKSPACE_AUDIT_ACTIONS.EMAIL_TEMPLATE_CHANGED,
      targetType: "workspace",
      targetId: ctx.ws.id,
      meta: { tab: TAB, key, label: CANDIDATE_EMAILS[key].label, reset: true },
    });
    revalidatePath(`/w/${slug}/settings/${TAB}`);
  }
  return { ok: true, subject: null, body: null, edited: false };
}

/* ── Preview and test ───────────────────────────────────────────────────── */

/** Unsaved values from the page, so the preview shows what the admin sees. */
export type PreviewDraft = {
  subject?: string;
  body?: string;
  brandColor?: string | null;
  senderName?: string | null;
  helpEmail?: string | null;
  privacyNoticeUrl?: string | null;
};

type Built = { template: TemplateName; props: Record<string, unknown>; subject: string; fromName: string | null; replyTo: string | null };

/** Build a sample email with the draft wording and branding. Invalid draft values fall back to what is saved. */
async function buildSample(
  ctx: Exclude<Awaited<ReturnType<typeof editorFor>>, { error: string }>,
  key: CandidateEmailKey,
  draft: PreviewDraft,
): Promise<{ ok: true; built: Built } | Fail> {
  const parsed = parseWording(key, { subject: draft.subject ?? "", body: draft.body ?? "" });
  if (!parsed.ok) return fail("Check the highlighted fields.", parsed.errors);

  const pick = <K extends "brandColor" | "senderName" | "helpEmail" | "privacyNoticeUrl">(field: K, saved: string | null): string | null => {
    if (!(field in draft)) return saved;
    const p = SETTINGS_FIELDS[field].parse(draft[field]);
    return p.ok ? (p.value as string | null) : saved;
  };
  const brand = candidateBrand({
    name: ctx.ws.name,
    logoUrl: ctx.ws.logoUrl,
    brandColor: pick("brandColor", ctx.ws.brandColor),
    helpEmail: pick("helpEmail", ctx.ws.helpEmail),
    privacyNoticeUrl: pick("privacyNoticeUrl", ctx.ws.privacyNoticeUrl),
  });

  const origin = await appOrigin();
  const sample = sampleCandidateEmail(key, ctx.ws.name, origin);
  const custom = ctx.growth ? applyWording({ subject: parsed.subject, body: parsed.body }, placeholderVars(sample.props)) : null;
  const props = { ...sample.props, brand, custom, unsubscribeUrl: `${origin}/email/unsubscribe?sample=1` };
  const template = sample.template as TemplateName;
  const def = TEMPLATES[template] as unknown as { subject: (p: unknown) => string };
  return {
    ok: true,
    built: {
      template,
      props,
      subject: def.subject(props),
      fromName: ctx.growth ? senderDisplayName({ senderName: pick("senderName", ctx.ws.senderName), name: ctx.ws.name }) : null,
      replyTo: ctx.growth ? replyToAddress(ctx.ws) : null,
    },
  };
}

export type PreviewResult = { ok: true; subject: string; from: string; replyTo: string | null; html: string } | Fail;

/** Render a sample of one email as HTML for the preview pane. Nothing is sent. */
export async function previewEmailAction(slug: string, key: string, draft: PreviewDraft): Promise<PreviewResult> {
  if (!isCandidateEmailKey(key)) return fail("Unknown email.");
  const ctx = await editorFor(slug, { readOnly: true });
  if ("error" in ctx) return fail(ctx.error!);
  const res = await buildSample(ctx, key, draft ?? {});
  if (!res.ok) return res;
  const { built } = res;
  const def = TEMPLATES[built.template] as unknown as { Component: React.ComponentType<unknown> };
  try {
    const html = await render(React.createElement(def.Component, built.props as object));
    return { ok: true, subject: built.subject, from: built.fromName ?? "Interviewpad", replyTo: built.replyTo, html };
  } catch (err) {
    console.error("[settings] email preview failed:", err);
    return fail("Could not build the preview. Try again.");
  }
}

export type TestEmailResult = { ok: true; to: string } | Fail;

/** Send a sample of one email to the signed-in admin. */
export async function sendTestEmailAction(slug: string, key: string, draft: PreviewDraft): Promise<TestEmailResult> {
  if (!isCandidateEmailKey(key)) return fail("Unknown email.");
  const ctx = await editorFor(slug);
  if ("error" in ctx) return fail(ctx.error!);
  if (!ctx.user.email) return fail("Your account has no email address to send the test to.");
  const limit = await rateLimitDistributed(`settings:test-email:${ctx.user.id}`, 10, 10 * 60_000);
  if (!limit.ok) return fail("You sent a lot of tests just now. Try again in a few minutes.");

  const res = await buildSample(ctx, key, draft ?? {});
  if (!res.ok) return res;
  const { built } = res;
  const custom = (built.props.custom as { subject: string | null; paragraphs: string[] | null } | null) ?? { subject: null, paragraphs: null };
  const props = { ...built.props, custom: { ...custom, subject: `Test: ${built.subject}` } };
  const sent = await sendEmail({
    template: built.template,
    to: ctx.user.email,
    props: props as unknown as TemplateProps[TemplateName],
    fromName: built.fromName ?? undefined,
    replyTo: built.replyTo ?? undefined,
  });
  if (!sent.sent) return fail("The test email did not go out. Try again in a moment.");
  return { ok: true, to: ctx.user.email };
}
