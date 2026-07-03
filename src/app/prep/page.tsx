import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getJourneyOverview } from "@/lib/prep-journey/query";
import PrepTrackerClient from "./PrepTrackerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your Prep Journey — Interviewpad",
  description: "Track your day-by-day interview preparation progress.",
};

export default async function PrepPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect("/login?next=/prep");

  const overview = await getJourneyOverview(session.user.id);
  if (!overview) redirect("/prep/new");

  return (
    <div className="min-h-screen bg-bg text-fg">
      <PrepTrackerClient overview={overview} />
    </div>
  );
}
