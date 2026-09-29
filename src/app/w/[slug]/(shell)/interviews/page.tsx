import { prisma } from "@/lib/prisma";
import { loadTakeHomeAccess } from "../take-homes/_lib";
import { formatOf, isInterviewerFor, parsePanel, questionState } from "@/lib/interview/wizard";
import { candidateRoomPath } from "@/lib/interview/room-server";
import { canSeeOthers, isRecommendation, parseCriteria, parseRatings, passMarkOf, scorecardAverage } from "@/lib/interview/scorecard";
import { INTERVIEWER_TAKE, REPORT_CRITERIA } from "@/lib/interview/report-server";
import { INTERVIEW_PASS_RATING } from "@/lib/crm/results";
import { normalizeStage } from "@/lib/crm/stages";
import { interviewOutcome } from "@/lib/interview/list-outcome";
import InterviewsList, { type InterviewRow } from "./InterviewsList";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; q?: string }> };

export const metadata = { title: "Interviews", robots: { index: false, follow: false } };

export default async function InterviewsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace, userId } = await loadTakeHomeAccess(slug, `/w/${slug}/interviews`);
  const sessions = await prisma.interviewSession.findMany({
    // Take-homes are InterviewSession rows too; they live under Take home.
    where: { workspaceId: workspace.id, type: { not: "take-home" } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      title: true,
      candidateName: true,
      candidateId: true,
      type: true,
      status: true,
      verdict: true,
      shortCode: true,
      shareToken: true,
      totalSec: true,
      scheduledAt: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
      format: true,
      panelJson: true,
      createdById: true,
      questionPlan: true,
      questionsOwnerId: true,
      guideTemplateId: true,
      guideJson: true,
      challengeIds: true,
      playgroundIds: true,
      promptScenarioIds: true,
      userId: true,
      user: { select: { name: true, email: true } },
      guests: { select: { id: true, email: true }, orderBy: { createdAt: "asc" } },
      candidate: { select: { stage: true } },
      scorecardPassMark: true,
      scorecardFirst: true,
      rubric: { select: { ratings: true } },
      scorecards: { select: { reviewerKey: true, status: true, criteriaJson: true, ratingsJson: true, recommendation: true } },
    },
  });
  const count = (raw: string) => {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.length : 0;
    } catch {
      return 0;
    }
  };
  const peopleIds = [...new Set(sessions.flatMap((s) => [...parsePanel(s.panelJson), ...(s.questionsOwnerId ? [s.questionsOwnerId] : [])]))];
  const people = peopleIds.length ? await prisma.user.findMany({ where: { id: { in: peopleIds } }, select: { id: true, name: true, email: true } }) : [];
  const nameOf = new Map(people.map((u) => [u.id, u.name ?? u.email ?? "Teammate"]));
  const now = new Date();

  const rows: InterviewRow[] = sessions.map((s) => {
    const done = !!s.finishedAt || s.status === "completed" || s.status === "finished";
    const cancelled = !done && s.status === "cancelled";
    const state: InterviewRow["state"] = done ? "completed" : cancelled ? "cancelled" : s.startedAt ? "live" : "scheduled";
    const questions =
      done || cancelled
        ? "ready"
        : questionState({
            questionPlan: s.questionPlan,
            roundCount: count(s.challengeIds) + count(s.playgroundIds) + count(s.promptScenarioIds),
            guideTemplateId: s.guideTemplateId ?? (s.guideJson ? "bank" : null),
          });
    const scoring = scoringOf(s, userId, nameOf);
    const stage = s.candidateId && s.candidate ? normalizeStage(s.candidate.stage) : null;
    return {
      id: s.id,
      title: s.title,
      candidateName: s.candidateName,
      candidateId: s.candidateId,
      type: s.type,
      state,
      outcome: interviewOutcome(
        { state, questions, scheduledAt: s.scheduledAt?.toISOString() ?? null, stage, cards: { expected: scoring.expected, submitted: scoring.submitted }, rubric: scoring.rubric },
        now,
      ),
      take: s.verdict && INTERVIEWER_TAKE[s.verdict] ? INTERVIEWER_TAKE[s.verdict] : null,
      scoring,
      shortCode: s.shortCode,
      // Only the host and panel open the interviewer side. The share token
      // gives the candidate side, so it is only ever copied, never opened here.
      // Interviewers open the workspace lobby; any member can read a report.
      href: done || cancelled ? `/w/${slug}/interviews/${s.id}/report` : isInterviewerFor(s, userId) || s.createdById === userId ? `/w/${slug}/interviews/${s.id}/lobby` : null,
      // Private, expiring link for the candidate (copied, never opened here).
      candidateLink: s.type === "live" ? candidateRoomPath(s, slug) : `/interview/${s.id}?token=${s.shareToken}`,
      minutes: Math.round(s.totalSec / 60),
      when: (s.finishedAt ?? s.startedAt ?? s.scheduledAt)?.toISOString() ?? (s.format ? null : s.createdAt.toISOString()),
      interviewer: s.user.name ?? s.user.email,
      // Emailed interviewers (no account) show by their address.
      panel: [...parsePanel(s.panelJson).map((id) => nameOf.get(id) ?? "Teammate"), ...s.guests.map((g) => g.email)],
      format: formatOf(s.format)?.label ?? null,
      scheduledAt: s.scheduledAt?.toISOString() ?? null,
      questions,
      questionsOwner: s.questionsOwnerId ? (nameOf.get(s.questionsOwnerId) ?? "A teammate") : null,
      mineToPick: s.questionsOwnerId === userId,
    };
  });

  return <InterviewsList slug={slug} rows={rows} view={sp.view ?? "all"} q={(sp.q ?? "").trim()} />;
}

