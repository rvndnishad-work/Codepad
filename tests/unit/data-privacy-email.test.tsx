import { describe, expect, it } from "vitest";
import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/emails";
import { DataPrivacyNotice, dataPrivacyNoticeText } from "@/emails/DataPrivacyNotice";

const props = {
  subject: "Acme: 3 candidates will be erased on 4 Oct 2026",
  badge: "Data retention",
  heading: "3 candidates will be erased on 4 Oct 2026.",
  paragraphs: ["First paragraph.", "Second paragraph."],
  cta: { label: "Review the rule", url: "https://example.com/w/acme/settings/data-privacy" },
  footer: "You get this because you are an owner or admin of this workspace on Interviewpad.",
};

describe("data and privacy email", () => {
  it("is registered and uses the caller's subject", () => {
    expect(TEMPLATES["data-privacy-notice"].subject(props)).toBe(props.subject);
  });

  it("renders every paragraph and the button link", async () => {
    const html = await render(React.createElement(DataPrivacyNotice, props));
    expect(html).toContain("Second paragraph.");
    expect(html).toContain(props.cta.url);
  });

  it("has a plain text version without a button when there is none", () => {
    const text = dataPrivacyNoticeText({ ...props, cta: null });
    expect(text).toContain("First paragraph.");
    expect(text).not.toContain("Review the rule");
    expect(text.endsWith(props.footer)).toBe(true);
  });
});
