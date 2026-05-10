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
  const { dispatch, sandpack } = useSandpack();
  
  useEffect(() => {
    runRef.current = () => {
      // 1. Attempt standard run if available (for autoRun: false)
      if (typeof sandpack.runSandpack === "function") {
        sandpack.runSandpack();
      } 
      
      // 2. Always dispatch a refresh to ensure the bundler wakes up 
      dispatch({ type: "refresh" });

      // 3. Cache Buster: explicitly nudge the iframe if we are in a browser/preview mode
      const iframe = document.querySelector(".sp-iframe") as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "refresh" }, "*");
      }

      // 4. Force a status sync to give immediate feedback
      onStatusChange?.("running");
      
      // 5. If Sandpack is already idle and there are no changes, it might not emit a new status.
      // We manually clear the running state after a short delay to prevent the button from getting stuck.
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

  return null;
}
