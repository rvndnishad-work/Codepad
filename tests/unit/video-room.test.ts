/**
 * Built-in video in the interview room: which way people talk, who sees the
 * add-on offer, the per-interview choice from the wizard, and when the join
 * token route says no.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { roomVideoMode, videoIdentity, videoJoinRefusal, videoOffer } from "@/lib/video/room-video";
import { callChoice, callFields } from "@/lib/interview/wizard";

describe("roomVideoMode", () => {
  const base = { addonOn: true, builtinVideo: true, meetingUrl: null as string | null, liveKitReady: true };

  it("uses built-in video when the add-on is on, the interview wants it and LiveKit is set up", () => {
    expect(roomVideoMode(base)).toEqual({ mode: "builtin", configured: true });
    expect(roomVideoMode({ ...base, meetingUrl: "https://meet.google.com/abc" })).toEqual({ mode: "builtin", configured: true });
  });

  it("falls back to the link (or nothing) and flags the missing setup when LiveKit env is absent", () => {
    expect(roomVideoMode({ ...base, liveKitReady: false })).toEqual({ mode: "none", configured: false });
    expect(roomVideoMode({ ...base, liveKitReady: false, meetingUrl: "https://zoom.us/j/1" })).toEqual({ mode: "link", configured: false });
  });

  it("uses the meeting link when the interview is set to it", () => {
    expect(roomVideoMode({ ...base, builtinVideo: false, meetingUrl: "https://zoom.us/j/1" })).toEqual({ mode: "link", configured: true });
    expect(roomVideoMode({ ...base, builtinVideo: false })).toEqual({ mode: "none", configured: true });
  });

  it("ignores the interview's choice while the add-on is off, and never reports setup problems then", () => {
    expect(roomVideoMode({ ...base, addonOn: false, meetingUrl: "https://zoom.us/j/1" })).toEqual({ mode: "link", configured: true });
    expect(roomVideoMode({ ...base, addonOn: false, liveKitReady: false })).toEqual({ mode: "none", configured: true });
  });
});

describe("videoOffer", () => {
  const base = { interviewer: true, canManageBilling: true, addonOn: false, planAllows: true, planName: "GROWTH" };

  it("offers the add-on to billing managers on a plan that has it", () => {
    expect(videoOffer(base)).toEqual({ canOffer: true, offerUpgrade: false });
  });

  it("on Free, offers it with a nudge to Growth", () => {
    expect(videoOffer({ ...base, planAllows: false, planName: "FREE" })).toEqual({ canOffer: true, offerUpgrade: true });
  });

  it("never offers to candidates, people without billing access, or when it is already on", () => {
    expect(videoOffer({ ...base, interviewer: false }).canOffer).toBe(false);
    expect(videoOffer({ ...base, canManageBilling: false }).canOffer).toBe(false);
    expect(videoOffer({ ...base, addonOn: true }).canOffer).toBe(false);
  });

  it("does not offer on an unknown plan that does not allow it", () => {
    expect(videoOffer({ ...base, planAllows: false, planName: "LEGACY" })).toEqual({ canOffer: false, offerUpgrade: false });
  });
});

describe("videoJoinRefusal", () => {
  const ok = { addonOn: true, builtinVideo: true, status: "scheduled", liveKitReady: true };

  it("allows a scheduled or running interview on built-in video", () => {
    expect(videoJoinRefusal(ok)).toBeNull();
    expect(videoJoinRefusal({ ...ok, status: "in_progress" })).toBeNull();
  });

  it("refuses when the add-on is off, the interview uses a link, it ended, or LiveKit is missing", () => {
    expect(videoJoinRefusal({ ...ok, addonOn: false })).toMatch(/not switched on/);
    expect(videoJoinRefusal({ ...ok, builtinVideo: false })).toMatch(/meeting link/);
    for (const status of ["completed", "abandoned", "cancelled", "expired"]) expect(videoJoinRefusal({ ...ok, status })).toMatch(/ended/);
    expect(videoJoinRefusal({ ...ok, liveKitReady: false })).toMatch(/not set up/);
  });
});

describe("videoIdentity", () => {
  it("names members, emailed interviewers and the candidate differently", () => {
    expect(videoIdentity({ role: "interviewer", userId: "u1", guestId: null }, "s1")).toBe("u:u1");
    expect(videoIdentity({ role: "interviewer", userId: null, guestId: "g1" }, "s1")).toBe("g:g1");
    expect(videoIdentity({ role: "candidate", userId: "u9", guestId: null }, "s1")).toBe("c:s1");
  });
});

describe("wizard call choice", () => {
  it("defaults to built-in video with the add-on on, and drops the link", () => {
    expect(callChoice({}, true)).toBe("builtin");
    expect(callFields({ meetingUrl: "https://zoom.us/j/1" }, true)).toEqual({ builtinVideo: true });
  });

  it("sends the link when the host picks a meeting link", () => {
    expect(callFields({ call: "link", meetingUrl: " https://zoom.us/j/1 " }, true)).toEqual({ builtinVideo: false, meetingUrl: "https://zoom.us/j/1" });
  });

  it("is always the meeting link without the add-on", () => {
    expect(callChoice({ call: "builtin" }, false)).toBe("link");
    expect(callFields({ call: "builtin", meetingUrl: "https://zoom.us/j/1" }, false)).toEqual({ meetingUrl: "https://zoom.us/j/1" });
    expect(callFields({}, false)).toEqual({ meetingUrl: undefined });
  });
});

/* ───────────── The token route ───────────── */

