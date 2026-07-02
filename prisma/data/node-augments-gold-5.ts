/**
 * Node Phase N3 — Batch 5 (Modern runtime features + path/env helpers).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does the Node.js --watch flag do and how does it replace nodemon?",
    answer: `**TL;DR.** <code>node --watch app.js</code> **restarts the process automatically** when any imported file changes — built into Node, zero dependencies. <code>--watch-path</code> scopes which directories to watch. It covers nodemon's core "restart on save" use case; nodemon still offers more configuration (debounce, custom exec, extension maps).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='File change triggers an automatic restart'>
  <rect class='d-box' x='20' y='55' width='130' height='44' rx='8'/>
  <text class='d-sub' x='85' y='82' text-anchor='middle'>edit + save file</text>
  <path class='d-edge-accent' d='M152 77 H220' marker-end='url(#e1)'/>
  <rect class='d-box-accent' x='222' y='55' width='130' height='44' rx='8'/>
  <text class='d-text' x='287' y='78' text-anchor='middle'>--watch detects</text>
  <text class='d-sub' x='287' y='93' text-anchor='middle'>restarts process</text>
  <path class='d-edge-accent' d='M354 77 H410' marker-end='url(#e1)'/>
  <rect class='d-box' x='412' y='55' width='40' height='44' rx='8'/>
  <text class='d-sub' x='432' y='81' text-anchor='middle'>fresh</text>
  <defs><marker id='e1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Node watches the module graph it actually loads and re-executes the entry on change. Combined with type stripping you can run <code>node --watch server.ts</code>. There's also <code>--watch-preserve-output</code> (don't clear the console) and <code>--env-file</code> to load <code>.env</code>. For most projects this removes the need for an extra dev dependency; reach for nodemon/tsx-watch only when you need finer control (ignore patterns, restart delay, run arbitrary commands).

### --watch vs nodemon
| | <code>node --watch</code> | nodemon |
| --- | --- | --- |
| Install | built-in | dev dependency |
| Restart on change | ✅ | ✅ |
| Config (ignore/delay) | minimal | rich |
| TS | with type stripping/tsx | with ts-node/tsx |

> **Interview tip:** Note it's **dependency-free** and pairs with <code>--env-file</code> and type stripping for a no-tooling dev loop; mention nodemon still wins on advanced config.`,
    examples: [
      {
        label: "Dependency-free dev loop",
        tech: "bash",
        runnable: false,
        code: `node --watch server.js                 # restart on change
node --watch --env-file=.env server.js  # load env too
node --watch server.ts                  # with native type stripping`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the Node.js permission model (--permission) and what does it protect against?",
    answer: `**TL;DR.** The **permission model** (run with <code>--permission</code>) **denies** a process access to the file system, child processes, and worker threads unless you **explicitly grant** it (<code>--allow-fs-read</code>, <code>--allow-fs-write</code>, <code>--allow-child-process</code>, <code>--allow-worker</code>). It shrinks the **blast radius** of a compromised dependency running arbitrary code.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Permission model gates access to fs, child processes and workers'>
  <rect class='d-box-accent' x='160' y='20' width='140' height='40' rx='8'/>
  <text class='d-text' x='230' y='44' text-anchor='middle'>--permission</text>
  <path class='d-edge' d='M200 60 L110 100' marker-end='url(#e2)'/>
  <path class='d-edge' d='M230 60 V100' marker-end='url(#e2)'/>
  <path class='d-edge' d='M260 60 L350 100' marker-end='url(#e2)'/>
  <rect class='d-box-muted' x='40' y='102' width='130' height='44' rx='8'/><text class='d-sub' x='105' y='122' text-anchor='middle'>file system</text><text class='d-sub' x='105' y='138' text-anchor='middle'>--allow-fs-*</text>
  <rect class='d-box-muted' x='180' y='102' width='100' height='44' rx='8'/><text class='d-sub' x='230' y='122' text-anchor='middle'>child proc</text><text class='d-sub' x='230' y='138' text-anchor='middle'>--allow-…</text>
  <rect class='d-box-muted' x='290' y='102' width='130' height='44' rx='8'/><text class='d-sub' x='355' y='122' text-anchor='middle'>workers</text><text class='d-sub' x='355' y='138' text-anchor='middle'>--allow-worker</text>
  <defs><marker id='e2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Normally any code your process runs — including a malicious transitive dependency — has full access to read your files, spawn shells, or open network sockets. With the permission model on, those capabilities are **off by default**; attempts throw <code>ERR_ACCESS_DENIED</code> unless you opted in for specific paths. You scope grants narrowly (e.g. <code>--allow-fs-read=/app/config</code>). Code can query the current grants via <code>process.permission.has(...)</code>. It's a defense-in-depth layer against supply-chain attacks, not a full sandbox.

### Common grants
| Flag | Allows |
| --- | --- |
| <code>--allow-fs-read=PATH</code> | reading those paths |
| <code>--allow-fs-write=PATH</code> | writing those paths |
| <code>--allow-child-process</code> | spawning processes |
| <code>--allow-worker</code> | worker threads |

> **Interview tip:** Frame it as **supply-chain defense-in-depth**: capabilities are denied by default and granted narrowly, limiting what a compromised dependency can do. Note it's still experimental and not a complete sandbox.`,
    examples: [
      {
        label: "Run with least privilege",
        tech: "bash",
        runnable: false,
        code: `# Deny everything, then allow only what the app needs:
node --permission \\
     --allow-fs-read=/app \\
     --allow-fs-write=/app/uploads \\
     server.js

# Inside code you can check grants:
# process.permission.has('fs.write', '/app/uploads')  // true`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Single Executable Applications (SEA) in Node.js?",
    answer: `**TL;DR.** A **Single Executable Application** bundles your app's JavaScript **into a copy of the Node binary**, producing **one self-contained file** you can ship to users who don't have Node installed. You generate a SEA "blob" from a config, then inject it into the executable with the <code>postject</code> tool.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Bundle plus node binary injected to form one executable'>
  <rect class='d-box' x='20' y='40' width='110' height='44' rx='8'/><text class='d-sub' x='75' y='66' text-anchor='middle'>bundle.js</text>
  <rect class='d-box' x='20' y='96' width='110' height='40' rx='8'/><text class='d-sub' x='75' y='121' text-anchor='middle'>node binary</text>
  <path class='d-edge-accent' d='M132 62 L210 80' marker-end='url(#e3)'/>
  <path class='d-edge-accent' d='M132 114 L210 92' marker-end='url(#e3)'/>
  <rect class='d-box-accent' x='212' y='62' width='110' height='40' rx='8'/><text class='d-text' x='267' y='86' text-anchor='middle'>postject</text>
  <path class='d-edge-accent' d='M324 82 H382' marker-end='url(#e3)'/>
  <rect class='d-box-muted' x='384' y='62' width='66' height='40' rx='8'/><text class='d-sub' x='417' y='86' text-anchor='middle'>app.exe</text>
  <defs><marker id='e3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** You write a <code>sea-config.json</code> pointing at your (ideally bundled) entry script, run <code>node --experimental-sea-config</code> to produce a **blob**, copy the Node executable, and use **postject** to embed the blob into it (and re-sign on macOS/Windows). The result launches your app directly. SEAs simplify distributing **CLI tools** to non-developers, at the cost of a large binary (it contains all of Node) and an experimental, manual build process.

### SEA trade-offs
| Pro | Con |
| --- | --- |
| No Node install for users | large file (~bundled runtime) |
| One artifact to ship | experimental, multi-step build |
| Good for CLIs/tools | code-signing per OS |

> **Interview tip:** Summarize the pipeline — **config → blob → postject into a Node copy** — and position SEA as a way to ship CLIs to users without Node, distinct from bundlers like pkg/nexe.`,
    examples: [
      {
        label: "Building a SEA",
        tech: "bash",
        runnable: false,
        code: `# 1) config points at your bundled entry
echo '{ "main": "app.js", "output": "sea-prep.blob" }' > sea-config.json
node --experimental-sea-config sea-config.json

# 2) copy node, inject the blob
cp $(command -v node) app
npx postject app NODE_SEA_BLOB sea-prep.blob \\
  --sentinel-fuse NODE_SEA_FUSE_...

./app    # runs without a separate Node install`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you replicate __dirname in ES Modules using import.meta.url?",
    answer: `**TL;DR.** ESM has **no <code>__dirname</code>/<code>__filename</code>**. Derive them from <code>import.meta.url</code> (the module's file URL) with <code>fileURLToPath</code>: convert the URL to a path, then take its directory. Modern Node also exposes <code>import.meta.dirname</code> and <code>import.meta.filename</code> directly.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='import.meta.url converts to a file path then a directory'>
  <rect class='d-box-accent' x='20' y='55' width='150' height='44' rx='8'/>
  <text class='d-sub' x='95' y='74' text-anchor='middle'>import.meta.url</text>
  <text class='d-sub' x='95' y='90' text-anchor='middle'>file:///app/x.js</text>
  <path class='d-edge-accent' d='M172 77 H235' marker-end='url(#e4)'/>
  <text class='d-sub' x='203' y='68' text-anchor='middle'>fileURLToPath</text>
  <rect class='d-box' x='237' y='55' width='110' height='44' rx='8'/>
  <text class='d-sub' x='292' y='80' text-anchor='middle'>/app/x.js</text>
  <path class='d-edge' d='M349 77 H392' marker-end='url(#e4)'/>
  <rect class='d-box' x='394' y='55' width='56' height='44' rx='8'/>
  <text class='d-sub' x='422' y='80' text-anchor='middle'>/app</text>
  <defs><marker id='e4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** In CommonJS the module wrapper injected <code>__dirname</code>; ESM doesn't, but every module knows its own URL via <code>import.meta.url</code>. <code>fileURLToPath</code> (from <code>node:url</code>) turns that <code>file://</code> URL into an OS path — important on Windows where raw URL→path slicing breaks. Take <code>path.dirname</code> for the folder. On recent Node, skip the boilerplate entirely with <code>import.meta.dirname</code>. Use these to resolve assets relative to the module rather than the (mutable) <code>process.cwd()</code>.

### Equivalents
| CommonJS | ESM |
| --- | --- |
| <code>__filename</code> | <code>fileURLToPath(import.meta.url)</code> |
| <code>__dirname</code> | <code>path.dirname(...)</code> / <code>import.meta.dirname</code> |
| relative require | <code>new URL('./x', import.meta.url)</code> |

> **Interview tip:** Mention <code>fileURLToPath</code> is needed for **cross-platform** correctness, and that newer Node offers <code>import.meta.dirname</code> so the snippet is no longer necessary.`,
    examples: [
      {
        label: "ESM __dirname",
        tech: "javascript",
        runnable: false,
        code: `import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Newer Node — no boilerplate:
// const __dirname = import.meta.dirname;
const cfg = path.join(__dirname, 'config.json');`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of `__dirname` and `__filename` in Node.js?",
    answer: `**TL;DR.** <code>__dirname</code> is the **absolute path of the current module's directory** and <code>__filename</code> is the **absolute path of the current file**. They let you build paths **relative to the file** (not the unpredictable working directory). They exist in **CommonJS** only; ESM derives them from <code>import.meta.url</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='__dirname is the folder, __filename is the file'>
  <rect class='d-box-muted' x='40' y='40' width='380' height='80' rx='10'/>
  <text class='d-text' x='60' y='66'>/app/src/</text>
  <rect class='d-box-accent' x='60' y='78' width='150' height='30' rx='6'/><text class='d-sub' x='135' y='98' text-anchor='middle'>__dirname = /app/src</text>
  <rect class='d-box' x='225' y='78' width='180' height='30' rx='6'/><text class='d-sub' x='315' y='98' text-anchor='middle'>__filename = /app/src/index.js</text>
</svg>

**How it works.** Node wraps each CommonJS module in a function that receives <code>__dirname</code> and <code>__filename</code> as parameters — that's why they're available without importing anything. Use them to load sibling files reliably: <code>path.join(__dirname, 'data.json')</code> works no matter where you launched <code>node</code> from, whereas <code>./data.json</code> resolves against <code>process.cwd()</code> and can break. In ESM these globals are <code>undefined</code>; reconstruct them from <code>import.meta.url</code> (or use <code>import.meta.dirname</code>).

### __dirname vs cwd
| | <code>__dirname</code> | <code>process.cwd()</code> |
| --- | --- | --- |
| Anchored to | the file | where you ran node |
| Stable? | ✅ yes | ❌ varies |
| Use for | bundled assets/config | user-relative paths |

> **Interview tip:** Stress **file-relative vs cwd-relative**: <code>__dirname</code> is stable regardless of launch directory. Add that it's **CommonJS-only** and ESM uses <code>import.meta.url</code>/<code>import.meta.dirname</code>.`,
    examples: [
      {
        label: "File-relative path that won't break",
        tech: "javascript",
        runnable: false,
        code: `const path = require('node:path');

// Robust: anchored to this file
const template = path.join(__dirname, 'templates', 'email.html');

// Fragile: depends on where 'node' was launched
const fragile = './templates/email.html';`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is structuredClone and when is it useful in Node.js?",
    answer: `**TL;DR.** <code>structuredClone(value)</code> is a global that **deep-clones** data using the structured clone algorithm. Unlike <code>JSON.parse(JSON.stringify(x))</code>, it handles <code>Map</code>, <code>Set</code>, <code>Date</code>, <code>RegExp</code>, typed arrays/<code>ArrayBuffer</code>, and **cyclic references**. It does **not** copy functions, class prototypes, or DOM-specific types.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='structuredClone deep-copies rich types JSON cannot'>
  <rect class='d-box-accent' x='20' y='45' width='160' height='70' rx='10'/>
  <text class='d-text' x='100' y='70' text-anchor='middle'>original</text>
  <text class='d-sub' x='100' y='92' text-anchor='middle'>Map, Date, cyclic</text>
  <path class='d-edge-accent' d='M182 80 H262' marker-end='url(#e5)'/>
  <text class='d-sub' x='222' y='71' text-anchor='middle'>structuredClone</text>
  <rect class='d-box' x='264' y='45' width='176' height='70' rx='10'/>
  <text class='d-text' x='352' y='70' text-anchor='middle'>deep copy</text>
  <text class='d-sub' x='352' y='92' text-anchor='middle'>independent, types kept</text>
  <defs><marker id='e5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** It recursively copies the value, preserving structure (including cycles) and many built-in types that JSON drops or mangles (JSON turns <code>Date</code> into a string and throws on cycles). Because functions and class identity aren't serializable, those are stripped or cause a <code>DataCloneError</code>. It's synchronous and built-in (no lodash needed) — handy for safely duplicating config objects, deep-copying request payloads before mutation, or snapshotting state.

### Clone options
| Method | Handles cycles | Keeps Map/Date | Functions |
| --- | --- | --- | --- |
| <code>structuredClone</code> | ✅ | ✅ | ❌ stripped/throws |
| <code>JSON</code> round-trip | ❌ throws | ❌ lost | ❌ lost |
| spread <code>{...x}</code> | n/a | shallow only | kept (shallow) |

> **Interview tip:** Position it as the **built-in deep clone** that beats the JSON trick for cycles and rich types — but remind that it can't clone functions or class instances' methods.`,
    examples: [
      {
        label: "Deep clone that JSON would break",
        tech: "javascript",
        runnable: false,
        code: `const state = { when: new Date(), tags: new Set(['a']), self: null };
state.self = state;                  // cyclic

const copy = structuredClone(state); // works (JSON would throw)
copy.tags.add('b');
console.log(state.tags.has('b'));    // false — fully independent`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the node:util parseArgs helper for building CLIs?",
    answer: `**TL;DR.** <code>util.parseArgs</code> parses <code>process.argv</code> into **typed options and positionals** from a declarative <code>options</code> config — covering basic CLI flag parsing **without a dependency** like yargs or commander. It supports booleans, strings, short aliases, and repeated (multiple) values.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Raw argv parsed into structured values and positionals'>
  <rect class='d-box' x='20' y='50' width='180' height='50' rx='8'/>
  <text class='d-sub' x='110' y='72' text-anchor='middle'>--port 3000 -v file.txt</text>
  <text class='d-sub' x='110' y='90' text-anchor='middle'>(raw argv)</text>
  <path class='d-edge-accent' d='M202 75 H262' marker-end='url(#e6)'/>
  <text class='d-sub' x='232' y='66' text-anchor='middle'>parseArgs</text>
  <rect class='d-box-accent' x='264' y='40' width='176' height='70' rx='8'/>
  <text class='d-sub' x='352' y='64' text-anchor='middle'>values: {port, v}</text>
  <text class='d-sub' x='352' y='86' text-anchor='middle'>positionals: [file.txt]</text>
  <defs><marker id='e6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** You describe each option's <code>type</code> (<code>'string'</code> or <code>'boolean'</code>), optional <code>short</code> alias, <code>default</code>, and whether it accepts <code>multiple</code> values. <code>parseArgs</code> returns <code>{ values, positionals }</code>. Set <code>allowPositionals: true</code> to capture non-flag arguments. It deliberately covers the **common 80%**; for rich features (subcommands, auto-generated help, validation) reach for commander/yargs. Being built-in, it keeps small CLI scripts dependency-free.

### parseArgs config
| Field | Meaning |
| --- | --- |
| <code>type</code> | <code>'string'</code> or <code>'boolean'</code> |
| <code>short</code> | single-letter alias |
| <code>multiple</code> | collect into an array |
| <code>default</code> | fallback value |

> **Interview tip:** Present it as the **zero-dependency CLI parser** for simple tools, and note that subcommands/help/validation still call for commander or yargs.`,
    examples: [
      {
        label: "Parse flags with no dependency",
        tech: "javascript",
        runnable: false,
        code: `import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    port:    { type: 'string', short: 'p', default: '3000' },
    verbose: { type: 'boolean', short: 'v' },
  },
});
// node cli.js -v -p 8080 file.txt
console.log(values.port, values.verbose, positionals); // 8080 true ['file.txt']`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does NODE_ENV=production actually change and why does it matter?",
    answer: `**TL;DR.** <code>NODE_ENV</code> is just an **environment variable** — Node itself doesn't treat it specially. But **many libraries branch on it**: Express disables verbose error pages and caches views, React strips dev warnings, and <code>npm install</code> skips <code>devDependencies</code>. Setting it to <code>"production"</code> turns on performance paths and avoids leaking debug detail.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Same code behaves differently based on NODE_ENV'>
  <rect class='d-box-accent' x='160' y='20' width='140' height='38' rx='8'/>
  <text class='d-text' x='230' y='44' text-anchor='middle'>NODE_ENV</text>
  <path class='d-edge' d='M200 58 L120 100' marker-end='url(#e7)'/>
  <path class='d-edge' d='M260 58 L340 100' marker-end='url(#e7)'/>
  <rect class='d-box-muted' x='30' y='102' width='180' height='46' rx='8'/>
  <text class='d-sub' x='120' y='122' text-anchor='middle'>development</text>
  <text class='d-sub' x='120' y='138' text-anchor='middle'>warnings, error pages</text>
  <rect class='d-box-accent' x='250' y='102' width='180' height='46' rx='8'/>
  <text class='d-sub' x='340' y='122' text-anchor='middle'>production</text>
  <text class='d-sub' x='340' y='138' text-anchor='middle'>caching, no debug leaks</text>
  <defs><marker id='e7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Frameworks read <code>process.env.NODE_ENV</code> and switch behavior: Express enables view caching and hides stack traces in responses; build tools and React do <code>process.env.NODE_ENV === 'production'</code> checks to dead-code-eliminate dev-only branches; <code>npm ci --omit=dev</code> respects it to skip dev deps. Forgetting to set it in production means **slower** apps and **leaked** error details. It's a **convention**, so set it explicitly (env, Dockerfile) rather than assuming.

### Effects by tool
| Tool | production effect |
| --- | --- |
| Express | view cache on, no stack traces |
| React/bundlers | strip dev warnings, minify |
| npm | skip devDependencies |
| your code | gate logging/asserts |

> **Interview tip:** The nuance interviewers want: **Node ignores NODE_ENV; libraries don't.** It's a convention enabling production optimizations and preventing debug-detail leaks — always set it explicitly.`,
    examples: [
      {
        label: "Branch your own behavior on it",
        tech: "javascript",
        runnable: false,
        code: `const isProd = process.env.NODE_ENV === 'production';

app.use(isProd ? compression() : morgan('dev'));   // logging only in dev

app.use((err, req, res, next) => {
  res.status(500).json({
    error: isProd ? 'Internal error' : err.stack,   // hide stack in prod
  });
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the role of the path module and why is it preferred over manual string concatenation?",
    answer: `**TL;DR.** The <code>node:path</code> module builds and manipulates file paths **correctly across operating systems**, which use different separators (<code>/</code> on POSIX, <code>\\</code> on Windows). <code>path.join</code>/<code>path.resolve</code> pick the right separator, normalize redundant slashes and <code>..</code> segments, and avoid the subtle bugs of hand-built strings.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='path.join handles separators that manual concatenation gets wrong'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>manual concat</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>dir + '/' + file</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>wrong slash on Windows</text>
  <text class='d-sub' x='120' y='118' text-anchor='middle'>double // / no normalize</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>path.join / resolve</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>OS-correct separator</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>normalizes .. and //</text>
  <text class='d-sub' x='340' y='118' text-anchor='middle'>resolve → absolute</text>
</svg>

**How it works.** <code>path.join(...segments)</code> concatenates with the platform separator and collapses redundant ones; <code>path.resolve(...)</code> goes further, producing an **absolute** path by resolving segments against the current working directory (right to left until absolute). Other helpers — <code>basename</code>, <code>dirname</code>, <code>extname</code>, <code>parse</code> — extract parts safely. Manual concatenation breaks on Windows, mishandles trailing slashes, and doesn't resolve <code>..</code>, which can even create **path-traversal** vulnerabilities. Pair <code>path.join(__dirname, ...)</code> for portable, file-relative paths.

### join vs resolve
| | <code>path.join</code> | <code>path.resolve</code> |
| --- | --- | --- |
| Result | combined relative/absolute | always absolute |
| Anchors to cwd | no | yes (until absolute) |
| Normalizes | ✅ | ✅ |

> **Interview tip:** Two wins: **cross-platform separators** and **normalization** (collapsing <code>..</code>/double slashes). Mention manual concat can enable path traversal — another reason to use the module.`,
    examples: [
      {
        label: "Portable paths",
        tech: "javascript",
        runnable: false,
        code: `import path from 'node:path';

path.join('users', 'arvind', 'file.txt');
// POSIX: users/arvind/file.txt   Windows: users\\arvind\\file.txt

path.resolve('config', 'app.json'); // -> /cwd/config/app.json (absolute)
path.extname('photo.png');          // -> .png`,
      },
    ],
  },
];

export default augments;
