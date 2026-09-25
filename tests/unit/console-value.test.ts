import { describe, expect, it } from "vitest";
import {
  decodeConsoleValue,
  formatConsoleValue,
  formatConsoleArgs,
} from "@/lib/console-value";

/**
 * Payloads below were captured from Sandpack's real console hook
 * (@codesandbox/sandpack-client consoleHook) — what `useSandpackConsole`
 * actually hands the playground console for each `console.log` call.
 */
const fmt = (raw: unknown) => formatConsoleValue(decodeConsoleValue(raw));

describe("console value decoding", () => {
  it("decodes the special scalars console-feed wraps", () => {
    expect(fmt({ "#@t": "[[undefined]]", data: "" })).toBe("undefined");
    expect(fmt({ "#@t": "[[NaN]]", data: "" })).toBe("NaN");
    expect(fmt({ "#@t": "Arithmetic", data: 0 })).toBe("Infinity");
    expect(fmt({ "#@t": "Arithmetic", data: 1 })).toBe("-Infinity");
    expect(fmt({ "#@t": "Arithmetic", data: 2 })).toBe("-0");
    expect(fmt({ "#@t": "[[Date]]", data: 0 })).toBe("1970-01-01T00:00:00.000Z");
    expect(fmt({ "#@t": "[[RegExp]]", data: { src: "ab+c", flags: "i" } })).toBe("/ab+c/i");
    expect(fmt({ "#@t": "Function", data: { name: "greet", body: "", proto: "Function" } })).toBe("ƒ greet()");
  });

  it("accepts the legacy @t key too", () => {
    expect(fmt({ "@t": "[[undefined]]", data: "" })).toBe("undefined");
  });

  it("decodes Map and Set with nested values", () => {
    expect(fmt({ "#@t": "[[Map]]", data: ["a", 1, "b", { x: 2 }] })).toBe('Map(2) {"a" => 1, "b" => {x: 2}}');
    expect(fmt({ "#@t": "[[Set]]", data: [1, 2] })).toBe("Set(2) {1, 2}");
  });

  it("decodes errors, keeping the stack at the top level", () => {
    const raw = { "#@t": "[[Error]]", data: { name: "Error", message: "boom", stack: "Error: boom\n    at x" } };
    expect(fmt(raw)).toBe("Error: boom\n    at x");
    expect(fmt([raw])).toBe("[Error: boom]");
  });

  it("renders unresolvable reference pointers as [Circular]", () => {
    expect(fmt({ name: "a", self: { "#@r": 1 } })).toBe('{name: "a", self: [Circular]}');
    expect(fmt({ "#@r": 1 })).toBe("[Circular]");
  });

  it("decodes wrapped values inside arrays and quotes nested strings", () => {
    expect(fmt([1, { "#@t": "[[undefined]]", data: "" }, null, "s"])).toBe('[1, undefined, null, "s"]');
  });

  it("collapses deep nesting in the one-line preview", () => {
    expect(fmt({ a: { b: { c: { d: 1 } } } })).toBe("{a: {b: {c: {…}}}}");
  });

  it("quotes keys that are not identifiers", () => {
    expect(fmt({ "my-key": 1, ok: 2 })).toBe('{"my-key": 1, ok: 2}');
  });

  it("joins a whole call's arguments with plain top-level strings", () => {
    expect(formatConsoleArgs(["str", 1, true, null])).toBe("str 1 true null");
  });

  it("caps huge containers instead of rendering every entry", () => {
    const node = decodeConsoleValue(Array.from({ length: 250 }, (_, i) => i));
    expect(node.t === "array" && node.items.length).toBe(200);
    expect(formatConsoleValue(node)).toMatch(/…50 more\]$/);
  });
});
