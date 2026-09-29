/**
 * Sends webhook deliveries. Server only.
 *
 * A delivery is claimed with a guarded update (pending -> sending) so the
 * cron, an immediate send and a Resend click can never POST the same row
 * twice at once. Rows stuck in "sending" (a crashed function) are retaken
 * after STALE_SENDING_MS.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptAtRest } from "@/lib/crypto/at-rest";
import { validateOutboundUrl, type SSRFCheckResult } from "@/lib/mcp/outbound";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { TEST_EVENT } from "./catalog";
import { STALE_SENDING_MS, isSuccessStatus, planAfterAttempt, shouldAutoPause } from "./policy";
import {
  DELIVERY_ID_HEADER,
  EVENT_HEADER,
  EVENT_ID_HEADER,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  signatureHeader,
} from "./signing";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ERROR_CHARS = 500;

export type DeliveryResult =
  | { sent: true; ok: boolean; responseCode: number | null; error: string | null }
  | { sent: false; reason: "not_found" | "busy" | "paused" };

/** The claim filter: a pending row that is due, or a stale "sending" row. */
function claimableWhere(now: Date, force: boolean): Prisma.WebhookDeliveryWhereInput {
  return {
    OR: [
      force ? { status: "pending" } : { status: "pending", nextAttemptAt: { lte: now } },
      { status: "sending", updatedAt: { lt: new Date(now.getTime() - STALE_SENDING_MS) } },
    ],
  };
}

async function postOnce(url: string, headers: Record<string, string>, body: string) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    let error: string | null = null;
    if (!isSuccessStatus(res.status)) {
      const text = await res.text().catch(() => "");
      error = `HTTP ${res.status}${text ? `: ${text.slice(0, MAX_ERROR_CHARS)}` : ""}`;
    }
    return { code: res.status, error };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    const msg =
      name === "TimeoutError" || name === "AbortError"
        ? `No response within ${REQUEST_TIMEOUT_MS / 1000} seconds`
        : err instanceof Error
          ? err.message
          : String(err);
    return { code: null, error: msg.slice(0, MAX_ERROR_CHARS) };
  }
}

/**
 * Try one delivery now. `force` ignores nextAttemptAt (Resend and Send test).
 */
export async function deliverWebhook(deliveryId: string, opts: { force?: boolean } = {}): Promise<DeliveryResult> {
  const now = new Date();
  const claimed = await prisma.webhookDelivery.updateMany({
    where: { id: deliveryId, ...claimableWhere(now, !!opts.force) },
    data: { status: "sending" },
  });
  if (claimed.count === 0) {
    const exists = await prisma.webhookDelivery.count({ where: { id: deliveryId } });
    return { sent: false, reason: exists ? "busy" : "not_found" };
  }

  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: true },
  });
  if (!delivery) return { sent: false, reason: "not_found" };
  const endpoint = delivery.endpoint;
  const isTest = delivery.event === TEST_EVENT;

  // Paused endpoints hold their queue; resuming sends it.
  if (!endpoint.active && !isTest) {
    await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { status: "pending" } });
    return { sent: false, reason: "paused" };
  }

  const body = JSON.stringify(delivery.payload);
  const ts = Math.floor(Date.now() / 1000);
  let secret: string;
  try {
    secret = decryptAtRest(endpoint.secret);
  } catch (err) {
    console.error("[webhooks] could not decrypt endpoint secret:", err);
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "pending",
        lastError: "Could not read the signing secret on our side.",
        nextAttemptAt: new Date(Date.now() + 30 * 60_000),
      },
    });
    return { sent: false, reason: "busy" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Codepad-Webhooks/1.0",
    [SIGNATURE_HEADER]: signatureHeader(secret, ts, body),
    [TIMESTAMP_HEADER]: String(ts),
    [EVENT_ID_HEADER]: delivery.eventId,
    [EVENT_HEADER]: delivery.event,
    [DELIVERY_ID_HEADER]: delivery.id,
  };

  // Re-check where the host points now, not only when it was saved.
  const target: SSRFCheckResult = await validateOutboundUrl(endpoint.url).catch(() => ({
    ok: false as const,
    reason: "Could not check the URL.",
  }));
  const result = target.ok
    ? await postOnce(endpoint.url, headers, body)
    : { code: null, error: `Not sent: ${target.reason}` };
  const ok = result.code !== null && isSuccessStatus(result.code);
  const attemptsMade = delivery.attempts + 1;

  const plan = planAfterAttempt({
    ok,
    attemptsMade,
    failureCount: endpoint.failureCount,
    isTest,
    now: new Date(),
  });

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      status: plan.status,
      attempts: attemptsMade,
      responseCode: result.code,
      lastError: ok ? null : result.error,
      nextAttemptAt: plan.nextAttemptAt,
      ...(ok ? { deliveredAt: new Date() } : {}),
    },
  });

  if (ok) {
    await prisma.webhookEndpoint.update({ where: { id: endpoint.id }, data: { failureCount: 0 } });
  } else if (!isTest) {
    const updated = await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { failureCount: { increment: 1 } },
      select: { failureCount: true },
    });
    // The atomic increment is the source of truth for the streak, since
    // other deliveries to this endpoint may have run in parallel.
    if (shouldAutoPause(updated.failureCount)) {
      await autoPause(endpoint.id, endpoint.workspaceId, endpoint.url, updated.failureCount, result.error);
    }
  }

  return { sent: true, ok, responseCode: result.code, error: ok ? null : result.error };
}

async function autoPause(endpointId: string, workspaceId: string, url: string, failures: number, lastError: string | null) {
  // Guarded so only the attempt that crosses the line writes the audit row.
  const paused = await prisma.webhookEndpoint.updateMany({
    where: { id: endpointId, active: true },
    data: { active: false, pausedAt: new Date(), pausedReason: "failures" },
  });
  if (paused.count === 0) return;
  await writeWorkspaceAuditEntry({
    workspaceId,
    actorUserId: null,
    actorEmail: null,
    action: WORKSPACE_AUDIT_ACTIONS.WEBHOOK_ENDPOINT_AUTO_PAUSED,
    targetType: "webhookEndpoint",
    targetId: endpointId,
    meta: { url, consecutiveFailures: failures, lastError },
  });
}

/**
 * Cron entry: send every due delivery on an active endpoint, oldest first.
 * Bounded per run; the next run picks up the rest.
 */
export async function drainDueDeliveries(limit = 100): Promise<{ picked: number; ok: number; failed: number; skipped: number }> {
  const now = new Date();
  const due = await prisma.webhookDelivery.findMany({
    where: { ...claimableWhere(now, false), endpoint: { active: true } },
    orderBy: { nextAttemptAt: "asc" },
    select: { id: true },
    take: limit,
  });
  let ok = 0;
  let failed = 0;
  let skipped = 0;
  // Small parallelism: one slow receiver should not stall the whole run.
  const queue = due.map((d) => d.id);
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      try {
        const r = await deliverWebhook(id);
        if (!r.sent) skipped++;
        else if (r.ok) ok++;
        else failed++;
      } catch (err) {
        failed++;
        console.error(`[webhooks] delivery ${id} crashed:`, err);
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return { picked: due.length, ok, failed, skipped };
}
