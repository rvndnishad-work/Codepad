import { describe, expect, it } from "vitest";
import {
  RECORDING_RETENTION_DAYS,
  aiClipKey,
  liveRecordingKey,
  recordingDaysLeft,
  recordingExpiresAt,
  recordingExpiryLabel,
} from "@/lib/recording/retention";

const now = new Date("2026-09-28T12:00:00Z");

describe("recording retention", () => {
  it("keeps recordings for 7 days", () => {
    expect(RECORDING_RETENTION_DAYS).toBe(7);
    expect(recordingExpiresAt(now).toISOString()).toBe("2026-10-05T12:00:00.000Z");
  });

  it("counts whole days left, rounded up", () => {
    const exp = recordingExpiresAt(now);
    expect(recordingDaysLeft(exp, now)).toBe(7);
    expect(recordingDaysLeft(exp, new Date("2026-10-05T11:00:00Z"))).toBe(1);
    expect(recordingDaysLeft(exp, new Date("2026-10-05T12:00:00Z"))).toBe(0);
  });

  it("labels the time left", () => {
    const exp = recordingExpiresAt(now);
    expect(recordingExpiryLabel(exp, now)).toBe("Deletes in 7 days");
    expect(recordingExpiryLabel(exp, new Date("2026-10-05T01:00:00Z"))).toBe("Deletes within a day");
    expect(recordingExpiryLabel(exp, new Date("2026-10-06T00:00:00Z"))).toBe("Deleted");
  });

  it("builds object keys per workspace", () => {
    expect(liveRecordingKey("w1", "s1", "r1")).toBe("live/w1/s1/r1.mp4");
    expect(aiClipKey("w1", "s1", "c1", "audio/webm;codecs=opus")).toBe("ai/w1/s1/c1.webm");
    expect(aiClipKey(null, "s1", "c1", "audio/mp4")).toBe("ai/none/s1/c1.m4a");
  });
});
