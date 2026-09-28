import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { templatesById } from "@/lib/templates";
import { CODE_STACK_IDS, codeOutputFor, codeText, isCodeStack } from "@/lib/interview/code-stacks";
import { applyToolsAction, initialTools, parseTools } from "@/lib/interview/tools";
import { clearLeft, LEFT_KEY, LEFT_MAP, markLeft, parseLeftNote } from "@/lib/interview/room-leave";

describe("room code stacks", () => {
  it("offers every playable template once", () => {
    expect(new Set(CODE_STACK_IDS).size).toBe(CODE_STACK_IDS.length);
    for (const id of CODE_STACK_IDS) expect(templatesById[id], id).toBeTruthy();
    expect(CODE_STACK_IDS.length).toBe(Object.keys(templatesById).length);
  });

  it("shows output that fits the stack", () => {
    expect(codeOutputFor("python")).toBe("run");
    expect(codeOutputFor("ts-node")).toBe("run");
    expect(codeOutputFor("empty-js")).toBe("console");
    expect(codeOutputFor("react")).toBe("both");
    // Server stacks match where the playground runs them.
    for (const id of CODE_STACK_IDS) expect(codeOutputFor(id) === "run", id).toBe(templatesById[id].group === "backend");
  });

  it("keeps each stack's files apart", () => {
    expect(codeText("react", "/App.js")).not.toBe(codeText("empty-react", "/App.js"));
  });

  it("only the switchboard picks the stack, and only a known one", () => {
    const s = initialTools(["code"]);
    expect(s.codeStack).toBeNull();
    const picked = applyToolsAction(s, { type: "code", stack: "python" }, 0)!;
    expect(picked.codeStack).toBe("python");
    expect(picked.rev).toBe(s.rev + 1);
    expect(applyToolsAction(picked, { type: "code", stack: "python" }, 0)).toBeNull();
    expect(applyToolsAction(picked, { type: "code", stack: "cobol" }, 0)).toBeNull();
    expect(applyToolsAction(picked, { type: "code", stack: null }, 0)!.codeStack).toBeNull();
    expect(isCodeStack("react")).toBe(true);
  });

  it("reads the stack back from storage and drops unknown ones", () => {
    expect(parseTools(JSON.stringify({ enabled: ["code"], codeStack: "go" }), null).codeStack).toBe("go");
    expect(parseTools(JSON.stringify({ enabled: ["code"], codeStack: "nope" }), null).codeStack).toBeNull();
    expect(parseTools(JSON.stringify({ enabled: ["code"] }), null).codeStack).toBeNull();
  });
});

describe("candidate left note", () => {
  it("round-trips through the shared document and clears on return", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    a.on("update", (u: Uint8Array) => Y.applyUpdate(b, u));
    markLeft(a, { at: 1000, via: "hangup" });
    expect(parseLeftNote(b.getMap<string>(LEFT_MAP).get(LEFT_KEY))).toEqual({ at: 1000, via: "hangup" });
    expect(clearLeft(a)).toBe(true);
    expect(b.getMap<string>(LEFT_MAP).has(LEFT_KEY)).toBe(false);
    expect(clearLeft(a)).toBe(false);
  });

  it("ignores junk", () => {
    expect(parseLeftNote(undefined)).toBeNull();
    expect(parseLeftNote("{")).toBeNull();
    expect(parseLeftNote(JSON.stringify({ via: "hangup" }))).toBeNull();
    expect(parseLeftNote(JSON.stringify({ at: 5, via: "other" }))).toEqual({ at: 5, via: "leave" });
  });
});
