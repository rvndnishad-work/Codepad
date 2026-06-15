import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ExperienceModerationRow from "./ExperienceModerationRow";

export const metadata = { title: "Interview Experiences — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TABS = ["pending", "published", "approved", "rejected", "all"] as const;

export default async function ExperiencesAdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminAccess("content:curate");
  const { status } = await searchParams;
  const active = (TABS as readonly string[]).includes(status ?? "") ? status! : "pending";

  const experiences = await prisma.prepExperience.findMany({
    where: active === "all" ? {} : { status: active },
    orderBy: { createdAt: "desc" },
    include: { company: { select: { name: true } } },
    take: 100,
  });

  const counts = await prisma.prepExperience.groupBy({ by: ["status"], _count: true });
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <Link href="/admin/interview-questions" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Interview Experiences</h1>

      <div className="flex items-center gap-1 border-b border-border flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/interview-questions/experiences?status=${t}`}
            className={`px-3.5 py-2 text-sm font-bold border-b-2 -mb-px capitalize transition ${
              active === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t}{t !== "all" ? ` (${countFor(t)})` : ""}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {experiences.map((e) => (
          <ExperienceModerationRow
            key={e.id}
            exp={{
              id: e.id,
              companyName: e.company?.name ?? e.companyName ?? null,
              role: e.role,
              experienceLevel: e.experienceLevel,
              location: e.location,
              year: e.year,
              result: e.result,
              process: e.process,
              rounds: e.rounds,
              tips: e.tips,
              status: e.status,
            }}
          />
        ))}
        {experiences.length === 0 && <p className="text-sm text-muted py-10 text-center">No {active} experiences.</p>}
      </div>
    </div>
  );
}
