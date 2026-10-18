"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";
import { logAdminAction } from "@/lib/admin/audit";
import { requireStaff } from "../content/_lib/guard";
import { fail, ok, type ActionResult } from "../content/_lib/result";

async function requireReviewer() {
  const ctx = await requireStaff("creator:review").catch(() => null);
  if (!ctx?.userId) throw new Error("Unauthorized: creator:review permission required.");
  return { reviewerId: ctx.userId, actor: ctx.actor };
}

/** Best-effort: mark the linked Gemma alert resolved once a decision is made. */
async function resolveAlert(applicationId: string) {
  try {
    await prisma.gemmaAlert.updateMany({
      where: { targetId: applicationId, status: "UNRESOLVED" },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  } catch (err) {
    console.error("[creator-app] resolve alert failed:", err);
  }
}

/** Approve an application → grant the CREATOR role + notify the applicant. */
export async function approveCreatorApplicationAction(applicationId: string, note?: string) {
  const { reviewerId, actor } = await requireReviewer();
  const app = await prisma.creatorApplication.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error("Application not found.");

  const role = await prisma.role.findUnique({ where: { key: "CREATOR" }, select: { id: true } });
  if (!role) throw new Error("CREATOR role missing — run the role seed.");

  await prisma.$transaction([
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: app.userId, roleId: role.id } },
      update: {},
      create: { userId: app.userId, roleId: role.id },
    }),
    prisma.creatorApplication.update({
      where: { id: applicationId },
      data: {
        status: "APPROVED",
        reviewerId,
        reviewNote: note?.trim() || null,
        reviewedAt: new Date(),
      },
    }),
  ]);

  await resolveAlert(applicationId);
  await logAdminAction({
    actor,
    action: "content.creator.approve",
    targetType: "creator_application",
    targetId: applicationId,
    targetLabel: app.profileUrl,
    before: { status: app.status },
    after: { status: "APPROVED", userId: app.userId },
    note: note?.trim() || null,
  });
  await createNotification({
    userId: app.userId,
    type: NOTIFICATION_TYPES.CREATOR_STATUS,
    title: "You're approved as a Creator! 🎉",
    body: "Your creator access is live — set up your space and start publishing.",
    href: "/creator",
  }).catch(() => {});

  revalidatePath("/admin/creators");
}

/** Reject an application → notify the applicant with the reason (they can resubmit). */
export async function rejectCreatorApplicationAction(applicationId: string, note?: string) {
  const { reviewerId, actor } = await requireReviewer();
  if (!note?.trim()) throw new Error("Add a reason for the applicant.");
  const app = await prisma.creatorApplication.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error("Application not found.");

  await prisma.creatorApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      reviewerId,
      reviewNote: note.trim(),
      reviewedAt: new Date(),
    },
  });

  await resolveAlert(applicationId);
  await logAdminAction({
    actor,
    action: "content.creator.reject",
    targetType: "creator_application",
    targetId: applicationId,
    targetLabel: app.profileUrl,
    before: { status: app.status },
    after: { status: "REJECTED", userId: app.userId },
    note: note.trim(),
  });
  await createNotification({
    userId: app.userId,
    type: NOTIFICATION_TYPES.CREATOR_STATUS,
    title: "Creator application update",
    body: note.trim(),
    href: "/become-creator",
  }).catch(() => {});

  revalidatePath("/admin/creators");
}

/**
 * Take a creator space off the site (or put it back). CreatorSpace has only
 * a `published` flag, no suspended state, so the owner can publish it again
 * from the studio; repeat offences need the owner's account suspended.
 */
export async function setSpacePublished(spaceId: string, published: boolean, note: string): Promise<ActionResult> {
  const { actor } = await requireReviewer();
  if (!published && !note.trim()) return fail("Add a reason.");
  const space = await prisma.creatorSpace.findUnique({ where: { id: spaceId }, select: { handle: true, name: true, published: true, ownerId: true } });
  if (!space) return fail("Space not found.");
  await prisma.creatorSpace.update({ where: { id: spaceId }, data: { published } });
  await logAdminAction({
    actor,
    action: published ? "content.space.publish" : "content.space.unpublish",
    targetType: "creator_space",
    targetId: spaceId,
    targetLabel: `${space.name} (/c/${space.handle})`,
    before: { published: space.published },
    after: { published },
    note: note.trim() || null,
  });
  if (!published) {
    await createNotification({
      userId: space.ownerId,
      type: NOTIFICATION_TYPES.CREATOR_STATUS,
      title: `${space.name} was taken offline`,
      body: note.trim(),
      href: `/creator/${space.handle}`,
    }).catch(() => {});
  }
  revalidatePath("/admin/creators");
  revalidatePath(`/admin/creators/${space.handle}`);
  revalidatePath(`/c/${space.handle}`);
  return ok();
}
