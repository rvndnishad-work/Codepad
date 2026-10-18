/**
 * Interview rounds, phase 7: the "then <ATS>" hand-off, round results in
 * what the ATS hears, and the nudges when a round waits on a recruiter.
 */
import { describe, expect, it, vi } from "vitest";
import { atsRoundsText, nudgeFor, roundsForAts, thenLabel, type RoundsSummary, type RoundView } from "@/lib/interview/rounds-view";
import { roundStateLabel, segmentOf, type RoundState } from "@/lib/interview/rounds";
import { formatAlert } from "@/lib/alerts/format";
import { buildEnvelope } from "@/lib/events/envelope";
import { buildTestStatus } from "@/lib/ats/greenhouse";
import { nudgeText } from "@/lib/interview/round-nudges-server";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const now = new Date("2026-09-29T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

function round(n: number, name: string, state: RoundState, extra: Partial<RoundView> = {}): RoundView {
  const kind = extra.kind ?? "interview";
  return {
    id: `r${n}`,
    planRoundId: `p${n}`,
    sends: null,
    number: n,
    name,
    kind,
    format: null,
    required: true,
    skipped: false,
    manual: false,
    held: false,
    durationMin: null,
    state,
    seg: segmentOf(state),
    stateLabel: roundStateLabel(state, kind),
    nextStep: null,
    decidedAt: null,
    decidedBy: null,
    result: null,
    pending: null,
    ...extra,
  };
}

function summary(rounds: RoundView[], extra: Partial<RoundsSummary> = {}): RoundsSummary {
  return {
    planName: "Quick screen",
    roleType: "technical",
    total: rounds.filter((r) => !r.skipped).length,
    done: 0,
    waitingOn: null,
    readyForDecision: false,
    currentId: null,
    stoppedAtId: null,
    override: null,
    continuesInAts: false,
    atsName: null,
    rounds,
    ...extra,
  };
}

const result = (at: string, score: string, bar: string) => ({ at, score, frac: null, bar: null, barText: bar, href: null });

describe("then <ATS>", () => {
  const rounds = [round(1, "AI interview", "above_bar", { kind: "ai_interview" }), round(2, "Coding round", "not_started")];

  it("names the connected ATS, or says your ATS, only when the plan hands over", () => {
    expect(thenLabel(summary(rounds))).toBeNull();
    expect(thenLabel(summary(rounds, { continuesInAts: true }))).toBe("your ATS");
    expect(thenLabel(summary(rounds, { continuesInAts: true, atsName: "Greenhouse" }))).toBe("Greenhouse");
    expect(thenLabel(summary([], { continuesInAts: true, total: 0 }))).toBeNull();
  });
});

describe("round results for the ATS", () => {
  const s = summary(
    [
      round(1, "AI interview", "above_bar", { kind: "ai_interview", nextStep: "advance", result: result(hoursAgo(50), "82%", "bar 70%") }),
      round(0, "Take home", "not_started", { kind: "take_home", number: null, skipped: true }),
      round(2, "Coding round", "below_bar", { result: result(hoursAgo(5), "2.4 of 4", "bar 3") }),
      round(3, "Behavioural", "not_started"),
    ],
    { continuesInAts: true, atsName: "Greenhouse" },
  );

  it("lists every round with its result, and scores only when shared", () => {
    expect(roundsForAts(s, { includeScore: true }).map((r) => [r.name, r.state, r.score, r.bar])).toEqual([
      ["AI interview", "above_bar", "82%", "70%"],
      ["Take home", "skipped", null, null],
      ["Coding round", "below_bar", "2.4 of 4", "3"],
      ["Behavioural", "not_held", null, null],
    ]);
    expect(roundsForAts(s, { includeScore: false }).every((r) => r.score === null && r.bar === null)).toBe(true);
  });

  it("reads as one line for a text-only ATS field", () => {
    expect(atsRoundsText(s, { includeScore: true })).toBe(
      "1. AI interview: above bar, 82% (bar 70%). Take home: skipped. 2. Coding round: below bar, 2.4 of 4 (bar 3). 3. Behavioural: not held. Later rounds happen in Greenhouse.",
    );
    expect(atsRoundsText(s, { includeScore: false })).toBe(
      "1. AI interview: above bar. Take home: skipped. 2. Coding round: below bar. 3. Behavioural: not held. Later rounds happen in Greenhouse.",
    );
    expect(atsRoundsText(s, { includeScore: true }, 40)).toHaveLength(40);
    expect(atsRoundsText(summary([], { total: 0 }), { includeScore: true })).toBeNull();
  });

  it("rides along in Greenhouse metadata once the candidate is decided", () => {
    const base = {
      requestStatus: "sent",
      requestCreatedAt: new Date("2026-09-20T10:00:00Z"),
      result: { state: "scored" as const, score: 84 },
      candidateStage: "PASSED",
      stageChangedAt: new Date("2026-09-21T10:00:00Z"),
      profileUrl: "https://codepad.example/w/acme/candidates/c1",
      includeScore: false,
      screeningLabel: "AI screening",
    };
    expect(buildTestStatus({ ...base, rounds: "1. AI interview: above bar." }).metadata?.Rounds).toBe("1. AI interview: above bar.");
    expect(buildTestStatus(base).metadata).not.toHaveProperty("Rounds");
    expect(buildTestStatus({ ...base, candidateStage: "SCREENING", rounds: "x" }).metadata).toBeUndefined();
  });
});

describe("nudges", () => {
  it("nudges for a result waiting on a next step once it has waited an hour", () => {
    const cur = round(2, "Coding round", "below_bar", { result: result(hoursAgo(2), "2.4 of 4", "bar 3") });
    const s = summary([round(1, "Intro chat", "above_bar", { nextStep: "advance", decidedAt: hoursAgo(30) }), cur], { waitingOn: "next_step", currentId: "r2" });
    expect(nudgeFor(s, now)).toMatchObject({ key: "next_step", round: { id: "r2" } });
    const fresh = summary(s.rounds.map((r) => (r.id === "r2" ? { ...r, result: result(hoursAgo(0.5), "2.4 of 4", "bar 3") } : r)), { waitingOn: "next_step", currentId: "r2" });
    expect(nudgeFor(fresh, now)).toBeNull();
  });

  it("nudges for a next round a day after the candidate was moved on", () => {
    const rounds = (decided: string) => [round(1, "Intro chat", "above_bar", { nextStep: "advance", decidedAt: decided }), round(2, "Case discussion", "not_started")];
    expect(nudgeFor(summary(rounds(hoursAgo(30)), { waitingOn: "schedule", currentId: "r2" }), now)).toMatchObject({ key: "next_round", round: { id: "r2" } });
    expect(nudgeFor(summary(rounds(hoursAgo(5)), { waitingOn: "schedule", currentId: "r2" }), now)).toBeNull();
  });

  it("leaves alone first rounds, old waits and people ready for a decision", () => {
    expect(nudgeFor(summary([round(1, "Intro chat", "not_started")], { waitingOn: "schedule", currentId: "r1" }), now)).toBeNull();
    const old = summary([round(1, "Intro chat", "above_bar", { result: result(hoursAgo(24 * 20), "3.5 of 4", "bar 3") })], { waitingOn: "next_step", currentId: "r1" });
    expect(nudgeFor(old, now)).toBeNull();
    const ready = summary([round(1, "Intro chat", "above_bar", { result: result(hoursAgo(3), "3.5 of 4", "bar 3") })], { waitingOn: "next_step", currentId: "r1", readyForDecision: true });
    expect(nudgeFor(ready, now)).toBeNull();
  });

  it("says what is waiting in plain words", () => {
    expect(nudgeText("Leila Ahmadi", "next_step", { name: "Case discussion", kind: "interview", state: "below_bar" })).toEqual({
      title: "Leila Ahmadi: Case discussion needs your next step",
      body: "Case discussion is below bar. Move them on or stop here.",
    });
    expect(nudgeText("Marcus Lee", "next_round", { name: "Case discussion", kind: "interview", state: "not_started" }).title).toBe("Marcus Lee: Case discussion is not booked yet");
    expect(nudgeText("Hana Kim", "next_round", { name: "AI interview", kind: "ai_interview", state: "not_started" }).body).toBe(
      "They were moved on. Send the AI interview so they are not left waiting.",
    );
  });

  it("posts to Slack or Teams without scores", () => {
    const env = (data: Record<string, unknown>) => buildEnvelope("evt_1", "round.waiting", { id: "w", slug: "acme", name: "Acme" }, data, "https://app.example.com", now);
    const step = formatAlert(
      env({ candidate: { name: "Leila Ahmadi" }, waiting: "next_step", round: { name: "Case discussion", kind: "interview" }, result: "below bar", reportPath: "candidates/c1" }),
      { origin: "https://app.example.com", includeScore: true },
    );
    expect(step.text).toBe("Leila Ahmadi finished Case discussion (below bar). Move them on or stop here.");
    expect(step.linkUrl).toBe("https://app.example.com/w/acme/candidates/c1");
    const next = formatAlert(env({ candidate: { name: "Hana Kim" }, waiting: "next_round", round: { name: "AI interview", kind: "ai_interview" } }), { origin: "https://app.example.com" });
    expect(next.text).toBe("Hana Kim moved on and AI interview is not sent yet.");
  });
});
