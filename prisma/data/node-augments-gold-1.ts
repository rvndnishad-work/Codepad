/**
 * Node Phase N3 — Batch 1 (Fundamentals & runtime). Gold-standard rewrites:
 * TL;DR + theme-aware <svg class='iq-diagram'> diagram + GFM table + interview
 * tip + a Node code example. Picked up by `npm run augment:node`.
 *
 * Conventions: SVGs use the shared .iq-diagram helper classes (d-box, d-box-accent,
 * d-box-muted, d-text, d-sub, d-accent, d-edge[-accent][-dashed], d-arrow),
 * single-quoted attrs, and &lt;/&gt; for angle brackets. Inline code uses <code>
 * tags (rendered via rehype-raw) to avoid backtick escaping. Node examples are
 * NOT runnable (no Node playground) → runnable:false, static highlighted.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is Node.js and why is it popular?",
    answer: `**TL;DR.** Node.js is a **runtime** that runs JavaScript outside the browser, built on Chrome's **V8** engine plus **libuv** for non-blocking I/O. Its single-threaded, **event-driven** model handles thousands of concurrent connections cheaply, and "JavaScript everywhere" lets teams share one language across front and back end.

<svg class='iq-diagram' viewBox='0 0 460 200' role='img' aria-label='Node.js is V8 plus libuv plus core libraries running JavaScript on the server'>
  <rect class='d-box-muted' x='20' y='20' width='420' height='160' rx='10'/>
  <text class='d-text' x='40' y='44'>Node.js runtime</text>
  <rect class='d-box-accent' x='40' y='60' width='160' height='50' rx='8'/>
  <text class='d-text' x='120' y='84' text-anchor='middle'>V8 engine</text>
  <text class='d-sub' x='120' y='100' text-anchor='middle'>runs JS, JIT to machine code</text>
  <rect class='d-box-accent' x='260' y='60' width='160' height='50' rx='8'/>
  <text class='d-text' x='340' y='84' text-anchor='middle'>libuv</text>
  <text class='d-sub' x='340' y='100' text-anchor='middle'>event loop + thread pool</text>
  <rect class='d-box' x='40' y='126' width='380' height='38' rx='8'/>
  <text class='d-text' x='230' y='150' text-anchor='middle'>Core modules: http, fs, streams, crypto, net…</text>
</svg>

**How it works.** Node wraps V8 (which compiles and runs the JavaScript) and **libuv** (which provides the event loop and a thread pool for I/O). When you read a file or hit the network, Node hands the work to libuv/the OS and continues; a **callback** fires later when the result is ready. Because no thread blocks waiting on I/O, one process serves huge numbers of concurrent requests. Popularity also comes from **npm** (the largest package registry), a gentle learning curve for JS developers, and excellent fit for real-time and API workloads.

### Why teams pick Node
| Strength | What it buys you |
| --- | --- |
| Non-blocking I/O | high concurrency on one thread |
| One language | shared code/skills front + back |
| npm ecosystem | huge library availability |
| Event-driven | great for realtime / streaming |

> **Interview tip:** Define it crisply — "Node is a server-side JS runtime on V8 + libuv with a non-blocking, event-driven I/O model." Then note its sweet spot (I/O-bound APIs, realtime) and weak spot (CPU-bound work).`,
    examples: [
      {
        label: "A minimal HTTP server in a few lines",
        tech: "javascript",
        runnable: false,
        code: `import { createServer } from 'node:http';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ hello: 'world', url: req.url }));
});

// Non-blocking: one thread, many concurrent connections.
server.listen(3000, () => console.log('Listening on :3000'));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When would you choose Node.js over other backend technologies?",
    answer: `**TL;DR.** Choose Node.js for **I/O-bound, high-concurrency** work — REST/GraphQL APIs, real-time apps (chat, notifications), streaming, and BFF/gateway layers — especially when your team already writes JavaScript. Avoid it for **CPU-bound** number-crunching, where a multi-threaded runtime (Go, Java, Rust) fits better.

<svg class='iq-diagram' viewBox='0 0 460 190' role='img' aria-label='Node.js suits I/O-bound work, struggles with CPU-bound work'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='130' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>Great fit (I/O-bound)</text>
  <text class='d-sub' x='120' y='80' text-anchor='middle'>APIs &amp; microservices</text>
  <text class='d-sub' x='120' y='100' text-anchor='middle'>realtime / WebSockets</text>
  <text class='d-sub' x='120' y='120' text-anchor='middle'>streaming, BFF/gateway</text>
  <text class='d-sub' x='120' y='140' text-anchor='middle'>SSR &amp; serverless</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='130' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>Poor fit (CPU-bound)</text>
  <text class='d-sub' x='340' y='80' text-anchor='middle'>video transcoding</text>
  <text class='d-sub' x='340' y='100' text-anchor='middle'>heavy math / ML</text>
  <text class='d-sub' x='340' y='120' text-anchor='middle'>large in-memory sorts</text>
  <text class='d-sub' x='340' y='140' text-anchor='middle'>(offload to workers/services)</text>
</svg>

**How it works.** Node serves I/O concurrently because the event loop never blocks on a network or disk call. But a long synchronous computation runs on that **same single thread** and stalls every other request — so CPU-heavy work either needs <code>worker_threads</code>, a separate service, or a different runtime. The other big driver is **team velocity**: shared types/validation, one toolchain, and code reuse between browser and server.

### Decision cheatsheet
| Need | Node.js? |
| --- | --- |
| Many concurrent connections, light CPU | ✅ ideal |
| Real-time / streaming | ✅ ideal |
| Shared JS/TS across stack | ✅ ideal |
| Heavy CPU per request | ⚠️ offload or pick Go/Java/Rust |
| Hard real-time / strict latency | ⚠️ consider alternatives |

> **Interview tip:** Frame it as **I/O-bound vs CPU-bound**. Say "Node shines at concurrent I/O and developer velocity; for CPU-bound work I'd use worker threads or a different runtime." That nuance signals seniority.`,
    examples: [
      {
        label: "I/O-bound endpoint: many slow calls, one thread, no blocking",
        tech: "javascript",
        runnable: false,
        code: `// Aggregating 3 upstream APIs concurrently — Node excels here.
app.get('/dashboard', async (req, res) => {
  const [user, orders, feed] = await Promise.all([
    fetch('https://api/users/1').then(r => r.json()),
    fetch('https://api/orders?user=1').then(r => r.json()),
    fetch('https://api/feed').then(r => r.json()),
  ]);
  res.json({ user, orders, feed });
});
// While these I/O calls are in flight, the thread serves other requests.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Describe the Node.js architecture.",
    answer: `**TL;DR.** Node layers **your JS** on top of **V8** (executes JS), **libuv** (event loop + thread pool + async I/O), and **C/C++ bindings** to OS APIs. The single JS thread runs your code and callbacks; libuv offloads blocking work and feeds completed results back through the **event loop**.

<svg class='iq-diagram' viewBox='0 0 460 220' role='img' aria-label='Layered Node.js architecture from JS down to the OS'>
  <rect class='d-box-accent' x='60' y='20' width='340' height='34' rx='8'/>
  <text class='d-text' x='230' y='42' text-anchor='middle'>Your JavaScript + core modules (http, fs…)</text>
  <rect class='d-box' x='60' y='64' width='340' height='34' rx='8'/>
  <text class='d-text' x='230' y='86' text-anchor='middle'>Node bindings (C++) — bridge JS ↔ C libs</text>
  <rect class='d-box-muted' x='60' y='108' width='160' height='44' rx='8'/>
  <text class='d-text' x='140' y='128' text-anchor='middle'>V8</text>
  <text class='d-sub' x='140' y='144' text-anchor='middle'>execute JS</text>
  <rect class='d-box-muted' x='240' y='108' width='160' height='44' rx='8'/>
  <text class='d-text' x='320' y='128' text-anchor='middle'>libuv</text>
  <text class='d-sub' x='320' y='144' text-anchor='middle'>event loop + thread pool</text>
  <rect class='d-box' x='60' y='162' width='340' height='34' rx='8'/>
  <text class='d-text' x='230' y='184' text-anchor='middle'>Operating system (sockets, files, timers)</text>
</svg>

**How it works.** When you call an async API (<code>fs.readFile</code>, a DB query), V8 runs your JS and the C++ binding registers the operation with **libuv**. libuv uses the OS's async facilities (epoll/kqueue/IOCP) where possible, or its **thread pool** for things that have no async OS API (file I/O, DNS, crypto). When the work finishes, libuv queues your callback, and the **event loop** runs it on the single JS thread. So your code is single-threaded, but I/O happens concurrently underneath.

### Layer responsibilities
| Layer | Responsibility |
| --- | --- |
| JS + core modules | your app + standard library |
| C++ bindings | expose libuv/V8 to JS |
| V8 | parse, JIT-compile, run JS |
| libuv | event loop, thread pool, async I/O |
| OS | actual sockets/files/timers |

> **Interview tip:** Stress the split: **V8 runs JS, libuv handles async I/O and the event loop.** Mention the thread pool (default 4) handles work the OS can't do asynchronously (file system, DNS, crypto).`,
    examples: [
      {
        label: "One async call touches every layer",
        tech: "javascript",
        runnable: false,
        code: `import { readFile } from 'node:fs';

console.log('1: sync, runs on JS thread (V8)');

readFile('./data.json', 'utf8', (err, data) => {
  // 4: libuv thread pool finished the read, event loop runs this callback
  console.log('3: callback with file contents');
});

console.log('2: sync, runs before the callback');
// Output order: 1, 2, 3 — the read happened off-thread via libuv.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the role of the V8 JavaScript engine in Node.js?",
    answer: `**TL;DR.** **V8** is Google's open-source JavaScript engine (also in Chrome). In Node it **parses and executes** your JS, **JIT-compiles** hot code to native machine code, and **manages memory/garbage collection**. Node adds the server APIs around it; V8 is the part that actually runs the language.

<svg class='iq-diagram' viewBox='0 0 460 180' role='img' aria-label='V8 pipeline from source to optimized machine code'>
  <rect class='d-box' x='10' y='70' width='90' height='44' rx='8'/>
  <text class='d-text' x='55' y='90' text-anchor='middle'>Source</text>
  <text class='d-sub' x='55' y='106' text-anchor='middle'>JS</text>
  <path class='d-edge-accent' d='M104 92 H134' marker-end='url(#a1)'/>
  <rect class='d-box' x='136' y='70' width='90' height='44' rx='8'/>
  <text class='d-text' x='181' y='90' text-anchor='middle'>Ignition</text>
  <text class='d-sub' x='181' y='106' text-anchor='middle'>bytecode</text>
  <path class='d-edge-accent' d='M230 92 H260' marker-end='url(#a1)'/>
  <rect class='d-box-accent' x='262' y='70' width='90' height='44' rx='8'/>
  <text class='d-text' x='307' y='90' text-anchor='middle'>TurboFan</text>
  <text class='d-sub' x='307' y='106' text-anchor='middle'>optimize hot</text>
  <path class='d-edge-accent' d='M356 92 H386' marker-end='url(#a1)'/>
  <rect class='d-box' x='388' y='70' width='64' height='44' rx='8'/>
  <text class='d-sub' x='420' y='95' text-anchor='middle'>machine</text>
  <text class='d-sub' x='420' y='109' text-anchor='middle'>code</text>
  <defs><marker id='a1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** V8 first compiles JS to **bytecode** (the Ignition interpreter) and starts running it immediately. As functions run repeatedly ("hot"), the **TurboFan** optimizing compiler recompiles them to fast machine code using runtime type feedback; if assumptions break (e.g. a variable's type changes), V8 **deoptimizes** back to bytecode. V8 also owns the **heap** and a generational **garbage collector**. Node exposes some V8 controls (flags like <code>--max-old-space-size</code>, the <code>v8</code> module, heap snapshots).

### V8 at a glance
| Concern | V8's job |
| --- | --- |
| Execution | parse → bytecode → JIT to native |
| Optimization | TurboFan on hot paths, deopt on type change |
| Memory | heap allocation + generational GC |
| Node's part | provide I/O, modules, libuv around V8 |

> **Interview tip:** Say "V8 runs the JavaScript and manages memory; libuv handles async I/O." Bonus points for naming **Ignition (interpreter)** and **TurboFan (optimizer)** and noting JIT relies on stable types.`,
    examples: [
      {
        label: "Reading V8 heap stats and tuning flags",
        tech: "javascript",
        runnable: false,
        code: `import v8 from 'node:v8';

console.log(v8.getHeapStatistics().heap_size_limit / 1024 / 1024, 'MB cap');

// Stable shapes help V8 keep functions optimized (monomorphic):
function area(p) { return p.w * p.h; }     // always {w, h} → stays fast
// Passing differently-shaped objects here would force a deopt.

// Raise the old-space heap limit at launch:
//   node --max-old-space-size=4096 server.js`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the role of `libuv` in Node.js?",
    answer: `**TL;DR.** **libuv** is the C library that gives Node its **event loop**, its **thread pool**, and cross-platform **async I/O**. It abstracts OS primitives (epoll on Linux, kqueue on macOS, IOCP on Windows) and offloads work that has no async OS API onto a small thread pool — this is what makes single-threaded Node non-blocking.

<svg class='iq-diagram' viewBox='0 0 460 200' role='img' aria-label='libuv routes work to OS async I/O or its thread pool'>
  <rect class='d-box-accent' x='170' y='20' width='120' height='40' rx='8'/>
  <text class='d-text' x='230' y='44' text-anchor='middle'>Event loop</text>
  <path class='d-edge' d='M210 60 L120 100' marker-end='url(#a2)'/>
  <path class='d-edge' d='M250 60 L340 100' marker-end='url(#a2)'/>
  <rect class='d-box' x='30' y='102' width='180' height='44' rx='8'/>
  <text class='d-text' x='120' y='122' text-anchor='middle'>OS async I/O</text>
  <text class='d-sub' x='120' y='138' text-anchor='middle'>epoll / kqueue / IOCP (network)</text>
  <rect class='d-box-muted' x='250' y='102' width='180' height='44' rx='8'/>
  <text class='d-text' x='340' y='122' text-anchor='middle'>Thread pool (4)</text>
  <text class='d-sub' x='340' y='138' text-anchor='middle'>fs, dns, crypto, zlib</text>
  <text class='d-sub' x='230' y='180' text-anchor='middle'>callbacks return to the loop when work completes</text>
  <defs><marker id='a2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** For sockets, libuv uses the OS's **event-notification** mechanism so thousands of connections are watched by one thread. For operations the OS can't do asynchronously — file system, DNS lookups (<code>dns.lookup</code>), CPU-bound crypto/compression — libuv uses its **thread pool** (default size 4, set via <code>UV_THREADPOOL_SIZE</code>). When any of these complete, libuv pushes the callback into the appropriate event-loop phase to run on the JS thread.

### What libuv provides
| Capability | Detail |
| --- | --- |
| Event loop | phases: timers, poll, check, close… |
| Thread pool | default 4; <code>UV_THREADPOOL_SIZE</code> |
| Async network I/O | epoll / kqueue / IOCP |
| Extras | timers, signals, child processes |

> **Interview tip:** Correct the myth: "Node isn't *just* single-threaded — libuv runs a thread pool (default 4) for fs, DNS, and crypto." Knowing <code>UV_THREADPOOL_SIZE</code> exists is a strong signal.`,
    examples: [
      {
        label: "The thread pool is shared — size it for crypto/fs heavy apps",
        tech: "bash",
        runnable: false,
        code: `# 4 parallel pbkdf2 hashes saturate the default pool of 4 threads;
# a 5th waits. Raise the pool so they run together:
UV_THREADPOOL_SIZE=8 node server.js

# Network sockets do NOT use the pool (they use epoll/kqueue/IOCP),
# so this mainly helps fs, dns.lookup, crypto, and zlib workloads.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the Node.js event loop.",
    answer: `**TL;DR.** The **event loop** is the heart of Node's concurrency: a single thread that repeatedly runs queued callbacks across ordered **phases** (timers → pending → poll → check → close). Between phases (and after each callback) it drains the **microtask** queues (<code>process.nextTick</code>, then Promises). This lets one thread juggle many async operations without blocking.

<svg class='iq-diagram' viewBox='0 0 460 210' role='img' aria-label='Event loop phases in a cycle'>
  <rect class='d-box-accent' x='160' y='14' width='140' height='34' rx='8'/>
  <text class='d-text' x='230' y='36' text-anchor='middle'>timers</text>
  <text class='d-sub' x='318' y='36'>setTimeout/Interval</text>
  <rect class='d-box' x='160' y='58' width='140' height='34' rx='8'/>
  <text class='d-text' x='230' y='80' text-anchor='middle'>pending callbacks</text>
  <rect class='d-box-accent' x='160' y='102' width='140' height='34' rx='8'/>
  <text class='d-text' x='230' y='124' text-anchor='middle'>poll</text>
  <text class='d-sub' x='318' y='124'>I/O callbacks</text>
  <rect class='d-box' x='160' y='146' width='140' height='34' rx='8'/>
  <text class='d-text' x='230' y='168' text-anchor='middle'>check</text>
  <text class='d-sub' x='318' y='168'>setImmediate</text>
  <rect class='d-box' x='160' y='190' width='140' height='16' rx='6'/>
  <text class='d-sub' x='230' y='202' text-anchor='middle'>close callbacks</text>
  <path class='d-edge-accent' d='M150 30 H120 V200 H150' marker-end='url(#a3)'/>
  <text class='d-sub' x='70' y='115'>loop</text>
  <defs><marker id='a3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Each iteration ("tick") processes one phase's callback queue. The **poll** phase is where most I/O callbacks run and where the loop may **block waiting** for I/O if nothing else is pending. <code>setTimeout</code> callbacks fire in **timers**, <code>setImmediate</code> in **check**. Crucially, after each individual callback the loop empties **microtasks** — first the <code>nextTick</code> queue, then the Promise/<code>queueMicrotask</code> queue — so a flood of microtasks can starve I/O ("event-loop pollution").

### Phase order
| Phase | Runs |
| --- | --- |
| timers | expired <code>setTimeout</code>/<code>setInterval</code> |
| poll | I/O callbacks; may block for I/O |
| check | <code>setImmediate</code> |
| close | <code>'close'</code> events |
| (between) | microtasks: nextTick → Promises |

> **Interview tip:** Two facts win points: microtasks (nextTick/Promises) run **between** every callback, and a synchronous CPU-heavy function **blocks the whole loop**. Don't call the loop "multi-threaded."`,
    examples: [
      {
        label: "Ordering: sync → nextTick → Promise → timers → immediate",
        tech: "javascript",
        runnable: false,
        code: `console.log('1 sync');
setTimeout(() => console.log('5 timeout'), 0);
setImmediate(() => console.log('6 immediate'));
Promise.resolve().then(() => console.log('4 promise'));
process.nextTick(() => console.log('3 nextTick'));
console.log('2 sync');

// 1, 2 (sync) → 3 nextTick → 4 promise (microtasks)
// → 5 timeout / 6 immediate (later phases)`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does the Node.js event loop work?",
    answer: `**TL;DR.** Practically: Node runs your synchronous code first, then enters the **event loop**, which in each tick runs a phase's callbacks and, after *every* callback, drains **microtasks** (<code>process.nextTick</code> → Promises) before moving on. The single thread keeps cycling phases until no timers, I/O, or immediates remain, then exits.

<svg class='iq-diagram' viewBox='0 0 460 180' role='img' aria-label='Macrotask then microtask drain each tick'>
  <rect class='d-box' x='20' y='40' width='150' height='100' rx='10'/>
  <text class='d-text' x='95' y='66' text-anchor='middle'>Macrotask queue</text>
  <text class='d-sub' x='95' y='90' text-anchor='middle'>timers, I/O,</text>
  <text class='d-sub' x='95' y='108' text-anchor='middle'>setImmediate</text>
  <path class='d-edge-accent' d='M172 90 H230' marker-end='url(#a4)'/>
  <text class='d-sub' x='200' y='80' text-anchor='middle'>one at a time</text>
  <rect class='d-box-accent' x='232' y='40' width='150' height='100' rx='10'/>
  <text class='d-text' x='307' y='66' text-anchor='middle'>Microtask drain</text>
  <text class='d-sub' x='307' y='90' text-anchor='middle'>nextTick queue,</text>
  <text class='d-sub' x='307' y='108' text-anchor='middle'>then Promises</text>
  <path class='d-edge-dashed' d='M307 142 V160 H95 V142' marker-end='url(#a4)'/>
  <text class='d-sub' x='200' y='176' text-anchor='middle'>repeat next tick</text>
  <defs><marker id='a4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Think of two tiers: **macrotasks** (one per phase step — a timer, an I/O callback, an immediate) and **microtasks** (nextTick + Promise reactions). The rule: run **one macrotask**, then **fully drain all microtasks**, repeat. That's why a resolved Promise's <code>.then</code> always runs before the next <code>setTimeout</code>. The **poll** phase will block the thread waiting for incoming I/O when there's nothing else to do, which is how an idle server "sleeps" efficiently.

### Tick algorithm
| Step | Action |
| --- | --- |
| 1 | run synchronous top-level code |
| 2 | run next macrotask (current phase) |
| 3 | drain nextTick queue |
| 4 | drain Promise microtasks |
| 5 | go to next callback/phase → repeat |

> **Interview tip:** The killer one-liner: "**one macrotask, then drain all microtasks, repeat.**" It explains nearly every Node ordering puzzle interviewers throw at you.`,
    examples: [
      {
        label: "Microtasks always finish before the next macrotask",
        tech: "javascript",
        runnable: false,
        code: `setTimeout(() => console.log('macro: timeout'), 0);

Promise.resolve()
  .then(() => console.log('micro 1'))
  .then(() => console.log('micro 2'));   // chained microtasks

// Output: micro 1, micro 2, then "macro: timeout"
// Both microtasks drain before the loop advances to the timer phase.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between blocking and non-blocking I/O in Node.js?",
    answer: `**TL;DR.** **Blocking** I/O makes the thread **wait** until the operation completes (e.g. <code>fs.readFileSync</code>) — nothing else runs meanwhile. **Non-blocking** I/O **returns immediately** and notifies you later via a callback/Promise (e.g. <code>fs.readFile</code>, <code>fs.promises.readFile</code>), letting the single thread serve other work while the OS/libuv does the I/O.

<svg class='iq-diagram' viewBox='0 0 460 200' role='img' aria-label='Blocking waits inline, non-blocking continues and gets a callback'>
  <text class='d-text' x='115' y='28' text-anchor='middle'>Blocking</text>
  <rect class='d-box' x='30' y='40' width='170' height='30' rx='6'/>
  <text class='d-sub' x='115' y='60' text-anchor='middle'>read… (thread frozen)</text>
  <rect class='d-box-muted' x='30' y='76' width='170' height='28' rx='6'/>
  <text class='d-sub' x='115' y='95' text-anchor='middle'>next task (waits)</text>
  <text class='d-text' x='345' y='28' text-anchor='middle'>Non-blocking</text>
  <rect class='d-box-accent' x='260' y='40' width='170' height='28' rx='6'/>
  <text class='d-sub' x='345' y='59' text-anchor='middle'>start read → return now</text>
  <rect class='d-box' x='260' y='72' width='170' height='28' rx='6'/>
  <text class='d-sub' x='345' y='91' text-anchor='middle'>do other work</text>
  <rect class='d-box-accent' x='260' y='112' width='170' height='28' rx='6'/>
  <text class='d-sub' x='345' y='131' text-anchor='middle'>callback fires when ready</text>
  <text class='d-sub' x='230' y='180' text-anchor='middle'>Non-blocking keeps the single thread busy serving others</text>
</svg>

**How it works.** Synchronous (<code>...Sync</code>) functions run the work on the JS thread and block it; in a server, one blocking call freezes **all** concurrent requests. Asynchronous functions hand the work to libuv/OS and let the event loop continue; the result comes back later. Use sync APIs only at **startup** (loading config) or in scripts — never in a request handler.

### Blocking vs non-blocking
| | Blocking | Non-blocking |
| --- | --- | --- |
| Example | <code>readFileSync</code> | <code>readFile</code> / promises |
| Thread | waits | continues |
| Concurrency | ❌ stalls all requests | ✅ serves others |
| Use when | startup, CLI scripts | request handlers |

> **Interview tip:** Emphasize the cost in a server: a single <code>...Sync</code> call in a hot path **blocks every other request** because there's one thread. Reserve sync I/O for boot-time only.`,
    examples: [
      {
        label: "Same read, blocking vs non-blocking",
        tech: "javascript",
        runnable: false,
        code: `import { readFileSync, readFile } from 'node:fs';

// Blocking: thread frozen until the file is read
const cfg = readFileSync('./config.json', 'utf8');   // OK at startup

// Non-blocking: returns immediately, callback later
readFile('./data.json', 'utf8', (err, data) => {
  if (err) throw err;
  console.log('got data while the thread served other work');
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does the thread pool work in Node.js?",
    answer: `**TL;DR.** libuv keeps a small **thread pool** (default **4**, set via <code>UV_THREADPOOL_SIZE</code>, max 1024) to run operations that have **no async OS API** — file system, <code>dns.lookup</code>, and CPU-bound <code>crypto</code>/<code>zlib</code>. Network sockets do **not** use it. When a pool thread finishes, it queues your callback back onto the event loop.

<svg class='iq-diagram' viewBox='0 0 460 190' role='img' aria-label='Tasks queue into a fixed-size libuv thread pool'>
  <rect class='d-box-accent' x='20' y='70' width='110' height='44' rx='8'/>
  <text class='d-text' x='75' y='90' text-anchor='middle'>Event loop</text>
  <text class='d-sub' x='75' y='106' text-anchor='middle'>dispatches</text>
  <path class='d-edge-accent' d='M132 92 H170' marker-end='url(#a5)'/>
  <rect class='d-box-muted' x='172' y='40' width='150' height='110' rx='10'/>
  <text class='d-text' x='247' y='60' text-anchor='middle'>Thread pool (4)</text>
  <rect class='d-box' x='186' y='72' width='56' height='24' rx='4'/><text class='d-sub' x='214' y='89' text-anchor='middle'>T1</text>
  <rect class='d-box' x='252' y='72' width='56' height='24' rx='4'/><text class='d-sub' x='280' y='89' text-anchor='middle'>T2</text>
  <rect class='d-box' x='186' y='104' width='56' height='24' rx='4'/><text class='d-sub' x='214' y='121' text-anchor='middle'>T3</text>
  <rect class='d-box' x='252' y='104' width='56' height='24' rx='4'/><text class='d-sub' x='280' y='121' text-anchor='middle'>T4</text>
  <path class='d-edge' d='M324 95 H360' marker-end='url(#a5)'/>
  <rect class='d-box' x='362' y='72' width='80' height='44' rx='8'/>
  <text class='d-sub' x='402' y='90' text-anchor='middle'>fs / dns</text>
  <text class='d-sub' x='402' y='106' text-anchor='middle'>crypto / zlib</text>
  <defs><marker id='a5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** When you call, say, <code>crypto.pbkdf2</code> (async), libuv assigns it to a free pool thread. With only 4 threads, the **5th** concurrent task **waits** until one frees up — a hidden bottleneck for crypto- or fs-heavy services. Raising <code>UV_THREADPOOL_SIZE</code> (ideally near your core count for CPU-bound pool work) increases parallelism. Sockets bypass all this via the OS event-notification system, so HTTP throughput isn't limited by the pool.

### Pool vs not
| Uses thread pool | Does NOT |
| --- | --- |
| <code>fs.*</code> (file system) | TCP/HTTP sockets |
| <code>dns.lookup</code> | <code>dns.resolve*</code> (uses network) |
| async <code>crypto</code> (pbkdf2, scrypt) | timers |
| <code>zlib</code> (gzip/brotli) | — |

> **Interview tip:** Two gotchas score points: the pool default is **4** (tunable via <code>UV_THREADPOOL_SIZE</code>), and **<code>dns.lookup</code> uses the pool** while <code>dns.resolve</code> doesn't — a classic latency surprise.`,
    examples: [
      {
        label: "Saturating the pool",
        tech: "javascript",
        runnable: false,
        code: `import crypto from 'node:crypto';

console.time('hash');
// 4 finish together; the 5th starts only after a thread frees up.
for (let i = 0; i < 5; i++) {
  crypto.pbkdf2('pw', 'salt', 1e6, 64, 'sha512', () => {
    console.timeLog('hash', 'done', i);
  });
}
// Run with UV_THREADPOOL_SIZE=5 to let all five run in parallel.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you achieve concurrency in Node.js since it's single-threaded?",
    answer: `**TL;DR.** Node's JS runs on one thread, but it achieves **concurrency** three ways: (1) **non-blocking I/O** via the event loop + libuv (the everyday model), (2) **worker_threads** for CPU-bound work in the same process, and (3) **child_process / cluster** to run multiple processes across CPU cores. Pick based on whether the bottleneck is **I/O** or **CPU**.

<svg class='iq-diagram' viewBox='0 0 460 190' role='img' aria-label='Three concurrency strategies in Node'>
  <rect class='d-box-accent' x='15' y='40' width='135' height='120' rx='10'/>
  <text class='d-text' x='82' y='64' text-anchor='middle'>Event loop</text>
  <text class='d-sub' x='82' y='86' text-anchor='middle'>non-blocking I/O</text>
  <text class='d-sub' x='82' y='104' text-anchor='middle'>libuv thread pool</text>
  <text class='d-sub' x='82' y='130' text-anchor='middle'>best for</text>
  <text class='d-sub' x='82' y='146' text-anchor='middle'>I/O-bound</text>
  <rect class='d-box' x='162' y='40' width='135' height='120' rx='10'/>
  <text class='d-text' x='229' y='64' text-anchor='middle'>worker_threads</text>
  <text class='d-sub' x='229' y='86' text-anchor='middle'>extra JS threads</text>
  <text class='d-sub' x='229' y='104' text-anchor='middle'>shared memory</text>
  <text class='d-sub' x='229' y='130' text-anchor='middle'>best for</text>
  <text class='d-sub' x='229' y='146' text-anchor='middle'>CPU-bound</text>
  <rect class='d-box' x='309' y='40' width='135' height='120' rx='10'/>
  <text class='d-text' x='376' y='64' text-anchor='middle'>cluster / procs</text>
  <text class='d-sub' x='376' y='86' text-anchor='middle'>many processes</text>
  <text class='d-sub' x='376' y='104' text-anchor='middle'>own memory</text>
  <text class='d-sub' x='376' y='130' text-anchor='middle'>best for</text>
  <text class='d-sub' x='376' y='146' text-anchor='middle'>scale across cores</text>
</svg>

**How it works.** For typical servers, the event loop already gives you concurrency: while one request waits on a DB call, the thread serves others. When a request does **heavy computation**, it would block that loop — so you move it to a **worker thread** (shares memory via <code>SharedArrayBuffer</code>, communicates via messages) or a **child process**. To use all cores under load, run multiple instances with the **cluster** module or a process manager and let the OS/load balancer spread connections.

### Which tool?
| Bottleneck | Use |
| --- | --- |
| Network/disk waits | event loop (default) |
| CPU per request | <code>worker_threads</code> |
| Scale across cores | <code>cluster</code> / PM2 / replicas |
| Isolated/other-language task | <code>child_process</code> |

> **Interview tip:** Lead with the distinction: "**concurrency ≠ parallelism**." The event loop gives concurrency for I/O; for true CPU parallelism you need worker threads or multiple processes.`,
    examples: [
      {
        label: "Offload CPU work to a worker so the loop stays free",
        tech: "javascript",
        runnable: false,
        code: `import { Worker } from 'node:worker_threads';

function runHeavy(n) {
  return new Promise((resolve, reject) => {
    const w = new Worker('./fib-worker.js', { workerData: n });
    w.once('message', resolve);
    w.once('error', reject);
  });
}

// The event loop keeps handling requests while the worker computes.
const result = await runHeavy(45);`,
      },
    ],
  },
];

export default augments;
