import { describe, expect, it } from "vitest";
import { filterCounts, filterRows, matchesSearch, paginate, parsePeople, parseReviewView, reviewRows } from "@/lib/take-home/list";
import type { Decision, TakeHomeState } from "@/lib/take-home/status";

const row = (id: string, state: TakeHomeState, over: Partial<{ decision: Decision; needsReview: boolean; submittedAt: string | null; templateId: string | null; name: string }> = {}) => ({
  id,
  title: `Take home ${id}`,
  templateId: over.templateId ?? null,
  candidate: { name: over.name ?? `Person ${id}`, email: `${id}@example.com` },
  state,
  decision: over.decision ?? null,
  needsReview: over.needsReview ?? false,
  submittedAt: over.submittedAt ?? null,
});

describe("take-home list helpers", () => {
  const rows = [
    row("a", "submitted", { needsReview: true, submittedAt: "2026-09-20T10:00:00Z", templateId: "fe" }),
    row("b", "submitted", { needsReview: true, submittedAt: "2026-09-18T10:00:00Z" }),
    row("c", "submitted", { decision: "passed", submittedAt: "2026-09-19T10:00:00Z" }),
    row("d", "submitted", { decision: "not_passed", submittedAt: "2026-09-21T10:00:00Z" }),
    row("e", "not_started"),
    row("f", "expired"),
    row("g", "cancelled", { name: "Tomasz Nowak" }),
  ];

  it("orders the review queue oldest submission first, decided newest first", () => {
    expect(reviewRows(rows, "review", "", "all").map((r) => r.id)).toEqual(["b", "a"]);
    expect(reviewRows(rows, "decided", "", "all").map((r) => r.id)).toEqual(["d", "c"]);
    expect(reviewRows(rows, "review", "", "fe").map((r) => r.id)).toEqual(["a"]);
  });

  it("filters by status chip and search", () => {
    expect(filterRows(rows, "submitted", "").map((r) => r.id)).toEqual(["a", "b"]);
    expect(filterRows(rows, "decided", "").map((r) => r.id)).toEqual(["c", "d"]);
    expect(filterRows(rows, "closed", "").map((r) => r.id)).toEqual(["f", "g"]);
    expect(filterRows(rows, "all", "tomasz").map((r) => r.id)).toEqual(["g"]);
    expect(matchesSearch(rows[0], "A@EXAMPLE")).toBe(true);
    expect(filterCounts(rows, ["all", "submitted", "decided", "closed", "not_started", "in_progress"])).toEqual({
      all: 7,
      submitted: 2,
      decided: 2,
      closed: 2,
      not_started: 1,
      in_progress: 0,
    });
  });

  it("pages in 20s and clamps the page", () => {
    const many = Array.from({ length: 45 }, (_, i) => i);
    expect(paginate(many, 1)).toMatchObject({ page: 1, pages: 3, total: 45 });
    expect(paginate(many, 3).rows).toEqual([40, 41, 42, 43, 44]);
    expect(paginate(many, 9).page).toBe(3);
    expect(paginate([], 2)).toMatchObject({ page: 1, pages: 1, total: 0 });
    expect(parseReviewView("decided")).toBe("decided");
    expect(parseReviewView("x")).toBe("review");
  });
});

describe("composer email parsing", () => {
  it("reads plain emails, named emails and lists", () => {
    expect(parsePeople("ana.silva@example.com")).toEqual([{ name: "Ana Silva", email: "ana.silva@example.com" }]);
    expect(parsePeople('"Ravi Kumar" <Ravi@Example.com>, noah.b@example.com; not-an-email')).toEqual([
      { name: "Ravi Kumar", email: "ravi@example.com" },
      { name: "Noah B", email: "noah.b@example.com" },
    ]);
  });
});
