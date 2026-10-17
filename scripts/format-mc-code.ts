/**
 * Formats the code in the Frontend Machine Coding augment files with Prettier:
 * every fenced code block inside each framework answer, and every solution
 * file. Fences tagged text are verified output and are left byte for byte as
 * they are; an untagged fence is output too and gets the text tag.
 *
 *   npx tsx scripts/format-mc-code.ts [--check] [--file <name>]
 *
 * Answer excerpts use a narrower print width than the solution files because
 * they render inside the reading column; the files open in the playground
 * editor. A snippet that is a fragment (class members, a template excerpt, a
 * function body) is wrapped so Prettier can parse it, then unwrapped. A
 * snippet that still does not parse is left alone and listed at the end.
 *
 * Templates are whitespace-sensitive: Vue condenses and Angular trims
 * whitespace, but a space Prettier adds inside an element still lands in its
 * text (textContent, an aria-live message). So every Vue and Angular template
 * that Prettier touched is compiled before and after with the frameworks' own
 * compilers, and kept exactly as written unless the compiled output is the
 * same. Point --lab at a folder whose node_modules has @vue/compiler-dom and
 * @angular/compiler (they are not dependencies of this app).
 *
 * The rewrite is surgical: only the string literals whose value changed are
 * replaced in the source file, so comments and layout around them survive.
 *
 *   npx tsx scripts/format-mc-code.ts --lab ../mclab [--check] [--file <name>]
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
import * as prettier from "prettier";

type Bundle = { answer: string; files: Record<string, string> };
type Augment = { title: string; frameworks?: Record<string, Bundle> };

const ANSWER_WIDTH = 72;
const FILE_WIDTH = 80;
const check = process.argv.includes("--check");
const fileFlag = process.argv.indexOf("--file");
const onlyFile = fileFlag === -1 ? undefined : process.argv[fileFlag + 1];
const skipped = new Set<string>();
const kept = new Set<string>();

const labFlag = process.argv.indexOf("--lab");
if (labFlag === -1) {
  console.log("usage: format-mc-code.ts --lab <dir with @vue/compiler-dom and @angular/compiler> [--check] [--file <name>]");
  process.exit(2);
}
const labRequire = createRequire(join(resolve(process.argv[labFlag + 1]), "package.json"));
const vueCompiler = labRequire("@vue/compiler-dom");
let ngCompiler: any;

/** Remove whitespace outside string literals, so only real changes remain. */
function squeeze(code: string): string {
  let out = "";
  let quote = "";
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      out += c;
      if (c === "\\") out += code[++i] ?? "";
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
    } else if (!/\s/.test(c)) out += c;
  }
  return out;
}

/** What Vue renders for a template: its compiled render function. */
function vueSignature(tpl: string): string {
  try {
    return squeeze(vueCompiler.compile(tpl, { whitespace: "condense", hoistStatic: false }).code);
  } catch (e) {
    return "ERROR " + tpl;
  }
}

/** What Angular renders for a template: its parsed nodes, without positions or raw source. */
function ngSignature(tpl: string): string {
  try {
    const r = ngCompiler.parseTemplate(tpl, "t.html", { preserveWhitespaces: false });
    if (r.errors?.length) return "ERROR " + tpl;
    const seen = new WeakSet();
    const walk = (v: any): any => {
      if (v === null || typeof v !== "object") return v;
      if (seen.has(v)) return "[ref]";
      seen.add(v);
      if (Array.isArray(v)) return v.map(walk);
      const o: Record<string, unknown> = { $: v.constructor?.name };
      for (const k of Object.keys(v).sort()) {
        if (/span|^source$|location|^start$|^end$|absoluteOffset|^i18n$/i.test(k)) continue;
        o[k] = walk(v[k]);
      }
      return o;
    };
    return JSON.stringify(walk(r.nodes));
  } catch (e) {
    return "ERROR " + tpl;
  }
}

