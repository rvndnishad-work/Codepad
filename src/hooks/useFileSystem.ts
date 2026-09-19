import { useState, useMemo, useEffect, useRef } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import { toast } from "sonner";
import { markRevealed, classifyCollision } from "@/lib/revealed-paths";
import { classifyUpload } from "@/lib/upload-files";
import { readBoolPref, writeBoolPref, PREF_KEYS } from "@/lib/prefs";
import JSZip from "jszip";

export type FileType = { ext: string; label: string; template: string };

export const FILE_TYPES: FileType[] = [
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
  { ext: ".py", label: "Python", template: "# New Python file\n" },
  { ext: ".go", label: "Go", template: "package main\n\nimport \"fmt\"\n\n" },
  { ext: ".java", label: "Java", template: "public class NewClass {\n    \n}\n" },
  { ext: ".rs", label: "Rust", template: "// New Rust source file\n" },
  { ext: ".toml", label: "TOML", template: "[package]\nname = \"\"\nversion = \"0.1.0\"\n" },
  { ext: ".cpp", label: "C++", template: "#include <iostream>\n\n" },
  { ext: ".h", label: "Header", template: "#pragma once\n\n" },
  { ext: ".c", label: "C", template: "#include <stdio.h>\n\n" },
];

export type TreeNode = {
  name: string;
  path: string;
  isFolder: boolean;
  children?: TreeNode[];
};

export type SortMode = "manual" | "name";

/**
 * Per-parent explicit ordering. Keys are parent paths (e.g. "/", "/src"),
 * values are arrays of child basenames in the order the user has chosen.
 * Names not present in the array are appended at the end after applying the
 * custom order (this is how newly-created files end up at the bottom).
 */
export type CustomOrder = Record<string, string[]>;

export function buildTree(
  filePaths: string[],
  emptyFolders: Set<string>,
  sortMode: SortMode = "manual",
  customOrder: CustomOrder = {},
): TreeNode[] {
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

  // "manual" preserves the order children were appended (i.e. file/folder
  // creation order — Object.keys insertion order from Sandpack), then
  // overlays any explicit user reordering from `customOrder`. When no custom
  // order is set for a parent, folders are grouped before files so the tree
  // reads VSCode-style. "name" sorts alphabetically with folders first.
  function sort(node: TreeNode) {
    if (!node.children) return;
    if (sortMode === "name") {
      node.children.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } else {
      const explicit = customOrder[node.path];
      if (explicit && explicit.length > 0) {
        // Apply the user's explicit ordering. Children whose names appear in
        // `explicit` are placed in that order; anything new (created since
        // the order was set) is appended at the end.
        const byName = new Map(node.children.map((c) => [c.name, c]));
        const ordered: TreeNode[] = [];
        for (const name of explicit) {
          const c = byName.get(name);
          if (c) {
            ordered.push(c);
            byName.delete(name);
          }
        }
        for (const c of node.children) {
          if (byName.has(c.name)) ordered.push(c);
        }
        node.children = ordered;
      } else {
        const folders = node.children.filter((c) => c.isFolder);
        const files = node.children.filter((c) => !c.isFolder);
        node.children = [...folders, ...files];
      }
    }
    for (const c of node.children) sort(c);
  }
  sort(root);
  return root.children ?? [];
}

export function parentDir(path: string): string {
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return "/";
  return path.slice(0, idx);
}

export function normalizePath(p: string): string {
  return p.startsWith("/") ? p : "/" + p;
}

/**
 * Resolve the final file name for the "new file" input. When the input was
 * opened for a specific extension (toolbar button, type submenu) and the
 * typed name has no extension of its own, the extension is appended —
 * otherwise the typed name (with its own extension) wins verbatim.
 */
export function resolveNewFileName(name: string, ext?: string): string {
  const trimmed = name.trim();
  if (ext && !/\.[^./]+$/.test(trimmed)) return trimmed + ext;
  return trimmed;
}

function baseName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? "";
}

/**
 * Ancestor folder paths of a file path, e.g. "/a/b/c.js" → ["/a", "/a/b"].
 * Creating a nested file expands these so the new file is visible.
 */
