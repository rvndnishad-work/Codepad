"use client";

import { useEffect, useRef } from "react";
import { useSandpack, type SandpackFiles } from "@codesandbox/sandpack-react";

export function FilesBridge({
  templateId,
  filesRef,
  activeFileRef,
  onChange,
  templateFiles,
}: {
  templateId?: string;
  filesRef: React.MutableRefObject<SandpackFiles>;
  activeFileRef?: React.MutableRefObject<string>;
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
    if (activeFileRef) {
      activeFileRef.current = sandpack.activeFile;
    }

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

    if (needsUpdate) {
      sandpack.updateFile(updatePayload);
    }

    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    onChangeRef.current?.();
  }, [sandpack.files, sandpack.activeFile, filesRef, activeFileRef, templateFiles, templateId]);

  return null;
}
