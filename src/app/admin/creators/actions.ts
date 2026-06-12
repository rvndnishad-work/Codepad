"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { staffCan } from "@/lib/permissions/staff";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";

async function requireReviewer() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id || !(await staffCan(session, "creator:review"))) {
    throw new Error("Unauthorized: creator:review permission required.");
  }
  return session.user.id;
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
  const reviewerId = await requireReviewer();
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
  await createNotification({
    userId: app.userId,
    type: NOTIFICATION_TYPES.CREATOR_STATUS,
    title: "You're approved as a Creator! 🎉",
    body: "Your creator access is live — set up your space and start publishing.",
    href: "/creator",
  }).catch(() => {});

  revalidatePath("/admin/creators");
}

/** Reject an application → notify the applicant (they can resubmit). */
export async function rejectCreatorApplicationAction(applicationId: string, note?: string) {
  const reviewerId = await requireReviewer();
  const app = await prisma.creatorApplication.findUnique({ where: { id: applicationId } });
  if (!app) throw new Error("Application not found.");

  await prisma.creatorApplication.update({
    where: { id: applicationId },
    data: {
      status: "REJECTED",
      reviewerId,
      reviewNote: note?.trim() || null,
      reviewedAt: new Date(),
    },
  });

  await resolveAlert(applicationId);
  await createNotification({
    userId: app.userId,
    type: NOTIFICATION_TYPES.CREATOR_STATUS,
    title: "Creator application update",
    body: note?.trim() || "Your application wasn't approved this time. You can update your details and resubmit.",
    href: "/become-creator",
  }).catch(() => {});

  revalidatePath("/admin/creators");
}
