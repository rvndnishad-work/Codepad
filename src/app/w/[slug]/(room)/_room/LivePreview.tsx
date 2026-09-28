"use client";

/**
 * Live preview of a frontend or playground round. Each browser renders the
 * shared code itself, so the preview never depends on the other side's
 * connection. Edits reach the bundler after a short pause in typing.
 */
import { SandpackPreview } from "@codesandbox/sandpack-react";
import SharedSandpack from "@/components/SharedSandpack";

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
  return (
    <SharedSandpack key={roundKey} template={template} dependencies={dependencies} fixed={{}} files={files} dark={dark}>
      <div className="h-full [&_.sp-preview-container]:h-full [&_.sp-preview]:h-full">
        <SandpackPreview style={{ height: "100%" }} showOpenInCodeSandbox={false} showRefreshButton />
      </div>
    </SharedSandpack>
  );
}
