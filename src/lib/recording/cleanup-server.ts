/**
 * The hourly recordings cleanup (api/cron/recordings): deletes AI interview
 * clips and live interview videos 7 days after they were made, and fails live
 * recordings that never finished. Server only.
 */
import { prisma } from "@/lib/prisma";
import { deleteObjects, r2Config } from "@/lib/storage/r2";
import { CLEANUP_BATCH, STUCK_RECORDING_ERROR, cleanupCutoffs, planClipCleanup } from "./cleanup";

export type RecordingCleanupSummary = {
  clipsDeleted: number;
  /** Expired clips in the bucket left for a later run (bucket not set up, or the delete failed). */
  clipsSkipped: number;
  videosDeleted: number;
  videosSkipped: number;
  videosFailed: number;
  bucketReady: boolean;
};

export async function runRecordingCleanup(now: Date = new Date(), batch = CLEANUP_BATCH): Promise<RecordingCleanupSummary> {
  const cutoffs = cleanupCutoffs(now);
  const cfg = r2Config();
  const summary: RecordingCleanupSummary = { clipsDeleted: 0, clipsSkipped: 0, videosDeleted: 0, videosSkipped: 0, videosFailed: 0, bucketReady: !!cfg };

  // (a) AI interview clips past their 7 days; legacy clips by age.
  const expiredClip = { OR: [{ expiresAt: { lte: now } }, { expiresAt: null, createdAt: { lt: cutoffs.legacyClipsBefore } }] };
  const clips = await prisma.aIInterviewAudio.findMany({
    // Without a bucket only database clips can go; bucket clips would otherwise fill every batch.
    where: cfg ? expiredClip : { AND: [expiredClip, { storageKey: null }] },
    select: { id: true, storageKey: true },
    orderBy: { createdAt: "asc" },
    take: batch,
  });
  const plan = planClipCleanup(clips, !!cfg);
  let deleteIds = plan.deleteIds;
  if (cfg && plan.objectKeys.length) {
    try {
      await deleteObjects(cfg, plan.objectKeys);
    } catch (err) {
      // Keep those rows so the next run retries; database clips still go.
      console.error("[recordings] could not delete expired clips from R2", err);
      const keyed = new Set(clips.filter((c) => c.storageKey).map((c) => c.id));
      deleteIds = deleteIds.filter((id) => !keyed.has(id));
      summary.clipsSkipped += keyed.size;
    }
  }
  if (deleteIds.length) {
    const r = await prisma.aIInterviewAudio.deleteMany({ where: { id: { in: deleteIds } } });
    summary.clipsDeleted = r.count;
  }
  if (!cfg) {
    summary.clipsSkipped += await prisma.aIInterviewAudio.count({ where: { AND: [expiredClip, { storageKey: { not: null } }] } });
    if (summary.clipsSkipped) console.warn(`[recordings] R2 is not configured; ${summary.clipsSkipped} expired clip(s) in the bucket were not deleted`);
  }

  // (b) Live interview videos past their 7 days. The row stays, marked deleted, so the report can say so.
  const expiredVideo = { expiresAt: { lte: now }, status: { not: "deleted" } };
  if (cfg) {
    const videos = await prisma.interviewRecording.findMany({
      where: expiredVideo,
      select: { id: true, storageKey: true },
      orderBy: { expiresAt: "asc" },
      take: batch,
    });
    if (videos.length) {
      try {
        await deleteObjects(cfg, videos.map((v) => v.storageKey).filter(Boolean));
        const r = await prisma.interviewRecording.updateMany({
          where: { id: { in: videos.map((v) => v.id) } },
          data: { status: "deleted", deletedAt: now },
        });
        summary.videosDeleted = r.count;
      } catch (err) {
        console.error("[recordings] could not delete expired videos from R2", err);
        summary.videosSkipped = videos.length;
      }
    }
  } else {
    summary.videosSkipped = await prisma.interviewRecording.count({ where: expiredVideo });
    if (summary.videosSkipped) console.warn(`[recordings] R2 is not configured; ${summary.videosSkipped} expired video(s) were not deleted`);
  }

  // (c) Live recordings that never stopped (egress lost, webhook missed).
  const stuck = await prisma.interviewRecording.updateMany({
    where: { status: "recording", startedAt: { lt: cutoffs.stuckBefore } },
    data: { status: "failed", error: STUCK_RECORDING_ERROR, endedAt: now },
  });
  summary.videosFailed = stuck.count;

  return summary;
}
