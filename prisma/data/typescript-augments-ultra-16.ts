/**
 * TYPESCRIPT ULTRA — batch 16: Libraries, strictness and resources (attw, isolatedDeclarations,
 * strictness flags and TS 5.6+ checks, using / await using, DisposableStack). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 * Multi-file and TypeScript 5.5+ claims were checked separately, as each answer says.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What does \`arethetypeswrong\` (attw) detect and how do you fix false ESM/CJS packages?`,
    difficulty: "medium",
    seoDescription: `What attw (Are the Types Wrong) checks in a package: Masquerading as CJS/ESM, incorrect default export, fallback conditions, and how to fix exports.`,
    description: `**Question presented to candidate:**
"You publish a package that works for some users and breaks for others: ESM users get a type error on a default import that runs fine, CommonJS users get told to use a dynamic import. What does \`arethetypeswrong\` check, and how would you fix the package?"

**What a strong answer should cover:**
- What attw does: packs the package and resolves every \`exports\` entrypoint the way TypeScript does under \`node10\`, \`node16\` (from CJS and from ESM) and \`bundler\`, then compares the declaration file it finds with the JavaScript file Node would load
- The core rule: under \`node16\`/\`nodenext\` a \`.d.ts\` file's module format comes from the nearest \`package.json\` \`"type"\` (\`.d.mts\` is always ESM, \`.d.cts\` always CJS), so one shared \`index.d.ts\` cannot describe both an \`.mjs\` and a \`.cjs\` file
- The main problem kinds by name: Masquerading as CJS / as ESM, Incorrect default export (\`export default\` typed for \`module.exports =\`), CJS default export, Used fallback condition, Resolution failed / No types, Named exports
- The fix: one declaration file per format (\`.d.mts\` next to \`.mjs\`, \`.d.cts\` next to \`.cjs\`), nested \`import\` / \`require\` conditions with \`"types"\` first in each, and \`export =\` for a CommonJS file that assigns \`module.exports\`
- How it is used: \`attw --pack .\` (or \`--profile node16\` / \`esm-only\`) in CI before publishing, because a wrong \`.d.ts\` is trusted by TypeScript and only fails for some consumers

**Clarifying questions expected:**
- Does the package need to support CommonJS consumers at all, or can it be ESM-only?
- Which module resolution settings do the consumers use (\`bundler\`, \`nodenext\`, old \`node10\`)?

**Code / implementation expected:** Optional — a broken and a fixed \`package.json\` \`exports\` map, and why a default import type-checks wrongly.`,
    answer: `**Target Audience:** Library authors who publish to npm, and app developers who hit a strange type error when importing a package that runs fine.
**Difficulty:** Medium
**TypeScript version:** The page examples were checked with TypeScript 5.4.5 (\`--strict\`). The package reproductions in sections 4 to 7 are small multi-file projects compiled with TypeScript 5.4.5 (and 5.9.3 where noted, \`module\` / \`moduleResolution\` \`nodenext\`) and run with Node.js 22.22. attw itself was **not** run here (it is not installed in this sandbox); its problem names and descriptions are quoted from its source code and README.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

This page is about the *published package*. Reading TypeScript's own resolution trace for your app is covered in [How do you debug type-resolution and ESM/CJS mismatches with \`traceResolution\` and \`explain\`?](/interview-question/how-do-you-debug-type-resolution-and-esm-cjs-mismatches-with-traceresolution-and), and choosing a resolution mode in [When should you use \`moduleResolution: "bundler"\` versus \`"nodenext"\`?](/interview-question/when-should-you-use-moduleresolution-bundler-versus-nodenext)

## 1. Why This Even Matters — A Story First

A pharmacy sells the same medicine in two forms: tablets and syrup. Somebody prints one leaflet for both boxes and it says "swallow whole". The tablet customers are fine. The syrup customers either choke on the instructions or ignore them and pour it on a spoon, which works, while the leaflet insists they are doing it wrong.

A dual npm package is that pharmacy. It ships an ES module file and a CommonJS file (the two "forms"), and a \`.d.ts\` declaration file (the "leaflet") that TypeScript reads instead of the code. If one leaflet is shared, TypeScript gives one set of customers wrong instructions: an error on code that works, or no error on code that crashes. **Are the Types Wrong** (\`attw\`) is the inspector that opens every box, reads the leaflet each customer would get, and checks it against what is actually inside.

## 2. What attw Actually Checks

TypeScript never looks at a package's JavaScript when it type-checks your import. It resolves the import to a declaration file and trusts it completely (see [What are declaration files (.d.ts)?](/interview-question/what-are-declaration-files-d-ts)). Node, separately, resolves the same import to a JavaScript file and runs it. Nothing in either tool checks that the two files agree.

attw does that check. For every entrypoint in the package's \`exports\` map it runs TypeScript's resolver in several modes and records two answers: which declaration file TypeScript finds, and which JavaScript file the runtime would load. Then it compares them. Its README lists the modes as \`node10\`, \`node16\` and \`bundler\`, and \`node16\` is checked twice: once as if the import came from a CommonJS file and once from an ES module file.

📌 **Interview term: module format** — whether a file is an ES module (ESM: \`import\` / \`export\`) or CommonJS (CJS: \`require\` / \`module.exports\`). Node decides it from the extension (\`.mjs\` ESM, \`.cjs\` CJS) or, for \`.js\`, from the nearest \`package.json\` \`"type"\` field.

📌 **Interview term: entrypoint** — a path a consumer can import: \`"."\` for \`import "pkg"\`, or a subpath such as \`"./utils"\` for \`import "pkg/utils"\`, declared in the \`exports\` map.

📌 **Interview term: conditional exports** — an \`exports\` entry that maps conditions (\`"import"\`, \`"require"\`, \`"types"\`, \`"default"\`, ...) to files. Node and TypeScript walk the conditions **in object order** and take the first one that matches.

📌 **Interview term: resolution mode** — which algorithm TypeScript uses to find a module (\`node10\`, \`node16\`/\`nodenext\`, \`bundler\`). Only \`node16\`/\`nodenext\` gives declaration files a module format, which is why most attw problems appear only in that column.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="For one import, TypeScript resolves a declaration file and Node resolves a JavaScript file; attw compares the module format of both">
  <rect class="d-box-accent" x="250" y="20" width="220" height="56" rx="10"/>
  <text class="d-text" x="360" y="45" text-anchor="middle">import hello from pkg</text>
  <text class="d-sub" x="360" y="65" text-anchor="middle">one entrypoint, one mode</text>
  <rect class="d-box" x="40" y="140" width="240" height="64" rx="10"/>
  <text class="d-text" x="160" y="167" text-anchor="middle">TypeScript finds</text>
  <text class="d-sub" x="160" y="189" text-anchor="middle">index.d.ts, format CJS</text>
  <rect class="d-box" x="440" y="140" width="240" height="64" rx="10"/>
  <text class="d-text" x="560" y="167" text-anchor="middle">Node loads</text>
  <text class="d-sub" x="560" y="189" text-anchor="middle">index.mjs, format ESM</text>
  <line class="d-edge" x1="300" y1="76" x2="170" y2="138"/>
  <line class="d-edge" x1="420" y1="76" x2="550" y2="138"/>
  <rect class="d-box-muted" x="230" y="236" width="260" height="50" rx="10"/>
  <text class="d-text" x="360" y="266" text-anchor="middle">attw: formats differ</text>
  <line class="d-edge-dashed" x1="160" y1="204" x2="300" y2="234"/>
  <line class="d-edge-dashed" x1="560" y1="204" x2="420" y2="234"/>
</svg>

For each entrypoint and each mode, attw holds the two files side by side. When the declaration file says "CommonJS" and the runtime file is an ES module, the leaflet and the box disagree, and attw reports it.

## 3. The Problems attw Reports

These are the problem kinds from attw's source (\`packages/core/src/problems.ts\` in the arethetypeswrong repository, CLI 0.18.5 on the main branch), with the short label the CLI table shows and the rule name used by \`--ignore-rules\`:

| Label in the table | Rule name | What it means |
| :--- | :--- | :--- |
| 💀 Resolution failed | \`no-resolution\` | The import resolves to neither types nor JavaScript |
| ❌ No types | \`untyped-resolution\` | JavaScript found, no declaration file |
| 🎭 Masquerading as CJS | \`false-cjs\` | "Types are CJS, but implementation is ESM" |
| 👺 Masquerading as ESM | \`false-esm\` | "Types are ESM, but implementation is CJS" |
| ⚠️ ESM (dynamic import only) | \`cjs-resolves-to-esm\` | A \`require\` resolves to an ES module, so CJS consumers need \`import()\` |
| 🐛 Used fallback condition | \`fallback-condition\` | Types found only after an earlier condition failed (a TypeScript bug the tool warns about) |
| 🤨 CJS default export | \`cjs-only-exports-default\` | The CJS file sets \`exports.default\` + \`__esModule\` but not \`module.exports\`, so Node users need \`.default\` |
| ❗️ Incorrect default export | \`false-export-default\` | Types use \`export default\` where the JavaScript does \`module.exports =\`; should be \`export =\` |
| ❓ Missing \`export =\` | \`missing-export-equals\` | JavaScript sets both \`module.exports\` and \`.default\`, types only show \`.default\` |
| 🚭 Unexpected module syntax | \`unexpected-module-syntax\` | ESM syntax in a file Node treats as CJS, or the reverse |
| 🥴 Internal resolution error | \`internal-resolution-error\` | An import *inside* a declaration file fails to resolve |
| 🕵️ Named exports | \`named-exports\` | TypeScript allows a named import from a CJS file that Node cannot detect, so it crashes at run time |

The two "masquerading" problems are the "false ESM/CJS packages" the question asks about. The next sections build one, watch it fail, and fix it.

## 4. Reproducing "Masquerading as CJS"

A typical hand-written dual package: two JavaScript files, one shared declaration file, no \`"type"\` field.

~~~json
{
  "name": "pkg",
  "version": "1.0.0",
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.mjs",
      "require": "./index.cjs"
    }
  }
}
~~~

~~~ts
// node_modules/pkg/index.d.ts
declare function hello(): string;
export default hello;

// node_modules/pkg/index.mjs
export default function hello() { return "hi from ESM"; }
~~~

A consumer written as an ES module (\`main.mts\`, \`module: "nodenext"\`):

~~~ts
import hello from "pkg";
console.log(hello());
~~~

TypeScript 5.4.5 rejects it (absolute path shortened to \`.../\`):

~~~text
main.mts(2,13): error TS2349: This expression is not callable.
  Type 'typeof import(".../node_modules/pkg/index")' has no call signatures.
~~~

Node 22 runs the same file and prints \`hi from ESM\`. Why the disagreement? \`index.d.ts\` sits in a package with no \`"type": "module"\`, so under \`nodenext\` TypeScript treats it as the types of a **CommonJS** file. An ES module that default-imports CommonJS gets the whole \`module.exports\` object, and TypeScript models \`export default hello\` in CJS as \`exports.default = hello\`. So, to TypeScript, the default import is \`{ default: hello }\`, which is not callable. The real file is ESM, where the default import *is* \`hello\`.

It gets worse: the "fix" TypeScript seems to ask for compiles and crashes.

~~~ts
import hello from "pkg";
console.log(hello.default());
~~~

TypeScript 5.4.5: no errors. Node 22: \`TypeError: hello.default is not a function\`. This is exactly the consequence attw's docs describe for this problem: errors on code that works, and no error on code that crashes.

## 5. The Fix: One Declaration File Per Format

Give each JavaScript file its own declaration file with the matching extension, and nest \`"types"\` inside each condition, first.

~~~json
{
  "name": "pkg",
  "version": "1.0.1",
  "exports": {
    ".": {
      "import": { "types": "./index.d.mts", "default": "./index.mjs" },
      "require": { "types": "./index.d.cts", "default": "./index.cjs" }
    }
  }
}
~~~

~~~ts
// index.d.mts — the ES module really has a default export
declare function hello(): string;
export default hello;

// index.d.cts — index.cjs does module.exports = hello, so say exactly that
declare function hello(): string;
export = hello;
~~~

With this package, the ESM consumer from section 4 compiles with no errors and prints \`hi from ESM\`. A CommonJS consumer (\`main.cts\`) written as \`import hello = require("pkg"); console.log(hello());\` also compiles with no errors; tsc emits \`const hello = require("pkg");\` and the compiled file prints \`hi from CJS\`.

📌 **Interview term: \`export =\`** — the declaration-file syntax for "this CommonJS module's \`module.exports\` *is* this value". \`export default\` in a \`.d.cts\` means something else: \`exports.default = value\`. Using \`export default\` for a \`module.exports =\` file is attw's "Incorrect default export".

Note that this package is a **dual package**: the ESM and CJS files are separate module instances, so an app that loads both gets two copies of any module-level state. That is a design choice to make knowingly, and an ESM-only package avoids it.

## 6. "Used Fallback Condition": When Order Matters

Condition order is easy to get wrong. In this package (\`"type": "module"\`), \`"import"\` comes before \`"types"\` and the declaration file lives in a separate \`types/\` folder:

~~~json
"exports": {
  ".": {
    "import": "./index.js",
    "types": "./types/index.d.ts"
  }
}
~~~

TypeScript 5.4.5 compiles the consumer with no error, so the author thinks it is fine. \`--traceResolution\` shows why it "works" (paths shortened):

~~~text
Matched 'exports' condition 'import'.
Using 'exports' subpath '.' with target './index.js'.
File name './node_modules/pkg/index.js' has a '.js' extension - stripping it.
Failed to resolve under condition 'import'.
Matched 'exports' condition 'types'.
Using 'exports' subpath '.' with target './types/index.d.ts'.
File './node_modules/pkg/types/index.d.ts' exists - use it as a name resolution result.
Resolved under condition 'types'.
~~~

The \`"import"\` target had no sibling \`index.d.ts\`, the lookup failed, and TypeScript moved on to the next condition. attw flags this as 🐛 Used fallback condition and calls the behaviour a TypeScript bug that "should not be relied upon". The fix is the same as before: put \`"types"\` first, inside each branch.

## 7. "Masquerading as ESM": The Mirror Image

Same shared \`index.d.ts\`, but now the package has \`"type": "module"\` (\`index.js\` is ESM, \`index.cjs\` is CJS). The declaration file now reads as ESM for everyone, including \`require\` users. With a CommonJS consumer (\`main.cts\`, \`import { hello } from "pkg"\`), TypeScript 5.4.5 reports:

~~~text
main.cts(1,23): error TS1479: The current file is a CommonJS module whose imports will produce 'require' calls; however, the referenced file is an ECMAScript module and cannot be imported with 'require'. Consider writing a dynamic 'import("pkg")' call instead.
~~~

That error is false: \`require("pkg")\` loads \`index.cjs\`, a real CommonJS file, and the compiled program prints \`hi from cjs\`. TypeScript 5.9.3 compiles the same project with no error, because since TypeScript 5.8 \`--module nodenext\` allows \`require()\` of an ES module (per the [5.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)), but the types still describe the wrong file. The fix is again a \`.d.cts\` for the \`require\` branch.

## 8. Running attw

From the CLI README (not run in this sandbox):

~~~bash
npx --yes @arethetypeswrong/cli --pack .          # npm pack this folder, analyze, delete the tarball
attw --pack . --profile node16                    # ignore node10 failures
attw --pack . --profile esm-only                  # ignore CJS failures for an ESM-only package
attw --from-npm some-package                      # check a published package
attw --pack . --ignore-rules false-export-default # silence one rule deliberately
~~~

The output is a table: one column per entrypoint, one row per mode (\`node10\`, \`node16\` from CJS, \`node16\` from ESM, \`bundler\`), each cell showing ✅ or the problem emoji. \`--format json\` gives machine-readable output, and a \`.attw.json\` file can hold the same options. The README notes that \`--pack\` uses npm, so pnpm and yarn users should pack the tarball themselves and pass its file name.

Add it to CI *after the build and before publish*: it checks the tarball, so it also catches files missing from \`"files"\`.

## 9. Which Fix For Which Problem

| attw says | Usual cause | Fix |
| :--- | :--- | :--- |
| Masquerading as CJS | One \`.d.ts\` for an \`.mjs\` + \`.cjs\` pair, no \`"type"\` | Add \`index.d.mts\`; nest \`"types"\` under \`"import"\` |
| Masquerading as ESM | One \`.d.ts\` in a \`"type": "module"\` package that also ships \`.cjs\` | Add \`index.d.cts\`; nest \`"types"\` under \`"require"\` |
| Incorrect default export | Types say \`export default\`, JS says \`module.exports =\` | Use \`export =\` in the \`.d.cts\` |
| CJS default export | Compiled CJS sets only \`exports.default\` | Also set \`module.exports\`, or ship real ESM for ESM users |
| Used fallback condition | \`"types"\` after \`"import"\`/\`"require"\` | Put \`"types"\` first in every branch |
| ESM (dynamic import only) | ESM-only package | Fine if intended (\`--profile esm-only\`); otherwise add a CJS build |
| Resolution failed / No types | Path typo, file not in \`"files"\`, missing \`"types"\` | Fix the path or the \`files\` list and re-pack |

## 10. Verified: Running the Code

The two page examples were type-checked with tsc 5.4.5 \`--strict\` and run in a copy of the page runner.

**Example 1** simulates the two ways a CommonJS file is default-imported. The "Node" column matches what Node 22 really did with real files in this sandbox: a tsc-compiled \`exports.default\` file default-imported from an \`.mjs\` gave an object with key \`default\`, and a \`module.exports = fn\` file gave the function.

~~~text
compiled ESM, Node:    ["default"]
compiled ESM, interop: the function
module.exports, Node:    the function
module.exports, interop: the function
mod.default under Node: undefined
typed call: hello
~~~

**Example 2** is a toy version of the masquerading check: it walks conditions in order and gives the \`.d.ts\` the same format rule Node gives the \`.js\`.

~~~text
broken import -> ./index.d.ts (CJS) + ./index.mjs (ESM): Masquerading as CJS (FalseCJS)
broken require -> ./index.d.ts (CJS) + ./index.cjs (CJS): OK
flipped import -> ./index.d.ts (ESM) + ./index.js (ESM): OK
flipped require -> ./index.d.ts (ESM) + ./index.cjs (CJS): Masquerading as ESM (FalseESM)
fixed import -> ./index.d.mts (ESM) + ./index.mjs (ESM): OK
fixed require -> ./index.d.cts (CJS) + ./index.cjs (CJS): OK
~~~

One shared \`.d.ts\` is always wrong for one of the two branches; only one declaration file per format passes both.

## 11. Edge Cases Worth Knowing

- **\`bundler\` mode hides most of this.** Bundler resolution does not give declaration files a module format, so a package can look fine in a Vite app and fail in a \`nodenext\` one. That is why attw checks several modes.
- **Bun is not Node here.** In this sandbox, Bun 1.4.2 default-imported the tsc-compiled \`exports.default\` file as the function (it honours \`__esModule\`, like bundlers), while Node gave the \`{ default }\` object. "Works in my runtime" proves little.
- **\`"types"\` at the top level of \`package.json\`** is only used when there is no \`exports\` map (or by \`node10\`). Once \`exports\` exists, the conditions decide.
- **ESM-only is a valid answer.** If you drop CommonJS, attw's ⚠️ for \`require\` is expected; say so with \`--profile esm-only\` instead of ignoring rules one by one.

## Common Pitfalls

- **One \`index.d.ts\` for both builds.** Its format follows \`"type"\`, so it is wrong for exactly one of \`.mjs\` / \`.cjs\`.
- **Putting \`"types"\` last.** Conditions match in order; a \`"types"\` after \`"import"\` is reached only through the fallback bug, or not at all.
- **Writing \`export default\` for a \`module.exports =\` file.** TypeScript under \`node16\` then demands \`.default\`, which is \`undefined\` at run time. Use \`export =\`.
- **Trusting a green \`tsc\` in your own repo.** Your own tests import source files, not the packed tarball under every resolution mode. Check the tarball.
- **Silencing problems with \`--ignore-rules\` instead of fixing the map.** Ignore a rule only for a decision you made on purpose (for example ESM-only).
- **Forgetting the dual-package hazard.** Two builds mean two module instances; singletons, \`instanceof\` checks and caches can split.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">attw packs a package and, for every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exports</code> entrypoint, resolves it the way TypeScript does under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node10</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node16</code> from CJS, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node16</code> from ESM and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bundler</code>, then compares the declaration file it finds with the JavaScript file the runtime loads.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The core rule:</strong> <span style="color:#f0e2c8;">Under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodenext</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> gets its module format from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">package.json</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"type"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.mts</code> is ESM and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.cts</code> is CJS. TypeScript trusts that format, so one shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index.d.ts</code> is wrong for either the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.mjs</code> or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.cjs</code> file.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The symptoms:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Masquerading as CJS</strong> gives an error on a default import that works (TS2349) and no error on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.default()</code> that crashes. <strong style="color:#ffca28;">Masquerading as ESM</strong> gives a false "use dynamic import" error (TS1479 in 5.4).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The fix:</strong> <span style="color:#f0e2c8;">One declaration file per format: nested <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"import": { "types": "./index.d.mts", "default": "./index.mjs" }</code> and the same for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"require"</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.cts</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"types"</code> first, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export =</code> for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module.exports =</code> file.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Process:</strong> <span style="color:#f0e2c8;">Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">attw --pack .</code> in CI after the build and before publish, pick a profile that matches what you support (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node16</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esm-only</code>), and only ignore a rule for a deliberate decision.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the same package pass in a Vite app and fail in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nodenext</code> one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bundler</code> resolution does not assign a module format to declaration files, so a format mismatch is invisible there. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node16</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodenext</code> models Node rules, which is where the masquerading problems show up.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">export default</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">export =</code> in a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.d.cts</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export default x</code> describes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exports.default = x</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export = x</code> describes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module.exports = x</code>. Node default-imports a CJS file as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module.exports</code>, so the wrong one makes TypeScript demand or forbid <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.default</code> incorrectly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "Used fallback condition" mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TypeScript matched an earlier condition such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"import"</code>, could not find types next to that file, and silently continued to a later <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"types"</code> condition. attw calls it a TypeScript bug not to rely on; put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"types"</code> first in each branch.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does fixing the types fix the dual-package hazard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Two builds still create two module instances at run time, so module-level state can be duplicated. Correct types only make each copy described accurately; going ESM-only removes the hazard.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just check the package with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tsc</code> in its own repo?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The repo imports source files through its own tsconfig, not the packed tarball through every consumer resolution mode. attw tests the artifact users install, including files missing from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"files"</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Module format | ESM or CJS; set by extension or \`package.json\` \`"type"\` |
| Entrypoint | An importable path in \`exports\` (\`"."\`, \`"./utils"\`) |
| Conditional exports | \`exports\` entries keyed by \`import\` / \`require\` / \`types\` / \`default\`, matched in order |
| Resolution mode | \`node10\`, \`node16\`/\`nodenext\` or \`bundler\`: how TypeScript finds a module |
| Masquerading as CJS / ESM | Declaration file format differs from the JavaScript file format |
| \`export =\` | Declaration syntax for \`module.exports = value\` |
| Fallback condition | Types found only after an earlier condition failed |
| Dual package | A package shipping both ESM and CJS builds |

**Conclusion:** attw exists because TypeScript checks your import against a declaration file it never verifies against the JavaScript, and under \`nodenext\` it also takes the module format from that file. A shared \`.d.ts\` in a dual package therefore lies to one group of users: errors on working code, silence on crashing code. Ship one declaration file per format, nest \`"types"\` first in each condition, use \`export =\` for \`module.exports\`, and run \`attw --pack .\` on the tarball before every publish.`,
    examples: [
      {
        label: `The same CommonJS file, two different default imports`,
        code: `// Why "the types say default export" can be wrong: the same CommonJS file
// gives a different default import depending on who loads it.
// (A simulation: the page has no real module loader.)

type CjsExports = { [key: string]: unknown; __esModule?: boolean };

// Node ESM importing CommonJS: the default import IS module.exports. __esModule is ignored.
function nodeDefaultImport(exportsObj: CjsExports): unknown {
  return exportsObj;
}
// Bundlers and TypeScript esModuleInterop: honour the __esModule marker.
function interopDefaultImport(exportsObj: CjsExports): unknown {
  return exportsObj.__esModule ? exportsObj.default : exportsObj;
}

function hello(): string {
  return "hello";
}
const describe = (v: unknown): string =>
  typeof v === "function" ? "the function" : JSON.stringify(Object.keys(v as object));

// 1. Compiled from "export default hello" by tsc / a bundler (module: commonjs):
// tsc emits: Object.defineProperty(exports, "__esModule", { value: true }); exports.default = hello;
const compiledEsm: CjsExports = Object.defineProperty({ default: hello }, "__esModule", { value: true });
console.log("compiled ESM, Node:   ", describe(nodeDefaultImport(compiledEsm)));
console.log("compiled ESM, interop:", describe(interopDefaultImport(compiledEsm)));

// 2. Hand-written "module.exports = hello":
const moduleExportsFn = hello as unknown as CjsExports;
console.log("module.exports, Node:   ", describe(nodeDefaultImport(moduleExportsFn)));
console.log("module.exports, interop:", describe(interopDefaultImport(moduleExportsFn)));

// Case 1 is attw "CJS default export": Node users must write mod.default().
// Case 2 typed as "export default hello" is attw "Incorrect default export":
// TypeScript (node16) would demand mod.default(), which is undefined at run time.
const nodeView = nodeDefaultImport(moduleExportsFn) as { default?: unknown };
console.log("mod.default under Node:", typeof nodeView.default);

// The type-level fix mirrors the runtime: describe module.exports with "export =".
// A .d.cts saying  declare function hello(): string; export = hello;
// makes TypeScript treat the default import as the function itself.
type DefaultImportOf<M> = M; // Node: default import = module.exports
const viaNode: DefaultImportOf<typeof hello> = hello;
console.log("typed call:", viaNode());`,
      },
      {
        label: `A toy attw: does the .d.ts format match the .js format?`,
        code: `// A toy version of two attw checks (the real tool runs the TypeScript resolver).
// It applies Node's rule for the format of a file, to the .d.ts as well as the .js.

type Format = "ESM" | "CJS";
type Target = string | { [condition: string]: Target };
interface Pkg { type?: "module" | "commonjs"; exports: { [condition: string]: Target } }

function formatOf(file: string, pkg: Pkg): Format {
  if (/\\.(mjs|d\\.mts)$/.test(file)) return "ESM";
  if (/\\.(cjs|d\\.cts)$/.test(file)) return "CJS";
  return pkg.type === "module" ? "ESM" : "CJS"; // .js and .d.ts follow "type"
}

// Walk conditions in object order, like Node and TypeScript do.
function resolve(t: Target, conditions: string[]): string | undefined {
  if (typeof t === "string") return t;
  for (const [key, value] of Object.entries(t)) {
    if (key === "default" || conditions.includes(key)) {
      const hit = resolve(value, conditions);
      if (hit) return hit;
    }
  }
  return undefined;
}

function check(name: string, pkg: Pkg): void {
  for (const mode of ["import", "require"] as const) {
    const js = resolve(pkg.exports["."], [mode, "node"]);
    const dts = resolve(pkg.exports["."], ["types", mode, "node"]);
    if (!js || !dts) { console.log(name, mode, "-> Resolution failed"); continue; }
    const jsF = formatOf(js, pkg), dtsF = formatOf(dts, pkg);
    let verdict = "OK";
    if (dtsF === "CJS" && jsF === "ESM") verdict = "Masquerading as CJS (FalseCJS)";
    else if (dtsF === "ESM" && jsF === "CJS") verdict = "Masquerading as ESM (FalseESM)";
    console.log(name, mode, "->", dts, "(" + dtsF + ") +", js, "(" + jsF + "):", verdict);
  }
}

// One index.d.ts for both conditions, no "type": the types read as CJS everywhere.
check("broken", {
  exports: { ".": { types: "./index.d.ts", import: "./index.mjs", require: "./index.cjs" } },
});
// Same files with "type": "module": now the types read as ESM everywhere.
check("flipped", {
  type: "module",
  exports: { ".": { types: "./index.d.ts", import: "./index.js", require: "./index.cjs" } },
});
// The fix: one declaration file per format, "types" first inside each branch.
check("fixed", {
  exports: {
    ".": {
      "import": { types: "./index.d.mts", default: "./index.mjs" },
      "require": { types: "./index.d.cts", default: "./index.cjs" },
    },
  },
});`,
      },
    ],
  },
  {
    title: `What is \`isolatedDeclarations\` and how does it enable single-file transpilation for declaration emit?`,
    difficulty: "hard",
    seoDescription: `TypeScript isolatedDeclarations (5.5): why .d.ts emit needs a type checker, what must be annotated, TS9007/TS9010 errors and per-file emit tools.`,
    description: `**Question presented to candidate:**
"Transpiling TypeScript to JavaScript can be done one file at a time by fast tools, but generating \`.d.ts\` files has always needed \`tsc\`. Why is that, and what does the \`isolatedDeclarations\` option change?"

**What a strong answer should cover:**
- Why declaration emit needs a type checker: an unannotated export (a function return type, a variable set from a call) gets its type from inference, which can depend on other files and on the whole program
- What \`isolatedDeclarations\` does (TypeScript 5.5+): it reports an error wherever an export's type cannot be written down from that file's syntax alone, so any tool can produce the \`.d.ts\` file by copying annotations, with no checker
- What still needs no annotation ("trivially inferable"): literals, object literals of literals, \`as const\` arrays, type assertions; what does (calls, \`new\`, spreads, plain arrays, unannotated returns, parameters with non-literal defaults) and the TS90xx error family
- What it does not do: it changes no emit by itself, needs \`declaration\` or \`composite\`, and tsc writes no \`.d.ts\` while those errors exist
- The payoff: per-file, parallel declaration emit (\`ts.transpileDeclaration\`, oxc, bundler plugins) and starting downstream type checks before upstream projects finish

**Code / implementation expected:** Optional — an exported function that fails under the flag, the error, and the annotated version.`,
    answer: `**Target Audience:** Developers who build or publish TypeScript libraries or large monorepos and want to understand why \`.d.ts\` generation is slow and what \`isolatedDeclarations\` changes.
**Difficulty:** Hard
**TypeScript version:** \`isolatedDeclarations\` arrived in TypeScript 5.5. The page compiler is TypeScript 5.4.5, which rejects the flag (\`error TS5023: Unknown compiler option '--isolatedDeclarations'.\`, checked here), so the page examples only show the underlying idea. Every \`isolatedDeclarations\` error and every \`.d.ts\` below was produced by TypeScript 5.9.3, by oxc's isolated-declaration transform as bundled in rolldown 1.0.3, and where noted by TypeScript 7.0.2.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

How to write a whole library so that it passes the flag (patterns, traps, tsdown) is the applied sibling: [How do you author library types that pass \`isolatedDeclarations\` for \`oxc\` / \`tsdown\` builds?](/interview-question/how-do-you-author-library-types-that-pass-isolateddeclarations-for-oxc-tsdown-bu) This page is the "what and why".

## 1. Why This Even Matters — A Story First

A bakery prints a menu card for each cake. If every cake has a label saying "chocolate, 8 slices, contains nuts", anyone can print the menu by reading labels, and ten people can print ten cards at the same time. If the labels are missing, only the head baker can write the menu, because only she knows that cake 7 was made from the leftovers of cake 3, which used the nut batch. Everyone waits for her.

A \`.d.ts\` file is the menu: the public types of a module, with no code. When exports carry their types (labels), any fast tool can write the \`.d.ts\` file by copying them, file by file, in parallel. When types are left to inference, only the full TypeScript checker, which can follow the chain through other files, can write it. \`isolatedDeclarations\` is the rule "every cake must have a label", enforced by the compiler.

## 2. The Problem: Declaration Emit Needs Inference

Turning TypeScript into JavaScript is mostly deleting types, so tools such as esbuild, swc and oxc do it one file at a time without understanding types (the same idea as \`isolatedModules\`). Turning TypeScript into a declaration file is different: the \`.d.ts\` must contain types that **are not written anywhere** in the source.

~~~ts
// util.ts
export const one = "1";
// add.ts
import { one } from "./util";
export function add() { return one + one; }
~~~

To write \`export declare function add(): string;\` a tool must know the type of \`one\` (another file), and what \`+\` does with two strings (type-checker rules). The [5.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#isolated-declarations) use this exact example: generating it needs "parts of the type-checker including inference and the ability to resolve module specifiers to follow the imports".

📌 **Interview term: declaration emit** — the compiler step that writes \`.d.ts\` files (\`"declaration": true\`). It produces the public types of each module: exported names, signatures and types, no bodies.

📌 **Interview term: single-file transpilation** — compiling each file on its own, without reading any other file or running the type checker. Fast and parallel, but only possible when the output does not depend on other files.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Without annotations, emitting add.d.ts needs the checker to read util.ts; with annotations each file maps directly to its declaration file">
  <rect class="d-box" x="30" y="40" width="160" height="56" rx="10"/>
  <text class="d-text" x="110" y="74" text-anchor="middle">util.ts</text>
  <rect class="d-box" x="30" y="160" width="160" height="56" rx="10"/>
  <text class="d-text" x="110" y="194" text-anchor="middle">add.ts</text>
  <rect class="d-box-accent" x="280" y="100" width="170" height="56" rx="10"/>
  <text class="d-text" x="365" y="124" text-anchor="middle">type checker</text>
  <text class="d-sub" x="365" y="144" text-anchor="middle">whole program</text>
  <rect class="d-box-muted" x="540" y="100" width="150" height="56" rx="10"/>
  <text class="d-text" x="615" y="134" text-anchor="middle">add.d.ts</text>
  <line class="d-edge" x1="190" y1="68" x2="278" y2="118"/>
  <line class="d-edge" x1="190" y1="188" x2="278" y2="140"/>
  <line class="d-edge-accent" x1="450" y1="128" x2="538" y2="128"/>
</svg>

Without annotations, the \`.d.ts\` of one file depends on the checker reading other files. That forces an order: in a monorepo, a project cannot be type-checked until every project it depends on has finished emitting its declarations.

## 3. What \`isolatedDeclarations\` Does

The flag does not make TypeScript cleverer. It makes it **stricter about exports**: it reports an error wherever the type of an exported thing cannot be read off that file's syntax alone. Once the file has no such errors, its \`.d.ts\` can be produced by a purely syntactic transform: copy each annotation, drop the bodies.

📌 **Interview term: \`isolatedDeclarations\`** — a compiler option (TypeScript 5.5+) that requires enough explicit types on a module's exports for its declaration file to be generated from that file alone. It requires \`declaration\` or \`composite\`.

📌 **Interview term: trivially inferable** — an initializer whose type is visible from its syntax: a literal (\`3000\`, \`"x"\`, \`-1\`), an object literal made of such values, an \`as const\` array, or a type assertion (\`x as Data\`). These need no annotation.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="With isolatedDeclarations every file is turned into its declaration file on its own, so several files can be processed in parallel">
  <rect class="d-box" x="40" y="30" width="170" height="50" rx="10"/>
  <text class="d-text" x="125" y="60" text-anchor="middle">util.ts</text>
  <rect class="d-box" x="40" y="140" width="170" height="50" rx="10"/>
  <text class="d-text" x="125" y="170" text-anchor="middle">add.ts</text>
  <rect class="d-box-accent" x="290" y="30" width="170" height="50" rx="10"/>
  <text class="d-text" x="375" y="60" text-anchor="middle">copy annotations</text>
  <rect class="d-box-accent" x="290" y="140" width="170" height="50" rx="10"/>
  <text class="d-text" x="375" y="170" text-anchor="middle">copy annotations</text>
  <rect class="d-box-muted" x="540" y="30" width="150" height="50" rx="10"/>
  <text class="d-text" x="615" y="60" text-anchor="middle">util.d.ts</text>
  <rect class="d-box-muted" x="540" y="140" width="150" height="50" rx="10"/>
  <text class="d-text" x="615" y="170" text-anchor="middle">add.d.ts</text>
  <line class="d-edge" x1="210" y1="55" x2="288" y2="55"/>
  <line class="d-edge" x1="210" y1="165" x2="288" y2="165"/>
  <line class="d-edge-accent" x1="460" y1="55" x2="538" y2="55"/>
  <line class="d-edge-accent" x1="460" y1="165" x2="538" y2="165"/>
</svg>

With the rule enforced, each file goes straight to its declaration file, no checker and no other files involved, so the work can be split across cores or done inside a bundler.

## 4. The Errors, Observed

This file has one export of each common kind:

~~~ts
const base = [1, 2, 3];
function compute() { return 42; }
export function add(a: number, b: number) { return a + b; }          // line 3
export function twenty() { return 20; }
export const config = { port: 3000, host: "localhost" };
export const flags = ["a", "b"] as const;
export const doubled = base.map((x) => x * 2);                       // line 7
export const len = (s: string) => s.length;                          // line 8
export const cache = new Map<string, number>();                      // line 9
export function greet(name = "world"): string { return "hi " + name; }
export function withOpts(opts = config): number { return opts.port; } // line 11
export class Counter {
  count = 0;
  total = compute();                                                 // line 14
  inc() { this.count++; return this; }                               // line 15
}
export default compute();                                            // line 17
~~~

TypeScript 5.9.3 with \`isolatedDeclarations\`, \`declaration\` and \`emitDeclarationOnly\`:

~~~text
lib.ts(3,17): error TS9007: Function must have an explicit return type annotation with --isolatedDeclarations.
lib.ts(7,14): error TS9010: Variable must have an explicit type annotation with --isolatedDeclarations.
lib.ts(8,20): error TS9007: Function must have an explicit return type annotation with --isolatedDeclarations.
lib.ts(9,14): error TS9010: Variable must have an explicit type annotation with --isolatedDeclarations.
lib.ts(11,33): error TS9011: Parameter must have an explicit type annotation with --isolatedDeclarations.
lib.ts(14,3): error TS9012: Property must have an explicit type annotation with --isolatedDeclarations.
lib.ts(15,3): error TS9008: Method must have an explicit return type annotation with --isolatedDeclarations.
lib.ts(17,16): error TS9037: Default exports can't be inferred with --isolatedDeclarations.
~~~

What passed without annotations is just as instructive:

- \`twenty()\` returns the literal \`20\`, so its return type is visible.
- \`config\` is an object of literals, \`flags\` is \`as const\`.
- \`greet(name = "world")\` has a literal default; \`count = 0\` is a literal.
- Not exported, never checked: \`base\` and \`compute\` are locals. Only the public surface needs types.

And what failed: anything whose type is the *result of computing something*: \`a + b\`, \`.map(...)\`, \`new Map(...)\`, \`compute()\`, a default that is another variable (\`opts = config\`), and a method returning \`this\` without saying so.

oxc (rolldown 1.0.3) reported **the same eight errors with the same codes** on this file. TypeScript 7.0.2 also flagged the same eight places, but reported two of them (the \`a + b\` return and the \`inc()\` method) as \`TS9013: Expression type can't be inferred with --isolatedDeclarations.\` at the returned expression. The codes are an implementation detail; the places are the rule.

## 5. What Happens to Emit

Three things worth knowing, all observed with the file above:

**1. The flag does not change what tsc emits, only what it reports.** Without the flag, TypeScript 5.9.3 emitted a complete, correct \`.d.ts\`, using the checker (excerpt, the lines that failed above):

~~~ts
export declare function add(a: number, b: number): number;
export declare const doubled: number[];
export declare const len: (s: string) => number;
export declare const cache: Map<string, number>;
export declare function withOpts(opts?: {
    port: number;
    host: string;
}): number;
export declare class Counter {
    count: number;
    total: number;
    inc(): this;
}
~~~

**2. With the flag and errors present, tsc wrote no \`.d.ts\` at all** (exit code 1, the \`out/\` folder was not created). The errors are declaration diagnostics, and they block declaration output.

**3. A per-file emitter given a file with errors writes a degraded \`.d.ts\`.** oxc output for the same lines:

~~~ts
export declare function add(a: number, b: number);
export declare const doubled: unknown;
export declare const len: unknown;
export declare const cache: unknown;
export declare function withOpts(opts?): number;
export declare class Counter {
	count: number;
	total;
	inc();
}
~~~

Missing return types and \`unknown\` everywhere it could not see a type. TypeScript's own single-file API, \`ts.transpileDeclaration\` (added in 5.5), wrote \`any\` in those places (\`export declare const doubled: any;\`). That is why the errors matter: a per-file tool cannot do better than the annotations you wrote.

📌 **Interview term: \`transpileDeclaration\`** — the TypeScript API (5.5+) that produces one \`.d.ts\` from one file's source text without a program, the declaration counterpart of \`transpileModule\`. Its output is only accurate when the file has no \`isolatedDeclarations\` errors.

## 6. Why Anyone Wants This

The 5.5 release notes name two use cases:

1. **Faster declaration emit tools.** Bundlers and build tools can emit \`.d.ts\` files themselves, per file, without running \`tsc\` (see the sibling page for tsdown and oxc).
2. **Parallel builds.** In a monorepo, declaration files for every project can be generated up front, in parallel, and then all projects can be type-checked in parallel instead of waiting in dependency order.

The same notes are frank about the cost: the flag "does not change how TypeScript performs emit", enabling it does not by itself make anything faster, and it "should be adopted on a case-by-case basis" because of the lost ergonomics of inference. Teams that already enforce explicit return types (for example with typescript-eslint's \`explicit-function-return-type\` rule, which [Effective TypeScript's 5.5 notes](https://effectivetypescript.com/2024/07/02/ts-55/) compare it to) lose little: the flag only demands annotations on the public API.

| | \`isolatedModules\` | \`isolatedDeclarations\` |
| :--- | :--- | :--- |
| Guards | \`.ts\` to \`.js\` emit by single-file tools | \`.ts\` to \`.d.ts\` emit by single-file tools |
| Rejects | Code whose JS needs type info, e.g. re-exporting a type without \`export type\` (TS1205), reading an ambient \`const enum\` (TS2748) | Exports whose type is not written in the file |
| Changes emit? | No | No |
| Needs | nothing | \`declaration\` or \`composite\` |

## 7. Verified: Running the Code

The page examples ran under TypeScript 5.4.5 \`--strict\` in a copy of the page runner. They cannot use the flag itself (5.4.5 does not know it), so they show the reason it exists.

**Example 1** shows that an unannotated function's public type is decided by code elsewhere, and that an annotation pins it (the \`@ts-expect-error\` line is a verified compile error: \`error TS2322: Type 'number' is not assignable to type 'string'.\`):

~~~text
12 3 12
true function
~~~

**Example 2** is a toy model of the "trivially inferable" rule for exported constants. Each verdict was checked against real tools: the same eight declarations (with \`base\`, \`nums\`, \`f\`, \`s\` and \`Data\` defined locally) produced exactly these four errors in TypeScript 5.9.3 and in oxc.

~~~text
ok      export const port = 3000
ok      export const cfg = { port: 3000, host: "x" }
ok      export const flags = ["a", "b"] as const
TS9017  export const list = [1, 2]  -> only const arrays can be inferred
TS9015  export const merged = { ...base }  -> spread needs the type of another value
TS9010  export const doubled = nums.map(f)  -> needs the return type of nums.map
TS9010  export const cache = new Map<string, number>()  -> needs the type that new Map builds
ok      export const data = JSON.parse(s) as Data
~~~

## 8. Edge Cases

- **\`export const list = [1, 2]\` fails, \`[1, 2] as const\` passes.** A mutable array literal could be \`number[]\` or a tuple depending on rules a syntactic tool should not guess, so only const arrays count (TS9017).
- **\`satisfies\` does not count as an annotation.** TypeScript 5.9.3 reported TS9010 for \`export const routes = { ... } satisfies Record<string, string>;\` (oxc accepted it). Details on the sibling page.
- **Locals are free.** Only declarations that reach the \`.d.ts\` need types; a helper used only inside the file needs none.
- **Errors appear on the export, not where the type comes from.** The fix is always at the export: write the type there.

## Common Pitfalls

- **Expecting a speed-up from the flag alone.** It only reports errors; the speed comes from a tool that uses the guarantee (per-file emit, parallel checking).
- **Turning it on without \`declaration\` or \`composite\`.** TypeScript 5.9.3: \`error TS5069: Option 'isolatedDeclarations' cannot be specified without specifying option 'declaration' or option 'composite'.\`
- **Silencing errors with wide types.** \`export const cache: any = ...\` passes and ruins the public API. Write the type that inference would have produced.
- **Trusting a per-file emitter while errors exist.** It writes \`unknown\`, \`any\` or nothing, without failing your build unless you make it.
- **Annotating locals everywhere.** Not required; it only adds noise and churn.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">JS emit is per-file, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> emit needs types that are often not written: an unannotated return or a variable set from a call gets its type from inference, which can reach into other files. So only the full checker could write declaration files.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The flag:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isolatedDeclarations</code> (TypeScript 5.5) reports an error wherever an export type cannot be read from that file alone. Once a file is clean, any tool can produce its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> by copying annotations.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What needs a type:</strong> <span style="color:#f0e2c8;">Function and method return types unless they return a literal, variables set from calls or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>, spreads, non-const arrays, parameters with non-literal defaults, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export default</code> of an expression. Literals, literal objects, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> and assertions are fine.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Emit:</strong> <span style="color:#f0e2c8;">The flag changes no emit and requires <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">declaration</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">composite</code>; with errors present tsc writes no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code>, and per-file tools like oxc or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ts.transpileDeclaration</code> write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> in those spots.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Payoff:</strong> <span style="color:#f0e2c8;">Per-file, parallel declaration emit in bundlers, and monorepo projects can be type-checked in parallel instead of waiting for upstream declarations. Cost: you give up inference on the public API.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">export function twenty() { return 20; }</code> pass but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">return a + b</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The return expression <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">20</code> is a literal, so its type is visible from syntax. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a + b</code> needs the checker to apply operator rules, so the return type must be written.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isolatedModules</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isolatedModules</code> guards single-file JavaScript emit (no constructs whose JS needs type information). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isolatedDeclarations</code> guards single-file declaration emit (no exports whose type is not written down). Both change only diagnostics.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does every export need an annotation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only exports whose type is not trivially inferable, and only exported things: local helpers need nothing. Literal constants, literal object configs and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> values stay unannotated.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ts.transpileDeclaration</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It produces a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> from a single file source text without a program, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">transpileModule</code> does for JavaScript. It is accurate only for files free of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isolatedDeclarations</code> errors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you turn it on in an application?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not: apps rarely emit declarations. It pays off in libraries and monorepos where declaration emit is on the critical path or a tool like oxc generates the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> files.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Declaration emit | Writing \`.d.ts\` files with the public types of each module |
| Single-file transpilation | Compiling a file with no other files and no type checker |
| \`isolatedDeclarations\` | TS 5.5+ option: exports must carry enough types for per-file \`.d.ts\` emit |
| Trivially inferable | An initializer whose type is visible from syntax (literals, \`as const\`, assertions) |
| \`transpileDeclaration\` | TS API that emits one \`.d.ts\` from one file, no program |
| TS9007 / TS9010 / TS9011 | Missing return type / variable type / parameter type under the flag |

**Conclusion:** Declaration files contain the types of a module public API, and when those types come from inference only a whole-program checker can write them. \`isolatedDeclarations\` turns that into a checked rule: every export must carry a type that can be read from its own file, which lets fast tools emit \`.d.ts\` files one file at a time and lets large builds run in parallel. It changes no output by itself and costs some inference on exports, so it pays off where declaration emit sits on the critical path.`,
    examples: [
      {
        label: `Why declaration emit normally needs other files`,
        code: `// Why declaration emit normally needs the whole program: an exported function
// without a return annotation gets its public type from code it calls,
// which in a real project usually lives in another file.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

// Imagine these two live in util.ts ...
const one = "1";
const two = "2";
// ... and this in add.ts. Its .d.ts line is "add(): string" only because
// the checker looked into util.ts and worked out what string + string gives.
function add() {
  return one + two;
}
const inferred: Equal<ReturnType<typeof add>, string> = true;

// Change only the "other file", and the public type of add changes with it.
const oneN = 1;
const twoN = 2;
function addN() {
  return oneN + twoN;
}
const changed: Equal<ReturnType<typeof addN>, number> = true;

// With an annotation the declaration is readable from this one line alone:
// a tool can copy "(): string" into add.d.ts without a type checker.
function addAnnotated(): string {
  return one + two;
}
const fromSyntax: Equal<ReturnType<typeof addAnnotated>, string> = true;

// The annotation is also a contract: a change elsewhere now fails HERE,
// instead of silently changing what the library exports.
function addGuarded(): string {
  // @ts-expect-error number is not assignable to the declared string
  return oneN + twoN;
}

console.log(add(), addN(), addAnnotated());
console.log(inferred && changed && fromSyntax, typeof addGuarded);`,
      },
      {
        label: `A toy model of the trivially inferable rule`,
        code: `// A toy model of the isolatedDeclarations rule for an exported const:
// "can the type be written down from this initializer's syntax alone?"
// The verdicts and codes are the ones TypeScript 5.9.3 reported (see the answer).

type Init =
  | { kind: "literal"; text: string }
  | { kind: "object"; props: Init[] }
  | { kind: "array"; asConst: boolean; items: Init[] }
  | { kind: "assertion"; type: string }
  | { kind: "call"; text: string }
  | { kind: "new"; text: string }
  | { kind: "spread" };

type Verdict = { ok: true } | { ok: false; code: string; why: string };

function check(init: Init): Verdict {
  switch (init.kind) {
    case "literal":
    case "assertion":
      return { ok: true }; // the type is spelled out in the syntax
    case "object":
      for (const p of init.props) {
        const v = check(p);
        if (!v.ok) return v;
      }
      return { ok: true };
    case "array":
      if (!init.asConst) return { ok: false, code: "TS9017", why: "only const arrays can be inferred" };
      return init.items.map(check).find((v) => !v.ok) ?? { ok: true };
    case "spread":
      return { ok: false, code: "TS9015", why: "spread needs the type of another value" };
    case "call":
      return { ok: false, code: "TS9010", why: "needs the return type of " + init.text };
    case "new":
      return { ok: false, code: "TS9010", why: "needs the type that " + init.text + " builds" };
  }
}

const samples: [string, Init][] = [
  ["export const port = 3000", { kind: "literal", text: "3000" }],
  ["export const cfg = { port: 3000, host: \\"x\\" }", { kind: "object", props: [{ kind: "literal", text: "3000" }, { kind: "literal", text: "\\"x\\"" }] }],
  ["export const flags = [\\"a\\", \\"b\\"] as const", { kind: "array", asConst: true, items: [{ kind: "literal", text: "\\"a\\"" }] }],
  ["export const list = [1, 2]", { kind: "array", asConst: false, items: [] }],
  ["export const merged = { ...base }", { kind: "object", props: [{ kind: "spread" }] }],
  ["export const doubled = nums.map(f)", { kind: "call", text: "nums.map" }],
  ["export const cache = new Map<string, number>()", { kind: "new", text: "new Map" }],
  ["export const data = JSON.parse(s) as Data", { kind: "assertion", type: "Data" }],
];

for (const [src, init] of samples) {
  const v = check(init);
  console.log((v.ok ? "ok      " : v.code + "  ") + src + (v.ok ? "" : "  -> " + v.why));
}`,
      },
    ],
  },
  {
    title: `How do you author library types that pass \`isolatedDeclarations\` for \`oxc\` / \`tsdown\` builds?`,
    difficulty: "hard",
    seoDescription: `Writing library code that passes isolatedDeclarations: annotation patterns, as const, classes, traps, and how tsdown picks oxc for fast .d.ts emit.`,
    description: `**Question presented to candidate:**
"Your team wants to move a TypeScript library from \`tsc\` to tsdown so declaration files are generated by oxc. What changes in how you write the code, and how do you make sure the published types stay the same?"

**What a strong answer should cover:**
- The switch: tsdown generates declarations through rolldown-plugin-dts, which picks its oxc generator when \`compilerOptions.isolatedDeclarations\` is enabled (tsc otherwise); oxc copies types from syntax and never runs a checker
- The authoring rules: explicit return types on exported functions and methods, annotations on exported variables set from calls or \`new\`, typed parameters with non-literal defaults, named default exports; literals, literal objects and \`as const\` stay unannotated
- Writing the *same* type inference produced, not a wider one: \`Record<string, string>\` instead of \`as const\` silently loses keys, \`any\` passes and ruins the API; \`this\` for fluent methods, generics spelled out
- The traps found by running both tools: \`satisfies\` is rejected by tsc but accepted by oxc, \`typeof\` a local pulls the local into the \`.d.ts\`, spreads and computed keys need explicit types
- The safety net: keep \`tsc --noEmit\` with \`isolatedDeclarations\` as the CI gate, diff the emitted \`.d.ts\` before and after, and check the package with attw

**Clarifying questions expected:**
- Is this a library that publishes \`.d.ts\` files, or an app (where the flag rarely pays off)?
- How big is the public API, and is a monorepo build waiting on declaration emit?

**Code / implementation expected:** Yes — rewrite a few failing exports so they pass, and show that the public types are unchanged.`,
    answer: `**Target Audience:** Library authors moving their build to tsdown, Rolldown or another oxc-based tool, and anyone asked to make an existing codebase pass \`isolatedDeclarations\`.
**Difficulty:** Hard
**TypeScript version:** The page examples were checked with TypeScript 5.4.5 \`--strict\` (which has no \`isolatedDeclarations\` flag). Every \`isolatedDeclarations\` error and \`.d.ts\` file below came from TypeScript 5.9.3 and from oxc's isolated-declaration transform as bundled in rolldown 1.0.3 (\`isolatedDeclarationSync\` from \`rolldown/experimental\`). tsdown itself was **not** run here; how it chooses a generator is quoted from its docs and from the rolldown-plugin-dts README.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

What the flag is and why declaration emit needs a type checker is covered in [What is \`isolatedDeclarations\` and how does it enable single-file transpilation for declaration emit?](/interview-question/what-is-isolateddeclarations-and-how-does-it-enable-single-file-transpilation-fo) This page is the hands-on part: what to write, what to avoid, how to prove nothing changed.

## 1. Why This Even Matters — A Story First

A removal company offers two services. The slow one sends an expert who opens every box, works out what is inside and writes the inventory. The fast one sends a team that only reads the labels on the boxes, and does ten rooms at once. The fast team is great, as long as every box has a label, and the labels say what is really inside. A box labelled "stuff" gets listed as "stuff".

\`tsc\` is the expert: it infers types. oxc is the fast team: it reads annotations. Moving a library to an oxc-based build means labelling every exported box (the compiler tells you which ones are missing) and making each label as precise as what the expert would have written.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is this a published library or an app? | Apps rarely emit \`.d.ts\`; the flag mostly pays off for libraries and monorepos |
| Which build tool and version? | tsdown picks oxc only when the flag is on; other tools differ |
| How large is the public API? | Effort scales with exported functions and classes, not with internal code |
| Is the build slow because of declaration emit? | If not, the migration buys little speed |
| Do consumers use \`nodenext\`, \`bundler\`, or both? | The \`.d.ts\` files must still match each format (attw) |

## 3. How tsdown Ends Up Using oxc

tsdown generates declaration files with **rolldown-plugin-dts** (tsdown docs, "How dts Works in tsdown"). The plugin README (main branch, read for this page) says that when no generator is set it selects:

1. \`oxc\` when \`compilerOptions.isolatedDeclarations\` is enabled,
2. \`tsgo\` when TypeScript 7 is installed as \`typescript\`,
3. \`tsc\` otherwise.

The tsdown docs describe the oxc path as "extremely fast" and the TypeScript path as "reliable" but slower. So the switch is one tsconfig line, and the work is making the code pass it:

~~~json
{
  "compilerOptions": {
    "strict": true,
    "declaration": true,
    "isolatedDeclarations": true
  }
}
~~~

📌 **Interview term: oxc** — a Rust JavaScript/TypeScript toolchain (parser, transformer, linter). Its isolated-declaration transform turns one \`.ts\` file into a \`.d.ts\` file from syntax alone, with no type checker.

📌 **Interview term: declaration generator** — the tool that writes a library's \`.d.ts\` files: \`tsc\` (infers types, needs the whole program) or a per-file emitter such as oxc (copies annotations, needs \`isolatedDeclarations\`-clean code).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="One source file goes through tsc as the type checking gate and through oxc as the declaration generator, and both must agree">
  <rect class="d-box-accent" x="30" y="90" width="170" height="60" rx="10"/>
  <text class="d-text" x="115" y="117" text-anchor="middle">src/index.ts</text>
  <text class="d-sub" x="115" y="137" text-anchor="middle">annotated exports</text>
  <rect class="d-box" x="300" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="400" y="47" text-anchor="middle">tsc --noEmit</text>
  <text class="d-sub" x="400" y="67" text-anchor="middle">CI gate, reports errors</text>
  <rect class="d-box" x="300" y="160" width="200" height="60" rx="10"/>
  <text class="d-text" x="400" y="187" text-anchor="middle">oxc via tsdown</text>
  <text class="d-sub" x="400" y="207" text-anchor="middle">writes index.d.ts</text>
  <rect class="d-box-muted" x="580" y="160" width="120" height="60" rx="10"/>
  <text class="d-text" x="640" y="195" text-anchor="middle">dist</text>
  <line class="d-edge" x1="200" y1="110" x2="298" y2="55"/>
  <line class="d-edge-accent" x1="200" y1="130" x2="298" y2="185"/>
  <line class="d-edge-accent" x1="500" y1="190" x2="578" y2="190"/>
</svg>

Keep both paths: tsc (with the flag, \`--noEmit\`) decides whether the code is acceptable, oxc produces the files. Section 6 shows why tsc should be the gate.

## 4. The Rewrites, One Error at a Time

Every row below was an error under TypeScript 5.9.3 and oxc (codes as reported), with the fix that made both pass.

| Before (error) | After |
| :--- | :--- |
| \`export function add(a: number, b: number) { return a + b; }\` (TS9007) | \`export function add(a: number, b: number): number { ... }\` |
| \`export const doubled = base.map((x) => x * 2);\` (TS9010) | \`export const doubled: number[] = base.map(...)\` |
| \`export const len = (s: string) => s.length;\` (TS9007) | \`export const len = (s: string): number => s.length;\` |
| \`export const cache = new Map<string, number>();\` (TS9010) | \`export const cache: Map<string, number> = new Map();\` |
| \`export function withOpts(opts = config)\` (TS9011) | \`export function withOpts(opts: Config = config): number\` |
| class field \`total = compute();\` (TS9012) | \`total: number = compute();\` |
| method \`inc() { ...; return this; }\` (TS9008) | \`inc(): this { ... }\` |
| \`export default compute();\` (TS9037) | \`const defaultTotal: number = compute(); export default defaultTotal;\` |
| \`export const merged = { ...base, host: "x" };\` (TS9015) | Annotate, or build the type: \`export const merged: Base & { host: string } = ...\` |
| \`export const KEY = Symbol("key");\` (TS9010) | \`export const KEY: unique symbol = Symbol("key");\` |
| \`export const list = [1, "a"];\` (TS9017) | \`export const list: (number | string)[] = [1, "a"];\` or \`as const\` |
| \`export const computed = { [KEY2]: 1 };\` (TS9038) | Declare the object type with the computed key, then annotate |

And these need nothing: \`export const port = 3000\`, \`export const config = { port: 3000, host: "localhost" }\`, \`export const ROUTES = { ... } as const\`, \`export const data = JSON.parse(s) as Data\`, \`export function twenty() { return 20; }\`, a parameter property with a literal default (\`private limit = 10\`), and every non-exported helper.

📌 **Interview term: public API surface** — everything that ends up in the \`.d.ts\`: exported declarations plus whatever they reference. \`isolatedDeclarations\` only constrains this surface; internals keep full inference.

Editors help: the 5.5 release notes mention a quick fix for these errors (implemented by Hana Joo), so most rewrites are "Add annotation" on the error.

## 5. Write the Type Inference Would Have Written

The goal is **no change to the published types**. Two ways to break that while making the errors go away:

- **Too wide.** \`export const ROUTES: Record<string, string> = { home: "/", about: "/about" };\` passes, but \`keyof typeof ROUTES\` changes from \`"home" | "about"\` to \`string\` (Example 1 checks this). Keep \`as const\` instead: it is already trivially inferable.
- **\`any\` or \`unknown\`.** \`export const cache: any = new Map()\` passes and deletes the type for every consumer.

Patterns that keep precision:

- Fluent methods return \`this\`, so subclasses keep their own type (Example 1, check 6).
- Generic helpers spell out the relationship: \`function first<T>(xs: T[]): T\`, not an inferred return.
- Name the shape once and reuse it: \`export interface Config { ... }\`, then \`export const config: Config = ...\` and \`opts: Config = config\`.
- Derive types from a literal value: \`const defaults = { retries: 3, verbose: false }; export type Defaults = typeof defaults;\` is fine, because \`defaults\` is a literal object, so its declaration is inferable too.

## 6. Traps Found by Running Both Tools

**\`satisfies\` is not an annotation for tsc.** TypeScript 5.9.3 rejected both of these with TS9010, while oxc accepted them and emitted literal or widened types:

~~~ts
export const routes = { home: "/", about: "/about" } satisfies Record<string, string>;
export const routesConst = { home: "/", about: "/about" } as const satisfies Record<string, string>;
~~~

This difference is why tsc should be the CI gate: code oxc accepts can still fail TypeScript under the same flag. (When you need both the check and the literal type, see [How does \`satisfies\` validate shape without widening literal types?](/interview-question/how-does-satisfies-validate-shape-without-widening-literal-types) and keep the exported binding \`as const\`.)

**\`typeof\` a local pulls the local into the \`.d.ts\`.** This looked clever and failed:

~~~ts
const routes = { home: "/", about: "/about" } as const satisfies Record<string, string>;
export const ROUTES: typeof routes = routes;
~~~

~~~text
pat.ts(1,7): error TS9010: Variable must have an explicit type annotation with --isolatedDeclarations.
~~~

The error is on the *local*: the emitted \`.d.ts\` must contain \`declare const routes: ...\` for \`typeof routes\` to mean anything, so the local becomes part of the surface. Without \`satisfies\` (plain \`as const\`) it passed.

**oxc writes \`unknown\` where it cannot see a type.** For an unannotated \`export function gen<T>(x: T) { return [x]; }\` oxc emitted \`gen<T>(x: T): unknown\` together with a TS9017 error. A build that ignores the error list ships \`unknown\`.

**Enums with computed members.** \`export enum Level { Low = 1, High = Low * 2 }\` passed both tools; oxc wrote \`High = 2\`. Cross-file enum references are a different story and were not tested here.

## 7. Verified: Running the Code

**Example 1** (page runner, TypeScript 5.4.5 \`--strict\`) compares inferred and annotated versions with a compile-time \`Equal\` check. tsc verifies every check, including the trap where a wide annotation turns the keys into \`string\`:

~~~text
6 [2,4,6] home,about
a age > 18 AND active
all equal: true
~~~

**Example 2** (\`runnable: false\`, it uses \`export\`) is a library entry file. It passes TypeScript 5.4.5 \`--strict\` in the page check, and separately passed TypeScript 5.9.3 with \`isolatedDeclarations\` (exit 0) and oxc with an empty error list. The two tools then produced the same declaration file, line for line (only indentation differs: oxc uses tabs). tsc 5.9.3 wrote:

~~~ts
declare const routes: {
    readonly home: "/";
    readonly about: "/about";
};
export declare const ROUTES: typeof routes;
export type RouteName = keyof typeof ROUTES;
declare const defaults: {
    retries: number;
    verbose: boolean;
};
export type Defaults = typeof defaults;
export declare const DEFAULTS: Defaults;
export declare function wrap<T>(x: T): T[];
export declare function parse(input: string): number;
export declare function parse(input: number): string;
export declare class Store {
    #private;
    readonly name: string;
    private limit;
    constructor(name: string, limit?: number);
    get size(): number;
    add(item: string): this;
    static create: (name: string) => Store;
}
export declare const handlers: {
    onSave: (id: string) => void;
    onLoad(id: string): Promise<string>;
};
export declare enum Level {
    Low = 1,
    High = 2
}
export declare const VERSION = "1.0.0";
export declare let counter: number;
export {};
~~~

Notice what the emitter keeps from syntax alone: overload signatures without the implementation signature, \`#private;\` for ES private fields, \`private limit;\` with no type, the literal type of \`const VERSION\`, and \`number\` for the mutable \`let counter\`.

## 8. A Migration Checklist

1. Snapshot the current \`.d.ts\` output of \`tsc --declaration --emitDeclarationOnly\`.
2. Turn on \`isolatedDeclarations\` (with \`declaration\`) and fix every TS90xx error at the export, using the quick fix.
3. Rebuild with tsc and diff against the snapshot: the public types should be unchanged.
4. Switch the build to tsdown (or rolldown-plugin-dts with \`generator: "oxc"\`), diff its \`.d.ts\` output against the snapshot too.
5. Keep \`tsc --noEmit\` with the flag in CI, and run attw on the packed tarball (see [What does \`arethetypeswrong\` (attw) detect and how do you fix false ESM/CJS packages?](/interview-question/what-does-arethetypeswrong-attw-detect-and-how-do-you-fix-false-esm-cjs-packages)).

## Common Pitfalls

- **Fixing errors with wide types.** \`Record<string, string>\`, \`any\` or \`object\` make the error vanish and change your API. Write what inference produced.
- **Relying on oxc to reject bad code.** It accepted \`satisfies\` initializers that tsc rejects, and it emits \`unknown\` beside its errors. Gate on tsc.
- **Exporting \`typeof\` of a computed local.** The local becomes part of the surface and needs its own type.
- **Annotating internals.** Only exports are checked; annotating every local adds churn and gains nothing.
- **Skipping the before/after diff.** The migration is supposed to be invisible to consumers; prove it with a \`.d.ts\` diff.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The switch:</strong> <span style="color:#f0e2c8;">tsdown emits declarations through rolldown-plugin-dts, which selects its oxc generator when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isolatedDeclarations</code> is on. oxc copies types from syntax, so every export must carry its type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What to write:</strong> <span style="color:#f0e2c8;">Return types on exported functions and methods (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">this</code> for fluent ones), annotations on exports set from calls or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code>, types on parameters with non-literal defaults, a named const for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export default</code>. Literals, literal objects, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> and assertions stay as they are.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Precision:</strong> <span style="color:#f0e2c8;">Write the type inference would have produced. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;string, string&gt;</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> turns literal keys into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> deletes the API. Name shapes once with an interface and reuse them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Traps:</strong> <span style="color:#f0e2c8;">tsc rejects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> initializers on exports while oxc accepts them, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code> a local drags the local into the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code>, and oxc writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unknown</code> next to its errors. So tsc with the flag is the gate.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Proof:</strong> <span style="color:#f0e2c8;">Snapshot the old <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code>, fix errors, diff tsc output, switch to oxc, diff again, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --noEmit</code> and attw in CI. In my run tsc and oxc produced identical declarations for clean code.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just let oxc report the errors?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it is not identical to tsc: it accepted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">satisfies</code> initializers that TypeScript 5.9.3 rejected with TS9010. TypeScript is the reference for what the flag means; use oxc for speed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep literal keys while satisfying the flag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as const</code> on a literal object: it is trivially inferable and keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"home" | "about"</code>. A wide annotation like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Record&lt;string, string&gt;</code> passes but widens <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keyof</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">string</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a class look like in the emitted <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.d.ts</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Annotated members are copied; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private</code> fields become a single <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">#private;</code>, TypeScript <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code> members keep their name without a type, and parameter properties become fields plus a constructor signature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the flag force annotations on internal helpers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Only declarations that reach the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> are checked; a non-exported helper keeps full inference unless an export refers to it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typeof</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know consumers see no change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Diff the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> output before and after the migration, from tsc and from the new generator, and run attw on the packed tarball before publishing.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| oxc | Rust JS/TS toolchain; its transform writes \`.d.ts\` from syntax alone |
| Declaration generator | The tool that writes \`.d.ts\` files (tsc, oxc, tsgo) |
| rolldown-plugin-dts | The plugin tsdown uses for declarations; picks oxc when the flag is on |
| Public API surface | Everything that ends up in the \`.d.ts\` |
| \`unique symbol\` | The annotation an exported \`Symbol()\` constant needs |
| CI gate | The check that must pass before merging: here \`tsc --noEmit\` with the flag |

**Conclusion:** Passing \`isolatedDeclarations\` is mostly mechanical: give every export whose type comes from computation an explicit type, and leave literals and \`as const\` alone. The skill is in the precision: write exactly the type inference produced, keep tsc as the judge because oxc is more lenient in places, and prove the migration with a before/after \`.d.ts\` diff. Done that way, tsdown can generate the declarations with oxc and consumers never notice anything but faster releases.`,
    examples: [
      {
        label: `Annotating without changing the public types`,
        code: `// Adding the annotations isolatedDeclarations asks for, without changing the
// public types. Each Equal check compares the inferred type with the annotated one.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const base: number[] = [1, 2, 3];

// 1. Function return: write exactly what was inferred.
function totalInferred(xs: number[]) { return xs.reduce((a, b) => a + b, 0); }
function total(xs: number[]): number { return xs.reduce((a, b) => a + b, 0); }
const r1: Equal<ReturnType<typeof totalInferred>, ReturnType<typeof total>> = true;

// 2. A call result: annotate the variable.
const doubledInferred = base.map((x) => x * 2);
const doubled: number[] = base.map((x) => x * 2);
const r2: Equal<typeof doubledInferred, typeof doubled> = true;

// 3. Literal-valued config: "as const" is already trivially inferable, keep it.
const ROUTES = { home: "/", about: "/about" } as const;
type RouteName = keyof typeof ROUTES;
const r3: Equal<RouteName, "home" | "about"> = true;

// TRAP: "fixing" it with a wide annotation silently loses the keys.
const ROUTES_WIDE: Record<string, string> = { home: "/", about: "/about" };
type WideName = keyof typeof ROUTES_WIDE;
const r4: Equal<WideName, string> = true;

// 4. Generic helpers: spell out the relationship, do not fall back to unknown.
function firstInferred<T>(xs: T[]) { return xs[0]; }
function first<T>(xs: T[]): T { return xs[0]; }
const r5: Equal<ReturnType<typeof firstInferred<string>>, ReturnType<typeof first<string>>> = true;

// 5. Fluent class methods: return "this", so subclasses keep their own type.
class Query {
  parts: string[] = [];
  where(p: string): this { this.parts.push(p); return this; }
}
class UserQuery extends Query {
  active(): this { return this.where("active"); }
}
const q = new UserQuery().where("age > 18").active();
const r6: Equal<typeof q, UserQuery> = true;

console.log(total(base), JSON.stringify(doubled), Object.keys(ROUTES).join(","));
console.log(first(["a", "b"]), q.parts.join(" AND "));
console.log("all equal:", r1 && r2 && r3 && r4 && r5 && r6);`,
      },
      {
        label: `A library entry that passes isolatedDeclarations`,
        code: `// src/index.ts of a library built by tsdown / rolldown-plugin-dts with the oxc generator.
// Passes tsc 5.9.3 --isolatedDeclarations; oxc emits the same .d.ts (see the answer).
const routes = { home: "/", about: "/about" } as const;
export const ROUTES: typeof routes = routes;
export type RouteName = keyof typeof ROUTES;

const defaults = { retries: 3, verbose: false };
export type Defaults = typeof defaults;
export const DEFAULTS: Defaults = defaults;

export function wrap<T>(x: T): T[] { return [x]; }

export function parse(input: string): number;
export function parse(input: number): string;
export function parse(input: string | number): number | string {
  return typeof input === "string" ? Number(input) : String(input);
}

export class Store {
  #items: string[] = [];
  constructor(public readonly name: string, private limit = 10) {}
  get size(): number { return this.#items.length; }
  add(item: string): this { this.#items.push(item); return this; }
  static create = (name: string): Store => new Store(name);
}

export const handlers = {
  onSave: (id: string): void => {},
  onLoad(id: string): Promise<string> { return Promise.resolve(id); },
};

export enum Level { Low = 1, High = 2 }
export const VERSION = "1.0.0";
export let counter = 0;`,
        runnable: false,
      },
    ],
  },
  {
    title: `How do \`noUncheckedIndexedAccess\`, \`exactOptionalPropertyTypes\` and TS 5.6+ checks harden 2025 codebases?`,
    difficulty: "medium",
    seoDescription: `noUncheckedIndexedAccess, exactOptionalPropertyTypes and the TS 5.6+ always-truthy, ?? and iterator checks: what each catches and how to adopt them.`,
    description: `**Question presented to candidate:**
"\`strict\` is already on in our codebase. Someone proposes adding \`noUncheckedIndexedAccess\` and \`exactOptionalPropertyTypes\`, and upgrading TypeScript for the newer 5.6+ checks. What does each one catch that \`strict\` does not, and how would you roll them out?"

**What a strong answer should cover:**
- \`noUncheckedIndexedAccess\` (TS 4.1): index-signature and array element reads get \`| undefined\`, closing the hole where \`arr[5]\` or \`record[key]\` is typed as always present; \`.at()\`, \`Map.get()\` and \`for...of\` are already honest; neither flag is part of \`strict\`
- \`exactOptionalPropertyTypes\` (TS 4.4): \`prop?: T\` means "may be missing", not "may be \`undefined\`", so \`{ prop: undefined }\` is rejected (TS2375 / TS2412); it matters because spreads, \`in\` and \`Object.keys\` treat a present \`undefined\` differently from a missing key
- TS 5.6+ checks that need no flag or come with \`strict\`: always-truthy / never-nullish conditions (TS2872, TS2869), \`strictBuiltinIteratorReturn\`, plus 5.7 never-initialized variables and 5.8 per-branch checks in \`return\` conditionals; and \`noUncheckedSideEffectImports\` (5.6, on by default in 6.0)
- Version context: TypeScript 5.9 \`tsc --init\` turns both flags on, and TypeScript 6.0 makes \`strict\` the default
- Rollout: enable per package, fix with narrowing patterns (check then use a local, \`Map\`, omit keys instead of writing \`undefined\`), avoid \`!\` as a blanket fix

**Clarifying questions expected:**
- Which TypeScript version is the codebase on, and can it upgrade?
- How large is the codebase, and is there a monorepo where flags can be enabled package by package?

**Code / implementation expected:** Optional — an index read that crashes under \`strict\` alone, and a spread that overwrites a default with \`undefined\`.`,
    answer: `**Target Audience:** Developers on a codebase that already has \`strict: true\` and want to know which extra checks are worth turning on, and what newer TypeScript versions catch for free.
**Difficulty:** Medium
**TypeScript version:** The page examples were checked with TypeScript 5.4.5 \`--strict\`. The flag-on errors in sections 3 and 4 were produced by running TypeScript 5.4.5 on the same files with \`--noUncheckedIndexedAccess --exactOptionalPropertyTypes\`. Everything marked 5.5+, 5.6+, 5.7 or 5.8 was produced with TypeScript 5.9.3, because 5.4.5 does not have those checks. Release facts are from the official release notes, linked inline.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

What \`strict\` itself turns on is covered in [What does the 'strict' flag in tsconfig enable?](/interview-question/what-does-the-strict-flag-in-tsconfig-enable), and the basics of optional properties in [What are optional properties and optional chaining in TypeScript?](/interview-question/what-are-optional-properties-and-optional-chaining-in-typescript) This page is about the checks *beyond* \`strict\`.

## 1. Why This Even Matters — A Story First

A hotel receptionist has a guest list. With \`strict\` on, she checks every name against the list. But two kinds of mistakes still get through. First, when she looks up room 512, the system always shows "occupied by: (a name)", even for rooms that do not exist, so she hands out keys to nobody. Second, the form has a "special requests" field, and she cannot tell "the guest left it blank" from "the guest wrote: no requests". Those turn out to be different instructions for housekeeping.

\`noUncheckedIndexedAccess\` fixes the first mistake: a lookup by key or index may find nothing, and the type now says so. \`exactOptionalPropertyTypes\` fixes the second: "the property is missing" and "the property is there and holds \`undefined\`" become different things. The TS 5.6+ checks are a sharper receptionist who also notices when a rule on the form can never be true.

## 2. Neither Flag Is Part of \`strict\`

Running the files below with \`--strict\` alone produced no errors at all; only adding the two flags did. They are separate opt-ins, which is why a "fully strict" codebase can still have both holes. They are not new: the official release notes put **\`--noUncheckedIndexedAccess\` in TypeScript 4.1** and **\`--exactOptionalPropertyTypes\` in TypeScript 4.4**. What changed recently is how mainstream they are: the [TypeScript 5.9 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) show the new minimal \`tsc --init\` config with both set to \`true\`, alongside \`strict\`, \`verbatimModuleSyntax\`, \`isolatedModules\` and \`noUncheckedSideEffectImports\`.

## 3. \`noUncheckedIndexedAccess\`: Lookups Can Miss

Under \`strict\` alone, reading an array element or an index-signature property is typed as if the value is always there:

~~~ts
const ports: number[] = [80, 443];
const p = ports[5];          // typed number, really undefined
const env: Record<string, string> = { HOME: "/root" };
env.PATH.toUpperCase();      // typed string, crashes
~~~

With the flag, TypeScript adds \`| undefined\` to every such read. On the test file, TypeScript 5.4.5 reported:

~~~text
nuia.ts(3,1): error TS18048: 'p' is possibly 'undefined'.
nuia.ts(5,1): error TS18048: 'env.PATH' is possibly 'undefined'.
nuia.ts(8,1): error TS18048: 'first' is possibly 'undefined'.
~~~

Line 8 was \`const [first] = ports; first.toFixed(0);\`: destructuring from an array is an index read too. What did **not** error is just as useful: \`for (const x of ports)\` (iteration never yields holes), tuple elements at known positions (\`tuple[1]\` on \`[number, string]\`), and \`if (ports[0] !== undefined) ports[0].toFixed(0)\` with a literal index.

📌 **Interview term: \`noUncheckedIndexedAccess\`** — a compiler option that types reads through an index signature (\`record[key]\`) or an array index (\`arr[i]\`) as \`T | undefined\`, forcing a check before use. It does not affect declared properties or tuple positions.

📌 **Interview term: index signature** — a type such as \`{ [key: string]: string }\` or \`Record<string, string>\` that allows any key. See [What is an index signature?](/interview-question/what-is-an-index-signature)

**Narrowing got better in 5.5.** With the flag on, this function behaves differently across versions:

~~~ts
function f(key: string, i: number) {
  if (env[key] !== undefined) env[key].toUpperCase();
  if (ports[i] !== undefined) ports[i].toFixed(0);
  const v = env[key];
  if (v !== undefined) v.toUpperCase();
}
~~~

~~~text
== TypeScript 5.4.5
narrow.ts(4,31): error TS2532: Object is possibly 'undefined'.
narrow.ts(5,31): error TS2532: Object is possibly 'undefined'.
== TypeScript 5.9.3
(no errors)
~~~

TypeScript 5.5 added "Control Flow Narrowing for Constant Indexed Accesses" ([5.5 notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html)): when neither the object nor the key is reassigned, a check on \`obj[key]\` now narrows the next \`obj[key]\`. The "copy to a local, then check" pattern works on every version, which is why Example 1 uses it.

## 4. \`exactOptionalPropertyTypes\`: Missing Is Not \`undefined\`

JavaScript distinguishes two states that \`strict\` TypeScript merges:

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Two objects: one without a retries key and one whose retries key holds undefined; spread, the in operator and Object.keys treat them differently">
  <rect class="d-box" x="40" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="170" y="60" text-anchor="middle">{ }</text>
  <text class="d-sub" x="170" y="84" text-anchor="middle">key missing</text>
  <rect class="d-box-accent" x="420" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="550" y="60" text-anchor="middle">{ retries: undefined }</text>
  <text class="d-sub" x="550" y="84" text-anchor="middle">key present, value undefined</text>
  <rect class="d-box-muted" x="40" y="150" width="260" height="56" rx="10"/>
  <text class="d-sub" x="170" y="183" text-anchor="middle">spread keeps the default</text>
  <rect class="d-box-muted" x="420" y="150" width="260" height="56" rx="10"/>
  <text class="d-sub" x="550" y="183" text-anchor="middle">spread overwrites the default</text>
  <line class="d-edge" x1="170" y1="100" x2="170" y2="148"/>
  <line class="d-edge-accent" x1="550" y1="100" x2="550" y2="148"/>
</svg>

Under \`strict\`, \`retries?: number\` accepts both. With the flag, \`?\` means only "may be missing": to allow an explicit \`undefined\` you write \`retries?: number | undefined\`. TypeScript 5.4.5 with the flag on the test file:

~~~text
eopt.ts(2,7): error TS2375: Type '{ timeout: undefined; }' is not assignable to type 'Options' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Types of property 'timeout' are incompatible.
    Type 'undefined' is not assignable to type 'number'.
eopt.ts(3,51): error TS2412: Type 'number | undefined' is not assignable to type 'number' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  Type 'undefined' is not assignable to type 'number'.
~~~

The second error is the common one in real code: a function assigns \`o.timeout = t\` where \`t\` might be \`undefined\`.

📌 **Interview term: \`exactOptionalPropertyTypes\`** — a compiler option under which an optional property \`p?: T\` may be absent but, if present, must hold a \`T\`. Writing \`undefined\` into it requires \`p?: T | undefined\`.

Why care? Example 2 shows the real bug: \`{ ...defaults, ...fromForm }\` with \`fromForm = { retries: undefined }\` produced \`{"label":"job"}\` — the default \`retries: 3\` was overwritten. \`"retries" in obj\` and \`Object.keys\` also see the difference. With the flag, the line that builds \`fromForm\` is the only error in that file (TS2375), and the "omit the key" pattern compiles both ways.

## 5. The TS 5.6+ Checks

These came with newer compilers, mostly without any flag. All outputs below are TypeScript 5.9.3; TypeScript 5.4.5 accepted the same code without these errors.

**5.6: always-truthy and never-nullish conditions** ([5.6 notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html), "Disallowed Nullish and Truthy Checks"). The compiler "now errors when it can syntactically determine a truthy or nullish check will always evaluate in a specific way". On Example 3:

~~~text
q4c.ts(6,7): error TS2872: This kind of expression is always truthy.
q4c.ts(13,23): error TS2872: This kind of expression is always truthy.
q4c.ts(20,10): error TS2869: Right operand of ?? is unreachable because the left operand is never nullish.
~~~

The same three errors appeared with \`--strict false\`: the check is not tied to \`strict\`. The release notes say \`true\`, \`false\`, \`0\` and \`1\` stay allowed (\`while (true)\` is fine). The notes' \`if (x => 0)\` example is also caught under \`strict\` by \`noImplicitAny\` (TS7006 on the parameter).

📌 **Interview term: always-truthy check** — TypeScript 5.6+ errors (TS2872 / TS2869) on a condition or \`??\` whose outcome is fixed by the syntax: a regex or function literal as a condition, a non-empty string literal before \`||\`, a comparison before \`??\`.

**5.6: \`--strictBuiltinIteratorReturn\`.** Built-in iterators (\`Map.prototype.values()\`, array iterators, ...) now have \`BuiltinIteratorReturn\` as their return type, which the notes say is \`any\` by default but \`undefined\` "when \`--strictBuiltinIteratorReturn\` is enabled (possibly via \`--strict\`)". So this code started to fail just by upgrading a \`strict\` project:

~~~ts
const it = new Map<string, number>([["a", 1]]).values();
const n: number = it.next().value;
~~~

~~~text
c56iter.ts(4,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
~~~

With \`--strict --strictBuiltinIteratorReturn false\` the same file compiled cleanly.

**5.6: \`--noUncheckedSideEffectImports\`.** Previously TypeScript silently ignored \`import "./polyfils";\` if the file did not exist. With the flag (TypeScript 5.9.3):

~~~text
side.ts(1,8): error TS2307: Cannot find module './polyfils' or its corresponding type declarations.
side.ts(2,8): error TS2307: Cannot find module './styles.css' or its corresponding type declarations.
~~~

Adding a \`globals.d.ts\` with \`declare module "*.css" {}\` removed the CSS error and kept the typo error. The [6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) list \`noUncheckedSideEffectImports\` as \`true\` by default in 6.0.

**5.7: never-initialized variables.** A variable that is *never* assigned is now reported even when it is read inside a nested function (TypeScript 5.4.5 said nothing):

~~~text
c57.ts(4,17): error TS2454: Variable 'total' is used before being assigned.
~~~

**5.8: branches of a \`return\` conditional are checked separately.** \`return cache.has(s) ? cache.get(s) : s;\` in a function returning \`URL\`, where \`cache\` is \`Map<any, any>\`, used to pass because \`any | string\` collapses to \`any\`. TypeScript 5.9.3:

~~~text
c58.ts(3,54): error TS2322: Type 'string' is not assignable to type 'URL'.
~~~

**6.0: \`strict\` by default.** The 6.0 notes: "\`strict\` is now \`true\` by default". Projects relying on the old default must now say \`"strict": false\`.

## 6. Verified: Running the Code

All three ran under TypeScript 5.4.5 \`--strict\` in a copy of the page runner. Lines ending in \`// expected\` comments are in-page tests; all passed.

**Example 1** — the hole \`noUncheckedIndexedAccess\` closes, and patterns that compile with the flag on or off. With the flag, TypeScript 5.4.5 flipped the two \`Equal\` claims (the reads become \`number | undefined\` and \`string | undefined\`) and flagged the \`p.toFixed\` line (TS18048), and nothing else:

~~~text
undefined
undefined
TypeError when calling toFixed on it
443
523
/ROOT (unset PATH)
443
true
~~~

**Example 2** — "missing" versus "undefined" at run time:

~~~text
{"label":"job"}
undefined
true false
1 0
{"retries":3,"label":"job"}
{"retries":5,"label":"job"}
true
~~~

**Example 3** — three bugs TypeScript 5.4.5 accepts. Each "always" branch runs regardless of input: \`isHex("hello")\` is \`true\`, the greeting ignores the name, and \`underLimit(30)\` returns \`false\` instead of falling back to 100:

~~~text
true true
Hello, Guest
true false
false Hello, Ada true
~~~

## 7. Rolling It Out

| Change | Typical fallout | Effort |
| :--- | :--- | :--- |
| Upgrade to 5.6+ (truthy / nullish checks) | A handful of real bugs | Low: each error is a bug |
| \`strictBuiltinIteratorReturn\` (with \`strict\`, 5.6+) | Manual \`.next().value\` reads | Low |
| \`noUncheckedSideEffectImports\` | Asset imports need \`declare module "*.css" {}\` | Low |
| \`exactOptionalPropertyTypes\` | Code that writes \`undefined\` into optional props; some library types | Medium |
| \`noUncheckedIndexedAccess\` | Every \`arr[i]\` and \`record[key]\` read | Medium to high |

A workable order: upgrade the compiler first (free bugs), then \`exactOptionalPropertyTypes\`, then \`noUncheckedIndexedAccess\` package by package in a monorepo. Fix with patterns, not \`!\`:

- Read once into a local, check it, use the local.
- Use \`Map\` (\`get\` returns \`T | undefined\` honestly) for dynamic keys instead of \`Record<string, T>\`.
- Prefer \`for...of\`, \`.find()\`, \`.at()\` over index arithmetic.
- Build optional fields by omitting keys (\`cond ? { retries: n } : {}\`) instead of writing \`undefined\`.
- When \`undefined\` is a meaningful value (a patch that clears a field), write \`p?: T | undefined\` on purpose.

## Common Pitfalls

- **Assuming \`strict\` includes these flags.** It does not; a strict codebase can still crash on \`arr[5]\`.
- **Silencing every new error with \`!\`.** It turns a checked lookup back into an unchecked one, now with a false sense of safety.
- **Treating \`p?: T\` and \`p: T | undefined\` as the same.** They differ for \`in\`, \`Object.keys\`, spreads and \`JSON.stringify\`, which is exactly what \`exactOptionalPropertyTypes\` makes visible.
- **Expecting \`.at()\` or \`Map.get()\` to change with the flag.** They already return \`T | undefined\`; the flag is about bracket reads.
- **Forgetting a compiler upgrade can add errors.** 5.6 truthy checks and \`strictBuiltinIteratorReturn\` (via \`strict\`) are new errors on old code; budget for them in the upgrade.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The gap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> still types <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">arr[i]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">record[key]</code> as always present, and treats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p?: T</code> as also accepting an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code>. Two opt-in flags close those gaps; neither is part of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. noUncheckedIndexedAccess:</strong> <span style="color:#f0e2c8;">TS 4.1. Index-signature and array-index reads become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T | undefined</code>, so you must check before use (TS18048). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for...of</code>, tuples and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.at()</code> are unaffected; since 5.5 a check on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj[key]</code> narrows the next <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj[key]</code> read.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. exactOptionalPropertyTypes:</strong> <span style="color:#f0e2c8;">TS 4.4. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">p?: T</code> means "may be missing" only, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ p: undefined }</code> is TS2375. It matters because a present <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> overwrites defaults in a spread and shows up in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Object.keys</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Newer compilers:</strong> <span style="color:#f0e2c8;">5.6 rejects always-truthy and never-nullish checks (TS2872, TS2869) with no flag, adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictBuiltinIteratorReturn</code> under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noUncheckedSideEffectImports</code>; 5.7 reports never-initialized variables; 5.8 checks each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> branch.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rollout:</strong> <span style="color:#f0e2c8;">Upgrade first, then exact optional types, then indexed access per package. Fix with patterns (local plus check, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, omit keys), not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code>. The 5.9 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --init</code> already turns both flags on, and 6.0 makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code> the default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">noUncheckedIndexedAccess</code> not part of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">strict</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is noisy: every bracket read needs handling, including ones a human knows are safe. TypeScript keeps it opt-in; projects decide whether the safety is worth the checks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">p?: T | undefined</code> with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">exactOptionalPropertyTypes</code> on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When an explicit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> carries meaning, for example a patch object where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{ label: undefined }</code> means "clear the label" and a missing key means "leave it alone".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does TS 5.6 report for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if (/^0x/)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TS2872 "This kind of expression is always truthy." The regex object is the condition, so the branch always runs; the intended code is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/^0x/.test(s)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you migrate a large codebase to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">noUncheckedIndexedAccess</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enable it per package or per tsconfig project, fix hot spots with a checked local or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Map</code>, prefer iteration over index loops, and treat a remaining <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!</code> as a reviewed exception rather than the default fix.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did upgrading to 5.6 break <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">iterator.next().value</code> code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Built-in iterators now return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BuiltinIteratorReturn</code>, which is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strictBuiltinIteratorReturn</code> (enabled by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict</code>), so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">value</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T | undefined</code> until you check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">done</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`noUncheckedIndexedAccess\` | Index and array-element reads are \`T \\| undefined\` (TS 4.1) |
| Index signature | A type allowing any key: \`{ [k: string]: T }\`, \`Record<string, T>\` |
| \`exactOptionalPropertyTypes\` | \`p?: T\` may be missing but not \`undefined\` (TS 4.4) |
| Always-truthy check | TS 5.6+ TS2872 / TS2869 on conditions fixed by syntax |
| \`strictBuiltinIteratorReturn\` | Built-in iterator return type is \`undefined\`, not \`any\` (5.6, in \`strict\`) |
| \`noUncheckedSideEffectImports\` | Error on \`import "x"\` that resolves to nothing (5.6; default in 6.0) |

**Conclusion:** \`strict\` is the floor, not the ceiling. \`noUncheckedIndexedAccess\` makes lookups admit they can miss, \`exactOptionalPropertyTypes\` separates "missing" from "set to undefined", and every compiler since 5.6 adds checks that flag code which can never behave as written. They are cheap to try, catch real crashes, and are now the default in a fresh \`tsc --init\`; roll them out by upgrading first and fixing with patterns rather than non-null assertions.`,
    examples: [
      {
        label: `The index-access hole that strict leaves open`,
        code: `// The page (and this check) runs with --strict only, so this shows the hole
// that noUncheckedIndexedAccess closes.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const ports: number[] = [80, 443];
const env: Record<string, string> = { HOME: "/root" };

// Under strict alone, an index read claims a value is always there.
const p = ports[5];
const claim1: Equal<typeof p, number> = true;
const path = env["PATH"];
const claim2: Equal<typeof path, string> = true;

// At run time it is undefined, and the compiler said nothing.
console.log(p); // undefined
console.log(String(path)); // undefined
try {
  console.log(p.toFixed(0));
} catch (e) {
  // (the message text differs between engines, so print the name)
  console.log((e as Error).name + " when calling toFixed on it");
}

// .at() is typed T | undefined even without the flag: an honest read.
const last = ports.at(-1);
const claim3: Equal<typeof last, number | undefined> = true;
console.log(last ?? "none");

// Patterns that compile with the flag ON or OFF:
// 1. for..of and array methods never produce undefined elements
let sum = 0;
for (const port of ports) sum += port;
console.log(sum); // 523
// 2. check, then use the narrowed local
function lookup(key: string): string {
  const value = env[key];
  return value === undefined ? "(unset " + key + ")" : value.toUpperCase();
}
console.log(lookup("HOME"), lookup("PATH"));
// 3. a Map makes "might be missing" explicit in the API itself
const portByName = new Map<string, number>([["http", 80]]);
const https = portByName.get("https");
const claim4: Equal<typeof https, number | undefined> = true;
console.log(https ?? 443); // 443

console.log(claim1 && claim2 && claim3 && claim4);`,
      },
      {
        label: `Missing vs undefined: what exactOptionalPropertyTypes protects`,
        code: `// exactOptionalPropertyTypes: "may be missing" is not the same as "may be undefined".
// This runs under --strict only, where TypeScript treats the two as one.
interface Options {
  retries?: number;
  label?: string;
}
const defaults = { retries: 3, label: "job" };

// Allowed under strict alone; an error (TS2375) with exactOptionalPropertyTypes.
const fromForm: Options = { retries: undefined };

// The spread copies the explicit undefined over the default.
const merged = { ...defaults, ...fromForm };
console.log(JSON.stringify(merged)); // {"label":"job"}
console.log(String(merged.retries)); // undefined

// "in", Object.keys and hasOwn all see a key that holds undefined.
const missing: Options = {};
console.log("retries" in fromForm, "retries" in missing);
console.log(Object.keys(fromForm).length, Object.keys(missing).length);

// Pattern that is correct with the flag on: omit the key instead of writing undefined.
function toOptions(raw: { retries: string }): Options {
  const n = Number(raw.retries);
  return Number.isNaN(n) || raw.retries === "" ? {} : { retries: n };
}
console.log(JSON.stringify({ ...defaults, ...toOptions({ retries: "" }) }));
console.log(JSON.stringify({ ...defaults, ...toOptions({ retries: "5" }) }));

// When undefined really is a meaningful value, say so in the type.
interface Patch {
  label?: string | undefined; // "set label to undefined" is allowed on purpose
}
const clear: Patch = { label: undefined };
console.log("label" in clear); // true`,
      },
      {
        label: `Bugs TypeScript 5.4 accepts and 5.6 rejects`,
        code: `// Bugs that TypeScript 5.4.5 (the page compiler) accepts without a word.
// TypeScript 5.6+ rejects lines A, B and C; see the answer for the errors.

function isHex(s: string): boolean {
  // A: forgot .test(s), so the regex object itself is the condition
  if (/^0x[0-9a-f]+$/) return true;
  return false;
}
console.log(isHex("0x1f"), isHex("hello"));

function greet(name: string | undefined): string {
  // B: operands swapped: the literal is always truthy, so name is never used
  return "Hello, " + ("Guest" || name);
}
console.log(greet("Ada"));

const limits = { max: 10 };
function underLimit(value: number): boolean | number {
  // C: parsed as (value < limits.max) ?? 100, so the fallback never applies
  return value < limits.max ?? 100;
}
console.log(underLimit(3), underLimit(30));

// What the author meant:
const isHexFixed = (s: string): boolean => /^0x[0-9a-f]+$/.test(s);
const greetFixed = (name: string | undefined): string => "Hello, " + (name || "Guest");
const underLimitFixed = (value: number, max?: number): boolean => value < (max ?? 100);
console.log(isHexFixed("hello"), greetFixed("Ada"), underLimitFixed(30));`,
      },
    ],
  },
  {
    title: `How does \`using\` / \`await using\` with \`Symbol.dispose\` work in TypeScript 5.2+?`,
    difficulty: "medium",
    seoDescription: `TypeScript 5.2 using and await using: Symbol.dispose, LIFO disposal on return and throw, SuppressedError, required lib and polyfills, and downlevel emit.`,
    description: `**Question presented to candidate:**
"TypeScript 5.2 added \`using\` and \`await using\`. What do they do, how does an object opt in with \`Symbol.dispose\`, in what order does cleanup run, and what do you need in your config and runtime to use them today?"

**What a strong answer should cover:**
- \`using x = expr\` declares a const-like, block-scoped binding whose \`[Symbol.dispose]()\` is called when the block exits, at the end of the block, on \`return\` and on \`throw\`; several bindings dispose in reverse order (last in, first out)
- The types: \`Disposable\` (\`[Symbol.dispose](): void\`) and \`AsyncDisposable\` (\`[Symbol.asyncDispose](): PromiseLike<void>\`); the initializer must be one of those or \`null\`/\`undefined\` (TS2850), and \`await using\` only works in async code (TS2852)
- \`await using\` awaits \`Symbol.asyncDispose\` (falling back to \`Symbol.dispose\`) before leaving the block
- Errors: a body error is rethrown after cleanup; if cleanup also throws, both are wrapped in a \`SuppressedError\` (\`error\` = the newer, \`suppressed\` = the earlier)
- Setup: \`lib\` must include \`esnext\` or \`esnext.disposable\`; for older targets TypeScript emits helper code (\`__addDisposableResource\`, \`__disposeResources\`); runtimes without the built-ins need at least \`Symbol.dispose\` / \`Symbol.asyncDispose\` polyfills

**Code / implementation expected:** Yes — a small resource class with \`[Symbol.dispose]\`, two \`using\` bindings, and the order of the log lines.`,
    answer: `**Target Audience:** Developers who write cleanup code (closing connections, releasing locks, deleting temp files) and want to understand TypeScript's \`using\` declarations from zero.
**Difficulty:** Medium
**TypeScript version:** Checked with TypeScript 5.4.5 \`--strict\` (the page compiler; \`using\` has been supported since 5.2). The page compiles to ES2022, so it runs TypeScript's downlevel helpers. As a cross-check, both examples were also compiled to ESNext (native \`using\` syntax) and run in Bun 1.4.2, which has the feature built in: the output was identical.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

Managing *many* resources as one unit (\`DisposableStack\`, rollback on failed setup) has its own page: [How do you type and compose multiple disposables with \`DisposableStack\` and \`AsyncDisposableStack\`?](/interview-question/how-do-you-type-and-compose-multiple-disposables-with-disposablestack-and-asyncd) The JavaScript-only view of the same feature is [What does \`using\` / \`await using\` do for Explicit Resource Management (ES2024)?](/interview-question/what-does-using-await-using-do-for-explicit-resource-management-es2024)

## 1. Why This Even Matters — A Story First

A library lets you borrow books, and you must return each one before you leave. On a normal day that is easy. But some days you get a phone call and run out mid-chapter, and some days the fire alarm goes off. A careful reader writes "return the books" on a sticky note at every exit door. A forgetful one leaves with three books in the bag.

In code, the "exits" are the end of a block, every \`return\`, and every thrown error. The old way to handle all of them is \`try\` / \`finally\`, written by hand every time. \`using\` is the sticky note on every door at once: you say *when you take the book* that it must be returned, and the language returns it on every way out, most recently borrowed first.

## 2. The Core Idea

An object opts in by having a method under a special well-known key, \`Symbol.dispose\`. A \`using\` declaration is like \`const\`, with one addition: when the enclosing block is left, for any reason, the runtime calls that method.

~~~ts
function resource(name: string): Disposable {
  console.log("open " + name);
  return { [Symbol.dispose]() { console.log("close " + name); } };
}

function work() {
  using db = resource("db");
  using file = resource("file");
  console.log("body");
}   // here: close file, then close db
~~~

📌 **Interview term: \`Symbol.dispose\`** — a well-known symbol. An object whose \`[Symbol.dispose]()\` method releases its resource is called *disposable*.

📌 **Interview term: \`Disposable\` / \`AsyncDisposable\`** — TypeScript global interfaces: \`Disposable\` has \`[Symbol.dispose](): void\`; \`AsyncDisposable\` has \`[Symbol.asyncDispose](): PromiseLike<void>\`. Classes write \`implements Disposable\` to opt in.

📌 **Interview term: \`using\` declaration** — a block-scoped, const-like binding whose value is disposed when the block exits: at the end, on \`return\`, on \`throw\`. Multiple bindings are disposed in reverse declaration order.

📌 **Interview term: explicit resource management** — the TC39 proposal that defines \`using\`, \`await using\`, \`Symbol.dispose\`, \`DisposableStack\` and \`SuppressedError\`. TypeScript 5.2 implemented it ([5.2 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html)). TypeScript 5.9.3 and 6.0.2 still keep its types in \`lib.esnext.disposable.d.ts\` (checked in their \`lib\` folders).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Resources are pushed onto a stack as each using line runs and are disposed from the top when the block exits">
  <text class="d-sub" x="140" y="24" text-anchor="middle">run order</text>
  <text class="d-sub" x="580" y="24" text-anchor="middle">at block exit</text>
  <rect class="d-box" x="40" y="40" width="200" height="50" rx="10"/>
  <text class="d-text" x="140" y="70" text-anchor="middle">using db</text>
  <rect class="d-box" x="40" y="130" width="200" height="50" rx="10"/>
  <text class="d-text" x="140" y="160" text-anchor="middle">using file</text>
  <rect class="d-box-accent" x="480" y="40" width="200" height="50" rx="10"/>
  <text class="d-text" x="580" y="70" text-anchor="middle">1. close file</text>
  <rect class="d-box-accent" x="480" y="130" width="200" height="50" rx="10"/>
  <text class="d-text" x="580" y="160" text-anchor="middle">2. close db</text>
  <line class="d-edge" x1="140" y1="90" x2="140" y2="128"/>
  <line class="d-edge-accent" x1="240" y1="155" x2="478" y2="65"/>
  <line class="d-edge-dashed" x1="240" y1="65" x2="478" y2="155"/>
</svg>

The left column is the order the \`using\` lines run; the right column is the order of cleanup when the block exits, the reverse. Reverse order matters because later resources often depend on earlier ones (the file was opened through the database connection, so it must close first).

## 3. What \`using\` Replaces

Before, the robust version needed nested \`try\` / \`finally\`:

~~~ts
const db = resource("db");
try {
  const file = resource("file");
  try {
    // work
  } finally {
    file[Symbol.dispose]();
  }
} finally {
  db[Symbol.dispose]();
}
~~~

\`using\` is that, written for you. When the target has no native support (the page targets ES2022), TypeScript emits it as helper calls. For this input:

~~~ts
function f() {
  using r = open();
  return 1;
}
~~~

TypeScript 5.4.5 (\`target: ES2022\`) emitted:

~~~js
function f() {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        const r = __addDisposableResource(env_1, open(), false);
        return 1;
    }
    catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
    }
    finally {
        __disposeResources(env_1);
    }
}
~~~

With \`target: ESNext\` it left \`using r = open();\` unchanged, for runtimes that support it natively.

## 4. \`await using\` for Async Cleanup

Closing a network connection is usually asynchronous. \`await using\` calls \`[Symbol.asyncDispose]()\` and **awaits** it before the block is considered finished. It also accepts plain \`Disposable\` objects (it calls \`Symbol.dispose\` when there is no async method), so one block can mix both, still in reverse order. Example 2 shows "after block" printing only after the async close finished.

The compiler enforces where it can be used, and what it can hold. TypeScript 5.4.5:

~~~text
main.ts(4,3): error TS2852: 'await using' statements are only allowed within async functions and at the top levels of modules.
main.ts(7,13): error TS2850: The initializer of a 'using' declaration must be either an object with a '[Symbol.dispose]()' method, or be 'null' or 'undefined'.
  Property '[Symbol.dispose]' is missing in type 'AsyncDisposable' but required in type 'Disposable'.
~~~

The second error is plain \`using\` given an \`AsyncDisposable\`: a synchronous block cannot wait, so it refuses an async-only resource. \`null\` and \`undefined\` are accepted and simply skipped, which suits optional resources.

A \`using\` binding is also read-only, like \`const\`:

~~~text
main.ts(5,3): error TS2588: Cannot assign to 'r' because it is a constant.
~~~

## 5. When Cleanup Itself Fails: \`SuppressedError\`

Two failures can happen in one block: the body throws, then a dispose method throws too. Neither error should vanish. The proposal adds \`SuppressedError\` for this case: its \`error\` property holds the error thrown during disposal (the newer one) and its \`suppressed\` property holds the error it displaced (the body error).

📌 **Interview term: \`SuppressedError\`** — an \`Error\` subclass thrown when disposal fails while another error is already propagating; \`.error\` is the disposal error, \`.suppressed\` is the earlier one.

Example 2 prints exactly that: \`error = dispose failed\`, \`suppressed = body failed\`. If only the body throws, that error is rethrown after cleanup (Example 1: \`query failed\` after \`close conn\`). If only dispose throws, that error propagates.

## 6. Setting It Up

**Types.** \`lib\` must include \`esnext\` or \`esnext.disposable\` (the 5.2 notes show \`"lib": ["es2022", "esnext.disposable", "dom"]\`). The page examples use \`/// <reference lib="esnext.disposable" />\` at the top of the file because the page fixes \`lib\` to ES2022 + DOM. Without it, TypeScript 5.4.5 reported:

~~~text
error TS2318: Cannot find global type 'Disposable'.
main.ts(1,47): error TS2339: Property 'dispose' does not exist on type 'SymbolConstructor'.
~~~

**Runtime.** The downleveled code still needs the symbols. The 5.2 notes say that for \`using\` alone you can "get away with only polyfilling the built-in \`symbol\`s", with code like \`Symbol.dispose ??= Symbol("Symbol.dispose")\`. This matters in practice: in this sandbox, Node 22.22 had \`Symbol.dispose\` in the main context but not in a fresh \`vm\` context (where the page runner runs code), where the transpiled examples failed with \`TypeError: Symbol.dispose is not defined.\` until the polyfill line was added. Native support for the whole feature is listed by MDN compatibility data in Chrome 134 and Node.js 24 ([MDN, \`DisposableStack.prototype.use()\`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/DisposableStack/use)); check the current data for other browsers.

## 7. Verified: Running the Code

Both examples ran under TypeScript 5.4.5 \`--strict\` in a copy of the page runner (downlevel helpers). Compiled to ESNext and run in Bun 1.4.2 with native \`using\`, they printed exactly the same lines.

**Example 1** — two bindings, normal exit, early return, and a throw:

~~~text
normal
open db | open file | body done | close file | close db
early
open db | open file | early return | close file | close db
query failed
open conn | close conn
~~~

The early return disposes both resources, in the same reverse order, before the caller sees \`"early"\`; the throw disposes \`conn\` before the \`catch\` runs.

**Example 2** — \`await using\` with an async and a sync resource, then a body error plus a dispose error:

~~~text
connect pg
query runs
lock released (sync dispose, still awaited in order)
closed pg (after an await)
after block: both cleaned up
SuppressedError
error = dispose failed
suppressed = body failed
~~~

## 8. Edge Cases

A separate run (same compiler and page runner) checked two more behaviours:

~~~ts
for (using r of [mk("a"), mk("b")]) {
  console.log("loop body");
}
function g() {
  using x = mk("x");
  return () => console.log("closure still sees x after dispose", typeof x);
}
g()();
~~~

~~~text
loop body
dispose a
loop body
dispose b
dispose x
closure still sees x after dispose object
~~~

- **\`for (using x of ...)\` disposes each item at the end of its own iteration**, not at the end of the loop.
- **Disposal does not delete the binding.** A closure that escapes the block still holds the object, now disposed. Returning or capturing a \`using\` resource is a bug: whoever receives it gets a closed connection. To hand a resource out, do not declare it with \`using\`, or move it out of a \`DisposableStack\` (see the sibling page).
- **\`using\` needs a block.** It is a declaration, so it lives in a function body, a \`{ }\` block, a loop head or a module top level.

## Common Pitfalls

- **Returning a \`using\` value.** It is disposed on the way out; the caller receives a dead resource.
- **Plain \`using\` with an async-only resource.** TS2850: use \`await using\` inside an async function.
- **Missing \`lib\` setting.** TS2318 "Cannot find global type 'Disposable'" means \`esnext.disposable\` is not in \`lib\`.
- **Missing runtime symbols.** Downleveled code throws \`Symbol.dispose is not defined.\` on runtimes without it; add the polyfill. The emitted helpers fall back to a plain \`Error\` named \`SuppressedError\` when the built-in is missing, but your own code that calls \`DisposableStack\` or \`new SuppressedError\` needs real polyfills.
- **Expecting cleanup errors to replace the original.** You get a \`SuppressedError\` holding both; log \`.error\` and \`.suppressed\`, not just \`.message\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">using x = expr</code> is a const-like, block-scoped binding whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[Symbol.dispose]()</code> runs when the block exits: at the end, on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code>, on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throw</code>. It is the explicit resource management proposal, supported since TypeScript 5.2.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Opting in:</strong> <span style="color:#f0e2c8;">An object is disposable if it has a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[Symbol.dispose]()</code> method; TypeScript types that as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Disposable</code>, and async ones as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AsyncDisposable</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[Symbol.asyncDispose]()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">undefined</code> are allowed and skipped; anything else is TS2850.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Order:</strong> <span style="color:#f0e2c8;">Several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">using</code> bindings dispose in reverse order, last in first out, because later resources usually depend on earlier ones. In a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for (using x of ...)</code> loop each item is disposed at the end of its iteration.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Async and errors:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await using</code> awaits the async dispose before leaving the block and only works in async code (TS2852). If the body and a dispose both throw, you get a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SuppressedError</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.error</code> for the dispose failure and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.suppressed</code> for the body error.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Setup:</strong> <span style="color:#f0e2c8;">Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esnext</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esnext.disposable</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lib</code>. For older targets TypeScript emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__addDisposableResource</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__disposeResources</code> helpers, and the runtime needs at least <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.dispose</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.asyncDispose</code> polyfills; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DisposableStack</code> needs a real polyfill.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">using</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">try</code> / <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">finally</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the same mechanism, generated for you and attached to the declaration, so cleanup cannot be forgotten on one of the exits, and several resources are released in the correct reverse order without nesting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await using</code> with an object that only has <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Symbol.dispose</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await using</code> falls back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.dispose</code>, which is why one async block can hold both kinds and still dispose them in reverse order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you return a value declared with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">using</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The return value is computed, then the resource is disposed before the caller gets it. The caller receives a disposed object, so do not return or capture <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">using</code> bindings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need a polyfill if TypeScript compiles <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">using</code> away?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The emitted helpers still look up <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.dispose</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Symbol.asyncDispose</code> at run time, and throw if they are missing; the compiler only rewrites the syntax.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What lib setting does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">using</code> need, and why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esnext.disposable</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esnext</code>), which declares <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Disposable</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AsyncDisposable</code>, the symbols, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SuppressedError</code> and the stacks. Without it the checker cannot find the global <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Disposable</code> type (TS2318).</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`Symbol.dispose\` | Well-known symbol naming an object cleanup method |
| \`Disposable\` / \`AsyncDisposable\` | TypeScript interfaces for sync / async disposable objects |
| \`using\` declaration | Const-like binding disposed when its block exits |
| \`await using\` | Same, but awaits \`Symbol.asyncDispose\` before leaving the block |
| Explicit resource management | The TC39 proposal behind \`using\`, \`DisposableStack\`, \`SuppressedError\` |
| \`SuppressedError\` | Error carrying both a disposal error and the error it displaced |

**Conclusion:** \`using\` attaches cleanup to the line that acquires a resource, and the language runs it on every way out of the block, newest resource first, with \`await using\` waiting for asynchronous cleanup and \`SuppressedError\` keeping both errors when two things fail. TypeScript has supported it since 5.2: add \`esnext.disposable\` to \`lib\`, polyfill the symbols for runtimes without native support, and never return a value you declared with \`using\`.`,
    examples: [
      {
        label: `using: reverse-order disposal on return and throw`,
        code: `/// <reference lib="esnext.disposable" />
// The page's lib is ES2022, so the line above pulls in the Disposable types.
// Older runtimes lack the symbols: define them if missing (TS 5.2 notes suggest this).
(Symbol as { dispose?: symbol }).dispose ??= Symbol("Symbol.dispose");

const log: string[] = [];

function resource(name: string): Disposable {
  log.push("open " + name);
  return {
    [Symbol.dispose]() {
      log.push("close " + name);
    },
  };
}

function work(early: boolean): string {
  using db = resource("db");
  using file = resource("file");
  if (early) {
    log.push("early return");
    return "early";
  }
  log.push("body done");
  return "normal";
}

console.log(work(false));
console.log(log.join(" | "));
log.length = 0;

console.log(work(true));
console.log(log.join(" | "));
log.length = 0;

function crash(): void {
  using conn = resource("conn");
  throw new Error("query failed");
}
try {
  crash();
} catch (e) {
  console.log((e as Error).message);
}
console.log(log.join(" | "));`,
      },
      {
        label: `await using, mixed disposables and SuppressedError`,
        code: `/// <reference lib="esnext.disposable" />
(Symbol as { dispose?: symbol }).dispose ??= Symbol("Symbol.dispose");
(Symbol as { asyncDispose?: symbol }).asyncDispose ??= Symbol("Symbol.asyncDispose");

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

class Connection implements AsyncDisposable {
  constructor(readonly name: string) {
    console.log("connect " + name);
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await wait(10);
    console.log("closed " + this.name + " (after an await)");
  }
}

class Lock implements Disposable {
  [Symbol.dispose](): void {
    console.log("lock released (sync dispose, still awaited in order)");
  }
}

class Flaky implements Disposable {
  [Symbol.dispose](): void {
    throw new Error("dispose failed");
  }
}

async function main(): Promise<void> {
  {
    await using conn = new Connection("pg");
    await using lock = new Lock();
    console.log("query runs");
  }
  console.log("after block: both cleaned up");

  try {
    using flaky = new Flaky();
    throw new Error("body failed");
  } catch (e) {
    const s = e as SuppressedError;
    console.log(s.name);
    console.log("error = " + (s.error as Error).message);
    console.log("suppressed = " + (s.suppressed as Error).message);
  }
}

main();

// Compile-time checks
// (never called: it only has to type-check)
function typeChecks(): void {
  const plain = { close() {} };
  // @ts-expect-error an object without [Symbol.dispose] cannot be a using binding
  using notDisposable = plain;
  // null and undefined are allowed: nothing is disposed
  using maybe = Math.random() > 2 ? new Lock() : null;
}`,
      },
    ],
  },
  {
    title: `How do you type and compose multiple disposables with \`DisposableStack\` and \`AsyncDisposableStack\`?`,
    difficulty: "hard",
    seoDescription: `DisposableStack and AsyncDisposableStack in TypeScript: use, adopt, defer, move for rollback-safe setup, error aggregation and typing composed resources.`,
    description: `**Question presented to candidate:**
"A service needs a primary database connection, a replica and a timer at startup. If the second step fails, the first must be closed; if everything succeeds, the caller should own all three and close them together. How would you write that with \`DisposableStack\`, and how do you type the pieces?"

**What a strong answer should cover:**
- \`DisposableStack\` collects cleanup work and is itself \`Disposable\`: \`use(value)\` registers a disposable, \`adopt(value, onDispose)\` wraps a value that has no dispose method, \`defer(fn)\` registers a callback; everything runs in reverse order on \`dispose()\`
- The setup pattern: \`using stack = new DisposableStack()\`, register each resource right after acquiring it, and on success call \`stack.move()\` to transfer ownership out, so a failure part-way rolls back only what was opened
- \`AsyncDisposableStack\` does the same with \`disposeAsync()\` / \`Symbol.asyncDispose\`, accepts both sync and async disposables, and is used with \`await using\`
- Error aggregation: when several cleanups throw, the errors are chained in \`SuppressedError\` objects (\`error\` = the later failure, \`suppressed\` = the earlier); \`disposed\` becomes \`true\` even then
- The types: \`use<T extends Disposable | null | undefined>(value: T): T\` and \`adopt<T>(value: T, onDispose: (value: T) => void): T\` return the exact type passed in; a composed class holds a stack in a private field and implements \`Disposable\` by delegating
- Runtime support: built in only in newer runtimes (for example Node.js 24 and Chrome 134 per MDN data); otherwise a polyfill, since \`lib: esnext.disposable\` only provides types

**Clarifying questions expected:**
- Are any of the resources released asynchronously (connections usually are)?
- Which runtimes must this run on, and is a polyfill acceptable?

**Code / implementation expected:** Yes — an acquire-several-resources function that rolls back on failure and returns a disposable bundle on success.`,
    answer: `**Target Audience:** Developers who already know \`using\` and need to manage several resources together: setup that can fail half-way, objects that own other resources, and async cleanup.
**Difficulty:** Hard
**TypeScript version:** Types checked with TypeScript 5.4.5 \`--strict\` (\`DisposableStack\` and \`AsyncDisposableStack\` are declared in \`lib.esnext.disposable\`, available since 5.2). The page runtime has no built-in stacks, so Examples 1 and 2 use the built-in class when present and otherwise a small spec-shaped stand-in. Both were also run in Bun 1.4.2, which has the built-ins, with identical output; the guard behaviour in section 6 was observed in Bun only.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output was produced by actually running the code; the **Verified** section quotes it in full.

The basics — \`Symbol.dispose\`, \`using\`, \`await using\`, reverse-order disposal — are on [How does \`using\` / \`await using\` with \`Symbol.dispose\` work in TypeScript 5.2+?](/interview-question/how-does-using-await-using-with-symbol-dispose-work-in-typescript-5-2) This page assumes them and is about composing several resources.

## 1. Why This Even Matters — A Story First

You are setting up a stage for a concert: lights, then the sound desk, then the projector. The projector is broken. You now have to put away exactly what you already set up, sound desk first, then lights, and nothing more. If everything works, you do not put anything away: you hand the whole stage to the band, who pack it up after the show.

\`using\` handles one item at a time, and always packs it up at the end of the block. That is wrong for the "hand it to the band" case. \`DisposableStack\` is a crate you fill as you set up: if setup fails, the crate is emptied in reverse order; if it succeeds, you give the crate (\`move()\`) to whoever will run the show.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are any resources closed asynchronously? | Decides \`DisposableStack\` vs \`AsyncDisposableStack\` and \`await using\` |
| Who owns the resources after setup? | Decides whether you dispose at the end of the block or \`move()\` out |
| Can cleanup itself fail? | You will get a \`SuppressedError\` chain; decide how to log it |
| Which runtimes? | The stacks are built in only in recent engines; otherwise polyfill |

## 3. The Four Methods

📌 **Interview term: \`DisposableStack\`** — a built-in container of cleanup work that is itself \`Disposable\`. When disposed, it runs everything registered, newest first.

- \`use(value)\` registers a \`Disposable\` (its \`[Symbol.dispose]\` runs later) and returns the same value, so acquisition and registration are one line: \`const db = stack.use(openDb())\`.
- \`adopt(value, onDispose)\` registers a value that has no dispose method, with the function that releases it: \`stack.adopt(setInterval(tick, 1000), clearInterval)\`.
- \`defer(fn)\` registers a plain callback, like \`defer\` in Go or Swift.
- \`move()\` returns a **new** stack holding everything, and leaves the old one empty and disposed. This is ownership transfer.

📌 **Interview term: ownership transfer** — handing responsibility for releasing a resource to someone else. With a stack, \`move()\` does it: the original \`using stack\` then disposes nothing.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Setup fills a stack; on failure the stack disposes what was opened, on success move hands the stack to the caller">
  <rect class="d-box-accent" x="260" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="360" y="45" text-anchor="middle">using stack</text>
  <text class="d-sub" x="360" y="65" text-anchor="middle">use, adopt, defer</text>
  <rect class="d-box" x="40" y="170" width="240" height="64" rx="10"/>
  <text class="d-text" x="160" y="197" text-anchor="middle">a step throws</text>
  <text class="d-sub" x="160" y="219" text-anchor="middle">stack disposes in reverse</text>
  <rect class="d-box" x="440" y="170" width="240" height="64" rx="10"/>
  <text class="d-text" x="560" y="197" text-anchor="middle">all steps succeed</text>
  <text class="d-sub" x="560" y="219" text-anchor="middle">move, caller owns all</text>
  <line class="d-edge-dashed" x1="300" y1="76" x2="170" y2="168"/>
  <line class="d-edge-accent" x1="420" y1="76" x2="550" y2="168"/>
</svg>

The same \`using stack\` line covers both outcomes: on a throw the block exits with the resources still in the stack, so they are released; on success \`move()\` has emptied it first, so the block exit releases nothing and the caller holds the new stack.

## 4. Rollback on Failure, \`move()\` on Success

The core of Example 1:

~~~ts
function openPair(failSecond: boolean): { a: Conn; b: Conn } & Disposable {
  using stack = new DisposableStack();
  const a = stack.use(new Conn("primary"));
  const b = stack.use(new Conn("replica", failSecond));  // may throw
  stack.adopt(42, (id) => console.log("clear timer " + id));
  stack.defer(() => console.log("deferred log flush"));
  const owned = stack.move();                              // success: hand over
  return { a, b, [Symbol.dispose]: () => owned.dispose() };
}
~~~

When the replica constructor throws, only \`primary\` has been registered, so only \`primary\` is closed, and then the error reaches the caller. When everything succeeds, the caller writes \`using pair = openPair(false)\` and, at the end of its block, all four cleanups run in reverse registration order: deferred flush, timer, replica, primary. The output in section 7 shows both runs.

Register **immediately after acquiring** each resource. The 5.2 release notes recommend this for \`defer\`, \`use\` and \`adopt\`: anything acquired but not yet registered is what leaks when the next line throws.

## 5. \`AsyncDisposableStack\` and Error Aggregation

📌 **Interview term: \`AsyncDisposableStack\`** — the async version: \`use\` accepts \`AsyncDisposable\` or \`Disposable\` values, \`adopt\` and \`defer\` accept functions that return promises, and \`disposeAsync()\` (or \`await using\`) awaits each cleanup in reverse order.

When several cleanups fail, no error is lost. The first failure (the newest resource, since cleanup runs in reverse) becomes the pending error; each later failure wraps the pending one:

📌 **Interview term: error aggregation** — combining several errors into one thrown value. Here it is a chain of \`SuppressedError\` objects: \`.error\` is the latest failure, \`.suppressed\` is everything before it.

In Example 2, \`second\` was registered last, so it was disposed first and failed first; then \`first\` failed. The thrown value is \`SuppressedError { error: first failed, suppressed: second failed }\`, and \`stack.disposed\` is \`true\` afterwards: the stack does not retry. Bun 1.4.2 with the built-in \`AsyncDisposableStack\` produced the same chain.

## 6. Typing the Pieces

The \`lib.esnext.disposable\` declarations (TypeScript 5.4.5) are the contract:

~~~ts
interface DisposableStack {
    readonly disposed: boolean;
    dispose(): void;
    use<T extends Disposable | null | undefined>(value: T): T;
    adopt<T>(value: T, onDispose: (value: T) => void): T;
    defer(onDispose: () => void): void;
    move(): DisposableStack;
    [Symbol.dispose](): void;
}
interface AsyncDisposableStack {
    use<T extends AsyncDisposable | Disposable | null | undefined>(value: T): T;
    adopt<T>(value: T, onDisposeAsync: (value: T) => PromiseLike<void> | void): T;
    defer(onDisposeAsync: () => PromiseLike<void> | void): void;
    disposeAsync(): Promise<void>;
    move(): AsyncDisposableStack;
    // ...
}
~~~

What that buys you (each checked in Example 3):

- **\`use\` and \`adopt\` return \`T\`**, the exact type passed in, so \`const c = stack.use(conn)\` is a \`Conn\` with its \`query()\` method, not a bare \`Disposable\`.
- **\`null\` / \`undefined\` pass through** (\`Conn | undefined\` stays \`Conn | undefined\`), for optional resources.
- **The constraint catches mistakes at compile time.** TypeScript 5.4.5, with the \`@ts-expect-error\` lines removed:

~~~text
main.ts(29,13): error TS2345: Argument of type 'Socket' is not assignable to parameter of type 'Disposable'.
  Property '[Symbol.dispose]' is missing in type 'Socket' but required in type 'Disposable'.
main.ts(32,13): error TS2345: Argument of type 'Pool' is not assignable to parameter of type 'Disposable'.
  Property '[Symbol.dispose]' is missing in type 'Pool' but required in type 'Disposable'.
~~~

The first is a plain object with \`end()\` (use \`adopt(sock, (s) => s.end())\` instead), the second an async-only resource on a sync stack (use \`AsyncDisposableStack\`).

**Composing a class.** An object that owns resources holds a stack in a private field and implements \`Disposable\` by delegating:

~~~ts
class Service implements Disposable {
  #stack: DisposableStack;
  constructor(stack: DisposableStack) { this.#stack = stack; }
  [Symbol.dispose](): void { this.#stack.dispose(); }
}
~~~

Building it from a factory that does the \`using stack\` / \`move()\` dance keeps the constructor free of half-initialised states.

**Runtime guards.** With the built-in class (observed in Bun 1.4.2): calling \`dispose()\` twice is a no-op; \`defer\` or \`move\` on a disposed stack throws a \`ReferenceError\`; \`use\` with an object lacking \`Symbol.dispose\` throws a \`TypeError\`; after \`move()\` the old stack reports \`disposed: true\` and the new one \`false\`. Two more observations from the same run: an \`async\` callback passed to a sync stack \`defer\` was not awaited (\`dispose()\` returned before it finished), and three failing callbacks \`a\`, \`b\`, \`c\` produced a nested chain \`SuppressedError(error: a, suppressed: SuppressedError(error: b, suppressed: c))\`. The stand-in classes in Examples 1 and 2 skip these guards.

## 7. Verified: Running the Code

All three ran under TypeScript 5.4.5 \`--strict\` in a copy of the page runner. Examples 1 and 2 were also compiled to ESNext and run in Bun 1.4.2 using the built-in \`DisposableStack\` / \`AsyncDisposableStack\`; Bun printed the same lines.

**Example 1** — rollback when the replica fails, then a successful setup whose cleanups run when the caller block ends:

~~~text
open primary
close primary
cannot open replica
---
open primary
open replica
primary ok / replica ok
deferred log flush
clear timer 42
close replica
close primary
~~~

**Example 2** — \`AsyncDisposableStack\` with mixed resources and a deferred async callback, then two failing disposers:

~~~text
work
deferred flush
sync close cache
async close pool
--- two disposers fail
SuppressedError | error: first failed | suppressed: second failed
disposed: true
~~~

**Example 3** — types only: every \`Equal\` check and both \`@ts-expect-error\` lines verified by tsc.

~~~text
type checks compiled: true
~~~

## 8. When to Use Which

| Situation | Tool |
| :--- | :--- |
| One resource, released at the end of this block | \`using x = ...\` |
| Several resources, all released at the end of this block | Several \`using\` lines, or one \`using stack\` |
| Setup that must roll back on failure and hand over on success | \`using stack\` + \`move()\` |
| A value with no dispose method (timer id, raw handle) | \`stack.adopt(value, release)\` |
| One-off cleanup code | \`stack.defer(fn)\` |
| Any async cleanup | \`AsyncDisposableStack\` with \`await using\` |
| An object that owns resources | Class with a private stack, \`implements Disposable\` |

## Common Pitfalls

- **Registering late.** \`const a = open(); doSomething(); stack.use(a);\` leaks \`a\` if \`doSomething\` throws. Wrap the acquisition: \`const a = stack.use(open())\`.
- **Forgetting \`move()\` on success.** The \`using stack\` then disposes everything at the end of setup, and the caller receives closed connections.
- **A sync stack for async cleanup.** \`DisposableStack\` cannot hold an async-only resource (TS2345), and a \`defer\` callback that returns a promise is not awaited. Use \`AsyncDisposableStack\`.
- **Logging only \`.message\` of the thrown error.** A \`SuppressedError\` chain hides the individual failures in \`.error\` and \`.suppressed\`; walk the chain.
- **Assuming \`lib\` gives you the runtime.** \`esnext.disposable\` provides types only; check that the target runtime has the stacks, or ship a polyfill.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DisposableStack</code> is a built-in container of cleanup work that is itself <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Disposable</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use</code> registers a disposable, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adopt</code> wraps a value with a release function, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">defer</code> registers a callback, and everything runs newest first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The pattern:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">using stack = new DisposableStack()</code>, register each resource right after acquiring it, and on success <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack.move()</code> to hand everything to the caller. A throw part-way releases exactly what was opened; success releases nothing until the new owner disposes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Async:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AsyncDisposableStack</code> accepts sync and async disposables and promise-returning callbacks, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disposeAsync()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await using</code> awaits each cleanup in reverse order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Errors:</strong> <span style="color:#f0e2c8;">Failed cleanups are chained in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SuppressedError</code>s, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.error</code> the latest and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.suppressed</code> the earlier, and the stack still ends <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">disposed: true</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Types:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">use&lt;T extends Disposable | null | undefined&gt;(value: T): T</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">adopt&lt;T&gt;</code> return the exact type, so you keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Conn</code> rather than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Disposable</code>, and a non-disposable or async-only value is a compile error. A composed class keeps a private stack and implements <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Disposable</code> by delegating.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just write several <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">using</code> lines?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They always release at the end of the block. Setup code that must return its resources on success needs ownership transfer, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">move()</code> gives you; several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">using</code> lines cannot hand anything over.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">move()</code> do exactly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It creates a new stack holding all registered cleanups and marks the old stack disposed and empty, so the old <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">using stack</code> releases nothing at block exit while the new stack owns everything.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order do cleanups run when there are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">use</code>, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">adopt</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">defer</code> calls mixed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Strictly reverse registration order, regardless of which method registered them. In Example 1: deferred flush, timer, replica, primary.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you clean up a timer or a raw file handle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stack.adopt(handle, release)</code>: it stores the value with the function that releases it and returns the value typed as itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you get when two disposers throw?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SuppressedError</code> whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.error</code> is the later failure and whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.suppressed</code> is the earlier one (with more failures, a nested chain). The stack is still marked disposed.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`DisposableStack\` | Built-in, disposable container of cleanup work |
| \`AsyncDisposableStack\` | Async version, awaited by \`disposeAsync()\` / \`await using\` |
| \`use\` / \`adopt\` / \`defer\` | Register a disposable / a value plus release function / a callback |
| \`move()\` | Transfer all registered cleanup to a new stack |
| Ownership transfer | Handing the duty to release resources to another owner |
| Error aggregation | Chaining several cleanup errors in \`SuppressedError\` objects |

**Conclusion:** \`using\` releases one thing at the end of one block; \`DisposableStack\` is how you release many things correctly when setup can fail and ownership must move. Register each resource the moment you acquire it, \`move()\` the stack out on success, use \`AsyncDisposableStack\` when any cleanup is async, and rely on the generic signatures to keep exact types and reject non-disposables at compile time. Check runtime support, because the \`lib\` setting only gives you the types.`,
    examples: [
      {
        label: `DisposableStack: rollback on failure, move() on success`,
        code: `/// <reference lib="esnext.disposable" />
(Symbol as { dispose?: symbol }).dispose ??= Symbol("Symbol.dispose");

// SuppressedError is missing in some runtimes too (TS's own helper has the same fallback).
const suppress = (error: unknown, suppressed: unknown): SuppressedError =>
  typeof SuppressedError === "function"
    ? new SuppressedError(error, suppressed, "An error was suppressed during disposal.")
    : Object.assign(new Error("An error was suppressed during disposal."), { name: "SuppressedError", error, suppressed });

// Use the built-in DisposableStack when the runtime has one, else a small
// spec-shaped stand-in (same order and error rules, fewer guard checks).
class MiniStack implements DisposableStack {
  #fns: (() => void)[] = [];
  #disposed = false;
  get disposed(): boolean { return this.#disposed; }
  use<T extends Disposable | null | undefined>(value: T): T {
    if (value != null) this.#fns.push(() => value[Symbol.dispose]());
    return value;
  }
  adopt<T>(value: T, onDispose: (value: T) => void): T {
    this.#fns.push(() => onDispose(value));
    return value;
  }
  defer(onDispose: () => void): void { this.#fns.push(onDispose); }
  move(): DisposableStack {
    const next = new MiniStack();
    next.#fns = this.#fns;
    this.#fns = [];
    this.#disposed = true;
    return next;
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    let failed = false, error: unknown;
    for (const fn of this.#fns.reverse()) {
      try { fn(); } catch (e) {
        error = failed ? suppress(e, error) : e;
        failed = true;
      }
    }
    this.#fns = [];
    if (failed) throw error;
  }
  [Symbol.dispose](): void { this.dispose(); }
  readonly [Symbol.toStringTag] = "DisposableStack";
}
const Stack: DisposableStackConstructor =
  (globalThis as { DisposableStack?: DisposableStackConstructor }).DisposableStack ?? MiniStack;

class Conn implements Disposable {
  constructor(readonly name: string, fail = false) {
    if (fail) throw new Error("cannot open " + name);
    console.log("open " + name);
  }
  query(): string { return this.name + " ok"; }
  [Symbol.dispose](): void { console.log("close " + this.name); }
}

// Acquire several resources; if any step fails, roll back the ones already open.
function openPair(failSecond: boolean): { a: Conn; b: Conn } & Disposable {
  using stack = new Stack();
  const a = stack.use(new Conn("primary"));
  const b = stack.use(new Conn("replica", failSecond));
  const timer = stack.adopt(42, (id) => console.log("clear timer " + id));
  stack.defer(() => console.log("deferred log flush"));
  // Success: move ownership out, so the using above disposes an empty stack.
  const owned = stack.move();
  return { a, b, [Symbol.dispose]: () => owned.dispose() };
}

try {
  openPair(true);
} catch (e) {
  console.log((e as Error).message);
}
console.log("---");
{
  using pair = openPair(false);
  console.log(pair.a.query(), "/", pair.b.query());
}`,
      },
      {
        label: `AsyncDisposableStack and SuppressedError aggregation`,
        code: `/// <reference lib="esnext.disposable" />
(Symbol as { dispose?: symbol }).dispose ??= Symbol("Symbol.dispose");
(Symbol as { asyncDispose?: symbol }).asyncDispose ??= Symbol("Symbol.asyncDispose");

// SuppressedError is missing in some runtimes too (TS's own helper has the same fallback).
const suppress = (error: unknown, suppressed: unknown): SuppressedError =>
  typeof SuppressedError === "function"
    ? new SuppressedError(error, suppressed, "An error was suppressed during disposal.")
    : Object.assign(new Error("An error was suppressed during disposal."), { name: "SuppressedError", error, suppressed });

// Built-in AsyncDisposableStack if present, else a spec-shaped stand-in.
class MiniAsyncStack implements AsyncDisposableStack {
  #fns: (() => PromiseLike<void> | void)[] = [];
  #disposed = false;
  get disposed(): boolean { return this.#disposed; }
  use<T extends AsyncDisposable | Disposable | null | undefined>(value: T): T {
    if (value == null) return value;
    const v = value as Partial<AsyncDisposable & Disposable>;
    const fn = v[Symbol.asyncDispose] ?? v[Symbol.dispose];
    if (!fn) throw new TypeError("not disposable");
    this.#fns.push(() => fn.call(value));
    return value;
  }
  adopt<T>(value: T, onDispose: (value: T) => PromiseLike<void> | void): T {
    this.#fns.push(() => onDispose(value));
    return value;
  }
  defer(onDispose: () => PromiseLike<void> | void): void { this.#fns.push(onDispose); }
  move(): AsyncDisposableStack {
    const next = new MiniAsyncStack();
    next.#fns = this.#fns; this.#fns = []; this.#disposed = true;
    return next;
  }
  async disposeAsync(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    let failed = false, error: unknown;
    for (const fn of this.#fns.reverse()) {
      try { await fn(); } catch (e) {
        error = failed ? suppress(e, error) : e;
        failed = true;
      }
    }
    if (failed) throw error;
  }
  [Symbol.asyncDispose](): Promise<void> { return this.disposeAsync(); }
  readonly [Symbol.toStringTag] = "AsyncDisposableStack";
}
const AsyncStack: AsyncDisposableStackConstructor =
  (globalThis as { AsyncDisposableStack?: AsyncDisposableStackConstructor }).AsyncDisposableStack ?? MiniAsyncStack;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const asyncRes = (name: string, fail = false): AsyncDisposable => ({
  async [Symbol.asyncDispose]() {
    await wait(5);
    if (fail) throw new Error(name + " failed");
    console.log("async close " + name);
  },
});
const syncRes = (name: string): Disposable => ({ [Symbol.dispose]: () => console.log("sync close " + name) });

async function main(): Promise<void> {
  {
    await using stack = new AsyncStack();
    stack.use(asyncRes("pool"));
    stack.use(syncRes("cache"));
    stack.defer(async () => { await wait(5); console.log("deferred flush"); });
    console.log("work");
  }
  console.log("--- two disposers fail");
  const stack = new AsyncStack();
  stack.use(asyncRes("first", true));
  stack.use(asyncRes("second", true));
  try {
    await stack.disposeAsync();
  } catch (e) {
    const s = e as SuppressedError;
    console.log(s.name, "| error:", (s.error as Error).message, "| suppressed:", (s.suppressed as Error).message);
  }
  console.log("disposed:", stack.disposed);
}
main();`,
      },
      {
        label: `The types: use<T>, adopt<T>, and composing a Disposable class`,
        code: `/// <reference lib="esnext.disposable" />
// Type-level checks only: tsc --strict verifies every line below.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

class Conn implements Disposable {
  query(sql: string): string[] { return [sql]; }
  [Symbol.dispose](): void {}
}
class Pool implements AsyncDisposable {
  async [Symbol.asyncDispose](): Promise<void> {}
}
interface Socket { end(): void }

// Never called: it only has to type-check (the page may have no DisposableStack at run time).
function typing(stack: DisposableStack, astack: AsyncDisposableStack, conn: Conn, sock: Socket): boolean {
  // use<T> returns the same T, so you keep the specific type, not just Disposable.
  const c = stack.use(conn);
  const keepsType: Equal<typeof c, Conn> = true;

  // null / undefined pass through (optional resources).
  const maybe = stack.use(Math.random() > 1 ? conn : undefined);
  const optional: Equal<typeof maybe, Conn | undefined> = true;

  // adopt<T> wraps a value that has no dispose method; T is inferred from the value.
  const s = stack.adopt(sock, (v) => v.end());
  const adopted: Equal<typeof s, Socket> = true;

  // @ts-expect-error a plain object with end() is not Disposable
  stack.use(sock);

  // @ts-expect-error DisposableStack cannot hold an async-only resource
  stack.use(new Pool());

  // AsyncDisposableStack accepts both kinds.
  astack.use(new Pool());
  astack.use(conn);

  // move() returns a fresh stack of the same kind.
  const moved: Equal<ReturnType<DisposableStack["move"]>, DisposableStack> = true;
  return keepsType && optional && adopted && moved;
}

// Composing: a class that owns a stack and is itself Disposable.
class Service implements Disposable {
  #stack: DisposableStack;
  constructor(stack: DisposableStack) { this.#stack = stack; }
  [Symbol.dispose](): void { this.#stack.dispose(); }
}
const usable: Equal<Service extends Disposable ? true : false, true> = true;

console.log("type checks compiled:", typeof typing === "function" && usable);`,
      },
    ],
  },
];

export default augments;
