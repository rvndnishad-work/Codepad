/**
 * Node Phase N3 — Batch 14 (DI, project structure, debugging & core modules).
 * Final batch. See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain 'dependency injection' and how it can be used in Node.js.",
    answer: `**TL;DR.** **Dependency injection (DI)** means a module receives its **collaborators from outside** (constructor/parameters) instead of creating them itself. This **decouples** code, makes it **testable** (inject mocks/fakes), and centralizes wiring. In Node you often do DI **manually** (pass deps in) or with a container (Awilix, NestJS, tsyringe).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Dependencies injected into a service rather than created inside it'>
  <rect class='d-box-muted' x='20' y='40' width='110' height='28' rx='6'/><text class='d-sub' x='75' y='59' text-anchor='middle'>db</text>
  <rect class='d-box-muted' x='20' y='74' width='110' height='28' rx='6'/><text class='d-sub' x='75' y='93' text-anchor='middle'>logger</text>
  <rect class='d-box-muted' x='20' y='108' width='110' height='28' rx='6'/><text class='d-sub' x='75' y='127' text-anchor='middle'>mailer</text>
  <path class='d-edge-accent' d='M132 54 L200 75' marker-end='url(#n1)'/>
  <path class='d-edge-accent' d='M132 88 H200' marker-end='url(#n1)'/>
  <path class='d-edge-accent' d='M132 122 L200 101' marker-end='url(#n1)'/>
  <rect class='d-box-accent' x='202' y='60' width='140' height='56' rx='10'/><text class='d-text' x='272' y='84' text-anchor='middle'>UserService</text><text class='d-sub' x='272' y='102' text-anchor='middle'>uses injected deps</text>
  <defs><marker id='n1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Without DI, a class <code>new</code>s up its database/logger internally — hard-coding the dependency, so you can't substitute a fake in tests or a different implementation in another environment. With DI you **pass** those in (constructor injection is the common form), so the class depends on an **abstraction** it's given. This follows the **dependency-inversion** principle and yields obvious benefits: unit-test by injecting stubs, swap implementations (real vs in-memory repo) per environment, and wire everything in one **composition root** (e.g. <code>main.js</code>). In plain Node, manual injection is often enough; for larger apps a **DI container** resolves graphs and lifetimes for you (NestJS builds this in with decorators; Awilix/tsyringe are standalone). Avoid the **service-locator** anti-pattern (reaching into a global container) — prefer explicit injection.

### DI benefits
| Benefit | How |
| --- | --- |
| testability | inject mocks/fakes |
| decoupling | depend on abstractions |
| swappable impls | per-environment wiring |
| one composition root | centralized setup |

> **Interview tip:** Define DI as **"dependencies given, not created,"** tie it to **dependency inversion + testability**, and note Node often does **manual constructor injection**; containers (Awilix/NestJS) help at scale. Avoid service-locator.`,
    examples: [
      {
        label: "Manual constructor injection",
        tech: "javascript",
        runnable: false,
        code: `class UserService {
  constructor({ repo, mailer, logger }) {  // deps injected
    this.repo = repo; this.mailer = mailer; this.logger = logger;
  }
  async register(data) {
    const u = await this.repo.save(data);
    await this.mailer.send(u.email, 'welcome');
    return u;
  }
}
// composition root wires real deps; tests pass fakes:
const svc = new UserService({ repo: new PgUserRepo(), mailer, logger });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are some best practices for structuring a Node.js project?",
    answer: `**TL;DR.** Organize by **feature/domain**, separate **layers** (routes/controllers → services → data access), keep **config in the environment**, centralize **error handling**, and isolate the **app** from the **server** (for testing). Favor small modules with single responsibilities over one giant file.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Layered structure: routes to services to repositories'>
  <rect class='d-box-accent' x='40' y='25' width='380' height='28' rx='6'/><text class='d-text' x='230' y='44' text-anchor='middle'>routes / controllers (HTTP)</text>
  <path class='d-edge-accent' d='M230 53 V63' marker-end='url(#n2)'/>
  <rect class='d-box' x='80' y='65' width='300' height='28' rx='6'/><text class='d-text' x='230' y='84' text-anchor='middle'>services (business logic)</text>
  <path class='d-edge-accent' d='M230 93 V103' marker-end='url(#n2)'/>
  <rect class='d-box-muted' x='120' y='105' width='220' height='28' rx='6'/><text class='d-text' x='230' y='124' text-anchor='middle'>repositories / data access</text>
  <defs><marker id='n2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A maintainable layout separates **concerns**: thin **controllers/routes** handle HTTP (parse, validate, respond) and delegate to **services** that hold business logic, which use **repositories/data-access** for persistence — so logic isn't tangled with Express or SQL and is easy to test. Group code by **feature/domain** (a <code>users/</code> folder with its routes/service/repo) rather than by technical type once the app grows, keeping related things together. Centralize cross-cutting concerns: one **error-handling** middleware, a single **config** module reading <code>process.env</code>, shared **logging**. Separate the Express **app** (exported) from the **server** that calls <code>listen()</code>, so tests can import the app with supertest. Keep modules small and cohesive, avoid circular dependencies, and put env-specific values in the environment, not code. Add lint/format/typecheck and a consistent folder convention the team agrees on.

### Structure principles
| Principle | Practice |
| --- | --- |
| layering | controller → service → repo |
| feature folders | group by domain |
| centralize | errors, config, logging |
| app ≠ server | testable with supertest |

> **Interview tip:** Emphasize **layered separation** (HTTP vs business vs data) and **feature-based folders**, plus splitting **app from server** for tests and **centralized error/config** — concrete structure beats "keep it clean."`,
    examples: [
      {
        label: "App separated from server",
        tech: "javascript",
        runnable: false,
        code: `// app.js — wiring only, exported for tests
export const app = express();
app.use('/users', usersRouter);          // routes → services → repos
app.use(errorHandler);                    // centralized errors

// server.js — the only place that binds a port
import { app } from './app.js';
app.listen(process.env.PORT ?? 3000);
// tests:  request(app).get('/users')  — no real network needed`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How can you debug a Node.js application?",
    answer: `**TL;DR.** Use the built-in **inspector**: launch with <code>node --inspect</code> (or <code>--inspect-brk</code>) and connect **Chrome DevTools** or your **IDE** (VS Code) for breakpoints, stepping, watches, and the console. Beyond that: structured **logging**, the <code>debug</code> namespace lib, CPU/heap **profiling**, and <code>node --inspect</code> for production triage.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Node inspector exposes a debug protocol to DevTools/IDE'>
  <rect class='d-box-accent' x='20' y='52' width='150' height='46' rx='8'/><text class='d-text' x='95' y='73' text-anchor='middle'>node --inspect</text><text class='d-sub' x='95' y='90' text-anchor='middle'>inspector protocol</text>
  <path class='d-edge-accent' d='M172 75 H230' marker-end='url(#n3)'/>
  <rect class='d-box' x='232' y='35' width='150' height='34' rx='8'/><text class='d-sub' x='307' y='56' text-anchor='middle'>Chrome DevTools</text>
  <rect class='d-box' x='232' y='80' width='150' height='34' rx='8'/><text class='d-sub' x='307' y='101' text-anchor='middle'>VS Code debugger</text>
  <defs><marker id='n3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>--inspect</code> opens the **V8 Inspector** (a WebSocket on 9229) that speaks the Chrome DevTools Protocol; <code>--inspect-brk</code> pauses on the first line so you can set breakpoints before code runs. Connect via <code>chrome://inspect</code> or VS Code's built-in debugger (it can auto-attach), then use breakpoints, step in/over/out, inspect scopes, evaluate expressions, and view async stack traces. For lighter needs, the <code>debug</code> package gives namespaced, env-toggled logs (<code>DEBUG=app:* node ...</code>); structured logging captures production behavior. The **same inspector** powers profiling — CPU profiles, heap snapshots — and can be enabled on a running prod process (carefully, it's a security surface). For crashes, read stack traces, enable <code>--trace-warnings</code>/<code>--trace-uncaught</code>, and use core dumps (<code>--report-on-fatalerror</code>) for post-mortem.

### Debugging toolkit
| Tool | Use |
| --- | --- |
| <code>--inspect</code>/<code>--inspect-brk</code> | breakpoints in DevTools/IDE |
| VS Code debugger | step, watch, scopes |
| <code>debug</code> / logging | trace flow |
| profiling/snapshots | CPU + memory issues |

> **Interview tip:** Lead with the **V8 inspector** (<code>--inspect</code> → DevTools/VS Code, <code>--inspect-brk</code> to pause at start) over <code>console.log</code>, and mention it doubles as the **profiling** entry point and can attach to **production** carefully.`,
    examples: [
      {
        label: "Launch with the inspector + namespaced logs",
        tech: "bash",
        runnable: false,
        code: `# Pause on first line, attach DevTools (chrome://inspect) or VS Code:
node --inspect-brk server.js

# Attach to a running process for live triage:
kill -SIGUSR1 <pid>     # opens the inspector on that process

# Lightweight tracing without a debugger:
DEBUG=app:* node server.js`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the concept of REPL in Node.js",
    answer: `**TL;DR.** **REPL** = **Read-Eval-Print Loop**: an interactive shell that **reads** an expression, **evaluates** it, **prints** the result, and **loops**. Start it by running <code>node</code> with no file. It's great for quickly trying APIs, inspecting values, and prototyping; you can also build **custom REPLs** with the <code>repl</code> module.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Read evaluate print loop cycle'>
  <rect class='d-box-accent' x='30' y='60' width='80' height='38' rx='8'/><text class='d-text' x='70' y='84' text-anchor='middle'>Read</text>
  <path class='d-edge-accent' d='M112 79 H148' marker-end='url(#n4)'/>
  <rect class='d-box' x='150' y='60' width='80' height='38' rx='8'/><text class='d-text' x='190' y='84' text-anchor='middle'>Eval</text>
  <path class='d-edge-accent' d='M232 79 H268' marker-end='url(#n4)'/>
  <rect class='d-box' x='270' y='60' width='80' height='38' rx='8'/><text class='d-text' x='310' y='84' text-anchor='middle'>Print</text>
  <path class='d-edge-accent' d='M352 79 H388' marker-end='url(#n4)'/>
  <rect class='d-box-accent' x='390' y='60' width='60' height='38' rx='8'/><text class='d-text' x='420' y='84' text-anchor='middle'>Loop</text>
  <path class='d-edge-dashed' d='M420 60 C420 30 70 30 70 58' marker-end='url(#n4)'/>
  <defs><marker id='n4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Typing <code>node</code> drops you into the REPL where each line is parsed, executed in a persistent context (variables persist across lines), and the result auto-printed. It has handy features: <code>_</code> holds the last result, tab-completion, multiline editing, and **dot commands** (<code>.help</code>, <code>.load file.js</code>, <code>.save</code>, <code>.editor</code>, <code>.exit</code>). You can <code>require</code> modules and poke at them interactively — ideal for exploring an API or debugging a snippet. The <code>repl</code> module lets you **embed** a custom REPL into your app (e.g. an admin console with your services pre-loaded into its context), controlling the prompt, evaluator, and available globals. It's a developer convenience, not something you expose in production network-facing.

### REPL features
| Feature | Use |
| --- | --- |
| persistent context | variables persist |
| <code>_</code> | last result |
| dot commands | <code>.load</code>/<code>.save</code>/<code>.editor</code> |
| <code>repl</code> module | embed custom REPL |

> **Interview tip:** Expand the acronym (**Read-Eval-Print Loop**), mention <code>_</code> and dot commands, and that the <code>repl</code> module lets you build **app-specific consoles** with your modules pre-loaded.`,
    examples: [
      {
        label: "Interactive session + a custom REPL",
        tech: "javascript",
        runnable: false,
        code: `// $ node
// > const x = 21
// > x * 2
// 42
// > _            // last result
// 42

// Embed a custom REPL with context pre-loaded:
import repl from 'node:repl';
const r = repl.start('app> ');
r.context.db = db;           // now you can use 'db' in the prompt`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the assert module in Node.js?",
    answer: `**TL;DR.** <code>node:assert</code> provides **assertion** functions that throw an <code>AssertionError</code> when a condition is false. It's the foundation for **tests** (used by <code>node:test</code>) and for enforcing **invariants** in code. Prefer the **strict** mode (<code>node:assert/strict</code>) so comparisons use <code>===</code> semantics.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Assertion passes silently or throws AssertionError'>
  <rect class='d-box-accent' x='20' y='52' width='150' height='46' rx='8'/><text class='d-text' x='95' y='73' text-anchor='middle'>assert(condition)</text><text class='d-sub' x='95' y='90' text-anchor='middle'>check invariant</text>
  <path class='d-edge-accent' d='M172 65 H230' marker-end='url(#n5)'/>
  <path class='d-edge-dashed' d='M172 85 H230' marker-end='url(#n5)'/>
  <rect class='d-box' x='232' y='44' width='100' height='28' rx='6'/><text class='d-sub' x='282' y='63' text-anchor='middle'>true → pass</text>
  <rect class='d-box-muted' x='232' y='78' width='150' height='28' rx='6'/><text class='d-sub' x='307' y='97' text-anchor='middle'>false → AssertionError</text>
  <defs><marker id='n5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Each helper checks a condition and throws if it fails: <code>assert.equal</code>/<code>strictEqual</code>, <code>deepStrictEqual</code> (recursive structural equality), <code>throws</code>/<code>rejects</code> (expect an error), <code>match</code>, and the bare <code>assert(value)</code> (truthiness). The **legacy** API uses loose <code>==</code>; <code>node:assert/strict</code> uses <code>===</code> and is what you should use to avoid coercion surprises. In **tests**, assertions express expected outcomes (and integrate with the test runner's reporting). In **production code**, assertions can guard **invariants** ("this should never be null") — but since they throw and can crash, use them for true programmer-error conditions, not for validating user input (use schema validation for that). It's a zero-dependency way to add safety checks.

### Common assertions
| Helper | Checks |
| --- | --- |
| <code>strictEqual</code> | <code>===</code> equality |
| <code>deepStrictEqual</code> | structural equality |
| <code>throws</code>/<code>rejects</code> | error is thrown |
| <code>ok</code> / <code>assert(x)</code> | truthiness |

> **Interview tip:** Recommend **<code>assert/strict</code>** (avoids <code>==</code> coercion), note it's the basis of <code>node:test</code>, and that asserts guard **invariants/programmer errors** — not user input, which needs validation.`,
    examples: [
      {
        label: "Strict assertions in a test",
        tech: "javascript",
        runnable: false,
        code: `import assert from 'node:assert/strict';

assert.equal(2 + 2, 4);
assert.deepStrictEqual({ a: [1, 2] }, { a: [1, 2] });   // structural
assert.throws(() => JSON.parse('{bad}'), SyntaxError);

// guarding an invariant in code:
function area({ w, h }) { assert(w > 0 && h > 0, 'dims must be positive'); return w * h; }`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the use of the 'os' module in Node.js?",
    answer: `**TL;DR.** <code>node:os</code> exposes **operating-system information**: CPU cores (<code>os.cpus()</code>), total/free **memory**, **platform**/architecture, **hostname**, **network interfaces**, uptime, load average, the temp dir, and the EOL/path separators. It's used for **scaling decisions**, diagnostics, and writing **cross-platform** code.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='os module surfaces CPU, memory, platform and network info'>
  <rect class='d-box-accent' x='160' y='55' width='140' height='44' rx='8'/><text class='d-text' x='230' y='81' text-anchor='middle'>node:os</text>
  <path class='d-edge-accent' d='M200 55 L120 30' marker-end='url(#n6)'/>
  <path class='d-edge-accent' d='M260 55 L340 30' marker-end='url(#n6)'/>
  <path class='d-edge-accent' d='M200 99 L120 124' marker-end='url(#n6)'/>
  <path class='d-edge-accent' d='M260 99 L340 124' marker-end='url(#n6)'/>
  <rect class='d-box-muted' x='30' y='16' width='100' height='26' rx='6'/><text class='d-sub' x='80' y='34' text-anchor='middle'>cpus()</text>
  <rect class='d-box-muted' x='330' y='16' width='110' height='26' rx='6'/><text class='d-sub' x='385' y='34' text-anchor='middle'>freemem()</text>
  <rect class='d-box-muted' x='30' y='110' width='100' height='26' rx='6'/><text class='d-sub' x='80' y='128' text-anchor='middle'>platform()</text>
  <rect class='d-box-muted' x='330' y='110' width='110' height='26' rx='6'/><text class='d-sub' x='385' y='128' text-anchor='middle'>hostname()</text>
  <defs><marker id='n6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The module reports facts about the host the process runs on. A classic use is reading <code>os.cpus().length</code> to decide how many **cluster** workers or **worker-thread pool** members to spawn (one per core). <code>os.totalmem()/freemem()</code> and <code>os.loadavg()</code> help with diagnostics and adaptive behavior; <code>os.platform()</code>/<code>os.arch()</code> let you branch on environment; <code>os.tmpdir()</code>, <code>os.homedir()</code>, and <code>os.EOL</code> keep code **cross-platform** (don't hard-code <code>/tmp</code> or <code>\\n</code>). Note that in **containers** these often reflect the **host** rather than the cgroup limits, so <code>os.cpus().length</code> may overcount available CPU — read cgroup limits or <code>libuv</code>/<code>availableParallelism()</code> when sizing pools in containers.

