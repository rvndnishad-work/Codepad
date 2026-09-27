import { describe, expect, it } from "vitest";
import {
  EMPTY_COUNTS,
  SUBPROCESSORS,
  candidateMatchesRule,
  dataRequestDueAt,
  daysUntil,
  deletionConfirmMatches,
  describeCounts,
  formatBytes,
  isPassedCandidate,
  latestDate,
  normalizeRequestEmail,
  parseRetentionPatch,
  periodLabel,
  planRetentionStep,
  redactMeta,
  retentionCutoff,
  retentionNeedsNewNotice,
  toCsv,
  totalCount,
  withRetentionDefaults,
} from "@/lib/workspace/data-privacy";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-27T02:30:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

describe("retention rule defaults", () => {
  it("fills in every rule, off, with the default periods", () => {
    const rules = withRetentionDefaults([]);
    expect(rules.map((r) => [r.kind, r.enabled, r.amount, r.unit])).toEqual([
      ["INACTIVE_CANDIDATES", false, 12, "MONTHS"],
      ["NOT_PASSED", false, 6, "MONTHS"],
      ["VOICE_RECORDINGS", false, 90, "DAYS"],
      ["CODE_REPLAYS", false, 6, "MONTHS"],
    ]);
  });

  it("keeps saved rows and ignores unknown kinds", () => {
    const rules = withRetentionDefaults([
      { kind: "NOT_PASSED", enabled: true, amount: 3, unit: "MONTHS" },
      { kind: "SOMETHING_ELSE", enabled: true, amount: 1, unit: "DAYS" },
    ]);
    expect(rules).toHaveLength(4);
    expect(rules.find((r) => r.kind === "NOT_PASSED")).toMatchObject({ enabled: true, amount: 3 });
  });
});

describe("parseRetentionPatch", () => {
  it("accepts a whole number in range for the rule unit", () => {
    expect(parseRetentionPatch({ kind: "VOICE_RECORDINGS", enabled: true, amount: 30, unit: "DAYS" })).toEqual({
      ok: true,
      value: { kind: "VOICE_RECORDINGS", enabled: true, amount: 30, unit: "DAYS" },
    });
    expect(parseRetentionPatch({ kind: "NOT_PASSED", enabled: false, amount: "6" })).toMatchObject({ ok: true, value: { amount: 6, unit: "MONTHS" } });
  });

  it("refuses out of range, fractions, wrong units and unknown rules", () => {
    expect(parseRetentionPatch({ kind: "VOICE_RECORDINGS", enabled: true, amount: 3, unit: "DAYS" })).toEqual({
      ok: false,
      error: "Enter a whole number of days from 7 to 3650.",
    });
    expect(parseRetentionPatch({ kind: "NOT_PASSED", enabled: true, amount: 1.5 }).ok).toBe(false);
    expect(parseRetentionPatch({ kind: "NOT_PASSED", enabled: true, amount: 121 }).ok).toBe(false);
    expect(parseRetentionPatch({ kind: "NOT_PASSED", enabled: true, amount: 6, unit: "DAYS" }).ok).toBe(false);
    expect(parseRetentionPatch({ kind: "EVERYTHING", enabled: true, amount: 6 }).ok).toBe(false);
    expect(parseRetentionPatch({ kind: "NOT_PASSED", enabled: "yes", amount: 6 }).ok).toBe(false);
  });
});

describe("planRetentionStep", () => {
  const rule = { enabled: true, amount: 90, unit: "DAYS" as const, noticeSentAt: null, nextNoticeAt: null };

  it("does nothing when the rule is off", () => {
    expect(planRetentionStep({ ...rule, enabled: false }, NOW)).toEqual({ step: "off" });
  });

  it("sends the notice first, announcing what is covered 7 days from now", () => {
    const plan = planRetentionStep(rule, NOW);
    expect(plan.step).toBe("notice");
    if (plan.step !== "notice") return;
    expect(plan.dueAt.toISOString()).toBe("2026-10-04T02:30:00.000Z");
    // 90 days before the due date.
    expect(plan.cutoff.toISOString()).toBe(new Date(plan.dueAt.getTime() - 90 * DAY).toISOString());
  });

  it("waits until the announced date", () => {
    const sent = { ...rule, noticeSentAt: daysAgo(3), nextNoticeAt: new Date(NOW.getTime() + 4 * DAY) };
    expect(planRetentionStep(sent, NOW)).toEqual({ step: "wait", dueAt: sent.nextNoticeAt });
  });

  it("erases on the announced date with the announced cutoff, not a later one", () => {
    const due = daysAgo(1);
    const plan = planRetentionStep({ ...rule, noticeSentAt: daysAgo(8), nextNoticeAt: due }, NOW);
    expect(plan).toEqual({ step: "erase", cutoff: new Date(due.getTime() - 90 * DAY) });
  });
});

describe("retentionNeedsNewNotice", () => {
  const on = { enabled: true, amount: 6, unit: "MONTHS" as const };
  it("keeps the notice when nothing that widens the batch changed", () => {
    expect(retentionNeedsNewNotice(on, { ...on, amount: 12 })).toBe(false);
  });
  it("asks for a new notice when turned on, turned off or made shorter", () => {
    expect(retentionNeedsNewNotice({ ...on, enabled: false }, on)).toBe(true);
    expect(retentionNeedsNewNotice(on, { ...on, enabled: false })).toBe(true);
    expect(retentionNeedsNewNotice(on, { ...on, amount: 3 })).toBe(true);
  });
});

