"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import { javascript } from "@codemirror/lang-javascript";
import { X, Eye, Code2, Lock } from "lucide-react";
import FileExplorer from "@/components/FileExplorer";
import { challengeSurface } from "@/lib/templates";
import { getSandpackTheme } from "@/lib/sandpack-theme";

/**
 * Full-screen, READ-ONLY playground view of a candidate's submitted code, for
 * interviewer code review. Reuses the same building blocks as the candidate
 * surface (FileExplorer + Sandpack editor + live preview) — file tree, a big
 * non-editable editor, and a live preview/console for frontend submissions.
 */
export default function SubmissionReviewModal({
  open,
  onClose,
  title,
  candidateName,
  template,
  files,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  candidateName?: string | null;
  template: string;
  files: Record<string, string>;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const isFrontend = challengeSurface(template) === "frontend";
  const hasFiles = !!files && Object.keys(files).length > 0;
  // Body height = modal (92vh) minus the header row.
  const bodyHeight = "calc(92vh - 56px)";

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="m-auto w-[96vw] h-[92vh] rounded-2xl border border-border bg-bg shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Code2 className="w-4 h-4 text-accent shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-fg truncate">{title}</h2>
              <p className="text-[11px] text-muted flex items-center gap-1.5">
                <Lock className="w-2.5 h-2.5" />
                Read-only review{candidateName ? ` · ${candidateName}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border bg-bg hover:bg-elevated text-xs font-bold text-muted hover:text-fg transition flex items-center gap-1.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>

        {/* Body */}
        {hasFiles ? (
          <SandpackProvider
            template={template as never}
            theme={getSandpackTheme(isDark)}
            files={files}
            options={{
              autorun: isFrontend,
              autoReload: isFrontend,
              initMode: isFrontend ? "immediate" : "lazy",
              recompileMode: "delayed",
              recompileDelay: 300,
            }}
          >
            <div className="flex min-h-0" style={{ height: bodyHeight }}>
              {/* File tree */}
              <div className="w-56 shrink-0 hidden md:block h-full">
                <FileExplorer templateId={template} readOnly plainFolders />
              </div>

              {/* Read-only editor */}
              <div className="flex-1 min-h-0 h-full border-l border-border">
                <SandpackCodeEditor
                  readOnly
                  showReadOnly
                  showLineNumbers
                  showTabs
                  closableTabs={false}
                  wrapContent
                  extensions={[javascript({ jsx: true, typescript: true })]}
                  style={{ height: "100%", width: "100%" }}
                />
              </div>

              {/* Live preview + console (frontend submissions only) */}
              {isFrontend && (
                <div className="w-[38%] shrink-0 flex flex-col min-h-0 h-full border-l border-border">
                  <div className="h-9 shrink-0 flex items-center gap-1.5 px-3 border-b border-border bg-surface/30 text-[10px] font-black uppercase tracking-wider text-fg">
                    <Eye className="w-3 h-3 text-accent" />
                    Live Preview
                  </div>
                  <div className="flex-[3] min-h-0">
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
              )}
            </div>
          </SandpackProvider>
        ) : (
          <div className="flex-1 grid place-items-center text-sm text-muted italic">
            No files submitted.
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