export function ancestorDirs(fullPath: string): string[] {
  const segs = fullPath.split("/").filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < segs.length - 1; i++) {
    cur += `/${segs[i]}`;
    out.push(cur);
  }
  return out;
}

/**
 * Drop ordering state for a deleted path: the deleted name leaves its
 * parent's order, and explicit orders rooted at/below the path die with it.
 * Without this, re-creating the same name later resurrects a stale position.
 */
export function pruneCustomOrderAfterDelete(
  order: CustomOrder,
  deletedPath: string,
): CustomOrder {
  const parent = parentDir(deletedPath);
  const name = baseName(deletedPath);
  const next: CustomOrder = {};
  for (const [key, names] of Object.entries(order)) {
    if (key === deletedPath || key.startsWith(deletedPath + "/")) continue;
    next[key] = key === parent ? names.filter((n) => n !== name) : names;
  }
  return next;
}

/**
 * Carry ordering state across a move/rename: descendant orders are re-rooted
 * at the new path, the old name leaves the old parent (an in-place rename
 * keeps its slot), and a move into a parent with an explicit order appends
 * at the end per the newcomer rule.
 */
export function rekeyCustomOrderAfterMove(
  order: CustomOrder,
  fromPath: string,
  toPath: string,
): CustomOrder {
  if (fromPath === toPath) return order;
  const fromParent = parentDir(fromPath);
  const toParent = parentDir(toPath);
  const fromName = baseName(fromPath);
  const toName = baseName(toPath);
  const next: CustomOrder = {};
  for (const [key, names] of Object.entries(order)) {
    let newKey = key;
    if (key === fromPath) newKey = toPath;
    else if (key.startsWith(fromPath + "/")) newKey = toPath + key.slice(fromPath.length);
    let list = names;
    if (key === fromParent) {
      const idx = names.indexOf(fromName);
      if (idx !== -1) {
        list = [...names];
        if (fromParent === toParent) list[idx] = toName;
        else list.splice(idx, 1);
      }
    }
    next[newKey] = list;
  }
  if (fromParent !== toParent && next[toParent] && !next[toParent].includes(toName)) {
    next[toParent] = [...next[toParent], toName];
  }
  return next;
}

export type ContextMenu = {
  x: number;
  y: number;
  path: string;
  isFolder: boolean;
} | null;

export type PendingNew = {
  parentPath: string;
  kind: "file" | "folder";
  ext?: string;
} | null;

export type PendingDelete = {
  path: string;
  isFolder: boolean;
} | null;

