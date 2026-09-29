"use client";

import { useSandpack } from "@codesandbox/sandpack-react";
import { AppWindow, Terminal } from "lucide-react";
import { ErrorOverlay, type ErrorData } from "../ErrorOverlay";
import { ClearButton, LiveBadge, PaneHeader, PaneTitle, RefreshPreviewButton } from "../OutputPaneChrome";
import { SandpackPreviewWithLoader } from "../PreviewLoadingOverlay";
import { MobileSplitHandle, ResizeHandle, type PaneSize, type useVerticalSplit } from "./Chrome";
import { BackendConsole, JsConsole, StdinBar } from "./Consoles";
import type { ViewMode } from "./PlaygroundContext";
import type { Runner } from "./useRunner";

/** Bundler state as a small dot beside the Preview title. */
function PreviewStatusDot() {
  const { sandpack } = useSandpack();
  const busy = sandpack.status === "running" || sandpack.status === "initial";
  const tone = sandpack.error ? "bg-danger" : busy ? "bg-warning motion-safe:animate-pulse" : "bg-success";
  const label = sandpack.error ? "Preview has an error" : busy ? "Preview is building" : "Preview is up to date";
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} role="img" aria-label={label} title={label} />;
}

/**
 * Everything right of (or, on phones, below) the editor: the preview, the
 * console, or both. Preview and console keep fixed slots in every view and
 * breakpoint and are only hidden, never unmounted, so switching views does
 * not reload the preview or drop console output.
 */
export function OutputPane({
  view,
  isBackend,
  isMobile,
  templateTitle,
  fileName,
  runner,
  bundlerError,
  onDismissError,
  consoleColumns,
  consoleRows,
  mobileSplit,
}: {
  view: ViewMode;
  isBackend: boolean;
  isMobile: boolean;
  templateTitle: string;
  fileName: string;
  runner: Runner;
  bundlerError: ErrorData | null;
  onDismissError: () => void;
  /** Console share of the output pane in percent, side by side. */
  consoleColumns: PaneSize;
  /** Console share of the output pane in percent, stacked. */
  consoleRows: PaneSize;
  mobileSplit: ReturnType<typeof useVerticalSplit>;
}) {
  // Phones stack everything, so side-by-side reads as stacked there. (The
  // playground already passes "both" where side by side does not fit.)
  const mode: ViewMode = isBackend ? "console" : isMobile && view === "columns" ? "both" : view;
  const showPreview = mode !== "console";
  const showConsole = mode !== "preview";
  const split = mode === "both" || mode === "columns";

  const consoleActions = (compact: boolean) => (
    <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
      {!isBackend && <LiveBadge />}
      <ClearButton onClear={runner.clearConsole} showLabel={!compact} />
    </div>
  );

  const previewStyle = !showPreview
    ? { display: "none" }
    : mode === "both" && isMobile
      ? { flex: `0 0 ${mobileSplit.split}%` }
      : { flex: "1 1 0%" };
  // Preview and console share the pane by percentage, so neither can be
  // squeezed out when the window, the editor or the view changes.
  const consoleStyle = !showConsole
    ? { display: "none" }
    : mode === "columns"
      ? { flex: `0 0 ${consoleColumns.value}%` }
      : mode === "both" && !isMobile
        ? { flex: `0 0 ${consoleRows.value}%` }
        : { flex: "1 1 0%" };

  return (
    <section
      aria-label="Output"
      className="pg-panel relative flex min-h-0 min-w-0 flex-1 flex-col border-border max-md:border-t"
    >
      <PaneHeader>
        {mode === "console" ? (
          <>
            <PaneTitle icon={Terminal}>Console</PaneTitle>
            {consoleActions(false)}
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <PaneTitle icon={AppWindow}>Preview</PaneTitle>
              <PreviewStatusDot />
            </div>
            <RefreshPreviewButton onRefresh={() => runner.runRef.current?.()} />
          </>
        )}
      </PaneHeader>

      <div className={`flex min-h-0 flex-1 ${mode === "columns" ? "flex-row" : "flex-col"}`}>
        <div style={previewStyle} className="flex min-h-0 min-w-0 overflow-hidden">
          <SandpackPreviewWithLoader
            title={templateTitle}
            showNavigator
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ height: "100%", width: "100%" }}
          />
        </div>

        {split &&
          (isMobile ? (
            <MobileSplitHandle label="Resize preview and console" split={mobileSplit} />
          ) : mode === "columns" ? (
            <ResizeHandle
              orientation="vertical"
              label="Resize console"
              value={consoleColumns.value}
              min={consoleColumns.min}
              max={consoleColumns.max}
              onPointerDown={consoleColumns.onPointerDown}
              onResize={consoleColumns.set}
              invert
              step={2}
              bigStep={10}
            />
          ) : (
            <ResizeHandle
              orientation="horizontal"
              label="Resize console"
              value={consoleRows.value}
              min={consoleRows.min}
              max={consoleRows.max}
              onPointerDown={consoleRows.onPointerDown}
              onResize={consoleRows.set}
              invert
              step={2}
              bigStep={10}
            />
          ))}

        <div style={consoleStyle} className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {split && (
            <PaneHeader>
              <PaneTitle icon={Terminal}>Console</PaneTitle>
              {consoleActions(true)}
            </PaneHeader>
          )}
          {isBackend && (
            <StdinBar
              value={runner.stdin}
              open={runner.stdinOpen}
              onToggle={() => runner.setStdinOpen((v) => !v)}
              onChange={runner.setStdin}
            />
          )}
          <div className="min-h-0 flex-1">
            {isBackend ? (
              <BackendConsole
                logs={runner.backendLogs}
                meta={runner.runMeta}
                summary={runner.runSummary}
                history={runner.history}
                fileName={fileName}
              />
            ) : (
              <JsConsole resetRef={runner.consoleResetRef} />
            )}
          </div>
        </div>
      </div>
      <ErrorOverlay error={bundlerError} onDismiss={onDismissError} />
    </section>
  );
}
