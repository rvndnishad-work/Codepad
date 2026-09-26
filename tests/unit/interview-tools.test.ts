import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { TOOLS, TOOL_IDS, applyToolsAction, defaultTools, initialTools, parseTools, timerRemaining, toolRole } from "@/lib/interview/tools";

describe("room tools", () => {
  it("suggests tools by format", () => {
    expect(defaultTools("discussion")).toEqual(["whiteboard", "notes", "timer"]);
    expect(defaultTools("behavioural")).toContain("question");
    expect(defaultTools(null)).toEqual(["whiteboard", "code"]);
  });

  it("describes every tool once, in dock order", () => {
    expect(TOOLS.map((t) => t.id)).toEqual([...TOOL_IDS]);
    for (const t of TOOLS) expect(t.label.length).toBeGreaterThan(0);
  });

  it("parses stored state and falls back to the format", () => {
    expect(parseTools(null, "intro").enabled).toEqual(["notes", "question"]);
    expect(parseTools("not json", "coding").enabled).toEqual(["whiteboard", "timer"]);
    const s = parseTools(JSON.stringify({ enabled: ["code", "bogus", "whiteboard"], presented: "timer", rev: 3 }), null);
    expect(s.enabled).toEqual(["whiteboard", "code"]);
    // The timer is not a stage tool and cannot be presented.
    expect(s.presented).toBeNull();
    expect(s.rev).toBe(3);
  });

  it("presenting a tool switches it on; switching it off stops presenting", () => {
    let s = initialTools(["whiteboard"]);
    s = applyToolsAction(s, { type: "present", tool: "ranking" }, 0)!;
    expect(s.enabled).toEqual(["whiteboard", "ranking"]);
    expect(s.presented).toBe("ranking");
    expect(applyToolsAction(s, { type: "present", tool: "ranking" }, 0)).toBeNull();
    s = applyToolsAction(s, { type: "enable", tool: "ranking", on: false }, 0)!;
    expect(s.presented).toBeNull();
    expect(s.rev).toBe(2);
  });

  it("question card presents itself and trims", () => {
    const s = applyToolsAction(initialTools([]), { type: "question", text: "  Why this role?  " }, 42)!;
    expect(s.question).toEqual({ text: "Why this role?", at: 42 });
    expect(s.presented).toBe("question");
    expect(applyToolsAction(s, { type: "question", text: "   " }, 50)).toBeNull();
  });

  it("timer counts from the server clock and pauses", () => {
    let s = applyToolsAction(initialTools([]), { type: "timer", op: "set", seconds: 600 }, 0)!;
    expect(s.enabled).toContain("timer");
    expect(timerRemaining(s.timer, 0)).toBe(600);
    s = applyToolsAction(s, { type: "timer", op: "start" }, 1_000)!;
    expect(timerRemaining(s.timer, 61_000)).toBe(540);
    s = applyToolsAction(s, { type: "timer", op: "pause" }, 61_000)!;
    expect(timerRemaining(s.timer, 999_999)).toBe(540);
    s = applyToolsAction(s, { type: "timer", op: "start" }, 100_000)!;
    expect(timerRemaining(s.timer, 100_000 + 540_000 + 5_000)).toBe(0);
    s = applyToolsAction(s, { type: "timer", op: "reset" }, 0)!;
    expect(timerRemaining(s.timer, 0)).toBe(600);
    s = applyToolsAction(s, { type: "enable", tool: "timer", on: false }, 0)!;
    expect(s.timer).toBeNull();
  });

  it("works out who is the interviewer", () => {
    const s = { userId: "host", panelJson: JSON.stringify(["mei"]), creatorRole: "interviewer", shareToken: "tok" };
    expect(toolRole(s, "host", null)).toBe("interviewer");
    expect(toolRole(s, "mei", "tok")).toBe("interviewer");
    expect(toolRole(s, null, "tok")).toBe("candidate");
    expect(toolRole(s, "stranger", "nope")).toBeNull();
    expect(toolRole({ ...s, creatorRole: "candidate" }, null, "tok")).toBe("interviewer");
    // An emailed interviewer holds a guest key; it wins over the share token.
    expect(toolRole(s, null, "tok", true)).toBe("interviewer");
    expect(toolRole(s, null, null, true)).toBe("interviewer");
    // Guest keys only exist for interviewer-led rooms.
    expect(toolRole({ ...s, creatorRole: "candidate" }, null, null, true)).toBeNull();
  });

  it("two docs exchanging relay updates converge", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    const stored: Uint8Array[] = [];
    a.on("update", (u: Uint8Array) => stored.push(u));
    b.on("update", (u: Uint8Array, origin: unknown) => origin !== "relay" && stored.push(u));
    a.getText("notes").insert(0, "hello");
    b.getText("notes").insert(0, "world ");
    Y.applyUpdate(b, Y.mergeUpdates(stored), "relay");
    Y.applyUpdate(a, Y.mergeUpdates(stored), "relay");
    expect(a.getText("notes").toString()).toBe(b.getText("notes").toString());
    expect(a.getText("notes").toString().length).toBe(11);
  });
});
