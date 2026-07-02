/**
 * Node Phase N3 — Batch 12 (Memory, performance & diagnostics).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain how memory management and Garbage Collection work in the V8 engine.",
    answer: `**TL;DR.** V8 manages a **heap** and reclaims unreachable objects with a **generational, mark-and-sweep** garbage collector. Objects start in a small **young generation** (Scavenge, very fast); survivors are promoted to the **old generation** (Mark-Sweep-Compact). The **generational hypothesis** — most objects die young — keeps GC cheap.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Young generation scavenges; survivors promote to old generation'>
  <rect class='d-box-accent' x='20' y='45' width='180' height='70' rx='10'/><text class='d-text' x='110' y='70' text-anchor='middle'>young gen</text><text class='d-sub' x='110' y='92' text-anchor='middle'>Scavenge — fast, frequent</text>
  <path class='d-edge-accent' d='M202 80 H262' marker-end='url(#l1)'/>
  <text class='d-sub' x='232' y='71' text-anchor='middle'>promote</text>
  <rect class='d-box-muted' x='264' y='45' width='176' height='70' rx='10'/><text class='d-text' x='352' y='70' text-anchor='middle'>old gen</text><text class='d-sub' x='352' y='92' text-anchor='middle'>Mark-Sweep-Compact</text>
  <defs><marker id='l1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** New allocations land in the **young generation** (a small space split into two halves). A **Scavenge** collection copies live objects to the other half and discards the rest — fast because most young objects are already dead. Objects that survive a couple of scavenges are **promoted** to the **old generation**, collected less often by **Mark-Sweep-Compact**: mark reachable objects from the roots, sweep the unreachable, and compact to reduce fragmentation. Modern V8 does much of this **concurrently/incrementally** to minimize pause times. GC is automatic, but a **major (old-gen) GC** still pauses the thread briefly. The old space has a cap (<code>--max-old-space-size</code>); exceeding it crashes with OOM. You don't free memory manually — you just avoid keeping references alive (the cause of "leaks").

### Heap & GC
| Concept | Detail |
| --- | --- |
| young gen | Scavenge, fast, frequent |
| old gen | Mark-Sweep-Compact |
| promotion | survive ⇒ move to old |
| tuning | <code>--max-old-space-size</code> |

> **Interview tip:** Name **generational GC**: young=**Scavenge**, old=**Mark-Sweep-Compact**, based on "objects die young." Mention major GC pauses and that a "leak" is really **retained references**, not GC failure.`,
    examples: [
      {
        label: "Inspect heap usage + raise the cap",
        tech: "javascript",
        runnable: false,
        code: `const { heapUsed, heapTotal } = process.memoryUsage();
console.log((heapUsed / 1e6).toFixed(1), '/', (heapTotal / 1e6).toFixed(1), 'MB');

// Raise old-space limit (default ~2GB) at launch:
//   node --max-old-space-size=4096 server.js
// Expose manual GC for debugging only:  node --expose-gc  → global.gc()`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are memory leaks in Node.js and how do you detect them?",
    answer: `**TL;DR.** A **memory leak** is memory the GC can't reclaim because something still **references** it. Common causes: ever-growing **global** state/caches, **un-removed event listeners**, lingering **closures/timers**, and unbounded data structures. Detect with <code>process.memoryUsage()</code> trends and **heap snapshot diffs**; the tell-tale is heap that grows and never returns after GC.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Heap usage climbing over time indicating a leak'>
  <path class='d-edge' d='M40 120 H430'/>
  <path class='d-edge' d='M40 120 V20'/>
  <path class='d-edge-accent' d='M40 110 L120 96 L200 84 L280 64 L360 42 L420 28' marker-end='url(#l2)'/>
  <text class='d-sub' x='240' y='140' text-anchor='middle'>time →</text>
  <text class='d-sub' x='300' y='40'>heap keeps climbing</text>
  <defs><marker id='l2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Because GC frees only **unreachable** objects, a leak means a reference path keeps objects alive longer than intended — a module-level <code>Map</code> you only ever add to, listeners added per request but never removed (each retains its closure), timers that capture large scopes, or caches without eviction. Over time the **old generation** grows, major GCs run more often (CPU up), and eventually the process hits the heap cap and OOM-crashes. To find leaks: watch <code>process.memoryUsage().heapUsed</code> trending upward across steady load; take **two heap snapshots** under load and **diff** them in Chrome DevTools to see which object types/retainers keep growing; and use tools like <code>clinic doctor</code>. Fixes: remove listeners (<code>off</code>), bound caches (LRU + TTL), clear timers, and avoid accidental global references.

### Common leak sources
| Source | Fix |
| --- | --- |
| growing global/cache | LRU + TTL eviction |
| un-removed listeners | <code>emitter.off</code> / <code>once</code> |
| timers/closures | <code>clearInterval</code>, scope down |
| detection | snapshot diff, memoryUsage trend |

> **Interview tip:** Define a leak as **unintended reachability**, list the usual culprits (listeners, unbounded caches, timers), and describe the detection method: **rising heapUsed + heap-snapshot diffs** for growing retainers.`,
    examples: [
      {
        label: "A classic listener leak and its fix",
        tech: "javascript",
        runnable: false,
        code: `// ❌ leak: a new listener every request, never removed
app.get('/x', (req, res) => {
  emitter.on('tick', () => res.write('.'));   // retains res forever
});

// ✅ remove it when done
app.get('/x', (req, res) => {
  const onTick = () => res.write('.');
  emitter.on('tick', onTick);
  res.on('close', () => emitter.off('tick', onTick));
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you capture and analyze a heap snapshot to find a memory leak?",
    answer: `**TL;DR.** Capture a **V8 heap snapshot** with <code>v8.writeHeapSnapshot()</code> (or via the inspector), load it in **Chrome DevTools → Memory**, and **compare** snapshots taken over time under steady load. Object types that keep **growing** between snapshots — held by a retainer path you didn't expect — reveal the leak.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Two snapshots diffed to find growing object counts'>
  <rect class='d-box' x='20' y='50' width='110' height='46' rx='8'/><text class='d-sub' x='75' y='71' text-anchor='middle'>snapshot A</text><text class='d-sub' x='75' y='88' text-anchor='middle'>(baseline)</text>
  <rect class='d-box' x='150' y='50' width='110' height='46' rx='8'/><text class='d-sub' x='205' y='71' text-anchor='middle'>snapshot B</text><text class='d-sub' x='205' y='88' text-anchor='middle'>(after load)</text>
  <path class='d-edge-accent' d='M262 73 H320' marker-end='url(#l3)'/>
  <text class='d-sub' x='291' y='64' text-anchor='middle'>diff</text>
  <rect class='d-box-accent' x='322' y='50' width='120' height='46' rx='8'/><text class='d-text' x='382' y='71' text-anchor='middle'>growing type</text><text class='d-sub' x='382' y='88' text-anchor='middle'>+ retainer path</text>
  <defs><marker id='l3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A heap snapshot is a full graph of objects, their sizes, and the **references (retainers)** keeping each alive. The leak-hunting recipe: take a **baseline** snapshot, run representative traffic, force/await GC, take a **second** snapshot, then use DevTools' **Comparison** view to see which constructors gained objects/retained size. Click a suspect to follow its **retaining path** back to a GC root — that path is what to break (an array you keep pushing to, a closure captured by a listener). Look at **retained size** (total memory freed if it died), not just shallow size. <code>--heapsnapshot-near-heap-limit</code> can auto-dump on near-OOM. Snapshots pause the process and are large, so capture deliberately, not continuously.

### Snapshot workflow
| Step | Action |
| --- | --- |
| baseline | snapshot before load |
| exercise | run steady traffic |
| compare | diff snapshots in DevTools |
| trace | follow retainer path → fix |

> **Interview tip:** The method, not just the tool: **diff two snapshots under load** and **follow the retaining path** of the growing type to a GC root. Mention **retained vs shallow size**.`,
    examples: [
      {
        label: "Dump a snapshot to disk",
        tech: "javascript",
        runnable: false,
        code: `import v8 from 'node:v8';

// Trigger on a signal so you can capture during a leak in prod:
process.on('SIGUSR2', () => {
  const file = v8.writeHeapSnapshot();   // e.g. Heap.20240101.heapsnapshot
  console.log('wrote', file);            // open in Chrome DevTools → Memory
});
// Or auto-dump near OOM:  node --heapsnapshot-near-heap-limit=2 server.js`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you monitor a Node.js application's memory usage in production?",
    answer: `**TL;DR.** Continuously track <code>process.memoryUsage()</code> (**RSS**, **heapUsed**, **external**, **arrayBuffers**) and **event-loop lag**, export them as **metrics** (Prometheus) and dashboards/alerts. Watch for steadily **rising heap** (leak) or RSS near the container limit (OOM-kill risk), and capture snapshots on alert.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='App exposes memory metrics scraped into dashboards and alerts'>
  <rect class='d-box-accent' x='20' y='52' width='110' height='46' rx='8'/><text class='d-text' x='75' y='73' text-anchor='middle'>app /metrics</text><text class='d-sub' x='75' y='90' text-anchor='middle'>memoryUsage()</text>
  <path class='d-edge-accent' d='M132 75 H190' marker-end='url(#l4)'/>
  <rect class='d-box' x='192' y='52' width='110' height='46' rx='8'/><text class='d-text' x='247' y='73' text-anchor='middle'>Prometheus</text><text class='d-sub' x='247' y='90' text-anchor='middle'>scrape + store</text>
  <path class='d-edge-accent' d='M304 75 H362' marker-end='url(#l4)'/>
  <rect class='d-box-muted' x='364' y='52' width='86' height='46' rx='8'/><text class='d-sub' x='407' y='73' text-anchor='middle'>dashboards</text><text class='d-sub' x='407' y='89' text-anchor='middle'>+ alerts</text>
  <defs><marker id='l4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>process.memoryUsage()</code> reports **RSS** (total resident memory, what the OS/container sees and OOM-kills on), **heapTotal/heapUsed** (V8 heap), **external** (C++ objects bound to JS), and **arrayBuffers** (Buffers/typed arrays — a common hidden grower). Sample these on an interval and expose them via <code>prom-client</code> for Prometheus, or push to a vendor (Datadog, New Relic). Also track **event-loop lag** (a rising lag signals blocking) and **GC stats** (<code>perf_hooks</code>). Set **alerts** on sustained heap growth and on RSS approaching the cgroup limit. When an alert fires, automatically grab a **heap snapshot** for offline diffing. Crucially, set <code>--max-old-space-size</code> below the container limit so V8 GCs before the OS kills the pod.

### What to watch
| Metric | Signals |
| --- | --- |
| RSS | OOM-kill proximity |
| heapUsed trend | leak |
| external/arrayBuffers | Buffer growth |
| event-loop lag | blocking/CPU |

> **Interview tip:** Distinguish **RSS (OS view, OOM)** from **heapUsed (V8)**, mention **arrayBuffers/external** as sneaky growers, and tie it together: metrics → alerts → snapshot, with <code>--max-old-space-size</code> under the container limit.`,
    examples: [
      {
        label: "Expose memory metrics for Prometheus",
        tech: "javascript",
        runnable: false,
        code: `import client from 'prom-client';
client.collectDefaultMetrics();      // includes process_resident_memory_bytes, heap, GC

const heap = new client.Gauge({ name: 'app_heap_used_bytes', help: 'heap used' });
setInterval(() => heap.set(process.memoryUsage().heapUsed), 5000);

app.get('/metrics', async (_req, res) => res.end(await client.register.metrics()));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are some common ways to improve performance in a Node.js application?",
    answer: `**TL;DR.** Keep the **event loop unblocked** (no sync CPU work in handlers — offload to workers), do I/O **concurrently** (<code>Promise.all</code>, connection pools, keep-alive), add **caching**, **stream** large payloads, **scale across cores** (cluster/replicas), and **measure first** (profiling) so you optimize the real bottleneck.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Performance levers: loop, IO concurrency, cache, scale'>
  <rect class='d-box-accent' x='15' y='45' width='105' height='80' rx='10'/><text class='d-text' x='67' y='69' text-anchor='middle'>unblock loop</text><text class='d-sub' x='67' y='91' text-anchor='middle'>workers</text><text class='d-sub' x='67' y='109' text-anchor='middle'>async I/O</text>
  <rect class='d-box' x='128' y='45' width='105' height='80' rx='10'/><text class='d-text' x='180' y='69' text-anchor='middle'>concurrency</text><text class='d-sub' x='180' y='91' text-anchor='middle'>Promise.all</text><text class='d-sub' x='180' y='109' text-anchor='middle'>pooling</text>
  <rect class='d-box' x='241' y='45' width='105' height='80' rx='10'/><text class='d-text' x='293' y='69' text-anchor='middle'>cache</text><text class='d-sub' x='293' y='91' text-anchor='middle'>+ stream</text><text class='d-sub' x='293' y='109' text-anchor='middle'>big data</text>
  <rect class='d-box' x='354' y='45' width='90' height='80' rx='10'/><text class='d-text' x='399' y='69' text-anchor='middle'>scale</text><text class='d-sub' x='399' y='91' text-anchor='middle'>cores/</text><text class='d-sub' x='399' y='109' text-anchor='middle'>replicas</text>
</svg>

**How it works.** Node is fast at I/O but single-threaded for JS, so the biggest wins come from **not blocking the loop**: move CPU-heavy work to <code>worker_threads</code>, avoid sync APIs (<code>readFileSync</code>, sync crypto) in hot paths, and watch for **ReDoS**/giant JSON. Maximize I/O **concurrency** with <code>Promise.all</code>, DB **connection pooling**, and HTTP **keep-alive** (undici). Cut repeated work with **caching** (in-process LRU or Redis) and **stream** large responses for constant memory. Use **HTTP compression** and efficient serialization. Scale horizontally with **cluster** or replicas to use all cores. But always **profile first** (flame graphs, clinic) — optimize the measured hot path, set up monitoring (latency p99, event-loop lag), and beware micro-optimizations that don't move real numbers.

