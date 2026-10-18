import { describe, expect, it } from "vitest";
import { normaliseEmail, permissionEditRefusal, unassignRefusal } from "./role-guards";

describe("permissionEditRefusal", () => {
  it("refuses system roles", () => {
    expect(permissionEditRefusal({ isSystem: true, key: "MODERATOR" })).toMatch(/system role/);
  });
  it("allows custom roles", () => {
    expect(permissionEditRefusal({ isSystem: false, key: "SUPPORT" })).toBeNull();
  });
});

describe("unassignRefusal", () => {
  const base = { roleKey: "PLATFORM_ADMIN", targetUserId: "u2", actorUserId: "u1", holderCount: 2 };
  it("allows removing another admin when others remain", () => {
    expect(unassignRefusal(base)).toBeNull();
  });
  it("refuses removing the last holder", () => {
    expect(unassignRefusal({ ...base, holderCount: 1 })).toMatch(/last platform admin/);
  });
  it("refuses removing your own platform admin role", () => {
    expect(unassignRefusal({ ...base, targetUserId: "u1", holderCount: 5 })).toMatch(/your own/);
  });
  it("ignores other roles", () => {
    expect(
      unassignRefusal({ ...base, roleKey: "MODERATOR", targetUserId: "u1", holderCount: 1 }),
    ).toBeNull();
  });
  it("still refuses the last holder when the actor is unknown", () => {
    expect(unassignRefusal({ ...base, actorUserId: null, holderCount: 1 })).not.toBeNull();
  });
});

describe("normaliseEmail", () => {
  it("trims and lowercases", () => {
    expect(normaliseEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});
