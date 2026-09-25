import { describe, expect, it } from "vitest";
import { buildFileView, markRanges, toSplitRows, wordRanges } from "@/lib/ai-interview/line-diff";

const starter = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");

describe("buildFileView", () => {
  it("numbers lines, counts changes and folds far context", () => {
    const after = starter.replace("line 10", "line ten").replace("line 20", "line 20\nextra");
    const v = buildFileView(starter, after);
    expect(v.added).toBe(2);
    expect(v.removed).toBe(1);
    const hunks = v.rows.filter((r) => r.type === "hunk");
    expect(hunks[0]).toMatchObject({ type: "hunk", header: "@@ -7,7 +7,7 @@" });
    expect((hunks[0] as { hidden: unknown[] }).hidden).toHaveLength(6);
    expect(hunks[1]).toMatchObject({ header: "@@ -18,3 +18,4 @@" });
    const del = v.rows.find((r) => r.type === "line" && r.line.kind === "del");
    expect(del).toMatchObject({ line: { oldNo: 10, text: "line 10" } });
  });

  it("treats a new file as all additions", () => {
    const v = buildFileView(undefined, "a\nb\n");
    expect(v).toMatchObject({ added: 2, removed: 0 });
  });

  it("pairs deletions with additions for split view", () => {
    const v = buildFileView("a\nb\nc", "a\nB\nX\nc");
    const pairs = toSplitRows(v.rows).filter((r) => r.type === "pair");
    expect(pairs.map((p) => p.type === "pair" && [p.left?.text ?? null, p.right?.text ?? null])).toEqual([
      ["a", "a"],
      ["b", "B"],
      [null, "X"],
      ["c", "c"],
    ]);
  });
});

describe("word highlights", () => {
  it("marks only the changed words", () => {
    const w = wordRanges("return null;", "return items;");
    expect(w).toEqual({ del: [[7, 11]], add: [[7, 12]] });
  });

  it("skips lines that share too little", () => {
    expect(wordRanges("return null;", "const [a, b] = useState(0);")).toBeNull();
  });

  it("wraps ranges inside highlighted html, counting entities as one character", () => {
    const html = '<span class="k">if</span> a &lt; b';
    expect(markRanges(html, [[5, 6]], "w")).toBe('<span class="k">if</span> a <span class="w">&lt;</span> b');
  });
});