### Lever → win
| Lever | Win |
| --- | --- |
| offload CPU to workers | loop stays responsive |
| <code>Promise.all</code> + pools | parallel I/O |
| cache + stream | less work, flat memory |
| cluster/replicas | use all cores |

> **Interview tip:** Lead with **"don't block the event loop"** and **"measure before optimizing."** List concrete levers (workers, concurrency, caching, streaming, scaling) rather than generic "write faster code."`,
    examples: [
      {
        label: "Two quick wins",
        tech: "javascript",
        runnable: false,
        code: `// ❌ serial I/O
const a = await getA(); const b = await getB();
// ✅ concurrent
const [a2, b2] = await Promise.all([getA(), getB()]);

// ❌ blocks the loop for every request
const hash = crypto.pbkdf2Sync(pw, salt, 1e6, 64, 'sha512');
// ✅ async → off the main thread
const hash2 = await pbkdf2Async(pw, salt, 1e6, 64, 'sha512');`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you profile CPU usage with --prof, 0x, or clinic.js flame graphs?",
    answer: `**TL;DR.** Profile to find **hot functions** and **event-loop blockers**. <code>node --prof</code> writes a V8 tick log you process with <code>--prof-process</code>; **0x** and **clinic.js flame** render **flame graphs** where **wide frames** are the functions burning the most CPU. They turn "it's slow" into a specific function to fix.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Flame graph with the widest frame being the hottest function'>
  <rect class='d-box' x='40' y='30' width='360' height='22' rx='4'/><text class='d-sub' x='220' y='46' text-anchor='middle'>main</text>
  <rect class='d-box' x='60' y='56' width='250' height='22' rx='4'/><text class='d-sub' x='185' y='72' text-anchor='middle'>handleRequest</text>
  <rect class='d-box-accent' x='90' y='82' width='190' height='22' rx='4'/><text class='d-sub' x='185' y='98' text-anchor='middle'>parseBigJSON (hot)</text>
  <rect class='d-box' x='110' y='108' width='90' height='22' rx='4'/><text class='d-sub' x='155' y='124' text-anchor='middle'>decode</text>
  <text class='d-sub' x='415' y='98'>← widest = hottest</text>
