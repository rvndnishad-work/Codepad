import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Briefcase, Search, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import AdminInterviewRow from "./AdminInterviewRow";

interface AdminInterviewsPageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

function safeChallengeCount(raw: string): number {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default async function AdminInterviewsPage({ searchParams }: AdminInterviewsPageProps) {
  const { q, status } = await searchParams;

  const sessions = await prisma.interviewSession.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: q } },
                { user: { email: { contains: q } } },
                { user: { name: { contains: q } } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const stats = {
    total: sessions.length,
    inProgress: sessions.filter((s) => s.status === "in_progress").length,
    completed: sessions.filter((s) => s.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Interview sessions</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted">{stats.total} total</p>
            {stats.inProgress > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider border border-amber-500/20">
                <Clock className="w-3 h-3" />
                {stats.inProgress} live
              </span>
            )}
            {stats.completed > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                {stats.completed} done
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <form className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search title or candidate…"
              className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
            />
            {status && <input type="hidden" name="status" value={status} />}
          </form>

          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
            <FilterLink current={status} value="" label="All" />
            <FilterLink current={status} value="scheduled" label="Scheduled" />
            <FilterLink current={status} value="in_progress" label="Live" />
            <FilterLink current={status} value="completed" label="Done" />
            <FilterLink current={status} value="abandoned" label="Stale" />
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4 text-muted">
            <Briefcase className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium">No interview sessions found.</p>
          {(q || status) && (
            <Link href="/admin/interviews" className="mt-4 inline-block text-xs font-bold text-accent hover:underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-elevated/50 text-[10px] uppercase tracking-[0.15em] text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-bold">Session</th>
                  <th className="px-6 py-4 font-bold">Candidate</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-center">Challenges</th>
                  <th className="px-6 py-4 font-bold">Created</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sessions.map((s) => (
                  <AdminInterviewRow
                    key={s.id}
                    session={{
                      id: s.id,
                      title: s.title,
                      status: s.status,
                      totalSec: s.totalSec,
                      shareToken: s.shareToken,
                      challengeCount: safeChallengeCount(s.challengeIds),
                      createdAt: s.createdAt,
                      startedAt: s.startedAt,
                      finishedAt: s.finishedAt,
                      user: s.user,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterLink({ current, value, label }: { current?: string; value: string; label: string }) {
  const isActive = (current || "") === value;
  return (
    <Link
      href={`/admin/interviews${value ? `?status=${value}` : ""}`}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
        isActive ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-elevated"
      }`}
    >
      {label}
    </Link>
  );
}
