/**
 * Copies the self-hosted Monaco build (`monaco-editor/min/vs`, pinned to the
 * exact version @monaco-editor/loader expects) into `public/monaco/vs`.
 *
 * Runs on `postinstall`, so fresh clones, CI and Vercel all regenerate it —
 * the directory is gitignored and must never be committed (~15MB).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

const src = path.join(root, "node_modules", "monaco-editor", "min", "vs");
const dest = path.join(root, "public", "monaco", "vs");

if (!existsSync(src)) {
  console.error(`[copy-monaco] missing source dir: ${src}`);
  console.error("[copy-monaco] run `npm install` first.");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

// Sanity: the AMD loader entry the browser fetches first.
if (!existsSync(path.join(dest, "loader.js"))) {
  console.error("[copy-monaco] copy produced no loader.js — aborting.");
  process.exit(1);
}
console.log("[copy-monaco] self-hosted Monaco ready at public/monaco/vs");