</svg>

**How it works.** A CPU profiler samples the call stack many times per second; the proportion of samples in a function approximates the **CPU time** it consumed. In a **flame graph**, the x-axis is total time (frame **width** = self+children), and the y-axis is call depth — so the **widest plateaus** are where to optimize, and a wide synchronous frame on the main thread is an **event-loop blocker**. Workflow: reproduce load (a benchmark or real traffic), record (<code>0x -- node server.js</code> or <code>clinic flame</code>), open the interactive flame graph, find the widest user-code frame, and fix it (cache, algorithmic change, move to a worker). <code>--prof</code> is the dependency-free option but yields a raw text report; <code>clinic doctor</code> additionally diagnoses event-loop/GC/I/O issues. Always profile a **production-like** build under realistic load.

### Profiling tools
| Tool | Output |
| --- | --- |
| <code>--prof</code>/<code>--prof-process</code> | text tick report |
| 0x | interactive flame graph |
| clinic flame/doctor | flame + diagnosis |
| read it by | widest frames = hot |

> **Interview tip:** Explain a flame graph in one line — **width = CPU time, widest frame = hottest** — and that a wide **synchronous** frame is an event-loop blocker. Stress profiling under **realistic load**.`,
    examples: [
      {
        label: "Capture a flame graph",
        tech: "bash",
        runnable: false,
        code: `# 0x: wraps your app, opens an interactive flame graph