describe("candidate rules", () => {
  const cutoff = daysAgo(180);
  const base = { stage: "SCREENING", status: "active", stageChangedAt: daysAgo(400), updatedAt: daysAgo(400), lastActivityAt: null };

  it("never covers passed candidates, old values included", () => {
    expect(isPassedCandidate({ stage: "PASSED", status: "passed" })).toBe(true);
    expect(isPassedCandidate({ stage: "HIRED", status: "active" })).toBe(true);
    expect(isPassedCandidate({ stage: "NEW", status: "hired" })).toBe(true);
    expect(candidateMatchesRule("INACTIVE_CANDIDATES", { ...base, stage: "PASSED" }, cutoff)).toBe(false);
    expect(candidateMatchesRule("NOT_PASSED", { ...base, stage: "OFFER" }, cutoff)).toBe(false);
  });

  it("inactive: any recent screening or note keeps the candidate", () => {
    expect(candidateMatchesRule("INACTIVE_CANDIDATES", base, cutoff)).toBe(true);
    expect(candidateMatchesRule("INACTIVE_CANDIDATES", { ...base, lastActivityAt: daysAgo(10) }, cutoff)).toBe(false);
    expect(candidateMatchesRule("INACTIVE_CANDIDATES", { ...base, updatedAt: daysAgo(10) }, cutoff)).toBe(false);
  });

  it("not passed: counted from when they were marked not passed", () => {
    const rejected = { ...base, stage: "REJECTED", status: "rejected" };
    expect(candidateMatchesRule("NOT_PASSED", rejected, cutoff)).toBe(true);
    expect(candidateMatchesRule("NOT_PASSED", { ...rejected, stageChangedAt: daysAgo(30) }, cutoff)).toBe(false);
    // Only candidates marked not passed.
    expect(candidateMatchesRule("NOT_PASSED", base, cutoff)).toBe(false);
    // Without a stage date, the last change counts.
    expect(candidateMatchesRule("NOT_PASSED", { ...rejected, stageChangedAt: null, updatedAt: daysAgo(10) }, cutoff)).toBe(false);
  });

  it("latestDate picks the newest and skips blanks", () => {
    expect(latestDate(null, daysAgo(5), undefined, daysAgo(2))).toEqual(daysAgo(2));
    expect(latestDate(null, undefined)).toBeNull();
  });

  it("periods and cutoffs", () => {
    expect(periodLabel(1, "MONTHS")).toBe("1 month");
    expect(periodLabel(90, "DAYS")).toBe("90 days");
    expect(retentionCutoff(6, "MONTHS", NOW)).toEqual(daysAgo(180));
  });
});

describe("data requests", () => {
  it("normalizes emails and rejects junk", () => {
    expect(normalizeRequestEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(normalizeRequestEmail("not an email")).toBeNull();
    expect(normalizeRequestEmail(42)).toBeNull();
  });

  it("is due 30 days after it was made", () => {
    expect(dataRequestDueAt(NOW)).toEqual(new Date(NOW.getTime() + 30 * DAY));
    expect(daysUntil(new Date(NOW.getTime() + 30 * DAY), NOW)).toBe(30);
    expect(daysUntil(daysAgo(2), NOW)).toBe(-2);
  });

  it("describes what was found", () => {
    const counts = { ...EMPTY_COUNTS, candidates: 1, takeHomes: 2, recordings: 1 };
    expect(describeCounts(counts)).toBe("1 candidate record, 2 take homes, 1 voice recording");
    expect(totalCount(counts)).toBe(4);
    expect(describeCounts(EMPTY_COUNTS)).toBe("Nothing");
  });

  it("takes names and emails out of audit meta but keeps everything else", () => {
    const meta = JSON.stringify({ candidateName: "Ada Lovelace", nested: { to: "ADA@example.com" }, list: ["Ada Lovelace", "x"], count: 2 });
    const out = JSON.parse(redactMeta(meta, ["ada lovelace", "ada@example.com"])!);
    expect(out).toEqual({ candidateName: "Erased candidate", nested: { to: "Erased candidate" }, list: ["Erased candidate", "x"], count: 2 });
    expect(redactMeta(meta, ["someone else"])).toBe(meta);
    expect(redactMeta("not json", ["ada"])).toBe("not json");
    expect(redactMeta(null, ["ada"])).toBeNull();
  });
});

describe("export files", () => {
  it("quotes CSV cells and defuses spreadsheet formulas", () => {
    const csv = toCsv(["a", "b", "c"], [{ a: 'say "hi", ok', b: "=SUM(A1)", c: new Date("2026-01-02T03:04:05Z") }, { a: null, b: 3 }]);
    expect(csv).toBe('a,b,c\r\n"say ""hi"", ok",\'=SUM(A1),2026-01-02T03:04:05.000Z\r\n,3,\r\n');
  });

  it("formats sizes", () => {
    expect(formatBytes(null)).toBe("");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});

describe("delete the workspace", () => {
  it("needs the workspace name typed, ignoring case and extra spaces", () => {
    expect(deletionConfirmMatches("  acme   hiring ", "Acme Hiring")).toBe(true);
    expect(deletionConfirmMatches("Acme", "Acme Hiring")).toBe(false);
    expect(deletionConfirmMatches("", "")).toBe(false);
    expect(deletionConfirmMatches(undefined, "Acme")).toBe(false);
  });

  it("lists the subprocessors from the plan", () => {
    expect(SUBPROCESSORS.map((s) => s.name)).toEqual(["Google Gemini", "OpenAI", "Resend", "Stripe", "Vercel", "Neon"]);
  });
});
