/**
 * Puts starter code into a shared document without ever doubling it.
 *
 * The starter text is written by a throwaway document with a fixed client
 * id derived from `key`, so every browser that seeds builds the exact same
 * Yjs update. Yjs treats identical updates as one, so the candidate and the
 * interviewer can both seed, in any order, on any connection, and the
 * files appear once. No "who seeds first" race, no waiting on a peer.
 */
import * as Y from "yjs";

/** Stable 31-bit id from a string (FNV-1a). Never 0. */
export function seedClientId(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 1) | 1) >>> 0;
}

/** The update that writes `files` (name to text) into a fresh document. */
export function seedUpdate(key: string, files: Record<string, string>, textName: (path: string) => string = (p) => p): Uint8Array {
  const tmp = new Y.Doc();
  tmp.clientID = seedClientId(key);
  tmp.transact(() => {
    for (const path of Object.keys(files).sort()) {
      const code = files[path];
      if (code) tmp.getText(textName(path)).insert(0, code);
    }
  });
  const u = Y.encodeStateAsUpdate(tmp);
  tmp.destroy();
  return u;
}

/** Applies the seed to `doc`. Safe to call any number of times, from any client. */
export function seedDoc(doc: Y.Doc, key: string, files: Record<string, string>, textName?: (path: string) => string): void {
  Y.applyUpdate(doc, seedUpdate(key, files, textName));
}
