/**
 * Mounts a Frontend Machine Coding solution the way the site's playground
 * boots it, and prints what it renders, so the "Verified" output quoted in
 * prisma/data/machine-coding-augments-ultra-*.ts is real output, not memory.
 *
 * A solution is a directory laid out like the augment's `files` map
 * (`/App.js` -> <dir>/App.js, `/src/App.vue` -> <dir>/src/App.vue, ...):
 *
 *   react    <dir>/App.js (+ any <dir>/src/*). JSX in .js files, bundled with
 *            esbuild and rendered like Sandpack's react template:
 *            createRoot(#root).render(<StrictMode><App /></StrictMode>).
 *   vue      <dir>/src/App.vue (+ <dir>/src/components/*.vue ...). Every .vue
 *            file is compiled with @vue/compiler-sfc (script setup inlined, as
 *            @vitejs/plugin-vue builds it) and mounted with
 *            createApp(App).mount("#app"), like Sandpack's vue template.
 *   angular  <dir>/src/app/app.component.ts (+ sibling .ts files). Booted with
 *            bootstrapApplication(AppComponent) and no providers, twice:
 *              --mode app         AOT with ngc + strictTemplates (`ng build`)
 *              --mode playground  esbuild transpile + runtime JIT, the way the
 *                                 Sandpack playground runs it. Signal inputs,
 *                                 outputs and queries do not register here, so
 *                                 a runnable solution uses @Input/@Output.
 *            With no --mode, both run and both must pass.
 *
 * Styles are dropped (jsdom has no layout). jsdom also lacks matchMedia,
 * IntersectionObserver, ResizeObserver and real timers-to-paint, so a driver
 * that needs them must install its own fake and the answer must say so.
 *
 * The tools are not repo dependencies. Install them in a scratch dir and run
 * from there (module resolution starts at the current directory):
 *
 *   npm i react@19 react-dom@19 vue@3.5 @vue/compiler-sfc@3.5 esbuild jsdom typescript@6 \
 *     @angular/{core,common,compiler,compiler-cli,platform-browser,forms}@22 rxjs@7 zone.js@0.16
 *   node <repo>/scripts/verify-mc-solution.mjs --fw react|vue|angular <dir> [driver.mjs]
 *
 * A driver is `export default async (ctx) => {}` with ctx =
 *   { fw, document, root, settle, text, $, $$, click, input, key, log }
 * where click/input/key dispatch real DOM events and then settle (inside
 * React's act() for react), `input(el, value)` uses the native value setter
 * so React, Vue and Angular all see the change, and `text()` is the whole
 * app's whitespace-collapsed textContent.
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { resolve, join, dirname, relative } from "path";
import { readFileSync, writeFileSync, rmSync, existsSync, mkdtempSync, readdirSync, statSync, mkdirSync, copyFileSync } from "fs";
import { execFileSync } from "child_process";

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? undefined : argv[i + 1]; };
const fw = flag("--fw");
const mode = flag("--mode");
const positional = argv.filter((a, i) => !a.startsWith("--") && !["--fw", "--mode"].includes(argv[i - 1]));
const [dirArg, driverArg] = positional;
if (!["react", "vue", "angular"].includes(fw) || !dirArg) {
  console.log("usage: verify-mc-solution.mjs --fw react|vue|angular [--mode app|playground] <dir> [driver.mjs]");
  process.exit(2);
}
const dir = resolve(dirArg);

// Angular with no mode: run both, each in its own process (separate globals).
if (fw === "angular" && !mode) {
  let ok = true;
  for (const m of ["app", "playground"]) {
    try {
      execFileSync(process.execPath, [process.argv[1], "--fw", "angular", "--mode", m, dir, ...(driverArg ? [resolve(driverArg)] : [])], { stdio: "inherit" });
    } catch { ok = false; }
  }
  process.exit(ok ? 0 : 1);
}

let root = process.cwd();
const marker = { react: "react-dom", vue: "vue", angular: "@angular/core" }[fw];
while (!existsSync(join(root, "node_modules", marker)) && resolve(root, "..") !== root) root = resolve(root, "..");
const req = createRequire(join(root, "package.json"));
const { build } = req("esbuild");
const { JSDOM } = req("jsdom");

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? (f === "node_modules" ? [] : walk(p)) : [p];
});

// ── DOM ──────────────────────────────────────────────────────────────────────
const mountHtml = { react: '<div id="root"></div>', vue: '<div id="app"></div>', angular: "<app-root></app-root>" }[fw];
const dom = new JSDOM(`<!doctype html><html><head></head><body>${mountHtml}</body></html>`, { pretendToBeVisual: true, url: "http://localhost/" });
for (const k of Object.getOwnPropertyNames(dom.window)) {
  if (k in globalThis && !["window", "document", "navigator", "localStorage", "sessionStorage", "location", "history", "Event", "EventTarget", "CustomEvent", "MessageEvent", "AbortController", "AbortSignal"].includes(k)) continue;
  if (k.startsWith("_") || k === "self" || k === "globalThis") continue;
  try { Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true }); } catch {}
}
globalThis.window = dom.window;
if (fw === "react") globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let consoleErrors = 0;
const origError = console.error;
console.error = (...a) => { consoleErrors++; origError(...a); };

// ── Bundle ───────────────────────────────────────────────────────────────────
const out = resolve(".mc-out-" + process.pid + ".mjs");
const cleanup = [out];
const common = {
  bundle: true, format: "esm", platform: "neutral", mainFields: ["module", "main"], conditions: ["browser"],
  nodePaths: [join(root, "node_modules")], outfile: out, logLevel: "error",
  loader: { ".css": "empty", ".svg": "text", ".png": "dataurl" },
  define: { "process.env.NODE_ENV": '"development"', __VUE_OPTIONS_API__: "true", __VUE_PROD_DEVTOOLS__: "false", __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false" },
};

async function bundleReact() {
  const app = ["App.js", "App.jsx", "App.tsx", "src/App.js"].map((f) => join(dir, f)).find(existsSync);
  if (!app) throw new Error("no App.js in " + dir);
  await build({
    ...common,
    stdin: {
      contents: `import { StrictMode, createElement, act } from "react"; import { createRoot } from "react-dom/client";
        import App from ${JSON.stringify(app)};
        export { act };
        export const run = async () => { const r = createRoot(document.getElementById("root"));
          await act(async () => r.render(createElement(StrictMode, null, createElement(App)))); return r; };`,
      resolveDir: dir, loader: "js",
    },
    loader: { ...common.loader, ".js": "jsx" }, jsx: "automatic",
  });
}

async function bundleVue() {
  const { parse, compileScript, compileTemplate } = req("@vue/compiler-sfc");
  const app = join(dir, "src", "App.vue");
  if (!existsSync(app)) throw new Error("no src/App.vue in " + dir);
  let n = 0;
  const vuePlugin = {
    name: "vue-sfc",
    setup(b) {
      b.onLoad({ filter: /\.vue$/ }, (args) => {
        const source = readFileSync(args.path, "utf8");
        const filename = relative(dir, args.path);
        const { descriptor, errors } = parse(source, { filename });
        if (errors.length) return { errors: errors.map((e) => ({ text: `${filename}: ${e.message}` })) };
        const id = "mc" + n++;
        let code, lang = "js";
        try {
          if (descriptor.script || descriptor.scriptSetup) {
            const s = compileScript(descriptor, { id, inlineTemplate: true, isProd: false, genDefaultAs: "__sfc__" });
            lang = descriptor.scriptSetup?.lang || descriptor.script?.lang || "js";
            code = s.content;
            if (!descriptor.scriptSetup && descriptor.template) {
              const t = compileTemplate({ source: descriptor.template.content, filename, id });
              if (t.errors.length) throw new Error(t.errors.join("\n"));
              code += "\n" + t.code.replace("export function render", "function render") + "\n__sfc__.render = render;";
            }
            code += "\nexport default __sfc__;";
          } else {
            const t = compileTemplate({ source: descriptor.template.content, filename, id });
            if (t.errors.length) throw new Error(t.errors.join("\n"));
            code = t.code + "\nexport default { render };";
          }
        } catch (e) {
          return { errors: [{ text: `${filename}: SFC COMPILE FAILED: ${e.message || e}` }] };
        }
        return { contents: code, loader: lang === "ts" ? "ts" : "js", resolveDir: dirname(args.path) };
      });
    },
  };
  await build({
    ...common,
    stdin: {
      contents: `import { createApp, nextTick } from "vue"; import App from ${JSON.stringify(app)};
        export { nextTick };
        export const run = async () => { const a = createApp(App); a.mount("#app"); return a; };`,
      resolveDir: dir, loader: "js",
    },
    plugins: [vuePlugin],
  });
}

async function bundleAngular() {
  const appDir = join(dir, "src", "app");
  if (!existsSync(join(appDir, "app.component.ts"))) throw new Error("no src/app/app.component.ts in " + dir);
  let entry = join(appDir, "app.component.ts");
  if (mode === "app") {
    const work = mkdtempSync(join(root, ".mcng-"));
    cleanup.push(work);
    const tsFiles = walk(appDir).filter((f) => f.endsWith(".ts"));
    for (const f of tsFiles) {
      const to = join(work, "src", relative(appDir, f));
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(f, to);
    }
    writeFileSync(join(work, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "ES2022", moduleResolution: "bundler", outDir: "out", rootDir: "src", strict: true, skipLibCheck: true, typeRoots: [] },
      include: ["src/**/*.ts"],
      angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true },
    }));
    try {
      execFileSync(process.execPath, [join(root, "node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js"), "-p", join(work, "tsconfig.json")], { stdio: "pipe" });
    } catch (e) {
      console.log("NGC FAILED:\n" + (e.stdout?.toString() || "") + (e.stderr?.toString() || e.message));
      for (const c of cleanup) rmSync(c, { recursive: true, force: true });
      process.exit(1);
    }
    entry = join(work, "out", "app.component.js");
  }
  await build({
    ...common,
    stdin: {
      contents: `import "zone.js"; import "@angular/compiler"; import { bootstrapApplication } from "@angular/platform-browser";
        import { AppComponent } from ${JSON.stringify(entry)};
        export const run = () => bootstrapApplication(AppComponent);`,
      resolveDir: root, loader: "ts",
    },
    tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
  });
}

