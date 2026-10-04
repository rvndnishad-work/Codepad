/**
 * Page- and area-level maintenance.
 *
 * A MaintenanceRule takes a set of path prefixes down between `startsAt` and
 * `endsAt` (or until someone brings it back). The proxy asks `getActiveRules()`
 * on every request and `matchRule()` picks the most specific rule for the
 * path, so a page rule wins over its area and an area over the whole site.
 * `bannerFor()` gives the upcoming rule to warn about on a page.
 *
 * Path patterns are matched by segment: "/play" covers "/play" and
 * "/play/abc" but not "/playgrounds"; "*" matches exactly one segment
 * ("/w/*\/interviews/*\/room").
 *
 * Reads are cached per instance for 10 s and fail open: a DB error never takes
 * the site down.
 */
import { prisma } from "@/lib/prisma";
import { MAINTENANCE_KEY } from "@/lib/maintenance";
import { DEFAULT_MAINTENANCE, type MaintenanceConfig } from "@/lib/settings-constants";

export type AreaDef = {
  key: string;
  label: string;
  /** Title of the 503 page, e.g. "The playground is paused". */
  pausedTitle: string;
  /** Path patterns covered, including every child area. */
  paths: string[];
  /** Short list shown in the admin table. */
  display: string;
  parent?: string;
  /** Interview rooms are inside this area, so the scheduler lists booked interviews. */
  coversRooms?: boolean;
  /** Pages people can go to instead, shown as buttons on the 503 page. */
  elsewhere?: { label: string; href: string }[];
};

const ROOM_PATHS = [
  "/w/*/interviews/*/room",
  "/w/*/interviews/*/lobby",
  "/interview/*",
  "/api/interview",
  "/api/livekit",
  "/api/lobby",
];
const AI_SCREENING_PATHS = ["/ai-interview", "/api/ai-interview"];
const TAKE_HOME_PATHS = ["/take-home", "/api/take-home"];
const CANDIDATE_PATHS = [...TAKE_HOME_PATHS, ...AI_SCREENING_PATHS, ...ROOM_PATHS, "/invite"];
const PLAYGROUND_PATHS = ["/play", "/playgrounds", "/api/execute", "/api/playground", "/api/snippets"];
const CREATOR_PATHS = ["/creators", "/c", "/purchase", "/become-creator"];

export const AREAS: AreaDef[] = [
  {
    key: "site",
    label: "Whole site",
    pausedTitle: "We will be right back",
    paths: ["/"],
    display: "/",
  },
  {
    key: "hiring",
    label: "Hiring side",
    pausedTitle: "Hiring is paused for maintenance",
    parent: "site",
    paths: ["/w", "/hire", "/api/w", ...CANDIDATE_PATHS],
    display: "/w, /hire, candidate links",
    coversRooms: true,
  },
  {
    key: "candidate-links",
    label: "Candidate links",
    pausedTitle: "This page is paused for maintenance",
    parent: "hiring",
    paths: CANDIDATE_PATHS,
    display: "/take-home, /ai-interview, lobby and room",
    coversRooms: true,
  },
  {
    key: "room",
    label: "Interview room",
    pausedTitle: "Interview rooms are paused",
    parent: "hiring",
    paths: ROOM_PATHS,
    display: "/w/*/interviews/*/room, /interview/*",
    coversRooms: true,
  },
  {
    key: "ai-screening",
    label: "AI screening, candidate side",
    pausedTitle: "AI screenings are paused",
    parent: "hiring",
    paths: AI_SCREENING_PATHS,
    display: "/ai-interview/*",
  },
  {
    key: "dev",
    label: "Developer side",
    pausedTitle: "This part of Interviewpad is paused",
    parent: "site",
    paths: [
      ...PLAYGROUND_PATHS,
      "/challenges",
      "/challenge",
      "/interview-questions",
      "/interview-question",
      "/blog",
      "/api/challenges",
      "/api/interview-questions",
      "/api/blogs",
      ...CREATOR_PATHS,
    ],
    display: "/play, /playgrounds, /challenges, /interview-questions, /blog",
  },
  {
    key: "playground",
    label: "Playground",
    pausedTitle: "The playground is paused",
    parent: "dev",
    paths: PLAYGROUND_PATHS,
    display: "/play, /playgrounds",
    elsewhere: [
      { label: "Interview questions", href: "/interview-questions" },
      { label: "Challenges", href: "/challenges" },
    ],
  },
  {
    key: "creators",
    label: "Creator marketplace",
    pausedTitle: "The creator marketplace is paused",
    parent: "dev",
    paths: CREATOR_PATHS,
    display: "/creators, /c/*",
  },
  {
    key: "public-api",
    label: "Public API and MCP",
    pausedTitle: "The API is paused",
    parent: "site",
    paths: ["/api/mcp", "/api/openapi"],
    display: "/api/mcp, /api/openapi",
  },
];

