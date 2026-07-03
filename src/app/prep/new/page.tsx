import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import JourneyWizard from "./JourneyWizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create your Prep Journey — Interviewpad",
  description: "Build a day-by-day interview prep plan for your tech stack.",
};

export default async function NewJourneyPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/login?next=/prep/new");
  const userId = session.user.id;

  const [countGroups, activeJourney] = await Promise.all([
    prisma.prepQuestion.groupBy({
      by: ["technology"],
      where: { status: "published", technology: { not: null } },
      _count: true,
    }),
    prisma.prepJourney.findFirst({
      where: { userId, status: "active" },
      select: { id: true, title: true },
    }),
  ]);

  const techCounts: Record<string, number> = {};
  for (const g of countGroups) {
    if (g.technology) techCounts[g.technology] = g._count;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <JourneyWizard techCounts={techCounts} activeJourneyTitle={activeJourney?.title ?? null} />
    </div>
  );
}
