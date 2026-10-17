/**
 * Content checker for the DSA per-language "ultra" files
 * (prisma/data/dsa-augments-ultra-NN.ts).
 *
 * Every question ships four complete versions (Python, JavaScript, Java, C++).
 * Each one is checked against the CLAUDE.md hard rules that broke the renderer
 * before (SVG apostrophes, fixed widths, floating captions; the interview card
 * colours; balanced <div>s; a plain-markdown Question Body), the structure the
 * other ultra sections use (📌 terms, card, glossary, conclusion), and the
 * per-language rules:
 *
 *   - code fences in an answer are that language (or text/output/bash)
 *   - examples follow the runner conventions: Java has `public class Main`,
 *     C++ has `int main`, JavaScript is browser-safe (no require/process)
 *
 * Code is not run here; scripts/verify-dsa-examples.ts runs every example and
 * checks the quoted output.
 *
 *   npx tsx scripts/check-dsa-ultra.ts [--no-db] [--file <name>]
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { DSA_LANGUAGES, type DsaUltraAugment, type DsaLanguage } from "../prisma/data/dsa-augments.types";

const NO_DB = process.argv.includes("--no-db");
const fileFlag = process.argv.indexOf("--file");
const onlyFile = fileFlag === -1 ? undefined : process.argv[fileFlag + 1];

type Problem = { title: string; file: string; rule: string; detail: string };
const internalLinks: { title: string; file: string; slug: string }[] = [];
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

    // §3 — apostrophes broke rendering silently; content after the first one
    // failed to render. Entities are fine, raw ' is not.
    const apos = svg.indexOf("'");
    if (apos !== -1) {
      const ctx = svg.slice(Math.max(0, apos - 45), apos + 45).replace(/\n/g, " ");
      fail(title, file, "svg-apostrophe", `${where}: raw apostrophe — ...${ctx}...`);
    }

    // §3 — never a fixed pixel width; must scale. Scope this to the opening
    // <svg> tag: child <rect width="120"> is legitimate.
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

    // Collect <text> nodes with coordinates for the layout checks.
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

    // §3 — a general summary sentence must live in markdown below the diagram,
    // not as a floating <text> on the canvas. "Floating" means: it is a
    // sentence, it labels no shape (not inside any rect), AND it sits low on
    // the canvas. A long label centred inside a box is not a floating caption,
    // even when that box is at the bottom of the viewBox.
    const rects = [...svg.matchAll(/<rect\b([^>]*)>/g)].map((m) => {
      const at = (n: string) => {
        const r = new RegExp(`\\b${n}\\s*=\\s*"([\\d.\\-]+)"`).exec(m[1]);
        return r ? Number(r[1]) : NaN;
      };
      return { x: at("x"), y: at("y"), w: at("width"), h: at("height") };
    }).filter((r) => [r.x, r.y, r.w, r.h].every(Number.isFinite));
    const lowestShape = rects.length ? Math.max(...rects.map((r) => r.y + r.h)) : 0;
    // Text baselines sit inside their box; allow a little slack for descenders.
    const insideAnyRect = (x: number, y: number) =>
      rects.some((r) => x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 6);

    for (const t of texts) {
      if (!Number.isFinite(t.y)) continue;
      if (t.body.split(/\s+/).length < 7) continue;              // not a sentence
      if (Number.isFinite(t.x) && insideAnyRect(t.x, t.y)) continue; // labels a shape
      if (t.y >= vh - 26 || t.y > lowestShape)
        fail(title, file, "svg-floating-caption", `${where}: sentence at y=${t.y} labels no shape and sits at the bottom (lowest shape ends at ${lowestShape}) — "${t.body.slice(0, 60)}" belongs in prose under the diagram`);
    }

    // §3 — real text-overlap bugs came from near-zero clearance.
    for (let a = 0; a < texts.length; a++) {
      for (let b = a + 1; b < texts.length; b++) {
        const A = texts[a], B = texts[b];
        if (![A.x, A.y, B.x, B.y].every(Number.isFinite)) continue;
        if (Math.abs(A.y - B.y) < 11 && Math.abs(A.x - B.x) < 16)
          soft(title, file, "svg-text-clearance", `${where}: "${A.body.slice(0, 28)}" and "${B.body.slice(0, 28)}" are ${Math.abs(A.y - B.y)}u apart vertically`);
      }
    }

    // Out-of-canvas text is invisible.
    for (const t of texts) {
      if (Number.isFinite(t.x) && (t.x < -2 || t.x > vw + 2))
        fail(title, file, "svg-out-of-bounds", `${where}: text x=${t.x} outside viewBox width ${vw}`);
      if (Number.isFinite(t.y) && (t.y < -2 || t.y > vh + 2))
        fail(title, file, "svg-out-of-bounds", `${where}: text y=${t.y} outside viewBox height ${vh}`);
    }
  });
}

// ── Interview card checks (§7) ─────────────────────────────────────────────

/** Extract the amber card region by matching <div> nesting from its opener. */
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
  return md.slice(open); // unbalanced — checked separately
}

