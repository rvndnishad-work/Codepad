/**
 * Journey completion credit. Called from the signals users already emit —
 * marking a question solved, or a passing challenge submission — so the
 * tracker updates without any duplicate check-off UI.
 */
import { prisma } from "@/lib/prisma";
import { localDateString } from "./shared";

/**
 * Credit a solved question / passed challenge against the user's ACTIVE
 * journey. Sticky by design: un-solving a question later does NOT revert the
 * journey item (progress shouldn't feel revocable). Quiet no-op when the user
 * has no active journey or the slug isn't part of the plan.
 */
export async function recordPrepCompletion(
  userId: string,
  refSlug: string,
  itemType: "question" | "challenge" | "scenario",
): Promise<void> {
  const journey = await prisma.prepJourney.findFirst({
    where: { userId, status: "active" },
    select: { id: true, timezone: true },
  });
  if (!journey) return;

  const items = await prisma.prepJourneyItem.findMany({
    where: { journeyId: journey.id, refSlug, itemType, completedAt: null },
    select: { id: true, estMinutes: true },
  });
  if (items.length === 0) return;

  await prisma.prepJourneyItem.updateMany({
    where: { id: { in: items.map((i) => i.id) } },
    data: { completedAt: new Date() },
  });

  await logActivity(
    userId,
    journey.timezone,
    items.reduce((sum, i) => sum + i.estMinutes, 0),
    items.length,
  );
  await maybeCompleteJourney(journey.id);
}

/** Upsert today's activity row (local calendar day of the journey's timezone). */
export async function logActivity(
  userId: string,
  timezone: string,
  minutes: number,
  items: number,
): Promise<void> {
  const date = localDateString(timezone);
  await prisma.prepActivity.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, minutes, items },
    update: { minutes: { increment: minutes }, items: { increment: items } },
  });
}

/** Flip the journey to "completed" once every item is done. */
export async function maybeCompleteJourney(journeyId: string): Promise<void> {
  const remaining = await prisma.prepJourneyItem.count({
    where: { journeyId, completedAt: null },
  });
  if (remaining === 0) {
    await prisma.prepJourney.update({
      where: { id: journeyId },
      data: { status: "completed" },
    });
  }
}
