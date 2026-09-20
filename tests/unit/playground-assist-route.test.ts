import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/playground/assist/route";

const { mockAuth, mockCallTogether, mockTogetherApiKey, mockAssistSettings } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockCallTogether: vi.fn(),
    mockTogetherApiKey: vi.fn(),
    mockAssistSettings: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/settings", () => ({
  getPlaygroundAssistSettings: mockAssistSettings,
}));

vi.mock("@/lib/ai-interview/together", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/ai-interview/together")>();
  return {
    ...mod,
    callTogether: mockCallTogether,
    togetherApiKey: mockTogetherApiKey,
  };
});

let userCounter = 0;
function authedUser() {
  userCounter += 1;
  return { user: { id: `assist-user-${userCounter}` } };
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/playground/assist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

const BASE_BODY = {
  message: "Why does this loop run twice?",
  history: [],
  fileName: "/App.js",
  code: "for (let i = 0; i < 2; i++) {}",
  contextLabel: "Loop playground",
};

beforeEach(() => {
  mockCallTogether.mockReset();
  mockTogetherApiKey.mockReset();
  mockTogetherApiKey.mockReturnValue("test-key");
  mockAssistSettings.mockReset();
  mockAssistSettings.mockResolvedValue({ enabled: true, dailyLimit: 5 });
  mockCallTogether.mockResolvedValue({
    parts: [{ text: "Because the bound is 2." }],
    finishReason: "stop",
    raw: {},
  });
});

/**
 * Contract for POST /api/playground/assist: login-only, 5/day per user,
 * code-scoped GLM calls. The model client is mocked — these pin the route's
 * auth, quota, validation, and message-shaping behavior.
 */
describe("POST /api/playground/assist", () => {
  it("401s anonymous callers without touching the model", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await post(BASE_BODY);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/sign in/i) });
    expect(mockCallTogether).not.toHaveBeenCalled();
  });

  it("answers logged-in users and reports remaining quota", async () => {
    mockAuth.mockResolvedValueOnce(authedUser());
    const res = await post(BASE_BODY);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      reply: "Because the bound is 2.",
      remaining: 4,
    });
    expect(mockCallTogether).toHaveBeenCalledTimes(1);
    const args = mockCallTogether.mock.calls[0][0];
    expect(args.maxOutputTokens).toBeLessThanOrEqual(1024);
    const roles = args.messages.map((m: { role: string }) => m.role);
    expect(roles[0]).toBe("system");
    expect(roles[roles.length - 1]).toBe("user");
    expect(JSON.stringify(args.messages)).toContain("Why does this loop run twice?");
  });

  it("enforces 5 messages per day per user", async () => {
    // One stable user id so the quota key is stable across calls.
    mockAuth.mockResolvedValue(authedUser());
    for (let i = 0; i < 5; i++) {
      const res = await post({ ...BASE_BODY, message: `q${i}` });
      expect(res.status).toBe(200);
    }
    const limited = await post({ ...BASE_BODY, message: "one too many" });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ remaining: 0 });
    expect(mockCallTogether).toHaveBeenCalledTimes(5);
  });

  it("rejects empty and oversized messages", async () => {
    mockAuth.mockResolvedValue(authedUser());
    expect((await post({ ...BASE_BODY, message: "   " })).status).toBe(400);
    expect(
      (await post({ ...BASE_BODY, message: "x".repeat(2001) })).status,
    ).toBe(400);
    expect(mockCallTogether).not.toHaveBeenCalled();
  });

  it("503s when the server key is missing", async () => {
    mockAuth.mockResolvedValueOnce(authedUser());
    mockTogetherApiKey.mockReturnValueOnce(null);
    const res = await post(BASE_BODY);
    expect(res.status).toBe(503);
    expect(mockCallTogether).not.toHaveBeenCalled();
  });

  it("maps model outages to 502", async () => {
    const { TogetherUnavailableError } =
      await import("@/lib/ai-interview/together");
    mockAuth.mockResolvedValueOnce(authedUser());
    mockCallTogether.mockRejectedValueOnce(
      new TogetherUnavailableError("down"),
    );
    const res = await post(BASE_BODY);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      error: expect.stringMatching(/unavailable/i),
    });
  });

  it("403s when the admin kill switch is off, without touching the model", async () => {
    mockAuth.mockResolvedValueOnce(authedUser());
    mockAssistSettings.mockResolvedValueOnce({ enabled: false, dailyLimit: 5 });
    const res = await post(BASE_BODY);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: expect.stringMatching(/disabled/i),
    });
    expect(mockCallTogether).not.toHaveBeenCalled();
  });

  it("honors the admin-configured daily limit", async () => {
    mockAuth.mockResolvedValueOnce(authedUser());
    mockAssistSettings.mockResolvedValue({ enabled: true, dailyLimit: 10 });
    const res = await post(BASE_BODY);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ remaining: 9, limit: 10 });
  });

  it("exposes the config without auth or quota via GET", async () => {
    const { GET } = await import("@/app/api/playground/assist/route");
    mockAssistSettings.mockResolvedValue({ enabled: true, dailyLimit: 7 });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: true, dailyLimit: 7 });
    expect(mockCallTogether).not.toHaveBeenCalled();
  });
});
