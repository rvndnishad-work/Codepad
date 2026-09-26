/**
 * The workspace event bus. Server only.
 *
 * emitWorkspaceEvent() queues one WebhookDelivery per active endpoint that
 * subscribes to the event, then tries to send them right after the current
 * response. The cron at /api/cron/webhook-deliveries retries anything that
 * did not go out. It never throws: a webhook problem must never break the
 * screening, submission or decision that caused it.
 *
 * Envelope sent to receivers:
 *   { id: "evt_...", event, createdAt, workspace: { id, slug, name }, data }
 * `data.reportPath` (relative to /w/<slug>/) is turned into an absolute
 * `data.reportUrl`.
 */
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { appOrigin } from "@/lib/interview/links";
import { TEST_EVENT, type WorkspaceEvent } from "./catalog";
import { deliverWebhook } from "./deliver";
import { buildEnvelope, newEventId } from "./envelope";

export type EventCandidate = { id?: string | null; name?: string | null; email?: string | null };

export type EventPayloads = {
  "screening.completed": {
    candidate: EventCandidate;
    screening: { id: string; positionTitle?: string | null; batchId?: string | null; score: number | null; completedAt: string };
    reportPath?: string;
  };
  "takehome.submitted": {
    candidate: EventCandidate;
    takeHome: { id: string; title?: string | null; score?: number | null; submittedAt: string };
    reportPath?: string;
  };
  "interview.completed": {
    candidate: EventCandidate;
    interview: { id: string; title?: string | null; type?: string | null; verdict?: string | null; completedAt: string };
    reportPath?: string;
  };
  "candidate.decided": {
    candidate: EventCandidate;
    decision: "passed" | "not_passed";
    previousStage?: string | null;
    rejectReason?: string | null;
    /** Set when a recruiter passed someone over failing results. */
    manualOverride?: string | null;
    decidedBy?: { email: string | null; via?: string } | null;
    reportPath?: string;
  };
  "invite.bounced": {
    email: { template: string; recipient: string; reason?: string | null };
    sessionId?: string | null;
  };
};

/** Send the given deliveries after the response, or now outside a request. */
export function deliverSoon(ids: string[]): void {
  if (!ids.length) return;
  const run = async () => {
    for (const id of ids) {
      await deliverWebhook(id).catch((err) => console.error(`[webhooks] immediate send ${id} failed:`, err));
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Fill a linked candidate's name and email when the caller only had the id. */
async function withCandidateDetails(workspaceId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const c = data.candidate as EventCandidate | undefined;
  if (!c?.id || (c.email && c.name)) return data;
  const row = await prisma.candidate
    .findFirst({ where: { id: c.id, workspaceId }, select: { name: true, email: true } })
    .catch(() => null);
  if (!row) return data;
  return { ...data, candidate: { ...c, name: c.name || row.name, email: c.email || row.email } };
}

export async function emitWorkspaceEvent<E extends WorkspaceEvent>(
  workspaceId: string | null | undefined,
  event: E,
  data: EventPayloads[E],
): Promise<void> {
  if (!workspaceId) return;
  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, slug: true, name: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true },
    });
    if (!ws || !growthToolsEnabled(ws)) return;

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { workspaceId, active: true, events: { has: event } },
      select: { id: true },
    });
    if (!endpoints.length) return;

    const eventId = newEventId();
    const enriched = await withCandidateDetails(workspaceId, data as Record<string, unknown>);
    const payload = buildEnvelope(eventId, event, ws, enriched, await appOrigin());
    const rows = await prisma.webhookDelivery.createManyAndReturn({
      data: endpoints.map((e) => ({
        endpointId: e.id,
        eventId,
        event,
        payload: payload as Prisma.InputJsonValue,
        status: "pending",
        nextAttemptAt: new Date(),
      })),
      select: { id: true },
    });
    deliverSoon(rows.map((r) => r.id));
  } catch (err) {
    console.error(`[webhooks] emit ${event} failed:`, err);
  }
}

/** Queue a one-off test ping to one endpoint. Returns the delivery id. */
export async function queueTestDelivery(
  endpointId: string,
  workspace: { id: string; slug: string; name: string },
): Promise<string> {
  const eventId = newEventId();
  const payload = buildEnvelope(
    eventId,
    TEST_EVENT,
    workspace,
    { message: "This is a test event from Codepad. Your endpoint is reachable." },
    await appOrigin(),
  );
  const row = await prisma.webhookDelivery.create({
    data: { endpointId, eventId, event: TEST_EVENT, payload: payload as Prisma.InputJsonValue, status: "pending" },
    select: { id: true },
  });
  return row.id;
}
