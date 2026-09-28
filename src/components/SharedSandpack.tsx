"use client";

/**
 * Sandpack fed from shared (Yjs) files: the interview room's code editor
 * and live rounds. Both sides type in their own editor; this pushes the
 * shared text into the local bundler after a short pause in typing.
 *
 * SandpackProvider resets its files to the `files` prop whenever the
 * `files`, `customSetup` or `template` prop changes by reference, so every
 * prop that reaches it must be stable across renders. Passing a fresh
 * `customSetup` object on each keystroke silently put the starter code back
 * and the preview never updated.
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useSandpack, type SandpackFiles, type SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";
import ShimmedSandpackProvider from "@/components/ShimmedSandpackProvider";
import { supportsV2Bundler, V2_BUNDLER_URL } from "@/lib/templates";

const HIDE_OVERLAYS = "data:text/css,.react-error-overlay,#webpack-dev-server-client-overlay,.sp-overlay{display:none!important}#ignore.css";

/** Pushes changed files into the bundler after a pause in typing. */
function FilesSync({ files }: { files: Record<string, string> }) {
  const { sandpack } = useSandpack();
  // The context object changes on every bundler message; reading it through
  // a ref keeps the debounce from restarting on each one.
  const sp = useRef(sandpack);
  sp.current = sandpack;
  useEffect(() => {
    const id = setTimeout(() => {
      const s = sp.current;
      const changed: Record<string, string> = {};
      for (const [path, code] of Object.entries(files)) if (s.files[path]?.code !== code) changed[path] = code;
      if (Object.keys(changed).length) s.updateFile(changed);
    }, 450);
    return () => clearTimeout(id);
  }, [files]);
  return null;
}

export default function SharedSandpack({
  template,
  dependencies,
  fixed,
  files,
  dark = true,
  children,
}: {
  template: string;
  dependencies?: Record<string, string>;
  /** Files nobody edits (index.html, package.json). */
  fixed: SandpackFiles;
  /** Current shared text of the edited files. */
  files: Record<string, string>;
  dark?: boolean;
  /** Only to force re-renders in tests. */
  tick?: number;
  children: ReactNode;
}) {
  // Seeded once; later edits go through FilesSync.
  const initial = useRef<SandpackFiles | null>(null);
  if (!initial.current) initial.current = { ...fixed, ...files };
  const depsKey = JSON.stringify(dependencies ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const customSetup = useMemo(() => (dependencies ? { dependencies } : undefined), [depsKey]);
  const options = useMemo(
    () => ({
      ...(supportsV2Bundler(template) ? { bundlerURL: V2_BUNDLER_URL } : {}),
      autorun: true,
      autoReload: true,
      initMode: "immediate" as const,
      recompileMode: "delayed" as const,
      recompileDelay: 300,
      externalResources: [HIDE_OVERLAYS],
    }),
    [template],
  );
  return (
    <ShimmedSandpackProvider template={template as SandpackPredefinedTemplate} theme={dark ? "dark" : "light"} files={initial.current} customSetup={customSetup} options={options}>
      <FilesSync files={files} />
      {children}
    </ShimmedSandpackProvider>
  );
}
