/**
 * Interview scorecards on the server: who is expected to score, loading and
 * saving one interviewer's card, the side-by-side view for the report, and
 * nudging the interviewers who have not submitted. The rules themselves
 * (scale, lock, blind scoring, pass mark) live in scorecard.ts. Server only.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeWorkspaceAuditEntry, WORKSPACE_AUDIT_ACTIONS } from "@/lib/workspace-audit";
import { deliveryOf, type DeliveryStatus } from "./guests";
import { roomViewer, ROOM_SELECT } from "./room-access";
import { loadInterviewReport } from "./report-server";
import { formatOf, parsePanel } from "./wizard";
import {
  canSeeOthers,
  checkWrite,
  cleanRatings,
  deriveCriteria,
  isRecommendation,
  MAX_EVIDENCE,
  nudgeWaitMinutes,
  parseCriteria,
  parseRatings,
  passMarkOf,
  scorecardAverage,
  submitIssues,
  summarisePanel,
  type Criterion,
  type PanelSummary,
  type Ratings,
  type Recommendation,
  type Reviewer,
  type WriteIntent,
} from "./scorecard";

export const memberKey = (userId: string) => `u:${userId}`;
export const guestKey = (guestId: string) => `g:${guestId}`;

const SUBJECT_SELECT = {
  id: true,
  userId: true,
  panelJson: true,
  workspaceId: true,
  title: true,
  format: true,
  type: true,
  candidateName: true,
  candidate: { select: { name: true } },
  scorecardPassMark: true,
  scorecardNudgedAt: true,
} as const;

type Subject = Prisma.InterviewSessionGetPayload<{ select: typeof SUBJECT_SELECT }>;

async function subject(sessionId: string): Promise<Subject | null> {
  return prisma.interviewSession.findUnique({ where: { id: sessionId }, select: SUBJECT_SELECT });
}

const candidateOf = (s: Subject) => s.candidate?.name?.trim() || s.candidateName?.trim() || "the candidate";

/** Everyone expected to submit a scorecard: the host, the panel and the emailed guests, in that order. */
export async function panelReviewers(s: { id: string; userId: string; panelJson: string | null }): Promise<Reviewer[]> {
  const ids = [s.userId, ...parsePanel(s.panelJson).filter((id) => id !== s.userId)];
  const [users, guests] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }),
    prisma.interviewGuest.findMany({ where: { sessionId: s.id }, orderBy: { createdAt: "asc" }, select: { id: true, email: true } }),
  ]);
  const byId = new Map(users.map((u) => [u.id, u]));
  return [
    ...ids.flatMap((id): Reviewer[] => {
      const u = byId.get(id);
      return u ? [{ key: memberKey(u.id), name: u.name?.trim() || u.email || "Teammate", kind: "member", email: u.email }] : [];
    }),
    ...guests.map((g): Reviewer => ({ key: guestKey(g.id), name: g.email, kind: "guest", email: g.email })),
  ];
}

/** The reviewer a signed-in user or an emailed guest is on this interview, or null when they are not on the panel. */
export async function reviewerFor(sessionId: string, who: { userId?: string | null; guestId?: string | null }): Promise<Reviewer | null> {
  const s = await subject(sessionId);
  if (!s || s.type === "take-home") return null;
  const key = who.userId ? memberKey(who.userId) : who.guestId ? guestKey(who.guestId) : null;
  if (!key) return null;
  return (await panelReviewers(s)).find((r) => r.key === key) ?? null;
}

async function criteriaFor(sessionId: string): Promise<Criterion[]> {
  const r = await loadInterviewReport(sessionId);
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: { format: true } });
  return deriveCriteria({
    format: s?.format,
    rounds: r?.rounds.map((x) => ({ key: x.key, title: x.title })) ?? [],
    questions: r?.guide.items.map((i) => i.q) ?? [],
  });
}

export type PanelState = "not_started" | "draft" | "submitted";

