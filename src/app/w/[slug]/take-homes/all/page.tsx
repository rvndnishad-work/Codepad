import { loadTakeHomes, countRows } from "@/lib/take-home/list-server";
import { filterCounts, filterRows, paginate } from "@/lib/take-home/list";
import { FILTERS, parseFilter } from "@/lib/take-home/status";
import { loadTakeHomeAccess, loadTemplateOptions } from "../_lib";
import { TakeHomeHeader } from "../_components/kit";
import AllTakeHomes from "../_components/AllTakeHomes";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string; q?: string; page?: string; template?: string }>;
};

export const metadata = { title: "All take-homes", robots: { index: false, follow: false } };

export default async function AllTakeHomesPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const access = await loadTakeHomeAccess(slug, `/w/${slug}/take-homes/all`);
  const now = new Date();
  const [rows, templates] = await Promise.all([loadTakeHomes(access.workspace.id, now), loadTemplateOptions(access.workspace.id)]);
  const counts = countRows(rows, now);
  const filter = parseFilter(sp.filter);
  const q = (sp.q ?? "").trim();
  const template = templates.find((t) => t.id === sp.template) ?? null;
  const scoped = template ? rows.filter((r) => r.templateId === template.id) : rows;
  const page = paginate(filterRows(scoped, filter, q), Number(sp.page) || 1);

  return (
    <div className="flex flex-col gap-5">
      <TakeHomeHeader
        slug={slug}
        active="all"
        counts={{ review: counts.review, all: counts.all, templates: templates.length }}
        canCreate={access.canCreate}
      />
      <AllTakeHomes
        slug={slug}
        query={{ filter, q, page: page.page, template: template?.id ?? "" }}
        template={template}
        chips={filterCounts(
          scoped,
          FILTERS.map((f) => f.id),
        )}
        rows={page.rows}
        pages={page.pages}
        total={page.total}
        now={now.toISOString()}
        canCreate={access.canCreate}
      />
    </div>
  );
}