const tag = fw === "angular" ? `angular:${mode}` : fw;
try {
  await ({ react: bundleReact, vue: bundleVue, angular: bundleAngular })[fw]();
} catch (e) {
  console.log(`[${tag}] BUILD FAILED: ${e.message?.split("\n").slice(0, 8).join("\n")}`);
  for (const c of cleanup) rmSync(c, { recursive: true, force: true });
  process.exit(1);
}

// ── Mount + drive ────────────────────────────────────────────────────────────
let failed = false;
try {
  const mod = await import(pathToFileURL(out).href);
  const host = document.querySelector({ react: "#root", vue: "#app", angular: "app-root" }[fw]);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const settle = fw === "react" ? (ms = 30) => mod.act(async () => { await wait(ms); }) : (ms = 30) => wait(ms);
  const fire = async (fn) => { if (fw === "react") await mod.act(async () => { fn(); }); else fn(); await settle(); };
  const text = () => host.textContent.replace(/\s+/g, " ").trim();
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const ctx = {
    fw, document, root: host, settle, text, $, $$,
    log: (...a) => console.log(`[${tag}]`, ...a),
    click: (el) => fire(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))),
    key: (el, key, opts = {}) => fire(() => {
      el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true, ...opts }));
    }),
    input: (el, value) => fire(() => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }),
  };
  const app = await mod.run();
  await settle();
  console.log(`[${tag}] RENDERED: ${text()}`);
  if (driverArg) {
    const d = await import(pathToFileURL(resolve(driverArg)).href);
    await d.default(ctx);
  }
  if (fw === "react") await mod.act(async () => app.unmount());
  else if (fw === "vue") app.unmount();
  else app.destroy();
} catch (e) {
  failed = true;
  console.log(`[${tag}] RUNTIME ERROR: ${e?.stack?.split("\n").slice(0, 6).join("\n") || e}`);
} finally {
  for (const c of cleanup) rmSync(c, { recursive: true, force: true });
}
if (consoleErrors) console.log(`[${tag}] console.error was called ${consoleErrors} time(s)`);
process.exit(failed ? 1 : 0);
