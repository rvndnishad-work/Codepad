import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import QuestionForm, { type QuestionInitial } from "../QuestionForm";
import { parseJsonArray } from "@/lib/interview-questions/shared";

export const metadata = { title: "Edit question — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAccess("content:curate");
  const { id } = await params;
  const [q, companies] = await Promise.all([
    prisma.prepQuestion.findUnique({ where: { id } }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!q) notFound();

  const initial: QuestionInitial = {
    id: q.id,
    title: q.title,
    description: q.description ?? "",
    answer: q.answer ?? "",
    companyId: q.companyId ?? "",
    technology: q.technology ?? "",
    role: q.role ?? "",
    difficulty: q.difficulty,
    round: q.round ?? "",
    experienceLevel: q.experienceLevel ?? "",
    tags: parseJsonArray(q.tags).join(", "),
    yearsAsked: parseJsonArray<number>(q.yearsAsked).join(", "),
    status: q.status,
    seoTitle: q.seoTitle ?? "",
    seoDescription: q.seoDescription ?? "",
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Edit question</h1>
      <QuestionForm companies={companies} initial={initial} />
    </div>
  );
}
