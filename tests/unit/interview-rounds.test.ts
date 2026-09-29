/**
 * Interview plans and rounds: where each round stands, what a candidate is
 * waiting on, and the rule that nothing passes anyone on its own.
 */
import { describe, expect, it } from "vitest";
import {
  aiAttempt,
  attemptFromResult,
  copyRounds,
  currentAttempt,
  liveAttempt,
  passNeedsOverride,
  planProgress,
  progressLine,
  roundAllowed,
  roundsFromHistory,
  roundsFromTemplate,
  roundStateLabel,
  strip,
  syncRounds,
  validatePlan,
  type CandidateRoundRow,
  type PlanRoundRow,
  takeHomeAttempt,
  templateByKey,
  templatesFor,
  type Attempt,
  type RoundInput,
} from "@/lib/interview/rounds";

const now = new Date("2026-09-29T12:00:00Z");

const above: Attempt = { state: "above_bar", at: "2026-09-20T10:00:00Z" };
const below: Attempt = { state: "below_bar", at: "2026-09-22T10:00:00Z" };
const dnf: Attempt = { state: "did_not_finish", at: "2026-09-29T09:00:00Z" };
const booked: Attempt = { state: "scheduled", at: "2026-10-02T11:00:00Z" };

let seq = 0;
function round(name: string, attempts: Attempt[] = [], extra: Partial<RoundInput> = {}): RoundInput {
  seq += 1;
  return { id: `r${seq}`, order: seq, kind: "interview", name, required: true, skipped: false, nextStep: null, attempts, ...extra };
}

describe("attempts", () => {
  const live = { state: "completed" as const, verdict: null, scheduledAt: "2026-09-28T10:00:00Z", cards: { expected: 2, submitted: 2 }, average: 3.2, passMark: 3 };

  it("scores a live interview against its pass mark once every card is in", () => {
    expect(liveAttempt(live, now).state).toBe("above_bar");
    expect(liveAttempt({ ...live, average: 2.1 }, now).state).toBe("below_bar");
    expect(liveAttempt({ ...live, cards: { expected: 2, submitted: 1 } }, now).state).toBe("awaiting_review");
    expect(liveAttempt({ ...live, average: null }, now).state).toBe("awaiting_review");
  });

  it("reads a left-early verdict as did not finish, and failed or suspicious as below bar", () => {
    expect(liveAttempt({ ...live, verdict: "left_in_between" }, now).state).toBe("did_not_finish");
    expect(liveAttempt({ ...live, verdict: "failed" }, now).state).toBe("below_bar");
    expect(liveAttempt({ ...live, verdict: "suspicious" }, now).state).toBe("below_bar");
  });

  it("treats a booked interview long past its start as a no-show", () => {
    expect(liveAttempt({ ...live, state: "scheduled", scheduledAt: "2026-10-02T11:00:00Z" }, now).state).toBe("scheduled");
    expect(liveAttempt({ ...live, state: "scheduled", scheduledAt: "2026-09-29T11:00:00Z" }, now).state).toBe("did_not_finish");
    expect(liveAttempt({ ...live, state: "scheduled", scheduledAt: "2026-09-29T11:45:00Z" }, now).state).toBe("scheduled");
  });

  it("maps AI interview statuses, including an expired invite", () => {
    const base = { status: "PENDING", score: null, passMark: 60, createdAt: "2026-09-27T10:00:00Z" };
    expect(aiAttempt(base, now).state).toBe("invited");
    expect(aiAttempt({ ...base, expiresAt: "2026-09-28T10:00:00Z" }, now).state).toBe("did_not_finish");
    expect(aiAttempt({ ...base, status: "EXPIRED" }, now).state).toBe("did_not_finish");
    expect(aiAttempt({ ...base, status: "ACTIVE" }, now).state).toBe("in_progress");
    expect(aiAttempt({ ...base, status: "COMPLETED", score: 74 }, now).state).toBe("above_bar");
    expect(aiAttempt({ ...base, status: "COMPLETED", score: 58 }, now).state).toBe("below_bar");
    expect(aiAttempt({ ...base, status: "COMPLETED", score: 60 }, now).state).toBe("above_bar");
  });

  it("maps take-home states and waits for review before scoring", () => {
    const t = { score: null, passMark: 60, at: null };
    expect(takeHomeAttempt({ ...t, state: "not_started" }).state).toBe("invited");
    expect(takeHomeAttempt({ ...t, state: "expired" }).state).toBe("did_not_finish");
    expect(takeHomeAttempt({ ...t, state: "submitted" }).state).toBe("awaiting_review");
    expect(takeHomeAttempt({ ...t, state: "submitted", score: 82 }).state).toBe("above_bar");
    expect(takeHomeAttempt({ ...t, state: "submitted", score: 41 }).state).toBe("below_bar");
  });

  it("counts the latest attempt that was not cancelled", () => {
    expect(currentAttempt([dnf, { state: "cancelled", at: "2026-10-01T00:00:00Z" }])).toEqual(dnf);
    expect(currentAttempt([booked, dnf])).toEqual(booked);
    expect(currentAttempt([])).toBeNull();
  });
});

