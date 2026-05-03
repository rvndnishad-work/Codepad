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
      let code = typeof file === "string" ? file : (file as { code: string }).code;
      const tplFile = templateFiles[path];
      const isHidden = tplFile && typeof tplFile !== "string" && (tplFile as any).hidden;
      const currentlyHidden = typeof file !== "string" && (file as any).hidden;

      // Dynamically import active file into .codepad-entry for empty-js/empty-ts
      if (isEmptyJsTs && (path === "/.codepad-entry.js" || path === "/.codepad-entry.ts")) {
        const active = sandpack.activeFile;
        if (active && (active.endsWith(".js") || active.endsWith(".ts")) && active !== path) {
          const importPath = active.startsWith("/") ? `.${active}` : `./${active}`;
          const updatedCode = `import "${importPath}";\n`;
          if (code !== updatedCode) {
            code = updatedCode;
            needsUpdate = true;
            updatePayload[path] = updatePayload[path] || {};
            updatePayload[path].code = code;
          }
        }
      }

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
      // Force a hard refresh to clear the console and re-evaluate the module cache
      setTimeout(() => {
        const iframe = document.querySelector(".sp-iframe") as HTMLIFrameElement;
        if (iframe) iframe.src = iframe.src;
      }, 50);
    }

    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    onChangeRef.current?.();
  }, [sandpack.files, sandpack.activeFile, filesRef, templateFiles, templateId]);

  return null;
}
