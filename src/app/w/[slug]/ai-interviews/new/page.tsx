import { redirect } from "next/navigation";
import { loadAiAccess } from "../_lib";
import {
  loadChallengePool,
  loadCreditSummary,
  loadQuestionSets,
  loadScreening,
  loadTalentPool,
} from "@/lib/ai-interview/console-server";
import NewScreening, { type Prefill } from "../_components/NewScreening";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ candidates?: string; from?: string }>;
};

export const metadata = { title: "New AI screening — Interviewpad", robots: { index: false, follow: false } };

export default async function NewAiScreeningPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const base = `/w/${slug}/ai-interviews`;
  const access = await loadAiAccess(slug, `${base}/new`);
  if ("gate" in access) return access.gate;
  if (!access.canCreate) redirect(base);
  const wsId = access.workspace.id;

  const [credits, pool, questions, challenges, from] = await Promise.all([
    loadCreditSummary(wsId),
    loadTalentPool(wsId),
    loadQuestionSets(wsId),
    loadChallengePool(wsId),
    sp.from ? loadScreening(wsId, sp.from) : Promise.resolve(null),
  ]);

  const preselected = (sp.candidates ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => pool.some((c) => c.id === id));

  const prefill: Prefill | null = from
    ? {
        title: from.title,
        engagementLevel: from.engagementLevel,
        expiresAfterDays: from.expiresAfterDays,
        reminderAfterDays: from.reminderAfterDays,
        rounds: from.roundSpecs,
      }
    : null;

  return (
    <NewScreening
      slug={slug}
      credits={credits}
      pool={pool}
      preselected={preselected}
      questions={questions.items.map((q) => ({ id: q.id, title: q.title, kind: q.kind, label: q.label, minutes: q.minutes, custom: q.custom, language: q.language }))}
      challenges={challenges.map((c) => ({ id: c.id, title: c.title, difficulty: c.difficulty, paradigm: c.paradigm, languages: c.languages, frameworks: c.frameworks, mine: c.mine }))}
      prefill={prefill}
      canBuy={access.canBuy}
    />
  );
}
