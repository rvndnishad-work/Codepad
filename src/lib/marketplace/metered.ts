import { prisma } from "@/lib/prisma";

/** Check metered free views: returns true if user still has free views left this month. */
export async function checkMetered(userId: string | null, contentId: string, meteredFree: number | null): Promise<boolean> {
  if (meteredFree == null || meteredFree <= 0) return false;
  if (!userId) return meteredFree > 0; // anon gets first view free, but we count via cookie — here simple true for first 3
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const views = await prisma.spaceEvent.count({
    where: { userId, contentId, kind: "CONTENT_VIEW", createdAt: { gte: monthStart } },
  });
  return views < meteredFree;
}

/** Record a metered view (called after rendering). */
export async function recordMeteredView(spaceId: string, contentId: string, contentType: string, userId: string | null): Promise<void> {
  try {
    await prisma.spaceEvent.create({ data: { spaceId, kind: "CONTENT_VIEW", contentType, contentId, userId: userId ?? null } });
  } catch {}
}
