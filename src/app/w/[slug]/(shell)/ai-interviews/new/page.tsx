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
import { loadWorkspaceSettings } from "@/lib/workspace/settings-server";
import { normalizeWorkspaceSettings, screeningStartValues } from "@/lib/workspace/settings";
import { interviewerLanguageOf } from "@/lib/ai-interview/languages";
import { questionTexts } from "@/lib/ai-interview/questionnaire";
import { DEFAULT_THEORY, theoryMinutes } from "@/lib/ai-interview/theory";
import { FRONTEND_FRAMEWORKS } from "@/lib/interview/stack";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ candidates?: string; from?: string; add?: string; challenges?: string }>;
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

  const [credits, pool, questions, challenges, from, settings] = await Promise.all([
    loadCreditSummary(wsId),
    loadTalentPool(wsId),
    loadQuestionSets(wsId),
    loadChallengePool(wsId),
    sp.from ? loadScreening(wsId, sp.from) : Promise.resolve(null),
    loadWorkspaceSettings(wsId),
  ]);
  // A screening started here begins from Settings > Screening defaults.
  const start = screeningStartValues(settings ?? normalizeWorkspaceSettings({})).ai;
  const theoryStart = { ...DEFAULT_THEORY, recordAudio: start.recordAudio, language: interviewerLanguageOf(start.language) };

  const preselected = (sp.candidates ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => pool.some((c) => c.id === id));

  // ?add=<questionnaire id> comes from the Question library's "Use in AI screening".
  // A questionnaire becomes a theory round; any other team question keeps its own kind.
  const addQ = !from && sp.add ? questions.items.find((q) => q.id === sp.add && q.custom) : undefined;
  const addTheory = addQ?.kind === "conversation";
  // ?challenges=id1,id2 comes from the library's Public questions tab: each
  // picked coding challenge becomes a practical round with that exact challenge.
  const picked = !from && !addQ && sp.challenges
    ? sp.challenges.split(",").flatMap((id) => challenges.filter((c) => c.id === id.trim())).slice(0, 6)
    : [];
  const prefill: Prefill | null = picked.length
    ? {
        title: "",
        engagementLevel: "",
        expiresAfterDays: null,
        reminderAfterDays: start.reminderAfterDays,
        rounds: picked.map((c) => ({
          paradigm: c.paradigm,
          language: c.paradigm === "frontend" ? null : c.languages[0] ?? null,
          frameworkLabel: c.paradigm === "frontend" ? FRONTEND_FRAMEWORKS.find((f) => c.frameworks.includes(f.id))?.label ?? null : null,
          sourceKind: "challenge",
          sourceId: c.id,
          templateId: null,
          estimatedMinutes: start.estimatedMinutes,
          theory: null,
          pinned: true,
        })),
      }
    : addQ
    ? {
        title: "",
        engagementLevel: "",
        expiresAfterDays: null,
        reminderAfterDays: start.reminderAfterDays,
        rounds: [
          {
            paradigm: addTheory ? "theory" : addQ.kind,
            language: addTheory ? null : addQ.language,
            frameworkLabel: addQ.frameworkLabel,
            sourceKind: "scaffold",
            sourceId: null,
            templateId: addQ.id,
            estimatedMinutes: addTheory ? theoryMinutes(theoryStart, questionTexts(addQ.testsCode).length) : addQ.minutes,
            theory: addTheory ? theoryStart : null,
          },
        ],
      }
    : from
    ? {
        title: from.title,
        engagementLevel: from.engagementLevel,
        expiresAfterDays: from.expiresAfterDays,
        reminderAfterDays: from.reminderAfterDays,
        // A copy keeps the original's pass mark, even when that was the standard one.
        passMark: from.passMark,
        rounds: from.roundSpecs,
      }
    : null;

  return (
    <NewScreening
      slug={slug}
      credits={credits}
      pool={pool}
      preselected={preselected}
      questions={questions.items.map((q) => ({
        id: q.id,
        title: q.title,
        kind: q.kind,
        label: q.label,
        minutes: q.minutes,
        custom: q.custom,
        language: q.language,
        frameworkLabel: q.frameworkLabel,
        questionCount: q.kind === "conversation" ? questionTexts(q.testsCode).length : 0,
      }))}
      challenges={challenges.map((c) => ({ id: c.id, title: c.title, difficulty: c.difficulty, paradigm: c.paradigm, languages: c.languages, frameworks: c.frameworks, mine: c.mine }))}
      prefill={prefill}
      canBuy={access.canBuy}
      defaults={{
        passMark: start.passMark,
        expiresAfterDays: start.expiresAfterDays,
        reminderAfterDays: start.reminderAfterDays,
        estimatedMinutes: start.estimatedMinutes,
        recordAudio: start.recordAudio,
        language: start.language,
      }}
    />
  );
}
