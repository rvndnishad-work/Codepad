"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackTests,
  type SandpackFiles,
} from "@codesandbox/sandpack-react";
import { FlaskConical, Info, X } from "lucide-react";

/**
 * Author-side dry-run for a step. Boots a full Sandpack environment with
 * the current starter + test files so the author can verify two things
 * before publishing:
 *
 *   1. The tests actually run (no syntax/setup errors).
 *   2. A correct solution makes all tests pass (paste your reference
 *      solution into the editor and click Run).
 *
 * Edits made inside the preview are deliberately NOT persisted back to
 * the form. To change saved starter/test content, edit the form's Monaco
 * editors. This separation keeps the author's mental model clear:
 * "preview = scratch space, form = source of truth."
 */
export default function ChallengePreview({
  starterFiles,
  testFiles,
  template,
  stepLabel,
  onClose,
}: {
  starterFiles: Record<string, string>;
  testFiles: Record<string, string>;
  template: string;
  stepLabel: string;
  onClose: () => void;
}) {
  // Compose Sandpack's files map. Test files are read-only — they should
  // match what the participant will be graded against. Author can flip a
  // test temporarily by copying it into the starter side if they want to
  // experiment, but the source of truth here is the form's content.
  const files: SandpackFiles = useMemo(() => {
    const out: SandpackFiles = {};
    for (const [path, code] of Object.entries(starterFiles)) {
      out[path] = { code };
    }
    for (const [path, code] of Object.entries(testFiles)) {
      out[path] = { code, readOnly: true };
    }
    return out;
  }, [starterFiles, testFiles]);

  const visibleFiles = useMemo(() => Object.keys(files), [files]);
  const activeFile = useMemo(
    () => Object.keys(starterFiles)[0] ?? Object.keys(testFiles)[0] ?? "",
    [starterFiles, testFiles]
  );

  // Close on Esc — standard modal behaviour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while the modal is open so the page behind doesn't
  // wheel under us. Restore on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // We need a `mounted` flag because createPortal can't run during SSR —
  // `document` doesn't exist. By the time this effect fires we're definitely
  // on the client, and the portal target (document.body) is available.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Test preview — ${stepLabel}`}
      // Click the dark backdrop area (but not the inner header/body) to
      // close. The inner container stops propagation so clicks inside the
      // editor / test runner don't accidentally dismiss the modal.
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col"
    >
      <header
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border shrink-0"
      >
        <FlaskConical className="w-4 h-4 text-accent shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-fg truncate">
            Test this step — {stepLabel}
          </div>
          <div className="text-[11px] text-muted hidden sm:flex items-center gap-1.5 mt-0.5">
            <Info className="w-3 h-3 shrink-0" />
            <span className="truncate">
              Paste your reference solution and click Run. Changes here
              don&apos;t save back to the form.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          title="Close (Esc)"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-500 text-xs font-black hover:bg-rose-500/20 transition"
        >
          <X className="w-3.5 h-3.5" />
          Close
        </button>
      </header>

      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 min-h-0 bg-bg"
      >
        {visibleFiles.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted">
            Add at least one starter file and one test file to preview.
          </div>
        ) : (
          <SandpackProvider
            template={template as any}
            files={files}
            theme="dark"
            options={{
              visibleFiles,
              activeFile,
              recompileMode: "delayed",
              recompileDelay: 500,
            }}
          >
            {/* Two-column layout: editor on the left, test runner on the
                right. On narrow viewports we stack — width breakpoint kicks
                in around md. */}
            <div className="flex flex-col md:flex-row h-full">
              <div className="flex-1 min-h-[300px] md:min-h-0">
                <SandpackCodeEditor
                  showTabs
                  showLineNumbers
                  showInlineErrors
                  closableTabs={false}
                  style={{ height: "100%" }}
                />
              </div>
              <div className="md:w-[460px] border-t md:border-t-0 md:border-l border-border min-h-[300px] md:min-h-0">
                <SandpackTests
                  showVerboseButton
                  showWatchButton
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </SandpackProvider>
        )}
      </div>
    </div>
  );

  // Portal so the modal escapes any transformed/filtered ancestor and sits
  // directly under <body>. Solves two problems: (1) `fixed inset-0` is
  // relative to the nearest containing block, and Framer Motion transforms
  // elsewhere on the page can become that block; (2) the app's sticky
  // header would otherwise sit visually on top of our modal.
  return createPortal(modal, document.body);
}