describe("planProgress", () => {
  it("walks a candidate through their rounds (Priya: round 5 of 6 booked)", () => {
    const p = planProgress(
      [
        round("AI interview", [above], { kind: "ai_interview", nextStep: "advance" }),
        round("Take home", [above], { kind: "take_home", nextStep: "advance" }),
        round("Intro chat", [above], { nextStep: "advance" }),
        round("Coding round", [above], { nextStep: "advance" }),
        round("Technical discussion", [booked]),
        round("Behavioural"),
      ],
      "SCREENING",
    );
    expect(p.total).toBe(6);
    expect(p.done).toBe(4);
    expect(p.current?.name).toBe("Technical discussion");
    expect(p.waitingOn).toBe("interview");
    expect(progressLine(p)).toBe("Round 5 of 6 · Technical discussion");
    expect(strip(p)).toEqual(["above", "above", "above", "above", "scheduled", "open"]);
  });

  it("never stops a candidate on a below-bar round: it waits for the recruiter's next step (Kofi)", () => {
    const p = planProgress([round("Intro chat", [above], { nextStep: "advance" }), round("Coding round", [below]), round("Technical discussion"), round("Behavioural")], "SCREENING");
    expect(p.current?.name).toBe("Coding round");
    expect(p.waitingOn).toBe("next_step");
    expect(p.stoppedAt).toBeNull();
    expect(p.rounds[2].state).toBe("not_started");
    expect(progressLine(p)).toBe("Round 2 of 4 · Coding round · below bar");
  });

  it("waits for a round to be booked once the recruiter moves on", () => {
    const p = planProgress([round("Intro chat", [above], { nextStep: "advance" }), round("Coding round")]);
    expect(p.current?.name).toBe("Coding round");
    expect(p.waitingOn).toBe("schedule");
    expect(roundStateLabel(p.current!.state, "interview")).toBe("To schedule");
  });

  it("marks later rounds stopped when the recruiter stops, and asks for the decision (Grace)", () => {
    const p = planProgress([
      round("AI interview", [above], { kind: "ai_interview", nextStep: "advance" }),
      round("Take home", [below], { kind: "take_home", nextStep: "stop" }),
      round("Intro chat"),
      round("Coding round"),
    ]);
    expect(p.stoppedAt?.name).toBe("Take home");
    expect(p.rounds.map((r) => r.state)).toEqual(["above_bar", "below_bar", "stopped", "stopped"]);
    expect(p.waitingOn).toBe("decision");
    expect(p.readyForDecision).toBe(true);
    expect(progressLine(p)).toBe("Stopped after Take home");
    expect(strip(p)).toEqual(["above", "below", "off", "off"]);
  });

  it("is ready for a decision after the last round, without a next step (Lena)", () => {
    const p = planProgress([round("Intro chat", [above], { nextStep: "advance" }), round("Coding round", [above], { nextStep: "advance" }), round("Behavioural", [above])], "SCREENING");
    expect(p.current).toBeNull();
    expect(p.waitingOn).toBe("decision");
    expect(p.readyForDecision).toBe(true);
    expect(progressLine(p)).toBe("All 3 rounds above bar");
    expect(passNeedsOverride(p)).toBe(false);
  });

  it("explains Pravin: passed by hand while his coding round did not finish", () => {
    const p = planProgress([round("Intro chat", [above], { nextStep: "advance" }), round("Coding round", [dnf]), round("Technical discussion"), round("Behavioural")], "PASSED");
    expect(p.current?.name).toBe("Coding round");
    expect(p.rounds[1].state).toBe("did_not_finish");
    expect(p.waitingOn).toBeNull();
    expect(p.readyForDecision).toBe(false);
    expect(passNeedsOverride(p)).toBe(true);
    expect(strip(p)).toEqual(["above", "dnf", "open", "open"]);
  });

  it("asks for a next step after a did-not-finish, even on the last round", () => {
    const p = planProgress([round("Intro chat", [above], { nextStep: "advance" }), round("Coding round", [dnf])]);
    expect(p.waitingOn).toBe("next_step");
  });

  it("waits on the candidate for an AI interview or take-home, on reviewers after", () => {
    const invited = planProgress([round("AI interview", [{ state: "scheduled", at: null }], { kind: "ai_interview" })]);
    expect(invited.waitingOn).toBe("candidate");
    expect(roundStateLabel(invited.rounds[0].state, "ai_interview")).toBe("Invited");
    const review = planProgress([round("Take home", [{ state: "awaiting_review", at: null }], { kind: "take_home" })]);
    expect(review.waitingOn).toBe("review");
  });

  it("leaves skipped rounds out of the numbering and the strip", () => {
    const p = planProgress([round("Intro chat", [above], { nextStep: "advance" }), round("Take home", [], { kind: "take_home", skipped: true }), round("Coding round", [booked])]);
    expect(p.total).toBe(2);
    expect(p.current?.number).toBe(2);
    expect(strip(p)).toEqual(["above", "scheduled"]);
  });

  it("needs a manual pass while required rounds are open, but not for an optional one", () => {
    const open = planProgress([round("Intro chat", [above], { nextStep: "advance" }), round("Coding round")]);
    expect(passNeedsOverride(open)).toBe(true);
    const optional = planProgress([round("Intro chat", [above], { nextStep: "advance" }), round("Behavioural", [], { required: false })]);
    expect(passNeedsOverride(optional)).toBe(false);
  });

  it("has nothing to wait on without rounds", () => {
    const p = planProgress([]);
    expect(p.waitingOn).toBeNull();
    expect(progressLine(p)).toBe("No rounds yet");
  });
});

