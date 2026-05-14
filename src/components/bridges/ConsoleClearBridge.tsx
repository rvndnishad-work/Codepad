"use client";

import { useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";

/**
 * Auto-clears the Sandpack console when the user fixes an error and a fresh
 * build starts producing new output. Without this, runtime errors from a
 * previous run stay in the console next to the new (correct) output, which
 * is confusing.
 *
 * Strategy:
 *   1. Track whether the *previous* run produced any error — either a
 *      compile error (`sandpack.error`) or a runtime error (`console`
 *      message with method="error" / Sandpack `show-error` action).
 *   2. At the start of the NEXT build (`start` event), if errors were
 *      seen, call `onClear` once — which the parent uses to bump the
 *      console's React `key`, remounting it with a fresh buffer.
 *   3. Clearing at `start` (rather than `done`) is critical: console
 *      messages arrive between `start` and `done`, so clearing at `done`
 *      would wipe the new output too.
 */
export function ConsoleClearBridge({ onClear }: { onClear: () => void }) {
  const { listen, sandpack } = useSandpack();
  const hadErrorRef = useRef(false);
  const onClearRef = useRef(onClear);
  useEffect(() => {
    onClearRef.current = onClear;
  }, [onClear]);

  // Mirror compile errors into the same flag the runtime-error listener uses.
  useEffect(() => {
    if (sandpack.error?.message) hadErrorRef.current = true;
  }, [sandpack.error]);

  useEffect(() => {
    const unsubscribe = listen((msg: unknown) => {
      const m = msg as {
        type?: string;
        action?: string;
        log?: Array<{ method?: string }>;
      };

      // Runtime errors surface as a `console` message with method="error" or
      // as a top-level `action: "show-error"` event.
      if (m.type === "console" && Array.isArray(m.log)) {
        if (m.log.some((entry) => entry?.method === "error")) {
          hadErrorRef.current = true;
        }
      }
      if (m.type === "action" && m.action === "show-error") {
        hadErrorRef.current = true;
      }

      // A new build is beginning. If the previous build had any error, wipe
      // the console once so the new output appears alone.
      if (m.type === "start" && hadErrorRef.current) {
        hadErrorRef.current = false;
        onClearRef.current();
      }
    });
    return () => unsubscribe();
  }, [listen]);

  return null;
}
