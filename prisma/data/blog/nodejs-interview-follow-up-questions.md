---
slug: nodejs-interview-follow-up-questions
title: "Node.js Interview Follow-Up Questions, With Every Answer Run in Node 22"
excerpt: Eight follow-ups interviewers ask after "have you used Node?", from nextTick vs promises and setTimeout vs setImmediate to blocking the event loop, backpressure, worker threads and require(esm), each with code run in Node.js 22.23.
tags: ["interview", "nodejs", "javascript", "backend", "event-loop"]
cover: /blog-images/nodejs-interview-follow-up-questions/cover.png
---

"Have you used Node.js?" is an easy question. Everybody has. The follow-ups are where interviews are decided: *what prints first, `nextTick` or a promise?*, *what happens to other requests when one handler does heavy work?*, *why does your file copy use 2 GB of memory?* These questions test whether you know how Node actually runs your code, not just its APIs.

This post covers the eight follow-ups that come up most often. Each has a one-line answer you can say out loud, an explanation, and code. Every snippet was run with **Node.js 22.23.4**, and every output block is what it printed. Where a result depends on the machine, the post says so and shows the counts.

A few terms first. The **event loop** is the loop inside Node that waits for work (a timer firing, a network packet arriving, a file read finishing) and runs the JavaScript callback for it. Node runs your JavaScript on **one main thread**, so while one callback runs, nothing else in JavaScript can. The [JavaScript follow-ups post](/blog/javascript-senior-interview-follow-up-questions) covers the language-level event loop; this one is about what Node adds on top.

## 1. What prints first: process.nextTick, a promise, or setTimeout?

> **Short answer:** synchronous code first, then `process.nextTick` callbacks, then promise callbacks, then timers. In an ES module the promise callbacks run before `nextTick`.

When the current piece of JavaScript finishes, Node empties two queues before it goes back to the event loop: the **nextTick queue** (callbacks from `process.nextTick`) and the **microtask queue** (promise callbacks and `queueMicrotask`). Only then does the event loop move on to timers and I/O.

```javascript
// Run with: node order.js
console.log("1 sync start");
setTimeout(() => console.log("6 setTimeout"), 0);
Promise.resolve().then(() => console.log("4 promise"));
process.nextTick(() => console.log("3 nextTick"));
queueMicrotask(() => console.log("5 queueMicrotask"));
console.log("2 sync end");
```

Output:

```text
1 sync start
2 sync end
3 nextTick
4 promise
5 queueMicrotask
6 setTimeout
```

![The order Node runs callbacks in after synchronous code: the nextTick queue, then the promise microtask queue, then the event loop phases of timers, poll for I/O and check for setImmediate](/blog-images/nodejs-interview-follow-up-questions/queues.svg)

Now the follow-up that catches most people. I saved the same code as `order.mjs`, an **ES module**, and ran `node order.mjs`:

```text
1 sync start
2 sync end
4 promise
5 queueMicrotask
3 nextTick
6 setTimeout
```

The promise callbacks moved ahead of `nextTick`. An ES module is evaluated asynchronously, so its top-level code finishes inside the microtask phase. The promise jobs it queued run as part of that phase, and Node only gets to the nextTick queue afterwards. The practical rule: never write code whose correctness depends on the order between `nextTick` and promises. It is not even stable between the two module systems.

One more detail is worth knowing. The queues are re-checked after each callback, but the microtask queue is drained completely before Node looks at nextTick again:

```javascript
// Run with: node nested.js
Promise.resolve().then(() => {
  console.log("promise 1");
  process.nextTick(() => console.log("nextTick queued inside promise 1"));
  Promise.resolve().then(() => console.log("promise 2 (queued inside promise 1)"));
});
process.nextTick(() => console.log("nextTick A"));
```

Output:

```text
nextTick A
promise 1
promise 2 (queued inside promise 1)
nextTick queued inside promise 1
```

**What they are really checking:** that you know `nextTick` is not part of the event loop at all, and that a recursive `nextTick` or promise chain can starve I/O, because the loop never gets a turn.

