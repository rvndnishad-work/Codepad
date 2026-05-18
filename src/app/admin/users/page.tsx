import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { User, Search, ShieldAlert } from "lucide-react";
import AdminUserRow from "./AdminUserRow";
import Link from "next/link";
import Pagination from "../Pagination";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const { q, page, status } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10));
  const ITEMS_PER_PAGE = 10;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const whereClause = {
    AND: [
      q
        ? {
            OR: [{ name: { contains: q } }, { email: { contains: q } }],
          }
        : {},
      status === "banned" ? { banned: true } : {},
      status === "active" ? { banned: false } : {},
    ],
  };

  const [totalCount, bannedCount, users] = await Promise.all([
    prisma.user.count({ where: whereClause }),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: ITEMS_PER_PAGE,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        hireMeUrl: true,
        portfolioPublic: true,
        banned: true,
        createdAt: true,
        _count: {
          select: {
            snippets: true,
            attempts: true,
            blogs: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Users</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-muted">
              {totalCount} {totalCount === 1 ? "user" : "users"}
              {status ? " (filtered)" : " total"}
            </p>
            {bannedCount > 0 && (
              <Link
                href={status === "banned" ? "/admin/users" : "/admin/users?status=banned"}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider border border-red-500/20 hover:bg-red-500/15 transition"
              >
                <ShieldAlert className="w-3 h-3" />
                {bannedCount} banned
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <form className="relative max-w-xs w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search name or email…"
              className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
            />
            {status && <input type="hidden" name="status" value={status} />}
          </form>

          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
            <FilterLink current={status} value="" label="All" />
            <FilterLink current={status} value="active" label="Active" />
            <FilterLink current={status} value="banned" label="Banned" />
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4 text-muted">
            <User className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium">No users found.</p>
          {(q || status) && (
            <Link
              href="/admin/users"
              className="mt-4 inline-block text-xs font-bold text-accent hover:underline"
            >
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
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Role</th>
                  <th className="px-6 py-4 font-bold text-center">Activity</th>
                  <th className="px-6 py-4 font-bold">Joined</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((user) => (
                  <AdminUserRow
                    key={user.id}
                    user={{
                      ...user,
                      isAdmin: isAdminEmail(user.email),
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / ITEMS_PER_PAGE)}
            totalItems={totalCount}
            itemsPerPage={ITEMS_PER_PAGE}
            baseUrl="/admin/users"
            currentParams={{ q, status }}
          />
        </div>
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
      href={`/admin/users${value ? `?status=${value}` : ""}`}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
        isActive ? "bg-accent text-bg" : "text-muted hover:text-fg hover:bg-elevated"
      }`}
    >
      {label}
    </Link>
  );
}
