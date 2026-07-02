/**
 * Node Phase N3 — Batch 2 (Event-loop internals & async primitives).
 * See node-augments-gold-1.ts for conventions.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is `process.nextTick()` and `setImmediate()` and when to use them?",
    answer: `**TL;DR.** Both defer work, but at very different times. <code>process.nextTick(cb)</code> runs **before the event loop continues** — right after the current operation, ahead of Promises and any phase. <code>setImmediate(cb)</code> runs in the **check** phase, *after* the current poll phase completes. Rule of thumb: <code>setImmediate</code> for "run after I/O", <code>nextTick</code> sparingly for "run before anything else".

<svg class='iq-diagram' viewBox='0 0 460 180' role='img' aria-label='nextTick runs before promises and the next phase; setImmediate runs in the check phase'>
  <rect class='d-box' x='20' y='30' width='120' height='40' rx='8'/>
  <text class='d-sub' x='80' y='54' text-anchor='middle'>current op</text>
  <path class='d-edge-accent' d='M142 50 H180' marker-end='url(#b1)'/>
  <rect class='d-box-accent' x='182' y='30' width='120' height='40' rx='8'/>
  <text class='d-text' x='242' y='50' text-anchor='middle'>nextTick queue</text>
  <text class='d-sub' x='242' y='64' text-anchor='middle'>runs first</text>
  <path class='d-edge' d='M242 72 V100' marker-end='url(#b1)'/>
  <rect class='d-box' x='182' y='102' width='120' height='34' rx='8'/>
  <text class='d-sub' x='242' y='123' text-anchor='middle'>Promise microtasks</text>
  <rect class='d-box-muted' x='330' y='30' width='110' height='106' rx='8'/>
  <text class='d-text' x='385' y='54' text-anchor='middle'>check phase</text>
  <text class='d-sub' x='385' y='78' text-anchor='middle'>setImmediate</text>
  <text class='d-sub' x='385' y='98' text-anchor='middle'>after poll/I/O</text>
  <defs><marker id='b1' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** The <code>nextTick</code> queue is drained **after each operation and before** the Promise microtask queue, then the loop proceeds. Because it jumps the line, recursive <code>nextTick</code> calls can **starve the event loop** entirely (I/O never gets a turn). <code>setImmediate</code> is a normal phase callback, so it always yields to I/O first. Inside an I/O callback, <code>setImmediate</code> reliably runs before a <code>setTimeout(…,0)</code>; at the top level their order isn't guaranteed.

### nextTick vs setImmediate
| | <code>process.nextTick</code> | <code>setImmediate</code> |
| --- | --- | --- |
| When | before promises + next phase | check phase (after poll) |
| Yields to I/O? | ❌ no | ✅ yes |
| Risk | can starve the loop | safe |
| Use for | break a sync stack early | "run after this I/O cycle" |

> **Interview tip:** Say "**nextTick fires before Promises; setImmediate fires after I/O**." Warn that recursive <code>nextTick</code> starves the loop — prefer <code>setImmediate</code> for deferral.`,
    examples: [
      {
        label: "Ordering of the two",
        tech: "javascript",
        runnable: false,
        code: `setImmediate(() => console.log('3 immediate'));     // check phase
Promise.resolve().then(() => console.log('2 promise')); // microtask
process.nextTick(() => console.log('1 nextTick'));       // before all

// Output: 1 nextTick, 2 promise, 3 immediate`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain the concept of 'Event Loop Pollution' and how to avoid it.",
    answer: `**TL;DR.** **Event-loop pollution** (a.k.a. microtask/nextTick starvation) is when an endless stream of **microtasks** — recursive <code>process.nextTick</code> or Promise chains — keeps the loop draining microtasks so it **never reaches I/O or timer phases**. The server appears frozen even though the CPU is busy. Fix it by yielding via <code>setImmediate</code> and chunking work.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Microtask queue refills before the loop can advance to I/O'>
  <rect class='d-box-accent' x='40' y='50' width='150' height='70' rx='10'/>
  <text class='d-text' x='115' y='78' text-anchor='middle'>Microtask drain</text>
  <text class='d-sub' x='115' y='100' text-anchor='middle'>keeps refilling itself</text>
  <path class='d-edge-dashed' d='M150 50 C190 20 60 20 95 50' marker-end='url(#b2)'/>
  <path class='d-edge' d='M192 85 H250' marker-end='url(#b2)'/>
  <text class='d-sub' x='221' y='76' text-anchor='middle'>never reaches</text>
  <rect class='d-box-muted' x='252' y='50' width='160' height='70' rx='10'/>
  <text class='d-text' x='332' y='78' text-anchor='middle'>I/O + timers</text>
  <text class='d-sub' x='332' y='100' text-anchor='middle'>starved ⇒ "frozen"</text>
  <defs><marker id='b2' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** After every callback the loop fully drains <code>nextTick</code> then Promise microtasks **before** advancing. If those callbacks schedule more microtasks, the queue never empties, so timers and socket I/O are postponed indefinitely. The same effect comes from a giant synchronous loop. The cure is to **yield**: split heavy work into chunks scheduled with <code>setImmediate</code> (which runs in a phase and lets I/O through), or move CPU work to a worker thread.

### Causes and fixes
| Cause | Fix |
| --- | --- |
| Recursive <code>process.nextTick</code> | use <code>setImmediate</code> instead |
| Unbounded Promise recursion | break into <code>setImmediate</code> chunks |
| Huge synchronous loop | chunk it / worker thread |
| Tight JSON/crypto in handler | stream / offload |

> **Interview tip:** Tie it back to phases: microtasks run **between** callbacks, so an endlessly self-feeding microtask queue starves I/O. The fix is to **yield with <code>setImmediate</code>** or offload to a worker.`,
    examples: [
      {
        label: "Starvation vs a yielding version",
        tech: "javascript",
        runnable: false,
        code: `// ❌ starves the loop: nextTick re-queues before I/O can run
function spin() { process.nextTick(spin); }

// ✅ chunked with setImmediate: lets timers + sockets run between chunks
function process(items, i = 0) {
  if (i >= items.length) return;
  doWork(items[i]);
  setImmediate(() => process(items, i + 1));
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are Promises in Node.js and how do they improve async code?",
    answer: `**TL;DR.** A **Promise** is an object representing the eventual result of an async operation — **pending**, then **fulfilled** (value) or **rejected** (error). It replaces nested callbacks with chainable <code>.then()/.catch()</code>, enables composition (<code>Promise.all</code>, <code>allSettled</code>, <code>race</code>), and underpins <code>async/await</code>.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Promise states: pending to fulfilled or rejected'>
  <rect class='d-box-accent' x='160' y='60' width='130' height='44' rx='10'/>
  <text class='d-text' x='225' y='86' text-anchor='middle'>pending</text>
  <path class='d-edge-accent' d='M290 72 L360 40' marker-end='url(#b3)'/>
  <path class='d-edge' d='M290 92 L360 124' marker-end='url(#b3)'/>
  <rect class='d-box' x='362' y='20' width='90' height='40' rx='8'/>
  <text class='d-text' x='407' y='44' text-anchor='middle'>fulfilled</text>
  <rect class='d-box-muted' x='362' y='104' width='90' height='40' rx='8'/>
  <text class='d-text' x='407' y='128' text-anchor='middle'>rejected</text>
  <text class='d-sub' x='70' y='86' text-anchor='middle'>.then / .catch</text>
  <defs><marker id='b3' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** A promise settles **once** and is immutable thereafter. <code>.then</code> returns a **new** promise, so chains flatten async steps and propagate errors to a single trailing <code>.catch</code> — no nested pyramids. Promise reactions run as **microtasks**, so they execute before timers/I/O of the next tick. Combinators let you express common shapes: <code>Promise.all</code> (all-or-nothing, parallel), <code>allSettled</code> (collect every outcome), <code>race</code>/<code>any</code> (first to settle).

### Combinators
| Combinator | Resolves when | On failure |
| --- | --- | --- |
| <code>all</code> | all fulfil | rejects on first error |
| <code>allSettled</code> | all settle | never rejects |
| <code>race</code> | first settles | first settle wins (incl. reject) |
| <code>any</code> | first fulfils | rejects only if all fail |

> **Interview tip:** Mention promises run as **microtasks** and that <code>Promise.all</code> rejects fast while <code>allSettled</code> waits for everything — picking the right combinator is a common follow-up.`,
    examples: [
      {
        label: "Chaining + parallel composition",
        tech: "javascript",
        runnable: false,
        code: `// Flat chain, single error path
fetch('/api/user')
  .then(r => r.json())
  .then(user => fetch('/api/orders/' + user.id))
  .then(r => r.json())
  .catch(err => console.error('any step failed:', err));

// Run independent work in parallel:
const [a, b] = await Promise.all([fetch('/a'), fetch('/b')]);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does `async/await` work and what are its benefits?",
    answer: `**TL;DR.** <code>async/await</code> is **syntactic sugar over Promises**. An <code>async</code> function always returns a Promise; <code>await</code> pauses the function until the awaited Promise settles, then resumes with its value — letting you write asynchronous code that **reads top-to-bottom** with ordinary <code>try/catch</code> for errors.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='await pauses the async function and resumes after the promise settles'>
  <rect class='d-box' x='20' y='60' width='110' height='40' rx='8'/>
  <text class='d-sub' x='75' y='84' text-anchor='middle'>run until await</text>
  <path class='d-edge-accent' d='M132 80 H175' marker-end='url(#b4)'/>
  <rect class='d-box-accent' x='177' y='60' width='110' height='40' rx='8'/>
  <text class='d-text' x='232' y='80' text-anchor='middle'>await</text>
  <text class='d-sub' x='232' y='95' text-anchor='middle'>yield to loop</text>
  <path class='d-edge-dashed' d='M289 80 H332' marker-end='url(#b4)'/>
  <rect class='d-box' x='334' y='60' width='110' height='40' rx='8'/>
  <text class='d-sub' x='389' y='80' text-anchor='middle'>resume w/ value</text>
  <text class='d-sub' x='232' y='130' text-anchor='middle'>function suspends, the event loop keeps running</text>
  <defs><marker id='b4' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>await p</code> registers a continuation on <code>p</code> as a microtask and **suspends** the async function, returning control to the event loop so other work proceeds. When <code>p</code> fulfils, the function resumes with the value; if it rejects, <code>await</code> throws, caught by <code>try/catch</code>. A subtle pitfall: <code>await</code>-ing in a loop **serializes** independent operations — use <code>Promise.all</code> to run them concurrently.

### async/await benefits
| Over callbacks/then | Why |
| --- | --- |
| Linear reading | no nesting / pyramids |
| <code>try/catch</code> | unified sync-style errors |
| Easy branching/loops | normal control flow |
| Watch out | sequential awaits lose concurrency |

> **Interview tip:** Say "it's sugar over Promises." Then flag the **<code>await</code>-in-a-loop** trap and show <code>Promise.all</code> for parallelism — interviewers love that distinction.`,
    examples: [
      {
        label: "Sequential vs concurrent awaits",
        tech: "javascript",
        runnable: false,
        code: `// ❌ serial: each await waits for the previous (3x slower)
async function slow(ids) {
  const out = [];
  for (const id of ids) out.push(await getUser(id));
  return out;
}

// ✅ concurrent: kick off all, await together
async function fast(ids) {
  return Promise.all(ids.map(getUser));
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "Explain what 'callback hell' is and how to avoid it.",
    answer: `**TL;DR.** **Callback hell** is deeply nested callbacks ("the pyramid of doom") that arises when async steps depend on each other. It's hard to read, error-prone (every level needs its own error check), and tough to refactor. Avoid it with **Promises**, **async/await**, and **named functions** instead of inline nesting.

<svg class='iq-diagram' viewBox='0 0 460 170' role='img' aria-label='Nested callbacks form a rightward pyramid'>
  <rect class='d-box-muted' x='20' y='20' width='420' height='30' rx='6'/><text class='d-sub' x='34' y='40'>step1(a, (e, r) =&gt; {</text>
  <rect class='d-box-muted' x='50' y='54' width='390' height='30' rx='6'/><text class='d-sub' x='64' y='74'>step2(r, (e, r) =&gt; {</text>
  <rect class='d-box-muted' x='80' y='88' width='360' height='30' rx='6'/><text class='d-sub' x='94' y='108'>step3(r, (e, r) =&gt; { … })</text>
  <rect class='d-box' x='110' y='122' width='330' height='30' rx='6'/><text class='d-sub' x='124' y='142'>}) }) — error handling repeated at each level</text>
</svg>

**How it works.** Each callback nests inside the previous, marching the code rightward and duplicating error handling. Promises flatten this into a **single chain** with one <code>.catch</code>; <code>async/await</code> flattens it further into linear statements with <code>try/catch</code>. For sequences, await step by step; for independent work, compose with <code>Promise.all</code>. Wrapping legacy callback APIs with <code>util.promisify</code> lets you adopt these patterns incrementally.

### Escape routes
| Technique | Effect |
| --- | --- |
| Promises | flat chain, one error path |
| async/await | linear, <code>try/catch</code> |
| Named functions | shallower nesting |
| <code>util.promisify</code> | modernize callback APIs |

> **Interview tip:** Name the root cause — **dependent async steps + inline callbacks** — then show the async/await rewrite. Bonus: mention <code>util.promisify</code> for bridging old callback-style APIs.`,
    examples: [
      {
        label: "Pyramid → async/await",
        tech: "javascript",
        runnable: false,
        code: `// ❌ callback hell
getUser(id, (e, user) => {
  getOrders(user, (e, orders) => {
    getInvoices(orders, (e, invoices) => { /* ... */ });
  });
});

