import { describe, expect, it } from "vitest";
import {
  createSlugger,
  extractHeadings,
  headingSlug,
  headingText,
  readingMinutes,
  titleParts,
} from "@/lib/interview-questions/reading";

describe("question reading helpers", () => {
  it("estimates reading time from words, ignoring diagrams and markup", () => {
    const words = Array.from({ length: 440 }, () => "word").join(" ");
    expect(readingMinutes(words)).toBe(2);
    expect(readingMinutes(`${words}\n<svg viewBox="0 0 10 10"><text>${words}</text></svg>`)).toBe(2);
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes(null)).toBe(1);
  });

  it("turns headings into clean text and anchors", () => {
    expect(headingText("4. Verified: <code>ReactDOM.render</code> is gone")).toBe("4. Verified: ReactDOM.render is gone");
    expect(headingText("Use `useMemo` **wisely** ##")).toBe("Use useMemo wisely");
    expect(headingText("See [the docs](https://react.dev) first")).toBe("See the docs first");
    expect(headingSlug("1. Why This Even Matters — A Story First")).toBe("1-why-this-even-matters-a-story-first");
    expect(headingSlug("???")).toBe("section");
  });

  it("gives repeated headings unique anchors", () => {
    const slug = createSlugger();
    expect([slug("Example"), slug("Example"), slug("Other"), slug("Example")]).toEqual([
      "example",
      "example-2",
      "other",
      "example-3",
    ]);
  });

  it("lists level-two headings with the ids the renderer assigns", () => {
    const md = [
      "Intro",
      "## Setup",
      "### Details",
      "```md",
      "## Not a heading",
      "```",
      "## Details",
      "## Setup",
    ].join("\n");
    expect(extractHeadings(md)).toEqual([
      { id: "setup", text: "Setup" },
      // "details" was taken by the level-three heading above.
      { id: "details-2", text: "Details" },
      { id: "setup-2", text: "Setup" },
    ]);
  });

  it("splits backticks in titles into code parts", () => {
    expect(titleParts("What is the role of `react-dom`?")).toEqual([
      { text: "What is the role of ", code: false },
      { text: "react-dom", code: true },
      { text: "?", code: false },
    ]);
    expect(titleParts("Plain title")).toEqual([{ text: "Plain title", code: false }]);
    expect(titleParts("Odd ` tick")).toEqual([{ text: "Odd ` tick", code: false }]);
  });
});