export function useFileSystem(templateId?: string) {
  const { sandpack } = useSandpack();
  const { files, activeFile } = sandpack;

  const filePaths = useMemo(
    () =>
      Object.keys(files)
        .filter((p) => {
          const f = files[p];
          if (typeof f === "string") return true;
          return !(f as { hidden?: boolean }).hidden;
        })
        .map(normalizePath),
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
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  // Sort mode is persisted across sessions. Default to "manual" so files keep
  // the order the user (or template) created them, instead of being shuffled
  // alphabetically on every render.
  const [sortMode, setSortModeState] = useState<SortMode>("manual");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("codepad:files:sortMode");
    if (saved === "manual" || saved === "name") setSortModeState(saved);
  }, []);
  const setSortMode = (m: SortMode) => {
    setSortModeState(m);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("codepad:files:sortMode", m);
    }
  };

  // User-defined sibling ordering for manual mode. Populated by drag-reorder.
  // Cleared when the user switches to A-Z (we don't lose it, just stop
  // applying it — switching back to manual restores the user's order).
  const [customOrder, setCustomOrder] = useState<CustomOrder>({});

  const tree = useMemo(
    () => buildTree(filePaths, emptyFolders, sortMode, customOrder),
    [filePaths, emptyFolders, sortMode, customOrder]
  );

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

  function startNew(parentPath: string, kind: "file" | "folder", ext?: string) {
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
      const finalName = resolveNewFileName(name, pending.ext);
      const fullPath = normalizePath(`${parent}/${finalName}`);
      const existing = files[fullPath];
      if (classifyCollision(existing, filePaths, fullPath) === "hidden-scaffold") {
        // Hidden template scaffolding (e.g. empty-react's empty /styles.css)
        // exists in the bundler but is filtered out of the tree. Creating a
        // file at that path reveals it instead of erroring on a file the
        // user cannot see. Preserve any scaffolded content; otherwise seed
        // with the new-file template for the typed extension.
        const existingCode =
          typeof existing === "string"
            ? existing
            : ((existing as { code?: string }).code ?? "");
        const actualExt =
          finalName.match(/\.[^./]+$/)?.[0] ?? pending.ext ?? ".js";
        const tpl =
          FILE_TYPES.find((t) => t.ext === actualExt)?.template ?? "";
        const codeToUse = existingCode.trim() ? existingCode : tpl;
        markRevealed(templateId, fullPath);
        const payload: Record<string, any> = {
          [fullPath]: { code: codeToUse, hidden: false },
        };
        sandpack.updateFile(payload);
        setTimeout(() => sandpack.openFile(fullPath), 0);
        return;
      }
      if (existing || filePaths.includes(fullPath)) {
        toast.error(`"${finalName}" already exists`);
        return;
      }
      const actualExt = finalName.match(/\.[^./]+$/)?.[0] ?? pending.ext ?? ".js";
      const tpl =
        FILE_TYPES.find((t) => t.ext === actualExt)?.template ?? "";
      sandpack.addFile(fullPath, tpl);
      // Expand ancestors so a nested quick-create is visible right away.
      const ancestors = ancestorDirs(fullPath);
      if (ancestors.length > 0) {
        setExpanded((prev) => new Set([...prev, ...ancestors]));
      }
      setTimeout(() => sandpack.openFile(fullPath), 0);
    } else {
      const fullPath = normalizePath(`${parent}/${name}`);
      if (
        files[fullPath] ||
        filePaths.includes(fullPath) ||
        filePaths.some((p) => p.startsWith(fullPath + "/")) ||
        emptyFolders.has(fullPath)
      ) {
        toast.error(`"${name}" already exists`);
        return;
      }
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
    setCustomOrder((prev) => pruneCustomOrderAfterDelete(prev, path));
    setContextMenu(null);
  }

  /**
   * Delete confirmation flow (VS Code-style). destructive deletes go through
   * `requestDelete`, which either deletes immediately (user checked "Do not
   * ask me again") or stages `pendingDelete` for the confirm dialog.
   */
  function requestDelete(path: string, isFolder: boolean) {
    setContextMenu(null);
    if (readBoolPref(PREF_KEYS.skipDeleteConfirm, false)) {
      deletePath(path, isFolder);
      return;
    }
    setPendingDelete({ path, isFolder });
  }

  function confirmDelete(doNotAskAgain: boolean) {
    const pending = pendingDelete;
    if (!pending) return;
    if (doNotAskAgain) writeBoolPref(PREF_KEYS.skipDeleteConfirm, true);
    setPendingDelete(null);
    deletePath(pending.path, pending.isFolder);
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  /**
   * Reorder a sibling within its parent. Used by drag-reorder in the
   * explorer when the user drops on the top/bottom half of another row in
   * the SAME parent. The pre-existing `movePath` already covers the
   * cross-folder case.
   *
   * If the parent has no custom order yet, we seed it from the current tree
   * children so the explicit reorder doesn't yank unrelated siblings to the
   * end. Children whose names aren't in `customOrder` are appended.
   */
  function reorderSibling(
    draggedPath: string,
    targetPath: string,
    position: "before" | "after",
  ) {
    if (draggedPath === targetPath) return;
    const parent = parentDir(draggedPath);
    if (parent !== parentDir(targetPath)) return;
    const draggedName = draggedPath.split("/").filter(Boolean).pop()!;
    const targetName = targetPath.split("/").filter(Boolean).pop()!;

    // Compute the current child order from the tree we just built, so the
    // user's existing folder-first grouping is preserved when we first seed
    // the explicit order.
    function currentOrder(): string[] {
      const segments = parent === "/" ? [] : parent.split("/").filter(Boolean);
      let node: TreeNode | undefined = { name: "", path: "/", isFolder: true, children: tree } as TreeNode;
      for (const seg of segments) {
        node = node.children?.find((c) => c.name === seg);
        if (!node) return [];
      }
      return node.children?.map((c) => c.name) ?? [];
    }

    setCustomOrder((prev) => {
      const seed = prev[parent] ?? currentOrder();
      const without = seed.filter((n) => n !== draggedName);
      let targetIdx = without.indexOf(targetName);
      if (targetIdx === -1) {
        // Target wasn't in the seed — fall back to current order to be safe.
        const cur = currentOrder().filter((n) => n !== draggedName);
        targetIdx = cur.indexOf(targetName);
        if (targetIdx === -1) return prev;
        const insertAt = position === "before" ? targetIdx : targetIdx + 1;
        cur.splice(insertAt, 0, draggedName);
        return { ...prev, [parent]: cur };
      }
      const insertAt = position === "before" ? targetIdx : targetIdx + 1;
      without.splice(insertAt, 0, draggedName);
      return { ...prev, [parent]: without };
    });
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
      if (activeFile === fromPath) sandpack.openFile(newPath);
      setCustomOrder((prev) => rekeyCustomOrderAfterMove(prev, fromPath, newPath));
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
    setCustomOrder((prev) => rekeyCustomOrderAfterMove(prev, fromPath, newPath));
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
      if (activeFile === path) sandpack.openFile(newPath);
      setCustomOrder((prev) => rekeyCustomOrderAfterMove(prev, path, newPath));
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
    setCustomOrder((prev) => rekeyCustomOrderAfterMove(prev, path, newPath));
  }

  function cancelRename() {
    setRenamingPath(null);
    setRenameValue("");
  }

  async function uploadFiles(fileList: FileList | File[], destFolder: string) {
    const folder = destFolder === "/" ? "" : destFolder;
    let firstAdded: string | null = null;
    let skipped = 0;

    for (const f of Array.from(fileList)) {
      const kind = classifyUpload(f.name, f.type ?? "");
      if (kind === "skip") {
        skipped++;
        continue;
      }
      let target = `${folder}/${f.name}`;
      let i = 2;
      while (files[target] || filePaths.includes(target)) {
        const dot = f.name.lastIndexOf(".");
        const base = dot > 0 ? f.name.slice(0, dot) : f.name;
        const e = dot > 0 ? f.name.slice(dot) : "";
        target = `${folder}/${base} (${i})${e}`;
        i++;
      }

      if (kind === "text") {
        const code = await f.text();
        sandpack.addFile(target, code);
      } else {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(f);
        });
        sandpack.addFile(target, dataUrl);
      }
      if (!firstAdded) firstAdded = target;
    }
    if (skipped > 0) {
      toast.error(
        `Skipped ${skipped} unsupported file${skipped === 1 ? "" : "s"}`,
        { description: "Only code, text, markdown and image files can be uploaded." },
      );
    }
    if (firstAdded) {
      const target = firstAdded;
      setTimeout(() => sandpack.openFile(target), 0);
    }
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
    a.download = "interviewpad-snippet.zip";
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
    setTimeout(() => sandpack.openFile(candidate), 0);
    setContextMenu(null);
  }

  return {
    expanded,
    setExpanded,
    emptyFolders,
    setEmptyFolders,
    contextMenu,
    setContextMenu,
    showFileTypes,
    setShowFileTypes,
    pendingNew,
    setPendingNew,
    newName,
    setNewName,
    draggingPath,
    setDraggingPath,
    dropTarget,
    setDropTarget,
    renamingPath,
    setRenamingPath,
    renameValue,
    setRenameValue,
    sortMode,
    setSortMode,
    reorderSibling,
    tree,
    filePaths,
    activeFile,
    sandpack,
    toggle,
    startNew,
    commitNew,
    cancelNew,
    deletePath,
    requestDelete,
    confirmDelete,
    cancelDelete,
    pendingDelete,
    movePath,
    startRename,
    commitRename,
    cancelRename,
    uploadFiles,
    downloadZip,
    duplicateFile
  };
}
