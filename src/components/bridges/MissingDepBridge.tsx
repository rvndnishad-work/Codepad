"use client";

import { useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { toast } from "sonner";

/**
 * Auto-installs transitive dependencies the bundler cannot resolve.
 *
 * Sandpack's v2 bundler eagerly resolves every dependency declared by every
 * installed package — including ones the package itself guards with
 * `try { require("x") } catch {}`, and optional `peerDependencies` that npm
 * would never have installed. The CDN doesn't ship those, so the resolver
 * throws and the whole preview dies. Real example: `npm i axios` pulls
 * `follow-redirects`, whose debug.js does
 *
 *     try { debug = require("debug")("follow-redirects"); } catch (error) {}
 *
 * with `debug` declared only as an *optional* peer. The try/catch means it is
 * genuinely fine for it to be absent, but the bundler resolves through the
 * try/catch and fails with:
 *
 *     Cannot find module 'debug' from '/node_modules/follow-redirects/debug.js'
 *
 * Nothing the user did is wrong, and nothing they can see explains it. So when
 * the *importer lives inside node_modules* — i.e. it is a package they already
 * chose to install reaching for something of its own, not their own bad import
 * — we add the missing package to dependencies and let it re-bundle.
 *
 * Guards, so this can never spiral:
 *   - only for importers under /node_modules/ (a typo in the user's own import
 *     still surfaces as a normal, honest error)
 *   - only well-formed bare package specifiers
 *   - each name is attempted at most once
 *   - a hard cap on total auto-installs per session
 */

const MISSING_RE = /Cannot find module ['"]([^'"]+)['"] from ['"]([^'"]+)['"]/;
const BARE_PKG_RE = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;
const MAX_AUTO_INSTALLS = 12;

/** `debug/src/node` -> `debug`; `@scope/pkg/sub` -> `@scope/pkg`. */
function rootPackageName(specifier: string): string | null {
  if (!specifier || specifier.startsWith(".") || specifier.startsWith("/")) return null;
  const parts = specifier.split("/");
  const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  return BARE_PKG_RE.test(name) ? name : null;
}

export function MissingDepBridge({ enabled = true }: { enabled?: boolean }) {
  const { sandpack } = useSandpack();
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    const message = sandpack.error?.message;
    if (!message) return;

    const match = MISSING_RE.exec(message);
    if (!match) return;

    const [, specifier, importer] = match;

    // Only heal dependencies of installed packages. If the user's own file has
    // a bad import, they should see the error and fix it themselves.
    if (!importer.startsWith("/node_modules/")) return;

    const name = rootPackageName(specifier);
    if (!name) return;
    if (attempted.current.has(name)) return;
    if (attempted.current.size >= MAX_AUTO_INSTALLS) return;

    const pkgPath =
      Object.keys(sandpack.files).find((p) => p.endsWith("/package.json")) ?? "/package.json";
    const raw = sandpack.files[pkgPath];
    const code = typeof raw === "string" ? raw : (raw as { code: string } | undefined)?.code ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(code);
    } catch {
      return;
    }
    const deps = { ...((parsed.dependencies as Record<string, string>) ?? {}) };
    if (deps[name]) return;

    attempted.current.add(name);
    deps[name] = "latest";
    sandpack.updateFile(
      pkgPath,
      JSON.stringify({ ...parsed, dependencies: deps }, null, 2) + "\n",
    );

    const owner = importer.split("/")[2] ?? "a package";
    toast.success(`Installing ${name}`, {
      description: `${owner} needs it. Added automatically.`,
      duration: 3500,
    });
  }, [sandpack, sandpack.error, sandpack.files, enabled]);

  return null;
}
