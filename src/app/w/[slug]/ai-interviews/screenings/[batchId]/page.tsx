import { notFound } from "next/navigation";
import { loadAiAccess } from "../../_lib";
import { loadCreditSummary, loadScreening, loadTalentPool } from "@/lib/ai-interview/console-server";
import ScreeningCompare from "../../_components/ScreeningCompare";

type Props = { params: Promise<{ slug: string; batchId: string }> };

export const metadata = { title: "AI screening — Interviewpad", robots: { index: false, follow: false } };

export default async function AiScreeningComparePage({ params }: Props) {
  const { slug, batchId } = await params;
  const access = await loadAiAccess(slug, `/w/${slug}/ai-interviews/screenings/${batchId}`);
  if ("gate" in access) return access.gate;
  const wsId = access.workspace.id;
  const [screening, credits, pool] = await Promise.all([loadScreening(wsId, batchId), loadCreditSummary(wsId), loadTalentPool(wsId)]);
  if (!screening) notFound();
  return <ScreeningCompare slug={slug} s={screening} credits={credits} pool={pool} canManage={access.canCreate} />;
}
