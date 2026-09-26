import "server-only";
/**
 * Loads the extra data the Overview filters and "Needs your attention" list
 * read (see OverviewExtras). Kept apart from the dashboard page's big query
 * so each part stays small and bounded.
 */
import { prisma } from "@/lib/prisma";
import { countedAttempts, parseIds, takeHomeScore } from "@/lib/take-home/status";
import { takeHomePassMarkOf } from "@/lib/take-home/pass-mark";
import type { OverviewExtras } from "./overview";

const DAY = 86_400_000;
/** Bounces older than this are left to the Emails page. */
const BOUNCE_WINDOW_DAYS = 14;
const DELIVERED = ["delivered", "opened", "clicked"];

export async function loadOverviewExtras(workspaceId: string, now: Date = new Date()): Promise<OverviewExtras> {
  const since = new Date(now.getTime() - BOUNCE_WINDOW_DAYS * DAY);
  const [batches, batched, submitted, finishedLive, emailLogs] = await Promise.all([
    prisma.candidateBatch.findMany({
      where: { workspaceId },
      orderBy: [{ status: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true },
    }),
    prisma.candidate.findMany({
      where: { workspaceId, batchId: { not: null } },
      select: { id: true, batchId: true },
    }),
    // Submitted take-homes: their score and pass mark label the review items.
    prisma.interviewSession.findMany({
      where: { workspaceId, type: "take-home", finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      take: 200,
      select: { id: true, challengeIds: true, takeHomePassMark: true },
    }),
    // Finished live interviews of the last two weeks, with or without a scorecard.
    prisma.interviewSession.findMany({
      where: { workspaceId, type: { not: "take-home" }, finishedAt: { gte: new Date(now.getTime() - BOUNCE_WINDOW_DAYS * DAY) } },
      take: 200,
      select: { id: true, rubric: { select: { id: true } } },
    }),
    prisma.emailLog.findMany({
      where: { workspaceId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, template: true, recipientEmail: true, status: true, createdAt: true, lastEventAt: true },
    }),
  ]);

  // Take-home scores: the first finished attempt per question counts.
  const attempts = submitted.length
    ? await prisma.challengeAttempt.findMany({
        where: { sessionId: { in: submitted.map((s) => s.id) }, status: { in: ["passed", "failed"] } },
        select: { id: true, sessionId: true, challengeId: true, status: true, score: true, startedAt: true, finishedAt: true },
      })
    : [];
  const bySession = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = bySession.get(a.sessionId!) ?? [];
    list.push(a);
    bySession.set(a.sessionId!, list);
  }
  const takeHomeScores: OverviewExtras["takeHomeScores"] = {};
  for (const s of submitted) {
    const ids = parseIds(s.challengeIds);
    const counted = countedAttempts(bySession.get(s.id) ?? [], ids);
    takeHomeScores[s.id] = {
      score: takeHomeScore(ids.map((id) => counted.get(id)?.score)),
      passMark: takeHomePassMarkOf(s.takeHomePassMark),
    };
  }

  // Invites whose latest email to that address bounced (newest first, so the
  // first row seen per address is the latest).
  const seen = new Set<string>();
  const bouncedLogs: typeof emailLogs = [];
  for (const log of emailLogs) {
    const address = log.recipientEmail.toLowerCase();
    if (seen.has(address)) continue;
    if (!/invite/.test(log.template)) continue;
    seen.add(address);
    // A later delivered email to the same address means it was fixed.
    const deliveredLater = emailLogs.some(
      (l) => l.recipientEmail.toLowerCase() === address && DELIVERED.includes(l.status) && l.createdAt > log.createdAt,
    );
    if ((log.status === "bounced" || log.status === "complained") && !deliveredLater) bouncedLogs.push(log);
  }
  const people = bouncedLogs.length
    ? await prisma.candidate.findMany({
        where: { workspaceId, email: { in: bouncedLogs.map((l) => l.recipientEmail.toLowerCase()) } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const byEmail = new Map(people.map((p) => [(p.email ?? "").toLowerCase(), p]));

  return {
    batches,
    candidateBatch: Object.fromEntries(batched.map((c) => [c.id, c.batchId!])),
    takeHomeScores,
    scorecardSessionIds: finishedLive.filter((s) => !!s.rubric).map((s) => s.id),
    bounced: bouncedLogs.map((l) => {
      const p = byEmail.get(l.recipientEmail.toLowerCase());
      return {
        id: l.id,
        email: l.recipientEmail,
        template: l.template,
        at: (l.lastEventAt ?? l.createdAt).toISOString(),
        candidateId: p?.id ?? null,
        candidateName: p?.name ?? null,
      };
    }),
    // No connection records failures yet. The ATS sync and Slack work add
    // their error rows here when they land.
    connectionErrors: [],
  };
}
