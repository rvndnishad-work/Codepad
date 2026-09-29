/**
 * What the hourly recordings cleanup removes, and how. Pure, so it can be
 * tested without a database or a bucket.
 */
import { RECORDING_RETENTION_DAYS, recordingExpiresAt } from "./retention";

/** Rows handled per table per run; the next run picks up the rest. */
export const CLEANUP_BATCH = 500;

/** A live recording still "recording" after this long never finished. */
export const STUCK_RECORDING_HOURS = 6;
export const STUCK_RECORDING_ERROR = "Recording did not finish";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type CleanupCutoffs = {
  now: Date;
  /** Legacy clips (no expiresAt) made before this are past their 7 days. */
  legacyClipsBefore: Date;
  /** Live recordings started before this and still recording are stuck. */
  stuckBefore: Date;
};

export function cleanupCutoffs(now: Date = new Date()): CleanupCutoffs {
  return {
    now,
    legacyClipsBefore: new Date(now.getTime() - RECORDING_RETENTION_DAYS * DAY_MS),
    stuckBefore: new Date(now.getTime() - STUCK_RECORDING_HOURS * HOUR_MS),
  };
}

/** When a clip goes: its expiresAt, or 7 days after it was made for legacy clips. */
export function clipDeletesAt(clip: { createdAt: Date; expiresAt: Date | null }): Date {
  return clip.expiresAt ?? recordingExpiresAt(clip.createdAt);
}

/** True when anything recorded at `at` would have been deleted by `now`. */
export function recordingsWouldBeGone(at: Date | null, now: Date = new Date()): boolean {
  return !!at && now.getTime() - at.getTime() >= RECORDING_RETENTION_DAYS * DAY_MS;
}

export type ExpiredClip = { id: string; storageKey: string | null };

export type ClipCleanupPlan = {
  /** Rows to delete once their objects are gone. */
  deleteIds: string[];
  /** Bucket objects to delete first. */
  objectKeys: string[];
  /** Rows with an object that cannot be deleted now (bucket not set up). Kept for a later run. */
  skipped: number;
};

/**
 * Database-only clips always go. Clips in the bucket go only when the bucket
 * is reachable, so no object is left behind without a row pointing at it.
 */
export function planClipCleanup(rows: ExpiredClip[], bucketReady: boolean): ClipCleanupPlan {
  const deleteIds: string[] = [];
  const objectKeys: string[] = [];
  let skipped = 0;
  for (const r of rows) {
    if (!r.storageKey) {
      deleteIds.push(r.id);
    } else if (bucketReady) {
      deleteIds.push(r.id);
      objectKeys.push(r.storageKey);
    } else {
      skipped++;
    }
  }
  return { deleteIds, objectKeys, skipped };
}

/** Splits ids into chunks for `in` filters. */
export function chunk<T>(list: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be positive");
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
