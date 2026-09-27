/**
 * The low-credit email to owners and admins, sent when the AI screening
 * credit balance falls below the threshold set on Billing and usage. One
 * email per dip (see lowCreditDecision); the stamp clears once credits are
 * back at or above the threshold. Never throws.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getWorkspaceCredits } from "@/lib/ai-interview/credits";
import { appOrigin } from "@/lib/interview/links";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { lowCreditDecision } from "./usage";

export async function checkLowCredits(workspaceId: string, balance?: number): Promise<"sent" | "cleared" | "none"> {
  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, lowCreditThreshold: true, lowCreditAlertedAt: true },
    });
    if (!ws) return "none";
    if (ws.lowCreditThreshold === null && !ws.lowCreditAlertedAt) return "none";
    const now = balance ?? (await getWorkspaceCredits(workspaceId));
    const decision = lowCreditDecision({ threshold: ws.lowCreditThreshold, alertedAt: ws.lowCreditAlertedAt }, now);

    if (decision === "clear") {
      await prisma.workspace.update({ where: { id: ws.id }, data: { lowCreditAlertedAt: null } });
      return "cleared";
    }
    if (decision !== "send" || ws.lowCreditThreshold === null) return "none";

    // Claim the stamp first so two screenings starting together send one email.
    const claimed = await prisma.workspace.updateMany({ where: { id: ws.id, lowCreditAlertedAt: null }, data: { lowCreditAlertedAt: new Date() } });
    if (!claimed.count) return "none";

    const admins = await prisma.workspaceMember.findMany({
      where: { workspaceId: ws.id, role: { in: [...MANAGER_ROLES] } },
      select: { user: { select: { name: true, email: true } } },
    });
    const recipients = admins.map((a) => a.user).filter((u): u is { name: string | null; email: string } => !!u.email);
    const { sendEmail } = await import("@/lib/email");
    const buyUrl = `${await appOrigin()}/w/${ws.slug}/billing?tab=usage`;
    const stamp = Date.now();
    await Promise.allSettled(
      recipients.map((u) =>
        sendEmail({
          template: "credits-low",
          to: u.email,
          props: { recipientName: u.name || "there", workspaceName: ws.name, balance: now, threshold: ws.lowCreditThreshold!, buyUrl },
          workspaceId: ws.id,
          idempotencyKey: `credits-low:${ws.id}:${u.email}:${stamp}`,
        }),
      ),
    );
    await writeWorkspaceAuditEntry({
      workspaceId: ws.id,
      action: WORKSPACE_AUDIT_ACTIONS.CREDITS_LOW_ALERT_SENT,
      targetType: "workspace",
      targetId: ws.id,
      meta: { balance: now, threshold: ws.lowCreditThreshold, recipients: recipients.length, source: "auto:credits" },
    });
    return "sent";
  } catch (err) {
    console.error("[credits-low] check failed:", err);
    return "none";
  }
}
