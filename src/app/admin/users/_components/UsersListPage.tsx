import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requireAdminAccess, staffCan } from "@/lib/permissions/staff";
import UnderlineTabs from "@/app/w/[slug]/(shell)/_components/UnderlineTabs";
import Pagination from "../../Pagination";
import { listQuery, PAGE_SIZES, parseListParams, type RawParams, type UserSide } from "../_lib/filters";
import { loadUserList } from "../_lib/load";
import UsersTable from "./UsersTable";

const META: Record<UserSide, { title: string; subtitle: string; base: string }> = {
  developers: {
    title: "Developer accounts",
    subtitle: "People practising, writing and taking challenges. Includes accounts that never picked a type.",
    base: "/admin/users",
  },
  recruiters: {
    title: "Recruiter accounts",
    subtitle: "People on the hiring side: their workspaces, interviews and AI screenings.",
    base: "/admin/users/recruiters",
  },
  candidates: {
    title: "Candidate accounts",
    subtitle: "Made when a candidate starts a recruiter's take-home. They never signed up, so they are not counted as developers. Signing up later moves them to developer accounts.",
    base: "/admin/users/candidates",
  },
};

const fieldCls =
  "h-9 rounded-lg border border-border bg-bg px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary";

export default async function UsersListPage({ side, searchParams }: { side: UserSide; searchParams: RawParams }) {
  const session = await requireAdminAccess("user:manage");
  const p = parseListParams(searchParams);
  const [{ total, rows, counts }, canHardDelete] = await Promise.all([
    loadUserList(side, p),
    staffCan(session, "platform:admin"),
  ]);
  const meta = META[side];
  const totalPages = Math.max(1, Math.ceil(total / p.size));
  const now = Date.now();

  const exportQs = new URLSearchParams({ side });
  for (const [k, v] of new URLSearchParams(listQuery(p, { page: 1 }).slice(1))) exportQs.set(k, v);
  const exportBase = `/api/admin/users/export?${exportQs.toString()}`;

  const tabs = [
    { id: "", label: "All", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "suspended", label: "Suspended", count: counts.suspended },
    { id: "unverified", label: "Unverified email", count: counts.unverified },
    { id: "deleted", label: "Deleted", count: counts.deleted },
  ].map((t) => ({ ...t, id: t.id || "all", href: `${meta.base}${listQuery(p, { status: t.id as typeof p.status, page: 1 })}` }));

  const filtered = Boolean(p.q || p.from || p.to);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{meta.title}</h1>
          <p className="text-sm text-muted mt-1">{meta.subtitle}</p>
        </div>
        <a href={exportBase} className="h-9 px-3.5 rounded-lg border border-border bg-surface text-sm text-fg hover:bg-panel inline-flex items-center gap-1.5 self-start sm:self-auto">
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>

      <UnderlineTabs tabs={tabs} active={p.status || "all"} label="Account status" scroll={false} />

      <form method="get" action={meta.base} className="flex flex-wrap items-end gap-2">
        {p.status && <input type="hidden" name="status" value={p.status} />}
        <label className="relative grow min-w-[220px] max-w-sm">
          <span className="sr-only">Search</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
          <input name="q" defaultValue={p.q} placeholder="Name, email or user id" className={`${fieldCls} w-full pl-9`} />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-muted mb-1">Joined from</span>
          <input type="date" name="from" defaultValue={p.from} className={fieldCls} />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-muted mb-1">to</span>
          <input type="date" name="to" defaultValue={p.to} className={fieldCls} />
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-muted mb-1">Sort</span>
          <select name="sort" defaultValue={p.sort} className={fieldCls}>
            <option value="newest">Newest first</option>
            <option value="last_sign_in">Last sign-in</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className="flex flex-col">
          <span className="text-xs text-muted mb-1">Per page</span>
          <select name="size" defaultValue={String(p.size)} className={fieldCls}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-9 px-3.5 rounded-lg bg-secondary text-bg text-sm font-medium hover:brightness-110">
          Apply
        </button>
        {filtered && (
          <Link href={`${meta.base}${listQuery(p, { q: "", from: "", to: "", page: 1 })}`} className="h-9 px-2 inline-flex items-center text-sm text-muted hover:text-fg">
            Clear
          </Link>
        )}
      </form>

      <p className="text-sm text-muted">
        {total.toLocaleString("en-US")} {total === 1 ? "account" : "accounts"}
        {filtered ? " match" : ""}
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-sm text-muted">No accounts here.</p>
          {(filtered || p.status) && (
            <Link href={meta.base} className="mt-3 inline-block text-sm text-fg underline">
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <UsersTable
          side={side}
          rows={rows}
          now={now}
          canHardDelete={canHardDelete}
          exportBase={exportBase}
          footer={
            <Pagination
              currentPage={Math.min(p.page, totalPages)}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={p.size}
              baseUrl={meta.base}
              currentParams={{
                q: p.q || undefined,
                status: p.status || undefined,
                from: p.from || undefined,
                to: p.to || undefined,
                sort: p.sort === "newest" ? undefined : p.sort,
                size: p.size === PAGE_SIZES[0] ? undefined : String(p.size),
              }}
            />
          }
        />
      )}
    </div>
  );
}
