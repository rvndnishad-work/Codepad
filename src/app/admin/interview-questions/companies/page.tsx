import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CompanyManager, { type CompanyRow } from "./CompanyManager";
import { parseJsonArray } from "@/lib/interview-questions/shared";

export const metadata = { title: "Companies — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CompaniesAdminPage() {
  await requireAdminAccess("content:curate");
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { questions: true, experiences: true } } },
  });
  const rows: CompanyRow[] = companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logo: c.logo ?? "",
    description: c.description ?? "",
    website: c.website ?? "",
    industry: c.industry ?? "",
    hiringRoles: parseJsonArray(c.hiringRoles).join(", "),
    questionCount: c._count.questions,
    experienceCount: c._count.experiences,
  }));

  return (
    <div className="space-y-6">
      <Link href="/admin/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Companies</h1>
      <CompanyManager companies={rows} />
    </div>
  );
}
