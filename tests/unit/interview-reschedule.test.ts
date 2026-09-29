/** Moving and cancelling an interview that has not started. */
import { describe, expect, it } from "vitest";
import { canChangeInterview, localInputValue, mayChangeInterview, newTimeProblem } from "@/lib/interview/reschedule";

const now = new Date("2026-09-29T12:00:00Z");

describe("reschedule", () => {
  it("only changes interviews that are booked and not started", () => {
    expect(canChangeInterview({ status: "scheduled", startedAt: null, finishedAt: null })).toBe(true);
    expect(canChangeInterview({ status: "scheduled", startedAt: now, finishedAt: null })).toBe(false);
    expect(canChangeInterview({ status: "cancelled", startedAt: null, finishedAt: null })).toBe(false);
    expect(canChangeInterview({ status: "completed", startedAt: null, finishedAt: now })).toBe(false);
  });

  it("lets the host, the person who set it up, or an interview manager change it", () => {
    const s = { userId: "host", createdById: "recruiter" };
    expect(mayChangeInterview(s, "host", false)).toBe(true);
    expect(mayChangeInterview(s, "recruiter", false)).toBe(true);
    expect(mayChangeInterview(s, "someone", false)).toBe(false);
    expect(mayChangeInterview(s, "someone", true)).toBe(true);
  });

  it("wants a real time, a little ahead, within a year", () => {
    expect(newTimeProblem(null, now)).toBe("Pick a date and time.");
    expect(newTimeProblem(new Date("nope"), now)).toBe("Pick a date and time.");
    expect(newTimeProblem(new Date("2026-09-29T11:00:00Z"), now)).toMatch(/five minutes/);
    expect(newTimeProblem(new Date("2026-09-29T12:02:00Z"), now)).toMatch(/five minutes/);
    expect(newTimeProblem(new Date("2027-12-01T12:00:00Z"), now)).toMatch(/next year/);
    expect(newTimeProblem(new Date("2026-10-02T09:30:00Z"), now)).toBeNull();
  });

  it("fills the date input in local time", () => {
    const d = new Date(2026, 9, 2, 9, 5);
    expect(localInputValue(null, d)).toBe("2026-10-02T09:05");
    expect(localInputValue(d.toISOString(), now)).toBe("2026-10-02T09:05");
  });
});
