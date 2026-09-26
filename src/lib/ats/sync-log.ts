/**
 * The ATS sync log (AtsSyncEvent). Server only. Writing a log row never
 * throws: a logging problem must not fail the import or write-back it
 * describes.
 */
import { prisma } from "@/lib/prisma";

export type SyncDirection = "in" | "out";
/** imported | linked | waiting | sent | failed | info */
export type SyncStatus = "imported" | "linked" | "waiting" | "sent" | "failed" | "info";

export type SyncEventInput = {
  workspaceId: string;
  provider: string;
  direction: SyncDirection;
  status: SyncStatus;
  summary: string;
  detail?: string | null;
  httpStatus?: number | null;
  candidateId?: string | null;
  requestId?: string | null;
};

export async function logSyncEvent(e: SyncEventInput): Promise<string | null> {
  try {
    const row = await prisma.atsSyncEvent.create({
      data: {
        workspaceId: e.workspaceId,
        provider: e.provider,
        direction: e.direction,
        status: e.status,
        summary: e.summary.slice(0, 500),
        detail: e.detail ? e.detail.slice(0, 2000) : null,
        httpStatus: e.httpStatus ?? null,
        candidateId: e.candidateId ?? null,
        requestId: e.requestId ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    console.error("[ats] could not write sync log row:", err);
    return null;
  }
}
