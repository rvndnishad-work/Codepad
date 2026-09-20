import { describe, expect, it } from "vitest";
import { classifyUpload } from "@/lib/upload-files";

/**
 * Contract for drag-and-drop uploads. Every extension creatable in any
 * template must be uploadable — previously `.py/.go/.java/.rs/.toml/.cpp`
 * files were silently skipped because the OS reports no usable MIME type.
 */
describe("classifyUpload", () => {
  it("accepts web sources as text", () => {
    for (const n of ["a.js", "a.jsx", "a.ts", "a.tsx", "a.vue", "a.svelte", "a.css", "a.html", "a.json", "a.md"]) {
      expect(classifyUpload(n, "")).toBe("text");
    }
  });

  it("accepts backend sources as text even with empty MIME type", () => {
    for (const n of ["m.py", "m.go", "M.java", "m.rs", "C.toml", "m.cpp", "m.h", "m.c"]) {
      expect(classifyUpload(n, "")).toBe("text");
    }
  });

  it("falls back to the MIME type for unknown extensions", () => {
    expect(classifyUpload("notes.weird", "text/plain")).toBe("text");
    expect(classifyUpload("photo.weird", "image/png")).toBe("image");
  });

  it("accepts images and skips the rest", () => {
    for (const n of ["p.png", "p.jpg", "p.jpeg", "p.gif", "p.webp", "p.ico"]) {
      expect(classifyUpload(n, "")).toBe("image");
    }
    expect(classifyUpload("app.exe", "")).toBe("skip");
    expect(classifyUpload("lib.zip", "application/zip")).toBe("skip");
    expect(classifyUpload("noext", "")).toBe("skip");
  });
});
