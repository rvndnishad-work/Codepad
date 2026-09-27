"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { generateApiKey } from "@/lib/mcp/auth";
import { cleanKeyName, expiryFromDays } from "@/lib/mcp/keys";
import { canMember } from "@/lib/permissions";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";

type Member = { userId: string; role: string; permissions?: unknown };

/**
 * Stricter than the AI Screening write check — only OWNER/ADMIN can mint or
 * revoke API keys. INTERVIEWER can use the workspace but cannot hand out
 * programmatic credentials.
 */
async function assertWorkspaceKeyAdmin(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Not authenticated");

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      planName: true,
      trialEndsAt: true,
      stripeSubscriptionId: true,
      members: { select: { userId: true, role: true, permissions: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");

  const member = workspace.members.find((m: Member) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");

  if (!growthToolsEnabled(workspace)) {
    throw new Error("This workspace plan does not include the MCP API.");
  }
  if (!(await canMember(member, "integration:manage"))) {
    throw new Error("Only workspace owners/admins can manage API keys.");
  }

  return { workspace, userId: session.user.id, email: session.user.email ?? null };
}

type KeyAdmin = Awaited<ReturnType<typeof assertWorkspaceKeyAdmin>>;

function auditKey(
  a: KeyAdmin,
  action: string,
  keyId: string,
  meta: Record<string, unknown>,
) {
  void writeWorkspaceAuditEntry({
    workspaceId: a.workspace.id,
    actorUserId: a.userId,
    actorEmail: a.email,
    action,
    targetType: "mcpApiKey",
    targetId: keyId,
    meta,
  });
}

const DAY_MS = 86_400_000;
const daysLeft = (d: Date | null) => (d ? Math.round((d.getTime() - Date.now()) / DAY_MS) : null);

export type CreateKeyScope = "read" | "read-write";

export async function createMcpApiKeyAction(
  slug: string,
  label: string,
  scope: CreateKeyScope = "read",
  /** One of EXPIRY_CHOICES (0 = never). Omitted means never, for old callers. */
  expiresInDays: number = 0
) {
  const admin = await assertWorkspaceKeyAdmin(slug);
  const { workspace, userId } = admin;

  const trimmed = cleanKeyName(label);
  const expiresAt = expiryFromDays(expiresInDays);

  // Resolve the requested scope to the canonical persisted form. Phase 2
  // ships two tiers; future phases may add `admin` or per-tool scopes here.
  const scopes =
    scope === "read-write" ? ["read", "write"] : ["read"];

  const generated = generateApiKey();

  const created = await prisma.mcpApiKey.create({
    data: {
      workspaceId: workspace.id,
      label: trimmed,
      keyHash: generated.hash,
      keyPreview: generated.preview,
      scopes: JSON.stringify(scopes),
      createdByUserId: userId,
      expiresAt,
    },
    select: { id: true },
  });
  auditKey(admin, WORKSPACE_AUDIT_ACTIONS.API_KEY_CREATED, created.id, {
    label: trimmed,
    preview: generated.preview,
    scopes,
    expiresInDays: daysLeft(expiresAt),
  });

  revalidatePath(`/w/${slug}/api-keys`);

  // CRITICAL: this is the ONLY moment the plaintext exists outside the user's
  // memory. The caller surfaces it once and we never store/log it.
  return {
    success: true,
    id: created.id,
    plaintext: generated.plaintext,
    preview: generated.preview,
    label: trimmed,
    scopes,
    expiresAt: expiresAt?.toISOString() ?? null,
  };
}

/**
 * One-click key rotation: mint a new key with the same label + scope, revoke
 * the old one, return the new plaintext for one-time reveal in the UI.
 *
 * Done in a transaction so the user is never left with both active or both
 * revoked. The rotated label is suffixed with " (rotated)" on the OLD row so
 * its audit history stays identifiable — the NEW row keeps the original label
 * so clients pasting the new key see what they expect.
 */
export async function rotateMcpApiKeyAction(slug: string, id: string) {
  const admin = await assertWorkspaceKeyAdmin(slug);
  const { workspace, userId } = admin;

  const result = await prisma.$transaction(async (tx) => {
    const old = await tx.mcpApiKey.findFirst({
      where: { id, workspaceId: workspace.id, revokedAt: null },
      select: { id: true, label: true, scopes: true, expiresAt: true },
    });
    if (!old) {
      throw new Error("Key not found or already revoked.");
    }

    const generated = generateApiKey();

    // 1. Revoke the old row and append " (rotated)" so audit log readers can
    //    tell which key the historical entries came from. Idempotent — won't
    //    double-suffix if somehow called twice.
    const taggedLabel = old.label.endsWith(" (rotated)")
      ? old.label
      : `${old.label} (rotated)`;
    await tx.mcpApiKey.update({
      where: { id: old.id },
      data: { revokedAt: new Date(), label: taggedLabel },
    });

    // 2. Create the new key with the original label + same scopes. It keeps
    //    the old key's expiry: rotating is not a way to extend a key.
    const fresh = await tx.mcpApiKey.create({
      data: {
        workspaceId: workspace.id,
        label: old.label,
        keyHash: generated.hash,
        keyPreview: generated.preview,
        scopes: old.scopes,
        createdByUserId: userId,
        expiresAt: old.expiresAt,
      },
      select: { id: true },
    });

    return {
      id: fresh.id,
      oldId: old.id,
      expiresAt: old.expiresAt?.toISOString() ?? null,
      plaintext: generated.plaintext,
      preview: generated.preview,
      label: old.label,
      scopes: safeParseScopes(old.scopes),
    };
  });

  auditKey(admin, WORKSPACE_AUDIT_ACTIONS.API_KEY_ROTATED, result.id, {
    label: result.label,
    preview: result.preview,
    previousKeyId: result.oldId,
    scopes: result.scopes,
    expiresInDays: daysLeft(result.expiresAt ? new Date(result.expiresAt) : null),
  });
  revalidatePath(`/w/${slug}/api-keys`);
  return { success: true, ...result };
}

/**
 * Defensive parse so a malformed scopes column doesn't crash the rotate
 * action. Mirrors the same helper used in the page loader.
 */
function safeParseScopes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string");
  } catch {
    /* ignore */
  }
  return ["read"];
}

export async function revokeMcpApiKeyAction(slug: string, id: string) {
  const admin = await assertWorkspaceKeyAdmin(slug);
  const { workspace } = admin;
  const key = await prisma.mcpApiKey.findFirst({
    where: { id, workspaceId: workspace.id },
    select: { label: true, keyPreview: true },
  });

  // Soft revoke — keep the row so historical audit log entries still link
  // back to a recognizable label. The auth lookup rejects revokedAt != null.
  const res = await prisma.mcpApiKey.updateMany({
    where: { id, workspaceId: workspace.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (res.count === 0) {
    throw new Error("Key not found or already revoked.");
  }
  auditKey(admin, WORKSPACE_AUDIT_ACTIONS.API_KEY_REVOKED, id, {
    label: key?.label ?? null,
    preview: key?.keyPreview ?? null,
  });

  revalidatePath(`/w/${slug}/api-keys`);
  return { success: true };
}

/** Rename a key. The secret, scopes and expiry stay as they are. */
export async function renameMcpApiKeyAction(slug: string, id: string, name: string) {
  const admin = await assertWorkspaceKeyAdmin(slug);
  const label = cleanKeyName(name);
  const key = await prisma.mcpApiKey.findFirst({
    where: { id, workspaceId: admin.workspace.id },
    select: { id: true, label: true, revokedAt: true },
  });
  if (!key) throw new Error("Key not found.");
  if (key.revokedAt) throw new Error("Revoked keys cannot be renamed.");
  if (key.label === label) return { success: true, label };
  await prisma.mcpApiKey.update({ where: { id: key.id }, data: { label } });
  auditKey(admin, WORKSPACE_AUDIT_ACTIONS.API_KEY_RENAMED, key.id, { label, previousLabel: key.label });
  revalidatePath(`/w/${slug}/api-keys`);
  return { success: true, label };
}
