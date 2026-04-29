"use client";

import { useEffect, useMemo, useState } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import {
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  FileJson,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Trash2,
  Settings,
  Lock,
  Package,
  X,
  Plus,
  Pencil,
  Copy,
  Download,
} from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";
import {
  SiJavascript,
  SiTypescript,
  SiReact,
  SiVuedotjs,
  SiSvelte,
  SiCss,
  SiSass,
  SiHtml5,
  SiNpm,
  SiGit,
  SiMarkdown,
} from "react-icons/si";

type FileIconInfo = {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
};

function fileIconFor(name: string): FileIconInfo {
  const lower = name.toLowerCase();

  if (lower === "package.json" || lower === "package-lock.json")
    return { Icon: SiNpm, color: "#cb3837" };
  if (lower === ".gitignore" || lower === ".gitattributes")
    return { Icon: SiGit, color: "#f05032" };
  if (lower.startsWith("tsconfig"))
    return { Icon: SiTypescript, color: "#3178c6" };
  if (lower === "readme.md" || lower === "readme")
    return { Icon: SiMarkdown, color: "#cbd5e1" };
  if (lower === ".env" || lower.startsWith(".env."))
    return { Icon: Settings, color: "#fbbf24" };

  const ext = lower.match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  switch (ext) {
    case "js":
    case "mjs":
    case "cjs":
      return { Icon: SiJavascript, color: "#f7df1e" };
    case "ts":
      return { Icon: SiTypescript, color: "#3178c6" };
    case "jsx":
    case "tsx":
      return { Icon: SiReact, color: "#61dafb" };
    case "vue":
      return { Icon: SiVuedotjs, color: "#41b883" };
    case "svelte":
      return { Icon: SiSvelte, color: "#ff3e00" };
    case "html":
    case "htm":
      return { Icon: SiHtml5, color: "#e34f26" };
    case "css":
      return { Icon: SiCss, color: "#1572b6" };
    case "scss":
    case "sass":
      return { Icon: SiSass, color: "#cc6699" };
    case "json":
      return { Icon: FileJson, color: "#fbbf24" };
    case "md":
    case "mdx":
      return { Icon: SiMarkdown, color: "#cbd5e1" };
    case "lock":
      return { Icon: Lock, color: "#94a3b8" };
    default:
      return { Icon: FileIcon, color: "#7b8496" };
  }
}

function FileNodeIcon({ name }: { name: string }) {
  const { Icon, color } = fileIconFor(name);
  return (
    <span
      style={{ color }}
      className="shrink-0 inline-flex w-3.5 h-3.5 items-center justify-center"
    >
      <Icon size={14} />
    </span>
  );
}

type FileType = { ext: string; label: string; template: string };

const FILE_TYPES: FileType[] = [
  { ext: ".js", label: "JavaScript", template: "// New file\n" },
  { ext: ".ts", label: "TypeScript", template: "// New file\n" },
  {
    ext: ".jsx",
    label: "React JSX",
    template:
      "export default function Component() {\n  return <div>New component</div>;\n}\n",
  },
  {
    ext: ".tsx",
    label: "React TSX",
    template:
      "export default function Component() {\n  return <div>New component</div>;\n}\n",
  },
  { ext: ".css", label: "CSS", template: "" },
  {
    ext: ".html",
    label: "HTML",
    template:
      '<!DOCTYPE html>\n<html>\n  <head>\n    <meta charset="utf-8" />\n  </head>\n  <body></body>\n</html>\n',
  },
  { ext: ".json", label: "JSON", template: "{\n}\n" },
  { ext: ".md", label: "Markdown", template: "# New\n" },
];

type TreeNode = {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
};

function buildTree(filePaths: string[], emptyFolders: Set<string>): TreeNode[] {
  const root: TreeNode = { name: "", path: "/", isFolder: true, children: [] };

  function ensure(parts: string[], makeFolderAtEnd: boolean) {
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const isFolder = !isLast || makeFolderAtEnd;
      const subPath = "/" + parts.slice(0, i + 1).join("/");
      if (!cur.children) cur.children = [];
      let child = cur.children.find((c) => c.name === name);
      if (!child) {
        child = {
          name,
          path: subPath,
          isFolder,
          children: isFolder ? [] : undefined,
        };
        cur.children.push(child);
      }
      cur = child;
    }
  }

  for (const p of filePaths) ensure(p.split("/").filter(Boolean), false);
  for (const f of emptyFolders) ensure(f.split("/").filter(Boolean), true);

  function sort(node: TreeNode) {
    if (!node.children) return;
    node.children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of node.children) sort(c);
  }
  sort(root);
  return root.children ?? [];
}

