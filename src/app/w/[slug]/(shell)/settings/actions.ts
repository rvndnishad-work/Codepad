"use server";

/**
 * Generic save for workspace settings. Every tab (and the low-credit email
 * on Billing and usage) saves through saveWorkspaceSettingsAction:
 *
 *   const res = await saveWorkspaceSettingsAction(slug, "screening-defaults", {
 *     defaultTakeHomePassMark: 70,
 *     remindNotStarted: false,
 *   });
 *
 * Fields are validated one by one (see SETTINGS_FIELDS in
 * src/lib/workspace/settings.ts). Nothing is saved if any field is invalid.
 * Each changed field writes one audit entry.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { diffSettings, normalizeWorkspaceSettings, type SettingsGroup, type WorkspaceSettings, SETTINGS_TABS } from "@/lib/workspace/settings";
import { SETTINGS_SELECT, settingsAccess } from "@/lib/workspace/settings-server";
import { isReservedSlug } from "@/lib/workspace/screening-defaults";
import { resyncAfterHiringTypeChange } from "@/lib/interview/plans-sync-server";

export type SaveSettingsResult =
  | {
      ok: true;
      /** Fields that actually changed. */
      changed: string[];
      settings: WorkspaceSettings;
      /** Set when the web address changed: navigate to /w/<slug>/... */
      newSlug: string | null;
    }
  | { ok: false; error: string; fieldErrors: Partial<Record<string, string>> };

const GROUPS: SettingsGroup[] = [...SETTINGS_TABS.map((t) => t.id), "billing"];

export async function saveWorkspaceSettingsAction(
  slug: string,
  group: SettingsGroup,
  patch: Record<string, unknown>,
): Promise<SaveSettingsResult> {
  const fail = (error: string, fieldErrors: Partial<Record<string, string>> = {}): SaveSettingsResult => ({ ok: false, error, fieldErrors });
  if (!GROUPS.includes(group)) return fail("Unknown settings section.");
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return fail("Nothing to save.");

  const session = await auth().catch(() => null);
  if (!session?.user?.id) return fail("You are signed out. Sign in and try again.");

  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      ...SETTINGS_SELECT,
      members: { where: { userId: session.user.id }, select: { role: true, permissions: true } },
    },
  });
  if (!ws) return fail("Workspace not found.");
  const me = ws.members[0];
  if (!me) return fail("You are not a member of this workspace.");
  const access = await settingsAccess(me);
  if (!access.canEdit) return fail("Only owners and admins can change settings.");

  const current = normalizeWorkspaceSettings(ws);
  const { changes, errors } = diffSettings(current, group, patch, { growth: growthToolsEnabled(ws), owner: access.owner });

  const slugChange = changes.find((c) => c.field === "slug");
  if (slugChange) {
    const next = slugChange.value as string;
    if (isReservedSlug(next)) errors.slug = "That web address is kept for Interviewpad pages. Try another.";
    const [takenBy, redirectBy] = await Promise.all([
      prisma.workspace.findUnique({ where: { slug: next }, select: { id: true } }),
      prisma.workspaceSlugRedirect.findUnique({ where: { oldSlug: next }, select: { workspaceId: true } }),
    ]);
    if ((takenBy && takenBy.id !== ws.id) || (redirectBy && redirectBy.workspaceId !== ws.id)) {
      errors.slug = "That web address is taken. Try another.";
    }
  }

  if (Object.keys(errors).length) return fail("Check the highlighted settings.", errors);
  if (!changes.length) return { ok: true, changed: [], settings: current, newSlug: null };

  const data: Record<string, unknown> = {};
  for (const c of changes) data[c.field] = c.value;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.workspace.update({ where: { id: ws.id }, data });
      if (slugChange) {
        const next = slugChange.value as string;
        // Taking back one of our own old addresses: it is live again, not a redirect.
        await tx.workspaceSlugRedirect.deleteMany({ where: { oldSlug: next, workspaceId: ws.id } });
        await tx.workspaceSlugRedirect.upsert({
          where: { oldSlug: current.slug },
          create: { oldSlug: current.slug, workspaceId: ws.id },
          update: { workspaceId: ws.id },
        });
      }
    });
  } catch (err) {
    console.error("[settings] save failed:", err);
    return fail("Could not save. Try again.");
  }

  const action = group === "security" ? WORKSPACE_AUDIT_ACTIONS.SECURITY_POLICY_CHANGED : WORKSPACE_AUDIT_ACTIONS.WORKSPACE_SETTINGS_CHANGED;
  for (const c of changes) {
    await writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      actorUserId: session.user.id,
      actorEmail: session.user.email ?? null,
      action,
      targetType: "workspace",
      targetId: ws.id,
      meta: { tab: group, field: c.field, label: c.label, from: c.from, to: c.to },
    });
  }

  // People with no batch plan follow the default for the new hiring type.
  if (changes.some((c) => c.field === "hiringType")) await resyncAfterHiringTypeChange(ws.id).catch((err) => console.error("[settings] round sync failed:", err));

  const newSlug = slugChange ? (slugChange.value as string) : null;
  revalidatePath(`/w/${newSlug ?? slug}`, "layout");
  const settings = normalizeWorkspaceSettings({ ...current, ...data });
  return { ok: true, changed: changes.map((c) => c.field), settings, newSlug };
}
