"use client";

import { useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";

/**
 * For "console" mode templates, we want the active file to be the entry point.
 * This bridge listens for active file changes and updates the hidden 
 * index.html and package.json to point to the current file.
 */
export function ConsoleEntryBridge({ active }: { active: boolean }) {
  const { sandpack } = useSandpack();
  const lastActiveRef = useRef<string>(sandpack.activeFile);

  useEffect(() => {
    if (!active) return;
    if (sandpack.activeFile === lastActiveRef.current) return;
    
    const file = sandpack.activeFile;
    // Only target JS/TS files
    if (!file.endsWith(".js") && !file.endsWith(".ts")) return;
    
    lastActiveRef.current = file;

    // Update index.html (hidden) to point to the active file
    const htmlCode = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>Console Runner</title></head>
<body><script src="${file.startsWith('/') ? file.slice(1) : file}" type="module"></script></body>
</html>`;

    // Update package.json (hidden) to set the entry point
    const pkgCode = `{
  "main": "${file.startsWith('/') ? file.slice(1) : file}",
  "dependencies": {}
}`;

    // Batch updates
    sandpack.updateFile({
      "/index.html": { code: htmlCode, hidden: true },
      "/package.json": { code: pkgCode, hidden: true },
    });
  }, [active, sandpack.activeFile, sandpack.updateFile]);

  return null;
}
