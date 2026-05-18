import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Code2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminAttemptRow from "./AdminAttemptRow";

interface AdminAttemptsPageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

const PAGE_SIZE = 25;

function parseTestResults(raw: string | null): { passed: number; total: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.passed === "number" && typeof parsed?.total === "number") {
      return { passed: parsed.passed, total: parsed.total };
    }
  } catch {
    // ignore
  }
  return null;
}

export default async function AdminAttemptsPage({ searchParams }: AdminAttemptsPageProps) {
  const { q, status, page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { user: { name: { contains: q } } },
              { user: { email: { contains: q } } },
              { challenge: { title: { contains: q } } },
              { challenge: { slug: { contains: q } } },
            ],
          }
        : {},
      status ? { status } : {},
    ],
  };

  const [totalCount, attempts, statusCounts] = await Promise.all([
    prisma.challengeAttempt.count({ where }),
    prisma.challengeAttempt.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, email: true } },
        challenge: { select: { id: true, slug: true, title: true, difficulty: true } },
        step: { select: { id: true, title: true, position: true } },
      },
    }),
    prisma.challengeAttempt.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));
  const passedCount = counts["passed"] ?? 0;
  const failedCount = counts["failed"] ?? 0;
  const inProgressCount = counts["in_progress"] ?? 0;

  const rowData = attempts.map((a) => {
    const t = parseTestResults(a.testResults);
    return {
      id: a.id,
      status: a.status,
      durationSec: a.durationSec,
      testPassed: t?.passed ?? null,
      testTotal: t?.total ?? null,
      startedAt: a.startedAt,
      finishedAt: a.finishedAt,
      sessionId: a.sessionId,
      user: a.user,
      challenge: a.challenge,
      step: a.step,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Challenge attempts</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-muted">{totalCount.toLocaleString()} total</p>
            {passedCount > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                {passedCount.toLocaleString()} passed
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider border border-red-500/20">
                <XCircle className="w-3 h-3" />
                {failedCount.toLocaleString()} failed
              </span>
            )}
            {inProgressCount > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                <AlertCircle className="w-3 h-3" />
                {inProgressCount.toLocaleString()} live
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <form className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="User or challenge…"
              className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
            />
            {status && <input type="hidden" name="status" value={status} />}
          </form>

          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 flex-wrap">
            <FilterLink current={status} value="" label="All" />
            <FilterLink current={status} value="passed" label="Passed" />
            <FilterLink current={status} value="failed" label="Failed" />
            <FilterLink current={status} value="in_progress" label="Live" />
            <FilterLink current={status} value="abandoned" label="Abandoned" />
          </div>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4 text-muted">
            <Code2 className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium">No attempts found.</p>
          {(q || status) && (
            <Link
              href="/admin/attempts"
              className="mt-4 inline-block text-xs font-bold text-accent hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-elevated/50 text-[10px] uppercase tracking-[0.15em] text-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">User</th>
                    <th className="px-6 py-4 font-bold">Challenge</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-center">Tests</th>
                    <th className="px-6 py-4 font-bold">Duration / Started</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rowData.map((a) => (
                    <AdminAttemptRow key={a.id} attempt={a} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} q={q} status={status} />
          )}
        </>
      )}
    </div>
  );
}

function FilterLink({
  current,
  value,
  label,
}: {
  current?: string;
  value: string;
  label: string;
}) {
  const isActive = (current || "") === value;
  return (
    <Link
      href={`/admin/attempts${value ? `?status=${value}` : ""}`}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
        isActive ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-elevated"
      }`}
    >
      {label}
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
  q,
  status,
}: {
  page: number;
  totalPages: number;
  q?: string;
  status?: string;
}) {
  function url(n: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return `/admin/attempts${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex items-center justify-between text-xs">
      <div className="text-muted">
        Page <span className="text-fg font-bold">{page}</span> of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={url(page - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-fg hover:bg-elevated transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted/40 cursor-not-allowed">
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </span>
        )}
        {page < totalPages ? (
          <Link
            href={url(page + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted hover:text-fg hover:bg-elevated transition"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface border border-border text-muted/40 cursor-not-allowed">
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