export function areaDef(key: string): AreaDef | undefined {
  return AREAS.find((a) => a.key === key);
}

/** Depth in the area tree: site 0, hiring 1, room 2. Custom rules count as pages. */
export function areaDepth(key: string): number {
  if (key === "custom") return 9;
  let depth = 0;
  let cur = areaDef(key);
  while (cur?.parent) {
    depth++;
    cur = areaDef(cur.parent);
  }
  return depth;
}

/** The shape the proxy and the banner use. A subset of the Prisma row. */
export type RuleLike = {
  id: string;
  area: string;
  paths: string[];
  message: string;
  startsAt: Date | null;
  endsAt: Date | null;
  bannerHours: number;
  bypassRoles: string[];
  endedAt: Date | null;
  createdAt?: Date;
};

/* ------------------------------------------------------------------------ */
/* Exemptions                                                               */
/* ------------------------------------------------------------------------ */

/** Never taken down: admins, sign-in, webhooks, crons and static files. */
export const ALWAYS_EXEMPT = [
  "/admin",
  "/api/admin",
  "/login",
  "/api/auth",
  "/api/webhooks",
  "/api/cron",
  "/_next",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  // App store listings link here; it must stay up during maintenance.
  "/gps-camera",
];

export function isExemptPath(pathname: string): boolean {
  if (ALWAYS_EXEMPT.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  // Static-looking assets: a file name with an extension in the last segment.
  const last = pathname.split("/").pop() ?? "";
  return /\.[a-z0-9]{1,8}$/i.test(last);
}

/* ------------------------------------------------------------------------ */
/* Matching                                                                 */
/* ------------------------------------------------------------------------ */

function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/**
 * How well one pattern covers a path, or null if it does not. Longer patterns
 * score higher; a literal segment beats a "*".
 */
export function patternScore(pattern: string, pathname: string): number | null {
  const p = segments(pattern);
  const s = segments(pathname);
  if (p.length > s.length) return null;
  let literals = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] === "*") continue;
    if (p[i] !== s[i]) return null;
    literals++;
  }
  return p.length * 100 + literals;
}

export function rulePaths(rule: Pick<RuleLike, "area" | "paths">): string[] {
  if (rule.paths.length) return rule.paths;
  return areaDef(rule.area)?.paths ?? [];
}

function bestScore(rule: RuleLike, pathname: string): number | null {
  let best: number | null = null;
  for (const p of rulePaths(rule)) {
    const s = patternScore(p, pathname);
    if (s !== null && (best === null || s > best)) best = s;
  }
  return best;
}

/**
 * The most specific rule covering `pathname`: longest matching pattern first,
 * then the deeper area (a page rule wins over its area), then the newest.
 * Exempt paths never match.
 */
export function matchRule<R extends RuleLike>(pathname: string, rules: R[]): R | null {
  if (isExemptPath(pathname)) return null;
  let best: { rule: R; score: number; depth: number; at: number } | null = null;
  for (const rule of rules) {
    const score = bestScore(rule, pathname);
    if (score === null) continue;
    const depth = areaDepth(rule.area);
    const at = rule.createdAt?.getTime() ?? 0;
    if (
      !best ||
      score > best.score ||
      (score === best.score && depth > best.depth) ||
      (score === best.score && depth === best.depth && at > best.at)
    ) {
      best = { rule, score, depth, at };
    }
  }
  return best?.rule ?? null;
}

/* ------------------------------------------------------------------------ */
/* Time window                                                              */
/* ------------------------------------------------------------------------ */

export function isRuleActive(rule: RuleLike, now: Date = new Date()): boolean {
  if (rule.endedAt) return false;
  const t = now.getTime();
  if (rule.startsAt && rule.startsAt.getTime() > t) return false;
  if (rule.endsAt && rule.endsAt.getTime() <= t) return false;
  return true;
}

export function isRuleUpcoming(rule: RuleLike, now: Date = new Date()): boolean {
  if (rule.endedAt || !rule.startsAt) return false;
  if (rule.startsAt.getTime() <= now.getTime()) return false;
  return !rule.endsAt || rule.endsAt.getTime() > rule.startsAt.getTime();
}

/** True when the rule is upcoming and inside its banner lead time. */
export function isInBannerWindow(rule: RuleLike, now: Date = new Date()): boolean {
  if (!isRuleUpcoming(rule, now) || rule.bannerHours <= 0 || !rule.startsAt) return false;
  return rule.startsAt.getTime() - now.getTime() <= rule.bannerHours * 3_600_000;
}