function checkCard(title: string, file: string, md: string) {
  const card = cardRegion(md);
  if (!card) {
    fail(title, file, "card-missing", "no 'How to Answer in an Interview' card (§7 is mandatory)");
    return;
  }
  // §7 critical rule: never rely on inherited color.
  const tags = [...card.matchAll(/<(strong|code|em|span)\b([^>]*)>/g)];
  for (const t of tags) {
    // A duplicated style attribute means a hand-editing slip; browsers keep the
    // first and silently drop the second, so the colour may not be what you see.
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

// ── Structure, Question Body and language rules ───────────────────────────

const FENCE_LANG: Record<DsaLanguage, RegExp> = {
  python: /^(python|py)$/,
  javascript: /^(javascript|js)$/,
  java: /^java$/,
  cpp: /^(cpp|c\+\+)$/,
};
const NEUTRAL_FENCE = /^(text|txt|output|console|bash|sh|plaintext|)$/;

function checkLanguage(title: string, file: string, lang: DsaLanguage, b: DsaUltraAugment["languages"][DsaLanguage]) {
  const t = `${title} [${lang}]`;
  const md = b.answer ?? "";
  if (!md) { fail(t, file, "no-answer", "answer is empty"); return; }
  checkSvg(t, file, md);
  checkCard(t, file, md);
  if (!/📌/.test(md)) fail(t, file, "no-interview-term", "no 📌 Interview term: callout");
  if (!/Quick Glossary/i.test(md)) fail(t, file, "no-glossary", "no Quick Glossary section");
  if (!/\*\*Conclusion:?\*\*/i.test(md)) fail(t, file, "no-conclusion", "no **Conclusion:** paragraph");
  if (!/How to read this doc/i.test(md)) soft(t, file, "no-how-to-read", "no 'How to read this doc' callout");
  if (!/Verified/i.test(md)) fail(t, file, "no-verified", "no Verified section quoting real output");

  const markup = md.replace(/(~~~|```)[\s\S]*?\1/g, "");
  const opens = (markup.match(/<div\b(?![^>]*\/>)/g) || []).length;
  const closes = (markup.match(/<\/div>/g) || []).length;
  if (opens !== closes) fail(t, file, "div-imbalance", `${opens} <div> vs ${closes} </div> (fenced code excluded)`);

  // The whole answer is for one language: no fences in the other three.
  for (const m of md.matchAll(/^(?:~~~|```)[ \t]*([\w+-]*)/gm)) {
    const tag = m[1].toLowerCase();
    if (FENCE_LANG[lang].test(tag) || NEUTRAL_FENCE.test(tag)) continue;
    const other = DSA_LANGUAGES.find((l) => FENCE_LANG[l].test(tag));
    if (other) fail(t, file, "wrong-language-fence", `a ~~~${tag} block in the ${lang} answer`);
    else soft(t, file, "fence-tag", `unusual fence tag "${tag}"`);
  }

  if (!b.description) fail(t, file, "no-description", "no Question Body (§6)");
  else {
    const prose = b.description.replace(/(~~~|```)[\s\S]*?\1/g, "").replace(/`[^`\n]*`/g, "");
    if (/<[a-z][^>]*>/i.test(prose))
      fail(t, file, "description-html", `Question Body contains HTML (renders without rehype-raw): ${/<[a-z][^>]*>/i.exec(prose)?.[0]}`);
    if (!/What a strong answer should cover/i.test(b.description))
      fail(t, file, "description-rubric", "Question Body is missing 'What a strong answer should cover'");
  }

  if (!b.examples?.length) fail(t, file, "no-example", "no runnable example");
  for (const ex of b.examples ?? []) {
    if (!ex.label) soft(t, file, "example-no-label", "example without a label");
    const code = ex.code ?? "";
    if (lang === "java" && !/public\s+class\s+Main\b/.test(code)) fail(t, file, "java-main", `"${ex.label}" needs public class Main (the runner compiles Main.java)`);
    if (lang === "cpp" && !/\bint\s+main\s*\(/.test(code)) fail(t, file, "cpp-main", `"${ex.label}" has no int main()`);
    if (lang === "javascript" && /\brequire\s*\(|\bprocess\.|\bimport\s.+from\s/.test(code))
      fail(t, file, "js-browser-safe", `"${ex.label}" uses require/process/import; the in-page runner is a browser`);
    if (lang === "python" && /^\s*import\s+(numpy|pandas)/m.test(code)) fail(t, file, "py-stdlib", `"${ex.label}" imports a non-stdlib package`);
  }

  if (/PASTE_[A-Z0-9_]+_URL_HERE/.test(md + b.description))
    fail(t, file, "dead-placeholder-link", "PASTE_..._URL_HERE placeholder; link to /interview-question/<slug>");
  for (const m of (md + "\n" + b.description).matchAll(/\]\(\/interview-question\/([a-z0-9-]+)\)|href="\/interview-question\/([a-z0-9-]+)"/g))
    internalLinks.push({ title: t, file, slug: (m[1] ?? m[2]) as string });
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^dsa-augments-ultra-\d+\.ts$/.test(f))
    .filter((f) => !onlyFile || f === onlyFile)
    .sort();
  if (!files.length) { console.log("No dsa-augments-ultra-*.ts files yet."); return; }

  const seen = new Map<string, string>();
  let total = 0;
  for (const f of files) {
    let arr: DsaUltraAugment[];
    try {
      const mod = await import(pathToFileURL(join(dir, f)).href + `?t=${Date.now()}`);
      arr = (mod.default ?? mod.augments) as DsaUltraAugment[];
    } catch (e) {
      const msg = (e as Error).message.split("\n").slice(0, 3).join(" ");
      console.log(`\n✖ ${f} failed to parse.\n  ${msg}\n  A raw backtick or \${ inside a template literal is the usual cause.`);
      process.exit(1);
    }
    if (!Array.isArray(arr)) { console.log(`✖ ${f}: no default-exported array`); continue; }
    for (const a of arr) {
      total++;
      if (seen.has(a.title)) fail(a.title, f, "duplicate-title", `also defined in ${seen.get(a.title)}`);
      seen.set(a.title, f);
      if (a.difficulty && !["easy", "medium", "hard"].includes(a.difficulty)) fail(a.title, f, "difficulty", a.difficulty);
      if (!a.seoDescription) fail(a.title, f, "no-seo", "no seoDescription");
      else if (a.seoDescription.length > 155) fail(a.title, f, "seo-too-long", `${a.seoDescription.length} chars (max 155)`);
      for (const lang of DSA_LANGUAGES) {
        const b = a.languages?.[lang];
        if (!b) { fail(a.title, f, "language-missing", `no ${lang} bundle`); continue; }
        checkLanguage(a.title, f, lang, b);
      }
      for (const k of Object.keys(a.languages ?? {}))
        if (!DSA_LANGUAGES.includes(k as DsaLanguage)) fail(a.title, f, "unknown-language", k);
    }
  }

  if (!NO_DB) {
    const prisma = new PrismaClient();
    try {
      const rows = await prisma.prepQuestion.findMany({ where: { technology: "dsa" }, select: { title: true } });
      const known = new Set(rows.map((r) => r.title));
      for (const [t, f] of seen) if (!known.has(t)) fail(t, f, "title-not-in-db", "no technology='dsa' row with this exact title");
      const slugs = new Set((await prisma.prepQuestion.findMany({ select: { slug: true } })).map((r) => r.slug));
      for (const l of internalLinks) if (!slugs.has(l.slug)) fail(l.title, l.file, "dead-internal-link", `/interview-question/${l.slug} does not exist`);
    } catch (e) {
      console.log(`(skipping DB checks: ${(e as Error).message.split("\n")[0]})`);
    }
    await prisma.$disconnect();
  }

  const byRule = (list: Problem[]) => {
    const g = new Map<string, Problem[]>();
    for (const p of list) g.set(p.rule, [...(g.get(p.rule) ?? []), p]);
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  };
  console.log(`\nChecked ${total} questions × ${DSA_LANGUAGES.length} languages across ${files.length} file(s).`);
  if (warn.length) {
    console.log(`\n⚠ ${warn.length} warning(s):`);
    for (const [rule, ps] of byRule(warn)) for (const p of ps.slice(0, 8)) console.log(`  [${rule}] ${p.title.slice(0, 70)} — ${p.detail}`);
  }
  if (!problems.length) { console.log(`\n✔ All checks passed (${total} questions).`); return; }
  console.log(`\n✖ ${problems.length} problem(s):`);
  for (const [rule, ps] of byRule(problems)) {
    console.log(`\n  ${rule} (${ps.length}):`);
    for (const p of ps) console.log(`    ${p.title.slice(0, 76)}\n      ${p.detail}`);
  }
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