describe("templates", () => {
  it("offers only the templates that match the workspace hiring type", () => {
    expect(templatesFor("technical").map((t) => t.key)).toEqual(["quick_technical", "technical"]);
    expect(templatesFor("non_technical").map((t) => t.key)).toEqual(["quick_non_technical", "non_technical"]);
    expect(templatesFor("both")).toHaveLength(4);
  });

  it("gives non-technical plans no coding rounds", () => {
    for (const t of templatesFor("non_technical")) for (const r of t.rounds) expect(roundAllowed("non_technical", r)).toBe(true);
    expect(roundAllowed("non_technical", { kind: "interview", format: "coding" })).toBe(false);
    expect(roundAllowed("non_technical", { kind: "interview", format: "mixed" })).toBe(false);
    expect(roundAllowed("technical", { kind: "interview", format: "coding" })).toBe(true);
  });

  it("builds a plan with the chosen early rounds first, numbered from 1", () => {
    const rows = roundsFromTemplate(templateByKey("technical")!, ["ai_interview", "take_home"]);
    expect(rows.map((r) => r.name)).toEqual(["AI interview", "Take home", "Intro chat", "Coding round", "Technical discussion", "Behavioural"]);
    expect(rows.map((r) => r.order)).toEqual([1, 2, 3, 4, 5, 6]);
    // The quick screen already has its AI interview; it is not added twice.
    expect(roundsFromTemplate(templateByKey("quick_technical")!, ["ai_interview"]).map((r) => r.name)).toEqual(["AI interview", "Coding round"]);
  });

  it("copies plan rounds to a candidate in order", () => {
    const copy = copyRounds([
      { id: "b", order: 5, kind: "interview", name: "Coding round", format: "coding", required: true },
      { id: "a", order: 2, kind: "ai_interview", name: "AI interview", required: true },
    ]);
    expect(copy.map((r) => [r.planRoundId, r.order, r.name])).toEqual([
      ["a", 1, "AI interview"],
      ["b", 2, "Coding round"],
    ]);
  });
});

describe("roundsFromHistory", () => {
  it("rebuilds rounds in date order, moving past every round but the last", () => {
    const rounds = roundsFromHistory([
      { key: "s2", kind: "interview", format: "coding", at: "2026-09-29T09:00:00Z", attempt: dnf },
      { key: "ai", kind: "ai_interview", format: null, at: "2026-09-18T09:00:00Z", attempt: above },
      { key: "gone", kind: "interview", format: "intro", at: "2026-09-19T09:00:00Z", attempt: { state: "cancelled", at: null } },
      { key: "s1", kind: "interview", format: "intro", at: "2026-09-24T09:00:00Z", attempt: above },
    ]);
    expect(rounds.map((r) => [r.key, r.order, r.name, r.nextStep])).toEqual([
      ["ai", 1, "AI interview", "advance"],
      ["s1", 2, "Intro chat", "advance"],
      ["s2", 3, "Coding round", null],
    ]);
  });

  it("does not move past a round that has no result yet", () => {
    const rounds = roundsFromHistory([
      { key: "a", kind: "take_home", format: null, at: "2026-09-20T09:00:00Z", attempt: { state: "in_progress", at: null } },
      { key: "b", kind: "interview", format: "coding", at: "2026-09-21T09:00:00Z", attempt: booked },
    ]);
    expect(rounds[0].nextStep).toBeNull();
  });
});

