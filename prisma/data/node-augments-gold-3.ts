/**
 * Node Phase N3 — Batch 3 (EventEmitter & module system).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are `EventEmitter`s in Node.js?",
    answer: `**TL;DR.** <code>EventEmitter</code> (from <code>node:events</code>) is the core class behind Node's **event-driven** model. Objects **emit named events** (<code>emitter.emit('data', payload)</code>) and **listeners** registered with <code>.on()</code> react to them. Streams, HTTP servers, sockets, and the process object all inherit from it.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='An emitter dispatches a named event to multiple listeners'>
  <rect class='d-box-accent' x='20' y='55' width='140' height='50' rx='10'/>
  <text class='d-text' x='90' y='78' text-anchor='middle'>EventEmitter</text>
  <text class='d-sub' x='90' y='95' text-anchor='middle'>emit('data')</text>
  <path class='d-edge-accent' d='M162 70 L250 40' marker-end='url(#c1)'/>
  <path class='d-edge-accent' d='M162 80 L250 80' marker-end='url(#c1)'/>
  <path class='d-edge-accent' d='M162 90 L250 120' marker-end='url(#c1)'/>
  <rect class='d-box' x='252' y='24' width='130' height='30' rx='6'/><text class='d-sub' x='317' y='44' text-anchor='middle'>listener A</text>
  <rect class='d-box' x='252' y='64' width='130' height='30' rx='6'/><text class='d-sub' x='317' y='84' text-anchor='middle'>listener B</text>
  <rect class='d-box' x='252' y='104' width='130' height='30' rx='6'/><text class='d-sub' x='317' y='124' text-anchor='middle'>listener C</text>
  <defs><marker id='c1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** You register handlers with <code>.on(name, fn)</code> (or <code>.once</code> for one-shot), and <code>.emit(name, ...args)</code> invokes every registered listener **synchronously, in registration order**. Two conventions matter: an <code>'error'</code> event with **no listener throws** and can crash the process, and exceeding the default **10 listeners** logs a possible-leak warning (tune via <code>setMaxListeners</code>). It implements the **observer pattern**, decoupling producers from consumers.

### Core API
| Method | Purpose |
| --- | --- |
| <code>.on(name, fn)</code> | add listener |
| <code>.once(name, fn)</code> | one-time listener |
| <code>.emit(name, …)</code> | fire synchronously |
| <code>.off / removeListener</code> | detach (avoid leaks) |

> **Interview tip:** Two facts impress: emit is **synchronous**, and an unhandled **<code>'error'</code> event throws**. Mention it's the backbone of streams/HTTP and implements the observer pattern.`,
    examples: [
      {
        label: "Define and use an emitter",
        tech: "javascript",
        runnable: false,
        code: `import { EventEmitter } from 'node:events';

class Job extends EventEmitter {}
const job = new Job();

job.on('progress', (pct) => console.log('progress', pct));
job.once('done', (r) => console.log('done', r));
job.on('error', (e) => console.error('handled:', e.message)); // always add!

job.emit('progress', 50);
job.emit('done', { ok: true });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain how the EventEmitter class works under the hood.",
    answer: `**TL;DR.** Internally an <code>EventEmitter</code> keeps a plain object (<code>_events</code>) mapping **event name → listener(s)**. <code>.on()</code> pushes a function into that name's array; <code>.emit()</code> looks up the array and calls each listener **synchronously in order** with the emitted args. It's a simple registry, not magic.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Internal map of event names to listener arrays'>
  <rect class='d-box-muted' x='20' y='25' width='420' height='120' rx='10'/>
  <text class='d-text' x='40' y='48'>_events (registry)</text>
  <rect class='d-box-accent' x='40' y='60' width='110' height='30' rx='6'/><text class='d-sub' x='95' y='80' text-anchor='middle'>'data'</text>
  <path class='d-edge' d='M152 75 H190' marker-end='url(#c2)'/>
  <rect class='d-box' x='192' y='60' width='230' height='30' rx='6'/><text class='d-sub' x='307' y='80' text-anchor='middle'>[ fn1, fn2 ] — called in order</text>
  <rect class='d-box-accent' x='40' y='100' width='110' height='30' rx='6'/><text class='d-sub' x='95' y='120' text-anchor='middle'>'error'</text>
  <path class='d-edge' d='M152 115 H190' marker-end='url(#c2)'/>
  <rect class='d-box' x='192' y='100' width='230' height='30' rx='6'/><text class='d-sub' x='307' y='120' text-anchor='middle'>[ fn ] — throws if empty</text>
  <defs><marker id='c2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** For memory efficiency a single listener is stored as a function and only promoted to an **array** on the second <code>.on()</code>. <code>.once()</code> wraps your function in a self-removing shim. <code>.emit()</code> iterates a **copy** of the array (so adding/removing during emit is safe) and invokes each listener; if any throws synchronously, it propagates. Because emit is synchronous, a slow listener **blocks** subsequent ones and the event loop. The default **maxListeners = 10** triggers a leak warning when exceeded.

### Internals at a glance
| Detail | Behavior |
| --- | --- |
| Storage | <code>_events</code> name→fn or fn[] |
| First listener | stored as a bare function |
| <code>emit</code> | sync, in-order, over a snapshot |
| <code>once</code> | wrapper that detaches itself |

> **Interview tip:** Say it's "a **name→listeners map** with synchronous, in-order dispatch." Mention the single-vs-array storage optimization and the maxListeners=10 leak warning for extra depth.`,
    examples: [
      {
        label: "Synchronous, in-order dispatch",
        tech: "javascript",
        runnable: false,
        code: `import { EventEmitter } from 'node:events';
const ee = new EventEmitter();

ee.on('x', () => console.log('A'));
ee.on('x', () => console.log('B'));
console.log('before');
ee.emit('x');           // runs A then B synchronously...
console.log('after');   // ...so output is: before, A, B, after`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the concept of 'event-driven architecture' in Node.js.",
    answer: `**TL;DR.** **Event-driven architecture (EDA)** structures a program around **producing and reacting to events** rather than calling functions directly. Node embodies this: the **event loop** dispatches I/O completion events, and <code>EventEmitter</code> lets your components emit/observe domain events — decoupling producers from consumers.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Producers emit events that decoupled consumers react to'>
  <rect class='d-box' x='20' y='30' width='120' height='34' rx='8'/><text class='d-sub' x='80' y='52' text-anchor='middle'>order service</text>
  <rect class='d-box' x='20' y='104' width='120' height='34' rx='8'/><text class='d-sub' x='80' y='126' text-anchor='middle'>upload handler</text>
  <path class='d-edge-accent' d='M142 47 L200 75' marker-end='url(#c3)'/>
  <path class='d-edge-accent' d='M142 121 L200 93' marker-end='url(#c3)'/>
  <rect class='d-box-accent' x='202' y='66' width='90' height='36' rx='8'/><text class='d-text' x='247' y='89' text-anchor='middle'>events</text>
  <path class='d-edge-accent' d='M294 76 L352 48' marker-end='url(#c3)'/>
  <path class='d-edge-accent' d='M294 92 L352 120' marker-end='url(#c3)'/>
  <rect class='d-box' x='354' y='30' width='90' height='34' rx='8'/><text class='d-sub' x='399' y='52' text-anchor='middle'>email</text>
  <rect class='d-box' x='354' y='104' width='90' height='34' rx='8'/><text class='d-sub' x='399' y='126' text-anchor='middle'>analytics</text>
  <defs><marker id='c3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A producer **emits** an event (<code>order.created</code>) without knowing who listens; any number of **consumers** subscribe and react independently. This loose coupling makes systems extensible — add a new reaction (send SMS) without touching the producer. At runtime, Node's event loop is itself event-driven: it parks on I/O and runs callbacks when events (a socket is readable, a timer expired) occur. At larger scale, EDA extends to **message brokers** (Kafka, RabbitMQ) across services.

### EDA traits
| Trait | Benefit |
| --- | --- |
| Loose coupling | producers ≠ consumers |
| Extensible | add listeners freely |
| Async-friendly | reactions run independently |
| Watch out | flow harder to trace/debug |

> **Interview tip:** Connect the two levels: Node's **event loop** is event-driven at the runtime level, and <code>EventEmitter</code>/message queues bring EDA to your application/services level.`,
    examples: [
      {
        label: "Decoupled reactions to one domain event",
        tech: "javascript",
        runnable: false,
        code: `import { EventEmitter } from 'node:events';
const bus = new EventEmitter();

// Producer doesn't know who reacts:
function placeOrder(o) { bus.emit('order.created', o); }

// Independent consumers:
bus.on('order.created', (o) => sendConfirmationEmail(o));
bus.on('order.created', (o) => trackAnalytics('order', o));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are 'Event Emitting' patterns and how does error-first callback convention relate to them?",
    answer: `**TL;DR.** Node has two async patterns. **Error-first callbacks** ((<code>err, result</code>) as the last argument) suit **one-shot** operations like reading a file. **Event emitting** (<code>EventEmitter</code>) suits **repeated/streamed** results — many <code>'data'</code> events plus terminal <code>'end'</code>/<code>'error'</code> events. They share one rule: **errors are explicit**, either as the first callback arg or a dedicated <code>'error'</code> event.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Callback for one result, emitter for many events'>
  <rect class='d-box-accent' x='20' y='30' width='200' height='120' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>error-first callback</text>
  <text class='d-sub' x='120' y='80' text-anchor='middle'>fn(args, (err, res) =&gt; …)</text>
  <text class='d-sub' x='120' y='102' text-anchor='middle'>one result, then done</text>
  <text class='d-sub' x='120' y='124' text-anchor='middle'>error = first arg</text>
  <rect class='d-box-muted' x='240' y='30' width='200' height='120' rx='10'/>
  <text class='d-text' x='340' y='54' text-anchor='middle'>EventEmitter</text>
  <text class='d-sub' x='340' y='80' text-anchor='middle'>'data' × many</text>
  <text class='d-sub' x='340' y='102' text-anchor='middle'>'end' / 'error'</text>
  <text class='d-sub' x='340' y='124' text-anchor='middle'>error = 'error' event</text>
</svg>

**How it works.** The **error-first** convention (<code>(err, value)</code>) made callbacks composable and is what <code>util.promisify</code> relies on — always check <code>err</code> before using <code>value</code>. When an operation yields **multiple** values over time (a stream, a watcher), a single callback can't model it, so Node uses an emitter: subscribe to <code>'data'</code> for each chunk and to <code>'error'</code>/<code>'end'</code> for completion. Forgetting an <code>'error'</code> listener on an emitter throws — the emitter analog of ignoring the first callback arg.

### Pick the pattern
| Result shape | Pattern |
| --- | --- |
| Single value, once | error-first callback / Promise |
| Many values over time | EventEmitter / stream |
| Error signaling | <code>err</code> arg **or** <code>'error'</code> event |

> **Interview tip:** Contrast **one-shot (callback/Promise)** vs **multi/stream (emitter)**, and note both make errors first-class — an unhandled emitter <code>'error'</code> crashes just like ignoring <code>err</code>.`,
    examples: [
      {
        label: "Both conventions side by side",
        tech: "javascript",
        runnable: false,
        code: `// Error-first callback: one result
fs.readFile('a.txt', (err, data) => {
  if (err) return console.error(err);
  console.log(data.toString());
});

// EventEmitter/stream: many results + terminal events
const rs = fs.createReadStream('big.txt');
rs.on('data', (chunk) => process(chunk));
rs.on('error', (err) => console.error(err));   // required
rs.on('end', () => console.log('done'));`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain how modules work in Node.js.",
    answer: `**TL;DR.** A **module** is a file with its **own scope**: variables are private unless explicitly exported. Node supports two systems — **CommonJS** (<code>require</code>/<code>module.exports</code>, loaded synchronously) and **ES Modules** (<code>import</code>/<code>export</code>, statically analyzed). Each file is loaded once and **cached**, so repeated requires return the same instance.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='A module exports a public surface and hides internals'>
  <rect class='d-box-muted' x='20' y='30' width='200' height='110' rx='10'/>
  <text class='d-text' x='120' y='54' text-anchor='middle'>math.js</text>
  <text class='d-sub' x='120' y='78' text-anchor='middle'>const PI = 3.14  (private)</text>
  <rect class='d-box-accent' x='40' y='92' width='160' height='34' rx='6'/>
  <text class='d-sub' x='120' y='113' text-anchor='middle'>exports: add, sub</text>
  <path class='d-edge-accent' d='M222 109 H290' marker-end='url(#c4)'/>
  <text class='d-sub' x='256' y='100' text-anchor='middle'>require/import</text>
  <rect class='d-box' x='292' y='80' width='150' height='50' rx='8'/>
  <text class='d-sub' x='367' y='110' text-anchor='middle'>app.js uses add()</text>
  <defs><marker id='c4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Node wraps each CommonJS file in a function that injects <code>require</code>, <code>module</code>, <code>exports</code>, <code>__dirname</code>, and <code>__filename</code> — which is why those exist without imports. <code>require()</code> resolves the path (core module → file → <code>node_modules</code>), executes the file once, stores the result in <code>require.cache</code>, and returns <code>module.exports</code>. ESM instead builds a **static dependency graph** before executing, enabling tree-shaking and top-level await. Both isolate scope and cache modules.

### Module resolution order
| Specifier | Resolves to |
| --- | --- |
| <code>'fs'</code> | core module |
| <code>'./util'</code> | local file (.js/.json…) |
| <code>'lodash'</code> | nearest <code>node_modules</code> |
| package <code>exports</code> | declared entry points |

> **Interview tip:** Emphasize **module caching** (a require'd module is a singleton) and the **wrapper function** that supplies <code>require</code>/<code>module</code>/<code>__dirname</code>. Note CJS is synchronous, ESM is statically analyzed.`,
    examples: [
      {
        label: "Export, import, and caching",
        tech: "javascript",
        runnable: false,
        code: `// math.js (CommonJS)
const PI = 3.14159;                  // private to the module
function add(a, b) { return a + b; }
module.exports = { add };            // public surface

// app.js
const m1 = require('./math');
const m2 = require('./math');
console.log(m1 === m2);              // true — cached singleton`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Describe the Node.js module system. What are CommonJS and ES Modules?",
    answer: `**TL;DR.** Node ships **two** module systems. **CommonJS (CJS)** uses <code>require()</code>/<code>module.exports</code>, loads **synchronously** at runtime, and is dynamic. **ES Modules (ESM)** use <code>import</code>/<code>export</code>, are **statically analyzed** before execution, support **top-level await** and tree-shaking, and are the JavaScript standard. Node decides per file via extension and the package <code>"type"</code> field.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='CommonJS versus ES Modules characteristics'>
  <rect class='d-box-muted' x='20' y='25' width='200' height='130' rx='10'/>
  <text class='d-text' x='120' y='49' text-anchor='middle'>CommonJS</text>
  <text class='d-sub' x='120' y='74' text-anchor='middle'>require / module.exports</text>
  <text class='d-sub' x='120' y='96' text-anchor='middle'>synchronous, dynamic</text>
  <text class='d-sub' x='120' y='118' text-anchor='middle'>.cjs or "type":"commonjs"</text>
  <text class='d-sub' x='120' y='140' text-anchor='middle'>runtime resolution</text>
  <rect class='d-box-accent' x='240' y='25' width='200' height='130' rx='10'/>
  <text class='d-text' x='340' y='49' text-anchor='middle'>ES Modules</text>
  <text class='d-sub' x='340' y='74' text-anchor='middle'>import / export</text>
  <text class='d-sub' x='340' y='96' text-anchor='middle'>static, async graph</text>
  <text class='d-sub' x='340' y='118' text-anchor='middle'>.mjs or "type":"module"</text>
  <text class='d-sub' x='340' y='140' text-anchor='middle'>top-level await, tree-shake</text>
</svg>

**How it works.** CJS executes a file's code the moment it's <code>require</code>d and returns whatever you assign to <code>module.exports</code>; bindings are **values copied at require time**. ESM parses the whole graph first, links **live bindings** (an imported value reflects later changes in the exporter), then evaluates. ESM can <code>import</code> a CJS module (its <code>module.exports</code> becomes the default), but CJS cannot <code>require</code> an ESM module (use dynamic <code>import()</code>). New projects increasingly default to ESM.

### CJS vs ESM
| | CommonJS | ESM |
| --- | --- | --- |
| Syntax | <code>require</code>/<code>exports</code> | <code>import</code>/<code>export</code> |
| Loading | sync, runtime | static graph |
| Bindings | copied values | live bindings |
| Top-level await | ❌ | ✅ |

> **Interview tip:** Key differences interviewers probe: **sync vs static**, **copied vs live bindings**, and the **interop direction** (ESM can import CJS; CJS needs dynamic <code>import()</code> for ESM).`,
    examples: [
      {
        label: "Same module, both systems",
        tech: "javascript",
        runnable: false,
        code: `// CommonJS
const fs = require('node:fs');
module.exports = { ready: true };

// ES Module
import fs from 'node:fs';
export const ready = true;
const mod = await import('./dynamic.js');  // dynamic import works in both`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between \"type\": \"module\", .mjs, and .cjs?",
    answer: `**TL;DR.** Node decides a file's module system **per file**: <code>.mjs</code> is **always ESM**, <code>.cjs</code> is **always CommonJS**, and a plain <code>.js</code> follows the **nearest <code>package.json</code> <code>"type"</code>** field — <code>"module"</code> means ESM, while <code>"commonjs"</code> or absent means CJS. The explicit extensions override the package default.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='How file extension and type field decide ESM vs CJS'>
  <rect class='d-box' x='20' y='30' width='120' height='40' rx='8'/><text class='d-text' x='80' y='54' text-anchor='middle'>.mjs</text>
  <path class='d-edge-accent' d='M142 50 H210' marker-end='url(#c5)'/>
  <rect class='d-box-accent' x='212' y='30' width='100' height='40' rx='8'/><text class='d-text' x='262' y='54' text-anchor='middle'>ESM</text>
  <rect class='d-box' x='20' y='110' width='120' height='40' rx='8'/><text class='d-text' x='80' y='134' text-anchor='middle'>.cjs</text>
  <path class='d-edge' d='M142 130 H210' marker-end='url(#c5)'/>
  <rect class='d-box-muted' x='212' y='110' width='100' height='40' rx='8'/><text class='d-text' x='262' y='134' text-anchor='middle'>CommonJS</text>
  <rect class='d-box' x='330' y='70' width='120' height='40' rx='8'/><text class='d-sub' x='390' y='86' text-anchor='middle'>.js → follows</text>
  <text class='d-sub' x='390' y='102' text-anchor='middle'>"type" field</text>
  <defs><marker id='c5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** When Node loads a <code>.js</code> file it walks up to the closest <code>package.json</code>; <code>"type": "module"</code> makes every <code>.js</code> there ESM (so you must use <code>import</code>, and <code>require</code>/<code>__dirname</code> are unavailable). To drop a CommonJS file into an ESM package, name it <code>.cjs</code>; to use ESM in a CJS package, name it <code>.mjs</code>. This per-file control lets you migrate gradually. Tooling (bundlers, ts) generally respects the same rules.

### Resolution matrix
| File | Module system |
| --- | --- |
| <code>*.mjs</code> | ESM (always) |
| <code>*.cjs</code> | CommonJS (always) |
| <code>*.js</code> + <code>"type":"module"</code> | ESM |
| <code>*.js</code> + no/<code>"commonjs"</code> | CommonJS |

> **Interview tip:** State the precedence: **extension wins, otherwise the nearest <code>package.json</code> <code>"type"</code> decides.** Note that in an ESM file <code>__dirname</code>/<code>require</code> don't exist — derive paths from <code>import.meta.url</code>.`,
    examples: [
      {
        label: "Mixing systems in one package",
        tech: "javascript",
        runnable: false,
        code: `// package.json
{ "type": "module" }      // .js files here are ESM

// index.js  → ESM
import { helper } from './helper.js';

// legacy.cjs → CommonJS even though package is "module"
const old = require('old-lib');
module.exports = { old };`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle circular dependencies in Node.js?",
    answer: `**TL;DR.** A **circular dependency** is when module A requires B and B requires A. Node won't infinite-loop — it returns a **partial export** of whichever module is still mid-execution. That can yield <code>undefined</code> imports if you use them at load time. Fix by **restructuring** (extract shared code into a third module), deferring access, or using late <code>require</code>.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A requires B and B requires A, forming a cycle'>
  <rect class='d-box-accent' x='60' y='55' width='110' height='44' rx='8'/><text class='d-text' x='115' y='82' text-anchor='middle'>module A</text>
  <rect class='d-box-accent' x='290' y='55' width='110' height='44' rx='8'/><text class='d-text' x='345' y='82' text-anchor='middle'>module B</text>
  <path class='d-edge-accent' d='M172 68 H288' marker-end='url(#c6)'/>
  <text class='d-sub' x='230' y='60' text-anchor='middle'>require(B)</text>
  <path class='d-edge-dashed' d='M288 90 H172' marker-end='url(#c6)'/>
  <text class='d-sub' x='230' y='112' text-anchor='middle'>require(A) → partial exports</text>
  <defs><marker id='c6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** In CommonJS, when A starts and requires B, B runs and requires A — but A isn't finished, so B receives A's <code>module.exports</code> **as it exists so far** (possibly empty). If B only *uses* A's exports later (inside a function called at runtime), it works because by then A is complete; using them at the top level breaks. ESM handles cycles better via **live bindings** (the imported name resolves when accessed), but a value read during evaluation can still be in the temporal dead zone. The cleanest fix is to remove the cycle.

### Strategies
| Strategy | How |
| --- | --- |
| Extract shared module | break A↔B into A→C←B |
| Defer usage | use imports inside functions, not at top |
| Late <code>require</code> | <code>require</code> inside the function body |
| Prefer ESM live bindings | access on use, not at eval |

> **Interview tip:** Explain Node returns a **partially-populated export** rather than looping, and that the real fix is **decoupling** (extract shared code) — not clever ordering tricks.`,
    examples: [
      {
        label: "Why the import is undefined — and the fix",
        tech: "javascript",
        runnable: false,
        code: `// a.js
const b = require('./b');
console.log('b.value at load:', b.value);  // undefined (b not finished)
module.exports.fromA = 'A';

// b.js
const a = require('./a');                  // a is mid-load → partial
module.exports.value = 42;
// Fix: read a.fromA inside a function, not at top level.`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is top-level await and what are its caveats in Node.js ESM?",
    answer: `**TL;DR.** **Top-level await** lets you use <code>await</code> directly in an **ES module** body (no wrapping <code>async</code> function). It's great for async setup — opening a DB, dynamic imports, fetching config. The caveat: it **blocks the importing module** until it resolves, so a slow top-level await delays everything downstream and can deadlock with circular imports.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='An importer waits for the awaited module to finish initializing'>
  <rect class='d-box-accent' x='20' y='50' width='150' height='50' rx='8'/>
  <text class='d-text' x='95' y='73' text-anchor='middle'>config.js</text>
  <text class='d-sub' x='95' y='90' text-anchor='middle'>await loadConfig()</text>
  <path class='d-edge-accent' d='M172 75 H250' marker-end='url(#c7)'/>
  <text class='d-sub' x='211' y='66' text-anchor='middle'>blocks until done</text>
  <rect class='d-box' x='252' y='50' width='190' height='50' rx='8'/>
  <text class='d-text' x='347' y='73' text-anchor='middle'>app.js (importer)</text>
  <text class='d-sub' x='347' y='90' text-anchor='middle'>resumes after resolve</text>
  <defs><marker id='c7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** ESM evaluation is asynchronous, so a module containing top-level await becomes an **async dependency**: modules that import it pause their own evaluation until it settles. This is perfect for one-time initialization, but it serializes startup — keep top-level awaits **fast** and avoid them on hot import paths. It's **ESM-only** (CommonJS can't use it). With circular dependencies, two modules each awaiting the other can deadlock. Use it for setup, not for per-request work.

### Good vs risky uses
| Use | Verdict |
| --- | --- |
| Load config / connect DB at boot | ✅ ideal |
| Conditional dynamic <code>import()</code> | ✅ fine |
| Slow call on a widely-imported module | ⚠️ delays all importers |
| Mutual await across a cycle | ❌ deadlock risk |

> **Interview tip:** Note it's **ESM-only** and that it makes the module an **async dependency** — importers wait. Great for initialization, dangerous if slow or entangled in import cycles.`,
    examples: [
      {
        label: "Async initialization at module scope",
        tech: "javascript",
        runnable: false,
        code: `// db.js (ESM) — no async wrapper needed
import { connect } from './driver.js';

export const db = await connect(process.env.DATABASE_URL);
// Any module importing { db } waits until the connection is ready.`,
      },
    ],
  },
];

export default augments;
