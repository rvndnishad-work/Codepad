"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { encryptAtRest } from "@/lib/crypto/at-rest";
import { appOrigin } from "@/lib/interview/links";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { TEST_EVENT } from "@/lib/events/catalog";
import { buildEnvelope, newEventId } from "@/lib/events/envelope";
import { requireAlertsAdmin } from "@/lib/alerts/access";
import { DEFAULT_ALERT_EVENTS, PROVIDER_LABEL, cleanAlertEvents, isAlertProvider, validateAlertUrl } from "@/lib/alerts/format";
import { sendTestAlert } from "@/lib/alerts/send";

const MAX_CHANNELS = 10;

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function run<T extends object>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

async function findChannel(workspaceId: string, id: string) {
  const ch = await prisma.alertChannel.findFirst({ where: { id, workspaceId } });
  if (!ch) throw new Error("Channel not found.");
  return ch;
}

function cleanTarget(raw: string, fallback: string): string {
  const t = raw.trim().replace(/\s+/g, " ").slice(0, 80);
  return t || fallback;
}

/** Save a pasted Slack incoming webhook or Teams webhook / workflow URL. */
export async function connectWebhookChannelAction(
  slug: string,
  input: { provider: string; url: string; target: string },
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { workspace, actor } = await requireAlertsAdmin(slug);
    if (!isAlertProvider(input.provider)) throw new Error("Pick Slack or Microsoft Teams.");
    const checked = validateAlertUrl(input.provider, input.url);
    if (!checked.ok) throw new Error(checked.error);
    const count = await prisma.alertChannel.count({ where: { workspaceId: workspace.id } });
    if (count >= MAX_CHANNELS) throw new Error(`A workspace can have up to ${MAX_CHANNELS} alert channels.`);
    const target = cleanTarget(input.target, `${PROVIDER_LABEL[input.provider]} channel`);
    const ch = await prisma.alertChannel.create({
      data: {
        workspaceId: workspace.id,
        provider: input.provider,
        mode: "webhook",
        target,
        url: encryptAtRest(checked.url),
        events: DEFAULT_ALERT_EVENTS,
        createdById: actor.actorUserId,
      },
      select: { id: true },
    });
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.ALERT_CHANNEL_CONNECTED,
      targetType: "alertChannel",
      targetId: ch.id,
      meta: { provider: input.provider, mode: "webhook", target },
    });
    revalidatePath(`/w/${slug}/alerts`);
    return { id: ch.id };
  });
}

export async function updateAlertChannelAction(
  slug: string,
  id: string,
  input: { events?: string[]; includeScore?: boolean; active?: boolean; target?: string },
): Promise<ActionResult> {
  return run(async () => {
    const { workspace, actor } = await requireAlertsAdmin(slug);
    const ch = await findChannel(workspace.id, id);
    const data: { events?: string[]; includeScore?: boolean; active?: boolean; target?: string } = {};
    if (input.events !== undefined) data.events = cleanAlertEvents(input.events);
    if (typeof input.includeScore === "boolean") data.includeScore = input.includeScore;
    if (typeof input.active === "boolean") data.active = input.active;
    if (typeof input.target === "string") data.target = cleanTarget(input.target, ch.target);
    await prisma.alertChannel.update({ where: { id: ch.id }, data });
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.ALERT_CHANNEL_UPDATED,
      targetType: "alertChannel",
      targetId: ch.id,
      meta: { provider: ch.provider, target: data.target ?? ch.target, changes: data },
    });
    revalidatePath(`/w/${slug}/alerts`);
    return {};
  });
}

export async function removeAlertChannelAction(slug: string, id: string): Promise<ActionResult> {
  return run(async () => {
    const { workspace, actor } = await requireAlertsAdmin(slug);
    const ch = await findChannel(workspace.id, id);
    await prisma.alertChannel.delete({ where: { id: ch.id } });
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.ALERT_CHANNEL_REMOVED,
      targetType: "alertChannel",
      targetId: ch.id,
      meta: { provider: ch.provider, target: ch.target },
    });
    revalidatePath(`/w/${slug}/alerts`);
    return {};
  });
}

export async function sendAlertTestAction(slug: string, id: string): Promise<ActionResult<{ sent: boolean; error: string | null }>> {
  return run(async () => {
    const { workspace, actor } = await requireAlertsAdmin(slug);
    const ch = await findChannel(workspace.id, id);
    const origin = await appOrigin();
    const envelope = buildEnvelope(newEventId(), TEST_EVENT, workspace, {}, origin);
    const result = await sendTestAlert(ch, envelope, origin);
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.ALERT_TEST_SENT,
      targetType: "alertChannel",
      targetId: ch.id,
      meta: { provider: ch.provider, target: ch.target, ok: result.ok, status: result.status },
    });
    revalidatePath(`/w/${slug}/alerts`);
    return { sent: result.ok, error: result.error };
  });
}
