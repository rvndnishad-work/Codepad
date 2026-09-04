import { useState, useMemo, useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { toast } from "sonner";

export function useNpmSearch(packageJsonPath: string, initialShowDeps = false) {
  const { sandpack } = useSandpack();
  const { files } = sandpack;

  const [showDeps, setShowDeps] = useState(initialShowDeps);
  const [newDepInput, setNewDepInput] = useState("");
  const [npmSuggestions, setNpmSuggestions] = useState<
    Array<{ name: string; version: string; description?: string }>
  >([]);
  const [npmActiveIdx, setNpmActiveIdx] = useState(0);
  // Query the user dismissed with Escape; suppresses a late fetch reopening it.
  const dismissedForRef = useRef<string | null>(null);

  const dependencies = useMemo<Record<string, string>>(() => {
    const file = files[packageJsonPath];
    if (!file) return {};
    const code = typeof file === "string" ? file : (file as { code: string }).code;
    try {
      const parsed = JSON.parse(code);
      return { ...(parsed.dependencies ?? {}) };
    } catch {
      return {};
    }
  }, [files, packageJsonPath]);

  function writePackageJson(mutator: (pkg: Record<string, unknown>) => Record<string, unknown>) {
    const file = files[packageJsonPath];
    const code = file
      ? typeof file === "string"
        ? file
        : (file as { code: string }).code
      : "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(code);
    } catch {
      parsed = {};
    }
    const next = mutator(parsed);
    sandpack.updateFile(packageJsonPath, JSON.stringify(next, null, 2) + "\n");
  }

  /**
   * `hasVersion` distinguishes "user typed an explicit version" from "we
   * defaulted to latest". Callers need that difference: an explicitly typed
   * version is an instruction and must not be silently overridden by an
   * autocomplete suggestion.
   */
  function parseDepInput(
    input: string
  ): { name: string; version: string; hasVersion: boolean } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const scoped = trimmed.startsWith("@");
    const sep = scoped ? trimmed.indexOf("@", 1) : trimmed.indexOf("@");
    if (sep === -1) return { name: trimmed, version: "latest", hasVersion: false };
    const name = trimmed.slice(0, sep);
    const version = trimmed.slice(sep + 1).trim();
    if (!name) return null;
    // "axios@" is a bare name with a stray separator, not an explicit version.
    return version
      ? { name, version, hasVersion: true }
      : { name, version: "latest", hasVersion: false };
  }

  function addDep(name: string, version: string) {
    const exists = Boolean(dependencies[name]);
    writePackageJson((pkg) => ({
      ...pkg,
      dependencies: {
        ...((pkg.dependencies as Record<string, string>) ?? {}),
        [name]: version,
      },
    }));
    toast.success(exists ? `Updated ${name}` : `Installing ${name}…`, {
      description:
        version === "latest" ? "Sandpack is rebundling" : `${name}@${version}`,
      duration: 2500,
    });
  }

  /**
   * Single entry point for "add whatever the user asked for".
   *
   * `suggestion` is the highlighted autocomplete row, if the list is open.
   * An explicitly typed `pkg@version` always wins over it — typing a version
   * and having the registry's `latest` installed instead is exactly the bug
   * this rule exists to prevent. A bare name defers to the suggestion, so
   * arrowing to a row and pressing Enter still does what it looks like.
   */
  function commitDepInput(suggestion?: { name: string; version: string } | null) {
    const parsed = parseDepInput(newDepInput);
    const chosen =
      parsed?.hasVersion || !suggestion
        ? parsed && { name: parsed.name, version: parsed.version }
        : suggestion;
    if (!chosen) return;
    addDep(chosen.name, chosen.version);
    setNewDepInput("");
    // Not `dismissSuggestions()`: that would remember the just-installed text
    // as dismissed and suppress the dropdown if the user typed it again.
    dismissedForRef.current = null;
    setNpmSuggestions([]);
    setNpmActiveIdx(0);
  }

  /**
   * Close the dropdown and keep it closed until the query changes. The
   * remembered query matters because Escape does not re-run the search effect —
   * without it, the fetch already in flight lands a moment later and pops the
   * list straight back open.
   */
  function dismissSuggestions() {
    dismissedForRef.current = newDepInput.trim();
    setNpmSuggestions([]);
    setNpmActiveIdx(0);
  }

  function removeDependency(name: string) {
    writePackageJson((pkg) => {
      const deps = { ...((pkg.dependencies as Record<string, string>) ?? {}) };
      delete deps[name];
      return { ...pkg, dependencies: deps };
    });
    toast(`Removed ${name}`, { duration: 2000 });
  }

  // npm autocomplete — debounced fetch from npms.io
  useEffect(() => {
    if (!showDeps) return;
    const trimmed = newDepInput.trim();
    // Strip @version part for the search query
    const scoped = trimmed.startsWith("@");
    const sep = scoped ? trimmed.indexOf("@", 1) : trimmed.indexOf("@");
    const query = sep === -1 ? trimmed : trimmed.slice(0, sep);
    if (query.length < 2) {
      setNpmSuggestions([]);
      return;
    }
    // Respect an Escape until the user types something different. Escape does
    // not change `newDepInput`, so this effect never re-runs on it — the check
    // has to happen again after the debounce and after the response lands, or a
    // request already in flight reopens the list the user just dismissed.
    const dismissed = () => dismissedForRef.current === trimmed;
    if (dismissed()) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      if (dismissed()) return;
      try {
        const res = await fetch(
          `https://api.npms.io/v2/search/suggestions?q=${encodeURIComponent(query)}&size=6`,
          { signal: ctrl.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          package: { name: string; version: string; description?: string };
        }>;
        if (dismissed()) return;
        setNpmSuggestions(
          data.map((d) => ({
            name: d.package.name,
            version: d.package.version,
            description: d.package.description,
          }))
        );
        setNpmActiveIdx(0);
      } catch {
        /* aborted or network error - ignore */
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [newDepInput, showDeps]);

  return {
    dependencies,
    showDeps,
    setShowDeps,
    newDepInput,
    setNewDepInput,
    npmSuggestions,
    setNpmSuggestions,
    npmActiveIdx,
    setNpmActiveIdx,
    addDep,
    commitDepInput,
    dismissSuggestions,
    removeDependency,
  };
}
