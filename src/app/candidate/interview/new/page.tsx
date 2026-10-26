import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { featurePausedPage } from "@/components/FeaturePaused";
import { getInterviewArenaSettings } from "@/lib/settings";
import { loadLibraryFilters } from "@/lib/mock-interview/server";
import type { MockMode } from "@/lib/mock-interview/roles";
import MockSetup from "./MockSetup";

export const metadata = {
  title: "New mock interview",
};

export default async function NewMockInterviewPage({ searchParams }: { searchParams?: Promise<{ mode?: string; role?: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) redirect(`/login?next=${encodeURIComponent("/candidate/interview/new")}`);

  const paused = await featurePausedPage("mock-interviews");
  if (paused) return paused;
  const arena = await getInterviewArenaSettings();
  if (!arena.showMockToDeveloper) redirect("/candidate/interview");

  const sp = searchParams ? await searchParams : {};
  const mode: MockMode | null = sp.mode === "ai" || sp.mode === "peer" ? sp.mode : null;
  const filters = await loadLibraryFilters();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <MockSetup filters={filters} initialMode={mode} initialRole={sp.role ?? null} userName={session.user.name ?? null} />
    </div>
  );
}
