import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  isPermission,
  isPermissionGrant,
  type Permission,
} from "../../src/lib/permissions/permissions";
import {
  expandRolePermissions,
  resolveEffective,
  asOverrides,
  can,
  type Subject,
} from "../../src/lib/permissions/resolve";
import { ROLE_SPECS } from "../../prisma/seed-roles";

const specFor = (key: string) => {
  const spec = ROLE_SPECS.find((r) => r.key === key);
  if (!spec) throw new Error(`No role spec for ${key}`);
  return spec.permissions;
};

/** Build a Subject from one or more role keys (resolved like a real load). */
const subjectFromRoles = (
  userId: string | null,
  ...roleKeys: string[]
): Subject => ({
  userId,
  permissions: resolveEffective(roleKeys.map(specFor)),
});

describe("permissions catalogue", () => {
  it("isPermission accepts concrete permissions and rejects wildcards/typos", () => {
    expect(isPermission("candidate:read")).toBe(true);
    expect(isPermission("candidate:*")).toBe(false);
    expect(isPermission("candiate:read")).toBe(false);
    expect(isPermission(42)).toBe(false);
  });

  it("isPermissionGrant accepts wildcards that expand to known permissions", () => {
    expect(isPermissionGrant("*")).toBe(true);
    expect(isPermissionGrant("candidate:*")).toBe(true);
    expect(isPermissionGrant("candidate:read")).toBe(true);
    expect(isPermissionGrant("nonsense:*")).toBe(false);
    expect(isPermissionGrant("candidate:teleport")).toBe(false);
  });
});

describe("expandRolePermissions", () => {
  it("'*' expands to every permission", () => {
    expect(expandRolePermissions(["*"]).size).toBe(PERMISSIONS.length);
  });

  it("'resource:*' expands to that resource's actions only", () => {
    const set = expandRolePermissions(["candidate:*"]);
    expect(set).toEqual(
      new Set([
        "candidate:read",
        "candidate:write",
        "candidate:delete",
        "candidate:manage_pipeline",
      ]),
    );
  });

  it("passes concrete permissions through and ignores unknown entries", () => {
    const set = expandRolePermissions(["challenge:read", "bogus:thing"]);
    expect(set).toEqual(new Set(["challenge:read"]));
  });
});

describe("resolveEffective", () => {
  it("unions multiple roles' permissions (multi-role per user)", () => {
    const set = resolveEffective([
      ["comment:moderate"],
      ["content:author", "content:moderate"],
    ]);
    expect(set).toEqual(
      new Set(["comment:moderate", "content:author", "content:moderate"]),
    );
  });

  it("applies delta overrides: grant adds, revoke removes", () => {
    const set = resolveEffective([["candidate:read"]], {
      "candidate:write": true, // grant beyond role
      "candidate:read": false, // revoke from role
    });
    expect(set.has("candidate:write")).toBe(true);
    expect(set.has("candidate:read")).toBe(false);
  });

  it("ignores override keys that aren't real permissions", () => {
    const set = resolveEffective([["candidate:read"]], {
      "candidate:fly": true,
    } as Record<string, boolean>);
    expect(set.has("candidate:read")).toBe(true);
    expect([...set]).not.toContain("candidate:fly");
  });
});

describe("asOverrides", () => {
  it("narrows a plain object of booleans", () => {
    expect(asOverrides({ "a:b": true, "c:d": false })).toEqual({
      "a:b": true,
      "c:d": false,
    });
  });
  it("drops non-boolean values and rejects arrays/null", () => {
    expect(asOverrides({ "a:b": true, "x:y": "nope" })).toEqual({ "a:b": true });
    expect(asOverrides(["a"])).toBeNull();
    expect(asOverrides(null)).toBeNull();
  });
});

