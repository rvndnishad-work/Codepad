import { describe, expect, it, vi } from "vitest";
import {
  ALERT_EVENTS,
  cleanAlertEvents,
  escapeSlack,
  formatAlert,
  maskedUrl,
  scorePercent,
  slackBody,
  teamsBody,
  validateAlertUrl,
} from "@/lib/alerts/format";
import { createSlackState, exchangeSlackCode, slackAuthorizeUrl, verifySlackState } from "@/lib/alerts/slack-oauth";
import { buildEnvelope } from "@/lib/events/envelope";
import { WORKSPACE_EVENTS } from "@/lib/events/catalog";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const ORIGIN = "https://app.example.com";
const WS = { id: "ws_1", slug: "acme", name: "Acme" };

function env(event: string, data: Record<string, unknown>) {
  return buildEnvelope("evt_1", event, WS, data, ORIGIN, new Date("2026-09-26T10:00:00Z"));
}

describe("formatAlert", () => {
  it("screening: name, role and report link, no score by default", () => {
    const m = formatAlert(
      env("screening.completed", {
        candidate: { name: "Ana Lima", email: "ana@example.com" },
        screening: { id: "s1", positionTitle: "Senior Frontend Engineer", score: 82.4, completedAt: "x" },
        reportPath: "ai-interviews/s1",
      }),
      { origin: ORIGIN },
    );
    expect(m.text).toBe("Ana Lima finished the AI screening for Senior Frontend Engineer. It is ready for review.");
    expect(m.linkUrl).toBe("https://app.example.com/w/acme/ai-interviews/s1");
    expect(m.linkLabel).toBe("Open report");
    expect(m.text).not.toContain("82");
    expect(m.text).not.toContain("ana@example.com");
  });

  it("adds the score only as a whole percentage when the channel opts in", () => {
    const e = env("takehome.submitted", {
      candidate: { name: "Ana Lima" },
      takeHome: { id: "t1", title: "Checkout form", score: 77.6, submittedAt: "x" },
      reportPath: "take-homes/t1",
    });
    expect(formatAlert(e, { origin: ORIGIN, includeScore: true }).text).toBe(
      "Ana Lima submitted the take home Checkout form. It is in the review queue. Score: 78%.",
    );
    const noScore = env("takehome.submitted", { candidate: { name: "Ana Lima" }, takeHome: { id: "t1", score: null } });
    expect(formatAlert(noScore, { origin: ORIGIN, includeScore: true }).text).toBe(
      "Ana Lima submitted a take home. It is in the review queue.",
    );
  });

  it("never includes answers, feedback, verdicts or rejection reasons", () => {
    const decided = formatAlert(
      env("candidate.decided", {
        candidate: { name: "Ben Ode" },
        decision: "not_passed",
        rejectReason: "Weak on system design, see transcript",
        decidedBy: { email: "priya@acme.com" },
        reportPath: "candidates/c1",
      }),
      { origin: ORIGIN, includeScore: true },
    );
    expect(decided.text).toBe("Ben Ode was marked Not passed.");
    expect(decided.linkUrl).toBe("https://app.example.com/w/acme/candidates/c1");

    const interview = formatAlert(
      env("interview.completed", {
        candidate: { name: "Ben Ode" },
        interview: { id: "i1", title: "Frontend pairing", verdict: "strong_no", completedAt: "x" },
        reportPath: "interviews/i1/report",
      }),
      { origin: ORIGIN, includeScore: true },
    );
    expect(interview.text).toBe("The interview Frontend pairing with Ben Ode has ended.");
    expect(interview.text).not.toMatch(/strong|verdict/i);
  });

  it("flags a manual override on a pass", () => {
    const m = formatAlert(
      env("candidate.decided", { candidate: { name: "Ana" }, decision: "passed", manualOverride: "Take home below the bar" }),
      { origin: ORIGIN },
    );
    expect(m.text).toBe("Ana was marked Passed. This was a manual override.");
  });

  it("bounces link to email activity; test links to the alerts page", () => {
    const b = formatAlert(env("invite.bounced", { email: { template: "invite", recipient: "x@y.com", reason: "550" } }), {
      origin: ORIGIN,
    });
    expect(b.text).toBe("An email to x@y.com bounced. Fix the address or resend it.");
    expect(b.linkUrl).toBe("https://app.example.com/w/acme/emails");
    const t = formatAlert(env("webhook.test", {}), { origin: ORIGIN + "/" });
    expect(t.text).toBe("This is a test from Codepad. Alerts for Acme will post here.");
    expect(t.linkUrl).toBe("https://app.example.com/w/acme/alerts");
  });

  it("falls back to 'A candidate' and caps long names", () => {
    expect(formatAlert(env("interview.completed", { interview: {} }), { origin: ORIGIN }).text).toBe(
      "The interview with A candidate has ended.",
    );
    const long = "x".repeat(200);
    const m = formatAlert(env("candidate.decided", { candidate: { name: long }, decision: "passed" }), { origin: ORIGIN });
    expect(m.text.length).toBeLessThan(120);
  });

  it("covers every bus event on the settings page", () => {
    expect(ALERT_EVENTS.map((r) => r.event).sort()).toEqual([...WORKSPACE_EVENTS].sort());
    expect(cleanAlertEvents(["candidate.decided", "nope", "takehome.submitted", "candidate.decided"])).toEqual([
      "takehome.submitted",
      "candidate.decided",
    ]);
  });
});

