/**
 * What a read-only share link shows. Built from the recruiter's report by
 * copying only what a hiring manager should see: the score, summary, tests,
 * final code and the conversation. Reference answers, the grader's notes on
 * them, team notes, the candidate's email and the invite token are never
 * copied, so they cannot leak through the page or its serialized props.
 */
import type { ReportChatMessage, ReportData } from "./console-server";
import type { SummarySection } from "./console";
import type { TestRun } from "./report-extras";

export type SharedRound = {
  id: string;
  title: string;
  label: string;
  kind: string;
  minutes: number;
  score: number | null;
  files: Record<string, string>;
  tests: TestRun | null;
  theory: { q: string; answer: string | null; skipped: boolean; score: number | null; followUps: { q: string; a: string }[] }[] | null;
};

export type SharedReport = {
  candidate: { name: string };
  role: string;
  status: string;
  score: number | null;
  passMark: number;
  suggestion: { label: string; tone: string } | null;
  stage: string | null;
  summary: SummarySection[];
  chat: ReportChatMessage[];
  rounds: SharedRound[];
  startedAt: string | null;
  finishedAt: string | null;
};

export function toSharedReport(r: ReportData): SharedReport {
  return {
    candidate: { name: r.candidate.name },
    role: r.role,
    status: r.status,
    score: r.score,
    passMark: r.passMark,
    suggestion: r.suggestion ? { label: r.suggestion.label, tone: r.suggestion.tone } : null,
    stage: r.candidate.stage,
    summary: r.summary,
    chat: r.chat.map((m) => ({ role: m.role, text: m.text, ...(m.roundId ? { roundId: m.roundId } : {}), ...(m.at ? { at: m.at } : {}) })),
    rounds: r.rounds.map((x) => ({
      id: x.id,
      title: x.title,
      label: x.label,
      kind: x.kind,
      minutes: x.minutes,
      score: x.score,
      files: x.kind === "conversation" || x.kind === "theory" ? {} : x.files,
      tests: x.tests,
      theory: x.theory
        ? x.theory.questions.map((q) => ({
            q: q.q,
            answer: q.answer?.a ?? null,
            skipped: q.answer?.skipped ?? false,
            score: typeof q.answer?.grade?.score === "number" ? q.answer.grade.score : null,
            followUps: (q.answer?.followUps ?? []).map((f) => ({ q: f.q, a: f.a })),
          }))
        : null,
    })),
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  };
}