export type MyScorecard = {
  sessionId: string;
  title: string;
  formatLabel: string;
  candidateName: string;
  criteria: Criterion[];
  card: {
    ratings: Ratings;
    notes: string;
    recommendation: Recommendation | null;
    status: "draft" | "submitted";
    submittedAt: string | null;
    updatedAt: string;
    amendments: number;
  } | null;
  panel: { key: string; name: string; state: PanelState; you: boolean }[];
  passMark: number;
};

/** One interviewer's card for the scorecard page, with the panel's progress (names and states only). */
export async function loadMyScorecard(sessionId: string, reviewer: Reviewer): Promise<MyScorecard | null> {
  const s = await subject(sessionId);
  if (!s) return null;
  const [reviewers, cards] = await Promise.all([
    panelReviewers(s),
    prisma.interviewScorecard.findMany({
      where: { sessionId },
      select: { reviewerKey: true, status: true, criteriaJson: true, ratingsJson: true, notes: true, recommendation: true, submittedAt: true, updatedAt: true, _count: { select: { edits: true } } },
    }),
  ]);
  const mine = cards.find((c) => c.reviewerKey === reviewer.key) ?? null;
  const criteria = mine ? parseCriteria(mine.criteriaJson) : await criteriaFor(sessionId);
  const state = new Map(cards.map((c) => [c.reviewerKey, c.status === "submitted" ? ("submitted" as const) : ("draft" as const)]));
  return {
    sessionId,
    title: s.title,
    formatLabel: formatOf(s.format)?.label ?? "Live interview",
    candidateName: candidateOf(s),
    criteria,
    card: mine
      ? {
          ratings: parseRatings(mine.ratingsJson, criteria),
          notes: mine.notes ?? "",
          recommendation: isRecommendation(mine.recommendation) ? mine.recommendation : null,
          status: mine.status === "submitted" ? "submitted" : "draft",
          submittedAt: mine.submittedAt?.toISOString() ?? null,
          updatedAt: mine.updatedAt.toISOString(),
          amendments: mine._count.edits,
        }
      : null,
    panel: reviewers.map((r) => ({ key: r.key, name: r.name, state: state.get(r.key) ?? "not_started", you: r.key === reviewer.key })),
    passMark: passMarkOf(s.scorecardPassMark),
  };
}

export type SaveInput = {
  intent: WriteIntent;
  ratings: unknown;
  notes: unknown;
  recommendation: unknown;
  reason?: unknown;
};

export type SaveResult = { ok: true; scorecard: MyScorecard } | { ok: false; error: string; issues?: string[] };

function snapshot(c: { ratings: Ratings; notes: string | null; recommendation: string | null }) {
  return JSON.stringify({ ratings: c.ratings, notes: c.notes ?? "", recommendation: c.recommendation ?? null });
}

/**
 * Saves a draft, submits, or amends a submitted card. Only the author writes
 * their card. A submitted card changes only through "amend", which needs a
 * reason and keeps the before and after.
 */
