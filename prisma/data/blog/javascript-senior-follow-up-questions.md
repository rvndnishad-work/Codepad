Ask a room of JavaScript developers "What is a closure?" and almost everyone gives the same answer: *a function that remembers its outer variables.* That's correct. Then the follow-ups start, and that's where a lot of good answers fall apart.

This post works through those follow-ups one at a time. It covers closures, the event loop and the engine-level topics senior interviews tend to reach. Each question gets a short answer you could say out loud, the explanation behind it, and a small program you can run. The examples marked **Run** run in your browser on this page. The others need Node flags, and their output was captured with Node 22.

---

## Part 1: Closures

### What is a closure, really?

> **Short answer:** A closure is a function together with a reference to the scope it was created in. As long as the function is reachable, the variables it uses from that scope stay alive.

"Remembers its outer variables" is close, but the word that matters is *reference*. In the spec, every function object has an internal slot called `[[Environment]]` that points at the scope (the *environment record*) where the function was defined. Calling the function later creates a new scope whose parent is that saved environment. So a closure isn't a copy of anything. It's a live link to a scope.

There's more on the basics in [What are closures in JavaScript?](/interview-question/what-are-closures-in-javascript).

### Do closures store values or references?

> **Short answer:** References. A closure captures the variable binding itself, not a snapshot of its value. If the variable changes later, the closure sees the new value.

```javascript-run
// Closures capture variables (bindings), not a snapshot of their values.
function makeCounter() {
  let count = 0;
  return {
    inc: () => ++count,
    peek: () => count,
  };
}
const c = makeCounter();
c.inc();
c.inc();
console.log("peek sees the same binding:", c.peek());

// The classic loop: var gives one shared binding, let gives one per iteration.
const withVar = [];
for (var i = 0; i < 3; i++) withVar.push(() => i);
const withLet = [];
for (let j = 0; j < 3; j++) withLet.push(() => j);
console.log("var:", withVar.map((f) => f()).join(","));
console.log("let:", withLet.map((f) => f()).join(","));

// Capturing an object captures the binding; mutation is visible, reassignment too.
let config = { mode: "dev" };
const readMode = () => config.mode;
config.mode = "prod";
console.log("after mutation:", readMode());
config = { mode: "test" };
console.log("after reassignment:", readMode());
```

Output:

```text
peek sees the same binding: 2
var: 3,3,3
let: 0,1,2
after mutation: prod
after reassignment: test
```

Three things to point out in an interview:

- `inc` and `peek` share **one** `count`. Two closures created in the same scope see the same variable.
- The `var` loop prints `3,3,3` because there is one `i` for the whole function, and every closure reads it after the loop has finished. `let` creates a fresh binding for each iteration, so each closure gets its own `j`.
- Reassigning `config` is visible to `readMode`. That's only possible because the closure holds the variable, not the object it pointed to when the closure was created.

### Why don't cyclic references break modern garbage collectors?

> **Short answer:** Modern engines don't count references. They trace reachability from a set of roots. A cycle that nothing reachable points to is simply never visited, so it gets collected like any other garbage.

The cycle problem belongs to **reference counting**. In that scheme each object keeps a count of how many references point to it, and it is freed when the count reaches zero. In a cycle (`a → b → a`) each object keeps the other's count at 1 forever, so neither is ever freed. Old Internet Explorer versions leaked this way when a cycle crossed between JavaScript objects and DOM (COM) objects.

Today's engines use **tracing** collectors. They start from the *roots* (the global object, the current call stack, active handles held by the host) and mark everything they can reach. Anything left unmarked is garbage, whatever it points to itself. A cycle that is cut off from the roots is unreachable, so it is collected.

This program builds a cycle with a closure pointing into it, drops the only outside reference, and watches both objects get collected. It needs Node's `--expose-gc` flag to force a collection, so it can't run in the browser:

```javascript
// Run with: node --expose-gc cycle.js
const registry = new FinalizationRegistry((label) => console.log("collected:", label));

function makeCycle() {
  const a = { name: "a" };
  const b = { name: "b" };
  a.peer = b;
  b.peer = a;              // cycle: a -> b -> a
  a.getPeer = () => a.peer; // closure -> a -> b -> a
  registry.register(a, "object a");
  registry.register(b, "object b");
  return a;
}

let root = makeCycle();
console.log("reachable from root:", root.getPeer().name);
root = null; // nothing outside the cycle points in any more

(async () => {
  for (let i = 0; i < 5; i++) {
    global.gc();
    await new Promise((r) => setTimeout(r, 10));
  }
  console.log("done");
})();
```

Output (Node 22):

```text
reachable from root: b
collected: object b
collected: object a
done
```

The order of the two "collected" lines isn't guaranteed. All that's guaranteed is that both objects get collected. `FinalizationRegistry` callbacks run *eventually* or not at all, so use them for observing, never for program logic.

### How can closures accidentally cause memory leaks?

> **Short answer:** A closure keeps its whole scope reachable. If something long-lived holds the closure (a timer, an event listener, a cache, a global), everything that closure can see stays in memory. In V8 there's a sneakier version: closures created in the same scope share one context object.

The usual causes:

1. **Forgotten timers and listeners.** `setInterval(() => use(bigThing), 1000)` keeps `bigThing` alive until you call `clearInterval`. A listener added to `window` and never removed does the same thing.
2. **Caches that only grow.** A `Map` at module level that stores callbacks or results keyed by request will hold every closure it was ever given.
3. **Shared closure context.** V8 doesn't give each closure its own private copy of the variables it uses. All the functions created in one scope share **one** context object, which holds every variable that *any* of them captures. If one inner function mentions a large object, every sibling closure keeps that object alive, even siblings that never use it.

The third one surprises people, so here it is measured. Both versions return a tiny function that never touches `bigData`:

```javascript
// Run with: node --expose-gc leak.js
const mb = () => Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

function leaky() {
  const bigData = new Array(1_000_000).fill("x"); // ~8 MB of slots
  const unused = () => bigData.length;   // never called, never returned
  return function keep() { return "hi"; };
}

function fixed() {
  const bigData = new Array(1_000_000).fill("x");
  const len = bigData.length;              // copy what you need
  return function keep() { return "hi " + len; };
}

function measure(label, factory) {
  global.gc();
  const before = mb();
  const kept = [];
  for (let i = 0; i < 20; i++) kept.push(factory());
  global.gc();
  console.log(`${label}: +${mb() - before} MB held by 20 tiny closures`);
  return kept;
}

const a = measure("leaky", leaky);
const b = measure("fixed", fixed);
console.log(a.length + b.length, "closures still alive");
```

Output (Node 22):

```text
leaky: +153 MB held by 20 tiny closures
fixed: +0 MB held by 20 tiny closures
40 closures still alive
```

In `leaky`, `unused` mentions `bigData`, so V8 puts `bigData` in the shared context, and `keep` holds that context. Twenty closures keep twenty arrays alive, about 8 MB each. In `fixed`, no closure mentions `bigData`. It stays an ordinary local, and it dies when the function returns.

**Fixes:** clear timers and remove listeners, using `AbortController` with `addEventListener(..., { signal })` to remove several at once. Bound caches with an LRU policy or a `WeakMap`. Copy the small value you need out of a large object before creating the closure. To find a real leak, take two heap snapshots and compare them; see [How do you capture and analyze a heap snapshot to find a memory leak?](/interview-question/how-do-you-capture-and-analyze-a-heap-snapshot-to-find-a-memory-leak)

### What happens to closure variables during mark-and-sweep?

> **Short answer:** Captured variables live in a heap-allocated context object that the function points to. The collector treats that context like any other object. If the function is reachable, the context gets marked and so does everything it references. Variables that no closure captures never reach the heap at all.

In V8:

- When the parser sees that an inner function uses an outer variable, that variable is allocated in a **Context** object on the heap instead of on the stack. Variables nobody captures stay in registers or stack slots and disappear when the function returns. That's why `fixed` above used no extra memory.
- During **marking**, the collector walks from the roots: a root reaches the closure, the closure's context pointer reaches the Context, and the Context reaches its variables' values. Each of these gets marked live.
- During **sweeping** (or compaction), unmarked memory is reclaimed. A context whose closures are all unreachable is freed together with its contents.

