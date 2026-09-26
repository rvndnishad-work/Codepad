"use client";

/**
 * Live preview of a frontend or playground round. Each browser renders the
 * shared code itself, so the preview never depends on the other side's
 * connection. Edits reach the bundler after a short pause in typing.
 */
import { useEffect, useRef } from "react";
import { SandpackPreview, useSandpack, type SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";
import ShimmedSandpackProvider from "@/components/ShimmedSandpackProvider";

function FilesSync({ files }: { files: Record<string, string> }) {
  const { sandpack } = useSandpack();
  const last = useRef<Record<string, string>>({});
  useEffect(() => {
    const t = setTimeout(() => {
      for (const [path, code] of Object.entries(files)) {
        if (last.current[path] === code) continue;
        last.current[path] = code;
        if (sandpack.files[path]?.code !== code) sandpack.updateFile(path, code);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [files, sandpack]);
  return null;
}

export default function LivePreview({
  template,
  dependencies,
  files,
  roundKey,
  dark,
}: {
  template: string;
  dependencies?: Record<string, string>;
  files: Record<string, string>;
  roundKey: string;
  dark: boolean;
}) {
  // The first render's files seed the bundler; later edits go through FilesSync.
  const initial = useRef(files);
  return (
    <ShimmedSandpackProvider
      key={roundKey}
      template={template as SandpackPredefinedTemplate}
      theme={dark ? "dark" : "light"}
      files={initial.current}
      customSetup={dependencies ? { dependencies } : undefined}
      options={{ autorun: true, autoReload: true, recompileMode: "delayed", recompileDelay: 300 }}
    >
      <FilesSync files={files} />
      <div className="h-full [&_.sp-preview-container]:h-full [&_.sp-preview]:h-full">
        <SandpackPreview style={{ height: "100%" }} showOpenInCodeSandbox={false} showRefreshButton />
      </div>
    </ShimmedSandpackProvider>
  );
}
