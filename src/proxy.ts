import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getMaintenanceConfig, maintenanceHtml } from "@/lib/maintenance";
import { isAdminEmail } from "@/lib/admin";

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

export async function proxy(req: NextRequest) {
  try {
    const cfg = await getMaintenanceConfig();
    if (!cfg.enabled) return NextResponse.next();

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
