"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useActiveCode, useSandpack } from "@codesandbox/sandpack-react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const EXT_LANG: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  css: "css",
  svelte: "html",
  vue: "html",
};

function languageFor(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? "plaintext";
}

export default function MonacoEditor() {
  const { code, updateCode } = useActiveCode();
  const { sandpack } = useSandpack();
  const { activeFile, visibleFiles, setActiveFile } = sandpack;

  const language = useMemo(() => languageFor(activeFile), [activeFile]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) updateCode(value);
    },
    [updateCode]
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center border-b border-border bg-panel/60 overflow-x-auto">
        {visibleFiles.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFile(f)}
            className={`px-3 py-2 text-xs border-r border-border whitespace-nowrap ${
              f === activeFile ? "bg-[#1e1e1e] text-white" : "text-muted hover:text-white"
            }`}
          >
            {f.replace(/^\//, "")}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          path={activeFile}
          value={code}
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: "on",
            renderLineHighlight: "line",
            lineNumbersMinChars: 3,
            folding: true,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}