npx 0x -- node server.js          # generate load, then Ctrl-C

# clinic: diagnose first, then flame
npx clinic doctor -- node server.js
npx clinic flame  -- node server.js

# Dependency-free V8 profiler:
node --prof server.js && node --prof-process isolate-*.log > profile.txt`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the perf_hooks module and how do you measure performance?",
    answer: `**TL;DR.** <code>node:perf_hooks</code> exposes **high-resolution timing**: <code>performance.now()</code>, <code>mark()</code>/<code>measure()</code> for named spans, and a <code>PerformanceObserver</code> to collect entries asynchronously. It also surfaces **event-loop utilization** and **GC** timing — the building blocks for instrumenting your own performance metrics.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='mark start, mark end, measure the span between them'>
  <rect class='d-box-accent' x='30' y='55' width='90' height='40' rx='8'/><text class='d-sub' x='75' y='79' text-anchor='middle'>mark('A')</text>
  <path class='d-edge' d='M122 75 H190'/>
  <text class='d-sub' x='156' y='66' text-anchor='middle'>work…</text>
  <rect class='d-box-accent' x='192' y='55' width='90' height='40' rx='8'/><text class='d-sub' x='237' y='79' text-anchor='middle'>mark('B')</text>
  <path class='d-edge-accent' d='M284 75 H342' marker-end='url(#l5)'/>
  <rect class='d-box' x='344' y='55' width='100' height='40' rx='8'/><text class='d-sub' x='394' y='79' text-anchor='middle'>measure(A→B)</text>
  <defs><marker id='l5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>performance.now()</code> returns a sub-millisecond, monotonic timestamp (unaffected by clock changes) — better than <code>Date.now()</code> for durations. You <code>mark()</code> named points and <code>measure(name, start, end)</code> to record spans; a <code>PerformanceObserver</code> receives those entries (and built-in ones like <code>gc</code>, <code>http</code>, function timing) without polling. <code>performance.eventLoopUtilization()</code> reports how busy the loop is (a key saturation signal), and you can wrap functions with <code>performance.timerify</code>. Feed these measurements into your metrics/logging to track real latencies (DB call, render, total handler) and detect regressions. It's the standards-based (Web Performance API) way to instrument, portable in spirit with the browser.

