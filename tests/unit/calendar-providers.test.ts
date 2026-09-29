// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  CalendarAuthError,
  authorizeUrl,
  cancelEvent,
  createEvent,
  exchangeCode,
  fetchBusy,
  freshAccessToken,
  parseGoogleFreeBusy,
  parseGraphSchedule,
  providerConfig,
  refreshAccessToken,
} from "@/lib/calendar/providers";
import { signState, verifyState } from "@/lib/calendar/state";
import { busyPeople, slotAt, weekStart } from "@/lib/calendar/slots";

const cfg = { clientId: "cid", clientSecret: "secret", tenant: "common" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const NOW = new Date("2026-09-28T08:00:00.000Z");

describe("providerConfig", () => {
  it("is null without credentials and reads the tenant for Microsoft", () => {
    expect(providerConfig("google", {})).toBeNull();
    expect(providerConfig("google", { GOOGLE_CALENDAR_CLIENT_ID: "a", GOOGLE_CALENDAR_CLIENT_SECRET: "b" })).toEqual({ clientId: "a", clientSecret: "b", tenant: "common" });
    expect(providerConfig("microsoft", { MS_CALENDAR_CLIENT_ID: "a", MS_CALENDAR_CLIENT_SECRET: "b", MS_CALENDAR_TENANT: "acme" })?.tenant).toBe("acme");
    expect(providerConfig("microsoft", { MS_CALENDAR_CLIENT_ID: "a" })).toBeNull();
  });
});

describe("authorizeUrl", () => {
  it("asks Google for offline access to free/busy and events", () => {
    const u = new URL(authorizeUrl("google", cfg, "https://app/cb", "st", "a@b.co"));
    expect(u.origin).toBe("https://accounts.google.com");
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("scope")).toContain("calendar.freebusy");
    expect(u.searchParams.get("state")).toBe("st");
    expect(u.searchParams.get("login_hint")).toBe("a@b.co");
  });
  it("uses the tenant and offline_access for Microsoft", () => {
    const u = new URL(authorizeUrl("microsoft", { ...cfg, tenant: "acme" }, "https://app/cb", "st"));
    expect(u.pathname).toBe("/acme/oauth2/v2.0/authorize");
    expect(u.searchParams.get("scope")).toContain("offline_access");
    expect(u.searchParams.get("scope")).toContain("Calendars.ReadWrite");
  });
});

describe("free/busy parsing", () => {
  it("reads Google primary busy blocks, sorted, dropping bad ones", () => {
    const blocks = parseGoogleFreeBusy({
      calendars: {
        primary: {
          busy: [
            { start: "2026-09-28T13:00:00Z", end: "2026-09-28T14:00:00Z" },
            { start: "2026-09-28T09:00:00+02:00", end: "2026-09-28T09:30:00+02:00" },
            { start: "nope", end: "2026-09-28T10:00:00Z" },
            { start: "2026-09-28T12:00:00Z", end: "2026-09-28T11:00:00Z" },
          ],
        },
      },
    });
    expect(blocks).toEqual([
      { start: "2026-09-28T07:00:00.000Z", end: "2026-09-28T07:30:00.000Z" },
      { start: "2026-09-28T13:00:00.000Z", end: "2026-09-28T14:00:00.000Z" },
    ]);
  });
  it("throws when Google reports an error for the calendar", () => {
    expect(() => parseGoogleFreeBusy({ calendars: { primary: { errors: [{ reason: "notFound" }] } } })).toThrow();
    expect(() => parseGoogleFreeBusy({})).toThrow();
  });
  it("reads Graph schedule items as UTC and skips free ones", () => {
    const blocks = parseGraphSchedule({
      value: [
        {
          scheduleId: "a@b.co",
          scheduleItems: [
            { status: "busy", start: { dateTime: "2026-09-28T09:00:00.0000000", timeZone: "UTC" }, end: { dateTime: "2026-09-28T10:00:00.0000000", timeZone: "UTC" } },
            { status: "free", start: { dateTime: "2026-09-28T11:00:00.0000000", timeZone: "UTC" }, end: { dateTime: "2026-09-28T12:00:00.0000000", timeZone: "UTC" } },
            { status: "Tentative", start: { dateTime: "2026-09-28T07:30:00.0000000", timeZone: "UTC" }, end: { dateTime: "2026-09-28T08:00:00.0000000", timeZone: "UTC" } },
            { status: "workingElsewhere", start: { dateTime: "2026-09-28T13:00:00.0000000", timeZone: "UTC" }, end: { dateTime: "2026-09-28T14:00:00.0000000", timeZone: "UTC" } },
            { status: "oof", start: { dateTime: "2026-09-29T00:00:00.0000000", timeZone: "UTC" }, end: { dateTime: "2026-09-30T00:00:00.0000000", timeZone: "UTC" } },
          ],
        },
      ],
    });
    expect(blocks).toEqual([
      { start: "2026-09-28T07:30:00.000Z", end: "2026-09-28T08:00:00.000Z" },
      { start: "2026-09-28T09:00:00.000Z", end: "2026-09-28T10:00:00.000Z" },
      { start: "2026-09-29T00:00:00.000Z", end: "2026-09-30T00:00:00.000Z" },
    ]);
  });
  it("throws on a Graph schedule error", () => {
    expect(() => parseGraphSchedule({ value: [{ error: { message: "no access" } }] })).toThrow();
  });
});