// The top-level template block: from the first opening tag at a line start to
// the last closing tag (nested <template> elements sit inside it).
const sfcTemplate = (code: string) => /^<template\b[\s\S]*<\/template>/m.exec(code)?.[0] ?? "";
const ngTemplates = (code: string) => [...code.matchAll(/\btemplate:\s*`((?:\\.|[^`\\])*)`/g)].map((m) => m[1]);
const sameNg = (a: string, b: string) => {
  const x = ngTemplates(a);
  const y = ngTemplates(b);
  return x.length === y.length && x.every((t, i) => t === y[i] || ngSignature(t) === ngSignature(y[i]));
};

/**
 * The whitespace-safe fallback for a template Prettier may not reflow: a line
 * that is too long and starts with an element's opening tag gets one attribute
 * per line. Whitespace inside a tag is never text, so what renders is the
 * same; the text after the tag stays glued to its closing ">".
 */
function breakTags(tpl: string, width: number): string {
  return tpl
    .split("\n")
    .map((line) => {
      const m = /^(\s*)<([A-Za-z][\w.-]*)(?=[\s/>])/.exec(line);
      if (!m || line.length <= width) return line;
      const [, ind, tag] = m;
      const attrs: string[] = [];
      let i = m[0].length;
      let cur = "";
      let quote = "";
      for (; i < line.length; i++) {
        const c = line[i];
        if (quote) {
          cur += c;
          if (c === quote) quote = "";
        } else if (c === '"' || c === "'") {
          quote = c;
          cur += c;
        } else if (c === ">" || (c === "/" && line[i + 1] === ">")) break;
        else if (/\s/.test(c)) {
          if (cur) attrs.push(cur);
          cur = "";
        } else cur += c;
      }
      if (cur) attrs.push(cur);
      if (i >= line.length || attrs.length < 2) return line;
      return [`${ind}<${tag}`, ...attrs.map((a) => `${ind}  ${a}`), ind + line.slice(i)].join("\n");
    })
    .join("\n");
}

/** Apply breakTags inside every inline Angular template of a TypeScript file. */
const breakNgTemplates = (code: string, width: number) =>
  code.replace(/(\btemplate:\s*`)((?:\\.|[^`\\])*)(`)/g, (_m, a, tpl, b) => a + breakTags(tpl, width) + b);

let embedded: "auto" | "off" = "auto";

const base = (parser: string, printWidth: number): prettier.Options => ({
  parser,
  printWidth,
  embeddedLanguageFormatting: embedded,
});

async function tryFormat(code: string, parser: string, width: number): Promise<string | null> {
  try {
    return (await prettier.format(code, base(parser, width))).replace(/\n+$/, "");
  } catch {
    return null;
  }
}

// Lines inside a template literal are not re-indented by Prettier, so a wrapped
// fragment is indented first: then removing that indent restores them exactly.
const indent = (code: string, n: number) => code.replace(/^(?=.)/gm, " ".repeat(n));
const dedent = (lines: string[], n: number) => lines.map((l) => (l.startsWith(" ".repeat(n)) ? l.slice(n) : l));

/** Wrap a fragment, format it, and take the fragment back out. */
async function wrapped(code: string, parser: string, width: number): Promise<string | null> {
  const wraps: { pre: string; post: string; strip: [number, number]; indent: number }[] = [
    { pre: "class __W__ {\n", post: "\n}", strip: [1, 1], indent: 2 },
    { pre: "function __w__() {\n", post: "\n}", strip: [1, 1], indent: 2 },
    { pre: "const __o__ = {\n", post: "\n};", strip: [1, 1], indent: 2 },
    { pre: "const __x__ = (\n<>\n", post: "\n</>\n);", strip: [2, 2], indent: 4 },
    // An excerpt that ends with the closing brace of its class or function.
    { pre: "class __W__ {\n", post: "", strip: [1, 1], indent: 2 },
    { pre: "function __w__() {\n", post: "", strip: [1, 1], indent: 2 },
  ];
  for (const w of wraps) {
    if (w.pre.includes("<>") && !/^\s*[<{]/.test(code)) continue;
    const out = await tryFormat(w.pre + indent(code, w.indent) + w.post, parser, width + w.indent);
    if (out === null) continue;
    const lines = out.split("\n");
    if (lines.length <= w.strip[0] + w.strip[1]) continue;
    const head = lines.slice(0, w.strip[0]).join("\n");
    if (!head.includes("__")) continue;
    return dedent(lines.slice(w.strip[0], lines.length - w.strip[1]), w.indent).join("\n");
  }
  return null;
}


/**
 * Prettier never touches comments, so a long `//` comment stays long. Reflow
 * own-line `//` comments to the width, and move a trailing comment that makes
 * its line too long onto its own line above. A small scanner keeps this out of
 * strings, template literals (inline Angular templates) and block comments.
 */
function reflowComments(code: string, width: number): string {
  const out: string[] = [];
  let state: "code" | "block" | "tpl" = "code";
  // Balanced wrap: as many lines as the width needs, filled evenly, so a
  // comment never ends on an orphan word or two.
  const wrap = (indent: string, text: string) => {
    const words = text.split(/\s+/).filter(Boolean);
    const greedy = (limit: number) => {
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        if (cur && (cur + " " + w).length > limit) {
          lines.push(cur);
          cur = w;
        } else cur = cur ? cur + " " + w : w;
      }
      if (cur) lines.push(cur);
      return lines;
    };
    const room = Math.max(20, width - indent.length - 3);
    const n = greedy(room).length;
    let best = greedy(room);
    for (let limit = Math.ceil(text.length / n); limit <= room; limit++) {
      const lines = greedy(limit);
      if (lines.length === n) { best = lines; break; }
    }
    return best.map((l) => indent + "// " + l);
  };
  for (const line of code.split("\n")) {
    const startState = state;
    let commentAt = -1;
    let quote = "";
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (state === "block") {
        if (c === "*" && line[i + 1] === "/") { state = "code"; i++; }
        continue;
      }
      if (state === "tpl") {
        if (c === "\\") i++;
        else if (c === "`") state = "code";
        continue;
      }
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = "";
        continue;
      }
      if (c === '"' || c === "'") quote = c;
      else if (c === "`") state = "tpl";
      else if (c === "/" && line[i + 1] === "*") { state = "block"; i++; }
      else if (c === "/" && line[i + 1] === "/") { commentAt = i; break; }
      else if (c === "/" && /[=(,:!&|?{};]\s*$|^\s*$/.test(line.slice(0, i)) ) {
        // A regex literal: skip to its closing slash.
        for (i++; i < line.length && line[i] !== "/"; i++) if (line[i] === "\\") i++;
      }
    }
    if (startState !== "code" || commentAt === -1 || line.length <= width || line.slice(commentAt + 2).startsWith("/")) {
      out.push(line);
      continue;
    }
    const indent = /^\s*/.exec(line)![0];
    const before = line.slice(0, commentAt).trimEnd();
    const text = line.slice(commentAt + 2).trim();
    if (/^(eslint|@ts-|prettier-ignore)/.test(text)) { out.push(line); continue; }
    out.push(...wrap(indent, text));
    if (before.trim()) out.push(before);
  }
  return out.join("\n");
}

