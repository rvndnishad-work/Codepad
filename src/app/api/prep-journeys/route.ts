import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateJourneyPlan } from "@/lib/prep-journey/generate";
import { rolePreset, DAILY_BUDGETS } from "@/lib/prep-journey/shared";
import { TECHNOLOGIES } from "@/lib/interview-questions/shared";

const VALID_TECHS = new Set<string>(TECHNOLOGIES.map((t) => t.slug));

const createSchema = z.object({
  role: z.enum(["frontend", "backend", "fullstack", "ai-ready", "custom"]),
  techStack: z.array(z.string()).min(1).max(20),
  dailyMinutes: z.number().int(),
  /** Requested plan length when no target date is given. */
  durationDays: z.number().int().min(7).max(90).optional(),
  /** ISO date of the interview — overrides durationDays. */
  targetDate: z.string().datetime().optional().nullable(),
  timezone: z.string().max(64).optional(),
  /** Archive an existing active journey instead of failing with 409. */
  replace: z.boolean().optional(),
});

/** Fetch the caller's active journey (summary only; the tracker page reads richer data via RSC). */
export async function GET() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const journey = await prisma.prepJourney.findFirst({
    where: { userId: session.user.id, status: "active" },
    select: {
      id: true,
      title: true,
      role: true,
      techStack: true,
      dailyMinutes: true,
      totalDays: true,
      targetDate: true,
      status: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ journey });
}

/** Create a journey: validate, generate the day plan, persist plan + items. */
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { role, dailyMinutes, durationDays, targetDate, replace } = parsed.data;

  if (!(DAILY_BUDGETS as readonly number[]).includes(dailyMinutes)) {
    return NextResponse.json({ error: "Invalid daily budget" }, { status: 400 });
  }
  const techStack = [...new Set(parsed.data.techStack)].filter((t) => VALID_TECHS.has(t));
  if (techStack.length === 0) {
    return NextResponse.json({ error: "Pick at least one technology" }, { status: 400 });
  }

  // Validate the timezone by attempting to use it; fall back to UTC.
  let timezone = parsed.data.timezone ?? "UTC";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  } catch {
    timezone = "UTC";
  }

  // One active journey per user: the dashboard widget and completion hooks
  // assume a single unambiguous plan.
  const existing = await prisma.prepJourney.findFirst({
    where: { userId, status: "active" },
    select: { id: true },
  });
  if (existing && !replace) {
    return NextResponse.json(
      { error: "You already have an active journey", code: "ACTIVE_JOURNEY_EXISTS" },
      { status: 409 },
    );
  }

  // Plan length: fit to the target date when given, else the requested duration.
  let target: Date | null = null;
  let totalDays = durationDays ?? 30;
  if (targetDate) {
    target = new Date(targetDate);
    const daysUntil = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
    totalDays = Math.min(90, Math.max(7, daysUntil));
  }

  const plan = await generateJourneyPlan({ techStack, dailyMinutes, totalDays });
  if (plan.items.length === 0) {
    return NextResponse.json(
      { error: "No published content matches that stack yet" },
      { status: 400 },
    );
  }

  const title = `${rolePreset(role).label} Interview Prep`;

  const journey = await prisma.$transaction(async (tx) => {
    if (existing && replace) {
      await tx.prepJourney.update({
        where: { id: existing.id },
        data: { status: "archived" },
      });
    }
    const created = await tx.prepJourney.create({
      data: {
        userId,
        title,
        role,
        techStack: JSON.stringify(techStack),
        dailyMinutes,
        totalDays: plan.totalDays,
        targetDate: target,
        timezone,
      },
      select: { id: true },
    });
    await tx.prepJourneyItem.createMany({
      data: plan.items.map((item) => ({ ...item, journeyId: created.id })),
    });
    return created;
  });

  return NextResponse.json({ id: journey.id, totalDays: plan.totalDays, items: plan.items.length }, { status: 201 });
}