// ✅ flat with async/await
const user = await getUser(id);
const orders = await getOrders(user);
const invoices = await getInvoices(orders);`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the util.promisify function in Node.js?",
    answer: `**TL;DR.** <code>util.promisify</code> converts a classic **error-first callback** function (<code>(err, result) => …</code>) into one that **returns a Promise**, so you can <code>await</code> legacy Node APIs instead of nesting callbacks. Many core modules also ship promise versions (e.g. <code>fs/promises</code>) you can use directly.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='promisify wraps a callback function into a promise-returning one'>
  <rect class='d-box' x='20' y='50' width='160' height='50' rx='8'/>
  <text class='d-text' x='100' y='72' text-anchor='middle'>fn(args, cb)</text>
  <text class='d-sub' x='100' y='90' text-anchor='middle'>cb(err, result)</text>
  <path class='d-edge-accent' d='M182 75 H260' marker-end='url(#b5)'/>
  <text class='d-sub' x='221' y='66' text-anchor='middle'>promisify</text>
  <rect class='d-box-accent' x='262' y='50' width='180' height='50' rx='8'/>
  <text class='d-text' x='352' y='72' text-anchor='middle'>fn(args) → Promise</text>
  <text class='d-sub' x='352' y='90' text-anchor='middle'>await / .then</text>
  <defs><marker id='b5' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** <code>promisify</code> assumes the **Node convention**: the callback is the last argument and receives <code>(err, value)</code>. It returns a function that calls the original, resolving with <code>value</code> or rejecting with <code>err</code>. Functions that don't follow this convention (e.g. multiple success values, or <code>(value)</code> with no error) need a manual wrapper or a custom <code>util.promisify.custom</code> implementation. Prefer built-in promise APIs (<code>fs/promises</code>, <code>timers/promises</code>) when they exist.

