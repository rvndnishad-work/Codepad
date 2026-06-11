/**
 * Canonical permission catalogue — the single source of truth for every
 * capability the platform can authorize.
 *
 * Permissions are code-defined (this file); ROLES are DB-defined
 * (`Role`/`RolePermission`/`UserRole`). That split is deliberate: the code is
 * the only thing that actually *enforces* a capability, so a permission must
 * exist here before any check can gate on it — but which roles bundle which
 * permissions is data an admin can recompose at runtime without a deploy. The
 * role editor and the seed both validate every `RolePermission.permission`
 * against {@link PERMISSIONS} (see {@link isPermission}), so the DB can never
 * grant a capability the code doesn't understand.
 *
 * Strings are `resource:action`. Each is a member of the {@link Permission}
 * union, so a typo at a call site (`can(m, "candiate:read")`) is a compile
 * error, not a silent allow.
 *
 * Three scopes share this one catalogue (and one `can()` primitive):
 *   - workspace : scoped to a WorkspaceMember (the B2B `/w/[slug]` surface)
 *   - platform  : global staff/content capabilities (held via UserRole)
 *   - creator   : global creator capabilities (held via UserRole)
 * Ownership ("edit my own snippet") is NOT a permission — it's a resolver rule
 * in resolve.ts keyed off the resource's owner field.
 */

/** Workspace-scoped capabilities (resolved from `WorkspaceMember.role`). */
export const WORKSPACE_PERMISSIONS = [
  "candidate:read",
  "candidate:write",
  "candidate:delete",
  "candidate:manage_pipeline",
  "challenge:read",
  "challenge:write",
  "takehome:read",
  "takehome:create",
  "interview:read",
  "interview:conduct",
  "interview:manage",
  "member:read",
  "member:invite",
  "member:remove",
  "member:set_role",
  "billing:read",
  "billing:manage",
  "integration:read",
  "integration:manage",
  "email:read",
  "audit:read",
  "workspace:manage",
] as const;

/** Global platform/staff capabilities (resolved from global `UserRole`s). */
export const PLATFORM_PERMISSIONS = [
  "comment:moderate",
  "content:moderate", // hide/remove any post/snippet/challenge
  "content:curate", // feature/publish others' content, manage categories
  "user:manage", // ban/edit users
  "platform:admin", // staff superset (implies all platform surfaces)
] as const;

/** Global creator capabilities (resolved from global `UserRole`s). */
export const CREATOR_PERMISSIONS = [
  "content:author", // create exclusive/sellable content
  "product:sell", // publish products / receive payouts
  "creator:page", // manage own creator page
] as const;

export const PERMISSIONS = [
  ...WORKSPACE_PERMISSIONS,
  ...PLATFORM_PERMISSIONS,
  ...CREATOR_PERMISSIONS,
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);

/** Runtime guard — true only for a concrete, known permission. */
export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

/**
 * What a `RolePermission` row is allowed to store: a concrete permission OR a
 * wildcard that expands to ≥1 known permission (`"*"` or `"<resource>:*"`).
 * Used by the seed and the admin role editor to reject grants the code can't
 * enforce — the gate that keeps DB-defined roles honest against the code.
 */
export function isPermissionGrant(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value === "*") return true;
  if (value.endsWith(":*")) {
    const prefix = value.slice(0, -1); // keep trailing colon
    return PERMISSIONS.some((p) => p.startsWith(prefix));
  }
  return PERMISSION_SET.has(value);
}

/**
 * The content types that can be owned/sold and gated by an entitlement. The
 * ownership rule in resolve.ts maps each to the field that holds its owner.
 */
export const OWNABLE_CONTENT_TYPES = ["CHALLENGE", "BLOG_POST", "SNIPPET"] as const;
export type OwnableContentType = (typeof OWNABLE_CONTENT_TYPES)[number];
