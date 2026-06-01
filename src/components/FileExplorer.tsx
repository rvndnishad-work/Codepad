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
  ArrowDownAZ,
  ListOrdered,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useFileSystem, FILE_TYPES, type TreeNode, parentDir } from "@/hooks/useFileSystem";
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
  SiPython,
  SiGo,
  SiRust,
  SiCplusplus,
  SiOpenjdk,
} from "react-icons/si";
import { useNpmSearch } from "@/hooks/useNpmSearch";

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
    return { Icon: SiMarkdown, color: "var(--muted)" };
  if (lower === ".env" || lower.startsWith(".env."))
    return { Icon: Settings, color: "#fbbf24" };

  const ext = lower.match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  switch (ext) {
    case "js":
    case "mjs":
    case "cjs":
      return { Icon: SiJavascript, color: "#f59e0b" };
    case "ts":
      return { Icon: SiTypescript, color: "#3178c6" };
    case "jsx":
    case "tsx":
      return { Icon: SiReact, color: "#0891b2" };
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
      return { Icon: FileJson, color: "#d97706" };
    case "md":
    case "mdx":
      return { Icon: SiMarkdown, color: "var(--muted)" };
    case "lock":
      return { Icon: Lock, color: "var(--muted)" };
    case "py":
      return { Icon: SiPython, color: "#3776ab" };
    case "go":
      return { Icon: SiGo, color: "#00add8" };
    case "java":
      return { Icon: SiOpenjdk, color: "#5382a1" };
    case "rs":
      return { Icon: SiRust, color: "#e43716" };
    case "c":
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
      return { Icon: SiCplusplus, color: "#00599c" };
    default:
      return { Icon: FileIcon, color: "var(--muted)" };
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

/** VS Code Material-Icon-Theme–style folder colors */
const FOLDER_COLORS: Record<string, string> = {
  src: "#4fc3f7",
  app: "#ef5350",
  pages: "#ef5350",
  api: "#ef5350",
  components: "#42a5f5",
  component: "#42a5f5",
  hooks: "#ab47bc",
  hook: "#ab47bc",
  lib: "#66bb6a",
  libs: "#66bb6a",
  utils: "#66bb6a",
  util: "#66bb6a",
  helpers: "#66bb6a",
  helper: "#66bb6a",
  public: "#8d6e63",
  static: "#8d6e63",
  assets: "#8d6e63",
  images: "#8d6e63",
  img: "#8d6e63",
  styles: "#29b6f6",
  style: "#29b6f6",
  css: "#29b6f6",
  config: "#78909c",
  configs: "#78909c",
  types: "#26c6da",
  type: "#26c6da",
  models: "#26c6da",
  model: "#26c6da",
  interfaces: "#26c6da",
  store: "#ff7043",
  stores: "#ff7043",
  state: "#ff7043",
  context: "#ff7043",
  contexts: "#ff7043",
  test: "#9ccc65",
  tests: "#9ccc65",
  __tests__: "#9ccc65",
  spec: "#9ccc65",
  node_modules: "#616161",
  dist: "#78909c",
  build: "#78909c",
  out: "#78909c",
  ".next": "#78909c",
  ".git": "#f05032",
  prisma: "#5a67d8",
  middleware: "#ffb74d",
  middlewares: "#ffb74d",
  routes: "#ff8a65",
  router: "#ff8a65",
  services: "#26a69a",
  service: "#26a69a",
  layouts: "#ce93d8",
  layout: "#ce93d8",
  views: "#7986cb",
  view: "#7986cb",
  features: "#4db6ac",
  modules: "#4db6ac",
  providers: "#ba68c8",
  provider: "#ba68c8",
};

/** Classic Windows / OS file-explorer folder yellow. */
const WINDOWS_FOLDER_YELLOW = "#EAB308";

function folderColor(name: string, plain?: boolean): string {
  if (plain) return WINDOWS_FOLDER_YELLOW;
  return FOLDER_COLORS[name.toLowerCase()] ?? "#fbbf24";
}

function FolderNodeIcon({ name, open, plain }: { name: string; open: boolean; plain?: boolean }) {
  const color = folderColor(name, plain);
  const FolderIcon = open ? FolderOpen : Folder;
  return <FolderIcon className="w-3.5 h-3.5 shrink-0" style={{ color }} />;
}



type Props = {
  readOnly?: boolean;
  onCollapse?: () => void;
  /** Show the "Download ZIP" button (default true). */
  showDownload?: boolean;
  /** When set, renders a collapse toggle that shrinks the tree to an icon-only
   *  rail. `collapsed` is the controlled state, `onToggleCollapse` flips it. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Use a single Windows-style yellow for every folder instead of the
   *  VS Code per-name folder colors. */
  plainFolders?: boolean;
  templateId?: string;
};

export default function FileExplorer({
  readOnly = false,
  onCollapse,
  showDownload = true,
  collapsed = false,
  onToggleCollapse,
  plainFolders = false,
  templateId,
}: Props) {
  const contextFileTypes = useMemo(() => {
    if (!templateId) return FILE_TYPES.filter(t => [".js", ".ts", ".jsx", ".tsx", ".css", ".html", ".json", ".md"].includes(t.ext));
    
    const id = templateId.toLowerCase();
    if (id === "python") {
      return FILE_TYPES.filter(t => [".py", ".json", ".md"].includes(t.ext));
    }
    if (id === "go") {
      return FILE_TYPES.filter(t => [".go", ".json", ".md"].includes(t.ext));
    }
    if (id === "java") {
      return FILE_TYPES.filter(t => [".java", ".json", ".md"].includes(t.ext));
    }
    if (id === "rust") {
      return FILE_TYPES.filter(t => [".rs", ".toml", ".md"].includes(t.ext));
    }
    if (id === "cpp") {
      return FILE_TYPES.filter(t => [".cpp", ".h", ".c", ".json", ".md"].includes(t.ext));
    }
    if (id === "node" || id === "ts-node" || id === "empty-js" || id === "empty-ts") {
      return FILE_TYPES.filter(t => [".js", ".ts", ".json", ".md"].includes(t.ext));
    }
    
    // Default frontend list
    return FILE_TYPES.filter(t => [".js", ".ts", ".jsx", ".tsx", ".css", ".html", ".json", ".md"].includes(t.ext));
  }, [templateId]);

  const {
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
    movePath,
    startRename,
    commitRename,
    cancelRename,
    uploadFiles,
    downloadZip,
    duplicateFile
  } = useFileSystem();

  const packageJsonPath = useMemo(
    () => filePaths.find((p) => p.endsWith("/package.json")) ?? "/package.json",
    [filePaths]
  );

  // Where the dragged item would land if dropped right now. "before"/"after"
  // produce a visible insertion line above/below the target row; "into"
  // (folders only) highlights the entire row, matching the prior behavior.
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "into" | null>(null);

  const {
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
  } = useNpmSearch(packageJsonPath);

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
          setDropPosition(null);
        }}
        onDragOver={(e) => {
          if (readOnly) return;
          const hasExternal = e.dataTransfer.types.includes("Files");
          if (!draggingPath && !hasExternal) return;
          // Can't drop a folder into itself or one of its descendants.
          if (
            draggingPath &&
            (draggingPath === node.path ||
              node.path.startsWith(draggingPath + "/"))
          )
            return;

          // Detect drop zone within the row:
          //   ≤ 25% from top  → insert BEFORE this sibling
          //   ≥ 75% from top  → insert AFTER  this sibling
          //   middle 50%      → drop INTO (folder only); for files, treated
          //                     as "after" so reordering still feels natural.
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientY - rect.top) / Math.max(1, rect.height);
          let pos: "before" | "after" | "into";
          if (node.isFolder && ratio > 0.25 && ratio < 0.75) {
            pos = "into";
          } else if (ratio < 0.5) {
            pos = "before";
          } else {
            pos = "after";
          }

          // Reordering only works inside the same parent. Cross-parent drops
          // with external files use "into" on folders; non-folder cross-parent
          // drops are not actionable, so suppress the indicator.
          if (pos !== "into") {
            if (
              draggingPath &&
              parentDir(draggingPath) !== parentDir(node.path)
            ) {
              if (!hasExternal) return;
              pos = node.isFolder ? "into" : "after";
            }
            // Dropping just above/below yourself is a no-op.
            if (draggingPath === node.path) return;
          }

          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = hasExternal ? "copy" : "move";
          setDropTarget(node.path);
          setDropPosition(pos);
        }}
        onDragLeave={() => {
          if (dropTarget === node.path) {
            setDropTarget(null);
            setDropPosition(null);
          }
        }}
        onDrop={(e) => {
          if (readOnly) return;
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // External file drop: drop into the folder (or its parent if a
            // file row was the target). Keep prior behavior.
            const targetFolder = node.isFolder ? node.path : parentDir(node.path);
            void uploadFiles(e.dataTransfer.files, targetFolder);
            setExpanded((prev) => new Set(prev).add(targetFolder));
          } else if (draggingPath) {
            if (dropPosition === "into" && node.isFolder) {
              movePath(draggingPath, node.path);
            } else if (
              (dropPosition === "before" || dropPosition === "after") &&
              parentDir(draggingPath) === parentDir(node.path)
            ) {
              reorderSibling(draggingPath, node.path, dropPosition);
            } else if (node.isFolder) {
              // Cross-parent fallback: move into the folder.
              movePath(draggingPath, node.path);
            }
          }
          setDraggingPath(null);
          setDropTarget(null);
          setDropPosition(null);
        }}
        onClick={() => {
          if (node.isFolder) toggle(node.path);
          // openFile both adds the path to the tab strip and makes it active.
          // setActiveFile alone wouldn't open a tab for files we constrained
          // out of the initial visibleFiles list.
          else sandpack.openFile(node.path);
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
        style={{
          paddingLeft: 6 + depth * 12,
          ...(isDropTarget && dropPosition === "before"
            ? { boxShadow: "inset 0 2px 0 0 var(--accent)" }
            : {}),
          ...(isDropTarget && dropPosition === "after"
            ? { boxShadow: "inset 0 -2px 0 0 var(--accent)" }
            : {}),
        }}
        className={`group flex items-center gap-1.5 pr-2 py-1 cursor-pointer text-[13px] select-none transition ${
          isActive
            ? "bg-accent/10 text-accent font-medium shadow-[inset_2px_0_0_0_currentColor]"
            : "text-fg/70 hover:bg-elevated hover:text-fg"
        } ${
          isDropTarget && dropPosition === "into"
            ? "outline outline-1 outline-accent -outline-offset-1"
            : ""
        } ${isDragging ? "opacity-50" : ""}`}
      >
        {node.isFolder ? (
          isExpanded ? (
            <ChevronDown className={`w-3 h-3 shrink-0 transition-colors ${isActive ? "text-accent" : "text-muted"}`} />
          ) : (
            <ChevronRight className={`w-3 h-3 shrink-0 transition-colors ${isActive ? "text-accent" : "text-muted"}`} />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {node.isFolder ? (
          <FolderNodeIcon name={node.name} open={isExpanded} plain={plainFolders} />
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
            className="flex-1 min-w-0 bg-panel border border-accent/40 rounded px-1.5 py-0.5 h-6 text-[13px] outline-none"
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
        className="flex items-center gap-1.5 pr-2 py-1 text-[13px]"
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
          className="flex-1 min-w-0 bg-panel border border-accent/40 rounded px-1.5 py-0.5 h-6 text-[13px] outline-none"
        />
      </div>
    );
  }

  // Collapsed: a narrow rail of file icons only. Click an icon to open the
  // file; the toggle at the top expands back to the full tree.
  if (collapsed) {
    return (
      <div className="h-full w-full border-r border-border bg-surface flex flex-col items-center gap-0.5 py-2 overflow-y-auto select-none">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Expand files"
            aria-label="Expand files"
            className="p-1.5 mb-1 rounded hover:bg-elevated text-muted/60 hover:text-fg transition"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
        {filePaths.map((p) => {
          const isActive = activeFile === p;
          const name = p.split("/").pop() || p;
          return (
            <button
              key={p}
              onClick={() => sandpack.openFile(p)}
              title={p.replace(/^\//, "")}
              className={`p-1.5 rounded transition ${
                isActive
                  ? "bg-accent/10 shadow-[inset_2px_0_0_0_var(--accent)]"
                  : "hover:bg-elevated opacity-80 hover:opacity-100"
              }`}
            >
              <FileNodeIcon name={name} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="h-full w-full border-r border-border bg-surface text-xs overflow-y-auto select-none relative flex flex-col"
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
        setDropPosition(null);
      }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 h-9 border-b border-border bg-transparent shrink-0">
        <span className="text-[11px] font-medium text-muted tracking-wide">Files</span>
        <div className="flex items-center gap-0.5">
          {!readOnly && (
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
                className="p-1.5 hover:bg-elevated rounded transition text-muted/50 hover:text-fg"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startNew("/", "folder");
                }}
                title="New folder"
                className="p-1.5 hover:bg-elevated rounded transition text-muted/50 hover:text-fg"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeps((v) => !v);
                }}
                title="Dependencies"
                className={`p-1.5 rounded transition ${
                  showDeps ? "bg-accent/20 text-accent" : "text-muted/50 hover:bg-elevated hover:text-fg"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSortMode(sortMode === "manual" ? "name" : "manual");
                }}
                title={
                  sortMode === "manual"
                    ? "Sort: manual (creation order). Click for A–Z."
                    : "Sort: A–Z. Click for manual."
                }
                className={`p-1.5 rounded transition ${
                  sortMode === "name"
                    ? "bg-accent/20 text-accent"
                    : "text-muted/50 hover:bg-elevated hover:text-fg"
                }`}
              >
                {sortMode === "manual" ? (
                  <ListOrdered className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          )}
          {showDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void downloadZip();
              }}
              title="Download ZIP"
              className="p-1.5 hover:bg-elevated rounded transition text-muted/50 hover:text-fg"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Collapse to icons"
              aria-label="Collapse file tree"
              className="p-1.5 hover:bg-elevated rounded transition text-muted/50 hover:text-fg"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}

          {onCollapse && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={onCollapse}
                title="Collapse sidebar"
                className="p-1.5 hover:bg-elevated rounded transition text-muted/50 hover:text-fg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
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
                className="px-2 py-1 rounded bg-accent hover:bg-accent-soft text-bg disabled:opacity-40 transition"
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
                style={{ left: "100%", top: -4 }}
                className="absolute pl-1 z-50"
              >
                <div className="min-w-[180px] rounded-lg border border-border bg-panel shadow-soft py-1">
                  {contextFileTypes.map((t) => (
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