V8's collector, called **Orinoco**, is generational. Young objects are collected often by a parallel *Scavenger*, and long-lived objects are handled by a *Mark-Compact* collector whose marking mostly runs concurrently with your code. V8 says concurrent marking cut main-thread marking time by 60–70% ([V8 blog: Trash talk](https://v8.dev/blog/trash-talk), [Concurrent marking](https://v8.dev/blog/concurrent-marking)). From the program's point of view, though, the rule is simple: **reachable means alive**.

There's a longer walkthrough in [How memory management and garbage collection work in V8](/interview-question/explain-how-memory-management-and-garbage-collection-work-in-the-v8-engine).

---

## Part 2: The event loop

### "JavaScript is single-threaded." What does that actually mean?

> **Short answer:** Each JavaScript *agent* runs your code on one thread with one call stack, so two pieces of your code never run at the same moment. The host around it is multi-threaded. Timers, network, file I/O and Web Workers all run elsewhere and hand results back as queued callbacks.

A Web Worker or a Node `worker_thread` is a *separate* agent with its own heap, its own stack and its own event loop. The two agents share nothing unless you explicitly use `SharedArrayBuffer`. So it's more accurate to say "run-to-completion on a single thread per agent". Once a function starts, nothing else in that agent interrupts it.

### Microtasks vs macrotasks

> **Short answer:** A *task* (often called a macrotask) is one unit of work from a queue: a timer firing, an event, a message. *Microtasks* are promise reactions and `queueMicrotask` callbacks. After every task, the loop drains **all** microtasks before it takes the next task.

| | Tasks (macrotasks) | Microtasks |
| --- | --- | --- |
| Examples | `setTimeout`, `setInterval`, UI events, `MessageChannel`, I/O callbacks | `promise.then/catch/finally`, `await` continuations, `queueMicrotask`, `MutationObserver` |
| How many per turn | **One**, then the loop checks microtasks (and in browsers may render) | **All of them**, including ones added while draining |
| Where defined | Host (the HTML spec, Node and libuv) | Promise jobs are defined by ECMAScript; the host decides when to run them |

Node adds one more queue: `process.nextTick` callbacks run before promise microtasks. More detail: [What is the difference between microtasks and macrotasks?](/interview-question/what-is-the-difference-between-microtasks-and-macrotasks) and [the Node.js event loop phases](/interview-question/explain-the-phases-of-the-node-js-event-loop).

### Why do Promise callbacks run before setTimeout?

> **Short answer:** Because a resolved promise queues a *microtask*, while `setTimeout(fn, 0)` queues a *task*. The current script is itself a task. When it finishes, the loop drains every microtask first, and only then picks the next task, which is the timer.

```javascript-run
console.log("1. sync start");

setTimeout(() => console.log("7. setTimeout callback (task)"), 0);

Promise.resolve()
  .then(() => console.log("4. promise.then (microtask)"))
  .then(() => console.log("6. chained then (microtask)"));

queueMicrotask(() => console.log("5. queueMicrotask (microtask)"));

(async () => {
  console.log("2. async function body runs synchronously");
})();

console.log("3. sync end");
```

Output:

```text
1. sync start
2. async function body runs synchronously
3. sync end
4. promise.then (microtask)
5. queueMicrotask (microtask)
6. chained then (microtask)
7. setTimeout callback (task)
```

Line 6 is the detail worth mentioning. The chained `.then` is only queued once line 4's callback has finished, so it lands *behind* the `queueMicrotask` callback that was already waiting. It still runs before the timer, because the loop keeps draining microtasks until the queue is empty. Also, a `0` delay isn't really zero. Browsers clamp nested timers to at least 4 ms, and Node treats 0 as 1 ms.

### What is event-loop starvation?

> **Short answer:** The loop won't move to the next task until the microtask queue is empty. Code that keeps queueing new microtasks can therefore block timers, input handling and (in browsers) rendering indefinitely, even though no single callback is slow.

