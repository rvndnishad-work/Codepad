import { describe, expect, it } from "vitest";
import {
  CLEANUP_BATCH,
  STUCK_RECORDING_HOURS,
  chunk,
  cleanupCutoffs,
  clipDeletesAt,
  planClipCleanup,
  recordingsWouldBeGone,
} from "@/lib/recording/cleanup";

const now = new Date("2026-09-28T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("cleanupCutoffs", () => {
  it("puts legacy clips 7 days back and stuck recordings 6 hours back", () => {
    const c = cleanupCutoffs(now);
    expect(c.now).toBe(now);
    expect(c.legacyClipsBefore.toISOString()).toBe("2026-09-21T12:00:00.000Z");
    expect(c.stuckBefore.getTime()).toBe(now.getTime() - STUCK_RECORDING_HOURS * 60 * 60 * 1000);
    expect(c.stuckBefore.toISOString()).toBe("2026-09-28T06:00:00.000Z");
  });

  it("uses a batch of 500", () => {
    expect(CLEANUP_BATCH).toBe(500);
  });
});

describe("clipDeletesAt", () => {
  it("uses expiresAt when set", () => {
    const expiresAt = new Date("2026-10-01T00:00:00Z");
    expect(clipDeletesAt({ createdAt: new Date("2026-09-01T00:00:00Z"), expiresAt })).toBe(expiresAt);
  });

  it("gives legacy clips 7 days from when they were made", () => {
    expect(clipDeletesAt({ createdAt: now, expiresAt: null }).toISOString()).toBe("2026-10-05T12:00:00.000Z");
  });
});

describe("recordingsWouldBeGone", () => {
  it("is false without a date", () => {
    expect(recordingsWouldBeGone(null, now)).toBe(false);
  });

  it("is true from 7 days on", () => {
    expect(recordingsWouldBeGone(new Date(now.getTime() - 7 * DAY), now)).toBe(true);
    expect(recordingsWouldBeGone(new Date(now.getTime() - 7 * DAY + 1), now)).toBe(false);
    expect(recordingsWouldBeGone(new Date(now.getTime() - DAY), now)).toBe(false);
  });
});

describe("planClipCleanup", () => {
  const rows = [
    { id: "a", storageKey: null },
    { id: "b", storageKey: "ai/w/s/b.webm" },
    { id: "c", storageKey: "ai/w/s/c.ogg" },
    { id: "d", storageKey: null },
  ];

  it("deletes objects then every row when the bucket is ready", () => {
    expect(planClipCleanup(rows, true)).toEqual({
      deleteIds: ["a", "b", "c", "d"],
      objectKeys: ["ai/w/s/b.webm", "ai/w/s/c.ogg"],
      skipped: 0,
    });
  });

  it("deletes only database clips when the bucket is not set up", () => {
    expect(planClipCleanup(rows, false)).toEqual({ deleteIds: ["a", "d"], objectKeys: [], skipped: 2 });
  });

  it("handles an empty batch", () => {
    expect(planClipCleanup([], true)).toEqual({ deleteIds: [], objectKeys: [], skipped: 0 });
  });
});

describe("chunk", () => {
  it("splits into chunks of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
    expect(chunk(Array.from({ length: 1000 }, (_, i) => i), 500).map((c) => c.length)).toEqual([500, 500]);
  });

  it("rejects a size of zero", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});