### Useful os calls
| Call | Returns |
| --- | --- |
| <code>os.cpus()</code> | core info (sizing) |
| <code>os.totalmem/freemem</code> | memory |
| <code>os.platform/arch</code> | OS/CPU type |
| <code>os.tmpdir/EOL</code> | portable paths/newlines |

> **Interview tip:** Most-cited use: **<code>os.cpus().length</code> to size cluster/worker pools**. Add the container caveat — it may report **host** CPUs, so prefer cgroup-aware sizing (<code>os.availableParallelism()</code>).`,
    examples: [
      {
        label: "Size workers to cores; portable temp path",
        tech: "javascript",
        runnable: false,
        code: `import os from 'node:os';
import path from 'node:path';

const workers = os.availableParallelism?.() ?? os.cpus().length;  // cgroup-aware
console.log(\`spawning \${workers} workers on \${os.platform()}/\${os.arch()}\`);

const tmpFile = path.join(os.tmpdir(), 'upload.tmp');   // portable, not '/tmp'`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the 'zlib' module in Node.js?",
    answer: `**TL;DR.** <code>node:zlib</code> provides **compression and decompression** — gzip, deflate, and **brotli** — as one-shot helpers and as **streams** you pipe through. Use it to shrink HTTP responses, compress stored data/backups, and read/write <code>.gz</code> files. CPU-heavy work is offloaded to the **libuv thread pool**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Data piped through gzip transform becomes smaller'>
  <rect class='d-box' x='20' y='52' width='110' height='46' rx='8'/><text class='d-sub' x='75' y='79' text-anchor='middle'>read stream</text>
  <path class='d-edge-accent' d='M132 75 H180' marker-end='url(#n7)'/>
  <rect class='d-box-accent' x='182' y='45' width='120' height='58' rx='10'/><text class='d-text' x='242' y='69' text-anchor='middle'>createGzip()</text><text class='d-sub' x='242' y='87' text-anchor='middle'>Transform</text>
  <path class='d-edge-accent' d='M304 75 H352' marker-end='url(#n7)'/>
  <rect class='d-box-muted' x='354' y='52' width='90' height='46' rx='8'/><text class='d-sub' x='399' y='79' text-anchor='middle'>smaller out</text>
  <defs><marker id='n7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** zlib offers both **buffer** APIs (<code>zlib.gzip</code>/<code>gunzip</code>, sync and async) for small blobs and **stream** APIs (<code>createGzip</code>, <code>createGunzip</code>, <code>createBrotliCompress</code>) that are **Transform** streams — so you <code>pipeline()</code> them between a source and destination for **constant-memory** compression of large data. Prefer the **async/stream** forms in servers because compression is CPU-bound and the sync variants block the event loop. **gzip/deflate** are fast and ubiquitous; **brotli** compresses smaller (great for pre-compressing static assets) but costs more CPU, so it's often used at build time or behind a CDN. Common uses: HTTP response compression (usually via the <code>compression</code> middleware which wraps zlib), compressing logs/backups, and handling gzipped uploads/downloads. Don't re-compress already-compressed media.

### zlib at a glance
| API | Use |
| --- | --- |
| <code>gzip/gunzip</code> (buffer) | small blobs |
| <code>createGzip</code> (stream) | large data, pipeline |
| brotli (<code>createBrotliCompress</code>) | best ratio, more CPU |
| thread pool | async = non-blocking |

> **Interview tip:** Stress **streaming for large data** (constant memory) and **async to avoid blocking** the loop, plus the **brotli vs gzip** ratio/CPU trade-off. Note it underpins HTTP compression middleware.`,
    examples: [
      {
        label: "Stream-compress a file to .gz",
        tech: "javascript",
        runnable: false,
        code: `import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

await pipeline(
  createReadStream('app.log'),
  createGzip({ level: 9 }),
  createWriteStream('app.log.gz'),
);  // constant memory, non-blocking (thread pool)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the 'vm' (Virtual Machine) module and when would you use it?",
    answer: `**TL;DR.** <code>node:vm</code> compiles and runs JavaScript in a **separate V8 context** with its **own global object**, so the code doesn't see your module scope. It's useful for **isolating** dynamic code (templating, plugins, REPLs, config DSLs) — but it is **NOT a security sandbox** on its own; untrusted code can still escape and reach the host.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='vm runs code in a separate context with its own globals'>
  <rect class='d-box-accent' x='20' y='40' width='180' height='80' rx='10'/><text class='d-text' x='110' y='64' text-anchor='middle'>host context</text><text class='d-sub' x='110' y='86' text-anchor='middle'>your app + require/process</text>
  <path class='d-edge-dashed' d='M202 80 H262' marker-end='url(#n8)'/>
  <rect class='d-box-muted' x='264' y='40' width='176' height='80' rx='10'/><text class='d-text' x='352' y='64' text-anchor='middle'>vm context</text><text class='d-sub' x='352' y='86' text-anchor='middle'>own globals, limited sandbox</text>
  <defs><marker id='n8' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>vm.createContext(sandbox)</code> turns an object into a fresh global scope; <code>vm.runInContext(code, ctx)</code> (or <code>new vm.Script(code).runInContext</code>) executes code against it, so the script sees only the globals you expose — handy for evaluating templates, user-defined expressions/rules, building custom REPLs, or running config as code. You can set a **timeout** to stop runaway loops. The crucial caveat: vm is for **isolation of scope, not security**. Untrusted code can break out — e.g. via <code>this.constructor.constructor('return process')()</code> reaching the real <code>process</code> — so never treat vm as a safe boundary for hostile input. For genuinely untrusted code use a **real sandbox**: a separate **process/container** with OS limits, the **permission model**, or the <code>isolated-vm</code> library (separate V8 isolates with memory/time caps). Within trusted code, vm is a clean way to scope dynamic evaluation.

### vm uses & limits
| Use | Caveat |
| --- | --- |
| templating / DSLs | trusted code only |
| custom REPL / plugins | scope isolation |
| timeouts on loops | not a security wall |
| untrusted code | use isolated-vm / separate process |

> **Interview tip:** The key correction: **vm isolates scope, not security** — untrusted code can escape (<code>constructor.constructor</code> trick). For hostile input use **isolated-vm** or a **separate process/container**.`,
    examples: [
      {
        label: "Run code in an isolated context with a timeout",
        tech: "javascript",
        runnable: false,
        code: `import vm from 'node:vm';

const sandbox = { result: null, input: 21 };   // only these globals are visible
vm.createContext(sandbox);
vm.runInContext('result = input * 2', sandbox, { timeout: 50 });
console.log(sandbox.result);                    // 42

// ⚠ NOT safe for untrusted code — it can escape to the host.
// For that, use isolated-vm or a separate process/container.`,
      },
    ],
  },
];

export default augments;
