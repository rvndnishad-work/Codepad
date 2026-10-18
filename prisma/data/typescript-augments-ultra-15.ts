/**
 * TYPESCRIPT ULTRA — batch 15: Modules and resolution (verbatimModuleSyntax, type-only
 * import fixes, bundler vs nodenext, allowImportingTsExtensions, traceResolution and explainFiles). Every example was run by
 * scripts/verify-ts-examples.ts (tsc 5.4.5 --strict and a copy of the page runner); quoted output is that run's output.
 */
import type { TsUltraAugment } from "./typescript-augments.types";

const augments: TsUltraAugment[] = [
  {
    title: `What does \`verbatimModuleSyntax\` enforce and why did it replace \`importsNotUsedAsValues\`?`,
    difficulty: "medium",
    seoDescription: `verbatimModuleSyntax: type-marked imports are erased and the rest is emitted as written, replacing import elision, importsNotUsedAsValues and TS1484.`,
    description: `**Question presented to candidate:**
"Your team just turned on \`verbatimModuleSyntax\` and the build is full of TS1484 errors. What does that flag actually enforce, what was wrong with the old \`importsNotUsedAsValues\` and \`preserveValueImports\` settings, and what does the emitted JavaScript look like now?"

**What a strong answer should cover:**
- Import elision: by default tsc removes imports whose names are only used as types, and it needs the type checker (and the other file) to decide that
- Why that breaks single-file transpilers (Babel, esbuild, swc, \`transpileModule\`) and can silently drop a side-effect import
- The rule of \`verbatimModuleSyntax\`: anything marked \`type\` is erased, everything else is emitted exactly as written; a type imported without \`type\` is error TS1484, a re-exported type without \`export type\` is TS1205
- What it replaced: \`importsNotUsedAsValues\` (remove / preserve / error) and \`preserveValueImports\`, which interacted confusingly with \`isolatedModules\`; TypeScript 5.0 deprecated both (TS5101) in favour of the new flag
- Side effects of the flag: it implies \`isolatedModules\`, keeps \`import {} from "x"\` for inline type-only imports, and forbids ESM syntax in files that emit CommonJS (TS1286)

**Code / implementation expected:** Yes — a file with a mixed import, the emit before and after the flag, and the fixed \`import type\` / inline \`type\` forms.`,
    answer: `**Target Audience:** Developers who write \`import\` statements in TypeScript and want to know exactly which of them survive into the JavaScript, and why a modern tsconfig insists on \`import type\`.
**Difficulty:** Medium
**TypeScript version:** Every compiler message and emitted file below came from TypeScript 5.4.5 on a scratch project. \`verbatimModuleSyntax\` arrived in TypeScript 5.0, which deprecated \`importsNotUsedAsValues\` and \`preserveValueImports\` in its favour ([TypeScript 5.0 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-rc/), [tsconfig reference: verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html)).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The emitted JavaScript and the \`error TS....\` lines are copied from real \`tsc\` runs, and the **Verified** section quotes the example programs' output in full.

## 1. Why This Even Matters — A Story First

A company mail room receives a sack of envelopes every morning. Some contain real parcels for the building; some are only *descriptions* of parcels ("a box about this big will arrive"). Descriptions are useless once the parcel is checked, so the mail room throws them away.

For years the mail room decided what to throw away by **opening every envelope and reading it**. That worked while one clerk, who knew every sender, did the sorting. Then the company hired a fast temp agency that sorts each envelope on its own, without knowing the senders. The temps could not tell a description from a parcel by looking at the outside, so they guessed, and sometimes threw away a parcel.

The fix was a rule written on the outside: **envelopes stamped TYPE go in the bin; everything else is delivered exactly as it arrived.** Nobody needs to open anything any more.

TypeScript imports are the envelopes, the clerk is the type checker, the temps are single-file transpilers such as Babel, esbuild and swc, and the stamp is the \`type\` keyword. \`verbatimModuleSyntax\` is the rule.

## 2. What tsc Did Before: Import Elision

Take a tiny project with two modules and one file that imports from both:

~~~ts
// types.ts
export interface User { id: number; name: string }
export const VERSION = "1.0";

// setup.ts
export function polyfill() {}
console.log("setup ran");

// main.ts
import { User, VERSION } from "./types.js";
import { polyfill } from "./setup.js";

const u: User = { id: 1, name: "Ada" };
console.log(VERSION, u.name);
~~~

With default settings (\`module: "ESNext"\`, \`moduleResolution: "Bundler"\`), tsc 5.4.5 emitted this \`main.js\`:

~~~ts
import { VERSION } from "./types.js";
const u = { id: 1, name: "Ada" };
console.log(VERSION, u.name);
~~~

Two things disappeared. \`User\` was removed from the first import because it is only a type. And the **whole** \`./setup.js\` import was removed, because \`polyfill\` is never used as a value. Running the output with Node printed only \`1.0 Ada\`: the line \`setup ran\` never appeared, because the module was never loaded.

📌 **Interview term: import elision** — tsc removing import specifiers (or whole import declarations) whose names are never used as values in the emitted code. It is decided by the type checker, using information from the imported file.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 230" role="img" aria-label="Without verbatimModuleSyntax the emitter asks the checker which imports are values before writing JavaScript">
  <rect class="d-box" x="20" y="70" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="106" text-anchor="middle">main.ts</text>
  <text class="d-sub" x="105" y="130" text-anchor="middle">import { User }</text>
  <rect class="d-box-accent" x="255" y="20" width="170" height="80" rx="10"/>
  <text class="d-text" x="340" y="56" text-anchor="middle">type checker</text>
  <text class="d-sub" x="340" y="80" text-anchor="middle">reads types.ts</text>
  <rect class="d-box" x="255" y="140" width="170" height="70" rx="10"/>
  <text class="d-text" x="340" y="180" text-anchor="middle">emitter</text>
  <rect class="d-box-muted" x="490" y="140" width="170" height="70" rx="10"/>
  <text class="d-text" x="575" y="170" text-anchor="middle">main.js</text>
  <text class="d-sub" x="575" y="194" text-anchor="middle">User removed</text>
  <path class="d-edge" d="M 194 95 L 250 70"/>
  <path class="d-edge-dashed" d="M 340 104 L 340 136"/>
  <path class="d-edge" d="M 429 175 L 486 175"/>
</svg>

The emitter cannot write \`main.js\` until the checker has answered "is \`User\` a value?", and the checker can only answer by reading \`types.ts\`.

## 3. Why That Became a Problem

Most TypeScript today is not compiled by tsc. Vite, Next.js, Jest transforms and many build tools strip types with esbuild, swc or Babel, **one file at a time**. A one-file tool sees \`import { User } from "./types.js"\` and has no idea whether \`User\` is an interface or a class.

Example 2 (below the answer) shows why the guess is hard: a name can be a type, a value, or both. \`Role\` there is a \`const\` object *and* a type alias with the same name; a class and an enum are both too. Using a pure type as a value is the compiler error

~~~text
main.ts(22,20): error TS2693: 'User' only refers to a type, but is being used as a value here.
~~~

📌 **Interview term: \`isolatedModules\`** — a flag that makes tsc report code a single-file transpiler cannot compile correctly (for example re-exporting a type without \`export type\`). It does not change the emit; it is a safety check.

With only \`isolatedModules: true\`, tsc 5.4.5 accepted \`main.ts\` without a complaint and emitted the same elided \`main.js\` as before: the flag does not catch a type imported without \`type\`, and tsc itself still used the checker to drop it.

TypeScript tried to patch the problem with two settings:

- **\`importsNotUsedAsValues\`**, with three values. \`"remove"\` was the default elision. \`"preserve"\` kept a side-effect import when every name was elided (tsc 5.4.5 emitted \`import "./setup.js";\`). \`"error"\` demanded \`import type\` for imports never used as values (\`error TS1371: This import is never used as a value and must use 'import type' because 'importsNotUsedAsValues' is set to 'error'.\`).
- **\`preserveValueImports\`**, which kept value imports even when unused, and when combined with \`isolatedModules\` reported \`error TS1444: 'User' is a type and must be imported using a type-only import when 'preserveValueImports' and 'isolatedModules' are both enabled.\`

Two flags, five combinations, and a third flag (\`isolatedModules\`) changing what each one meant. That is what the 5.0 release replaced.

📌 **Interview term: side-effect import** — an import whose purpose is to run the module (register a polyfill, load CSS, patch a global), not to use its exports. Elision can delete it silently when its names are unused.

## 4. The New Rule: What You Write Is What You Get

📌 **Interview term: \`verbatimModuleSyntax\`** — a compiler option under which the emit of imports and exports is decided by syntax alone: anything written with the \`type\` modifier is erased, and everything else is emitted exactly as written. tsc never consults the checker to drop an import.

With \`"verbatimModuleSyntax": true\`, the same \`main.ts\` now fails to compile:

~~~text
src/main.ts(1,10): error TS1484: 'User' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
~~~

The error exists because the emitted line would be \`import { User, VERSION } from "./types.js";\` and that crashes at run time. When I ran that output anyway, Node threw \`SyntaxError: The requested module './types.js' does not provide an export named 'User'\`. TS1484 turns that run-time crash into a compile-time error.

The fixes, and what tsc 5.4.5 emitted for each:

| Source | Emitted JavaScript |
| :--- | :--- |
| \`import type { User } from "./types.js";\` | nothing |
| \`import { type User, VERSION } from "./types.js";\` | \`import { VERSION } from "./types.js";\` |
| \`import { type User } from "./types.js";\` (all names inline \`type\`) | \`import {} from "./types.js";\` |
| \`import { polyfill } from "./setup.js";\` (unused) | kept as written, so \`setup ran\` prints |
| \`export type { User };\` | nothing |
| \`export { User, VERSION } from "./types.js";\` | error TS1205 (see below) |

The re-export line gives

~~~text
src/reexport.ts(1,10): error TS1205: Re-exporting a type when 'verbatimModuleSyntax' is enabled requires using 'export type'.
~~~

and the fix is two lines: \`export { VERSION } from "./types.js";\` plus \`export type { User } from "./types.js";\`.

Note the third row: an import whose names are *all* inline \`type\` still loads the module (\`import {} from ...\`), because only the specifiers were marked, not the declaration. If you want nothing emitted, write \`import type { ... }\`. Example 1 models every row of this table and its output matches what tsc emitted.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="With verbatimModuleSyntax the emitter reads only the syntax: type marked imports are erased, the rest is kept">
  <rect class="d-box" x="20" y="65" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="100" text-anchor="middle">import statement</text>
  <text class="d-sub" x="115" y="124" text-anchor="middle">as written</text>
  <rect class="d-box-accent" x="270" y="65" width="150" height="80" rx="10"/>
  <text class="d-text" x="345" y="100" text-anchor="middle">has type</text>
  <text class="d-sub" x="345" y="124" text-anchor="middle">modifier?</text>
  <rect class="d-box-muted" x="490" y="15" width="170" height="70" rx="10"/>
  <text class="d-text" x="575" y="56" text-anchor="middle">erased</text>
  <rect class="d-box" x="490" y="125" width="170" height="70" rx="10"/>
  <text class="d-text" x="575" y="166" text-anchor="middle">kept verbatim</text>
  <path class="d-edge" d="M 214 105 L 266 105"/>
  <path class="d-edge" d="M 424 90 L 486 55"/>
  <path class="d-edge-accent" d="M 424 120 L 486 155"/>
  <text class="d-sub" x="440" y="36" text-anchor="middle">yes</text>
  <text class="d-sub" x="440" y="190" text-anchor="middle">no</text>
</svg>

No arrow goes to the checker any more: any one-file tool can apply the same rule and produce the same JavaScript as tsc.

## 5. Everything Else the Flag Enforces

- **It implies \`isolatedModules\`.** \`tsc --showConfig\` on the project printed \`"isolatedModules": true\` and \`"preserveConstEnums": true\` even though only \`verbatimModuleSyntax\` was set.
- **ESM syntax in a file that emits CommonJS is an error.** With \`module: "CommonJS"\`, tsc refused to rewrite \`import\` into \`require\` (two of the six errors it printed):

~~~text
src/main.ts(1,10): error TS1286: ESM syntax is not allowed in a CommonJS module when 'verbatimModuleSyntax' is enabled.
src/types.ts(2,1): error TS1287: A top-level 'export' modifier cannot be used on value declarations in a CommonJS module when 'verbatimModuleSyntax' is enabled.
~~~

  "Verbatim" means the module syntax is not translated, so CommonJS output must be written as CommonJS: \`import fs = require("fs")\` and \`export = value\`. \`export interface\` and \`import type\` were still accepted (they are erased). With \`module: "UMD"\` the option itself was rejected: \`error TS5105: Option 'verbatimModuleSyntax' cannot be used when 'module' is set to 'UMD', 'AMD', or 'System'.\`
- **The old flags are deprecated.** On 5.4.5, \`importsNotUsedAsValues\` gave

~~~text
error TS5101: Option 'importsNotUsedAsValues' is deprecated and will stop functioning in TypeScript 5.5. Specify compilerOption '"ignoreDeprecations": "5.0"' to silence this error.
  Use 'verbatimModuleSyntax' instead.
~~~

  and combining \`preserveValueImports\` with the new flag added \`error TS5104: Option 'preserveValueImports' is redundant and cannot be specified with option 'verbatimModuleSyntax'.\` I only had 5.4.5 to run, so what 5.5 and later do with these options is not verified here; the 5.4.5 message itself announces that they stop functioning in 5.5.

| | Legacy elision | \`importsNotUsedAsValues: "preserve"\` | \`verbatimModuleSyntax\` |
| :--- | :--- | :--- | :--- |
| Who decides what is erased | The checker | The checker | The syntax (\`type\`) |
| Type imported without \`type\` | Silently removed | Silently removed | TS1484 |
| Unused value import | Whole import removed | Becomes \`import "x"\` | Kept as written |
| Safe for one-file transpilers | No | No | Yes |
| CommonJS output from \`import\` | Rewritten to \`require\` | Rewritten | Error TS1286 |

## 6. Verified: Running the Code

Both examples pass \`tsc --strict\` on TypeScript 5.4.5 (the \`// @ts-expect-error\` line in example 2 is a real TS2693), and both were run as the page runs them.

Example 1, the emit model. Every "after" column matches what tsc 5.4.5 emitted for the same import in the scratch project:

~~~text
import { User, VERSION }
  legacy elision                     import { VERSION } from "./types.js";
  importsNotUsedAsValues: preserve   import { VERSION } from "./types.js";
  verbatimModuleSyntax               import { User, VERSION } from "./types.js";  <- TS1484 'User' is a type
import { polyfill } (unused)
  legacy elision                     (removed)
  importsNotUsedAsValues: preserve   import "./setup.js";
  verbatimModuleSyntax               import { polyfill } from "./setup.js";
import type { User }
  legacy elision                     (removed)
  importsNotUsedAsValues: preserve   (removed)
  verbatimModuleSyntax               (removed)
import { type User }
  legacy elision                     (removed)
  importsNotUsedAsValues: preserve   import "./types.js";
  verbatimModuleSyntax               import {} from "./types.js";
~~~

Example 2, names that are types, values or both:

~~~text
admin
{"x":1,"y":2}
2 High
1.0 Ada
undefined
1.0
~~~

(The \`undefined\` line is the run-time \`typeof User\`: the interface does not exist in JavaScript, and \`typeof\` on an undeclared name is \`"undefined"\`.)

The project-level results quoted in sections 2 to 5 (emitted files, TS1484, TS1205, TS1286, TS5101, the Node crash on \`User\`, the missing \`setup ran\`) come from separate tsc 5.4.5 and Node 22 runs on the scratch project shown in section 2.

## Common Pitfalls

- **Writing \`import { type A }\` and expecting nothing to be emitted.** If every specifier is inline \`type\`, the module is still loaded (\`import {} from "./a"\`). Use \`import type { A }\` to erase the line.
- **Keeping \`module: "CommonJS"\` with ESM syntax.** Under the flag that is TS1286 on every import. Either emit ESM (\`ESNext\`, \`Preserve\`, \`NodeNext\` with \`"type": "module"\`), or write \`import x = require(...)\`.
- **Leaving \`importsNotUsedAsValues\` or \`preserveValueImports\` in a shared base config.** They are deprecated (TS5101) and conflict with the new flag (TS5104); delete them rather than adding \`ignoreDeprecations\`.
- **Assuming \`verbatimModuleSyntax\` removes unused imports.** It never removes a value import. An unused import is now kept and loaded at run time; lint rules or \`noUnusedLocals\` catch it.
- **Re-exporting types with plain \`export { }\`.** Barrel files need \`export type { ... }\` for types (TS1205).
- **Thinking it changes type checking.** It only constrains how imports and exports are written and emitted; the types are the same.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The old behaviour:</strong> <span style="color:#f0e2c8;">By default tsc performs <strong style="color:#ffca28;">import elision</strong>: it removes imports whose names are only used as types. Deciding that needs the type checker and the imported file.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The problem:</strong> <span style="color:#f0e2c8;">One-file transpilers like esbuild, swc and Babel cannot see the other file, so they guess. Elision could also delete a whole side-effect import, such as a polyfill.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The rule:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">verbatimModuleSyntax</code>, anything marked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> is erased and everything else is emitted exactly as written. A type imported without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1484</code>; a type re-exported without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export type</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1205</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What it replaced:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">importsNotUsedAsValues</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preserveValueImports</code> were two partial fixes with confusing combinations. TypeScript <strong style="color:#ffca28;">5.0</strong> added the single flag and deprecated both (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS5101</code>).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consequences:</strong> <span style="color:#f0e2c8;">It implies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isolatedModules</code>, keeps unused value imports, and forbids ESM syntax in files that emit CommonJS (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1286</code>), so CJS code uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import x = require()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is emitted for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import { type A } from "./a"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import {} from "./a";</code>, so the module still runs. Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import type { A }</code> removes the line completely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">verbatimModuleSyntax</code> make tsc slower or change type checking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It only adds syntax rules for imports and exports and makes emit purely syntactic. Types are checked exactly as before.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just turn on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isolatedModules</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isolatedModules</code> reports some unsafe patterns but tsc still elides imports using the checker. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">verbatimModuleSyntax</code> also makes tsc itself emit purely by syntax, so every tool produces the same output.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you migrate a large codebase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Turn the flag on, then apply the language-service fix <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Fix all with type-only imports</code> file by file, or the typescript-eslint rule <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">consistent-type-imports</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--fix</code>, and fix barrels with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export type</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with a CommonJS build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">ESM syntax becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1286</code>. Either move the output to ESM, or write CommonJS syntax directly: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import x = require("x")</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export =</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Import elision | tsc removing imports whose names are only used as types, decided by the checker |
| \`isolatedModules\` | Reports code a one-file transpiler cannot compile correctly; implied by \`verbatimModuleSyntax\` |
| Side-effect import | An import used to run a module, not to use its exports |
| \`verbatimModuleSyntax\` | \`type\`-marked imports and exports are erased, the rest is emitted as written |
| \`TS1484\` | A type imported without \`type\` under \`verbatimModuleSyntax\` |
| \`TS1205\` | A type re-exported without \`export type\` |

**Conclusion:** \`verbatimModuleSyntax\` replaces a decision that needed the whole program ("is this import only a type?") with one that needs only the line in front of you ("is it marked \`type\`?"). That makes tsc, esbuild, swc and Babel emit the same JavaScript, stops side-effect imports from vanishing, and folds two deprecated, confusing flags into one rule. The price is writing \`import type\` and \`export type\` where you mean them; the sibling question on [fixing JSX and type-only import errors under \`verbatimModuleSyntax\`](/interview-question/how-do-you-fix-jsx-and-type-only-import-errors-under-verbatimmodulesyntax) walks through doing that in a real React codebase, and [isolatedDeclarations](/interview-question/what-is-isolateddeclarations-and-how-does-it-enable-single-file-transpilation-fo) applies the same one-file idea to \`.d.ts\` emit.`,
    examples: [
      {
        label: `A model of import emit under the three settings`,
        code: `// A small model of how tsc emits one import declaration under three settings.
// Its output matches what tsc 5.4.5 really emitted for the same imports.
type Mode = "legacy elision" | "importsNotUsedAsValues: preserve" | "verbatimModuleSyntax";

interface Specifier {
  name: string;
  writtenAsType: boolean; // import { type X }
  isOnlyAType: boolean; // what X turns out to be in the other file
  usedAsValue: boolean; // does this file use X at run time?
}
interface ImportDecl { from: string; importType: boolean; specs: Specifier[] }

function emit(d: ImportDecl, mode: Mode): { js: string; errors: string[] } {
  const errors: string[] = [];
  if (d.importType) return { js: "(removed)", errors }; // import type: always erased
  if (mode === "verbatimModuleSyntax") {
    // Purely syntactic: keep every specifier not marked type. Never look at usage.
    const kept = d.specs.filter((s) => !s.writtenAsType);
    for (const s of kept) if (s.isOnlyAType) errors.push(\`TS1484 '\${s.name}' is a type\`);
    return { js: \`import { \${kept.map((s) => s.name).join(", ")} } from "\${d.from}";\`.replace("{  }", "{}"), errors };
  }
  // Legacy: the checker decides. Keep only values that are used as values.
  const kept = d.specs.filter((s) => !s.writtenAsType && !s.isOnlyAType && s.usedAsValue);
  if (kept.length > 0) return { js: \`import { \${kept.map((s) => s.name).join(", ")} } from "\${d.from}";\`, errors };
  return { js: mode === "legacy elision" ? "(removed)" : \`import "\${d.from}";\`, errors };
}

const spec = (name: string, isOnlyAType: boolean, usedAsValue: boolean, writtenAsType = false): Specifier =>
  ({ name, isOnlyAType, usedAsValue, writtenAsType });

const cases: [string, ImportDecl][] = [
  ["import { User, VERSION }", { from: "./types.js", importType: false, specs: [spec("User", true, false), spec("VERSION", false, true)] }],
  ["import { polyfill } (unused)", { from: "./setup.js", importType: false, specs: [spec("polyfill", false, false)] }],
  ["import type { User }", { from: "./types.js", importType: true, specs: [spec("User", true, false)] }],
  ["import { type User }", { from: "./types.js", importType: false, specs: [spec("User", true, false, true)] }],
];

const modes: Mode[] = ["legacy elision", "importsNotUsedAsValues: preserve", "verbatimModuleSyntax"];
for (const [source, decl] of cases) {
  console.log(source);
  for (const m of modes) {
    const r = emit(decl, m);
    console.log(\`  \${m.padEnd(34)} \${r.js}\${r.errors.length ? "  <- " + r.errors.join(", ") : ""}\`);
  }
}`,
      },
      {
        label: `One name, two meanings: why elision needed the checker`,
        code: `// Why "is this import a type?" needs the checker: a name can be a type,
// a value, or both, and only the declaring file knows which.
interface User { id: number; name: string } // type only
const VERSION = "1.0"; // value only
const Role = { Admin: "admin", Guest: "guest" } as const; // a value...
type Role = (typeof Role)[keyof typeof Role]; // ...and a type with the same name
class Point { constructor(public x: number, public y: number) {} } // class: both
enum Level { Low = 1, High = 2 } // enum: both, and it emits an object

const r: Role = Role.Admin; // Role as a type and Role as a value
const p: Point = new Point(1, 2);
const u: User = { id: 7, name: "Ada" };

console.log(r); // admin
console.log(JSON.stringify(p)); // {"x":1,"y":2}
console.log(Level.High, Level[2]);
console.log(VERSION, u.name);

// A type has no run-time existence, so it cannot be used as a value.
// (At run time typeof on an undeclared name is the string "undefined".)
// @ts-expect-error 'User' only refers to a type, but is being used as a value here.
console.log(typeof User);

// typeof on a value gives you its type, but the reverse is impossible.
type V = typeof VERSION; // "1.0"
const v: V = "1.0";
console.log(v);`,
      },
    ],
  },
  {
    title: `How do you fix JSX and type-only import errors under \`verbatimModuleSyntax\`?`,
    difficulty: "medium",
    seoDescription: `Fixing TS1484, TS1205, TS1361 and TS1286 in React files under verbatimModuleSyntax: props types, components in JSX, barrels, React imports and bulk fixes.`,
    description: `**Question presented to candidate:**
"We enabled \`verbatimModuleSyntax\` in our React app and now \`App.tsx\` and our component barrel files fail to compile. Walk me through the errors you expect, how you fix each one, and how you would fix a few hundred files without doing it by hand."

**What a strong answer should cover:**
- Props types, \`FC\`, \`ReactNode\` and other types need \`import type\` or an inline \`type\` modifier (TS1484); components used in JSX are values and must stay plain imports
- Barrel files that re-export props types need \`export type { ... }\` (TS1205)
- Over-fixing breaks too: a component imported with \`import type\` and used in JSX is TS1361, and \`import type React, { useState }\` is TS1363
- The JSX runtime matters: with \`jsx: "react-jsx"\` the compiler adds \`import { jsx as _jsx } from "react/jsx-runtime"\` and an old \`import React\` becomes an unused import that is still emitted; with classic \`jsx: "react"\`, \`React\` must be a value import
- Files that emit CommonJS fail with TS1286; the fix is ESM output, not more \`type\` keywords
- Bulk fixes: the TypeScript quick fix "Fix all with type-only imports", typescript-eslint \`consistent-type-imports\` with \`--fix\`, and type-only auto-imports in the editor

**Clarifying questions expected:**
- Which JSX setting does the project use (\`react-jsx\` or classic \`react\`)?
- Does the build emit ESM or CommonJS (\`module\` setting and \`package.json\` \`"type"\`)?

**Code / implementation expected:** Yes — a broken component file and its fixed version, plus a barrel file fix.`,
    answer: `**Target Audience:** React and frontend developers whose build broke after turning on \`verbatimModuleSyntax\`, and anyone asked how to migrate a codebase to it.
**Difficulty:** Medium
**TypeScript version:** All errors, emitted files and quick fixes below came from TypeScript 5.4.5 on a scratch project with \`jsx: "react-jsx"\`, \`module: "ESNext"\`, \`moduleResolution: "Bundler"\` and \`verbatimModuleSyntax: true\`. To keep the run self-contained it used a small hand-written stand-in for the \`react\` type declarations (only \`FC\`, \`useState\` and the JSX namespace), not the real \`@types/react\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The \`error TS....\` lines and emitted JavaScript are copied from real \`tsc\` runs, and the **Verified** section quotes the example program's output in full.

This page is the applied, React-shaped half of the topic. What the flag is and why it replaced \`importsNotUsedAsValues\` is covered in [What does \`verbatimModuleSyntax\` enforce?](/interview-question/what-does-verbatimmodulesyntax-enforce-and-why-did-it-replace-importsnotusedasva); the one-line version is: **anything marked \`type\` is erased, everything else is emitted exactly as written.**

## 1. Why This Even Matters — A Story First

You are moving house. The movers have a new rule: they load every box onto the truck unless it has a red "DO NOT MOVE" sticker. Last time a helpful friend went round deciding for you, and quietly left a box of cables behind because "it looked empty."

Now the decision is yours, and it is visible. The floor plan of the new flat (useful while packing, worthless on the truck) gets a sticker. The sofa obviously does not. And if you put a sticker on the sofa by mistake, you arrive with nothing to sit on.

In a component file, types such as \`ButtonProps\` and \`FC\` are the floor plan: needed while compiling, gone at run time. Components such as \`Button\` are the sofa: JSX calls them at run time. \`type\` is the sticker, and \`verbatimModuleSyntax\` is the movers' rule.

📌 **Interview term: type-only import** — \`import type { A } from "m"\` or \`import { type A } from "m"\`: an import that exists only for the type checker and is erased from the JavaScript.

## 2. The Broken File

~~~ts
// Button.tsx
export interface ButtonProps { label: string }
export function Button(props: ButtonProps) {
  return <button>{props.label}</button>;
}

// App.tsx
import React, { FC, useState } from "react";
import { Button, ButtonProps } from "./Button";

const defaults: ButtonProps = { label: "Save" };
export const App: FC = () => {
  const [count] = useState(0);
  return <Button label={defaults.label + count} />;
};

// index.ts (barrel)
export { Button, ButtonProps } from "./Button";
~~~

tsc 5.4.5 reported:

~~~text
src/App.tsx(1,17): error TS1484: 'FC' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
src/App.tsx(2,18): error TS1484: 'ButtonProps' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
src/index.ts(1,18): error TS1205: Re-exporting a type when 'verbatimModuleSyntax' is enabled requires using 'export type'.
~~~

And it still emitted JavaScript, which shows exactly why the errors matter. \`App.js\` contained \`import { Button, ButtonProps } from "./Button";\`. \`ButtonProps\` does not exist at run time, so a native ES module loader would throw "does not provide an export named" for it.

## 3. Sorting Each Name: Type, Value or JSX

The whole fix is one question per imported name: **is it needed at run time in this file?**

| Name | What it is | How \`App.tsx\` uses it | Needs run time? | Import as |
| :--- | :--- | :--- | :--- | :--- |
| \`FC\` | type alias | annotation \`App: FC\` | No | \`type FC\` |
| \`useState\` | function | called | Yes | plain |
| \`Button\` | function component | \`<Button />\` | Yes: JSX compiles to \`_jsx(Button, ...)\` | plain |
| \`ButtonProps\` | interface | annotation | No | \`type ButtonProps\` |
| \`React\` (default) | object | not used with \`react-jsx\` | No | delete it |
| \`Point\` (a class) | class: type **and** value | annotation only | No | \`type Point\` is allowed |

📌 **Interview term: value space and type space** — TypeScript keeps two namespaces. Interfaces and type aliases live only in the type space; functions and constants only in the value space; classes and enums in both. Only value-space names survive into JavaScript.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 240" role="img" aria-label="Each imported name is sorted: used in JSX or called means a plain import, used only in annotations means a type import">
  <rect class="d-box-accent" x="250" y="20" width="180" height="70" rx="10"/>
  <text class="d-text" x="340" y="52" text-anchor="middle">imported name</text>
  <text class="d-sub" x="340" y="74" text-anchor="middle">how is it used here</text>
  <rect class="d-box" x="40" y="150" width="240" height="70" rx="10"/>
  <text class="d-text" x="160" y="182" text-anchor="middle">called or used in JSX</text>
  <text class="d-sub" x="160" y="204" text-anchor="middle">plain import</text>
  <rect class="d-box-muted" x="400" y="150" width="240" height="70" rx="10"/>
  <text class="d-text" x="520" y="182" text-anchor="middle">only in annotations</text>
  <text class="d-sub" x="520" y="204" text-anchor="middle">import type</text>
  <path class="d-edge" d="M 300 94 L 190 146"/>
  <path class="d-edge" d="M 380 94 L 490 146"/>
</svg>

Usage in *this* file decides, not what the name is in general: a class used only as an annotation can be a type import, while a component that appears in JSX never can.

## 4. The Fixes, Verified

**Inline style** (one statement per module). This is exactly what the TypeScript language service produced when I asked it for the combined fix of both TS1484 errors (\`fixName\` \`convertToTypeOnlyImport\`, described as "Fix all with type-only imports"):

~~~ts
import React, { type FC, useState } from "react";
import { Button, type ButtonProps } from "./Button";
~~~

The quick fix only adds \`type\`; it does not remove the unused \`React\`. Deleting it gives \`import { type FC, useState } from "react";\`. Organize Imports in the same language service did delete the unused \`React\` default import.

**Separate style** (type imports on their own lines). This also compiled cleanly:

~~~ts
import type { FC } from "react";
import { useState } from "react";
import type { ButtonProps } from "./Button";
import { Button } from "./Button";
~~~

Either way, the emitted \`App.js\` now contains only what runs:

~~~ts
import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "./Button";
~~~

**Barrel file.** The language service fix \`convertToTypeOnlyExport\` ("Convert to type-only export") split the re-export into

~~~ts
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
~~~

📌 **Interview term: barrel file** — an \`index.ts\` that re-exports a folder's modules so callers can import from one place. Under \`verbatimModuleSyntax\` its type re-exports must use \`export type\`.

## 5. Over-Fixing: The Errors on the Other Side

Adding \`type\` everywhere does not work either. These came from the same project:

~~~text
src/Overfix.tsx(2,20): error TS1361: 'Button' cannot be used as a value because it was imported using 'import type'.
src/Both.tsx(1,8): error TS1363: A type-only import can specify a default import or named bindings, but not both.
~~~

- **TS1361**: \`import type { Button }\` followed by \`<Button label="x" />\`. JSX is a function call, so the component must be a value import.
- **TS1363**: \`import type React, { useState } from "react"\` is not valid syntax. Split it, or use inline modifiers on the named part.

## 6. The JSX Runtime Changes Which React Import You Need

📌 **Interview term: automatic JSX runtime** — with \`jsx: "react-jsx"\`, the compiler turns \`<b>hi</b>\` into \`_jsx("b", { children: "hi" })\` and adds the import \`import { jsx as _jsx } from "react/jsx-runtime"\` itself. Your file does not need \`React\` in scope.

- **\`jsx: "react-jsx"\`.** An old \`import React from "react";\` is now unused. Under \`verbatimModuleSyntax\` tsc keeps it in the output (it never removes value imports), whereas without the flag it was elided. With \`noUnusedLocals\` it is reported: \`error TS6133: 'React' is declared but its value is never read.\` Fix: delete it.
- **Classic \`jsx: "react"\`.** \`<b>hi</b>\` compiled to \`React.createElement("b", null, "hi")\`, so \`React\` is used as a value. \`import type React from "react"\` there gave \`error TS1361: 'React' cannot be used as a value because it was imported using 'import type'.\` Fix: keep \`import React from "react"\` (or move to \`react-jsx\`).

## 7. When the Errors Are Not About \`type\` at All

If the project emits CommonJS (\`module: "CommonJS"\`, common in older Jest or Node setups), every \`import\` line in every component file fails with \`error TS1286: ESM syntax is not allowed in a CommonJS module when 'verbatimModuleSyntax' is enabled.\` (see the [sibling question](/interview-question/what-does-verbatimmodulesyntax-enforce-and-why-did-it-replace-importsnotusedasva) for the full output). No amount of \`import type\` fixes that. Move the compile to ESM (\`module: "ESNext"\` or \`"Preserve"\` with \`moduleResolution: "Bundler"\` for a bundled app), or leave the flag off for that build.

## 8. Fixing a Few Hundred Files

- **Compiler quick fix.** In the editor, the TS1484 quick fix offers "Fix all with type-only imports" for a file (verified above through the language-service API).
- **typescript-eslint \`consistent-type-imports\`.** Its \`fixStyle\` option chooses between \`separate-type-imports\` (the default, a separate \`import type\` line) and \`inline-type-imports\` (\`import { type A }\`); \`--fix\` rewrites the imports ([rule docs](https://typescript-eslint.io/rules/consistent-type-imports/)). I did not run ESLint for this page.
- **Type-only auto-imports.** TypeScript 5.3 added an editor option to prefer type-only auto-imports, exposed in VS Code as \`typescript.preferences.preferTypeOnlyAutoImports\` ([InfoWorld on TypeScript 5.3](https://www.infoworld.com/article/3708188/typescript-53-arrives-with-support-for-import-attributes.html)), so new imports are written correctly in the first place.
- **CI.** Run \`tsc --noEmit\` with the flag on so a plain type import cannot come back.

## 9. Verified: Running the Code

The example below the answer passes \`tsc --strict\` on TypeScript 5.4.5 and was run as the page runs it. It models the sorting rule of section 3 and prints both fix styles; each printed import line matches a version that tsc 5.4.5 compiled without errors in the scratch project:

~~~text
-- inline
import { type FC, useState } from "react";
import { Button, type ButtonProps } from "./Button";
import type { Point } from "./geometry";
-- separate
import type { FC } from "react";
import { useState } from "react";
import type { ButtonProps } from "./Button";
import { Button } from "./Button";
import type { Point } from "./geometry";
Button: TS1361 if imported with import type
ButtonProps: ok
~~~

The compiler errors, emitted files and language-service fixes in sections 2 to 7 come from separate runs on the scratch project (TypeScript 5.4.5 \`tsc\` and its language-service API).

## Common Pitfalls

- **Marking components as types.** A component used in JSX is a value; \`import type\` on it is TS1361.
- **Leaving \`import React\` behind with \`react-jsx\`.** It is no longer an error, but it is still emitted and loaded. Delete it, and let \`noUnusedLocals\` or the linter catch new ones.
- **Forgetting barrels.** The component files compile, then \`index.ts\` fails with TS1205. Split each re-export into \`export { ... }\` and \`export type { ... }\`.
- **Combining default and named in \`import type\`.** \`import type React, { useState }\` is TS1363.
- **Chasing TS1286 with \`type\` keywords.** That error means the file emits CommonJS; change the module output instead.
- **Inline-only type imports that still load a module.** If every specifier is \`type\`, prefer \`import type { ... }\` so the line is erased rather than becoming \`import {} from "..."\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">Under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">verbatimModuleSyntax</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code>-marked imports are erased and everything else is emitted as written. So every type needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code>, and every value must not have it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Sort each name:</strong> <span style="color:#f0e2c8;">Props types, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FC</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReactNode</code> are types: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import { type ButtonProps }</code>. Components used in JSX and hooks are values: plain imports. That fixes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1484</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Barrels:</strong> <span style="color:#f0e2c8;">Re-exported types need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">export type { ButtonProps } from "./Button"</code>, otherwise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1205</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. JSX runtime:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react-jsx</code> the compiler imports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react/jsx-runtime</code> itself, so delete <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import React</code>. With classic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">jsx: "react"</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React</code> must stay a value import.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. At scale:</strong> <span style="color:#f0e2c8;">Use the quick fix <strong style="color:#ffca28;">Fix all with type-only imports</strong>, or typescript-eslint <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">consistent-type-imports</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--fix</code>, and keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --noEmit</code> in CI. If you see <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1286</code>, the build emits CommonJS and needs ESM output instead.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import type</code> for a component you render?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JSX compiles to a call such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_jsx(Button, props)</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Button</code> must exist at run time. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import type</code> erases it and tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS1361</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a class be imported with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import type</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if this file only uses it in type positions. As soon as it calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">new</code> or uses it in JSX, it must be a value import.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Inline <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type</code> or separate <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import type</code> lines?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both compile to the same JavaScript when the module has at least one value import. Separate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import type</code> is the only form that erases the line when every name is a type. It is a team style choice; the ESLint rule enforces either.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the quick fix remove unused imports?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It only adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code>. Removing an unused <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">React</code> import is a separate step, such as Organize Imports or the linter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the emitted <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">App.js</code> look like after the fix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the type names disappear: it keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import { useState } from "react"</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import { Button } from "./Button"</code>, plus the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">react/jsx-runtime</code> import that the compiler adds for JSX.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type-only import | \`import type\` or inline \`type\`: erased from the JavaScript |
| Value space and type space | The two namespaces; only value-space names exist at run time |
| Barrel file | An \`index.ts\` that re-exports a folder |
| Automatic JSX runtime | \`react-jsx\`: the compiler imports \`jsx\` from \`react/jsx-runtime\` |
| \`TS1361\` | A name imported with \`import type\` used as a value |
| \`TS1363\` | \`import type\` with both a default and named bindings |

**Conclusion:** Fixing a React codebase for \`verbatimModuleSyntax\` comes down to one question per imported name: does this file need it at run time? Types, props interfaces and \`FC\` get \`type\`; components used in JSX and hooks do not; barrels split into \`export\` and \`export type\`; the old \`React\` import goes away with the automatic runtime. Let the quick fix or the ESLint rule do the bulk of the work, read TS1361 as "you over-fixed" and TS1286 as "this build emits CommonJS", and the build ends up emitting only the imports that actually run.`,
    examples: [
      {
        label: `Fixing a component file: inline vs separate type imports`,
        code: `// A model of the fix for one file under verbatimModuleSyntax.
// For each imported name: what it is in its own module, and how this file uses it.
type Meaning = "type" | "value" | "class"; // class = both a type and a value
type Use = "type" | "value" | "jsx";
interface Binding { name: string; isDefault: boolean; meaning: Meaning; uses: Use[] }
interface Decl { from: string; bindings: Binding[] }

const needsRuntime = (b: Binding) => b.uses.includes("value") || b.uses.includes("jsx");

function render(from: string, def: string | undefined, named: string[], typeOnly = false): string {
  const parts = [def, named.length ? \`{ \${named.join(", ")} }\` : undefined].filter(Boolean);
  return \`import \${typeOnly ? "type " : ""}\${parts.join(", ")} from "\${from}";\`;
}

// "inline": what the TypeScript quick fix does (type modifier per name).
// "separate": one import type statement plus one value statement.
function fix(d: Decl, style: "inline" | "separate"): string[] {
  const used = d.bindings.filter((b) => b.uses.length > 0); // unused names are dropped
  const value = used.filter(needsRuntime);
  const types = used.filter((b) => !needsRuntime(b));
  const def = (list: Binding[]) => list.find((b) => b.isDefault)?.name;
  const named = (list: Binding[]) => list.filter((b) => !b.isDefault).map((b) => b.name);
  if (style === "separate") {
    const out: string[] = [];
    // import type may have a default OR named bindings, not both (TS1363).
    if (def(types)) out.push(render(d.from, def(types), [], true));
    if (named(types).length) out.push(render(d.from, undefined, named(types), true));
    if (value.length) out.push(render(d.from, def(value), named(value)));
    return out;
  }
  if (def(types) && value.length === 0 && named(types).length === 0) return [render(d.from, def(types), [], true)];
  if (value.length === 0) return [render(d.from, undefined, named(types), true)];
  const marked = used.filter((b) => !b.isDefault).map((b) => (needsRuntime(b) ? b.name : \`type \${b.name}\`));
  return [render(d.from, def(value), marked)];
}

// The broken App.tsx: import React, { FC, useState } from "react";
//                     import { Button, ButtonProps } from "./Button";
// With jsx: "react-jsx", the file never uses React itself.
const app: Decl[] = [
  { from: "react", bindings: [
    { name: "React", isDefault: true, meaning: "value", uses: [] },
    { name: "FC", isDefault: false, meaning: "type", uses: ["type"] },
    { name: "useState", isDefault: false, meaning: "value", uses: ["value"] },
  ] },
  { from: "./Button", bindings: [
    { name: "Button", isDefault: false, meaning: "value", uses: ["jsx"] },
    { name: "ButtonProps", isDefault: false, meaning: "type", uses: ["type"] },
  ] },
  // A class used only in a type position may be imported as a type.
  { from: "./geometry", bindings: [{ name: "Point", isDefault: false, meaning: "class", uses: ["type"] }] },
];

for (const style of ["inline", "separate"] as const) {
  console.log(\`-- \${style}\`);
  for (const d of app) for (const line of fix(d, style)) console.log(line);
}

// The two over-fixes tsc rejects, as checks:
const jsxButAsType = (b: Binding) => !needsRuntime(b) ? "ok" : "TS1361 if imported with import type";
console.log("Button:", jsxButAsType(app[1].bindings[0]));
console.log("ButtonProps:", jsxButAsType(app[1].bindings[1]));`,
      },
    ],
  },
  {
    title: `When should you use \`moduleResolution: "bundler"\` versus \`"nodenext"\`?`,
    difficulty: "medium",
    seoDescription: `moduleResolution bundler vs nodenext: extensions, directory imports, exports conditions, module pairing rules and which to pick for apps and libraries.`,
    description: `**Question presented to candidate:**
"You are setting up the tsconfig for a new project. How do you decide between \`moduleResolution: \\"bundler\\"\` and \`\\"nodenext\\"\`? What does each one let you write, and what goes wrong if you pick the wrong one?"

**What a strong answer should cover:**
- Module resolution is how the compiler maps an import string to a file; the setting should model whatever will really load the code at run time
- \`bundler\` models Vite, webpack, esbuild and similar: extensionless relative imports and directory \`index\` files resolve, and package \`exports\` are read with the \`import\` and \`types\` conditions
- \`nodenext\` models Node.js: the importing file is ESM or CommonJS (from \`.mts\`/\`.cts\` or \`package.json\` \`"type"\`), ESM imports need the full \`.js\` extension (TS2835, TS2834), and \`exports\` use \`import\` or \`require\` accordingly
- Pairing rules: \`nodenext\` resolution requires \`module: "nodenext"\` (TS5110 / TS5109); in 5.4 \`bundler\` needs \`module\` \`preserve\` or ES2015+ (TS5095)
- The failure mode of choosing \`bundler\` for code Node runs directly: tsc is happy, Node throws \`ERR_MODULE_NOT_FOUND\`
- Rule of thumb: bundled apps use \`bundler\`; code that Node (or a published library's consumers) loads uses \`nodenext\`; \`nodenext\`-valid code also resolves under \`bundler\`

**Clarifying questions expected:**
- What actually runs the output: a bundler, Node directly, or both (a published library)?
- Is the package ESM (\`"type": "module"\`) or CommonJS?

**Code / implementation expected:** Optional — two small tsconfigs and an import that one accepts and the other rejects.`,
    answer: `**Target Audience:** Developers choosing compiler options for a new app, Node service or library, and anyone who has seen "Relative import paths need explicit file extensions" and wondered why.
**Difficulty:** Medium
**TypeScript version:** Every compiler message, trace and run result below came from TypeScript 5.4.5 and Node.js 22 on scratch projects. \`node16\` and \`nodenext\` arrived in TypeScript 4.7 ([Announcing TypeScript 4.7](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/), May 2022) and \`bundler\` in TypeScript 5.0 ([TypeScript 5.0 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-rc/)).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Results come from real \`tsc\` and \`node\` runs, and the **Verified** section quotes the example program's output in full.

## 1. Why This Even Matters — A Story First

Two delivery services serve the same city. The **courier company** has smart dispatchers: write "Flat 4, Elm House" and they will work out the full address, try the side door, and find the right building even if you left out the street number. The **postal service** is strict: it delivers to exactly the address on the envelope, and anything incomplete comes back "address not found."

When you write an import, you are addressing an envelope. A bundler is the courier: it fills in extensions and finds \`index\` files. Node.js running ES modules is the postal service: \`./util\` means a file literally called \`util\`, and there is none.

TypeScript cannot deliver anything itself; it only *predicts* whether delivery will work. \`moduleResolution\` tells it which service to predict for. Pick the courier's rules for code the postal service delivers, and tsc says "fine" while the program crashes.

📌 **Interview term: module resolution** — the algorithm that maps an import specifier such as \`"./util"\` or \`"react"\` to a file. TypeScript's \`moduleResolution\` option chooses which runtime or tool's algorithm the checker imitates.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What loads the compiled code: a bundler, Node, Bun, or a browser directly? | The setting must imitate that loader |
| Is this an app or a published library? | A library's consumers may use Node directly, so it has to meet Node rules |
| Is the package \`"type": "module"\` or CommonJS? | Under \`nodenext\` it decides the format of every \`.ts\` file |
| Does the code use \`require\` or \`import x = require()\`? | \`bundler\` in 5.4 needs ESM \`module\` output or \`preserve\` |

## 3. The Same Project Under Both Settings

The scratch project has \`"type": "module"\` in \`package.json\`, two local modules and a dual package in \`node_modules\`:

~~~ts
// src/util.ts       export const twice = (n: number) => n * 2;
// src/lib/index.ts  export const name = "lib";
// node_modules/dual/package.json
//   "exports": { ".": {
//     "import":  { "types": "./esm/index.d.ts", "default": "./esm/index.js" },
//     "require": { "types": "./cjs/index.d.ts", "default": "./cjs/index.js" } } }

// src/main.ts
import { twice } from "./util";
import { name } from "./lib";
import { flavor } from "dual";
~~~

The two tsconfigs differ only in \`module\` and \`moduleResolution\` (\`ESNext\` + \`Bundler\`, and \`NodeNext\` + \`NodeNext\`).

**\`bundler\`: no errors.** \`./util\` found \`util.ts\` by trying extensions, and \`./lib\` found \`lib/index.ts\`.

**\`nodenext\`: two errors.**

~~~text
src/main.ts(1,23): error TS2835: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Did you mean './util.js'?
src/main.ts(2,22): error TS2834: Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.
~~~

**And the run-time proof.** The \`bundler\` build emitted the imports unchanged (\`import { twice } from "./util";\`), and running it with Node 22 failed:

~~~text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/work/p3/dist-bundler/util' imported from /work/p3/dist-bundler/main.js
~~~

(paths shortened). After changing the imports to \`"./util.js"\` and \`"./lib/index.js"\`, the \`nodenext\` build compiled and Node printed \`42 lib esm\`. Note that you write \`.js\` even though the file on disk is \`util.ts\`: the specifier names the file that will exist **at run time**, and tsc maps it back to the \`.ts\` source.

📌 **Interview term: module specifier** — the string after \`from\` in an import. tsc never rewrites relative specifiers when it emits JavaScript (it emitted \`"./util"\` exactly as written), which is why the source must already contain what the runtime needs.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="The specifier dot slash util resolves under bundler by probing extensions, and fails in Node ESM which needs dot slash util dot js">
  <rect class="d-box-accent" x="250" y="20" width="180" height="60" rx="10"/>
  <text class="d-text" x="340" y="56" text-anchor="middle">import ./util</text>
  <rect class="d-box" x="30" y="150" width="250" height="80" rx="10"/>
  <text class="d-text" x="155" y="184" text-anchor="middle">bundler</text>
  <text class="d-sub" x="155" y="208" text-anchor="middle">tries util.ts, util/index.ts</text>
  <rect class="d-box-muted" x="400" y="150" width="250" height="80" rx="10"/>
  <text class="d-text" x="525" y="184" text-anchor="middle">nodenext, ESM file</text>
  <text class="d-sub" x="525" y="208" text-anchor="middle">TS2835: write ./util.js</text>
  <path class="d-edge" d="M 300 84 L 190 146"/>
  <path class="d-edge-accent" d="M 380 84 L 490 146"/>
</svg>

\`bundler\` guesses the way a bundler does; \`nodenext\` in an ESM file refuses to guess, because Node will not.

## 4. ESM or CommonJS? Only \`nodenext\` Asks

📌 **Interview term: module format detection** — under \`nodenext\`, each file is ESM or CommonJS, decided the way Node decides: \`.mts\` is ESM, \`.cts\` is CommonJS, and a \`.ts\` file follows the nearest \`package.json\` \`"type"\` field (\`"module"\` means ESM, absent means CommonJS).

That format changes two things:

- **Extension rules.** In a package without \`"type": "module"\`, the same extensionless imports compiled under \`nodenext\`, were emitted as \`require("./util")\` and \`require("./lib")\`, and ran (\`42 lib cjs\`), because \`require\` still probes extensions and \`index\` files.
- **Export conditions.** 📌 **Interview term: conditional exports** — the \`exports\` map in a package's \`package.json\` can point to different files for different conditions such as \`import\`, \`require\` and \`types\`. Under \`nodenext\`, an ESM file resolves with \`import\`, a CommonJS file with \`require\`. A \`legacy.cts\` file in the ESM project got \`cjs/index.d.ts\` (and printed \`cts sees cjs\` at run time), while \`main.ts\` got \`esm/index.d.ts\`.

Under \`bundler\`, there is no per-file format: it always uses the \`import\` and \`types\` conditions. The same \`legacy.cts\` under \`bundler\` saw the ESM types, which surfaced as \`error TS2322: Type '"esm"' is not assignable to type '"cjs"'.\` on the line that expected the CommonJS flavour.

## 5. Pairing Rules tsc Enforces

These came from tsc 5.4.5 with mismatched settings:

~~~text
error TS5095: Option 'bundler' can only be used when 'module' is set to 'preserve' or to 'es2015' or later.
error TS5109: Option 'moduleResolution' must be set to 'NodeNext' (or left unspecified) when option 'module' is set to 'NodeNext'.
error TS5110: Option 'module' must be set to 'NodeNext' when option 'moduleResolution' is set to 'NodeNext'.
~~~

So the real choice is between two pairs: \`module: "nodenext"\` with \`moduleResolution: "nodenext"\` (which is also the implied resolution: \`--showConfig\` printed it), or \`module: "esnext"\` / \`"preserve"\` with \`moduleResolution: "bundler"\`. \`module: "preserve"\` (TypeScript 5.4) keeps \`import x = require()\` as written and implies \`bundler\` resolution ([TypeScript 5.4 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4-rc/)).

Two newer facts, not run here: the TypeScript 6.0 RC announcement deprecates \`moduleResolution: "node"\` (node10) and now allows \`bundler\` with \`module: "commonjs"\`, which 5.4.5 rejects with TS5095 above ([TypeScript 6.0 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0-rc/)).

## 6. Choosing

| What runs your code | Pick | Why |
| :--- | :--- | :--- |
| Vite, webpack, esbuild, Next.js app | \`bundler\` + \`module: "esnext"\` or \`"preserve"\` | Matches the bundler: extensionless imports, \`index\` files |
| Node.js directly (server, CLI, scripts) | \`nodenext\` | Only it predicts Node ESM rules and the ESM/CJS split |
| A library published to npm | \`nodenext\` | Consumers may load it with plain Node; \`.js\` specifiers also resolve under \`bundler\` |
| Tests run by a bundler-based runner | Usually the same as the app | The runner resolves like the bundler |

The asymmetry is the key insight: code written for \`nodenext\` (full \`.js\` extensions) also resolved under \`bundler\` in example 1 (\`./util.js from esm\` gives \`src/util.ts\` under both), but code written for \`bundler\` failed in Node. When in doubt, the stricter setting is the safer one.

| | \`bundler\` | \`nodenext\` |
| :--- | :--- | :--- |
| \`"./util"\` from an ESM file | Resolves | TS2835 |
| \`"./lib"\` (directory) | Resolves to \`lib/index.ts\` | TS2834 in ESM, resolves in CommonJS |
| \`"./util.js"\` | Resolves to \`util.ts\` | Resolves to \`util.ts\` |
| \`exports\` conditions | \`import\`, \`types\` | \`import\` or \`require\`, plus \`types\`, \`node\` |
| Per-file ESM/CJS format | No | Yes, from extension and \`"type"\` |
| Required \`module\` | \`preserve\` or ES2015+ | \`nodenext\` |

## 7. Verified: Running the Code

The example below the answer passes \`tsc --strict\` on TypeScript 5.4.5 and was run as the page runs it. It models both resolvers on the scratch project; every line matches what tsc 5.4.5 reported (or, for the package lines, which \`.d.ts\` it picked):

~~~text
-- moduleResolution: bundler
  ./util from esm            src/util.ts
  ./lib from esm             src/lib/index.ts
  ./util.js from esm         src/util.ts
  ./lib/index.js from esm    src/lib/index.ts
  ./util from cjs            src/util.ts
  dual from esm              esm/index.d.ts (condition import)
  dual from cjs              esm/index.d.ts (condition import)
-- moduleResolution: nodenext
  ./util from esm            TS2835 (did you mean .js?)
  ./lib from esm             TS2834 (add an extension)
  ./util.js from esm         src/util.ts
  ./lib/index.js from esm    src/lib/index.ts
  ./util from cjs            src/util.ts
  dual from esm              esm/index.d.ts (condition import)
  dual from cjs              cjs/index.d.ts (condition require)
~~~

The compiler errors, emitted files and Node run results in sections 3 to 5 come from separate tsc 5.4.5 and Node 22 runs on the scratch projects.

## Common Pitfalls

- **Using \`bundler\` for code Node runs directly.** tsc is happy, Node throws \`ERR_MODULE_NOT_FOUND\` for \`./util\`.
- **Writing \`./util.ts\` or dropping the extension under \`nodenext\`.** The specifier must be the run-time file, \`./util.js\`. (Writing \`.ts\` is a separate opt-in, see [allowImportingTsExtensions](/interview-question/how-does-allowimportingtsextensions-work-with-moduleresolution-bundler-and-ts-im).)
- **Forgetting \`"type": "module"\`.** Under \`nodenext\` every \`.ts\` file in a package without it is CommonJS and is emitted with \`require\`.
- **Mixing pairs.** \`module: "nodenext"\` with \`moduleResolution: "bundler"\` is TS5095 and TS5109; pick one pair.
- **Assuming \`bundler\` reads \`require\` conditions.** It always uses \`import\`, so a \`.cts\` file saw the ESM types.
- **Expecting \`paths\` or bundler aliases to fix Node.** They only change resolution for tsc or the bundler, not for Node at run time.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moduleResolution</code> decides how tsc maps an import string to a file. It should imitate whatever loads the code at run time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. bundler:</strong> <span style="color:#f0e2c8;">Models Vite, webpack and esbuild: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"./util"</code> and directory <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index</code> files resolve, and package <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exports</code> use the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types</code> conditions. Since <strong style="color:#ffca28;">5.0</strong>, paired with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">esnext</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">preserve</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. nodenext:</strong> <span style="color:#f0e2c8;">Models Node: each file is ESM or CommonJS from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.mts</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.cts</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"type"</code>. ESM imports need the run-time extension, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"./util.js"</code>, or tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2835</code>. Since <strong style="color:#ffca28;">4.7</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Failure mode:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bundler</code> on code Node runs, tsc passes and Node throws <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ERR_MODULE_NOT_FOUND</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodenext</code> you get the error at compile time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Choice:</strong> <span style="color:#f0e2c8;">Bundled apps use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bundler</code>. Node services, CLIs and published libraries use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodenext</code>. Code valid under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodenext</code> also resolves under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bundler</code>, so the stricter one is the safe default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.js</code> when the file is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.ts</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The specifier names the file that exists at run time. tsc does not rewrite relative specifiers, and it maps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">./util.js</code> back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">util.ts</code> for type checking.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">moduleResolution: "nodenext"</code> with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">module: "esnext"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. tsc 5.4.5 reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS5110</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodenext</code> resolution requires <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module: "nodenext"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nodenext</code> decide whether a file is ESM?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Like Node: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.mts</code> is ESM, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.cts</code> is CommonJS, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ts</code> follows the nearest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">package.json</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"type"</code> field.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">module: "preserve"</code> add?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Added in <strong style="color:#ffca28;">5.4</strong>, it emits imports and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import x = require()</code> as written and implies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bundler</code> resolution, which models bundlers and Bun more closely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you see which file tsc actually resolved?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --traceResolution</code>. It prints the mode, the conditions and every file tried.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Module resolution | Mapping an import specifier to a file |
| Module specifier | The string after \`from\`; tsc does not rewrite relative ones |
| Module format detection | \`nodenext\` deciding ESM or CommonJS per file |
| Conditional exports | \`exports\` entries chosen by conditions such as \`import\`, \`require\`, \`types\` |
| \`TS2835\` / \`TS2834\` | Missing extension on a relative ESM import under \`node16\`/\`nodenext\` |

**Conclusion:** Pick the resolution mode that imitates what really loads your code. A bundled app gets \`bundler\`, which accepts what the bundler accepts; anything Node loads directly, including published libraries, gets \`nodenext\`, which forces the run-time \`.js\` extension and tracks ESM versus CommonJS per file. The scratch run shows why the choice matters: the same import that \`bundler\` accepted crashed in Node, while \`nodenext\` turned the crash into TS2835 at compile time. When something resolves to the wrong file, [trace it with \`--traceResolution\` and \`--explainFiles\`](/interview-question/how-do-you-debug-type-resolution-and-esm-cjs-mismatches-with-traceresolution-and).`,
    examples: [
      {
        label: `A model of both resolvers on the same project`,
        code: `// A small model of the two resolvers, for the scratch projects in the answer.
// Each result below matches what tsc 5.4.5 really reported for that project.
type Resolution = "bundler" | "nodenext";
type Format = "esm" | "cjs"; // nodenext: decided by .mts/.cts or package.json "type"

const files = new Set(["src/util.ts", "src/lib/index.ts"]);
// exports of the "dual" package: condition -> types file
const dualExports: [string, string][] = [["import", "esm/index.d.ts"], ["require", "cjs/index.d.ts"]];

function conditions(mode: Resolution, importer: Format): string[] {
  if (mode === "bundler") return ["import", "types"]; // always the import condition
  return importer === "esm" ? ["import", "types", "node"] : ["require", "types", "node"];
}

function resolveRelative(spec: string, mode: Resolution, importer: Format): string {
  const base = "src/" + spec.replace(/^\\.\\//, "");
  const strict = mode === "nodenext" && importer === "esm"; // Node ESM: no guessing
  if (base.endsWith(".js")) {
    const ts = base.replace(/\\.js$/, ".ts"); // a .js specifier finds the .ts source
    return files.has(ts) ? ts : "not found";
  }
  if (strict) return files.has(base + ".ts") ? "TS2835 (did you mean .js?)" : "TS2834 (add an extension)";
  if (files.has(base + ".ts")) return base + ".ts"; // extension probing
  if (files.has(base + "/index.ts")) return base + "/index.ts"; // directory index
  return "not found";
}

function resolvePackage(mode: Resolution, importer: Format): string {
  const conds = conditions(mode, importer);
  const hit = dualExports.find(([c]) => conds.includes(c));
  return hit ? \`\${hit[1]} (condition \${hit[0]})\` : "no match";
}

// The importing file is ESM ("type": "module"). In a CommonJS package nodenext
// keeps require-style probing, so "./util" and "./lib" would resolve there.
const cases: [string, Format][] = [["./util", "esm"], ["./lib", "esm"], ["./util.js", "esm"], ["./lib/index.js", "esm"], ["./util", "cjs"]];
for (const mode of ["bundler", "nodenext"] as const) {
  console.log(\`-- moduleResolution: \${mode}\`);
  for (const [spec, fmt] of cases) console.log(\`  \${(spec + " from " + fmt).padEnd(26)} \${resolveRelative(spec, mode, fmt)}\`);
  console.log(\`  \${"dual from esm".padEnd(26)} \${resolvePackage(mode, "esm")}\`);
  console.log(\`  \${"dual from cjs".padEnd(26)} \${resolvePackage(mode, "cjs")}\`);
}`,
      },
    ],
  },
  {
    title: `How does \`allowImportingTsExtensions\` work with \`moduleResolution: "bundler"\` and \`.ts\` imports?`,
    difficulty: "medium",
    seoDescription: `allowImportingTsExtensions lets you import ./file.ts when tsc emits no JavaScript; TS5097, TS5096, .d.ts output, Node type stripping and the 5.7 rewrite.`,
    description: `**Question presented to candidate:**
"Some projects write \`import { twice } from \\"./math.ts\\"\` with the \`.ts\` extension. What does \`allowImportingTsExtensions\` actually allow, why does tsc insist on \`noEmit\` or \`emitDeclarationOnly\` with it, and when is this a good idea?"

**What a strong answer should cover:**
- Without the flag, a value import ending in \`.ts\`, \`.mts\` or \`.cts\` is TS5097; with it, tsc accepts the path and type-checks against the source file
- tsc never rewrites import paths (before 5.7), so emitted JavaScript would keep \`"./math.ts"\` and fail to load; that is why the flag requires \`noEmit\` or \`emitDeclarationOnly\` (TS5096)
- It fits setups where something else runs or builds the \`.ts\` files: Vite or esbuild with \`moduleResolution: "bundler"\`, Bun, Deno, and Node.js type stripping
- \`import type\` with a \`.ts\` path is allowed even without the flag; importing a \`.d.ts\` path as a value is TS2846
- Emitted \`.d.ts\` files keep the \`.ts\` specifiers; \`.js\` specifiers still work alongside
- TypeScript 5.7 added \`rewriteRelativeImportExtensions\`, which rewrites \`./math.ts\` to \`./math.js\` in the output, for projects that do want tsc to emit JavaScript

**Code / implementation expected:** Optional — a tsconfig with the flag and \`noEmit\`, and an import that needs it.`,
    answer: `**Target Audience:** Developers using Vite, Bun, Deno or Node's built-in TypeScript support who want to write the real file name in imports, and anyone puzzled by TS5096.
**Difficulty:** Medium
**TypeScript version:** Compiler messages and output below came from TypeScript 5.4.5 and Node.js 22.22 on a scratch project. \`allowImportingTsExtensions\` arrived in TypeScript 5.0 alongside \`moduleResolution: "bundler"\` ([TypeScript 5.0 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-rc/)). \`rewriteRelativeImportExtensions\` is TypeScript 5.7 and was **not run here** ([Announcing TypeScript 5.7](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/)).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Results come from real \`tsc\` and \`node\` runs, and the **Verified** section quotes the example program's output in full.

## 1. Why This Even Matters — A Story First

A restaurant kitchen has two kinds of orders. Some go to the in-house chefs, who cook from the raw recipe card. Others are sent to an outside caterer, who only accepts dishes already cooked and boxed.

If the menu says "see recipe card 12" and the order goes to the chefs, perfect. If the same order goes to the caterer, they get a recipe card instead of food and the order fails.

An import of \`"./math.ts"\` points at the recipe card (the TypeScript source). That is fine when the thing running your code cooks TypeScript itself: Vite, Bun, Deno, Node's type stripping. It is broken when tsc turns everything into \`.js\` files, because the output folder has only cooked food and no \`math.ts\`. \`allowImportingTsExtensions\` is tsc saying "I will accept recipe-card orders, as long as I am not the one boxing the food."

📌 **Interview term: \`allowImportingTsExtensions\`** — a compiler option that allows relative import paths ending in \`.ts\`, \`.mts\` or \`.cts\` (and \`.tsx\`). It only changes what the checker accepts; it never changes the emitted import paths.

## 2. The Three States, Verified

The project: \`src/math.ts\` exports \`twice\`, and \`src/main.ts\` does \`import { twice } from "./math.ts";\`.

**No flag:**

~~~text
src/main.ts(1,23): error TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
~~~

The same check with \`.mts\` and \`.tsx\` paths says \`can only end with a '.mts' extension\` and \`a '.tsx' extension\`, and the flag removed the \`.tsx\` error too. This was identical under \`moduleResolution\` \`Bundler\` and \`NodeNext\`; in 5.4.5 the flag is not tied to \`bundler\`, and setting it with \`NodeNext\` or even \`Node10\` (plus \`noEmit\`) gave no error.

**Flag on, tsc still emitting JavaScript:**

~~~text
tsconfig.json(1,160): error TS5096: Option 'allowImportingTsExtensions' can only be used when either 'noEmit' or 'emitDeclarationOnly' is set.
~~~

That error is protecting you. tsc still wrote \`dist/main.js\` (the error does not stop emit without \`noEmitOnError\`), and it contained \`import { twice } from "./math.ts";\` unchanged. Node then failed with \`ERR_MODULE_NOT_FOUND\`, because \`dist/\` holds \`math.js\`, not \`math.ts\`.

**Flag on with \`noEmit\` (or \`emitDeclarationOnly\`):** no errors. tsc type-checks against \`math.ts\` and leaves running the code to another tool.

📌 **Interview term: \`noEmit\` / \`emitDeclarationOnly\`** — \`noEmit\` makes tsc a pure type checker (no files written); \`emitDeclarationOnly\` writes only \`.d.ts\` files. In both cases tsc writes no JavaScript whose import paths could be wrong.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="tsc type checks the ts import, while another tool such as Vite or Node type stripping runs the ts file directly">
  <rect class="d-box-accent" x="250" y="20" width="180" height="70" rx="10"/>
  <text class="d-text" x="340" y="52" text-anchor="middle">main.ts</text>
  <text class="d-sub" x="340" y="74" text-anchor="middle">import ./math.ts</text>
  <rect class="d-box" x="40" y="160" width="240" height="70" rx="10"/>
  <text class="d-text" x="160" y="192" text-anchor="middle">tsc with noEmit</text>
  <text class="d-sub" x="160" y="214" text-anchor="middle">checks types only</text>
  <rect class="d-box" x="400" y="160" width="240" height="70" rx="10"/>
  <text class="d-text" x="520" y="192" text-anchor="middle">Vite, Bun, Node</text>
  <text class="d-sub" x="520" y="214" text-anchor="middle">runs the ts file</text>
  <path class="d-edge-dashed" d="M 300 94 L 190 156"/>
  <path class="d-edge-accent" d="M 380 94 L 490 156"/>
</svg>

The work is split: tsc checks, another tool runs, and nobody needs the path rewritten.

## 3. Where \`.ts\` Imports Make Sense

- **Bundlers with \`moduleResolution: "bundler"\`.** A bundler such as Vite or esbuild reads your source files itself, so \`./math.ts\` names a file it really has (no bundler was run for this page). Most bundled apps simply leave out the extension; the flag is for teams that prefer the explicit file name.
- **Runtimes that execute TypeScript.** Bun and Deno are built to run \`.ts\` files directly (not run here). Node.js can too: on the Node 22.22 used here, \`node src/main.ts\` ran with no flag and printed \`twice(21) = 42\`, following the \`./math.ts\` import. Node strips the types without checking them and does not read \`tsconfig.json\` ([Node.js TypeScript docs](https://nodejs.org/api/typescript.html)). Node 23.6 was the release that unflagged it ([Announcing TypeScript 5.8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8)).
- **The usual Node-native tsconfig.** For that workflow, \`noEmit\` plus \`allowImportingTsExtensions\` lets tsc check the exact files Node runs. TypeScript 5.8 added \`erasableSyntaxOnly\`, which reports syntax Node cannot strip, such as enums and parameter properties (same announcement; not run here).

📌 **Interview term: type stripping** — running TypeScript by deleting the type syntax and executing what is left, with no type checking and no other transformation. It only works for code whose TypeScript-only parts can be erased.

## 4. Details That Come Up

- **Type-only imports never needed the flag.** \`import type { twice as T } from "./math.ts";\` compiled without it under \`bundler\`, because the line is erased anyway.
- **\`.d.ts\` paths are different.** \`import { x } from "./decl.d.ts"\` gave \`error TS2846: A declaration file cannot be imported without 'import type'. Did you mean to import an implementation file './decl.js' instead?\`
- **\`.js\` specifiers keep working.** \`import { twice } from "./math.js"\` resolved to \`math.ts\` in the same project, flag or not. You can mix styles, but a codebase should pick one.
- **Declaration output keeps \`.ts\`.** With \`emitDeclarationOnly\`, a barrel \`export * from "./math.ts";\` was written into \`barrel.d.ts\` unchanged. A consumer project (without the flag, under both \`Bundler\` and \`NodeNext\`) still resolved it: the trace showed \`File name '/work/p4c/lib/math.ts' has a '.ts' extension - stripping it.\` and then \`File '/work/p4c/lib/math.d.ts' exists - use it as a name resolution result.\` The types work; the JavaScript next to them is a separate question.

| Setup | \`import "./math.ts"\` | JavaScript tsc writes |
| :--- | :--- | :--- |
| No flag | TS5097 | Not reached |
| Flag + normal emit | TS5096 on the config | \`"./math.ts"\`, broken at run time |
| Flag + \`noEmit\` | OK | None |
| Flag + \`emitDeclarationOnly\` | OK | None (\`.d.ts\` keep \`"./math.ts"\`) |
| 5.7+: \`rewriteRelativeImportExtensions\` | OK | \`"./math.js"\` (not run here) |

## 5. When You Want tsc to Emit Anyway: \`rewriteRelativeImportExtensions\`

📌 **Interview term: \`rewriteRelativeImportExtensions\`** — a TypeScript 5.7 option that rewrites relative import paths ending in \`.ts\`, \`.tsx\`, \`.mts\` or \`.cts\` to their JavaScript equivalents in the output, so the same source can run under type stripping *and* be compiled to \`.js\` files ([TypeScript 5.7 RC announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7-rc/)). Extensionless and package imports are left alone.

Not run here, needs TypeScript 5.7+:

~~~ts
// tsconfig.json
{
  "compilerOptions": {
    "module": "nodenext",
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "outDir": "dist"
  }
}
// src/main.ts: import { twice } from "./math.ts";
// dist/main.js is expected to contain: import { twice } from "./math.js";
~~~

A TypeScript pull request ([#62557](https://github.com/microsoft/TypeScript/pull/62557)) proposes listing \`rewriteRelativeImportExtensions\` in the TS5096 message as a third way to satisfy that rule, whose author notes that the combination already works; I could not check which release that message change shipped in, or run it. The example below models these rules side by side.

## 6. Verified: Running the Code

The example below the answer passes \`tsc --strict\` on TypeScript 5.4.5 and was run as the page runs it. Its diagnostics column reproduces what tsc 5.4.5 reported for each import (TS5097, TS5096, TS2846); the last block applies the 5.7 rewrite rule as documented, which 5.4.5 cannot run:

~~~text
-- no flag
  import "./math.ts"           TS5097 needs allowImportingTsExtensions  "./math.ts"
  import type "./math.ts"      ok                                       (erased)
  import "./math.js"           ok                                       "./math.js"
  import "./decl.d.ts"         TS2846 a .d.ts needs import type         "./decl.d.ts"
  import "./worker.mts"        TS5097 needs allowImportingTsExtensions  "./worker.mts"
-- flag + emit  config: TS5096 needs noEmit or emitDeclarationOnly
  import "./math.ts"           ok                                       "./math.ts"
  import type "./math.ts"      ok                                       (erased)
  import "./math.js"           ok                                       "./math.js"
  import "./decl.d.ts"         TS2846 a .d.ts needs import type         "./decl.d.ts"
  import "./worker.mts"        ok                                       "./worker.mts"
-- flag + noEmit
  import "./math.ts"           ok                                       (no JS)
  import type "./math.ts"      ok                                       (no JS)
  import "./math.js"           ok                                       (no JS)
  import "./decl.d.ts"         TS2846 a .d.ts needs import type         (no JS)
  import "./worker.mts"        ok                                       (no JS)
-- flag + 5.7 rewrite
  import "./math.ts"           ok                                       "./math.js"
  import type "./math.ts"      ok                                       (erased)
  import "./math.js"           ok                                       "./math.js"
  import "./decl.d.ts"         TS2846 a .d.ts needs import type         "./decl.d.ts"
  import "./worker.mts"        ok                                       "./worker.mjs"
~~~

The compiler messages, emitted files, \`.d.ts\` output, consumer trace and the \`node src/main.ts\` run in sections 2 to 4 come from separate tsc 5.4.5 and Node 22.22 runs on the scratch project.

## Common Pitfalls

- **Turning the flag on in a project that emits JavaScript.** TS5096 is the warning; ignoring it ships \`"./math.ts"\` imports that crash.
- **Expecting tsc to rewrite paths.** Before 5.7 it never does. Either let another tool run the \`.ts\` files or use \`rewriteRelativeImportExtensions\`.
- **Publishing \`.d.ts\` files with \`.ts\` specifiers next to JavaScript that does not match.** Check what a consumer resolves before publishing.
- **Mixing \`.ts\`, \`.js\` and extensionless imports in one codebase.** All may compile; pick one convention and lint for it.
- **Assuming Node checks types.** Type stripping runs code with type errors; keep \`tsc --noEmit\` in CI.
- **Importing a \`.d.ts\` path as a value.** That is TS2846; import the implementation file or use \`import type\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it allows:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allowImportingTsExtensions</code> lets you write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import { twice } from "./math.ts"</code>. Without it, tsc reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS5097</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why the restriction:</strong> <span style="color:#f0e2c8;">tsc does not rewrite import paths, so emitted JavaScript would still say <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"./math.ts"</code> and fail to load. Hence <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS5096</code>: the flag needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noEmit</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emitDeclarationOnly</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When it fits:</strong> <span style="color:#f0e2c8;">When another tool runs or bundles the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ts</code> files: Vite or esbuild with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">moduleResolution: "bundler"</code>, Bun, Deno, or Node type stripping. tsc becomes the type checker only.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Details:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import type</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ts</code> never needed the flag, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> path as a value is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS2846</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.js</code> specifiers still work, and emitted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.ts</code> files keep the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ts</code> paths.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Emitting anyway:</strong> <span style="color:#f0e2c8;">TypeScript <strong style="color:#ffca28;">5.7</strong> added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rewriteRelativeImportExtensions</code>, which rewrites <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">./math.ts</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">./math.js</code> in output, for code that runs under type stripping and is also compiled.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the flag only for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">moduleResolution: "bundler"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In tsc 5.4.5 it was accepted with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NodeNext</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Node10</code> too, as long as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">noEmit</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">emitDeclarationOnly</code> was set. It is just most common with bundlers and TypeScript-running runtimes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import type { X } from "./x.ts"</code> work without the flag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The whole line is erased, so there is no run-time path to get wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does Node need to run <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.ts</code> imports?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A version with type stripping (the Node 22.22 used here ran <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">node src/main.ts</code> with no flag) and code made only of erasable syntax. It does not type-check and ignores tsconfig.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just always write <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.js</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That works under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bundler</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodenext</code> with tsc emit. But a runtime that executes the source directly needs the real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.ts</code> file name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you put in CI?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --noEmit</code> with the flag, plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">erasableSyntaxOnly</code> on 5.8+ if Node strips the types.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`allowImportingTsExtensions\` | Accept relative imports ending in \`.ts\`, \`.mts\`, \`.cts\` |
| \`noEmit\` / \`emitDeclarationOnly\` | Write nothing / write only \`.d.ts\` files |
| Type stripping | Running TypeScript by erasing types, with no checking |
| \`rewriteRelativeImportExtensions\` | 5.7: rewrite \`.ts\` import paths to \`.js\` in output |
| \`TS5097\` / \`TS5096\` | \`.ts\` path without the flag / flag while emitting JavaScript |

**Conclusion:** \`allowImportingTsExtensions\` is a statement about who runs the code: tsc checks the \`.ts\` files and something else executes or bundles them, so the import can name the real source file. That is why it requires \`noEmit\` or \`emitDeclarationOnly\`: tsc does not rewrite paths, and an emitted \`"./math.ts"\` import breaks, as the scratch run showed. For projects that also need compiled JavaScript, TypeScript 5.7's \`rewriteRelativeImportExtensions\` closes the gap. How these imports resolve under each mode is in [\`bundler\` versus \`nodenext\`](/interview-question/when-should-you-use-moduleresolution-bundler-versus-nodenext).`,
    examples: [
      {
        label: `What tsc says and emits for .ts import paths`,
        code: `// A model of what tsc does with a relative import that ends in .ts.
// The diagnostics match tsc 5.4.5 runs; the rewrite column is the TypeScript 5.7
// rewriteRelativeImportExtensions rule, which 5.4.5 does not have.
interface Options {
  allowImportingTsExtensions?: boolean;
  noEmit?: boolean;
  emitDeclarationOnly?: boolean;
  rewriteRelativeImportExtensions?: boolean; // TypeScript 5.7+
}
interface ImportLine { spec: string; typeOnly: boolean }

const TS_EXT = /\\.(ts|mts|cts)$/;
const isDts = (s: string) => /\\.d\\.(ts|mts|cts)$/.test(s);

function configErrors(o: Options): string[] {
  const writesJs = !o.noEmit && !o.emitDeclarationOnly;
  if (o.allowImportingTsExtensions && writesJs && !o.rewriteRelativeImportExtensions) return ["TS5096 needs noEmit or emitDeclarationOnly"];
  return [];
}

function check(line: ImportLine, o: Options): string {
  if (isDts(line.spec) && !line.typeOnly) return "TS2846 a .d.ts needs import type";
  if (TS_EXT.test(line.spec) && !line.typeOnly && !o.allowImportingTsExtensions)
    return "TS5097 needs allowImportingTsExtensions";
  return "ok";
}

// 5.7 rule: relative paths only; .ts -> .js, .mts -> .mjs, .cts -> .cjs.
function emitted(spec: string, o: Options): string {
  const relative = spec.startsWith("./") || spec.startsWith("../");
  if (!o.rewriteRelativeImportExtensions || !relative || isDts(spec)) return spec;
  return spec.replace(/\\.ts$/, ".js").replace(/\\.mts$/, ".mjs").replace(/\\.cts$/, ".cjs");
}

const lines: ImportLine[] = [
  { spec: "./math.ts", typeOnly: false },
  { spec: "./math.ts", typeOnly: true },
  { spec: "./math.js", typeOnly: false },
  { spec: "./decl.d.ts", typeOnly: false },
  { spec: "./worker.mts", typeOnly: false },
];
const configs: [string, Options][] = [
  ["no flag", {}],
  ["flag + emit", { allowImportingTsExtensions: true }],
  ["flag + noEmit", { allowImportingTsExtensions: true, noEmit: true }],
  ["flag + 5.7 rewrite", { allowImportingTsExtensions: true, rewriteRelativeImportExtensions: true }],
];

for (const [name, o] of configs) {
  const errs = configErrors(o);
  console.log(\`-- \${name}\${errs.length ? "  config: " + errs.join(", ") : ""}\`);
  for (const l of lines) {
    const label = \`\${l.typeOnly ? "import type " : "import "}"\${l.spec}"\`;
    const js = o.noEmit ? "(no JS)" : l.typeOnly ? "(erased)" : \`"\${emitted(l.spec, o)}"\`;
    console.log(\`  \${label.padEnd(28)} \${check(l, o).padEnd(40)} \${js}\`);
  }
}`,
      },
    ],
  },
  {
    title: `How do you debug type-resolution and ESM/CJS mismatches with \`traceResolution\` and \`explain\`?`,
    difficulty: "medium",
    seoDescription: `Debugging module resolution with tsc --traceResolution and --explainFiles: read CJS vs ESM mode, exports conditions, fallbacks and the fix for TS1479.`,
    description: `**Question presented to candidate:**
"A teammate gets TS1479 importing an ESM-only package, and in another project the types compile but Node crashes with 'does not provide an export named default'. How would you use \`tsc --traceResolution\` and \`--explainFiles\` to find out what TypeScript actually resolved, and why?"

**What a strong answer should cover:**
- \`--traceResolution\` prints every module lookup: the mode (ESM or CJS), the conditions used (\`import\`/\`require\`, \`types\`, \`node\`), each \`exports\` condition matched or failed, every file tried and the final result
- \`--explainFiles\` prints why each file is in the program (include pattern, which import pulled it in) and, under \`node16\`/\`nodenext\`, whether each file is ESM or CommonJS and which \`package.json\` field decided it
- Reading TS1479: the importing file is CommonJS (no \`"type": "module"\`), the target is ESM; fixes are \`"type": "module"\`, a \`.mts\` file or a dynamic \`import()\`
- Reading a fallback: when the matched condition has no declaration file, tsc tries later conditions, so it may type-check against a different file than Node loads (masquerading types)
- Practical workflow: redirect the output to a file and grep for the module name, \`--listFilesOnly\` and \`--showConfig\` for quick checks, and the attw tool for published packages

**Clarifying questions expected:**
- What is the \`moduleResolution\` setting, and is the importing package ESM or CommonJS?
- Is the problem a compile error, or code that compiles and fails at run time?

**Code / implementation expected:** Optional — the commands, and how to read the relevant trace lines.`,
    answer: `**Target Audience:** Developers fighting "Cannot find module", TS1479 or types that compile but crash at run time, and anyone asked how they would debug module resolution.
**Difficulty:** Medium
**TypeScript version:** Every trace, explanation and error below came from TypeScript 5.4.5 and Node.js 22 on scratch projects (paths shortened to \`/work/...\`). \`--explainFiles\` arrived in TypeScript 4.2 ([Visual Studio Magazine on TypeScript 4.2](https://visualstudiomagazine.com/articles/2021/02/24/typescript-4-2.aspx)). There is no \`--explain\` flag: tsc 5.4.5 answered \`error TS5023: Unknown compiler option '--explain'.\`, so "explain" here means \`--explainFiles\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. The trace lines are copied from real \`tsc\` runs, and the **Verified** section quotes the example program's output in full.

## 1. Why This Even Matters — A Story First

Your parcel arrived at the wrong address. You could guess why, or you could ask the courier for the **route log**: "08:02 tried Elm Street, no such number; 08:05 tried Elm Avenue, delivered." Two lines of the log usually tell you everything: which rules the driver followed and the moment the route went somewhere you did not expect.

TypeScript keeps exactly such a log for every import, but only prints it when asked. \`--traceResolution\` is the route log; \`--explainFiles\` is the delivery manifest, listing every file that ended up in the program and why it is there.

📌 **Interview term: \`--traceResolution\`** — a tsc flag that prints, for every import, the resolution mode and conditions, each \`package.json\` and file it looked at, and the result.

📌 **Interview term: \`--explainFiles\`** — a tsc flag that lists every file in the program with the reason it was included and, under \`node16\`/\`nodenext\`, whether it is treated as ESM or CommonJS and why.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is \`moduleResolution\`? | \`bundler\` and \`nodenext\` follow different rules, see [bundler vs nodenext](/interview-question/when-should-you-use-moduleresolution-bundler-versus-nodenext) |
| Is the importing package \`"type": "module"\`? | Decides CJS or ESM mode under \`nodenext\` |
| Compile error, or run-time crash? | A crash after a clean compile means tsc checked a different file than Node loads |

## 3. Case 1: TS1479 Importing an ESM-Only Package

A project with \`module\`/\`moduleResolution\` \`NodeNext\` and a \`package.json\` with no \`"type"\` field imports \`esm-only\`, a package whose own \`package.json\` has \`"type": "module"\`:

~~~text
src/index.ts(1,22): error TS1479: The current file is a CommonJS module whose imports will produce 'require' calls; however, the referenced file is an ECMAScript module and cannot be imported with 'require'. Consider writing a dynamic 'import("esm-only")' call instead.
  To convert this file to an ECMAScript module, change its file extension to '.mts', or add the field \`"type": "module"\` to '/work/p5/package.json'.
~~~

**Step 1, \`--explainFiles\`:** why does tsc think \`src/index.ts\` is CommonJS?

~~~text
node_modules/esm-only/index.d.ts
  Imported via "esm-only" from file 'src/index.ts' with packageId 'esm-only/index.d.ts@2.0.0'
  File is ECMAScript module because 'node_modules/esm-only/package.json' has field "type" with value "module"
src/index.ts
  Matched by include pattern 'src' in 'tsconfig.json'
  File is CommonJS module because 'package.json' does not have field "type"
~~~

Each file says what it is and which \`package.json\` field decided it. The mismatch is plain: a CommonJS importer and an ESM target.

**Step 2, \`--traceResolution\`:** the first lines of that lookup confirm the mode:

~~~text
======== Resolving module 'esm-only' from '/work/p5/src/index.ts'. ========
Explicitly specified module resolution kind: 'NodeNext'.
Resolving in CJS mode with conditions 'require', 'types', 'node'.
~~~

**Fix:** after adding \`"type": "module"\` to the app's \`package.json\`, the error was gone, the trace said \`Resolving in ESM mode with conditions 'import', 'types', 'node'.\` and \`--explainFiles\` said \`File is ECMAScript module because 'package.json' has field "type" with value "module"\`. The other two fixes the message offers are renaming the file to \`.mts\`, or keeping CommonJS and loading the package with \`await import("esm-only")\`.

📌 **Interview term: resolution mode** — under \`node16\`/\`nodenext\`, whether an import is resolved the way \`require\` would (CJS mode, \`require\` condition) or the way \`import\` would (ESM mode, \`import\` condition). It follows the importing file's format.

## 4. Case 2: It Compiles, Then Crashes

Now the app is ESM, and it imports a package \`bad-order\` whose \`exports\` look like this:

~~~ts
"types": "./index.d.ts",
"exports": { ".": { "import": "./index.mjs", "require": "./index.cjs", "types": "./index.d.ts" } }
~~~

\`import pkg from "bad-order"; console.log(pkg.answer);\` compiled with no errors. Node 22 then crashed:

~~~text
SyntaxError: The requested module 'bad-order' does not provide an export named 'default'
~~~

The trace explains it (lines from the real run; lookup and cache lines left out):

~~~text
Resolving in ESM mode with conditions 'import', 'types', 'node'.
Matched 'exports' condition 'import'.
Using 'exports' subpath '.' with target './index.mjs'.
File name '/work/p5b/node_modules/bad-order/index.mjs' has a '.mjs' extension - stripping it.
File '/work/p5b/node_modules/bad-order/index.mts' does not exist.
File '/work/p5b/node_modules/bad-order/index.d.mts' does not exist.
Failed to resolve under condition 'import'.
Saw non-matching condition 'require'.
Matched 'exports' condition 'types'.
Using 'exports' subpath '.' with target './index.d.ts'.
Resolved under condition 'types'.
~~~

Read it top to bottom: the \`import\` condition matched, which is the file **Node** loads (\`index.mjs\`). tsc looked for its declaration file next to it (\`index.d.mts\`), found none, and **fell back** to the later \`types\` condition. \`--explainFiles\` then shows what that file means to tsc: \`File is CommonJS module because 'node_modules/bad-order/package.json' does not have field "type"\`. So tsc type-checked against CommonJS-shaped types (where a default import of \`module.exports\` is allowed) while Node ran an ES module with no default export.

📌 **Interview term: masquerading types** — declaration files whose module format (ESM or CJS) differs from the JavaScript the runtime actually loads, so the types allow imports that fail at run time. The attw tool reports these; see [What does arethetypeswrong (attw) detect?](/interview-question/what-does-arethetypeswrong-attw-detect-and-how-do-you-fix-false-esm-cjs-packages)

<svg class="iq-diagram" width="100%" viewBox="0 0 680 250" role="img" aria-label="Node loads index dot mjs under the import condition, while tsc falls back to index dot d dot ts under the types condition">
  <rect class="d-box-accent" x="250" y="20" width="180" height="70" rx="10"/>
  <text class="d-text" x="340" y="52" text-anchor="middle">import bad-order</text>
  <text class="d-sub" x="340" y="74" text-anchor="middle">from an ESM file</text>
  <rect class="d-box" x="40" y="160" width="240" height="70" rx="10"/>
  <text class="d-text" x="160" y="192" text-anchor="middle">Node loads</text>
  <text class="d-sub" x="160" y="214" text-anchor="middle">index.mjs, ESM</text>
  <rect class="d-box-muted" x="400" y="160" width="240" height="70" rx="10"/>
  <text class="d-text" x="520" y="192" text-anchor="middle">tsc checks</text>
  <text class="d-sub" x="520" y="214" text-anchor="middle">index.d.ts, CommonJS</text>
  <path class="d-edge" d="M 300 94 L 190 156"/>
  <path class="d-edge-dashed" d="M 380 94 L 490 156"/>
</svg>

Two different files for one import: the trace is the only place that shows the split.

**Fix (in the package):** give each condition its own types, in the right format:

~~~ts
"exports": { ".": {
  "import":  { "types": "./index.d.mts", "default": "./index.mjs" },
  "require": { "types": "./index.d.ts",  "default": "./index.cjs" } } }
~~~

With that and an \`index.d.mts\` file, \`--explainFiles\` listed \`node_modules/bad-order/index.d.mts\`, and tsc now rejected the bad import at compile time instead of Node rejecting it at run time:

~~~text
src/index.ts(2,8): error TS1192: Module '"/work/p5b/node_modules/bad-order/index"' has no default export.
~~~

## 5. A Workflow That Scales

The trace is long. For a three-line file importing two packages, tsc 5.4.5 printed **2,400 lines** and 64 "Resolving module" blocks, most of them lookups for the default \`lib\` files. So:

~~~ts
// Save it once, then search it.
// tsc -p . --noEmit --traceResolution > trace.txt
// grep -n "Resolving module 'bad-order'" trace.txt      the start of the block
// grep -n "mode with conditions" trace.txt               CJS or ESM for each lookup
// grep -n "Failed to resolve under condition" trace.txt  fallbacks
// tsc -p . --noEmit --explainFiles > explain.txt         why each file is included
// tsc -p . --listFilesOnly                               just the file list
// tsc -p . --showConfig                                  the final options, with implied ones
~~~

What to look for, in order:

| Line in the output | Tells you |
| :--- | :--- |
| \`Resolving in CJS mode\` / \`ESM mode\` | The importing file format, and so \`require\` vs \`import\` |
| \`Matched 'exports' condition '...'\` | Which branch of the package's \`exports\` was used |
| \`Failed to resolve under condition\` | tsc fell back to a later condition: suspect masquerading types |
| \`successfully resolved to '...'\` | The file tsc actually type-checks against |
| \`File is CommonJS module because ...\` (explainFiles) | Which \`package.json\` field decided the format |
| \`Matched by include pattern\` / \`Imported via\` (explainFiles) | Why an unexpected file is in the program |

## 6. Verified: Running the Code

The example below the answer passes \`tsc --strict\` on TypeScript 5.4.5 and was run as the page runs it. It parses a real excerpt of the two traces above and prints, for each import, the mode, the conditions in the order tsc tried them, and the file it settled on:

~~~text
esm-only from src/index.ts
  mode:       CJS [require, types, node]
  conditions: types:matched
  types from: esm-only/index.d.ts
bad-order from src/index.ts
  mode:       ESM [import, types, node]
  conditions: import:matched -> import:failed -> require:skipped -> types:matched
  types from: bad-order/index.d.ts
imported from a CommonJS file: esm-only
types found only after a fallback: bad-order
~~~

The full traces, \`--explainFiles\` output, compiler errors and the Node crash quoted in sections 3 to 5 come from separate tsc 5.4.5 and Node 22 runs on the scratch projects.

## Common Pitfalls

- **Guessing instead of tracing.** The mode and the matched condition are printed; read them before changing settings.
- **Reading only the result line.** \`successfully resolved\` can hide a fallback; look for \`Failed to resolve under condition\` above it.
- **Silencing TS1479 by switching to \`bundler\` for code Node runs.** tsc then emits an ESM \`import\` into a package Node treats as CommonJS. Node 22 ran it only after reparsing, with a \`MODULE_TYPELESS_PACKAGE_JSON\` warning telling you to add \`"type": "module"\`. Fix the package type instead.
- **Searching an unsaved trace in the terminal.** Redirect to a file; thousands of lines is normal.
- **Putting \`types\` last in an \`exports\` object.** Conditions are read in order; a condition that matches first wins, and the types may come from a fallback.
- **Forgetting \`--explainFiles\` for "why is this file here".** Stray \`.d.ts\` files and duplicate copies of a package show up with their \`Imported via\` reason.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The tools:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --traceResolution</code> logs each import lookup; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsc --explainFiles</code> lists every file in the program, why it is included and whether it is ESM or CommonJS. Save both to files and grep.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. First line to read:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Resolving in CJS mode</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ESM mode</code>, with its conditions. Under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nodenext</code> it follows the importing file format.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reading TS1479:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--explainFiles</code> says the importer is CommonJS because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">package.json</code> has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"type"</code>. Fix with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"type": "module"</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.mts</code> file, or a dynamic <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Compiles but crashes:</strong> <span style="color:#f0e2c8;">Look for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Failed to resolve under condition 'import'</code> followed by a match on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types</code>. tsc fell back to a different file than Node loads: masquerading types.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The fix:</strong> <span style="color:#f0e2c8;">Give each <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exports</code> condition its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types</code> in the right format (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.d.mts</code> for ESM), so tsc checks the same module Node runs. For published packages, run attw.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">--explain</code> flag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. tsc 5.4.5 reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TS5023: Unknown compiler option '--explain'</code>. The flag is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--explainFiles</code>, added in TypeScript <strong style="color:#ffca28;">4.2</strong>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find why a file is in the program at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--explainFiles</code>. It prints <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Matched by include pattern</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Imported via "x" from file ...</code> for each file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did tsc accept a default import that Node rejected?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">tsc fell back from the missing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index.d.mts</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">index.d.ts</code> in a package without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"type"</code>, so it treated the types as CommonJS, where a default import is allowed. Node loaded the ESM file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">--traceResolution</code> change the build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It only prints. Combine it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--noEmit</code> so nothing is written.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is quicker when you only need the file list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--listFilesOnly</code>. And <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--showConfig</code> shows the effective options, including implied ones.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`--traceResolution\` | Prints every module lookup step by step |
| \`--explainFiles\` | Lists every program file, why it is included and its ESM/CJS format |
| Resolution mode | CJS or ESM lookup, with \`require\` or \`import\` conditions |
| Masquerading types | Types whose module format differs from the JavaScript that runs |
| \`TS1479\` | A CommonJS file importing an ES module |

**Conclusion:** Module resolution problems stop being mysterious once you read the route log. \`--explainFiles\` tells you what format each file is and why it is in the program; \`--traceResolution\` tells you which mode, which \`exports\` condition, and which file tsc actually chose. In the two scratch cases that was enough: TS1479 came from a missing \`"type": "module"\`, and a clean compile that crashed in Node came from tsc falling back to a CommonJS-shaped \`.d.ts\` while Node loaded an ES module. Fix the configuration or the package so tsc checks the same file the runtime loads, and the errors move from production to the compiler.`,
    examples: [
      {
        label: `Reading a real --traceResolution excerpt`,
        code: `// Reading tsc --traceResolution output. These lines are a real excerpt from the
// scratch projects in the answer (paths shortened to /work, some cache lines cut).
const trace = [
  "======== Resolving module 'esm-only' from '/work/p5/src/index.ts'. ========",
  "Explicitly specified module resolution kind: 'NodeNext'.",
  "Resolving in CJS mode with conditions 'require', 'types', 'node'.",
  "Found 'package.json' at '/work/p5/node_modules/esm-only/package.json'.",
  "Entering conditional exports.",
  "Matched 'exports' condition 'types'.",
  "Using 'exports' subpath '.' with target './index.d.ts'.",
  "File '/work/p5/node_modules/esm-only/index.d.ts' exists - use it as a name resolution result.",
  "Resolved under condition 'types'.",
  "Exiting conditional exports.",
  "======== Module name 'esm-only' was successfully resolved to '/work/p5/node_modules/esm-only/index.d.ts' with Package ID 'esm-only/index.d.ts@2.0.0'. ========",
  "======== Resolving module 'bad-order' from '/work/p5b/src/index.ts'. ========",
  "Explicitly specified module resolution kind: 'NodeNext'.",
  "Resolving in ESM mode with conditions 'import', 'types', 'node'.",
  "Found 'package.json' at '/work/p5b/node_modules/bad-order/package.json'.",
  "Entering conditional exports.",
  "Matched 'exports' condition 'import'.",
  "Using 'exports' subpath '.' with target './index.mjs'.",
  "File name '/work/p5b/node_modules/bad-order/index.mjs' has a '.mjs' extension - stripping it.",
  "File '/work/p5b/node_modules/bad-order/index.mts' does not exist.",
  "File '/work/p5b/node_modules/bad-order/index.d.mts' does not exist.",
  "Failed to resolve under condition 'import'.",
  "Saw non-matching condition 'require'.",
  "Matched 'exports' condition 'types'.",
  "Using 'exports' subpath '.' with target './index.d.ts'.",
  "File '/work/p5b/node_modules/bad-order/index.d.ts' exists - use it as a name resolution result.",
  "Resolved under condition 'types'.",
  "Exiting conditional exports.",
  "======== Module name 'bad-order' was successfully resolved to '/work/p5b/node_modules/bad-order/index.d.ts' with Package ID 'bad-order/index.d.ts@1.0.0'. ========",
];

interface Step { module: string; from: string; mode: string; tried: string[]; result: string }

function summarize(lines: string[]): Step[] {
  const steps: Step[] = [];
  let cur: Step | undefined;
  for (const line of lines) {
    let m = /^======== Resolving module '(.+)' from '(.+)'\\. ========$/.exec(line);
    if (m) { cur = { module: m[1], from: m[2].replace(/^.*\\/src\\//, "src/"), mode: "?", tried: [], result: "unresolved" }; steps.push(cur); continue; }
    if (!cur) continue;
    if ((m = /^Resolving in (\\w+) mode with conditions (.+)\\.$/.exec(line))) cur.mode = \`\${m[1]} [\${m[2].replace(/'/g, "")}]\`;
    else if ((m = /^Matched 'exports' condition '(.+)'\\.$/.exec(line))) cur.tried.push(\`\${m[1]}:matched\`);
    else if ((m = /^Failed to resolve under condition '(.+)'\\.$/.exec(line))) cur.tried.push(\`\${m[1]}:failed\`);
    else if ((m = /^Saw non-matching condition '(.+)'\\.$/.exec(line))) cur.tried.push(\`\${m[1]}:skipped\`);
    else if ((m = /successfully resolved to '(.+?)'/.exec(line))) cur.result = m[1].replace(/^.*node_modules\\//, "");
  }
  return steps;
}

for (const s of summarize(trace)) {
  console.log(\`\${s.module} from \${s.from}\`);
  console.log(\`  mode:       \${s.mode}\`);
  console.log(\`  conditions: \${s.tried.join(" -> ")}\`);
  console.log(\`  types from: \${s.result}\`);
}

// The two questions the summary answers:
const steps = summarize(trace);
const cjsImporter = steps.filter((s) => s.mode.startsWith("CJS")).map((s) => s.module);
const fellBack = steps.filter((s) => s.tried.some((t) => t.endsWith(":failed"))).map((s) => s.module);
console.log("imported from a CommonJS file:", cjsImporter.join(", "));
console.log("types found only after a fallback:", fellBack.join(", "));`,
      },
    ],
  },
];

export default augments;
