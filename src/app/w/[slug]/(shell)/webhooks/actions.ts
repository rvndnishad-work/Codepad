"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { canMember } from "@/lib/permissions";
import { encryptAtRest, decryptAtRest } from "@/lib/crypto/at-rest";
import { validateOutboundUrl } from "@/lib/mcp/outbound";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { cleanEventList, TEST_EVENT } from "@/lib/events/catalog";
import { validateEndpointUrl } from "@/lib/events/policy";
import { generateWebhookSecret } from "@/lib/events/signing";
import { deliverWebhook } from "@/lib/events/deliver";
import { queueTestDelivery } from "@/lib/events/emit";

const MAX_ENDPOINTS = 10;

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type SendResult = { ok: boolean; responseCode: number | null; error: string | null };

async function requireAdmin(slug: string) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) throw new Error("Sign in to continue.");
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
  if (!workspace) throw new Error("Workspace not found.");
  const member = workspace.members.find((m) => m.userId === session.user.id);
  if (!member) throw new Error("You are not a member of this workspace.");
  if (!growthToolsEnabled(workspace)) throw new Error("Webhooks are part of the Growth plan.");
  if (!(await canMember(member, "integration:manage"))) {
    throw new Error("Only workspace owners and admins can manage webhooks.");
  }
  return {
    workspace,
    actor: { workspaceId: workspace.id, actorUserId: session.user.id, actorEmail: session.user.email ?? null },
  };
}

async function run<T extends object>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

async function checkUrl(raw: string): Promise<string> {
  const basic = validateEndpointUrl(raw, { allowLocal: process.env.NODE_ENV !== "production" });
  if (!basic.ok) throw new Error(basic.error);
  const dns = await validateOutboundUrl(basic.url);
  if (!dns.ok) throw new Error(dns.reason);
  return basic.url;
}

async function findEndpoint(workspaceId: string, id: string) {
  const ep = await prisma.webhookEndpoint.findFirst({ where: { id, workspaceId } });
  if (!ep) throw new Error("Endpoint not found.");
  return ep;
}

export async function createWebhookEndpointAction(
  slug: string,
  input: { url: string; events: string[] },
): Promise<ActionResult<{ id: string; secret: string }>> {
  return run(async () => {
    const { workspace, actor } = await requireAdmin(slug);
    const url = await checkUrl(input.url);
    const events = cleanEventList(input.events);
    if (!events.length) throw new Error("Pick at least one event.");
    const count = await prisma.webhookEndpoint.count({ where: { workspaceId: workspace.id } });
    if (count >= MAX_ENDPOINTS) throw new Error(`A workspace can have up to ${MAX_ENDPOINTS} endpoints.`);
    const secret = generateWebhookSecret();
    const ep = await prisma.webhookEndpoint.create({
      data: {
        workspaceId: workspace.id,
        url,
        secret: encryptAtRest(secret),
        events,
        createdById: actor.actorUserId,
      },
      select: { id: true },
    });
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.WEBHOOK_ENDPOINT_CREATED,
      targetType: "webhookEndpoint",
      targetId: ep.id,
      meta: { url, events },
    });
    revalidatePath(`/w/${slug}/webhooks`);
    return { id: ep.id, secret };
  });
}

export async function updateWebhookEndpointAction(
  slug: string,
  id: string,
  input: { url: string; events: string[] },
): Promise<ActionResult> {
  return run(async () => {
    const { workspace, actor } = await requireAdmin(slug);
    const ep = await findEndpoint(workspace.id, id);
    const url = await checkUrl(input.url);
    const events = cleanEventList(input.events);
    if (!events.length) throw new Error("Pick at least one event.");
    await prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { url, events } });
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.WEBHOOK_ENDPOINT_UPDATED,
      targetType: "webhookEndpoint",
      targetId: ep.id,
      meta: { fromUrl: ep.url, url, fromEvents: ep.events, events },
    });
    revalidatePath(`/w/${slug}/webhooks`);
    return {};
  });
}

export async function deleteWebhookEndpointAction(slug: string, id: string): Promise<ActionResult> {
  return run(async () => {
    const { workspace, actor } = await requireAdmin(slug);
    const ep = await findEndpoint(workspace.id, id);
    await prisma.webhookEndpoint.delete({ where: { id: ep.id } });
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.WEBHOOK_ENDPOINT_DELETED,
      targetType: "webhookEndpoint",
      targetId: ep.id,
      meta: { url: ep.url },
    });
    revalidatePath(`/w/${slug}/webhooks`);
    return {};
  });
}

