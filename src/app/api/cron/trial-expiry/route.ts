import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";

/**
 * Trial-expiry sweep (IP-91). Finds workspaces whose 14-day trial lapsed in the
 * last window and notifies their owners/admins. It does NOT downgrade any data:
 * `effectivePlan` already treats a past-due trial as FREE, so gates fall back
 * automatically — this cron only clears the flag (so we don't re-notify) and
 * sends the heads-up. Workspaces that upgraded to a paid plan are skipped.
 *
 * Recommended cadence: hourly. Auth: `X-Cron-Secret` / `Authorization: Bearer`.
 */
const MAX_BATCH = 200;

export async function POST(req: NextRequest) {
  const gate = assertCronAuth(req);
  if (!gate.ok) return gate.response;

  const now = new Date();

  const lapsed = await prisma.workspace.findMany({
    where: {
      trialEndsAt: { not: null, lt: now },
      // Still on a free-tier plan (paid upgrades don't need a trial notice).
      planName: { notIn: ["GROWTH", "ENTERPRISE"] },
      stripeSubscriptionId: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      members: {
        where: { role: { in: [...MANAGER_ROLES] } },
        select: { userId: true },
      },
    },
    take: MAX_BATCH,
  });

  let notified = 0;
  const { createNotification, NOTIFICATION_TYPES } = await import("@/lib/notifications");

  for (const ws of lapsed) {
    // Clear the flag so this workspace isn't swept again next hour.
    await prisma.workspace.update({
      where: { id: ws.id },
      data: { trialEndsAt: null },
    });

    for (const m of ws.members) {
      try {
        await createNotification({
          userId: m.userId,
          type: NOTIFICATION_TYPES.AI_CREDITS_LOW, // reuse the billing-nudge type
          title: `Your ${ws.name} trial has ended`,
          body: "Upgrade to Growth to keep AI screening and your extra seats.",
          href: `/w/${ws.slug}?section=billing`,
          payload: { workspaceId: ws.id, reason: "trial-expired" },
        });
        notified++;
      } catch (err) {
        console.error("[trial-expiry] notify failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true, expired: lapsed.length, notified, ranAt: now.toISOString() });
}
