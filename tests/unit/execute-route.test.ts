import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/execute/route";
import { auth } from "@/lib/auth";

const { runOnPiston } = vi.hoisted(() => ({
  runOnPiston: vi.fn(),
}));

vi.mock("@/lib/piston", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/lib/piston")>();
  return { ...mod, runOnPiston };
});

// The route only needs "no session" here; keep next-auth out of unit tests.
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
}));

const FAKE_RESULT = {
  stdout: "hi",
  stderr: "",
  exitCode: 0,
  timeMs: 5,
  version: "3.12.0",
  signal: null,
};

let ipCounter = 0;
function post(body: unknown, ip?: string) {
  if (!ip) {
    ipCounter += 1;
    ip = `10.9.9.${ipCounter}`;
  }
  return POST(
    new Request("http://localhost/api/execute", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  runOnPiston.mockReset();
  runOnPiston.mockResolvedValue({ ...FAKE_RESULT });
});

/**
 * Contract for POST /api/execute with multi-file payloads. Piston itself is
 * mocked — these pin the route's validation, cache-key and forwarding
 * behavior, which is exactly what broke silently before (siblings ignored).
 */
describe("POST /api/execute files", () => {
  it("forwards extra files to Piston", async () => {
    const res = await post({
      language: "python",
      code: "fwd-1",
      files: [{ name: "helpers.py", content: "X = 1" }],
    });
    expect(res.status).toBe(200);
    expect(runOnPiston).toHaveBeenCalledTimes(1);
    expect(runOnPiston).toHaveBeenCalledWith(
      "python",
      "fwd-1",
      "",
      [{ name: "helpers.py", content: "X = 1" }],
    );
    expect(await res.json()).toMatchObject({ stdout: "hi" });
  });

  it("stays backward compatible without files", async () => {
    const res = await post({ language: "python", code: "compat-1" });
    expect(res.status).toBe(200);
    expect(runOnPiston).toHaveBeenCalledWith("python", "compat-1", "", []);
  });

  it("runs identical explicit reruns again instead of replaying them", async () => {
    // Programs that print random numbers or the time must not repeat
    // their last output when Run is pressed again.
    const ip = "10.8.8.8";
    const body = { language: "python", code: "rerun-1" };
    expect((await post(body, ip)).status).toBe(200);
    const second = await post(body, ip);
    expect((await second.json()).cacheHit).toBeUndefined();
    expect(runOnPiston).toHaveBeenCalledTimes(2);
  });

  it("serves a speculative warm-up once, keyed on siblings", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "spec-user" } } as never);
    try {
      const body = {
        language: "python",
        code: "warm-1",
        files: [{ name: "h.py", content: "v1" }],
      };
      const warm = await post({ ...body, speculative: true });
      expect(await warm.json()).toMatchObject({ speculativeActive: true });
      await vi.waitFor(() => expect(runOnPiston).toHaveBeenCalledTimes(1));
      // Let the background task store its result.
      await new Promise((r) => setTimeout(r, 0));

      // Editing a sibling changes the key: no warm-up to serve.
      const edited = await post({ ...body, files: [{ name: "h.py", content: "v2" }] });
      expect((await edited.json()).cacheHit).toBeUndefined();
      expect(runOnPiston).toHaveBeenCalledTimes(2);

      // The matching run takes the warm-up without touching Piston...
      const hit = await post(body);
      expect(await hit.json()).toMatchObject({ cacheHit: true, stdout: "hi" });
      expect(runOnPiston).toHaveBeenCalledTimes(2);

      // ...and only once: the next Run executes for real.
      const again = await post(body);
      expect((await again.json()).cacheHit).toBeUndefined();
      expect(runOnPiston).toHaveBeenCalledTimes(3);
    } finally {
      vi.mocked(auth).mockResolvedValue(null as never);
    }
  });

  it("declines speculative warm-ups for guests", async () => {
    const res = await post({ language: "python", code: "guest-warm", speculative: true });
    expect(await res.json()).toMatchObject({ speculativeActive: false });
    expect(runOnPiston).not.toHaveBeenCalled();
  });

  it("rejects traversal and malformed payloads", async () => {
    for (const files of [
      [{ name: "../evil.py", content: "x" }],
      [{ name: "/abs.py", content: "x" }],
      "nope",
      [{ name: "a.py" }],
    ]) {
      const res = await post({ language: "python", code: "rej-1", files });
      expect(res.status).toBe(400);
    }
    expect(runOnPiston).not.toHaveBeenCalled();
  });

  it("rejects oversized file counts and payloads", async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      name: `f${i}.py`,
      content: "x",
    }));
    expect((await post({ language: "python", code: "cap-1", files: many })).status).toBe(413);
    const big = [{ name: "big.py", content: "x".repeat(300 * 1024) }];
    expect((await post({ language: "python", code: "cap-2", files: big })).status).toBe(413);
    expect(runOnPiston).not.toHaveBeenCalled();
  });

  it("maps executor outages to 503", async () => {
    const { PistonUnavailableError } =
      await import("@/lib/piston");
    runOnPiston.mockRejectedValueOnce(new PistonUnavailableError("down"));
    const res = await post({ language: "python", code: "out-1" });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      error: expect.stringMatching(/temporarily unavailable/),
    });
  });

  it("caps runaway output and flags truncation", async () => {
    runOnPiston.mockResolvedValueOnce({
      ...FAKE_RESULT,
      stdout: "x".repeat(300 * 1024),
    });
    const res = await post({ language: "python", code: "flood-1" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.truncated).toBe(true);
    expect(
      new TextEncoder().encode(body.stdout).length,
    ).toBeLessThanOrEqual(256 * 1024);
  });
});