/** Reflow comments only inside the <script> blocks of a Vue SFC. */
function reflowVue(code: string, width: number): string {
  return code.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g, (_m, a, body, b) => a + reflowComments(body, width) + b);
}

const FENCE_PARSER: Record<string, string> = {
  js: "babel", jsx: "babel", javascript: "babel",
  ts: "typescript", tsx: "typescript", typescript: "typescript",
  vue: "vue", css: "css", json: "json",
};

/** Format a whole snippet, trying the fragment wrappers; null if it never parses. */
async function formatWhole(body: string, parser: string, fw: string): Promise<string | null> {
  // A Vue template excerpt is formatted as the template of an SFC.
  if (parser === "vue" && !/^\s*<(template|script|style)\b/m.test(body)) {
    const out = await tryFormat(`<template>\n${indent(body, 2)}\n</template>`, "vue", ANSWER_WIDTH + 2);
    return out === null ? null : dedent(out.split("\n").slice(1, -1), 2).join("\n");
  }
  // An Angular template excerpt under a ts fence.
  if (parser === "typescript" && fw === "angular" && body.trimStart().startsWith("<")) {
    const t = await tryFormat(body, "angular", ANSWER_WIDTH);
    if (t !== null) return t;
  }
  const direct = await tryFormat(body, parser, ANSWER_WIDTH);
  if (direct !== null || (parser !== "babel" && parser !== "typescript")) return direct;
  // "..." or "…" on a line of its own marks elided code: hide it in a comment.
  const elided: string[] = [];
  const hidden = body.replace(/^([ \t]*)(\.\.\.|…)[ \t]*$/gm, (_m, ind, tok) => {
    elided.push(tok);
    return `${ind}// __ELIDED__`;
  });
  const restore = (s: string) => s.replace(/\/\/ __ELIDED__/g, () => elided.shift() ?? "...");
  if (elided.length) {
    const d = await tryFormat(hidden, parser, ANSWER_WIDTH);
    if (d !== null) return restore(d);
  }
  const w = await wrapped(hidden, parser, ANSWER_WIDTH);
  return w === null ? null : restore(w);
}