### When to use what
| Situation | Approach |
| --- | --- |
| Core has promise API | use it (<code>fs/promises</code>) |
| Third-party error-first cb | <code>util.promisify</code> |
| Non-standard callback | manual <code>new Promise</code> |
| Custom behavior | <code>util.promisify.custom</code> |

> **Interview tip:** Stress the **error-first contract** it relies on, and that core modules increasingly expose native promise variants so you often don't need promisify at all.`,
    examples: [
      {
        label: "Promisify a callback API",
        tech: "javascript",
        runnable: false,
        code: `import { promisify } from 'node:util';
import { readFile } from 'node:fs';

const readFileAsync = promisify(readFile);
const text = await readFileAsync('./data.txt', 'utf8');

// Equivalent built-in promise API (preferred):
import { readFile as read } from 'node:fs/promises';
const text2 = await read('./data.txt', 'utf8');`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the purpose of the AbortController in modern Node.js?",
    answer: `**TL;DR.** <code>AbortController</code> provides a **standard way to cancel** async operations. You pass its <code>signal</code> to a cancelable API (fetch, streams, timers, custom code); calling <code>controller.abort()</code> fires the signal's <code>'abort'</code> event and makes the operation reject with an <code>AbortError</code>. It's the same primitive used in browsers, so the pattern is portable.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='AbortController signal cancels a pending operation'>
  <rect class='d-box-accent' x='20' y='55' width='150' height='50' rx='8'/>
  <text class='d-text' x='95' y='78' text-anchor='middle'>AbortController</text>
  <text class='d-sub' x='95' y='95' text-anchor='middle'>.abort()</text>
  <path class='d-edge-accent' d='M172 80 H250' marker-end='url(#b6)'/>
  <text class='d-sub' x='211' y='70' text-anchor='middle'>signal</text>
  <rect class='d-box' x='252' y='55' width='190' height='50' rx='8'/>
  <text class='d-text' x='347' y='78' text-anchor='middle'>fetch / stream / timer</text>
  <text class='d-sub' x='347' y='95' text-anchor='middle'>rejects with AbortError</text>
  <defs><marker id='b6' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Create a controller, read its <code>signal</code>, and hand the signal to any API that accepts one. The operation listens for <code>'abort'</code> and tears down (closes the socket, clears the timer). You trigger cancellation with <code>abort(reason)</code>. This replaces ad-hoc cancellation flags with one composable mechanism — and a single controller can cancel **many** operations at once by sharing its signal.

### Where signals plug in
| API | Accepts a signal |
| --- | --- |
| <code>fetch(url, { signal })</code> | ✅ |
| <code>fs.readFile(path, { signal })</code> | ✅ |
| <code>setTimeout</code> (timers/promises) | ✅ |
| streams, <code>events.once</code> | ✅ |

> **Interview tip:** Frame it as the **universal cancellation token** of modern JS/Node. Mention you can pass one signal to several operations and that abort surfaces as an <code>AbortError</code> you handle in <code>catch</code>.`,
    examples: [
      {
        label: "Cancel a fetch on a timeout or user action",
        tech: "javascript",
        runnable: false,
        code: `const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 2000);

try {
  const res = await fetch('https://slow.api/data', { signal: controller.signal });
  return await res.json();
} catch (err) {
  if (err.name === 'AbortError') console.log('request cancelled');
  else throw err;
} finally {
  clearTimeout(timer);
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is AbortSignal.timeout and how do you cancel async work cleanly?",
    answer: `**TL;DR.** <code>AbortSignal.timeout(ms)</code> returns a signal that **auto-aborts after a delay** — a one-liner deadline you pass to fetch/streams/timers. <code>AbortSignal.any([...signals])</code> combines several signals into one that fires if **any** does. Together they make timeouts and multi-source cancellation clean and leak-free.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='timeout and any combine into one signal that cancels work'>
  <rect class='d-box' x='20' y='30' width='150' height='34' rx='8'/>
  <text class='d-sub' x='95' y='52' text-anchor='middle'>timeout(2000)</text>
  <rect class='d-box' x='20' y='96' width='150' height='34' rx='8'/>
  <text class='d-sub' x='95' y='118' text-anchor='middle'>user abort</text>
  <path class='d-edge' d='M172 47 L240 70' marker-end='url(#b7)'/>
  <path class='d-edge' d='M172 113 L240 90' marker-end='url(#b7)'/>
  <rect class='d-box-accent' x='242' y='62' width='90' height='36' rx='8'/>
  <text class='d-text' x='287' y='85' text-anchor='middle'>any()</text>
  <path class='d-edge-accent' d='M334 80 H392' marker-end='url(#b7)'/>
  <rect class='d-box' x='394' y='62' width='56' height='36' rx='8'/>
  <text class='d-sub' x='422' y='85' text-anchor='middle'>cancel</text>
  <defs><marker id='b7' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Instead of manually creating a controller and a <code>setTimeout</code> to call <code>abort()</code>, <code>AbortSignal.timeout</code> bundles that into a self-cleaning signal (it aborts with a <code>TimeoutError</code>). To combine a request deadline with a user-initiated cancel, wrap both in <code>AbortSignal.any</code>. The awaited operation rejects when the signal fires, and because the timer is owned by the signal there's no dangling <code>setTimeout</code> to clear.

### Cancellation toolkit
| Helper | Use |
| --- | --- |
| <code>new AbortController()</code> | manual / user-triggered |
| <code>AbortSignal.timeout(ms)</code> | auto deadline |
| <code>AbortSignal.any([...])</code> | first-of-many cancels |
| <code>signal.throwIfAborted()</code> | bail early in custom loops |

> **Interview tip:** Show <code>AbortSignal.timeout</code> as the modern replacement for the controller-plus-setTimeout boilerplate, and mention <code>AbortSignal.any</code> for composing a deadline with user cancellation.`,
    examples: [
      {
        label: "Deadline + user cancel combined",
        tech: "javascript",
        runnable: false,
        code: `const user = new AbortController();

const res = await fetch('https://api/data', {
  // aborts if 3s pass OR the user cancels — whichever first
  signal: AbortSignal.any([AbortSignal.timeout(3000), user.signal]),
});

// elsewhere: user.abort()  → cancels immediately`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is AsyncLocalStorage and what problem does it solve?",
    answer: `**TL;DR.** <code>AsyncLocalStorage</code> (from <code>node:async_hooks</code>) stores data that **stays attached to a logical async chain** as it flows through callbacks, promises, and timers. It solves request-scoped context — a **request id**, user, or trace id available everywhere in a request — without threading parameters through every function call.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Context persists across async hops within one request'>
  <rect class='d-box-accent' x='20' y='50' width='110' height='44' rx='8'/>
  <text class='d-text' x='75' y='72' text-anchor='middle'>run(store)</text>
  <text class='d-sub' x='75' y='88' text-anchor='middle'>{ reqId }</text>
  <path class='d-edge-accent' d='M132 72 H180' marker-end='url(#b8)'/>
  <rect class='d-box' x='182' y='50' width='100' height='44' rx='8'/>
  <text class='d-sub' x='232' y='76' text-anchor='middle'>await db</text>
  <path class='d-edge-accent' d='M284 72 H332' marker-end='url(#b8)'/>
  <rect class='d-box' x='334' y='50' width='110' height='44' rx='8'/>
  <text class='d-sub' x='389' y='70' text-anchor='middle'>log() reads</text>
  <text class='d-sub' x='389' y='86' text-anchor='middle'>same reqId</text>
  <text class='d-sub' x='230' y='130' text-anchor='middle'>store survives every async boundary in this chain</text>
  <defs><marker id='b8' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** You wrap the start of a logical operation in <code>als.run(store, callback)</code>. Any code executed within that callback — however deeply nested or asynchronous — can call <code>als.getStore()</code> to read the same store, because Node propagates it across async hops. It's the Node analog of thread-local storage. Common uses: per-request logging context, distributed trace propagation, and multi-tenant scoping. There's a small overhead, so keep stores lean.

### Why not just pass params?
| Approach | Downside |
| --- | --- |
| Thread params everywhere | pollutes every signature |
| Global variable | clobbered by concurrent requests |
| <code>AsyncLocalStorage</code> | per-chain isolation, no plumbing |

> **Interview tip:** Describe it as **thread-local storage for async** — request-scoped context without parameter drilling. Mention it powers per-request logging and OpenTelemetry trace propagation.`,
    examples: [
      {
        label: "Per-request id available to any logger",
        tech: "javascript",
        runnable: false,
        code: `import { AsyncLocalStorage } from 'node:async_hooks';
const als = new AsyncLocalStorage();

app.use((req, res, next) =>
  als.run({ reqId: crypto.randomUUID() }, () => next()));

function log(msg) {
  const { reqId } = als.getStore() ?? {};
  console.log(JSON.stringify({ reqId, msg }));   // no reqId param needed
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What does the events.once() helper do and how does it bridge EventEmitter and async/await?",
    answer: `**TL;DR.** <code>events.once(emitter, name)</code> returns a **Promise that resolves with the next emission** of that event (and **rejects** if the emitter fires <code>'error'</code> first). It lets you <code>await</code> a one-shot event — like a server <code>'listening'</code> or a stream <code>'end'</code> — instead of wiring up <code>.on()</code> callbacks.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='events.once turns the next event into an awaitable promise'>
  <rect class='d-box' x='20' y='55' width='150' height='44' rx='8'/>
  <text class='d-text' x='95' y='77' text-anchor='middle'>emitter</text>
  <text class='d-sub' x='95' y='93' text-anchor='middle'>emit('ready')</text>
  <path class='d-edge-accent' d='M172 77 H250' marker-end='url(#b9)'/>
  <text class='d-sub' x='211' y='68' text-anchor='middle'>once()</text>
  <rect class='d-box-accent' x='252' y='55' width='190' height='44' rx='8'/>
  <text class='d-text' x='347' y='77' text-anchor='middle'>await → resolves once</text>
  <text class='d-sub' x='347' y='93' text-anchor='middle'>rejects on 'error'</text>
  <defs><marker id='b9' markerWidth='8' markerHeight='8' refX='6' refY='3' orient='auto'><path class='d-arrow' d='M0,0 L6,3 L0,6 Z'/></marker></defs>
</svg>

**How it works.** Internally it attaches one-time listeners for the target event and for <code>'error'</code>, resolving or rejecting the promise on whichever fires first, then removing both. The resolved value is an **array** of the emitted arguments. It also accepts an <code>AbortSignal</code> so you can give the wait a deadline. Use it only for **single, terminal** events — for repeated events (<code>'data'</code>) use <code>events.on()</code> (an async iterator) or normal listeners.

### once() vs on()
| Helper | Shape | Use for |
| --- | --- | --- |
| <code>events.once</code> | Promise of next event | one-shot signals |
| <code>events.on</code> | async iterator | streams of events |
| <code>emitter.on</code> | callback | classic listeners |

> **Interview tip:** Pitch it as the **EventEmitter→async bridge** for one-time events, noting it rejects on <code>'error'</code> and supports an <code>AbortSignal</code> for timeouts.`,
    examples: [
      {
        label: "Await a server starting",
        tech: "javascript",
        runnable: false,
        code: `import { once } from 'node:events';
import { createServer } from 'node:http';

const server = createServer().listen(3000);
await once(server, 'listening');     // resolves when ready
console.log('server is up');

// With a deadline:
await once(server, 'listening', { signal: AbortSignal.timeout(5000) });`,
      },
    ],
  },
];

export default augments;