## 2. setTimeout(fn, 0) or setImmediate(fn): which runs first?

> **Short answer:** in the main module it is not predictable. Inside an I/O callback, `setImmediate` always runs first.

The event loop runs in **phases**. The **timers** phase runs expired `setTimeout` and `setInterval` callbacks. The **poll** phase waits for I/O and runs its callbacks. The **check** phase runs `setImmediate` callbacks. Then the loop goes round again.

From the main module, which one wins depends on whether the timer has expired (Node turns a 0 ms delay into 1 ms) by the time the loop first reaches the timers phase. I ran this 300 times:

```javascript
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
```

```text
    284 immediate
     16 timeout
```

On this machine `immediate` usually won, but `timeout` won 16 times out of 300. Your counts will differ; the point is that both happen.

Inside an I/O callback, the loop is in the poll phase. The check phase comes next, so `setImmediate` runs before the loop wraps round to timers. Same test, 300 runs:

```javascript
const fs = require("node:fs");
fs.readFile(__filename, () => {
  setTimeout(() => console.log("timeout"), 0);
  setImmediate(() => console.log("immediate"));
});
```

```text
    300 immediate
```

The [Node.js event loop guide](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick) says the same: in the main module "the order in which the two timers are executed is non-deterministic", but "if you move the two calls within an I/O cycle, the immediate callback is always executed first".

**What they are really checking:** whether you know the phases, and whether you avoid relying on timer ordering. If you need "after the current I/O, before more I/O", use `setImmediate`.

## 3. One request does heavy CPU work. What happens to the others?

> **Short answer:** they all wait. While one handler runs synchronous code, the event loop cannot accept, read or answer any other request on that process.

This is the most important consequence of the single main thread. The server below runs in its own process. `/slow` spends 500 ms in a loop, standing in for a big `JSON.parse`, a synchronous hash, or a slow regular expression. The client measures `/fast` alone, then again while `/slow` is running:

```javascript
// Run with: node block.js
const http = require("node:http");
const { fork } = require("node:child_process");

if (process.argv[2] === "server") {
  // The server runs in its own process, like a real deployment.
  const busy = (ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {} // stands in for a big JSON.parse, sync crypto, a slow regex
  };
  const server = http.createServer((req, res) => {
    if (req.url === "/slow") busy(500);
    res.end("ok");
  });
  server.listen(0, () => process.send(server.address().port));
} else {
  const child = fork(__filename, ["server"]);
  child.on("message", async (port) => {
    const time = async (path) => {
      const t0 = performance.now();
      await fetch(`http://localhost:${port}${path}`).then((r) => r.text());
      return performance.now() - t0;
    };
    await time("/fast"); // warm up
    const alone = await time("/fast");
    const slow = time("/slow");
    await new Promise((r) => setTimeout(r, 50)); // /slow is now running on the server
    const during = await time("/fast");
    await slow;
    console.log("/fast on its own:", alone < 50 ? "under 50 ms" : "50 ms or more");
    console.log("/fast while /slow runs:", during > 400 ? "over 400 ms" : "400 ms or less");
    child.kill();
  });
}
```

Output:

```text
/fast on its own: under 50 ms
/fast while /slow runs: over 400 ms
```

The output uses thresholds so it prints the same every run. The raw numbers from five runs: `/fast` took 3 to 4 ms on its own and 451 to 452 ms while `/slow` was running. A request that needs no work at all took 150 times longer because it had to wait its turn.

![Timeline of one Node process: the slow handler occupies the main thread for 500 ms, and the fast request that arrives 50 ms later waits until it finishes](/blog-images/nodejs-interview-follow-up-questions/blocked-loop.svg)

**What they are really checking:** that you can name the fixes. Move CPU work off the main thread (next question), break it into chunks that yield with `setImmediate`, use the async versions of APIs (`crypto.pbkdf2` instead of `crypto.pbkdf2Sync`), and measure event loop delay in production with `perf_hooks.monitorEventLoopDelay`.

## 4. worker_threads, child_process or cluster?

> **Short answer:** `worker_threads` for CPU-heavy JavaScript inside one process, `child_process` to run another program, `cluster` (or several containers) to use all CPU cores for serving requests.

| Tool | What it creates | Shares memory? | Use it for |
| :--- | :--- | :--- | :--- |
| `worker_threads` | A new JavaScript thread in the same process, with its own event loop | Only through `SharedArrayBuffer`; otherwise messages are copied | Image resizing, parsing, hashing: CPU work in JavaScript |
| `child_process` | A separate operating system process | No | Running `ffmpeg`, `git` or another Node script |
| `cluster` | Several copies of your server process sharing one port | No | Using every core for HTTP traffic on one machine |

This example runs the same CPU work twice while a 10 ms heartbeat timer tries to tick. First on the main thread, then in a worker:

```javascript
// Run with: node worker.js
const { Worker, isMainThread, parentPort } = require("node:worker_threads");