export async function setWebhookPausedAction(slug: string, id: string, paused: boolean): Promise<ActionResult> {
  return run(async () => {
    const { workspace, actor } = await requireAdmin(slug);
    const ep = await findEndpoint(workspace.id, id);
    await prisma.webhookEndpoint.update({
      where: { id: ep.id },
      data: paused
        ? { active: false, pausedAt: new Date(), pausedReason: "manual" }
        : { active: true, pausedAt: null, pausedReason: null, failureCount: 0 },
    });
    await writeWorkspaceAuditEntry({
      ...actor,
      action: paused ? WORKSPACE_AUDIT_ACTIONS.WEBHOOK_ENDPOINT_PAUSED : WORKSPACE_AUDIT_ACTIONS.WEBHOOK_ENDPOINT_RESUMED,
      targetType: "webhookEndpoint",
      targetId: ep.id,
      meta: { url: ep.url, ...(paused ? {} : { previousReason: ep.pausedReason }) },
    });
    revalidatePath(`/w/${slug}/webhooks`);
    return {};
  });
}

export async function revealWebhookSecretAction(slug: string, id: string): Promise<ActionResult<{ secret: string }>> {
  return run(async () => {
    const { workspace, actor } = await requireAdmin(slug);
    const ep = await findEndpoint(workspace.id, id);
    const secret = decryptAtRest(ep.secret);
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.WEBHOOK_SECRET_REVEALED,
      targetType: "webhookEndpoint",
      targetId: ep.id,
      meta: { url: ep.url },
    });
    return { secret };
  });
}

export async function rotateWebhookSecretAction(slug: string, id: string): Promise<ActionResult<{ secret: string }>> {
  return run(async () => {
    const { workspace, actor } = await requireAdmin(slug);
    const ep = await findEndpoint(workspace.id, id);
    const secret = generateWebhookSecret();
    await prisma.webhookEndpoint.update({ where: { id: ep.id }, data: { secret: encryptAtRest(secret) } });
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.WEBHOOK_SECRET_ROTATED,
      targetType: "webhookEndpoint",
      targetId: ep.id,
      meta: { url: ep.url },
    });
    revalidatePath(`/w/${slug}/webhooks`);
    return { secret };
  });
}

function sendResult(r: Awaited<ReturnType<typeof deliverWebhook>>): SendResult {
  if (!r.sent) {
    const why =
      r.reason === "paused" ? "This endpoint is paused. Resume it first." : r.reason === "busy" ? "That delivery is already being sent." : "Delivery not found.";
    throw new Error(why);
  }
  return { ok: r.ok, responseCode: r.responseCode, error: r.error };
}

export async function sendWebhookTestAction(slug: string, id: string): Promise<ActionResult<SendResult>> {
  return run(async () => {
    const { workspace, actor } = await requireAdmin(slug);
    const ep = await findEndpoint(workspace.id, id);
    const deliveryId = await queueTestDelivery(ep.id, workspace);
    const result = sendResult(await deliverWebhook(deliveryId, { force: true }));
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.WEBHOOK_TEST_SENT,
      targetType: "webhookEndpoint",
      targetId: ep.id,
      meta: { url: ep.url, ok: result.ok, responseCode: result.responseCode },
    });
    revalidatePath(`/w/${slug}/webhooks`);
    return result;
  });
}

/** Send a past delivery again as a new delivery with the same event id. */
export async function redeliverWebhookAction(slug: string, deliveryId: string): Promise<ActionResult<SendResult>> {
  return run(async () => {
    const { workspace, actor } = await requireAdmin(slug);
    const original = await prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, endpoint: { workspaceId: workspace.id } },
      include: { endpoint: { select: { id: true, url: true, active: true } } },
    });
    if (!original) throw new Error("Delivery not found.");
    if (!original.endpoint.active && original.event !== TEST_EVENT) {
      throw new Error("This endpoint is paused. Resume it first.");
    }
    const copy = await prisma.webhookDelivery.create({
      data: {
        endpointId: original.endpointId,
        eventId: original.eventId,
        event: original.event,
        payload: original.payload ?? {},
        status: "pending",
      },
      select: { id: true },
    });
    const result = sendResult(await deliverWebhook(copy.id, { force: true }));
    await writeWorkspaceAuditEntry({
      ...actor,
      action: WORKSPACE_AUDIT_ACTIONS.WEBHOOK_REDELIVERED,
      targetType: "webhookEndpoint",
      targetId: original.endpointId,
      meta: { url: original.endpoint.url, event: original.event, eventId: original.eventId, ok: result.ok },
    });
    revalidatePath(`/w/${slug}/webhooks`);
    return result;
  });
}
