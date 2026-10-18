/**
 * Node.js gap round — batch 30 (event loop, async errors and modules: the
 * six event-loop phases, microtask vs macrotask queues, try/catch with async
 * code, require() vs dynamic import(), and module.exports vs exports).
 *
 * These 5 titles had only a one-paragraph answer (question-bank.json). This
 * batch brings them to the same depth as batches 1-29. Titles copied
 * verbatim from question-bank.json.
 *
 * Verified in this batch, executed on this machine (Node v22.22.0):
 *   - Phases: one script, started from inside an fs.readFile callback, put a
 *     callback in poll, check, timers and close callbacks and printed them in
 *     the same order on 50 out of 50 runs. A destroyed socket's "close" event
 *     ran after a nextTick and a promise queued after destroy() but before
 *     the next lap's setTimeout(0), placing it in the close-callbacks phase.
 *     A 500ms idle wait used ~0.4ms of CPU (the loop sleeps in poll). A 10ms
 *     timer behind 100ms of sync work ran at ~111ms.
 *   - setTimeout(0) vs setImmediate at the top level: 180 vs 20 out of 200
 *     runs (not deterministic); inside an I/O callback: 200 out of 200
 *     immediate-first.
 *   - Microtasks: nextTick before promise in CommonJS, but promise before
 *     nextTick in an .mjs entry file (same code). Microtasks drain after each
 *     setTimeout callback. A nextTick queued inside a promise callback ran
 *     only after the whole promise queue drained. A 1,000,000-link promise
 *     chain held a setTimeout(0) back for ~620ms.
 *   - try/catch: a throw in a timer escaped and exited with code 1; a
 *     forgotten await escaped the try and crashed (exit 1); `return` without
 *     `await` skipped the local catch; async forEach callbacks escaped; and
 *     a promise that rejected before it was awaited crashed the process even
 *     though the later await sat inside try/catch.
 *   - require vs import(): require() returned a value synchronously, import()
 *     a Promise; import() of a CJS file gave the same object as require() as
 *     `default`; require(esm) worked without a flag, but threw
 *     ERR_REQUIRE_ASYNC_MODULE for a module with top-level await; the require
 *     cache can be deleted, the ESM cache only bypassed with a new URL.
 *   - module.exports vs exports: printed the real module wrapper; four export
 *     styles compared; a late module.exports assignment was invisible to the
 *     caller; static named-export detection from ESM listed `extra` for a
 *     file whose runtime value has no `extra`.
 *
 * Version facts verified via web search, not asserted from memory:
 *   - Microtasks drain between individual timer callbacks since Node v11.0.0
 *     (secondary source: Deepal Jayasekara, dev.to).
 *   - Unhandled rejections default to `throw` since Node v15.0.0 (Node
 *     v15.0.0 release notes).
 *   - require(esm) unflagged in v22.12.0 and v20.19.0 (release notes), still
 *     marked experimental at that point.
 */
import type { NodeAugment } from "./node-augments.types";