const fib = (n) => (n < 2 ? n : fib(n - 1) + fib(n - 2));

if (!isMainThread) {
  parentPort.postMessage(fib(36));
} else {
  let ticks = 0;
  const timer = setInterval(() => ticks++, 10); // a heartbeat: should tick every 10 ms

  // 1. Heavy work on the main thread: the heartbeat cannot run.
  ticks = 0;
  fib(36);
  const onMain = ticks;

  // 2. The same work in a worker thread: the main thread stays free.
  ticks = 0;
  new Worker(__filename).once("message", (result) => {
    clearInterval(timer);
    console.log("fib(36) =", result);
    console.log("heartbeats during main-thread work:", onMain);
    console.log("heartbeats during worker work:", ticks > 10 ? "more than 10" : ticks);
  });
}
```

Output:

```text
fib(36) = 14930352
heartbeats during main-thread work: 0
heartbeats during worker work: more than 10
```

Zero heartbeats while the main thread was busy; in one raw run, 15 while the worker did the same work. Starting a worker costs time and memory, so in a server you create a small pool once and reuse it rather than starting one per request.

**What they are really checking:** that you do not reach for `cluster` to fix a slow handler. Cluster gives you more processes, but each one still blocks while it runs that handler.

## 5. What is backpressure, and what happens if you ignore it?

> **Short answer:** backpressure is the signal from a slow destination to a fast source to stop sending. In Node streams, `write()` returns `false` when the buffer is full; if you keep writing anyway, everything piles up in memory.

A **stream** moves data in chunks instead of loading it all at once. Every writable stream has a buffer with a size limit called the **highWaterMark**. When the buffered data reaches it, `write()` returns `false`, which means "please wait". The stream emits `'drain'` when it is ready for more.

```javascript
// Run with: node backpressure.js
const { Writable } = require("node:stream");

// A slow destination: accepts one chunk every millisecond.
const slowSink = () =>
  new Writable({ write(chunk, enc, done) { setTimeout(done, 1); } });

const chunk = Buffer.alloc(1024); // 1 KiB

// Ignoring the return value: everything piles up in memory.
const a = slowSink();
for (let i = 0; i < 1000; i++) a.write(chunk);
console.log("highWaterMark:", a.writableHighWaterMark, "bytes");
console.log("ignored false, buffered:", a.writableLength, "bytes");

