"use client";

import { useEffect, useRef } from "react";
import { useSandpack, type SandpackFiles } from "@codesandbox/sandpack-react";
import { isNodeShimPath } from "@/lib/node-builtin-shims";
import {
  isRevealed,
  clearRevealed,
  resolveHidden,
} from "@/lib/revealed-paths";

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
  // Tab switches change activeFile without touching code — only report when
  // file contents actually differ, so switching tabs never marks dirty.
  const lastFilesJson = useRef<string>("");

  useEffect(() => {
    if (activeFileRef) {
      activeFileRef.current = sandpack.activeFile;
    }

    const map: SandpackFiles = {};
    let needsUpdate = false;
    const updatePayload: Record<string, any> = {};

    const isEmptyJsTs = templateId === "empty-js" || templateId === "empty-ts";

    for (const [path, file] of Object.entries(sandpack.files)) {
      // Injected Node-builtin shims (lib/node-builtin-shims.ts) live under
      // /node_modules and are re-created from the template on every mount.
      // They must never reach saved snippets, collab sync or dirty-checking.
      if (isNodeShimPath(path)) continue;
      const code = typeof file === "string" ? file : (file as { code: string }).code;
      const tplFile = templateFiles[path];
      const isHidden = tplFile && typeof tplFile !== "string" && (tplFile as any).hidden;
      const currentlyHidden = typeof file !== "string" && (file as any).hidden;
      // A path the user explicitly revealed (by creating a file over hidden
      // template scaffolding) stays visible — never force-hide it again.
      const revealed = isRevealed(templateId, path);

      if (isHidden && !currentlyHidden && !revealed) {
        needsUpdate = true;
        updatePayload[path] = updatePayload[path] || { code };
        updatePayload[path].hidden = true;
      }

      const effectiveHidden = resolveHidden(
        isHidden,
        currentlyHidden,
        templateId,
        path,
      );
      map[path] = effectiveHidden ? { code, hidden: true } : { code };
    }

    filesRef.current = map;
    const json = JSON.stringify(map);
    const filesChanged = json !== lastFilesJson.current;
    lastFilesJson.current = json;

    if (needsUpdate) {
      sandpack.updateFile(updatePayload);
    }

    if (!initialized.current) {
      initialized.current = true;
      // Drop stale reveal marks from a previous mount of this template so a
      // fresh snippet starts from the template's own hidden flags. Reveals
      // made during this mount happen strictly after init.
      clearRevealed(templateId);
      return;
    }

    if (filesChanged) onChangeRef.current?.();
  }, [sandpack.files, sandpack.activeFile, filesRef, activeFileRef, templateFiles, templateId]);

  return null;
}