const augments: NodeAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "Explain the phases of the Node.js event loop.",
    seoDescription:
      "The Node.js event loop runs timers, pending callbacks, poll, check and close phases in a fixed order. Verified with a callback placed in each phase.",
    description: `**Question presented to candidate:**
"People say Node has an event loop with phases. Name the phases in order, tell me which of your callbacks lands in each one, and explain why \`setImmediate\` beats \`setTimeout(fn, 0)\` inside an I/O callback but not always at the top of a script."

**What a strong answer should cover:**
- The loop runs the same phases in a fixed order on every lap: **timers** → **pending callbacks** → **idle/prepare** (internal) → **poll** → **check** → **close callbacks**, then back to timers.
- What lands where: \`setTimeout\`/\`setInterval\` in timers; most I/O callbacks (\`fs\`, sockets, HTTP) in poll; \`setImmediate\` in check; handle \`'close'\` events (for example a destroyed socket) in close callbacks; a few deferred system errors in pending callbacks.
- The **poll** phase is where Node waits: when nothing is ready it sleeps in the OS (epoll/kqueue/IOCP) until I/O arrives or the nearest timer is due. It does not spin the CPU.
- A timer delay is a **minimum**, not a schedule: a 10ms timer behind 100ms of synchronous work runs at about 100ms. \`setTimeout(fn, 0)\` is stored as 1ms.
- Inside an I/O callback the order is fixed (poll → check → timers), so \`setImmediate\` always wins. At the top level the order depends on how long process start took, so it can go either way.
- Microtasks (\`process.nextTick\`, promise callbacks) are not a phase: they drain after each callback, between and within phases.

**Clarifying questions expected:**
- "Are we talking about callbacks scheduled from the main script or from inside an I/O callback?" — the answer to the \`setTimeout\` vs \`setImmediate\` race depends on it.

**Code / implementation expected:** Optional — a small script that logs one callback per phase is the strongest proof; reciting the list alone is a weak answer.`,
    answer: `**Target Audience:** Engineers preparing for Node.js interviews who can write async code but have never looked at what the loop does between callbacks.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every ordering and timing claim below comes from a script that was **actually run** on Node v22.22.0; the exact output is quoted. Where something was not demonstrated (the pending-callbacks phase), the doc says so.

## 1. Why This Even Matters — A Story First

Picture a night-shift security guard doing rounds in a building. The route never changes: check the alarm clocks on the ground floor, look at the overnight incident tray, do some paperwork nobody sees, then sit at the front desk watching the door and the phones, then walk past the express mailbox, then lock any rooms that people have left. Then start again at the alarm clocks.

If nothing is happening, the guard does not run laps in a panic. They sit at the front desk (and nod off) until either the phone rings or the next alarm clock is due. If a visitor at the desk keeps the guard talking for twenty minutes, the alarm clock that was due five minutes in simply rings late. Nobody else can do the rounds; there is only one guard.

That guard is the Node.js event loop. The fixed route is its **phases**, the front desk is the **poll** phase, the alarm clocks are **timers**, and the express mailbox is **setImmediate**. Knowing the route tells you exactly which of your callbacks will run first.

## 2. The Six Phases

📌 **Interview term: event loop phase** — one stop on the loop's fixed route. Each phase has its own queue of callbacks; when the loop enters a phase it runs the callbacks queued there (up to a limit), then moves to the next phase. One full pass through every phase is called a **tick** or a **loop iteration**.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="One lap of the event loop: timers, then pending callbacks, then idle and prepare, then poll, then check, then close callbacks, then back to timers">
  <defs>
    <marker id="ph-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="26" text-anchor="middle">One lap of the event loop</text>
  <rect class="d-box-accent" x="30" y="50" width="160" height="64" rx="10"/>
  <text class="d-text d-accent" x="110" y="76" text-anchor="middle">1 timers</text>
  <text class="d-sub" x="110" y="98" text-anchor="middle">setTimeout, setInterval</text>
  <rect class="d-box-muted" x="240" y="50" width="160" height="64" rx="10"/>
  <text class="d-text" x="320" y="76" text-anchor="middle">2 pending callbacks</text>
  <text class="d-sub" x="320" y="98" text-anchor="middle">deferred system errors</text>
  <rect class="d-box-muted" x="450" y="50" width="160" height="64" rx="10"/>
  <text class="d-text" x="530" y="76" text-anchor="middle">3 idle, prepare</text>
  <text class="d-sub" x="530" y="98" text-anchor="middle">internal to Node</text>
  <rect class="d-box-accent" x="450" y="190" width="160" height="64" rx="10"/>
  <text class="d-text d-accent" x="530" y="216" text-anchor="middle">4 poll</text>
  <text class="d-sub" x="530" y="238" text-anchor="middle">I/O callbacks, waits here</text>
  <rect class="d-box-accent" x="240" y="190" width="160" height="64" rx="10"/>
  <text class="d-text d-accent" x="320" y="216" text-anchor="middle">5 check</text>
  <text class="d-sub" x="320" y="238" text-anchor="middle">setImmediate</text>
  <rect class="d-box-muted" x="30" y="190" width="160" height="64" rx="10"/>
  <text class="d-text" x="110" y="216" text-anchor="middle">6 close callbacks</text>
  <text class="d-sub" x="110" y="238" text-anchor="middle">socket close events</text>
  <path class="d-edge-accent" d="M 190 82 L 234 82" marker-end="url(#ph-arrow)"/>
  <path class="d-edge-accent" d="M 400 82 L 444 82" marker-end="url(#ph-arrow)"/>
  <path class="d-edge-accent" d="M 530 114 L 530 184" marker-end="url(#ph-arrow)"/>
  <path class="d-edge-accent" d="M 450 222 L 406 222" marker-end="url(#ph-arrow)"/>
  <path class="d-edge-accent" d="M 240 222 L 196 222" marker-end="url(#ph-arrow)"/>
  <path class="d-edge-accent" d="M 110 190 L 110 120" marker-end="url(#ph-arrow)"/>
  <text class="d-sub" x="122" y="158">next lap</text>
</svg>

The loop keeps lapping as long as something is still waiting: an active timer, an open socket or server, a pending file read. When nothing is left, the process exits.

| # | Phase | What runs here | How your code ends up here |
| :--- | :--- | :--- | :--- |
| 1 | **timers** | Callbacks of timers whose delay has passed | \`setTimeout\`, \`setInterval\` |
| 2 | **pending callbacks** | A few system-level I/O callbacks deferred from the previous lap (the Node docs give certain TCP errors as the example) | Rarely visible from application code |
| 3 | **idle, prepare** | Node and libuv internals | Never directly |
| 4 | **poll** | Completed I/O: file reads, incoming connections, socket data, HTTP requests. **Waits here** when there is nothing else to do | \`fs.readFile\` callbacks, \`server.on("request")\`, \`socket.on("data")\` |
| 5 | **check** | \`setImmediate\` callbacks | \`setImmediate\` |
| 6 | **close callbacks** | \`'close'\` events of handles that were closed abruptly | \`socket.destroy()\` then \`socket.on("close")\` |

📌 **Interview term: libuv** — the C library that implements the loop and its phases. Node's own docs describe the phases; libuv does the actual waiting on the OS. For how libuv also runs the thread pool, see [the role of libuv](/interview-question/what-is-the-role-of-libuv-in-node-js).

### Where microtasks fit (they are not a phase)

📌 **Interview term: microtask** — a \`process.nextTick\` callback or a promise callback (\`.then\`, code after \`await\`). Microtasks do not belong to any phase. After **each** callback the loop runs, Node drains the nextTick queue, then the promise queue, before running the next callback.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 130" role="img" aria-label="After each phase callback Node drains the nextTick queue then the promise queue before the next callback">
  <defs>
    <marker id="mt-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Between every two callbacks</text>
  <rect class="d-box-muted" x="20" y="48" width="120" height="56" rx="9"/>
  <text class="d-text" x="80" y="81" text-anchor="middle">a callback</text>
  <rect class="d-box-accent" x="180" y="48" width="120" height="56" rx="9"/>
  <text class="d-text d-accent" x="240" y="72" text-anchor="middle">nextTick</text>
  <text class="d-sub" x="240" y="92" text-anchor="middle">drain all</text>
  <rect class="d-box-accent" x="340" y="48" width="120" height="56" rx="9"/>
  <text class="d-text d-accent" x="400" y="72" text-anchor="middle">promises</text>
  <text class="d-sub" x="400" y="92" text-anchor="middle">drain all</text>
  <rect class="d-box-muted" x="500" y="48" width="120" height="56" rx="9"/>
  <text class="d-text" x="560" y="81" text-anchor="middle">next callback</text>
  <path class="d-edge-accent" d="M 140 76 L 174 76" marker-end="url(#mt-arrow)"/>
  <path class="d-edge-accent" d="M 300 76 L 334 76" marker-end="url(#mt-arrow)"/>
  <path class="d-edge-accent" d="M 460 76 L 494 76" marker-end="url(#mt-arrow)"/>
</svg>

The full story of the two microtask queues, including how ES modules change their order, has its own page: [microtask queue vs macrotask queue](/interview-question/what-is-the-difference-between-the-microtask-queue-and-the-macrotask-queue-in-no). The big-picture "how does the loop work" answer, with the nextTick starvation test, is [How does the Node.js event loop work?](/interview-question/nodejs-event-loop).

## 3. Verified: Running the Code

All scripts were run with \`node <file>\` on Node v22.22.0 (Linux). Output is pasted exactly; \`[exit code N]\` is the shell exit status.

### 3a. One callback in every phase

The script starts inside an \`fs.readFile\` callback, which means it starts **in the poll phase**. From there the next stops are known: check, close callbacks, then timers on the next lap.

~~~js
const fs = require("node:fs");
const net = require("node:net");

const log = (msg) => console.log(msg);

// Start from inside an I/O callback (poll phase) so the order is deterministic.
fs.readFile(__filename, () => {
  log("1 poll      : fs.readFile callback is running");

  setTimeout(() => log("4 timers    : setTimeout(fn, 0)"), 0);
  setImmediate(() => log("3 check     : setImmediate"));
  process.nextTick(() => log("2 microtask : nextTick (before leaving this callback)"));

  // A socket that we destroy: its "close" event comes from the close-callbacks phase.
  const server = net.createServer().listen(0, () => {
    const sock = net.connect(server.address().port, () => {
      setImmediate(() => {
        log("5 check     : setImmediate, destroying socket now");
        sock.on("close", () => {
          log("6 close     : socket close event");
          server.close();
        });
        sock.destroy();
        setTimeout(() => log("7 timers    : setTimeout scheduled next to destroy()"), 0);
      });
    });
  });
});
~~~

~~~
1 poll      : fs.readFile callback is running
2 microtask : nextTick (before leaving this callback)
3 check     : setImmediate
4 timers    : setTimeout(fn, 0)
5 check     : setImmediate, destroying socket now
6 close     : socket close event
7 timers    : setTimeout scheduled next to destroy()
[exit code 0]
~~~

Read it as a walk around the diagram: poll (1), microtasks before leaving that callback (2), check (3), next lap's timers (4), the following check (5), close callbacks of that same lap (6), and the timer on the lap after (7). The script was run 50 times; all 50 outputs were byte-for-byte identical (same \`md5sum\`).

### 3b. Proving the close event really is the close-callbacks phase

A skeptic could say the \`'close'\` event in 3a might just be a \`nextTick\`. This script queues a nextTick, a promise, a timer and an immediate **after** calling \`destroy()\`:

~~~js
const net = require("node:net");
const server = net.createServer().listen(0, () => {
  const sock = net.connect(server.address().port, () => {
    setImmediate(() => {
      console.log("A check phase: destroy()");
      sock.on("close", () => { console.log("D close phase: socket close event"); server.close(); });
      sock.destroy();
      process.nextTick(() => console.log("B microtask: nextTick queued after destroy()"));
      Promise.resolve().then(() => console.log("C microtask: promise queued after destroy()"));
      setImmediate(() => console.log("F check phase (next lap): setImmediate"));
      setTimeout(() => console.log("E timers phase (next lap): setTimeout 0"), 0);
    });
  });
});
~~~

~~~
A check phase: destroy()
B microtask: nextTick queued after destroy()
C microtask: promise queued after destroy()
D close phase: socket close event
E timers phase (next lap): setTimeout 0
F check phase (next lap): setImmediate
[exit code 0]
~~~

📌 **Interview term: close callbacks phase** — the close event (D) ran **after** both microtasks queued later than it (B, C), so it is not a microtask. It ran **before** the timer of the next lap (E), so it belongs to the current lap, after check. That is exactly the close-callbacks slot.

### 3c. Timers are thresholds, not appointments

~~~js
// A timer delay is a minimum ("threshold"), not a promise to run on time.
const t0 = Date.now();
const t = setTimeout(() => {
  console.log(\`timer asked for 10ms, actually ran after \${Date.now() - t0}ms\`);
}, 10);
console.log("setTimeout(fn, 0) is stored as", setTimeout(() => {}, 0)._idleTimeout, "ms");

// Block the only thread for ~100ms of synchronous work.
const end = Date.now() + 100;
while (Date.now() < end) {}
console.log(\`sync work finished at \${Date.now() - t0}ms\`);
~~~

~~~
setTimeout(fn, 0) is stored as 1 ms
sync work finished at 111ms
timer asked for 10ms, actually ran after 111ms
[exit code 0]
~~~

📌 **Interview term: timer threshold** — the delay is the **earliest** a timer may run. The loop only reaches the timers phase after the current synchronous work finishes, so the 10ms timer ran at 111ms. Also note that a \`0\` delay is stored as 1ms.

### 3d. The poll phase sleeps instead of spinning

~~~js
// While nothing is ready, the loop parks inside the poll phase (epoll_wait on
// Linux) until the nearest timer is due. It does not spin the CPU.
const cpu0 = process.cpuUsage();
const t0 = Date.now();
setTimeout(() => {
  const cpu = process.cpuUsage(cpu0);
  console.log(\`waited \${Date.now() - t0}ms of wall time\`);
  console.log(\`CPU used meanwhile: \${((cpu.user + cpu.system) / 1000).toFixed(1)}ms\`);
}, 500);
~~~

~~~
waited 501ms of wall time
CPU used meanwhile: 0.4ms
[exit code 0]
~~~

Half a second of waiting cost less than half a millisecond of CPU (0.4ms). With nothing to do, the loop blocks inside the poll phase (on Linux, in \`epoll_wait\`) with a timeout equal to the time until the nearest timer, then wakes up and goes to the timers phase.

📌 **Interview term: poll phase blocking** — poll computes how long it may block: zero if there are \`setImmediate\` callbacks waiting (so check can run right away), otherwise until the nearest timer, or indefinitely if there are no timers but open handles.

### 3e. setTimeout(0) vs setImmediate: top level vs inside I/O

Two tiny scripts, each run 200 times. \`toplevel-race.js\` schedules both from the main script; \`io-race.js\` schedules both from inside an \`fs.readFile\` callback.

~~~js
// toplevel-race.js
const order = [];
setTimeout(() => order.push("timeout"), 0);
setImmediate(() => order.push("immediate"));
process.on("exit", () => console.log(order.join(" then ")));

// io-race.js
const fs = require("node:fs");
const order = [];
fs.readFile(__filename, () => {
  setTimeout(() => order.push("timeout"), 0);
  setImmediate(() => order.push("immediate"));
});
process.on("exit", () => console.log(order.join(" then ")));
~~~

~~~
$ for i in $(seq 1 200); do node toplevel-race.js; done | sort | uniq -c
    180 immediate then timeout
     20 timeout then immediate
$ for i in $(seq 1 200); do node io-race.js; done | sort | uniq -c
    200 immediate then timeout
~~~

At the top level, the loop enters the timers phase first, but the 1ms timer may or may not have expired yet depending on how long startup took, so the order changed from run to run (and the split changes between machines and scripts: earlier batches of 200 runs on this machine gave 181/19 and 175/25). Inside an I/O callback the loop is already in poll, so check always comes before the next timers phase: 200 out of 200.

### 3f. An immediate queued during check waits for the next lap

~~~js
const fs = require("node:fs");
fs.readFile(__filename, () => {
  setTimeout(() => console.log("timers phase: setTimeout 0"), 0);
  setImmediate(() => {
    console.log("check phase: immediate 1");
    setImmediate(() => console.log("check phase, NEXT lap: immediate queued inside immediate 1"));
  });
});
~~~

~~~
check phase: immediate 1
timers phase: setTimeout 0
check phase, NEXT lap: immediate queued inside immediate 1
[exit code 0]
~~~

The inner \`setImmediate\` did not run in the same check phase: the loop went round to the timers phase first. The check phase only runs immediates queued before it started; new ones wait a lap. That is why a recursive \`setImmediate\` cannot freeze the loop the way a recursive \`process.nextTick\` can.

## 4. Comparison: three ways to say "later"

| | \`process.nextTick(fn)\` | \`setImmediate(fn)\` | \`setTimeout(fn, 0)\` |
| :--- | :--- | :--- | :--- |
| Where it runs | Not a phase: right after the current callback | Check phase | Timers phase |
| Can it starve I/O? | Yes, if it keeps rescheduling itself | No, the loop still passes through poll | No |
| Inside an I/O callback | First | Before the timer (verified 200/200) | After the immediate |
| At the top level | First | Order vs the timer is not fixed (verified 180/20 in the quoted run) | Order vs the immediate is not fixed |

For when to pick each one in real code, see [process.nextTick() and setImmediate()](/interview-question/what-is-process-nexttick-and-setimmediate-and-when-to-use-them).

## 5. Common Pitfalls

- **Treating \`setTimeout(fn, 0)\` as "run next".** It means "run in some later timers phase, at least 1ms from now". If you need "after this I/O callback, before anything else on the next lap", that is \`setImmediate\`.
- **Writing tests that depend on the top-level timer/immediate race.** Verified above: the order flipped between runs of the same file. Either schedule from an I/O callback or do not depend on the order.
- **Assuming a timer runs on time when the main thread is busy.** The 10ms timer ran at 111ms because 100ms of sync work blocked the loop. Heavy CPU work belongs in a worker thread; see [Worker Threads](/interview-question/what-are-worker-threads-in-node-js-and-when-would-you-use-them).
- **Listing microtasks as a seventh phase.** They run between callbacks, in every phase. An interviewer will push on this.
- **Expecting \`'close'\` events to fire synchronously from \`destroy()\`.** Verified in 3b: they come in the close-callbacks phase, after microtasks queued later in the same callback.
- **Thinking the loop is "busy" while idle.** It blocks in poll and uses almost no CPU (0.4ms over 500ms above), which is why one Node process can hold thousands of idle connections.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the route:</strong> <span style="color:#f0e2c8;">"Every lap runs the same phases in order: timers, pending callbacks, idle/prepare, poll, check, close callbacks, then timers again."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Map callbacks to phases:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setTimeout</code> goes to timers, I/O callbacks to poll, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setImmediate</code> to check, and a destroyed socket's close event to close callbacks."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain poll:</strong> <span style="color:#f0e2c8;">"Poll runs finished I/O and is where Node waits. With nothing to do it sleeps in epoll until I/O or the next timer, so idle Node uses almost no CPU."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the classic race:</strong> <span style="color:#f0e2c8;">"Inside an I/O callback, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setImmediate</code> always beats <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setTimeout(0)</code> because check comes right after poll. At the top level it can go either way — I ran it 200 times and got 180/20."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Place microtasks correctly:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">nextTick</code> and promise callbacks are not a phase; they drain after every single callback. And timer delays are minimums: a 10ms timer behind 100ms of sync work runs at about 100ms."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">setTimeout(fn, 0)</code> vs <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">setImmediate</code> order random at the top level?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The main script runs before the first lap. When the loop starts, it goes to the timers phase first and checks whether the 1ms timer has expired. If process startup plus your script took longer than 1ms, the timer is due and runs first; if not, the loop moves on through poll to check and the immediate runs first. That depends on machine speed and load, which is why 200 runs here split 180/20, with other batches at 181/19 and 175/25. Inside an I/O callback there is no such race: the loop is already in poll, and check is the very next phase.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What actually happens inside the poll phase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Two things. First it runs callbacks for I/O that has completed, up to a limit. Then it decides how long to block waiting for more: not at all if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setImmediate</code> callbacks are queued, until the nearest timer is due if there are timers, or indefinitely if only open handles (like a listening server) remain. The blocking itself is an OS call — epoll on Linux, kqueue on macOS, IOCP on Windows. The verified 500ms wait that used 0.4ms of CPU shows it really sleeps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If I call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">setImmediate</code> from inside a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">setImmediate</code> callback, does it run in the same check phase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Callbacks added to the check queue while the check phase is running wait for the next lap, so the loop goes through timers and poll first. That is the key difference from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">process.nextTick</code>, where a callback scheduling another nextTick runs it immediately in the same drain — which is how recursive nextTick can starve I/O and recursive setImmediate cannot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you ever see the pending callbacks phase?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Almost never from application code. It runs a small set of I/O callbacks that libuv deferred from the previous lap; the Node docs give some TCP errors (such as a connection refused on certain systems) as the example. I would say that honestly in an interview rather than invent a demo — the phases you actually reason about day to day are timers, poll, check and close.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a long-running callback in one phase delay the other phases?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, completely. There is one thread, so while any callback runs, nothing else does — no timers, no I/O callbacks, no new connections. That is what the 10ms-timer-ran-at-111ms test shows. The fix is to keep each callback short: split work into chunks with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setImmediate</code>, or move CPU-heavy work to a worker thread.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Event loop phase** | One fixed stop on the loop route, with its own callback queue |
| **Tick / loop iteration** | One full pass through all six phases |
| **Timers phase** | Runs \`setTimeout\`/\`setInterval\` callbacks whose delay has passed |
| **Poll phase** | Runs completed I/O callbacks and waits for new I/O when idle |
| **Check phase** | Runs \`setImmediate\` callbacks, right after poll |
| **Close callbacks phase** | Runs \`'close'\` events of abruptly closed handles |
| **Timer threshold** | A delay is the earliest time a timer may run, not a promise |
| **Microtask** | nextTick or promise callback, drained after each callback, not a phase |
| **libuv** | The C library that implements the loop and does the OS-level waiting |

---
**Conclusion:** The event loop is one thread walking a fixed route — timers, pending callbacks, idle/prepare, poll, check, close callbacks — and running whatever is queued at each stop. Running a callback in each phase from inside an I/O callback produced the same order on 50 of 50 runs, and a destroyed socket's close event landed after later-queued microtasks but before the next lap's timer. Poll is where the loop waits: half a second of idling cost 0.4ms of CPU. Timer delays are minimums (10ms became 111ms behind sync work), and the \`setTimeout(0)\` vs \`setImmediate\` race is only predictable once you know which phase you are in: random at the top level (180/20), fixed inside I/O (200/200). Microtasks are not a phase; they run between every two callbacks.`,
    examples: [
      {
        label: "One callback in each phase, started from an I/O callback so the order is fixed (ran 50 of 50 times identically)",
        tech: "javascript",
        runnable: false,
        code: `const fs = require("node:fs");
const net = require("node:net");

const log = (msg) => console.log(msg);

// Start from inside an I/O callback (poll phase) so the order is deterministic.
fs.readFile(__filename, () => {
  log("1 poll      : fs.readFile callback is running");

  setTimeout(() => log("4 timers    : setTimeout(fn, 0)"), 0);
  setImmediate(() => log("3 check     : setImmediate"));
  process.nextTick(() => log("2 microtask : nextTick (before leaving this callback)"));

  // A socket that we destroy: its "close" event comes from the close-callbacks phase.
  const server = net.createServer().listen(0, () => {
    const sock = net.connect(server.address().port, () => {
      setImmediate(() => {
        log("5 check     : setImmediate, destroying socket now");
        sock.on("close", () => {
          log("6 close     : socket close event");
          server.close();
        });
        sock.destroy();
        setTimeout(() => log("7 timers    : setTimeout scheduled next to destroy()"), 0);
      });
    });
  });
});`,
      },
      {
        label: "Proving a socket close event runs in the close-callbacks phase, after microtasks and before the next lap",
        tech: "javascript",
        runnable: false,
        code: `const net = require("node:net");
const server = net.createServer().listen(0, () => {
  const sock = net.connect(server.address().port, () => {
    setImmediate(() => {
      console.log("A check phase: destroy()");
      sock.on("close", () => { console.log("D close phase: socket close event"); server.close(); });
      sock.destroy();
      process.nextTick(() => console.log("B microtask: nextTick queued after destroy()"));
      Promise.resolve().then(() => console.log("C microtask: promise queued after destroy()"));
      setImmediate(() => console.log("F check phase (next lap): setImmediate"));
      setTimeout(() => console.log("E timers phase (next lap): setTimeout 0"), 0);
    });
  });
});`,
      },
      {
        label: "Timers are thresholds, and the poll phase sleeps instead of spinning",
        tech: "javascript",
        runnable: false,
        code: `// A timer delay is a minimum ("threshold"), not a promise to run on time.
const t0 = Date.now();
const t = setTimeout(() => {
  console.log(\`timer asked for 10ms, actually ran after \${Date.now() - t0}ms\`);
}, 10);
console.log("setTimeout(fn, 0) is stored as", setTimeout(() => {}, 0)._idleTimeout, "ms");

// Block the only thread for ~100ms of synchronous work.
const end = Date.now() + 100;
while (Date.now() < end) {}
console.log(\`sync work finished at \${Date.now() - t0}ms\`);

// --- poll-wait.js ---
// While nothing is ready, the loop parks inside the poll phase until the nearest timer is due.
const cpu0 = process.cpuUsage();
const t1 = Date.now();
setTimeout(() => {
  const cpu = process.cpuUsage(cpu0);
  console.log(\`waited \${Date.now() - t1}ms of wall time\`);
  console.log(\`CPU used meanwhile: \${((cpu.user + cpu.system) / 1000).toFixed(1)}ms\`);
}, 500);`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between the microtask queue and the macrotask queue in Node.js?",
    seoDescription:
      "Microtasks (nextTick, promises) drain after every callback; macrotasks (timers, I/O, setImmediate) wait for their phase. Order verified by running code.",
    description: `**Question presented to candidate:**
"Here is a script with a \`setTimeout(0)\`, a \`Promise.resolve().then()\`, a \`queueMicrotask()\` and a \`process.nextTick()\`. Predict the output, then explain the rule behind it: what is a microtask, what is a macrotask, and when does Node switch from one to the other?"

**What a strong answer should cover:**
- **Macrotasks** (the HTML spec just calls them "tasks"; Node docs do not use the word) are callbacks owned by event-loop phases: timers, I/O callbacks in poll, \`setImmediate\` in check, close events. The loop runs them one at a time.
- **Microtasks** are promise reactions (\`.then\`, code after \`await\`) and \`queueMicrotask\`. Node also has a separate **nextTick queue** that runs before the promise queue.
- The rule: after **every** macrotask callback (and after the main script), Node drains the nextTick queue completely, then the promise queue completely, repeating until both are empty. Only then does the next macrotask run. This per-callback draining is the behaviour since Node 11.
- Microtasks queued while draining run in the same drain, so a self-rescheduling microtask chain **starves** timers and I/O.
- Subtle, verifiable details: a nextTick queued from inside a promise callback runs only after the whole promise queue drains; and in an **ES module** entry file the promise queue runs **before** the nextTick queue, the reverse of CommonJS.

**Clarifying questions expected:**
- "Is this file CommonJS or an ES module?" — it changes the order of nextTick vs promise callbacks at the top level.

**Code / implementation expected:** Yes — predicting the output of a small ordering script, then running it to check, is the usual format of this question.`,
    answer: `**Target Audience:** Engineers preparing for Node.js interviews who know promises and \`setTimeout\` and want the exact rule for which runs first.
**Difficulty:** Hard

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every ordering claim below was **actually run** on Node v22.22.0, and the exact output is quoted next to the code. Version history is cited, not recalled.

## 1. Why This Even Matters — A Story First

A busy chef works one order ticket at a time. Tickets hang on a rail by the door: that rail is the **macrotask** queue. While the chef cooks a dish, small sticky notes pile up on the pass: "add salt to table 4", "re-plate the dessert". Those are **microtasks**.

The kitchen rule is strict: after finishing **each** ticket, the chef clears **every** sticky note on the pass before reaching for the next ticket. If clearing a note creates a new note, that one gets done too, before the next ticket. Notes marked VIP (in Node, \`process.nextTick\`) are always handled before ordinary notes.

The rule has a nasty consequence. A note that says "write another note like this one" keeps the chef busy forever, and the tickets at the door never get cooked. That is microtask **starvation**, and it is real (section 3f).

## 2. The Core Idea

📌 **Interview term: macrotask (task)** — a callback that belongs to an event-loop phase: a \`setTimeout\`/\`setInterval\` callback (timers), an I/O callback (poll), a \`setImmediate\` callback (check), a \`'close'\` event. The loop picks them up one at a time as it walks its phases. The HTML spec calls these "tasks"; "macrotask" is the community name, and Node docs use neither, so say "task / macrotask" in an interview.

📌 **Interview term: microtask** — a promise reaction (\`.then\`/\`.catch\`/\`.finally\` callbacks, the rest of an \`async\` function after \`await\`) or a \`queueMicrotask\` callback. These live in V8's microtask queue.

📌 **Interview term: nextTick queue** — a Node-only queue for \`process.nextTick\` callbacks. It is separate from V8's microtask queue and, in CommonJS, is drained first.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 300" role="img" aria-label="The loop takes one macrotask callback from a phase queue, runs it, then drains the nextTick queue and the promise microtask queue completely before taking the next macrotask">
  <defs>
    <marker id="mq-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Macrotask sources feed one callback at a time</text>
  <rect class="d-box-muted" x="30" y="44" width="160" height="50" rx="9"/>
  <text class="d-sub" x="110" y="74" text-anchor="middle">timers: setTimeout</text>
  <rect class="d-box-muted" x="240" y="44" width="160" height="50" rx="9"/>
  <text class="d-sub" x="320" y="74" text-anchor="middle">poll: I/O callbacks</text>
  <rect class="d-box-muted" x="450" y="44" width="160" height="50" rx="9"/>
  <text class="d-sub" x="530" y="74" text-anchor="middle">check: setImmediate</text>
  <path class="d-edge" d="M 110 94 L 250 134" marker-end="url(#mq-arrow)"/>
  <path class="d-edge" d="M 320 94 L 320 132" marker-end="url(#mq-arrow)"/>
  <path class="d-edge" d="M 530 94 L 390 134" marker-end="url(#mq-arrow)"/>
  <rect class="d-box" x="200" y="140" width="240" height="44" rx="9"/>
  <text class="d-text" x="320" y="167" text-anchor="middle">run ONE macrotask callback</text>
  <path class="d-edge-accent" d="M 270 184 L 160 226" marker-end="url(#mq-arrow)"/>
  <rect class="d-box-accent" x="40" y="232" width="230" height="50" rx="9"/>
  <text class="d-text d-accent" x="155" y="254" text-anchor="middle">1 nextTick queue</text>
  <text class="d-sub" x="155" y="272" text-anchor="middle">drain until empty</text>
  <path class="d-edge-accent" d="M 270 257 L 364 257" marker-end="url(#mq-arrow)"/>
  <rect class="d-box-accent" x="370" y="232" width="230" height="50" rx="9"/>
  <text class="d-text d-accent" x="485" y="254" text-anchor="middle">2 promise queue</text>
  <text class="d-sub" x="485" y="272" text-anchor="middle">drain until empty</text>
</svg>

After the promise queue empties, Node checks the nextTick queue again (a promise callback may have added to it) and repeats until both are empty. Only then does the loop take the next macrotask. Which phase each macrotask belongs to is covered in [the phases of the event loop](/interview-question/explain-the-phases-of-the-node-js-event-loop).

## 3. Verified: Running the Code

All scripts were run with \`node <file>\` on Node v22.22.0. \`[exit code N]\` is the shell exit status.

### 3a. The basic order

~~~js
console.log("1 sync start");
setTimeout(() => console.log("6 macrotask: setTimeout 0"), 0);
Promise.resolve().then(() => console.log("4 microtask: promise.then"));
queueMicrotask(() => console.log("5 microtask: queueMicrotask"));
process.nextTick(() => console.log("3 nextTick queue"));
console.log("2 sync end");
~~~

~~~
1 sync start
2 sync end
3 nextTick queue
4 microtask: promise.then
5 microtask: queueMicrotask
6 macrotask: setTimeout 0
[exit code 0]
~~~

Synchronous code first, then the nextTick queue, then the promise queue (where \`queueMicrotask\` sits, in the order it was queued, right behind the \`.then\`), then the macrotask.

### 3b. The same code as an ES module flips nextTick and promises

The identical file, copied to \`order.mjs\` and run with \`node order.mjs\`:

~~~
1 sync start
2 sync end
4 microtask: promise.then
5 microtask: queueMicrotask
3 nextTick queue
6 macrotask: setTimeout 0
[exit code 0]
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="In a CommonJS entry file nextTick runs before promise callbacks, while in an ES module entry file promise callbacks run before nextTick, and setTimeout comes last in both">
  <defs>
    <marker id="esm-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Same code, two module systems</text>
  <rect class="d-box-muted" x="10" y="46" width="130" height="50" rx="9"/>
  <text class="d-text" x="75" y="76" text-anchor="middle">CommonJS</text>
  <rect class="d-box-accent" x="180" y="46" width="120" height="50" rx="9"/>
  <text class="d-text d-accent" x="240" y="76" text-anchor="middle">nextTick</text>
  <rect class="d-box" x="340" y="46" width="120" height="50" rx="9"/>
  <text class="d-text" x="400" y="76" text-anchor="middle">promise</text>
  <rect class="d-box-muted" x="500" y="46" width="120" height="50" rx="9"/>
  <text class="d-text" x="560" y="76" text-anchor="middle">setTimeout</text>
  <path class="d-edge-accent" d="M 300 71 L 334 71" marker-end="url(#esm-arrow)"/>
  <path class="d-edge-accent" d="M 460 71 L 494 71" marker-end="url(#esm-arrow)"/>
  <rect class="d-box-muted" x="10" y="120" width="130" height="50" rx="9"/>
  <text class="d-text" x="75" y="150" text-anchor="middle">ES module</text>
  <rect class="d-box" x="180" y="120" width="120" height="50" rx="9"/>
  <text class="d-text" x="240" y="150" text-anchor="middle">promise</text>
  <rect class="d-box-accent" x="340" y="120" width="120" height="50" rx="9"/>
  <text class="d-text d-accent" x="400" y="150" text-anchor="middle">nextTick</text>
  <rect class="d-box-muted" x="500" y="120" width="120" height="50" rx="9"/>
  <text class="d-text" x="560" y="150" text-anchor="middle">setTimeout</text>
  <path class="d-edge-accent" d="M 300 145 L 334 145" marker-end="url(#esm-arrow)"/>
  <path class="d-edge-accent" d="M 460 145 L 494 145" marker-end="url(#esm-arrow)"/>
</svg>

Why: an ES module is evaluated as part of a promise-driven job, so when its top-level code ends, V8 is already draining the promise queue and keeps going until it is empty; Node only gets to its nextTick queue after that. (That explanation is the mechanism as I understand it; the observed order is the verified part.) The practical lesson: **never rely on nextTick-vs-promise order** in code that could be loaded either way.

### 3c. Microtasks drain after each macrotask, not once per phase

~~~js
// Microtasks are drained after EACH macrotask callback, not once per phase.
setTimeout(() => {
  console.log("timeout A");
  Promise.resolve().then(() => console.log("  promise from A"));
  process.nextTick(() => console.log("  nextTick from A"));
}, 0);
setTimeout(() => {
  console.log("timeout B");
  Promise.resolve().then(() => console.log("  promise from B"));
}, 0);
~~~

~~~
timeout A
  nextTick from A
  promise from A
timeout B
  promise from B
[exit code 0]
~~~

Both timers are due in the **same** timers phase, yet A's microtasks ran before timer B. 📌 **Interview term: per-callback draining** — this matches browsers and has been Node's behaviour since v11.0.0; before that, Node ran all due timers first and drained microtasks only between phases ([Deepal Jayasekara, "New Changes to the Timers and Microtasks in Node v11.0.0"](https://dev.to/deepal/changes-to-the-timers-and-microtasks-in-node-v11-0-0-and-above-43aa)).

### 3d. Nested scheduling: who waits for whom

This is where most confident answers go wrong.

~~~js
Promise.resolve().then(() => {
  console.log("promise 1");
  process.nextTick(() => console.log("nextTick queued inside promise 1"));
  Promise.resolve().then(() => console.log("promise 3 (queued inside promise 1)"));
});
Promise.resolve().then(() => console.log("promise 2"));
process.nextTick(() => {
  console.log("nextTick 1");
  Promise.resolve().then(() => console.log("promise queued inside nextTick 1"));
  process.nextTick(() => console.log("nextTick 2 (queued inside nextTick 1)"));
});
setTimeout(() => console.log("setTimeout 0"), 0);
~~~

~~~
nextTick 1
nextTick 2 (queued inside nextTick 1)
promise 1
promise 2
promise queued inside nextTick 1
promise 3 (queued inside promise 1)
nextTick queued inside promise 1
setTimeout 0
[exit code 0]
~~~

Three verified rules come out of this one run:

1. **A nextTick queued inside a nextTick runs in the same drain**, before any promise ("nextTick 2" ran second).
2. **The promise queue is strict FIFO.** "promise queued inside nextTick 1" was queued after promises 1 and 2, so it ran after them, and before "promise 3", which was queued later still (during promise 1).
3. **A nextTick queued inside a promise callback waits until the entire promise queue is empty.** "nextTick queued inside promise 1" ran after promise 3. Node does not interrupt the promise queue to run nextTicks; it returns to the nextTick queue only once the promise queue is drained.

All of this still finished before \`setTimeout 0\`.

### 3e. \`await\` resumes as a microtask

~~~js
async function task(name) {
  console.log(\`\${name}: before await\`);
  await null; // the rest of this function becomes a microtask
  console.log(\`\${name}: after await\`);
}
task("A");
task("B");
console.log("sync code done");
~~~

~~~
A: before await
B: before await
sync code done
A: after await
B: after await
[exit code 0]
~~~

📌 **Interview term: await continuation** — everything after an \`await\` in an async function is queued as a promise microtask, even when the awaited value is not a promise (\`await null\`). So two async functions interleave at each \`await\`, and "sync code done" prints before either resumes. For more on how \`async/await\` maps onto promises, see [How does async/await work](/interview-question/how-does-async-await-work-and-what-are-its-benefits).

### 3f. Starvation: a microtask chain holds back every macrotask

~~~js
// A microtask that keeps queueing microtasks never lets a macrotask run.
const t0 = Date.now();
setTimeout(() => console.log(\`setTimeout(0) finally ran after \${Date.now() - t0}ms\`), 0);
let n = 0;
function spin() {
  if (++n < 1_000_000) return Promise.resolve().then(spin);
  console.log(\`microtask chain done: \${n} links, \${Date.now() - t0}ms\`);
}
spin();
~~~

~~~
microtask chain done: 1000000 links, 559ms
setTimeout(0) finally ran after 617ms
[exit code 0]
~~~

📌 **Interview term: microtask starvation** — a timer due after 1ms waited about 620ms, because each link queued the next microtask and the drain does not stop until the queue is empty. With an unbounded chain it would never run, and neither would any I/O callback. The nextTick version of this (which starves I/O the same way) is measured in [process.nextTick() and setImmediate()](/interview-question/what-is-process-nexttick-and-setimmediate-and-when-to-use-them).

<details><summary><strong>3g. Two smaller checks behind the follow-up answers (click to expand)</strong></summary>

How many microtask turns an \`await\` takes, counted against a ticker that advances once per microtask turn:

~~~js
// How many microtask turns does each await take? Count with a ticker.
let tick = 0;
const ticker = () => { if (tick++ < 10) Promise.resolve().then(ticker); };
async function run(label, value) { const start = tick; await value; console.log(label, "resumed after", tick - start, "ticks"); }
ticker();
run("await null              ", null);
run("await resolved promise  ", Promise.resolve(1));
run("await thenable          ", { then(r) { r(1); } });
~~~

~~~
await null               resumed after 1 ticks
await resolved promise   resumed after 1 ticks
await thenable           resumed after 2 ticks
[exit code 0]
~~~

When a rejection counts as unhandled:

~~~js
process.on("unhandledRejection", (e) => console.log("unhandledRejection:", e.message));
const p1 = Promise.reject(new Error("p1"));
queueMicrotask(() => p1.catch(() => console.log("p1 handled in a later microtask: ok")));
const p2 = Promise.reject(new Error("p2"));
setTimeout(() => p2.catch(() => console.log("p2 handled in a timer")), 0);
~~~

~~~
p1 handled in a later microtask: ok
unhandledRejection: p2
p2 handled in a timer
(node:16163) PromiseRejectionHandledWarning: Promise rejection was handled asynchronously (rejection id: 2)
(Use \`node --trace-warnings ...\` to show where the warning was created)
[exit code 0]
~~~

The process id in the warning changes per run.

</details>

## 4. Microtask vs Macrotask, Side by Side

| | Microtask | Macrotask |
| :--- | :--- | :--- |
| Examples | \`.then\`/\`await\` continuation, \`queueMicrotask\`; plus Node's separate \`process.nextTick\` queue | \`setTimeout\`, \`setInterval\`, I/O callbacks, \`setImmediate\`, close events |
| Who owns the queue | V8 (promises), Node (nextTick) | libuv phases (timers, poll, check, close) |
| When it runs | After the current callback, before anything else | When the loop reaches its phase |
| How many per turn | **All** of them, including ones added during the drain | One callback, then microtasks drain again |
| Can it starve the loop | Yes (3f: 1,000,000 links delayed a timer ~620ms) | No, the loop moves on between them |
| Order guarantee | FIFO within each queue; nextTick vs promise order depends on CJS vs ESM (3b) | Depends on phase; \`setTimeout(0)\` vs \`setImmediate\` is not fixed at top level |

The browser version of this question (no nextTick queue, rendering between tasks) is [microtasks vs macrotasks in JavaScript](/interview-question/what-is-the-difference-between-microtasks-and-macrotasks).

## 5. Common Pitfalls

- **Saying "promises run before nextTick" or the reverse without context.** Verified: CommonJS runs nextTick first, an ES module entry ran promises first.
- **Believing a nextTick always jumps ahead of pending promises.** Not when it is queued from inside a promise callback: it waited for the whole promise queue (3d, rule 3).
- **Assuming microtasks drain once per phase.** That was pre-Node 11. Today they drain after each callback (3c).
- **Using a recursive promise or nextTick loop to "yield".** It does not yield to I/O at all (3f). To actually let I/O in, yield with \`setImmediate\`.
- **Thinking \`await\` on a non-promise is synchronous.** \`await null\` still defers the rest of the function to a microtask (3e).
- **Putting heavy work in \`.then\` callbacks and calling it "async".** A microtask runs on the same thread; a 300ms \`.then\` blocks the loop for 300ms just like synchronous code.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define both:</strong> <span style="color:#f0e2c8;">"Macrotasks are callbacks owned by event-loop phases — timers, I/O, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setImmediate</code>. Microtasks are promise reactions and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">queueMicrotask</code>; Node adds a separate nextTick queue."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the rule:</strong> <span style="color:#f0e2c8;">"After every single macrotask callback, Node drains the nextTick queue, then the promise queue, until both are empty. Only then does the next macrotask run."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Show it is per callback:</strong> <span style="color:#f0e2c8;">"Two timers due in the same phase: the first timer's promise ran before the second timer. That has been Node's behaviour since v11."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Name the trap:</strong> <span style="color:#f0e2c8;">"Microtasks added during a drain run in the same drain, so a self-refilling chain starves timers and I/O — I measured a million-link chain holding a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setTimeout(0)</code> back about 620ms."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Add the expert detail:</strong> <span style="color:#f0e2c8;">"nextTick-before-promise holds in CommonJS, but the same code as an ES module ran promises first, and a nextTick queued inside a promise waits for the whole promise queue. So never depend on that order."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">queueMicrotask</code> go relative to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">Promise.then</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">process.nextTick</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Into the same V8 microtask queue as promise reactions, in FIFO order with them. In the verified basic-order script, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">queueMicrotask</code> ran right after the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">.then</code> that was queued just before it, and both ran after the nextTick in CommonJS. It is the standard, cross-runtime way to queue a microtask; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">process.nextTick</code> is Node-only and has its own queue.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did Node v11 change how microtasks drain?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To match browsers. Before v11, Node ran every timer due in the timers phase and only then drained microtasks, so two timers scheduling promises printed timer, timer, promise, promise. Since v11 it drains after each callback: timer A, A's microtasks, timer B. The verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">between.js</code> output shows the modern order. Any code that silently relied on the old batching could change behaviour on upgrade.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If microtasks can starve the loop, how do you safely process a huge array without blocking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Split it into chunks and yield between chunks with a macrotask, normally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setImmediate</code>, so the loop can run I/O callbacks between chunks. Yielding with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await Promise.resolve()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">process.nextTick</code> does not help — those are microtasks and run before any I/O, as the starvation test shows. For genuinely CPU-heavy work, a worker thread is the better tool.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">await</code> always cost exactly one microtask tick?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Awaiting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">null</code> or an already-resolved native promise resumed after one microtask turn in the verified tick-counting script; awaiting a plain thenable (an object with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">then</code> method) took two, because the engine first has to call its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">then</code> to adopt it. The safe interview answer: the continuation is always a microtask, never synchronous, and code should not depend on exactly how many turns it takes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do unhandled rejections get reported as a microtask or a macrotask?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Neither exactly. Node checks for rejected promises that still have no handler once the microtask queue has drained, and only then emits <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">unhandledRejection</code> (and, by default since Node 15, crashes). Verified: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">.catch</code> attached in a microtask queued right after the rejection counted as handled, while one attached in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setTimeout(0)</code> was too late — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">unhandledRejection</code> fired first and Node then printed a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">PromiseRejectionHandledWarning</code>.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Macrotask (task)** | A phase-owned callback: timers, I/O, \`setImmediate\`, close events |
| **Microtask** | A promise reaction or \`queueMicrotask\` callback, in V8's queue |
| **nextTick queue** | Node-only queue for \`process.nextTick\`, separate from V8's |
| **Drain** | Run every queued item, including ones added while running |
| **Per-callback draining** | Microtasks run after each macrotask callback (Node 11+) |
| **Await continuation** | The code after \`await\`, queued as a microtask |
| **Microtask starvation** | A self-refilling microtask queue blocking all macrotasks |

---
**Conclusion:** Macrotasks are callbacks that wait for their event-loop phase and run one at a time; microtasks (promise reactions, \`queueMicrotask\`) and Node's separate nextTick queue run after **every** macrotask callback and are drained completely, including anything added during the drain. Running the code confirmed the details that trip people up: microtasks ran between two timers of the same phase (Node 11+ behaviour), a nextTick queued inside a promise waited for the whole promise queue, the same script put nextTick first under CommonJS but promises first as an ES module, and a million-link promise chain held a \`setTimeout(0)\` back for about 620ms. The interview-ready rule is: "one macrotask, then drain nextTicks, then drain promises, repeat until both are empty — and do not depend on nextTick-vs-promise order across module systems."`,
    examples: [
      {
        label: "Nested scheduling: where a nextTick or promise queued inside another microtask actually runs",
        tech: "javascript",
        runnable: false,
        code: `Promise.resolve().then(() => {
  console.log("promise 1");
  process.nextTick(() => console.log("nextTick queued inside promise 1"));
  Promise.resolve().then(() => console.log("promise 3 (queued inside promise 1)"));
});
Promise.resolve().then(() => console.log("promise 2"));
process.nextTick(() => {
  console.log("nextTick 1");
  Promise.resolve().then(() => console.log("promise queued inside nextTick 1"));
  process.nextTick(() => console.log("nextTick 2 (queued inside nextTick 1)"));
});
setTimeout(() => console.log("setTimeout 0"), 0);`,
      },
      {
        label: "Microtasks drain after each macrotask callback, not once per phase",
        tech: "javascript",
        runnable: false,
        code: `// Microtasks are drained after EACH macrotask callback, not once per phase.
setTimeout(() => {
  console.log("timeout A");
  Promise.resolve().then(() => console.log("  promise from A"));
  process.nextTick(() => console.log("  nextTick from A"));
}, 0);
setTimeout(() => {
  console.log("timeout B");
  Promise.resolve().then(() => console.log("  promise from B"));
}, 0);`,
      },
      {
        label: "A microtask chain holding back a setTimeout(0) (starvation)",
        tech: "javascript",
        runnable: false,
        code: `// A microtask that keeps queueing microtasks never lets a macrotask run.
const t0 = Date.now();
setTimeout(() => console.log(\`setTimeout(0) finally ran after \${Date.now() - t0}ms\`), 0);
let n = 0;
function spin() {
  if (++n < 1_000_000) return Promise.resolve().then(spin);
  console.log(\`microtask chain done: \${n} links, \${Date.now() - t0}ms\`);
}
spin();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "How do try/catch blocks behave with asynchronous code in Node.js?",
    seoDescription:
      "try/catch only covers the current call stack: errors in later callbacks escape it, while await rejoins it. Verified, including the cases that crash.",
    description: `**Question presented to candidate:**
"A teammate wrapped a \`setTimeout\` callback and a database call in a \`try/catch\`, but the process still crashed with an uncaught error. Explain when \`try/catch\` works with asynchronous code in Node.js, when it does not, and how you would fix each case."

**What a strong answer should cover:**
- \`try/catch\` only catches errors thrown **while its own block is on the call stack**. A callback scheduled for later (timer, I/O callback, event handler) runs on a fresh stack after the \`try\` has finished, so its throw escapes and becomes an \`uncaughtException\`, which by default exits the process with code 1.
- Callback APIs do not throw at all: they pass the error as the first argument (\`(err, data) => ...\`), so the fix is to check \`err\`, not to wrap the call.
- With promises, \`await\` is what makes \`try/catch\` work: the async function resumes **inside** the \`try\` block, and a rejection is re-thrown at the \`await\`.
- The common holes: a missing \`await\` (the rejection escapes; since Node 15 an unhandled rejection crashes the process), \`return promise\` instead of \`return await promise\` inside \`try\`, \`array.forEach(async ...)\`, and starting two promises then awaiting them one at a time (the second can reject before anyone is listening).
- The fixes: \`await\` everything you mean to guard, \`return await\` inside \`try\`, \`for...of\` or \`Promise.all\`/\`allSettled\` instead of async \`forEach\`, and process-level \`uncaughtException\`/\`unhandledRejection\` handlers only as a last-resort logger before exiting.

**Clarifying questions expected:**
- "Is the failing code callback-based, promise-based, or an EventEmitter?" — each one reports errors through a different channel.

**Code / implementation expected:** Yes — showing one case that escapes and the corrected version that is caught, with the real output, is the expected proof.`,
    answer: `**Target Audience:** Engineers preparing for Node.js interviews who use \`async/await\` daily but have been surprised by a crash that "should have been caught".
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every "caught" or "escaped" claim below comes from a script that was **actually run** on Node v22.22.0, including the ones that crash; their exit codes are shown. Absolute paths in stack traces are shortened to \`/app\`.

## 1. Why This Even Matters — A Story First

A lifeguard watches the pool only while standing on the deck. You ask them to keep an eye on your kid, and they say yes. Then you tell the kid to go for a swim **after lunch**, and the lifeguard's shift ends at noon. When the kid gets into trouble at one o'clock, nobody is on the deck. The lifeguard did their job; you scheduled the risky part for after they left.

A \`try/catch\` block is that lifeguard. It guards only the code that runs **while the block is on the call stack**. A callback you schedule from inside it (a timer, a file read, an event) runs later, after the block has already finished. When that callback throws, there is no \`catch\` on duty.

\`await\` is the one move that brings the swimmer back during the lifeguard's shift: the async function pauses inside the \`try\`, and when it resumes, it resumes **inside** the same \`try\`.

## 2. The Core Idea

📌 **Interview term: call stack** — the chain of function calls currently running. A \`try/catch\` catches an exception only if the \`throw\` happens somewhere **below** it on the current stack.

📌 **Interview term: asynchronous boundary** — the point where code hands a callback to Node to run later. Everything after the boundary runs on a **new** stack, started by the event loop, with none of your earlier \`try\` blocks in it.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="A throw inside a timer callback runs on a new stack after the try block has ended and escapes, while code after await resumes inside the original try block and is caught">
  <defs>
    <marker id="tc-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Same try block, two kinds of later</text>
  <rect class="d-box-muted" x="20" y="48" width="250" height="64" rx="10"/>
  <text class="d-text" x="145" y="74" text-anchor="middle">try { setTimeout(cb) }</text>
  <text class="d-sub" x="145" y="96" text-anchor="middle">try block ends right away</text>
  <path class="d-edge" d="M 270 80 L 364 80" marker-end="url(#tc-arrow)"/>
  <text class="d-sub" x="317" y="68" text-anchor="middle">new stack</text>
  <rect class="d-box" x="370" y="48" width="250" height="64" rx="10"/>
  <text class="d-text" x="495" y="74" text-anchor="middle">cb throws</text>
  <text class="d-sub" x="495" y="96" text-anchor="middle">no catch: uncaughtException</text>
  <rect class="d-box-muted" x="20" y="150" width="250" height="64" rx="10"/>
  <text class="d-text" x="145" y="176" text-anchor="middle">try { await job() }</text>
  <text class="d-sub" x="145" y="198" text-anchor="middle">function pauses inside try</text>
  <path class="d-edge-accent" d="M 270 182 L 364 182" marker-end="url(#tc-arrow)"/>
  <text class="d-sub" x="317" y="170" text-anchor="middle">resumes</text>
  <rect class="d-box-accent" x="370" y="150" width="250" height="64" rx="10"/>
  <text class="d-text d-accent" x="495" y="176" text-anchor="middle">rejection rethrown</text>
  <text class="d-sub" x="495" y="198" text-anchor="middle">at the await: caught</text>
</svg>

Node has three different error channels, and \`try/catch\` only plugs into one of them directly:

| Style | How the error arrives | What catches it |
| :--- | :--- | :--- |
| Synchronous code | \`throw\` on the current stack | \`try/catch\` |
| Callback API (\`fs.readFile(path, cb)\`) | First argument \`err\` of the callback | \`if (err) ...\` inside the callback |
| EventEmitter / stream | An \`'error'\` event | \`emitter.on("error", ...)\` |
| Promise / async function | A rejected promise | \`await\` inside \`try/catch\`, or \`.catch()\` |

## 3. Verified: Running the Code

All scripts were run with \`node <file>\`. \`[exit code N]\` is the shell exit status.

### 3a. A throw inside a timer escapes

~~~js
// try/catch only guards the synchronous part of the code inside it.
process.on("uncaughtException", (err) => {
  console.log("4 uncaughtException handler got:", err.message);
});

try {
  setTimeout(() => {
    throw new Error("thrown inside setTimeout callback");
  }, 0);
  console.log("1 try block finished, timer scheduled");
} catch (err) {
  console.log("never printed:", err.message);
}
console.log("2 the catch block did not run");

try {
  JSON.parse("{bad json");
} catch (err) {
  console.log("3 sync error caught:", err.name);
}
~~~

~~~
1 try block finished, timer scheduled
2 the catch block did not run
3 sync error caught: SyntaxError
4 uncaughtException handler got: thrown inside setTimeout callback
[exit code 0]
~~~

The synchronous \`JSON.parse\` error was caught. The timer's error was **not**: the \`catch\` block never ran, and the error surfaced only at the process-level \`uncaughtException\` handler, after all the synchronous code had finished. Without that handler, the process dies:

~~~js
try {
  setTimeout(() => { throw new Error("boom from the timer"); }, 0);
} catch (err) {
  console.log("caught?", err.message);
}
console.log("script finished its synchronous part");
~~~

~~~
script finished its synchronous part
/app/q3/crash.js:2
  setTimeout(() => { throw new Error("boom from the timer"); }, 0);
                     ^

Error: boom from the timer
    at Timeout._onTimeout (/app/q3/crash.js:2:28)
    at listOnTimeout (node:internal/timers:588:17)
    at process.processTimers (node:internal/timers:523:7)

Node.js v22.22.0
[exit code 1]
~~~

📌 **Interview term: uncaughtException** — the process-level event Node emits when a throw reaches the top of a stack with no \`catch\`. With no listener, Node prints the stack and exits with code 1. Treat a listener as a last-resort logger, then exit: see [handling uncaught exceptions and unhandled rejections](/interview-question/how-do-you-handle-uncaught-exceptions-and-unhandled-promise-rejections-in-node-j).

### 3b. Callback and event APIs do not throw at all

~~~js
const fs = require("node:fs");
// Callback APIs do not throw: they hand the error to you as the first argument.
try {
  fs.readFile("/no/such/file.txt", "utf8", (err, data) => {
    if (err) {
      console.log("error arrived as an argument:", err.code);
      return;
    }
    console.log(data);
  });
  console.log("try block finished, no exception was thrown");
} catch (err) {
  console.log("never printed");
}
// The promise version of the same API works with try/catch + await.
(async () => {
  try {
    await fs.promises.readFile("/no/such/file.txt", "utf8");
  } catch (err) {
    console.log("await version caught:", err.code);
  }
})();
~~~

~~~
try block finished, no exception was thrown
error arrived as an argument: ENOENT
await version caught: ENOENT
[exit code 0]
~~~

~~~js
const fs = require("node:fs");
try {
  const stream = fs.createReadStream("/no/such/file.txt");
  stream.on("error", (err) => console.log("2 error event listener got:", err.code));
  console.log("1 try block done; the stream fails later, as an event");
} catch (err) {
  console.log("never printed");
}
~~~

~~~
1 try block done; the stream fails later, as an event
2 error event listener got: ENOENT
[exit code 0]
~~~

📌 **Interview term: error-first callback** — the Node convention where a callback's first parameter is an error or \`null\`. A missing file is not thrown; it is handed to you. Wrapping the call in \`try/catch\` does nothing useful. Streams and other EventEmitters report failures as an \`'error'\` event instead (and an \`'error'\` event with no listener is thrown, which is covered in [event-emitting patterns and error-first callbacks](/interview-question/what-are-event-emitting-patterns-and-how-does-error-first-callback-convention-re)).

### 3c. async/await: five cases, side by side

~~~js
const fail = (msg, ms = 10) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

async function withAwait() {
  try {
    await fail("A: awaited rejection");
  } catch (err) {
    console.log("caught in withAwait ->", err.message);
  } finally {
    console.log("finally in withAwait runs too");
  }
}

async function returnWithoutAwait() {
  try {
    return fail("B: returned, not awaited");
  } catch (err) {
    console.log("never printed:", err.message);
  }
}

async function returnAwait() {
  try {
    return await fail("C: return await");
  } catch (err) {
    console.log("caught in returnAwait ->", err.message);
  }
}

async function forEachTrap() {
  try {
    [1, 2].forEach(async (n) => {
      await fail(\`D: forEach item \${n}\`);
    });
    console.log("forEachTrap: try block finished with no error");
  } catch (err) {
    console.log("never printed:", err.message);
  }
}

async function forOfFix() {
  try {
    for (const n of [1, 2]) await fail(\`E: for...of item \${n}\`);
  } catch (err) {
    console.log("caught in forOfFix ->", err.message);
  }
}

process.on("unhandledRejection", (err) => {
  console.log("unhandledRejection ->", err.message);
});

(async () => {
  await withAwait();
  await returnWithoutAwait().catch((e) => console.log("caller had to catch ->", e.message));
  await returnAwait();
  await forEachTrap();
  await new Promise((r) => setTimeout(r, 30)); // let the forEach rejections land
  await forOfFix();
})();
~~~

~~~
caught in withAwait -> A: awaited rejection
finally in withAwait runs too
caller had to catch -> B: returned, not awaited
caught in returnAwait -> C: return await
forEachTrap: try block finished with no error
unhandledRejection -> D: forEach item 1
unhandledRejection -> D: forEach item 2
caught in forOfFix -> E: for...of item 1
[exit code 0]
~~~

| Case | Caught by the local \`try/catch\`? | Why |
| :--- | :--- | :--- |
| A — \`await\` inside \`try\` | **Yes**, and \`finally\` runs | The function resumes inside the \`try\`; the rejection is rethrown at the \`await\` |
| B — \`return promise\` inside \`try\` | **No** | The function returned before the promise settled; the caller got the rejection |
| C — \`return await promise\` | **Yes** | The \`await\` keeps the function inside the \`try\` until the promise settles |
| D — \`array.forEach(async ...)\` | **No**, both became \`unhandledRejection\` | \`forEach\` ignores the promises its callback returns; the \`try\` finished at once |
| E — \`for...of\` with \`await\` | **Yes** (stops at the first failure) | Each \`await\` happens inside the \`try\` |

📌 **Interview term: return await** — inside a \`try\` block, \`return await x\` is not redundant: it is the difference between the local \`catch\` handling the error (C) and the caller having to (B).

### 3d. A missing await crashes the process

~~~js
async function save() {
  throw new Error("db write failed");
}
try {
  save(); // no await: the rejection escapes the try block
  console.log("try block done, nothing caught");
} catch (err) {
  console.log("never printed");
}
setTimeout(() => console.log("this timer never gets to run"), 50);
~~~

~~~
try block done, nothing caught
/app/q3/unhandled.js:2
  throw new Error("db write failed");
        ^

Error: db write failed
    at save (/app/q3/unhandled.js:2:9)
    at Object.<anonymous> (/app/q3/unhandled.js:5:3)
    ... 8 internal frames trimmed ...

Node.js v22.22.0
[exit code 1]
~~~

The \`throw\` happens synchronously inside \`save\`, but because \`save\` is \`async\`, it is turned into a rejected promise instead of an exception. Nobody awaited it, so the \`try\` never saw anything. The timer never ran because the process exited first.

📌 **Interview term: unhandled rejection** — a rejected promise with no handler once the microtask queue drains. Since Node v15.0.0 the default \`--unhandled-rejections\` mode is \`throw\`, which raises it as an uncaught exception and exits ([Node v15.0.0 release notes](https://nodejs.org/en/blog/release/v15.0.0)). Earlier versions only printed a warning, which is why older tutorials say a forgotten \`await\` is "only a warning".

### 3e. The trap that looks correct: a rejection before the await

~~~js
const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
const failAfter = (ms) =>
  new Promise((_, rej) => setTimeout(() => rej(new Error(\`failed after \${ms}ms\`)), ms));

async function main() {
  try {
    const slow = wait(100, "slow ok");   // started first
    const fast = failAfter(10);          // rejects while we are still awaiting slow
    console.log(await slow);
    console.log(await fast);             // too late: nobody was listening at 10ms
  } catch (err) {
    console.log("caught:", err.message);
  }
}
main();
~~~

~~~
/app/q3/late-await.js:3
  new Promise((_, rej) => setTimeout(() => rej(new Error(\`failed after \${ms}ms\`)), ms));
                                               ^

Error: failed after 10ms
    at Timeout._onTimeout (/app/q3/late-await.js:3:48)
    at listOnTimeout (node:internal/timers:588:17)
    at process.processTimers (node:internal/timers:523:7)

Node.js v22.22.0
[exit code 1]
~~~

Every \`await\` here **is** inside the \`try\`. It still crashed with exit code 1, and \`"slow ok"\` never printed. The \`fast\` promise rejected at 10ms while the function was still waiting on \`slow\`; at that moment nothing was listening to \`fast\`, so Node treated it as an unhandled rejection and exited before the code reached \`await fast\`. Awaiting them together attaches a handler to both right away:

~~~js
const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
const failAfter = (ms) =>
  new Promise((_, rej) => setTimeout(() => rej(new Error(\`failed after \${ms}ms\`)), ms));

async function main() {
  try {
    const [a, b] = await Promise.all([wait(100, "slow ok"), failAfter(10)]);
    console.log(a, b);
  } catch (err) {
    console.log("caught:", err.message);
  }
}
main();
~~~

~~~
caught: failed after 10ms
[exit code 0]
~~~

📌 **Interview term: concurrent awaiting** — when you start several promises, await them together (\`Promise.all\`, or \`Promise.allSettled\` if you want every result) rather than one by one. It is faster, and it is the only version where \`try/catch\` reliably sees every failure. For limiting how many run at once, see [limiting async concurrency](/interview-question/how-do-you-limit-the-concurrency-of-many-async-operations-p-limit-promise-pool).

## 4. Common Pitfalls

- **Wrapping a callback-style call in \`try/catch\`.** It catches nothing asynchronous (3a, 3b). Check \`err\` in the callback, listen for \`'error'\`, or switch to the promise API (\`fs.promises\`) and \`await\` it.
- **Forgetting \`await\` on an async call inside \`try\`.** The rejection escapes, and since Node 15 it crashes the process (3d). A linter rule such as \`no-floating-promises\` catches this.
- **\`return promise\` inside \`try\`.** The local \`catch\` is skipped (case B). Use \`return await\`.
- **\`forEach\` with an async callback.** The loop does not wait and the \`try\` cannot see the rejections (case D). Use \`for...of\` for sequential work or \`Promise.all(items.map(...))\` for parallel work.
- **Starting promises early and awaiting them one at a time.** A promise that rejects before its turn crashes the process even though its \`await\` is inside \`try\` (3e).
- **Using \`process.on("uncaughtException")\` to keep running.** After an unexpected throw, the process may be in a broken state. Node docs say it is not safe to resume normal operation after \`uncaughtException\`. Log, flush, and exit; let a supervisor restart it. The distinction between expected and unexpected errors is covered in [operational vs programmer errors](/interview-question/what-is-the-difference-between-operational-and-programmer-errors-in-node-js).

- **Assuming a web framework catches your async errors.** Express 4 ignores the promise a route handler returns, so a rejection there is unhandled unless you call \`next(err)\`; Express 5 forwards rejected handler promises to \`next\` automatically ([Express error-handling guide](https://expressjs.com/en/guide/error-handling.html)). Details in [sync vs async middleware error handling in Express](/interview-question/what-is-the-difference-between-synchronous-and-asynchronous-middleware-error-han).

## 5. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. State the rule:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try/catch</code> only catches throws that happen while its block is on the call stack. A callback scheduled from inside it runs later on a new stack, so its throw escapes."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the proof:</strong> <span style="color:#f0e2c8;">"A throw in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setTimeout</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try</code> skipped the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">catch</code>, hit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">uncaughtException</code>, and with no handler the process exited with code 1."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Name the three channels:</strong> <span style="color:#f0e2c8;">"Callback APIs pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">err</code> as the first argument, streams emit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">'error'</code>, and promises reject. Only promises plug back into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try/catch</code> — through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. List the async holes:</strong> <span style="color:#f0e2c8;">"Missing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">return</code> without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">forEach(async ...)</code>, and awaiting already-started promises one by one. Since Node 15 an unhandled rejection crashes the process."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Give the fixes:</strong> <span style="color:#f0e2c8;">"Await what you guard, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">return await</code> inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">for...of</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Promise.all</code> instead of async <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">forEach</code>, and process-level handlers only to log and exit."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">try { await job() } catch {}</code> work when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">try { setTimeout(job) } catch {}</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because an async function does not leave its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try</code> block at an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code> — it suspends there. When the promise settles, the function resumes at that exact point, still inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try</code>, and a rejection is thrown at the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code> expression. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">setTimeout</code> callback is a separate function the event loop calls later on a fresh stack; the function that held the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try</code> returned long ago. The verified side-by-side cases show A and C caught, the timer escaped.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">return await</code> inside a try block really different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">return</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, verified as cases B and C. With plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">return promise</code>, the async function finishes immediately and hands the still-pending promise to its caller; when it rejects, the local <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">catch</code> is no longer active, so only the caller can handle it. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">return await promise</code>, the function waits inside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try</code>, so the local <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">catch</code> runs. Outside a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try</code> block the two are effectively the same, which is why the rule only matters there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">My code awaits both promises inside try/catch and still crashes. How?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If you start two promises and await them one at a time, the second can reject while you are still waiting on the first. At that moment nothing is listening to it, so after the microtask queue drains Node reports an unhandled rejection and, since Node 15, exits — before your code ever reaches the second <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code>. That exact script crashed with exit code 1 when I ran it. Awaiting them together with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">Promise.all</code> attached handlers immediately and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">catch</code> ran normally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should I use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">process.on('uncaughtException')</code> so one bad request does not crash the server?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only to log and shut down cleanly. An exception that nobody anticipated may have left half-written state, open transactions or leaked resources, and Node's own docs say it is not safe to resume normal operation after one. The robust pattern is: handle expected (operational) errors where they happen, let unexpected ones crash, log them in the handler, and have a process manager or orchestrator restart the process.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you catch errors in an Express route that uses async/await?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Express 4 does not look at the promise a handler returns, so a rejection inside an async route is an unhandled rejection unless you <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">try/catch</code> and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">next(err)</code>, or wrap handlers in a helper that adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">.catch(next)</code>. Express 5 forwards rejected promises from handlers to the error middleware automatically. The detail is covered in the Express middleware error-handling question; the underlying reason is exactly this doc: the framework must attach a handler to your promise, or nobody does.</span>
</div>

</div>

## 6. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Call stack** | The chain of functions running right now; \`catch\` only sees throws below it |
| **Asynchronous boundary** | Where a callback is handed off to run later, on a new stack |
| **uncaughtException** | Process event for a throw no \`catch\` handled; default is exit code 1 |
| **Error-first callback** | Callback whose first argument is the error, instead of throwing |
| **Unhandled rejection** | A rejected promise with no handler; crashes by default since Node 15 |
| **return await** | Keeps an async function inside its \`try\` until the promise settles |
| **Concurrent awaiting** | Awaiting several promises together with \`Promise.all\`/\`allSettled\` |

---
**Conclusion:** \`try/catch\` catches only what is thrown while its block is on the call stack. Running the code showed the consequences directly: a throw inside a timer skipped the \`catch\` and exited the process with code 1, callback and stream APIs never threw at all (they passed \`ENOENT\` as an argument or an event), and \`await\` was the one thing that brought errors back into the \`try\`, because the function resumes inside it. The holes are all versions of "the code left the \`try\` before the error happened": a missing \`await\` (a crash since Node 15), \`return\` without \`await\`, async \`forEach\`, and a promise that rejected before it was awaited — which crashed even with every \`await\` inside \`try/catch\`. Await everything you mean to guard, await concurrent work together, and keep process-level handlers as a logger of last resort. For the broader strategy, see [How do you handle errors in Node.js applications?](/interview-question/how-do-you-handle-errors-in-node-js-applications)`,
    examples: [
      {
        label: "A throw inside a timer escapes the surrounding try/catch (and what does catch it)",
        tech: "javascript",
        runnable: false,
        code: `// try/catch only guards the synchronous part of the code inside it.
process.on("uncaughtException", (err) => {
  console.log("4 uncaughtException handler got:", err.message);
});

try {
  setTimeout(() => {
    throw new Error("thrown inside setTimeout callback");
  }, 0);
  console.log("1 try block finished, timer scheduled");
} catch (err) {
  console.log("never printed:", err.message);
}
console.log("2 the catch block did not run");

try {
  JSON.parse("{bad json");
} catch (err) {
  console.log("3 sync error caught:", err.name);
}`,
      },
      {
        label: "Five async/await cases side by side: which ones the try/catch actually catches",
        tech: "javascript",
        runnable: false,
        code: `const fail = (msg, ms = 10) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));

async function withAwait() {
  try {
    await fail("A: awaited rejection");
  } catch (err) {
    console.log("caught in withAwait ->", err.message);
  } finally {
    console.log("finally in withAwait runs too");
  }
}

async function returnWithoutAwait() {
  try {
    return fail("B: returned, not awaited");
  } catch (err) {
    console.log("never printed:", err.message);
  }
}

async function returnAwait() {
  try {
    return await fail("C: return await");
  } catch (err) {
    console.log("caught in returnAwait ->", err.message);
  }
}

async function forEachTrap() {
  try {
    [1, 2].forEach(async (n) => {
      await fail(\`D: forEach item \${n}\`);
    });
    console.log("forEachTrap: try block finished with no error");
  } catch (err) {
    console.log("never printed:", err.message);
  }
}

async function forOfFix() {
  try {
    for (const n of [1, 2]) await fail(\`E: for...of item \${n}\`);
  } catch (err) {
    console.log("caught in forOfFix ->", err.message);
  }
}

process.on("unhandledRejection", (err) => {
  console.log("unhandledRejection ->", err.message);
});

(async () => {
  await withAwait();
  await returnWithoutAwait().catch((e) => console.log("caller had to catch ->", e.message));
  await returnAwait();
  await forEachTrap();
  await new Promise((r) => setTimeout(r, 30)); // let the forEach rejections land
  await forOfFix();
})();`,
      },
      {
        label: "The late-await crash: a rejection that happens before you await it, and the Promise.all fix",
        tech: "javascript",
        runnable: false,
        code: `const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
const failAfter = (ms) =>
  new Promise((_, rej) => setTimeout(() => rej(new Error(\`failed after \${ms}ms\`)), ms));

async function main() {
  try {
    const slow = wait(100, "slow ok");   // started first
    const fast = failAfter(10);          // rejects while we are still awaiting slow
    console.log(await slow);
    console.log(await fast);             // too late: nobody was listening at 10ms
  } catch (err) {
    console.log("caught:", err.message);
  }
}
main();

// Fix: await both together so a handler is attached immediately.
// const [a, b] = await Promise.all([wait(100, "slow ok"), failAfter(10)]);
// -> caught: failed after 10ms   (exit code 0)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between require() and dynamic import() in Node.js?",
    seoDescription:
      "require() loads CommonJS synchronously and returns the value; import() is async, returns a Promise and works in ESM. Verified, incl. require(esm) limits.",
    description: `**Question presented to candidate:**
"Our CommonJS service loads a heavy PDF library with \`require()\` at the top of a file, and startup is slow. Someone suggests switching that line to \`await import()\`. What actually changes between \`require()\` and dynamic \`import()\` — return value, timing, caching, errors, and which module formats each can load?"

**What a strong answer should cover:**
- \`require()\` is the CommonJS loader: **synchronous**, it resolves, reads and runs the file before returning \`module.exports\`. Only available in CommonJS (in ESM it is \`require is not defined\` unless you build one with \`createRequire\`).
- \`import()\` is an expression available in **both** CommonJS and ESM. It returns a **Promise** of the module **namespace object**; your code keeps running while the module loads. Failures arrive as a rejection, not a thrown exception.
- Loading CommonJS with \`import()\` gives \`module.exports\` as the \`default\` export (plus statically detectable named exports). Loading ESM with \`require()\` works without a flag since Node 22.12 / 20.19, but fails with \`ERR_REQUIRE_ASYNC_MODULE\` if the module (or its graph) uses top-level \`await\`.
- Two separate caches: \`require.cache\` is a plain object you can delete from to force a re-run; the ESM cache is keyed by URL with no public delete, so the only way to get a fresh instance is a different URL (for example a \`?v=2\` query).
- When to pick which: static \`import\` for always-needed dependencies; \`import()\` for lazy or conditional loading, loading ESM-only packages from CommonJS, or plugin paths decided at run time; \`require()\` inside CJS code that needs a value synchronously.

**Clarifying questions expected:**
- "Is the calling file CommonJS or ESM, and is the PDF library ESM-only?" — that decides whether \`require()\` is even an option.
- "Is the heavy module needed on every request, or only on one route?" — lazy \`import()\` only helps the second case.

**Code / implementation expected:** Optional — a short script showing the return types and a failing case is a strong addition.`,
    answer: `**Target Audience:** Engineers preparing for Node.js interviews who work in CommonJS codebases and keep meeting ESM-only packages.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Every behaviour below (return types, timing, caching, error codes) comes from scripts that were **actually run** on Node v22.22.0, with the output quoted. Release-version facts are cited.

## 1. Why This Even Matters — A Story First

Two ways to get a book from a library. At the **front desk**, you ask for it and stand there until the librarian walks back with it in hand. You cannot do anything else meanwhile, but when they return, you have the book. That is \`require()\`.

The other way is the **request slip**: you fill it in, the librarian hands you a ticket ("we will call you"), and you go back to your table and keep working. When the book arrives, they call your name. That is \`import()\`: you get a ticket (a Promise) immediately and the book (the module) later.

Neither is better in general. If you need the book this second, the desk is simpler. If the book is huge and you might not even need it today, the slip lets you start work right away.

## 2. The Core Idea

📌 **Interview term: \`require()\`** — CommonJS's loader function. It resolves the path, reads the file, runs it, caches it, and **returns \`module.exports\` synchronously**. It exists only in CommonJS scope.

📌 **Interview term: dynamic \`import()\`** — a language-level expression (not a function you can pass around) that loads an ES module, or a CommonJS file, and returns a **Promise** of its **namespace object**. It works in both CommonJS and ESM files.

📌 **Interview term: module namespace object** — the object \`import()\` resolves to: one property per export, plus \`default\` for the default export. For a CommonJS file, \`default\` is its \`module.exports\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 230" role="img" aria-label="require loads and runs the module and returns the value in one synchronous step, while import returns a Promise at once, lets code keep running, and resolves to a namespace object later">
  <defs>
    <marker id="ri-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">Same file, two ways to load it</text>
  <rect class="d-box-muted" x="20" y="46" width="160" height="60" rx="10"/>
  <text class="d-text" x="100" y="72" text-anchor="middle">require(x)</text>
  <text class="d-sub" x="100" y="92" text-anchor="middle">caller waits</text>
  <path class="d-edge" d="M 180 76 L 234 76" marker-end="url(#ri-arrow)"/>
  <rect class="d-box" x="240" y="46" width="380" height="60" rx="10"/>
  <text class="d-text" x="430" y="72" text-anchor="middle">resolve, read, run, return exports</text>
  <text class="d-sub" x="430" y="92" text-anchor="middle">one synchronous step</text>
  <rect class="d-box-accent" x="20" y="140" width="160" height="60" rx="10"/>
  <text class="d-text d-accent" x="100" y="166" text-anchor="middle">import(x)</text>
  <text class="d-sub" x="100" y="186" text-anchor="middle">Promise right away</text>
  <path class="d-edge-accent" d="M 180 170 L 234 170" marker-end="url(#ri-arrow)"/>
  <rect class="d-box-muted" x="240" y="140" width="170" height="60" rx="10"/>
  <text class="d-text" x="325" y="166" text-anchor="middle">your code</text>
  <text class="d-sub" x="325" y="186" text-anchor="middle">keeps running</text>
  <path class="d-edge-accent" d="M 410 170 L 444 170" marker-end="url(#ri-arrow)"/>
  <rect class="d-box-accent" x="450" y="140" width="170" height="60" rx="10"/>
  <text class="d-text d-accent" x="535" y="166" text-anchor="middle">namespace</text>
  <text class="d-sub" x="535" y="186" text-anchor="middle">resolves later</text>
</svg>

## 3. Verified: Running the Code

All scripts were run with \`node <file>\` on Node v22.22.0. \`[exit code N]\` is the shell exit status. Two small modules are used throughout:

~~~js
// counter.cjs
console.log("  [counter.cjs is executing]");
let count = 0;
exports.next = () => ++count;
exports.label = "cjs counter";

// greet.mjs
console.log("  [greet.mjs is executing]");
export const hello = (name) => \`hello, \${name}\`;
export default "greet default export";
~~~

### 3a. Return value and timing

~~~js
console.log("1 require() returns the value right away:");
const a = require("./counter.cjs");
console.log("  typeof result:", typeof a, "| next() =", a.next());

console.log("2 import() returns a Promise:");
const p = import("./greet.mjs");
console.log("  is a Promise:", p instanceof Promise);

p.then(async (ns) => {
  console.log("4 namespace keys:", Object.keys(ns).join(", "));
  console.log("  ns.hello('node') =", ns.hello("node"));

  // import() of a CommonJS file: module.exports becomes the default export,
  // and statically detectable names are also offered as named exports.
  const c = await import("./counter.cjs");
  console.log("5 import() of counter.cjs keys:", Object.keys(c).join(", "));
  console.log("  same object as require() gave:", c.default === a, "| next() =", c.default.next());
});
console.log("3 sync code kept running while import() loads");
~~~

~~~
1 require() returns the value right away:
  [counter.cjs is executing]
  typeof result: object | next() = 1
2 import() returns a Promise:
  is a Promise: true
3 sync code kept running while import() loads
  [greet.mjs is executing]
4 namespace keys: default, hello
  ns.hello('node') = hello, node
5 import() of counter.cjs keys: default, label, next
  same object as require() gave: true | next() = 2
[exit code 0]
~~~

Line 3 printed **before** \`greet.mjs\` executed: \`import()\` handed back a Promise and the rest of the script ran first. \`counter.cjs\`, loaded with \`require()\`, ran in the middle of line 1, before \`require\` returned. Step 5 shows interop: \`import()\` of a CommonJS file gave its \`module.exports\` as \`default\` (the **same object** \`require()\` returned, so the counter continued at 2), plus \`label\` and \`next\` as named exports.

### 3b. Failure shapes, and require() of an ES module

~~~js
// tla.mjs
await new Promise((r) => setTimeout(r, 10));
export const ready = true;
~~~

~~~js
// 1. Failure shape: require() throws synchronously, import() rejects.
try {
  require("./does-not-exist.cjs");
} catch (err) {
  console.log("require threw synchronously:", err.code);
}
import("./does-not-exist.mjs").catch((err) =>
  console.log("import() rejected:", err.code)
);

// 2. require() of an ES module (unflagged in Node 22.12+): works if it is synchronous...
const g = require("./greet.mjs");
console.log("require(esm) gave a namespace:", Object.keys(g).join(", "));

// ...but not if the module uses top-level await.
try {
  require("./tla.mjs");
} catch (err) {
  console.log("require(esm with top-level await):", err.code);
}
import("./tla.mjs").then((m) => console.log("import() of the same file: ready =", m.ready));
~~~

~~~
require threw synchronously: MODULE_NOT_FOUND
  [greet.mjs is executing]
require(esm) gave a namespace: __esModule, default, hello
require(esm with top-level await): ERR_REQUIRE_ASYNC_MODULE
import() rejected: ERR_MODULE_NOT_FOUND
import() of the same file: ready = true
[exit code 0]
~~~

- \`require()\` **throws** (\`MODULE_NOT_FOUND\`), so a plain \`try/catch\` works. \`import()\` **rejects** (\`ERR_MODULE_NOT_FOUND\`, a different code from a different loader), so you need \`await\` inside \`try\` or \`.catch()\`.
- \`require("./greet.mjs")\` worked with no flag and returned the namespace (with an extra \`__esModule\` marker for interop). 📌 **Interview term: require(esm)** — loading an ES module synchronously with \`require()\`. It was unflagged in Node v22.12.0 and v20.19.0 and was still marked experimental at that point ([Node v22.12.0 release notes](https://nodejs.org/en/blog/release/v22.12.0)). No warning was printed in this v22.22.0 run.
- 📌 **Interview term: ERR_REQUIRE_ASYNC_MODULE** — \`require()\` is synchronous, so it cannot wait for a module that uses top-level \`await\`. The same file loaded fine through \`import()\`. More on that interop path in [How does CommonJS require() an ES Module in modern Node.js?](/interview-question/how-does-commonjs-require-an-es-module-in-modern-node-js) and on top-level await in [top-level await and its caveats](/interview-question/what-is-top-level-await-and-what-are-its-caveats-in-node-js-esm).

### 3c. Two caches, two ways to reload

~~~js
const path = require("node:path");
(async () => {
  // require() cache: a plain object you can inspect and delete from.
  const first = require("./counter.cjs");
  first.next(); first.next();
  console.log("require again, count continues:", require("./counter.cjs").next());
  delete require.cache[path.resolve(__dirname, "counter.cjs")];
  console.log("after deleting require.cache entry:", require("./counter.cjs").next());

  // ESM cache: keyed by URL, no public delete. Same URL = same instance.
  const a = await import("./greet.mjs");
  const b = await import("./greet.mjs");
  console.log("import() twice, same namespace object:", a === b);
  const c = await import("./greet.mjs?v=2"); // a different URL is a new module instance
  console.log("with ?v=2 query, same object:", a === c);
})();
~~~

~~~
  [counter.cjs is executing]
require again, count continues: 3
  [counter.cjs is executing]
after deleting require.cache entry: 1
  [greet.mjs is executing]
import() twice, same namespace object: true
  [greet.mjs is executing]
with ?v=2 query, same object: false
[exit code 0]
~~~

📌 **Interview term: module cache** — both loaders run a file once and hand back the cached result after that. The CommonJS cache is \`require.cache\`, a plain object keyed by absolute path: deleting the entry made the next \`require\` run the file again (count reset to 1). The ESM cache is keyed by **URL** and has no public API to delete from; importing the same URL twice returned the identical namespace, and only a different URL (\`?v=2\`) produced a fresh instance. Note that each such URL stays in memory, so query-string reloading leaks if done in a loop.

### 3d. require() does not exist in ESM

~~~js
import { createRequire } from "node:module";
try {
  require("./counter.cjs");
} catch (err) {
  console.log("plain require in ESM:", err.name, "-", err.message);
}
const require2 = createRequire(import.meta.url);
console.log("createRequire works:", require2("./counter.cjs").label);
~~~

~~~
plain require in ESM: ReferenceError - require is not defined
  [counter.cjs is executing]
createRequire works: cjs counter
[exit code 0]
~~~

In an ES module you have static \`import\` and \`import()\`; if you really need a synchronous CommonJS load, \`createRequire(import.meta.url)\` builds a \`require\` bound to the current file.

### 3e. The interview scenario: lazy-loading a heavy library

\`heavy.cjs\` stands in for a big PDF library by spending 200ms when it loads. \`lazy.cjs\` either \`require\`s it at startup or \`import()\`s it on the first request:

~~~js
// heavy.cjs
// Stand-in for a big library: 200ms of work when it is first loaded.
const end = Date.now() + 200;
while (Date.now() < end) {}
exports.render = (doc) => \`rendered \${doc}\`;
~~~

~~~js
const t0 = Date.now();
const eager = process.argv[2] === "eager";

let pdf;
if (eager) pdf = require("./heavy.cjs"); // paid at startup
console.log(\`\${eager ? "eager" : "lazy "}: ready to serve after \${Date.now() - t0}ms\`);

async function handlePdfRequest() {
  pdf ??= await import("./heavy.cjs").then((m) => m.default); // paid on first use only
  return pdf.render("invoice-42");
}

const t1 = Date.now();
handlePdfRequest().then((out) => {
  console.log(\`\${eager ? "eager" : "lazy "}: first PDF request took \${Date.now() - t1}ms -> \${out}\`);
  const t2 = Date.now();
  return handlePdfRequest().then(() => console.log(\`\${eager ? "eager" : "lazy "}: second PDF request took \${Date.now() - t2}ms\`));
});
~~~

~~~
$ node lazy.cjs eager
eager: ready to serve after 200ms
eager: first PDF request took 0ms -> rendered invoice-42
eager: second PDF request took 0ms
$ node lazy.cjs
lazy : ready to serve after 0ms
lazy : first PDF request took 207ms -> rendered invoice-42
lazy : second PDF request took 0ms
~~~

📌 **Interview term: lazy loading** — the cost does not disappear, it moves. Eager loading made the process wait 200ms before it could serve anything; lazy loading made startup instant and charged the 200ms to the **first** PDF request, with later requests hitting the cache. That is the right trade when the module is needed rarely or only on some routes. Note that \`import()\` does not make loading "background work": the module still ran its 200ms on the main thread, just later.

### 3f. Extension lookup is a require() feature

~~~js
// require() tries .js, .json, .node for you; import() uses ESM resolution, which does not.
console.log("require('./plain') ->", require("./plain").label);
import("./plain").catch((e) => console.log("import('./plain') ->", e.code));
import("./plain.js").then((m) => console.log("import('./plain.js') ->", m.default.label));
~~~

~~~
require('./plain') -> plain.js
import('./plain') -> ERR_MODULE_NOT_FOUND
import('./plain.js') -> plain.js
[exit code 0]
~~~

Even when called from a CommonJS file, \`import()\` uses ESM resolution, so the file extension is required.

## 4. Side by Side

| | \`require()\` | \`import()\` |
| :--- | :--- | :--- |
| Returns | \`module.exports\`, synchronously | Promise of the namespace object |
| Available in | CommonJS only (ESM needs \`createRequire\`) | CommonJS and ESM |
| Loads CommonJS | Yes | Yes, \`module.exports\` as \`default\` |
| Loads ESM | Yes since 22.12 / 20.19, unless it uses top-level \`await\` | Yes, always |
| Missing file | Throws \`MODULE_NOT_FOUND\` | Rejects with \`ERR_MODULE_NOT_FOUND\` |
| Cache | \`require.cache\`, deletable | Keyed by URL, not deletable |
| Specifier | Path or package; \`.js\`/\`.json\`/\`.node\` extensions optional | URL-style; relative paths need the full extension (3f) |
| Typical use | CJS code that needs a value now | Lazy/conditional loading, ESM-only packages from CJS, plugins |

Static \`import\` declarations are a third option, available only in ESM and only at the top level. They are what bundlers analyse for tree-shaking; \`import()\` with a computed path cannot be analysed ahead of time. The bigger picture of the two module systems is in [CommonJS and ES Modules](/interview-question/describe-the-node-js-module-system-what-are-commonjs-and-es-modules), and how a file is classified as one or the other is in [type module, .mjs and .cjs](/interview-question/what-is-the-difference-between-type-module-mjs-and-cjs).

## 5. Common Pitfalls

- **Switching \`require\` to \`import()\` without \`await\`.** You get a Promise, not the module; \`pdf.render\` is \`undefined\`. The calling function has to become \`async\` (and so do its callers).
- **Catching \`import()\` failures with a bare \`try\` and no \`await\`.** It rejects, it does not throw (3b).
- **Expecting \`require()\` to load any ES module.** It fails with \`ERR_REQUIRE_ASYNC_MODULE\` when the module or anything it imports uses top-level \`await\`, and on Node versions before 22.12 / 20.19 it fails without a flag.
- **Destructuring named exports from \`import()\` of a CommonJS file.** Only names Node can detect statically become named exports; the safe choice is \`.default\`. See [module.exports vs exports](/interview-question/what-is-the-difference-between-module-exports-and-exports-in-node-js) for which patterns are detected.
- **Using query strings to hot-reload ESM in a long-running process.** Each new URL is a new module that is never freed (3c).
- **Thinking lazy loading makes the work asynchronous.** The module body still runs on the main thread when first imported (3e).

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Lead with the core split:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> is CommonJS and synchronous — it runs the file and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> before the next line. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import()</code> works in both systems and returns a Promise of the module namespace."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Show the consequences:</strong> <span style="color:#f0e2c8;">"So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> failures throw and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import()</code> failures reject; and switching to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import()</code> means the caller has to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code>, which makes it async too."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Cover interop:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import()</code> of a CommonJS file gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">default</code> — I checked it is the same object <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> returns. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> of ESM works unflagged since 22.12 / 20.19, except with top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">ERR_REQUIRE_ASYNC_MODULE</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mention caching:</strong> <span style="color:#f0e2c8;">"Both cache. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require.cache</code> can be deleted from to force a re-run; the ESM cache is keyed by URL and cannot, so only a new URL gives a fresh copy."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Answer the use case:</strong> <span style="color:#f0e2c8;">"For a heavy, rarely used library, lazy <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import()</code> moves the cost from startup to first use — in my test 200ms at startup became 0ms, and the first request paid 207ms. It is still main-thread work, just later."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">import()</code> with a variable path, like a plugin name from config?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import()</code> takes any string expression, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">await import("./plugins/" + name + ".js")</code> works (verified with a computed path), as does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> with a computed path. The cost is that bundlers and static analysis cannot know the target ahead of time, so it will not be tree-shaken or bundled automatically. You also own the security of that path: never build it from user input without an allow-list.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">import()</code> need the file extension when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">require()</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import()</code> always uses ESM resolution, even from a CommonJS file, and ESM resolution treats specifiers like URLs with no extension guessing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> tries <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">.js</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">.json</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">.node</code> for you. The verified script showed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require('./plain')</code> working while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import('./plain')</code> rejected with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">ERR_MODULE_NOT_FOUND</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import('./plain.js')</code> succeeded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If both loaders cache, does a module loaded with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">require()</code> run again when loaded with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">import()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a CommonJS file, no — in the verified run, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import()</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">counter.cjs</code> returned the exact object <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> had produced and the counter kept counting from 1 to 2, so the file did not execute twice. The ESM loader wraps the already-loaded CommonJS module rather than re-running it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">__esModule</code> mean in the result of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">require()</code> on an ES module?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is an interop marker. Transpilers like Babel and TypeScript have long used <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">__esModule: true</code> to signal "this CommonJS object came from an ES module, treat <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">default</code> as the default export". Node adds it to the namespace that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require(esm)</code> returns so code compiled with those conventions handles it correctly. The verified output listed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">__esModule, default, hello</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">import()</code> a function? Can I pass it around like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">require</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It looks like a call but it is syntax, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">super()</code>: you cannot write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">const load = import</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">fn.call(import, ...)</code>. That is also why it resolves relative paths against the file it is written in. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require</code>, by contrast, is a real function local to each CommonJS module, which is why you can pass it around or create one with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">createRequire</code>.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`require()\`** | Synchronous CommonJS loader that returns \`module.exports\` |
| **Dynamic \`import()\`** | Async loader expression returning a Promise of the namespace |
| **Module namespace object** | One property per export, plus \`default\` |
| **require(esm)** | \`require()\` of an ES module, unflagged in 22.12 / 20.19 |
| **ERR_REQUIRE_ASYNC_MODULE** | Error when \`require()\` meets top-level \`await\` |
| **Module cache** | Run-once store: \`require.cache\` by path, ESM by URL |
| **\`createRequire\`** | Builds a \`require\` function inside an ES module |
| **Lazy loading** | Loading a module on first use instead of at startup |

---
**Conclusion:** \`require()\` is CommonJS's synchronous loader: it runs the file and returns \`module.exports\` before the next line executes, throws on failure, and keeps a deletable path-keyed cache. \`import()\` works from both CommonJS and ESM, returns a Promise of a namespace object while your code keeps running, rejects on failure, and keeps a URL-keyed cache with no delete. Running the code confirmed the interop rules: \`import()\` of a CommonJS file returned the very same \`module.exports\` object as \`default\`, and \`require()\` of an ES module worked with no flag on Node 22 but failed with \`ERR_REQUIRE_ASYNC_MODULE\` once top-level \`await\` was involved. For the startup-time scenario, lazy \`import()\` moved a 200ms load from startup to the first request — a real win when the module is rarely needed, but the same work on the same thread.`,
    examples: [
      {
        label: "require() returns a value, import() returns a Promise, and import() of a CJS file gives module.exports as default",
        tech: "javascript",
        runnable: false,
        code: `console.log("1 require() returns the value right away:");
const a = require("./counter.cjs");
console.log("  typeof result:", typeof a, "| next() =", a.next());

console.log("2 import() returns a Promise:");
const p = import("./greet.mjs");
console.log("  is a Promise:", p instanceof Promise);

p.then(async (ns) => {
  console.log("4 namespace keys:", Object.keys(ns).join(", "));
  console.log("  ns.hello('node') =", ns.hello("node"));

  // import() of a CommonJS file: module.exports becomes the default export,
  // and statically detectable names are also offered as named exports.
  const c = await import("./counter.cjs");
  console.log("5 import() of counter.cjs keys:", Object.keys(c).join(", "));
  console.log("  same object as require() gave:", c.default === a, "| next() =", c.default.next());
});
console.log("3 sync code kept running while import() loads");

// counter.cjs
// console.log("  [counter.cjs is executing]");
// let count = 0;
// exports.next = () => ++count;
// exports.label = "cjs counter";

// greet.mjs
// console.log("  [greet.mjs is executing]");
// export const hello = (name) => \`hello, \${name}\`;
// export default "greet default export";`,
      },
      {
        label: "Failure shapes and require(esm): a sync throw vs a rejection, and ERR_REQUIRE_ASYNC_MODULE for top-level await",
        tech: "javascript",
        runnable: false,
        code: `// 1. Failure shape: require() throws synchronously, import() rejects.
try {
  require("./does-not-exist.cjs");
} catch (err) {
  console.log("require threw synchronously:", err.code);
}
import("./does-not-exist.mjs").catch((err) =>
  console.log("import() rejected:", err.code)
);

// 2. require() of an ES module (unflagged in Node 22.12+): works if it is synchronous...
const g = require("./greet.mjs");
console.log("require(esm) gave a namespace:", Object.keys(g).join(", "));

// ...but not if the module uses top-level await.
try {
  require("./tla.mjs");
} catch (err) {
  console.log("require(esm with top-level await):", err.code);
}
import("./tla.mjs").then((m) => console.log("import() of the same file: ready =", m.ready));`,
      },
      {
        label: "The two caches: deleting from require.cache vs a new URL for import()",
        tech: "javascript",
        runnable: false,
        code: `const path = require("node:path");
(async () => {
  // require() cache: a plain object you can inspect and delete from.
  const first = require("./counter.cjs");
  first.next(); first.next();
  console.log("require again, count continues:", require("./counter.cjs").next());
  delete require.cache[path.resolve(__dirname, "counter.cjs")];
  console.log("after deleting require.cache entry:", require("./counter.cjs").next());

  // ESM cache: keyed by URL, no public delete. Same URL = same instance.
  const a = await import("./greet.mjs");
  const b = await import("./greet.mjs");
  console.log("import() twice, same namespace object:", a === b);
  const c = await import("./greet.mjs?v=2"); // a different URL is a new module instance
  console.log("with ?v=2 query, same object:", a === c);
})();`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: "What is the difference between module.exports and exports in Node.js?",
    seoDescription:
      "exports is a shortcut variable pointing at module.exports; require() returns module.exports, so reassigning exports does nothing. Verified with 4 patterns.",
    description: `**Question presented to candidate:**
"A module ends with \`exports = { createUser, deleteUser }\`, and every caller gets an empty object back from \`require()\`. Explain what \`exports\` and \`module.exports\` are, why that line does nothing, and how you would export a single function versus several helpers."

**What a strong answer should cover:**
- Node runs every CommonJS file inside a wrapper function \`(exports, require, module, __filename, __dirname)\`. Before your code runs, \`exports\` and \`module.exports\` point at the **same empty object**.
- \`require()\` returns **\`module.exports\`**, whatever it points to when the file finishes loading. \`exports\` is just a local variable holding a shortcut to it.
- Adding properties (\`exports.add = ...\` or \`module.exports.add = ...\`) changes the shared object, so both work. **Reassigning** \`exports\` only rebinds the local variable, so the module still exports the original empty object.
- To export a single function, class or value, assign \`module.exports = fn\`. After that, \`exports.x = ...\` writes to the old, abandoned object and is lost, unless you relink both with \`module.exports = exports = ...\`.
- \`module.exports\` must be set synchronously during load; assigning it later (in a callback) is invisible to callers who already required the file. When ESM imports a CommonJS file, \`module.exports\` becomes the \`default\` export and named exports are found by static analysis, so patterns like \`module.exports = build()\` give no named exports.

**Clarifying questions expected:**
- "Is this file loaded only by CommonJS callers, or also imported from ES modules?" — the export style affects whether ESM callers get named exports.

**Code / implementation expected:** Optional — a few lines showing \`exports = {}\` versus \`module.exports = {}\` and what \`require()\` returns makes the answer airtight.`,
    answer: `**Target Audience:** Engineers preparing for Node.js interviews who have written \`exports.x = ...\` and \`module.exports = ...\` without being sure why both exist.
**Difficulty:** Medium

> **How to read this doc:** Concepts are explained in plain language first, then tagged with <code>📌 Interview term:</code>. Each export pattern below was **actually run** on Node v22.22.0 and the exact output of \`require()\` (and of \`import()\` from an ES module) is quoted.

## 1. Why This Even Matters — A Story First

An office has one shared whiteboard for announcements. The office manager (Node) writes the official address of the board in the handbook: "announcements are on **the board in room 4**". That entry is \`module.exports\`. For convenience, each employee also gets a sticky note on their desk that says "the board is in room 4". That sticky note is \`exports\`.

If you walk to room 4 and write on the board, everyone sees it, whether you found the room through the handbook or the sticky note. But if you cross out your sticky note and write "the board is now in my drawer", nothing changes for anyone else: the handbook still points at room 4, and visitors only ever read the handbook.

\`require()\` reads the handbook, never your sticky note.

## 2. The Core Idea

📌 **Interview term: module wrapper** — before running a CommonJS file, Node wraps its source in a function and calls it with five arguments: \`exports\`, \`require\`, \`module\`, \`__filename\`, \`__dirname\`. That is why these names exist in every file without being imported, and why top-level variables stay private to the file.

📌 **Interview term: \`module.exports\`** — the property on the \`module\` object that **\`require()\` returns** when the file has finished loading. It starts out as an empty object.

📌 **Interview term: \`exports\`** — a parameter of the wrapper that initially holds a reference to that same empty object. It is a convenience alias, nothing more. Node never reads it back.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="At the start of a module both module.exports and exports point at the same empty object, and require returns that object">
  <defs>
    <marker id="me-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">When the file starts running</text>
  <rect class="d-box-accent" x="30" y="44" width="190" height="50" rx="9"/>
  <text class="d-text d-accent" x="125" y="74" text-anchor="middle">module.exports</text>
  <rect class="d-box-muted" x="30" y="122" width="190" height="50" rx="9"/>
  <text class="d-text" x="125" y="152" text-anchor="middle">exports</text>
  <rect class="d-box" x="400" y="78" width="210" height="60" rx="9"/>
  <text class="d-text" x="505" y="104" text-anchor="middle">one shared object</text>
  <text class="d-sub" x="505" y="124" text-anchor="middle">require returns this</text>
  <path class="d-edge-accent" d="M 220 69 L 394 100" marker-end="url(#me-arrow)"/>
  <path class="d-edge" d="M 220 147 L 394 118" marker-end="url(#me-arrow)"/>
</svg>

<svg class="iq-diagram" width="100%" viewBox="0 0 640 190" role="img" aria-label="After exports is reassigned, exports points at a new object nobody reads, while module.exports still points at the original object that require returns">
  <defs>
    <marker id="me2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="320" y="24" text-anchor="middle">After exports = { add }</text>
  <rect class="d-box-accent" x="30" y="44" width="190" height="50" rx="9"/>
  <text class="d-text d-accent" x="125" y="74" text-anchor="middle">module.exports</text>
  <rect class="d-box-muted" x="30" y="122" width="190" height="50" rx="9"/>
  <text class="d-text" x="125" y="152" text-anchor="middle">exports</text>
  <rect class="d-box" x="400" y="40" width="210" height="58" rx="9"/>
  <text class="d-text" x="505" y="64" text-anchor="middle">original, still empty</text>
  <text class="d-sub" x="505" y="84" text-anchor="middle">require returns this</text>
  <rect class="d-box-muted" x="400" y="118" width="210" height="58" rx="9"/>
  <text class="d-text" x="505" y="142" text-anchor="middle">new object with add</text>
  <text class="d-sub" x="505" y="162" text-anchor="middle">nobody ever reads it</text>
  <path class="d-edge-accent" d="M 220 69 L 394 69" marker-end="url(#me2-arrow)"/>
  <path class="d-edge" d="M 220 147 L 394 147" marker-end="url(#me2-arrow)"/>
</svg>

The whole topic reduces to one sentence of JavaScript: assigning to a variable never changes other variables that held the same reference.

## 3. Verified: Running the Code

All scripts were run with \`node <file>\` on Node v22.22.0; \`[exit code N]\` is the shell exit status. The \`.js\` files are CommonJS (there is no \`package.json\` with \`"type": "module"\` above them).

### 3a. The wrapper is real

~~~js
// Every CommonJS file is wrapped in a function before it runs.
console.log(require("node:module").wrapper.join(" ... your file ... "));
console.log("exports === module.exports at start:", exports === module.exports);
console.log("top-level this === module.exports:", this === module.exports);
console.log("arguments.length inside the wrapper:", arguments.length);
~~~

~~~
(function (exports, require, module, __filename, __dirname) {  ... your file ... 
});
exports === module.exports at start: true
top-level this === module.exports: true
arguments.length inside the wrapper: 5
[exit code 0]
~~~

\`require("node:module").wrapper\` prints the exact wrapper source. Inside a CommonJS file, \`exports === module.exports\` starts out \`true\`, and even top-level \`this\` is that same object.

### 3b. Four export styles, and what require() returns

~~~js
// a-add.js
exports.add = (a, b) => a + b;          // adds a property to the shared object
module.exports.sub = (a, b) => a - b;  // same object, same effect

// b-reassign-exports.js
exports = { add: (a, b) => a + b };     // rebinds the local variable only

// c-reassign-module.js
module.exports = function greet(name) { return \`hi \${name}\`; };
exports.extra = "lost";                 // still points at the OLD object

// d-both.js
module.exports = exports = { version: 1 }; // relink both names to the new object
exports.ready = true;
~~~

~~~js
const show = (f) => {
  const v = require(f);
  console.log(f.padEnd(24), "->", typeof v === "function" ? \`function \${v.name}, extra=\${v.extra}\` : JSON.stringify(Object.keys(v)));
};
["./a-add.js", "./b-reassign-exports.js", "./c-reassign-module.js", "./d-both.js"].forEach(show);
~~~

~~~
./a-add.js               -> ["add","sub"]
./b-reassign-exports.js  -> []
./c-reassign-module.js   -> function greet, extra=undefined
./d-both.js              -> ["version","ready"]
[exit code 0]
~~~

| File | Pattern | What \`require()\` got | Why |
| :--- | :--- | :--- | :--- |
| \`a-add.js\` | \`exports.add\` + \`module.exports.sub\` | \`{ add, sub }\` | Both write properties onto the one shared object |
| \`b-reassign-exports.js\` | \`exports = { add }\` | \`{}\` | Rebinding the local \`exports\` does not touch \`module.exports\` |
| \`c-reassign-module.js\` | \`module.exports = fn\`, then \`exports.extra\` | the function, \`extra\` undefined | \`exports\` still points at the abandoned original object |
| \`d-both.js\` | \`module.exports = exports = {...}\` | \`{ version, ready }\` | Both names relinked to the new object first |

📌 **Interview term: reference vs rebinding** — \`exports.add = x\` mutates the object both names reference; \`exports = x\` makes one name reference something else. Only the first is visible to \`require()\`.

### 3c. module.exports must be set during load

~~~js
// e-late.js
setTimeout(() => { module.exports = { ready: true }; }, 0); // too late
~~~

~~~js
const late = require("./e-late.js");
console.log("e-late.js right after require:", JSON.stringify(late));
setTimeout(() => {
  console.log("e-late.js later, held reference:", JSON.stringify(late));
  console.log("e-late.js later, require again:", JSON.stringify(require("./e-late.js")));
}, 10);
~~~

~~~
e-late.js right after require: {}
e-late.js later, held reference: {}
e-late.js later, require again: {"ready":true}
[exit code 0]
~~~

📌 **Interview term: synchronous export** — \`require()\` returns whatever \`module.exports\` points to at the moment the file **finishes running**. A caller that already holds that value keeps the empty object forever (\`held reference: {}\`); only a fresh \`require()\` after the timer, which reads the cached \`module\` again, sees the new value. If a module needs async setup, export a function or a promise (\`module.exports = init()\`) instead of assigning late. The same "you get whatever was there at that moment" rule causes the partial-exports bug in circular requires, covered in [handling circular dependencies](/interview-question/how-do-you-handle-circular-dependencies-in-node-js).

### 3d. How an ES module sees each style

~~~js
// f-literal.js
const add = (a, b) => a + b;
module.exports = { add };

// g-computed.js
function build() { return { add: (a, b) => a + b }; }
module.exports = build();
~~~

~~~js
// How an ES module sees each CommonJS style (named exports are found by static analysis).
for (const f of ["./a-add.js", "./f-literal.js", "./g-computed.js", "./c-reassign-module.js"]) {
  const ns = await import(f);
  console.log(f.padEnd(24), "named exports:", Object.keys(ns).filter((k) => k !== "default").join(", ") || "(none)");
}
const { add } = await import("./g-computed.js").then((m) => m.default);
console.log("g-computed.js via default:", add(2, 3));
~~~

~~~
./a-add.js               named exports: add, sub
./f-literal.js           named exports: add
./g-computed.js          named exports: (none)
./c-reassign-module.js   named exports: extra
g-computed.js via default: 5
[exit code 0]
~~~

📌 **Interview term: static named-export detection** — when ESM imports a CommonJS file, \`module.exports\` always becomes the \`default\` export. Named exports are added by scanning the **source text** (Node uses the cjs-module-lexer for this) for patterns like \`exports.name =\` and \`module.exports = { name }\`. So:

- \`exports.add\` / \`module.exports.sub\` and the object literal \`{ add }\` produced named exports.
- \`module.exports = build()\` produced **none**: the scanner does not run code. \`.default\` still had \`add\`.
- \`c-reassign-module.js\` listed \`extra\` as a named export, because the text \`exports.extra =\` exists, but its value is \`undefined\` at runtime (checked separately: \`ns.extra = undefined | typeof ns.default = function\`). The scanner and the runtime disagree, and the runtime wins.

For how \`import()\` and \`require()\` differ more broadly, see [require() vs dynamic import()](/interview-question/what-is-the-difference-between-require-and-dynamic-import-in-node-js).

<details><summary><strong>3e. Checks behind the follow-up answers: ESM scope and circular requires (click to expand)</strong></summary>

~~~js
// esm-checks.mjs  (named-fail.mjs contains: import { add } from "./g-computed.js";)
console.log("top-level this in ESM:", this);
console.log("typeof exports:", typeof exports, "| typeof module:", typeof module);
try {
  await import("./named-fail.mjs");
} catch (err) {
  console.log("import { add } from g-computed.js ->", err.name + ":", err.message.split("\\n")[0]);
}
~~~

~~~
top-level this in ESM: undefined
typeof exports: undefined | typeof module: undefined
import { add } from g-computed.js -> SyntaxError: Named export 'add' not found. The requested module './g-computed.js' is a CommonJS module, which may not support all module.exports as named exports.
[exit code 0]
~~~

A circular require, once with the \`exports.x\` style and once with \`module.exports = {...}\`:

~~~js
// cyc/a.js
exports.early = "set before requiring b";
const b = require("./b.js");
exports.late = "set after requiring b";
setImmediate(() => b.report());

// cyc/b.js
const a = require("./a.js"); // a.js is only half-loaded here
console.log("b sees a during load:", Object.keys(a));
exports.report = () => console.log("b reads a later:", Object.keys(a));

// cyc/a2.js
const b = require("./b2.js");
module.exports = { early: 1, late: 2 }; // replaces the object b2 already holds
setImmediate(() => b.report());

// cyc/b2.js
const a = require("./a2.js");
exports.report = () => console.log("b2 reads a2 later:", Object.keys(a));
~~~

~~~
$ node cyc/a.js
b sees a during load: [ 'early' ]
b reads a later: [ 'early', 'late' ]
$ node cyc/a2.js
b2 reads a2 later: []
~~~

With \`exports.x\`, \`b.js\` holds the same object \`a.js\` keeps filling, so a later read sees \`late\`. With \`module.exports = {...}\`, \`b2.js\` is left holding the replaced, empty original.

</details>

## 4. Which Style When

| Goal | Write | Avoid |
| :--- | :--- | :--- |
| Several helpers | \`exports.a = ...; exports.b = ...\` or \`module.exports = { a, b }\` | \`exports = { a, b }\` |
| One function or class | \`module.exports = MyClass\` | Mixing it with later \`exports.x\` lines |
| Replace the object and keep using the shortcut | \`module.exports = exports = {...}\` | Reassigning only one of the two |
| Friendly to ESM importers | \`module.exports = { a, b }\` literal or \`exports.a =\` | \`module.exports = build()\` if you want named imports |
| Async setup | \`module.exports = init()\` (a promise) or an \`init\` function | Assigning \`module.exports\` in a callback |

In ES modules none of this exists: you use \`export\` / \`export default\`, and \`exports\` and \`module\` are not defined. The two systems are compared in [Explain how modules work in Node.js](/interview-question/explain-how-modules-work-in-node-js).

## 5. Common Pitfalls

- **\`exports = { ... }\`.** Silently exports \`{}\` (3b, \`b-reassign-exports.js\`). Use \`module.exports = { ... }\`.
- **\`module.exports = fn\` followed by \`exports.helper = ...\`.** The helper lands on the abandoned object (\`extra=undefined\` above).
- **Assigning \`module.exports\` inside a callback or after an \`await\`.** Callers who required the file earlier keep the empty object (3c).
- **Destructuring \`const { add } = require(...)\` from a module that exports a function.** You get \`undefined\`, because the function has no \`add\` property.
- **Relying on named imports from ESM for a CommonJS module built dynamically.** Only statically visible names are detected (3d); \`default\` always works.
- **Using \`this\` instead of \`exports\` at the top level.** It happens to be the same object (3a) but confuses every reader and breaks inside functions.

## 6. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Explain where they come from:</strong> <span style="color:#f0e2c8;">"Node wraps every CommonJS file in a function with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports, require, module, __filename, __dirname</code>. At the start, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> are the same empty object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. State the rule:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports</code> is only a local shortcut to it, and Node never reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports</code> back."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Show the bug:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports.add = fn</code> works because it changes the shared object. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports = { add }</code> only rebinds the local variable, so callers get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">{}</code> — I ran it and got an empty object."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the single-value case:</strong> <span style="color:#f0e2c8;">"To export one function or class, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports = fn</code>. After that, any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports.x</code> writes go to the old object and are lost, unless you write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports = exports = ...</code>."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Add the advanced points:</strong> <span style="color:#f0e2c8;">"<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> must be final when the file finishes loading; late assignments are invisible. And ESM importers get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">default</code>, with named exports detected only from the source text."</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Node provide <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">exports</code> at all if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">module.exports</code> is the real thing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Convenience and history: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports.foo = ...</code> is shorter, and early CommonJS specs described an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports</code> object. Node added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> so a module could export a single function or class, which plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports</code> cannot do because reassigning a parameter never affects the caller. In practice many teams standardise on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> everywhere to avoid the trap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you get if a file sets both <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">exports.a = 1</code> and later <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">module.exports = { b: 2 }</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">{ b: 2 }</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">require()</code> returns whatever <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> points to at the end, and that is the new object; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">a</code> was written to the original object, which nothing references any more. This is the same mechanism as the verified <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">c-reassign-module.js</code> case, where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">extra</code> came back <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">undefined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is top-level <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">this</code> in a CommonJS file the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">exports</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes — the wrapper is called with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">this</code> set to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code>, and the verified run printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">top-level this === module.exports: true</code>. It is a curiosity, not a pattern to use: inside functions <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">this</code> means something else, and in ES modules top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">this</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">undefined</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:4px;">exports</code> in a circular require?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">a.js</code> requires <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">b.js</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">b.js</code> requires <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">a.js</code> back, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">b.js</code> receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">a.js</code>'s <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports</code> as it is at that moment — partially filled. With the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports.x = ...</code> style, properties added later show up on the same object, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">b.js</code> can see them if it reads them lazily. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports = {...}</code> at the end of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">a.js</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">b.js</code> is stuck holding the old empty object. That is one practical reason to prefer adding properties when cycles are possible.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When an ES module imports a CommonJS file, why do some named imports fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because named exports for CommonJS are found by statically scanning the source text, not by running it. Patterns like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">exports.add =</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports = { add }</code> are detected; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">module.exports = build()</code> is not, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import { add }</code> fails while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">import mod from</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">mod.add</code> work. The verified run also showed the reverse mismatch: a name the scanner saw (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">extra</code>) whose runtime value was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:4px;">undefined</code>.</span>
</div>

</div>

## 7. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Module wrapper** | The function Node wraps around each CommonJS file |
| **\`module.exports\`** | The value \`require()\` returns for a file |
| **\`exports\`** | A local alias that starts out pointing at \`module.exports\` |
| **Reference vs rebinding** | Mutating the shared object vs pointing a name elsewhere |
| **Synchronous export** | \`require()\` sees \`module.exports\` as it is when loading ends |
| **Static named-export detection** | Node scanning CJS source text to offer named ESM imports |

---
**Conclusion:** \`exports\` and \`module.exports\` start as two names for the same empty object, created by the module wrapper that Node puts around every CommonJS file — the wrapper and the \`exports === module.exports\` check were printed directly. \`require()\` only ever returns \`module.exports\`, so writing properties through either name works, while reassigning \`exports\` changed nothing (\`{}\`), and \`exports.extra\` written after \`module.exports = fn\` was lost. \`module.exports\` also has to be in its final form when the file finishes loading: a late assignment was invisible to a caller holding the earlier value. When ES modules import CommonJS, \`module.exports\` is the \`default\` export and named exports come from a text scan, so \`module.exports = build()\` offered none. Rule of thumb: properties through \`exports\`, a single value through \`module.exports\`, never reassign \`exports\` alone.`,
    examples: [
      {
        label: "The module wrapper that creates exports and module.exports",
        tech: "javascript",
        runnable: false,
        code: `// Every CommonJS file is wrapped in a function before it runs.
console.log(require("node:module").wrapper.join(" ... your file ... "));
console.log("exports === module.exports at start:", exports === module.exports);
console.log("top-level this === module.exports:", this === module.exports);
console.log("arguments.length inside the wrapper:", arguments.length);`,
      },
      {
        label: "Four export styles and what require() actually returns for each",
        tech: "javascript",
        runnable: false,
        code: `const show = (f) => {
  const v = require(f);
  console.log(f.padEnd(24), "->", typeof v === "function" ? \`function \${v.name}, extra=\${v.extra}\` : JSON.stringify(Object.keys(v)));
};
["./a-add.js", "./b-reassign-exports.js", "./c-reassign-module.js", "./d-both.js"].forEach(show);

// a-add.js
// exports.add = (a, b) => a + b;
// module.exports.sub = (a, b) => a - b;

// b-reassign-exports.js
// exports = { add: (a, b) => a + b };

// c-reassign-module.js
// module.exports = function greet(name) { return \`hi \${name}\`; };
// exports.extra = "lost";

// d-both.js
// module.exports = exports = { version: 1 };
// exports.ready = true;`,
      },
      {
        label: "How an ES module sees each CommonJS export style (static named-export detection)",
        tech: "javascript",
        runnable: false,
        code: `// How an ES module sees each CommonJS style (named exports are found by static analysis).
for (const f of ["./a-add.js", "./f-literal.js", "./g-computed.js", "./c-reassign-module.js"]) {
  const ns = await import(f);
  console.log(f.padEnd(24), "named exports:", Object.keys(ns).filter((k) => k !== "default").join(", ") || "(none)");
}
const { add } = await import("./g-computed.js").then((m) => m.default);
console.log("g-computed.js via default:", add(2, 3));`,
      },
    ],
  },

];

export default augments;