function parentDir(path: string): string {
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return "/";
  return path.slice(0, idx);
}

function normalizePath(p: string): string {
  return p.startsWith("/") ? p : "/" + p;
}

type ContextMenu = {
  x: number;
  y: number;
  path: string;
  isFolder: boolean;
} | null;

type PendingNew = {
  parentPath: string;
  kind: "file" | "folder";
  ext?: string;
} | null;

type Props = { readOnly?: boolean };

export default function FileExplorer({ readOnly = false }: Props) {
  const { sandpack } = useSandpack();
  const { files, activeFile } = sandpack;

  const filePaths = useMemo(
    () => Object.keys(files).map(normalizePath),
    [files]
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["/"]));
  const [emptyFolders, setEmptyFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [showFileTypes, setShowFileTypes] = useState(false);
  const [pendingNew, setPendingNew] = useState<PendingNew>(null);
  const [newName, setNewName] = useState("");
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [showDeps, setShowDeps] = useState(false);
  const [newDepInput, setNewDepInput] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [npmSuggestions, setNpmSuggestions] = useState<
    Array<{ name: string; version: string; description?: string }>
  >([]);
  const [npmActiveIdx, setNpmActiveIdx] = useState(0);

  const tree = useMemo(
    () => buildTree(filePaths, emptyFolders),
    [filePaths, emptyFolders]
  );

  const packageJsonPath = useMemo(
    () => filePaths.find((p) => p.endsWith("/package.json")) ?? "/package.json",
    [filePaths]
  );

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

  // Prune empty-folder placeholders that now contain files
  useEffect(() => {
    setEmptyFolders((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const folder of prev) {
        const prefix = folder + "/";
        const hasFile = filePaths.some((p) => p.startsWith(prefix));
        if (!hasFile) next.add(folder);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filePaths]);

  // Close context menu on outside interaction
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => {
      setContextMenu(null);
      setShowFileTypes(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const t = setTimeout(() => window.addEventListener("mousedown", close), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function startNew(
    parentPath: string,
    kind: "file" | "folder",
    ext?: string
  ) {
    setExpanded((prev) => new Set(prev).add(parentPath));
    setPendingNew({ parentPath, kind, ext });
    setNewName("");
    setContextMenu(null);
    setShowFileTypes(false);
  }

  function commitNew() {
    const pending = pendingNew;
    if (!pending) return;
    const name = newName.trim();
    setPendingNew(null);
    setNewName("");
    if (!name) return;
    const parent = pending.parentPath === "/" ? "" : pending.parentPath;
    if (pending.kind === "file") {
      const finalName =
        pending.ext && !/\.[^./]+$/.test(name) ? name + pending.ext : name;
      const fullPath = `${parent}/${finalName}`;
      if (files[fullPath]) return;
      const tpl =
        FILE_TYPES.find((t) => t.ext === pending.ext)?.template ?? "";
      sandpack.addFile(fullPath, tpl);
      sandpack.setActiveFile(fullPath);
    } else {
      const fullPath = `${parent}/${name}`;
      setEmptyFolders((prev) => new Set(prev).add(fullPath));
      setExpanded((prev) => new Set(prev).add(fullPath));
    }
  }

  function cancelNew() {
    setPendingNew(null);
    setNewName("");
  }

  function deletePath(path: string, isFolder: boolean) {
    if (isFolder) {
      const prefix = path + "/";
      for (const p of filePaths) {
        if (p.startsWith(prefix)) sandpack.deleteFile(p);
      }
      setEmptyFolders((prev) => {
        const next = new Set<string>();
        for (const f of prev) {
          if (f !== path && !f.startsWith(prefix)) next.add(f);
        }
        return next;
      });
    } else {
      sandpack.deleteFile(path);
    }
    setContextMenu(null);
  }

  function movePath(fromPath: string, toFolderPath: string) {
    if (fromPath === toFolderPath) return;
    if (
      toFolderPath === fromPath ||
      toFolderPath.startsWith(fromPath + "/")
    ) {
      return;
    }
    const fromName = fromPath.split("/").filter(Boolean).pop()!;
    const parent = toFolderPath === "/" ? "" : toFolderPath;
    const newPath = `${parent}/${fromName}`;
    if (newPath === fromPath) return;

    if (files[fromPath]) {
      if (files[newPath]) return;
      const code = (files[fromPath] as { code: string }).code;
      sandpack.deleteFile(fromPath);
      sandpack.addFile(newPath, code);
      if (activeFile === fromPath) sandpack.setActiveFile(newPath);
      return;
    }

    const prefix = fromPath + "/";
    const newPrefix = newPath + "/";
    const movers = filePaths.filter((p) => p.startsWith(prefix));
    for (const p of movers) {
      if (files[newPrefix + p.slice(prefix.length)]) return;
    }
    const carry = movers.map(
      (p) =>
        [newPrefix + p.slice(prefix.length), (files[p] as { code: string }).code] as const
    );
    for (const p of movers) sandpack.deleteFile(p);
    for (const [target, code] of carry) sandpack.addFile(target, code);
    setEmptyFolders((prev) => {
      const next = new Set<string>();
      for (const f of prev) {
        if (f === fromPath) next.add(newPath);
        else if (f.startsWith(prefix))
          next.add(newPrefix + f.slice(prefix.length));
        else next.add(f);
      }
      return next;
    });
  }

  function startRename(path: string) {
    const name = path.split("/").filter(Boolean).pop() ?? "";
    setRenamingPath(path);
    setRenameValue(name);
    setContextMenu(null);
  }

  function commitRename() {
    const path = renamingPath;
    const newName = renameValue.trim();
    setRenamingPath(null);
    setRenameValue("");
    if (!path || !newName) return;
    const oldName = path.split("/").filter(Boolean).pop() ?? "";
    if (newName === oldName) return;
    if (newName.includes("/")) return;
    const parent = parentDir(path);
    const parentPrefix = parent === "/" ? "" : parent;
    const newPath = `${parentPrefix}/${newName}`;
    if (files[newPath] || filePaths.includes(newPath)) return;

    if (files[path]) {
      const code = (files[path] as { code: string }).code;
      sandpack.deleteFile(path);
      sandpack.addFile(newPath, code);
      if (activeFile === path) sandpack.setActiveFile(newPath);
      return;
    }

    const prefix = path + "/";
    const newPrefix = newPath + "/";
    const movers = filePaths.filter((p) => p.startsWith(prefix));
    for (const p of movers) {
      if (files[newPrefix + p.slice(prefix.length)]) return;
    }
    const carry = movers.map(
      (p) =>
        [
          newPrefix + p.slice(prefix.length),
          (files[p] as { code: string }).code,
        ] as const
    );
    for (const p of movers) sandpack.deleteFile(p);
    for (const [target, code] of carry) sandpack.addFile(target, code);
    setEmptyFolders((prev) => {
      const next = new Set<string>();
      for (const f of prev) {
        if (f === path) next.add(newPath);
        else if (f.startsWith(prefix))
          next.add(newPrefix + f.slice(prefix.length));
        else next.add(f);
      }
      return next;
    });
    setExpanded((prev) => {
      const next = new Set<string>();
      for (const e of prev) {
        if (e === path) next.add(newPath);
        else if (e.startsWith(prefix))
          next.add(newPrefix + e.slice(prefix.length));
        else next.add(e);
      }
      return next;
    });
  }

  function cancelRename() {
    setRenamingPath(null);
    setRenameValue("");
  }

  async function uploadFiles(fileList: FileList | File[], destFolder: string) {
    const folder = destFolder === "/" ? "" : destFolder;
    const textExts = new Set([
      "js", "mjs", "cjs", "ts", "jsx", "tsx", "vue", "svelte",
      "html", "htm", "css", "scss", "sass", "less", "json",
      "md", "mdx", "txt", "yml", "yaml", "xml", "svg",
    ]);
    const imageExts = new Set(["png", "jpg", "jpeg", "gif", "webp", "ico"]);
    let firstAdded: string | null = null;

    for (const f of Array.from(fileList)) {
      const ext = f.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
      let target = `${folder}/${f.name}`;
      let i = 2;
      while (files[target] || filePaths.includes(target)) {
        const dot = f.name.lastIndexOf(".");
        const base = dot > 0 ? f.name.slice(0, dot) : f.name;
        const e = dot > 0 ? f.name.slice(dot) : "";
        target = `${folder}/${base} (${i})${e}`;
        i++;
      }

      if (textExts.has(ext) || f.type.startsWith("text/")) {
        const code = await f.text();
        sandpack.addFile(target, code);
      } else if (imageExts.has(ext) || f.type.startsWith("image/")) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(f);
        });
        sandpack.addFile(target, dataUrl);
      } else {
        // Skip unknown binary types
        continue;
      }
      if (!firstAdded) firstAdded = target;
    }
    if (firstAdded) sandpack.setActiveFile(firstAdded);
  }

  async function downloadZip() {
    const zip = new JSZip();
    for (const path of filePaths) {
      const file = files[path];
      const code =
        typeof file === "string" ? file : (file as { code: string }).code;
      const stripped = path.startsWith("/") ? path.slice(1) : path;
      // Detect base64 data URLs from image uploads
      const m = code.match(/^data:[^;]+;base64,(.+)$/);
      if (m) {
        zip.file(stripped, m[1], { base64: true });
      } else {
        zip.file(stripped, code);
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codepad-snippet.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function duplicateFile(path: string) {
    const file = files[path];
    if (!file) return;
    const code = (file as { code: string }).code;
    const parent = parentDir(path);
    const parentPrefix = parent === "/" ? "" : parent;
    const name = path.split("/").filter(Boolean).pop() ?? "";
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let candidate = `${parentPrefix}/${base} (copy)${ext}`;
    let i = 2;
    while (files[candidate] || filePaths.includes(candidate)) {
      candidate = `${parentPrefix}/${base} (copy ${i})${ext}`;
      i++;
    }
    sandpack.addFile(candidate, code);
    sandpack.setActiveFile(candidate);
    setContextMenu(null);
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const isExpanded = expanded.has(node.path);
    const isActive = activeFile === node.path;
    const isDropTarget = dropTarget === node.path;
    const isDragging = draggingPath === node.path;

    const row = (
      <div
        key={node.path}
        draggable={!readOnly}
        onDragStart={(e) => {
          if (readOnly) return;
          setDraggingPath(node.path);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", node.path);
        }}
        onDragEnd={() => {
          setDraggingPath(null);
          setDropTarget(null);
        }}
        onDragOver={(e) => {
          if (readOnly || !node.isFolder) return;
          const hasExternal = e.dataTransfer.types.includes("Files");
          if (!draggingPath && !hasExternal) return;
          if (
            draggingPath &&
            (draggingPath === node.path ||
              node.path.startsWith(draggingPath + "/"))
          )
            return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = hasExternal ? "copy" : "move";
          setDropTarget(node.path);
        }}
        onDragLeave={() => {
          if (dropTarget === node.path) setDropTarget(null);
        }}
        onDrop={(e) => {
          if (readOnly || !node.isFolder) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            void uploadFiles(e.dataTransfer.files, node.path);
            setExpanded((prev) => new Set(prev).add(node.path));
          } else if (draggingPath) {
            movePath(draggingPath, node.path);
          }
          setDraggingPath(null);
          setDropTarget(null);
        }}
        onClick={() => {
          if (node.isFolder) toggle(node.path);
          else sandpack.setActiveFile(node.path);
        }}
        onContextMenu={(e) => {
          if (readOnly) return;
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            path: node.path,
            isFolder: node.isFolder,
          });
        }}
        style={{ paddingLeft: 6 + depth * 12 }}
        className={`group flex items-center gap-1 pr-2 py-0.5 cursor-pointer text-xs select-none transition ${
          isActive
            ? "bg-accent/20 text-fg"
            : "text-subtle hover:bg-elevated hover:text-fg"
        } ${
          isDropTarget ? "outline outline-1 outline-accent -outline-offset-1" : ""
        } ${isDragging ? "opacity-50" : ""}`}
      >
        {node.isFolder ? (
          isExpanded ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {node.isFolder ? (
          isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400/80" />
          ) : (
            <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400/80" />
          )
        ) : (
          <FileNodeIcon name={node.name} />
        )}
        {renamingPath === node.path ? (
          <input
            autoFocus
            value={renameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitRename();
              else if (e.key === "Escape") cancelRename();
            }}
            onBlur={commitRename}
            className="flex-1 min-w-0 bg-panel border border-accent/40 rounded px-1.5 py-0 h-5 text-xs outline-none"
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>
    );

    return (
      <div key={node.path}>
        {row}
        {node.isFolder && isExpanded && (
          <>
            {node.children?.map((c) => renderNode(c, depth + 1))}
            {pendingNew?.parentPath === node.path &&
              renderNewInput(depth + 1)}
          </>
        )}
      </div>
    );
  }

  function renderNewInput(depth: number): React.ReactNode {
    if (!pendingNew) return null;
    return (
      <div
        style={{ paddingLeft: 6 + depth * 12 }}
        className="flex items-center gap-1 pr-2 py-0.5 text-xs"
      >
        <span className="w-3 shrink-0" />
        {pendingNew.kind === "folder" ? (
          <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400/80" />
        ) : (
          <FileNodeIcon name={`x${pendingNew.ext ?? ""}`} />
        )}
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={
            pendingNew.kind === "file"
              ? `name${pendingNew.ext ?? ""}`
              : "folder name"
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") commitNew();
            else if (e.key === "Escape") cancelNew();
          }}
          onBlur={commitNew}
          className="flex-1 min-w-0 bg-panel border border-accent/40 rounded px-1.5 py-0 h-5 text-xs outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className="w-52 shrink-0 border-r border-border bg-surface text-xs overflow-y-auto select-none relative"
      onContextMenu={(e) => {
        if (readOnly) return;
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          path: "/",
          isFolder: true,
        });
      }}
      onDragOver={(e) => {
        if (readOnly) return;
        const hasExternal = e.dataTransfer.types.includes("Files");
        if (!draggingPath && !hasExternal) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = hasExternal ? "copy" : "move";
        if (!dropTarget) setDropTarget("/");
      }}
      onDrop={(e) => {
        if (readOnly) return;
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          void uploadFiles(e.dataTransfer.files, "/");
        } else if (draggingPath) {
          movePath(draggingPath, "/");
        }
        setDraggingPath(null);
        setDropTarget(null);
      }}
    >
      <div className="sticky top-0 z-10 bg-surface px-2 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted border-b border-border">
        {!readOnly ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({
                  x: e.currentTarget.getBoundingClientRect().left,
                  y: e.currentTarget.getBoundingClientRect().bottom + 4,
                  path: "/",
                  isFolder: true,
                });
              }}
              title="New file"
              className="inline-flex items-center gap-1 px-1.5 py-1 rounded hover:bg-elevated hover:text-fg transition"
            >
              <FilePlus className="w-3 h-3" />
              File
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startNew("/", "folder");
              }}
              title="New folder"
              className="inline-flex items-center gap-1 px-1.5 py-1 rounded hover:bg-elevated hover:text-fg transition"
            >
              <FolderPlus className="w-3 h-3" />
              Folder
            </button>
            <div className="flex-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeps((v) => !v);
              }}
              title="Manage dependencies"
              className={`p-1 rounded hover:bg-elevated transition ${
                showDeps ? "text-accent" : "hover:text-fg"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void downloadZip();
              }}
              title="Download project as ZIP"
              className="p-1 rounded hover:bg-elevated hover:text-fg transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <span className="px-1">Files</span>
            <div className="flex-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                void downloadZip();
              }}
              title="Download project as ZIP"
              className="p-1 rounded hover:bg-elevated hover:text-fg transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {showDeps && !readOnly && (
        <div className="border-b border-border bg-panel/40 px-2 py-2 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wide text-muted">
              Dependencies
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeps(false);
              }}
              className="text-muted hover:text-fg transition"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="relative mb-2">
            <div className="flex items-center gap-1">
              <input
                value={newDepInput}
                onChange={(e) => setNewDepInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" && npmSuggestions.length) {
                    e.preventDefault();
                    setNpmActiveIdx((i) =>
                      Math.min(i + 1, npmSuggestions.length - 1)
                    );
                  } else if (e.key === "ArrowUp" && npmSuggestions.length) {
                    e.preventDefault();
                    setNpmActiveIdx((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (npmSuggestions.length) {
                      const pick = npmSuggestions[npmActiveIdx];
                      addDep(pick.name, pick.version);
                      setNewDepInput("");
                      setNpmSuggestions([]);
                    } else {
                      addDependency();
                    }
                  } else if (e.key === "Escape") {
                    setNpmSuggestions([]);
                  }
                }}
                placeholder="package or pkg@version"
                className="flex-1 min-w-0 bg-surface border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent/60"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addDependency();
                }}
                disabled={!newDepInput.trim()}
                title="Add dependency"
                className="px-2 py-1 rounded bg-accent hover:bg-accent-soft text-white disabled:opacity-40 transition"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {npmSuggestions.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-panel shadow-soft">
                {npmSuggestions.map((s, i) => (
                  <li key={s.name}>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addDep(s.name, s.version);
                        setNewDepInput("");
                        setNpmSuggestions([]);
                      }}
                      onMouseEnter={() => setNpmActiveIdx(i)}
                      className={`w-full text-left px-2 py-1.5 text-xs ${
                        i === npmActiveIdx
                          ? "bg-elevated text-fg"
                          : "text-subtle hover:text-fg"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{s.name}</span>
                        <span className="text-[10px] text-muted shrink-0">
                          {s.version}
                        </span>
                      </div>
                      {s.description && (
                        <div className="text-[10px] text-muted truncate mt-0.5">
                          {s.description}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {Object.keys(dependencies).length === 0 ? (
            <div className="text-[11px] text-muted italic py-1">
              No dependencies yet.
            </div>
          ) : (
            <ul className="space-y-0.5 max-h-48 overflow-y-auto">
              {Object.entries(dependencies)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, version]) => (
                  <li
                    key={name}
                    className="group flex items-center gap-2 px-1.5 py-0.5 rounded hover:bg-elevated"
                  >
                    <span className="truncate flex-1 text-fg">{name}</span>
                    <span className="text-muted text-[10px] shrink-0">
                      {version}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDependency(name);
                      }}
                      title={`Remove ${name}`}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div className="py-1">
        {tree.map((n) => renderNode(n, 0))}
        {pendingNew?.parentPath === "/" && renderNewInput(0)}
      </div>

      {contextMenu && !readOnly && (
        <div
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 100,
          }}
          className="min-w-[180px] rounded-lg border border-border bg-panel shadow-soft py-1 text-xs"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div
            className="relative"
            onMouseEnter={() => setShowFileTypes(true)}
            onMouseLeave={() => setShowFileTypes(false)}
          >
            <button className="w-full flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-elevated text-subtle hover:text-fg">
              <span className="flex items-center gap-2">
                <FilePlus className="w-3.5 h-3.5" />
                New File
              </span>
              <ChevronRight className="w-3 h-3" />
            </button>
            {showFileTypes && (
              <div
                style={{ left: "100%", top: 0, marginLeft: 2 }}
                className="absolute min-w-[180px] rounded-lg border border-border bg-panel shadow-soft py-1"
              >
                {FILE_TYPES.map((t) => (
                  <button
                    key={t.ext}
                    onClick={() => {
                      const parent = contextMenu.isFolder
                        ? contextMenu.path
                        : parentDir(contextMenu.path);
                      startNew(parent, "file", t.ext);
                    }}
                    className="w-full text-left flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-elevated text-subtle hover:text-fg"
                  >
                    <span className="flex items-center gap-2">
                      <FileNodeIcon name={`x${t.ext}`} />
                      {t.label}
                    </span>
                    <span className="text-muted">{t.ext}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              const parent = contextMenu.isFolder
                ? contextMenu.path
                : parentDir(contextMenu.path);
              startNew(parent, "folder");
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-elevated text-subtle hover:text-fg"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New Folder
          </button>

          {contextMenu.path !== "/" && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => startRename(contextMenu.path)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-elevated text-subtle hover:text-fg"
              >
                <Pencil className="w-3.5 h-3.5" />
                Rename
              </button>
              {!contextMenu.isFolder && (
                <button
                  onClick={() => duplicateFile(contextMenu.path)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-elevated text-subtle hover:text-fg"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </button>
              )}
              <button
                onClick={() =>
                  deletePath(contextMenu.path, contextMenu.isFolder)
                }
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
