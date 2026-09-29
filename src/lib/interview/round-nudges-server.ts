/**
 * Round nudges: an in-app notification and a "round.waiting" event (Slack,
 * Teams and webhooks that want it) when a round result waits for the
 * recruiter's next step, or a candidate was moved on and their next round is
 * not sent or booked yet. Once per round and reason (CandidateRound.nudgedFor);
 * waits older than two weeks are left alone. Run hourly by
 * /api/cron/round-nudges.
 *
 * Only ever tells people something is waiting. Never moves, passes or stops
 * anyone.
 *
 * Server-only.
 */
import { prisma } from "@/lib/prisma";
import { createNotification, NOTIFICATION_TYPES } from "@/lib/notifications";
import { MANAGER_ROLES } from "@/lib/permissions/role-groups";
import { emitWorkspaceEvent } from "@/lib/events";
import { deciderNames, loadCandidateRounds, summarizeRounds } from "@/lib/interview/rounds-server";
import { inSentence, roundStateLabel } from "@/lib/interview/rounds";
import { nudgeFor, type NudgeKey, type RoundView } from "@/lib/interview/rounds-view";

const MAX_PER_RUN = 200;

/** The notification's words for one nudge. */
export function nudgeText(name: string, key: NudgeKey, round: Pick<RoundView, "name" | "kind" | "state">): { title: string; body: string } {
  if (key === "next_round") {
    return {
      title: `${name}: ${round.name} is not ${round.kind === "interview" ? "booked" : "sent"} yet`,
      body: `They were moved on. ${round.kind === "interview" ? "Book" : "Send"} the ${inSentence(round.name)} so they are not left waiting.`,
    };
  }
  return {
    title: `${name}: ${round.name} needs your next step`,
    body: `${round.name} is ${roundStateLabel(round.state, round.kind).toLowerCase()}. Move them on or stop here.`,
  };
}

export async function sendRoundNudges(now: Date = new Date()): Promise<{ checked: number; sent: number }> {
  // Open candidates with rounds; nudgeFor drops waits that are too new or too old.
  const candidates = await prisma.candidate.findMany({
    where: { stage: { in: ["NEW", "SCREENING"] }, status: { not: "archived" }, rounds: { some: {} } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, workspaceId: true, ownerId: true, workspace: { select: { slug: true } } },
    take: 2000,
  });
  const byWorkspace = new Map<string, { slug: string; list: typeof candidates }>();
  for (const c of candidates) {
    const w = byWorkspace.get(c.workspaceId) ?? { slug: c.workspace.slug, list: [] };
    w.list.push(c);
    byWorkspace.set(c.workspaceId, w);
  }

  let sent = 0;
  for (const [workspaceId, { slug, list }] of byWorkspace) {
    if (sent >= MAX_PER_RUN) break;
    try {
      const loaded = await loadCandidateRounds(workspaceId, slug, list.map((c) => c.id));
      const names = await deciderNames(loaded.values());
      const due = list.flatMap((c) => {
        const cr = loaded.get(c.id);
        const n = cr ? nudgeFor(summarizeRounds(cr, names), now) : null;
        return n ? [{ c, n }] : [];
      });
      if (!due.length) continue;
      const marks = await prisma.candidateRound.findMany({ where: { id: { in: due.map((d) => d.n.round.id) } }, select: { id: true, nudgedFor: true } });
      const already = new Map(marks.map((m) => [m.id, m.nudgedFor]));
      const managers = await prisma.workspaceMember.findMany({ where: { workspaceId, role: { in: [...MANAGER_ROLES] } }, select: { userId: true } });
      const members = new Set((await prisma.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true } })).map((m) => m.userId));

      for (const { c, n } of due) {
        if (sent >= MAX_PER_RUN) break;
        if (already.get(n.round.id) === n.key) continue;
        // Claim it first, so two overlapping runs cannot both send it.
        const claimed = await prisma.candidateRound.updateMany({
          where: { id: n.round.id, OR: [{ nudgedFor: null }, { nudgedFor: { not: n.key } }] },
          data: { nudgedFor: n.key, nudgedAt: now },
        });
        if (!claimed.count) continue;
        sent++;
        const href = `/w/${slug}/candidates/${c.id}`;
        const { title, body } = nudgeText(c.name, n.key, n.round);
        // The candidate's owner when they have one here, otherwise the workspace managers.
        const to = c.ownerId && members.has(c.ownerId) ? [c.ownerId] : managers.map((m) => m.userId);
        await Promise.all(
          to.map((userId) =>
            createNotification({
              userId,
              type: NOTIFICATION_TYPES.ROUND_NEEDS_ACTION,
              title,
              body,
              href,
              payload: { candidateId: c.id, roundId: n.round.id, waiting: n.key },
            }).catch((err) => console.error("[nudge] notification failed:", err)),
          ),
        );
        const total = n.round.number ? (loaded.get(c.id)?.progress.total ?? 0) : 0;
        await emitWorkspaceEvent(workspaceId, "round.waiting", {
          candidate: { id: c.id, name: c.name },
          waiting: n.key,
          round: { id: n.round.id, name: n.round.name, number: n.round.number, total, kind: n.round.kind, state: n.round.state },
          result: n.key === "next_step" ? roundStateLabel(n.round.state, n.round.kind).toLowerCase() : null,
          reportPath: `candidates/${c.id}`,
        });
      }
    } catch (err) {
      console.error(`[nudge] workspace ${workspaceId} failed:`, err);
    }
  }
  return { checked: candidates.length, sent };
}
