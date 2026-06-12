/**
 * Pure permission resolution — no DB, no I/O, no framework. Everything here is
 * a deterministic function of its inputs so it's trivially unit-testable and
 * usable on both server and client. The DB-backed adapters live in access.ts.
 *
 * Resolution pipeline:
 *   role permission lists ──expand wildcards──▶ Set<Permission>
 *         (one set per role a subject holds)
 *                          ──union──▶ effective base set
 *                          ──apply delta overrides──▶ effective set
 *   can(ctx, perm, resource?) ──▶ effective.has(perm)  OR  ownership rule
 */
import {
  PERMISSIONS,
  type Permission,
  type OwnableContentType,
} from "./permissions";

/**
 * A role's stored permission list may contain concrete permissions or two
 * wildcard forms:
 *   "*"            → every permission
 *   "<resource>:*" → every action on that resource (e.g. "candidate:*")
 * Unknown/typo'd entries are silently ignored here; the seed/role-editor is
 * responsible for rejecting them up front via isPermission().
 */
export function expandRolePermissions(
  perms: readonly string[],
): Set<Permission> {
  const out = new Set<Permission>();
  for (const entry of perms) {
    if (entry === "*") {
      for (const p of PERMISSIONS) out.add(p);
      continue;
    }
    if (entry.endsWith(":*")) {
      const prefix = entry.slice(0, -1); // keep the colon: "candidate:"
      for (const p of PERMISSIONS) if (p.startsWith(prefix)) out.add(p);
      continue;
    }
    if ((PERMISSIONS as readonly string[]).includes(entry)) {
      out.add(entry as Permission);
    }
  }
  return out;
}

/** Per-subject delta: grant (true) or revoke (false) a permission relative to
 *  the role-derived base. Stored as `Json?` on User/WorkspaceMember. */
export type PermissionOverrides = Record<string, boolean>;

/** Narrow an unknown JSON value (Prisma `Json?`) to a usable override map. */
export function asOverrides(value: unknown): PermissionOverrides | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: PermissionOverrides = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

/**
 * Combine one-or-more roles' permission lists into the effective set:
 * union of every role's expanded permissions, then apply the subject's delta
 * overrides (grant adds, revoke removes). A delta wins over the role union —
 * that's what makes per-member/per-user customization possible on top of a
 * shared role.
 *
 * Storing a *delta* (not a snapshot of the full set) means later changes to a
 * role's defaults still flow through to subjects who only overrode a couple of
 * permissions.
 */
export function resolveEffective(
  rolePermissionLists: readonly (readonly string[])[],
  overrides?: PermissionOverrides | null,
): Set<Permission> {
  const effective = new Set<Permission>();
  for (const list of rolePermissionLists) {
    for (const p of expandRolePermissions(list)) effective.add(p);
  }
  if (overrides) {
    for (const [perm, granted] of Object.entries(overrides)) {
      if (!(PERMISSIONS as readonly string[]).includes(perm)) continue;
      if (granted) effective.add(perm as Permission);
      else effective.delete(perm as Permission);
    }
  }
  return effective;
}

/** The owner field for each ownable content type — the ownership rule below
 *  compares this against the acting subject's id. */
const OWNER_FIELD: Record<OwnableContentType, "authorId" | "userId"> = {
  CHALLENGE: "authorId", // Challenge.authorId
  BLOG_POST: "userId", // BlogPost.userId
  SNIPPET: "userId", // Snippet.userId
  TUTORIAL: "authorId", // Tutorial.authorId
  INTERVIEW_QA: "authorId", // InterviewQA.authorId
  INTERVIEW_EXPERIENCE: "authorId", // InterviewExperience.authorId
};

/** A resource an ownership-sensitive check can be made against. */
export type OwnedResource = {
  contentType: OwnableContentType;
  /** The owning user's id, read from the resource's owner field. */
  authorId?: string | null;
  userId?: string | null;
};

/**
 * The subject of an authorization decision: who they are plus their already-
 * resolved effective permission set. Build it from access.ts adapters
 * (loadUserPermissions / loadWorkspaceMember).
 */
export type Subject = {
  userId: string | null | undefined;
  permissions: ReadonlySet<Permission>;
};

/**
 * The single authorization primitive. Returns true when the subject holds
 * `permission`. When a `resource` is supplied, an ownership rule also grants
 * the corresponding write/read: the owner of a piece of content passes content
 * checks on it without needing a curate/moderate permission. Holders of
 * `content:curate` or `platform:admin` pass regardless of ownership.
 */
export function can(
  subject: Subject,
  permission: Permission,
  resource?: OwnedResource,
): boolean {
  if (subject.permissions.has(permission)) return true;
  if (resource) {
    // Ownership: the owner of a piece of content passes content checks on it.
    if (subject.userId) {
      const ownerId = resource[OWNER_FIELD[resource.contentType]];
      if (ownerId && ownerId === subject.userId) return true;
    }
    // Staff moderation override: a content:moderate holder may act on any
    // owned content (edit/remove reported items) regardless of ownership.
    if (subject.permissions.has("content:moderate")) return true;
  }
  return false;
}
