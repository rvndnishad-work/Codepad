import { prisma } from "@/lib/prisma";
import { decryptAtRest } from "@/lib/crypto/at-rest";
import { NextResponse } from "next/server";
import { growthToolsEnabled } from "@/lib/billing/trial";
import { importAtsCandidate, providerName } from "@/lib/ats/import";
import { parseLegacyPayload, pickMapping } from "@/lib/ats/legacy-webhook";
import { logSyncEvent } from "@/lib/ats/sync-log";
import * as crypto from "crypto";

/**
 * Older signed ATS webhook (Greenhouse, Ashby, Lever or generic JSON).
 *
 * This used to create a legacy TakeHomeAssignment with no Candidate and no
 * email, falling back to a sample challenge. It now feeds the same import as
 * the Greenhouse partner API: the candidate is found or created by email,
 * added to the batch for the job, and sent the screening the job is mapped
 * to, by email. A payload that names no mapped job is refused.
 */

/**
 * Verify an inbound webhook signature: hex HMAC-SHA256 of the raw body keyed
 * by the workspace's configured secret. Accepts an optional "sha256=" prefix
 * (GitHub/Greenhouse idiom). Constant-time compare.
 */
function verifyWebhookSignature(rawBody: string, header: string, secret: string): boolean {
  const provided = header.replace(/^sha256=/i, "").trim();
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(provided.toLowerCase(), "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: rawProvider } = await params;
    const provider = rawProvider.toLowerCase();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId parameter" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true, atsIntegration: true },
    });

    // Only a workspace that connected this ATS accepts its webhooks. Without
    // this check anyone who learned a workspace id could create invites in it.
    const integration = workspace?.atsIntegration;
    if (!workspace || !integration || integration.provider.toLowerCase() !== provider) {
      return NextResponse.json({ error: "No matching ATS integration" }, { status: 404 });
    }

    // Read the raw body first — HMAC verification must run over the exact
    // bytes that were signed, not a re-serialized object.
    const rawBody = await req.text();

    // Every inbound payload must carry a valid HMAC-SHA256 of the body. An
    // integration saved without a signing secret cannot receive webhooks.
    const secret = integration.webhookSecret ? decryptAtRest(integration.webhookSecret) : null;
    if (!secret) {
      return NextResponse.json({ error: "Set a webhook signing secret on the ATS sync page first" }, { status: 401 });
    }
    const signature = req.headers.get("x-signature") || "";
    if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Unauthorized webhook payload" }, { status: 401 });
    }

    if (!growthToolsEnabled(workspace)) {
      return NextResponse.json({ error: "This workspace plan does not include ATS integrations" }, { status: 403 });
    }

    let body: unknown = null;
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = null;
    }
    if (!body) {
      return NextResponse.json({ error: "Empty payload body" }, { status: 400 });
    }

    const payload = parseLegacyPayload(provider, body);
    if (!payload) {
      await logSyncEvent({ workspaceId: workspace.id, provider, direction: "in", status: "failed", summary: `${providerName(provider)} sent a candidate without a valid email` });
      return NextResponse.json({ error: "Could not parse candidate email" }, { status: 400 });
    }

    const mappings = await prisma.atsJobMapping.findMany({
      where: { workspaceId: workspace.id, provider, screeningKind: { in: ["ai", "takehome"] }, screeningId: { not: null } },
    });
    const mapping = pickMapping(payload, mappings);
    if (!mapping) {
      await logSyncEvent({
        workspaceId: workspace.id,
        provider,
        direction: "in",
        status: "failed",
        summary: `${payload.name} was not imported: ${payload.jobName ? `the job ${payload.jobName} is not mapped to a screening` : "the request named no job"}`,
        detail: "Map the job to a screening in Connections, then send the candidate again.",
      });
      return NextResponse.json(
        { error: "No job mapping matches this payload. Send partner_test_id or a job name that is mapped in Connections." },
        { status: 422 },
      );
    }

    const outcome = await importAtsCandidate({
      workspaceId: workspace.id,
      provider,
      mapping,
      person: { name: payload.name, email: payload.email, externalId: payload.externalId },
      applicationId: payload.applicationId,
      callbackUrl: null,
    });

    return NextResponse.json({
      ok: true,
      provider,
      candidateId: outcome.candidateId,
      requestId: outcome.requestId,
      outcome: outcome.kind,
      status: outcome.waiting ? "waiting_for_recruiter" : outcome.sent ? "invite_sent" : "invite_failed",
      ...(outcome.error ? { error: outcome.error } : {}),
    });
  } catch (err) {
    console.error("ATS webhook ingestion failed:", err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