export async function saveMyScorecard(sessionId: string, reviewer: Reviewer, input: SaveInput): Promise<SaveResult> {
  const s = await subject(sessionId);
  if (!s) return { ok: false, error: "This interview no longer exists." };
  const intent = input.intent;
  const existing = await prisma.interviewScorecard.findUnique({
    where: { sessionId_reviewerKey: { sessionId, reviewerKey: reviewer.key } },
    select: { id: true, reviewerKey: true, status: true, criteriaJson: true, ratingsJson: true, notes: true, recommendation: true },
  });
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const check = checkWrite(existing, reviewer.key, intent, reason);
  if (!check.ok) return check;

  const criteria = existing ? parseCriteria(existing.criteriaJson) : await criteriaFor(sessionId);
  const ratings = cleanRatings(input.ratings, criteria);
  const notes = typeof input.notes === "string" ? input.notes.trim().slice(0, MAX_EVIDENCE) : "";
  const recommendation = isRecommendation(input.recommendation) ? input.recommendation : null;

  if (intent !== "draft") {
    const issues = submitIssues({ criteria, ratings, recommendation });
    if (issues.length) return { ok: false, error: issues.join(" "), issues };
  }

  const data = {
    ratingsJson: JSON.stringify(ratings),
    notes: notes || null,
    recommendation,
    reviewerName: reviewer.name,
  };

  try {
    if (intent === "amend" && existing) {
      const before = snapshot({ ratings: parseRatings(existing.ratingsJson, criteria), notes: existing.notes, recommendation: existing.recommendation });
      const after = snapshot({ ratings, notes, recommendation });
      if (before === after) return { ok: false, error: "Nothing changed. Edit a rating, a note or the recommendation first." };
      await prisma.$transaction([
        prisma.interviewScorecard.update({ where: { id: existing.id }, data }),
        prisma.interviewScorecardEdit.create({
          data: { scorecardId: existing.id, actorKey: reviewer.key, actorName: reviewer.name, reason, beforeJson: before, afterJson: after },
        }),
      ]);
    } else if (existing) {
      // Only a draft moves; a card submitted in another tab a moment ago stays locked.
      const res = await prisma.interviewScorecard.updateMany({
        where: { id: existing.id, status: "draft" },
        data: { ...data, ...(intent === "submit" ? { status: "submitted", submittedAt: new Date() } : {}) },
      });
      if (!res.count) return { ok: false, error: "This scorecard is submitted and locked. Amend it with a reason instead." };
    } else {
      await prisma.interviewScorecard.create({
        data: {
          sessionId,
          reviewerKey: reviewer.key,
          userId: reviewer.kind === "member" ? reviewer.key.slice(2) : null,
          guestId: reviewer.kind === "guest" ? reviewer.key.slice(2) : null,
          criteriaJson: JSON.stringify(criteria),
          ...data,
          status: check.status,
          submittedAt: intent === "submit" ? new Date() : null,
        },
      });
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Your scorecard was saved in another tab. Reload to see it." };
    }
    throw err;
  }

  if (intent !== "draft" && s.workspaceId) {
    void writeWorkspaceAuditEntry({
      workspaceId: s.workspaceId,
      actorUserId: reviewer.kind === "member" ? reviewer.key.slice(2) : null,
      actorEmail: reviewer.email,
      action: intent === "submit" ? WORKSPACE_AUDIT_ACTIONS.INTERVIEW_SCORECARD_SUBMITTED : WORKSPACE_AUDIT_ACTIONS.INTERVIEW_SCORECARD_AMENDED,
      targetType: "interviewSession",
      targetId: sessionId,
      meta: {
        title: s.title,
        candidateName: candidateOf(s),
        reviewer: reviewer.name,
        guest: reviewer.kind === "guest",
        average: scorecardAverage(ratings),
        recommendation,
        ...(intent === "amend" ? { reason } : {}),
      },
    });
  }

  const fresh = await loadMyScorecard(sessionId, reviewer);
  return fresh ? { ok: true, scorecard: fresh } : { ok: false, error: "This interview no longer exists." };
}

// ── Report ──────────────────────────────────────────────────────────────────

export type ReportCard = {
  key: string;
  name: string;
  guest: boolean;
  average: number | null;
  recommendation: Recommendation | null;
  ratings: Ratings;
  notes: string | null;
  submittedAt: string | null;
  edits: { actorName: string; reason: string; at: string }[];
};

export type ReportScorecards = {
  passMark: number;
  passMarkIsDefault: boolean;
  panel: { key: string; name: string; guest: boolean; state: PanelState }[];
  /** True when the viewer is on the panel and has not submitted: others stay hidden. */
  blind: boolean;
  viewer: { key: string | null; state: PanelState | null };
  criteria: Criterion[];
  cards: ReportCard[];
  summary: PanelSummary | null;
  nudgedAt: string | null;
  nudgeWaitMin: number;
};

/**
 * Every submitted card, side by side, for the report. A viewer who is on the
 * panel and has not submitted sees who is done but none of the scores.
 */
