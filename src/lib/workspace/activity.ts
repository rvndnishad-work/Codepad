/**
 * Records when a member last opened the workspace (Members page "Last
 * active"). Server-only. Writes at most once an hour per member: the guarded
 * updateMany is a no-op when another request already wrote recently.
 */
import { prisma } from "@/lib/prisma";
import { ACTIVITY_WRITE_INTERVAL_MS, shouldTouchActivity } from "./members";

export async function touchMemberActivity(
  member: { id: string; lastActiveAt?: Date | null },
  now: Date = new Date(),
): Promise<void> {
  if (!shouldTouchActivity(member.lastActiveAt, now)) return;
  const cutoff = new Date(now.getTime() - ACTIVITY_WRITE_INTERVAL_MS);
  try {
    await prisma.workspaceMember.updateMany({
      where: { id: member.id, OR: [{ lastActiveAt: null }, { lastActiveAt: { lte: cutoff } }] },
      data: { lastActiveAt: now },
    });
  } catch (err) {
    // Never block a page load on this.
    console.error("[member-activity] write failed:", err);
  }
}
