import { notFound } from "next/navigation";
import { after } from "next/server";
import { HelpCircle, ChevronDown } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RichContent from "@/components/rich-editor/RichContent";
import { hasAccess, getPaywallOptions } from "@/lib/marketplace/access";
import { recordSpaceEvent } from "@/lib/creator/events";
import SpacePaywall from "../../SpacePaywall";
import SpaceCrumb from "../../SpaceCrumb";

type Props = { params: Promise<{ handle: string; slug: string }> };

const DIFF_TONE: Record<string, string> = {
  easy: "text-emerald-500 bg-emerald-500/10",
  medium: "text-amber-500 bg-amber-500/10",
  hard: "text-rose-500 bg-rose-500/10",
};

export async function generateMetadata({ params }: Props) {
  const { handle, slug } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle }, select: { id: true, name: true, published: true } });
  if (!space || !space.published) return {};
  const qa = await prisma.interviewQA.findUnique({
    where: { spaceId_slug: { spaceId: space.id, slug } },
    select: { title: true, summary: true, published: true },
  });
  if (!qa || !qa.published) return {};
  return {
    title: `${qa.title} — ${space.name}`,
    description: qa.summary ?? `Interview prep by ${space.name} on Interviewpad.`,
  };
}

export default async function InterviewViewer({ params }: Props) {
  const { handle, slug } = await params;
  const space = await prisma.creatorSpace.findUnique({
    where: { handle },
    select: { id: true, name: true, avatarUrl: true, published: true },
  });
  if (!space || !space.published) notFound();

  const qa = await prisma.interviewQA.findUnique({
    where: { spaceId_slug: { spaceId: space.id, slug } },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!qa || !qa.published) notFound();

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  if (!(await hasAccess(userId, "INTERVIEW_QA", qa.id))) {
    const options = await getPaywallOptions("INTERVIEW_QA", qa.id);
    if (options) return <SpacePaywall title={qa.title} blurb={qa.summary} options={options} />;
  }

  after(() =>
    recordSpaceEvent({ spaceId: space.id, kind: "CONTENT_VIEW", contentType: "INTERVIEW_QA", contentId: qa.id, userId }),
  );

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <SpaceCrumb handle={handle} name={space.name} avatarUrl={space.avatarUrl} />

      <div className="mt-6">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-500 bg-rose-500/10 border border-rose-500/25 rounded-full px-2.5 py-1">
          <HelpCircle className="w-3 h-3" /> Interview Prep{qa.category ? ` · ${qa.category}` : ""}
        </div>
        <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-fg leading-tight">{qa.title}</h1>
        {qa.summary && <p className="text-muted mt-3 leading-relaxed">{qa.summary}</p>}
        <p className="text-[11px] text-muted mt-2 font-semibold">
          {qa.questions.length} question{qa.questions.length === 1 ? "" : "s"} — click any to reveal the answer.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {qa.questions.map((q, i) => (
          <details
            key={q.id}
            className="group rounded-xl border border-border bg-surface open:border-accent/30 transition-colors"
            open={i === 0}
          >
            <summary className="flex items-start gap-3 px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
              <span className="text-[11px] font-black text-accent/70 tabular-nums mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm font-bold text-fg flex-1 leading-snug">{q.question}</span>
              {q.difficulty && (
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${DIFF_TONE[q.difficulty] ?? "text-muted bg-panel/60"}`}
                >
                  {q.difficulty}
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-muted shrink-0 mt-0.5 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-5 pb-5 pl-[46px]">
              <RichContent
                json={q.answerJson}
                markdown={q.answer}
                className="prose prose-sm dark:prose-invert max-w-none border-t border-border/60 pt-4"
              />
            </div>
          </details>
        ))}
      </div>
    </article>
  );
}