async function formatSnippet(code: string, lang: string, fw: string, where: string): Promise<string> {
  const body = code.replace(/\n$/, "");
  let out = await formatSnippetCode(code, lang, fw, where);
  // Templates keep their exact whitespace unless the compiled result is unchanged.
  if (lang === "html" || (lang === "vue" && !/^\s*<(template|script|style)\b/m.test(body))) {
    const sig = fw === "angular" ? ngSignature : vueSignature;
    if (out !== body && sig(out) !== sig(body)) {
      kept.add(where);
      const safe = breakTags(body, ANSWER_WIDTH);
      return sig(safe) === sig(body) ? safe : body;
    }
  } else if (lang === "vue") {
    const [x, y] = [sfcTemplate(body), sfcTemplate(out)];
    if (x && x !== y && vueSignature(x) !== vueSignature(y)) {
      kept.add(where);
      const safe = breakTags(x, ANSWER_WIDTH);
      out = out.replace(y, () => (vueSignature(safe) === vueSignature(x) ? safe : x));
    }
  } else if (fw === "angular" && (lang === "ts" || lang === "typescript") && !sameNg(body, out)) {
    embedded = "off";
    out = breakNgTemplates(await formatSnippetCode(code, lang, fw, where), ANSWER_WIDTH);
    embedded = "auto";
    kept.add(where);
    if (!sameNg(body, out)) out = body;
  }
  // Prettier ends a top-level JSX excerpt with ";" (and may lead with one);
  // the excerpt is markup, not a statement, so drop them.
  if (lang === "jsx" || lang === "js") out = out.replace(/^(\/>|<\/[\w.]*>|<[\w.]+[^\n]*\/>);$/gm, "$1").replace(/^;(<)/gm, "$1");
  if (["js", "jsx", "javascript", "ts", "tsx", "typescript"].includes(lang)) return reflowComments(out, ANSWER_WIDTH);
  if (lang === "vue") return reflowVue(out, ANSWER_WIDTH);
  return out;
}

async function formatSnippetCode(code: string, lang: string, fw: string, where: string): Promise<string> {
  let parser = FENCE_PARSER[lang];
  if (lang === "html") parser = fw === "angular" ? "angular" : fw === "vue" ? "vue" : "html";
  const body = code.replace(/\n$/, "");
  if (!parser) return body;
  const whole = await formatWhole(body, parser, fw);
  if (whole !== null) return whole;
  // An excerpt that stops part-way (it ends inside a JSX tree, say): format the
  // longest run of leading lines that parses and keep the rest as written.
  const lines = body.split("\n");
  for (let k = lines.length - 1; k >= 2; k--) {
    if (lines[k - 1].trim() === "" || /^\s/.test(lines[k] ?? "") && /^\s/.test(lines[k - 1])) continue;
    const head = await formatWhole(lines.slice(0, k).join("\n").replace(/\s+$/, ""), parser, fw);
    if (head !== null) return head + "\n" + lines.slice(k).join("\n");
  }
  skipped.add(where);
  return body;
}

