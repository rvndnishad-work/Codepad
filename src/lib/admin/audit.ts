/**
 * Platform audit log: every action taken in /admin, by the admin assistant or
 * by a system job on the admin's behalf. Call `logAdminAction` from the
 * server action or route after the change succeeds (or inside its
 * transaction by passing `tx`).
 */
import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { headers } from "next/headers";

type Db = PrismaClient | Prisma.TransactionClient;

export type AdminActor = {
  id?: string | null;
  email?: string | null;
};

export type AdminAuditInput = {
  actor: AdminActor | null | undefined;
  /** Dotted key: "workspace.credits.grant", "switch.set", "user.suspend"… */
  action: string;
  targetType?: string;
  targetId?: string | null;
  targetLabel?: string | null;
  before?: unknown;
  after?: unknown;
  note?: string | null;
  via?: "admin" | "assistant" | "system";
};

async function requestIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {
    return null; // not in a request (cron, script)
  }
}

function json(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined) return undefined;
  return JSON.parse(JSON.stringify(v ?? null)) as Prisma.InputJsonValue;
}

/** Write one audit row. Never throws: an audit failure must not undo the action. */
export async function logAdminAction(input: AdminAuditInput, db: Db = prisma): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        actorId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? null,
        via: input.via ?? "admin",
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        targetLabel: input.targetLabel ?? null,
        before: json(input.before),
        after: json(input.after),
        note: input.note?.slice(0, 2000) ?? null,
        ip: await requestIp(),
      },
    });
  } catch (err) {
    console.error("[admin-audit] write failed", input.action, err);
  }
}

/** Short label for an action key, for lists and the assistant. */
export function actionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/[._]/g, " ");
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "switch.set": "Changed a feature switch",
  "maintenance.create": "Scheduled maintenance",
  "maintenance.update": "Edited maintenance",
  "maintenance.end": "Ended maintenance",
  "workspace.plan": "Changed plan",
  "workspace.credits.grant": "Granted AI credits",
  "workspace.credits.adjust": "Adjusted AI credits",
  "workspace.credits.refund": "Refunded a session",
  "workspace.trial.extend": "Extended trial",
  "workspace.lock": "Locked workspace",
  "workspace.unlock": "Unlocked workspace",
  "workspace.delete.schedule": "Scheduled workspace deletion",
  "workspace.seats.sync": "Synced seats",
  "stripe.sync": "Synced Stripe",
  "workspace.video": "Changed video add-on",
  "workspace.view_as": "Viewed as owner",
  "user.update": "Edited user",
  "user.suspend": "Suspended user",
  "user.unsuspend": "Lifted suspension",
  "user.delete": "Deleted user",
  "user.verify_email": "Verified email",
  "user.soft_delete": "Deleted user (can be restored)",
  "user.restore": "Restored user",
  "user.export": "Exported users",
  "user.signout": "Signed user out",
  "user.2fa.reset": "Reset 2FA",
  "role.assign": "Assigned role",
  "role.unassign": "Removed role",
  "role.permissions": "Changed role permissions",
  "role.create": "Created role",
  "role.delete": "Deleted role",
  "content.snippet": "Changed snippet",
  "todo.create": "Created todo",
  "todo.status": "Changed todo status",
  "todo.update": "Edited todo",
  "todo.criterion": "Changed todo checklist",
  "todo.delete": "Deleted todo",
  "setting.update": "Changed settings",
  "pricing.update": "Changed pricing",
  "pricing.reset": "Reset pricing",
  "content.blog": "Moderated blog",
  "content.challenge": "Changed challenge",
  "content.question": "Changed question",
  "content.report": "Resolved report",
  "broadcast.send": "Sent notification",
  "email.resend": "Resent email",
  "email.unsuppress": "Lifted email suppression",
  "job.run": "Ran a job",
  "audit.export": "Exported the audit log",
};
