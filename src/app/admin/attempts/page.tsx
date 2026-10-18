import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requireAdminAccess } from "@/lib/permissions/staff";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";
import Pagination from "../Pagination";
import AdminAttemptRow from "./AdminAttemptRow";
import { FLAG_THRESHOLD, attemptWhere, filterHref, readFilters } from "./filters";

export const metadata = { title: "Attempts — Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

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

const STATUS_LINKS = [
  { value: "", label: "All" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "in_progress", label: "Live" },
  { value: "abandoned", label: "Abandoned" },
];

/**
 * Challenge attempts hold candidate code, including workspace take-homes, so
 * the list, detail, replay and export are platform admin only.
 */
export default async function AdminAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminAccess("platform:admin");
  const sp = await searchParams;
  const f = readFilters(sp);
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? "1", 10) || 1);
  const where = attemptWhere(f);

  const [total, attempts, statusCounts, flaggedCount, challenge] = await Promise.all([
    prisma.challengeAttempt.count({ where }),
    prisma.challengeAttempt.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        durationSec: true,
        testResults: true,
        startedAt: true,
        sessionId: true,
        aiSuspicionScore: true,
        integrityReport: { select: { suspicionScore: true } },
        eventLog: { select: { id: true } },
        user: { select: { id: true, name: true, email: true } },
        challenge: { select: { id: true, slug: true, title: true, difficulty: true, workspace: { select: { name: true, slug: true } } } },
        step: { select: { title: true, position: true } },
        takeHomeAssignment: { select: { workspace: { select: { name: true, slug: true } } } },
      },
    }),
    prisma.challengeAttempt.groupBy({ by: ["status"], where: attemptWhere({ ...f, status: "" }), _count: { _all: true } }),
    prisma.challengeAttempt.count({ where: attemptWhere({ ...f, flagged: "1", status: "" }) }),
    f.challenge ? prisma.challenge.findUnique({ where: { id: f.challenge }, select: { title: true } }) : null,
  ]);

  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));
  const allCount = statusCounts.reduce((n, s) => n + s._count._all, 0);
  const rows = attempts.map((a) => {
    const t = parseTestResults(a.testResults);
    const scores = [a.aiSuspicionScore, a.integrityReport?.suspicionScore].filter((x): x is number => typeof x === "number");
    const suspicion = scores.length ? Math.max(...scores) : null;
    return {
      id: a.id,
      status: a.status,
      durationSec: a.durationSec,
      testPassed: t?.passed ?? null,
      testTotal: t?.total ?? null,
      startedAt: a.startedAt.toISOString(),
      sessionId: a.sessionId,
      suspicion,
      flagged: suspicion !== null && suspicion >= FLAG_THRESHOLD,
      hasReplay: a.eventLog !== null,
      user: a.user,
      challenge: { id: a.challenge.id, slug: a.challenge.slug, title: a.challenge.title, difficulty: a.challenge.difficulty },
      step: a.step,
      workspace: a.takeHomeAssignment?.workspace ?? a.challenge.workspace ?? null,
    };
  });

  const view = f.flagged ? "flagged" : "all";
  const field = "h-8 rounded-lg border border-border bg-bg px-2 text-sm text-fg focus:outline-none focus:border-border-strong";
  const exportHref = filterHref("/api/admin/attempts/export", f);
  const filtering = Object.values(f).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Attempts</h1>
          <p className="text-sm text-muted mt-1">Every challenge attempt, public practice and workspace take-homes alike.</p>
        </div>
        <a href={exportHref} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface text-sm font-medium text-fg hover:bg-panel">
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>

      <UnderlineTabs
        label="Attempt views"
        active={view}
        tabs={[
          { id: "all", label: "All attempts", href: filterHref("/admin/attempts", f, { flagged: "" }), count: allCount },
          { id: "flagged", label: "Flagged for integrity", href: filterHref("/admin/attempts", f, { flagged: "1" }), count: flaggedCount },
        ]}
      />
      {f.flagged && (
        <p className="text-sm text-muted">
          Attempts with an AI or proctoring suspicion score of {FLAG_THRESHOLD} or more. Open one to see the replay and integrity report.
        </p>
      )}

      <form className="flex flex-wrap items-center gap-2">
        {f.flagged && <input type="hidden" name="flagged" value="1" />}
        {f.status && <input type="hidden" name="status" value={f.status} />}
        {f.challenge && <input type="hidden" name="challenge" value={f.challenge} />}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
          <input name="q" defaultValue={f.q} placeholder="Person or challenge" className={`${field} w-full pl-8`} />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-muted">
          From <input type="date" name="from" defaultValue={f.from} className={field} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted">
          To <input type="date" name="to" defaultValue={f.to} className={field} />
        </label>
        {!f.flagged && (
          <select name="minSuspicion" defaultValue={f.minSuspicion} className={field} aria-label="Suspicion">
            <option value="">Any suspicion</option>
            <option value="30">Suspicion 30+</option>
            <option value="60">Suspicion 60+</option>
            <option value="80">Suspicion 80+</option>
          </select>
        )}
        <select name="scope" defaultValue={f.scope} className={field} aria-label="Source">
          <option value="">Public and workspace</option>
          <option value="public">Public practice</option>
          <option value="workspace">Workspace (take-home or interview)</option>
        </select>
        <button type="submit" className="h-8 px-3 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-panel">
          Apply
        </button>
        {filtering && (
          <Link href="/admin/attempts" className="text-sm text-muted hover:text-fg">
            Clear
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
          {STATUS_LINKS.map((s) => (
            <Link
              key={s.value}
              href={filterHref("/admin/attempts", f, { status: s.value })}
              className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium ${
                f.status === s.value ? "bg-panel text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {s.label}
              <span className="text-subtle tabular-nums">{s.value ? counts[s.value] ?? 0 : allCount}</span>
            </Link>
          ))}
        </div>
        {f.challenge && (
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            Challenge: <span className="text-fg">{challenge?.title ?? "unknown"}</span>
            <Link href={filterHref("/admin/attempts", f, { challenge: "" })} className="hover:text-fg">
              Remove
            </Link>
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-panel text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Person</th>
                <th className="px-3 py-2.5 text-left font-medium">Challenge</th>
                <th className="px-3 py-2.5 text-left font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Tests</th>
                <th className="px-3 py-2.5 text-right font-medium">Suspicion</th>
                <th className="px-3 py-2.5 text-left font-medium">Time</th>
                <th className="px-3 py-2.5 pr-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => (
                <AdminAttemptRow key={a.id} attempt={a} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted">
                    {filtering ? "No attempts match these filters." : "No attempts yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          totalItems={total}
          itemsPerPage={PAGE_SIZE}
          baseUrl="/admin/attempts"
          currentParams={{ ...f }}
        />
      </div>
    </div>
  );
}
