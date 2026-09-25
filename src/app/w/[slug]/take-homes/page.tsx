import { loadTakeHomes, countRows } from "@/lib/take-home/list-server";
import { paginate, parseReviewView, reviewRows } from "@/lib/take-home/list";
import { relativeTime, plural } from "@/lib/workspace/display";
import { loadTakeHomeAccess, loadTemplateOptions } from "./_lib";
import { TakeHomeHeader } from "./_components/kit";
import ReviewQueue, { type ReviewStat } from "./_components/ReviewQueue";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; q?: string; template?: string; page?: string }>;
};

export const metadata = { title: "Take home — Interviewpad", robots: { index: false, follow: false } };

const MONTH_MS = 30 * 86_400_000;

export default async function TakeHomeReviewPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const base = `/w/${slug}/take-homes`;
  const access = await loadTakeHomeAccess(slug, base);
  const now = new Date();
  const [rows, templates] = await Promise.all([loadTakeHomes(access.workspace.id, now), loadTemplateOptions(access.workspace.id)]);
  const counts = countRows(rows, now);

  const view = parseReviewView(sp.view);
  const q = (sp.q ?? "").trim();
  const template = templates.some((t) => t.id === sp.template) ? sp.template! : "all";
  const listed = reviewRows(rows, view, q, template);
  const page = paginate(listed, Number(sp.page) || 1);
  const decided = rows.filter((r) => r.state === "submitted" && r.decision).length;

  const waiting = reviewRows(rows, "review", "", "all");
  const inProgress = rows.filter((r) => r.state === "in_progress");
  const recent = rows.filter((r) => r.score != null && r.submittedAt && now.getTime() - new Date(r.submittedAt).getTime() < MONTH_MS);
  const avg = recent.length ? Math.round(recent.reduce((n, r) => n + (r.score ?? 0), 0) / recent.length) : null;
  const firstName = (n: string) => n.split(/\s+/)[0] || n;

  const stats: ReviewStat[] = [
    {
      label: "Waiting on you",
      value: String(counts.review),
      hint: waiting[0]?.submittedAt ? `Oldest submitted ${relativeTime(waiting[0].submittedAt, now).toLowerCase()}` : "Nothing waiting",
      tone: counts.review ? "indigo" : "neutral",
    },
    {
      label: "In progress",
      value: String(counts.inProgress),
      hint:
        inProgress.length === 1
          ? `${firstName(inProgress[0].candidate.name)}, ${inProgress[0].answered} of ${inProgress[0].questions} done`
          : inProgress.length
            ? `${plural(inProgress.length, "candidate")} working now`
            : "Nobody working right now",
      tone: "neutral",
    },
    {
      label: "Not started",
      value: String(counts.notStarted),
      hint: counts.expiringSoon ? `${counts.expiringSoon} ${counts.expiringSoon === 1 ? "expires" : "expire"} in 2 days` : "No deadlines close soon",
      tone: counts.expiringSoon ? "warning" : "neutral",
    },
    {
      label: "Average score, 30 days",
      value: avg == null ? "None" : String(avg),
      hint: "The bar is 60",
      tone: "neutral",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <TakeHomeHeader
        slug={slug}
        active="review"
        counts={{ review: counts.review, all: counts.all, templates: templates.length }}
        canCreate={access.canCreate}
      />
      <ReviewQueue
        slug={slug}
        query={{ view, q, template, page: page.page }}
        stats={stats}
        counts={{ review: counts.review, decided }}
        rows={page.rows}
        pages={page.pages}
        total={page.total}
        templates={templates}
        now={now.toISOString()}
        canCreate={access.canCreate}
        empty={rows.length === 0}
      />
    </div>
  );
}
