/**
 * Server side of the Greenhouse Assessment Partner endpoints: finds the
 * workspace from the Basic auth key and answers each call. The route handler
 * is a thin wrapper around `handlePartnerCall`, which tests call directly.
 */
import { prisma } from "@/lib/prisma";
import { growthToolsEnabled } from "@/lib/billing/trial";
import {
  GREENHOUSE,
  candidateDisplayName,
  hashPartnerKey,
  parseSendTest,
  partnerKeyFromAuthHeader,
  testName,
} from "./greenhouse";
import { importAtsCandidate } from "./import";
import { logSyncEvent } from "./sync-log";
import { loadRequestState } from "./writeback";
import { screeningTitles } from "./screenings";

export type PartnerResponse = { status: number; body: unknown };

const err = (status: number, ...errors: string[]): PartnerResponse => ({ status, body: { errors } });

export const PARTNER_ACTIONS = ["list_tests", "send_test", "test_status", "request_errors"] as const;
export type PartnerAction = (typeof PARTNER_ACTIONS)[number];

const METHOD: Record<PartnerAction, "GET" | "POST"> = {
  list_tests: "GET",
  send_test: "POST",
  test_status: "GET",
  request_errors: "POST",
};

async function workspaceForKey(authHeader: string | null) {
  const key = partnerKeyFromAuthHeader(authHeader);
  if (!key) return null;
  const integration = await prisma.atsIntegration.findUnique({
    where: { partnerKeyHash: hashPartnerKey(key) },
    select: {
      provider: true,
      workspace: { select: { id: true, slug: true, planName: true, trialEndsAt: true, stripeSubscriptionId: true } },
    },
  });
  if (!integration || integration.provider !== GREENHOUSE) return null;
  return integration.workspace;
}

export async function handlePartnerCall(
  action: string,
  req: { method: string; authorization: string | null; query: URLSearchParams; body: unknown },
): Promise<PartnerResponse> {
  if (!(PARTNER_ACTIONS as readonly string[]).includes(action)) return err(404, "Unknown endpoint");
  if (req.method !== METHOD[action as PartnerAction]) return err(405, `Use ${METHOD[action as PartnerAction]} for ${action}`);
  const ws = await workspaceForKey(req.authorization);
  if (!ws) return err(401, "Invalid API key");
  if (!growthToolsEnabled(ws)) return err(403, "This Codepad workspace plan does not include ATS integrations.");

  switch (action as PartnerAction) {
    case "list_tests": {
      const mappings = await prisma.atsJobMapping.findMany({
        where: { workspaceId: ws.id, provider: GREENHOUSE, screeningKind: { in: ["ai", "takehome"] }, screeningId: { not: null } },
        orderBy: { jobName: "asc" },
      });
      const titles = await screeningTitles(ws.id, mappings);
      return {
        status: 200,
        body: mappings
          .filter((m) => titles.has(m.id))
          .map((m) => ({ partner_test_id: m.id, partner_test_name: testName(m.jobName, titles.get(m.id)!) })),
      };
    }

    case "send_test": {
      const parsed = parseSendTest(req.body);
      if (!parsed.ok) {
        await logSyncEvent({ workspaceId: ws.id, provider: GREENHOUSE, direction: "in", status: "failed", summary: "Greenhouse sent a test request we could not read", detail: parsed.errors.join("; ") });
        return err(400, ...parsed.errors);
      }
      const v = parsed.value;
      const mapping = await prisma.atsJobMapping.findFirst({ where: { id: v.partnerTestId, workspaceId: ws.id, provider: GREENHOUSE } });
      const name = candidateDisplayName(v.candidate);
      if (!mapping || mapping.screeningKind === "none" || !mapping.screeningId) {
        await logSyncEvent({
          workspaceId: ws.id,
          provider: GREENHOUSE,
          direction: "in",
          status: "failed",
          summary: `${name} was not imported: the test is no longer mapped to a screening`,
          detail: "Pick a screening for this job in the job mapping, then send the test again from Greenhouse.",
        });
        return err(404, "Unknown partner_test_id");
      }
      const outcome = await importAtsCandidate({
        workspaceId: ws.id,
        provider: GREENHOUSE,
        mapping,
        person: { name, email: v.candidate.email, phone: v.candidate.phone, externalId: v.candidate.id, profileUrl: v.candidate.profileUrl },
        applicationId: v.applicationId,
        callbackUrl: v.callbackUrl,
      });
      return { status: 200, body: { partner_interview_id: outcome.requestId } };
    }

    case "test_status": {
      const id = req.query.get("partner_interview_id")?.trim();
      if (!id) return err(400, "partner_interview_id is required");
      const state = await loadRequestState(id, ws.id);
      if (!state || state.request.provider !== GREENHOUSE) return err(404, "Unknown partner_interview_id");
      return { status: 200, body: state.status };
    }

    case "request_errors": {
      const b = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
      const errors = Array.isArray(b.errors) ? b.errors.filter((e): e is string => typeof e === "string") : [];
      const call = typeof b.api_call === "string" ? b.api_call : "a call";
      const who = typeof b.candidate_email === "string" ? ` for ${b.candidate_email}` : "";
      await logSyncEvent({
        workspaceId: ws.id,
        provider: GREENHOUSE,
        direction: "in",
        status: "failed",
        summary: `Greenhouse could not use our answer to ${call}${who}`,
        detail: errors.join("; ") || null,
        requestId: typeof b.partner_interview_id === "string" ? b.partner_interview_id : null,
      });
      return { status: 200, body: {} };
    }
  }
}
