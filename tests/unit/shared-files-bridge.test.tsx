import { describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import * as Y from "yjs";
import { useSandpack } from "@codesandbox/sandpack-react";
import SharedSandpack from "@/components/SharedSandpack";
import { SharedFilesBridge } from "@/components/bridges/SharedFilesBridge";
import { codeText } from "@/lib/interview/code-stacks";
import { seedDoc } from "@/lib/interview/relay-seed";
import { codeFsName, readSharedFiles, seedFs, seedFsUpdate, setText, withSharedText, writeSharedFiles } from "@/lib/interview/shared-fs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const STACK = "react";
const PKG = `{\n  "main": "/index.js",\n  "dependencies": {}\n}`;
const START = { "/App.js": "export default () => 1;", "/styles.css": "body{}" };

/** Two docs that pass every update to each other, like the room relay. */
function linkedDocs(): [Y.Doc, Y.Doc] {
  const a = new Y.Doc();
  const b = new Y.Doc();
  a.on("update", (u: Uint8Array, origin: unknown) => origin !== "remote" && Y.applyUpdate(b, u, "remote"));
  b.on("update", (u: Uint8Array, origin: unknown) => origin !== "remote" && Y.applyUpdate(a, u, "remote"));
  return [a, b];
}

function seed(doc: Y.Doc) {
  seedDoc(doc, `code-seed:${STACK}`, START, (p) => codeText(STACK, p));
  seedFs(doc, STACK, Object.keys(START));
}

describe("shared-fs", () => {
  it("seeds the file list once however many clients seed", () => {
    const [a, b] = linkedDocs();
    seed(a);
    seed(b);
    seed(a);
    expect(readSharedFiles(b, STACK)).toEqual(START);
    expect(Y.encodeStateAsUpdate(a)).toEqual(Y.encodeStateAsUpdate(b));
    expect(seedFsUpdate(STACK, ["/b", "/a"])).toEqual(seedFsUpdate(STACK, ["/a", "/b"]));
  });

  it("setText only touches the changed middle", () => {
    const doc = new Y.Doc();
    const t = doc.getText("t");
    t.insert(0, "hello world");
    const ops: unknown[] = [];
    t.observe((e) => ops.push(...e.delta));
    setText(t, "hello brave world");
    expect(t.toString()).toBe("hello brave world");
    expect(ops).toEqual([{ retain: 6 }, { insert: "brave " }]);
    setText(t, "");
    expect(t.toString()).toBe("");
  });

  it("falls back to the template files in rooms without a list, and keeps them on the first write", () => {
    const doc = new Y.Doc();
    seedDoc(doc, `code-seed:${STACK}`, START, (p) => codeText(STACK, p));
    const legacy = Object.keys(START);
    expect(readSharedFiles(doc, STACK, legacy)).toEqual(START);
    writeSharedFiles(doc, STACK, { "/Button.js": "b" }, legacy);
    expect([...doc.getMap(codeFsName(STACK)).keys()].sort()).toEqual(["/App.js", "/Button.js", "/styles.css"]);
  });
});

type Sp = ReturnType<typeof useSandpack>["sandpack"];

function mount(doc: Y.Doc, grab: (sp: Sp) => void) {
  function Probe() {
    const { sandpack } = useSandpack();
    grab(sandpack);
    return null;
  }
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <SharedSandpack template="react" fixed={withSharedText({ "/package.json": { code: PKG, hidden: true } }, readSharedFiles(doc, STACK))} entry="/App.js">
      <SharedFilesBridge doc={doc} stack={STACK} legacyPaths={Object.keys(START)} readOnly={false} />
      <Probe />
    </SharedSandpack>,
  );
  return root;
}

const code = (sp: Sp, path: string) => (sp.files[path] as { code: string } | undefined)?.code;

describe("SharedFilesBridge", () => {
  it("shares typing, explorer changes and npm installs between both sides", async () => {
    const [a, b] = linkedDocs();
    seed(a);
    let spA!: Sp;
    let spB!: Sp;
    let rootA!: ReturnType<typeof createRoot>;
    let rootB!: ReturnType<typeof createRoot>;
    await act(async () => {
      rootA = mount(a, (s) => (spA = s));
      rootB = mount(b, (s) => (spB = s));
    });
    expect(code(spB, "/App.js")).toBe(START["/App.js"]);

    // Typing on one side (SharedMonaco writes the Y.Text) reaches the other bundler.
    await act(async () => setText(a.getText(codeText(STACK, "/App.js")), "export default () => 2;"));
    expect(code(spB, "/App.js")).toBe("export default () => 2;");

    // New file from the explorer on B.
    await act(async () => spB.addFile("/Button.js", "export const B = 1;"));
    expect(code(spA, "/Button.js")).toBe("export const B = 1;");
    expect(readSharedFiles(a, STACK)["/Button.js"]).toBe("export const B = 1;");

    // Rename (delete + add) on A.
    await act(async () => {
      spA.deleteFile("/Button.js");
      spA.addFile("/ui/Button.js", "export const B = 1;");
    });
    expect(spB.files["/Button.js"]).toBeUndefined();
    expect(code(spB, "/ui/Button.js")).toBe("export const B = 1;");

    // package.json is not shared until someone installs a package from the npm panel.
    expect(readSharedFiles(a, STACK)["/package.json"]).toBeUndefined();
    const pkg = JSON.parse(code(spB, "/package.json")!);
    const withDep = JSON.stringify({ ...pkg, dependencies: { ...pkg.dependencies, lodash: "latest" } }, null, 2) + "\n";
    await act(async () => spB.updateFile("/package.json", withDep));
    expect(code(spA, "/package.json")).toBe(withDep);
    expect(JSON.parse(withDep).dependencies.react).toBeTruthy();

    // Nothing echoed: both docs and both bundlers agree.
    expect(readSharedFiles(a, STACK)).toEqual(readSharedFiles(b, STACK));
    for (const p of Object.keys(readSharedFiles(a, STACK))) expect(code(spA, p)).toBe(code(spB, p));

    await act(async () => {
      rootA.unmount();
      rootB.unmount();
    });
  });
});