// Respecting it: stop when write() returns false, resume on 'drain'.
const b = slowSink();
let i = 0, firstFalseAt = null, maxBuffered = 0;
function writeMore() {
  while (i < 1000) {
    const ok = b.write(chunk);
    i++;
    maxBuffered = Math.max(maxBuffered, b.writableLength);
    if (!ok) {
      firstFalseAt ??= i;
      return b.once("drain", writeMore);
    }
  }
  b.end(() => {
    console.log("write() first returned false after", firstFalseAt, "writes");
    console.log("respected drain, max buffered:", maxBuffered, "bytes");
  });
}
writeMore();
```

Output:

```text
highWaterMark: 65536 bytes
ignored false, buffered: 1024000 bytes
write() first returned false after 64 writes
respected drain, max buffered: 65536 bytes
```

Ignoring the signal buffered all 1,000 KiB. Respecting it never held more than 64 KiB. With a 5 GB file and a slow network client, that is the difference between flat memory and a crash.

![A fast readable source and a slow writable destination: when the buffer reaches the 64 KiB highWaterMark, write returns false and the source pauses until the drain event](/blog-images/nodejs-interview-follow-up-questions/backpressure.svg)

The 64 KiB default is new. The [Node.js 22 release announcement](https://nodejs.org/en/blog/announcements/v22-release-announce) lists "Increased the default High Water Mark for streams from 16KiB to 64KiB." Object-mode streams count objects instead of bytes, and their default is 16 objects.

In real code you rarely write this loop yourself. `stream.pipeline()` (or `await pipeline()` from `node:stream/promises`) connects streams, handles backpressure, and destroys every stream if one fails:

```javascript
// gzip.mjs (an ES module, so top-level await works)
import { pipeline } from "node:stream/promises";
import fs from "node:fs";
import zlib from "node:zlib";

await pipeline(
  fs.createReadStream("access.log"),
  zlib.createGzip(),
  fs.createWriteStream("access.log.gz"),
);
```

**What they are really checking:** whether you know why `readable.on("data", (c) => writable.write(c))` is a memory bug, and that `pipeline` fixes both backpressure and error cleanup.

## 6. Is EventEmitter asynchronous? What happens with an "error" event?

> **Short answer:** `emit()` is synchronous: every listener runs before `emit()` returns. An `'error'` event with no listener throws and crashes the process.

```javascript
// Run with: node emitter.js
const { EventEmitter } = require("node:events");
const e = new EventEmitter();
e.on("order", () => console.log("2 listener runs"));
console.log("1 before emit");
e.emit("order");
console.log("3 after emit");
```

Output:

```text
1 before emit
2 listener runs
3 after emit
```

The name "event" makes people assume a queue, but there is none. A slow listener blocks the code that called `emit()`, and a listener that throws throws into it.

The `'error'` event is special. The [events documentation](https://nodejs.org/api/events.html) says that if an emitter has no `'error'` listener, "the error is thrown, a stack trace is printed, and the Node.js process exits":

```javascript
const { EventEmitter } = require("node:events");
const e = new EventEmitter();
e.emit("error", new Error("disk full"));
console.log("never printed");
```

Running it printed this (file path shortened) and exited with code 1:

```text
node:events:497
      throw er; // Unhandled 'error' event
      ^

Error: disk full
    at Object.<anonymous> (/.../emitter-error.js:3:17)
