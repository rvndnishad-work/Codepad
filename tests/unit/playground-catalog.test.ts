import { describe, expect, it } from "vitest";
import { groups, templates } from "@/lib/templates";
import {
  TEMPLATE_BLURBS,
  catalogSections,
  matchesQuery,
  runsOnServer,
  shortGroupLabel,
  templateBlurb,
} from "@/lib/playground-catalog";

describe("playground catalogue", () => {
  it("describes every template", () => {
    for (const t of templates) expect(TEMPLATE_BLURBS[t.id], t.id).toBeTruthy();
  });

  it("lists every template exactly once, popular ones included", () => {
    const ids = catalogSections(templates, groups, "all", "").flatMap((s) => s.items.map((t) => t.id));
    expect(ids).toHaveLength(templates.length);
    expect(new Set(ids).size).toBe(templates.length);
  });

  it("keeps group order and drops the parenthetical from labels", () => {
    const sections = catalogSections(templates, groups, "all", "");
    expect(sections.map((s) => s.key)).toEqual(groups.map((g) => g.key));
    expect(sections.every((s) => !s.label.includes("("))).toBe(true);
    expect(shortGroupLabel("Backend & Systems (JIT 0ms)")).toBe("Backend & Systems");
    expect(shortGroupLabel("Frontend Frameworks")).toBe("Frontend Frameworks");
  });

  it("filters by group", () => {
    const sections = catalogSections(templates, groups, "backend", "");
    expect(sections).toHaveLength(1);
    expect(sections[0].items.every(runsOnServer)).toBe(true);
  });

  it("searches titles, ids and descriptions", () => {
    const hit = (q: string) => catalogSections(templates, groups, "all", q).flatMap((s) => s.items.map((t) => t.id));
    expect(hit("PYTHON")).toEqual(["python"]);
    expect(hit("slice")).toEqual(["redux-toolkit"]);
    expect(hit("  ")).toHaveLength(templates.length);
    expect(hit("cobol")).toEqual([]);
  });

  it("only backend templates run on the server", () => {
    const server = templates.filter(runsOnServer).map((t) => t.id).sort();
    expect(server).toEqual(["cpp", "go", "java", "node", "python", "rust", "ts-node"]);
  });

  it("falls back when a template has no blurb", () => {
    const t = { ...templates[0], id: "made-up", subtitle: "Sub" };
    expect(templateBlurb(t)).toBe("Sub");
    expect(matchesQuery(t, "sub")).toBe(true);
  });
});