### perf_hooks tools
| API | Use |
| --- | --- |
| <code>performance.now()</code> | precise durations |
| <code>mark</code>/<code>measure</code> | named spans |
| <code>PerformanceObserver</code> | collect entries (gc, http) |
| <code>eventLoopUtilization()</code> | loop saturation |

> **Interview tip:** Prefer <code>performance.now()</code> over <code>Date.now()</code> for durations (monotonic, sub-ms), and mention **<code>eventLoopUtilization()</code>** as a great production saturation metric.`,
    examples: [
      {
        label: "Measure a span + observe entries",
        tech: "javascript",
        runnable: false,
        code: `import { performance, PerformanceObserver } from 'node:perf_hooks';

new PerformanceObserver((list) => {
  for (const e of list.getEntries()) console.log(e.name, e.duration.toFixed(2), 'ms');
}).observe({ entryTypes: ['measure'] });

performance.mark('db:start');
await query();
performance.mark('db:end');
performance.measure('db', 'db:start', 'db:end');`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is diagnostics_channel and when would you use it?",
    answer: `**TL;DR.** <code>node:diagnostics_channel</code> is a built-in **publish/subscribe** API for emitting and subscribing to named **diagnostic events** with **near-zero cost when no subscriber** is attached. Libraries publish lifecycle events (e.g. HTTP requests, DB queries) so APM/tracing tools can observe them **without monkey-patching**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Library publishes to a named channel that subscribers consume'>
  <rect class='d-box-accent' x='20' y='52' width='120' height='46' rx='8'/><text class='d-text' x='80' y='73' text-anchor='middle'>library</text><text class='d-sub' x='80' y='90' text-anchor='middle'>channel.publish()</text>
  <path class='d-edge-accent' d='M142 75 H200' marker-end='url(#l6)'/>
  <rect class='d-box' x='202' y='52' width='110' height='46' rx='8'/><text class='d-text' x='257' y='73' text-anchor='middle'>'http.request'</text><text class='d-sub' x='257' y='90' text-anchor='middle'>named channel</text>
  <path class='d-edge-accent' d='M314 75 H372' marker-end='url(#l6)'/>
  <rect class='d-box-muted' x='374' y='52' width='76' height='46' rx='8'/><text class='d-sub' x='412' y='79' text-anchor='middle'>APM sub</text>
  <defs><marker id='l6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A producer gets a channel by name and calls <code>channel.publish(message)</code>; subscribers call <code>channel.subscribe(name, onMessage)</code>. The clever part: <code>channel.hasSubscribers</code> is false until someone subscribes, so publishing is essentially free in the common case — instrumentation you can leave in production with no overhead. This decouples libraries from observability tooling: instead of APM agents **monkey-patching** internals (fragile, version-sensitive), libraries expose stable channels that tools subscribe to. Core modules and popular libraries increasingly publish channels (HTTP, undici, etc.). Use it to add tracing/metrics/logging hooks across your app, or to let plugins observe internal events cleanly. Pair with <code>AsyncLocalStorage</code> to correlate events to a request.

