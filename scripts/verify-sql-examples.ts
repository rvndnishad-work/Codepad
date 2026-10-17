/**
 * Runs every example in the SQL "ultra" files and checks that the docs only
 * claim result rows that really come back.
 *
 * Runnable examples (the default) run the way the page's SqlPlayground does:
 * sql.js 1.10.2 (SQLite in WebAssembly), a fresh in-memory database, every
 * ```sql block of the Question Body (description) split on ";" and run as the
 * schema (statements starting with SELECT are skipped), then `db.exec(code)`.
 * Checks:
 *
 *   schema       every schema statement runs without an error (the page only
 *                warns in the console, so a broken seed would go unnoticed)
 *   query        the example runs without an error and returns rows
 *   quoted       the answer quotes the result inside a ~~~text block, one
 *                block per example, in this exact shape (NULL as the page shows it):
 *
 *                  name | total
 *                  Alice | 30
 *
 *                several result sets are separated by one blank line
 *
 * An example with `runnable: false` and `dialect: "postgres"` runs on the local
 * PostgreSQL server (PSQL_URL, a server where this user may create databases)
 * in a throwaway database: the same schema blocks, then the example, through
 * psql. Its result must be quoted in the same shape (keep one result set per
 * PostgreSQL example: psql prints several sets with no gap). Other `runnable: false`
 * examples are not run.
 *
 * sql.js is not a project dependency. Set SQLJS_DIR to a folder where
 * `npm i sql.js@1.10.2` was run.
 *
 *   SQLJS_DIR=... [PSQL_URL=postgresql://...] npx tsx scripts/verify-sql-examples.ts [--file <name>] [--title <substring>]
 */
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { createHash } from "crypto";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const onlyFile = arg("--file");
const onlyTitle = arg("--title");
const SQLJS_DIR = process.env.SQLJS_DIR;
const PSQL_URL = process.env.PSQL_URL;

type Example = { label?: string; code: string; runnable?: boolean; dialect?: string };
type Item = { file: string; title: string; description: string; answer: string; examples: Example[] };
type Result = { columns: string[]; values: unknown[][] };

