import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  delivery: null as null | Record<string, unknown>,
  endpoint: null as null | Record<string, unknown>,
  deliveryUpdates: [] as Record<string, unknown>[],
  audits: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhookDelivery: {
      updateMany: vi.fn(async () => ({ count: db.delivery ? 1 : 0 })),
      count: vi.fn(async () => (db.delivery ? 1 : 0)),
      findUnique: vi.fn(async () => (db.delivery ? { ...db.delivery, endpoint: db.endpoint } : null)),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.deliveryUpdates.push(data);
        return {};
      }),
    },
    webhookEndpoint: {
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const ep = db.endpoint!;
        const fc = data.failureCount as number | { increment: number };
        ep.failureCount = typeof fc === "number" ? fc : (ep.failureCount as number) + fc.increment;
        return { failureCount: ep.failureCount };
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { active?: boolean }; data: Record<string, unknown> }) => {
        const ep = db.endpoint!;
        if (where.active !== undefined && ep.active !== where.active) return { count: 0 };
        Object.assign(ep, data);
        return { count: 1 };
      }),
    },
  },
}));
vi.mock("@/lib/workspace-audit", () => ({
  WORKSPACE_AUDIT_ACTIONS: { WEBHOOK_ENDPOINT_AUTO_PAUSED: "WEBHOOK_ENDPOINT_AUTO_PAUSED" },
  writeWorkspaceAuditEntry: vi.fn(async (e: Record<string, unknown>) => {
    db.audits.push(e);
  }),
}));
vi.mock("@/lib/mcp/outbound", () => ({ validateOutboundUrl: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/crypto/at-rest", () => ({ decryptAtRest: (s: string) => s }));

import { deliverWebhook } from "@/lib/events/deliver";
import { verifySignature } from "@/lib/events/signing";

function setup(opts: { failureCount?: number; attempts?: number; event?: string } = {}) {
  db.endpoint = {
    id: "ep1",
    workspaceId: "ws1",
    url: "https://hooks.example.com/in",
    secret: "whsec_abc",
    active: true,
    failureCount: opts.failureCount ?? 0,
  };
  db.delivery = {
    id: "del1",
    endpointId: "ep1",
    eventId: "evt_1",
    event: opts.event ?? "candidate.decided",
    payload: { id: "evt_1", event: "candidate.decided", data: {} },
    attempts: opts.attempts ?? 0,
  };
  db.deliveryUpdates = [];
  db.audits = [];
}

describe("deliverWebhook", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("POSTs a signed body and records success", async () => {
    setup({ failureCount: 3 });
    const seen: { headers: Record<string, string>; body: string }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { headers: Record<string, string>; body: string }) => {
        seen.push({ headers: init.headers, body: init.body });
        return new Response("ok", { status: 200 });
      }),
    );
    const r = await deliverWebhook("del1");
    expect(r).toEqual({ sent: true, ok: true, responseCode: 200, error: null });
    const { headers, body } = seen[0];
    expect(headers["X-Codepad-Event-Id"]).toBe("evt_1");
    expect(headers["X-Codepad-Event"]).toBe("candidate.decided");
    expect(verifySignature("whsec_abc", headers["X-Codepad-Signature"], body)).toBe(true);
    expect(db.deliveryUpdates.at(-1)).toMatchObject({ status: "succeeded", attempts: 1, responseCode: 200 });
    expect(db.endpoint!.failureCount).toBe(0);
  });

  it("schedules a retry on failure", async () => {
    setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("gone", { status: 410 })));
    const r = await deliverWebhook("del1");
    expect(r).toMatchObject({ sent: true, ok: false, responseCode: 410 });
    const last = db.deliveryUpdates.at(-1)!;
    expect(last.status).toBe("pending");
    expect(last.lastError).toBe("HTTP 410: gone");
    expect(db.endpoint!.failureCount).toBe(1);
    expect(db.audits).toHaveLength(0);
  });

  it("pauses the endpoint and writes one audit entry on the tenth failure in a row", async () => {
    setup({ failureCount: 9, attempts: 5 });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await deliverWebhook("del1");
    expect(db.deliveryUpdates.at(-1)).toMatchObject({ status: "failed", attempts: 6, nextAttemptAt: null });
    expect(db.endpoint).toMatchObject({ active: false, pausedReason: "failures", failureCount: 10 });
    expect(db.audits).toHaveLength(1);
    expect(db.audits[0]).toMatchObject({ action: "WEBHOOK_ENDPOINT_AUTO_PAUSED", targetId: "ep1", workspaceId: "ws1" });
  });

  it("does not count a failed test ping toward a pause", async () => {
    setup({ failureCount: 9, event: "webhook.test" });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("connect ECONNREFUSED"); }));
    const r = await deliverWebhook("del1", { force: true });
    expect(r).toMatchObject({ sent: true, ok: false, responseCode: null, error: "connect ECONNREFUSED" });
    expect(db.endpoint).toMatchObject({ active: true, failureCount: 9 });
    expect(db.deliveryUpdates.at(-1)).toMatchObject({ status: "failed" });
  });
});
