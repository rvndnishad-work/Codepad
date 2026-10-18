import { describe, expect, it } from "vitest";
import { EDITOR_SNIPPETS, flattenSnippetFile } from "@/lib/editor-snippets";

const prefixes = (lang: string) => EDITOR_SNIPPETS[lang].map((s) => s.prefix);

describe("editor snippets", () => {
  it("ships VS Code's console snippets for JS and TS", () => {
    for (const lang of ["javascript", "typescript"]) {
      const log = EDITOR_SNIPPETS[lang].find((s) => s.prefix === "log");
      expect(log?.body).toBe("console.log($1);\n$0");
      expect(prefixes(lang)).toEqual(expect.arrayContaining(["warn", "error", "for", "forof", "trycatch"]));
    }
  });

  it("covers every playground language", () => {
    expect(prefixes("python")).toEqual(expect.arrayContaining(["def", "for", "ifmain", "print"]));
    expect(prefixes("go")).toEqual(expect.arrayContaining(["for", "iferr", "fmain", "pn"]));
    expect(prefixes("java")).toEqual(expect.arrayContaining(["sysout", "fori", "main"]));
    expect(prefixes("cpp")).toEqual(expect.arrayContaining(["main", "for", "cout", "#include"]));
    expect(prefixes("rust")).toEqual(expect.arrayContaining(["main", "fn", "println", "match"]));
  });

  it("flattens nested files and expands prefix lists", () => {
    const flat = flattenSnippetFile({
      ".source.go": { a: { prefix: ["x", "y"], body: ["l1", "l2"] } },
      b: { body: "only" },
    });
    expect(flat).toEqual([
      { prefix: "x", body: "l1\nl2", name: "a", description: "a" },
      { prefix: "y", body: "l1\nl2", name: "a", description: "a" },
      { prefix: "b", body: "only", name: "b", description: "b" },
    ]);
  });
});
