// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { executeBatch } from "@/lib/judge/run";

const { runOnPiston } = vi.hoisted(() => ({
  runOnPiston: vi.fn(),
}));

vi.mock("@/lib/piston", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/piston")>();
  return { ...mod, runOnPiston };
});

const CONTRACT = {
  functionName: "solve",
  params: [],
  returnType: "int" as const,
};

beforeEach(() => {
  runOnPiston.mockReset();
});

/**
 * Contract for multi-file judging: sibling modules from a workspace
 * submission must reach Piston as extra files behind the assembled entry,
 * so candidate imports resolve inside the graded run.
 */
describe("executeBatch extra files", () => {
  it("forwards siblings behind the assembled entry", async () => {
    runOnPiston.mockResolvedValue({
      stdout: "1\n",
      stderr: "",
      exitCode: 0,
      timeMs: 5,
      version: "3.12.0",
      signal: null,
    });
    const extras = [{ name: "helpers.py", content: "V = 1" }];
    const outcome = await executeBatch(
      "python",
      "def solve():\n    return 1",
      CONTRACT,
      [[]],
      extras,
    );
    expect(runOnPiston).toHaveBeenCalledTimes(1);
    const [lang, program, input, sentExtras] = runOnPiston.mock.calls[0] as [
      string,
      string,
      string,
      unknown,
    ];
    expect(lang).toBe("python");
    expect(program).toContain("def solve()");
    expect(typeof input).toBe("string");
    expect(sentExtras).toEqual(extras);
    expect(outcome.outputs).toHaveLength(1);
  });

  it("works without extras (legacy single-file path)", async () => {
    runOnPiston.mockResolvedValue({
      stdout: "1\n",
      stderr: "",
      exitCode: 0,
      timeMs: 5,
      version: "3.12.0",
      signal: null,
    });
    await executeBatch("python", "def solve():\n    return 1", CONTRACT, [[]]);
    const [, , , sentExtras] = runOnPiston.mock.calls[0] as [
      string,
      string,
      string,
      unknown,
    ];
    expect(sentExtras).toBeUndefined();
  });
});
