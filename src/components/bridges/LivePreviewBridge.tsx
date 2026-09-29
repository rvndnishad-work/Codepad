"use client";

import { useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";

type BundlerFiles = ReturnType<typeof useSandpack>["sandpack"]["files"];

/** True when two file maps differ in paths or code. */
export function filesDiffer(
  a: BundlerFiles | undefined,
  b: BundlerFiles | undefined,
): boolean {
  if (a === b) return false;
  if (!a || !b) return true;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return true;
  return keys.some((k) => a[k]?.code !== b[k]?.code);
}

/**
 * Keeps the preview in step with the editor while the user types.
 *
 * The provider runs with `recompileMode: "immediate"`, which sends each edit
 * straight to the bundler but drops edits that land while a compile is still
 * in flight. Without a catch-up the preview could end up one keystroke
 * behind. On every `done` this re-sends the latest files to any client that
 * last compiled an older version, so the final state always lands.
 */
export function LivePreviewBridge({ enabled }: { enabled: boolean }) {
  const { sandpack, listen } = useSandpack();
  const latest = useRef(sandpack);
  useEffect(() => {
    latest.current = sandpack;
  }, [sandpack]);

  useEffect(() => {
    if (!enabled) return;
    return listen((msg) => {
      if (msg.type !== "done") return;
      // Runs on the `done` message itself, so the client has just gone idle.
      const { clients, files, environment, status } = latest.current;
      if (status !== "running") return;
      for (const client of Object.values(clients)) {
        if (!filesDiffer(client.sandboxSetup.files, files)) continue;
        client.updateSandbox({ files, template: environment });
      }
    });
  }, [enabled, listen]);

  return null;
}