describe("scorePercent", () => {
  it("rounds and clamps", () => {
    expect(scorePercent(82.5)).toBe("83%");
    expect(scorePercent(140)).toBe("100%");
    expect(scorePercent(-3)).toBe("0%");
    expect(scorePercent(null)).toBeNull();
    expect(scorePercent(Number.NaN)).toBeNull();
  });
});

describe("provider bodies", () => {
  const msg = { text: "Tom <script> & Jerry finished.", linkUrl: "https://app.example.com/w/acme/x", linkLabel: "Open report" };

  it("Slack: escaped mrkdwn section plus a link button", () => {
    expect(escapeSlack("a<b>&c")).toBe("a&lt;b&gt;&amp;c");
    const body = slackBody(msg) as { text: string; blocks: Array<Record<string, unknown>> };
    expect(body.text).toBe("Tom &lt;script&gt; &amp; Jerry finished.");
    expect(body.blocks).toEqual([
      { type: "section", text: { type: "mrkdwn", text: "Tom &lt;script&gt; &amp; Jerry finished." } },
      {
        type: "actions",
        elements: [{ type: "button", text: { type: "plain_text", text: "Open report" }, url: "https://app.example.com/w/acme/x" }],
      },
    ]);
    expect(slackBody({ text: "Hi", linkUrl: null, linkLabel: null }).blocks).toHaveLength(1);
  });

  it("Teams: a message with one adaptive card and an OpenUrl action", () => {
    const body = teamsBody(msg) as { type: string; attachments: Array<{ contentType: string; content: Record<string, unknown> }> };
    expect(body.type).toBe("message");
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
    const card = body.attachments[0].content;
    expect(card.type).toBe("AdaptiveCard");
    expect(JSON.stringify(card.body)).toContain("Tom <script> & Jerry finished.");
    expect(card.actions).toEqual([{ type: "Action.OpenUrl", title: "Open report", url: "https://app.example.com/w/acme/x" }]);
  });
});

describe("validateAlertUrl", () => {
  it("accepts Slack incoming webhooks only", () => {
    expect(validateAlertUrl("slack", " https://hooks.slack.com/services/T0/B0/xyz ")).toEqual({
      ok: true,
      url: "https://hooks.slack.com/services/T0/B0/xyz",
    });
    expect(validateAlertUrl("slack", "http://hooks.slack.com/services/T0/B0/xyz").ok).toBe(false);
    expect(validateAlertUrl("slack", "https://hooks.slack.com.evil.com/services/x").ok).toBe(false);
    expect(validateAlertUrl("slack", "https://hooks.slack.com/triggers/x").ok).toBe(false);
    expect(validateAlertUrl("slack", "https://127.0.0.1/services/x").ok).toBe(false);
    expect(validateAlertUrl("slack", "").ok).toBe(false);
  });

  it("accepts Teams webhooks and Workflows URLs", () => {
    expect(validateAlertUrl("teams", "https://acme.webhook.office.com/webhookb2/abc").ok).toBe(true);
    expect(
      validateAlertUrl("teams", "https://prod-11.westus.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke?sig=x").ok,
    ).toBe(true);
    expect(validateAlertUrl("teams", "https://default1.environment.api.powerplatform.com:443/powerautomate/x").ok).toBe(true);
    expect(validateAlertUrl("teams", "https://evil.com/webhook.office.com").ok).toBe(false);
    expect(validateAlertUrl("teams", "https://acme.webhook.office.com:8443/x").ok).toBe(false);
  });

  it("masks saved URLs", () => {
    expect(maskedUrl("https://hooks.slack.com/services/T0/B0/abcdWXYZ")).toBe("hooks.slack.com/…WXYZ");
  });
});

