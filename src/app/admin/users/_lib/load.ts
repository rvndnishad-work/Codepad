import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accountState, type AccountState } from "@/lib/auth-gate";
import {
  buildUserOrderBy,
  buildUserWhere,
  sideWhere,
  type StatusFilter,
  type UserListParams,
  type UserSide,
} from "./filters";

export type WorkspaceChip = { id: string; name: string; slug: string; role: string; plan: string };

export type UserRowData = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  userType: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  state: AccountState;
  bannedReason: string | null;
  bannedUntil: string | null;
  emailVerified: boolean;
  twoFactor: boolean;
  // developers
  attempts: number;
  snippets: number;
  blogs: number;
  // recruiters
  workspaces: WorkspaceChip[];
  interviewsHosted: number;
  screeningsSent: number;
};

const ROW_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  userType: true,
  createdAt: true,
  lastSignInAt: true,
  emailVerified: true,
  banned: true,
  bannedReason: true,
  bannedUntil: true,
  deletedAt: true,
  totpEnabledAt: true,
  _count: { select: { attempts: true, snippets: true, blogs: true, interviewSessions: true } },
} satisfies Prisma.UserSelect;

const RECRUITER_SELECT = {
  ...ROW_SELECT,
  workspaces: {
    take: 6,
    orderBy: { workspace: { createdAt: "asc" } },
    select: { role: true, workspace: { select: { id: true, name: true, slug: true, planName: true, trialEndsAt: true } } },
  },
} satisfies Prisma.UserSelect;

function planLabel(planName: string, trialEndsAt: Date | null, now: Date): string {
  if (trialEndsAt && trialEndsAt > now && planName === "FREE") return "Trial";
  return planName.charAt(0) + planName.slice(1).toLowerCase();
}

/** AI screening invites sent, per batch creator, for the given users. One query. */
export async function screeningsSentBy(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ uid: string; n: bigint }[]>`
    SELECT b."createdByUserId" AS uid, COUNT(s.id) AS n
    FROM "AIInterviewSession" s
    JOIN "AIScreeningBatch" b ON b.id = s."batchId"
    WHERE b."createdByUserId" IN (${Prisma.join(userIds)}) AND s.practice = false
    GROUP BY b."createdByUserId"`;
  return new Map(rows.map((r) => [r.uid, Number(r.n)]));
}

type RowSource = Prisma.UserGetPayload<{ select: typeof ROW_SELECT }> & {
  workspaces?: { role: string; workspace: { id: string; name: string; slug: string; planName: string; trialEndsAt: Date | null } }[];
};

export function toRow(u: RowSource, screenings: Map<string, number>, now: Date): UserRowData {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    userType: u.userType,
    createdAt: u.createdAt.toISOString(),
    lastSignInAt: u.lastSignInAt?.toISOString() ?? null,
    state: accountState(u, now),
    bannedReason: u.bannedReason,
    bannedUntil: u.bannedUntil?.toISOString() ?? null,
    emailVerified: u.emailVerified != null,
    twoFactor: u.totpEnabledAt != null,
    attempts: u._count.attempts,
    snippets: u._count.snippets,
    blogs: u._count.blogs,
    workspaces: (u.workspaces ?? []).map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      plan: planLabel(m.workspace.planName, m.workspace.trialEndsAt, now),
    })),
    interviewsHosted: u._count.interviewSessions,
    screeningsSent: screenings.get(u.id) ?? 0,
  };
}

export async function loadUserRows(
  side: UserSide,
  p: Pick<UserListParams, "q" | "status" | "from" | "to" | "sort">,
  page: { skip: number; take: number },
  now: Date = new Date(),
  ids?: string[],
): Promise<UserRowData[]> {
  // With `ids` (a bulk selection) only the side and the ids apply.
  const where = ids ? { AND: [sideWhere(side), { id: { in: ids } }] } : buildUserWhere(side, p, now);
  const users = await prisma.user.findMany({
    where,
    orderBy: buildUserOrderBy(p.sort),
    skip: page.skip,
    take: page.take,
    select: side === "recruiters" ? RECRUITER_SELECT : ROW_SELECT,
  });
  const screenings = side === "recruiters" ? await screeningsSentBy(users.map((u) => u.id)) : new Map<string, number>();
  return users.map((u) => toRow(u as RowSource, screenings, now));
}

export async function loadUserList(side: UserSide, p: UserListParams) {
  const now = new Date();
  const where = buildUserWhere(side, p, now);
  const statuses: StatusFilter[] = ["", "active", "suspended", "deleted", "unverified"];
  const [total, rows, ...statusCounts] = await Promise.all([
    prisma.user.count({ where }),
    loadUserRows(side, p, { skip: (p.page - 1) * p.size, take: p.size }, now),
    // Tab counts ignore the status filter but keep side, search and dates.
    ...statuses.map((s) => prisma.user.count({ where: buildUserWhere(side, { ...p, status: s }, now) })),
  ]);
  const counts = Object.fromEntries(statuses.map((s, i) => [s || "all", statusCounts[i] as number])) as Record<
    "all" | "active" | "suspended" | "deleted" | "unverified",
    number
  >;
  return { total: total as number, rows: rows as UserRowData[], counts };
}
