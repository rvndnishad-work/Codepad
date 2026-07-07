import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAdminAccess } from "@/lib/permissions/staff";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, FileText, Users, Clock, CheckCircle2, Plus, Upload } from "lucide-react";
import { DIFFICULTIES } from "@/lib/interview-questions/shared";
import QuestionAdminRow from "./QuestionAdminRow";
import QuestionsFilterBar from "./QuestionsFilterBar";
import { PAGE_SIZES, DEFAULT_PAGE_SIZE, SORT_OPTIONS, FILTER_COOKIE, PERSISTED_KEYS, type SortKey } from "./list-params";
import Pagination from "../Pagination";

export const metadata = { title: "Interview Questions — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const ROW_SELECT = {
  id: true, title: true, slug: true, status: true, difficulty: true, technology: true, views: true,
  company: { select: { name: true } },
} as const;

/**
 * Difficulty is a plain string column, so a DB `orderBy` would sort it
 * alphabetically (easy < hard < medium). Instead, page across per-difficulty
 * buckets in rank order — counts steer skip/take into the right bucket(s), and
 * rows inside a bucket stay newest-first. A trailing catch-all bucket keeps
 * rows with unexpected difficulty values reachable.
 */
async function findSortedByDifficulty(
  where: Prisma.PrepQuestionWhereInput,
  dir: "asc" | "desc",
  skip: number,
  take: number,
) {
  const ranked: Prisma.PrepQuestionWhereInput[] = (
    dir === "asc" ? [...DIFFICULTIES] : [...DIFFICULTIES].reverse()
  ).map((d) => ({ difficulty: d }));
  ranked.push({ difficulty: { notIn: [...DIFFICULTIES] } });

  const rows = [];
  let offset = skip;
  let remaining = take;
  for (const bucket of ranked) {
    if (remaining <= 0) break;
    const bucketWhere = { ...where, ...bucket };
    const count = await prisma.prepQuestion.count({ where: bucketWhere });
    if (offset >= count) {
      offset -= count;
      continue;
    }
    const got = await prisma.prepQuestion.findMany({
      where: bucketWhere,
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: remaining,
      select: ROW_SELECT,
    });
    rows.push(...got);
    remaining -= got.length;
    offset = 0;
  }
  return rows;
}

export default async function InterviewQuestionsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tech?: string; status?: string; page?: string; per?: string; sort?: string }>;
}) {
  await requireAdminAccess("content:curate");
  const sp = await searchParams;

  // Bare visit (sidebar link, bookmark without params): restore the admin's
  // last-used filters from the cookie the filter bar maintains. Any explicit
  // param — including ?page= — means "respect the URL as given".
  if (Object.keys(sp).length === 0) {
    const saved = (await cookies()).get(FILTER_COOKIE)?.value;
    if (saved) {
      const parsed = new URLSearchParams(saved);
      const clean = new URLSearchParams();
      for (const key of PERSISTED_KEYS) {
        const v = parsed.get(key);
        if (v) clean.set(key, v);
      }
      const qs = clean.toString();
      if (qs) redirect(`/admin/interview-questions?${qs}`);
    }
  }

  const { q = "", tech = "", status = "", page: pageParam, per: perParam, sort: sortParam } = sp;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const perPage = PAGE_SIZES.find((n) => n === parseInt(perParam ?? "", 10)) ?? DEFAULT_PAGE_SIZE;
  const sort: SortKey = SORT_OPTIONS.some((o) => o.value === sortParam) ? (sortParam as SortKey) : "";

  const where: Prisma.PrepQuestionWhereInput = {
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(tech ? { technology: tech } : {}),
    ...(status ? { status } : {}),
  };

  const [companies, totalQ, publishedQ, draftQ, totalExp, pendingExp, filteredQ, questions] = await Promise.all([
    prisma.company.count(),
    prisma.prepQuestion.count(),
    prisma.prepQuestion.count({ where: { status: "published" } }),
    prisma.prepQuestion.count({ where: { status: "draft" } }),
    prisma.prepExperience.count(),
    prisma.prepExperience.count({ where: { status: "pending" } }),
    prisma.prepQuestion.count({ where }),
    sort
      ? findSortedByDifficulty(where, sort === "difficulty-asc" ? "asc" : "desc", (page - 1) * perPage, perPage)
      : prisma.prepQuestion.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
          select: ROW_SELECT,
        }),
  ]);
  const totalPages = Math.ceil(filteredQ / perPage);
  const filtering = Boolean(q || tech || status);

  const metrics = [
    { label: "Companies", value: companies, icon: Building2, href: "/admin/interview-questions/companies" },
    { label: "Questions", value: totalQ, icon: FileText, sub: `${publishedQ} published · ${draftQ} draft` },
    { label: "Experiences", value: totalExp, icon: Users, href: "/admin/interview-questions/experiences" },
    { label: "Pending reviews", value: pendingExp, icon: Clock, href: "/admin/interview-questions/experiences", alert: pendingExp > 0 },
    { label: "Published", value: publishedQ, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Interview Questions</h1>
          <p className="text-sm text-muted mt-1">Manage the company-indexed question bank and experiences.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/interview-questions/import" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-xs font-bold hover:border-accent/40 transition">
            <Upload className="w-4 h-4" /> Bulk import
          </Link>
          <Link href="/admin/interview-questions/new" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition">
            <Plus className="w-4 h-4" /> New question
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metrics.map((m) => {
          const card = (
            <div className={`p-4 rounded-2xl border bg-bg/40 ${m.alert ? "border-amber-500/40" : "border-border"} h-full`}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted">
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </div>
              <div className={`text-2xl font-black mt-2 ${m.alert ? "text-amber-500" : ""}`}>{m.value}</div>
              {m.sub && <div className="text-[10px] text-muted mt-0.5">{m.sub}</div>}
            </div>
          );
          return m.href ? (
            <Link key={m.label} href={m.href} className="block hover:opacity-80 transition">{card}</Link>
          ) : (
            <div key={m.label}>{card}</div>
          );
        })}
      </div>

      {/* Nav */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/interview-questions/companies" className="px-3 py-1.5 rounded-lg border border-border font-bold hover:border-accent/40 transition">Companies</Link>
        <Link href="/admin/interview-questions/experiences" className="px-3 py-1.5 rounded-lg border border-border font-bold hover:border-accent/40 transition">Experiences{pendingExp > 0 ? ` (${pendingExp})` : ""}</Link>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted">
            Questions{filtering ? ` — ${filteredQ} match${filteredQ === 1 ? "" : "es"}` : ""}
          </h2>
          <QuestionsFilterBar q={q} tech={tech} status={status} per={perPage} sort={sort} />
        </div>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg/50 text-[10px] font-black uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3 hidden sm:table-cell">Company</th>
                <th className="text-left p-3 hidden md:table-cell">Tech</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {questions.map((row) => (
                <QuestionAdminRow key={row.id} q={{ ...row, company: row.company?.name ?? null }} />
              ))}
              {questions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">
                    {filtering ? (
                      <>No questions match. <Link href="/admin/interview-questions" className="text-accent font-bold hover:underline">Clear filters</Link></>
                    ) : (
                      "No questions yet. Create one or bulk import."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredQ}
            itemsPerPage={perPage}
            baseUrl="/admin/interview-questions"
            currentParams={{
              q: q || undefined,
              tech: tech || undefined,
              status: status || undefined,
              per: perPage !== DEFAULT_PAGE_SIZE ? String(perPage) : undefined,
              sort: sort || undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
