"use client";

import {
  SandpackProvider,
  SandpackPreview,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import { useTheme } from "next-themes";
import { getSandpackTheme } from "@/lib/sandpack-theme";

/**
 * Read-only live preview of a candidate's submitted frontend work, for the
 * interviewer review surface. Renders the submitted files in a Sandpack
 * preview + console using the challenge's template — no editor, no tests.
 */
export default function SubmissionPreview({
  template,
  files,
}: {
  template: string;
  files: Record<string, string>;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (!files || Object.keys(files).length === 0) {
    return (
      <div className="flex-1 grid place-items-center text-xs text-muted italic">
        No files to preview.
      </div>
    );
  }

  return (
    <SandpackProvider
      template={template as never}
      theme={getSandpackTheme(isDark)}
      files={files}
      options={{
        autorun: true,
        autoReload: true,
        initMode: "immediate",
        recompileMode: "delayed",
        recompileDelay: 300,
      }}
    >
      <div className="flex flex-col h-full min-h-[280px]">
        <div className="flex-[3] min-h-0 bg-white">
          <SandpackPreview
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showRefreshButton
            style={{ height: "100%", width: "100%" }}
          />
        </div>
        <div className="flex-[1] min-h-0 border-t border-border">
          <SandpackConsole resetOnPreviewRestart style={{ height: "100%" }} />
        </div>
      </div>
    </SandpackProvider>
  );
}
