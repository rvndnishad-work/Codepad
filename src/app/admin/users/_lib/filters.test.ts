import { describe, expect, it } from "vitest";
import { buildUserOrderBy, buildUserWhere, csvCell, listQuery, parseListParams, statusWhere } from "./filters";

const now = new Date("2026-10-02T12:00:00Z");

describe("parseListParams", () => {
  it("falls back to safe defaults for junk", () => {
    expect(parseListParams({ status: "evil", sort: "x", size: "7", page: "-3", from: "yesterday" })).toEqual({
      q: "",
      status: "",
      from: "",
      to: "",
      sort: "newest",
      page: 1,
      size: 25,
    });
  });
  it("keeps valid values and trims search", () => {
    const p = parseListParams({ q: "  Ada ", status: "suspended", sort: "name", size: "100", page: "3", from: "2026-01-01", to: "2026-02-01" });
    expect(p).toEqual({ q: "Ada", status: "suspended", from: "2026-01-01", to: "2026-02-01", sort: "name", page: 3, size: 100 });
  });
  it("round-trips through listQuery, dropping defaults", () => {
    const p = parseListParams({ q: "x", sort: "name" });
    expect(listQuery(p)).toBe("?q=x&sort=name");
    expect(listQuery(p, { page: 2, status: "deleted" })).toBe("?q=x&status=deleted&sort=name&page=2");
    expect(listQuery(parseListParams({}))).toBe("");
  });
});

describe("buildUserWhere", () => {
  it("developers include users with no type; recruiters do not", () => {
    const dev = buildUserWhere("developers", { q: "", status: "", from: "", to: "" }, now);
    expect(dev).toEqual({
      AND: [{ OR: [{ userType: "candidate" }, { userType: null }] }, { deletedAt: null }],
    });
    const rec = buildUserWhere("recruiters", { q: "", status: "", from: "", to: "" }, now);
    expect(rec.AND).toContainEqual({ userType: "recruiter" });
  });
  it("searches name and email case-insensitively, and the exact id", () => {
    const w = buildUserWhere("developers", { q: "ADA", status: "", from: "", to: "" }, now);
    expect((w.AND as unknown[])[2]).toEqual({
      OR: [
        { name: { contains: "ADA", mode: "insensitive" } },
        { email: { contains: "ADA", mode: "insensitive" } },
        { id: "ADA" },
      ],
    });
  });
  it("makes the to date inclusive of the whole day", () => {
    const w = buildUserWhere("developers", { q: "", status: "", from: "2026-09-01", to: "2026-09-30" }, now);
    expect((w.AND as unknown[])[2]).toEqual({
      createdAt: { gte: new Date("2026-09-01T00:00:00.000Z"), lt: new Date("2026-10-01T00:00:00.000Z") },
    });
  });
});

describe("statusWhere", () => {
  it("treats expired suspensions as active", () => {
    const activeBan = { banned: true, OR: [{ bannedUntil: null }, { bannedUntil: { gt: now } }] };
    expect(statusWhere("suspended", now)).toEqual({ deletedAt: null, ...activeBan });
    expect(statusWhere("active", now)).toEqual({ deletedAt: null, NOT: activeBan });
  });
  it("hides deleted accounts except on the deleted tab", () => {
    expect(statusWhere("", now)).toEqual({ deletedAt: null });
    expect(statusWhere("deleted", now)).toEqual({ deletedAt: { not: null } });
    expect(statusWhere("unverified", now)).toEqual({ deletedAt: null, emailVerified: null });
  });
});

describe("buildUserOrderBy", () => {
  it("puts never-signed-in users last and always has a stable tie-break", () => {
    expect(buildUserOrderBy("last_sign_in")).toEqual([{ lastSignInAt: { sort: "desc", nulls: "last" } }, { id: "asc" }]);
    expect(buildUserOrderBy("newest").at(-1)).toEqual({ id: "asc" });
  });
});

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('Ada, "the" first')).toBe('"Ada, ""the"" first"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });
  it("defuses spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
  });
});
