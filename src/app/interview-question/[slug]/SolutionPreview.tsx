"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SandpackLayout } from "@codesandbox/sandpack-react";
import { ExternalLink, Eye, RefreshCw } from "lucide-react";
import ShimmedSandpackProvider from "@/components/ShimmedSandpackProvider";
import { SandpackPreviewWithLoader } from "@/components/PreviewLoadingOverlay";
import { buildNodeBuiltinShims } from "@/lib/node-builtin-shims";
import { mergeHandoff, playgroundFilesHref } from "@/lib/playground-handoff";
import { templatesById, supportsV2Bundler, V2_BUNDLER_URL } from "@/lib/templates";

/**
 * "What you will build": the finished solution of a machine-coding question,
 * running live above the problem statement, so a candidate sees the result
 * before reading a line of code. Preview only, no editor; the files are
 * merged over the framework template exactly like the playground hand-off,
 * and the sandbox mounts once the card scrolls into view.
 */
export default function SolutionPreview({
  files,
  template,
  title,
  backFrom,
  frameworkLabel,
}: {
  files: Record<string, string>;
  /** Playground template id (empty-react, vue, angular…). */
  template: string;
  title: string;
  backFrom: string;
  frameworkLabel?: string;
}) {
  const tpl = templatesById[template];
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const merged = useMemo(() => {
    if (!tpl) return null;
    const base = mergeHandoff(tpl.files, files);
    const declared = Object.keys(tpl.dependencies ?? {});
    return { ...buildNodeBuiltinShims(declared), ...base };
  }, [tpl, files]);

  if (!tpl || !merged || tpl.mode === "console") return null;

  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg">
          <Eye className="h-3.5 w-3.5 text-accent" aria-hidden /> What you will build
        </span>
        <span className="text-xs text-subtle">
          The finished {frameworkLabel ? `${frameworkLabel} ` : ""}solution, running live. Try it before you build it.
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRunKey((k) => k + 1)}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2 text-xs text-muted hover:text-fg"
            title="Restart the preview"
          >
            <RefreshCw className="h-3 w-3" aria-hidden /> Restart
          </button>
          <a
            href={playgroundFilesHref(files, template, backFrom)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-semibold text-accent-ink hover:bg-accent-soft"
          >
            Open in playground <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </span>
      </div>
      <div className="h-[380px] bg-white">
        {active ? (
          <ShimmedSandpackProvider
            key={runKey}
            template={tpl.base}
            files={merged}
            customSetup={tpl.dependencies ? { dependencies: tpl.dependencies } : undefined}
            options={{
              ...(supportsV2Bundler(tpl.base) ? { bundlerURL: V2_BUNDLER_URL } : {}),
              autorun: true,
              initMode: "immediate",
            }}
          >
            <SandpackLayout style={{ height: "100%", border: 0, borderRadius: 0 }}>
              <SandpackPreviewWithLoader
                title={title}
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                style={{ height: "100%" }}
              />
            </SandpackLayout>
          </ShimmedSandpackProvider>
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted">Loading preview…</div>
        )}
      </div>
    </div>
  );
}