async function formatAnswer(answer: string, fw: string, title: string): Promise<string> {
  const re = /^(~~~|```)([\w-]*)[^\n]*\n([\s\S]*?)^\1[ \t]*$/gm;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer))) {
    const [whole, fence, lang, code] = m;
    // An untagged fence in these answers is always verified output: tag it
    // text so the page labels it "Output" and gives it the output colours.
    const open = lang ? whole.slice(0, whole.indexOf("\n") + 1) : fence + "text\n";
    const formatted = await formatSnippet(code, lang.toLowerCase(), fw, `${title} [${fw}] ~~~${lang} @${m.index}`);
    out += answer.slice(last, m.index) + open + formatted + "\n" + fence;
    last = m.index + whole.length;
  }
  return out + answer.slice(last);
}

const FILE_PARSER: Record<string, string> = {
  js: "babel", jsx: "babel", mjs: "babel", ts: "typescript", tsx: "typescript",
  vue: "vue", css: "css", json: "json", html: "html",
};

async function formatFile(path: string, code: string, where: string): Promise<string> {
  const parser = FILE_PARSER[path.split(".").pop() ?? ""];
  if (!parser) return code;
  try {
    let out = await prettier.format(code, base(parser, FILE_WIDTH));
    if (parser === "vue") {
      const [x, y] = [sfcTemplate(code), sfcTemplate(out)];
      if (x && x !== y && vueSignature(x) !== vueSignature(y)) {
        kept.add(`${where} ${path}`);
        const safe = breakTags(x, FILE_WIDTH);
        out = out.replace(y, () => (vueSignature(safe) === vueSignature(x) ? safe : x));
      }
      return reflowVue(out, FILE_WIDTH);
    }
    if (parser === "typescript" && /\btemplate:\s*`/.test(code) && !sameNg(code, out)) {
      embedded = "off";
      out = breakNgTemplates(await prettier.format(code, base(parser, FILE_WIDTH)), FILE_WIDTH);
      embedded = "auto";
      kept.add(`${where} ${path}`);
      if (!sameNg(code, out)) return code;
    }
    if (parser === "babel" || parser === "typescript") return reflowComments(out, FILE_WIDTH);
    return out;
  } catch (e) {
    skipped.add(`${where} ${path}: ${(e as Error).message.split("\n")[0]}`);
    return code;
  }
}

/** The source text of a template literal holding `s`, as the augment files write it. */
const asTemplate = (s: string) => "`" + s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";

async function main() {
  ngCompiler = await import(pathToFileURL(labRequire.resolve("@angular/compiler")).href);
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^machine-coding-augments-ultra-\d+\.ts$/.test(f))
    .filter((f) => !onlyFile || f === onlyFile)
    .sort();
  let changedStrings = 0;
  const missing: string[] = [];
  for (const f of files) {
    const path = join(dir, f);
    let src = readFileSync(path, "utf8");
    const mod = await import(pathToFileURL(path).href);
    for (const a of (mod.default ?? []) as Augment[]) {
      for (const [fw, b] of Object.entries(a.frameworks ?? {})) {
        // A hoisted comment can move Prettier's choices, so format to a fixed point.
        const settle = async (x: string, f: (s: string) => Promise<string>) => {
          for (let i = 0; i < 3; i++) {
            const y = await f(x);
            if (y === x) break;
            x = y;
          }
          return x;
        };
        const pairs: [string, string][] = [[b.answer, await settle(b.answer, (s) => formatAnswer(s, fw, a.title))]];
        for (const [p, code] of Object.entries(b.files)) pairs.push([code, await settle(code, (s) => formatFile(p, s, `${a.title} [${fw}]`))]);
        for (const [before, after] of pairs) {
          if (before === after) continue;
          // A file shared by several bundles (one const, or the same text written
          // twice) formats to the same result, so every copy is replaced.
          const from = asTemplate(before);
          const to = asTemplate(after);
          let at = src.indexOf(from);
          if (at === -1) {
            if (!src.includes(to)) missing.push(`${f}: ${a.title} [${fw}] (literal not found)`);
            continue;
          }
          while (at !== -1) {
            if (src[at - 1] !== "\\") {
              src = src.slice(0, at) + to + src.slice(at + from.length);
              changedStrings++;
              at = src.indexOf(from, at + to.length);
            } else at = src.indexOf(from, at + 1);
          }
        }
      }
    }
    if (!check) writeFileSync(path, src);
  }
  console.log(`${check ? "Would change" : "Changed"} ${changedStrings} string(s) in ${files.length} file(s).`);
  if (missing.length) console.log(`Could not place ${missing.length}:\n  ${missing.join("\n  ")}`);
  if (kept.size) console.log(`${kept.size} template(s) only had long tags split (Prettier would change their whitespace).`);
  if (skipped.size) console.log(`Left unformatted ${skipped.size}:\n  ${[...skipped].join("\n  ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
