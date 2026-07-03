import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, maybeCompleteJourney } from "@/lib/prep-journey/complete";
import { localDateString } from "@/lib/prep-journey/shared";

const toggleSchema = z.object({
  completed: z.boolean(),
});

/**
 * Manual check-off from the tracker. The primary completion path is the
 * automatic hook (Mark Solved / passing challenge submit); this exists so
 * users can credit work done elsewhere without hunting for the toggle.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { completed } = parsed.data;

  const item = await prisma.prepJourneyItem.findFirst({
    where: { id, journey: { userId } },
    select: {
      id: true,
      estMinutes: true,
      completedAt: true,
      journey: { select: { id: true, timezone: true } },
    },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Idempotent: no state change → no activity double-count.
  if (completed === Boolean(item.completedAt)) {
    return NextResponse.json({ ok: true });
  }

  await prisma.prepJourneyItem.update({
    where: { id },
    data: { completedAt: completed ? new Date() : null },
  });

  if (completed) {
    await logActivity(userId, item.journey.timezone, item.estMinutes, 1);
    await maybeCompleteJourney(item.journey.id);
  } else {
    // Un-checking rolls back today's activity without going negative.
    const date = localDateString(item.journey.timezone);
    const activity = await prisma.prepActivity.findUnique({
      where: { userId_date: { userId, date } },
      select: { minutes: true, items: true },
    });
    if (activity) {
      await prisma.prepActivity.update({
        where: { userId_date: { userId, date } },
        data: {
          minutes: Math.max(0, activity.minutes - item.estMinutes),
          items: Math.max(0, activity.items - 1),
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
