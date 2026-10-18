import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminAccess } from "@/lib/permissions/staff";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";
import Pagination from "../../Pagination";
import ExperienceList from "./ExperienceList";

export const metadata = { title: "Interview experiences — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/**
 * One public state: "published". Rows still marked "approved" from the old
 * two-step flow were never shown publicly, so they sit in the review queue
 * with the pending ones until someone publishes or rejects them.
 */
const FILTERS: Record<string, { label: string; where: Prisma.PrepExperienceWhereInput }> = {
  pending: { label: "To review", where: { status: { in: ["pending", "approved"] } } },
  published: { label: "Published", where: { status: "published" } },
  rejected: { label: "Rejected", where: { status: "rejected" } },
  all: { label: "All", where: {} },
};

export default async function ExperiencesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireAdminAccess("content:curate");
  const sp = await searchParams;
  const active = sp.status && sp.status in FILTERS ? sp.status : "pending";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.PrepExperienceWhereInput = {
    ...FILTERS[active].where,
    ...(q
      ? {
          OR: [
            { companyName: { contains: q, mode: "insensitive" } },
            { role: { contains: q, mode: "insensitive" } },
            { company: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, experiences, grouped] = await Promise.all([
    prisma.prepExperience.count({ where }),
    prisma.prepExperience.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.prepExperience.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (...s: string[]) =>
    grouped.filter((g) => s.includes(g.status)).reduce((n, g) => n + g._count._all, 0);
  const counts: Record<string, number | undefined> = {
    pending: countOf("pending", "approved"),
    published: countOf("published"),
    rejected: countOf("rejected"),
  };

  const tabHref = (s: string) => {
    const p = new URLSearchParams();
    p.set("status", s);
    if (q) p.set("q", q);
    return `/admin/interview-questions/experiences?${p}`;
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/interview-questions" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="w-4 h-4" /> Questions
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interview experiences</h1>
          <p className="text-sm text-muted mt-1">Stories candidates submit. Published ones show on the company pages.</p>
        </div>
        <form className="flex items-center gap-2">
          <input type="hidden" name="status" value={active} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Company or role"
            className="h-8 w-56 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-border-strong"
          />
        </form>
      </div>

      <UnderlineTabs
        label="Experience status"
        active={active}
        tabs={Object.entries(FILTERS).map(([id, f]) => ({ id, label: f.label, href: tabHref(id), count: counts[id] }))}
      />

      <ExperienceList
        rows={experiences.map((e) => ({
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
          status: e.status === "approved" ? "pending" : e.status,
          createdAt: e.createdAt.toISOString(),
        }))}
        emptyText={q ? "No experiences match." : `Nothing in ${FILTERS[active].label.toLowerCase()}.`}
      />

      <div className="rounded-xl border border-border overflow-hidden empty:hidden">
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          totalItems={total}
          itemsPerPage={PAGE_SIZE}
          baseUrl="/admin/interview-questions/experiences"
          currentParams={{ status: active, q: q || undefined }}
        />
      </div>
    </div>
  );
}
