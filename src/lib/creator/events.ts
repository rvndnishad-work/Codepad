import { prisma } from "@/lib/prisma";

export type SpaceEventKind = "SPACE_VIEW" | "CONTENT_VIEW" | "FOLLOW";

/**
 * Append-only analytics event for a creator space. Fire-and-forget: a stats
 * write must never break a public page render, so failures are logged and
 * swallowed (same defense pattern as the notification triggers).
 */
export async function recordSpaceEvent(event: {
  spaceId: string;
  kind: SpaceEventKind;
  contentType?: string;
  contentId?: string;
  userId?: string | null;
}) {
  try {
    await prisma.spaceEvent.create({
      data: {
        spaceId: event.spaceId,
        kind: event.kind,
        contentType: event.contentType ?? null,
        contentId: event.contentId ?? null,
        userId: event.userId ?? null,
      },
    });
  } catch (err) {
    console.error("[space-event] write failed:", err);
  }
}
