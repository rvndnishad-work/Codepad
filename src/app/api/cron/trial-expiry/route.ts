import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCronAuth } from "@/lib/cron-auth";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { planDisplayName } from "@/lib/billing/usage";

/**
 * Trial-expiry sweep (IP-91). Finds workspaces whose 14-day trial lapsed and
 * notifies their owners/admins. It does NOT downgrade any data:
 * `effectivePlan` already treats a past-due trial as FREE, so gates fall back
 * automatically. This cron stamps `trialEndedAt` once (so we don't re-notify),
 * writes the "trial ended" audit entry and sends the heads-up. `trialEndsAt`
 * is kept, so Billing and usage can say the trial has ended. Workspaces that
 * upgraded to a paid plan are skipped.
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
      trialEndedAt: null,
      // Still on a free-tier plan (paid upgrades don't need a trial notice).
      planName: { notIn: ["GROWTH", "ENTERPRISE"] },
      stripeSubscriptionId: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      planName: true,
      trialEndsAt: true,
      members: {
        where: { role: { in: [...MANAGER_ROLES] } },
        select: { userId: true },
      },
    },
    take: MAX_BATCH,
  });

  let expired = 0;
  let notified = 0;
  const { createNotification, NOTIFICATION_TYPES } = await import("@/lib/notifications");

  for (const ws of lapsed) {
    // Stamp once, guarded, so an overlapping run does not notify twice.
    const claimed = await prisma.workspace.updateMany({
      where: { id: ws.id, trialEndedAt: null },
      data: { trialEndedAt: now },
    });
    if (!claimed.count) continue;
    expired++;

    await writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      action: WORKSPACE_AUDIT_ACTIONS.TRIAL_ENDED,
      targetType: "workspace",
      targetId: ws.id,
      meta: { plan: planDisplayName(ws.planName), endedAt: ws.trialEndsAt?.toISOString() ?? null, source: "auto:trial" },
    });

    for (const m of ws.members) {
      try {
        await createNotification({
          userId: m.userId,
          type: NOTIFICATION_TYPES.AI_CREDITS_LOW, // reuse the billing-nudge type
          title: `Your ${ws.name} trial has ended`,
          body: "Upgrade to Growth to keep AI screening and your extra seats.",
          href: `/w/${ws.slug}/billing`,
          payload: { workspaceId: ws.id, reason: "trial-expired" },
        });
        notified++;
      } catch (err) {
        console.error("[trial-expiry] notify failed:", err);
      }
    }
  }

  return NextResponse.json({ ok: true, expired, notified, ranAt: now.toISOString() });
}
