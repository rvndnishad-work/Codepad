/**
 * Mounts a Vue interview-question example and prints what it renders, so the
 * "Verified" output quoted in prisma/data/vue-augments-ultra-*.ts is real
 * output, not memory.
 *
 * The file is treated as the playground's /src/App.vue: it is compiled with
 * @vue/compiler-sfc (script setup inlined into the render function, the way
 * vue-loader and @vitejs/plugin-vue compile it), bundled with esbuild and
 * mounted with createApp(App).mount("#app") in jsdom. Styles are dropped.
 *
 *   --ssr   Render on the server instead with @vue/server-renderer's
 *           renderToString and print the HTML.
 *
 * Vue is not a dependency of this repo, so install it in a scratch dir and run
 * from there (module resolution starts at the current directory):
 *
 *   mkdir /tmp/vlab && cd /tmp/vlab && npm init -y && npm i vue@3.5 \
 *     @vue/compiler-sfc@3.5 @vue/server-renderer@3.5 jsdom esbuild
 *   node <repo>/scripts/verify-vue-example.mjs [--ssr] App.vue [driver.mjs]
 *
 * A driver is `export default async ({ document, app, settle, text, nextTick }) => {}`.
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { resolve, join } from "path";
import { readFileSync, writeFileSync, rmSync, existsSync } from "fs";

const args = process.argv.slice(2);
const ssr = args.includes("--ssr");
const [file, driver] = args.filter((a) => !a.startsWith("--"));

// Resolve tools from the scratch dir: the nearest directory at or above the
// current one that has vue installed.
let root = process.cwd();
while (!existsSync(join(root, "node_modules/vue")) && resolve(root, "..") !== root) root = resolve(root, "..");
const req = createRequire(join(root, "package.json"));
const { parse, compileScript, compileTemplate } = req("@vue/compiler-sfc");
const { build } = req("esbuild");
const { JSDOM } = req("jsdom");

const source = readFileSync(resolve(file), "utf8");
const { descriptor, errors } = parse(source, { filename: "App.vue" });
if (errors.length) {
  console.log("SFC PARSE FAILED:\n" + errors.map((e) => e.message).join("\n"));
  process.exit(1);
}

let code;
let lang = "js";
try {
  if (descriptor.script || descriptor.scriptSetup) {
    const script = compileScript(descriptor, { id: "app", inlineTemplate: true, isProd: false, genDefaultAs: "__sfc__" });
    lang = descriptor.scriptSetup?.lang || descriptor.script?.lang || "js";
    code = script.content;
    // A classic <script> with a separate <template> still needs its render function.
    if (!descriptor.scriptSetup && descriptor.template) {
      const t = compileTemplate({ source: descriptor.template.content, filename: "App.vue", id: "app", ssr: false });
      if (t.errors.length) throw new Error(t.errors.join("\n"));
      code += "\n" + t.code.replace("export function render", "function render") + "\n__sfc__.render = render;";
    }
    code += "\nexport default __sfc__;";
  } else {
    const t = compileTemplate({ source: descriptor.template.content, filename: "App.vue", id: "app" });
    if (t.errors.length) throw new Error(t.errors.join("\n"));
    code = t.code + "\nexport default { render };";
  }
} catch (e) {
  console.log("SFC COMPILE FAILED:\n" + (e.message || e));
  process.exit(1);
}

const compiled = resolve(".app-" + process.pid + "." + (lang === "ts" ? "ts" : "js"));
writeFileSync(compiled, code);

const entry = ssr
  ? `import { createSSRApp } from "vue"; import { renderToString } from "@vue/server-renderer";
     import App from ${JSON.stringify(compiled)};
     export const run = () => { const app = createSSRApp(App); return renderToString(app).then((html) => ({ app, html })); };`
  : `import { createApp, nextTick } from "vue"; import App from ${JSON.stringify(compiled)};
     export { nextTick };
     export const run = () => { const app = createApp(App); app.mount("#app"); return app; };`;
const out = resolve(".out-" + process.pid + ".mjs");
await build({
  stdin: { contents: entry, resolveDir: root, loader: "js" },
  nodePaths: [join(root, "node_modules")],
  bundle: true, format: "esm", platform: ssr ? "node" : "neutral", mainFields: ["module", "main"],
  conditions: ssr ? ["node"] : ["browser"], outfile: out, logLevel: "error",
  define: { __VUE_OPTIONS_API__: "true", __VUE_PROD_DEVTOOLS__: "false", __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false", "process.env.NODE_ENV": '"development"' },
});

if (!ssr) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', { pretendToBeVisual: true, url: "http://localhost/" });
  for (const k of ["window", "document", "navigator", "Node", "Element", "HTMLElement", "SVGElement", "Event", "MouseEvent", "KeyboardEvent", "CustomEvent", "InputEvent", "FocusEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MutationObserver", "HTMLInputElement", "Text", "Comment", "DocumentFragment"]) {
    try { globalThis[k] = dom.window[k]; } catch {}
  }
}

try {
  const mod = await import(pathToFileURL(out).href);
  if (ssr) {
    const { html } = await mod.run();
    console.log(`[ssr] HTML: ${html}`);
  } else {
    const app = mod.run();
    const settle = () => new Promise((r) => setTimeout(r, 30));
    const text = () => document.querySelector("#app").textContent.replace(/\s+/g, " ").trim();
    await settle();
    console.log(`[app] RENDERED: ${text()}`);
    if (driver) {
      const d = await import(pathToFileURL(resolve(driver)).href);
      await d.default({ document, app, settle, text, nextTick: mod.nextTick });
    }
    app.unmount();
  }
} finally {
  rmSync(out, { force: true });
  rmSync(compiled, { force: true });
}
process.exit(0);
