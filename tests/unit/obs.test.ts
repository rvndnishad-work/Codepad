import { describe, expect, it, vi } from "vitest";
import { logEvent, runOutcome } from "@/lib/obs";

// Capture exactly what logEvent sends to console.info, then restore.
function captureLine(fn: () => void): string {
  const lines: string[] = [];
  const spy = vi.spyOn(console, "info").mockImplementation((msg?: unknown) => {
    lines.push(String(msg));
  });
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  expect(lines).toHaveLength(1);
  return lines[0];
}

describe("logEvent", () => {
  it("emits a single parseable JSON line with event, ts, and fields", () => {
    const line = captureLine(() =>
      logEvent("execute", { language: "python", ms: 5, cacheHit: false, outcome: "ok" }),
    );
    expect(line).not.toContain("\n");
    const parsed = JSON.parse(line);
    expect(parsed.event).toBe("execute");
    expect(typeof parsed.ts).toBe("string");
    expect(Number.isNaN(Date.parse(parsed.ts))).toBe(false);
    expect(parsed.language).toBe("python");
    expect(parsed.ms).toBe(5);
    expect(parsed.cacheHit).toBe(false);
    expect(parsed.outcome).toBe("ok");
  });

  it("drops undefined fields", () => {
    const line = captureLine(() =>
      logEvent("execute", { language: "python", ms: undefined, outcome: "ok" }),
    );
    const parsed = JSON.parse(line);
    expect("ms" in parsed).toBe(false);
    expect(parsed.language).toBe("python");
    expect(parsed.outcome).toBe("ok");
  });

  it("does not propagate when console.info throws", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {
      throw new Error("boom");
    });
    try {
      expect(() => logEvent("execute", { outcome: "ok" })).not.toThrow();
    } finally {
      spy.mockRestore();
    }
    // console.info is usable again after restore.
    const line = captureLine(() => logEvent("execute", { outcome: "ok" }));
    expect(JSON.parse(line).event).toBe("execute");
  });

  it("emits exactly the given keys, never payload contents", () => {
    const code = "print('super-secret-payload-xyz')";
    const line = captureLine(() =>
      logEvent("execute", { language: "python", files: 1, outcome: "ok" }),
    );
    const parsed = JSON.parse(line);
    expect(Object.keys(parsed).sort()).toEqual(["event", "files", "language", "outcome", "ts"]);
    expect(line).not.toContain(code);
  });
});

describe("runOutcome", () => {
  it("maps all four cases", () => {
    expect(runOutcome({ compileError: true, exitCode: 1 })).toBe("compile-error");
    expect(runOutcome({ signal: "SIGKILL", exitCode: 137 })).toBe("signal");
    expect(runOutcome({ exitCode: 1 })).toBe("runtime-error");
    expect(runOutcome({ exitCode: 0, signal: null })).toBe("ok");
  });

  it("prefers compile-error over signal over exit code", () => {
    expect(runOutcome({ compileError: true, signal: "SIGKILL", exitCode: 1 })).toBe(
      "compile-error",
    );
    expect(runOutcome({ signal: "SIGTERM", exitCode: 1 })).toBe("signal");
  });
});
