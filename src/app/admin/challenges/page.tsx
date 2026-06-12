import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import AdminChallengesList from "./AdminChallengesList";
import { requireAdminAccess } from "@/lib/permissions/staff";

export default async function AdminChallengesPage() {
  await requireAdminAccess("content:curate");
  const rows = await prisma.challenge.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      category: true,
      published: true,
      premium: true,
      estimatedMinutes: true,
      updatedAt: true,
      _count: { select: { attempts: true } },
    },
  });

  const formattedRows = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    difficulty: c.difficulty,
    category: c.category,
    published: c.published,
    premium: c.premium,
    estimatedMinutes: c.estimatedMinutes,
    updatedAt: c.updatedAt.toISOString(),
    attempts: c._count.attempts,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Challenges</h2>
          <p className="text-sm text-muted mt-1">
            {rows.length} {rows.length === 1 ? "challenge" : "challenges"} total
          </p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition"
        >
          <Plus className="w-3.5 h-3.5" />
          New Challenge
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <p className="text-muted text-sm">No challenges yet.</p>
          <Link
            href="/admin/challenges/new"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-bg text-xs font-bold hover:bg-accent-soft transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Create the first one
          </Link>
        </div>
      ) : (
        <AdminChallengesList rows={formattedRows} />
      )}
    </div>
  );
}