const db = vi.hoisted(() => ({ interviewSession: { findUnique: vi.fn() } }));
const viewerFn = vi.hoisted(() => vi.fn());
const cfgFn = vi.hoisted(() => vi.fn());
const tokenFn = vi.hoisted(() => vi.fn(async () => "jwt"));

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/interview/room-access", () => ({ ROOM_SELECT: { id: true }, roomViewerFromRequest: viewerFn }));
vi.mock("@/lib/video/livekit-server", () => ({
  liveKitConfig: cfgFn,
  videoJoinToken: tokenFn,
  videoRoomName: (id: string) => `interview-${id}`,
}));

import { POST } from "@/app/api/interview/[id]/video/route";

const growth = { planName: "GROWTH", trialEndsAt: null, stripeSubscriptionId: "sub_1", videoEnabled: true };
const session = (over: Record<string, unknown> = {}) => ({ id: "s1", type: "live", status: "scheduled", builtinVideo: true, workspace: growth, ...over });
const call = () => POST(new Request("http://x/api/interview/s1/video", { method: "POST" }), { params: Promise.resolve({ id: "s1" }) });

describe("POST /api/interview/[id]/video", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cfgFn.mockReturnValue({ url: "wss://lk.test", apiKey: "k", apiSecret: "s" });
    viewerFn.mockResolvedValue({ role: "candidate", name: "Tomasz", via: "pass", userId: null, guestId: null });
    db.interviewSession.findUnique.mockResolvedValue(session());
  });

  it("returns a token for the candidate, named and tagged with their role", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "wss://lk.test", token: "jwt", room: "interview-s1" });
    expect(tokenFn).toHaveBeenCalledWith(expect.anything(), { room: "interview-s1", identity: "c:s1", name: "Tomasz", metadata: { role: "candidate" } });
  });

  it("uses the member and guest identities for interviewers", async () => {
    viewerFn.mockResolvedValueOnce({ role: "interviewer", name: "Alex", via: "member", userId: "u1", guestId: null });
    await call();
    expect(tokenFn).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ identity: "u:u1", metadata: { role: "interviewer" } }));
    viewerFn.mockResolvedValueOnce({ role: "interviewer", name: "sam", via: "pass", userId: null, guestId: "g7" });
    await call();
    expect(tokenFn).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ identity: "g:g7" }));
  });

  it("refuses people without room access", async () => {
    viewerFn.mockResolvedValueOnce(null);
    expect((await call()).status).toBe(401);
    expect(tokenFn).not.toHaveBeenCalled();
  });

  it("refuses with 403 and a plain message when video is off, the interview uses a link, it ended, or LiveKit is missing", async () => {
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ workspace: { ...growth, videoEnabled: false } }, /not switched on/],
      [{ workspace: { ...growth, planName: "FREE", stripeSubscriptionId: null } }, /not switched on/],
      [{ builtinVideo: false }, /meeting link/],
      [{ status: "completed" }, /ended/],
      [{ status: "cancelled" }, /ended/],
    ];
    for (const [over, msg] of cases) {
      db.interviewSession.findUnique.mockResolvedValueOnce(session(over));
      const res = await call();
      expect(res.status).toBe(403);
      expect((await res.json()).error).toMatch(msg);
    }
    cfgFn.mockReturnValueOnce(null);
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/not set up/);
    expect(tokenFn).not.toHaveBeenCalled();
  });

  it("404s for a missing interview or a take-home", async () => {
    db.interviewSession.findUnique.mockResolvedValueOnce(null);
    expect((await call()).status).toBe(404);
    db.interviewSession.findUnique.mockResolvedValueOnce(session({ type: "take-home" }));
    expect((await call()).status).toBe(404);
  });
});
