"use client";

import { useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";

export function RunBridge({
  runRef,
  onStatusChange,
}: {
  runRef: React.MutableRefObject<(() => void) | null>;
  onStatusChange?: (status: string) => void;
}) {
  const { dispatch, sandpack, listen } = useSandpack();

  useEffect(() => {
    runRef.current = () => {
      if (typeof sandpack.runSandpack === "function") {
        sandpack.runSandpack();
      }
      dispatch({ type: "refresh" });
      onStatusChange?.("running");
      if (sandpack.status === "idle") {
        setTimeout(() => {
          onStatusChange?.("idle");
        }, 300);
      }
    };
  }, [dispatch, runRef, sandpack, onStatusChange]);

  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onStatusChangeRef.current?.(sandpack.status);
  }, [sandpack.status]);

  // Fast-path: Sandpack fires a `done` message right after the iframe finishes
  // a build cycle. This typically lands a beat or two BEFORE `sandpack.status`
  // transitions back to "idle", so relying solely on the status state leaves
  // the Run spinner spinning visibly after output is already on screen.
  // We forward `done` as a synthetic status update so the parent can clear
  // its "running" flag immediately.
  const errorRef = useRef(sandpack.error);
  useEffect(() => {
    errorRef.current = sandpack.error;
  }, [sandpack.error]);

  useEffect(() => {
    const unsubscribe = listen((msg: unknown) => {
      const m = msg as { type?: string };
      if (m.type !== "done") return;
      // If the bundler is still reporting an error, don't lie about being done.
      if (errorRef.current?.message) return;
      onStatusChangeRef.current?.("done");
    });
    return () => unsubscribe();
  }, [listen]);

  return null;
}
