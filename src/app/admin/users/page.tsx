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
        workspaces: {
          select: {
            role: true,
            workspace: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
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
          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-fg to-fg/80 bg-clip-text text-transparent">Users</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-muted">
              {totalCount} {totalCount === 1 ? "user" : "users"}
              {status ? " (filtered)" : " total"}
            </p>
            {bannedCount > 0 && (
              <Link
                href={status === "banned" ? "/admin/users" : "/admin/users?status=banned"}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-wider border border-red-500/20 hover:bg-red-500/15 transition-all"
              >
                <ShieldAlert className="w-3 h-3" />
                {bannedCount} banned
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <form className="relative max-w-xs w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search name or email…"
              className="w-full bg-panel/20 border border-border backdrop-blur-md rounded-xl py-2 pl-10 pr-4 text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
            />
            {status && <input type="hidden" name="status" value={status} />}
          </form>

          <div className="flex items-center gap-1 bg-panel/20 border border-border backdrop-blur-md rounded-xl p-1 shadow-inner">
            <FilterLink current={status} value="" label="All" />
            <FilterLink current={status} value="active" label="Active" />
            <FilterLink current={status} value="banned" label="Banned" />
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-border bg-panel/30 backdrop-blur-md p-16 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-muted/5 flex items-center justify-center mx-auto mb-4 text-muted/60 border border-border">
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
        <div className="rounded-2xl border border-border bg-panel/30 backdrop-blur-md overflow-hidden shadow-lg">
          <div className="hidden lg:grid lg:grid-cols-[2.2fr_1fr_1.2fr_1fr_1fr] lg:items-center lg:px-6 lg:py-4 bg-panel/40 text-[10px] uppercase tracking-[0.15em] text-muted border-b border-border font-black">
            <div>User</div>
            <div>Role</div>
            <div>Activity</div>
            <div>Joined</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-border">
            {users.map((user) => (
              <AdminUserRow
                key={user.id}
                user={{
                  ...user,
                  isAdmin: isAdminEmail(user.email),
                }}
              />
            ))}
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
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 border ${
        isActive 
          ? "bg-elevated text-fg border-border shadow-sm" 
          : "border-transparent text-muted hover:text-fg hover:bg-panel/40"
      }`}
    >
      {label}
    </Link>
  );
}
