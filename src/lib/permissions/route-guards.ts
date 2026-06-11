/**
 * Declarative route → permission map enforced centrally by the Proxy
 * (src/proxy.ts). This is the single place to see "what does this route group
 * require?" for GLOBAL-scope surfaces (platform/creator). It is pure (no DB) so
 * it's trivially testable; the proxy resolves the user's permissions and checks
 * them against the matched rule.
 *
 * Scope boundary: only routes whose access is a function of GLOBAL permissions
 * live here. Workspace routes (/w/[slug]) depend on per-workspace membership +
 * the slug, which the proxy can't resolve cheaply — those stay gated per-page
 * (Phase 1). Resource-ownership and content-paywall checks are dynamic and also
 * stay per-page. The PUBLIC creator storefront lives at /creators/[id] (plural)
 * so it never falls under the /creator studio prefix.
 *
 * The per-page guards (requireAdminAccess / staffCan / userCan) remain in place
 * as defense-in-depth; this map is the primary, declarative front door.
 */
import { type Permission } from "./permissions";

/** Sentinel meaning "any platform-scope permission" (i.e. isStaff). */
export const STAFF_SENTINEL = "__staff__" as const;

export type GuardPermission = Permission | typeof STAFF_SENTINEL;

export type RouteGuard = { prefix: string; permission: GuardPermission };

/**
 * Ordered, first-match-wins. More specific prefixes MUST come before their
 * broader parents (e.g. "/admin/roles" before "/admin").
 */
export const ROUTE_GUARDS: readonly RouteGuard[] = [
  // Admin content/moderation surfaces — specific permissions.
  { prefix: "/admin/roles", permission: "platform:admin" },
  { prefix: "/admin/users", permission: "user:manage" },
  { prefix: "/admin/comments", permission: "comment:moderate" },
  { prefix: "/admin/blogs", permission: "content:curate" },
  { prefix: "/admin/snippets", permission: "content:curate" },
  { prefix: "/admin/challenges", permission: "content:curate" },
  // Everything else under the admin console — any staff role may enter; each
  // sub-page still enforces its own specific permission per-page.
  { prefix: "/admin", permission: STAFF_SENTINEL },
  { prefix: "/api/admin", permission: STAFF_SENTINEL },
  { prefix: "/api/openapi", permission: "platform:admin" },
  { prefix: "/api-docs", permission: "platform:admin" },
  // Creator studio (authoring + selling). The public storefront is /creators
  // (plural) and is intentionally NOT under this prefix.
  { prefix: "/creator", permission: "content:author" },
];

/** The guard rule for a pathname, or null when the route is unguarded. */
export function guardFor(pathname: string): RouteGuard | null {
  for (const guard of ROUTE_GUARDS) {
    if (pathname === guard.prefix || pathname.startsWith(guard.prefix + "/")) {
      return guard;
    }
  }
  return null;
}
