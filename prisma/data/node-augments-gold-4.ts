/**
 * Node Phase N3 — Batch 4 (npm, packaging & tooling).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the purpose of `package.json` and `npm`.",
    answer: `**TL;DR.** <code>package.json</code> is your project's **manifest** — name, version, entry point, **scripts**, and **dependencies**. **npm** (Node Package Manager) is the CLI + registry that reads that manifest to **install, run, and publish** packages. Together they make Node projects reproducible and shareable.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='npm reads package.json to install dependencies from the registry'>
  <rect class='d-box-accent' x='20' y='40' width='150' height='90' rx='10'/>
  <text class='d-text' x='95' y='64' text-anchor='middle'>package.json</text>
  <text class='d-sub' x='95' y='86' text-anchor='middle'>deps + scripts</text>
  <text class='d-sub' x='95' y='106' text-anchor='middle'>metadata</text>
  <path class='d-edge-accent' d='M172 85 H230' marker-end='url(#d1)'/>
  <text class='d-sub' x='201' y='76' text-anchor='middle'>npm install</text>
  <rect class='d-box' x='232' y='40' width='100' height='90' rx='10'/>
  <text class='d-text' x='282' y='80' text-anchor='middle'>npm CLI</text>
  <text class='d-sub' x='282' y='100' text-anchor='middle'>resolver</text>
  <path class='d-edge' d='M334 85 H392' marker-end='url(#d1)'/>
  <rect class='d-box-muted' x='394' y='55' width='56' height='60' rx='8'/>
  <text class='d-sub' x='422' y='90' text-anchor='middle'>registry</text>
  <defs><marker id='d1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>npm install</code> reads the dependency ranges in <code>package.json</code>, resolves a concrete tree from the registry, writes it to <code>node_modules</code>, and records exact versions in <code>package-lock.json</code>. <code>npm run &lt;name&gt;</code> executes the matching entry in <code>"scripts"</code> with <code>node_modules/.bin</code> on the PATH. Publishing a package uploads it to the registry for others to install. The manifest is the single source of truth for what the project needs and how to run it.

### Key package.json fields
| Field | Purpose |
| --- | --- |
| <code>name</code> / <code>version</code> | identity (SemVer) |
| <code>main</code> / <code>exports</code> | entry point(s) |
| <code>scripts</code> | task commands |
| <code>dependencies</code> | runtime packages |

> **Interview tip:** Separate the two: **package.json describes** the project; **npm acts** on it (install/run/publish). Mention the lockfile pins exact versions for reproducibility.`,
    examples: [
      {
        label: "A minimal manifest + script",
        tech: "javascript",
        runnable: false,
        code: `{
  "name": "my-api",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": { "express": "^4.19.0" }
}
// npm install → installs express; npm run dev → runs with auto-restart`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of `package-lock.json`?",
    answer: `**TL;DR.** <code>package-lock.json</code> records the **exact resolved version** (and integrity hash) of every package in the dependency tree, not just the ranges in <code>package.json</code>. It makes installs **deterministic and reproducible** across machines and CI, and verifies integrity. Always commit it.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='package.json ranges resolve to exact pinned versions in the lockfile'>
  <rect class='d-box-accent' x='20' y='45' width='170' height='70' rx='10'/>
  <text class='d-text' x='105' y='70' text-anchor='middle'>package.json</text>
  <text class='d-sub' x='105' y='92' text-anchor='middle'>express: ^4.19.0  (range)</text>
  <path class='d-edge-accent' d='M192 80 H260' marker-end='url(#d2)'/>
  <text class='d-sub' x='226' y='71' text-anchor='middle'>resolves</text>
  <rect class='d-box-muted' x='262' y='45' width='180' height='70' rx='10'/>
  <text class='d-text' x='352' y='70' text-anchor='middle'>package-lock.json</text>
  <text class='d-sub' x='352' y='92' text-anchor='middle'>express 4.19.2 + hash (exact)</text>
  <defs><marker id='d2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>package.json</code> typically uses **ranges** (<code>^4.19.0</code>), so two installs weeks apart could pull different patch/minor versions. The lockfile freezes the **entire resolved tree** — every transitive dependency's exact version and an integrity checksum — so everyone installs the identical bytes. <code>npm ci</code> installs **strictly** from it (and fails if it's out of sync), which is why CI uses <code>ci</code> not <code>install</code>. Deleting it reintroduces version drift.

### Lockfile facts
| Aspect | Detail |
| --- | --- |
| Pins | exact versions of full tree |
| Integrity | SHA-512 hashes per package |
| Reproducible | same install everywhere |
| <code>npm ci</code> | installs only from lockfile |

> **Interview tip:** Say it **pins the exact resolved tree + integrity hashes** for reproducible installs, and that <code>npm ci</code> enforces it. Always commit it; never gitignore it.`,
    examples: [
      {
        label: "Why two installs can differ without it",
        tech: "bash",
        runnable: false,
        code: `# package.json says: "lodash": "^4.17.0"
# Without a lockfile, these can resolve to different patches:
#   Monday  → lodash 4.17.20
#   Friday  → lodash 4.17.21
# With package-lock.json committed, both get the SAME version.

npm ci      # CI: install exactly the locked tree, fail if drifted`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between dependencies, devDependencies, and peerDependencies?",
    answer: `**TL;DR.** <code>dependencies</code> are needed at **runtime** (shipped). <code>devDependencies</code> are needed only for **development/build/test** (not installed in production with <code>--omit=dev</code>). <code>peerDependencies</code> declare a package your **host app must provide** (e.g. a React plugin expecting <code>react</code>), avoiding duplicate copies.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Three dependency types and where they apply'>
  <rect class='d-box-accent' x='15' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='82' y='59' text-anchor='middle'>dependencies</text>
  <text class='d-sub' x='82' y='84' text-anchor='middle'>runtime</text>
  <text class='d-sub' x='82' y='104' text-anchor='middle'>shipped to prod</text>
  <rect class='d-box-muted' x='162' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='229' y='59' text-anchor='middle'>devDependencies</text>
  <text class='d-sub' x='229' y='84' text-anchor='middle'>build / test</text>
  <text class='d-sub' x='229' y='104' text-anchor='middle'>not in prod</text>
  <rect class='d-box' x='309' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='376' y='59' text-anchor='middle'>peerDependencies</text>
  <text class='d-sub' x='376' y='84' text-anchor='middle'>host provides</text>
  <text class='d-sub' x='376' y='104' text-anchor='middle'>avoid dupes</text>
</svg>

**How it works.** When you <code>npm install pkg</code> it lands in <code>dependencies</code>; <code>--save-dev</code> puts it in <code>devDependencies</code>. A production install (<code>npm ci --omit=dev</code> or <code>NODE_ENV=production</code>) skips dev deps, keeping images small. **Peer dependencies** matter for **plugins/libraries**: they say "I work *with* this package but expect *you* to install it," so a single shared copy is used (critical for things like React where two copies break hooks). Modern npm installs missing peers by default but warns on mismatches.

### Which bucket?
| Type | Installed in prod? | Example |
| --- | --- | --- |
| dependencies | ✅ | express, pg |
| devDependencies | ❌ | jest, eslint, tsc |
| peerDependencies | host's job | react (for a plugin) |

> **Interview tip:** The peer-deps point is the differentiator: use them in **libraries/plugins** so the consumer supplies one shared copy, preventing duplicate-instance bugs (classic with React).`,
    examples: [
      {
        label: "Three buckets in a library's manifest",
        tech: "javascript",
        runnable: false,
        code: `{
  "dependencies":     { "lodash": "^4.17.21" },   // needed at runtime
  "devDependencies":  { "jest": "^29.0.0", "typescript": "^5.4.0" },
  "peerDependencies": { "react": ">=18" }          // host app must provide
}
// prod install skips jest/typescript:  npm ci --omit=dev`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is npx and how does it differ from a global install?",
    answer: `**TL;DR.** <code>npx</code> **runs a package's binary on demand** — using a project-local copy if present, otherwise fetching it temporarily — without a permanent global install. It's ideal for one-off commands (scaffolders, generators) and guarantees you run the **project's** version of a tool rather than a stale global one.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='npx resolves local then temporary, vs a permanent global install'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>npx tool</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>1) local node_modules/.bin</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>2) else fetch &amp; run temporarily</text>
  <text class='d-sub' x='120' y='120' text-anchor='middle'>nothing left behind</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>npm i -g tool</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>permanent global copy</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>can go stale</text>
  <text class='d-sub' x='340' y='120' text-anchor='middle'>version drift across machines</text>
</svg>

**How it works.** <code>npx</code> first looks in the local <code>node_modules/.bin</code>; if the binary is there it runs **that** (so <code>npx jest</code> uses your project's Jest). If not found, it downloads the package into a temporary cache, runs it, and discards it. This avoids polluting the global namespace and the classic "works on my machine because my global tool is a different version" problem. Use it for **infrequent** commands; for everyday project tasks, prefer an npm **script** (also resolves local bins).

### npx vs global install
| | <code>npx</code> | global install |
| --- | --- | --- |
| Persistence | temporary | permanent |
| Version | project-local first | one shared global |
| Drift risk | low | high (stale globals) |
| Best for | one-off / scaffolding | rarely needed now |

> **Interview tip:** Emphasize **local-first resolution** — <code>npx</code> runs the project's pinned version, avoiding global version drift. Great for scaffolders like <code>npx create-...</code>.`,
    examples: [
      {
        label: "Run without installing globally",
        tech: "bash",
        runnable: false,
        code: `npx create-next-app@latest my-app   # scaffold, then it's gone
npx prettier --check .              # uses local prettier if installed

# vs the old way that leaves a stale global behind:
# npm install -g prettier && prettier --check .`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is semantic versioning and how do ^, ~, and exact versions behave?",
    answer: `**TL;DR.** **SemVer** is <code>MAJOR.MINOR.PATCH</code>: bump **MAJOR** for breaking changes, **MINOR** for backward-compatible features, **PATCH** for fixes. In ranges, <code>^1.2.3</code> allows minor+patch (<code>&lt;2.0.0</code>), <code>~1.2.3</code> allows patch only (<code>&lt;1.3.0</code>), and <code>1.2.3</code> pins exactly.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Caret allows minor and patch, tilde allows patch, exact pins'>
  <rect class='d-box-accent' x='20' y='30' width='140' height='110' rx='10'/>
  <text class='d-text' x='90' y='54' text-anchor='middle'>^1.2.3</text>
  <text class='d-sub' x='90' y='78' text-anchor='middle'>minor + patch</text>
  <text class='d-sub' x='90' y='98' text-anchor='middle'>1.2.3 … &lt;2.0.0</text>
  <text class='d-sub' x='90' y='122' text-anchor='middle'>npm default</text>
  <rect class='d-box' x='170' y='30' width='140' height='110' rx='10'/>
  <text class='d-text' x='240' y='54' text-anchor='middle'>~1.2.3</text>
  <text class='d-sub' x='240' y='78' text-anchor='middle'>patch only</text>
  <text class='d-sub' x='240' y='98' text-anchor='middle'>1.2.3 … &lt;1.3.0</text>
  <rect class='d-box-muted' x='320' y='30' width='120' height='110' rx='10'/>
  <text class='d-text' x='380' y='54' text-anchor='middle'>1.2.3</text>
  <text class='d-sub' x='380' y='78' text-anchor='middle'>exact pin</text>
  <text class='d-sub' x='380' y='98' text-anchor='middle'>no updates</text>
</svg>

**How it works.** When you install a package, npm writes a <code>^</code> range by default, betting that minor/patch releases are safe per SemVer. <code>~</code> is more conservative (patches only); an exact version locks it down. The **lockfile** still records the precise installed version, so ranges only matter when you re-resolve (fresh install, <code>npm update</code>). For <code>0.x</code> versions, <code>^0.2.3</code> behaves like <code>~</code> (only patch), since pre-1.0 minors may break.

### Range cheatsheet
| Spec | Allows up to (exclusive) |
| --- | --- |
| <code>^1.2.3</code> | <code>2.0.0</code> |
| <code>~1.2.3</code> | <code>1.3.0</code> |
| <code>1.2.3</code> | exact only |
| <code>^0.2.3</code> | <code>0.3.0</code> (special 0.x rule) |

> **Interview tip:** Memorize **^ = minor+patch, ~ = patch**, and the **0.x caret quirk**. Add that the lockfile is what truly determines installed versions.`,
    examples: [
      {
        label: "Ranges and what they accept",
        tech: "javascript",
        runnable: false,
        code: `{
  "dependencies": {
    "express": "^4.19.0",   // 4.19.0 up to <5.0.0
    "left-pad": "~1.3.0",   // 1.3.0 up to <1.4.0
    "react":   "18.2.0"     // exactly 18.2.0
  }
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between `npm ci` and `npm install`?",
    answer: `**TL;DR.** <code>npm install</code> **resolves** dependencies from <code>package.json</code> and may **update** <code>package-lock.json</code> and <code>node_modules</code> incrementally. <code>npm ci</code> does a **clean, deterministic** install: it deletes <code>node_modules</code>, installs **exactly** what the lockfile says, and **fails** if the lockfile and <code>package.json</code> disagree. Use <code>ci</code> in CI/CD.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='npm install mutates the lockfile, npm ci installs strictly from it'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>npm install</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>resolves ranges</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>may edit lockfile</text>
  <text class='d-sub' x='120' y='120' text-anchor='middle'>incremental</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>npm ci</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>wipes node_modules</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>installs exact lockfile</text>
  <text class='d-sub' x='340' y='120' text-anchor='middle'>fails on drift</text>
</svg>

**How it works.** <code>npm install</code> is for **development**: add/remove packages, let npm pick compatible versions, update the lockfile. <code>npm ci</code> is for **reproducible** builds: it requires an existing lockfile, ignores the registry's freedom to pick versions, and reproduces the exact tree — faster because it skips resolution and does a clean install. If you changed <code>package.json</code> without updating the lockfile, <code>ci</code> errors loudly (a good safety net), whereas <code>install</code> would silently reconcile.

### install vs ci
| | <code>npm install</code> | <code>npm ci</code> |
| --- | --- | --- |
| Lockfile | may modify | strictly obeys |
| node_modules | incremental | wiped + fresh |
| Drift handling | reconciles | fails fast |
| Best for | local dev | CI / production |

> **Interview tip:** "<code>ci</code> = **clean install from the lockfile, fails on drift**; <code>install</code> = **resolve and possibly update**." Mention <code>ci</code> is faster and the right choice for pipelines.`,
    examples: [
      {
        label: "CI pipeline step",
        tech: "bash",
        runnable: false,
        code: `# Reproducible, fast, fails if lockfile is out of date:
npm ci --omit=dev

# Local development, adds a package and updates the lockfile:
npm install zod`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are the differences between npm, Yarn, and pnpm?",
    answer: `**TL;DR.** All three install packages from the npm registry but differ in **node_modules layout** and speed. npm and Yarn **flatten** dependencies into <code>node_modules</code>; **pnpm** uses a global **content-addressable store** with symlinks — saving disk, speeding installs, and enforcing **strict** access (you can only import what you declared). Each has its own lockfile and workspaces.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Flat node_modules vs pnpm symlinked store'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>npm / Yarn</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>flattened node_modules</text>
  <text class='d-sub' x='120' y='98' text-anchor='middle'>duplicated on disk</text>
  <text class='d-sub' x='120' y='120' text-anchor='middle'>can import undeclared deps</text>
  <rect class='d-box-accent' x='240' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>pnpm</text>
  <text class='d-sub' x='340' y='78' text-anchor='middle'>global store + symlinks</text>
  <text class='d-sub' x='340' y='98' text-anchor='middle'>dedup across projects</text>
  <text class='d-sub' x='340' y='120' text-anchor='middle'>strict, no phantom deps</text>
</svg>

**How it works.** A **flat** layout hoists transitive packages to the top of <code>node_modules</code>, which lets code accidentally import packages it never declared ("phantom dependencies") and stores copies per project. **pnpm** installs each package version once in a content-addressable store and hard-links/symlinks it into projects, so disk usage and install time drop dramatically; its **non-flat** structure exposes only declared dependencies, catching phantom imports. Yarn adds features like Plug'n'Play (no <code>node_modules</code>) and zero-installs. All three support **workspaces** for monorepos.

### Quick comparison
| | npm | Yarn | pnpm |
| --- | --- | --- | --- |
| Layout | flat | flat (or PnP) | symlinked store |
| Disk use | high | high | low (dedup) |
| Strictness | loose | loose | strict |
| Lockfile | package-lock | yarn.lock | pnpm-lock |

> **Interview tip:** The standout point is pnpm's **content-addressable store + strict resolution**, which fixes phantom dependencies and saves disk — a frequent reason teams migrate.`,
    examples: [
      {
        label: "Equivalent commands",
        tech: "bash",
        runnable: false,
        code: `npm install            yarn            pnpm install
npm install zod        yarn add zod    pnpm add zod
npm run build          yarn build      pnpm build

# pnpm dedups across all your repos via a single global store`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are npm workspaces and how do you manage a monorepo with them?",
    answer: `**TL;DR.** **npm workspaces** let one repository host **multiple packages** under a <code>"workspaces"</code> array in the root <code>package.json</code>. A single <code>npm install</code> at the root installs all of them, **symlinks** local packages so they resolve each other, and hoists shared dependencies — giving you a monorepo without an extra tool.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Root manages multiple linked workspace packages'>
  <rect class='d-box-accent' x='160' y='20' width='140' height='40' rx='8'/>
  <text class='d-text' x='230' y='44' text-anchor='middle'>root package.json</text>
  <path class='d-edge-accent' d='M200 60 L110 100' marker-end='url(#d3)'/>
  <path class='d-edge-accent' d='M230 60 V100' marker-end='url(#d3)'/>
  <path class='d-edge-accent' d='M260 60 L350 100' marker-end='url(#d3)'/>
  <rect class='d-box' x='40' y='102' width='130' height='44' rx='8'/><text class='d-sub' x='105' y='128' text-anchor='middle'>packages/ui</text>
  <rect class='d-box' x='180' y='102' width='100' height='44' rx='8'/><text class='d-sub' x='230' y='128' text-anchor='middle'>packages/api</text>
  <rect class='d-box' x='290' y='102' width='130' height='44' rx='8'/><text class='d-sub' x='355' y='121' text-anchor='middle'>packages/core</text>
  <text class='d-sub' x='355' y='138' text-anchor='middle'>(shared, symlinked)</text>
  <defs><marker id='d3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Declare globs like <code>"workspaces": ["packages/*"]</code>. Root <code>npm install</code> creates a single <code>node_modules</code>, hoists common deps, and symlinks each workspace into it so <code>api</code> can <code>import</code> <code>core</code> using the local source — no publishing needed. Run a script in one with <code>npm run build -w api</code>, or across all with <code>--workspaces</code>. For big repos, pair workspaces with a task runner (Turborepo, Nx) for caching and orchestration.

### Workspace commands
| Command | Effect |
| --- | --- |
| <code>npm install</code> (root) | install + link all |
| <code>npm run test -w api</code> | run in one workspace |
| <code>npm run build --workspaces</code> | run in all |
| <code>npm install dep -w ui</code> | add dep to one |

> **Interview tip:** Emphasize **local symlinking** (workspaces resolve each other from source) and root-level install/hoisting. Note workspaces handle linking; tools like Turborepo/Nx add build caching.`,
    examples: [
      {
        label: "Root manifest declaring workspaces",
        tech: "javascript",
        runnable: false,
        code: `// root package.json
{
  "name": "monorepo",
  "private": true,
  "workspaces": ["packages/*", "apps/*"]
}
// packages/api can now: import { x } from 'core';  (resolved via symlink)
// run all tests:  npm run test --workspaces`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the package.json \"exports\" field and conditional exports?",
    answer: `**TL;DR.** The <code>"exports"</code> field defines a package's **official public entry points** and **hides everything else** — consumers can no longer deep-import internal files. **Conditional exports** (<code>import</code>, <code>require</code>, <code>types</code>, <code>node</code>, <code>default</code>) resolve **different files per environment**, which is how a package ships dual ESM/CJS builds and types.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='One import resolves to different files by condition'>
  <rect class='d-box-accent' x='20' y='55' width='150' height='44' rx='8'/>
  <text class='d-text' x='95' y='78' text-anchor='middle'>import 'pkg'</text>
  <text class='d-sub' x='95' y='94' text-anchor='middle'>exports map</text>
  <path class='d-edge-accent' d='M172 67 L250 40' marker-end='url(#d4)'/>
  <path class='d-edge' d='M172 80 L250 80' marker-end='url(#d4)'/>
  <path class='d-edge' d='M172 90 L250 118' marker-end='url(#d4)'/>
  <rect class='d-box' x='252' y='24' width='150' height='30' rx='6'/><text class='d-sub' x='327' y='44' text-anchor='middle'>import → esm.js</text>
  <rect class='d-box' x='252' y='64' width='150' height='30' rx='6'/><text class='d-sub' x='327' y='84' text-anchor='middle'>require → cjs.js</text>
  <rect class='d-box' x='252' y='104' width='150' height='30' rx='6'/><text class='d-sub' x='327' y='124' text-anchor='middle'>types → d.ts</text>
  <defs><marker id='d4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Without <code>exports</code>, anyone could <code>require('pkg/lib/internal.js')</code>, coupling to your internals. With it, only the **declared subpaths** resolve; everything else is blocked — true **encapsulation**. The value can be a string, a conditions object, or a subpath map. Node matches conditions **in order**, so put more specific ones (<code>types</code>, <code>import</code>, <code>require</code>) before <code>default</code>. This is the modern replacement for relying solely on <code>"main"</code>.

### Common conditions
| Condition | Picked when |
| --- | --- |
| <code>import</code> | consumer uses ESM <code>import</code> |
| <code>require</code> | consumer uses CJS <code>require</code> |
| <code>types</code> | TypeScript resolves types |
| <code>node</code> / <code>browser</code> | runtime/platform |
| <code>default</code> | fallback (list last) |

> **Interview tip:** Two ideas: <code>exports</code> **encapsulates** (blocks deep imports) and enables **dual-package** (ESM/CJS) resolution. Mention conditions are matched **in order**, so order them specific→default.`,
    examples: [
      {
        label: "Dual ESM/CJS package with types",
        tech: "javascript",
        runnable: false,
        code: `{
  "name": "pkg",
  "exports": {
    ".": {
      "types":   "./dist/index.d.ts",
      "import":  "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "default": "./dist/index.mjs"
    },
    "./package.json": "./package.json"
  }
}
// require('pkg/src/secret.js') now fails — internals are hidden.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you run TypeScript directly in Node.js (native type stripping, tsx, ts-node)?",
    answer: `**TL;DR.** Three ways to run <code>.ts</code> without a separate build step: modern Node can **strip types** at load (no type-checking, fast); **tsx** is a zero-config loader that transpiles on the fly (great for dev); **ts-node** transpiles and can **type-check**. For production, you usually **compile ahead** with <code>tsc</code> or a bundler and run the plain JS.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Options to execute TypeScript in Node'>
  <rect class='d-box-accent' x='15' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='82' y='59' text-anchor='middle'>type stripping</text>
  <text class='d-sub' x='82' y='82' text-anchor='middle'>built-in, fast</text>
  <text class='d-sub' x='82' y='102' text-anchor='middle'>no type check</text>
  <rect class='d-box' x='162' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='229' y='59' text-anchor='middle'>tsx</text>
  <text class='d-sub' x='229' y='82' text-anchor='middle'>esbuild loader</text>
  <text class='d-sub' x='229' y='102' text-anchor='middle'>fast dev runs</text>
  <rect class='d-box' x='309' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='376' y='59' text-anchor='middle'>ts-node</text>
  <text class='d-sub' x='376' y='82' text-anchor='middle'>can type-check</text>
  <text class='d-sub' x='376' y='102' text-anchor='middle'>slower</text>
</svg>

**How it works.** **Type stripping** removes type annotations and runs the result — it never reports type errors, so pair it with a separate <code>tsc --noEmit</code> in CI. **tsx** uses esbuild for very fast transpile-and-run and handles ESM/CJS interop, which makes it popular for scripts and <code>--watch</code> dev loops. **ts-node** integrates the real TypeScript compiler, optionally enforcing types at runtime (slower). None of these are ideal for prod hot paths; compiling to JS once removes per-start transpile cost.

### Pick a tool
| Goal | Use |
| --- | --- |
| Fastest dev run, no checks | native type stripping / tsx |
| Type-checking at run | ts-node |
| Production | precompile with <code>tsc</code>/bundler |
| Watch loop | <code>tsx watch</code> / <code>node --watch</code> |

> **Interview tip:** Make the **type-stripping ≠ type-checking** point explicit: running TS in Node doesn't validate types, so keep a <code>tsc --noEmit</code> gate in CI. Precompile for production.`,
    examples: [
      {
        label: "Three ways to run server.ts",
        tech: "bash",
        runnable: false,
        code: `# 1) Native type stripping (recent Node) — no type checking
node server.ts

# 2) tsx — fast esbuild loader, ideal for dev + watch
npx tsx watch server.ts

# 3) ts-node — uses the real tsc, can type-check
npx ts-node server.ts

# Keep types honest in CI regardless:
npx tsc --noEmit`,
      },
    ],
  },
];

export default augments;
