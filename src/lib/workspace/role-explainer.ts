/**
 * Plain-language rows for the Roles tab on the Members page.
 *
 * Only permissions that the code actually checks are listed here, each with
 * the places it gates. Which roles hold them is read from the Role table at
 * request time, so the matrix always matches what the checks will decide.
 *
 * Not listed: candidate:read, challenge:read/write, takehome:read,
 * interview:read, integration:read and workspace:manage. No page or action
 * checks them today, so listing them would promise a restriction that does
 * not exist.
 *
 * Pure: safe for client components.
 */
import type { Permission } from "@/lib/permissions/permissions";

export type RoleExplainerRow = { permission: Permission; label: string };
export type RoleExplainerGroup = { label: string; rows: RoleExplainerRow[] };

export const ROLE_EXPLAINER: RoleExplainerGroup[] = [
  {
    label: "Candidates and results",
    rows: [
      // candidates/manage-actions.ts, api/w/[slug]/candidates, crm/candidates-server.ts
      { permission: "candidate:write", label: "Add and edit candidates, notes and tags" },
      // crm/candidates-server.ts (stage moves), ai-interviews/[sessionId] (decide)
      { permission: "candidate:manage_pipeline", label: "Pass or not pass a candidate" },
      // candidates/manage-actions.ts, api/w/[slug]/candidates/[id]
      { permission: "candidate:delete", label: "Erase a candidate" },
    ],
  },
  {
    label: "Screenings",
    rows: [
      // take-homes/actions.ts, candidates/actions.ts
      { permission: "takehome:create", label: "Send take homes" },
      // interviews/actions.ts, ai-interviews/actions.ts, library-server.ts
      { permission: "interview:conduct", label: "Schedule interviews, run AI screenings and edit the question library" },
      // interviews/actions.ts delete, interviews/[id]/report
      { permission: "interview:manage", label: "Delete interviews hosted by someone else" },
    ],
  },
  {
    label: "Workspace",
    rows: [
      // /w/[slug]/members page
      { permission: "member:read", label: "See the members list" },
      // api/w/[slug]/members POST
      { permission: "member:invite", label: "Invite people and revoke invites" },
      // api/w/[slug]/members DELETE
      { permission: "member:remove", label: "Remove people" },
      // api/w/[slug]/members PATCH
      { permission: "member:set_role", label: "Change roles and extra permissions" },
      // /w/[slug]/billing page
      { permission: "billing:read", label: "See billing and plan" },
      // api/w/[slug]/billing/session, AI credit purchase
      { permission: "billing:manage", label: "Change plan and buy AI credits" },
      // ats, api-keys, external-mcp pages and actions
      { permission: "integration:manage", label: "Manage ATS sync, API keys and external tools" },
      // /w/[slug]/emails
      { permission: "email:read", label: "See email activity" },
      // /w/[slug]/audit
      { permission: "audit:read", label: "See the audit log" },
    ],
  },
];

/** Every permission shown in the explainer, in display order. */
export const EXPLAINED_PERMISSIONS: Permission[] = ROLE_EXPLAINER.flatMap((g) => g.rows.map((r) => r.permission));

export const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_EXPLAINER.flatMap((g) => g.rows.map((r) => [r.permission, r.label])),
);

/**
 * Number of extra grants (+) and removals (-) a member's overrides make
 * against their role, counting only permissions the code enforces.
 */
export function overrideSummary(
  roleBase: readonly string[],
  overrides: Record<string, boolean> | null | undefined,
): { added: number; removed: number } {
  const base = new Set(roleBase);
  let added = 0;
  let removed = 0;
  for (const p of EXPLAINED_PERMISSIONS) {
    const v = overrides?.[p];
    if (v === true && !base.has(p)) added++;
    if (v === false && base.has(p)) removed++;
  }
  return { added, removed };
}
