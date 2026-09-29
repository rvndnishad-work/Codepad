import { describe, expect, it } from "vitest";
import {
  buildRunPayload,
  validateExtraFiles,
  stableFilesKey,
  stdinKey,
  capOutput,
  applyOutputCap,
  resolveHarnessSubmission,
  MAX_EXTRA_FILES,
} from "@/lib/run-payload";

/**
 * Contract for multi-file backend runs: the entry file executes as main,
 * every other runnable sibling travels as a Piston extra file, and
 * scaffolding never leaves the client.
 */
describe("buildRunPayload", () => {
  const files = {
    "/index.py": 'from helpers import greet\nprint(greet())\n',
    "/helpers.py": 'def greet():\n    return "hi"\n',
    "/notes.md": "# notes\n",
    "/package.json": { code: '{"dependencies":{}}', hidden: true },
    "/index.html": { code: "<html></html>", hidden: true },
    "/node_modules/buffer/index.js": { code: "shim" },
  };

  it("splits entry code from sibling extras with relative names", () => {
    const { code, extraFiles } = buildRunPayload("/index.py", files);
    expect(code).toBe(files["/index.py"]);
    expect(extraFiles).toEqual([
      { name: "helpers.py", content: files["/helpers.py"] },
      { name: "notes.md", content: files["/notes.md"] },
    ]);
  });

  it("handles string-valued entries and a missing active file", () => {
    const { code, extraFiles } = buildRunPayload("/index.py", {
      "/index.py": "print(1)",
      "/a.py": "X = 1",
    });
    expect(code).toBe("print(1)");
    expect(extraFiles).toEqual([{ name: "a.py", content: "X = 1" }]);
    expect(buildRunPayload("/gone.py", {}).code).toBe("");
  });

  it("keeps nested paths and drops unsafe names", () => {
    const { extraFiles } = buildRunPayload("/index.py", {
      "/index.py": "x",
      "/pkg/util.py": "y",
      "/../evil.py": "z",
    });
    expect(extraFiles).toEqual([{ name: "pkg/util.py", content: "y" }]);
  });

  it("caps the number of extra files", () => {
    const many: Record<string, string> = { "/index.py": "x" };
    for (let i = 0; i < MAX_EXTRA_FILES + 5; i++) many[`/f${i}.py`] = "y";
    expect(buildRunPayload("/index.py", many).extraFiles).toHaveLength(
      MAX_EXTRA_FILES,
    );
  });
});

describe("validateExtraFiles", () => {
  it("accepts absent/empty payloads (backward compatible)", () => {
    expect(validateExtraFiles(undefined)).toEqual({ ok: true, files: [] });
    expect(validateExtraFiles([])).toEqual({ ok: true, files: [] });
  });

  it("accepts well-formed files", () => {
    expect(
      validateExtraFiles([{ name: "a.py", content: "x" }]),
    ).toEqual({ ok: true, files: [{ name: "a.py", content: "x" }] });
  });

  it("rejects traversal, absolute paths and bad shapes", () => {
    for (const bad of [
      "../evil.py",
      "/abs.py",
      "a\\b.py",
      "",
    ]) {
      const r = validateExtraFiles([{ name: bad, content: "x" }]);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(400);
    }
    expect(validateExtraFiles("nope").ok).toBe(false);
    expect(validateExtraFiles([{ name: "a.py" }]).ok).toBe(false);
    expect(
      validateExtraFiles(
        Array.from({ length: MAX_EXTRA_FILES + 1 }, (_, i) => ({
          name: `f${i}.py`,
          content: "x",
        })),
      ),
    ).toMatchObject({ ok: false, status: 413 });
  });

  it("rejects oversized payloads", () => {
    const big = "x".repeat(300 * 1024);
    const r = validateExtraFiles([{ name: "big.py", content: big }]);
    expect(r).toMatchObject({ ok: false, status: 413 });
  });
});

describe("stableFilesKey", () => {
  it("is order-insensitive but content-sensitive", () => {
    const a = [
      { name: "b.py", content: "2" },
      { name: "a.py", content: "1" },
    ];
    const b = [
      { name: "a.py", content: "1" },
      { name: "b.py", content: "2" },
    ];
    expect(stableFilesKey(a)).toBe(stableFilesKey(b));
    expect(stableFilesKey([{ name: "a.py", content: "CHANGED" }])).not.toBe(
      stableFilesKey(b),
    );
  });
});

describe("stdinKey", () => {
  it("scopes stdin drafts per template", () => {
    expect(stdinKey("python")).toBe("interviewpad_stdin:python");
    expect(stdinKey("python")).not.toBe(stdinKey("go"));
  });
});

describe("resolveHarnessSubmission", () => {
  it("passes legacy single-file submissions straight through", () => {
    expect(
      resolveHarnessSubmission({ code: "def solve(): pass" }),
    ).toEqual({ ok: true, code: "def solve(): pass", extraFiles: [] });
  });

  it("splits a workspace map into entry + validated siblings", () => {
    const r = resolveHarnessSubmission({
      files: {
        "/solution.py": "from helpers import v\nprint(v)",
        "/helpers.py": "v = 1",
      },
      entryPath: "/solution.py",
    });
    expect(r).toEqual({
      ok: true,
      code: "from helpers import v\nprint(v)",
      extraFiles: [{ name: "helpers.py", content: "v = 1" }],
    });
  });

  it("accepts entry paths with or without a leading slash", () => {
    const files = { "solution.py": "print(1)", "/other.py": "x" };
    expect(
      resolveHarnessSubmission({ files, entryPath: "/solution.py" }).ok,
    ).toBe(true);
    expect(
      resolveHarnessSubmission({ files, entryPath: "solution.py" }).ok,
    ).toBe(true);
  });

  it("rejects missing entryPath, missing entry and traversal names", () => {
    const files = { "/solution.py": "print(1)" };
    expect(resolveHarnessSubmission({ files })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      resolveHarnessSubmission({ files, entryPath: "/nope.py" }),
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      resolveHarnessSubmission({
        files: { "/solution.py": "x", "../evil.py": "y" },
        entryPath: "/solution.py",
      }),
    ).toMatchObject({ ok: false, status: 400 });
  });
});

describe("capOutput", () => {
  it("passes short output through untouched", () => {
    expect(capOutput("hi", 100)).toEqual({ text: "hi", truncated: false });
  });

  it("cuts at the byte cap and flags truncation", () => {
    const r = capOutput("x".repeat(150), 100);
    expect(r.truncated).toBe(true);
    expect(new TextEncoder().encode(r.text).length).toBeLessThanOrEqual(100);
  });

  it("never splits a multi-byte character", () => {
    // "é" is 2 bytes; cap landing inside it must back off, not corrupt.
    const text = "a".repeat(99) + "é" + "b".repeat(50);
    const r = capOutput(text, 100);
    expect(r.truncated).toBe(true);
    expect(r.text).toBe("a".repeat(99));
    expect(() => JSON.stringify(r.text)).not.toThrow();
  });
});

describe("applyOutputCap", () => {
  it("caps both streams and flags the result", () => {
    const r = applyOutputCap({ stdout: "x".repeat(300 * 1024), stderr: "ok" });
    expect(r.truncated).toBe(true);
    expect(r.stdout.length).toBeLessThanOrEqual(256 * 1024);
    expect(r.stderr).toBe("ok");
  });

  it("leaves small results unflagged", () => {
    expect(applyOutputCap({ stdout: "hi", stderr: "" })).toMatchObject({
      stdout: "hi",
      truncated: false,
    });
  });
});
