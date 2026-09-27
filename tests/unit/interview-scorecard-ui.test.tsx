/**
 * The scorecard form and the report's side-by-side view, rendered in jsdom:
 * submit is blocked until the competencies and a recommendation are in, a
 * submitted card shows as locked with Amend, and a panel member who has not
 * submitted sees no one else's scores.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/app/w/[slug]/(shell)/interviews/[id]/report/actions", () => ({ nudgeScorecardsAction: vi.fn(), updateInterviewPassMarkAction: vi.fn() }));

import ScorecardForm from "@/app/w/[slug]/(shell)/interviews/[id]/scorecard/ScorecardForm";
import PanelScorecards from "@/app/w/[slug]/(shell)/interviews/[id]/report/PanelScorecards";
import type { MyScorecard, ReportScorecards } from "@/lib/interview/scorecard-server";
import { deriveCriteria, summarisePanel } from "@/lib/interview/scorecard";

const criteria = deriveCriteria({ format: "coding", rounds: [{ key: "c:1", title: "Debounced search" }], questions: [] });

const base: MyScorecard = {
  sessionId: "s1",
  title: "Frontend panel",
  formatLabel: "Coding round",
  candidateName: "Ana Lima",
  criteria,
  card: null,
  panel: [
    { key: "u:me", name: "Priya Shah", state: "not_started", you: true },
    { key: "u:dan", name: "Daniel Kim", state: "submitted", you: false },
  ],
  passMark: 3,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ScorecardForm", () => {
  it("blocks submit until every competency is rated and a recommendation is picked", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ScorecardForm initial={base} backHref={null} reportHref={null} />);
    expect(screen.getByRole("heading", { name: "Your scorecard for Ana Lima" })).toBeTruthy();
    expect(screen.getByText("3.0 of 4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit scorecard" }));
    expect(screen.getByRole("alert").textContent).toContain("Rate Problem solving, Code quality, Communication.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits, then shows the card locked with an Amend button", async () => {
    const submitted: MyScorecard = {
      ...base,
      card: {
        ratings: { problem_solving: { r: 4, n: "" }, code_quality: { r: 3, n: "" }, communication: { r: 3, n: "" } },
        notes: "",
        recommendation: "yes",
        status: "submitted",
        submittedAt: "2026-09-26T10:00:00Z",
        updatedAt: "2026-09-26T10:00:00Z",
        amendments: 0,
      },
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ scorecard: submitted }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ScorecardForm initial={base} apiQuery="?guest=abc" backHref={null} reportHref={null} />);
    for (const label of ["Problem solving score", "Code quality score", "Communication score"]) {
      const group = screen.getByRole("group", { name: label });
      fireEvent.click(group.querySelectorAll("button")[2]);
    }
    fireEvent.click(screen.getByRole("button", { name: "Pass" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Submit scorecard" }));
    });
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const [url, init] = calls.at(-1)!;
    expect(url).toBe("/api/interview/s1/scorecard?guest=abc");
    expect(JSON.parse(String(init.body))).toMatchObject({ intent: "submit", recommendation: "yes" });
    expect(await screen.findByRole("button", { name: "Amend" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Submit scorecard" })).toBeNull();
  });
});

describe("PanelScorecards", () => {
  const reviewers = [
    { key: "u:me", name: "Priya Shah", kind: "member" as const, email: null },
    { key: "u:dan", name: "Daniel Kim", kind: "member" as const, email: null },
    { key: "g:m", name: "marco@guest.io", kind: "guest" as const, email: null },
  ];
  const danRatings = { problem_solving: { r: 4, n: "Caught the stale response race" }, code_quality: { r: 3, n: "" }, communication: { r: 2, n: "" } };
  const summary = summarisePanel(reviewers, [{ reviewerKey: "u:dan", status: "submitted", ratings: danRatings, recommendation: "yes" }], null);
  const open: ReportScorecards = {
    passMark: 3,
    passMarkIsDefault: true,
    panel: [
      { key: "u:me", name: "Priya Shah", guest: false, state: "draft" },
      { key: "u:dan", name: "Daniel Kim", guest: false, state: "submitted" },
      { key: "g:m", name: "marco@guest.io", guest: true, state: "not_started" },
    ],
    blind: false,
    viewer: { key: null, state: null },
    criteria,
    cards: [{ key: "u:dan", name: "Daniel Kim", guest: false, average: 3, recommendation: "yes", ratings: danRatings, notes: "Solid", submittedAt: "2026-09-26T10:00:00Z", edits: [] }],
    summary,
    nudgedAt: null,
    nudgeWaitMin: 0,
  };

  it("shows submitted cards side by side, who is missing, and a nudge", () => {
    render(<PanelScorecards data={open} slug="acme" sessionId="s1" scorecardHref={null} canEditPassMark canNudge />);
    expect(screen.getByRole("columnheader", { name: "Daniel Kim" })).toBeTruthy();
    expect(screen.getByText("Caught the stale response race")).toBeTruthy();
    expect(screen.getByText("At or above the pass mark of 3.0")).toBeTruthy();
    expect(screen.getByText("1 of 3 submitted")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Nudge by email/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change" })).toBeTruthy();
  });

  it("keeps a panel member blind until they submit", () => {
    const blind: ReportScorecards = { ...open, blind: true, viewer: { key: "u:me", state: "draft" }, criteria: [], cards: [], summary: null };
    render(<PanelScorecards data={blind} slug="acme" sessionId="s1" scorecardHref="/w/acme/interviews/s1/scorecard" canEditPassMark={false} canNudge={false} />);
    expect(screen.queryByText("Caught the stale response race")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText(/Submit your scorecard to see the others/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open your scorecard" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Nudge/ })).toBeNull();
  });
});
