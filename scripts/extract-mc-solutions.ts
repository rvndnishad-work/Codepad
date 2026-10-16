/**
 * Writes every Frontend Machine Coding solution in the augment files to disk,
 * one directory per question and framework, so scripts/verify-mc-solution.mjs
 * can mount exactly the code the site will ship.
 *
 *   npx tsx scripts/extract-mc-solutions.ts <outDir> [--file <name>]
 *
 * Layout: <outDir>/<slug>/<react|vue|angular>/<path from the files map>.
 * Also writes <outDir>/index.tsv (slug, framework, dir, title).
 */
import { mkdirSync, writeFileSync, readdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { pathToFileURL } from "url";

type Bundle = { answer: string; files: Record<string, string> };
type Augment = { title: string; frameworks?: Record<string, Bundle> };

const outDir = resolve(process.argv[2] ?? "");
if (!process.argv[2]) { console.log("usage: extract-mc-solutions.ts <outDir> [--file <name>]"); process.exit(2); }
const fileFlag = process.argv.indexOf("--file");
const onlyFile = fileFlag === -1 ? undefined : process.argv[fileFlag + 1];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70);

async function main() {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir)
    .filter((f) => /^machine-coding-augments.*\.ts$/.test(f) && !f.includes(".types."))
    .filter((f) => !onlyFile || f === onlyFile)
    .sort();
  const rows: string[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const a of (mod.default ?? []) as Augment[]) {
      for (const [fw, b] of Object.entries(a.frameworks ?? {})) {
        const base = join(outDir, slug(a.title), fw);
        for (const [p, code] of Object.entries(b.files)) {
          const to = join(base, p.replace(/^\//, ""));
          mkdirSync(dirname(to), { recursive: true });
          writeFileSync(to, code);
        }
        rows.push([slug(a.title), fw, base, a.title].join("\t"));
      }
    }
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.tsv"), rows.join("\n") + "\n");
  console.log(`Wrote ${rows.length} solution(s) from ${files.length} file(s) to ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
