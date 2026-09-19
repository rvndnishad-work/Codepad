import { describe, expect, it } from "vitest";
import { languageFor, extColorFor } from "@/lib/monaco-langs";

/**
 * Contract for editor language detection. Every extension creatable in any
 * template must resolve to a real Monaco language — never silently fall back
 * to plaintext (previously `.c` did).
 */
describe("monaco language mapping", () => {
  it("maps web languages", () => {
    expect(languageFor("/App.jsx")).toBe("javascript");
    expect(languageFor("/a.TS")).toBe("typescript");
    expect(languageFor("/a.tsx")).toBe("typescript");
    expect(languageFor("/s.css")).toBe("css");
    expect(languageFor("/i.html")).toBe("html");
    expect(languageFor("/p.json")).toBe("json");
  });

  it("maps systems languages, including C", () => {
    expect(languageFor("/m.py")).toBe("python");
    expect(languageFor("/m.go")).toBe("go");
    expect(languageFor("/M.java")).toBe("java");
    expect(languageFor("/m.c")).toBe("cpp");
    expect(languageFor("/m.cpp")).toBe("cpp");
    expect(languageFor("/m.h")).toBe("cpp");
    expect(languageFor("/m.rs")).toBe("rust");
  });

  it("falls back to plaintext only for genuinely unknown types", () => {
    expect(languageFor("/x.toml")).toBe("plaintext");
    expect(languageFor("/x.md")).toBe("plaintext");
    expect(languageFor("/noext")).toBe("plaintext");
  });

  it("gives every mapped language a tab color", () => {
    for (const p of ["/a.js", "/a.ts", "/a.py", "/a.c", "/a.rs", "/a.vue"]) {
      expect(extColorFor(p)).not.toBe("#8b8b8b");
    }
    expect(extColorFor("/x.unknown")).toBe("#8b8b8b");
  });
});