type ScoringSource = {
  userId: string;
  panelJson: string | null;
  scorecardPassMark: number | null;
  scorecardFirst: boolean;
  user: { name: string | null; email: string | null };
  guests: { id: string; email: string }[];
  rubric: { ratings: string } | null;
  scorecards: { reviewerKey: string; status: string; criteriaJson: string; ratingsJson: string; recommendation: string | null }[];
};

/**
 * Scorecard progress and the panel average for one row. Follows the report's
 * blind rule: a panel member who has not submitted sees who is done, never
 * the scores. Interviews scored with the older end-of-room rubric (1 to 5)
 * show that instead when no panel card exists.
 */
function scoringOf(s: ScoringSource, viewerId: string, nameOf: Map<string, string>): InterviewRow["scoring"] {
  const hostKey = `u:${s.userId}`;
  const reviewers = [
    { key: hostKey, name: s.user.name ?? s.user.email ?? "Host" },
    ...parsePanel(s.panelJson)
      .filter((id) => id !== s.userId)
      .map((id) => ({ key: `u:${id}`, name: nameOf.get(id) ?? "Teammate" })),
    ...s.guests.map((g) => ({ key: `g:${g.id}`, name: g.email })),
  ];
  const submitted = s.scorecards.filter((c) => c.status === "submitted");
  const done = new Set(submitted.map((c) => c.reviewerKey));
  const missing = reviewers.filter((r) => !done.has(r.key)).map((r) => r.name);
  const viewerKey = `u:${viewerId}`;
  const isReviewer = reviewers.some((r) => r.key === viewerKey) || s.scorecards.some((c) => c.reviewerKey === viewerKey);
  const blind = !canSeeOthers({ isReviewer, hasSubmitted: done.has(viewerKey), scorecardFirst: s.scorecardFirst });

  const recs = { yes: 0, unsure: 0, no: 0 };
  const averages: number[] = [];
  for (const c of submitted) {
    if (isRecommendation(c.recommendation)) recs[c.recommendation]++;
    const a = scorecardAverage(parseRatings(c.ratingsJson, parseCriteria(c.criteriaJson)));
    if (a != null) averages.push(a);
  }
  let score: InterviewRow["scoring"]["score"] = averages.length
    ? { value: Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10, of: 4, bar: passMarkOf(s.scorecardPassMark) }
    : null;

  let rubric = false;
  if (!s.scorecards.length && s.rubric) {
    let ratings: Record<string, unknown> = {};
    try {
      ratings = JSON.parse(s.rubric.ratings) ?? {};
    } catch {}
    const vals = REPORT_CRITERIA.map((c) => ratings[c.id]).filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5);
    if (vals.length) {
      rubric = true;
      score = { value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10, of: 5, bar: INTERVIEW_PASS_RATING };
    }
  }

  return {
    expected: reviewers.length,
    submitted: reviewers.length - missing.length,
    missing,
    youOwe: reviewers.some((r) => r.key === viewerKey) && !done.has(viewerKey),
    rubric,
    blind: blind && !rubric,
    score: blind && !rubric ? null : score,
    recs: blind && !rubric ? { yes: 0, unsure: 0, no: 0 } : recs,
  };
}
