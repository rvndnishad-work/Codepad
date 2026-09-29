/**
 * Renders each JS coding answer through the SAME plugin chain the question
 * page uses (remark-gfm -> rehype-raw -> rehype-highlight) and asserts the
 * resulting DOM — the headless equivalent of loading every page in a browser.
 *
 * Usage:
 *   npx tsx scripts/render-check-js-coding.mts                 (all files)
 *   npx tsx scripts/render-check-js-coding.mts --file js-coding-augments-1.ts
 */
import { readdirSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { toHtml } from "hast-util-to-html";
import { JSDOM } from "jsdom";

const DATA_DIR = path.resolve(process.cwd(), "prisma/data");

const flagIndex = process.argv.indexOf("--file");
const only = flagIndex !== -1 ? process.argv[flagIndex + 1] : undefined;

const files = readdirSync(DATA_DIR)
  .filter((f) => /^js-coding-augments-\d+\.ts$/.test(f))
  .filter((f) => !only || f === only)
  .sort();

if (!files.length) {
  console.error(only ? `No such js-coding file: ${only}` : "No js-coding-augments files found.");
  process.exit(1);
}

const answerProc = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeHighlight, { detect: false, ignoreMissing: true });

const descProc = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);

const render = async (proc: typeof answerProc, md: string) =>
  toHtml((await proc.run(proc.parse(md))) as never, { allowDangerousHtml: true });

let failures = 0;
let checked = 0;

for (const file of files) {
  const mod: Record<string, unknown> = await import(pathToFileURL(path.join(DATA_DIR, file)).href);
  const unwrap = (v: unknown): unknown[] | null =>
    Array.isArray(v) ? v : v && typeof v === "object" ? unwrap((v as { default?: unknown }).default) : null;
  const augments = unwrap(mod) ?? unwrap(mod.default);
  if (!augments) {
    console.error(`✖ ${file}: could not find the augments array`);
    failures++;
    continue;
  }

  console.log(`\n${file}`);
  for (const a of augments as { title: string; answer?: string; description?: string; examples?: { runnable?: boolean }[] }[]) {
    checked++;
    const problems: string[] = [];

    const html = await render(answerProc, a.answer ?? "");
    const doc = new JSDOM(`<body>${html}</body>`).window.document;
    const text = doc.body.textContent ?? "";

    const svgs = [...doc.querySelectorAll("svg.iq-diagram")];
    if (!svgs.length) problems.push("no rendered svg.iq-diagram");
    for (const s of svgs) {
      if (s.getAttribute("width") !== "100%") problems.push("svg width is not 100%");
      if (!s.getAttribute("viewBox")) problems.push("svg has no viewBox");
      if (s.outerHTML.includes("'")) problems.push("apostrophe survived into the rendered svg");
      if (!s.querySelector("text")) problems.push("svg rendered with no text nodes");
    }

    const cards = [...doc.querySelectorAll("div")].filter(
      (d) => (d.textContent ?? "").includes("🎤") && d.querySelectorAll("blockquote").length >= 5,
    );
    const card = cards[cards.length - 1];
    if (!card) problems.push("the amber process card did not survive rendering");
    else {
      const nodes = [...card.querySelectorAll("strong,code,em,span")];
      const uncolored = nodes.filter((el) => !/(^|;)\s*color\s*:/.test(el.getAttribute("style") ?? ""));
      if (uncolored.length) problems.push(`${uncolored.length} card node(s) with no inline color`);
      if (card.querySelectorAll("blockquote").length !== 5) problems.push("the process script is not 5 steps");
      const qs = (card.textContent!.match(/❓/g) ?? []).length;
      const as = (card.textContent!.match(/💡/g) ?? []).length;
      if (qs < 4 || qs !== as) problems.push(`follow-ups Q=${qs} A=${as}`);
    }

    if (!/clarifying question/i.test(text)) problems.push("no clarifying questions section");
    if (!/thought process/i.test(text)) problems.push("no Thought Process section");
    if (!/complexity/i.test(text)) problems.push("no complexity analysis");
    if (!/edge case/i.test(text)) problems.push("no edge cases section");
    if (!text.includes("Quick Glossary")) problems.push("no glossary");
    if (!text.includes("Conclusion:")) problems.push("no conclusion");

    const prose = new JSDOM(`<body>${html}</body>`).window.document;
    prose.querySelectorAll("code, pre").forEach((el) => el.remove());
    if (/<(div|span|svg)\s/.test(prose.body.textContent ?? "")) {
      problems.push("raw HTML leaked as visible text");
    }

    const descHtml = await render(descProc, a.description ?? "");
    const descDoc = new JSDOM(`<body>${descHtml}</body>`).window.document;
    descDoc.querySelectorAll("code, pre").forEach((el) => el.remove());
    if (/<[a-z][^>]*>/i.test(descDoc.body.textContent ?? "")) {
      problems.push("description contains HTML, which renders as literal text");
    }

    const runnable = (a.examples ?? []).filter((e) => e.runnable !== false).length;
    if (!runnable) problems.push("no runnable example");

    const tables = doc.querySelectorAll("table").length;
    if (problems.length) failures++;
    console.log(
      `  ${problems.length ? "✖" : "✔"} svg=${svgs.length} card=${card ? "y" : "N"} ` +
        `tables=${tables} run=${runnable}  ${a.title.slice(0, 50)}`,
    );
    for (const p of problems) console.log(`      - ${p}`);
  }
}

console.log(
  failures
    ? `\n${failures} of ${checked} answers failed to render correctly.`
    : `\nAll ${checked} answers render correctly through the page pipeline.`,
);
process.exit(failures ? 1 : 0);
