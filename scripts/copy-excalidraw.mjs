/**
 * Copies Excalidraw's fonts into `public/excalidraw/fonts` so the interview
 * whiteboard loads them from this site instead of a public CDN.
 *
 * Runs on `postinstall`; the directory is gitignored.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "node_modules", "@excalidraw", "excalidraw", "dist", "prod", "fonts");
const dest = path.join(root, "public", "excalidraw", "fonts");

if (!existsSync(src)) {
  console.warn(`[copy-excalidraw] missing ${src}; the whiteboard will fall back to the CDN fonts.`);
  process.exit(0);
}
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("[copy-excalidraw] fonts ready at public/excalidraw/fonts");
