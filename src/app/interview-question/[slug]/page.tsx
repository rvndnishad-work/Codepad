import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { notFound } from "next/navigation";
import JsonLd, { breadcrumb, faqPage } from "../../interview-questions/_components/JsonLd";
import QuestionDetailClient from "./QuestionDetailClient";
import type { CommentNode } from "@/components/CommentSection";

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
    <>
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

      <QuestionDetailClient
        q={q}
        followUps={followUps}
        similar={similar}
        initialComments={comments}
        isAdmin={isAdmin}
        currentUserId={session?.user?.id ?? null}
      />
    </>
  );
}
