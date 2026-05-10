"use client";

import { useEffect, useRef } from "react";
import { useSandpack, type SandpackFiles } from "@codesandbox/sandpack-react";

export function FilesBridge({
  templateId,
  filesRef,
  onChange,
  templateFiles,
}: {
  templateId?: string;
  filesRef: React.MutableRefObject<SandpackFiles>;
  onChange?: () => void;
  templateFiles: SandpackFiles;
}) {
  const { sandpack } = useSandpack();
  const initialized = useRef(false);
  
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const map: SandpackFiles = {};
    let needsUpdate = false;
    const updatePayload: Record<string, any> = {};

    const isEmptyJsTs = templateId === "empty-js" || templateId === "empty-ts";

    for (const [path, file] of Object.entries(sandpack.files)) {
      const code = typeof file === "string" ? file : (file as { code: string }).code;
      const tplFile = templateFiles[path];
      const isHidden = tplFile && typeof tplFile !== "string" && (tplFile as any).hidden;
      const currentlyHidden = typeof file !== "string" && (file as any).hidden;

      if (isHidden && !currentlyHidden) {
        needsUpdate = true;
        updatePayload[path] = updatePayload[path] || { code };
        updatePayload[path].hidden = true;
      }

      map[path] = isHidden ? { code, hidden: true } : { code };
    }

    filesRef.current = map;

    if (needsUpdate || Object.keys(sandpack.files).length === 0) {
      if (needsUpdate) sandpack.updateFile(updatePayload);
      // Force a hard refresh to clear the console and re-evaluate the module cache
      setTimeout(() => {
        const iframe = document.querySelector(".sp-iframe") as HTMLIFrameElement;
        if (iframe) {
           const currentSrc = iframe.src;
           iframe.src = "";
           iframe.src = currentSrc;
        }
      }, 50);
    }

    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    
    // Nudge the bundler if we are in autoRun mode to ensure the code change is picked up
    const isAutoRun = sandpack.status === "initial" || sandpack.status === "idle";
    if (isAutoRun) {
      // Small debounce to let Sandpack's internal state settle
      const timer = setTimeout(() => {
        const iframe = document.querySelector(".sp-iframe") as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: "refresh" }, "*");
        }
      }, 250);
      return () => clearTimeout(timer);
    }

    onChangeRef.current?.();
  }, [sandpack.files, sandpack.status, sandpack.activeFile, filesRef, templateFiles, templateId]);

  return null;
}
