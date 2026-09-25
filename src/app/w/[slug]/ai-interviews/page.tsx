import { redirect } from "next/navigation";
import { loadAiAccess } from "./_lib";
import {
  latestSessionForCandidate,
  loadCreditSummary,
  loadQueue,
  loadQueueCounts,
  loadScreeningOptions,
} from "@/lib/ai-interview/console-server";
import { parseQueueSort, parseQueueView } from "@/lib/ai-interview/console";
import { prisma } from "@/lib/prisma";
import { AiHeader } from "./_components/kit";
import ReviewQueue from "./_components/ReviewQueue";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; q?: string; screening?: string; sort?: string; page?: string; candidate?: string; search?: string }>;
};

export const metadata = { title: "AI screening — Interviewpad", robots: { index: false, follow: false } };

export default async function AiScreeningReviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const base = `/w/${slug}/ai-interviews`;
  const access = await loadAiAccess(slug, base);
  if ("gate" in access) return access.gate;
  const wsId = access.workspace.id;

  // Older links opened the console filtered to one candidate: open their latest report.
  if (sp.candidate) {
    const id = await latestSessionForCandidate(wsId, sp.candidate);
    redirect(id ? `${base}/${id}` : base);
  }

  const view = parseQueueView(sp.view);
  const query = {
    view,
    q: (sp.q ?? sp.search ?? "").trim(),
    screening: sp.screening ?? "all",
    sort: parseQueueSort(sp.sort, view),
    page: Math.max(1, Number(sp.page) || 1),
  };

  const [credits, counts, queue, screenings, expiring] = await Promise.all([
    loadCreditSummary(wsId),
    loadQueueCounts(wsId),
    loadQueue(wsId, query),
    loadScreeningOptions(wsId),
    // Unstarted invites closing in the next two days, for the reminder nudge.
    prisma.aIInterviewSession.findMany({
      where: {
        workspaceId: wsId,
        practice: false,
        status: "PENDING",
        startedAt: null,
        reminderSentAt: null,
        expiresAt: { gt: new Date(), lte: new Date(Date.now() + 2 * 86_400_000) },
      },
      select: { id: true, candidateName: true, positionTitle: true },
      orderBy: { expiresAt: "asc" },
      take: 50,
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <AiHeader
        slug={slug}
        active="review"
        counts={{ review: counts.review, screenings: screenings.length }}
        credits={credits}
        canCreate={access.canCreate}
        canBuy={access.canBuy}
        packs={access.packs}
      />
      <ReviewQueue
        slug={slug}
        query={query}
        counts={counts}
        rows={queue.rows}
        total={queue.total}
        pages={queue.pages}
        screenings={screenings}
        expiring={expiring.map((e) => ({ id: e.id, name: e.candidateName, role: e.positionTitle }))}
        canCreate={access.canCreate}
      />
    </div>
  );
}