### diagnostics_channel traits
| Trait | Benefit |
| --- | --- |
| pub/sub by name | decoupled instrumentation |
| zero-cost when idle | safe in production |
| no monkey-patching | stable, version-safe hooks |
| pairs with ALS | per-request correlation |

> **Interview tip:** The differentiators: **near-zero overhead when unsubscribed** and replacing **monkey-patching** with stable channels — the modern way APM/tracing integrates with libraries.`,
    examples: [
      {
        label: "Publish + subscribe to a channel",
        tech: "javascript",
        runnable: false,
        code: `import diagnostics_channel from 'node:diagnostics_channel';

const ch = diagnostics_channel.channel('app:query');

// Producer (cheap if nobody listens):
function runQuery(sql) {
  if (ch.hasSubscribers) ch.publish({ sql, at: Date.now() });
  return db.query(sql);
}

// Consumer (APM/logging):
diagnostics_channel.subscribe('app:query', (msg) => log.debug(msg));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you add OpenTelemetry distributed tracing to a Node.js service?",
    answer: `**TL;DR.** **OpenTelemetry** auto-instruments HTTP/DB clients to create **spans**, **propagates a trace context** header across service boundaries, and **exports** traces to a collector/backend (Jaeger, Tempo). It lets you follow **one request end-to-end** across multiple services, seeing where the latency actually goes.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Trace context propagated across services into one trace'>
  <rect class='d-box-accent' x='20' y='55' width='90' height='44' rx='8'/><text class='d-sub' x='65' y='75' text-anchor='middle'>svc A</text><text class='d-sub' x='65' y='91' text-anchor='middle'>span 1</text>
  <path class='d-edge-accent' d='M112 77 H150' marker-end='url(#l7)'/>
  <text class='d-sub' x='131' y='68' text-anchor='middle'>traceparent</text>
  <rect class='d-box-accent' x='152' y='55' width='90' height='44' rx='8'/><text class='d-sub' x='197' y='75' text-anchor='middle'>svc B</text><text class='d-sub' x='197' y='91' text-anchor='middle'>span 2</text>
  <path class='d-edge-accent' d='M244 77 H282' marker-end='url(#l7)'/>
  <rect class='d-box' x='284' y='55' width='90' height='44' rx='8'/><text class='d-sub' x='329' y='75' text-anchor='middle'>DB</text><text class='d-sub' x='329' y='91' text-anchor='middle'>span 3</text>
  <path class='d-edge-accent' d='M376 77 H410' marker-end='url(#l7)'/>
  <rect class='d-box-muted' x='412' y='55' width='40' height='44' rx='8'/><text class='d-sub' x='432' y='81' text-anchor='middle'>Jaeger</text>
  <defs><marker id='l7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A **trace** is a tree of **spans** (timed operations) sharing a trace id. OpenTelemetry's Node SDK registers **auto-instrumentations** that wrap http, fetch/undici, Express, and DB drivers to start/stop spans automatically, and uses <code>AsyncLocalStorage</code> under the hood to keep the **active span** attached across async hops. When service A calls B, the SDK injects a <code>traceparent</code> header (W3C Trace Context); B continues the same trace, so the backend can stitch the whole request together. You export spans via OTLP to a **collector** that forwards to Jaeger/Tempo/Datadog. Add **custom spans** around important logic, attach attributes (user id, query), and configure **sampling** to control volume. The big win: pinpoint which hop/query dominates p99 latency across a distributed system.

### OTel pieces
| Piece | Role |
| --- | --- |
| spans/traces | timed operation tree |
| auto-instrumentation | wrap http/db/express |
| context propagation | <code>traceparent</code> header |
| exporter/collector | ship to Jaeger/Tempo |

> **Interview tip:** Explain **spans + trace context propagation** (W3C <code>traceparent</code>) and that it relies on **AsyncLocalStorage** to track the active span. Mention **sampling** to manage volume.`,
    examples: [
      {
        label: "Bootstrap auto-instrumentation",
        tech: "javascript",
        runnable: false,
        code: `// tracing.js — imported FIRST (node --import ./tracing.js app.js)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

new NodeSDK({
  traceExporter: new OTLPTraceExporter(),         // → collector
  instrumentations: [getNodeAutoInstrumentations()],
}).start();
// http/express/db spans now created + traceparent propagated automatically.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you implement structured logging with pino or winston, and why avoid console.log in production?",
    answer: `**TL;DR.** Structured loggers like **pino** emit **JSON** with levels, timestamps, and context — so logs are **machine-parseable** and queryable in aggregators. <code>console.log</code> is **synchronous**, unstructured, and can **block** under load; pino is asynchronous and far faster, and pairs with <code>AsyncLocalStorage</code> for per-request fields.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Structured JSON logs flow to an aggregator for querying'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='44' rx='8'/><text class='d-sub' x='120' y='51' text-anchor='middle'>console.log('user', id)</text><text class='d-sub' x='120' y='67' text-anchor='middle'>❌ unstructured, sync</text>
  <rect class='d-box-accent' x='20' y='84' width='200' height='44' rx='8'/><text class='d-sub' x='120' y='105' text-anchor='middle'>log.info({{ userId }}, 'login')</text><text class='d-sub' x='120' y='121' text-anchor='middle'>✅ JSON, async, leveled</text>
  <path class='d-edge-accent' d='M222 106 H290' marker-end='url(#l8)'/>
  <rect class='d-box' x='292' y='80' width='150' height='52' rx='8'/><text class='d-sub' x='367' y='104' text-anchor='middle'>aggregator: query,</text><text class='d-sub' x='367' y='122' text-anchor='middle'>filter, alert</text>
  <defs><marker id='l8' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** In production, logs are ingested by aggregators (ELK, Loki, Datadog) that index **fields** — so structured **JSON** (key/value) is searchable ("all errors for userId=42 in the last hour") while free-text <code>console.log</code> is not. Loggers add **levels** (debug/info/warn/error) you can filter by environment, **timestamps**, and **child loggers** that bind context (request id, route). Performance matters: <code>console.log</code>/<code>console.error</code> write **synchronously** to stdout/stderr and can **block the event loop** under heavy logging; **pino** is engineered for low overhead (it serializes minimally and can offload transport to a worker). Combine with **AsyncLocalStorage** to inject a per-request <code>reqId</code> into every line automatically, and **redact** secrets. Log to **stdout** (12-factor) and let the platform route them.

### console.log vs pino
| | console.log | pino/winston |
| --- | --- | --- |
| Format | free text | structured JSON |
| Levels | none | debug→error |
| Performance | sync, can block | async, fast |
| Aggregation | hard to query | indexed fields |

> **Interview tip:** Two reasons to drop <code>console.log</code>: **unstructured (unqueryable)** and **synchronous (can block)**. Mention **levels**, **child loggers + AsyncLocalStorage** for request context, and **redaction**.`,
    examples: [
      {
        label: "Pino with per-request context",
        tech: "javascript",
        runnable: false,
        code: `import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL ?? 'info', redact: ['req.headers.authorization'] });

app.use((req, res, next) => {
  req.log = logger.child({ reqId: crypto.randomUUID(), path: req.path });
  next();
});
app.get('/x', (req, res) => { req.log.info({ userId: 42 }, 'handled'); res.end(); });
// → {"level":"info","reqId":"...","path":"/x","userId":42,"msg":"handled"}`,
      },
    ],
  },
];

export default augments;
