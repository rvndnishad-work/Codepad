"use client";

import { useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import type * as Y from "yjs";
import { PACKAGE_JSON, readSharedFiles, writeSharedFiles } from "@/lib/interview/shared-fs";

type SpFile = { code: string; hidden?: boolean } | undefined;

/** Files the explorer shows, plus package.json so npm dependencies are shared. */
function shared(path: string, f: SpFile): boolean {
  return path === PACKAGE_JSON || !f?.hidden;
}

/**
 * Keeps Sandpack's files and the room's shared document in step, both ways.
 *
 * - Shared to local: any change in the document (the other side typing,
 *   adding or deleting a file, installing a package) is pushed into Sandpack.
 * - Local to shared: explorer actions (new file, rename, move, delete) and
 *   npm panel edits change Sandpack's files; those are written back to the
 *   document. Typing goes straight into the document through SharedMonaco.
 *
 * Changes this bridge pushed itself are remembered until Sandpack reports
 * them, so they are never mistaken for local edits and echoed back.
 */
export function SharedFilesBridge({
  doc,
  stack,
  legacyPaths,
  readOnly,
}: {
  doc: Y.Doc;
  stack: string;
  /** The template's visible files, for rooms from before the shared list. */
  legacyPaths: string[];
  readOnly: boolean;
}) {
  const { sandpack } = useSandpack();
  const sp = useRef(sandpack);
  useEffect(() => {
    sp.current = sandpack;
  }, [sandpack]);

  // What Sandpack holds from the document, as of the last push.
  const pushed = useRef<Record<string, string>>(readSharedFiles(doc, stack, legacyPaths));
  // Pushed but not yet seen in Sandpack's state: path to code, null for a delete.
  const expected = useRef(new Map<string, string | null>());
  const legacy = useRef(legacyPaths);
  legacy.current = legacyPaths;

  useEffect(() => {
    const apply = () => {
      const next = readSharedFiles(doc, stack, legacy.current);
      const prev = pushed.current;
      const s = sp.current;
      for (const [path, code] of Object.entries(next)) {
        if (prev[path] === code) continue;
        expected.current.set(path, code);
        // The string form keeps an existing file's hidden flag.
        s.updateFile(path, code);
      }
      for (const path of Object.keys(prev)) {
        if (path in next) continue;
        expected.current.set(path, null);
        s.deleteFile(path);
      }
      pushed.current = next;
    };
    apply();
    doc.on("update", apply);
    return () => doc.off("update", apply);
  }, [doc, stack]);

  const before = useRef(sandpack.files);
  useEffect(() => {
    const prev = before.current;
    const next = sandpack.files;
    before.current = next;
    if (prev === next) return;
    const changes: Record<string, string | null> = {};
    for (const path of new Set([...Object.keys(prev), ...Object.keys(next)])) {
      const a = next[path] as SpFile;
      const b = prev[path] as SpFile;
      const code = a ? a.code : null;
      if (expected.current.has(path) && expected.current.get(path) === code) {
        expected.current.delete(path);
        continue;
      }
      if (code === (b ? b.code : null)) continue;
      if (!shared(path, a ?? b)) continue;
      changes[path] = code;
    }
    if (readOnly || !Object.keys(changes).length) return;
    // Record the new state first so the document update this causes is not
    // pushed back into Sandpack.
    const nextPushed = { ...pushed.current };
    for (const [path, code] of Object.entries(changes)) {
      if (code === null) delete nextPushed[path];
      else nextPushed[path] = code;
    }
    pushed.current = nextPushed;
    writeSharedFiles(doc, stack, changes, legacy.current);
  }, [sandpack.files, doc, stack, readOnly]);

  return null;
}
