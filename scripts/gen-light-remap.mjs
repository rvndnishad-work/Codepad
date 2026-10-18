#!/usr/bin/env node
/**
 * Generates src/app/light-remap.css.
 *
 * Much of the app was written for the dark ground with raw Tailwind palette
 * classes (`text-emerald-400`, `bg-white/5`, `border-zinc-800`, ...). Those
 * mid-tones and white overlays vanish or drop to ~2:1 on the light Clay
 * ground. Rather than hand-editing hundreds of files, this script scans the
 * source for every such class (with its variants) and emits a light-only
 * override that swaps it for a legible light equivalent: deeper text shades,
 * navy overlays instead of white ones, token surfaces instead of zinc-900.
 *
 * Dark mode is untouched (every rule is scoped to `:root:not(.dark)`), and so
 * is anything inside a fixed-dark surface (`.ip-on-dark`, `.keep-dark`).
 *
 * Run `npm run gen:light-remap` after adding raw palette classes. New code
 * should prefer tokens (`text-success`, `bg-fg/5`, `border-border`) instead.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const colors = require("tailwindcss/colors");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(SRC, "app", "light-remap.css");

const HUES = ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
const NEUTRALS = ["zinc", "slate", "gray", "neutral", "stone"];
const PALE_HUES = new Set(["amber", "yellow", "lime", "orange"]);

const PROPS = {
  text: "color",
  bg: "background-color",
  border: "border-color",
  "border-t": "border-top-color",
  "border-b": "border-bottom-color",
  "border-l": "border-left-color",
  "border-r": "border-right-color",
  "border-x": "border-color",
  "border-y": "border-color",
  divide: "border-color",
  ring: "--tw-ring-color",
  fill: "fill",
  stroke: "stroke",
  decoration: "text-decoration-color",
};

const MEDIA = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };
const PSEUDO = {
  hover: ":hover",
  focus: ":focus",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
  disabled: ":disabled",
  first: ":first-child",
  last: ":last-child",
};

const EXCLUDE = ":not(:where(.ip-on-dark, .ip-on-dark *, .keep-dark, .keep-dark *, .ip-invert *, .dark *))";

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
};
const alpha = (a) => (a == null ? 1 : Math.min(1, a));

/** Returns the light-theme CSS value for a class body, or null to leave it. */
function remap(prop, color, shade, a) {
  const pa = a == null ? null : a / 100;
  const isText = prop === "text" || prop === "fill" || prop === "stroke" || prop === "decoration";
  const isBorder = prop.startsWith("border") || prop === "divide" || prop === "ring";

  if (color === "white") {
    if (pa == null) return null; // solid white is a deliberate fill or text-on-fill
    if (isText) return `rgb(var(--c-fg) / ${alpha(pa * 1.2 + 0.1).toFixed(2)})`;
    if (isBorder) return `rgb(var(--c-fg) / ${alpha(pa * 1.2).toFixed(2)})`;
    if (prop === "bg") return pa <= 0.2 ? `rgb(var(--c-fg) / ${(pa * 0.7).toFixed(3)})` : null; // higher alphas are frosted glass
    return null;
  }

  if (NEUTRALS.includes(color)) {
    const s = Number(shade);
    if (isText) {
      if (s <= 200) return withA("var(--c-fg)", pa);
      if (s <= 400) return withA("var(--c-muted)", pa);
      if (s <= 500) return withA("var(--c-subtle)", pa);
      return null;
    }
    if (isBorder) {
      if (s >= 600) return withA("var(--c-border-strong)", pa);
      return null;
    }
    if (prop === "bg") {
      if (s >= 900) return withA("var(--c-surface)", pa);
      if (s >= 700) return withA("var(--c-panel)", pa);
      return null;
    }
    return null;
  }

  if (HUES.includes(color)) {
    const s = Number(shade);
    if (isText) {
      if (s > 500) return null;
      const target = PALE_HUES.has(color) ? 800 : 700;
      return withA(hexToRgb(colors[color][target]), pa);
    }
    if (prop === "bg" && s >= 800) return withA(hexToRgb(colors[color][100]), pa);
    if (isBorder && s >= 800) return withA(hexToRgb(colors[color][300]), pa);
    return null;
  }
  return null;
}

function withA(channels, pa) {
  const inner = channels.startsWith("var(") ? channels : channels;
  return `rgb(${inner} / ${pa == null ? 1 : pa})`;
}

const esc = (cls) => cls.replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c);

const CLASS_RE = new RegExp(
  String.raw`(?<![\w:/-])((?:[a-z0-9-]+:)*)(!?)(` +
    Object.keys(PROPS).sort((a, b) => b.length - a.length).join("|") +
    String.raw`)-(white|` + [...HUES, ...NEUTRALS].join("|") + String.raw`)(?:-(\d{2,3}))?(?:\/(\d{1,3}))?(?![\w/-])`,
  "g",
);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const rules = new Map(); // key: media -> Set(rule)
let count = 0;
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(CLASS_RE)) {
    const [full, variantStr, bang, prop, color, shade, a] = m;
    if (color !== "white" && !shade) continue;
    const variants = variantStr ? variantStr.slice(0, -1).split(":") : [];
    if (variants.includes("dark")) continue;
    const value = remap(prop, color, shade, a == null ? null : Number(a));
    if (!value) continue;

    let media = "";
    let pseudo = "";
    let groupHover = false;
    let placeholder = false;
    let ok = true;
    for (const v of variants) {
      if (MEDIA[v]) media = `(min-width: ${MEDIA[v]}px)`;
      else if (PSEUDO[v]) pseudo += PSEUDO[v];
      else if (v === "group-hover") groupHover = true;
      else if (v === "placeholder") placeholder = true;
      else ok = false;
    }
    if (!ok) continue;

    const cls = "." + esc(full);
    let sel = `:root:not(.dark) ${groupHover ? ".group:hover " : ""}${cls}${EXCLUDE}${pseudo}`;
    if (placeholder) sel += "::placeholder";
    if (prop === "divide") sel = `${sel} > :not([hidden]) ~ :not([hidden])`;
    const imp = bang ? " !important" : "";
    const decl = `${PROPS[prop]}: ${value}${imp};`;
    const rule = `${sel} { ${decl} }`;
    if (!rules.has(media)) rules.set(media, new Set());
    const set = rules.get(media);
    if (!set.has(rule)) {
      set.add(rule);
      count++;
    }
  }
}

let css = `/* GENERATED by scripts/gen-light-remap.mjs — do not edit by hand.
 * Light-theme overrides for raw Tailwind palette classes written for the dark
 * ground. Run \`npm run gen:light-remap\` to refresh. */\n\n`;
const order = ["", ...Object.values(MEDIA).map((w) => `(min-width: ${w}px)`)];
for (const media of order) {
  const set = rules.get(media);
  if (!set) continue;
  const body = [...set].sort().join("\n");
  css += media ? `@media ${media} {\n${body}\n}\n` : `${body}\n`;
}
fs.writeFileSync(OUT, css);
console.log(`wrote ${path.relative(ROOT, OUT)} (${count} rules)`);
