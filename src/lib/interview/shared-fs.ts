/**
 * The room code editor's file list, shared between both sides.
 *
 * Each stack keeps a Y.Map of its file paths (`code-fs:<stack>`) next to one
 * Y.Text per file (`codeText(stack, path)`). The map lets either side add,
 * rename or delete files from the explorer, and carries package.json so npm
 * dependencies are shared too. Rooms from before the map existed fall back
 * to the template's visible files.
 */
import * as Y from "yjs";
import { codeText } from "./code-stacks";
import { seedClientId } from "./relay-seed";

export const PACKAGE_JSON = "/package.json";

export function codeFsName(stack: string): string {
  return `code-fs:${stack}`;
}

/** The update that lists `paths` in a fresh document; identical on every browser. */
export function seedFsUpdate(stack: string, paths: string[]): Uint8Array {
  const key = `code-fs-seed:${stack}`;
  const tmp = new Y.Doc();
  tmp.clientID = seedClientId(key);
  tmp.transact(() => {
    const map = tmp.getMap<number>(codeFsName(stack));
    for (const p of [...paths].sort()) map.set(p, 1);
  });
  const u = Y.encodeStateAsUpdate(tmp);
  tmp.destroy();
  return u;
}

/** Lists the starter files once. Safe to call any number of times, from any client. */
export function seedFs(doc: Y.Doc, stack: string, paths: string[]): void {
  Y.applyUpdate(doc, seedFsUpdate(stack, paths));
}

/** Path to text of every shared file, in path order. */
export function readSharedFiles(doc: Y.Doc, stack: string, legacyPaths: string[] = []): Record<string, string> {
  const map = doc.getMap<number>(codeFsName(stack));
  const paths = map.size ? [...map.keys()] : legacyPaths;
  const out: Record<string, string> = {};
  for (const p of [...paths].sort()) out[p] = doc.getText(codeText(stack, p)).toString();
  return out;
}

/** Template files with the shared text laid over them, keeping each file's hidden flag. */
export function withSharedText(
  base: Record<string, string | { code: string; hidden?: boolean }>,
  sharedFiles: Record<string, string>,
): Record<string, string | { code: string; hidden?: boolean }> {
  const out = { ...base };
  for (const [path, code] of Object.entries(sharedFiles)) {
    const f = base[path];
    out[path] = f && typeof f === "object" ? { ...f, code } : code;
  }
  return out;
}

/** Replaces the text with `code`, touching only the part that differs. */
export function setText(text: Y.Text, code: string): void {
  const cur = text.toString();
  if (cur === code) return;
  let start = 0;
  const max = Math.min(cur.length, code.length);
  while (start < max && cur[start] === code[start]) start++;
  let endCur = cur.length;
  let endNew = code.length;
  while (endCur > start && endNew > start && cur[endCur - 1] === code[endNew - 1]) {
    endCur--;
    endNew--;
  }
  if (endCur > start) text.delete(start, endCur - start);
  if (endNew > start) text.insert(start, code.slice(start, endNew));
}

/**
 * Writes explorer changes into the shared document: a string adds or
 * replaces a file, null removes it.
 */
export function writeSharedFiles(
  doc: Y.Doc,
  stack: string,
  changes: Record<string, string | null>,
  legacyPaths: string[] = [],
  origin?: unknown,
): void {
  doc.transact(() => {
    const map = doc.getMap<number>(codeFsName(stack));
    // An older room with no list yet: write the implied list first, so
    // adding one file does not drop the others.
    if (!map.size) for (const p of legacyPaths) map.set(p, 1);
    for (const [path, code] of Object.entries(changes)) {
      if (code === null) {
        map.delete(path);
        continue;
      }
      if (!map.has(path)) map.set(path, 1);
      setText(doc.getText(codeText(stack, path)), code);
    }
  }, origin);
}
