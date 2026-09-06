/**
 * Actually execute every code example in the React "ultra" answer files.
 *
 * CLAUDE.md §4: never claim code "works" without running it. `esbuild` is not
 * installed, but vitest 5 + @vitejs/plugin-react + jsdom 30 +
 * @testing-library/react + react-dom 19.2.8 already are — enough to compile JSX
 * and both server-render and mount every example, with no new dependency.
 *
 * Each example is run twice:
 *   1. renderToStaticMarkup  — catches import / JSX / render-phase errors
 *   2. createRoot + act()    — catches effect-time and event-handler errors
 *
 * Examples that genuinely cannot run in jsdom (Server Components, "use server",
 * next/* imports, real-browser-only APIs) are reported as `unverifiable` with a
 * reason rather than being silently counted as passing. Opt one out explicitly
 * with a `// @verify-skip: <reason>` comment in the example code.
 *
 *   node scripts/verify-react-examples.mts        (via tsx: npx tsx scripts/verify-react-examples.mts)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const OUT = join(ROOT, ".react-verify");

type Augment = {
  title: string;
  examples?: { label?: string; code: string; runnable?: boolean }[];
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "q";

/**
 * Strip template literals and quoted strings before pattern-matching, so that
 * an example which DISPLAYS server-side code as a string is not mistaken for
 * one that IS server-side code. Several RSC docs quote a Server Component in a
 * template literal purely to annotate it, and matching the raw text skipped
 * them as unmountable when they are ordinary client components.
 */
function codeOnly(code: string): string {
  return code
    .replace(/`(?:\\[\s\S]|[^\\`])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

/**
 * The directive prologue: leading blank lines, comments and string-literal
 * directives, up to the first real statement. Only a directive here is a
 * directive; the same string later in the file is just a string.
 */
function prologueOf(code: string): string {
  const out: string[] = [];
  for (const line of code.split("\n")) {
    const t = line.trim();
    if (t === "" || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) {
      out.push(line);
      continue;
    }
    if (/^["'][^"']*["']\s*;?$/.test(t)) {
      out.push(line);
      continue;
    }
    break;
  }
  return out.join("\n");
}

/** Reasons an example cannot execute in a jsdom unit environment. */
function unverifiableReason(raw: string): string | null {
  const skip = /\/\/\s*@verify-skip:\s*(.+)/.exec(raw);
  if (skip) return skip[1].trim();
  // A directive is itself a string literal, so it survives stripping — but it
  // is only a DIRECTIVE in the prologue, before any statement. Checking the
  // whole file matched "use server" quoted inside annotated reference code.
  if (/^\s*["']use server["']\s*;?\s*$/m.test(prologueOf(raw))) {
    return "Server Action directive — needs a server runtime";
  }
  if (/from\s+["']next\//.test(raw)) return "imports next/* — needs the Next.js runtime";
  const code = codeOnly(raw);
  // NOTE: react-dom/server is NOT a skip reason. renderToString and
  // renderToStaticMarkup run perfectly well under jsdom, and examples that
  // show server output next to client output are exactly the ones worth
  // executing — skipping them hid three of them for a whole batch.
  // Only the DEFAULT EXPORT being async makes this an async Server Component.
  // An async helper inside an ordinary client component is fine to mount, and
  // skipping those silently would hide exactly the examples worth executing.
  if (/export\s+default\s+async\s+function/.test(code))
    return "async Server Component — cannot mount in a client renderer";
  return null;
}

async function loadAll(): Promise<Augment[]> {
  const dir = join(ROOT, "prisma", "data");
  const files = readdirSync(dir).filter((f) => /^react-augments-ultra.*\.(ts|json)$/.test(f)).sort();
  const out: Augment[] = [];
  for (const f of files) {
    const full = join(dir, f);
    if (f.endsWith(".json")) out.push(...(JSON.parse(readFileSync(full, "utf8")) as Augment[]));
    else {
      const mod = await import(pathToFileURL(full).href + `?t=${Date.now()}`);
      const arr = (mod.default ?? mod.augments) as Augment[];
      if (Array.isArray(arr)) out.push(...arr);
    }
  }
  return out;
}

const items = await loadAll();
if (!items.length) { console.log("No react-augments-ultra-* files yet."); process.exit(0); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "cases"), { recursive: true });

const cases: { id: string; title: string; label: string }[] = [];
const skipped: { title: string; label: string; reason: string }[] = [];

for (const a of items) {
  (a.examples ?? []).forEach((ex, i) => {
    const label = ex.label ?? `example ${i + 1}`;
    const reason = unverifiableReason(ex.code);
    if (reason) { skipped.push({ title: a.title, label, reason }); return; }
    const id = `${slug(a.title)}__${i}`;
    writeFileSync(join(OUT, "cases", `${id}.jsx`), ex.code);
    cases.push({ id, title: a.title, label });
  });
}

if (!cases.length) {
  console.log(`0 runnable examples (${skipped.length} unverifiable).`);
  skipped.forEach((s) => console.log(`  ~ ${s.title.slice(0, 50)} / ${s.label}: ${s.reason}`));
  process.exit(0);
}

// ── generate the spec ──────────────────────────────────────────────────────
const spec = `import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react";
import React from "react";

${cases.map((c, i) => `import C${i} from "./cases/${c.id}.jsx";`).join("\n")}

const CASES = [
${cases.map((c, i) => `  { C: C${i}, title: ${JSON.stringify(c.title)}, label: ${JSON.stringify(c.label)} },`).join("\n")}
];

describe("react ultra examples", () => {
  for (const { C, title, label } of CASES) {
    it(\`\${title} :: \${label} — server-renders\`, () => {
      expect(typeof C).toBe("function");
      const html = renderToStaticMarkup(React.createElement(C));
      expect(typeof html).toBe("string");
    });

    it(\`\${title} :: \${label} — mounts and runs effects\`, async () => {
      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = createRoot(host);
      await act(async () => { root.render(React.createElement(C)); });
      await act(async () => { root.unmount(); });
      host.remove();
    });
  }
});
`;
writeFileSync(join(OUT, "examples.spec.jsx"), spec);

// Without IS_REACT_ACT_ENVIRONMENT, act() does not actually flush effects and
// React only warns — the mount test would pass without exercising anything.
writeFileSync(join(OUT, "setup.mjs"), `globalThis.IS_REACT_ACT_ENVIRONMENT = true;\n`);

writeFileSync(join(OUT, "vitest.config.mts"), `import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    root: ${JSON.stringify(ROOT)},
    environment: "jsdom",
    globals: true,
    setupFiles: [".react-verify/setup.mjs"],
    include: [".react-verify/examples.spec.jsx"],
    reporters: ["default"],
  },
});
`);

// ── run it ─────────────────────────────────────────────────────────────────
console.log(`Executing ${cases.length} example(s) from ${items.length} question(s)...\n`);
const res = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "--config", ".react-verify/vitest.config.mts"],
  { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" },
);

const report = {
  generatedAt: new Date().toISOString(),
  examplesExecuted: cases.length,
  passed: res.status === 0,
  unverifiable: skipped,
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

if (skipped.length) {
  console.log(`\n~ ${skipped.length} example(s) not executable in jsdom (reported as unverifiable, not as passing):`);
  skipped.forEach((s) => console.log(`   ${s.title.slice(0, 52)} / ${s.label}: ${s.reason}`));
}
console.log(`\nReport → .react-verify/report.json`);
process.exit(res.status ?? 1);