```

Streams, sockets and servers are all event emitters, so this is how a single unhandled socket error takes down a server. Always attach an `'error'` listener to anything that can fail, or use `pipeline`, which does it for you.

**What they are really checking:** that you know listeners run synchronously and in registration order, and that missing `'error'` handlers crash processes.

## 7. What happens to an unhandled promise rejection?

> **Short answer:** since Node.js 15 it crashes the process with exit code 1, the same as an uncaught exception, unless you add an `unhandledRejection` handler.

The [Node.js 15 release notes](https://nodejs.org/en/blog/release/v15.0.0) say: "As of Node.js 15, the default mode for `unhandledRejection` is changed to `throw` (from `warn`)." Before that, Node printed a warning and kept going, which is why older tutorials say it is harmless.

```javascript
async function loadUser() {
  throw new Error("db timeout");
}
loadUser(); // no await, no .catch()
setTimeout(() => console.log("still running"), 100);
```

Running it in Node 22 printed the error and stack trace, then `Node.js v22.23.4`, and exited with code 1. "still running" never appeared.

A process-level handler replaces the crash. Use it to log and shut down cleanly, not to carry on as if nothing happened:

```javascript
process.on("unhandledRejection", (err) => {
  console.log("logged:", err.message);
  process.exitCode = 1; // record the failure, then shut down cleanly
});
async function loadUser() {
  throw new Error("db timeout");
}
loadUser();
setTimeout(() => console.log("still running"), 100);
```

Running it printed:

```text
logged: db timeout
still running
```

The process kept running and still exited with code 1, so a process manager can see that something failed.

**What they are really checking:** that a forgotten `await` is a production outage, and that you know the difference between handling errors where they happen (`try`/`catch`, `.catch()`) and a last-resort handler.

## 8. CommonJS or ES modules? Can require() load an ES module?

> **Short answer:** both still work. Since Node.js 22.12, `require()` can load an ES module without a flag, unless that module uses top-level `await`. ES modules have no `__dirname`; use `import.meta.dirname`.

**CommonJS** (CJS) is Node's original module system: `require()` and `module.exports`, loaded synchronously. **ES modules** (ESM) are the JavaScript standard: `import` and `export`, loaded asynchronously. A file is ESM if it ends in `.mjs`, or ends in `.js` inside a package whose `package.json` has `"type": "module"`.

For years, CJS code could not `require()` an ES module, which caused a lot of pain when packages went ESM-only. The [Node.js 22.12.0 release notes](https://nodejs.org/en/blog/release/v22.12.0) changed that: "In this release, it is now no longer behind a flag on v22.x." The same notes say "This feature is still experimental".

```javascript
// math.mjs
export const add = (a, b) => a + b;
export default "math module";

// tla.mjs
await new Promise((r) => setTimeout(r, 10));
export const ready = true;

// use.cjs
const math = require("./math.mjs");
console.log(math.add(2, 3), math.default);
try {
  require("./tla.mjs");
} catch (err) {
  console.log(err.code);
}
```

Running `node use.cjs` printed:

```text
5 math module
ERR_REQUIRE_ASYNC_MODULE
```

`require()` returns the module's namespace object, so the default export is on `.default`. A module with top-level `await` cannot be loaded synchronously, so `require()` refuses it with `ERR_REQUIRE_ASYNC_MODULE`; use `await import()` for those.

The other common trap: CJS globals do not exist in ESM. This `paths.mjs` was run from its own folder:

```javascript
console.log(typeof __dirname, typeof require);
console.log(import.meta.dirname === process.cwd(), import.meta.filename.endsWith("paths.mjs"));
```

```text
undefined undefined
true true
```

According to the [ESM documentation](https://nodejs.org/api/esm.html), `import.meta.dirname` and `import.meta.filename` were added in v21.2.0 and v20.11.0 and are no longer experimental as of v22.16.0.

**What they are really checking:** that you can explain the "ERR_REQUIRE_ESM" errors teams hit for years, and that you know the current answer instead of the 2021 one.

## Cheat sheet

| Question | One-line answer |
| :--- | :--- |
| nextTick vs promise vs setTimeout | Sync, then nextTick, then promises, then timers in CJS; in ESM promises come before nextTick |
| setTimeout 0 vs setImmediate | Unpredictable in the main module (284 to 16 here); `setImmediate` first inside I/O callbacks (300 of 300) |
| Heavy CPU in a handler | Every other request waits: 3 ms became 452 ms here |
| worker_threads / child_process / cluster | CPU work in JS / other programs / more processes for more cores |
| Backpressure | `write()` returns `false` at the highWaterMark (64 KiB since Node 22); wait for `'drain'` or use `pipeline` |
| EventEmitter | `emit()` is synchronous; an unhandled `'error'` event crashes the process |
| Unhandled rejection | Crashes with exit code 1 since Node 15; handle errors where they happen |
| require(esm) | Works without a flag since 22.12, except modules with top-level `await` |
| `__dirname` in ESM | Does not exist; use `import.meta.dirname` |

The pattern behind all eight: Node runs your JavaScript on one thread and does everything else around it. Most good answers come down to knowing what runs on that thread, when, and what happens to everything waiting behind it.