describe("fetchBusy", () => {
  it("posts a Google freeBusy query for the primary calendar", async () => {
    const f = vi.fn(async () => json({ calendars: { primary: { busy: [{ start: "2026-09-28T10:00:00Z", end: "2026-09-28T11:00:00Z" }] } } }));
    const from = new Date("2026-09-28T00:00:00Z");
    const to = new Date("2026-10-03T00:00:00Z");
    const out = await fetchBusy("google", "tok", "a@b.co", from, to, f as unknown as typeof fetch);
    expect(out).toHaveLength(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/freeBusy");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toEqual({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] });
  });
  it("asks Graph getSchedule for the account in UTC", async () => {
    const f = vi.fn(async () => json({ value: [{ scheduleItems: [] }] }));
    await fetchBusy("microsoft", "tok", "a@b.co", new Date("2026-09-28T00:00:00Z"), new Date("2026-09-29T00:00:00Z"), f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://graph.microsoft.com/v1.0/me/calendar/getSchedule");
    const body = JSON.parse(init.body as string);
    expect(body.schedules).toEqual(["a@b.co"]);
    expect(body.startTime).toEqual({ dateTime: "2026-09-28T00:00:00.000", timeZone: "UTC" });
  });
  it("turns a 401 into an auth error", async () => {
    const f = vi.fn(async () => json({}, 401));
    await expect(fetchBusy("google", "tok", "a", NOW, NOW, f as unknown as typeof fetch)).rejects.toBeInstanceOf(CalendarAuthError);
  });
});

describe("tokens", () => {
  it("exchanges a code and computes the expiry", async () => {
    const f = vi.fn(async () => json({ access_token: "at", refresh_token: "rt", expires_in: 3600, scope: "a b" }));
    const t = await exchangeCode("google", cfg, "code", "https://app/cb", f as unknown as typeof fetch, NOW);
    expect(t).toEqual({ accessToken: "at", refreshToken: "rt", expiresAt: new Date(NOW.getTime() + 3600_000), scopes: "a b" });
    const body = new URLSearchParams((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("redirect_uri")).toBe("https://app/cb");
  });
  it("marks invalid_grant as revoked", async () => {
    const f = vi.fn(async () => json({ error: "invalid_grant" }, 400));
    const err = await refreshAccessToken("microsoft", cfg, "rt", f as unknown as typeof fetch, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(CalendarAuthError);
    expect(err.revoked).toBe(true);
  });
  it("sends the scope when refreshing with Microsoft", async () => {
    const f = vi.fn(async () => json({ access_token: "at2", expires_in: "3599" }));
    const t = await refreshAccessToken("microsoft", cfg, "rt", f as unknown as typeof fetch, NOW);
    expect(t.expiresAt).toEqual(new Date(NOW.getTime() + 3599_000));
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/token");
    expect(new URLSearchParams(init.body as string).get("scope")).toContain("offline_access");
  });
});

describe("freshAccessToken", () => {
  const f = () => vi.fn(async () => json({ access_token: "new", expires_in: 3600 }));
  it("keeps a token with time left", async () => {
    const fetchMock = f();
    const save = vi.fn(async () => {});
    const tok = await freshAccessToken("google", cfg, { accessToken: "old", refreshToken: "rt", expiresAt: new Date(NOW.getTime() + 30 * 60_000) }, save, fetchMock as unknown as typeof fetch, NOW);
    expect(tok).toBe("old");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
  it("refreshes a token about to expire and keeps the old refresh token", async () => {
    const fetchMock = f();
    const save = vi.fn(async () => {});
    const tok = await freshAccessToken("google", cfg, { accessToken: "old", refreshToken: "rt", expiresAt: new Date(NOW.getTime() + 60_000) }, save, fetchMock as unknown as typeof fetch, NOW);
    expect(tok).toBe("new");
    expect(save).toHaveBeenCalledWith({ accessToken: "new", refreshToken: "rt", expiresAt: new Date(NOW.getTime() + 3600_000), scopes: "" });
  });
  it("fails as revoked when expired with no refresh token", async () => {
    const err = await freshAccessToken("google", cfg, { accessToken: "old", refreshToken: null, expiresAt: new Date(NOW.getTime() - 1) }, async () => {}, f() as unknown as typeof fetch, NOW).catch((e) => e);
    expect(err).toBeInstanceOf(CalendarAuthError);
    expect(err.revoked).toBe(true);
  });
});

describe("events", () => {
  const ev = {
    title: "Frontend interview with Ana",
    start: new Date("2026-10-01T08:00:00Z"),
    end: new Date("2026-10-01T08:45:00Z"),
    location: "https://meet.google.com/abc",
    description: "Room",
    attendees: [{ email: "p@x.co", name: "Priya" }],
  };
  it("creates a Google event and returns its id", async () => {
    const f = vi.fn(async () => json({ id: "evt1" }));
    expect(await createEvent("google", "tok", ev, f as unknown as typeof fetch)).toBe("evt1");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/calendars/primary/events?sendUpdates=all");
    const body = JSON.parse(init.body as string);
    expect(body.start).toEqual({ dateTime: "2026-10-01T08:00:00.000Z" });
    expect(body.attendees).toEqual([{ email: "p@x.co", displayName: "Priya" }]);
  });
  it("creates a Graph event with UTC times", async () => {
    const f = vi.fn(async () => json({ id: "AAMk" }, 201));
    await createEvent("microsoft", "tok", ev, f as unknown as typeof fetch);
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.end).toEqual({ dateTime: "2026-10-01T08:45:00.000", timeZone: "UTC" });
    expect(body.location).toEqual({ displayName: "https://meet.google.com/abc" });
  });
  it("treats a missing event as already cancelled", async () => {
    const f = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(cancelEvent("google", "tok", "evt1", f as unknown as typeof fetch)).resolves.toBeUndefined();
  });
  it("deletes a Graph event it cannot cancel", async () => {
    const f = vi.fn(async (_u: string, init?: RequestInit) => new Response(null, { status: init?.method === "POST" ? 400 : 204 }));
    await cancelEvent("microsoft", "tok", "evt1", f as unknown as typeof fetch);
    expect(f.mock.calls.map((c) => (c[1] as RequestInit).method)).toEqual(["POST", "DELETE"]);
  });
});

describe("OAuth state", () => {
  const v = { userId: "u1", workspaceId: "w1", slug: "acme", provider: "google" as const, returnTo: "/w/acme/interviews/new" };
  it("round-trips and expires", () => {
    const s = signState(v, 1000, "k");
    expect(verifyState(s, 2000, "k")).toMatchObject({ u: "u1", w: "w1", s: "acme", p: "google", r: "/w/acme/interviews/new" });
    expect(verifyState(s, 1000 + 11 * 60_000, "k")).toBeNull();
  });
  it("rejects tampering and other keys", () => {
    const s = signState(v, 1000, "k");
    const [body, mac] = s.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), u: "u2" })).toString("base64url");
    expect(verifyState(`${forged}.${mac}`, 2000, "k")).toBeNull();
    expect(verifyState(s, 2000, "other")).toBeNull();
    expect(verifyState("junk", 2000, "k")).toBeNull();
  });
});

describe("slots", () => {
  it("finds the Monday of a week", () => {
    const m = weekStart(new Date(2026, 9, 1, 15)); // Thursday 1 Oct 2026
    expect([m.getFullYear(), m.getMonth(), m.getDate(), m.getDay(), m.getHours()]).toEqual([2026, 8, 28, 1, 0]);
    expect(weekStart(new Date(2026, 9, 4)).getDate()).toBe(28); // Sunday belongs to the same week
  });
  it("names the people busy during a slot", () => {
    const monday = weekStart(new Date(2026, 8, 30));
    const at10 = slotAt(monday, 0, 10);
    const iso = (h: number, m = 0) => new Date(2026, 8, 28, h, m).toISOString();
    const people = [
      { name: "Priya", busy: [{ start: iso(10, 30), end: iso(11) }] },
      { name: "Daniel", busy: [{ start: iso(9), end: iso(10) }] },
    ];
    expect(busyPeople(at10, 45, people)).toEqual(["Priya"]);
    expect(busyPeople(at10, 30, people)).toEqual([]);
    expect(busyPeople(slotAt(monday, 0, 9), 60, people)).toEqual(["Daniel"]);
  });
});
