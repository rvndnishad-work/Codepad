/**
 * Removes recording objects from the bucket when the rows that point at them
 * are deleted (a candidate erased, a session or workspace deleted).
 *
 * Collect the keys before the database delete, delete the rows, then pass
 * the keys to deleteRecordingKeys. Both steps are best effort: a bucket
 * problem is logged and never blocks the database delete. Keys missed here
 * are not retried (their rows are gone), so a 7-day lifecycle rule on the
 * bucket is the backstop.
 *
 * Server only.
 */
import { prisma } from "@/lib/prisma";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { deleteObjects, r2Client, r2Config } from "@/lib/storage/r2";
import { chunk } from "./cleanup";

export type RecordingScope = {
  /** AI interview sessions: their AIInterviewAudio clips. */
  aiSessionIds?: string[];
  /** Live interview sessions: their InterviewRecording videos. */
  interviewSessionIds?: string[];
  /** Everything in a workspace, both kinds. */
  workspaceId?: string;
};

const chunks = <T>(list: T[]) => chunk(list, 1000);

/** Object keys of every clip and video the scope covers. Never throws. */
export async function collectRecordingKeys(scope: RecordingScope): Promise<string[]> {
  const keys = new Set<string>();
  try {
    const aiIds = [...new Set(scope.aiSessionIds ?? [])];
    const liveIds = [...new Set(scope.interviewSessionIds ?? [])];
    for (const ids of chunks(aiIds)) {
      const rows = await prisma.aIInterviewAudio.findMany({ where: { sessionId: { in: ids }, storageKey: { not: null } }, select: { storageKey: true } });
      for (const r of rows) if (r.storageKey) keys.add(r.storageKey);
    }
    for (const ids of chunks(liveIds)) {
      const rows = await prisma.interviewRecording.findMany({
        where: { interviewSessionId: { in: ids }, status: { not: "deleted" } },
        select: { storageKey: true },
      });
      for (const r of rows) if (r.storageKey) keys.add(r.storageKey);
    }
    if (scope.workspaceId) {
      const [clips, videos] = await Promise.all([
        prisma.aIInterviewAudio.findMany({ where: { session: { workspaceId: scope.workspaceId }, storageKey: { not: null } }, select: { storageKey: true } }),
        prisma.interviewRecording.findMany({ where: { workspaceId: scope.workspaceId, status: { not: "deleted" } }, select: { storageKey: true } }),
      ]);
      for (const r of [...clips, ...videos]) if (r.storageKey) keys.add(r.storageKey);
    }
  } catch (err) {
    console.error("[recordings] could not collect object keys", err);
  }
  return [...keys];
}

/** Deletes keys from the bucket. Logs and swallows failures. Returns how many were sent. */
export async function deleteRecordingKeys(keys: string[]): Promise<number> {
  if (!keys.length) return 0;
  const cfg = r2Config();
  if (!cfg) {
    console.warn(`[recordings] R2 is not configured; ${keys.length} recording object(s) were not deleted`);
    return 0;
  }
  try {
    await deleteObjects(cfg, keys);
    return keys.length;
  } catch (err) {
    console.error(`[recordings] could not delete ${keys.length} recording object(s)`, err);
    return 0;
  }
}

/**
 * Collects and deletes in one step, for callers that delete the rows right
 * after. Prefer collect, delete rows, then deleteRecordingKeys when the rows
 * might survive (a failed transaction), so playback never points at a gap.
 */
export async function deleteRecordingObjectsFor(scope: RecordingScope): Promise<number> {
  return deleteRecordingKeys(await collectRecordingKeys(scope));
}

/**
 * Marks the live recordings of these interviews deleted (the rows stay so the
 * report can say so). Used when the interview stays but the person is erased.
 */
export async function markInterviewRecordingsDeleted(interviewSessionIds: string[], now = new Date()): Promise<void> {
  for (const ids of chunks([...new Set(interviewSessionIds)])) {
    await prisma.interviewRecording.updateMany({
      where: { interviewSessionId: { in: ids }, status: { not: "deleted" } },
      data: { status: "deleted", deletedAt: now },
    });
  }
}

/**
 * The bytes of one object, for the few places that must hand over the file
 * itself (a candidate's copy of their data). Null when the bucket is not set
 * up, the object is gone, or it is larger than `maxBytes`.
 */
export async function readRecordingObject(key: string, maxBytes: number): Promise<Uint8Array | null> {
  const cfg = r2Config();
  if (!cfg || maxBytes <= 0) return null;
  try {
    const res = await r2Client(cfg).send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
    if (res.ContentLength != null && res.ContentLength > maxBytes) {
      await res.Body?.transformToWebStream().cancel().catch(() => undefined);
      return null;
    }
    const bytes = await res.Body?.transformToByteArray();
    return bytes && bytes.length <= maxBytes ? bytes : null;
  } catch (err) {
    console.error("[recordings] could not read a recording object", err);
    return null;
  }
}
