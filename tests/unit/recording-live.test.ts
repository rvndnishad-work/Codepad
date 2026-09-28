import { describe, expect, it } from "vitest";
import {
  EGRESS,
  egressOutcome,
  recordingCredits,
  recordingDownloadName,
  recordingDurationLabel,
  recordingRefusal,
  reportRecordingState,
  shortError,
} from "@/lib/recording/live";
import { callFields } from "@/lib/interview/wizard";

describe("recordingCredits", () => {
  it("charges 1 credit per started hour", () => {
    expect(recordingCredits(1)).toBe(1);
    expect(recordingCredits(59 * 60)).toBe(1);
    expect(recordingCredits(3600)).toBe(1);
    expect(recordingCredits(3601)).toBe(2);
    expect(recordingCredits(2 * 3600 + 5)).toBe(3);
  });
  it("charges nothing for an empty or unknown length", () => {
    expect(recordingCredits(0)).toBe(0);
    expect(recordingCredits(null)).toBe(0);
    expect(recordingCredits(undefined)).toBe(0);
    expect(recordingCredits(-10)).toBe(0);
  });
});

describe("recordingRefusal", () => {
  const ok = { configured: true, builtinVideo: true, recordVideo: true, status: "in_progress", candidateConsented: true, credits: 5, active: false };

  it("allows a set-up, consented, funded call", () => {
    expect(recordingRefusal(ok)).toBeNull();
    expect(recordingRefusal({ ...ok, status: "scheduled" })).toBeNull();
    expect(recordingRefusal({ ...ok, credits: 1 })).toBeNull();
  });

  it("names each reason, in order", () => {
    expect(recordingRefusal({ ...ok, active: true })?.code).toBe("already");
    expect(recordingRefusal({ ...ok, configured: false })?.code).toBe("not_set_up");
    expect(recordingRefusal({ ...ok, builtinVideo: false })?.code).toBe("no_builtin_video");
    expect(recordingRefusal({ ...ok, recordVideo: false })?.code).toBe("not_enabled");
    expect(recordingRefusal({ ...ok, status: "completed" })?.code).toBe("closed");
    expect(recordingRefusal({ ...ok, candidateConsented: false })?.code).toBe("no_consent");
    expect(recordingRefusal({ ...ok, credits: 0 })?.code).toBe("no_credits");
    expect(recordingRefusal({ ...ok, credits: -3 })?.message).toMatch(/No AI credits left/);
  });

  it("puts setup before consent, so the host fixes the right thing first", () => {
    expect(recordingRefusal({ ...ok, configured: false, candidateConsented: false, credits: 0 })?.code).toBe("not_set_up");
  });
});

describe("egressOutcome", () => {
  const sec = (n: number) => BigInt(n) * BigInt(1_000_000_000);

  it("maps running and ending egress", () => {
    expect(egressOutcome({ status: EGRESS.STARTING }).status).toBe("recording");
    expect(egressOutcome({ status: EGRESS.ACTIVE }).status).toBe("recording");
    expect(egressOutcome({ status: EGRESS.ENDING }).status).toBe("processing");
  });

  it("reads size and duration (nanoseconds) from the file result", () => {
    const out = egressOutcome({ status: EGRESS.COMPLETE, fileResults: [{ size: BigInt(123456), duration: sec(1800) + BigInt(400_000_000) }] });
    expect(out).toEqual({ status: "ready", sizeBytes: BigInt(123456), seconds: 1800, error: null });
  });

  it("falls back to the egress start and end times", () => {
    const start = sec(1_700_000_000);
    const out = egressOutcome({ status: EGRESS.COMPLETE, startedAt: start, endedAt: start + sec(95), fileResults: [{ size: BigInt(10), duration: BigInt(0) }] });
    expect(out.seconds).toBe(95);
  });

  it("keeps what was saved when the time limit was hit", () => {
    expect(egressOutcome({ status: EGRESS.LIMIT_REACHED, fileResults: [{ size: BigInt(99), duration: sec(60) }] }).status).toBe("ready");
    expect(egressOutcome({ status: EGRESS.LIMIT_REACHED, fileResults: [] }).status).toBe("failed");
  });

  it("fails with a short error", () => {
    const out = egressOutcome({ status: EGRESS.FAILED, error: "  upload   failed\n: access denied " + "x".repeat(400) });
    expect(out.status).toBe("failed");
    expect(out.error!.startsWith("upload failed : access denied")).toBe(true);
    expect(out.error!.length).toBe(200);
    expect(egressOutcome({ status: EGRESS.ABORTED }).error).toMatch(/stopped before anything was saved/);
    expect(shortError("")).toBe("The recording did not finish.");
  });
});

describe("report labels", () => {
  const now = new Date("2026-09-28T12:00:00Z");
  const later = new Date("2026-10-02T12:00:00Z");

  it("shows ready, pending, failed and deleted recordings", () => {
    expect(reportRecordingState({ status: "ready", expiresAt: later, deletedAt: null }, true, now)).toBe("ready");
    expect(reportRecordingState({ status: "ready", expiresAt: later, deletedAt: null }, false, now)).toBe("not_set_up");
    expect(reportRecordingState({ status: "processing", expiresAt: later, deletedAt: null }, true, now)).toBe("processing");
    expect(reportRecordingState({ status: "failed", expiresAt: later, deletedAt: null }, true, now)).toBe("failed");
    expect(reportRecordingState({ status: "deleted", expiresAt: later, deletedAt: now }, true, now)).toBe("deleted");
    // Past its 7 days but the cleanup has not run yet: already shown as deleted.
    expect(reportRecordingState({ status: "ready", expiresAt: now, deletedAt: null }, true, now)).toBe("deleted");
  });

  it("formats durations", () => {
    expect(recordingDurationLabel(null)).toBeNull();
    expect(recordingDurationLabel(30)).toBe("Under a minute");
    expect(recordingDurationLabel(42 * 60)).toBe("42 min");
    expect(recordingDurationLabel(60 * 60)).toBe("1 h");
    expect(recordingDurationLabel(65 * 60)).toBe("1 h 5 min");
  });

  it("names downloads after the candidate and day, without unsafe characters", () => {
    const at = new Date("2026-09-28T09:00:00Z");
    expect(recordingDownloadName("Priya Shah", at)).toBe("Priya Shah interview 2026-09-28.mp4");
    expect(recordingDownloadName('Zoë "Z" <O/Brien>', at)).toBe("Zoë Z O Brien interview 2026-09-28.mp4");
    expect(recordingDownloadName(null, at)).toBe("interview 2026-09-28.mp4");
  });
});

describe("wizard call fields with recording", () => {
  it("sends recordVideo only with built-in video", () => {
    expect(callFields({ call: "builtin", recordVideo: true }, true)).toEqual({ builtinVideo: true, recordVideo: true });
    expect(callFields({ call: "builtin" }, true)).toEqual({ builtinVideo: true });
    expect(callFields({ call: "link", recordVideo: true, meetingUrl: "https://zoom.us/j/1" }, true)).toEqual({ builtinVideo: false, meetingUrl: "https://zoom.us/j/1" });
    expect(callFields({ recordVideo: true }, false)).toEqual({ meetingUrl: undefined });
  });
});
