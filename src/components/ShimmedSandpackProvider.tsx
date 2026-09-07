"use client";

import { useMemo } from "react";
import { SandpackProvider, type SandpackFiles } from "@codesandbox/sandpack-react";
import { buildNodeBuiltinShims } from "@/lib/node-builtin-shims";
import { REACT_TEMPLATE_DEPS } from "@/lib/templates";

type SandpackProviderProps = React.ComponentProps<typeof SandpackProvider>;

/**
 * `SandpackProvider` with Node core-module shims injected.
 *
 * Sandpack's v2 bundler ships no Node polyfills and eagerly resolves every
 * dependency of every installed package — so any sandbox whose package.json
 * mentions something like axios dies with
 *
 *     Cannot find module 'http' from '/node_modules/follow-redirects/index.js'
 *
 * even when nothing imports it. `buildNodeBuiltinShims()` supplies hidden
 * `/node_modules/<builtin>/` packages so those names resolve. See
 * lib/node-builtin-shims.ts for the full story.
 *
 * Use this everywhere instead of `SandpackProvider` directly, so a new mount
 * inherits the fix rather than rediscovering the bug. The one deliberate
 * exception is Playground.tsx, which folds the shims into its own file
 * pipeline because it also has to keep them out of saved snippets.
 */
export default function ShimmedSandpackProvider({
  files,
  customSetup,
  template,
  ...rest
}: SandpackProviderProps) {
  // Skip builtins the sandbox installs for real from npm (`events`, `buffer`,
  // `url`, `path`… all exist as packages), so the real one always wins.
  //
  // React-family sandboxes also get the repo's React pin merged in:
  // Sandpack's built-in `react`/`react-ts` templates still declare ^19.0.0,
  // so without this every surface that mounts without an explicit
  // customSetup (challenge attempts, interview workspace, previews) would
  // resolve the stale default. Consumer-provided deps always win on conflict.
  const mergedSetup = useMemo(() => {
    if (typeof template !== "string" || !template.startsWith("react")) return customSetup;
    return {
      ...customSetup,
      dependencies: { ...REACT_TEMPLATE_DEPS, ...customSetup?.dependencies },
    };
  }, [customSetup, template]);

  const declaredDeps = useMemo(() => {
    const fromSetup = Object.keys(mergedSetup?.dependencies ?? {});
    const pkg = (files as SandpackFiles | undefined)?.["/package.json"];
    if (!pkg) return fromSetup;
    const code = typeof pkg === "string" ? pkg : (pkg as { code: string }).code;
    try {
      return [...fromSetup, ...Object.keys(JSON.parse(code)?.dependencies ?? {})];
    } catch {
      return fromSetup;
    }
  }, [mergedSetup, files]);

  const filesWithShims = useMemo(() => {
    // A `static` sandbox serves HTML without running the JS bundler, so there
    // is nothing to resolve and nothing to shim.
    if (template === "static" || !files) return files;
    // Shims first: a real file at the same path always wins.
    return { ...buildNodeBuiltinShims(declaredDeps), ...files } as typeof files;
  }, [files, template, declaredDeps]);

  return (
    <SandpackProvider
      {...rest}
      template={template}
      customSetup={mergedSetup}
      files={filesWithShims}
    />
  );
}
