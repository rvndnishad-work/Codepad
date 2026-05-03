import { useState, useMemo, useEffect } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { toast } from "sonner";

export function useNpmSearch(packageJsonPath: string) {
  const { sandpack } = useSandpack();
  const { files } = sandpack;

  const [showDeps, setShowDeps] = useState(false);
  const [newDepInput, setNewDepInput] = useState("");
  const [npmSuggestions, setNpmSuggestions] = useState<
    Array<{ name: string; version: string; description?: string }>
  >([]);
  const [npmActiveIdx, setNpmActiveIdx] = useState(0);

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

  function parseDepInput(input: string): { name: string; version: string } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const scoped = trimmed.startsWith("@");
    const sep = scoped ? trimmed.indexOf("@", 1) : trimmed.indexOf("@");
    if (sep === -1) return { name: trimmed, version: "latest" };
    const name = trimmed.slice(0, sep);
    const version = trimmed.slice(sep + 1).trim() || "latest";
    return name ? { name, version } : null;
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

  function addDependency() {
    const parsed = parseDepInput(newDepInput);
    if (!parsed) return;
    addDep(parsed.name, parsed.version);
    setNewDepInput("");
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
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.npms.io/v2/search/suggestions?q=${encodeURIComponent(query)}&size=6`,
          { signal: ctrl.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          package: { name: string; version: string; description?: string };
        }>;
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
    addDependency,
    addDep,
    removeDependency,
  };
}
