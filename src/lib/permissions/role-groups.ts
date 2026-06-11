/**
 * Coarse role-key groups for DB *targeting* — notification/email fan-out that
 * asks "which members should hear about this?". These are NOT authorization
 * boundaries: a SQL `where role in (...)` can't account for per-member
 * permission overrides, so anything that gates access must go through
 * `can()` / `canMember()` instead. Kept here as one definition so the inline
 * arrays scattered across triggers/emails don't drift.
 */

/** Workspace managers — the "notify the admins" audience. */
export const MANAGER_ROLES = ["OWNER", "ADMIN"] as const;

/** Everyone who actively works the hiring pipeline (excludes read-only VIEWER).
 *  Superset of the legacy ["OWNER","ADMIN","INTERVIEWER"] target, now also
 *  including the RECRUITER role. */
export const STAFF_ROLES = ["OWNER", "ADMIN", "RECRUITER", "INTERVIEWER"] as const;
