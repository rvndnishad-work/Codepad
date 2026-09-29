import { describe, expect, it } from "vitest";
import { formatCode } from "@/lib/format";

/**
 * Contract for the Format action (Ctrl+Shift+F). Uses the real Prettier so
 * a broken plugin import or parser map is caught here, not in production.
 */
describe("formatCode", () => {
  it("formats JS/TS and is idempotent", async () => {
    const first = await formatCode("/a.js", "const x=1");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.code).toMatch(/const x = 1;/);
    const second = await formatCode("/a.js", first.code);
    expect(second).toEqual(first);
  }, 30000);

  it("formats CSS, JSON and markdown", async () => {
    expect((await formatCode("/a.css", "a{color:red}")).ok).toBe(true);
    const json = await formatCode("/a.json", '{"a":1,"b":[1,2,3]}');
    expect(json.ok).toBe(true);
    if (json.ok) expect(json.code).toBe('{ "a": 1, "b": [1, 2, 3] }\n');
    expect((await formatCode("/a.md", "# t")).ok).toBe(true);
  }, 30000);

  it("rejects unsupported types and broken code without throwing", async () => {
    expect(await formatCode("/m.py", "x=1")).toEqual({
      ok: false,
      reason: "Unsupported file type",
    });
    const bad = await formatCode("/a.js", "const =");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason.length).toBeGreaterThan(0);
  }, 30000);
});
