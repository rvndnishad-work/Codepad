import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { seedDoc, seedClientId } from "@/lib/interview/relay-seed";
import { passExpiry, signRoomPass, verifyRoomPass, cookieFrom, roomCookieName } from "@/lib/interview/room-pass";
import { backoffMs, parseChannel } from "@/lib/interview/relay";
import { parseRound, roundKey, roundText } from "@/lib/interview/room";

const SECRET = "test-secret-please-ignore";
const room = { id: "sess_1", shareToken: "share-abc" };

describe("room pass", () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;

  it("round-trips a candidate pass", () => {
    const raw = signRoomPass({ sessionId: room.id, role: "candidate", expiresAt: exp }, room.shareToken, SECRET);
    const r = verifyRoomPass(raw, room, Date.now(), SECRET);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pass.r).toBe("candidate");
  });

  it("refuses a pass for another room, an edited pass and an expired pass", () => {
    const raw = signRoomPass({ sessionId: room.id, role: "candidate", expiresAt: exp }, room.shareToken, SECRET);
    expect(verifyRoomPass(raw, { id: "sess_2", shareToken: room.shareToken }, Date.now(), SECRET)).toMatchObject({ ok: false });
    const [body, sig] = raw.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), r: "guest", g: "x" })).toString("base64url");
    expect(verifyRoomPass(`${forged}.${sig}`, room, Date.now(), SECRET)).toEqual({ ok: false, reason: "signature" });
    expect(verifyRoomPass(raw, room, (exp + 1) * 1000, SECRET)).toEqual({ ok: false, reason: "expired" });
    expect(verifyRoomPass("nonsense", room, Date.now(), SECRET)).toEqual({ ok: false, reason: "malformed" });
  });

  it("stops working when the share token is rotated", () => {
    const raw = signRoomPass({ sessionId: room.id, role: "candidate", expiresAt: exp }, room.shareToken, SECRET);
    expect(verifyRoomPass(raw, { id: room.id, shareToken: "rotated" }, Date.now(), SECRET)).toEqual({ ok: false, reason: "signature" });
  });

  it("expires a day after a scheduled interview, and never sooner than two hours", () => {
    const now = Date.UTC(2026, 8, 26, 9);
    const at = new Date(Date.UTC(2026, 8, 27, 10));
    expect(passExpiry({ scheduledAt: at, totalSec: 3600 }, now)).toBe(at.getTime() / 1000 + 3600 + 24 * 3600);
    expect(passExpiry({ scheduledAt: new Date(now - 10 * 24 * 3600e3), totalSec: 60 }, now)).toBe(now / 1000 + 2 * 3600);
    expect(passExpiry({ scheduledAt: null, totalSec: 60 }, now)).toBe(now / 1000 + 14 * 24 * 3600);
  });

  it("reads its cookie", () => {
    const name = roomCookieName("sess_1");
    expect(cookieFrom(`a=1; ${name}=x.y%3D; b=2`, name)).toBe("x.y=");
    expect(cookieFrom("a=1", name)).toBeNull();
  });
});

describe("relay", () => {
  it("accepts only known channels", () => {
    expect(parseChannel(null)).toBe("tools");
    expect(parseChannel("code:ck123-0")).toBe("code:ck123-0");
    expect(parseChannel("code:../x")).toBeNull();
    expect(parseChannel("other")).toBeNull();
  });

  it("backs off and caps", () => {
    expect(backoffMs(1, 0.5)).toBe(500);
    expect(backoffMs(3, 0.5)).toBe(2000);
    expect(backoffMs(20, 0.5)).toBe(8000);
  });
});

describe("seeding starter code", () => {
  const files = { "/App.js": "export default 1;\n", "/index.js": "import './App';\n" };

  it("never doubles the starter code, whoever seeds and in what order", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    seedDoc(a, "k", files);
    seedDoc(b, "k", files);
    seedDoc(a, "k", files);
    a.getText("/App.js").insert(0, "// candidate edit\n");
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    seedDoc(b, "k", files);
    expect(a.getText("/App.js").toString()).toBe("// candidate edit\nexport default 1;\n");
    expect(b.getText("/App.js").toString()).toBe(a.getText("/App.js").toString());
    expect(b.getText("/index.js").toString()).toBe("import './App';\n");
  });

  it("uses a different writer per key", () => {
    expect(seedClientId("a")).not.toBe(seedClientId("b"));
    expect(seedClientId("a")).toBeGreaterThan(0);
  });
});

describe("room rounds", () => {
  it("parses and names rounds", () => {
    expect(parseRound("c:abc:1")).toEqual({ kind: "challenge", id: "abc", step: 1 });
    expect(parseRound("p:xyz")).toEqual({ kind: "playground", id: "xyz", step: 0 });
    expect(parseRound("q:qq")).toEqual({ kind: "prompt", id: "qq", step: 0 });
    expect(parseRound("bad")).toBeNull();
    expect(parseRound(null)).toBeNull();
    expect(roundKey({ kind: "challenge", id: "abc", step: 2 })).toBe("c:abc:2");
    expect(roundText("c:abc:0", "/App.js")).toBe("round:c:abc:0:/App.js");
  });
});
