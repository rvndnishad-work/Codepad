/**
 * Filters for the platform audit log, shared by /admin/audit and its CSV
 * export (/api/admin/audit/export). Everything lives in the URL.
 */
import type { Prisma } from "@prisma/client";

export const AUDIT_PAGE_SIZE = 50;

export const ACTION_GROUPS: { id: string; label: string }[] = [
  { id: "switch", label: "Feature switches" },
  { id: "maintenance", label: "Maintenance" },
  { id: "workspace", label: "Workspaces" },
  { id: "user", label: "Users" },
  { id: "role", label: "Roles" },
  { id: "setting", label: "Settings" },
  { id: "pricing", label: "Pricing" },
  { id: "content", label: "Content" },
  { id: "broadcast", label: "Notifications" },
  { id: "email", label: "Email" },
  { id: "job", label: "Jobs" },
  { id: "audit", label: "Audit log" },
];

export type AuditFilters = {
  /** A user id, or "via:system" / "via:assistant". */
  actor: string;
  group: string;
  type: string;
  /** YYYY-MM-DD, UTC, inclusive. */
  from: string;
  to: string;
  q: string;
  page: number;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function parseAuditFilters(sp: Record<string, string | string[] | undefined>): AuditFilters {
  const group = one(sp.group);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Number.parseInt(one(sp.page), 10);
  return {
    actor: one(sp.actor).slice(0, 64),
    group: ACTION_GROUPS.some((g) => g.id === group) ? group : "",
    type: one(sp.type).slice(0, 64),
    from: DATE.test(from) ? from : "",
    to: DATE.test(to) ? to : "",
    q: one(sp.q).slice(0, 200),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function auditFilterParams(f: AuditFilters, patch: Partial<AuditFilters> = {}): URLSearchParams {
  const next = { ...f, ...patch };
  const p = new URLSearchParams();
  for (const k of ["actor", "group", "type", "from", "to", "q"] as const) if (next[k]) p.set(k, next[k]);
  if (next.page > 1) p.set("page", String(next.page));
  return p;
}

export function auditWhere(f: AuditFilters): Prisma.AdminAuditLogWhereInput {
  const and: Prisma.AdminAuditLogWhereInput[] = [];
  if (f.actor === "via:system") and.push({ via: "system" });
  else if (f.actor === "via:assistant") and.push({ via: "assistant" });
  else if (f.actor) and.push({ actorId: f.actor });
  if (f.group) and.push({ action: { startsWith: `${f.group}.` } });
  if (f.type) and.push({ targetType: f.type });
  if (f.from || f.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (f.from) createdAt.gte = new Date(`${f.from}T00:00:00.000Z`);
    if (f.to) createdAt.lt = new Date(new Date(`${f.to}T00:00:00.000Z`).getTime() + 86_400_000);
    and.push({ createdAt });
  }
  if (f.q) {
    and.push({
      OR: [
        { targetLabel: { contains: f.q, mode: "insensitive" } },
        { note: { contains: f.q, mode: "insensitive" } },
        { targetId: f.q },
      ],
    });
  }
  return and.length > 0 ? { AND: and } : {};
}

export function isFiltered(f: AuditFilters): boolean {
  return !!(f.actor || f.group || f.type || f.from || f.to || f.q);
}
