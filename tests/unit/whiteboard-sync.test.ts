import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  FOLLOW_MAX_WAIT_MS,
  FOLLOW_QUIET_MS,
  FOLLOW_SETTLE_MS,
  byIndex,
  fitZoom,
  followDelay,
  followTarget,
  mergeRemote,
  newer,
  outside,
  shouldFollow,
  union,
  viewportBox,
  type Box,
  type WbEl,
} from "@/lib/interview/whiteboard";

const el = (id: string, version: number, versionNonce: number, index = "a0"): WbEl => ({ id, version, versionNonce, index });

describe("newer", () => {
  it("higher version wins, then the lower nonce, like Excalidraw", () => {
    expect(newer(el("a", 2, 5), undefined)).toBe(true);
    expect(newer(el("a", 3, 9), el("a", 2, 1))).toBe(true);
    expect(newer(el("a", 2, 1), el("a", 3, 9))).toBe(false);
    expect(newer(el("a", 2, 1), el("a", 2, 9))).toBe(true);
    expect(newer(el("a", 2, 9), el("a", 2, 1))).toBe(false);
    // The same element is never newer than itself, so nothing echoes back.
    expect(newer(el("a", 2, 4), el("a", 2, 4))).toBe(false);
  });

  it("two sides settle on the same element whichever order edits arrive in", () => {
    const x = el("a", 4, 10);
    const y = el("a", 4, 3);
    const pick = (cur: WbEl, inc: WbEl) => (newer(inc, cur) ? inc : cur);
    expect(pick(x, y)).toBe(y);
    expect(pick(y, x)).toBe(y);
  });
});

describe("mergeRemote", () => {
  it("takes only newer remote elements, keeps local ones, and sorts by index", () => {
    const local = [el("a", 1, 1, "a1"), el("b", 5, 1, "a2")];
    const out = mergeRemote(local, [el("b", 4, 0, "a2"), el("c", 1, 1, "a0"), el("a", 2, 1, "a1")]);
    expect(out?.changed.map((e) => e.id)).toEqual(["c", "a"]);
    expect(out?.elements.map((e) => `${e.id}${e.version}`)).toEqual(["c1", "a2", "b5"]);
    expect(byIndex(el("x", 1, 1, "a0"), el("y", 1, 1, "a1"))).toBe(-1);
  });

  it("returns null when nothing changes", () => {
    expect(mergeRemote([el("a", 2, 1)], [el("a", 2, 1), el("a", 1, 0)])).toBeNull();
  });

  it("catches up on changes made before the observer was attached", () => {
    // Remote doc has content; this client renders from its copy, then more
    // arrives before its effect runs. A full pull brings the scene level.
    const remote = new Y.Doc();
    const local = new Y.Doc();
    const rmap = remote.getMap<WbEl>("whiteboard");
    rmap.set("a", el("a", 1, 1, "a0"));
    Y.applyUpdate(local, Y.encodeStateAsUpdate(remote));
    const lmap = local.getMap<WbEl>("whiteboard");
    const firstRender = [...lmap.values()];

    rmap.set("a", el("a", 2, 1, "a0"));
    rmap.set("b", el("b", 1, 1, "a1"));
    Y.applyUpdate(local, Y.encodeStateAsUpdate(remote)); // no observer yet

    const out = mergeRemote(firstRender, lmap.values());
    expect(out?.elements.map((e) => `${e.id}${e.version}`)).toEqual(["a2", "b1"]);
  });
});

describe("following remote changes", () => {
  // A phone: 390 x 700 CSS px at 100%, scrolled to the origin.
  const phone = { scrollX: 0, scrollY: 0, zoom: { value: 1 }, width: 390, height: 700 };
  const view = viewportBox(phone);
  const inView: Box = [20, 20, 200, 200];
  const offRight: Box = [900, 100, 1100, 300];

  it("works out the visible part of the scene", () => {
    expect(viewportBox(phone)).toEqual([0, 0, 390, 700]);
    expect(viewportBox({ scrollX: -100, scrollY: 50, zoom: { value: 2 }, width: 400, height: 600 })).toEqual([100, -50, 300, 250]);
  });

  it("follows only when something changed off screen", () => {
    expect(outside(inView, view)).toBe(false);
    expect(outside(offRight, view)).toBe(true);
    expect(outside([380, 10, 400, 20], view)).toBe(true);
    const now = 100_000;
    expect(shouldFollow({ changed: [inView], view, now, lastLocalAt: 0 })).toBe(false);
    expect(shouldFollow({ changed: [inView, offRight], view, now, lastLocalAt: 0 })).toBe(true);
    expect(shouldFollow({ changed: [], view, now, lastLocalAt: 0 })).toBe(false);
  });

  it("leaves the view alone while this person is using the board", () => {
    const now = 100_000;
    expect(shouldFollow({ changed: [offRight], view, now, lastLocalAt: now - 1000 })).toBe(false);
    expect(shouldFollow({ changed: [offRight], view, now, lastLocalAt: now - FOLLOW_QUIET_MS })).toBe(true);
  });

  it("gathers a stroke streaming in into one move, with a cap", () => {
    expect(followDelay(1000, 1000)).toBe(FOLLOW_SETTLE_MS);
    // Points keep arriving: wait for a pause, but never past the cap.
    expect(followDelay(1000, 1300)).toBe(FOLLOW_SETTLE_MS);
    expect(followDelay(1000, 1000 + FOLLOW_MAX_WAIT_MS - 100)).toBe(100);
    expect(followDelay(1000, 1000 + FOLLOW_MAX_WAIT_MS + 50)).toBe(0);
  });

  it("fits the whole board when it still reads, never zooming in", () => {
    const all = union([inView, offRight])!;
    expect(all).toEqual([20, 20, 1100, 300]);
    expect(fitZoom(all, 390, 700)).toBeCloseTo((390 / 1080) * 0.9);
    expect(followTarget({ all, width: 390, height: 700, zoom: 1 })).toEqual({ target: "all", maxZoom: 1 });
    expect(followTarget({ all, width: 390, height: 700, zoom: 2 }).maxZoom).toBe(1);
    expect(followTarget({ all, width: 390, height: 700, zoom: 0.5 }).maxZoom).toBe(0.5);
    // A huge board would be unreadable on a phone: just show the new part.
    expect(followTarget({ all: [0, 0, 6000, 400], width: 390, height: 700, zoom: 1 }).target).toBe("changed");
    expect(union([])).toBeNull();
  });
});
