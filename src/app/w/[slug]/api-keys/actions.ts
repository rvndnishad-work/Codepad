"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { workspacePlanAllowsAiScreening } from "@/lib/ai-interview/credits";
import { generateApiKey } from "@/lib/mcp/auth";

type Member = { userId: string; role: string };

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
      members: { select: { userId: true, role: true } },
    },
  });
  if (!workspace) throw new Error("Workspace not found");

  const member = workspace.members.find((m: Member) => m.userId === session.user.id);
  if (!member) throw new Error("Not a member of this workspace");

  if (!workspacePlanAllowsAiScreening(workspace.planName)) {
    throw new Error("This workspace plan does not include the MCP API.");
  }
  if (member.role !== "OWNER" && member.role !== "ADMIN") {
    throw new Error("Only workspace owners/admins can manage API keys.");
  }

  return { workspace, userId: session.user.id };
}

export type CreateKeyScope = "read" | "read-write";

export async function createMcpApiKeyAction(
  slug: string,
  label: string,
  scope: CreateKeyScope = "read"
) {
  const { workspace, userId } = await assertWorkspaceKeyAdmin(slug);

  const trimmed = label?.trim() ?? "";
  if (!trimmed) throw new Error("Label is required.");
  if (trimmed.length > 60) throw new Error("Label must be 60 characters or fewer.");

  // Resolve the requested scope to the canonical persisted form. Phase 2
  // ships two tiers; future phases may add `admin` or per-tool scopes here.
  const scopes =
    scope === "read-write" ? ["read", "write"] : ["read"];

  const generated = generateApiKey();

  await prisma.mcpApiKey.create({
    data: {
      workspaceId: workspace.id,
      label: trimmed,
      keyHash: generated.hash,
      keyPreview: generated.preview,
      scopes: JSON.stringify(scopes),
      createdByUserId: userId,
    },
  });

  revalidatePath(`/w/${slug}/api-keys`);

  // CRITICAL: this is the ONLY moment the plaintext exists outside the user's
  // memory. The caller surfaces it once and we never store/log it.
  return {
    success: true,
    plaintext: generated.plaintext,
    preview: generated.preview,
    label: trimmed,
    scopes,
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
  const { workspace, userId } = await assertWorkspaceKeyAdmin(slug);

  const result = await prisma.$transaction(async (tx) => {
    const old = await tx.mcpApiKey.findFirst({
      where: { id, workspaceId: workspace.id, revokedAt: null },
      select: { id: true, label: true, scopes: true },
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

    // 2. Create the new key with the original label + same scopes.
    await tx.mcpApiKey.create({
      data: {
        workspaceId: workspace.id,
        label: old.label,
        keyHash: generated.hash,
        keyPreview: generated.preview,
        scopes: old.scopes,
        createdByUserId: userId,
      },
    });

    return {
      plaintext: generated.plaintext,
      preview: generated.preview,
      label: old.label,
      scopes: safeParseScopes(old.scopes),
    };
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
  const { workspace } = await assertWorkspaceKeyAdmin(slug);

  // Soft revoke — keep the row so historical audit log entries still link
  // back to a recognizable label. The auth lookup rejects revokedAt != null.
  const res = await prisma.mcpApiKey.updateMany({
    where: { id, workspaceId: workspace.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (res.count === 0) {
    throw new Error("Key not found or already revoked.");
  }

  revalidatePath(`/w/${slug}/api-keys`);
  return { success: true };
}
