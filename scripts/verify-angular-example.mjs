/**
 * Boots an Angular interview-question example and prints what it renders, so
 * the "Verified" output quoted in prisma/data/angular-augments-ultra-*.ts is
 * real output, not memory.
 *
 * The file is treated as /src/app/app.component.ts and started with
 * bootstrapApplication(AppComponent) and no providers, in jsdom. Two modes:
 *
 *   --app         (default) AOT-compile with ngc and strictTemplates, the way
 *                 `ng build` compiles a real app. Template type errors fail.
 *   --playground  Plain TypeScript transpile + runtime JIT, the way the
 *                 site's Sandpack playground runs it. Signal inputs, outputs
 *                 and signal queries do not register in this mode, so an
 *                 example that uses them must be `runnable: false`.
 *
 * A runnable example has to pass both modes. A file that also exports
 * appConfig (an ApplicationConfig, as app.config.ts would) is booted with it,
 * which is how examples needing provideRouter or provideHttpClient are checked;
 * those can never be runnable, since the playground boots with no providers.
 *
 * Angular is not a dependency of this repo, so install it in a scratch dir and
 * run from there (module resolution starts at the current directory):
 *
 *   mkdir /tmp/ngv && cd /tmp/ngv && npm init -y && npm i esbuild jsdom typescript@6 \
 *     @angular/{core,common,compiler,compiler-cli,platform-browser,forms}@22 rxjs@7 zone.js@0.16
 *   node <repo>/scripts/verify-angular-example.mjs [--playground] app.component.ts [driver.mjs]
 *
 * A driver is `export default async ({ document, app, settle, text }) => {}`.
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { resolve, join } from "path";
import { mkdtempSync, writeFileSync, copyFileSync, rmSync, existsSync } from "fs";
import { execFileSync } from "child_process";

const args = process.argv.slice(2);
const playground = args.includes("--playground");
const [file, driver] = args.filter((a) => !a.startsWith("--"));

// esbuild, jsdom and ngc resolve from the scratch dir, next to Angular: the
// nearest directory at or above the current one that has @angular/core.
let root = process.cwd();
while (!existsSync(join(root, "node_modules/@angular/core")) && resolve(root, "..") !== root) root = resolve(root, "..");
const req = createRequire(join(root, "package.json"));
const { build } = req("esbuild");
const { JSDOM } = req("jsdom");

let entryFile = resolve(file);
let work = null;
if (!playground) {
  // Inside the scratch dir, so imports resolve to its node_modules.
  work = mkdtempSync(join(root, ".ngv-"));
  copyFileSync(entryFile, join(work, "app.component.ts"));
  writeFileSync(join(work, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "ES2022", moduleResolution: "bundler", outDir: "out",
      strict: true, skipLibCheck: true, experimentalDecorators: true, typeRoots: [],
    },
    files: ["app.component.ts"],
    angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true },
  }));
  try {
    const ngc = join(root, "node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js");
    execFileSync(process.execPath, [ngc, "-p", join(work, "tsconfig.json")], { stdio: "pipe" });
  } catch (e) {
    console.log("NGC FAILED:\n" + (e.stdout?.toString() || "") + (e.stderr?.toString() || e.message));
    rmSync(work, { recursive: true, force: true });
    process.exit(1);
  }
  entryFile = join(work, "out", "app.component.js");
}

const dom = new JSDOM("<!doctype html><html><body><app-root></app-root></body></html>", { pretendToBeVisual: true, url: "http://localhost/" });
for (const k of ["window", "document", "navigator", "Node", "Element", "HTMLElement", "Event", "MouseEvent", "KeyboardEvent", "CustomEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MutationObserver", "DOMParser", "HTMLInputElement", "Text", "Comment", "DocumentFragment", "InputEvent", "FocusEvent"]) {
  try { globalThis[k] = dom.window[k]; } catch {}
}

const entry = `import "zone.js"; import "@angular/compiler";
import { bootstrapApplication } from "@angular/platform-browser";
import * as M from ${JSON.stringify(entryFile)};
export const boot = () => bootstrapApplication(M.AppComponent, M.appConfig);`;
const out = resolve(".out-" + process.pid + ".mjs");
await build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  nodePaths: [join(root, "node_modules")],
  bundle: true, format: "esm", platform: "neutral", mainFields: ["module", "main"], outfile: out, logLevel: "error",
  tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
});

const { boot } = await import(pathToFileURL(out).href);
const settle = () => new Promise((r) => setTimeout(r, 30));
const text = () => document.querySelector("app-root").textContent.replace(/\s+/g, " ").trim();
try {
  const app = await boot();
  await settle();
  console.log(`[${playground ? "playground" : "app"}] RENDERED: ${text()}`);
  if (driver) {
    const d = await import(pathToFileURL(resolve(driver)).href);
    await d.default({ document, app, settle, text });
  }
  app.destroy();
} finally {
  rmSync(out, { force: true });
  if (work) rmSync(work, { recursive: true, force: true });
}
process.exit(0);
