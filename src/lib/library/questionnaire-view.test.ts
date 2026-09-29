import { describe, expect, it } from "vitest";
import { copyTitle, filterQuestionnaires, pace, parsePastedQuestions, questionnaireStats, roleAreas } from "./questionnaire-view";

const q = (title: string, extra: Partial<Parameters<typeof filterQuestionnaires>[0][number]> = {}) => ({
  title,
  brief: "",
  roleArea: null as string | null,
  minutes: 20,
  items: [{ q: "What is a closure?" }],
  updatedAt: "2026-09-01T00:00:00.000Z",
  uses: 0,
  ...extra,
});

describe("questionnaireStats", () => {
  it("counts answers, bank questions and technologies, ignoring blank rows", () => {
    const s = questionnaireStats([
      { q: "One", a: "yes", tech: "reactjs", src: "a" },
      { q: "Two", tech: "reactjs", src: "b" },
      { q: "Three", a: "  ", tech: "nodejs" },
      { q: "   " },
    ]);
    expect(s).toEqual({ count: 3, answered: 1, coverage: 33, techs: ["reactjs", "nodejs"], fromBank: 2 });
  });

  it("handles an empty list", () => {
    expect(questionnaireStats([]).coverage).toBe(0);
  });
});

describe("pace", () => {
  it("flags too little time and suggests a fitting time", () => {
    expect(pace(10, 20)).toMatchObject({ tone: "tight", perQuestion: 2 });
    expect(pace(10, 20)?.text).toContain("30 min");
  });

  it("flags too much time and accepts a normal pace", () => {
    expect(pace(2, 30)?.tone).toBe("loose");
    expect(pace(5, 20)).toMatchObject({ tone: "ok", perQuestion: 4 });
    expect(pace(0, 20)).toBeNull();
  });
});

describe("filterQuestionnaires", () => {
  const list = [
    q("React fundamentals", { roleArea: "Frontend", uses: 3, updatedAt: "2026-09-02T00:00:00.000Z" }),
    q("Node.js runtime", { roleArea: "Backend", uses: 9, items: [{ q: "Explain the event loop" }] }),
    q("Ownership", { roleArea: "Frontend", updatedAt: "2026-09-10T00:00:00.000Z" }),
  ];

  it("searches titles and question text", () => {
    expect(filterQuestionnaires(list, { q: "event LOOP" }).map((x) => x.title)).toEqual(["Node.js runtime"]);
    expect(filterQuestionnaires(list, { q: "react" }).map((x) => x.title)).toEqual(["React fundamentals"]);
  });

  it("filters by role area and sorts", () => {
    expect(filterQuestionnaires(list, { area: "Frontend" }).map((x) => x.title)).toEqual(["Ownership", "React fundamentals"]);
    expect(filterQuestionnaires(list, { sort: "used" }).map((x) => x.title)).toEqual(["Node.js runtime", "React fundamentals", "Ownership"]);
    expect(filterQuestionnaires(list, { sort: "name" }).map((x) => x.title)).toEqual(["Node.js runtime", "Ownership", "React fundamentals"]);
  });

  it("lists role areas by use", () => {
    expect(roleAreas(list)).toEqual([
      { area: "Frontend", count: 2 },
      { area: "Backend", count: 1 },
    ]);
  });
});

describe("parsePastedQuestions", () => {
  it("strips list markers, blank lines and repeats", () => {
    const text = "1. What is a closure?\n2) Explain   hoisting\n\n- What is a closure?\n* Q4: Why use keys?\nQuestion 5: What is JSX?\n• Last one";
    expect(parsePastedQuestions(text)).toEqual(["What is a closure?", "Explain hoisting", "Why use keys?", "What is JSX?", "Last one"]);
  });

  it("skips questions already in the questionnaire", () => {
    expect(parsePastedQuestions("what is a closure?\nNew one", ["What is a closure?"])).toEqual(["New one"]);
  });
});

describe("copyTitle", () => {
  it("adds a copy suffix that is not taken", () => {
    expect(copyTitle("React", ["React"])).toBe("React (copy)");
    expect(copyTitle("React (copy)", ["React", "React (copy)"])).toBe("React (copy 2)");
    expect(copyTitle("x".repeat(80), []).length).toBeLessThanOrEqual(80);
  });
});
