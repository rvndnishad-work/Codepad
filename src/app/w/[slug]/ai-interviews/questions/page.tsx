import { loadAiAccess } from "../_lib";
import { loadCreditSummary, loadQuestionSets, loadQueueCounts, loadScreeningOptions } from "@/lib/ai-interview/console-server";
import { AiHeader } from "../_components/kit";
import QuestionSets from "../_components/QuestionSets";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

export const metadata = { title: "AI question sets — Interviewpad", robots: { index: false, follow: false } };

export default async function AiQuestionSetsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { q } = await searchParams;
  const access = await loadAiAccess(slug, `/w/${slug}/ai-interviews/questions`);
  if ("gate" in access) return access.gate;
  const wsId = access.workspace.id;
  const [credits, counts, screenings, sets] = await Promise.all([
    loadCreditSummary(wsId),
    loadQueueCounts(wsId),
    loadScreeningOptions(wsId),
    loadQuestionSets(wsId),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <AiHeader
        slug={slug}
        active="questions"
        counts={{ review: counts.review, screenings: screenings.length }}
        credits={credits}
        canCreate={access.canCreate}
        canBuy={access.canBuy}
        packs={access.packs}
      />
      <QuestionSets slug={slug} sets={sets} canManage={access.canCreate} initialOpen={q ?? null} />
    </div>
  );
}
