/**
 * Drag-and-drop upload classification.
 *
 * Pure version of the extension lists previously inline in
 * `useFileSystem.uploadFiles`. Every extension creatable in any template
 * (see `template-filetypes.ts` + `FILE_TYPES`) must be uploadable too —
 * previously `.py/.go/.java/.rs/.toml/.cpp/.h/.c` files were *silently
 * skipped* because the OS often reports an empty MIME type for them.
 */

const TEXT_EXTS = new Set([
  "js",
  "mjs",
  "cjs",
  "ts",
  "jsx",
  "tsx",
  "vue",
  "svelte",
  "vue",
  "svelte",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "json",
  "md",
  "mdx",
  "txt",
  "yml",
  "yaml",
  "xml",
  "svg",
  // Backend / systems extensions (MIME type unreliable — classify by ext).
  "py",
  "go",
  "java",
  "rs",
  "toml",
  "cpp",
  "h",
  "hpp",
  "c",
]);

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "ico"]);

export type UploadKind = "text" | "image" | "skip";

export function classifyUpload(fileName: string, mimeType: string): UploadKind {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (TEXT_EXTS.has(ext) || mimeType.startsWith("text/")) return "text";
  if (IMAGE_EXTS.has(ext) || mimeType.startsWith("image/")) return "image";
  return "skip";
}
