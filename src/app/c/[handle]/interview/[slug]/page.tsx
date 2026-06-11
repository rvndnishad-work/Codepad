import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { hasAccess, getPaywallOptions } from "@/lib/marketplace/access";
import SpacePaywall from "../../SpacePaywall";

type Props = { params: Promise<{ handle: string; slug: string }> };

const DIFF_TONE: Record<string, string> = {
  easy: "text-emerald-500 bg-emerald-500/10",
  medium: "text-amber-500 bg-amber-500/10",
  hard: "text-rose-500 bg-rose-500/10",
};

export default async function InterviewViewer({ params }: Props) {
  const { handle, slug } = await params;
  const space = await prisma.creatorSpace.findUnique({ where: { handle }, select: { id: true, published: true } });
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

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <Link href={`/c/${handle}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> {handle}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-fg">{qa.title}</h1>
      {qa.summary && <p className="text-muted mt-2">{qa.summary}</p>}
      <div className="mt-8 space-y-6">
        {qa.questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-muted mt-1">Q{i + 1}</span>
              <h3 className="text-base font-semibold text-fg flex-1">{q.question}</h3>
              {q.difficulty && (
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${DIFF_TONE[q.difficulty] ?? "text-muted bg-panel/60"}`}>{q.difficulty}</span>
              )}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none mt-3 pl-6">
              <MarkdownRenderer content={q.answer} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
