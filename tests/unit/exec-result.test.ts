import { describe, expect, it } from "vitest";
import { describeExecution, formatRunMeta } from "@/lib/exec-result";

/**
 * Contract for backend Run output (`/api/execute` → console lines).
 * Every branch must yield a human-readable line — never a blank console
 * after a Run, which reads as "the playground is broken".
 */
describe("describeExecution", () => {
  it("explains transport failures", () => {
    expect(describeExecution(429, { error: "slow down" })).toEqual([
      { method: "error", text: "slow down" },
    ]);
    expect(describeExecution(429, null)[0].method).toBe("error");
    expect(describeExecution(503, null)[0].text).toMatch(/unavailable/);
    expect(describeExecution(413, null)[0].text).toMatch(/too large/);
    expect(describeExecution(500, null)).toEqual([
      { method: "error", text: "Execution failed (HTTP 500)." },
    ]);
  });

  it("reports compilation failures without claiming a run", () => {
    const lines = describeExecution(200, {
      compileError: true,
      stderr: "syntax error",
    });
    expect(lines[0].text).toMatch(/Compilation failed/);
    expect(lines[1]).toEqual({ method: "error", text: "syntax error" });
  });

  it("explains signal kills, keeping prior stdout", () => {
    const lines = describeExecution(200, { stdout: "partial", signal: "SIGKILL" });
    expect(lines).toEqual([
      { method: "log", text: "partial" },
      { method: "error", text: expect.stringMatching(/time or memory/) },
    ]);
    expect(describeExecution(200, { signal: "SIGTERM" })[0].text).toMatch(
      /SIGTERM/,
    );
  });

  it("renders clean and failing exits", () => {    expect(describeExecution(200, { exitCode: 0, stdout: "hi" })).toEqual([
      { method: "log", text: "hi" },
    ]);
    expect(
      describeExecution(200, { exitCode: 0, stdout: "", stderr: "warn" }),
    ).toEqual([
      { method: "log", text: expect.stringMatching(/zero output/) },
      { method: "error", text: "warn" },
    ]);
    expect(
      describeExecution(200, { exitCode: 1, stdout: "out", stderr: "boom" }),
    ).toEqual([
      { method: "log", text: "out" },
      { method: "error", text: "boom" },
    ]);
    expect(describeExecution(200, { exitCode: 2 })[0].text).toMatch(
      /exited with code 2/,
    );
  });

  it("appends a truncation notice instead of silently cutting", () => {
    const lines = describeExecution(200, {
      exitCode: 0,
      stdout: "hi",
      truncated: true,
    });
    expect(lines[lines.length - 1]).toEqual({
      method: "info",
      text: expect.stringMatching(/truncated/),
    });
    expect(
      describeExecution(200, { exitCode: 0, stdout: "hi" }).some(
        (l) => l.method === "info",
      ),
    ).toBe(false);
  });
});

describe("formatRunMeta", () => {
  it("formats version, timing and cache provenance", () => {
    expect(
      formatRunMeta({ version: "3.12.0", timeMs: 42, cacheHit: false }),
    ).toBe("3.12.0 · 42ms");
    expect(formatRunMeta({ version: "3.12.0", cacheHit: true })).toBe(
      "3.12.0 · cached",
    );
    expect(formatRunMeta({ version: "3.12.0" })).toBe("3.12.0");
    expect(formatRunMeta(null)).toBeNull();
    expect(formatRunMeta({})).toBeNull();
  });
});
