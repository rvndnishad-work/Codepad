/**
 * Moves every machine-coding solution file into a conventional folder, so the
 * solution viewer and the playground show a familiar project layout:
 *
 *   react    /App.js, /styles.css            (template entry, unchanged)
 *            /src/components/Stopwatch.js     PascalCase components
 *            /src/hooks/useNow.js             use* hooks
 *            /src/api/fakeApi.js              fake servers and API clients
 *            /src/data/products.js            plain data (no functions)
 *            /src/utils/formatElapsed.js      everything else
 *   vue      /src/App.vue, then the same folders with .vue files in
 *            /src/components and use* files in /src/composables
 *   angular  /src/app/app.component.ts, then /src/app/components,
 *            /src/app/services (@Injectable), /src/app/directives,
 *            /src/app/api, /src/app/data and /src/app/utils
 *
 * File names never change, only folders. Relative imports in the files are
 * rewritten, and so are the matching import specifiers and file paths quoted
 * in each tutorial answer. Writes are surgical: only the literals and keys
 * that change are touched.
 *
 *   npx tsx scripts/restructure-mc-files.ts [--check] [--file <name>]
 */
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, posix } from "path";
import { pathToFileURL } from "url";

type Fw = "react" | "vue" | "angular";
type Bundle = { answer: string; files: Record<string, string> };
type Augment = { title: string; frameworks?: Partial<Record<Fw, Bundle>> };

const args = process.argv.slice(2);
const check = args.includes("--check");
const onlyFile = args.includes("--file") ? args[args.indexOf("--file") + 1] : null;

const API = /^(api|fakeApi|fake-api|fakeSocket|fake-socket|pollServer|poll-server|queryClient|query-client|[a-zA-Z]+Api|[a-z]+-api)\.[jt]s$/;
/** Sample data: no logic at all, or a known fixture file that only builds its records. */
const DATA = /^(data|photos|slides|people|products|questions|reviews|sample|lights)\.[jt]s$/;
const isData = (code: string, base: string) => DATA.test(base) || !/\bfunction\b|=>|\bclass\b/.test(code);

function destination(fw: Fw, path: string, code: string): string {
  const base = posix.basename(path);
  if (fw === "react") {
    if (path === "/App.js" || path === "/styles.css") return path;
    const dir = /^use[A-Z]/.test(base) ? "hooks" : /^[A-Z]/.test(base) ? "components" : API.test(base) ? "api" : isData(code, base) ? "data" : "utils";
    return `/src/${dir}/${base}`;
  }
  if (fw === "vue") {
    if (path === "/src/App.vue") return path;
    const dir = base.endsWith(".vue") ? "components" : /^use[A-Z]/.test(base) ? "composables" : API.test(base) ? "api" : isData(code, base) ? "data" : "utils";
    return `/src/${dir}/${base}`;
  }
  if (path === "/src/app/app.component.ts") return path;
  const dir = base.endsWith(".component.ts")
    ? "components"
    : base.endsWith(".directive.ts")
      ? "directives"
      : /@Injectable\b/.test(code)
        ? "services"
        : API.test(base)
          ? "api"
          : isData(code, base)
            ? "data"
            : "utils";
  return `/src/app/${dir}/${base}`;
}

const EXTS = ["", ".js", ".jsx", ".ts", ".vue", "/index.js", "/index.ts"];
const IMPORT = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']*)\2/g;

function resolve(files: Record<string, string>, importer: string, spec: string) {
  const target = posix.join(posix.dirname(importer), spec);
  for (const e of EXTS) if (files[target + e] !== undefined) return { path: target + e, added: e };
  return null;
}

