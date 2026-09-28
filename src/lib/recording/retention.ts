/**
 * How long recordings are kept, and the object keys they live under. Pure.
 */

/** Recordings are deleted this many days after they are made. */
export const RECORDING_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export function recordingExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + RECORDING_RETENTION_DAYS * DAY_MS);
}

/** Whole days left before deletion, rounded up; 0 once expired. */
export function recordingDaysLeft(expiresAt: Date, now: Date = new Date()): number {
  const ms = expiresAt.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

/** "Deletes in 5 days", "Deletes within a day", or "Deleted". */
export function recordingExpiryLabel(expiresAt: Date, now: Date = new Date()): string {
  const days = recordingDaysLeft(expiresAt, now);
  if (days <= 0) return "Deleted";
  if (days === 1) return "Deletes within a day";
  return `Deletes in ${days} days`;
}

/** Keys are grouped by workspace so one prefix covers a workspace. */
export function liveRecordingKey(workspaceId: string, sessionId: string, recordingId: string): string {
  return `live/${workspaceId}/${sessionId}/${recordingId}.mp4`;
}

export function aiClipKey(workspaceId: string | null, sessionId: string, clipId: string, mime: string): string {
  const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
  return `ai/${workspaceId ?? "none"}/${sessionId}/${clipId}.${ext}`;
}