export async function loadReportScorecards(sessionId: string, viewer: { userId?: string | null; guestId?: string | null }): Promise<ReportScorecards | null> {
  const s = await subject(sessionId);
  if (!s) return null;
  const [reviewers, rows] = await Promise.all([
    panelReviewers(s),
    prisma.interviewScorecard.findMany({
      where: { sessionId },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
      select: {
        reviewerKey: true,
        reviewerName: true,
        guestId: true,
        status: true,
        criteriaJson: true,
        ratingsJson: true,
        notes: true,
        recommendation: true,
        submittedAt: true,
        edits: { orderBy: { createdAt: "asc" }, select: { actorName: true, reason: true, createdAt: true } },
      },
    }),
  ]);
  const viewerKey = viewer.userId ? memberKey(viewer.userId) : viewer.guestId ? guestKey(viewer.guestId) : null;
  const mine = viewerKey ? rows.find((r) => r.reviewerKey === viewerKey) : undefined;
  const isReviewer = !!viewerKey && (reviewers.some((r) => r.key === viewerKey) || !!mine);
  const hasSubmitted = mine?.status === "submitted";
  const seeAll = canSeeOthers({ isReviewer, hasSubmitted });

  // Criteria in the order they first appear across the cards.
  const criteria: Criterion[] = [];
  const seen = new Set<string>();
  const parsed = rows.map((r) => {
    const c = parseCriteria(r.criteriaJson);
    for (const x of c) if (!seen.has(x.id)) (seen.add(x.id), criteria.push(x));
    return { ...r, ratings: parseRatings(r.ratingsJson, c) };
  });

  const submitted = parsed.filter((r) => r.status === "submitted");
  const state = new Map(parsed.map((r) => [r.reviewerKey, r.status === "submitted" ? ("submitted" as const) : ("draft" as const)]));
  const summary = summarisePanel(
    reviewers,
    parsed.map((r) => ({ reviewerKey: r.reviewerKey, status: r.status, ratings: r.ratings, recommendation: r.recommendation })),
    s.scorecardPassMark,
  );

  return {
    passMark: passMarkOf(s.scorecardPassMark),
    passMarkIsDefault: s.scorecardPassMark == null,
    panel: reviewers.map((r) => ({ key: r.key, name: r.name, guest: r.kind === "guest", state: state.get(r.key) ?? "not_started" })),
    blind: !seeAll,
    viewer: { key: viewerKey, state: isReviewer ? (state.get(viewerKey!) ?? "not_started") : null },
    criteria: seeAll ? criteria : [],
    cards: seeAll
      ? submitted.map((r) => ({
          key: r.reviewerKey,
          name: r.reviewerName,
          guest: !!r.guestId,
          average: scorecardAverage(r.ratings),
          recommendation: isRecommendation(r.recommendation) ? r.recommendation : null,
          ratings: r.ratings,
          notes: r.notes?.trim() || null,
          submittedAt: r.submittedAt?.toISOString() ?? null,
          edits: r.edits.map((e) => ({ actorName: e.actorName, reason: e.reason, at: e.createdAt.toISOString() })),
        }))
      : [],
    summary: seeAll ? summary : null,
    nudgedAt: s.scorecardNudgedAt?.toISOString() ?? null,
    nudgeWaitMin: nudgeWaitMinutes(s.scorecardNudgedAt),
  };
}

// ── Nudge ───────────────────────────────────────────────────────────────────

export type NudgeResult = { ok: true; sent: DeliveryStatus[] } | { ok: false; error: string };

/**
 * Emails every expected interviewer who has not submitted, except the person
 * pressing the button. Members get the workspace scorecard page; guests get
 * their personal `?guest=` link. At most once an hour per interview.
 */
