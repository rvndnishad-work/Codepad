/**
 * The interview wizard reports, per person, whether their invite went out.
 * That comes from sendTemplatedBatch's outcomes, so pin them against a fake
 * Resend: sent, provider errors, suppressed addresses, and no key at all.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  emailSuppression: { findMany: vi.fn(async () => [] as { address: string }[]) },
  emailLog: {
    create: vi.fn(async () => ({ id: "log" })),
    update: vi.fn(async () => ({})),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));

import { sendTemplatedBatch } from "@/lib/email";

const invite = (to: string) => ({
  to,
  props: { candidateName: "Priya", workspaceName: "Acme", title: "Coding interview", joinUrl: "https://example.com/interview/1?token=t", shortCode: "1234", scheduledAt: null, durationMin: 60 },
});

describe("sendTemplatedBatch outcomes", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    db.emailSuppression.findMany.mockResolvedValue([]);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends everyone in one request and reports each as sent", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "a" }, { id: "b" }] }), { status: 200 }));
    const res = await sendTemplatedBatch("interview-invite", [invite("a@x.io"), invite("b@x.io")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails/batch");
    const body = JSON.parse(init.body);
    expect(body.map((m: { to: string[] }) => m.to[0])).toEqual(["a@x.io", "b@x.io"]);
    expect(body[0].html).toContain("https://example.com/interview/1?token=t");
    expect(res.outcomes).toEqual([
      { status: "sent", provider: "resend" },
      { status: "sent", provider: "resend" },
    ]);
  });

  it("reports a provider error for every email in the request", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    fetchMock.mockResolvedValue(new Response("rate limit exceeded", { status: 429 }));
    const res = await sendTemplatedBatch("interview-invite", [invite("a@x.io")]);
    expect(res.failed).toBe(1);
    expect(res.outcomes?.[0]).toEqual({ status: "failed", reason: "Resend 429: rate limit exceeded" });
  });

  it("skips suppressed addresses and keeps the order", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    db.emailSuppression.findMany.mockResolvedValue([{ address: "bad@x.io" }]);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "a" }] }), { status: 200 }));
    const res = await sendTemplatedBatch("interview-invite", [invite("bad@x.io"), invite("ok@x.io")]);
    expect(res.outcomes?.[0].status).toBe("suppressed");
    expect(res.outcomes?.[1]).toEqual({ status: "sent", provider: "resend" });
  });

  it("without a key nothing leaves the server, and says so", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await sendTemplatedBatch("interview-invite", [invite("a@x.io")]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.outcomes).toEqual([{ status: "sent", provider: "console" }]);
    log.mockRestore();
  });
});
