/**
 * PYTHON ULTRA — batch 25: Concurrency I. Every in-page example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; examples marked runnable: false (threads,
 * processes, asyncio.run) were run on the interpreter named in their python
 * field. Quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is the difference between concurrency and parallelism in Python?`,
    difficulty: "medium",
    seoDescription: `Concurrency vs parallelism in Python: interleaving tasks vs running them at the same instant, how the GIL changes threads, and which tool gives which.`,
    description: `**Question presented to candidate:**
"People use concurrency and parallelism as if they were the same word. What is the actual difference, and what does each one look like in Python — with threads, asyncio and multiprocessing?"

**What a strong answer should cover:**
- Concurrency is about structure: several tasks are in progress during the same period and their steps interleave, possibly on one core. Parallelism is about execution: several steps run at the same instant on different cores.
- Parallelism needs more than one core; concurrency does not. Every parallel program is concurrent, not every concurrent program is parallel.
- In CPython with the GIL, threads give concurrency but not parallel Python bytecode; blocking I/O and many C extensions release the GIL, so waits overlap.
- asyncio is concurrency on a single thread (cooperative, switches only at \`await\`); multiprocessing (or \`ProcessPoolExecutor\`) gives parallelism with one interpreter and one GIL per process.
- Which one you need follows from the workload: waiting (I/O-bound) is helped by concurrency; computing (CPU-bound) needs parallelism.
- Version detail: the free-threaded build (experimental in 3.13, officially supported but optional in 3.14) lets threads run Python code in parallel.

**Code / implementation expected:** Optional — sketch interleaving vs. parallel execution, or explain why four CPU-bound threads are not faster.`,
    answer: `**Target Audience:** Python developers who have heard of threads and asyncio but mix up the two words — no prior concurrency knowledge needed.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13 (standard GIL builds); the in-page example runs on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

Picture a small cafe with **one barista**. Three customers order: an espresso, a tea, and a pour-over. The barista starts the espresso machine, and while it pulls the shot she puts the kettle on, and while the kettle heats she grinds beans for the pour-over. At no moment is she doing two things with her hands — but all three orders are *in progress* at once and finish far sooner than if she had stood watching the espresso machine. That is **concurrency**: juggling several tasks by switching between them, especially while some of them are waiting.

Now the cafe hires **three baristas**, each making one drink with their own hands, at the same moment. That is **parallelism**: several pieces of work literally happening at the same instant.

The difference matters because the two help with different problems. If the drinks are mostly *waiting* (machines heating, water dripping), one clever barista is enough. If every drink needs constant hand work (latte art, say), one barista cannot go faster by switching — you need more hands. In Python the choice between \`asyncio\`, \`threading\` and \`multiprocessing\` is exactly this choice, and the Global Interpreter Lock makes it sharper than in most languages.

## 2. The Two Definitions

📌 **Interview term: Concurrency** — a program has several tasks *in progress* during the same period of time. Their steps can interleave on a single CPU core; what matters is that the program is *structured* so that one task does not have to finish before the next can start.

📌 **Interview term: Parallelism** — several computations *execute at the same instant*, which needs more than one execution unit (CPU cores, or separate machines).

The best one-line version comes from Rob Pike's talk ["Concurrency is not Parallelism"](https://go.dev/talks/2012/waza.slide) (Heroku Waza, 2012): *concurrency is about dealing with lots of things at once; parallelism is about doing lots of things at once.* Concurrency is a property of how the program is **structured**; parallelism is a property of how it is **executed**.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Concurrency on one core: blocks of task A and task B alternate on a single timeline">
  <text class="d-text" x="20" y="36">Concurrency: one core, tasks take turns</text>
  <text class="d-sub" x="20" y="104">core 1</text>
  <rect class="d-box-accent" x="100" y="80" width="90" height="40" rx="6"/>
  <text class="d-text" x="145" y="105" text-anchor="middle">A</text>
  <rect class="d-box" x="200" y="80" width="90" height="40" rx="6"/>
  <text class="d-text" x="245" y="105" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="300" y="80" width="90" height="40" rx="6"/>
  <text class="d-text" x="345" y="105" text-anchor="middle">A</text>
  <rect class="d-box" x="400" y="80" width="90" height="40" rx="6"/>
  <text class="d-text" x="445" y="105" text-anchor="middle">B</text>
  <rect class="d-box-accent" x="500" y="80" width="90" height="40" rx="6"/>
  <text class="d-text" x="545" y="105" text-anchor="middle">A</text>
  <defs>
    <marker id="py25-cp-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 100 170 L 640 170" marker-end="url(#py25-cp-ar)"/>
  <text class="d-sub" x="600" y="200">time</text>
</svg>

Both tasks are in progress for the whole period, but at any single instant only one of them is running.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Parallelism on two cores: task A and task B run on separate timelines at the same time">
  <text class="d-text" x="20" y="36">Parallelism: two cores, both run at once</text>
  <text class="d-sub" x="20" y="104">core 1</text>
  <rect class="d-box-accent" x="100" y="80" width="490" height="40" rx="6"/>
  <text class="d-text" x="345" y="105" text-anchor="middle">A</text>
  <text class="d-sub" x="20" y="174">core 2</text>
  <rect class="d-box" x="100" y="150" width="490" height="40" rx="6"/>
  <text class="d-text" x="345" y="175" text-anchor="middle">B</text>
  <defs>
    <marker id="py25-cp-ar2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 100 225 L 640 225" marker-end="url(#py25-cp-ar2)"/>
  <text class="d-sub" x="600" y="252">time</text>
</svg>

Here both tasks make progress at the same instant, so the same total work finishes in about half the wall-clock time.

Two consequences people often get wrong:

- **Parallel implies concurrent, not the other way round.** If A and B run at the same instant, both are in progress at once. But A and B interleaving on one core are concurrent and *not* parallel.
- **Concurrency does not make computation faster.** Switching between two CPU-heavy tasks on one core still needs the same total CPU time — plus the cost of switching. It only wins when tasks spend time **waiting**.

📌 **Interview term: I/O-bound** — a task whose time is mostly spent waiting for something outside the CPU: a network reply, a disk read, a database. Concurrency helps because one task's wait can overlap another's work.

📌 **Interview term: CPU-bound** — a task whose time is mostly spent computing (parsing, compressing, number crunching). Only parallelism makes it finish sooner.

## 3. Concurrency You Can Run in This Page

Example 1 builds concurrency from scratch, with no threads at all. Each "download" is a generator: \`yield\` means "I am waiting now, someone else can run". A tiny scheduler keeps a queue of ready tasks and runs each one up to its next \`yield\`:

~~~python
def run_round_robin(tasks):
    ready = deque(tasks)
    while ready:
        task = ready.popleft()
        try:
            next(task)          # run the task until its next yield
            ready.append(task)  # not finished: back of the queue
        except StopIteration:
            pass                # finished: drop it
~~~

The run shows A and B interleaving while \`threading.active_count()\` is \`1\` — one thread, two tasks in progress:

~~~text
Concurrent (interleaved) on one thread:
  A: chunk 1/3
  B: chunk 1/2
  A: chunk 2/3
  B: chunk 2/2
  A: chunk 3/3
~~~

This is, in miniature, what \`asyncio\`'s event loop does: coroutines pause at \`await\`, and the loop resumes whichever one is ready. (Generators and coroutines are close relatives — see [the difference between a generator and a coroutine](/interview-question/what-is-the-difference-between-a-generator-and-a-coroutine), and for the real scheduler [how the asyncio event loop schedules coroutines](/interview-question/how-does-the-asyncio-event-loop-schedule-coroutines).)

The last part of example 1 is an idealised cost model — each chunk is 1 tick of CPU plus 4 ticks of waiting. Interleaving cuts the I/O-heavy job from 30 ticks to 10, because the waits overlap. For a pure-CPU job it changes nothing: 30 ticks either way. That is the whole argument of this doc in four numbers.

📌 **Interview term: Cooperative multitasking** — tasks give up control voluntarily (at a \`yield\` or \`await\`). Nothing interrupts a task that never yields.

📌 **Interview term: Preemptive multitasking** — the operating system (or the interpreter) can pause a running task at almost any point and switch to another. OS threads are preemptive.

## 4. Where the GIL Comes In

In most languages, threads are the standard way to get both concurrency and parallelism. In standard CPython there is a catch.

📌 **Interview term: GIL (Global Interpreter Lock)** — a lock inside CPython that a thread must hold to run Python bytecode. Only one thread per process holds it at a time. Full details are on [the GIL page](/interview-question/what-is-the-global-interpreter-lock-gil).

So, on a normal CPython build:

| Tool | Concurrency? | Parallel Python bytecode? | How it switches |
| :--- | :--- | :--- | :--- |
| \`asyncio\` | Yes | No — one thread | Cooperative, only at \`await\` |
| \`threading\` | Yes | No — the GIL lets one thread run Python at a time | Preemptive; the GIL is handed over at least every \`sys.getswitchinterval()\` (0.005 s on our run) and on blocking calls |
| \`multiprocessing\`, \`ProcessPoolExecutor\` | Yes | **Yes** — each process has its own interpreter and its own GIL | The OS schedules processes on cores |
| Threads on the free-threaded build | Yes | **Yes** | OS-scheduled, no GIL |

Threads are not useless under the GIL. A thread that calls \`time.sleep\`, reads a socket or a file, or runs a C extension that releases the GIL, gives up the interpreter while it waits, so other threads run. That is why threads are fine for I/O-bound work. Example 2 shows it with real threads (it needs OS threads, so it is shown as code and was verified on CPython 3.12):

~~~text
I/O: 4 waits of 0.2 s overlapped: True
CPU threads: distinct PIDs: 1
CPU processes ran outside this process: True
~~~

Four 0.2-second sleeps in four threads finished in well under 0.6 seconds — the waits overlapped. The CPU-bound threads all ran inside one process (one PID); the CPU-bound pool work ran in separate worker processes.

How much faster is it? Timing depends on the machine, so it is not part of the example output. On our 4-core run with \`python3.12\`, four calls counting down from 5,000,000 took about **0.4–0.45 s sequentially, 0.5 s in 4 threads, and 0.16–0.24 s in a 4-process pool**. The threads were no faster than the loop (slightly slower, from switching); the processes were 2–3x faster, and the gap would grow with more work per task, since process start-up is a fixed cost.

## 5. Parallelism Has a Price

Processes do not share memory. To give a worker its input and get its result back, Python **pickles** (serialises) the objects and sends the bytes through a pipe — see [how multiprocessing shares data between processes](/interview-question/how-does-multiprocessing-share-data-between-processes) and [what pickling is](/interview-question/what-is-pickling-and-what-are-its-risks). Each process also has its own interpreter start-up and its own copy of every module. So:

- Parallelism pays off when each task does a lot of computing per byte sent.
- Ten thousand tiny tasks can be slower in a process pool than in a plain loop.

📌 **Interview term: Overhead (serialisation and start-up)** — the fixed cost of moving work to another process: starting it, pickling arguments, unpickling results. It is the reason "just use multiprocessing" is not free.

## 6. The Free-Threaded Build

[PEP 703](https://peps.python.org/pep-0703/) was accepted as an explicitly **experimental** feature for Python 3.13: a separate build, often installed as \`python3.13t\`, with the GIL disabled. [PEP 779](https://peps.python.org/pep-0779/) then made the free-threaded build **officially supported but still optional** in Python 3.14. On that build, threads can run Python bytecode in parallel, which blurs the line drawn in section 4. Its trade-offs are on [the free-threaded build page](/interview-question/what-is-python-3-12-s-free-threaded-no-gil-build-and-what-changes) (the question title says 3.12; the build first shipped with 3.13). We did not have a free-threaded interpreter in our sandbox, so nothing on this page was measured on it; example 2 prints \`GIL enabled: True\` on our standard 3.12 build.

## 7. Verified: Running the Code

Example 1 was run with \`python3.11\` and through the page Pyodide 0.25.1 harness, with identical output; it also matched on 3.12 and 3.13. Example 2 needs real threads and processes, so it is shown as code; it was run on CPython 3.12 (and also on 3.11 and 3.13, with the same output).

**Example 1 — concurrency on one thread:**

~~~text
Concurrent (interleaved) on one thread:
  A: chunk 1/3
  B: chunk 1/2
  A: chunk 2/3
  B: chunk 2/2
  A: chunk 3/3
steps run: 5
1
Sequential:
  A: chunk 1/3
  A: chunk 2/3
  A: chunk 3/3
  B: chunk 1/2
  B: chunk 2/2
sequential ticks: 30
interleaved ticks (best case): 10
pure CPU, interleaved: 30
pure CPU, sequential: 30
~~~

**Example 2 — real threads vs real processes (CPython 3.12):**

~~~text
GIL enabled: True
switch interval (s): 0.005
I/O: 4 waits of 0.2 s overlapped: True
I/O: distinct thread ids: 4
CPU threads: distinct PIDs: 1
CPU threads ran in this process: True
CPU processes ran outside this process: True
CPU processes: at least 2 worker PIDs used: True
~~~

## 8. Side by Side

| | Concurrency | Parallelism |
| :--- | :--- | :--- |
| Core idea | Many tasks in progress, taking turns | Many tasks executing at the same instant |
| Needs multiple cores? | No | Yes |
| Helps | I/O-bound work (waiting) | CPU-bound work (computing) |
| Python tools | \`asyncio\`, \`threading\`, \`ThreadPoolExecutor\` | \`multiprocessing\`, \`ProcessPoolExecutor\`; threads on the free-threaded build; C extensions that release the GIL |
| Main hazard | Interleaving bugs: [race conditions](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it), [deadlocks](/interview-question/what-is-a-deadlock-in-python) | The same, plus serialisation cost and no shared memory between processes |

Choosing between the three tools for a real workload is its own question: [when to use threading, multiprocessing, or asyncio](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio).

## 9. Common Pitfalls

- **"Threads make my code faster."** Only if the threads spend their time waiting or inside GIL-releasing C code. Pure-Python CPU loops in threads are no faster than a loop on the standard build.
- **Treating concurrency as a speed feature for computation.** Interleaving two CPU-heavy tasks takes at least as long as running them back to back; concurrency buys responsiveness and overlapped waits, not more CPU.
- **Assuming one core means no race conditions.** Concurrency on a single core still interleaves steps, so shared data can still be corrupted — the GIL does not protect your read-modify-write.
- **Sending tiny tasks to processes.** The pickling and start-up overhead can exceed the work; batch the work (bigger chunks, \`chunksize=\`) or stay single-process.
- **Blocking inside asyncio.** asyncio's concurrency is cooperative: one \`time.sleep()\` or CPU loop in a coroutine stalls every task on the loop.
- **Calling the free-threaded build the default.** It is a separate, optional build; a plain \`python3.13\` or \`python3.14\` still has the GIL.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definitions:</strong> <span style="color:#f0e2c8;">Concurrency means several tasks are <strong style="color:#ffca28;">in progress</strong> during the same period and take turns; parallelism means several tasks <strong style="color:#ffca28;">execute at the same instant</strong> on different cores. Rob Pike: dealing with lots of things at once vs doing lots of things at once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The relationship:</strong> <span style="color:#f0e2c8;">Parallelism needs multiple cores, concurrency does not. Parallel work is always concurrent; concurrent work on one core is not parallel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Python tools:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio</code>: concurrency on one thread. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading</code>: concurrency; with the GIL, only one thread runs Python bytecode at a time. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiprocessing</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ProcessPoolExecutor</code>: parallelism, one interpreter and one GIL per process.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it matters:</strong> <span style="color:#f0e2c8;">Waiting (network, disk) is helped by concurrency because waits overlap. Computing needs parallelism: four CPU-bound threads on the GIL build take about as long as running the work sequentially.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Version note:</strong> <span style="color:#f0e2c8;">The free-threaded build (PEP 703, experimental in 3.13, officially supported but optional in 3.14) removes the GIL, so threads can run Python in parallel.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you have concurrency without parallelism?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, it is the normal case for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio</code>: one thread, one core, many tasks interleaving at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> points. Our toy scheduler in example 1 does it with generators and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading.active_count()</code> is 1.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you have parallelism without concurrency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the strict sense almost never in application code, since running two tasks at once means both are in progress at once. At the hardware level, SIMD instructions run one operation on many data items in parallel inside a single task, which is the usual counter-example.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do Python threads ever run in parallel?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, outside the interpreter: while a thread is in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time.sleep</code>, a socket read, file I/O, or a C extension such as NumPy or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashlib</code> that releases the GIL, other threads run. And on the free-threaded build, Python code itself runs in parallel.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are four CPU-bound threads not 4x faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With the GIL, one thread holds the interpreter at a time and the others wait; CPython asks the running thread to drop it every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.getswitchinterval()</code> seconds (0.005 by default). On our 4-core run, 4 threads took about as long as sequential code, while 4 processes were 2-3x faster.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does parallelism cost in Python?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Processes do not share memory, so arguments and results are pickled and copied between them, and each process has its own interpreter start-up and memory. Small tasks can be slower in a pool than in a loop.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Concurrency** | Several tasks in progress during the same period; their steps can interleave |
| **Parallelism** | Several computations executing at the same instant on separate cores |
| **I/O-bound** | Time mostly spent waiting on the network, disk or another service |
| **CPU-bound** | Time mostly spent computing |
| **Cooperative multitasking** | Tasks hand over control themselves, at \`yield\` or \`await\` |
| **Preemptive multitasking** | The OS or interpreter can switch tasks at almost any point |
| **GIL** | CPython lock that lets one thread at a time run Python bytecode in a process |
| **Overhead** | Fixed cost of starting workers and pickling data between processes |

---
**Conclusion:** Concurrency is a way of structuring a program so many tasks can be in progress and take turns; parallelism is actually executing several of them at the same instant on several cores. Python offers concurrency through \`asyncio\` (one thread, switching at \`await\`) and \`threading\` (OS threads, but on the standard build only one runs Python bytecode at a time because of the GIL), and parallelism through processes — or through threads on the optional free-threaded build. Match the tool to the workload: overlap the waits with concurrency, and spread the computing over cores with parallelism.`,
    examples: [
      {
        label: `Concurrency on one thread: a round-robin scheduler of generators`,
        code: `# Concurrency on ONE thread: two tasks take turns.
# Each task is a generator; "yield" means "I am waiting, let someone else run".
import threading
from collections import deque

def download(name, chunks):
    for i in range(1, chunks + 1):
        print(f"  {name}: chunk {i}/{chunks}")
        yield  # pretend we now wait for the network

def run_round_robin(tasks):
    ready = deque(tasks)
    steps = 0
    while ready:
        task = ready.popleft()
        try:
            next(task)          # run the task until its next yield
            steps += 1
            ready.append(task)  # not finished: back of the queue
        except StopIteration:
            pass                # finished: drop it
    return steps

print("Concurrent (interleaved) on one thread:")
steps = run_round_robin([download("A", 3), download("B", 2)])
print("steps run:", steps)
print(threading.active_count())  # 1

# Sequential: B cannot start until A has finished
print("Sequential:")
for task in [download("A", 3), download("B", 2)]:
    for _ in task:
        pass

# Concurrency helps waiting, not computing.
# Model: each chunk = 1 tick of CPU + 4 ticks of waiting.
def finish_time(n_tasks, chunks, cpu, wait, overlap_waits):
    if not overlap_waits:
        return n_tasks * chunks * (cpu + wait)
    # waits overlap; only CPU ticks still happen one at a time
    return n_tasks * chunks * cpu + wait

print("sequential ticks:", finish_time(2, 3, cpu=1, wait=4, overlap_waits=False))
print("interleaved ticks (best case):", finish_time(2, 3, cpu=1, wait=4, overlap_waits=True))
print("pure CPU, interleaved:", finish_time(2, 3, cpu=5, wait=0, overlap_waits=True))
print("pure CPU, sequential:", finish_time(2, 3, cpu=5, wait=0, overlap_waits=False))
`,
      },
      {
        label: `Real threads vs real processes on CPython (OS threads, not in the browser)`,
        code: `# Real threads vs real processes on CPython with the GIL.
# Not runnable in the browser: needs OS threads and processes.
import os
import sys
import threading
import time
from multiprocessing import Pool

def count_down(n):
    while n > 0:
        n -= 1
    return os.getpid()

def wait_io(_):
    time.sleep(0.2)  # a blocking call that releases the GIL
    return threading.get_ident()

def run_threads(target, arg, n):
    results = []
    def worker():
        results.append(target(arg))
    threads = [threading.Thread(target=worker) for _ in range(n)]
    start = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results, time.perf_counter() - start

if __name__ == "__main__":
    print("GIL enabled:", getattr(sys, "_is_gil_enabled", lambda: True)())
    print("switch interval (s):", sys.getswitchinterval())

    # 1. I/O-bound: 4 threads that each wait 0.2 s
    idents, took = run_threads(wait_io, None, 4)
    print("I/O: 4 waits of 0.2 s overlapped:", took < 0.6)
    print("I/O: distinct thread ids:", len(set(idents)))

    # 2. CPU-bound in threads: one process, the GIL lets one thread run at a time
    pids, _ = run_threads(count_down, 2_000_000, 4)
    print("CPU threads: distinct PIDs:", len(set(pids)))
    print("CPU threads ran in this process:", set(pids) == {os.getpid()})

    # 3. CPU-bound in processes: each has its own interpreter and its own GIL
    with Pool(4) as pool:
        pids = pool.map(count_down, [2_000_000] * 4, chunksize=1)
    print("CPU processes ran outside this process:", os.getpid() not in pids)
    print("CPU processes: at least 2 worker PIDs used:", len(set(pids)) >= 2)
`,
        runnable: false,
        python: "3.12",
      },
    ],
  },
  {
    title: `When do you use threading, multiprocessing, or asyncio?`,
    difficulty: "medium",
    seoDescription: `Choosing threading, multiprocessing or asyncio in Python: I/O-bound vs CPU-bound work, the GIL, how many tasks, library support and mixing them.`,
    description: `**Question presented to candidate:**
"You have a Python service that needs to do a lot of work at once. How do you decide between threading, multiprocessing and asyncio? Give me the rule, and then the cases where the rule is not enough."

**What a strong answer should cover:**
- First classify the work: I/O-bound (waiting) vs CPU-bound (computing). On a standard CPython build the GIL lets only one thread run Python bytecode at a time.
- CPU-bound pure Python: processes (\`multiprocessing\`, \`ProcessPoolExecutor\`), each with its own interpreter and GIL; mind pickling cost and start-up time.
- I/O-bound with blocking libraries or a modest number of tasks: threads (\`ThreadPoolExecutor\`); blocking calls release the GIL.
- I/O-bound with very many concurrent connections and async-capable libraries: \`asyncio\` — one thread, cooperative switching at \`await\`, cheap tasks; but one blocking call stalls the whole loop.
- They combine: \`asyncio.to_thread\` / \`run_in_executor\` push blocking or CPU work off the loop; C extensions that release the GIL (NumPy, hashlib, compression) can make threads useful for CPU work.
- Version note: the free-threaded build (experimental in 3.13, supported but optional in 3.14) makes threads a candidate for CPU-bound work too.

**Clarifying questions expected:**
- Is the work mostly waiting on the network or disk, or mostly computing?
- How many tasks at once — tens, or tens of thousands of connections?
- Are the libraries involved blocking (requests, most DB drivers) or async-native?

**Code / implementation expected:** Optional — a short sketch with \`ThreadPoolExecutor\`, \`ProcessPoolExecutor\` or \`asyncio.gather\`, or a decision table.`,
    answer: `**Target Audience:** Developers who know the words thread, process and async but want a reliable way to pick one — no prior concurrency experience needed.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13 (standard GIL builds); the in-page example runs on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

Think of three ways to run a restaurant kitchen with a lot of orders.

- **Threads** are several cooks sharing *one* stove with a single knob that only one cook may touch at a time. While a pot simmers, a cook steps back and another takes the knob. Great when most of the time is simmering (waiting); useless when everyone needs to chop at full speed on the same counter.
- **Processes** are several separate kitchens, each with its own stove. Truly parallel — but you have to carry ingredients between kitchens (copying data) and each kitchen costs rent (memory, start-up).
- **asyncio** is one very organised cook with a hundred timers. She starts a pot, sets a timer, starts the next, and only goes back to a pot when its timer rings. Amazing for many slow-simmering dishes — but if she stops to knead dough for ten minutes, every timer rings unanswered.

Picking the wrong kitchen is a classic production mistake: a CPU-heavy report generator on threads that never gets faster, or a \`time.sleep\` inside an async web server that freezes every request. Interviewers ask this question to see whether you reason from the workload, not from habit.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the work waiting (network, disk, database) or computing? | The single biggest decision: concurrency helps waiting, only parallelism helps computing |
| How many tasks at the same time? | Ten blocking calls fit a thread pool; ten thousand open sockets fit asyncio |
| Are the libraries blocking or async-native? | asyncio only helps when every slow call can be awaited |
| How much data moves per task? | Processes copy (pickle) inputs and outputs; big data per small task kills the gain |
| Which Python build and version? | A free-threaded 3.13t/3.14t build lets threads run Python in parallel |
| Do tasks share mutable state? | Threads share memory (needs locks); processes do not (needs explicit sharing) |

## 3. The Three Tools in One Sentence Each

📌 **Interview term: \`threading\`** — runs functions in OS threads inside one process. Threads share memory. On the standard build the [GIL](/interview-question/what-is-the-global-interpreter-lock-gil) lets one thread run Python bytecode at a time, but a thread blocked in I/O releases it.

📌 **Interview term: \`multiprocessing\`** — runs functions in separate OS processes, each with its own interpreter, memory and GIL, so CPU work runs in parallel. Data moves between them by pickling (see [how multiprocessing shares data](/interview-question/how-does-multiprocessing-share-data-between-processes)).

📌 **Interview term: \`asyncio\`** — runs many coroutines on one thread with an event loop. A coroutine pauses at \`await\`, the loop runs another one that is ready. Switching is cooperative. How the syntax works is on [how async/await works](/interview-question/how-does-async-await-work-in-python).

All three are concurrency; only processes (and threads on the free-threaded build) give parallel Python execution — the distinction is explained in [concurrency vs parallelism](/interview-question/what-is-the-difference-between-concurrency-and-parallelism-in-python).

## 4. The Decision Flow

<svg class="iq-diagram" width="100%" viewBox="0 0 720 340" role="img" aria-label="Decision flow: CPU-bound work goes to processes; I/O-bound work goes to asyncio when there are many connections and async libraries, otherwise to threads">
  <defs>
    <marker id="py25-dec-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="60" rx="10"/>
  <text class="d-text" x="360" y="48" text-anchor="middle">What is the task doing?</text>
  <text class="d-sub" x="360" y="68" text-anchor="middle">mostly waiting or computing</text>
  <path class="d-edge" d="M 300 84 L 160 150" marker-end="url(#py25-dec-ar)"/>
  <path class="d-edge" d="M 420 84 L 560 150" marker-end="url(#py25-dec-ar)"/>
  <rect class="d-box" x="60" y="154" width="200" height="60" rx="10"/>
  <text class="d-text" x="160" y="182" text-anchor="middle">Computing</text>
  <text class="d-sub" x="160" y="202" text-anchor="middle">CPU-bound</text>
  <rect class="d-box" x="460" y="154" width="200" height="60" rx="10"/>
  <text class="d-text" x="560" y="182" text-anchor="middle">Waiting</text>
  <text class="d-sub" x="560" y="202" text-anchor="middle">I/O-bound</text>
  <path class="d-edge" d="M 160 218 L 160 260" marker-end="url(#py25-dec-ar)"/>
  <rect class="d-box-accent" x="40" y="264" width="240" height="56" rx="10"/>
  <text class="d-text" x="160" y="290" text-anchor="middle">Processes</text>
  <text class="d-sub" x="160" y="310" text-anchor="middle">ProcessPoolExecutor</text>
  <path class="d-edge" d="M 520 218 L 440 260" marker-end="url(#py25-dec-ar)"/>
  <path class="d-edge" d="M 600 218 L 640 260" marker-end="url(#py25-dec-ar)"/>
  <rect class="d-box-accent" x="330" y="264" width="180" height="56" rx="10"/>
  <text class="d-text" x="420" y="290" text-anchor="middle">Threads</text>
  <text class="d-sub" x="420" y="310" text-anchor="middle">blocking libraries</text>
  <rect class="d-box-accent" x="540" y="264" width="170" height="56" rx="10"/>
  <text class="d-text" x="625" y="290" text-anchor="middle">asyncio</text>
  <text class="d-sub" x="625" y="310" text-anchor="middle">many connections</text>
</svg>

Start at the top: computing goes left to processes; waiting goes right, and then the number of concurrent tasks and the libraries you use decide between threads and asyncio.

The same thing as a table:

| Workload | Default choice | Why | Watch out for |
| :--- | :--- | :--- | :--- |
| CPU-bound pure Python (parsing, simulations, image loops) | \`ProcessPoolExecutor\` / \`multiprocessing\` | Separate interpreters run on separate cores | Pickling cost; picklable functions only; \`if __name__ == "__main__":\` |
| CPU-bound inside GIL-releasing C (NumPy, \`hashlib\`, \`zlib\`) | Threads can work | The C code runs without holding the GIL | Measure; not every C call releases the GIL |
| I/O-bound, tens of blocking calls (HTTP with \`requests\`, DB drivers, files) | \`ThreadPoolExecutor\` | Blocking calls release the GIL; no library changes | Shared state needs locks |
| I/O-bound, thousands of sockets, async libraries | \`asyncio\` | Tasks are cheap; one thread; explicit switch points | Any blocking call freezes the loop |
| A mix (async server that also hashes or resizes) | asyncio + executors | Loop for I/O, pool for blocking or CPU work | Choose the right pool for each job |
| Running another program | \`subprocess\` | It is another program, not Python code | See [running commands safely](/interview-question/how-do-you-run-external-commands-with-subprocess-safely) |

## 5. Why asyncio Wins at Scale — and How It Fails

Example 1 is a toy event loop with a **fake clock**, so the timings are exact and the example runs in this page. A task "awaits" by yielding how long it wants to sleep; the loop keeps a heap of (wake-up time, task) and always resumes the earliest:

~~~python
while queue:
    wake, tie, task = heapq.heappop(queue)
    clock = max(clock, wake)
    delay = next(task)                      # run until the next pause
    heapq.heappush(queue, (clock + delay, tie, task))
~~~

Three 1-second requests all start at \`t=0.0\` and all finish at \`t=1.0\` — the waits overlap:

~~~text
Three 1-second requests, cooperative:
t=0.0 A sends request
t=0.0 B sends request
t=0.0 C sends request
t=1.0 A got response
t=1.0 B got response
t=1.0 C got response
finished at t = 1.0
~~~

Now add one task that does 2 seconds of **blocking** work without yielding — the equivalent of \`time.sleep(2)\` or a CPU loop inside a coroutine:

~~~text
Same requests plus one blocking task:
t=0.0 A sends request
t=0.0 X starts 2 s of blocking work
t=2.0 X done
t=2.0 B sends request
t=2.0 A got response
t=3.0 B got response
finished at t = 3.0
~~~

B could not even *send* its request until \`t=2.0\`, and A's response, ready at \`t=1.0\`, was not handled until \`t=2.0\`. This is the core asyncio trade-off.

📌 **Interview term: Blocking the event loop** — running code inside a coroutine that does not \`await\` for a long time (synchronous I/O, \`time.sleep\`, heavy computation). Because switching is cooperative, every other task waits.

Example 2 shows the real thing on CPython 3.12: five \`await asyncio.sleep(0.2)\` calls overlap, five \`time.sleep(0.2)\` calls inside coroutines run one after another (over 1 second), and wrapping the blocking call in \`asyncio.to_thread\` makes them overlap again:

~~~text
asyncio, 5 awaits: [0, 1, 2, 3, 4] overlapped: True
asyncio, 5 time.sleep calls: [0, 1, 2, 3, 4] one after another: True
asyncio + to_thread: [0, 1, 2, 3, 4] overlapped: True
~~~

📌 **Interview term: Executor bridge** — handing a blocking or CPU-heavy function from async code to a pool: \`await asyncio.to_thread(func, ...)\` (a thread) or \`await loop.run_in_executor(pool, func, ...)\` (any \`concurrent.futures\` executor, including a process pool). The loop keeps running other tasks while it waits for the result.

## 6. Why Threads Are Still the Pragmatic Default for Blocking I/O

Threads need no new libraries. If your code uses \`requests\`, a synchronous database driver or plain file I/O, a \`ThreadPoolExecutor\` overlaps the waits without rewriting anything — example 2 runs five blocking 0.2 s calls in a 5-thread pool and they overlap (\`overlapped: True\`). The cost is that threads are **preemptive** and share memory, so any shared mutable state needs a lock (see [race conditions and locks](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it)), and each OS thread has its own stack, which is why tens of thousands of threads are not a good idea. How the pools work is covered in [ThreadPoolExecutor and ProcessPoolExecutor](/interview-question/how-do-threadpoolexecutor-and-processpoolexecutor-work).

## 7. Why Processes for CPU Work — and Their Costs

On a standard build, CPU-bound Python code in threads does not run faster: only one thread runs bytecode at a time. Processes each have their own GIL. The costs:

- Every argument and result is **pickled** and copied; the function must be importable by name (no lambdas).
- On Linux the default start method was \`fork\` up to Python 3.13 (our 3.12 run reports \`fork\`); Python 3.14 changed the POSIX default to \`forkserver\` ([multiprocessing docs](https://docs.python.org/3/library/multiprocessing.html)). With \`spawn\` and \`forkserver\`, workers re-import your main module, so the pool must be created under [\`if __name__ == "__main__":\`](/interview-question/what-does-if-name-main-do).
- Start-up time and memory for each worker.

Example 2 runs \`cpu_heavy\` in a process pool both directly and from inside asyncio through \`run_in_executor\`.

## 8. Where the Free-Threaded Build Fits

On the free-threaded build ([PEP 703](https://peps.python.org/pep-0703/); experimental in 3.13, officially supported but optional in 3.14 per [PEP 779](https://peps.python.org/pep-0779/)), threads can run Python bytecode in parallel. That makes threads a candidate for CPU-bound work without pickling — but third-party C extensions must support it, and the build accepts some single-threaded slowdown (PEP 779 asks for Steering Council discussion above about 15%). We did not measure a free-threaded interpreter here; the trade-off is discussed in [multiprocessing vs free-threaded threads](/interview-question/when-should-you-still-use-multiprocessing-vs-free-threaded-threads-in-python-3-1).

## 9. Verified: Running the Code

Example 1 was run with \`python3.11\` and through the page Pyodide 0.25.1 harness with identical output, and also matched on 3.12 and 3.13. Example 2 needs \`asyncio.run()\`, threads and processes; the in-browser runner cannot call \`asyncio.run()\` (the page itself already runs inside an event loop) or start threads, so it is shown as code and was run on CPython 3.12 (3.13 printed the same).

**Example 1 — toy event loop with a fake clock:**

~~~text
Three 1-second requests, cooperative:
t=0.0 A sends request
t=0.0 B sends request
t=0.0 C sends request
t=1.0 A got response
t=1.0 B got response
t=1.0 C got response
finished at t = 1.0

Same requests plus one blocking task:
t=0.0 A sends request
t=0.0 X starts 2 s of blocking work
t=2.0 X done
t=2.0 B sends request
t=2.0 A got response
t=3.0 B got response
finished at t = 3.0

asyncio
multiprocessing or ProcessPoolExecutor
~~~

**Example 2 — the three tools on CPython 3.12:**

~~~text
threads, 5 blocking calls: [0, 1, 2, 3, 4] overlapped: True
processes, CPU work: [285, 2470]
asyncio, 5 awaits: [0, 1, 2, 3, 4] overlapped: True
asyncio, 5 time.sleep calls: [0, 1, 2, 3, 4] one after another: True
asyncio + to_thread: [0, 1, 2, 3, 4] overlapped: True
asyncio + process pool: [285, 285]
~~~

The comparisons print \`True\`/\`False\` instead of seconds so the output is the same on every machine.

## 10. Common Pitfalls

- **Threads for CPU-bound pure Python.** They interleave on one GIL and finish no sooner than a plain loop. Use a process pool (or the free-threaded build, after measuring).
- **\`time.sleep\`, \`requests.get\` or a heavy loop inside a coroutine.** It blocks the event loop and every other task. Use \`await asyncio.sleep\`, an async client, or \`asyncio.to_thread\`.
- **Tiny tasks in a process pool.** Pickling and inter-process round trips can cost more than the work. Batch with larger chunks or \`chunksize=\`.
- **Unpicklable work for processes.** Lambdas, nested functions, open sockets and locks cannot be sent to a worker; define workers at module top level.
- **Forgetting the \`__main__\` guard.** Under \`spawn\` (Windows, macOS) and \`forkserver\` (POSIX default from 3.14), creating a pool at import time makes each worker try to start processes while it is still importing; on our 3.12 run with a \`spawn\` context this raised \`RuntimeError\` mentioning the bootstrapping phase.
- **Assuming asyncio means no races.** Tasks still interleave at every \`await\`; a read, an \`await\`, then a write can lose updates just like threads.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Classify first:</strong> <span style="color:#f0e2c8;">Is the work <strong style="color:#ffca28;">waiting</strong> (network, disk, database) or <strong style="color:#ffca28;">computing</strong>? On the standard CPython build the GIL lets one thread run Python bytecode at a time, so that question decides almost everything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. CPU-bound:</strong> <span style="color:#f0e2c8;">Use processes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ProcessPoolExecutor</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiprocessing</code>. Each worker has its own interpreter and GIL, so the work really runs in parallel; the price is pickling the data and starting the processes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. I/O-bound, blocking libraries:</strong> <span style="color:#f0e2c8;">Use threads, usually a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ThreadPoolExecutor</code>. Blocking calls release the GIL, so the waits overlap, and libraries like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requests</code> work unchanged.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. I/O-bound, many connections:</strong> <span style="color:#f0e2c8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio</code> when you have thousands of concurrent waits and async libraries. One thread, tasks switch only at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, so tasks are cheap and races are rarer — but one blocking call freezes every task.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Mixing:</strong> <span style="color:#f0e2c8;">Inside asyncio, push blocking calls to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.to_thread</code> and CPU work to a process pool with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loop.run_in_executor</code>. And remember the free-threaded build (3.13 experimental, 3.14 supported) changes the CPU-bound answer for threads.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not always use asyncio for I/O?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only helps if the whole call chain is async. A blocking library call inside a coroutine stops the loop, and many libraries (most DB drivers, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requests</code>) are blocking. For a handful of calls, a thread pool is simpler and just as fast.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not always use threads instead of asyncio?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each OS thread has its own stack and is scheduled by the OS; preemptive switching means shared state needs locks. Tens of thousands of mostly idle connections are cheaper as asyncio tasks, and switch points are explicit at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When can threads speed up CPU work on a GIL build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the hot loop is in C code that releases the GIL: NumPy operations, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hashlib</code> on large inputs, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">zlib</code> compression. Then threads run in parallel outside the interpreter.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong with multiprocessing in practice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Arguments, results and the function itself must be picklable; lambdas and local functions fail. Workers re-import the main module under spawn and forkserver, so the entry point needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if __name__ == "__main__":</code>. Large data is copied, not shared.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you combine asyncio with CPU-heavy work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep the event loop for I/O and offload: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await loop.run_in_executor(process_pool, func, arg)</code> returns a future the loop can await. Example 2 does exactly this and the loop stays free.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`threading\`** | OS threads in one process, shared memory; one runs Python bytecode at a time on a GIL build |
| **\`multiprocessing\`** | Separate processes with their own interpreter and GIL; data is pickled between them |
| **\`asyncio\`** | One thread, an event loop, coroutines that switch at \`await\` |
| **Blocking the event loop** | A coroutine doing long work without awaiting, stalling every other task |
| **Executor bridge** | \`asyncio.to_thread\` / \`run_in_executor\`: run blocking or CPU work in a pool from async code |

---
**Conclusion:** Decide from the workload, not from fashion. CPU-bound pure Python on a standard build goes to processes, because only separate interpreters run bytecode in parallel. I/O-bound work goes to threads when the libraries are blocking and the task count is modest, and to asyncio when there are very many concurrent waits and the libraries are async-native — remembering that a single blocking call freezes the loop. Real systems mix them: an asyncio server that hands blocking calls to \`asyncio.to_thread\` and heavy computation to a process pool, and on a free-threaded build, threads become an option for computing too.`,
    examples: [
      {
        label: `A toy event loop with a fake clock: why awaits overlap and blocking calls hurt`,
        code: `# A toy event loop with a FAKE clock, so the output is exact.
# It mimics what asyncio does: one thread, tasks pause at "await" points.
import heapq

clock = 0.0

def sleep(seconds):
    # like "await asyncio.sleep(seconds)": hand control back to the loop
    yield seconds

def blocking_work(seconds):
    # like time.sleep() or a CPU loop inside async code: never yields
    global clock
    clock += seconds

def run(tasks):
    global clock
    clock = 0.0
    queue = [(0.0, i, t) for i, t in enumerate(tasks)]  # (wake_time, tie, task)
    heapq.heapify(queue)
    while queue:
        wake, tie, task = heapq.heappop(queue)
        clock = max(clock, wake)
        try:
            delay = next(task)                      # run until the next pause
            heapq.heappush(queue, (clock + delay, tie, task))
        except StopIteration:
            pass
    return clock

def fetch(name, seconds):
    print(f"t={clock:.1f} {name} sends request")
    yield from sleep(seconds)                       # waiting on the network
    print(f"t={clock:.1f} {name} got response")

print("Three 1-second requests, cooperative:")
total = run([fetch("A", 1), fetch("B", 1), fetch("C", 1)])
print("finished at t =", total)

def greedy(name):
    print(f"t={clock:.1f} {name} starts 2 s of blocking work")
    blocking_work(2)                                # no yield: the loop is stuck
    print(f"t={clock:.1f} {name} done")
    yield from sleep(0)

print()
print("Same requests plus one blocking task:")
total = run([fetch("A", 1), greedy("X"), fetch("B", 1)])
print("finished at t =", total)

# Rule of thumb as data: which tool fits which workload (CPython with the GIL)
choice = {
    ("io", "few"): "threading or ThreadPoolExecutor",
    ("io", "thousands"): "asyncio",
    ("cpu", "any"): "multiprocessing or ProcessPoolExecutor",
}
print()
print(choice[("io", "thousands")])  # asyncio
print(choice[("cpu", "any")])  # multiprocessing or ProcessPoolExecutor
`,
      },
      {
        label: `The three tools on real CPython: threads, processes, asyncio and the bridges (not in the browser)`,
        code: `# The three tools side by side on real CPython.
# Not runnable in the browser: asyncio.run, threads and processes.
import asyncio
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

def blocking_io(i):
    time.sleep(0.2)          # stands in for requests.get(), a DB driver call...
    return i

def cpu_heavy(n):
    return sum(i * i for i in range(n))

async def nice_io(i):
    await asyncio.sleep(0.2)  # stands in for an async HTTP or DB call
    return i

async def bad_io(i):
    time.sleep(0.2)          # BLOCKS the event loop thread
    return i


async def main():
    loop = asyncio.get_running_loop()

    async def gather(coro_fn):
        return await asyncio.gather(*(coro_fn(i) for i in range(5)))

    start = time.perf_counter()
    res = await gather(nice_io)
    print("asyncio, 5 awaits:", res, "overlapped:", time.perf_counter() - start < 0.5)

    start = time.perf_counter()
    res = await gather(bad_io)
    print("asyncio, 5 time.sleep calls:", res, "one after another:", time.perf_counter() - start >= 1.0)

    # Bridge: push the blocking call to a worker thread
    start = time.perf_counter()
    res = await asyncio.gather(*(asyncio.to_thread(blocking_io, i) for i in range(5)))
    print("asyncio + to_thread:", res, "overlapped:", time.perf_counter() - start < 0.5)

    # Bridge: push CPU work to a process pool
    with ProcessPoolExecutor(2) as pool:
        res = await asyncio.gather(*(loop.run_in_executor(pool, cpu_heavy, 10) for _ in range(2)))
    print("asyncio + process pool:", res)

if __name__ == "__main__":
    start = time.perf_counter()
    with ThreadPoolExecutor(5) as pool:
        res = list(pool.map(blocking_io, range(5)))
    print("threads, 5 blocking calls:", res, "overlapped:", time.perf_counter() - start < 0.5)
    with ProcessPoolExecutor(2) as pool:
        print("processes, CPU work:", list(pool.map(cpu_heavy, [10, 20])))
    asyncio.run(main())
`,
        runnable: false,
        python: "3.12",
      },
    ],
  },
  {
    title: `What is a race condition and how do locks prevent it?`,
    difficulty: "medium",
    seoDescription: `Race conditions in Python explained: why counter += 1 is not atomic even with the GIL, lost updates, check-then-act, and how threading.Lock fixes them.`,
    description: `**Question presented to candidate:**
"What is a race condition? Show me one in Python — and explain why the GIL does not save you, and how a lock fixes it."

**What a strong answer should cover:**
- A race condition: the result depends on the timing or interleaving of concurrent tasks that share state; classic forms are lost updates (read-modify-write) and check-then-act.
- \`counter += 1\` is several bytecode steps (load, add, store); a thread switch between the load and the store loses an update. The GIL makes single bytecodes safe for the interpreter, not your multi-step operation.
- A lock (\`threading.Lock\`) makes a critical section mutually exclusive: only one thread at a time runs it, so read-modify-write becomes indivisible to other threads that use the same lock.
- Use \`with lock:\` so the lock is released even on exceptions; keep critical sections small; every access to the shared data must use the same lock.
- Races are timing-dependent and can hide: a tiny \`+= 1\` loop may lose nothing on a given CPython version, yet it is still wrong, and the free-threaded build removes the GIL entirely.
- Alternatives: avoid sharing (queues, message passing, per-thread results), \`queue.Queue\`, immutable data; asyncio has races too, at \`await\` points.

**Code / implementation expected:** Yes — a shared counter or bank balance that loses updates without a lock and is correct with one.`,
    answer: `**Target Audience:** Developers starting with threads who want to understand why shared data goes wrong — no prior concurrency knowledge needed.
**Difficulty:** Medium
**Python version:** Bytecode and behaviour checked on CPython 3.11, 3.12 and 3.13 (standard GIL builds); the in-page example runs on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

Two flatmates share a whiteboard on the fridge that says how much milk money is in the jar: **10**. Alice puts in 5, and on her way past she reads the board — 10 — and walks off to find a marker. Meanwhile Bob puts in 5, reads the board — still 10 — and writes **15**. Alice comes back with her marker and writes what she worked out: **15**. Ten pounds went into the jar, the board says five. Nobody did anything wrong in isolation; the bug is in the *timing*: both read the old value before either wrote the new one.

That is a race condition. It is one of the most expensive bugs in software because it does not happen every time — it depends on who happens to be faster — so it passes tests, then corrupts a balance in production once a week. Interviewers love it because it tests whether you understand that a line of Python is not a single step.

## 2. The Definition

📌 **Interview term: Race condition** — a bug where the outcome depends on the relative timing or interleaving of concurrent tasks that access shared state, and at least one of them writes.

📌 **Interview term: Shared mutable state** — data that more than one thread (or task) can see *and* change: a global counter, an object attribute, a dict used as a cache.

Two shapes cover most races you will meet:

- **Read-modify-write (lost update):** read a value, compute a new one, write it back. Another task writes in between, and its write is overwritten. The flatmates' whiteboard; \`balance += amount\`.
- **Check-then-act:** check a condition, then act on it, assuming it is still true. Two threads both see "not in cache" and both do the expensive work; two threads both see "seat free" and both book it.

## 3. Why \`counter += 1\` Is Not One Step

It reads like one action. The bytecode says otherwise. Example 1 asks the \`dis\` module what CPython 3.11 compiles \`counter += 1\` to (3.12 and 3.13 printed the same four instructions):

~~~text
counter += 1 compiles to:
   LOAD_GLOBAL counter
   LOAD_CONST 1
   BINARY_OP +=
   STORE_GLOBAL counter
~~~

📌 **Interview term: Atomic operation** — an operation that other threads see either not done at all or completely done, never half-way. \`counter += 1\` is **not** atomic: there is a gap between \`LOAD_GLOBAL\` (read) and \`STORE_GLOBAL\` (write).

<svg class="iq-diagram" width="100%" viewBox="0 0 720 360" role="img" aria-label="Lost update timeline: T1 reads 0, T2 reads 0, T1 writes 1, T2 writes 1, so one increment is lost">
  <defs>
    <marker id="py25-race-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="120" y="34" text-anchor="middle">Thread T1</text>
  <text class="d-text" x="360" y="34" text-anchor="middle">shared count</text>
  <text class="d-text" x="600" y="34" text-anchor="middle">Thread T2</text>
  <rect class="d-box" x="40" y="60" width="160" height="44" rx="8"/>
  <text class="d-text" x="120" y="88" text-anchor="middle">read 0</text>
  <rect class="d-box-muted" x="300" y="60" width="120" height="44" rx="8"/>
  <text class="d-text" x="360" y="88" text-anchor="middle">0</text>
  <rect class="d-box" x="520" y="130" width="160" height="44" rx="8"/>
  <text class="d-text" x="600" y="158" text-anchor="middle">read 0</text>
  <rect class="d-box" x="40" y="200" width="160" height="44" rx="8"/>
  <text class="d-text" x="120" y="228" text-anchor="middle">write 1</text>
  <rect class="d-box-muted" x="300" y="200" width="120" height="44" rx="8"/>
  <text class="d-text" x="360" y="228" text-anchor="middle">1</text>
  <path class="d-edge" d="M 204 222 L 296 222" marker-end="url(#py25-race-ar)"/>
  <rect class="d-box-accent" x="520" y="280" width="160" height="44" rx="8"/>
  <text class="d-text" x="600" y="308" text-anchor="middle">write 1</text>
  <rect class="d-box-accent" x="300" y="280" width="120" height="44" rx="8"/>
  <text class="d-text d-accent" x="360" y="308" text-anchor="middle">1, not 2</text>
  <path class="d-edge-accent" d="M 516 302 L 424 302" marker-end="url(#py25-race-ar)"/>
</svg>

Time runs downwards. T2 read before T1 wrote, so T2 computed its new value from a stale 0 and its write erased T1's increment.

## 4. "But Python Has a GIL"

It does, and it does not help here.

📌 **Interview term: GIL** — the lock a CPython thread must hold to run bytecode (see [the GIL page](/interview-question/what-is-the-global-interpreter-lock-gil)). It keeps the *interpreter's* internals — reference counts, dict internals — consistent. It can be handed to another thread **between** bytecodes, and the running thread is asked to give it up at least every \`sys.getswitchinterval()\` seconds (0.005 by default on our runs). Nothing stops that hand-over from landing between your \`LOAD_GLOBAL\` and your \`STORE_GLOBAL\`.

There is an honest twist worth knowing for interviews. On our machine, four threads each doing a million plain \`counter += 1\` ended at exactly **4,000,000** on 3.11, 3.12 and 3.13, three runs each — no lost updates. CPython simply did not happen to switch threads inside that very short sequence. Change the loop to \`v = c; time.sleep(0); c = v + 1\` — one call that releases the GIL between the read and the write — and the same 4 × 1,000 increments ended at about **1,000–1,005** instead of 4,000. The race was always there; the timing just made it rare. That is the definition of a race, and it is why "my test passes" is not evidence. On the free-threaded build (no GIL at all) threads run truly in parallel, so unprotected shared state is even more exposed.

## 5. A Race You Can Step Through

Threads cannot run in this page, so example 1 simulates two of them with generators. Each worker reads the shared count, then \`yield\`s — standing for "the scheduler switches thread here" — and then writes:

~~~python
def unsafe_worker(name, log):
    value = shared["count"]          # 1. read
    yield                            # <-- switch happens here
    shared["count"] = value + 1      # 2. write
~~~

Interleaving two of them reproduces the whiteboard story exactly:

~~~text
T1 read 0
T2 read 0
T1 wrote 1
T2 wrote 1
expected 2, got 1
~~~

## 6. How a Lock Fixes It

📌 **Interview term: Critical section** — a stretch of code that touches shared state and must not be run by two threads at the same time.

📌 **Interview term: Mutual exclusion (mutex)** — the guarantee that at most one thread is inside a critical section at a time. \`threading.Lock\` is Python's basic mutex.

A lock has two operations: \`acquire()\` — take it, or wait until it is free — and \`release()\` — give it back. If every thread acquires the **same** lock before the read and releases it after the write, the read-modify-write becomes indivisible *as seen by other threads that use that lock*. A thread switch can still happen inside the critical section, but the other thread cannot enter, so the switch is harmless.

The second half of example 1 adds a toy lock to the simulation. T2 arrives while T1 holds it, waits, and only reads after T1 has written:

~~~text
T2 waits
T1 wrote 1
T2 wrote 2
2
~~~

The toy lock checks \`lock.owner is None\` and then sets it with no \`yield\` in between, so in the simulation the check and the set cannot be interrupted. A real lock needs exactly that property from the hardware or OS (an atomic test-and-set or compare-and-swap); \`threading.Lock\` gets it from the operating system, which is why you should never build your own lock from a boolean flag in threaded code — that flag check is itself a check-then-act race.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="With a lock, T1 runs read and write inside the critical section while T2 waits, then T2 enters">
  <defs>
    <marker id="py25-lock-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="40" width="250" height="60" rx="10"/>
  <text class="d-text" x="165" y="66" text-anchor="middle">T1 holds the lock</text>
  <text class="d-sub" x="165" y="88" text-anchor="middle">read 0, write 1</text>
  <rect class="d-box-muted" x="40" y="140" width="250" height="50" rx="10"/>
  <text class="d-text" x="165" y="170" text-anchor="middle">T2 waits in acquire</text>
  <path class="d-edge" d="M 294 70 L 380 70" marker-end="url(#py25-lock-ar)"/>
  <rect class="d-box-accent" x="384" y="40" width="270" height="60" rx="10"/>
  <text class="d-text" x="519" y="66" text-anchor="middle">T2 holds the lock</text>
  <text class="d-sub" x="519" y="88" text-anchor="middle">read 1, write 2</text>
</svg>

The lock turns two overlapping read-modify-write sequences into two that run one after the other.

## 7. Real Threads: Forcing the Race on Purpose

Example 2 uses OS threads, so it is shown as code and was verified on CPython 3.12. To make the race happen *every* time (so the output is deterministic), it uses a \`threading.Barrier\`: each of 4 threads reads the balance, then waits at the barrier until all 4 have read, and only then writes:

~~~python
def deposit_unsafe():
    global balance
    seen = balance          # read
    barrier.wait()          # force the worst interleaving: all have read
    balance = seen + 100    # write, based on a stale value
~~~

Four deposits of 100 leave the balance at 100. With the read and write inside \`with lock:\`, the result is 400. The same example shows a check-then-act race on a cache — two threads both compute the value — and the fix:

~~~text
unsafe: expected 400 got 100
with lock: expected 400 got 400
check-then-act without lock: computed 2 times
check-then-act with lock: computed 1 times
~~~

📌 **Interview term: \`with lock:\`** — the context-manager form of a lock: it calls \`acquire()\` on entry and \`release()\` on exit, including when the block raises an exception (see [what a context manager is](/interview-question/what-is-a-context-manager)). Releasing a \`Lock\` that is not held raises \`RuntimeError: release unlocked lock\`, as the end of example 2 shows.

## 8. Verified: Running the Code

Example 1 was run with \`python3.11\` and through the page Pyodide 0.25.1 harness with identical output; 3.12 and 3.13 printed the same. Example 2 needs OS threads, so it is shown as code and was run on CPython 3.12 (3.11 and 3.13 printed the same — the barrier makes the interleaving deterministic).

**Example 1 — bytecode and a simulated lost update:**

~~~text
counter += 1 compiles to:
   LOAD_GLOBAL counter
   LOAD_CONST 1
   BINARY_OP +=
   STORE_GLOBAL counter
T1 read 0
T2 read 0
T1 wrote 1
T2 wrote 1
expected 2, got 1
T2 waits
T1 wrote 1
T2 wrote 2
2
~~~

**Example 2 — real threads, Barrier and Lock (CPython 3.12):**

~~~text
unsafe: expected 400 got 100
with lock: expected 400 got 400
check-then-act without lock: computed 2 times
check-then-act with lock: computed 1 times
locked inside with: True
locked after with: False
release an unlocked Lock: release unlocked lock
~~~

## 9. Ways to Avoid the Race

| Approach | How | When it fits |
| :--- | :--- | :--- |
| \`threading.Lock\` around the critical section | \`with lock:\` around every read-modify-write of the shared value | Small shared state touched by several threads |
| Do not share: per-thread results | Each worker returns its own result; combine after \`join()\` or via \`pool.map\` | Most "count/sum/collect" jobs |
| Message passing with \`queue.Queue\` | Producers \`put\`, a single consumer owns the state | Pipelines, a single writer to a file or DB |
| Immutable data | Build new objects instead of mutating shared ones | Configuration, read-mostly data |
| \`asyncio.Lock\` | \`async with lock:\` around a read, \`await\`, write | Races between asyncio tasks |
| Processes | No shared memory by default (see [multiprocessing and shared data](/interview-question/how-does-multiprocessing-share-data-between-processes)) | CPU-bound work; shared values then need \`multiprocessing.Lock\` |

Locks bring their own failure mode — two threads each holding the lock the other needs — covered in [what a deadlock is](/interview-question/what-is-a-deadlock-in-python).

## 10. Common Pitfalls

- **Locking the write but not the read.** The lock must cover the whole read-modify-write; \`seen = balance\` outside the lock and \`with lock: balance = seen + 100\` still loses updates.
- **One lock per thread.** A \`Lock()\` created inside the worker function protects nothing; every thread must use the same lock object for the same data.
- **Trusting the GIL or "atomic" built-ins.** \`list.append\` happens to be safe in one step on the GIL build, but \`d[k] += 1\`, \`if k not in d: d[k] = ...\` and \`x = x + 1\` are multi-step and race.
- **Concluding from a passing test.** Races are timing-dependent; on our runs a plain \`+= 1\` loop never lost an update, yet adding one \`time.sleep(0)\` lost about 75% of them.
- **Holding the lock during slow work.** Doing network calls or heavy computation inside \`with lock:\` serialises all threads and can turn into a deadlock risk; compute outside, lock only for the shared update.
- **Manual \`acquire()\` without \`finally\`.** An exception between \`acquire()\` and \`release()\` leaves the lock held; use \`with lock:\`.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A race condition is a bug where the result depends on <strong style="color:#ffca28;">how concurrent tasks happen to interleave</strong> while they share state. Run it twice and you can get two answers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The classic case:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counter += 1</code> compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_GLOBAL</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_CONST</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BINARY_OP</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STORE_GLOBAL</code>. If another thread runs between the load and the store, both write the same new value and one update is lost.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why the GIL does not help:</strong> <span style="color:#f0e2c8;">The GIL protects the interpreter's own data, one bytecode at a time. It can be handed to another thread between any two bytecodes, so your multi-step operation is not atomic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The fix:</strong> <span style="color:#f0e2c8;">Put the whole read-modify-write in a critical section guarded by one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading.Lock</code>, written as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with lock:</code>. Only one thread at a time can be inside, and the lock is released even if the block raises.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Better still:</strong> <span style="color:#f0e2c8;">Share less: give each thread its own result and combine at the end, or pass data through a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">queue.Queue</code>. And remember asyncio tasks race too, at every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If my counter test with threads always prints the right answer, is the code safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. On our 3.11 to 3.13 runs, 4 threads doing a million <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+= 1</code> each gave exactly 4,000,000, because CPython rarely switches threads inside that tiny loop. Add one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time.sleep(0)</code> between read and write and about three quarters of the updates were lost. A test that passes does not prove there is no race.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are some operations atomic in CPython?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Single operations on built-in types that run as one C call, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.append</code> or setting one dict key, are not interrupted by another thread on the GIL build. But that is a CPython implementation detail, not a language guarantee, and anything with a read then a write, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d[k] += 1</code>, is still a race.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Lock</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">RLock</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Lock</code> can be acquired once; acquiring it again in the same thread blocks forever. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RLock</code> records its owner thread and a count, so the owner can re-acquire it, and must release it the same number of times.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">with lock:</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">acquire()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">release()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the code between them raises, a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">release()</code> is skipped and the lock stays held forever, so every other thread hangs. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> statement releases in all cases, like a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can asyncio code have race conditions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. It is single-threaded, so nothing switches in the middle of plain code, but every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> is a switch point. A read, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, then a write on shared state can lose updates; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.Lock</code> exists for that.</span>
</div>

</div>

## 12. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Race condition** | Result depends on how concurrent tasks interleave while sharing state |
| **Shared mutable state** | Data more than one thread can read and change |
| **Atomic operation** | Seen by other threads as all-or-nothing |
| **GIL** | CPython lock for running bytecode; does not make multi-step code atomic |
| **Critical section** | Code touching shared state that only one thread may run at a time |
| **Mutual exclusion (mutex)** | At most one thread in the critical section; \`threading.Lock\` |
| **\`with lock:\`** | Acquire on entry, release on exit even when an exception is raised |

---
**Conclusion:** A race condition appears whenever concurrent tasks share mutable state and a multi-step operation — read-modify-write or check-then-act — can be interrupted in the middle. In Python even \`counter += 1\` is four bytecodes, and the GIL can change hands between any two of them, so it does not protect your logic. A \`threading.Lock\` used consistently around the whole critical section makes that sequence mutually exclusive; better designs share less in the first place, passing results back or through a queue. And because races depend on timing, a test that passes is never proof — reason about the interleavings instead.`,
    examples: [
      {
        label: `Why counter += 1 is not one step, and a lost update simulated step by step`,
        code: `# Why "counter += 1" is not one step, and how a lost update happens.
import dis

counter = 0

def increment():
    global counter
    counter += 1

wanted = {"LOAD_GLOBAL", "LOAD_CONST", "BINARY_OP", "STORE_GLOBAL"}
steps = [f"{i.opname} {i.argrepr}".strip()
         for i in dis.get_instructions(increment) if i.opname in wanted]
print("counter += 1 compiles to:")
for s in steps[:4]:
    print("  ", s)

# Simulate two threads with generators. Each "yield" is a point where the
# scheduler may switch to the other thread (between bytecodes).
shared = {"count": 0}

def unsafe_worker(name, log):
    value = shared["count"]          # 1. read
    log.append(f"{name} read {value}")
    yield                            # <-- switch happens here
    shared["count"] = value + 1      # 2. write
    log.append(f"{name} wrote {value + 1}")

def interleave(*workers):
    workers = list(workers)
    while workers:
        for w in list(workers):
            try:
                next(w)
            except StopIteration:
                workers.remove(w)

log = []
interleave(unsafe_worker("T1", log), unsafe_worker("T2", log))
print("\\n".join(log))
print("expected 2, got", shared["count"])

# The fix: a lock makes read-and-write one critical section.
class ToyLock:
    def __init__(self):
        self.owner = None

def safe_worker(name, lock, log):
    while lock.owner is not None:    # someone else is inside: wait
        log.append(f"{name} waits")
        yield
    lock.owner = name                # acquire
    value = shared["count"]
    yield                            # a switch here is now harmless
    shared["count"] = value + 1
    lock.owner = None                # release
    log.append(f"{name} wrote {value + 1}")

shared["count"] = 0
log = []
lock = ToyLock()
interleave(safe_worker("T1", lock, log), safe_worker("T2", lock, log))
print("\\n".join(log))
print(shared["count"])  # 2
`,
      },
      {
        label: `A real race with threads, forced with a Barrier, fixed with a Lock (OS threads, not in the browser)`,
        code: `# A race with real threads, made deterministic with a Barrier, then fixed.
# Not runnable in the browser: needs OS threads.
import threading

N = 4

# 1. Lost update: every thread reads before any thread writes.
balance = 0
barrier = threading.Barrier(N)

def deposit_unsafe():
    global balance
    seen = balance          # read
    barrier.wait()          # force the worst interleaving: all have read
    balance = seen + 100    # write, based on a stale value

threads = [threading.Thread(target=deposit_unsafe) for _ in range(N)]
for t in threads: t.start()
for t in threads: t.join()
print("unsafe: expected", N * 100, "got", balance)

# 2. Same code, but read-modify-write is inside one lock.
balance = 0
lock = threading.Lock()

def deposit_safe():
    global balance
    with lock:              # acquire ... release, even if an exception happens
        seen = balance
        balance = seen + 100

threads = [threading.Thread(target=deposit_safe) for _ in range(N)]
for t in threads: t.start()
for t in threads: t.join()
print("with lock: expected", N * 100, "got", balance)

# 3. Check-then-act race: two threads both see "not cached" and both compute.
cache, computed = {}, []
gate = threading.Barrier(2)

def get_unsafe(key):
    if key not in cache:     # check
        gate.wait()          # both threads passed the check
        computed.append(key)
        cache[key] = key.upper()   # act
    return cache[key]

ts = [threading.Thread(target=get_unsafe, args=("k",)) for _ in range(2)]
for t in ts: t.start()
for t in ts: t.join()
print("check-then-act without lock: computed", len(computed), "times")

cache, computed = {}, []
cache_lock = threading.Lock()

def get_safe(key):
    with cache_lock:
        if key not in cache:
            computed.append(key)
            cache[key] = key.upper()
        return cache[key]

ts = [threading.Thread(target=get_safe, args=("k",)) for _ in range(2)]
for t in ts: t.start()
for t in ts: t.join()
print("check-then-act with lock: computed", len(computed), "times")

# 4. What the lock object itself guarantees
print("locked inside with:", end=" ")
with lock:
    print(lock.locked())
print("locked after with:", lock.locked())
try:
    lock.release()
except RuntimeError as e:
    print("release an unlocked Lock:", e)
`,
        runnable: false,
        python: "3.12",
      },
    ],
  },
  {
    title: `What is a deadlock in Python?`,
    difficulty: "medium",
    seoDescription: `Deadlocks in Python: two threads each holding the lock the other needs, the four Coffman conditions, Lock vs RLock, lock ordering and timeouts.`,
    description: `**Question presented to candidate:**
"What is a deadlock? Show me how two Python threads can deadlock, how you would notice it in a running program, and how you design code so it cannot happen."

**What a strong answer should cover:**
- A deadlock: a set of threads (or tasks, or processes) each waiting for a resource another one in the set holds, so none can ever proceed; the program hangs without an error.
- The classic case: thread 1 holds lock A and waits for B, thread 2 holds B and waits for A — a cycle in the wait-for graph. The four Coffman conditions: mutual exclusion, hold and wait, no preemption, circular wait.
- Python specifics: a plain \`threading.Lock\` is not re-entrant, so a thread that acquires it twice deadlocks itself; \`threading.RLock\` allows the owner to re-acquire.
- Prevention: one global lock-acquisition order, holding one lock at a time, small critical sections; detection and recovery with \`acquire(timeout=...)\` and \`join(timeout=...)\`.
- Other Python forms: \`queue.join()\` with no consumer, a process whose output pipe fills up while the parent waits, asyncio tasks awaiting each other; \`faulthandler.dump_traceback\` or \`py-spy dump\` show where threads are stuck.

**Code / implementation expected:** Optional — two threads with opposite lock order, and the fix with a consistent order or timeouts.`,
    answer: `**Target Audience:** Developers who use locks or threads and want to understand why programs freeze — no prior concurrency knowledge needed beyond what a lock is.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13; the in-page example runs on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

Two cars meet on a single-lane bridge from opposite ends. Each driver moves forward to the middle, and now each one needs the bit of road the other is sitting on. Neither will reverse. Neither can go forward. Nobody crashed, no alarm sounds — traffic just stops, forever, until someone outside the situation steps in.

A deadlock in a program is the same. Usually the cause is not a single bug but two pieces of code, each correct on its own, that take the same locks in a different order. The program does not throw an exception; it just stops responding, often only under load, which makes it one of the hardest bugs to reproduce. That is why interviewers ask it right after race conditions: locks fix races, and this is what locks break.

## 2. The Definition

📌 **Interview term: Deadlock** — a state in which every member of a group of threads (or processes, or tasks) is waiting for a resource that another member holds, so none of them can ever proceed.

📌 **Interview term: Wait-for graph** — draw an arrow from each waiting thread to the thread holding what it wants. A deadlock is exactly a **cycle** in that graph.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="Deadlock cycle: T1 holds lock A and waits for lock B; T2 holds lock B and waits for lock A">
  <defs>
    <marker id="py25-dl-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="60" y="40" width="160" height="60" rx="10"/>
  <text class="d-text" x="140" y="76" text-anchor="middle">Thread T1</text>
  <rect class="d-box-accent" x="480" y="40" width="160" height="60" rx="10"/>
  <text class="d-text" x="560" y="76" text-anchor="middle">Thread T2</text>
  <rect class="d-box" x="60" y="200" width="160" height="60" rx="10"/>
  <text class="d-text" x="140" y="236" text-anchor="middle">lock A</text>
  <rect class="d-box" x="480" y="200" width="160" height="60" rx="10"/>
  <text class="d-text" x="560" y="236" text-anchor="middle">lock B</text>
  <path class="d-edge" d="M 140 196 L 140 104" marker-end="url(#py25-dl-ar)"/>
  <text class="d-sub" x="80" y="156">held by</text>
  <path class="d-edge" d="M 560 196 L 560 104" marker-end="url(#py25-dl-ar)"/>
  <text class="d-sub" x="572" y="156">held by</text>
  <path class="d-edge-accent" d="M 224 90 L 476 210" marker-end="url(#py25-dl-ar)"/>
  <path class="d-edge-accent" d="M 476 90 L 224 210" marker-end="url(#py25-dl-ar)"/>
  <text class="d-sub" x="260" y="104">T1 waits for B</text>
  <text class="d-sub" x="360" y="104">T2 waits for A</text>
</svg>

Follow the arrows: T1 waits for B, B is held by T2, T2 waits for A, A is held by T1 — back to the start. A cycle means nobody can move.

📌 **Interview term: Coffman conditions** — the four conditions that must *all* hold for a deadlock (from Coffman and colleagues, 1971):

| Condition | Meaning | Python example |
| :--- | :--- | :--- |
| Mutual exclusion | A resource can be held by only one thread | A \`threading.Lock\` |
| Hold and wait | A thread holds one resource while waiting for another | \`with lock_a:\` then \`lock_b.acquire()\` inside |
| No preemption | A resource cannot be taken away; the holder must release it | Python never force-releases a lock |
| Circular wait | A cycle of threads, each waiting for the next | T1: A then B; T2: B then A |

Break any one and deadlock cannot happen. In practice we break **circular wait** (a fixed lock order) or **hold and wait** (hold one lock at a time, or give up everything after a timeout).

## 3. The Simplest Deadlock: Locking Yourself Out

You do not need two threads. A plain \`threading.Lock\` does not remember who holds it, so if the thread that holds it calls \`acquire()\` again, it waits for itself — forever.

📌 **Interview term: Re-entrant lock (\`RLock\`)** — a lock that records its owner thread and a counter. The owner may acquire it again (the counter goes up) and must release it as many times. Any other thread still has to wait.

Example 1 shows this with a timeout so it does not hang:

~~~text
Lock, second acquire: False
RLock, second acquire: True
~~~

The realistic version is a class whose locked method calls another locked method on the same object. With a \`Lock\`, \`withdraw_with_fee\` takes the lock and then \`withdraw\` tries to take it again; with an \`RLock\` it works:

~~~text
with Lock:  would deadlock
with RLock: ok
~~~

\`RLock\` is not free: it is a little slower, and it can hide a design where you do not know which code holds the lock. A common alternative is a public method that locks and a private \`_withdraw_unlocked\` helper that assumes the lock is held.

## 4. The Classic Deadlock: Opposite Lock Order

Example 2 uses real OS threads, so it is shown as code and was verified on CPython 3.12. T1 takes \`lock_a\` then wants \`lock_b\`; T2 takes \`lock_b\` then wants \`lock_a\`. A \`threading.Barrier\` makes sure both have taken their first lock before either asks for the second, so the deadlock happens every run instead of only sometimes. Instead of a bare \`acquire()\`, which would hang the program, each thread uses \`acquire(timeout=0.5)\`:

~~~python
def transfer(name, first, second, barrier, results):
    with first:
        barrier.wait()                       # both threads now hold one lock
        got = second.acquire(timeout=0.5)    # without a timeout: hangs forever
~~~

Both give up — the deadlock, detected:

~~~text
opposite order: {'T1': 'gave up (deadlock)', 'T2': 'gave up (deadlock)'}
~~~

📌 **Interview term: Lock ordering** — a rule that every thread acquires locks in the same global order (for example, by a fixed rank or by account ID). With one order, a cycle is impossible: whoever gets the first lock can always get the rest. Example 2 sorts the two locks before taking them, and both transfers complete:

~~~text
global order:   {'T1': 'done', 'T2': 'done'}
~~~

Example 1 does the same without threads: \`acquire_in_order(lock_b, lock_a)\` still takes \`lock_a\` first (\`acquired a first: True\`).

## 5. Seeing a Deadlock From Outside

A deadlocked thread just sits in \`acquire()\`. From the outside you see a \`join()\` that never returns. Example 2 shows the pattern with \`join(timeout=...)\`:

~~~text
worker still alive after join(timeout=0.3): True
after release, alive: False
~~~

📌 **Interview term: Timeout-based detection** — give every blocking wait a timeout (\`lock.acquire(timeout=...)\`, \`thread.join(timeout=...)\`, \`queue.get(timeout=...)\`, \`future.result(timeout=...)\`), and treat a timeout as "something is stuck": log it, release what you hold, retry or fail loudly.

Note something unusual about that example: the main thread released a \`Lock\` that a *different* thread was waiting on. A plain \`Lock\` has no owner, so any thread may release it; an \`RLock\` may only be released by its owner (otherwise \`RuntimeError\`).

To find out *where* a real hung program is stuck, dump every thread's stack: the standard-library \`faulthandler\` module can do it on a signal or after a timer (\`faulthandler.dump_traceback_later\`), and external tools such as \`py-spy dump --pid <pid>\` read a running process. Two threads both inside \`acquire()\`, each holding the lock the other wants, is the signature.

Example 1 also turns the wait-for graph into code: \`find_cycle\` follows "waits for" arrows and reports a cycle when it gets back to the start — the core idea of deadlock **detection** in databases and lock managers:

~~~text
T1 -> T2 -> T1
None
T1 -> T2 -> T3 -> T1
~~~

## 6. Deadlocks Without Two Locks

| Situation | Why it hangs | Fix |
| :--- | :--- | :--- |
| \`queue.Queue.join()\` with no consumer calling \`task_done()\` | \`join()\` waits for a count that never reaches zero | Make sure every \`get()\` is matched by \`task_done()\` |
| A bounded \`Queue(maxsize=n)\`: producer blocks on \`put()\`, consumer has died | Producer waits for space nobody will free | Timeouts on \`put\`/\`get\`, supervise consumers |
| Parent waits for a child process while the child waits to write into a full pipe | \`subprocess\` with \`stdout=PIPE\` plus \`wait()\` | Use \`communicate()\` or \`run()\` — see [subprocess safely](/interview-question/how-do-you-run-external-commands-with-subprocess-safely) |
| A thread \`join()\`s itself, or two threads \`join()\` each other | Each waits for the other to finish | Only join from an owner thread |
| asyncio tasks awaiting \`asyncio.Lock\`s in opposite order | Same cycle, no threads needed | Same ordering rule; \`asyncio.wait_for\` for detection |
| \`fork\` while another thread holds a lock | The child copies the locked lock but not the thread that would release it | Prefer \`spawn\`/\`forkserver\`; Python 3.14 made \`forkserver\` the POSIX default ([multiprocessing docs](https://docs.python.org/3/library/multiprocessing.html)) |

We checked the asyncio case on CPython 3.11 while writing this page: two tasks taking two \`asyncio.Lock\`s in opposite order with an \`await asyncio.sleep(0)\` between them never finished, and \`asyncio.wait_for(..., 0.1)\` raised \`TimeoutError\`. It is not an example here because the in-page runner cannot call \`asyncio.run()\`.

## 7. Verified: Running the Code

Example 1 was run with \`python3.11\` and through the page Pyodide 0.25.1 harness with identical output (single-thread lock operations work in the browser); 3.12 and 3.13 printed the same. Example 2 needs OS threads, so it is shown as code and was run on CPython 3.12 (3.11 and 3.13 printed the same — two barriers make the interleaving deterministic).

**Example 1 — self-deadlock, RLock, cycles, ordering:**

~~~text
Lock, second acquire: False
RLock, second acquire: True
with Lock:  would deadlock
with RLock: ok
T1 -> T2 -> T1
None
T1 -> T2 -> T3 -> T1
acquired a first: True
~~~

**Example 2 — real threads (CPython 3.12):**

~~~text
opposite order: {'T1': 'gave up (deadlock)', 'T2': 'gave up (deadlock)'}
global order:   {'T1': 'done', 'T2': 'done'}
worker still alive after join(timeout=0.3): True
after release, alive: False
~~~

## 8. Prevention Checklist

| Technique | Breaks which condition | Cost |
| :--- | :--- | :--- |
| One global lock order | Circular wait | Discipline; document the order |
| Hold one lock at a time; copy data out, release, then work | Hold and wait | Code may need restructuring |
| \`acquire(timeout=...)\`, back off and retry | Hold and wait (you give up what you hold) | Retry logic; risk of livelock if everyone retries in step |
| Avoid shared locks: queues, message passing, per-thread data | Mutual exclusion (nothing to hold) | Different architecture |
| \`RLock\` for nested locked calls on one object | Self-deadlock only | Slightly slower; can hide unclear ownership |
| Never call unknown code (callbacks, user hooks) while holding a lock | Prevents surprise lock nesting | Collect callbacks, call them after release |

Why the lock was there in the first place is covered in [race conditions and locks](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it); thread pools, which reduce how much locking you write yourself, are in [ThreadPoolExecutor and ProcessPoolExecutor](/interview-question/how-do-threadpoolexecutor-and-processpoolexecutor-work).

## 9. Common Pitfalls

- **Taking two locks in different orders in different functions.** Each function looks fine; the deadlock only appears when both run at once. Define one order and follow it everywhere.
- **Re-acquiring a plain \`Lock\` in a nested call.** \`Lock\` is not re-entrant; a locked method that calls another locked method on the same object hangs. Use \`RLock\` or an unlocked helper.
- **Blocking calls with no timeout.** A bare \`acquire()\`, \`join()\`, \`queue.get()\` or \`future.result()\` turns a bug into a silent hang. Add timeouts on anything that could wait on another thread.
- **Calling callbacks or I/O while holding a lock.** The callback may take another lock (or the same one), and slow I/O keeps others waiting; release before calling out.
- **A pool task waiting for another task in the same full pool.** If every worker of a \`ThreadPoolExecutor\` waits on a future that needs a free worker, nothing ever runs — the [concurrent.futures documentation](https://docs.python.org/3/library/concurrent.futures.html) warns about exactly this pattern.
- **Expecting Python to detect it.** CPython has no deadlock detector for \`threading\` locks; the program simply stops making progress.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A deadlock is when each thread in a group waits for something another thread in the group holds, so <strong style="color:#ffca28;">none of them can ever continue</strong>. Nothing crashes; the program just hangs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Classic case:</strong> <span style="color:#f0e2c8;">T1 takes lock A then wants B; T2 takes B then wants A. That is a cycle in the wait-for graph, and both <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acquire()</code> calls block forever.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Four conditions:</strong> <span style="color:#f0e2c8;">Coffman: mutual exclusion, hold and wait, no preemption, circular wait. Remove any one and deadlock is impossible; in practice we break <strong style="color:#ffca28;">circular wait</strong> with a global lock order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python specifics:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">threading.Lock</code> is not re-entrant: acquiring it twice in the same thread deadlocks that thread. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RLock</code> tracks its owner and a count, so nested locked methods work.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Defence:</strong> <span style="color:#f0e2c8;">One acquisition order everywhere, hold one lock at a time where possible, keep critical sections short, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acquire(timeout=...)</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">join(timeout=...)</code> to detect and report a hang instead of freezing forever.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you debug a hung Python program?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dump every thread stack: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">faulthandler.dump_traceback_later()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">faulthandler.register(signal.SIGUSR1)</code> set up in advance, or an external sampler such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">py-spy dump --pid</code>. Two threads both sitting in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acquire()</code> on each other's locks is the signature.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a deadlock the same as a livelock or starvation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. In a deadlock nobody moves. In a livelock threads keep running but only react to each other (for example both back off and retry in step forever). In starvation one thread never gets the resource while others keep getting it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the GIL cause deadlocks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself in pure Python, since a thread waiting for a lock releases the GIL. It matters in C extensions: code that waits for a lock while still holding the GIL can deadlock with a thread that needs the GIL to release that lock.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can asyncio code deadlock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, with no threads at all: two tasks each awaiting an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.Lock</code> the other holds, or a task awaiting a future that only it would complete. Using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.wait_for</code> with a timeout surfaces it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the fork-with-threads problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fork</code> start method the child copies memory but only the calling thread. If another thread held a lock at that moment (for example inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">logging</code>), the child inherits a locked lock with no owner and can hang. That is one reason Python 3.14 moved the POSIX default start method to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forkserver</code>.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Deadlock** | Every thread in a group waits for something another one in the group holds |
| **Wait-for graph** | Arrows from waiting threads to holders; a deadlock is a cycle |
| **Coffman conditions** | Mutual exclusion, hold and wait, no preemption, circular wait |
| **Re-entrant lock (\`RLock\`)** | Lock its owner can acquire repeatedly, with a counter |
| **Lock ordering** | All threads take locks in one fixed global order |
| **Timeout-based detection** | Every blocking wait has a timeout; a timeout signals a stuck state |

---
**Conclusion:** A deadlock is a cycle of waiting: each thread holds something the next one needs, and nobody will let go, so the program hangs without an error. In Python the two everyday forms are a plain \`Lock\` acquired twice by the same thread (fix with \`RLock\` or an unlocked helper) and two threads taking the same locks in opposite orders (fix with one global lock order). Add timeouts on every blocking wait so a hang becomes a visible, logged event, keep critical sections small, and do not call out to unknown code while holding a lock.`,
    examples: [
      {
        label: `Self-deadlock, Lock vs RLock, wait-for cycles and ordered acquisition (no threads needed)`,
        code: `# Deadlock ideas you can run without threads.
import threading

# 1. Self-deadlock: a plain Lock is NOT re-entrant.
lock = threading.Lock()
lock.acquire()
# A second blocking acquire() would hang forever. With a timeout it gives up:
print("Lock, second acquire:", lock.acquire(timeout=0.1))
lock.release()

# 2. RLock remembers its owner and counts how often it was acquired.
rlock = threading.RLock()
rlock.acquire()
print("RLock, second acquire:", rlock.acquire(timeout=0.1))
rlock.release()
rlock.release()   # must release as many times as acquired

# The classic way people hit case 1: a locked method calls another locked method.
class Account:
    def __init__(self, lock):
        self.lock = lock
        self.balance = 100

    def withdraw(self, amount):
        if not self.lock.acquire(timeout=0.1):
            return "would deadlock"
        try:
            self.balance -= amount
            return "ok"
        finally:
            self.lock.release()

    def withdraw_with_fee(self, amount):
        with self.lock:
            return self.withdraw(amount + 1)   # re-acquires the same lock

print("with Lock: ", Account(threading.Lock()).withdraw_with_fee(10))
print("with RLock:", Account(threading.RLock()).withdraw_with_fee(10))

# 3. A deadlock is a cycle in the wait-for graph.
def find_cycle(waits_for):
    for start in waits_for:
        seen, node = [], start
        while node in waits_for and node not in seen:
            seen.append(node)
            node = waits_for[node]
        if node == start:
            return seen + [start]
    return None

# T1 holds lock_a and waits for T2 (which holds lock_b), and vice versa
print(" -> ".join(find_cycle({"T1": "T2", "T2": "T1"})))
print(find_cycle({"T1": "T2", "T2": "T3"}))  # None
print(" -> ".join(find_cycle({"T1": "T2", "T2": "T3", "T3": "T1"})))

# 4. The cure for lock-order deadlocks: always acquire in one global order.
lock_a, lock_b = threading.Lock(), threading.Lock()
order = {id(lock_a): 1, id(lock_b): 2}

def acquire_in_order(*locks):
    ranked = sorted(locks, key=lambda l: order[id(l)])
    for l in ranked:
        l.acquire()
    return ranked

held = acquire_in_order(lock_b, lock_a)   # asked for b first...
print("acquired a first:", held[0] is lock_a)
for l in reversed(held):
    l.release()
`,
      },
      {
        label: `A real lock-order deadlock between two threads, detected with timeouts and fixed (OS threads, not in the browser)`,
        code: `# A real lock-order deadlock between two threads, detected with timeouts,
# then fixed with a global lock order.
# Not runnable in the browser: needs OS threads.
import threading

lock_a = threading.Lock()
lock_b = threading.Lock()

def transfer(name, first, second, barrier, results):
    with first:
        barrier.wait()                       # both threads now hold one lock
        got = second.acquire(timeout=0.5)    # without a timeout: hangs forever
        if got:
            second.release()
        results[name] = "done" if got else "gave up (deadlock)"
        barrier.wait()                       # keep holding first until both tried

def run(order_1, order_2):
    results = {}
    barrier = threading.Barrier(2)
    t1 = threading.Thread(target=transfer, args=("T1", *order_1, barrier, results))
    t2 = threading.Thread(target=transfer, args=("T2", *order_2, barrier, results))
    t1.start(); t2.start()
    t1.join(); t2.join()
    return dict(sorted(results.items()))

# T1: a then b.  T2: b then a.  Each holds what the other needs.
print("opposite order:", run((lock_a, lock_b), (lock_b, lock_a)))

# Same order everywhere: one of them waits, but nobody waits in a circle.
def transfer_ordered(name, first, second, barrier, results):
    lo, hi = sorted((first, second), key=lambda l: 0 if l is lock_a else 1)
    with lo:
        with hi:
            results[name] = "done"

results = {}
ts = [threading.Thread(target=transfer_ordered, args=("T1", lock_a, lock_b, None, results)),
      threading.Thread(target=transfer_ordered, args=("T2", lock_b, lock_a, None, results))]
for t in ts: t.start()
for t in ts: t.join()
print("global order:  ", dict(sorted(results.items())))

# join() blocking forever is how a deadlocked program looks from outside.
stuck = threading.Lock()
stuck.acquire()
t = threading.Thread(target=stuck.acquire, daemon=True)  # will block forever
t.start()
t.join(timeout=0.3)
print("worker still alive after join(timeout=0.3):", t.is_alive())
stuck.release()   # let it go so the program can exit cleanly
t.join()
print("after release, alive:", t.is_alive())
`,
        runnable: false,
        python: "3.12",
      },
    ],
  },
  {
    title: `How do ThreadPoolExecutor and ProcessPoolExecutor work?`,
    difficulty: "medium",
    seoDescription: `How Python's ThreadPoolExecutor and ProcessPoolExecutor work: Futures, submit vs map, as_completed, worker queues, pickling, defaults and shutdown.`,
    description: `**Question presented to candidate:**
"Walk me through \`concurrent.futures\`. What happens when you call \`submit()\` on a ThreadPoolExecutor versus a ProcessPoolExecutor, what do you get back, and how do you choose between them?"

**What a strong answer should cover:**
- Both implement the \`Executor\` interface (\`submit\`, \`map\`, \`shutdown\`, context manager); \`submit()\` returns a \`Future\` — a placeholder with \`result()\`, \`exception()\`, \`done()\`, \`cancel()\` and \`add_done_callback()\`.
- ThreadPoolExecutor: work items go on an in-process queue read by worker threads, created lazily up to \`max_workers\`; shared memory, best for blocking I/O on a GIL build.
- ProcessPoolExecutor: work items are pickled and sent to worker processes, results pickled back by a manager thread; real CPU parallelism, but functions and data must be picklable and the entry point needs \`if __name__ == "__main__":\`.
- \`map()\` returns results in input order and raises the first exception when you reach it; \`as_completed()\` yields futures in completion order; exceptions in workers are stored in the Future and re-raised by \`result()\`.
- Defaults and lifecycle: thread pool \`min(32, cpu_count + 4)\` workers since 3.8 (3.13 uses \`os.process_cpu_count()\`), process pool = CPU count; leaving the \`with\` block calls \`shutdown(wait=True)\`; \`cancel_futures\`, \`chunksize\`, \`max_tasks_per_child\` (3.11+).
- Pitfalls: tasks that wait on other tasks in the same pool can deadlock; tiny tasks in a process pool are dominated by pickling overhead.

**Code / implementation expected:** Yes — submit/map/as_completed with a thread pool, and a CPU-bound job in a process pool under the \`__main__\` guard.`,
    answer: `**Target Audience:** Developers who have used a loop and a function, and want to run that function many times at once safely — no prior concurrency knowledge needed.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13 (standard GIL builds); the in-page example runs on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown was produced by actually running the code — see the **Verified** section.

## 1. Why This Even Matters — A Story First

At a busy dry cleaner, you hand over a shirt at the counter and get a **ticket** straight away. You do not stand there while it is cleaned. Behind the counter, a fixed team of workers takes garments off a rack in order. Later you come back, hand over the ticket, and either get your shirt — or the bad news that it was ruined, delivered at the moment you ask.

\`concurrent.futures\` is exactly this shop. The counter is the **executor**; \`submit()\` hands over the job; the ticket is a **Future**; the workers are a **pool** of threads or processes; \`result()\` is coming back with your ticket — and if the job raised an exception, that is when you hear about it. Interviewers ask about it because it is the standard, high-level way to do concurrent work in Python, and because the two pool types behave very differently once data and errors are involved.

## 2. The Pieces

📌 **Interview term: Executor** — an object that runs callables for you somewhere else (another thread or process). \`concurrent.futures.Executor\` defines \`submit()\`, \`map()\` and \`shutdown()\`, and works as a context manager. The module was added in Python 3.2 by [PEP 3148](https://peps.python.org/pep-3148/).

📌 **Interview term: Future** — a placeholder for a result that is not ready yet. It is created *pending*, becomes *running*, and ends *finished* (with a result or an exception) or *cancelled*. You read it with \`result(timeout=None)\`, \`exception()\`, \`done()\`, \`cancelled()\`, and you can attach \`add_done_callback(fn)\`.

📌 **Interview term: Worker pool** — a fixed set of reusable workers that take jobs from a queue, so you pay the cost of starting a thread or process once, not per task.

Example 1 uses the \`Future\` class by hand — exactly the calls a worker makes internally — and runs in this page because no thread is needed:

~~~text
new: False False False
set_running_or_notify_cancel: True
callback got 42
done: True result: 42
~~~

A worker calls \`set_running_or_notify_cancel()\` before it starts (it returns \`False\` if the Future was cancelled while waiting in the queue), then \`set_result()\` or \`set_exception()\`. The done-callback ran the moment the result was set. An exception is stored, not raised, until you ask:

~~~text
exception(): ZeroDivisionError('division by zero')
result() re-raised: division by zero
cancel pending: True cancelled: True
cancel running: False
~~~

Only a Future that has not started can be cancelled — a running task is never interrupted.

## 3. Executor Is a Small Interface

The base \`Executor\` class only needs one method from a subclass: \`submit()\`. Example 1 writes a 10-line \`InlineExecutor\` that runs the call immediately in the current thread — and gets \`map()\` and the context manager for free from the base class:

~~~text
map: [4, 9, 16]
submit: (3, 1)
submit: (2, 1)
submit: integer division or modulo by zero
~~~

The real pools differ only in **where** \`submit()\` sends the work.

## 4. How ThreadPoolExecutor Works

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="ThreadPoolExecutor: submit puts a work item on a queue, worker threads take items and set the result on the Future">
  <defs>
    <marker id="py25-tp-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="110" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="140" text-anchor="middle">submit(fn, x)</text>
  <text class="d-sub" x="95" y="162" text-anchor="middle">returns a Future</text>
  <path class="d-edge" d="M 174 145 L 236 145" marker-end="url(#py25-tp-ar)"/>
  <rect class="d-box" x="240" y="110" width="160" height="70" rx="10"/>
  <text class="d-text" x="320" y="140" text-anchor="middle">work queue</text>
  <text class="d-sub" x="320" y="162" text-anchor="middle">SimpleQueue</text>
  <path class="d-edge" d="M 404 130 L 476 66" marker-end="url(#py25-tp-ar)"/>
  <path class="d-edge" d="M 404 145 L 476 145" marker-end="url(#py25-tp-ar)"/>
  <path class="d-edge" d="M 404 160 L 476 224" marker-end="url(#py25-tp-ar)"/>
  <rect class="d-box-muted" x="480" y="36" width="200" height="56" rx="10"/>
  <text class="d-text" x="580" y="70" text-anchor="middle">worker thread 0</text>
  <rect class="d-box-muted" x="480" y="118" width="200" height="56" rx="10"/>
  <text class="d-text" x="580" y="152" text-anchor="middle">worker thread 1</text>
  <rect class="d-box-muted" x="480" y="200" width="200" height="56" rx="10"/>
  <text class="d-text" x="580" y="234" text-anchor="middle">worker thread 2</text>
</svg>

Everything lives in one process: the caller, the queue and the worker threads share memory. Each worker runs \`fn(x)\` and sets the result or exception on that work item's Future.

Reading the CPython 3.12 source (\`concurrent/futures/thread.py\`) confirms the details: \`submit()\` wraps the call and its Future in a \`_WorkItem\`, puts it on a \`queue.SimpleQueue\`, and then calls \`_adjust_thread_count()\`, which starts a new thread **only if no idle thread is available** and fewer than \`max_workers\` exist. Threads are named \`<prefix>_0\`, \`<prefix>_1\`... from \`thread_name_prefix\`.

📌 **Interview term: \`max_workers\` default** — for \`ThreadPoolExecutor\`, \`min(32, os.cpu_count() + 4)\` since Python 3.8; in 3.13 it became \`min(32, (os.process_cpu_count() or 1) + 4)\` ([concurrent.futures docs](https://docs.python.org/3/library/concurrent.futures.html)). The 3.13 source we read has exactly that line, and example 2 checks the formula against the pool on 3.12. For \`ProcessPoolExecutor\` the default is the CPU count (\`os.process_cpu_count()\` in the 3.13 source).

Because the workers are threads, the [GIL](/interview-question/what-is-the-global-interpreter-lock-gil) applies: pure-Python CPU work does not speed up, but blocking I/O does. Example 2 (OS threads — shown as code, verified on CPython 3.12) runs three sleeps of 0.3, 0.1 and 0.2 s and shows the two ways of collecting results:

~~~text
map:          ['slow (io)', 'fast (io)', 'medium (io)']
ran in parallel: True
as_completed: ['fast', 'medium', 'slow']
first done: ['fast (io)'] still running: 2
~~~

📌 **Interview term: \`map()\` vs \`as_completed()\`** — \`executor.map(fn, items)\` returns results **in input order** (the slow one first here, so you wait for it before you see the fast ones). \`as_completed(futures)\` yields Futures **in the order they finish**. \`wait(futures, return_when=FIRST_COMPLETED)\` returns two sets, done and not done.

Errors and shutdown, from the same run:

~~~text
exception stored: ValueError
result() raised: invalid literal for int() with base 10: 'x'
after shutdown(wait=True): True True
cancel_futures=True: False True
submit after shutdown: cannot schedule new futures after shutdown
~~~

📌 **Interview term: \`shutdown(wait=True, cancel_futures=False)\`** — stops accepting work; with \`wait=True\` it blocks until running and queued work is done. Leaving a \`with\` block calls it. With \`cancel_futures=True\` the queued Futures that have not started are cancelled — in the run, the first sleep was already running (not cancelled), the queued one was cancelled.

## 5. How ProcessPoolExecutor Works

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="ProcessPoolExecutor: the parent pickles work into a call queue, worker processes run it and put pickled results on a result queue, a manager thread sets the Futures">
  <defs>
    <marker id="py25-pp-ar" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="70" text-anchor="middle">parent: submit</text>
  <text class="d-sub" x="120" y="92" text-anchor="middle">Future + work item</text>
  <rect class="d-box-accent" x="20" y="220" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="250" text-anchor="middle">manager thread</text>
  <text class="d-sub" x="120" y="272" text-anchor="middle">sets the Future</text>
  <rect class="d-box" x="280" y="40" width="170" height="70" rx="10"/>
  <text class="d-text" x="365" y="70" text-anchor="middle">call queue</text>
  <text class="d-sub" x="365" y="92" text-anchor="middle">pickled calls</text>
  <rect class="d-box" x="280" y="220" width="170" height="70" rx="10"/>
  <text class="d-text" x="365" y="250" text-anchor="middle">result queue</text>
  <text class="d-sub" x="365" y="272" text-anchor="middle">pickled results</text>
  <rect class="d-box-muted" x="510" y="130" width="190" height="70" rx="10"/>
  <text class="d-text" x="605" y="160" text-anchor="middle">worker processes</text>
  <text class="d-sub" x="605" y="182" text-anchor="middle">own interpreter, own GIL</text>
  <path class="d-edge" d="M 224 75 L 276 75" marker-end="url(#py25-pp-ar)"/>
  <path class="d-edge" d="M 454 85 L 540 126" marker-end="url(#py25-pp-ar)"/>
  <path class="d-edge" d="M 540 204 L 454 245" marker-end="url(#py25-pp-ar)"/>
  <path class="d-edge" d="M 276 255 L 224 255" marker-end="url(#py25-pp-ar)"/>
</svg>

The parent never runs your function. It pickles the call into a queue, worker processes run it, and a background thread in the parent turns the pickled results back into finished Futures.

In the CPython 3.12 source (\`concurrent/futures/process.py\`) the pieces have these names: the call queue holds at most \`max_workers + EXTRA_QUEUED_CALLS\` (1) items, the result queue is a \`multiprocessing\` \`SimpleQueue\`, and an \`_ExecutorManagerThread\` in the parent moves pending work items onto the call queue, reads results, and completes the Futures. Consequences you can see in example 3 (OS processes — shown as code, verified on CPython 3.12):

~~~text
primes per chunk: [5133, 4459, 4256, 4136]
total below 200000: 17984
ran outside the parent: True
~~~

- **Everything crosses by pickle.** The function is sent by its importable name, so a lambda fails (\`lambda: PicklingError\` on our 3.11–3.13 runs); arguments, results and exceptions are pickled too (\`worker error: bad input 7\` came back from a worker). See [what pickling is](/interview-question/what-is-pickling-and-what-are-its-risks).
- **No shared globals.** Each worker has its own copy of the module, so 8 \`bump()\` calls in workers left the parent's \`COUNTER\` at \`0\`. Sharing needs explicit tools — see [how multiprocessing shares data](/interview-question/how-does-multiprocessing-share-data-between-processes).
- **The \`__main__\` guard.** With the \`spawn\` and \`forkserver\` start methods each worker re-imports your main module; the pool must be created under [\`if __name__ == "__main__":\`](/interview-question/what-does-if-name-main-do). Linux used \`fork\` by default through 3.13; Python 3.14 changed the POSIX default to \`forkserver\`, and its docs say code that needs \`fork\` for a \`ProcessPoolExecutor\` must pass \`mp_context=multiprocessing.get_context("fork")\` ([multiprocessing docs](https://docs.python.org/3/library/multiprocessing.html)).

📌 **Interview term: \`chunksize\`** — a \`ProcessPoolExecutor.map()\` argument that sends inputs to workers in batches, cutting the number of pickle round trips. \`pool.map(is_prime, range(1000), chunksize=100)\` sent 10 batches and counted 168 primes. It has no effect on a thread pool.

📌 **Interview term: \`max_tasks_per_child\`** — added in Python 3.11: a worker process exits and is replaced after that many tasks, which contains memory leaks in long-running pools. The 3.12 source docstring says it needs a non-\`fork\` start method and defaults to \`spawn\` when given; example 3 shows two tasks landing in two different worker PIDs with \`max_tasks_per_child=1\`.

## 6. Choosing Between Them

| | \`ThreadPoolExecutor\` | \`ProcessPoolExecutor\` |
| :--- | :--- | :--- |
| Workers | Threads in this process | Separate processes |
| Memory | Shared with the caller | Separate; data is pickled both ways |
| Good for (GIL build) | Blocking I/O; C code that releases the GIL | CPU-bound pure Python |
| Start-up cost | Small (a thread) | Large (a process, an interpreter, imports) |
| Restrictions | Shared state needs locks | Picklable functions, args, results; \`__main__\` guard |
| Default \`max_workers\` | \`min(32, cpus + 4)\` | CPU count |
| Extra options | \`thread_name_prefix\`, \`initializer\` | \`mp_context\`, \`initializer\`, \`max_tasks_per_child\` (3.11+), \`chunksize\` in \`map\` |
| Browser (Pyodide) | Cannot start threads | Cannot start processes |

The general decision (and where asyncio fits) is in [when to use threading, multiprocessing, or asyncio](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio). Python 3.14 also added \`InterpreterPoolExecutor\`, a thread pool in which each worker runs its own sub-interpreter ([PEP 734](https://peps.python.org/pep-0734/)); we did not run it here, as our sandbox stops at 3.13.

## 7. Verified: Running the Code

Example 1 was run with \`python3.11\` and through the page Pyodide 0.25.1 harness with identical output; 3.12 and 3.13 printed the same. Examples 2 and 3 need OS threads and processes (in Pyodide, starting a thread pool raises \`RuntimeError: can't start new thread\`), so they are shown as code and were run on CPython 3.12; 3.11 and 3.13 printed the same. Timings are reported as \`True\`/\`False\` so the output does not depend on the machine.

**Example 1 — Future and Executor without threads:**

~~~text
new: False False False
set_running_or_notify_cancel: True
callback got 42
done: True result: 42
exception(): ZeroDivisionError('division by zero')
result() re-raised: division by zero
cancel pending: True cancelled: True
cancel running: False
map: [4, 9, 16]
submit: (3, 1)
submit: (2, 1)
submit: integer division or modulo by zero
as_completed count: 3
map raised: integer division or modulo by zero
~~~

**Example 2 — ThreadPoolExecutor (CPython 3.12):**

~~~text
map:          ['slow (io)', 'fast (io)', 'medium (io)']
ran in parallel: True
as_completed: ['fast', 'medium', 'slow']
first done: ['fast (io)'] still running: 2
exception stored: ValueError
result() raised: invalid literal for int() with base 10: 'x'
default max_workers formula: True
after shutdown(wait=True): True True
cancel_futures=True: False True
submit after shutdown: cannot schedule new futures after shutdown
~~~

**Example 3 — ProcessPoolExecutor (CPython 3.12):**

~~~text
primes per chunk: [5133, 4459, 4256, 4136]
total below 200000: 17984
ran outside the parent: True
chunksize=100: 168
worker error: bad input 7
lambda: PicklingError
parent COUNTER after 8 bumps in workers: 0
max_tasks_per_child=1 gave a fresh process: True
~~~

## 8. Common Pitfalls

- **Never calling \`result()\`.** An exception in a submitted task is stored in its Future; if nobody calls \`result()\` or \`exception()\`, the error disappears silently.
- **Expecting \`map()\` to stream in finishing order.** It yields in input order; one slow first item delays all output. Use \`submit()\` plus \`as_completed()\` for "first finished, first handled".
- **Tasks that wait on tasks in the same pool.** With all workers blocked in \`result()\` on work that needs a free worker, the pool deadlocks; the [concurrent.futures docs](https://docs.python.org/3/library/concurrent.futures.html) show this case. See [deadlocks](/interview-question/what-is-a-deadlock-in-python).
- **Process pools for tiny tasks.** Pickling each call costs more than the work; batch with \`chunksize\` or make each task bigger.
- **Lambdas, nested functions and open resources in a process pool.** They cannot be pickled; use top-level functions and pass file names, not file objects.
- **Thread pools for pure-Python CPU work.** On a GIL build they interleave on one core; use a process pool (or measure on a free-threaded build).

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The abstraction:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">concurrent.futures</code> (added in Python 3.2 by PEP 3148) gives one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Executor</code> interface: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit(fn, *args)</code> returns a <strong style="color:#ffca28;">Future</strong> at once, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map()</code> runs a function over iterables, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shutdown()</code> (or the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> block) waits for the work.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ThreadPoolExecutor:</strong> <span style="color:#f0e2c8;">Work items go on an in-process queue; worker threads are started lazily up to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_workers</code> and pull from it. Shared memory, no pickling. Best for blocking I/O on a GIL build.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. ProcessPoolExecutor:</strong> <span style="color:#f0e2c8;">Work items are pickled and sent to worker processes through a call queue; a manager thread in the parent reads the result queue and completes the Futures. Real CPU parallelism, but everything must be picklable and the pool lives under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if __name__ == "__main__":</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Getting results:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map()</code> yields results in <strong style="color:#ffca28;">input order</strong> and raises the first exception when you reach it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as_completed()</code> yields futures in <strong style="color:#ffca28;">completion order</strong>. A worker exception is stored in the Future and re-raised by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">result()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Defaults and lifecycle:</strong> <span style="color:#f0e2c8;">Thread pool default is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">min(32, cpu_count + 4)</code> workers (3.8+; 3.13 uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">os.process_cpu_count()</code>), process pool defaults to the CPU count. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shutdown(cancel_futures=True)</code> drops queued work; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tasks_per_child</code> (3.11+) recycles worker processes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">submit()</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">map()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When tasks are different functions or arguments, when you want results as they finish with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as_completed()</code>, per-task timeouts, cancellation or callbacks. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">map()</code> is the simple case: one function, many inputs, results in order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the lambda fail in a ProcessPoolExecutor?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The function is sent to the worker by pickling, and pickle stores functions by their importable name. A lambda or nested function has no such name, so on our runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">submit(lambda...)</code> ended in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PicklingError</code>. Define workers at module top level.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">chunksize</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ProcessPoolExecutor.map()</code> it sends inputs to workers in batches of that size, so a million tiny calls cost thousands of round trips instead of a million. The thread pool ignores it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a pool deadlock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. If a task submitted to the pool waits on the result of another task in the same pool and all workers are busy waiting, nothing can run. The docs show it with two tasks waiting on each other and with a single-worker pool that submits to itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does it fit with asyncio?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Any executor can be passed to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loop.run_in_executor(pool, fn, *args)</code>, which wraps the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">concurrent.futures.Future</code> in an awaitable asyncio future; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.to_thread</code> is the shortcut for the default thread pool.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Executor** | Object with \`submit\`/\`map\`/\`shutdown\` that runs callables elsewhere |
| **Future** | Placeholder for a result: pending, running, finished or cancelled |
| **Worker pool** | Reusable threads or processes taking jobs from a queue |
| **\`max_workers\` default** | Threads: \`min(32, cpus + 4)\`; processes: CPU count |
| **\`map()\` vs \`as_completed()\`** | Input order vs completion order |
| **\`shutdown()\`** | Stop accepting work; \`wait\` blocks, \`cancel_futures\` drops queued work |
| **\`chunksize\`** | Batch size for sending \`map()\` inputs to worker processes |
| **\`max_tasks_per_child\`** | Replace a worker process after N tasks (3.11+) |

---
**Conclusion:** Both pools share one design: \`submit()\` turns a call into a work item with a \`Future\`, puts it on a queue, and a worker later fills in the Future's result or exception; \`map()\` and \`as_completed()\` are two ways of collecting those Futures. The difference is where the worker lives. A \`ThreadPoolExecutor\` keeps everything in one process, so it is cheap and shares memory but, on a GIL build, only overlaps waiting. A \`ProcessPoolExecutor\` pickles each call to a separate interpreter, so it computes in parallel at the price of picklable code, copied data and the \`__main__\` guard. Pick by workload, always read your results, and keep tasks big enough to be worth sending.`,
    examples: [
      {
        label: `The Future and Executor API without threads: states, callbacks, errors, a minimal Executor`,
        code: `# The Future and Executor API without any threads, so it runs in the browser.
from concurrent.futures import Executor, Future, as_completed

# 1. A Future is a box for a result that will exist later.
f = Future()
print("new:", f.done(), f.running(), f.cancelled())
f.add_done_callback(lambda fut: print("callback got", fut.result()))
print("set_running_or_notify_cancel:", f.set_running_or_notify_cancel())
f.set_result(42)                 # what a worker thread does when it finishes
print("done:", f.done(), "result:", f.result())

# 2. An exception in the task is stored, then re-raised by result()
g = Future()
g.set_running_or_notify_cancel()
g.set_exception(ZeroDivisionError("division by zero"))
print("exception():", repr(g.exception()))
try:
    g.result()
except ZeroDivisionError as e:
    print("result() re-raised:", e)

# 3. Only a future that has not started yet can be cancelled
h = Future()
print("cancel pending:", h.cancel(), "cancelled:", h.cancelled())
r = Future()
r.set_running_or_notify_cancel()
print("cancel running:", r.cancel())

# 4. A minimal Executor: submit() runs the call now, in this thread.
#    Real pools put the call on a queue that worker threads or processes read.
class InlineExecutor(Executor):
    def submit(self, fn, /, *args, **kwargs):
        fut = Future()
        if fut.set_running_or_notify_cancel():
            try:
                fut.set_result(fn(*args, **kwargs))
            except BaseException as exc:
                fut.set_exception(exc)
        return fut

with InlineExecutor() as ex:
    # map() comes free from the Executor base class: built on submit()
    print("map:", list(ex.map(pow, [2, 3, 4], [2, 2, 2])))
    futs = [ex.submit(divmod, 7, d) for d in (2, 3, 0)]
    for fut in futs:
        print("submit:", fut.exception() or fut.result())
    print("as_completed count:", sum(1 for _ in as_completed(futs)))

# map() raises the first error when you reach that item
with InlineExecutor() as ex:
    try:
        print(list(ex.map(lambda x: 10 // x, [5, 0, 2])))
    except ZeroDivisionError as e:
        print("map raised:", e)
`,
      },
      {
        label: `ThreadPoolExecutor: map order, as_completed order, errors, defaults and shutdown (OS threads, not in the browser)`,
        code: `# ThreadPoolExecutor: submit, map order, as_completed order, errors, shutdown.
# Not runnable in the browser: needs OS threads.
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed, wait, FIRST_COMPLETED

def fetch(name, seconds):
    time.sleep(seconds)                 # a blocking I/O call releases the GIL
    return f"{name} ({threading.current_thread().name.split('_')[0]})"

jobs = [("slow", 0.3), ("fast", 0.1), ("medium", 0.2)]

with ThreadPoolExecutor(max_workers=3, thread_name_prefix="io") as pool:
    start = time.perf_counter()
    # map: results come back in INPUT order, whatever finishes first
    print("map:         ", list(pool.map(fetch, *zip(*jobs))))
    print("ran in parallel:", time.perf_counter() - start < 0.5)

    # as_completed: futures come back in COMPLETION order
    futures = {pool.submit(fetch, n, s): n for n, s in jobs}
    print("as_completed:", [futures[f] for f in as_completed(futures)])

    # wait: block until the first one finishes
    futs = [pool.submit(fetch, n, s) for n, s in jobs]
    done, not_done = wait(futs, return_when=FIRST_COMPLETED)
    print("first done:", [f.result() for f in done], "still running:", len(not_done))

# Exceptions are captured in the Future and re-raised by result()
def parse(text):
    return int(text)

with ThreadPoolExecutor(2) as pool:
    fut = pool.submit(parse, "x")
    print("exception stored:", type(fut.exception()).__name__)
    try:
        fut.result()
    except ValueError as e:
        print("result() raised:", e)

# The default pool size (3.13+: os.process_cpu_count() instead of os.cpu_count())
count = getattr(os, "process_cpu_count", os.cpu_count)() or 1
# (_max_workers is a private attribute, read here only to show the default)
print("default max_workers formula:", min(32, count + 4) == ThreadPoolExecutor()._max_workers)

# Leaving the with-block calls shutdown(wait=True): it waits for running work
pool = ThreadPoolExecutor(1)
f1 = pool.submit(time.sleep, 0.2)
f2 = pool.submit(time.sleep, 0.2)
pool.shutdown(wait=True, cancel_futures=False)
print("after shutdown(wait=True):", f1.done(), f2.done())

pool = ThreadPoolExecutor(1)
f1 = pool.submit(time.sleep, 0.2)
f2 = pool.submit(time.sleep, 0.2)        # still queued behind f1
time.sleep(0.05)                         # let the worker pick up f1
pool.shutdown(wait=True, cancel_futures=True)
print("cancel_futures=True:", f1.cancelled(), f2.cancelled())
try:
    pool.submit(print, "too late")
except RuntimeError as e:
    print("submit after shutdown:", e)
`,
        runnable: false,
        python: "3.12",
      },
      {
        label: `ProcessPoolExecutor: parallel CPU work, pickling, isolated globals, max_tasks_per_child (OS processes, not in the browser)`,
        code: `# ProcessPoolExecutor: real parallel CPU work, and the pickling rules.
# Not runnable in the browser: needs OS processes.
import math
import os
from concurrent.futures import ProcessPoolExecutor

def is_prime(n):
    if n < 2:
        return False
    for d in range(2, math.isqrt(n) + 1):
        if n % d == 0:
            return False
    return True

def count_primes(bounds):
    lo, hi = bounds
    return sum(1 for n in range(lo, hi) if is_prime(n))

def worker_pid(_):
    return os.getpid()

COUNTER = 0

def bump(_):
    global COUNTER
    COUNTER += 1          # changes the WORKER copy of the module
    return COUNTER

def fails(x):
    raise ValueError(f"bad input {x}")

if __name__ == "__main__":       # required: spawn and forkserver re-import this file
    chunks = [(i, i + 50_000) for i in range(0, 200_000, 50_000)]
    with ProcessPoolExecutor(max_workers=4) as pool:
        print("primes per chunk:", list(pool.map(count_primes, chunks)))
        print("total below 200000:", sum(pool.map(count_primes, chunks)))

        pids = set(pool.map(worker_pid, range(8)))
        print("ran outside the parent:", os.getpid() not in pids)

        # chunksize batches many small calls into one round trip per batch
        print("chunksize=100:", sum(pool.map(is_prime, range(1000), chunksize=100)))

        # an exception in a worker is pickled back and re-raised here
        try:
            pool.submit(fails, 7).result()
        except ValueError as e:
            print("worker error:", e)

        # arguments and functions travel by pickle: a lambda cannot
        try:
            pool.submit(lambda x: x * 2, 21).result()
        except Exception as e:
            print("lambda:", type(e).__name__)

        # globals are not shared: each worker process has its own copy
        list(pool.map(bump, range(8)))
        print("parent COUNTER after 8 bumps in workers:", COUNTER)

    # max_tasks_per_child (3.11+) replaces a worker after N tasks
    with ProcessPoolExecutor(max_workers=1, max_tasks_per_child=1) as pool:
        a = pool.submit(worker_pid, None).result()
        b = pool.submit(worker_pid, None).result()
        print("max_tasks_per_child=1 gave a fresh process:", a != b)
`,
        runnable: false,
        python: "3.12",
      },
    ],
  },
];

export default augments;