describe("can() — permission and ownership rule", () => {
  const viewer = subjectFromRoles("u1", "VIEWER");

  it("returns true when the subject holds the permission", () => {
    expect(can(viewer, "candidate:read")).toBe(true);
  });

  it("returns false when the subject lacks the permission", () => {
    expect(can(viewer, "candidate:write")).toBe(false);
  });

  it("ownership grants a content check on your own resource", () => {
    const author: Subject = { userId: "u1", permissions: new Set<Permission>() };
    expect(
      can(author, "challenge:write", {
        contentType: "CHALLENGE",
        authorId: "u1",
      }),
    ).toBe(true);
  });

  it("content:moderate is a staff override on someone else's owned content", () => {
    const moderator: Subject = {
      userId: "mod",
      permissions: new Set<Permission>(["content:moderate"]),
    };
    // Not the owner, lacks snippet:write outright — passes via the override.
    expect(
      can(moderator, "snippet:write", { contentType: "SNIPPET", userId: "someone-else" }),
    ).toBe(true);
    expect(
      can(moderator, "blogpost:delete", { contentType: "BLOG_POST", userId: "someone-else" }),
    ).toBe(true);
  });

  it("a plain user cannot mutate someone else's owned content", () => {
    const stranger: Subject = { userId: "x", permissions: new Set<Permission>() };
    expect(
      can(stranger, "snippet:write", { contentType: "SNIPPET", userId: "owner" }),
    ).toBe(false);
  });

  it("the snippet owner can write/delete their own snippet", () => {
    const owner: Subject = { userId: "owner", permissions: new Set<Permission>() };
    expect(can(owner, "snippet:write", { contentType: "SNIPPET", userId: "owner" })).toBe(true);
    expect(can(owner, "snippet:delete", { contentType: "SNIPPET", userId: "owner" })).toBe(true);
  });

  it("ownership does NOT help on someone else's resource", () => {
    const author: Subject = { userId: "u1", permissions: new Set<Permission>() };
    expect(
      can(author, "challenge:write", {
        contentType: "CHALLENGE",
        authorId: "u2",
      }),
    ).toBe(false);
  });

  it("anonymous subject never passes via ownership", () => {
    const anon: Subject = { userId: null, permissions: new Set<Permission>() };
    expect(
      can(anon, "snippet:read" as Permission, {
        contentType: "SNIPPET",
        userId: null,
      }),
    ).toBe(false);
  });
});

describe("seeded role permission sets match intent", () => {
  it("VIEWER is read-only", () => {
    const s = subjectFromRoles("u", "VIEWER");
    expect(can(s, "candidate:read")).toBe(true);
    expect(can(s, "candidate:write")).toBe(false);
    expect(can(s, "candidate:delete")).toBe(false);
    expect(can(s, "member:invite")).toBe(false);
  });

  it("INTERVIEWER can conduct interviews + create take-homes but not manage members/billing", () => {
    const s = subjectFromRoles("u", "INTERVIEWER");
    expect(can(s, "interview:conduct")).toBe(true);
    expect(can(s, "takehome:create")).toBe(true);
    expect(can(s, "member:invite")).toBe(false);
    expect(can(s, "billing:manage")).toBe(false);
  });

  it("RECRUITER manages candidates (incl. delete) but not billing/integrations", () => {
    const s = subjectFromRoles("u", "RECRUITER");
    expect(can(s, "candidate:delete")).toBe(true);
    expect(can(s, "candidate:manage_pipeline")).toBe(true);
    expect(can(s, "billing:manage")).toBe(false);
    expect(can(s, "integration:manage")).toBe(false);
  });

  it("ADMIN manages everything except owner-only workspace:manage", () => {
    const s = subjectFromRoles("u", "ADMIN");
    expect(can(s, "integration:manage")).toBe(true);
    expect(can(s, "billing:manage")).toBe(true);
    expect(can(s, "member:set_role")).toBe(true);
    expect(can(s, "workspace:manage")).toBe(false);
  });

  it("OWNER holds every workspace permission incl. workspace:manage", () => {
    const s = subjectFromRoles("u", "OWNER");
    expect(can(s, "workspace:manage")).toBe(true);
    expect(can(s, "candidate:delete")).toBe(true);
    // ...but a workspace owner is NOT a platform admin
    expect(can(s, "platform:admin")).toBe(false);
    expect(can(s, "user:manage")).toBe(false);
  });

  it("PLATFORM_ADMIN is a superset", () => {
    const s = subjectFromRoles("u", "PLATFORM_ADMIN");
    for (const p of PERMISSIONS) expect(can(s, p)).toBe(true);
  });

  it("MODERATOR moderates but cannot curate or manage users", () => {
    const s = subjectFromRoles("u", "MODERATOR");
    expect(can(s, "content:moderate")).toBe(true);
    expect(can(s, "comment:moderate")).toBe(true);
    expect(can(s, "content:curate")).toBe(false);
    expect(can(s, "user:manage")).toBe(false);
  });

  it("CREATOR can author/sell but is not staff", () => {
    const s = subjectFromRoles("u", "CREATOR");
    expect(can(s, "content:author")).toBe(true);
    expect(can(s, "product:sell")).toBe(true);
    expect(can(s, "platform:admin")).toBe(false);
    expect(can(s, "content:curate")).toBe(false);
  });

  it("multi-role union: CREATOR + MODERATOR holds both sets", () => {
    const s = subjectFromRoles("u", "CREATOR", "MODERATOR");
    expect(can(s, "content:author")).toBe(true);
    expect(can(s, "content:moderate")).toBe(true);
  });
});
