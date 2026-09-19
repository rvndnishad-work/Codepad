import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/execute/route";

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

  it("serves identical reruns from cache, busts on sibling edits", async () => {
    const ip = "10.8.8.8";
    const body = {
      language: "python",
      code: "cache-1",
      files: [{ name: "h.py", content: "v1" }],
    };
    const first = await post(body, ip);
    expect(first.status).toBe(200);
    const second = await post(body, ip);
    expect(await second.json()).toMatchObject({ cacheHit: true });
    expect(runOnPiston).toHaveBeenCalledTimes(1);

    const edited = await post(
      {
        language: "python",
        code: "cache-1",
        files: [{ name: "h.py", content: "v2" }],
      },
      ip,
    );
    expect((await edited.json()).cacheHit).toBeUndefined();
    expect(runOnPiston).toHaveBeenCalledTimes(2);
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

  it("maps executor outages to 503", async () => {    const { PistonUnavailableError } =
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
