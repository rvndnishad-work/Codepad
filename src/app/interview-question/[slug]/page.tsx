import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Eye, ArrowLeft, Building2, Hash } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CommentSection, { type CommentNode } from "@/components/CommentSection";
import {
  difficultyClasses,
  techLabel,
  parseJsonArray,
  compactNumber,
} from "@/lib/interview-questions/shared";
import JsonLd, { breadcrumb, faqPage } from "../../interview-questions/_components/JsonLd";
import QuestionEngagement from "./QuestionEngagement";
import SaveButton from "./SaveButton";
import HintBox from "./HintBox";
import JsPlayground from "./JsPlayground";

export const dynamic = "force-dynamic";

async function getQuestion(slug: string) {
  return prisma.prepQuestion.findFirst({
    where: { slug, status: "published" },
    include: { company: { select: { name: true, slug: true } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = await getQuestion(slug);
  if (!q) return { title: "Question not found — Interviewpad" };
  return {
    title: q.seoTitle ?? `${q.title} — Interview Question | Interviewpad`,
    description: q.seoDescription ?? (q.description ?? q.title).slice(0, 155),
    alternates: { canonical: `/interview-question/${q.slug}` },
  };
}

export default async function QuestionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = await getQuestion(slug);
  if (!q) notFound();

  const tags = parseJsonArray(q.tags);
  const years = parseJsonArray<number>(q.yearsAsked).sort((a, b) => b - a);
  const examples = parseJsonArray<{ label?: string; code: string; runnable?: boolean }>(
    q.examplesData,
  ).filter((e) => e && typeof e.code === "string" && e.code.trim());
  const isRunnable = q.technology === "javascript";

  const session = await auth().catch(() => null);

  // Follow-ups (same company) + similar (same technology), excluding self.
  const [followUps, similar, commentRows, isAdmin] = await Promise.all([
    q.companyId
      ? prisma.prepQuestion.findMany({
          where: { companyId: q.companyId, status: "published", slug: { not: slug } },
          select: { title: true, slug: true, difficulty: true },
          take: 5,
          orderBy: { views: "desc" },
        })
      : Promise.resolve([]),
    q.technology
      ? prisma.prepQuestion.findMany({
          where: { technology: q.technology, status: "published", slug: { not: slug } },
          select: { title: true, slug: true, difficulty: true },
          take: 5,
          orderBy: { views: "desc" },
        })
      : Promise.resolve([]),
    prisma.prepQuestionComment.findMany({
      where: { questionId: q.id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
    staffCan(session, "content:moderate"),
  ]);

  const comments: CommentNode[] = commentRows.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
  }));

  return (
    <div className="min-h-screen bg-bg text-fg">
      <JsonLd
        data={[
          breadcrumb([
            { name: "Interview Questions", path: "/interview-questions" },
            ...(q.company ? [{ name: q.company.name, path: `/interview-questions/company/${q.company.slug}` }] : []),
            { name: q.title, path: `/interview-question/${q.slug}` },
          ]),
          faqPage([{ question: q.title, answer: (q.answer ?? q.description ?? "").slice(0, 1000) }]),
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: q.title,
            datePublished: q.createdAt.toISOString(),
            dateModified: q.updatedAt.toISOString(),
            author: { "@type": "Organization", name: "Interviewpad" },
          },
        ]}
      />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg transition mb-6">
          <ArrowLeft className="w-4 h-4" />
          Interview Questions
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">{q.title}</h1>
          <span className={`shrink-0 mt-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${difficultyClasses(q.difficulty)}`}>
            {q.difficulty}
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-muted">
          {q.company && (
            <Link href={`/interview-questions/company/${q.company.slug}`} className="flex items-center gap-1.5 hover:text-accent font-bold">
              <Building2 className="w-3.5 h-3.5" /> {q.company.name}
            </Link>
          )}
          {q.technology && (
            <Link href={`/interview-questions/${q.technology}`} className="hover:text-accent font-bold">
              {techLabel(q.technology)}
            </Link>
          )}
          {q.round && <span>{q.round}</span>}
          {years.length > 0 && <span>Asked {years.join(", ")}</span>}
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {compactNumber(q.views)}</span>
        </div>

        {/* Question body */}
        {q.description && (
          <section className="mt-7">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent mb-2">Question</h2>
            <div className="prose-invert"><MarkdownRenderer content={q.description} /></div>
          </section>
        )}

        {/* AI hint — a nudge before the full answer */}
        <div className="mt-5">
          <HintBox slug={q.slug} />
        </div>

        {/* Answer */}
        {q.answer && (
          <section className="mt-8">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent mb-2">Answer</h2>
            <div className="prose-invert"><MarkdownRenderer content={q.answer} /></div>
          </section>
        )}

        {/* Runnable code examples */}
        {examples.length > 0 && (
          <section className="mt-8">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent mb-3">
              {examples.some((e) => isRunnable && e.runnable !== false)
                ? "Code examples — edit & run"
                : "Code examples"}
            </h2>
            <div className="space-y-4">
              {examples.map((ex, i) =>
                isRunnable && ex.runnable !== false ? (
                  <JsPlayground key={i} code={ex.code} label={ex.label} />
                ) : (
                  <div key={i} className="rounded-2xl border border-border bg-surface overflow-hidden">
                    {ex.label && (
                      <div className="px-3.5 py-2 border-b border-border bg-bg/40 text-[11px] font-bold text-muted">
                        {ex.label}
                      </div>
                    )}
                    <pre className="p-3.5 overflow-auto text-[12.5px] font-mono leading-relaxed text-fg/85">
                      <code>{ex.code}</code>
                    </pre>
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        {tags.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 mt-7">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface/50 text-[11px] font-bold text-muted">
                <Hash className="w-3 h-3" />{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-7 flex items-center gap-3 border-t border-border pt-6">
          <QuestionEngagement slug={q.slug} initialLikes={q.likes} />
          <SaveButton
            question={{
              slug: q.slug,
              title: q.title,
              difficulty: q.difficulty,
              technology: q.technology,
              company: q.company?.name ?? null,
            }}
          />
          <span className="text-xs text-muted">Was this helpful?</span>
        </div>

        {/* Follow-up + similar */}
        {(followUps.length > 0 || similar.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
            {followUps.length > 0 && (
              <RelatedList title={q.company ? `More from ${q.company.name}` : "Follow-up questions"} items={followUps} />
            )}
            {similar.length > 0 && (
              <RelatedList title={`Similar ${q.technology ? techLabel(q.technology) : ""} questions`} items={similar} />
            )}
          </div>
        )}

        {/* Discussion */}
        <CommentSection
          postId={q.id}
          initialComments={comments}
          signedIn={!!session?.user?.id}
          currentUserId={session?.user?.id ?? null}
          isAdmin={isAdmin}
          postUrl={`/api/interview-questions/${q.slug}/comments`}
          deleteUrlBase="/api/interview-questions/comments"
          heading="Discussion"
          placeholder="Share your approach, an alternative answer, or a follow-up…"
        />
      </div>
    </div>
  );
}

function RelatedList({ title, items }: { title: string; items: { title: string; slug: string; difficulty: string }[] }) {
  return (
    <div>
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/interview-question/${it.slug}`}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface/40 hover:border-accent/40 transition text-sm"
          >
            <span className="truncate font-medium">{it.title}</span>
            <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${difficultyClasses(it.difficulty)}`}>
              {it.difficulty}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
