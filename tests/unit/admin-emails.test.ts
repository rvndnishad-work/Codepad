import { describe, expect, it } from "vitest";
import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "@/emails";

describe("interview cancelled email", () => {
  const props = { candidateName: "Ana", workspaceName: "Acme", title: "Frontend pairing", scheduledAt: "2026-10-02T14:00:00.000Z" };

  it("names the interview and says it is not a decision", async () => {
    const def = TEMPLATES["interview-cancelled"];
    expect(def.subject(props)).toBe("Your interview with Acme is cancelled");
    const text = def.text(props);
    expect(text).toContain("Acme has cancelled Frontend pairing, planned for");
    expect(text).toContain("This is not a decision about your application.");
    const html = await render(React.createElement(def.Component, props));
    expect(html).toContain("Frontend pairing");
  });
});

describe("low credits email", () => {
  const props = { recipientName: "Bo", workspaceName: "Acme", balance: 1, threshold: 10, buyUrl: "https://example.com/w/acme/billing?tab=usage" };

  it("uses the singular for one credit and links to Billing and usage", async () => {
    const def = TEMPLATES["credits-low"];
    expect(def.subject(props)).toBe("Acme has 1 AI screening credit left");
    expect(def.text(props)).toContain("Buy credits: https://example.com/w/acme/billing?tab=usage");
    const html = await render(React.createElement(def.Component, props));
    expect(html).toContain("below the <!-- -->10<!-- --> you asked us");
  });
});