const norm = (s: string) => s.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();
const quotedBlocks = (md: string) =>
  [...md.matchAll(/^(~~~|```)\s*(text|output|console|txt|plaintext)\s*\n([\s\S]*?)^\1\s*$/gm)].map((m) => norm(m[3]));

export function render(results: Result[]): string {
  return results
    .map((r) => [r.columns.join(" | "), ...r.values.map((row) => row.map((v) => (v === null ? "NULL" : String(v))).join(" | "))].join("\n"))
    .join("\n\n");
}

/** The page's seed step, copied from SqlPlayground.tsx. */
function schemaStatements(description: string): string[] {
  const blocks = description.match(/```sql([\s\S]*?)```/g) ?? [];
  return blocks.flatMap((block) =>
    block.replace(/```sql|```/g, "").trim().split(";").map((q) => q.trim()).filter((q) => q && !q.toLowerCase().startsWith("select")),
  );
}

async function loadItems(): Promise<Item[]> {
  const dir = join(process.cwd(), "prisma", "data");
  const files = readdirSync(dir).filter((f) => /^sql-augments-ultra-\d+\.ts$/.test(f)).filter((f) => !onlyFile || f === onlyFile).sort();
  const items: Item[] = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    for (const a of (mod.default ?? []) as Record<string, any>[]) {
      if (onlyTitle && !a.title.toLowerCase().includes(onlyTitle.toLowerCase())) continue;
      items.push({ file: f, title: a.title, description: a.description ?? "", answer: a.answer ?? "", examples: a.examples ?? [] });
    }
  }
  return items;
}

function runPostgres(schema: string[], code: string): { out?: string; error?: string } {
  const db = "sqlv_" + createHash("sha1").update(schema.join(";") + code).digest("hex").slice(0, 12);
  const base = PSQL_URL!;
  const admin = (sql: string) => spawnSync("psql", [base, "-X", "-q", "-c", sql], { encoding: "utf8" });
  admin(`DROP DATABASE IF EXISTS ${db}`);
  const c = admin(`CREATE DATABASE ${db}`);
  if (c.status !== 0) return { error: "could not create a scratch database: " + c.stderr.trim() };
  try {
    const url = base.replace(/\/[^/?]+(\?|$)/, `/${db}$1`).replace(/\?.*$/, "");
    const seed = spawnSync("psql", [url, "-X", "-q", "-v", "ON_ERROR_STOP=1"], { input: schema.map((s) => s + ";").join("\n"), encoding: "utf8" });
    if (seed.status !== 0) return { error: "schema fails on PostgreSQL: " + seed.stderr.trim().split("\n")[0] };
    const r = spawnSync("psql", [url, "-X", "-q", "-A", "-F", " | ", "-P", "footer=off", "-P", "null=NULL", "-v", "ON_ERROR_STOP=1"], { input: code, encoding: "utf8" });
    if (r.status !== 0) return { error: "fails on PostgreSQL: " + r.stderr.trim().split("\n")[0] };
    return { out: norm(r.stdout) };
  } finally {
    admin(`DROP DATABASE IF EXISTS ${db}`);
  }
}

async function main() {
  if (!SQLJS_DIR || !existsSync(join(SQLJS_DIR, "node_modules", "sql.js", "package.json"))) {
    console.log("✖ Set SQLJS_DIR to a folder where `npm i sql.js@1.10.2` was run.");
    process.exit(1);
  }
  const require = createRequire(join(SQLJS_DIR, "package.json"));
  const version = require("sql.js/package.json").version;
  if (version !== "1.10.2") { console.log(`✖ SQLJS_DIR has sql.js ${version}; the page uses 1.10.2.`); process.exit(1); }
  const SQL = await require("sql.js")();

  const items = await loadItems();
  const problems: string[] = [];
  let count = 0;
  for (const it of items) {
    const schema = schemaStatements(it.description);
    it.examples.forEach((ex, idx) => {
      count++;
      const where = `${it.file} ${it.title.slice(0, 60)} example ${idx + 1}`;
      let out: string | undefined;
      if (ex.runnable !== false) {
        const db = new SQL.Database();
        try {
          for (const s of schema) {
            try { db.run(s); } catch (e: any) { problems.push(`${where}: schema statement fails in the page (sql.js): ${e.message} — ${s.slice(0, 80)}`); }
          }
          const res: Result[] = db.exec(ex.code);
          if (!res.length) problems.push(`${where}: returns no result set (the page would show nothing)`);
          out = norm(render(res));
        } catch (e: any) {
          problems.push(`${where}: fails in the page (sql.js / SQLite): ${e.message}\n      (if it needs PostgreSQL, set runnable: false and dialect: "postgres")`);
        } finally {
          db.close();
        }
      } else if (ex.dialect === "postgres") {
        if (!PSQL_URL) { problems.push(`${where}: dialect postgres but PSQL_URL is not set`); return; }
        const r = runPostgres(schema, ex.code);
        if (r.error) problems.push(`${where}: ${r.error}`);
        out = r.out;
      }
      if (out !== undefined && out && !quotedBlocks(it.answer).includes(out))
        problems.push(`${where}: the answer does not quote this result in a ~~~text block:\n      ${out.split("\n").slice(0, 10).join("\n      ")}`);
    });
  }

  console.log(`\nChecked ${count} example(s) for ${items.length} question(s) (sql.js 1.10.2${PSQL_URL ? " + PostgreSQL" : ""}).`);
  if (!problems.length) { console.log("✔ Every example runs as the page runs it, and its result is quoted."); return; }
  console.log(`\n✖ ${problems.length} problem(s):\n`);
  for (const p of problems.sort()) console.log("  " + p);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
