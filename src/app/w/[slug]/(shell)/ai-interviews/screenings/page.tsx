import { loadAiAccess } from "../_lib";
import { loadCreditSummary, loadQueueCounts, loadScreenings } from "@/lib/ai-interview/console-server";
import { AiHeader } from "../_components/kit";
import ScreeningsList from "../_components/ScreeningsList";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "AI screenings — Interviewpad", robots: { index: false, follow: false } };

export default async function AiScreeningsPage({ params }: Props) {
  const { slug } = await params;
  const access = await loadAiAccess(slug, `/w/${slug}/ai-interviews/screenings`);
  if ("gate" in access) return access.gate;
  const wsId = access.workspace.id;
  const [credits, counts, screenings] = await Promise.all([loadCreditSummary(wsId), loadQueueCounts(wsId), loadScreenings(wsId)]);
  return (
    <div className="flex flex-col gap-5">
      <AiHeader
        slug={slug}
        active="screenings"
        counts={{ review: counts.review, screenings: screenings.length }}
        credits={credits}
        canCreate={access.canCreate}
        canBuy={access.canBuy}
        packs={access.packs}
      />
      <ScreeningsList slug={slug} rows={screenings} canCreate={access.canCreate} />
    </div>
  );
}