describe("Slack install state", () => {
  const secret = "test-secret";
  const input = { workspaceId: "ws_1", slug: "acme", userId: "u_1" };

  it("round-trips and expires after ten minutes", () => {
    const now = 1_000_000;
    const s = createSlackState(input, { secret, now });
    expect(verifySlackState(s, { secret, now: now + 60_000 })).toMatchObject(input);
    expect(verifySlackState(s, { secret, now: now + 11 * 60_000 })).toBeNull();
  });

  it("rejects tampering and the wrong secret", () => {
    const s = createSlackState(input, { secret });
    const [body, sig] = s.split(".");
    const forged = Buffer.from(JSON.stringify({ ...input, workspaceId: "ws_2", exp: Date.now() + 60_000 })).toString("base64url");
    expect(verifySlackState(`${forged}.${sig}`, { secret })).toBeNull();
    expect(verifySlackState(`${body}.${sig}`, { secret: "other" })).toBeNull();
    expect(verifySlackState("garbage", { secret })).toBeNull();
    expect(verifySlackState(null, { secret })).toBeNull();
  });

  it("asks only for the incoming-webhook scope", () => {
    const u = new URL(slackAuthorizeUrl({ clientId: "cid", redirectUri: "https://app/cb", state: "st" }));
    expect(u.origin + u.pathname).toBe("https://slack.com/oauth/v2/authorize");
    expect(u.searchParams.get("scope")).toBe("incoming-webhook");
    expect(u.searchParams.get("redirect_uri")).toBe("https://app/cb");
  });
});

describe("exchangeSlackCode (mocked fetch)", () => {
  const params = { code: "c", redirectUri: "https://app/cb", clientId: "cid", clientSecret: "sec" };

  it("returns the channel webhook and token", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          access_token: "xoxb-1",
          team: { name: "Acme HQ" },
          incoming_webhook: { channel: "#hiring-screens", channel_id: "C1", url: "https://hooks.slack.com/services/T/B/x" },
        }),
      ),
    );
    const r = await exchangeSlackCode(params, fetchMock as unknown as typeof fetch);
    expect(r).toEqual({
      ok: true,
      install: {
        webhookUrl: "https://hooks.slack.com/services/T/B/x",
        channel: "#hiring-screens",
        channelId: "C1",
        teamName: "Acme HQ",
        accessToken: "xoxb-1",
      },
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://slack.com/api/oauth.v2.access");
    expect(String(init.body)).toContain("client_secret=sec");
  });

  it("reports Slack errors", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "invalid_code" })));
    expect(await exchangeSlackCode(params, fetchMock as unknown as typeof fetch)).toEqual({
      ok: false,
      error: "Slack said: invalid_code",
    });
  });
});

describe("postAlert (mocked fetch)", () => {
  it("posts the Slack body to the webhook and reports errors plainly", async () => {
    const { postAlert } = await import("@/lib/alerts/send");
    const msg = { text: "Hi", linkUrl: null, linkLabel: null };
    const ok = vi.fn(async () => new Response("ok", { status: 200 }));
    expect(await postAlert("slack", "https://hooks.slack.com/services/T/B/x", msg, ok as unknown as typeof fetch)).toEqual({
      ok: true,
      status: 200,
      error: null,
    });
    const [, init] = ok.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ text: "Hi" });
    expect(init.redirect).toBe("manual");

    const gone = vi.fn(async () => new Response("no_service", { status: 404 }));
    const r = await postAlert("slack", "https://hooks.slack.com/services/T/B/x", msg, gone as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no longer knows this webhook/);
  });

  it("refuses URLs that are not the provider's own host without calling fetch", async () => {
    const { postAlert } = await import("@/lib/alerts/send");
    const f = vi.fn();
    const r = await postAlert("teams", "https://internal.corp/hook", { text: "Hi", linkUrl: null, linkLabel: null }, f as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("Teams accepts 202 from Workflows", async () => {
    const { postAlert } = await import("@/lib/alerts/send");
    const f = vi.fn(async () => new Response(null, { status: 202 }));
    const r = await postAlert(
      "teams",
      "https://prod-1.westus.logic.azure.com/workflows/x",
      { text: "Hi", linkUrl: null, linkLabel: null },
      f as unknown as typeof fetch,
    );
    expect(r.ok).toBe(true);
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).type).toBe("message");
  });
});
