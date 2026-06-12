import { describe, it, expect } from "vitest";
import { guardFor, STAFF_SENTINEL } from "../../src/lib/permissions/route-guards";

const perm = (p: string) => guardFor(p)?.permission ?? null;

describe("guardFor — centralized route → permission map", () => {
  it("matches specific admin surfaces before the broad /admin rule", () => {
    expect(perm("/admin/roles")).toBe("platform:admin");
    expect(perm("/admin/roles/anything")).toBe("platform:admin");
    expect(perm("/admin/users")).toBe("user:manage");
    expect(perm("/admin/creators")).toBe("creator:review");
    expect(perm("/admin/users/recruiters")).toBe("user:manage");
    expect(perm("/admin/comments")).toBe("comment:moderate");
    expect(perm("/admin/blogs")).toBe("content:curate");
    expect(perm("/admin/snippets")).toBe("content:curate");
    expect(perm("/admin/challenges/new")).toBe("content:curate");
  });

  it("falls back to the staff sentinel for other admin routes", () => {
    expect(perm("/admin")).toBe(STAFF_SENTINEL);
    expect(perm("/admin/inbox")).toBe(STAFF_SENTINEL);
    expect(perm("/admin/workspaces/abc")).toBe(STAFF_SENTINEL);
    expect(perm("/api/admin/challenges")).toBe(STAFF_SENTINEL);
  });

  it("guards platform API + docs", () => {
    expect(perm("/api-docs")).toBe("platform:admin");
    expect(perm("/api/openapi")).toBe("platform:admin");
  });

  it("guards the creator studio (singular)", () => {
    expect(perm("/creator")).toBe("content:author");
    expect(perm("/creator/earnings")).toBe("content:author");
    expect(perm("/creator/purchased")).toBe("content:author");
  });

  it("does NOT guard the public storefront (/creators, plural)", () => {
    expect(guardFor("/creators/user123")).toBeNull();
    expect(guardFor("/creators")).toBeNull();
  });

  it("leaves public + workspace routes unguarded by the proxy", () => {
    expect(guardFor("/")).toBeNull();
    expect(guardFor("/challenges/two-sum")).toBeNull();
    expect(guardFor("/w/acme/candidates")).toBeNull();
    expect(guardFor("/blog/some-post")).toBeNull();
    expect(guardFor("/api/challenges/two-sum")).toBeNull();
  });
});