export async function nudgeMissingScorecards(
  sessionId: string,
  actor: { userId: string; email: string | null; name: string },
  origin: string,
): Promise<NudgeResult> {
  const s = await subject(sessionId);
  if (!s || !s.workspaceId) return { ok: false, error: "This interview no longer exists." };
  const wait = nudgeWaitMinutes(s.scorecardNudgedAt);
  if (wait > 0) return { ok: false, error: `A reminder went out recently. You can nudge again in ${wait} min.` };

  const [reviewers, cards, ws, guests] = await Promise.all([
    panelReviewers(s),
    prisma.interviewScorecard.findMany({ where: { sessionId }, select: { reviewerKey: true, status: true } }),
    prisma.workspace.findUnique({ where: { id: s.workspaceId }, select: { name: true, slug: true } }),
    prisma.interviewGuest.findMany({ where: { sessionId }, select: { id: true, token: true } }),
  ]);
  if (!ws) return { ok: false, error: "This interview no longer exists." };
  const status = new Map(cards.map((c) => [c.reviewerKey, c.status]));
  const tokens = new Map(guests.map((g) => [guestKey(g.id), g.token]));
  const targets = reviewers.filter((r) => r.email && status.get(r.key) !== "submitted" && r.key !== memberKey(actor.userId));
  if (!targets.length) return { ok: false, error: "Nobody else is missing a scorecard." };

  const urlFor = (r: Reviewer) =>
    r.kind === "guest"
      ? `${origin}/interview/${s.id}/scorecard?guest=${encodeURIComponent(tokens.get(r.key) ?? "")}`
      : `${origin}/w/${ws.slug}/interviews/${s.id}/scorecard`;

  // Claim the nudge first so two quick presses cannot both send.
  const claimed = await prisma.interviewSession.updateMany({
    where: { id: s.id, scorecardNudgedAt: s.scorecardNudgedAt },
    data: { scorecardNudgedAt: new Date() },
  });
  if (!claimed.count) return { ok: false, error: "A reminder just went out. Try again later." };

  const { sendTemplatedBatch } = await import("@/lib/email");
  const res = await sendTemplatedBatch(
    "scorecard-reminder",
    targets.map((r) => ({
      to: r.email!,
      props: {
        workspaceName: ws.name,
        senderName: actor.name,
        candidateName: candidateOf(s),
        title: s.title,
        hasDraft: status.get(r.key) === "draft",
        scorecardUrl: urlFor(r),
      },
      workspaceId: s.workspaceId!,
      sessionId: s.id,
    })),
  );
  const sent = targets.map((r, i) => deliveryOf(r.email!, res.outcomes?.[i]));
  void writeWorkspaceAuditEntry({
    workspaceId: s.workspaceId,
    actorUserId: actor.userId,
    actorEmail: actor.email,
    action: WORKSPACE_AUDIT_ACTIONS.INTERVIEW_SCORECARDS_NUDGED,
    targetType: "interviewSession",
    targetId: s.id,
    meta: { title: s.title, candidateName: candidateOf(s), to: targets.map((t) => t.name), statuses: sent.map((d) => d.status) },
  });
  return { ok: true, sent };
}

// ── Who is asking ───────────────────────────────────────────────────────────

/**
 * The reviewer behind a request or page: a signed-in host or panel member,
 * or an emailed guest by `?guest=` link or room pass cookie. Null for anyone
 * else, including workspace admins who are not on the panel.
 */
export async function scorecardReviewer(
  sessionId: string,
  a: { userId?: string | null; cookieHeader?: string | null; guestToken?: string | null },
): Promise<Reviewer | null> {
  const s = await prisma.interviewSession.findUnique({ where: { id: sessionId }, select: { ...ROOM_SELECT, type: true } });
  if (!s || !s.workspaceId || s.type === "take-home") return null;
  if (a.userId) {
    const r = await reviewerFor(sessionId, { userId: a.userId });
    if (r) return r;
  }
  const v = await roomViewer(s, { user: null, cookieHeader: a.cookieHeader, guestKey: a.guestToken });
  return v?.role === "interviewer" && v.guestId ? reviewerFor(sessionId, { guestId: v.guestId }) : null;
}
