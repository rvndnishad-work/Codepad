import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { TECHNOLOGIES, techLabel } from "@/lib/interview-questions/shared";
import { sortTopic } from "@/lib/interview-questions/ordering";
import { DIFFICULTY_ORDER, groupByDifficulty } from "@/lib/interview-questions/topic-catalog";
import ContentTabs from "../../content/_components/ContentTabs";
import OrderEditor from "./OrderEditor";
import TechPicker from "./TechPicker";

export const metadata = { title: "Order questions — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Per-technology ordering of the public study track. Published questions are
 * shown in the order learners see them, grouped Easy / Medium / Hard; the
 * admin drags or nudges rows, optionally asks the model for a teaching
 * order, and saves. Rows never ordered keep sorting by views after ordered
 * ones, so a topic can be curated band by band.
 */
export default async function OrderQuestionsPage({ searchParams }: { searchParams: Promise<{ tech?: string }> }) {
  await requireAdminAccess("content:curate");
  const { tech: raw } = await searchParams;
  const tech = TECHNOLOGIES.some((t) => t.slug === raw) ? raw! : TECHNOLOGIES[0].slug;

  const [rows, counts] = await Promise.all([
    prisma.prepQuestion.findMany({
      where: { technology: tech, status: "published" },
      select: { slug: true, title: true, difficulty: true, views: true, sortOrder: true },
      take: 1000,
    }),
    prisma.prepQuestion.groupBy({ by: ["technology"], where: { status: "published" }, _count: true }),
  ]);
  const grouped = groupByDifficulty(sortTopic(rows));
  const bands = Object.fromEntries(
    DIFFICULTY_ORDER.map((d) => [d, grouped[d].map((q) => ({ slug: q.slug, title: q.title, views: q.views, ordered: q.sortOrder != null }))]),
  ) as Record<(typeof DIFFICULTY_ORDER)[number], { slug: string; title: string; views: number; ordered: boolean }[]>;
  const countByTech = new Map(counts.map((c) => [c.technology ?? "", c._count]));

  return (
    <div className="space-y-6">
      <ContentTabs active="questions" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/interview-questions" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-fg">
            <ArrowLeft className="h-3.5 w-3.5" /> Questions
          </Link>
          <h1 className="mt-1 text-lg font-semibold">Order the {techLabel(tech)} track</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            This is the order learners read the topic in, top to bottom, on the public page. Put definitions and
            fundamentals first inside each band; questions that build on them come after.
          </p>
        </div>
        <TechPicker tech={tech} options={TECHNOLOGIES.map((t) => ({ slug: t.slug, label: t.label, count: countByTech.get(t.slug) ?? 0 }))} />
      </div>

      <OrderEditor key={tech} tech={tech} initial={bands} />
    </div>
  );
}
