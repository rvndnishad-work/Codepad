/**
 * Content-safety checker for the JavaScript "ultra" answer files.
 *
 * Same rules as scripts/check-node-ultra.ts (that file's header explains the
 * "each discovered by actually breaking the renderer" origin of every rule
 * below) with one deliberate flip: JavaScript genuinely runs in the browser
 * playground, so at least one example must be runnable (not forbidden, like
 * Node's `runnable: false` requirement).
 *
 *   npx tsx scripts/check-js-ultra.ts [--no-db] [--file <name>]
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const NO_DB = process.argv.includes("--no-db");
const fileFlag = process.argv.indexOf("--file");
const onlyFile = fileFlag === -1 ? undefined : process.argv[fileFlag + 1];

type Augment = {
  title: string;
  answer?: string;
  description?: string;
  seoDescription?: string;
  examples?: { label?: string; code: string; runnable?: boolean; tech?: string }[];
};

type Problem = { title: string; file: string; rule: string; detail: string };
const problems: Problem[] = [];
const warn: Problem[] = [];

const fail = (title: string, file: string, rule: string, detail: string) =>
  problems.push({ title, file, rule, detail });
const soft = (title: string, file: string, rule: string, detail: string) =>
  warn.push({ title, file, rule, detail });

// ── SVG checks ─────────────────────────────────────────────────────────────

function svgBlocks(md: string): string[] {
  return [...md.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((m) => m[0]);
}

function checkSvg(title: string, file: string, md: string) {
  const blocks = svgBlocks(md);
  if (!blocks.length) return; // a diagram is not mandatory (§8: skip what does not fit)

  blocks.forEach((svg, i) => {
    const where = `svg #${i + 1}`;

    const apos = svg.indexOf("'");
    if (apos !== -1) {
      const ctx = svg.slice(Math.max(0, apos - 45), apos + 45).replace(/\n/g, " ");
      fail(title, file, "svg-apostrophe", `${where}: raw apostrophe — ...${ctx}...`);
    }

    const openTag = /<svg\b[^>]*>/.exec(svg)?.[0] ?? "";
    const hasPctWidth = /width\s*=\s*"100%"/.test(openTag);
    const hasDiagramClass = /class\s*=\s*"[^"]*\biq-diagram\b/.test(openTag);
    if (!hasPctWidth && !hasDiagramClass)
      fail(title, file, "svg-width", `${where}: needs width="100%" or class="iq-diagram"`);
    if (/\bwidth\s*=\s*"\d+"/.test(openTag))
      fail(title, file, "svg-fixed-width", `${where}: fixed pixel width on the <svg> tag`);

    const vb = /viewBox\s*=\s*"([\d.\-\s]+)"/.exec(svg);
    if (!vb) {
      fail(title, file, "svg-viewbox", `${where}: missing viewBox`);
      return;
    }
    const [, , vw, vh] = vb[1].trim().split(/\s+/).map(Number);

    const texts = [...svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)].map((m) => {
      const attrs = m[1];
      const num = (n: string) => {
        const r = new RegExp(`\\b${n}\\s*=\\s*"([\\d.\\-]+)"`).exec(attrs);
        return r ? Number(r[1]) : NaN;
      };
      return {
        x: num("x"),
        y: num("y"),
        anchor: /text-anchor\s*=\s*"middle"/.test(attrs) ? "middle" : "start",
        body: m[2].replace(/<[^>]+>/g, "").trim(),
      };
    });

    const rects = [...svg.matchAll(/<rect\b([^>]*)>/g)].map((m) => {
      const at = (n: string) => {
        const r = new RegExp(`\\b${n}\\s*=\\s*"([\\d.\\-]+)"`).exec(m[1]);
        return r ? Number(r[1]) : NaN;
      };
      return { x: at("x"), y: at("y"), w: at("width"), h: at("height") };
    }).filter((r) => [r.x, r.y, r.w, r.h].every(Number.isFinite));
    const lowestShape = rects.length ? Math.max(...rects.map((r) => r.y + r.h)) : 0;
    const insideAnyRect = (x: number, y: number) =>
      rects.some((r) => x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 6);

    for (const t of texts) {
      if (!Number.isFinite(t.y)) continue;
      if (t.body.split(/\s+/).length < 7) continue;
      if (Number.isFinite(t.x) && insideAnyRect(t.x, t.y)) continue;
      if (t.y >= vh - 26 || t.y > lowestShape)
        fail(title, file, "svg-floating-caption", `${where}: sentence at y=${t.y} labels no shape and sits at the bottom (lowest shape ends at ${lowestShape}) — "${t.body.slice(0, 60)}" belongs in prose under the diagram`);
    }

    for (let a = 0; a < texts.length; a++) {
      for (let b = a + 1; b < texts.length; b++) {
        const A = texts[a], B = texts[b];
        if (![A.x, A.y, B.x, B.y].every(Number.isFinite)) continue;
        if (Math.abs(A.y - B.y) < 11 && Math.abs(A.x - B.x) < 16)
          soft(title, file, "svg-text-clearance", `${where}: "${A.body.slice(0, 28)}" and "${B.body.slice(0, 28)}" are ${Math.abs(A.y - B.y)}u apart vertically`);
      }
    }

    for (const t of texts) {
      if (Number.isFinite(t.x) && (t.x < -2 || t.x > vw + 2))
        fail(title, file, "svg-out-of-bounds", `${where}: text x=${t.x} outside viewBox width ${vw}`);
      if (Number.isFinite(t.y) && (t.y < -2 || t.y > vh + 2))
        fail(title, file, "svg-out-of-bounds", `${where}: text y=${t.y} outside viewBox height ${vh}`);
    }
  });
}

// ── Interview card checks (§7) ─────────────────────────────────────────────

function cardRegion(md: string): string | null {
  const start = md.indexOf("#1c140a");
  if (start === -1) return null;
  const open = md.lastIndexOf("<div", start);
  if (open === -1) return null;
  let depth = 0;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = open;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return md.slice(open, m.index + m[0].length);
  }
  return md.slice(open);
}

function checkCard(title: string, file: string, md: string) {
  const card = cardRegion(md);
  if (!card) {
    fail(title, file, "card-missing", "no 'How to Answer in an Interview' card (§7 is mandatory for Node.js/JavaScript per §9)");
    return;
  }
  const tags = [...card.matchAll(/<(strong|code|em|span)\b([^>]*)>/g)];
  for (const t of tags) {
    if ((t[2].match(/\bstyle\s*=/g) || []).length > 1)
      fail(title, file, "card-malformed-attr", `<${t[1]}> has more than one style attribute: ${t[0].slice(0, 100)}`);
    const style = /style\s*=\s*"([^"]*)"/.exec(t[2])?.[1] ?? "";
    if (!/(^|;)\s*color\s*:/.test(style))
      fail(title, file, "card-inherited-color", `<${t[1]}> without its own inline color: ${t[0].slice(0, 90)}`);
  }
  if (!/🎤/.test(card)) soft(title, file, "card-header", "card header is missing the 🎤 emoji");
  const qa = (card.match(/❓/g) || []).length;
  if (qa < 4) soft(title, file, "card-followups", `${qa} follow-up Q&A pairs (§7 asks for 4-5)`);
  const script = (card.match(/<blockquote/g) || []).length;
  if (script < 5) soft(title, file, "card-script", `${script} numbered script items (§7 asks for 5)`);
}

// ── Structure + Question Body ──────────────────────────────────────────────

function checkStructure(title: string, file: string, a: Augment) {
  const md = a.answer ?? "";
  if (!md) { fail(title, file, "no-answer", "answer is empty"); return; }
  if (!/📌/.test(md)) fail(title, file, "no-interview-term", "no 📌 Interview term: callout (§5/§12)");
  if (!/Quick Glossary/i.test(md)) fail(title, file, "no-glossary", "no Quick Glossary section");
  if (!/\*\*Conclusion:?\*\*/i.test(md)) fail(title, file, "no-conclusion", "no **Conclusion:** paragraph");
  if (!/How to read this doc/i.test(md)) soft(title, file, "no-how-to-read", "no 'How to read this doc' callout");

  const markup = md.replace(/```[\s\S]*?```/g, "");
  const opens = (markup.match(/<div\b(?![^>]*\/>)/g) || []).length;
  const closes = (markup.match(/<\/div>/g) || []).length;
  if (opens !== closes) fail(title, file, "div-imbalance", `${opens} <div> vs ${closes} </div> (fenced code excluded)`);

  if (!a.description) fail(title, file, "no-description", "no Question Body (§6)");
  else {
    const prose = a.description.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
    if (/<[a-z][^>]*>/i.test(prose))
      fail(title, file, "description-html", `Question Body contains HTML — that field renders without rehype-raw: ${/<[a-z][^>]*>/i.exec(prose)?.[0]}`);
    if (!/What a strong answer should cover/i.test(a.description))
      soft(title, file, "description-rubric", "Question Body is missing the 'What a strong answer should cover' section");
  }
  if (a.seoDescription && a.seoDescription.length > 155)
    fail(title, file, "seo-too-long", `seoDescription is ${a.seoDescription.length} chars (max 155)`);
  if (!a.seoDescription) soft(title, file, "no-seo", "no seoDescription — meta falls back to a description slice");

  if (!a.examples?.length) { fail(title, file, "no-example", "no code example (§4)"); return; }
  const runnableCount = (a.examples ?? []).filter((ex) => ex.runnable !== false).length;
  // Flip of the Node rule: JS genuinely runs in the browser playground
  // (CodeExample.tsx's `openable = runnable !== false`), so at least one
  // example should actually be runnable — the whole point of this project.
  if (runnableCount === 0)
    fail(title, file, "no-runnable-example", "every example sets runnable:false — JS questions must have at least one genuinely runnable example");
  for (const ex of a.examples ?? []) {
    if (!ex.label) soft(title, file, "example-no-label", "example without a label");
    if (ex.tech && ex.tech !== "javascript")
      soft(title, file, "example-tech", `tech="${ex.tech}" — use "javascript" unless deliberately cross-language`);
  }
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^js-augments-ultra.*\.(ts|json)$/.test(f))
    .filter((f) => !onlyFile || f === onlyFile)
    .sort();

  if (!files.length) { console.log("No js-augments-ultra-*.ts files yet."); return; }

  const seen = new Map<string, string>();
  let total = 0;

  for (const f of files) {
    const full = join(dir, f);
    let arr: Augment[];
    try {
      if (f.endsWith(".json")) arr = JSON.parse(readFileSync(full, "utf8"));
      else {
        const mod = await import(pathToFileURL(full).href + `?t=${Date.now()}`);
        arr = (mod.default ?? mod.augments) as Augment[];
      }
    } catch (e) {
      const msg = (e as Error).message.split("\n").slice(0, 3).join(" ");
      const loc = /:(\d+):(\d+): ERROR/.exec(msg);
      console.log(`\n✖ ${f} failed to parse — cannot check it.\n  ${msg}`);
      if (loc) console.log(`  → look at ${f}:${loc[1]}. A raw \` inside a template literal ends the string early; escape it as \\\` or reword.`);
      process.exit(1);
    }
    if (!Array.isArray(arr)) { console.log(`✖ ${f}: no default-exported array`); continue; }

    for (const a of arr) {
      total++;
      if (seen.has(a.title)) fail(a.title, f, "duplicate-title", `also defined in ${seen.get(a.title)}`);
      seen.set(a.title, f);
      checkSvg(a.title, f, a.answer ?? "");
      checkCard(a.title, f, a.answer ?? "");
      checkStructure(a.title, f, a);
    }
  }

  if (!NO_DB) {
    const prisma = new PrismaClient();
    try {
      const rows = await prisma.prepQuestion.findMany({ where: { technology: "javascript" }, select: { title: true } });
      const known = new Set(rows.map((r) => r.title));
      for (const [t, f] of seen) if (!known.has(t)) fail(t, f, "title-not-in-db", "no technology='javascript' row with this exact title — augment would be a silent no-op");
    } catch (e) {
      console.log(`(skipping DB title check: ${(e as Error).message.split("\n")[0]})`);
    }
    await prisma.$disconnect();
  }

  const byRule = (list: Problem[]) => {
    const g = new Map<string, Problem[]>();
    for (const p of list) g.set(p.rule, [...(g.get(p.rule) ?? []), p]);
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  };

  console.log(`\nChecked ${total} questions across ${files.length} file(s): ${files.join(", ")}`);

  if (warn.length) {
    console.log(`\n⚠ ${warn.length} warning(s):`);
    for (const [rule, ps] of byRule(warn))
      for (const p of ps.slice(0, 8)) console.log(`  [${rule}] ${p.title.slice(0, 58)} — ${p.detail}`);
  }

  if (!problems.length) {
    console.log(`\n✔ All checks passed (${total} questions).`);
    return;
  }
  console.log(`\n✖ ${problems.length} problem(s):`);
  for (const [rule, ps] of byRule(problems)) {
    console.log(`\n  ${rule} (${ps.length}):`);
    for (const p of ps) console.log(`    ${p.title.slice(0, 62)}\n      ${p.detail}`);
  }
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
