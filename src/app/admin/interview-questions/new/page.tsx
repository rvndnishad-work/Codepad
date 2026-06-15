import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import QuestionForm from "../QuestionForm";

export const metadata = { title: "New question — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  await requireAdminAccess("content:curate");
  const companies = await prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <Link href="/admin/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">New interview question</h1>
      <QuestionForm companies={companies} />
    </div>
  );
}
