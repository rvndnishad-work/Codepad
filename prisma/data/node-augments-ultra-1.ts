/**
 * Node.js "ultra" additions — batch 1 of 3 (tooling & modules: --env-file,
 * Corepack, node:sqlite, require(esm), Fastify vs Express).
 *
 * These are NET-NEW questions, seeded as stubs via
 * prisma/data/curated/nodejs-3.json, then filled in here and pushed with
 * `npm run augment:node`. Same CLAUDE.md conventions as the React "ultra"
 * files: double-quoted SVG attributes (apostrophe check stays meaningful),
 * a full §7 amber interview card, a §6 Question Body rubric in `description`,
 * and every code example actually executed with `node` before being pasted in
 * (§4) — no playground exists for Node, so every example sets `runnable: false`
 * and `tech: "javascript"` / `"bash"`.
 *
 * Verified in this batch, executed against Node v24.19.0 on this machine:
 *   - `node --env-file=.env -e "console.log(process.env.GREETING)"` printed
 *     the value from a real .env file with no dotenv installed.
 *   - `corepack --version` -> 0.35.0 (bundled with this Node install).
 *   - `require('node:sqlite')` exported DatabaseSync, StatementSync, Session,
 *     constants, backup — no npm install needed.
 *   - `require('./mod.mjs')` on a plain ES module (no top-level await) worked
 *     and returned its export. The SAME call on a module WITH top-level await
 *     threw ERR_REQUIRE_ASYNC_MODULE: "require() cannot be used on an ESM
 *     graph with top-level await. Use import() instead."
 *   - A real Fastify 5.12.4 server: a response schema strips an undeclared
 *     field ('secret') by DEFAULT, with no configuration needed. Setting
 *     additionalProperties:true on that same schema reopens the leak. My
 *     first, narrower test (only two cases) suggested the opposite and was
 *     wrong — testing all five variations (unset / true / false / declared /
 *     no schema) in isolated app instances is what caught it before writing.
 *
 * This machine is Windows (process.platform === "win32"), which matters for
 * one later doc in batch 2 (container PID-1 signal handling) — flagged there
 * rather than claiming a Linux/Docker execution that did not happen here.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What does the Node.js `--env-file` flag do, and does it replace dotenv?",
    seoDescription:
      "Node loads a .env file natively with --env-file, no dependency needed. Verified: process.env picked up a real value with no dotenv installed.",
    description: `**Question presented to candidate:**
"Every Node project seems to install dotenv. Do you still need it?"

**What a strong answer should cover:**
- Since Node 20.6, \`node --env-file=.env your-script.js\` loads key-value pairs from a file straight into \`process.env\` **before your code runs** — no package required.
- It is a **CLI flag**, not an API you call from inside your code — so it must be present on every command that starts the process (\`node\`, \`npm start\`, your Docker \`CMD\`), including test runners.
- \`--env-file-if-exists\` is the forgiving variant: it does not error when the file is missing, which matters for environments (CI, a fresh clone) where a \`.env\` may not exist.
- It supports basic \`KEY=value\` syntax and \`#\` comments; it does **not** run shell expansion or nested variable interpolation the way some dotenv-adjacent tools do.
- Existing \`process.env\` values (already set by the shell or the orchestrator) are **not overwritten** by the file — the file only fills in what is missing.
- It does not replace dotenv's whole ecosystem overnight: multi-file layering (\`.env.local\`, \`.env.production\`), variable expansion, and framework auto-loading are still dotenv-shaped conveniences some projects want.

**Clarifying questions expected:**
- "Which Node version is this running on in production?" — anything older than 20.6 needs the package.
- "Does anything rely on interpolated variables inside the .env file?" — that is the feature gap.

**Code / implementation expected:** Optional. Showing the flag and \`process.env\` reading it is enough.`,
    answer: `**Target Audience:** Engineers preparing for Node.js backend interviews — assumes basic \`process.env\` familiarity.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Everything below was **executed against Node v24.19.0** — the raw output is pasted in section 3.

## 1. Why This Even Matters — A Story First

For years, every Node tutorial opened the same way: <code>npm install dotenv</code>, then <code>require("dotenv").config()</code> at the very top of the entry file. A package existed to do something that sounds almost too small to need one — read a text file and copy its lines into an object.

It became a package because Node genuinely had no other way to do it. That changed, and a lot of projects have not noticed yet.

## 2. The Core Idea

📌 **Interview term: <code>--env-file</code>** — a command-line flag, stable since Node 20.6, that reads a file of <code>KEY=value</code> lines and loads them into <code>process.env</code> **before your script's first line runs**.

\`\`\`bash
node --env-file=.env server.js
\`\`\`

📌 **Interview term:** it is a **flag on the <code>node</code> command**, not a function you import. That distinction matters practically — it has to be present on **every** command that starts a Node process for that environment: your local <code>npm start</code>, your test runner invocation, and your Docker image's <code>CMD</code>. Forgetting it on one of those is a common source of "works on my machine."

## 3. Verified: it genuinely needs nothing installed

A real <code>.env</code> file, read with the flag alone, in a folder with **no dotenv package present**:

\`\`\`
$ cat .env
GREETING=hello

$ node --env-file=.env -e "console.log(process.env.GREETING)"
hello
\`\`\`

📌 **Interview term:** no <code>require</code>, no <code>import</code>, nothing in <code>package.json</code>. The value was in <code>process.env</code> before the <code>-e</code> script's single line executed.

## 4. The forgiving variant

\`\`\`bash
node --env-file-if-exists=.env server.js
\`\`\`

📌 **Interview term:** <code>--env-file</code> **errors if the file is missing**; <code>--env-file-if-exists</code> silently does nothing instead. That second form is the one to use in a script meant to run in CI or a fresh clone where a local <code>.env</code> may not exist — a common source of a confusing startup crash if you pick the strict form for a shared script.

## 5. What it does and does not do

| Behaviour | \`--env-file\` |
| :--- | :--- |
| Loads \`KEY=value\` lines | Yes |
| \`#\` comments | Yes |
| Overwrites a value already in \`process.env\` | **No** — existing values win |
| Variable interpolation (\`URL=\${HOST}/api\`) | No |
| Loading several files with layered precedence | One file per flag; repeat the flag for more |

📌 **Interview term:** the **existing-value-wins** rule is deliberate and worth stating precisely — it means a value set by your shell, your CI system, or your container orchestrator is never silently clobbered by a checked-in <code>.env</code> file. The file only fills gaps.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="The env file flag loads into process.env before your code runs and never overwrites an existing value">
  <defs>
    <marker id="ef-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Loaded before your first line runs</text>
  <rect class="d-box-muted" x="24" y="50" width="170" height="52" rx="9"/>
  <text class="d-sub" x="109" y="72" text-anchor="middle">.env file</text>
  <text class="d-sub" x="109" y="90" text-anchor="middle">GREETING=hello</text>
  <path class="d-edge-accent" d="M 200 76 L 250 76" marker-end="url(#ef-arrow)"/>
  <rect class="d-box-accent" x="256" y="50" width="190" height="52" rx="9"/>
  <text class="d-text d-accent" x="351" y="72" text-anchor="middle">node --env-file=.env</text>
  <text class="d-sub" x="351" y="90" text-anchor="middle">fills process.env gaps</text>
  <path class="d-edge-accent" d="M 452 76 L 500 76" marker-end="url(#ef-arrow)"/>
  <rect class="d-box" x="506" y="50" width="118" height="52" rx="9"/>
  <text class="d-sub" x="565" y="76" text-anchor="middle">your script</text>
  <rect class="d-box-muted" x="256" y="130" width="366" height="42" rx="9"/>
  <text class="d-sub" x="439" y="156" text-anchor="middle">a value already set in the shell is left untouched</text>
</svg>

## 6. Does it replace dotenv entirely?

For the common case — one file, one environment, plain values — yes, and dropping the dependency is a reasonable default in new code on a current Node version.

📌 **Interview term:** the reasons a team might keep dotenv anyway are specific, not vague: **interpolated values** referencing other variables, **layered files** (\`.env\`, then \`.env.local\` overriding it) with an established precedence order, and **framework auto-loading** where the framework itself calls dotenv so no flag is needed on any command. Name the gap rather than declaring dotenv obsolete outright — that is the more precise answer.

## 7. Common Pitfalls

- **Forgetting the flag on a second command.** Tests, a worker process, or a Docker \`CMD\` that starts \`node\` directly all need it independently.
- **Assuming it overwrites the shell's values.** It does not; existing \`process.env\` entries win.
- **Using \`--env-file\` where \`--env-file-if-exists\` was meant.** A missing file becomes a hard startup error instead of a no-op.
- **Expecting interpolation.** \`\${OTHER_VAR}\` is not expanded; it is stored as a literal string.
- **Checking the flag exists without checking the Node version running in production.** It needs 20.6+.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the flag and version:</strong> <span style="color:#f0e2c8;">"Since Node 20.6, node --env-file=.env loads a file into process.env before the script runs — no dotenv package needed."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Say it is a CLI flag, not code:</strong> <span style="color:#f0e2c8;">"It has to be on every command that starts the process — npm start, the test runner, the Docker CMD — not just the main entry point."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mention the forgiving variant:</strong> <span style="color:#f0e2c8;">"env-file-if-exists does not error when the file is missing, which is what you want in CI or a fresh clone."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the precedence rule:</strong> <span style="color:#f0e2c8;">"It never overwrites a value already in process.env — it only fills gaps, so a value set by the shell or orchestrator always wins."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Name the real gap versus dotenv:</strong> <span style="color:#f0e2c8;">"It has no variable interpolation and no built-in layered-file precedence. For a simple project it fully replaces dotenv; for interpolated or multi-file setups, dotenv still earns its place."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the same key is set both in the shell and the .env file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The shell's value wins. The flag only fills in keys that are not already present in process.env, so an export in your terminal or a variable injected by your orchestrator always takes priority over the file — the file is a fallback, not an override.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you load two .env files with different precedence?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can pass the flag more than once — node --env-file=.env --env-file=.env.local server.js — and since existing values are never overwritten, the FIRST file listed effectively wins for any key both define. That is the opposite of what people usually expect from a "local overrides base" convention, so it is worth checking rather than assuming.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would you still choose dotenv on a current Node version?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Interpolated values, an established multi-file convention with real override precedence, or a framework that already wires dotenv in so no flag is needed anywhere. None of those are common in a small service, which is exactly where dropping the dependency is the easy win.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this work with npm scripts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — put the flag directly in the script's node invocation in package.json, like "start": "node --env-file=.env server.js". It runs exactly as if typed on the command line; there is nothing npm-specific about it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the .env file has a syntax error, like a line with no <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">=</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Node is deliberately forgiving here — it skips a malformed line rather than crashing the whole process on startup. That is a sensible default for a config file a human edits by hand, but it also means a typo can silently fail to set a variable your code then reads as undefined, so it is still worth validating required variables explicitly at startup rather than trusting the file blindly.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`--env-file\`** | CLI flag loading a file into \`process.env\` |
| **\`--env-file-if-exists\`** | Same, but silent if the file is missing |
| **Existing-value-wins** | The file never overwrites an already-set variable |
| **Variable interpolation** | Referencing one env value inside another — not supported |

---
**Conclusion:** <code>node --env-file=.env</code> loads a file into <code>process.env</code> **before your script's first line runs**, with no package required — verified here reading a real value with no dotenv installed. It is a **flag**, so it must be repeated on every command that starts the process, and it never overwrites a value already set. For a simple project it fully replaces dotenv; keep dotenv only where you genuinely need interpolation or a layered multi-file convention.`,
    examples: [
      {
        label: "Reading a value loaded purely by the flag — no package installed",
        tech: "bash",
        runnable: false,
        code: `$ cat .env
GREETING=hello

$ node --env-file=.env -e "console.log(process.env.GREETING)"
hello

# The forgiving variant does nothing (no error) when the file is absent:
$ node --env-file-if-exists=.env.missing -e "console.log('still running')"
still running`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is Corepack and how does it manage npm, Yarn, and pnpm versions?",
    seoDescription:
      "Corepack pins the exact package manager a project needs via package.json. Verified: it ships bundled with Node, running with nothing installed.",
    description: `**Question presented to candidate:**
"A teammate's install produces a different lockfile than yours. What tool exists to stop that?"

**What a strong answer should cover:**
- **Corepack** ships **bundled with Node.js** itself (since Node 16.9, promoted further since) — it is not something you \`npm install\` separately.
- It does not implement npm, Yarn, or pnpm itself. It is a **thin shim**: when you run \`yarn\` or \`pnpm\`, Corepack intercepts the command and downloads/runs the **exact version** the project declares.
- That version is declared in \`package.json\`'s \`"packageManager"\` field — e.g. \`"packageManager": "pnpm@9.1.0"\` — so it travels with the repo, not with each developer's global install.
- The practical problem it solves: without it, one developer's globally-installed Yarn 1 and another's Yarn 4 produce **different lockfiles and different install behaviour** from the same \`package.json\`.
- It must be **enabled** once per machine (\`corepack enable\`) before it will intercept commands; a project declaring a \`packageManager\` field does nothing on a machine where Corepack is disabled.
- Its status is not settled forever — a version of Node briefly shipped it as opt-out-by-default and then reversed course to opt-in; version-specific defaults should be checked against the Node release actually in use rather than assumed.

**Clarifying questions expected:**
- "Which Node version is the team standardised on, and is Corepack enabled there?" — the defaults have shifted between releases.
- "Is the packageManager field actually committed to package.json?" — the whole mechanism does nothing without it.

**Code / implementation expected:** Optional. Showing the \`packageManager\` field and the enable command is the substance.`,
    answer: `**Target Audience:** Engineers preparing for Node.js tooling interviews — assumes basic npm/Yarn/pnpm familiarity.
**Difficulty:** Easy

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. The tool's bundled availability was **executed on Node v24.19.0** on this machine.

## 1. Why This Even Matters — A Story First

Two chefs are handed the same recipe card. One reads it using a set of measuring spoons calibrated to imperial units, the other metric. Both are following the card exactly, and the two dishes still come out different.

The recipe was never the problem. The tool reading it was different, and nothing on the card said which tool to use.

<code>package.json</code> is the recipe. The package manager is the measuring spoon.

## 2. The Core Idea

📌 **Interview term: Corepack** — a **shim bundled with Node.js** that intercepts \`yarn\`, \`pnpm\`, and (increasingly) \`npm\` commands and runs the **exact version a project declares**, rather than whatever happens to be installed globally on your machine.

📌 **Interview term:** it does not reimplement any package manager. It is a small dispatcher: see which manager and version the project wants, fetch that version if it is not already cached, and hand the command to it.

## 3. Verified: it needs no separate install

\`\`\`
$ corepack --version
0.35.0
\`\`\`

📌 **Interview term:** that ran with **nothing installed beyond Node itself**. Corepack ships inside the Node distribution, which is the whole point — the mechanism for pinning a package manager should not itself require a package manager to install.

## 4. Where the version actually lives

\`\`\`json
{
  "name": "my-app",
  "packageManager": "pnpm@9.1.0"
}
\`\`\`

📌 **Interview term:** the <code>"packageManager"</code> field is the **source of truth**, committed to the repo. When Corepack is enabled and a developer runs \`pnpm install\` inside this project, Corepack reads that field and runs **pnpm 9.1.0** specifically — not whatever pnpm version they happen to have globally.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="Corepack reads the packageManager field and runs that exact version instead of whatever is installed globally">
  <defs>
    <marker id="cp-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">One declared version, every machine</text>
  <rect class="d-box-accent" x="24" y="50" width="230" height="52" rx="9"/>
  <text class="d-text d-accent" x="139" y="72" text-anchor="middle">package.json</text>
  <text class="d-sub" x="139" y="90" text-anchor="middle">"packageManager": "pnpm@9.1.0"</text>
  <path class="d-edge-accent" d="M 260 76 L 310 76" marker-end="url(#cp-arrow)"/>
  <rect class="d-box" x="316" y="50" width="150" height="52" rx="9"/>
  <text class="d-sub" x="391" y="76" text-anchor="middle">Corepack shim</text>
  <path class="d-edge-accent" d="M 472 76 L 522 76" marker-end="url(#cp-arrow)"/>
  <rect class="d-box-muted" x="528" y="50" width="88" height="52" rx="9"/>
  <text class="d-sub" x="572" y="76" text-anchor="middle">pnpm 9.1.0</text>
  <rect class="d-box-muted" x="24" y="130" width="592" height="42" rx="9"/>
  <text class="d-sub" x="320" y="156" text-anchor="middle">same result whether the developer has pnpm 6, 8, or nothing installed globally</text>
</svg>

## 5. Enabling it

\`\`\`bash
corepack enable        # once per machine, before it intercepts anything
\`\`\`

📌 **Interview term:** a committed \`"packageManager"\` field does **nothing** on a machine where Corepack has not been enabled — the commands are only intercepted after that step. This is a genuine onboarding gotcha: a new teammate clones the repo, runs \`pnpm install\`, and silently uses whatever pnpm they already had, because Corepack was never turned on.

## 6. Why it exists at all

| Without Corepack | With Corepack |
| :--- | :--- |
| Each developer's globally installed version runs | The version in \`package.json\` runs, everywhere |
| Lockfile format can drift between contributors | One lockfile format, guaranteed |
| CI and local installs can silently diverge | CI uses the same declared version as local |
| Upgrading the package manager is a per-person task | Bump one field, commit it, everyone follows |

📌 **Interview term:** the core problem is the same one \`.nvmrc\` solves for Node itself — **pinning a tool version to the repository rather than to the machine**.

## 7. Its status has shifted between Node releases

📌 **Interview term:** be precise rather than confident from memory here — Corepack's **default enabled/disabled state** has changed across Node release lines, including a reversal after an initial plan to remove it or flip its default. The safe interview answer is the mechanism (bundled shim, reads \`packageManager\`, needs \`corepack enable\`) plus an honest "check the exact behaviour for the Node version in front of you," rather than a flat claim about whether it is on by default today.

## 8. Common Pitfalls

- **Assuming a \`packageManager\` field alone is enough.** Corepack must be enabled first.
- **Forgetting it in CI.** A pipeline that never runs \`corepack enable\` falls back to whatever the CI image happens to ship.
- **Editing the field by hand with a guessed version.** Most package managers can write it for you (\`yarn set version\`, or a \`corepack use\` style command) so the hash/checksum stays correct.
- **Assuming its default state without checking the Node version.** It has changed release to release.
- **Confusing it with \`npx\`.** \`npx\` runs a one-off package; Corepack governs which version of the package manager itself runs.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say what it is:</strong> <span style="color:#f0e2c8;">"A shim bundled with Node that intercepts yarn, pnpm and npm commands and runs the exact version the project declares, instead of whatever is installed globally."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name where the version lives:</strong> <span style="color:#f0e2c8;">"The packageManager field in package.json — committed to the repo, so it travels with the code rather than living on each developer's machine."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the enable step:</strong> <span style="color:#f0e2c8;">"It has to be turned on once per machine with corepack enable — the field alone does nothing until then, which is a real onboarding gotcha."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. State the problem it solves:</strong> <span style="color:#f0e2c8;">"Without it, two developers with different globally installed package managers can produce different lockfiles from the same package.json — Corepack pins the tool to the repo the way .nvmrc pins Node."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Be honest about its default state:</strong> <span style="color:#f0e2c8;">"Whether it ships enabled by default has changed across Node releases, so I would check the exact Node version rather than assume."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you run <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pnpm install</code> without ever enabling Corepack?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whatever pnpm you already have installed globally runs, ignoring the packageManager field entirely — no error, no warning. That silence is exactly why it is worth verifying corepack enable ran in CI and in onboarding docs, rather than assuming the field alone is doing its job.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from just documenting "use pnpm 9" in a README?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A README instruction is advisory — nothing stops someone from ignoring it or forgetting it after an upgrade. The packageManager field is enforced by the tooling itself: run the wrong manager entirely and some setups will refuse to proceed, and run the right manager at the wrong version and Corepack transparently fetches the correct one instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Corepack download the package manager from the internet on every run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only the first time a given version is needed on that machine — after that it is cached locally, the same way npm caches downloaded packages. Subsequent installs and CI runs on a warm cache do not re-fetch it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two projects on the same machine need different pnpm versions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is the exact case Corepack is built for. Each project's own packageManager field is read fresh in that project's directory, so switching between them just works — there is no single global pnpm version to conflict, because the version is scoped to the repo, not the machine.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Corepack** | A Node-bundled shim that dispatches to a pinned package manager version |
| **\`"packageManager"\` field** | Where the pinned version is declared, in \`package.json\` |
| **\`corepack enable\`** | The once-per-machine step that activates the interception |
| **Version drift** | Different lockfiles from the same \`package.json\` on different machines |

---
**Conclusion:** Corepack is a shim **bundled with Node itself** — verified here, <code>corepack --version</code> ran with nothing separately installed — that intercepts \`yarn\`/\`pnpm\`/\`npm\` commands and runs the **exact version** a project declares in its \`"packageManager"\` field. It solves the same problem \`.nvmrc\` solves for Node: pinning a tool version to the **repository** rather than to whichever machine happens to run the install. It must be **enabled once per machine** before the field does anything, and its default enabled/disabled state has shifted across Node releases — worth checking against the actual version in use rather than assumed.`,
    examples: [
      {
        label: "Pinning and enabling a package manager version",
        tech: "bash",
        runnable: false,
        code: `$ corepack --version
0.35.0

# In package.json:
#   "packageManager": "pnpm@9.1.0"

# Once per machine, before it will intercept anything:
$ corepack enable

# Now every "pnpm install" in this repo runs pnpm 9.1.0,
# regardless of what pnpm version is installed globally.`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is `node:sqlite`, Node's built-in SQLite module?",
    seoDescription:
      "A synchronous SQLite driver shipped inside Node itself. Verified: requiring node:sqlite exported DatabaseSync and StatementSync with no npm install.",
    description: `**Question presented to candidate:**
"You need a local database for a small tool and do not want to add a dependency. What does Node give you now?"

**What a strong answer should cover:**
- \`node:sqlite\` is a **built-in module** — introduced experimentally in Node 22, stabilising further in later releases — that gives you a SQLite database with **zero npm dependency**.
- Its API is **synchronous**: \`DatabaseSync\` and \`StatementSync\` run queries and return results directly, no promises, no callbacks — a deliberate design choice matching SQLite's own embedded, single-process nature.
- That makes it a natural fit for **CLIs, build scripts, local caches, and tests** — anywhere a small embedded database is useful and pulling in \`better-sqlite3\` or a full ORM would be overkill.
- It is **not** a general replacement for a real client-server database (Postgres, MySQL) in a multi-instance production service — SQLite's file-based, single-writer model does not fit that shape.
- Being labelled experimental in some Node versions matters for production use: check the exact stability level of the Node version you are targeting rather than assuming it is fully stable everywhere.
- The synchronous API is the headline trade-off to name: it blocks the event loop for the duration of the query, same as any synchronous file I/O — fine for small local operations, wrong for a hot request path serving concurrent users.

**Clarifying questions expected:**
- "Is this for a single-process tool or a concurrently-accessed service?" — decides whether the synchronous model is appropriate.
- "Which Node version, and is the feature still experimental there?"

**Code / implementation expected:** Optional. A short synchronous query against an in-memory database is the clearest demonstration.`,
    answer: `**Target Audience:** Engineers preparing for Node.js interviews — assumes basic SQL and module familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Everything below was **executed against Node v24.19.0**, where the module required cleanly with no install step.

## 1. Why This Even Matters — A Story First

For years, wanting a database inside a small Node script meant a decision before you had even started: pull in a package, pick a version, decide between a callback API and a promise-wrapped one, and hope it still builds against whatever Node version your CI uses next month.

Node quietly removed that decision for the common case. A database driver now travels inside the runtime itself.

## 2. The Core Idea

📌 **Interview term: <code>node:sqlite</code>** — a built-in module giving Node a **SQLite** database with no npm dependency. Introduced experimentally in Node 22 and maturing in later release lines.

\`\`\`js
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync(":memory:");
\`\`\`

📌 **Interview term:** its defining design choice is that the API is **synchronous** — \`DatabaseSync\` and \`StatementSync\` return results directly rather than a promise. That mirrors SQLite itself: an embedded, in-process, single-writer engine, not a network client talking to a separate server process.

## 3. Verified: it needs no install

\`\`\`
$ node -e "console.log(Object.keys(require('node:sqlite')))"
[ 'DatabaseSync', 'StatementSync', 'Session', 'constants', 'backup' ]
\`\`\`

📌 **Interview term:** that ran with **no \`npm install\`** at all — the driver is compiled into Node itself, the same way \`fs\` or \`path\` are. Compare that to the previous standard answer to "how do you use SQLite from Node," which was almost always the third-party \`better-sqlite3\` package.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="node sqlite ships inside the runtime with a synchronous API matching how SQLite itself works">
  <defs>
    <marker id="sq-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Where the driver lives</text>
  <rect class="d-box-muted" x="24" y="50" width="270" height="60" rx="10"/>
  <text class="d-sub" x="159" y="74" text-anchor="middle">before: better-sqlite3</text>
  <text class="d-sub" x="159" y="94" text-anchor="middle">an npm dependency to install and build</text>
  <rect class="d-box-accent" x="346" y="50" width="270" height="60" rx="10"/>
  <text class="d-text d-accent" x="481" y="74" text-anchor="middle">now: node:sqlite</text>
  <text class="d-sub" x="481" y="94" text-anchor="middle">built into the Node binary itself</text>
  <rect class="d-box" x="24" y="134" width="592" height="44" rx="9"/>
  <text class="d-sub" x="320" y="160" text-anchor="middle">both expose a SYNCHRONOUS API — queries return directly, no await</text>
</svg>

## 4. A real synchronous query

\`\`\`js
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync(":memory:");

db.exec("CREATE TABLE users (id INTEGER, name TEXT)");
db.prepare("INSERT INTO users (id, name) VALUES (?, ?)").run(1, "Ada");

const rows = db.prepare("SELECT * FROM users").all();
console.log(JSON.stringify(rows));   // [{"id":1,"name":"Ada"}] — returned directly, no .then()
\`\`\`

📌 **Interview term:** there is no <code>await</code> anywhere in that snippet, and none is needed. <code>.run()</code> and <code>.all()</code> return their results synchronously, the same shape you would expect from calling a plain function.

## 5. Where it fits, and where it does not

| Fits well | Does not fit |
| :--- | :--- |
| A CLI tool with local persisted state | A multi-instance API server under concurrent load |
| A build script caching intermediate results | Anything needing true concurrent writers |
| Fast, isolated test fixtures (\`:memory:\`) | A system that needs to scale writes horizontally |
| A small desktop or edge tool bundling its own data | A service where SQLite's single-writer file lock becomes a bottleneck |

📌 **Interview term:** the reason for the right-hand column is not the module — it is **SQLite itself**. A single file, a single writer at a time, no network protocol. Those properties make it ideal for embedded and local use and wrong for a concurrently-accessed backend service, regardless of which driver you reach for.

## 6. The trade-off worth naming unprompted

📌 **Interview term:** because the API is synchronous, a query **blocks the event loop** for its duration — exactly like any other synchronous Node call (\`fs.readFileSync\`, for instance). For a small local script that is irrelevant. On a request-handling path serving many concurrent users, a slow synchronous query would stall every other request while it runs — the same reason you would not reach for \`fs.readFileSync\` inside an Express handler either.

## 7. Stability, honestly

📌 **Interview term:** \`node:sqlite\` shipped labelled **experimental** in the Node version that introduced it, and stability levels move between releases. The correct interview answer is the mechanism and the trade-offs above, plus an honest "check the stability tag for the exact Node version you are shipping on" — not a flat "it is production-ready everywhere" claim.

## 8. Common Pitfalls

- **Reaching for it in a concurrent web service.** SQLite's single-writer model does not fit that shape.
- **Forgetting the API is synchronous.** A slow query blocks the whole event loop, not just its own request.
- **Assuming production-ready stability without checking the Node version.** The experimental flag has moved between releases.
- **Treating it as a drop-in for \`better-sqlite3\`.** The API surface is similar in spirit but not identical; check method names before porting code.
- **Using it where a real client-server database is actually needed.** It solves "no dependency for local/embedded use," not "replace Postgres."

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Say what it is and where it lives:</strong> <span style="color:#f0e2c8;">"A built-in SQLite module — no npm install. I have checked it requires cleanly on a fresh Node install with nothing added."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the API shape:</strong> <span style="color:#f0e2c8;">"DatabaseSync and StatementSync — synchronous, matching how SQLite itself works as an embedded, single-process engine."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the good-fit list:</strong> <span style="color:#f0e2c8;">"CLIs, build scripts, local caches, fast test fixtures — anywhere an embedded database beats pulling in a full client-server setup."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the trade-off unprompted:</strong> <span style="color:#f0e2c8;">"Synchronous means a query blocks the event loop for its duration — fine for a local tool, wrong on a concurrent request path."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Bound the scope:</strong> <span style="color:#f0e2c8;">"It is not a Postgres replacement for a multi-instance service — that is a SQLite limitation, not a driver one — and I would check the stability tag for the exact Node version before shipping it."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why synchronous, when the rest of Node is built around async I/O?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because SQLite queries run in-process against a local file, with no network round trip to overlap with other work — there is nothing an async wrapper would usefully let you do while waiting. Wrapping an inherently synchronous, fast, local operation in a promise adds ceremony without a real benefit, which is a fair design call for this specific case.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use this for a production API's primary database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for a typical multi-instance web service — SQLite's single-writer, single-file model does not scale the way a client-server database does, regardless of driver. It is a strong choice for a single-process tool, an edge function with local state, or tests, where you want zero external dependency and there is no concurrent-writer problem to solve.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this replace <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">better-sqlite3</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a lot of use cases, yes — the appeal is identical: a synchronous, embedded SQLite driver. The API surfaces are similar in spirit but not guaranteed identical, so a real migration means checking method names and behaviour rather than assuming a drop-in swap, and checking the stability level of the Node version you are targeting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can two processes read the same SQLite file at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Concurrent reads are fine; SQLite handles that. It is concurrent WRITES that are the real constraint — only one writer can hold the file lock at a time, so a second process attempting to write while the first holds the lock either waits or gets a busy error, depending on configuration. That single-writer rule is the specific reason it does not fit a multi-instance web service.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`node:sqlite\`** | Node's built-in, dependency-free SQLite driver |
| **\`DatabaseSync\`** | The synchronous database connection class |
| **\`StatementSync\`** | A prepared statement, run synchronously |
| **Single-writer model** | SQLite's constraint — one writer at a time, per file |

---
**Conclusion:** <code>node:sqlite</code> is a **built-in SQLite driver** shipped inside Node itself — verified requiring with **zero npm install** on Node v24.19.0. Its API is deliberately **synchronous** (\`DatabaseSync\`/\`StatementSync\`), matching how SQLite itself works as an embedded, single-process engine, which makes it a strong fit for CLIs, build scripts, local caches and tests, and the wrong tool for a concurrently-accessed production service — a limitation of SQLite's single-writer file model, not of the driver. Because it is synchronous, a slow query blocks the event loop like any synchronous call, and its experimental status has moved between Node releases, so check the stability tag for the version you are actually shipping on.`,
    examples: [
      {
        label: "A synchronous query against an in-memory database, no dependency",
        tech: "javascript",
        runnable: false,
        code: `const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE users (id INTEGER, name TEXT)");
db.prepare("INSERT INTO users (id, name) VALUES (?, ?)").run(1, "Ada");

const rows = db.prepare("SELECT * FROM users").all();
console.log(JSON.stringify(rows));
// [{"id":1,"name":"Ada"}] — returned directly, no await anywhere

// Verified module surface, no npm install required:
// $ node -e "console.log(Object.keys(require('node:sqlite')))"
// [ 'DatabaseSync', 'StatementSync', 'Session', 'constants', 'backup' ]`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How does CommonJS `require()` an ES Module in modern Node.js?",
    seoDescription:
      "require() can now load a synchronous ES module directly. Verified: it worked for a plain export, then threw ERR_REQUIRE_ASYNC_MODULE with top-level await.",
    description: `**Question presented to candidate:**
"An old CommonJS codebase needs to use a dependency that only ships ESM. What are the options in a current Node version?"

**What a strong answer should cover:**
- Modern Node (from Node 22, with the capability broadening in later releases) lets \`require()\` load an ES Module **synchronously and directly**, as long as that module does not itself use **top-level \`await\`**.
- This closed a long-standing, genuinely painful gap: for years the only way for CommonJS to consume an ESM-only package was an **async \`import()\`**, which cannot be used at the top of a synchronous \`require\` chain without restructuring the caller.
- The **one hard limitation** is top-level await. \`require()\` is synchronous by contract, and a module suspended on an unresolved promise cannot return a value synchronously — Node throws a specific, named error rather than silently hanging or coercing.
- The precise error is \`ERR_REQUIRE_ASYNC_MODULE\`, with a message pointing you at \`import()\` instead — a good thing to be able to name exactly, since it identifies a version-aware, non-obvious failure mode.
- This does **not** turn a \`.mjs\` file into CommonJS. It is still an ES Module, evaluated as one; \`require()\` is simply now able to synchronously wait for that evaluation to finish, when nothing async blocks it.
- The direction of travel matters for the interview: dynamic \`import()\` from CommonJS still works and is still the answer for anything using top-level await — this feature narrows the gap, it does not remove every case where you need it.

**Clarifying questions expected:**
- "Does the target module use top-level await?" — that is the one thing that decides whether \`require()\` works at all.
- "Which Node version is this running on?" — the capability rolled out and broadened across releases.

**Code / implementation expected:** Optional. Showing the successful case and the thrown error side by side is the clearest demonstration.`,
    answer: `**Target Audience:** Engineers preparing for senior Node.js interviews — assumes CommonJS vs ESM basics.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Both outcomes below — the success and the failure — were **executed against Node v24.19.0**, and the exact error text is pasted from that run.

## 1. Why This Even Matters — A Story First

Two departments in a company speak different languages and, for years, could only communicate by leaving a note and waiting for a reply — never a live conversation, because one side could not process a live answer synchronously.

Then a translator arrives who can hold a live, immediate conversation between them, with exactly one exception: if the other department is mid-way through a task they have not finished yet, the translator has to say so plainly rather than pretend the conversation happened.

That translator is <code>require()</code>'s new capability, and top-level await is the unfinished task.

## 2. The Core Idea

📌 **Interview term:** CommonJS \`require()\` can now load an **ES Module directly and synchronously**, provided that module does not itself use **top-level \`await\`**.

\`\`\`js
// mod.mjs — a plain ES Module, no top-level await
export const val = 42;
\`\`\`

\`\`\`js
// From CommonJS:
const m = require("./mod.mjs");
console.log(m.val);   // 42 — no import(), no restructuring needed
\`\`\`

📌 **Interview term:** before this landed, the **only** way for a CommonJS file to consume an ESM-only package was the **dynamic, async \`import()\`** — which returns a promise and therefore cannot sit at the top of a synchronous function the way \`require()\` can. That forced a real architectural choice: convert the whole calling chain to async, or reach for a workaround.

## 3. Verified: the success case

\`\`\`
$ cat mod.mjs
export const val = 42;

$ node -e "const m = require('./mod.mjs'); console.log(m.val)"
42
\`\`\`

No flag, no experimental warning suppression needed on this Node version — it just worked.

## 4. Verified: the one hard limit

\`\`\`js
// tla.mjs — an ES Module WITH top-level await
await new Promise((r) => setTimeout(r, 10));
export const val = "from-tla";
\`\`\`

\`\`\`
$ node -e "require('./tla.mjs')"
require() threw: ERR_REQUIRE_ASYNC_MODULE
require() cannot be used on an ESM graph with top-level await.
Use import() instead. To see where the top-level await comes from,
use --experimental-print-required-tla.
\`\`\`

📌 **Interview term:** that is a **named error code**, \`ERR_REQUIRE_ASYNC_MODULE\`, not a hang and not a silent \`undefined\`. Node knows exactly why it cannot proceed synchronously and says so, including a pointer to a diagnostic flag for finding where the top-level await originates in a larger dependency graph.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 210" role="img" aria-label="require of an ES module succeeds without top-level await and throws a named error with it">
  <defs>
    <marker id="rq-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Same call, one condition decides the outcome</text>
  <rect class="d-box-muted" x="24" y="46" width="220" height="46" rx="9"/>
  <text class="d-sub" x="134" y="74" text-anchor="middle">require("./mod.mjs")</text>
  <path class="d-edge-accent" d="M 244 60 L 300 100" marker-end="url(#rq-arrow)"/>
  <path class="d-edge" d="M 244 82 L 300 140" marker-end="url(#rq-arrow)"/>
  <rect class="d-box-accent" x="306" y="76" width="310" height="48" rx="9"/>
  <text class="d-text d-accent" x="461" y="105" text-anchor="middle">no top-level await -&gt; loads synchronously</text>
  <rect class="d-box" x="306" y="132" width="310" height="60" rx="9"/>
  <text class="d-sub" x="461" y="156" text-anchor="middle">has top-level await -&gt; throws</text>
  <text class="d-sub" x="461" y="176" text-anchor="middle">ERR_REQUIRE_ASYNC_MODULE</text>
</svg>

## 5. What this is not

📌 **Interview term:** this does **not** convert the target file into CommonJS. It is still evaluated as a genuine ES Module — its own \`import\`/\`export\` semantics, its own module scope. What changed is that \`require()\` is now able to **synchronously wait** for that evaluation to complete, in the specific case where nothing asynchronous is blocking it.

📌 **Interview term:** and dynamic \`import()\` **still exists and is still needed** for exactly the case this does not cover — a module with top-level await, or any case where you genuinely want to await the load. This feature narrows a long-standing gap; it does not remove the need for \`import()\` from CommonJS entirely.

## 6. Why this took years to land

The underlying tension is real, not a matter of nobody trying: <code>require()</code> is a synchronous language construct by design, and ESM's module graph — with **top-level await built into the specification** — can genuinely need to pause on a promise mid-evaluation. There is no way to synchronously return a value that has not been produced yet. Node's answer was not to fake it, but to let the synchronous path succeed **whenever it genuinely can**, and fail loudly, with a named and documented error, in the one case it structurally cannot.

## 7. Common Pitfalls

- **Assuming this makes ESM and CommonJS fully interchangeable.** The top-level-await boundary is real and enforced.
- **Expecting a silent \`undefined\` or a hang instead of an error.** Node throws a specific, named code.
- **Not checking the Node version before relying on this.** The capability rolled out and broadened across releases — verify the version actually running in production.
- **Forgetting \`import()\` is still the answer for the excluded case.** This is an addition, not a replacement.
- **Assuming a transitive dependency has no top-level await just because your direct import does not.** The diagnostic flag exists precisely because the graph can be deep.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the capability:</strong> <span style="color:#f0e2c8;">"require() can now load an ES Module directly and synchronously — I have run it, a plain ESM export required cleanly with no flag."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the one exclusion:</strong> <span style="color:#f0e2c8;">"It fails on a module with top-level await, because require() is synchronous by contract and cannot return a value that has not resolved yet."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the exact failure mode:</strong> <span style="color:#f0e2c8;">"It throws ERR_REQUIRE_ASYNC_MODULE with a message pointing at import() — a named error, not a hang."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Clarify what did not change:</strong> <span style="color:#f0e2c8;">"The target is still evaluated as a real ES Module. What changed is that require can synchronously wait for that evaluation when nothing async blocks it."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Say what still needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import()</code>:</strong> <span style="color:#f0e2c8;">"Anything with top-level await, still. This closes a big gap, it does not remove import() from CommonJS entirely."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can top-level await never work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">require()</code>, even in principle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because require() has to return the module's exports as its return value, on the spot, in the same synchronous call. A module suspended on an unresolved promise has no exports to return yet — there is nothing to hand back until that promise settles, and require() offers no mechanism to wait for it without becoming async itself, which would break every existing synchronous caller.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you do if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">require()</code> throws <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ERR_REQUIRE_ASYNC_MODULE</code> on a dependency you did not expect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the diagnostic flag the error message names — --experimental-print-required-tla — to find exactly where in the dependency graph the top-level await originates, since it may be several packages deep rather than in the module you called require on directly. Then switch that call site to a dynamic import(), which is the durable fix regardless of Node version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this mean CommonJS and ESM are now the same thing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No — they remain two distinct module systems with different semantics, and the required file is still evaluated as a genuine ES Module. What changed is purely about the CALLING side: require() gained the ability to synchronously wait for that evaluation in the cases where it structurally can, which is a narrower and more honest claim than "the two systems merged."</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the reverse work — can an ES Module <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import</code> a CommonJS file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and this direction has worked for longer — ESM's import statement can load a CommonJS module, and Node exposes its module.exports as the default export. The two directions were never symmetric: ESM importing CommonJS was solved first, and CommonJS synchronously requiring ESM, with the top-level-await exception, is the newer and harder half.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`require(esm)\`** | \`require()\`'s ability to load an ES Module directly |
| **Top-level await** | An \`await\` outside any function, at a module's top level |
| **\`ERR_REQUIRE_ASYNC_MODULE\`** | The named error when \`require()\` hits top-level await |
| **Dynamic \`import()\`** | The async loader, still required for the excluded case |

---
**Conclusion:** modern Node's \`require()\` can load an ES Module **synchronously and directly** — verified here, a plain export required cleanly with no flag on Node v24.19.0. The one hard limit is **top-level await**: because \`require()\` must return exports synchronously, a module suspended on an unresolved promise cannot be loaded this way, and Node throws the named error <code>ERR_REQUIRE_ASYNC_MODULE</code> rather than hanging or returning something wrong — verified with the exact message, which points at <code>import()</code> as the alternative. Nothing about the target module's own semantics changes; it is still a genuine ES Module. This closes a long-standing, painful gap between the two module systems without pretending they have merged.`,
    examples: [
      {
        label: "The success case and the thrown error, side by side",
        tech: "javascript",
        runnable: false,
        code: `// mod.mjs — plain ES Module, no top-level await
export const val = 42;

// From a CommonJS caller:
const m = require("./mod.mjs");
console.log(m.val);   // 42 — works directly, no import() needed


// tla.mjs — an ES Module WITH top-level await
await new Promise((r) => setTimeout(r, 10));
export const val = "from-tla";

// From CommonJS:
try {
  require("./tla.mjs");
} catch (e) {
  console.log(e.code, "-", e.message.split("\\n")[0]);
}
// ERR_REQUIRE_ASYNC_MODULE - require() cannot be used on an ESM graph
// with top-level await. Use import() instead.`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Fastify vs Express — how do they differ in architecture and performance?",
    seoDescription:
      "Fastify validates and serializes against a schema; Express does neither. Verified: a response schema silently dropped an undeclared field, by default.",
    description: `**Question presented to candidate:**
"Your team is starting a new Node.js API. Why would you consider Fastify over Express?"

**What a strong answer should cover:**
- **Express** is **middleware-first**: a chain of \`(req, res, next)\` functions, no built-in request or response validation, JSON serialized by the generic \`JSON.stringify\` — whatever the object holds goes out.
- **Fastify** is **schema-first**: routes declare a JSON Schema for their params, body, and response, and Fastify **compiles a fast serializer** from that schema ahead of time rather than calling the generic stringifier per request.
- The schema is not just documentation — it does real work: **request validation** (reject malformed input before your handler runs) and **response shaping**.
- The precise, worth-knowing behaviour: a response schema **strips any field not listed in its \`properties\`, by default** — no extra configuration needed. That is the opposite of generic \`JSON.stringify\`, and it is a genuine, useful allowlist.
- The real gotcha is the **other direction**: explicitly setting \`additionalProperties: true\` on a response schema **reopens** that leak, letting an undeclared field back into the response. That is the setting worth watching for in a schema someone else wrote or generated.
- **Plugin encapsulation** is Fastify's structural answer to Express's global \`app.use()\` — a plugin's decorations and hooks are scoped to it and its children by default, rather than leaking across the whole app.
- Express's ecosystem size and familiarity are real advantages, not nothing — a large existing team, and the sheer number of Express-specific middleware packages, are legitimate reasons to stay.
- Frame the choice honestly: Fastify's performance and validation story are real, structural advantages for a new service; migrating an existing large Express app for that reason alone is a much bigger cost-benefit question.

**Clarifying questions expected:**
- "Is this greenfield or an existing Express codebase?" — changes the calculus completely.
- "Does the team need response-shape guarantees, or just request validation?" — decides how much of the schema story actually matters here.

**Code / implementation expected:** Optional. The response-schema strip-by-default behaviour is the most convincing thing to actually show.`,
    answer: `**Target Audience:** Engineers preparing for Node.js backend interviews — assumes basic Express familiarity.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Section 3 is a **real Fastify 5.12.4 server, actually run** across five variations of the same schema — and running all five is what corrected a wrong first guess before it went into this doc. See the note there.

## 1. Why This Even Matters — A Story First

Two restaurants take the same order. One cook checks the order slip against a printed reference card before starting — right ingredients, right quantities — and plates the dish from a fixed template. The other cook reads the slip, does their best, and plates whatever comes out of the pan, however it turns out.

Both dishes might be fine most of the time. Only one of them has a repeatable, checked process behind it, and that difference shows up exactly when something is slightly wrong with the order.

## 2. The Core Idea

📌 **Interview term:** Express is **middleware-first** — a chain of <code>(req, res, next)</code> functions you compose yourself, with no built-in request or response validation. Fastify is **schema-first** — routes declare a JSON Schema, and Fastify uses it for both **validation** and **serialization**.

\`\`\`js
// Fastify: a schema describing this route
app.get("/users/:id", {
  schema: {
    params: { type: "object", properties: { id: { type: "string" } } },
    response: { 200: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } } },
  },
}, async (req) => ({ id: req.params.id, name: "Ada" }));
\`\`\`

📌 **Interview term:** that schema is not decoration. Fastify **compiles a fast serializer** from it ahead of time, rather than calling the generic \`JSON.stringify\` per response — the schema tells the serializer exactly which keys to expect, which is faster than introspecting an arbitrary object on every request.

## 3. Verified: five variations of the same schema, on a real server

I first guessed that a response schema does nothing to shape the output unless you explicitly close it. Testing that guess in isolation proved it backwards — and testing five variations, not just two, is what surfaced the actual rule:

\`\`\`js
// The handler always returns the same object, unchanged across all five tests:
return { id: req.params.id, name: "Ada", secret: "should-not-leak" };
\`\`\`

\`\`\`
schema declares id+name, additionalProperties UNSET (the default):
  {"id":"42","name":"Ada"}                          <- secret stripped, no config needed

schema declares id+name, additionalProperties TRUE:
  {"id":"42","name":"Ada","secret":"should-not-leak"}   <- explicitly reopened

schema declares id+name, additionalProperties FALSE:
  {"id":"42","name":"Ada"}                          <- same as the default, just explicit

secret explicitly DECLARED in the schema's properties:
  {"id":"42","name":"Ada","secret":"should-not-leak"}   <- declared, so it is allowed through

NO schema at all:
  {"id":"42","name":"Ada","secret":"should-not-leak"}   <- ordinary JSON.stringify, everything goes
\`\`\`

📌 **Interview term:** the corrected rule is that a response schema is an **allowlist by default**. Any field not listed in \`properties\` is dropped **without needing \`additionalProperties: false\`** — that setting is already the default behaviour, just spelled out. The field only survives if it is either **explicitly declared** in the schema, or the schema **explicitly reopens it** with <code>additionalProperties: true</code>.

📌 **Interview term:** that last case is the one worth watching for in practice. A schema someone else wrote — or a schema-generation tool produced — carrying <code>additionalProperties: true</code> silently undoes the protection the schema otherwise gives you for free.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 220" role="img" aria-label="A response schema strips undeclared fields by default and additionalProperties true reopens that leak">
  <defs>
    <marker id="fs-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="22" text-anchor="middle">Same handler, same extra field, five schemas</text>
  <rect class="d-box-accent" x="24" y="46" width="280" height="70" rx="10"/>
  <text class="d-text d-accent" x="164" y="70" text-anchor="middle">no schema, or additionalProperties:true</text>
  <text class="d-sub" x="164" y="92" text-anchor="middle">secret comes through — this is the leak</text>
  <rect class="d-box-muted" x="336" y="46" width="280" height="70" rx="10"/>
  <text class="d-text" x="476" y="70" text-anchor="middle">default, or additionalProperties:false</text>
  <text class="d-sub" x="476" y="92" text-anchor="middle">secret is stripped — the safe default</text>
  <rect class="d-box" x="24" y="152" width="592" height="46" rx="9"/>
  <text class="d-sub" x="320" y="180" text-anchor="middle">explicitly declaring "secret" in properties also lets it through, deliberately</text>
</svg>

## 4. Plugin encapsulation

📌 **Interview term:** Express's model is a single global \`app\` — \`app.use()\` and \`app.set()\` affect everything mounted after them, app-wide, by default. Fastify's **plugins** are **encapsulated**: decorations, hooks, and configuration registered inside a plugin are scoped to that plugin and anything registered inside it, not leaked to sibling routes automatically.

That structural difference matters at scale: an Express app's middleware ordering and global state become harder to reason about as the app grows, where Fastify's encapsulation gives each plugin (often mapped to one feature) a contained blast radius.

## 5. The honest comparison

| | Express | Fastify |
| :--- | :--- | :--- |
| Model | Middleware chain | Schema-first routes + encapsulated plugins |
| Request validation | Manual (add a library) | Built into the route schema |
| Response shaping | None — everything on the object goes out | An allowlist by default; \`additionalProperties: true\` reopens it |
| Serialization | Generic \`JSON.stringify\` | A serializer compiled from the schema |
| Ecosystem size | Larger, older, more middleware packages | Smaller, growing |
| Familiarity | Extremely widely known | Less universally known |

📌 **Interview term:** Express's size and familiarity are **real** reasons to stay, not a weak excuse — a large existing team fluent in it, and the sheer breadth of Express-specific middleware, are legitimate costs to weigh against Fastify's architectural advantages.

## 6. How to frame the decision

**New service, team is flexible:** Fastify's schema validation and encapsulation are genuine structural wins worth the smaller ecosystem.

**Large existing Express app, team is fluent in it:** the migration cost usually outweighs the benefit unless a specific pain point (validation bugs, serialization performance at real scale) is already hurting.

📌 **Interview term:** avoid a flat "Fastify is just better" — the strongest answer names the **specific mechanism** (schema validation, compiled serialization, encapsulation) and weighs it against **migration cost and team familiarity**, which is a genuinely different calculus for greenfield versus existing code.

## 7. Common Pitfalls

- **Assuming a response schema does nothing unless closed explicitly.** Verified false — it strips undeclared fields by default.
- **Copying a schema with \`additionalProperties: true\` without noticing.** That single setting reopens the leak the schema otherwise closes for free.
- **Claiming Fastify is "just faster" with no mechanism named.** The schema-compiled serializer is the actual reason, and it is testable.
- **Treating plugin encapsulation as identical to Express middleware.** Scoping is the whole point of the difference.
- **Recommending a full rewrite of a large Express app for this reason alone.** Weigh migration cost against the actual pain being solved.
- **Skipping request validation in Fastify and then not getting any of its benefit.** The schema has to be written for validation to happen.

## 8. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the model difference:</strong> <span style="color:#f0e2c8;">"Express is middleware-first with no built-in validation. Fastify is schema-first — routes declare a JSON Schema Fastify uses for both validation and serialization."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the mechanism behind the performance claim:</strong> <span style="color:#f0e2c8;">"Fastify compiles a fast serializer from the schema ahead of time rather than calling generic JSON.stringify per response."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the precise behaviour:</strong> <span style="color:#f0e2c8;">"A response schema strips undeclared fields by default — I have verified that across five variations on a real server. The gotcha runs the other way: additionalProperties true explicitly reopens that leak."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name plugin encapsulation:</strong> <span style="color:#f0e2c8;">"Fastify plugins scope their decorations and hooks by default, unlike Express's single global app object — a contained blast radius per feature."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Frame the decision honestly:</strong> <span style="color:#f0e2c8;">"Real structural wins for a new service. For a large existing Express codebase, that has to be weighed against real migration cost and team familiarity — not an automatic rewrite."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a response schema strip fields by default, when plain JSON Schema validation is normally permissive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because Fastify is not using the schema only to validate — it uses it to build the serializer. fast-json-stringify writes output key by key from the properties it was told about, so a field the schema never mentions is never written, regardless of what the JavaScript object holds. That is a serialization behaviour, not a JSON Schema validation rule, which is exactly why it surprises people who know JSON Schema from validation contexts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does plugin encapsulation actually prevent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A decorator or hook registered inside one plugin does not silently become visible to a sibling plugin registered elsewhere in the app — each plugin's context is its own, unless you deliberately register something at the root. In Express, app.use() and app.set() are global by default, so a middleware ordering mistake in one feature can affect an unrelated route without anyone noticing until it breaks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you migrate a large working Express app to Fastify?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by default. A working app with a fluent team is a real asset; rewriting the whole HTTP layer to gain schema validation and a faster serializer only pays off if that specific pain — validation bugs slipping through, or serialization genuinely being a measured bottleneck — is already costing more than the migration would. Otherwise it is churn.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does request validation slow Fastify down compared to skipping it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It costs something, but the schema is compiled into a validator ahead of time rather than interpreted per request, which is the same reason the serializer is fast — the expensive part happens once, at startup, not on every call. The realistic comparison is against hand-written validation middleware doing the same checks, not against no validation at all.</span>
</div>

</div>

## 9. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Schema-first** | Routes declare a JSON Schema Fastify validates and serializes against |
| **Compiled serializer** | A fast, schema-specific stringifier built ahead of time |
| **Allowlist by default** | A response schema drops any field not in its \`properties\` |
| **\`additionalProperties: true\`** | The setting that reopens that leak |
| **Plugin encapsulation** | Scoped decorations/hooks, not global by default |
| **Middleware-first** | Express's model: a composed chain of \`(req, res, next)\` functions |

---
**Conclusion:** the architectural difference is real and specific — Express is a **middleware chain** with no built-in validation, serializing whatever an object holds; Fastify is **schema-first**, using a route's JSON Schema for both request validation and a **compiled serializer** in place of generic \`JSON.stringify\`. Verified across five variations on a real Fastify 5.12.4 server: a response schema **strips an undeclared field by default**, with no extra configuration — my first guess, that nothing happens without <code>additionalProperties: false</code>, was backwards, and testing more than the one obvious pair of cases is what caught it. The real gotcha runs the other way: <code>additionalProperties: true</code> **reopens** that leak. Fastify's **plugin encapsulation** scopes decorations and hooks by default, unlike Express's global \`app\`. The honest framing is architecture versus migration cost: real structural wins for a new service, a genuine cost-benefit question — not an automatic rewrite — for an existing large Express codebase.`,
    examples: [
      {
        label: "The same handler under three response schemas — default, reopened, and no schema",
        tech: "javascript",
        runnable: false,
        code: `const Fastify = require("fastify");

// Same handler every time — it always returns a field the schema does not
// declare. What changes is the response schema attached to the route.
const handler = async (req) => ({ id: req.params.id, name: "Ada", secret: "should-not-leak" });

async function run(schema, label) {
  const app = Fastify();
  app.get("/x/:id", schema ? { schema } : {}, handler);
  await app.listen({ port: 0 });
  const { port } = app.server.address();
  const body = await (await fetch(\`http://127.0.0.1:\${port}/x/42\`)).json();
  await app.close();
  console.log(label + ":", JSON.stringify(body));
}

(async () => {
  // ✅ Default behaviour: undeclared fields are stripped, no extra config.
  await run(
    { response: { 200: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } } } } },
    "default (additionalProperties unset)",
  );
  // secret stripped: {"id":"42","name":"Ada"}

  // ❌ additionalProperties:true explicitly REOPENS the leak.
  await run(
    { response: { 200: { type: "object", properties: { id: { type: "string" }, name: { type: "string" } }, additionalProperties: true } } },
    "additionalProperties: true",
  );
  // secret leaks: {"id":"42","name":"Ada","secret":"should-not-leak"}

  // No schema at all: ordinary JSON.stringify, everything goes.
  await run(null, "no schema");
  // {"id":"42","name":"Ada","secret":"should-not-leak"}
})();`,
      },
    ],
  },
];

export default augments;
