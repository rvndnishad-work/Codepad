import { describe, expect, it } from "vitest";
import { visibleNav } from "./admin-nav";

const all = new Set(["*"]);
const labels = (site: Parameters<typeof visibleNav>[1]) => visibleNav(all, site).map((g) => g.label);
const hrefs = (site: Parameters<typeof visibleNav>[1]) => visibleNav(all, site).flatMap((g) => g.links.map((l) => l.href));

describe("visibleNav by domain", () => {
  it("shows both sides when the domains are not split", () => {
    expect(labels(null)).toEqual([null, "Recruiters", "Developers", "Operations", "System"]);
    expect(hrefs(null)).toContain("/admin/inbox");
  });

  it("hides the Developers section and the Inbox on Intervutree", () => {
    expect(labels("recruiter")).toEqual([null, "Recruiters", "Operations", "System"]);
    expect(hrefs("recruiter")).not.toContain("/admin/inbox");
    expect(hrefs("recruiter")).toContain("/admin/workspaces");
  });

  it("hides the Recruiters section on DevPrep", () => {
    expect(labels("developer")).toEqual([null, "Developers", "Operations", "System"]);
    expect(hrefs("developer")).toContain("/admin/inbox");
    expect(hrefs("developer")).not.toContain("/admin/workspaces");
  });
});