```javascript-run
// A microtask that keeps scheduling microtasks starves the task queue:
// the timer cannot fire until the microtask queue is completely empty.
setTimeout(() => {
  console.log(`timer fired after ${count} microtasks`);
}, 0);

let count = 0;
function spin() {
  count++;
  if (count < 1_000_000) queueMicrotask(spin);
  else console.log("microtask chain finished");
}
queueMicrotask(spin);
```

Output:

```text
microtask chain finished
timer fired after 1000000 microtasks
```

The timer was ready almost immediately, but it had to wait for a million microtasks. Make the chain unbounded (a recursive promise loop that polls something, for example) and the timer never fires, while in a browser the page freezes. In Node, a recursive `process.nextTick` does the same to I/O. The fix is to schedule the next step as a *task* instead (`setTimeout`, `setImmediate`, `MessageChannel`), which gives everything else in the queue a turn. Node calls this [event loop pollution](/interview-question/explain-the-concept-of-event-loop-pollution-and-how-to-avoid-it).

### How do you yield control to keep the UI responsive?

> **Short answer:** Break long work into chunks and give the loop a turn between chunks by awaiting a **task**, not a microtask. In modern browsers use `scheduler.yield()`, with a `setTimeout` or `MessageChannel` fallback. Work that is pure computation should move to a Web Worker.

Here 30 items of about 1 ms each are processed twice, once as one long task and once in chunks of five with a yield after each chunk. An interval timer stands in for "anything else waiting", such as a click handler or a frame:

```javascript-run
const work = () => { const t = Date.now(); while (Date.now() - t < 1) {} };
const yieldToLoop = () => new Promise((r) => setTimeout(r, 0));

async function run(label, shouldYield) {
  let ticks = 0;
  const timer = setInterval(() => ticks++, 0);
  for (let i = 0; i < 30; i++) {
    work();
    if (shouldYield && i % 5 === 4) await yieldToLoop(); // give the loop a turn every 5 items
  }
  clearInterval(timer);
  console.log(`${label}: other tasks ${ticks > 0 ? "got a turn" : "got NO turn"} during the work`);
}

(async () => {
  await run("one long task  ", false);
  await run("chunked + yield", true);
})();
```

Output:

```text
one long task  : other tasks got NO turn during the work
chunked + yield: other tasks got a turn during the work
```

`await Promise.resolve()` would **not** have helped. That only queues a microtask, and the loop drains microtasks before doing anything else. Your options, from best to most basic:

- **`scheduler.yield()`**: yields, then resumes *ahead* of other queued tasks, so your work isn't pushed to the back of the line. Chrome's documentation lists it in Chrome and Edge 129 and Firefox 142, and not yet in Safari, as of its March 2025 post ([Chrome for Developers](https://developer.chrome.com/blog/use-scheduler-yield)). Feature-detect it.
- **`MessageChannel` `postMessage`**: a task with no 4 ms clamp.
- **`setTimeout(r, 0)`**: works everywhere, but gets clamped after a few nested calls.
- **A Web Worker**: for parsing, image processing or anything that needs no DOM, this keeps the main thread free altogether.

```javascript
const yieldToMain = () =>
  globalThis.scheduler?.yield
    ? scheduler.yield()
    : new Promise((resolve) => setTimeout(resolve, 0));
```

### Why does the event loop belong to the host environment, not the language?

> **Short answer:** ECMAScript defines how code executes and that promise reactions are queued as *jobs*, but it doesn't define an event loop, timers, I/O or rendering. The host provides those. Browsers implement the event loop described in the HTML spec, and Node implements its own on top of libuv.

What the language spec does define is execution contexts, run-to-completion, and abstract hooks such as `HostEnqueuePromiseJob`, which the host must implement. `setTimeout`, `fetch`, `addEventListener`, `process.nextTick` and `setImmediate` are not part of JavaScript at all. They are host APIs. That's why the details differ:

- **Browsers** (HTML spec): run one task, run a microtask checkpoint, then possibly render (with `requestAnimationFrame` callbacks right before paint).
- **Node** (libuv): runs in phases (timers, pending callbacks, poll, check (`setImmediate`), close callbacks) and drains `process.nextTick` and then promise microtasks between callbacks.
- **Embedded engines** (a game engine or database running JavaScript) might have no loop at all and just run a script and exit.

So when someone says "JavaScript's event loop", the precise answer is "the host's event loop, which runs JavaScript jobs".

---

## Part 3: Engine internals and modern APIs

### Hidden classes and inline caching

> **Short answer:** V8 gives objects with the same properties added in the same order a shared internal layout, called a *hidden class* (V8 calls it a **Map**). Property access code then caches "for this hidden class, `x` is at offset 0". That cache is an *inline cache*. Code that only ever sees one shape (monomorphic) is fastest. Code that sees many shapes (megamorphic) falls back to slow lookups.

A hidden class depends on **which** properties an object has **and in what order** they were added. You can check this with a V8 debugging intrinsic (Node only, behind a flag):

```javascript
// Run with: node --allow-natives-syntax hidden.js
function Point(x, y) { this.x = x; this.y = y; }

const p1 = new Point(1, 2);
const p2 = new Point(3, 4);
console.log("same constructor, same order:", %HaveSameMap(p1, p2));

const q1 = { x: 1, y: 2 };
const q2 = { y: 2, x: 1 };
console.log("same keys, different order:  ", %HaveSameMap(q1, q2));

const r1 = { x: 1, y: 2 };
const r2 = { x: 1, y: 2 };
delete r2.y;
r2.y = 2;
console.log("after delete + re-add:       ", %HaveSameMap(r1, r2));

const s1 = { x: 1, y: 2 };
const s2 = { x: 1, y: 2 };
s2.z = 3;
console.log("one extra property added:    ", %HaveSameMap(s1, s2));
```

Output (Node 22):

```text
same constructor, same order: true
same keys, different order:   false
after delete + re-add:        false
one extra property added:     false
```

In practice:

- Initialize every property in the constructor, always in the same order, even if some start as `null`.
- Avoid `delete` on hot objects. Set the property to `undefined` instead, or use a `Map` for genuinely dynamic keys.
- A function that receives objects of a few shapes is *polymorphic*. V8 keeps several shapes in its cache, but past a small limit it goes megamorphic and does a generic lookup every time.

Other engines do the same thing under different names (SpiderMonkey calls them *shapes*). Treat this as engine behaviour, not a language guarantee.

### JIT optimization behavior

> **Short answer:** V8 starts by interpreting bytecode and collects type feedback as the code runs. Hot functions are compiled to faster machine code that *assumes* the types it has seen so far. If an assumption breaks, the engine **deoptimizes** back to slower code and may optimize again later.

V8's pipeline has several tiers: **Ignition** (interpreter) → **Sparkplug** (fast baseline compiler) → **Maglev** (mid-tier optimizing compiler) → **TurboFan** (top-tier optimizing compiler). Maglev has been on by default since Node 22 ([Node.js 22 release announcement](https://nodejs.org/en/blog/announcements/v22-release-announce)).

This program forces optimization and then breaks the type assumption:

```javascript
// Run with: node --allow-natives-syntax jit.js
function add(a, b) { return a + b; }

%PrepareFunctionForOptimization(add);
add(1, 2); add(3, 4);              // feedback: "always small integers"
%OptimizeFunctionOnNextCall(add);
add(5, 6);
console.log("optimized after int calls:", %ActiveTierIsTurbofan(add));

add("a", "b");                      // breaks the integer assumption
console.log("still optimized after a string call:", %ActiveTierIsTurbofan(add));
```

Output (Node 22):

```text
optimized after int calls: true
still optimized after a string call: false
```

Running it again with `--trace-deopt` shows the reason: `bailout (kind: deopt-eager, reason: not a Smi)`. A "Smi" is V8's small-integer representation. The optimized code checked "is this a Smi?", the check failed, and V8 threw the optimized code away.

What this means for everyday code: keep the types flowing through hot functions stable, don't mix numbers and strings in the same arrays or parameters, and **measure** before micro-optimizing. The intrinsics above are for learning only, never for production.

### WeakMap vs native private fields

> **Short answer:** Both give you per-instance state that outside code can't reach. `#private` fields are the language feature: concise, enforced by the engine, and checkable with `#x in obj`. A `WeakMap` is the older pattern, and it's still useful when you need to attach private data to objects you didn't create, or to share it across classes.

```javascript-run
// The same "private count" done two ways.
const counts = new WeakMap();
class WeakCounter {
  constructor() { counts.set(this, 0); }
  inc() { counts.set(this, counts.get(this) + 1); return counts.get(this); }
}

class FieldCounter {
  #count = 0;
  inc() { return ++this.#count; }
  static isCounter(obj) { return #count in obj; } // ergonomic brand check (ES2022)
}

const w = new WeakCounter();
const f = new FieldCounter();
w.inc(); f.inc();
console.log("WeakMap version:", w.inc(), "| field version:", f.inc());

// Neither shows up as a normal property.
console.log("keys:", JSON.stringify(Object.keys(w)), JSON.stringify(Object.keys(f)));

// Brand check: is this object one of mine?
console.log("brand check:", FieldCounter.isCounter(f), FieldCounter.isCounter({}));

// Calling a method on the wrong object.
try { FieldCounter.prototype.inc.call({}); }
catch (e) { console.log("field version on a fake object ->", e.constructor.name); }
console.log("WeakMap version on a fake object ->", WeakCounter.prototype.inc.call({}));

// Proxies: private fields do not pass through a Proxy.
const proxied = new Proxy(f, {});
try { proxied.inc(); }
catch (e) { console.log("field version through a Proxy ->", e.constructor.name); }
```

Output:

```text
WeakMap version: 2 | field version: 2
keys: [] []
brand check: true false
field version on a fake object -> TypeError
WeakMap version on a fake object -> NaN
field version through a Proxy -> TypeError
```

| | `#private` fields | `WeakMap` |
| --- | --- | --- |
| Wrong object passed in | Throws `TypeError` | Silently gets `undefined` (here, `NaN`) unless you check |
| Brand check | `#x in obj` | `map.has(obj)` |
| Works on objects you didn't construct | No, only on instances of the class | Yes, any object can be a key |
| Shared across several classes | No, scoped to one class body | Yes, if the map is in scope |
| Through a `Proxy` | Throws, because the proxy isn't the instance | Fails too, because the proxy is a different key |
| Memory | Freed with the instance | Entry freed when the key is unreachable |

For a class's own state, use `#private`. For data attached to *other people's* objects (DOM nodes, objects from a library), use a `WeakMap`. Background: [How does WeakMap allow garbage collection of keys?](/interview-question/how-does-weakmap-allow-garbage-collection-of-keys)

### structuredClone vs JSON deep copy

> **Short answer:** `structuredClone` makes a true deep copy that keeps `Date`, `Map`, `Set`, typed arrays, `BigInt`, `undefined` and even cycles. `JSON.parse(JSON.stringify(x))` turns dates into strings, `Map`/`Set` into `{}`, drops `undefined`, and throws on cycles and BigInt. Neither one copies functions or class prototypes.

```javascript-run
const original = {
  when: new Date("2026-01-15T10:00:00Z"),
  tags: new Set(["a", "b"]),
  scores: new Map([["ann", 9]]),
  missing: undefined,
  big: 10n,
  nested: { list: [1, 2, 3] },
};
original.self = original; // a cycle

const cloned = structuredClone(original);
console.log("structuredClone:");
console.log("  Date stays a Date:", cloned.when instanceof Date);
console.log("  Set / Map kept:   ", cloned.tags instanceof Set, cloned.scores.get("ann"));
console.log("  undefined kept:   ", "missing" in cloned);
console.log("  BigInt kept:      ", typeof cloned.big);
console.log("  cycle kept:       ", cloned.self === cloned);
console.log("  deep, not shared: ", cloned.nested !== original.nested);

const { self, big, ...jsonSafe } = original; // JSON throws on cycles and BigInt
const viaJson = JSON.parse(JSON.stringify(jsonSafe));
console.log("JSON round-trip:");
console.log("  Date became:      ", typeof viaJson.when);
console.log("  Set / Map became: ", JSON.stringify(viaJson.tags), JSON.stringify(viaJson.scores));
console.log("  undefined kept:   ", "missing" in viaJson);

// What structuredClone refuses or drops.
try { structuredClone({ fn() {} }); }
catch (e) { console.log("function ->", e.name); }
class User { constructor(n) { this.n = n; } greet() { return "hi"; } }
const u = structuredClone(new User("ann"));
console.log("class instance -> plain object:", u instanceof User, JSON.stringify(u));
try { JSON.stringify(original); }
catch (e) { console.log("JSON on a cycle ->", e.name); }
```

Output:

```text
structuredClone:
  Date stays a Date: true
  Set / Map kept:    true 9
  undefined kept:    true
  BigInt kept:       bigint
  cycle kept:        true
  deep, not shared:  true
JSON round-trip:
  Date became:       string
  Set / Map became:  {} {}
  undefined kept:    false
function -> DataCloneError
class instance -> plain object: false {"n":"ann"}
JSON on a cycle -> TypeError
```

When to use which:

- **`structuredClone`** for copying application state, which is the default choice now. It's the same algorithm `postMessage` uses, and it's available in every major browser and in Node since 17.
- **JSON** when you actually *want* JSON: sending data over the network, storing it, or deliberately stripping anything that isn't plain data.
- **Neither** when your objects carry behaviour (class instances, functions). Write a `clone()` method or rebuild the instance from its data.

`structuredClone` also accepts `{ transfer: [buffer] }` to *move* an `ArrayBuffer` instead of copying it. See [What is structuredClone and when is it useful?](/interview-question/what-is-structuredclone-and-when-is-it-useful-in-node-js)

### Module resolution in ESM

> **Short answer:** An ES module's imports are found and linked *before* any of its code runs. The specifier string is resolved to a URL by the host. Browsers need relative paths, full URLs or an import map. Node requires file extensions, doesn't resolve directory index files, and respects a package's `"exports"` map.

ESM loading happens in three phases:

1. **Construction**: parse each module, find its `import` statements, resolve each specifier to a URL, fetch the file, and repeat. This is how the whole module graph is built.
2. **Linking**: connect each `import` to the matching `export`. Imports are **live bindings**, so an importer sees updates made to an exported `let`.
3. **Evaluation**: run each module's top-level code **once**, depth-first, dependencies before dependents.

This demo has three files importing a shared module, plus a few resolution attempts:

```javascript
// main.js  (package.json has "type": "module")
console.log("main: body runs last");
import { a } from "./a.js";
import { b } from "./b.js";
console.log("main sees", a, b);

for (const spec of ["./utils", "./utils/index.js", "greet", "greet/lib/secret.js"]) {
  try {
    await import(spec);
    console.log(`import("${spec}") -> ok`);
  } catch (e) {
    console.log(`import("${spec}") -> ${e.code}`);
  }
}
console.log("resolved greet to", import.meta.resolve("greet").split("/esm/")[1]);

// a.js and b.js both:  import { shared } from "./shared.js"; console.log(...)
// shared.js:           console.log("shared: evaluated once"); export const shared = 42;
// node_modules/greet/package.json: { "exports": { ".": "./lib/index.js" } }
```

Output (Node 22):

```text
shared: evaluated once
a: evaluated, shared = 42
b: evaluated, shared = 42
main: body runs last
main sees A B
import("./utils") -> ERR_UNSUPPORTED_DIR_IMPORT
import("./utils/index.js") -> ok
import("greet") -> ok
import("greet/lib/secret.js") -> ERR_PACKAGE_PATH_NOT_EXPORTED
resolved greet to node_modules/greet/lib/index.js
```

What it shows:

- `main`'s first `console.log` sits **above** its imports in the file, but it runs **last**. Static imports are hoisted, so all dependencies run first.
- `shared.js` runs once even though two modules import it. Modules are singletons per resolved URL.
- `./utils` fails in Node ESM. There's no automatic `index.js` and no extension guessing (CommonJS `require` used to do both).
- `"exports"` is a public API boundary. Any path a package doesn't export can't be imported, even though the file exists.

For CommonJS interop, see [What is the difference between ES modules and CommonJS?](/interview-question/what-is-the-difference-between-es-modules-and-commonjs), and for top-level await, see [How top-level await changes module loading](/interview-question/how-does-top-level-await-change-how-an-es-module-and-its-importers-load-and-what).

### How does ECMAScript define execution order?

> **Short answer:** Through execution contexts and jobs. Before a scope runs, the engine creates all of its bindings: function declarations are fully ready, `var` starts as `undefined`, and `let`/`const`/`class` stay uninitialized until their line runs (the temporal dead zone). Code then runs to completion. Promise reactions are queued as jobs that run only after the current stack is empty, and every `await` hands control back through that queue.

```javascript-run
// 1) Before any line runs, the engine creates bindings for the whole scope.
console.log("function declaration is ready:", typeof hoisted);
console.log("var exists but is undefined:", typeof early, early);
try { console.log(late); }
catch (e) { console.log("let before its line ->", e.name, "(temporal dead zone)"); }

function hoisted() {}
var early = 1;
let late = 2;

// 2) Every await gives up the turn, even when the value is not a promise.
const log = [];
async function worker() {
  log.push("worker: before await");
  await 42;                     // still waits one microtask turn
  log.push("worker: after await");
}
worker();
Promise.resolve().then(() => log.push("then: queued after worker started"));
log.push("sync: end of script");
setTimeout(() => console.log(log.join("\n")), 0);
```

Output:

```text
function declaration is ready: function
var exists but is undefined: undefined undefined
let before its line -> ReferenceError (temporal dead zone)
worker: before await
sync: end of script
worker: after await
then: queued after worker started
```

Putting the spec's model together:

1. **Instantiation**: when a script, module or function is entered, its declarations are bound first. That's what "hoisting" means. Nothing is physically moved.
2. **Run to completion**: the current execution context runs until the stack is empty. Nothing interrupts it.
3. **Jobs**: promise reactions are enqueued through the host hook `HostEnqueuePromiseJob`. The host runs them once the stack is empty, in FIFO order. That's why `worker: after await` comes before the `.then` that was registered after `worker()` started.
4. **Modules**: dependencies are evaluated depth-first, before the importing module, and each module runs once.

Everything else, including when timers fire, when the page renders and how I/O callbacks are ordered, is up to the host.

---

## A cheat sheet

| Question | One-line answer |
| --- | --- |
| Values or references? | Closures capture **bindings**: later changes are visible. |
| Cycles and GC? | Tracing GC frees whatever is unreachable from roots; cycles included. |
| Closure leaks? | Long-lived holders (timers, listeners, caches) plus V8's shared context per scope. |
| Mark-and-sweep and closures? | Captured variables live in a heap Context; reachable function ⇒ reachable context. |
| Single-threaded? | One stack per agent; the host is multi-threaded. |
| Microtasks vs tasks? | One task per turn, then **all** microtasks. |
| Promise before setTimeout? | Promise reaction = microtask; timer = next task. |
| Starvation? | Endless microtasks block every task and rendering. |
| Yielding? | Await a **task** (`scheduler.yield`, `MessageChannel`, `setTimeout`), or use a Worker. |
| Whose event loop? | The host's (HTML spec, libuv); ECMAScript only defines jobs. |
| Hidden classes? | Same properties, same order ⇒ same shape ⇒ fast inline caches. |
| JIT? | Optimizes on observed types, deoptimizes when they change. |
| WeakMap vs `#private`? | `#private` for your own class; WeakMap for objects you don't own. |
| structuredClone vs JSON? | structuredClone keeps types and cycles; JSON flattens to plain data. |
| ESM resolution? | Graph built and linked before running; Node needs extensions and respects `exports`. |
| Execution order? | Bind declarations, run to completion, then jobs; modules depth-first. |

If you can explain each row *and* back it up with a tiny program like the ones above, you're giving the answer senior interviews are looking for.
