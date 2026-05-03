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
      if (typeof sandpack.runSandpack === "function") {
        sandpack.runSandpack();
      } else {
        dispatch({ type: "refresh" });
      }
    };
  }, [dispatch, runRef, sandpack]);
  
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    onStatusChangeRef.current?.(sandpack.status);
  }, [sandpack.status]);

  return null;
}
