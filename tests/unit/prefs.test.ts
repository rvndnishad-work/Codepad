import { describe, expect, it, beforeEach } from "vitest";
import {
  readPref,
  writePref,
  readBoolPref,
  writeBoolPref,
  readNumberPref,
  PREF_KEYS,
} from "@/lib/prefs";

/**
 * Contract for persisted editor preferences. Storage failures (private
 * mode) must degrade to defaults, never throw.
 */
describe("prefs", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips strings", () => {
    expect(readPref("missing")).toBeNull();
    writePref("k", "v");
    expect(readPref("k")).toBe("v");
  });

  it("parses booleans with fallback", () => {
    expect(readBoolPref("missing", true)).toBe(true);
    expect(readBoolPref("missing", false)).toBe(false);
    writeBoolPref("b", true);
    expect(readBoolPref("b", false)).toBe(true);
    window.localStorage.setItem("legacy", "true");
    expect(readBoolPref("legacy", false)).toBe(true);
    window.localStorage.setItem("junk", "maybe");
    expect(readBoolPref("junk", true)).toBe(false);
  });

  it("clamps numbers with fallback", () => {
    expect(readNumberPref("missing", 5, 0, 10)).toBe(5);
    writePref("n", "7");
    expect(readNumberPref("n", 5, 0, 10)).toBe(7);
    writePref("hi", "99");
    expect(readNumberPref("hi", 5, 0, 10)).toBe(10);
    writePref("junk", "abc");
    expect(readNumberPref("junk", 5, 0, 10)).toBe(5);
  });

  it("keys are namespaced and per-part", () => {
    expect(PREF_KEYS.formatOnSave).toMatch(/^interviewpad_/);
    expect(PREF_KEYS.layout("editor")).not.toBe(PREF_KEYS.layout("explorer"));
  });
});
