import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getMaintenanceConfig, maintenanceHtml } from "@/lib/maintenance";
import { isAdminEmail } from "@/lib/admin";
import { guardFor, STAFF_SENTINEL } from "@/lib/permissions/route-guards";
import { resolveUserPermissionsUncached } from "@/lib/permissions/access";
import { PLATFORM_PERMISSIONS } from "@/lib/permissions/permissions";

// Next.js 16 "Proxy" (formerly Middleware) — runs on the Node.js runtime by
// default, so Prisma + next-auth JWT decoding work here directly.

// Paths that stay reachable during maintenance so admins can sign in and turn
// it back off, and so auth/static assets keep working. Matched as exact or
// prefix (`/x` also covers `/x/...`).
const ALLOWLIST = [
  "/login",
  "/api/auth", // NextAuth sign-in & callbacks
  "/admin", // admin panel — to toggle maintenance off
  "/api/admin", // admin APIs
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
];

const RETRY_AFTER = "3600"; // seconds — hint for crawlers/clients

function isAllowlisted(pathname: string): boolean {
  if (
    ALLOWLIST.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
  ) {
    return true;
  }
  // Static-looking assets (the matcher already drops /_next/static & images).
  return /\.[a-z0-9]+$/i.test(pathname);
}

/**
 * Centralized authorization for GLOBAL-scope routes (admin/creator/platform
 * APIs). Resolves the caller's permissions from the DB (Node runtime → Prisma
 * works here, always fresh — no JWT staleness) and enforces the declarative
 * ROUTE_GUARDS map. Per-page guards remain as defense-in-depth; this is the
 * primary front door. Returns a response to short-circuit, or null to continue.
 */
async function enforceRouteGuard(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  const guard = guardFor(pathname);
  if (!guard) return null;

  const isApi = pathname.startsWith("/api");
  let userId: string | undefined;
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: req.nextUrl.protocol === "https:",
    });
    userId = typeof token?.uid === "string" ? token.uid : undefined;
  } catch {
    userId = undefined;
  }

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

export async function proxy(req: NextRequest) {
  try {
    const cfg = await getMaintenanceConfig();
    if (!cfg.enabled) return (await enforceRouteGuard(req)) ?? NextResponse.next();

    const { pathname } = req.nextUrl;
    if (isAllowlisted(pathname)) return NextResponse.next();

    // Admin bypass — decode the session JWT (no DB) and check the email against
    // the ADMIN_EMAILS allowlist, so admins can browse/verify while down.
    try {
      const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        secureCookie: req.nextUrl.protocol === "https:",
      });
      const email =
        typeof token?.email === "string" ? token.email : null;
      if (isAdminEmail(email)) return NextResponse.next();
    } catch {
      // Couldn't decode the session — treat as anonymous. Admins can still
      // reach /admin & /login via the allowlist to lift maintenance.
    }

    // Everyone else gets a proper 503 (not a 404) so crawlers know it's
    // temporary and don't de-index the site.
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { error: "Service temporarily unavailable for scheduled maintenance." },
        { status: 503, headers: { "Retry-After": RETRY_AFTER } }
      );
    }
    return new NextResponse(maintenanceHtml(cfg.message), {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "Retry-After": RETRY_AFTER,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // Fail OPEN: a bug in the proxy must never take the whole site down.
    return NextResponse.next();
  }
}

export const config = {
  // Run on everything except Next internals and static files; the allowlist
  // above handles the dynamic exceptions (auth, admin, etc).
  matcher: ["/((?!_next/static|_next/image|_next/data).*)"],
};
