"use server";

/**
 * General tab actions that do not fit the generic settings save: checking a
 * new web address while it is typed, and uploading or removing the logo.
 * The logo is stored in WorkspaceLogo and served from
 * /api/workspace-logo/<workspaceId>, so candidate pages and emails can load it.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/interview/links";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { SETTINGS_FIELDS } from "@/lib/workspace/settings";
import { settingsAccess } from "@/lib/workspace/settings-server";
import { checkLogoFile, isReservedSlug, sniffImageType, uploadedLogoUrl } from "@/lib/workspace/screening-defaults";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function editor(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return { error: "You are signed out. Sign in and try again." } as const;
  const ws = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true, slug: true, logoUrl: true, members: { where: { userId: session.user.id }, select: { role: true, permissions: true } } },
  });
  if (!ws) return { error: "Workspace not found." } as const;
  const me = ws.members[0];
  if (!me) return { error: "You are not a member of this workspace." } as const;
  const access = await settingsAccess(me);
  if (!access.canEdit) return { error: "Only owners and admins can change settings." } as const;
  return { session, ws, access } as const;
}

async function auditLogo(workspaceId: string, actor: { id: string; email: string | null }, from: string | null, to: string | null) {
  const rule = SETTINGS_FIELDS.logoUrl;
  await writeWorkspaceAuditEntry({
    workspaceId,
    actorUserId: actor.id,
    actorEmail: actor.email,
    action: WORKSPACE_AUDIT_ACTIONS.WORKSPACE_SETTINGS_CHANGED,
    targetType: "workspace",
    targetId: workspaceId,
    meta: { tab: "general", field: "logoUrl", label: rule.label, from: rule.show(from), to: to ? "New logo" : rule.show(null) },
  });
}

export type SlugCheck = { state: "same" | "available" | "taken" | "invalid"; message: string };

/** Whether a web address is free, for the hint under the field. The save checks again. */
export async function checkSlugAction(slug: string, candidate: string): Promise<SlugCheck> {
  const e = await editor(slug);
  if ("error" in e) return { state: "invalid", message: e.error ?? "Could not check." };
  const parsed = SETTINGS_FIELDS.slug.parse(candidate);
  if (!parsed.ok) return { state: "invalid", message: parsed.error };
  const next = parsed.value as string;
  if (next === e.ws.slug) return { state: "same", message: "This is the current address." };
  if (isReservedSlug(next)) return { state: "taken", message: "That web address is kept for Interviewpad pages. Try another." };
  const [takenBy, redirectBy] = await Promise.all([
    prisma.workspace.findUnique({ where: { slug: next }, select: { id: true } }),
    prisma.workspaceSlugRedirect.findUnique({ where: { oldSlug: next }, select: { workspaceId: true } }),
  ]);
  if ((takenBy && takenBy.id !== e.ws.id) || (redirectBy && redirectBy.workspaceId !== e.ws.id)) {
    return { state: "taken", message: "That web address is taken. Try another." };
  }
  return { state: "available", message: "Available." };
}

/** Upload a new logo (PNG, JPG or WebP, up to 512 KB). Saved at once, not through the save bar. */
export async function uploadLogoAction(slug: string, form: FormData): Promise<Result<{ logoUrl: string }>> {
  try {
    const e = await editor(slug);
    if ("error" in e) return { ok: false, error: e.error! };
    const file = form.get("logo");
    if (!(file instanceof File)) return { ok: false, error: "Pick an image to upload." };
    const check = checkLogoFile(file);
    if (!check.ok) return check;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = sniffImageType(bytes);
    if (!mime) return { ok: false, error: "That file is not a PNG, JPG or WebP image." };

    const logoUrl = uploadedLogoUrl(await appOrigin(), e.ws.id, Date.now());
    await prisma.$transaction([
      prisma.workspaceLogo.upsert({
        where: { workspaceId: e.ws.id },
        create: { workspaceId: e.ws.id, mime, bytes },
        update: { mime, bytes },
      }),
      prisma.workspace.update({ where: { id: e.ws.id }, data: { logoUrl } }),
    ]);
    await auditLogo(e.ws.id, { id: e.session.user!.id!, email: e.session.user!.email ?? null }, e.ws.logoUrl, logoUrl);
    revalidatePath(`/w/${e.ws.slug}`, "layout");
    return { ok: true, logoUrl };
  } catch (err) {
    console.error("[settings] logo upload failed:", err);
    return { ok: false, error: "Could not upload the logo. Try again." };
  }
}

/** Remove the logo. An uploaded file is deleted too. */
export async function removeLogoAction(slug: string): Promise<Result> {
  try {
    const e = await editor(slug);
    if ("error" in e) return { ok: false, error: e.error! };
    if (!e.ws.logoUrl) return { ok: true };
    await prisma.$transaction([
      prisma.workspace.update({ where: { id: e.ws.id }, data: { logoUrl: null } }),
      prisma.workspaceLogo.deleteMany({ where: { workspaceId: e.ws.id } }),
    ]);
    await auditLogo(e.ws.id, { id: e.session.user!.id!, email: e.session.user!.email ?? null }, e.ws.logoUrl, null);
    revalidatePath(`/w/${e.ws.slug}`, "layout");
    return { ok: true };
  } catch (err) {
    console.error("[settings] logo remove failed:", err);
    return { ok: false, error: "Could not remove the logo. Try again." };
  }
}

