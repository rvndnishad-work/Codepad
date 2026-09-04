#!/usr/bin/env node
/**
 * `npm run lint` entry point.
 *
 * Runs ESLint in a child Node process that preloads `ts5-resolve.cjs`, so
 * `typescript-eslint` sees TypeScript 5.9.3 instead of the app's TypeScript 7
 * (which it refuses to load against). See scripts/ts5-resolve.cjs.
 *
 * Any arguments are forwarded, so `npm run lint -- --fix src/lib` works.
 *
 * `--require` is passed as a real argv flag rather than through NODE_OPTIONS
 * to avoid Windows quoting problems with the absolute path.
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const preload = path.join(__dirname, "ts5-resolve.cjs");
// ESLint 10's "exports" map doesn't expose ./bin/eslint.js, so resolve the
// package root (./package.json *is* exported) and walk to the bin from there.
const eslintBin = path.join(
  path.dirname(require.resolve("eslint/package.json")),
  "bin",
  "eslint.js"
);
const args = process.argv.slice(2);

const result = spawnSync(
  process.execPath,
  ["--require", preload, eslintBin, ...(args.length ? args : ["."])],
  { stdio: "inherit", env: process.env }
);

if (result.error) {
  console.error("[lint] failed to start ESLint:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
