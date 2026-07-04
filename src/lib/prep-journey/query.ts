/**
 * Server-side read model for Prep Journeys — one fetch powering both the
 * dashboard widget and the /prep tracker page.
 */
import { prisma } from "@/lib/prisma";
import { computeStreak, localDateString } from "./shared";

export interface JourneyItemView {
  id: string;
  day: number;
  position: number;
  itemType: "question" | "challenge" | "scenario";
  refSlug: string;
  title: string;
  technology: string | null;
  difficulty: string | null;
  estMinutes: number;
  completed: boolean;
}

export interface TechProgress {
  technology: string;
  total: number;
  completed: number;
}

export interface JourneyOverview {
  id: string;
  title: string;
  role: string;
  status: string;
  techStack: string[];
  dailyMinutes: number;
  totalDays: number;
  targetDate: string | null;
  timezone: string;
  createdAt: string;
  totalItems: number;
  completedItems: number;
  /** First day that still has incomplete items (catch-up semantics) — the
   *  tracker's "today". Equals totalDays when everything is done. */
  currentDay: number;
  /** Every item of the current day, completed ones included (rendered checked). */
  todayItems: JourneyItemView[];
  /** All items, ordered by (day, position) — for the full tracker. */
  items: JourneyItemView[];
  techProgress: TechProgress[];
  streak: number;
  /** Local "YYYY-MM-DD" today in the journey's timezone. */
  today: string;
  /** date → minutes, most recent ~120 days, for the heatmap. */
  activity: { date: string; minutes: number; items: number }[];
  minutesToday: number;
}

/**
 * The user's most recent non-archived journey with full progress data, or
 * null (→ callers render the "create a journey" CTA). Completed journeys are
 * still returned so the dashboard can celebrate + offer a fresh start.
 */
export async function getJourneyOverview(userId: string): Promise<JourneyOverview | null> {
  const journey = await prisma.prepJourney.findFirst({
    where: { userId, status: { in: ["active", "paused", "completed"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!journey) return null;

  const [rows, activityRows] = await Promise.all([
    prisma.prepJourneyItem.findMany({
      where: { journeyId: journey.id },
      orderBy: [{ day: "asc" }, { position: "asc" }],
      select: {
        id: true,
        day: true,
        position: true,
        itemType: true,
        refSlug: true,
        title: true,
        technology: true,
        difficulty: true,
        estMinutes: true,
        completedAt: true,
      },
    }),
    prisma.prepActivity.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 120,
      select: { date: true, minutes: true, items: true },
    }),
  ]);

  const items: JourneyItemView[] = rows.map((r) => ({
    id: r.id,
    day: r.day,
    position: r.position,
    itemType:
      r.itemType === "challenge" ? "challenge" : r.itemType === "scenario" ? "scenario" : "question",
    refSlug: r.refSlug,
    title: r.title,
    technology: r.technology,
    difficulty: r.difficulty,
    estMinutes: r.estMinutes,
    completed: Boolean(r.completedAt),
  }));

  const completedItems = items.filter((i) => i.completed).length;

  const firstIncomplete = items.find((i) => !i.completed);
  const currentDay = firstIncomplete ? firstIncomplete.day : journey.totalDays;
  const todayItems = items.filter((i) => i.day === currentDay);

  const techTotals = new Map<string, TechProgress>();
  for (const i of items) {
    const tech = i.technology ?? "general";
    const entry = techTotals.get(tech) ?? { technology: tech, total: 0, completed: 0 };
    entry.total += 1;
    if (i.completed) entry.completed += 1;
    techTotals.set(tech, entry);
  }

  const today = localDateString(journey.timezone);
  const activeDates = new Set(activityRows.filter((a) => a.items > 0).map((a) => a.date));

  return {
    id: journey.id,
    title: journey.title,
    role: journey.role,
    status: journey.status,
    techStack: safeParseArray(journey.techStack),
    dailyMinutes: journey.dailyMinutes,
    totalDays: journey.totalDays,
    targetDate: journey.targetDate?.toISOString() ?? null,
    timezone: journey.timezone,
    createdAt: journey.createdAt.toISOString(),
    totalItems: items.length,
    completedItems,
    currentDay,
    todayItems,
    items,
    techProgress: [...techTotals.values()].sort((a, b) => b.total - a.total),
    streak: computeStreak(activeDates, today),
    today,
    activity: activityRows,
    minutesToday: activityRows.find((a) => a.date === today)?.minutes ?? 0,
  };
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}
