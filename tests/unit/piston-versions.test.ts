// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runOnPiston } from "@/lib/piston";

/**
 * Contract for Piston runtime version resolution: highest-installed by
 * default, explicit PISTON_VERSIONS_JSON pins win when installed, graceful
 * fallback (never failure) when a pin is missing, loud error on malformed
 * config. Runs are reproducible across Piston upgrades only if pinned.
 */
const RUNTIMES = [
  { language: "python", version: "3.12.0", aliases: [] },
  { language: "python", version: "3.10.0", aliases: [] },
  { language: "javascript", version: "20.11.1", aliases: ["node"] },
];

let executeBody: Record<string, unknown> | null = null;

function stubPiston() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/api/v2/runtimes")) {
        return { ok: true, json: async () => RUNTIMES } as Response;
      }
      executeBody = JSON.parse(init?.body as string) as Record<string, unknown>;
      return {
        ok: true,
        json: async () => ({
          run: { stdout: "hi", stderr: "", code: 0, signal: null },
        }),
      } as Response;
    }),
  );
}

const OLD_ENV = process.env.PISTON_VERSIONS_JSON;

beforeEach(() => {
  stubPiston();
  executeBody = null;
  delete process.env.PISTON_VERSIONS_JSON;
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (OLD_ENV === undefined) delete process.env.PISTON_VERSIONS_JSON;
  else process.env.PISTON_VERSIONS_JSON = OLD_ENV;
});

describe("piston version pins", () => {
  it("picks the highest installed version by default", async () => {
    const r = await runOnPiston("python", "print(1)", "");
    expect(r.version).toBe("3.12.0");
    expect(executeBody?.version).toBe("3.12.0");
  });

  it("honours an explicit pin when installed", async () => {
    process.env.PISTON_VERSIONS_JSON = JSON.stringify({ python: "3.10.0" });
    const r = await runOnPiston("python", "print(1)", "");
    expect(r.version).toBe("3.10.0");
    expect(executeBody?.version).toBe("3.10.0");
  });

  it("accepts our language ids as pin keys (node, not just javascript)", async () => {
    process.env.PISTON_VERSIONS_JSON = JSON.stringify({ node: "20.11.1" });
    const r = await runOnPiston("node", "console.log(1)", "");
    expect(r.version).toBe("20.11.1");
  });

  it("falls back with a warning when the pin is not installed", async () => {
    process.env.PISTON_VERSIONS_JSON = JSON.stringify({ python: "9.9.9" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const r = await runOnPiston("python", "print(1)", "");
      expect(r.version).toBe("3.12.0");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("9.9.9"));
    } finally {
      warn.mockRestore();
    }
  });

  it("throws loudly on malformed pin config", async () => {
    process.env.PISTON_VERSIONS_JSON = "{nope";
    await expect(runOnPiston("python", "print(1)", "")).rejects.toThrow(
      /PISTON_VERSIONS_JSON is not valid JSON/,
    );
  });
});
