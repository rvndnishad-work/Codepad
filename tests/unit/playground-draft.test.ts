import { describe, expect, it } from "vitest";
import {
  applyDraft,
  codeLinkUrl,
  draftAgeLabel,
  draftKey,
  matchesTemplate,
  MAX_DRAFT_BYTES,
  parseDraft,
  serializeDraft,
  visibleFiles,
} from "@/lib/playground-draft";
import { decodePlaygroundFiles } from "@/lib/playground-handoff";

const template = {
  "/index.js": "console.log(1);\n",
  "/index.html": { code: "<div></div>", hidden: true },
  "/node_modules/fs/index.js": { code: "module.exports={}", hidden: true },
};

describe("playground drafts", () => {
  it("keys drafts per template", () => {
    expect(draftKey("python")).toBe("play:draft:python");
  });

  it("keeps only the files a person can see", () => {
    expect(visibleFiles(template)).toEqual({ "/index.js": "console.log(1);\n" });
  });

  it("detects an untouched template", () => {
    expect(matchesTemplate({ "/index.js": "console.log(1);\n" }, template)).toBe(true);
    expect(matchesTemplate({ "/index.js": "console.log(2);\n" }, template)).toBe(false);
    expect(matchesTemplate({ "/index.js": "console.log(1);\n", "/a.js": "" }, template)).toBe(false);
  });

  it("round-trips through storage and rejects junk", () => {
    const raw = serializeDraft("My pad", { "/index.js": "x" }, 1000)!;
    expect(parseDraft(raw)).toEqual({ v: 1, at: 1000, title: "My pad", files: { "/index.js": "x" } });
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("{")).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 2, at: 1, title: "", files: {} }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, at: 1, title: "", files: { "/a": 3 } }))).toBeNull();
  });

  it("refuses drafts too large for localStorage", () => {
    expect(serializeDraft("big", { "/a.js": "x".repeat(MAX_DRAFT_BYTES) })).toBeNull();
  });

  it("applies a draft over the template, keeping hidden scaffolding and shims", () => {
    const out = applyDraft(template, { "/main.js": "hi" });
    expect(Object.keys(out).sort()).toEqual(["/index.html", "/main.js", "/node_modules/fs/index.js"]);
    expect(out["/main.js"]).toBe("hi");
    // A draft file over hidden scaffolding becomes visible.
    expect(applyDraft(template, { "/index.html": "<p>" })["/index.html"]).toEqual({ code: "<p>", hidden: false });
  });

  it("builds a code link the playground can decode", () => {
    const url = codeLinkUrl("https://x.test", "javascript", { "/index.js": "console.log('é')" });
    expect(url.startsWith("https://x.test/play?template=javascript#files=")).toBe(true);
    expect(decodePlaygroundFiles(url.slice(url.indexOf("#")))).toEqual({ "/index.js": "console.log('é')" });
  });

  it("labels draft age", () => {
    const now = 10_000_000;
    expect(draftAgeLabel(now - 5_000, now)).toBe("just now");
    expect(draftAgeLabel(now - 60_000, now)).toBe("1 minute ago");
    expect(draftAgeLabel(now - 5 * 60_000, now)).toBe("5 minutes ago");
    expect(draftAgeLabel(now - 3 * 3600_000, now)).toBe("3 hours ago");
    expect(draftAgeLabel(now - 30 * 3600_000, now)).toBe("yesterday");
  });
});
