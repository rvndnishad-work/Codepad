/**
 * Node Phase N3 — Batch 7 (Child processes, workers & concurrency).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the differences between fork(), spawn(), and exec() in the child_process module.",
    answer: `**TL;DR.** All three create **child processes** but differ in I/O and intent. <code>spawn</code> launches a process and **streams** its output (great for large/long output). <code>exec</code> runs a command **in a shell** and **buffers** the whole output to a callback (good for short commands). <code>fork</code> is a specialized <code>spawn</code> for **Node modules**, adding an **IPC channel** for message passing.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='spawn streams, exec buffers, fork adds IPC'>
  <rect class='d-box-accent' x='15' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='82' y='59' text-anchor='middle'>spawn</text>
  <text class='d-sub' x='82' y='82' text-anchor='middle'>streams stdout</text>
  <text class='d-sub' x='82' y='102' text-anchor='middle'>no shell</text>
  <rect class='d-box-muted' x='162' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='229' y='59' text-anchor='middle'>exec</text>
  <text class='d-sub' x='229' y='82' text-anchor='middle'>buffers output</text>
  <text class='d-sub' x='229' y='102' text-anchor='middle'>runs in a shell</text>
  <rect class='d-box' x='309' y='35' width='135' height='100' rx='10'/>
  <text class='d-text' x='376' y='59' text-anchor='middle'>fork</text>
  <text class='d-sub' x='376' y='82' text-anchor='middle'>spawn a Node file</text>
  <text class='d-sub' x='376' y='102' text-anchor='middle'>+ IPC channel</text>
</svg>

**How it works.** <code>spawn</code> returns a child with <code>stdout</code>/<code>stderr</code> **streams**, so output flows incrementally and memory stays bounded — ideal for <code>ffmpeg</code> or a long build. <code>exec</code> spawns a **shell**, runs the command string, and calls back with the **complete** stdout/stderr — convenient but it fails if output exceeds <code>maxBuffer</code> (default ~1MB) and is **injection-prone** with untrusted input. <code>fork</code> is <code>spawn</code> tuned for running another **Node script**, automatically wiring a <code>process.send</code>/<code>'message'</code> **IPC** channel for structured communication between parent and child.

### Pick the right one
| Need | Use |
| --- | --- |
| Stream large output | <code>spawn</code> |
| Quick command, small output | <code>exec</code> |
| Run a Node worker process + messaging | <code>fork</code> |
| Avoid shell injection | <code>spawn</code> (no shell) / <code>execFile</code> |

> **Interview tip:** Map each to its trait — **spawn=streams, exec=buffers+shell, fork=Node+IPC** — and flag <code>exec</code>'s <code>maxBuffer</code> limit and shell-injection risk with untrusted input.`,
    examples: [
      {
        label: "All three",
        tech: "javascript",
        runnable: false,
        code: `import { spawn, exec, fork } from 'node:child_process';

// spawn: stream output
const ls = spawn('ls', ['-la']);
ls.stdout.on('data', d => process.stdout.write(d));

// exec: buffer to callback (beware maxBuffer + shell injection)
exec('git rev-parse HEAD', (err, stdout) => console.log(stdout.trim()));

// fork: run a Node script with IPC
const child = fork('./worker.js');
child.send({ task: 'crunch' });
child.on('message', (msg) => console.log('from child:', msg));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When would you use `child_process` module in Node.js?",
    answer: `**TL;DR.** Use <code>child_process</code> to **run external programs or separate processes** from Node — shelling out to CLI tools (git, ffmpeg, imagemagick), parallelizing CPU-heavy work across processes, or isolating untrusted/crash-prone code. Each child has its **own memory and event loop**, so a crash or heavy CPU there won't freeze the parent.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Parent spawns separate child processes with their own memory'>
  <rect class='d-box-accent' x='170' y='20' width='120' height='40' rx='8'/><text class='d-text' x='230' y='44' text-anchor='middle'>Node parent</text>
  <path class='d-edge-accent' d='M200 60 L110 105' marker-end='url(#g1)'/>
  <path class='d-edge-accent' d='M230 60 V105' marker-end='url(#g1)'/>
  <path class='d-edge-accent' d='M260 60 L350 105' marker-end='url(#g1)'/>
  <rect class='d-box' x='40' y='107' width='130' height='42' rx='8'/><text class='d-sub' x='105' y='133' text-anchor='middle'>ffmpeg</text>
  <rect class='d-box' x='180' y='107' width='100' height='42' rx='8'/><text class='d-sub' x='230' y='133' text-anchor='middle'>git</text>
  <rect class='d-box' x='290' y='107' width='130' height='42' rx='8'/><text class='d-sub' x='355' y='133' text-anchor='middle'>node worker</text>
  <defs><marker id='g1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Because Node's JS is single-threaded, CPU-bound or blocking native tools belong in a **separate process** so the main event loop stays responsive. <code>child_process</code> lets you launch any executable (<code>spawn</code>/<code>execFile</code>), buffer a quick command (<code>exec</code>), or run another Node script with IPC (<code>fork</code>). Compared with <code>worker_threads</code> (which share memory in one process), child processes give **stronger isolation** (separate memory, can be a different language) at the cost of higher overhead and serialized IPC. For pure in-Node CPU work, prefer worker threads; for invoking other binaries or hard isolation, use child processes.

### child_process vs worker_threads
| | child_process | worker_threads |
| --- | --- | --- |
| Isolation | separate process/memory | shared process |
| Other languages | ✅ any binary | JS only |
| Communication | IPC (serialized) | messages + SharedArrayBuffer |
| Overhead | higher | lower |

> **Interview tip:** Use it for **running external binaries** or **hard isolation**; reach for **worker_threads** when it's CPU-bound JavaScript that benefits from shared memory and lower overhead.`,
    examples: [
      {
        label: "Shell out to ffmpeg safely (no shell)",
        tech: "javascript",
        runnable: false,
        code: `import { execFile } from 'node:child_process';

// execFile avoids a shell → no injection from the filename arg
execFile('ffmpeg', ['-i', input, '-vf', 'scale=640:-1', output],
  (err, stdout, stderr) => {
    if (err) return console.error('transcode failed', stderr);
    console.log('done');
  });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Worker Threads in Node.js and when would you use them?",
    answer: `**TL;DR.** <code>worker_threads</code> run JavaScript on **additional threads within the same process**, each with its own V8 instance and event loop. Use them for **CPU-bound** work (parsing, hashing, image processing) that would otherwise block the main event loop. They can **share memory** via <code>SharedArrayBuffer</code> and communicate by **messages**.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Main thread offloads CPU work to worker threads in the same process'>
  <rect class='d-box-muted' x='20' y='25' width='420' height='120' rx='10'/>
  <text class='d-text' x='40' y='48'>one Node process</text>
  <rect class='d-box-accent' x='40' y='60' width='130' height='70' rx='8'/><text class='d-text' x='105' y='90' text-anchor='middle'>main thread</text><text class='d-sub' x='105' y='108' text-anchor='middle'>event loop</text>
  <path class='d-edge-accent' d='M172 95 H210' marker-end='url(#g2)'/>
  <rect class='d-box' x='212' y='60' width='100' height='70' rx='8'/><text class='d-sub' x='262' y='90' text-anchor='middle'>worker 1</text><text class='d-sub' x='262' y='108' text-anchor='middle'>CPU job</text>
  <rect class='d-box' x='322' y='60' width='100' height='70' rx='8'/><text class='d-sub' x='372' y='90' text-anchor='middle'>worker 2</text><text class='d-sub' x='372' y='108' text-anchor='middle'>CPU job</text>
  <defs><marker id='g2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** You create a <code>Worker</code> pointing at a script (or inline code); it runs in parallel on its own thread, so a heavy computation there doesn't stall the main loop. Data passes via <code>postMessage</code> (structured-clone, or **transferred** for <code>ArrayBuffer</code> to avoid copying), and <code>SharedArrayBuffer</code> enables true shared memory with <code>Atomics</code>. Workers are **not free** — each has startup and memory cost — so for many small tasks use a **pool** (reuse workers) rather than spawning per task. They don't help I/O-bound work (the event loop already handles that).

### When to use workers
| Situation | Workers? |
| --- | --- |
| Heavy CPU per request | ✅ offload |
| Image/video/crypto math | ✅ |
| Mostly I/O (DB, HTTP) | ❌ event loop already concurrent |
| Many tiny tasks | ✅ but pool them |

> **Interview tip:** Anchor on **CPU-bound, not I/O-bound**, and mention **pooling** (reuse workers) plus <code>SharedArrayBuffer</code>/transferables to avoid copy overhead.`,
    examples: [
      {
        label: "Offload a CPU task to a worker",
        tech: "javascript",
        runnable: false,
        code: `// main.js
import { Worker } from 'node:worker_threads';
const w = new Worker('./hash-worker.js', { workerData: bigInput });
w.on('message', (digest) => console.log('hash:', digest));

// hash-worker.js
import { parentPort, workerData } from 'node:worker_threads';
import crypto from 'node:crypto';
const digest = crypto.createHash('sha256').update(workerData).digest('hex');
parentPort.postMessage(digest);   // runs off the main thread`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain how clustering works in Node.js.",
    answer: `**TL;DR.** The <code>cluster</code> module forks **multiple worker processes** (typically one per CPU core) that **share the same server port**. A primary process load-balances incoming connections across workers, so a single-threaded Node app can use **all cores** and survive a worker crash.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Primary distributes connections to worker processes sharing a port'>
  <rect class='d-box-accent' x='160' y='20' width='140' height='40' rx='8'/><text class='d-text' x='230' y='44' text-anchor='middle'>primary :3000</text>
  <path class='d-edge-accent' d='M195 60 L110 105' marker-end='url(#g3)'/>
  <path class='d-edge-accent' d='M230 60 V105' marker-end='url(#g3)'/>
  <path class='d-edge-accent' d='M265 60 L350 105' marker-end='url(#g3)'/>
  <rect class='d-box' x='40' y='107' width='130' height='44' rx='8'/><text class='d-sub' x='105' y='133' text-anchor='middle'>worker (core 1)</text>
  <rect class='d-box' x='180' y='107' width='100' height='44' rx='8'/><text class='d-sub' x='230' y='133' text-anchor='middle'>worker (core 2)</text>
  <rect class='d-box' x='290' y='107' width='130' height='44' rx='8'/><text class='d-sub' x='355' y='133' text-anchor='middle'>worker (core 3)</text>
  <defs><marker id='g3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The **primary** process forks workers with <code>cluster.fork()</code>; the OS/primary distributes incoming connections (round-robin on most platforms). Each worker is a **full Node process** with its own memory and event loop, all listening on the shared port via a handle passed down from the primary. Because workers don't share memory, **session state must be external** (Redis), and you should **restart** crashed workers (<code>'exit'</code> → fork again) for resilience. In containers, you often run **one process per container** and scale replicas instead, letting the orchestrator do the balancing.

### Cluster facts
| Aspect | Detail |
| --- | --- |
| Parallelism | one worker per core |
| Port | shared via primary handle |
| State | must be external (no shared memory) |
| Resilience | re-fork crashed workers |

> **Interview tip:** Contrast with **worker_threads** (threads, shared memory) — cluster uses **separate processes**. Mention externalizing session state and that container deployments often prefer **replicas over cluster**.`,
    examples: [
      {
        label: "Fork one worker per core",
        tech: "javascript",
        runnable: false,
        code: `import cluster from 'node:cluster';
import { cpus } from 'node:os';
import http from 'node:http';

if (cluster.isPrimary) {
  for (let i = 0; i < cpus().length; i++) cluster.fork();
  cluster.on('exit', () => cluster.fork());      // restart on crash
} else {
  http.createServer((req, res) => res.end('hi from ' + process.pid))
      .listen(3000);                              // all share :3000
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you build a worker-thread pool (e.g. Piscina) for CPU-bound work?",
    answer: `**TL;DR.** Spawning a worker per task is expensive, so a **pool** keeps **N long-lived workers** and dispatches tasks to **idle** ones via a queue. Libraries like **Piscina** implement this; you submit a task and get a Promise back. It parallelizes CPU-bound work across cores while keeping the main event loop responsive.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Tasks queue and are dispatched to a fixed set of reused workers'>
  <rect class='d-box-accent' x='20' y='65' width='110' height='44' rx='8'/><text class='d-text' x='75' y='85' text-anchor='middle'>task queue</text><text class='d-sub' x='75' y='101' text-anchor='middle'>submit()</text>
  <path class='d-edge-accent' d='M132 87 H172' marker-end='url(#g4)'/>
  <rect class='d-box-muted' x='174' y='30' width='150' height='112' rx='10'/><text class='d-text' x='249' y='52' text-anchor='middle'>pool (reused)</text>
  <rect class='d-box' x='188' y='62' width='56' height='26' rx='4'/><text class='d-sub' x='216' y='80' text-anchor='middle'>W1</text>
  <rect class='d-box' x='254' y='62' width='56' height='26' rx='4'/><text class='d-sub' x='282' y='80' text-anchor='middle'>W2</text>
  <rect class='d-box' x='188' y='96' width='56' height='26' rx='4'/><text class='d-sub' x='216' y='114' text-anchor='middle'>W3</text>
  <rect class='d-box' x='254' y='96' width='56' height='26' rx='4'/><text class='d-sub' x='282' y='114' text-anchor='middle'>W4</text>
  <path class='d-edge' d='M326 87 H372' marker-end='url(#g4)'/>
  <rect class='d-box' x='374' y='65' width='70' height='44' rx='8'/><text class='d-sub' x='409' y='91' text-anchor='middle'>result</text>
  <defs><marker id='g4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** At startup the pool creates a bounded number of workers (often ≈ CPU cores). Each <code>run(task)</code> enqueues the work; a free worker picks it up, runs it, posts the result back, and becomes available again — so **fixed startup cost** is amortized across many tasks and you never over-subscribe the CPU. Pools also handle backpressure (a max queue), worker recycling (restart after N tasks to bound leaks), and transferring large buffers. Piscina is the de-facto choice; you can hand-roll one but it's fiddly to get queueing and error handling right.

### Why a pool beats per-task workers
| Per-task worker | Pool |
| --- | --- |
| startup cost every task | amortized once |
| can over-subscribe CPU | bounded to N |
| no queue/backpressure | built-in |
| manual lifecycle | recycling handled |

> **Interview tip:** The headline: **reuse workers, bound parallelism to cores, queue the rest.** Naming Piscina and mentioning worker recycling/transferables signals production experience.`,
    examples: [
      {
        label: "Run CPU tasks through Piscina",
        tech: "javascript",
        runnable: false,
        code: `import Piscina from 'piscina';

const pool = new Piscina({ filename: new URL('./worker.js', import.meta.url).href });

// Submit many tasks; the pool keeps ~core-count workers busy.
const results = await Promise.all(
  inputs.map((data) => pool.run(data))   // each returns a Promise
);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you limit the concurrency of many async operations (p-limit / promise pool)?",
    answer: `**TL;DR.** Firing thousands of promises at once exhausts sockets, memory, or hits rate limits. A **concurrency limiter** (like <code>p-limit</code>, or a manual pool) caps how many run **simultaneously**, starting the next only as a slot frees up — bounding resource use while keeping throughput high.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Many tasks funnel through a fixed number of concurrent slots'>
  <rect class='d-box' x='20' y='30' width='110' height='100' rx='10'/>
  <text class='d-text' x='75' y='54' text-anchor='middle'>1000 tasks</text>
  <text class='d-sub' x='75' y='80' text-anchor='middle'>waiting</text>
  <path class='d-edge-accent' d='M132 80 H180' marker-end='url(#g5)'/>
  <rect class='d-box-accent' x='182' y='42' width='110' height='76' rx='10'/>
  <text class='d-text' x='237' y='66' text-anchor='middle'>limit = 5</text>
  <text class='d-sub' x='237' y='90' text-anchor='middle'>5 run at once</text>
  <path class='d-edge-accent' d='M294 80 H342' marker-end='url(#g5)'/>
  <rect class='d-box' x='344' y='42' width='100' height='76' rx='10'/>
  <text class='d-sub' x='394' y='86' text-anchor='middle'>done → next</text>
  <defs><marker id='g5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>Promise.all(items.map(fn))</code> starts **everything at once** — fine for a handful, disastrous for thousands (connection storms, OOM, 429s). A limiter wraps each call so that at most <code>N</code> are in flight; the rest queue. <code>p-limit</code> gives you a <code>limit(fn)</code> wrapper; you still use <code>Promise.all</code> on the wrapped calls. This is essential for **fan-out** work: scraping URLs, batch DB writes, calling a rate-limited API. Choose <code>N</code> based on the downstream's capacity, not your CPU.

### Bounded fan-out
| Approach | Behavior |
| --- | --- |
| <code>Promise.all(map)</code> | unbounded — all at once |
| <code>p-limit(N)</code> | at most N concurrent |
| batched chunks | N at a time, sequential batches |
| queue/pool | steady N with refill |

> **Interview tip:** Call out that <code>Promise.all</code> has **no concurrency cap** and name <code>p-limit</code> (or a manual pool) for bounded fan-out — tuning <code>N</code> to the downstream limit, not the CPU.`,
    examples: [
      {
        label: "Cap concurrent fetches at 5",
        tech: "javascript",
        runnable: false,
        code: `import pLimit from 'p-limit';
const limit = pLimit(5);              // at most 5 in flight

const results = await Promise.all(
  urls.map((url) => limit(() => fetch(url).then(r => r.json())))
);
// 1000 URLs, but never more than 5 concurrent requests.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does Node.js handle crypto operations efficiently without blocking the event loop?",
    answer: `**TL;DR.** CPU-intensive crypto (hashing, key derivation) would block the single thread if run synchronously. Node's <code>crypto</code> module offers **asynchronous** variants (e.g. <code>crypto.pbkdf2</code>, <code>scrypt</code>, <code>randomBytes</code>) that offload work to the **libuv thread pool**, running in C++ background threads so the event loop stays free.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Async crypto offloads to the thread pool, callback returns to the loop'>
  <rect class='d-box-accent' x='20' y='50' width='120' height='46' rx='8'/><text class='d-text' x='80' y='71' text-anchor='middle'>event loop</text><text class='d-sub' x='80' y='88' text-anchor='middle'>stays free</text>
  <path class='d-edge-accent' d='M142 60 H210' marker-end='url(#g6)'/>
  <text class='d-sub' x='176' y='51' text-anchor='middle'>pbkdf2()</text>
  <rect class='d-box-muted' x='212' y='45' width='130' height='56' rx='8'/><text class='d-text' x='277' y='68' text-anchor='middle'>thread pool</text><text class='d-sub' x='277' y='86' text-anchor='middle'>C++ hashing</text>
  <path class='d-edge-dashed' d='M212 88 H142' marker-end='url(#g6)'/>
  <text class='d-sub' x='176' y='112' text-anchor='middle'>callback when done</text>
  <defs><marker id='g6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The **synchronous** forms (<code>pbkdf2Sync</code>, <code>scryptSync</code>) run on the JS thread and **block** every request during the hash — a serious throughput killer for auth endpoints. The **async** forms hand the math to a libuv pool thread; when it finishes, your callback/Promise is queued back on the loop. Remember the pool defaults to **4 threads**, so 5+ concurrent hashes serialize — raise <code>UV_THREADPOOL_SIZE</code> for hashing-heavy services. TLS and bulk ciphers are similarly handled in native code. Always prefer async crypto in request paths.

### Sync vs async crypto
| | sync (<code>...Sync</code>) | async |
| --- | --- | --- |
| Runs on | JS thread (blocks) | libuv pool |
| Concurrency | ❌ stalls server | ✅ off-thread |
| Pool limit | n/a | 4 (tunable) |
| Use in handlers | ❌ | ✅ |

> **Interview tip:** Emphasize **async crypto → libuv pool** keeps the loop free, and that the **pool's size 4** can bottleneck many concurrent hashes (tune <code>UV_THREADPOOL_SIZE</code>). Never use <code>...Sync</code> hashing in a hot path.`,
    examples: [
      {
        label: "Non-blocking password hash",
        tech: "javascript",
        runnable: false,
        code: `import { pbkdf2 } from 'node:crypto';

// Async: runs on the thread pool, event loop keeps serving requests
function hash(pw, salt) {
  return new Promise((res, rej) =>
    pbkdf2(pw, salt, 310000, 32, 'sha256', (e, key) =>
      e ? rej(e) : res(key.toString('hex'))));
}
// ❌ pbkdf2Sync would freeze every concurrent request during the hash.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle graceful shutdown in a Node.js application?",
    answer: `**TL;DR.** On a termination signal (<code>SIGTERM</code>/<code>SIGINT</code>), **stop accepting new work, finish in-flight requests, close resources** (HTTP server, DB pool, queues), then exit. Add a **timeout** so a stuck connection can't hang forever. This prevents dropped requests and corrupted state during deploys/restarts.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Signal triggers stop-accepting, drain, close, exit'>
  <rect class='d-box-accent' x='12' y='58' width='90' height='44' rx='8'/><text class='d-text' x='57' y='80' text-anchor='middle'>SIGTERM</text><text class='d-sub' x='57' y='95' text-anchor='middle'>received</text>
  <path class='d-edge-accent' d='M104 80 H132' marker-end='url(#g7)'/>
  <rect class='d-box' x='134' y='58' width='96' height='44' rx='8'/><text class='d-sub' x='182' y='78' text-anchor='middle'>stop new</text><text class='d-sub' x='182' y='94' text-anchor='middle'>connections</text>
  <path class='d-edge-accent' d='M232 80 H260' marker-end='url(#g7)'/>
  <rect class='d-box' x='262' y='58' width='90' height='44' rx='8'/><text class='d-sub' x='307' y='78' text-anchor='middle'>drain +</text><text class='d-sub' x='307' y='94' text-anchor='middle'>close pools</text>
  <path class='d-edge-accent' d='M354 80 H382' marker-end='url(#g7)'/>
  <rect class='d-box-muted' x='384' y='58' width='66' height='44' rx='8'/><text class='d-sub' x='417' y='84' text-anchor='middle'>exit 0</text>
  <defs><marker id='g7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Orchestrators (Kubernetes, PM2) send <code>SIGTERM</code> before killing a process. Listen for it, call <code>server.close()</code> (stops accepting connections, lets active ones finish), then close the **DB pool**, **message-queue** consumers, and flush logs. Wrap it in a **hard timeout** (e.g. 10s) that forces <code>process.exit(1)</code> if draining stalls. Combine with a **readiness probe** that flips to "not ready" first, so the load balancer stops routing new traffic before you drain. Make the handler **idempotent** (guard against double-invocation).

### Shutdown checklist
| Step | Why |
| --- | --- |
| Flip readiness → not ready | LB stops new traffic |
| <code>server.close()</code> | finish in-flight requests |
| Close DB/queue/cache | release resources cleanly |
| Timeout → force exit | avoid hanging forever |

> **Interview tip:** Sequence it: **stop accepting → drain in-flight → close resources → exit**, with a **timeout fallback**. Bonus: mention flipping the **readiness probe** first so traffic stops before draining.`,
    examples: [
      {
        label: "Graceful shutdown with timeout",
        tech: "javascript",
        runnable: false,
        code: `function shutdown(signal) {
  console.log(signal, '→ shutting down');
  server.close(async () => {        // stop new, drain in-flight
    await pool.end();               // close DB pool
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();  // hard cap
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));`,
      },
    ],
  },
];

export default augments;