function specFor(fromPath: string, toPath: string, dropped: string) {
  let rel = posix.relative(posix.dirname(fromPath), toPath);
  if (dropped) rel = rel.slice(0, -dropped.length);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** Rewrites one bundle; returns the new answer, the key map and the new file texts. */
function restructure(fw: Fw, b: Bundle, issues: string[], where: string) {
  const move: Record<string, string> = {};
  for (const [p, code] of Object.entries(b.files)) move[p] = destination(fw, p, code);
  const specMap = new Map<string, Set<string>>();
  const files: Record<string, string> = {};
  for (const [p, code] of Object.entries(b.files)) {
    files[p] = code.replace(IMPORT, (m, lead: string, q: string, spec: string) => {
      const hit = resolve(b.files, p, spec);
      if (!hit) {
        if (!/\.css$/.test(spec)) issues.push(`${where} ${p}: unresolved ${spec}`);
        return m;
      }
      const next = specFor(move[p], move[hit.path], hit.added);
      if (!specMap.has(spec)) specMap.set(spec, new Set());
      specMap.get(spec)!.add(next);
      return `${lead}${q}${next}${q}`;
    });
  }
  let answer = b.answer;
  // Import specifiers quoted in the excerpts, when every importer agrees.
  for (const [spec, targets] of specMap) {
    const [next] = [...targets];
    if (next === spec) continue;
    if (targets.size > 1) {
      if (new RegExp(`["'\`]${spec.replace(/[.]/g, "\\.")}["'\`]`).test(answer)) issues.push(`${where}: answer quotes ${spec}, which maps to ${[...targets].join(" | ")}`);
      continue;
    }
    answer = answer.replace(new RegExp(`(["'\`])${spec.replace(/[.]/g, "\\.")}\\1`, "g"), (_m, q) => `${q}${next}${q}`);
  }
  // File paths mentioned in prose and code comments, with or without the leading slash.
  const moved = Object.entries(move).filter(([a, z]) => a !== z).sort((x, y) => y[0].length - x[0].length);
  for (const [from, to] of moved) {
    const bare = from.slice(1).replace(/[.]/g, "\\.");
    answer = answer.replace(new RegExp(`(?<![\\w/.-])(/?)${bare}(?![\\w/-])`, "g"), (_m, slash) => slash + to.slice(1));
  }
  return { answer, move, files };
}

const asTemplate = (s: string) => "`" + s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`";

async function main() {
  const dir = join(process.cwd(), "prisma", "data");
  const names = readdirSync(dir)
    .filter((f) => /^machine-coding-augments-ultra-\d+\.ts$/.test(f))
    .filter((f) => !onlyFile || f === onlyFile)
    .sort();
  const issues: string[] = [];
  const tally: Record<string, number> = {};
  let movedFiles = 0;
  for (const f of names) {
    const path = join(dir, f);
    let src = readFileSync(path, "utf8");
    const mod = await import(pathToFileURL(path).href);
    let cursor = 0;
    for (const a of (mod.default ?? []) as Augment[]) {
      for (const [fw, b] of Object.entries(a.frameworks ?? {}) as [Fw, Bundle][]) {
        const where = `${f} ${a.title} [${fw}]`;
        const r = restructure(fw, b, issues, where);
        const ans = asTemplate(b.answer);
        const at = src.indexOf(ans, cursor);
        if (at === -1) { issues.push(`${where}: answer literal not found`); continue; }
        const nextAns = asTemplate(r.answer);
        src = src.slice(0, at) + nextAns + src.slice(at + ans.length);
        cursor = at + nextAns.length;
        for (const [p, code] of Object.entries(b.files)) {
          const to = r.move[p];
          if (to !== p) { movedFiles++; tally[`${fw} ${posix.dirname(to)}`] = (tally[`${fw} ${posix.dirname(to)}`] ?? 0) + 1; }
          const key = `"${p}":`;
          const k = src.indexOf(key, cursor);
          if (k === -1) { issues.push(`${where}: key ${p} not found`); continue; }
          src = src.slice(0, k) + `"${to}":` + src.slice(k + key.length);
          let v = k + to.length + 3;
          while (/\s/.test(src[v])) v++;
          const lit = asTemplate(code);
          if (src.startsWith(lit, v)) {
            const nextLit = asTemplate(r.files[p]);
            src = src.slice(0, v) + nextLit + src.slice(v + lit.length);
            cursor = v + nextLit.length;
          } else {
            const id = /^[A-Za-z_$][\w$]*/.exec(src.slice(v))?.[0];
            if (!id) { issues.push(`${where}: value of ${p} is neither a literal nor a const`); continue; }
            if (code !== r.files[p]) issues.push(`${where}: ${p} is the shared const ${id}; rewrite its imports by hand`);
            cursor = v + id.length;
          }
        }
      }
    }
    if (!check) writeFileSync(path, src);
  }
  console.log(`${check ? "Would move" : "Moved"} ${movedFiles} file(s) in ${names.length} augment file(s).`);
  for (const [k, n] of Object.entries(tally).sort()) console.log(`  ${k.padEnd(28)} ${n}`);
  if (issues.length) console.log(`\n${issues.length} issue(s):\n  ${issues.join("\n  ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
