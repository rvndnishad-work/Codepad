import { describe, expect, it } from "vitest";
import { emmetExpansionAt, emmetSuggestionsAt, isInJsxText } from "@/lib/emmet-abbreviation";

const jsx = (before: string) => emmetExpansionAt(before, "javascript")?.snippet ?? null;

describe("emmetExpansionAt — JSX", () => {
  const app = 'function App() {\n  return (\n    <div className="app">\n      <Header />\n      <main className="main">\n        <Counter />\n        ';

  it("expands a tag after a JSX element with the cursor between the tags", () => {
    expect(jsx(app + "div")).toBe("<div>${1}</div>");
  });

  it("expands nested abbreviations, classes and components", () => {
    expect(jsx(app + "ul>li*2")).toBe("<ul>\n\t<li>${1}</li>\n\t<li>${2}</li>\n</ul>");
    expect(jsx(app + ".card")).toBe('<div className="card">${1}</div>');
    expect(jsx(app + "Button")).toBe("<Button>${1}</Button>");
    expect(jsx("<main>section")).toBe("<section>${1}</section>");
  });

  it("self-closes void tags so the JSX stays valid", () => {
    expect(jsx(app + "input")).toBe('<input type="${2:text}" />');
  });

  it("works right after return ( and in TypeScript files", () => {
    expect(jsx("function A() {\n  return (\n    div")).toBe("<div>${1}</div>");
    expect(emmetExpansionAt("const A = () => (span", "typescript")?.snippet).toBe("<span>${1}</span>");
  });

  it("leaves plain JavaScript alone", () => {
    expect(jsx(app + "log")).toBeNull(); // not a tag: the console.log snippet should win
    expect(jsx("const x = div")).toBeNull();
    expect(jsx("items.map((item) => div")).toBeNull();
    expect(jsx("if (a > div")).toBeNull();
    expect(jsx("console.log(div")).toBeNull();
    expect(jsx(app + "div ")).toBeNull();
  });
});

describe("emmetExpansionAt — HTML", () => {
  const html = (before: string) => emmetExpansionAt(before, "html")?.snippet ?? null;

  it("expands in the document body", () => {
    expect(html("<body>\n  div")).toBe("<div>${1}</div>");
    expect(html("<body>\n  input")).toBe('<input type="${2:text}">');
    expect(html("<ul>li.item")).toBe('<li class="item">${1}</li>');
  });

  it("skips tags, attributes, scripts and comments", () => {
    expect(html('<div class="a div')).toBeNull();
    expect(html("<script>\n  div")).toBeNull();
    expect(html("<!-- div")).toBeNull();
  });

  it("ignores languages without markup", () => {
    expect(emmetExpansionAt("div", "python")).toBeNull();
    expect(emmetExpansionAt("div", "go")).toBeNull();
  });
});

describe("emmetExpansionAt — CSS", () => {
  const css = (before: string, lang = "css") => emmetExpansionAt(before, lang)?.snippet ?? null;

  it("expands declarations inside a rule", () => {
    expect(css(".a {\n  m10")).toBe("margin: 10px;");
    expect(css(".a {\n  df")).toBe("display: flex;");
    expect(css(".a { color: red; jcc")).toBe("justify-content: center;");
    expect(css(".a {\n  .b {\n    p10-20", "scss")).toBe("padding: 10px 20px;");
  });

  it("skips selectors, comments and unknown words", () => {
    expect(css("m10")).toBeNull();
    expect(css(".a { m10 }\ndf")).toBeNull();
    expect(css(".a {\n  /* m10")).toBeNull();
    expect(css(".a {\n  xyz")).toBeNull();
  });
});

describe("isInJsxText", () => {
  const app = 'export default function App() {\n  return (\n    <div className="app">\n      ';

  it("is true for plain text between JSX tags", () => {
    expect(isInJsxText(app + "Hello ")).toBe(true);
    expect(isInJsxText(app + "<Header />\n      ")).toBe(true);
    expect(isInJsxText("<main>")).toBe(true);
  });

  it("is false in JavaScript, attributes and expressions", () => {
    expect(isInJsxText("function f() {\n  ")).toBe(false);
    expect(isInJsxText(app + "{")).toBe(false);
    expect(isInJsxText(app + "<p>{count > 1 && ")).toBe(false);
    expect(isInJsxText(app + '<button onClick={() => ')).toBe(false);
    expect(isInJsxText(app + "</div>\n  );\n}\n\nfunction g() {\n  ")).toBe(false);
    expect(isInJsxText("const add = (a) => ")).toBe(false);
    expect(isInJsxText("if (a > ")).toBe(false);
  });
});

describe("emmetSuggestionsAt", () => {
  const app = 'export default function App() {\n  return (\n    <div className="app">\n      <Header />\n      ';
  const labels = (before: string, lang = "javascript") => emmetSuggestionsAt(before, lang).map((s) => s.label);

  it("lists the HTML tags a half-typed name could become", () => {
    expect(labels(app + "d")).toEqual(expect.arrayContaining(["div", "dialog", "details"]));
    expect(labels(app + "div")[0]).toBe("div");
    expect(emmetSuggestionsAt(app + "se", "javascript").find((s) => s.label === "section")).toEqual({
      abbreviation: "se",
      label: "section",
      snippet: "<section>${1}</section>",
    });
    expect(labels("<body>\n  na", "html")).toContain("nav");
  });

  it("offers nothing outside markup", () => {
    expect(labels("function f() {\n  d")).toEqual([]);
    expect(labels(app + "Hello d")).toEqual([]);
  });
});
