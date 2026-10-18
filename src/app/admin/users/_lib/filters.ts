/**
 * URL params → Prisma where/orderBy for the admin user lists. Pure (no
 * prisma client import) so it can be unit tested and shared by the pages and
 * the CSV export route.
 */
import { developerUserWhere, SCREENED_USER_TYPE } from "@/lib/users/user-type";
import type { Prisma } from "@prisma/client";

export type UserSide = "developers" | "recruiters" | "candidates";
export type StatusFilter = "" | "active" | "suspended" | "deleted" | "unverified";
export type SortKey = "newest" | "last_sign_in" | "name";

export const PAGE_SIZES = [25, 50, 100] as const;
export const STATUS_FILTERS: StatusFilter[] = ["", "active", "suspended", "deleted", "unverified"];
export const SORT_KEYS: SortKey[] = ["newest", "last_sign_in", "name"];

export type UserListParams = {
  q: string;
  status: StatusFilter;
  from: string; // yyyy-mm-dd or ""
  to: string;
  sort: SortKey;
  page: number;
  size: number;
};

export type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseListParams(raw: RawParams): UserListParams {
  const status = one(raw.status) as StatusFilter;
  const sort = one(raw.sort) as SortKey;
  const size = Number(one(raw.size));
  const page = Number.parseInt(one(raw.page) || "1", 10);
  const from = one(raw.from);
  const to = one(raw.to);
  return {
    q: one(raw.q).slice(0, 200),
    status: STATUS_FILTERS.includes(status) ? status : "",
    from: DATE_RE.test(from) ? from : "",
    to: DATE_RE.test(to) ? to : "",
    sort: SORT_KEYS.includes(sort) ? sort : "newest",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : PAGE_SIZES[0],
  };
}

/** Params back to a query string, dropping defaults. `over` overrides keys. */
export function listQuery(p: UserListParams, over: Partial<UserListParams> = {}): string {
  const m = { ...p, ...over };
  const sp = new URLSearchParams();
  if (m.q) sp.set("q", m.q);
  if (m.status) sp.set("status", m.status);
  if (m.from) sp.set("from", m.from);
  if (m.to) sp.set("to", m.to);
  if (m.sort !== "newest") sp.set("sort", m.sort);
  if (m.size !== PAGE_SIZES[0]) sp.set("size", String(m.size));
  if (m.page > 1) sp.set("page", String(m.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function sideWhere(side: UserSide): Prisma.UserWhereInput {
  // Developer accounts include legacy users that never picked a type.
  if (side === "recruiters") return { userType: "recruiter" };
  if (side === "candidates") return { userType: SCREENED_USER_TYPE };
  return developerUserWhere;
}

export function parseSide(raw: string | string[] | undefined): UserSide {
  return raw === "recruiters" || raw === "candidates" ? raw : "developers";
}

/** Status clause. "" (all) hides deleted accounts; "deleted" shows only them. */
export function statusWhere(status: StatusFilter, now: Date): Prisma.UserWhereInput {
  const activeBan: Prisma.UserWhereInput = {
    banned: true,
    OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }],
  };
  switch (status) {
    case "deleted":
      return { deletedAt: { not: null } };
    case "suspended":
      return { deletedAt: null, ...activeBan };
    case "active":
      return { deletedAt: null, NOT: activeBan };
    case "unverified":
      return { deletedAt: null, emailVerified: null };
    default:
      return { deletedAt: null };
  }
}

export function buildUserWhere(
  side: UserSide,
  p: Pick<UserListParams, "q" | "status" | "from" | "to">,
  now: Date = new Date(),
): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [sideWhere(side), statusWhere(p.status, now)];
  if (p.q) {
    and.push({
      OR: [
        { name: { contains: p.q, mode: "insensitive" } },
        { email: { contains: p.q, mode: "insensitive" } },
        { id: p.q },
      ],
    });
  }
  if (p.from || p.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (p.from) createdAt.gte = new Date(`${p.from}T00:00:00.000Z`);
    if (p.to) {
      const end = new Date(`${p.to}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1); // inclusive of the whole "to" day
      createdAt.lt = end;
    }
    and.push({ createdAt });
  }
  return { AND: and };
}

export function buildUserOrderBy(sort: SortKey): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case "last_sign_in":
      return [{ lastSignInAt: { sort: "desc", nulls: "last" } }, { id: "asc" }];
    case "name":
      return [{ name: { sort: "asc", nulls: "last" } }, { id: "asc" }];
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

/** CSV cell escaping (RFC 4180) with a guard against spreadsheet formulas. */
export function csvCell(v: unknown): string {
  if (v == null) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