describe("attemptFromResult", () => {
  const r = {
    kind: "interview" as const,
    state: "scored" as const,
    passed: true,
    sentAt: "2026-09-20T09:00:00Z",
    startedAt: null,
    finishedAt: "2026-09-24T10:00:00Z",
    scheduledAt: "2026-09-24T09:00:00Z",
  };

  it("maps scored results by their pass flag and keeps the finish time", () => {
    expect(attemptFromResult(r, undefined, now)).toEqual({ state: "above_bar", at: "2026-09-24T10:00:00Z" });
    expect(attemptFromResult({ ...r, passed: false }, undefined, now).state).toBe("below_bar");
  });

  it("drops cancelled sessions and reads a left-early verdict as did not finish", () => {
    expect(attemptFromResult(r, { status: "cancelled", verdict: null }, now).state).toBe("cancelled");
    expect(attemptFromResult({ ...r, passed: false }, { status: "completed", verdict: "left_in_between" }, now).state).toBe("did_not_finish");
  });

  it("treats an unheld interview long past its time as did not finish, and invites as invited", () => {
    expect(attemptFromResult({ ...r, state: "invited", finishedAt: null }, undefined, now).state).toBe("did_not_finish");
    expect(attemptFromResult({ ...r, state: "invited", finishedAt: null, scheduledAt: "2026-10-02T09:00:00Z" }, undefined, now).state).toBe("scheduled");
    expect(attemptFromResult({ ...r, kind: "ai_screening", state: "invited", finishedAt: null }, undefined, now).state).toBe("invited");
    expect(attemptFromResult({ ...r, kind: "take_home", state: "expired" }, undefined, now).state).toBe("did_not_finish");
    expect(attemptFromResult({ ...r, kind: "take_home", state: "submitted" }, undefined, now).state).toBe("awaiting_review");
  });
});

describe("validatePlan", () => {
  const base = { name: "Backend engineer", roleType: "technical" as const, continuesInAts: false };

  it("cleans names, fills default lengths and numbers rounds in order", () => {
    const res = validatePlan({ ...base, name: "  Backend engineer ", rounds: [{ kind: "ai_interview", name: " AI interview ", required: true }, { kind: "interview", name: "Coding", format: "coding", required: false }] });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.plan.name).toBe("Backend engineer");
    expect(res.plan.rounds.map((r) => [r.order, r.name, r.durationMin, r.required, r.format])).toEqual([
      [1, "AI interview", 5, true, null],
      [2, "Coding", 60, false, "coding"],
    ]);
  });

  it("refuses coding rounds in a non-technical plan and live rounds with no format", () => {
    const coding = validatePlan({ ...base, roleType: "non_technical", rounds: [{ kind: "interview", name: "Coding", format: "coding", required: true }] });
    expect(coding).toEqual({ ok: false, error: "Round 1 is a coding round, which non-technical plans do not have." });
    const noFormat = validatePlan({ ...base, rounds: [{ kind: "interview", name: "Chat", required: true }] });
    expect(noFormat.ok).toBe(false);
  });

  it("checks lengths and pass marks against each kind of round", () => {
    expect(validatePlan({ ...base, rounds: [{ kind: "interview", name: "Intro", format: "intro", durationMin: 5, required: true }] }).ok).toBe(false);
    expect(validatePlan({ ...base, rounds: [{ kind: "take_home", name: "Task", durationMin: 45, required: true }] }).ok).toBe(false);
    expect(validatePlan({ ...base, rounds: [{ kind: "interview", name: "Intro", format: "intro", passMark: 70, required: true }] }).ok).toBe(false);
    const ok = validatePlan({ ...base, rounds: [{ kind: "interview", name: "Intro", format: "intro", passMark: 2.6, required: true }, { kind: "take_home", name: "Task", passMark: 70.4, required: true }] });
    expect(ok.ok && ok.plan.rounds.map((r) => r.passMark)).toEqual([2.5, 70]);
  });

  it("needs a name and at least one round, and rejects a round listed twice", () => {
    expect(validatePlan({ ...base, name: " ", rounds: [{ kind: "take_home", name: "Task", required: true }] }).ok).toBe(false);
    expect(validatePlan({ ...base, rounds: [] }).ok).toBe(false);
    expect(validatePlan({ ...base, rounds: [{ id: "a", kind: "take_home", name: "Task", required: true }, { id: "a", kind: "take_home", name: "Task", required: true }] }).ok).toBe(false);
  });
});

