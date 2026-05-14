import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { User, Mail, Calendar, Code2, Target, FileText, Search, ExternalLink } from "lucide-react";
import AdminUserRow from "./AdminUserRow";
import Link from "next/link";

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const { q } = await searchParams;

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
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
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Users</h2>
          <p className="text-sm text-muted mt-1">
            {users.length} {users.length === 1 ? "user" : "users"} total
          </p>
        </div>

        <form className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name or email..."
            className="w-full bg-surface border border-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition"
          />
        </form>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4 text-muted">
            <User className="w-6 h-6" />
          </div>
          <p className="text-muted text-sm font-medium">No users found.</p>
          {q && (
            <Link
              href="/admin/users"
              className="mt-4 text-xs font-bold text-accent hover:underline"
            >
              Clear search
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
        </div>
      )}
    </div>
  );
}