export type RuleState = "live" | "scheduled" | "down" | "ended";
export function ruleState(rule: RuleLike, now: Date = new Date()): RuleState {
  if (isRuleActive(rule, now)) return "down";
  if (isRuleUpcoming(rule, now)) return "scheduled";
  return "ended";
}

/** Seconds until the rule ends, for Retry-After. One hour when open-ended. */
export function retryAfterSeconds(endsAt: Date | null | undefined, now: Date = new Date()): number {
  if (!endsAt) return 3600;
  return Math.max(60, Math.ceil((endsAt.getTime() - now.getTime()) / 1000));
}

/** "about 40 minutes", "about 3 hours", or null when open-ended. */
export function backInAbout(endsAt: Date | null | undefined, now: Date = new Date()): string | null {
  if (!endsAt) return null;
  const mins = Math.max(1, Math.ceil((endsAt.getTime() - now.getTime()) / 60_000));
  if (mins < 120) return `about ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `about ${hours} hours`;
  return `about ${Math.round(hours / 24)} days`;
}

/* ------------------------------------------------------------------------ */
/* Loading (cached, fail open)                                              */
/* ------------------------------------------------------------------------ */

const TTL_MS = 10_000;
/** Id of the rule synthesised from the legacy `maintenance_mode` setting. */
export const LEGACY_RULE_ID = "legacy-site";

let cache: { at: number; rules: RuleLike[] } | null = null;

export function clearRulesCache() {
  cache = null;
  accessCache.clear();
}

async function legacyRule(): Promise<RuleLike | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: MAINTENANCE_KEY } });
  if (!row) return null;
  let cfg: MaintenanceConfig = DEFAULT_MAINTENANCE;
  try {
    cfg = { ...DEFAULT_MAINTENANCE, ...(JSON.parse(row.value) as Partial<MaintenanceConfig>) };
  } catch {
    return null;
  }
  if (!cfg.enabled) return null;
  return {
    id: LEGACY_RULE_ID,
    area: "site",
    paths: ["/"],
    message: cfg.message,
    startsAt: null,
    endsAt: null,
    bannerHours: 0,
    bypassRoles: [],
    endedAt: null,
    createdAt: new Date(0),
  };
}

/** Every rule that is running now or still to come (not ended). */
async function loadLiveRules(): Promise<RuleLike[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules;
  try {
    const now = new Date();
    const [rows, legacy] = await Promise.all([
      prisma.maintenanceRule.findMany({
        where: { endedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      legacyRule().catch(() => null),
    ]);
    const rules: RuleLike[] = legacy ? [...rows, legacy] : rows;
    cache = { at: Date.now(), rules };
    return rules;
  } catch {
    return cache?.rules ?? []; // fail open
  }
}

/** Rules in effect right now (the legacy site flag counts as one). */
export async function getActiveRules(now: Date = new Date()): Promise<RuleLike[]> {
  return (await loadLiveRules()).filter((r) => isRuleActive(r, now));
}

/** Rules scheduled to start later. */
export async function getUpcomingRules(now: Date = new Date()): Promise<RuleLike[]> {
  return (await loadLiveRules()).filter((r) => isRuleUpcoming(r, now));
}

/** The upcoming rule to warn about on this page, if any. */
export async function bannerFor(pathname: string, now: Date = new Date()): Promise<RuleLike | null> {
  const rules = (await loadLiveRules()).filter((r) => isInBannerWindow(r, now));
  if (!rules.length) return null;
  return matchRule(pathname, rules);
}

/* ------------------------------------------------------------------------ */
/* Who gets through                                                         */
/* ------------------------------------------------------------------------ */

type Access = { roleKeys: Set<string>; platformAdmin: boolean };
const accessCache = new Map<string, { at: number; access: Access }>();

async function accessFor(uid: string): Promise<Access> {
  const hit = accessCache.get(uid);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.access;
  const { resolveUserPermissionsUncached } = await import("@/lib/permissions/access");
  const [roles, perms] = await Promise.all([
    prisma.userRole.findMany({ where: { userId: uid }, select: { role: { select: { key: true } } }, take: 50 }),
    resolveUserPermissionsUncached(uid),
  ]);
  const access: Access = {
    roleKeys: new Set(roles.map((r) => r.role.key)),
    platformAdmin: perms.has("platform:admin"),
  };
  if (accessCache.size > 5000) accessCache.clear();
  accessCache.set(uid, { at: Date.now(), access });
  return access;
}

/** Platform admins always get through; others only with one of the rule's roles. */
export async function canBypass(uid: string | null | undefined, rule: Pick<RuleLike, "bypassRoles">): Promise<boolean> {
  if (!uid) return false;
  try {
    const a = await accessFor(uid);
    if (a.platformAdmin) return true;
    return rule.bypassRoles.some((k) => a.roleKeys.has(k));
  } catch {
    return false;
  }
}