describe("syncRounds", () => {
  const plan: PlanRoundRow[] = [
    { id: "p1", order: 1, kind: "ai_interview", name: "AI interview", durationMin: 5, required: true },
    { id: "p2", order: 2, kind: "interview", name: "Coding round", format: "coding", durationMin: 60, required: true },
    { id: "p3", order: 3, kind: "interview", name: "Behavioural", format: "behavioural", durationMin: 45, required: true },
  ];
  const row = (id: string, planRoundId: string | null, order: number, held = false, kind: CandidateRoundRow["kind"] = "take_home", format: string | null = null): CandidateRoundRow => ({ id, planRoundId, order, kind, format, skipped: false, held });

  it("gives a candidate with no rounds a full copy of the plan", () => {
    const res = syncRounds(plan, []);
    expect(res.create.map((r) => [r.planRoundId, r.order, r.skipped])).toEqual([["p1", 1, false], ["p2", 2, false], ["p3", 3, false]]);
    expect(res.update).toEqual([]);
    expect(res.remove).toEqual([]);
  });

  it("updates unheld rounds from the plan and leaves held ones as they are", () => {
    const res = syncRounds(plan, [row("c1", "p1", 1, true), row("c2", "p2", 2), row("c3", "p3", 3)]);
    expect(res.create).toEqual([]);
    expect(res.remove).toEqual([]);
    expect(res.update.map((u) => [u.id, u.order, u.fields?.name])).toEqual([["c2", 2, "Coding round"], ["c3", 3, "Behavioural"]]);
  });

  it("removes unheld rounds from an old plan but keeps held ones and rounds added by hand", () => {
    const res = syncRounds(plan, [row("old1", "x1", 1, true), row("old2", "x2", 2), row("hand", null, 3)]);
    expect(res.remove).toEqual(["old2"]);
    // The held round stays first and needs no change; the hand-added one moves up.
    expect(res.update.map((u) => [u.id, u.order, u.fields])).toEqual([["hand", 2, undefined]]);
    expect(res.create.map((c) => [c.planRoundId, c.order])).toEqual([["p1", 3], ["p2", 4], ["p3", 5]]);
    // Nothing held after them, so the new rounds stay open.
    expect(res.create.every((c) => !c.skipped)).toBe(true);
  });

  it("adds a new plan round before a held one as skipped, so no one is sent back", () => {
    const res = syncRounds(plan, [row("c2", "p2", 1, true), row("c3", "p3", 2)]);
    expect(res.create).toHaveLength(1);
    expect(res.create[0]).toMatchObject({ planRoundId: "p1", order: 1, skipped: true });
    expect(res.update.map((u) => [u.id, u.order])).toEqual([["c2", 2], ["c3", 3]]);
  });

  it("counts a held round from before the plan as the matching plan round", () => {
    // Rebuilt from history: an AI interview and a coding round already held.
    const res = syncRounds(plan, [row("h1", null, 1, true, "ai_interview"), row("h2", null, 2, true, "interview", "coding")]);
    expect(res.update).toEqual([
      { id: "h1", order: 1, planRoundId: "p1" },
      { id: "h2", order: 2, planRoundId: "p2" },
    ]);
    expect(res.create.map((c) => [c.planRoundId, c.order, c.skipped])).toEqual([["p3", 3, false]]);
  });

  it("does not match a held round to a plan round of another format", () => {
    const res = syncRounds(plan, [row("h1", null, 1, true, "interview", "behavioural")]);
    // Behavioural matches p3, so the AI interview and coding round before it are added as skipped.
    expect(res.update).toEqual([{ id: "h1", order: 3, planRoundId: "p3" }]);
    expect(res.create.map((c) => [c.planRoundId, c.order, c.skipped])).toEqual([["p1", 1, true], ["p2", 2, true]]);
  });

  it("counts a held live interview of unknown format as the next live round", () => {
    const res = syncRounds(plan, [row("h1", null, 1, true, "ai_interview"), row("h2", null, 2, true, "interview", null)]);
    expect(res.update.map((u) => [u.id, u.planRoundId])).toEqual([["h1", "p1"], ["h2", "p2"]]);
    expect(res.create.map((c) => c.planRoundId)).toEqual(["p3"]);
  });
});
