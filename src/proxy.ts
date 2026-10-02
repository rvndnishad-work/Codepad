import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { maintenanceHtml } from "@/lib/maintenance";
import {
  areaDef,
  canBypass,
  getActiveRules,
  isExemptPath,
  matchRule,
  retryAfterSeconds,
} from "@/lib/admin/maintenance-rules";
import { guardFor, STAFF_SENTINEL } from "@/lib/permissions/route-guards";
import { resolveUserPermissionsUncached } from "@/lib/permissions/access";
import { PLATFORM_PERMISSIONS } from "@/lib/permissions/permissions";
import { REQUEST_PATH_HEADER } from "@/lib/workspace/screening-defaults";

// Next.js 16 "Proxy" (formerly Middleware) — runs on the Node.js runtime by
// default, so Prisma + next-auth JWT decoding work here directly.

/** Decode the session JWT once per request (no DB). */
function uidReader(req: NextRequest) {
  let read: Promise<string | undefined> | null = null;
  return () => {
    read ??= getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: req.nextUrl.protocol === "https:",
    })
      .then((t) => (typeof t?.uid === "string" ? t.uid : undefined))
      .catch(() => undefined);
    return read;
  };
}

/**
 * Centralized authorization for GLOBAL-scope routes (admin/creator/platform
 * APIs). Resolves the caller's permissions from the DB (Node runtime → Prisma
 * works here, always fresh — no JWT staleness) and enforces the declarative
 * ROUTE_GUARDS map. Per-page guards remain as defense-in-depth; this is the
 * primary front door. Runs on every request, maintenance or not. Returns a
 * response to short-circuit, or null to continue.
 */
async function enforceRouteGuard(
  req: NextRequest,
  uid: () => Promise<string | undefined>,
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  const guard = guardFor(pathname);
  if (!guard) return null;

  const isApi = pathname.startsWith("/api");
  const userId = await uid();

  if (!userId) {
    if (isApi) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const perms = await resolveUserPermissionsUncached(userId);
  const ok =
    guard.permission === STAFF_SENTINEL
      ? PLATFORM_PERMISSIONS.some((p) => perms.has(p))
      : perms.has(guard.permission);
  if (ok) return null;

  // Forbidden. APIs get a clean 403; pages get a 404 (non-enumerable — same
  // posture as the per-page notFound() guards).
  return isApi
    ? NextResponse.json({ error: "forbidden" }, { status: 403 })
    : new NextResponse("Not Found", { status: 404 });
}

/**
 * Continue to the page. Pages also get the path they were asked for: the
 * /w/[slug] layouts use it to open the same page at a moved workspace
 * address, and the maintenance banner uses it to find the rule for the page.
 */
function passThrough(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname.startsWith("/api")) return NextResponse.next();
  const headers = new Headers(req.headers);
  headers.set(REQUEST_PATH_HEADER, req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export async function proxy(req: NextRequest) {
  try {
    const uid = uidReader(req);
    const blocked = await enforceRouteGuard(req, uid);
    if (blocked) return blocked;

    const { pathname } = req.nextUrl;
    if (isExemptPath(pathname)) return passThrough(req);

    const rules = await getActiveRules();
    if (!rules.length) return passThrough(req);
    const rule = matchRule(pathname, rules);
    if (!rule) return passThrough(req);

    // Who gets through: platform admins always, plus the rule's roles.
    if (await canBypass(await uid(), rule)) return passThrough(req);

    // Everyone else gets a proper 503 (not a 404) so crawlers know it is
    // temporary and do not de-index the site.
    const retryAfter = String(retryAfterSeconds(rule.endsAt));
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          error: rule.message || "Service temporarily unavailable for scheduled maintenance.",
          maintenance: true,
          endsAt: rule.endsAt?.toISOString() ?? null,
        },
        { status: 503, headers: { "Retry-After": retryAfter, "Cache-Control": "no-store" } },
      );
    }
    const area = areaDef(rule.area);
    return new NextResponse(
      maintenanceHtml(rule.message, {
        title: area?.pausedTitle ?? "This page is paused for maintenance",
        endsAt: rule.endsAt,
        elsewhere: area?.elsewhere,
      }),
      {
        status: 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "Retry-After": retryAfter,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    // Fail OPEN: a bug in the proxy must never take the whole site down.
    return NextResponse.next();
  }
}

export const config = {
  // Run on everything except Next internals and static files; isExemptPath
  // handles the dynamic exceptions (auth, admin, crons, webhooks).
  matcher: ["/((?!_next/static|_next/image|_next/data).*)"],
};
