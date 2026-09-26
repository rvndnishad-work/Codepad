import { describe, expect, it } from "vitest";
import {
  canOfferResend,
  emailWhere,
  groupCounts,
  parseEmailQuery,
  problemExplanation,
  resendPathFor,
  statusChip,
  templateLabel,
} from "@/lib/workspace/email-activity";

describe("parseEmailQuery", () => {
  it("keeps valid filters and rejects junk", () => {
    expect(parseEmailQuery({ status: "bounced", template: "take-home-session-invite", q: "  omar ", page: "2" })).toEqual({
      status: "bounced",
      template: "take-home-session-invite",
      q: "omar",
      page: 2,
    });
    expect(parseEmailQuery({ status: "weird", template: "DROP TABLE", page: "abc" })).toEqual({
      status: "all",
      template: "",
      q: "",
      page: 1,
    });
  });
});

describe("emailWhere", () => {
  it("scopes to the workspace with no filters", () => {
    expect(emailWhere("ws1", { status: "all", template: "", q: "" })).toEqual({ workspaceId: "ws1" });
  });

  it("maps a status group to its raw statuses", () => {
    expect(emailWhere("ws1", { status: "delivered", template: "", q: "" })).toEqual({
      workspaceId: "ws1",
      status: { in: ["delivered", "opened", "clicked"] },
    });
    expect(emailWhere("ws1", { status: "failed", template: "ai-screening-invite", q: "" })).toEqual({
      workspaceId: "ws1",
      status: { in: ["failed", "suppressed"] },
      template: "ai-screening-invite",
    });
  });

  it("searches the address and the addresses of matching candidate names", () => {
    expect(emailWhere("ws1", { status: "all", template: "", q: "Omar" }, ["Omar.Hadad@gmial.com", "omar.hadad@gmial.com"])).toEqual({
      workspaceId: "ws1",
      OR: [
        { recipientEmail: { contains: "omar", mode: "insensitive" } },
        { recipientEmail: { in: ["omar.hadad@gmial.com"] } },
      ],
    });
  });
});

describe("groupCounts", () => {
  it("counts overlapping groups from raw statuses", () => {
    const c = groupCounts({ delivered: 115, opened: 270, clicked: 11, bounced: 3, complained: 1, sent: 10, queued: 2, failed: 1 });
    expect(c).toEqual({ all: 413, delivered: 396, opened: 281, pending: 12, bounced: 4, failed: 1 });
  });
});

describe("resend rules", () => {
  it("offers resend only for invites that did not arrive", () => {
    expect(canOfferResend({ template: "take-home-session-invite", status: "bounced" })).toBe(true);
    expect(canOfferResend({ template: "ai-screening-invite", status: "failed" })).toBe(true);
    expect(canOfferResend({ template: "ai-screening-invite", status: "suppressed" })).toBe(true);
    expect(canOfferResend({ template: "ai-screening-invite", status: "delivered" })).toBe(false);
    expect(canOfferResend({ template: "take-home-reminder", status: "bounced" })).toBe(false);
    expect(resendPathFor("take-home-invite")).toBeNull();
  });
});

describe("labels", () => {
  it("reads plainly", () => {
    expect(statusChip("bounced")).toEqual({ label: "Bounced", tone: "bad" });
    expect(statusChip("sent").label).toBe("Sent, not yet delivered");
    expect(templateLabel("interviewer-invite")).toBe("Interview details, guest");
    expect(templateLabel("brand-new-template")).toBe("Brand new template");
    expect(problemExplanation("bounced", "Mailbox does not exist")).toBe(
      "The receiving server refused it: Mailbox does not exist. Check the address for typos.",
    );
    expect(problemExplanation("delivered", null)).toBeNull();
  });
});
