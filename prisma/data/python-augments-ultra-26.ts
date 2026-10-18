/**
 * PYTHON ULTRA — batch 26: Concurrency II — how multiprocessing shares data, the free-threaded
 * (no-GIL) build, processes vs free-threaded threads, how async/await works, and how the
 * asyncio event loop schedules coroutines.
 * Every example was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts (examples marked runnable: false ran on the CPython
 * version in their python field); quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does multiprocessing share data between processes?`,
    difficulty: "hard",
    seoDescription: `How Python processes share data: pickled copies over Queue and Pipe, shared Value and Array, SharedMemory, Managers, start methods and pitfalls.`,
    description: `**Question presented to candidate:**
"Threads in one Python process can all see the same list. Separate processes cannot. So when you use \`multiprocessing\`, how does data actually get from one process to another — and when would you pick a queue, a shared \`Value\`, \`shared_memory\` or a \`Manager\`?"

**What a strong answer should cover:**
- Each process has its own memory (address space), so by default nothing is shared: arguments, queue items and return values are **pickled**, sent over a pipe, and unpickled as a **copy** on the other side. Mutating the copy never changes the original, and unpicklable objects (lambdas, locks, generators, open sockets) cannot be sent at all.
- Message passing with \`Queue\` (many producers/consumers, a feeder thread plus a pipe underneath) and \`Pipe\` (two connected ends) is the default, safest design.
- Real shared memory: \`Value\` / \`Array\` (ctypes objects in shared memory, with a lock for read-modify-write) and \`multiprocessing.shared_memory.SharedMemory\` (raw named bytes, zero-copy, added in 3.8, with \`close()\` per process and exactly one \`unlink()\`).
- \`Manager\` objects: a server process owns the real dict/list and others call it through proxies — flexible but every operation is a round trip, and mutating a nested object through a proxy is silently lost.
- Start methods matter: \`fork\` copies the parent (copy-on-write), \`spawn\` starts a fresh interpreter and re-imports the main module (hence \`if __name__ == "__main__":\`), \`forkserver\` forks from a clean server; Linux defaults to \`fork\` up to 3.13 and to \`forkserver\` from 3.14, macOS and Windows use \`spawn\`.

**Clarifying questions expected:**
- How big is the data, and is it read-only or updated by many workers?
- Which OS and Python version (it decides the default start method)?

**Code / implementation expected:** Optional — a worker fed by a \`Queue\`, or a counter in a \`Value\` guarded by its lock.`,
    answer: `**Target Audience:** Python developers who have used threads or \`concurrent.futures\` and want to know what really happens to their data when work moves to another process.
**Difficulty:** Hard
**Python version:** The pickling example runs in the page on Pyodide 0.25.1 (CPython 3.11.3) and was checked on CPython 3.11. The process examples need real processes, so they were run on CPython 3.12 (and gave identical output on 3.13) on Linux.

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

Picture two chefs working in **two different houses**. Each has a private kitchen, private fridge, private notebook. If chef A writes "add salt" in her notebook, chef B never sees it — the notebook is in another house.

So how do they work together? There are only a few ways:

1. **Post a photocopy.** Chef A photocopies a recipe and mails it. Chef B gets a perfect copy — but if he scribbles on it, A's original does not change. Some things cannot be photocopied at all (you cannot mail a running oven).
2. **Rent a shared whiteboard** in a building between the houses. Both chefs can read and write it directly, instantly — but if both write at the same moment, they scribble over each other unless they take turns with a marker (a lock).
3. **Phone a librarian** who keeps the one real book. Anyone can ask "what is on page 3?" or "please write X on page 5". Easy to use, but every question is a phone call, so it is slow.

Python processes are those chefs. Option 1 is **pickling** through a \`Queue\` or \`Pipe\` (the default for everything). Option 2 is **shared memory** (\`Value\`, \`Array\`, \`SharedMemory\`). Option 3 is a **\`Manager\`**. Knowing which one you are using — and that option 1 is a *copy* — is what this question is really about.

## 2. Processes Do Not Share Memory

A **process** is a running program with its own private memory. Threads live *inside* one process and share its memory, which is why two threads can both append to the same list. Two processes cannot: the operating system gives each one its own view of memory.

📌 **Interview term: Address space** — the range of memory addresses a process can see. Each process gets its own; the same address in two processes points at different physical memory. This isolation is what makes processes safe (one cannot corrupt another) and what makes sharing data explicit work.

📌 **Interview term: IPC (inter-process communication)** — any mechanism the OS provides for processes to exchange data: pipes, sockets, shared memory segments, files. Everything in \`multiprocessing\` is built on one of these.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 250" role="img" aria-label="Two processes each with a private heap; an object is pickled to bytes, sent through a pipe, and rebuilt as a separate copy">
  <defs>
    <marker id="py26q1-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="200" height="190" rx="12"/>
  <text class="d-text" x="120" y="58" text-anchor="middle">Parent process</text>
  <rect class="d-box-accent" x="50" y="90" width="140" height="50" rx="8"/>
  <text class="d-text" x="120" y="120" text-anchor="middle">config dict</text>
  <text class="d-sub" x="120" y="180" text-anchor="middle">private heap</text>
  <rect class="d-box-muted" x="280" y="95" width="160" height="40" rx="8"/>
  <text class="d-text" x="360" y="120" text-anchor="middle">pipe: bytes</text>
  <rect class="d-box" x="500" y="30" width="200" height="190" rx="12"/>
  <text class="d-text" x="600" y="58" text-anchor="middle">Worker process</text>
  <rect class="d-box-accent" x="530" y="90" width="140" height="50" rx="8"/>
  <text class="d-text" x="600" y="120" text-anchor="middle">a new copy</text>
  <text class="d-sub" x="600" y="180" text-anchor="middle">private heap</text>
  <path class="d-edge-accent" d="M 192 115 L 274 115" marker-end="url(#py26q1-a1)"/>
  <path class="d-edge-accent" d="M 442 115 L 524 115" marker-end="url(#py26q1-a1)"/>
  <text class="d-sub" x="234" y="100" text-anchor="middle">dumps</text>
  <text class="d-sub" x="484" y="100" text-anchor="middle">loads</text>
</svg>

The worker never sees the parent object; it sees bytes, and builds a brand-new object from them.

## 3. The Default: Everything Is a Pickled Copy

When you write \`pool.map(f, items)\`, \`Process(target=f, args=(x,))\` or \`queue.put(x)\`, \`multiprocessing\` calls \`pickle.dumps(x)\`, writes the bytes to a pipe, and the other side calls \`pickle.loads(...)\`. Return values travel back the same way. (Pickling itself, and why you must never unpickle untrusted data, is covered in [what pickling is and its risks](/interview-question/what-is-pickling-and-what-are-its-risks).)

📌 **Interview term: Serialization (pickling)** — turning an object graph into a flat byte string (\`pickle.dumps\`) and rebuilding an equal object from it (\`pickle.loads\`). The rebuilt object is equal (\`==\`) but not the same object (\`is\` is \`False\`).

Example 1 does exactly what a worker would receive, without starting a process, so it runs in the page:

~~~python
config = {"name": "job-7", "tags": ["a", "b"], "limits": (10, 20)}
wire = pickle.dumps(config)
received = pickle.loads(wire)
received["tags"].append("changed-in-worker")
print(config["tags"])     # ['a', 'b']  -- the parent never sees the change
~~~

Three consequences fall straight out of this:

- **Workers cannot update your objects.** A worker that appends to a list it received appends to its own copy. If you need the result, *return it* (or put it on a queue).
- **Some things cannot be sent.** In Example 1 a lambda raised \`PicklingError\`, a generator raised \`TypeError: cannot pickle 'generator' object\`, and a \`threading.Lock\` raised \`TypeError: cannot pickle '_thread.lock' object\`. Functions are pickled *by name* (module plus qualified name), so a worker can only call a function it can import — module-level functions work, lambdas and nested functions do not.
- **Copying costs time and memory.** A list of 100,000 ints pickled to 368,931 bytes on our run. Send that to every task and you pay that on every task — the "process tax" discussed in [multiprocessing vs free-threaded threads](/interview-question/when-should-you-still-use-multiprocessing-vs-free-threaded-threads-in-python-3-1).

## 4. Message Passing: \`Queue\` and \`Pipe\`

Message passing means processes never touch the same memory; they only send each other messages (pickled copies). It is the safest design because there is no shared state to race on.

📌 **Interview term: Message passing** — sharing by communicating: each process owns its data and sends copies to others, instead of several processes writing to one shared location.

- **\`multiprocessing.Pipe()\`** returns two connected \`Connection\` objects. With the default \`duplex=True\` both ends can \`send()\` and \`recv()\`. It is the lowest-level, fastest option for exactly two parties.
- **\`multiprocessing.Queue()\`** is a process-safe FIFO for any number of producers and consumers. Under the hood it is a pipe plus a lock plus a **feeder thread**: \`put()\` drops the object in a local buffer and returns immediately, and a background thread (started by \`Queue._start_thread\` in CPython \`multiprocessing/queues.py\`) pickles it and writes it to the pipe. That is why \`put()\` does not block on a slow reader, and why an object mutated right after \`put()\` may be sent in its mutated state.

Example 2 sends five numbers through a \`Queue\` and gets squares back, and does a request/response over a \`Pipe\`. The worker loops on \`iter(inbox.get, None)\`, with \`None\` as a **sentinel** that means "stop":

~~~python
def square_worker(inbox, outbox):
    for n in iter(inbox.get, None):          # None is the stop sentinel
        outbox.put((n, n * n))
~~~

Results arrive in whatever order workers finish, which is why the example sorts them before printing.

## 5. Real Shared Memory I: \`Value\` and \`Array\`

Sometimes copying is too slow — many workers updating one counter, or a big numeric buffer. \`multiprocessing.Value(typecode, initial)\` and \`multiprocessing.Array(typecode, size)\` allocate a **ctypes** object (a C \`int\`, \`double\`, ...) inside a shared memory block that every child process maps. A write by one process is visible to all of them immediately; nothing is pickled.

📌 **Interview term: Shared memory** — a block of physical memory mapped into several address spaces at once, so all processes read and write the same bytes. Fast (no copy), but you are back to the classic problems of shared state: races and the need for locks.

The typecode is an \`array\`-module style letter: \`"i"\` is a C int, \`"d"\` a C double. By default \`Value\` is wrapped in a \`Synchronized\` object with its own lock (\`v.get_lock()\` returned an \`RLock\` on our run); \`RawValue\` / \`RawArray\` skip the lock.

The lock matters because \`counter.value += 1\` is **read, add, write** — three steps. Two processes can both read 41 and both write 42. With the lock, Example 2 printed exactly \`locked counter: 20000\` (4 processes × 5,000). We also ran the same code *without* the lock three times: it gave 16,108, then 20,000, then 20,000. The lost updates do not happen every run, which is exactly what makes races dangerous (see [race conditions and locks](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it)).

~~~python
def add_locked(counter, times):
    for _ in range(times):
        with counter.get_lock():             # Value carries its own lock
            counter.value += 1
~~~

## 6. Real Shared Memory II: \`multiprocessing.shared_memory\`

\`multiprocessing.shared_memory\` was added in Python 3.8 ([docs](https://docs.python.org/3.8/library/multiprocessing.shared_memory.html)). \`SharedMemory(create=True, size=n)\` creates a **named** block of raw bytes; any other process attaches with \`SharedMemory(name=...)\`. Its \`.buf\` is a \`memoryview\`, so you choose the layout yourself — with \`struct\`, with \`array\`, or (very commonly) by building a NumPy array on top of the buffer so many processes work on one big array with zero copies.

📌 **Interview term: Zero-copy** — handing over access to existing bytes instead of duplicating them. Only the block *name* (a short string) is pickled and sent; the data stays where it is.

Lifecycle is the part interviewers probe:

- Every process that opened the block calls **\`close()\`** when done (it detaches its mapping).
- Exactly **one** process — normally the creator — calls **\`unlink()\`**, which asks the OS to free the block. Forget it and the memory can outlive your program; call it twice and the second call fails.

\`ShareableList([...])\` is a convenience on top: a fixed-length list of \`int\`, \`float\`, \`bool\`, \`str\`, \`bytes\` or \`None\`. It cannot grow (\`'ShareableList' object has no attribute 'append'\` on our run), and each \`str\` slot keeps its original storage size — assigning a much longer string raised \`ValueError: bytes/str item exceeds available storage\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Parent and worker both map the same named shared memory block; only the name travels between them">
  <defs>
    <marker id="py26q1-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="190" height="70" rx="10"/>
  <text class="d-text" x="115" y="60" text-anchor="middle">Parent</text>
  <text class="d-sub" x="115" y="82" text-anchor="middle">create, later unlink</text>
  <rect class="d-box" x="510" y="30" width="190" height="70" rx="10"/>
  <text class="d-text" x="605" y="60" text-anchor="middle">Worker</text>
  <text class="d-sub" x="605" y="82" text-anchor="middle">attach by name, close</text>
  <rect class="d-box-accent" x="210" y="170" width="300" height="60" rx="10"/>
  <text class="d-text" x="360" y="196" text-anchor="middle">named block of bytes</text>
  <text class="d-sub" x="360" y="216" text-anchor="middle">one physical copy</text>
  <path class="d-edge-dashed" d="M 214 60 L 504 60" marker-end="url(#py26q1-a2)"/>
  <text class="d-sub" x="360" y="48" text-anchor="middle">only the name is pickled</text>
  <path class="d-edge-accent" d="M 115 104 L 260 164" marker-end="url(#py26q1-a2)"/>
  <path class="d-edge-accent" d="M 605 104 L 460 164" marker-end="url(#py26q1-a2)"/>
</svg>

Both processes read and write the same bytes; there is still no lock, so concurrent writers to the same slots need one (for example a \`multiprocessing.Lock\` passed to both).

## 7. Managers: One Process Owns the Objects

\`multiprocessing.Manager()\` starts a **server process** that holds real Python objects (\`dict\`, \`list\`, \`Namespace\`, \`Lock\`, \`Queue\`, ...). What you pass to workers is a **proxy**. Every method call on a proxy — \`d["k"] = v\`, \`log.append(x)\` — is pickled, sent to the manager, executed there, and the result is pickled back.

📌 **Interview term: Proxy object** — a stand-in that forwards each operation to the real object living in another process. Example 3 printed \`proxy type: DictProxy\`.

Two consequences:

- **It is flexible but slow.** Any picklable value can go in, and it even works across machines, but each operation is a round trip — far slower than a local dict or shared memory. Use it for coordination and small state, not hot loops.
- **Nested mutation is lost.** \`d["nested"]["x"] = 99\` *reads* a copy of the inner dict from the manager, changes the copy, and throws it away. Example 3 shows the manager ended with \`{'nested': {'y': 1}, ...}\` — the \`x\` write vanished; only the version that reassigned \`d["nested"] = inner\` stuck.

## 8. Start Methods: How the Child Gets Its Memory in the First Place

How a child process is born decides what it already has in memory.

| Start method | How the child is created | What the child starts with | Default on |
| :--- | :--- | :--- | :--- |
| \`fork\` | \`os.fork()\` duplicates the parent | A copy-on-write image of the whole parent: globals, imported modules, data | Linux and other POSIX up to 3.13 |
| \`spawn\` | Starts a fresh Python interpreter | Nothing: it re-imports your main module, then unpickles the target and args | Windows; macOS since 3.8 |
| \`forkserver\` | A clean helper process is started once; children are forked from it | A copy of the small, single-threaded server, not of your parent | Linux and other POSIX since 3.14 |

The defaults come from the [multiprocessing docs](https://docs.python.org/3/library/multiprocessing.html): macOS switched to \`spawn\` in 3.8 because \`fork\` can crash there, and POSIX platforms switched from \`fork\` to \`forkserver\` in 3.14 (gh-84559) "to retain the performance but avoid common multithreaded process incompatibilities". On our Linux machine \`multiprocessing.get_start_method()\` printed \`fork\` on both 3.12 and 3.13.

📌 **Interview term: Copy-on-write (COW)** — after \`fork\`, parent and child share the same physical memory pages until one of them writes to a page; only then is that page copied. It makes \`fork\` fast and lets children *read* the parent large data for free. In CPython the saving is weaker than it sounds: even reading an object updates its reference count, which writes to its page and triggers a copy.

Practical rules:

- **\`spawn\` re-runs your module top level** in every child. Without the \`if __name__ == "__main__":\` guard, a spawned child would try to start processes itself. We saw this directly: a script with a top-level \`print\` printed it once per spawned worker, and a 2-worker \`forkserver\` pool on 3.12 printed it three times instead of once — the main module is imported again on the child side. (See [what if __name__ == "__main__" does](/interview-question/what-does-if-name-main-do).)
- **\`fork\` plus threads is risky**: if another thread holds a lock at the moment of the fork, the child inherits the lock in the locked state with no thread to release it. Since 3.12, \`os.fork()\` emits a warning when it detects other threads; on our 3.12 run it printed \`DeprecationWarning: This process (pid=...) is multi-threaded, use of fork() may lead to deadlock\`.
- **Be explicit** in code that must behave the same everywhere: \`ctx = multiprocessing.get_context("spawn")\` and create \`ctx.Process\`, \`ctx.Queue\`, \`ctx.Value\` from it. Examples 2 and 3 do this, which is why they print \`start method: spawn\` on any OS.

## 9. The Examples

**Example 1 (runs in the page)** — the pickled-copy behaviour, the objects that cannot be pickled, payload sizes, and a \`bytearray\` + \`struct\` model of what a shared memory buffer gives you.

**Example 2 (CPython 3.12)** — \`Queue\`, \`Pipe\`, a locked \`Value\` and an \`Array\` across real processes.

**Example 3 (CPython 3.12)** — \`SharedMemory\` with \`struct\`, \`ShareableList\`, and a \`Manager\` dict and list, including the lost nested write.

Examples 2 and 3 start real processes, which a browser cannot do, so they are shown as code with an "Open in playground" button.

## 10. Verified: Running the Code

Example 1 on CPython 3.11 and in the page on Pyodide 0.25.1 (same output in both):

~~~text
True
False
bytes True
['a', 'b']
lambda    -> PicklingError
generator -> TypeError
lock      -> TypeError
list of      10 ints pickles to      36 bytes
list of   1,000 ints pickles to   2,760 bytes
list of 100,000 ints pickles to 368,931 bytes
(7, -3, 2.5)
16
~~~

Example 2 on CPython 3.12 (3.13 printed the same):

~~~text
start method: spawn
queue results: [(0, 0), (1, 1), (2, 4), (3, 9), (4, 16)]
pipe reply: {'echo': 'hello', 'len': 5}
locked counter: 20000
shared array: [0.0, 10.0, 20.0, 30.0, 40.0, 50.0]
exit codes: [0, 0]
~~~

Example 3 on CPython 3.12 (3.13 printed the same):

~~~text
after worker: [15.0, 20.0, 32.5, 40.0]
block size >= 32: True
shareable list: [42, 3.5, 'done']
manager dict: {'nested': {'y': 1}, 'worker': 'was here'}
manager list: ['appended via proxy']
proxy type: DictProxy
~~~

What to notice:

- \`received is config\` is \`False\` and the parent \`tags\` stay \`['a', 'b']\`: workers get copies.
- \`list of 100,000 ints pickles to 368,931 bytes\` — the copy cost scales with your data.
- \`locked counter: 20000\` is exact only because of \`get_lock()\`.
- \`after worker: [15.0, 20.0, 32.5, 40.0]\` — the worker multiplied the parent numbers in place; nothing was sent back.
- \`manager dict\` has no \`x\` inside \`nested\`: that write went to a temporary copy.

## 11. Which Mechanism When

| Mechanism | Copies data? | Types it holds | Speed | Synchronisation | Use it for |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Arguments / return values | Yes (pickle) | Anything picklable | Fine for small data | None needed | Pool tasks: send input, return output |
| \`Queue\` | Yes (pickle) | Anything picklable | Good | Built in | Producer/consumer pipelines, many workers |
| \`Pipe\` | Yes (pickle) | Anything picklable | Fastest message option | Two ends only | Request/response between two processes |
| \`Value\` / \`Array\` | No | C scalars and arrays | Very fast | Optional built-in lock | Counters, flags, small numeric buffers |
| \`SharedMemory\` | No (only the name) | Raw bytes you lay out | Fastest for big data | None — bring a lock | Large arrays (often NumPy) shared by workers |
| \`Manager\` proxies | Yes, per operation | Any picklable, dict/list/... | Slowest | Built in per call | Shared config, coordination, small state |

## 12. Edge Cases

- **Big read-only data with \`fork\`.** Children inherit it for free via copy-on-write (no pickling), as long as it was created *before* the pool started. With \`spawn\`, use a pool \`initializer\` that loads it once per worker, or put it in \`SharedMemory\`.
- **Results and exceptions travel back pickled too.** A worker exception is pickled and re-raised in the parent; an exception type that cannot be pickled turns into a confusing error.
- **Queues and joins can deadlock.** A process that has put items on a \`Queue\` will not exit until its feeder thread has flushed them, so \`join()\`-ing a producer before draining the queue can hang. Drain first, then join (Example 2 reads all five results before \`p.join()\`).
- **Threads inside a forked child.** Only the thread that called \`fork\` exists in the child; any other thread is gone, along with any lock it held.

## Common Pitfalls

- **Expecting a worker to modify your object.** It modifies a pickled copy. Return results or use shared memory explicitly.
- **Passing a lambda or nested function to a pool.** It is pickled by name and fails; define worker functions at module level.
- **Forgetting the \`__main__\` guard** on Windows/macOS (and on Linux from 3.14 with \`forkserver\`), so child processes re-run the startup code.
- **Unlocked read-modify-write on a \`Value\`.** \`v.value += 1\` races; wrap it in \`with v.get_lock():\`.
- **Leaking \`SharedMemory\`.** Every user calls \`close()\`, exactly one calls \`unlink()\`; use \`try/finally\` or a \`SharedMemoryManager\`.
- **Mutating nested objects through a \`Manager\` proxy** and wondering why the change is gone — reassign the outer key.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core fact:</strong> <span style="color:#f0e2c8;">Processes do not share memory. By default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiprocessing</code> pickles every argument, queue item and return value, sends the bytes over a pipe and rebuilds a <strong style="color:#ffca28;">copy</strong> on the other side.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Message passing:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Queue</code> (many producers and consumers, a pipe plus a feeder thread) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Pipe</code> (two ends) are the default and safest designs: no shared state, so no races.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Real sharing:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Value</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array</code> put C types in shared memory with an optional lock; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shared_memory.SharedMemory</code> (3.8+) is a named raw block, zero-copy, often wrapped by NumPy; every process calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close()</code>, one calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unlink()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Managers:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Manager</code> server process owns real dicts and lists; workers get proxies. Flexible, but every call is a round trip, and nested mutations through a proxy are lost.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Start methods:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fork</code> copies the parent copy-on-write, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spawn</code> re-imports the main module (hence the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__main__</code> guard), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forkserver</code> forks a clean helper; Linux moved from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fork</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">forkserver</code> in 3.14.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my worker not see changes the parent made after starting it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The child got its own copy at start-up (pickled args, or a forked memory image). Later changes in the parent live in the parent address space only; send them over a queue or keep that state in shared memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I not pass a lambda to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Pool.map</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Functions are pickled by reference — module plus qualified name — and the child imports them. A lambda has no importable name, so pickling raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PicklingError</code>. Use a module-level function or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">functools.partial</code> of one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you share a 2 GB NumPy array with 8 workers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not pass it as an argument (8 pickled copies). Create a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SharedMemory</code> block, copy the array in once, send workers only the block name, shape and dtype, and have each build an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ndarray</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shm.buf</code>. Read-only data can also be inherited via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fork</code> copy-on-write.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Value</code> safe without a lock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Single reads or writes of a C int are fine, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">v.value += 1</code> is read, add, write. In our run four unlocked processes doing 5,000 increments each once ended at 16,108 instead of 20,000. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with v.get_lock():</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Manager</code> the right choice?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the state is small, irregular (dicts, lists, nested values) or must be shared between unrelated processes or machines, and when the number of operations is low. For hot counters or big arrays it is the slowest option.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Address space | The private memory view each process gets; the reason processes share nothing by default. |
| IPC | Inter-process communication: pipes, sockets, shared memory, files. |
| Serialization (pickling) | Turning objects into bytes and back; the receiver gets an equal but separate copy. |
| Message passing | Sharing by sending copies (\`Queue\`, \`Pipe\`) instead of writing shared state. |
| Shared memory | One block of memory mapped into several processes; fast, but needs locks. |
| Zero-copy | Sharing access to existing bytes; only a name or handle is sent. |
| Proxy object | A stand-in that forwards each operation to the real object in a manager process. |
| Copy-on-write (COW) | After \`fork\`, pages are shared until written; weakened in CPython by reference count writes. |

**Conclusion:** Processes are separate address spaces, so \`multiprocessing\` makes every bit of sharing explicit. The default is a pickled copy over a pipe — simple, safe, but paid for in serialisation time and memory, and blind to later changes. When copying is too expensive, use real shared memory (\`Value\`/\`Array\` for small typed values, \`SharedMemory\` for large buffers) and bring your own locking; when you need flexible shared objects and can afford a round trip per operation, use a \`Manager\`. Pick the start method deliberately, guard your entry point with \`if __name__ == "__main__":\`, and you can explain exactly where every byte lives. For choosing between processes, threads and asyncio at all, see [when to use threading, multiprocessing or asyncio](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio) and [ThreadPoolExecutor and ProcessPoolExecutor](/interview-question/how-do-threadpoolexecutor-and-processpoolexecutor-work).`,
    examples: [
      {
        label: `What crosses a process boundary: pickled copies, unpicklable objects, raw bytes`,
        code: `# What actually crosses a process boundary: a pickled COPY.
# multiprocessing pickles every argument, queue item and return value,
# so this round trip is exactly what a worker process would receive.
import pickle
import struct

config = {"name": "job-7", "tags": ["a", "b"], "limits": (10, 20)}
wire = pickle.dumps(config)
received = pickle.loads(wire)

print(received == config)
print(received is config)  # False
print(type(wire).__name__, len(wire) > 0)  # bytes True

# The worker mutates ITS copy. The parent never sees it.
received["tags"].append("changed-in-worker")
print(config["tags"])  # ['a', 'b']

# Things that cannot be pickled cannot be sent to another process.
import threading
candidates = {
    "lambda": lambda x: x + 1,
    "generator": (n for n in range(3)),
    "lock": threading.Lock(),
}
for label, obj in candidates.items():
    try:
        pickle.dumps(obj)
        print(f"{label:9} -> ok")
    except Exception as exc:
        print(f"{label:9} -> {type(exc).__name__}")

# Payload size grows with the data: this is the copy cost you pay per task.
for n in (10, 1_000, 100_000):
    print(f"list of {n:>7,} ints pickles to {len(pickle.dumps(list(range(n)))):>7,} bytes")

# Shared memory is only raw bytes; YOU choose the layout.
# A bytearray plus struct models what SharedMemory.buf gives you.
block = bytearray(16)
view = memoryview(block)
struct.pack_into("<iid", view, 0, 7, -3, 2.5)
print(struct.unpack_from("<iid", view, 0))  # (7, -3, 2.5)
print(len(block))  # 16`,
      },
      {
        label: `Queue, Pipe, Value and Array across real processes`,
        runnable: false,
        python: "3.12",
        code: `# Message passing (Queue, Pipe) and shared ctypes (Value, Array).
# Needs real processes, so it runs on CPython, not in the browser.
import multiprocessing as mp


def square_worker(inbox, outbox):
    # Each item arrives as a pickled copy; the result goes back the same way.
    for n in iter(inbox.get, None):          # None is the stop sentinel
        outbox.put((n, n * n))


def pipe_worker(conn):
    msg = conn.recv()
    conn.send({"echo": msg, "len": len(msg)})
    conn.close()


def add_locked(counter, times):
    for _ in range(times):
        with counter.get_lock():             # Value carries its own lock
            counter.value += 1


def fill(arr, start, step):
    for i in range(start, len(arr), step):
        arr[i] = i * 10                      # writes land in shared memory


if __name__ == "__main__":
    ctx = mp.get_context("spawn")            # same behaviour on every OS
    print("start method:", ctx.get_start_method())

    # 1. Queue: many items, one direction per queue
    inbox, outbox = ctx.Queue(), ctx.Queue()
    p = ctx.Process(target=square_worker, args=(inbox, outbox))
    p.start()
    for n in range(5):
        inbox.put(n)
    inbox.put(None)
    results = sorted(outbox.get() for _ in range(5))
    p.join()
    print("queue results:", results)

    # 2. Pipe: two connected ends, request/response
    parent_end, child_end = ctx.Pipe()
    p = ctx.Process(target=pipe_worker, args=(child_end,))
    p.start()
    parent_end.send("hello")
    print("pipe reply:", parent_end.recv())
    p.join()

    # 3. Value: one shared C int, 4 processes, guarded by its lock
    counter = ctx.Value("i", 0)
    workers = [ctx.Process(target=add_locked, args=(counter, 5_000)) for _ in range(4)]
    for w in workers:
        w.start()
    for w in workers:
        w.join()
    print("locked counter:", counter.value)

    # 4. Array: shared C doubles, two processes fill alternate slots
    arr = ctx.Array("d", 6)
    workers = [ctx.Process(target=fill, args=(arr, k, 2)) for k in (0, 1)]
    for w in workers:
        w.start()
    for w in workers:
        w.join()
    print("shared array:", list(arr))
    print("exit codes:", [w.exitcode for w in workers])`,
      },
      {
        label: `SharedMemory, ShareableList and a Manager proxy`,
        runnable: false,
        python: "3.12",
        code: `# SharedMemory (zero-copy bytes), ShareableList, and a Manager proxy.
import multiprocessing as mp
import struct
from multiprocessing import shared_memory


def scale_in_place(name, count, factor):
    # Attach to the existing block BY NAME: no data is copied.
    shm = shared_memory.SharedMemory(name=name)
    try:
        for i in range(count):
            (x,) = struct.unpack_from("<d", shm.buf, i * 8)
            struct.pack_into("<d", shm.buf, i * 8, x * factor)
    finally:
        shm.close()                          # detach, do NOT unlink here


def bump_list(name):
    sl = shared_memory.ShareableList(name=name)
    sl[0] = sl[0] + 1
    sl[2] = "done"                           # must fit the original slot size
    sl.shm.close()


def use_manager(d, log):
    d["worker"] = "was here"                 # proxy call -> manager process
    log.append("appended via proxy")
    d["nested"]["x"] = 99                    # mutates a COPY, then lost
    inner = d["nested"]
    inner["y"] = 1
    d["nested"] = inner                      # reassign so the manager stores it


if __name__ == "__main__":
    ctx = mp.get_context("spawn")

    # 1. Raw shared memory: 4 doubles = 32 bytes
    values = [1.5, 2.0, 3.25, 4.0]
    shm = shared_memory.SharedMemory(create=True, size=8 * len(values))
    try:
        for i, v in enumerate(values):
            struct.pack_into("<d", shm.buf, i * 8, v)
        p = ctx.Process(target=scale_in_place, args=(shm.name, len(values), 10))
        p.start(); p.join()
        print("after worker:", [struct.unpack_from("<d", shm.buf, i * 8)[0] for i in range(4)])
        print("block size >= 32:", shm.size >= 32)
    finally:
        shm.close()
        shm.unlink()                         # the creator frees it exactly once

    # 2. ShareableList: fixed-length list of int/float/str/bytes/bool/None
    sl = shared_memory.ShareableList([41, 3.5, "pending"])
    try:
        p = ctx.Process(target=bump_list, args=(sl.shm.name,))
        p.start(); p.join()
        print("shareable list:", list(sl))
    finally:
        sl.shm.close()
        sl.shm.unlink()

    # 3. Manager: a server process owns real objects, others hold proxies
    with ctx.Manager() as manager:
        d = manager.dict({"nested": {}})
        log = manager.list()
        p = ctx.Process(target=use_manager, args=(d, log))
        p.start(); p.join()
        print("manager dict:", dict(sorted(d.items())))
        print("manager list:", list(log))
        print("proxy type:", type(d).__name__)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is Python 3.12's free-threaded (no-GIL) build and what changes?`,
    difficulty: "hard",
    seoDescription: `Python free-threaded (no-GIL) build: PEP 703, 3.13 experimental and 3.14 supported, what changes for threads, C extensions and speed, and how to detect it.`,
    description: `**Question presented to candidate:**
"You have probably heard that Python is getting rid of the GIL. What exactly is the free-threaded build, which version brought it, and what changes for someone writing threaded Python code or maintaining a C extension?"

**What a strong answer should cover:**
- The GIL lets only one thread run Python bytecode at a time; the free-threaded build (PEP 703) is a separate CPython build, configured with \`--disable-gil\`, in which threads run Python code truly in parallel on several cores.
- Version facts: it is **not** in 3.12 (3.12 brought immortal objects, PEP 683, and a per-interpreter GIL, PEP 684). It first shipped as **experimental in 3.13** (\`python3.13t\`), and became **officially supported, still optional, in 3.14** (PEP 779). The default download still has a GIL.
- What changed inside: biased reference counting, immortal objects, deferred reference counting, the mimalloc allocator, and per-object locks so built-in \`list\`/\`dict\` stay internally consistent.
- What it means for your code: race conditions that were rare become common, so \`+=\` on shared state needs a \`Lock\` exactly as before; single-threaded code ran about 40% slower in 3.13 and the 3.14 target is at most 10%.
- C extensions must declare free-threading support (\`Py_mod_gil\`); importing one that does not re-enables the GIL with a warning. Detect the build with \`sysconfig.get_config_var("Py_GIL_DISABLED")\` and the runtime state with \`sys._is_gil_enabled()\` (3.13+); control it with \`PYTHON_GIL\` or \`-X gil\`.

**Clarifying questions expected:**
- Do you mean what is in the default CPython download, or the separate free-threaded build?

**Code / implementation expected:** Optional — detect the build, and show that shared counters still need a lock.`,
    answer: `**Target Audience:** Python developers who know what a thread is and have heard of the GIL, and want accurate version facts and the practical consequences for their code.
**Difficulty:** Hard
**Python version:** Example 1 runs in the page on Pyodide 0.25.1 (CPython 3.11.3) and was also run on CPython 3.11, 3.12 and 3.13. Example 2 was run on the default (GIL) build of CPython 3.13. **We did not have a free-threaded interpreter available**, so statements about how \`python3.13t\` / \`python3.14t\` behave come from the CPython documentation and PEPs cited inline, not from our own runs.

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

Imagine a kitchen with four chefs and **one** knife. Whoever holds the knife may cut; everyone else waits. Four chefs, but only one is ever cutting. Adding chefs makes the kitchen busier, not faster — unless the work is mostly waiting for the oven, in which case the knife is free most of the time and four chefs really do help.

That knife is the **Global Interpreter Lock**. It is why threads in CPython speed up waiting (network, disk) but not number crunching.

The free-threaded build gives **every chef their own knife**. Now four chefs can cut at once. But two new problems appear: chefs can now reach for the same onion at the same instant, and handing out four knives costs a bit of extra effort even when only one chef shows up. Those two sentences are the whole trade-off of the free-threaded build.

## 2. First, the Version Facts (the Title Is Slightly Off)

The question says "Python 3.12", but the free-threaded build did not exist in 3.12. Here is the accurate timeline:

| Version | What arrived | Source |
| :--- | :--- | :--- |
| 3.12 | **Immortal objects** (PEP 683) and a **per-interpreter GIL** (PEP 684): groundwork, but every interpreter still has a GIL | [PEP 683](https://peps.python.org/pep-0683/), [PEP 684](https://peps.python.org/pep-0684/) |
| 3.13 | The **free-threaded build**, marked *experimental*, available as a separate build (\`python3.13t\`) | [3.13 free-threading HOWTO](https://docs.python.org/3.13/howto/free-threading-python.html) |
| 3.14 | Free threading becomes **officially supported** but still **optional** (phase II of PEP 703) | [PEP 779](https://peps.python.org/pep-0779/), [discussion](https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123) |
| later | Making it the default build (phase III) has no fixed date | [PEP 779 discussion](https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319?page=7) |

We can see the 3.12 immortal-objects change directly: \`sys.getrefcount(None)\` printed \`3730\` on our 3.11 run and \`4294967295\` on 3.12 and 3.13 — \`None\` now has a fixed, "never freed" reference count.

The answer an interviewer wants: *"The free-threaded build is PEP 703. It shipped as experimental in 3.13 and is supported but optional in 3.14. 3.12 only laid the groundwork."*

## 3. What the GIL Did, Precisely

📌 **Interview term: GIL (Global Interpreter Lock)** — a lock inside CPython that a thread must hold to execute Python bytecode. Only one thread holds it at a time, so pure-Python code in several threads takes turns instead of running in parallel. Threads release it while blocked on I/O, and many C extensions (NumPy, hashlib, zlib) release it during long C loops. The full story is in [what the GIL is](/interview-question/what-is-the-global-interpreter-lock-gil).

Why did CPython need it? Mostly **reference counting**: every object carries a counter of how many references point to it, and almost every bytecode instruction changes some counter. Without a lock, two threads updating the same counter could corrupt it, freeing an object that is still in use. The GIL made all those updates safe for free.

📌 **Interview term: Free-threaded build** — a CPython built with \`--disable-gil\` (PEP 703), where there is no global lock and threads execute Python bytecode simultaneously on different cores. It is a *different build*, not a flag on the normal interpreter: on our default 3.13, \`python3.13 -X gil=0\` stopped with \`Fatal Python error: config_read_gil: Disabling the GIL is not supported by this build\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 240" role="img" aria-label="With the GIL, two threads take turns on one core; in the free-threaded build both run at the same time on two cores">
  <text class="d-text" x="20" y="30">Default build</text>
  <text class="d-sub" x="20" y="72">thread 1</text>
  <rect class="d-box-accent" x="110" y="55" width="110" height="28" rx="6"/>
  <rect class="d-box-accent" x="340" y="55" width="110" height="28" rx="6"/>
  <text class="d-sub" x="20" y="112">thread 2</text>
  <rect class="d-box-muted" x="225" y="95" width="110" height="28" rx="6"/>
  <rect class="d-box-muted" x="455" y="95" width="110" height="28" rx="6"/>
  <text class="d-text" x="20" y="160">Free-threaded build</text>
  <text class="d-sub" x="20" y="198">thread 1</text>
  <rect class="d-box-accent" x="110" y="182" width="220" height="28" rx="6"/>
  <text class="d-sub" x="20" y="232">thread 2</text>
  <rect class="d-box-muted" x="110" y="216" width="220" height="20" rx="6"/>
  <path class="d-edge-dashed" d="M 600 60 L 600 120"/>
  <text class="d-sub" x="615" y="95">one at a time</text>
  <path class="d-edge-dashed" d="M 360 182 L 360 236"/>
  <text class="d-sub" x="375" y="214">both at once</text>
</svg>

Each bar is time spent running Python bytecode: with the GIL the bars alternate, without it they overlap, so the same work can finish in about half the wall-clock time on two cores.

## 4. What Changes Inside CPython

Removing the lock means everything it protected needs another protection. The [free-threading HOWTO](https://docs.python.org/3/howto/free-threading-python.html) and PEP 703 describe these mechanisms:

- 📌 **Interview term: Biased reference counting** — each object is "owned" by the thread that created it. The owner updates the count with fast, non-atomic operations; other threads use a slower atomic counter. Most objects are only touched by one thread, so most updates stay fast.
- 📌 **Interview term: Immortal objects** — objects whose reference count is never changed and that are never freed (\`None\`, \`True\`, small ints, and in the free-threaded build code constants and interned strings). No counter updates means no contention on hot shared objects.
- **Deferred reference counting**, enabled per object, and **deferred freeing**: objects can live slightly longer than in the default build.
- **mimalloc** (a modified copy) becomes the memory allocator; PEP 703 uses it to solve allocation and garbage-collection problems that the GIL used to cover. It also holds on to freed memory a little longer before returning it to the OS.
- 📌 **Interview term: Per-object locking** — built-in containers such as \`list\` and \`dict\` get their own small lock, so that two threads appending to the same list cannot corrupt it. The [thread-safety page](https://docs.python.org/3/library/threadsafety.html) lists which operations are lock-free reads (for example \`d[key]\`, \`key in d\`, \`len(d)\`) and warns that iterating a list while another thread modifies it is still not safe.
- The **specializing adaptive interpreter** (PEP 659) was disabled in the 3.13 free-threaded build, the main reason it was slower; the HOWTO said the plan was to re-enable it thread-safely in 3.14.

## 5. What Changes for Your Python Code

**Correct code stays correct. Lucky code stops being lucky.** The GIL never made your code thread-safe; it just made some races rare. Example 1 shows why:

~~~python
def bump():
    global counter
    counter += 1
~~~

compiles to \`LOAD_GLOBAL, LOAD_CONST, BINARY_OP, STORE_GLOBAL\` — read, add, write. With the GIL, a thread switch can still land between the read and the write. In practice it rarely does: on our runs on the default 3.11, 3.12 and 3.13 builds, four unlocked threads doing 500,000 increments each came out at exactly 2,000,000 in all 15 runs, because CPython only switches threads at certain points. That is **luck, not a guarantee** — and in the free-threaded build the read and the write of two threads genuinely overlap, so lost updates are expected. (We could not run a free-threaded build to show the number.) The fix is the same in both builds: a \`threading.Lock\`, as Example 2 does.

📌 **Interview term: Race condition** — a bug where the result depends on the timing of threads. See [race conditions and locks](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it).

📌 **Interview term: Atomic operation** — one that other threads see as all-or-nothing, never half done. A single \`list.append\` is effectively atomic in both builds (Example 1 shows it is one \`CALL\` into C; per-object locks keep it atomic without the GIL). A *sequence* such as "check if key exists, then insert" is never atomic.

Other practical consequences:

- **CPU-bound threads finally scale.** A \`ThreadPoolExecutor\` running pure-Python number crunching can use all cores. On the default build it cannot: on our 4-core 3.12 run, four tasks took 4.04 s serially, 4.46 s on four threads, and 1.70 s on four processes.
- **Single-threaded code pays a tax.** The 3.13 HOWTO measured about **40%** slowdown on the pyperformance suite; PEP 779 made "at most 10%" (15% with Steering Council approval) a criterion for 3.14 support status, and memory use up to 15% higher. Secondary sources report 5–10% for 3.14; we did not measure it.
- **C extensions must opt in.** A C extension module declares support with the \`Py_mod_gil\` slot. If you import one that does not, the free-threaded interpreter **re-enables the GIL** for the whole process and prints a warning. So "my program is free-threaded" depends on every compiled dependency.

## 6. Detecting and Controlling the Build

| Question | How to ask it |
| :--- | :--- |
| Was this interpreter *built* without the GIL? | \`sysconfig.get_config_var("Py_GIL_DISABLED")\` → \`1\` on a free-threaded build; \`0\` on our default 3.13, \`None\` on 3.11 and 3.12 |
| Is the GIL *currently* off? | \`sys._is_gil_enabled()\` (3.13+; a private-looking name, but documented) → \`True\` on our default 3.13 |
| Force it on or off | \`PYTHON_GIL=0\` / \`PYTHON_GIL=1\` environment variable, or \`-X gil=0\` / \`-X gil=1\` (only in free-threaded builds; \`-X\` wins) |
| Get one | The \`t\` executables (\`python3.13t\`, \`python3.14t\`) from the official macOS and Windows installers, or a source build configured with \`--disable-gil\` |

📌 **Interview term: \`Py_mod_gil\`** — the module slot a C extension uses to declare that it is safe without the GIL. If it is missing, import defaults to "GIL used", and the free-threaded interpreter turns the GIL back on.

## 7. The Examples

**Example 1 (runs in the page)** — shows the bytecode behind \`counter += 1\` and \`items.append(x)\`, then probes the build. In the browser it reports a normal 3.11 build.

**Example 2 (CPython 3.13, default build)** — thread code that is correct on *both* builds: CPU work in a \`ThreadPoolExecutor\`, a lock-protected counter, and concurrent \`list.append\`. It starts real threads, which the page runner cannot do, so it is shown as code with an "Open in playground" button. On a free-threaded interpreter the first two lines would read \`True\` and \`False\`, and the crunching would use several cores; the other lines are the same by design.

## 8. Verified: Running the Code

Example 1 on CPython 3.11 and in the page on Pyodide 0.25.1 (same output in both):

~~~text
['LOAD_GLOBAL', 'LOAD_CONST', 'BINARY_OP', 'STORE_GLOBAL', 'LOAD_CONST', 'RETURN_VALUE']
True
['LOAD_GLOBAL', 'LOAD_METHOD', 'LOAD_FAST', 'CALL', 'POP_TOP', 'LOAD_CONST', 'RETURN_VALUE']
Py_GIL_DISABLED: None
free-threaded build: False
GIL enabled now: unknown (no probe before 3.13)
(3, 11)
~~~

Example 1 on CPython 3.13 (default build), for comparison — 3.12+ folds \`LOAD_CONST\` + \`RETURN_VALUE\` into \`RETURN_CONST\`, and the build probes now exist:

~~~text
['LOAD_GLOBAL', 'LOAD_CONST', 'BINARY_OP', 'STORE_GLOBAL', 'RETURN_CONST']
True
['LOAD_GLOBAL', 'LOAD_ATTR', 'LOAD_FAST', 'CALL', 'POP_TOP', 'RETURN_CONST']
Py_GIL_DISABLED: 0
free-threaded build: False
GIL enabled now: True
(3, 13)
~~~

Example 2 on CPython 3.13 (default build):

~~~text
free-threaded build: False
GIL enabled at runtime: True
same answer from every thread: True 399999
locked counter: 200000
appends kept: 40000
~~~

What to notice:

- \`counter += 1\` is four real instructions; any of the gaps between them is where a lost update happens.
- \`Py_GIL_DISABLED: 0\` and \`GIL enabled now: True\` — our 3.13 is the normal build.
- \`locked counter: 200000\` and \`appends kept: 40000\` are exact because the code uses a lock and an internally locked container — correct on either build.

## 9. Free-Threaded Build vs Alternatives

| | Default build + threads | Free-threaded build + threads | Processes (\`multiprocessing\`) | Subinterpreters (3.14 \`concurrent.interpreters\`) |
| :--- | :--- | :--- | :--- | :--- |
| Pure-Python CPU work in parallel | No | Yes | Yes | Yes (one GIL per interpreter) |
| Shared memory between workers | Yes | Yes | Only explicitly | Only explicitly |
| Single-thread speed | Baseline | Slower (about 40% in 3.13, target at most 10% in 3.14) | Baseline | Baseline |
| C extension compatibility | Everything | Only extensions that opt in, else GIL comes back | Everything | Only extensions that support subinterpreters |
| Races on shared state | Possible, rarer | Possible, common | Only on explicit shared memory | Only on explicit shared data |

\`concurrent.interpreters\` (PEP 734) was added in 3.14 ([docs](https://docs.python.org/3.14/library/concurrent.interpreters.html)). When to choose processes instead of free-threaded threads is its own question: [multiprocessing vs free-threaded threads](/interview-question/when-should-you-still-use-multiprocessing-vs-free-threaded-threads-in-python-3-1).

## Common Pitfalls

- **Saying "Python 3.12 removed the GIL".** It did not. 3.13 added an experimental separate build; 3.14 made it supported; the default build still has a GIL.
- **Assuming code that "worked with threads" is thread-safe.** It may have relied on rare switching. Free threading turns rare races into frequent ones — audit shared mutable state and add locks.
- **Believing a free-threaded interpreter means a free-threaded program.** One C extension without \`Py_mod_gil\` support re-enables the GIL for the whole process; check for the warning and \`sys._is_gil_enabled()\`.
- **Expecting a speedup for single-threaded code.** It is slower, not faster; the win comes only from running CPU work on several threads.
- **Treating \`-X gil=0\` as a switch on the normal interpreter.** On the default build it is a fatal startup error, as our 3.13 run showed.
- **Iterating a shared list or dict while another thread mutates it.** Per-object locks protect single operations, not multi-step sequences.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">The free-threaded build is CPython compiled with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--disable-gil</code> (PEP 703): no global lock, so threads run Python bytecode in parallel on several cores.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Version facts:</strong> <span style="color:#f0e2c8;">Not in 3.12 — 3.12 added immortal objects and a per-interpreter GIL. It shipped as experimental in 3.13 (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python3.13t</code>) and became supported but optional in 3.14 under PEP 779; the default download still has a GIL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What changed inside:</strong> <span style="color:#f0e2c8;">Biased reference counting, immortal and deferred-refcounted objects, the mimalloc allocator, and per-object locks so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> stay consistent without the GIL.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What changes for my code:</strong> <span style="color:#f0e2c8;">CPU-bound threads scale, but races that were rare become common, so shared read-modify-write still needs a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Lock</code>. Single-threaded code was about 40% slower in 3.13; the 3.14 target is at most 10%.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Ecosystem:</strong> <span style="color:#f0e2c8;">C extensions declare support with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Py_mod_gil</code>; importing one that does not re-enables the GIL with a warning. Detect with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sysconfig.get_config_var("Py_GIL_DISABLED")</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys._is_gil_enabled()</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the GIL is gone, is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list.append</code> still safe from several threads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes for the single call: built-in containers use per-object locks, so the list is never corrupted. But a sequence like check-then-append, or iterating while another thread appends, is not atomic and needs your own lock.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is single-threaded code slower on the free-threaded build?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reference counting needs biased or atomic updates instead of plain increments, containers take per-object locks, and in 3.13 the specializing adaptive interpreter was disabled. Those costs apply even with one thread.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">My app imports a C extension and is not getting a speedup on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">python3.13t</code>. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most likely the extension does not declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Py_mod_gil</code> support, so the interpreter re-enabled the GIL at import and printed a warning. Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys._is_gil_enabled()</code> after imports, and use a release of the extension built for free threading.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from subinterpreters in 3.12 and 3.14?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Subinterpreters keep a GIL each and share almost nothing (PEP 684 in 3.12, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">concurrent.interpreters</code> module in 3.14), so they are closer to processes inside one OS process. The free-threaded build keeps one interpreter with shared objects and no GIL.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should we switch production to the free-threaded build today?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only for CPU-bound, thread-heavy workloads whose compiled dependencies all support it, after measuring. Otherwise the single-thread tax and ecosystem gaps outweigh the gain, and multiprocessing or async remains the safer default.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| GIL (Global Interpreter Lock) | The lock that lets only one thread run Python bytecode at a time in the default build. |
| Free-threaded build | CPython built with \`--disable-gil\` (PEP 703); experimental in 3.13, supported in 3.14. |
| Biased reference counting | Fast non-atomic refcount updates for the owning thread, atomic updates for others. |
| Immortal objects | Objects with a fixed refcount that are never freed (PEP 683, 3.12). |
| Per-object locking | Small locks inside \`list\`, \`dict\` and other built-ins that replace GIL protection. |
| Race condition | A result that depends on thread timing. |
| Atomic operation | One that others observe as complete or not started, never half done. |
| \`Py_mod_gil\` | The C extension module slot that declares the module safe without the GIL. |

**Conclusion:** The free-threaded build is the long-awaited "no-GIL Python", but with precise boundaries: it is PEP 703, experimental in 3.13 and supported-but-optional in 3.14, not part of 3.12 and not the default download. Internally it replaces the one big lock with biased reference counting, immortal objects, mimalloc and per-object locks; externally it lets CPU-bound threads use every core, at the cost of some single-threaded speed and a dependency on C extensions opting in. For your own code the rule does not change, it just gets enforced: shared mutable state needs a lock. Detect the build, measure, and keep [the right concurrency model](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio) for each workload.`,
    examples: [
      {
        label: `Why the GIL never made += atomic, and how to detect the build`,
        code: `# Why "it worked under the GIL" was never a safety guarantee,
# and what the free-threaded build changes about it.
import dis
import sys
import sysconfig

counter = 0

def bump():
    global counter
    counter += 1

# One line of Python is several bytecode instructions.
# A thread switch (GIL build) or a truly parallel thread (free-threaded
# build) can land between the LOAD and the STORE: that is the lost update.
steps = [i.opname for i in dis.get_instructions(bump)
         if i.opname not in ("RESUME", "NOP", "CACHE")]
print(steps)
print(len(steps) > 1)  # True

# A single call into a C method (list.append) is one CALL instruction.
items = []
def add(x):
    items.append(x)
print([i.opname for i in dis.get_instructions(add)
       if i.opname not in ("RESUME", "NOP", "CACHE", "PRECALL", "PUSH_NULL")])

# Is THIS interpreter a free-threaded build?
# Py_GIL_DISABLED is 1 only in a build configured with --disable-gil.
flag = sysconfig.get_config_var("Py_GIL_DISABLED")
print("Py_GIL_DISABLED:", flag)
print("free-threaded build:", bool(flag))  # free-threaded build: False

# sys._is_gil_enabled() exists from 3.13 on; guard it for older versions.
probe = getattr(sys, "_is_gil_enabled", None)
print("GIL enabled now:", probe() if probe else "unknown (no probe before 3.13)")
print(sys.version_info[:2])  # (3, 11)`,
      },
      {
        label: `Thread code that is correct on both builds`,
        runnable: false,
        python: "3.13",
        code: `# Code that is correct on BOTH builds: the default (GIL) build and the
# free-threaded build (python3.13t / python3.14t). Verified here on the
# default 3.13 build; the free-threaded run was not available to us.
import sys
import sysconfig
import threading
from concurrent.futures import ThreadPoolExecutor

free = bool(sysconfig.get_config_var("Py_GIL_DISABLED"))
print("free-threaded build:", free)
print("GIL enabled at runtime:", sys._is_gil_enabled())


def crunch(n):
    # Pure-Python CPU work: serialised by the GIL, parallel on 3.13t
    total = 0
    for i in range(n):
        total += i * i % 7
    return total


with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(crunch, [200_000] * 4))
print("same answer from every thread:", len(set(results)) == 1, results[0])

# Shared mutable state: guard read-modify-write with a Lock.
counter = 0
lock = threading.Lock()


def bump(times):
    global counter
    for _ in range(times):
        with lock:
            counter += 1


threads = [threading.Thread(target=bump, args=(50_000,)) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print("locked counter:", counter)

# Built-in containers stay internally consistent in both builds
# (the free-threaded build gives them per-object locks), but a
# check-then-act sequence across two calls still needs your own lock.
shared = []


def append_many(tag):
    for i in range(10_000):
        shared.append((tag, i))


threads = [threading.Thread(target=append_many, args=(k,)) for k in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print("appends kept:", len(shared))`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `When should you still use multiprocessing vs free-threaded threads in Python 3.12+?`,
    difficulty: "medium",
    seoDescription: `Free-threaded threads or multiprocessing? Decide by build availability, C extension support, shared state, the pickling cost and crash isolation.`,
    description: `**Question presented to candidate:**
"Now that CPython has a free-threaded build, threads can finally run Python code on several cores. Is there still a reason to reach for \`multiprocessing\`? How would you decide between processes and free-threaded threads for a CPU-heavy job?"

**What a strong answer should cover:**
- Version reality first: there is no free-threaded build in 3.12; it is experimental in 3.13 and supported but optional in 3.14. On the default build, CPU-bound pure-Python work still needs processes.
- What threads win on: no pickling, cheap start-up, shared objects by reference, low memory — best when tasks share large in-memory state or exchange data often.
- What processes still win on: they work on every build and with every C extension (one extension without free-threading support re-enables the GIL), they give memory isolation (no data races by default) and crash isolation (a segfault kills one worker, not the app), and the OS can kill or limit them.
- The costs of processes: pickling every argument and result, start-up time (especially \`spawn\`), duplicated memory; mitigate with chunking, \`initializer\`, and \`shared_memory\`.
- Measure: single-threaded slowdown of the free-threaded build, the size of data crossing the boundary, and real wall-clock time on the target machine.

**Clarifying questions expected:**
- Which Python version and build will production run, and do all compiled dependencies support free threading?
- How much state do the workers share, and how often do they exchange data?

**Code / implementation expected:** Optional — the same function run on a \`ThreadPoolExecutor\` and a \`ProcessPoolExecutor\`, with the trade-offs explained.`,
    answer: `**Target Audience:** Developers who know threads, processes and the GIL at a basic level and must choose a concurrency model for CPU-bound Python work.
**Difficulty:** Medium
**Python version:** Example 1 runs in the page on Pyodide 0.25.1 (CPython 3.11.3) and was checked on CPython 3.11. Example 2 starts threads and processes, so it was run on CPython 3.13 (default build). **We did not have a free-threaded interpreter**, so performance claims about it come from the CPython docs and PEPs cited inline, not from our runs.

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A bakery needs to frost 1,000 cakes. Two options:

- **Hire more bakers in the same kitchen** (threads). They share the fridge, the frosting bowl and the order list. No one has to carry anything anywhere. But if two bakers grab the same bowl at once there is a mess, and if one baker sets the kitchen on fire, the whole bakery burns.
- **Open more kitchens** (processes). Each kitchen has its own fridge and its own copy of the recipe. You must truck ingredients in and cakes out, which takes time. But kitchens cannot spill on each other, and a fire in one kitchen stays in that kitchen.

For years Python had a strange rule: in the shared kitchen only **one** baker could hold a spatula at a time (the GIL), so for frosting — pure work, no waiting — more kitchens was the only way to go faster. The free-threaded build removes that rule. So the question becomes the real engineering question: *do I want a shared kitchen or separate kitchens?* That depends on how much they share, how safe it must be, and whether every tool in the kitchen works under the new rule.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which Python version and build runs in production? | On the default build (and on every 3.12), CPU-bound threads do not run in parallel; the choice is made for you. |
| Do all compiled dependencies support free threading? | One extension without support re-enables the GIL for the whole process. |
| How much state do workers share, and how big is it? | Large shared state favours threads (or explicit shared memory); small independent tasks suit processes. |
| How often do workers exchange data? | Every process exchange is a pickle round trip. |
| What happens if one task crashes or leaks memory? | Processes contain crashes and can be recycled; threads cannot be killed. |
| Is the work CPU-bound at all? | If it is mostly waiting on I/O, use [asyncio or threads on any build](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio). |

## 3. Step Zero: Which Build Do You Actually Have?

The title says "3.12+", but the free-threaded build first shipped as **experimental in 3.13** ([3.13 HOWTO](https://docs.python.org/3.13/howto/free-threading-python.html)) and became **supported but optional in 3.14** under [PEP 779](https://peps.python.org/pep-0779/). It is a separate interpreter (\`python3.13t\`, \`python3.14t\`), not the default download. The details are in [what the free-threaded build is](/interview-question/what-is-python-3-12-s-free-threaded-no-gil-build-and-what-changes).

So the first branch of the decision is mechanical:

- **3.12, or the default build of any version:** CPU-bound pure-Python work needs processes (or C code that releases the GIL). Threads give no speedup: on our 4-core 3.12 run, four CPU tasks took 4.04 s serially, 4.46 s on four threads and 1.70 s on four processes.
- **A free-threaded build:** threads *can* run in parallel, and the rest of this page applies.

📌 **Interview term: CPU-bound** — a task whose speed is limited by computation, not by waiting for disk or network. Only CPU-bound work benefits from running on several cores.

## 4. What Free-Threaded Threads Win On

- **No serialisation.** A thread receives a reference to the same object; Example 1 printed \`thread gets same object: True\`. A process receives a pickled copy.
- **Cheap start and low memory.** A thread is a small OS object inside your process; a process is a whole new interpreter. Even an empty \`spawn\` pool of 4 workers took about 0.1 s to start and shut down on our machine.
- **Easy sharing of big state.** A 2 GB in-memory index can be read by every thread without copying or special APIs.

📌 **Interview term: Process tax** — an informal name for what you pay to use processes: pickling arguments and results, start-up time, and duplicated memory. Example 1 measures it: sending the whole 200,000-item list to each of 8 tasks pickles **6,953,624 bytes**, sending one chunk per task pickles **869,256 bytes**, and sending only \`(start, stop)\` indices pickles **181 bytes** (the workers then need the data some other way: inherited through \`fork\`, loaded by an \`initializer\`, or in [shared memory](/interview-question/how-does-multiprocessing-share-data-between-processes)).

## 5. What Processes Still Win On

1. **They work everywhere, today.** Every Python version, every build, every C extension. A free-threaded program is only free-threaded if *all* its compiled dependencies declare support; otherwise the GIL is turned back on at import.
2. **Memory isolation.** Workers share nothing by default, so whole classes of data-race bugs cannot happen. Example 2 shows module state: after threads ran \`touch_cache\` six times the parent counter was \`6\`; after six process tasks it was still \`6\` — each worker changed its own copy.
3. **Crash isolation.** A segfault in a C extension, \`os._exit\`, or the OS out-of-memory killer takes down one worker. Example 2 kills a worker on purpose; the parent catches \`BrokenProcessPool\` and keeps running. With threads, a segfault kills the whole process.
4. **Control.** Processes can be killed, given resource limits, restarted after N tasks (\`Pool(maxtasksperchild=...)\`) to contain memory leaks. Python threads cannot be killed from outside.
5. **No single-thread tax.** The default build runs single-threaded code at full speed; the free-threaded build was about 40% slower in 3.13, with a 3.14 target of at most 10% ([PEP 779 criteria](https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123)).
6. **Beyond one machine.** Process-style designs (message passing, no shared memory) scale out to job queues and clusters; shared-memory threading does not.

📌 **Interview term: Fault isolation** — a failure in one component cannot corrupt or crash another. Processes give it through separate address spaces; threads do not.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Decision flow: is the work CPU bound, is the build free threaded with supported extensions, do you need isolation, then choose threads or processes">
  <defs>
    <marker id="py26q3-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="190" height="56" rx="10"/>
  <text class="d-text" x="115" y="55" text-anchor="middle">CPU-bound work?</text>
  <text class="d-sub" x="115" y="74" text-anchor="middle">no: asyncio or threads</text>
  <rect class="d-box" x="265" y="30" width="190" height="56" rx="10"/>
  <text class="d-text" x="360" y="55" text-anchor="middle">Free-threaded build</text>
  <text class="d-sub" x="360" y="74" text-anchor="middle">and extensions support it?</text>
  <rect class="d-box" x="510" y="30" width="190" height="56" rx="10"/>
  <text class="d-text" x="605" y="55" text-anchor="middle">Need isolation?</text>
  <text class="d-sub" x="605" y="74" text-anchor="middle">crashes, leaks, limits</text>
  <rect class="d-box-accent" x="510" y="200" width="190" height="56" rx="10"/>
  <text class="d-text" x="605" y="233" text-anchor="middle">threads</text>
  <rect class="d-box-muted" x="265" y="200" width="190" height="56" rx="10"/>
  <text class="d-text" x="360" y="233" text-anchor="middle">processes</text>
  <path class="d-edge" d="M 212 58 L 259 58" marker-end="url(#py26q3-a1)"/>
  <path class="d-edge" d="M 457 58 L 504 58" marker-end="url(#py26q3-a1)"/>
  <path class="d-edge-accent" d="M 605 90 L 605 194" marker-end="url(#py26q3-a1)"/>
  <path class="d-edge-dashed" d="M 360 90 L 360 194" marker-end="url(#py26q3-a1)"/>
  <path class="d-edge-dashed" d="M 560 90 L 420 194" marker-end="url(#py26q3-a1)"/>
  <text class="d-sub" x="234" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="480" y="48" text-anchor="middle">yes</text>
  <text class="d-sub" x="625" y="150">no</text>
  <text class="d-sub" x="340" y="150" text-anchor="end">no</text>
  <text class="d-sub" x="505" y="150">yes</text>
</svg>

Read it left to right: only a CPU-bound job on a free-threaded build with supported extensions and no need for isolation lands on threads; every other path ends at processes (or, for I/O, at asyncio).

## 6. The Decision Table

| Situation | Choose | Why |
| :--- | :--- | :--- |
| Mostly waiting on network or disk | asyncio or threads (any build) | The GIL is released while waiting; see [concurrency vs parallelism](/interview-question/what-is-the-difference-between-concurrency-and-parallelism-in-python) |
| CPU-bound, Python 3.12 or default build | Processes | Threads cannot run Python bytecode in parallel |
| CPU-bound, free-threaded build, large shared in-memory state | Threads | No copying, no pickling, shared by reference |
| CPU-bound, but a key C extension lacks free-threading support | Processes | The GIL would come back for the whole process |
| Untrusted or crash-prone native code, memory leaks | Processes | Fault isolation and \`maxtasksperchild\` |
| Heavy numeric work in NumPy or similar | Often threads on either build | Many such libraries release the GIL inside C loops; measure |
| Tiny tasks with big inputs | Threads, or processes with chunking | The process tax would dominate |
| Must run on many machines later | Processes / message passing | The design transfers to job queues |

Example 1 encodes the core of this table in a small \`choose()\` function so you can try other combinations in the page.

## 7. Making Processes Cheaper When You Keep Them

- **Chunk the work** (\`pool.map(f, items, chunksize=...)\` or batch yourself) so each round trip carries many items.
- **Send indices, not data**, and give each worker the data once through an \`initializer\`, \`fork\` inheritance, or \`multiprocessing.shared_memory\`.
- **Reuse the pool** instead of creating one per request; start-up is the expensive part.
- **Return small results** — reduce inside the worker.

The executor APIs are the same for threads and processes, which makes measuring both cheap: see [ThreadPoolExecutor and ProcessPoolExecutor](/interview-question/how-do-threadpoolexecutor-and-processpoolexecutor-work).

## 8. Verified: Running the Code

Example 1 on CPython 3.11 and in the page on Pyodide 0.25.1 (same output in both):

~~~text
whole list to every task    6,953,624 bytes pickled
one chunk per task            869,256 bytes pickled
(start, stop) per task            181 bytes pickled
thread gets same object: True
process gets equal copy: True False
asyncio or threads (I/O-bound)
threads (free-threaded)
processes
processes
processes + shared_memory
~~~

Example 2 on CPython 3.13 (default build). It uses threads, processes and \`os._exit\`, so it is shown as code with an "Open in playground" button rather than run in the page:

~~~text
free-threaded build: False
GIL enabled: True
threads == processes: True
parent CACHE after threads: 6
parent CACHE after processes: 6
parent survived: BrokenProcessPool
parent still running, pid is an int: True
~~~

What to notice:

- 6,953,624 vs 181 bytes: the design of what you send matters far more than the choice of executor.
- \`threads == processes: True\` — the same function gives the same answers either way; only cost and safety differ.
- \`parent CACHE after processes: 6\` — the six process tasks changed their own copies; the parent value stayed what the threads left.
- \`parent survived: BrokenProcessPool\` — the killed worker broke the pool, not the program.

## 9. Edge Cases

- **Hybrid designs are normal.** A few processes, each running a thread pool, combine fault isolation with cheap sharing inside each process.
- **Subinterpreters** (\`concurrent.interpreters\`, added in 3.14 by PEP 734, [docs](https://docs.python.org/3.14/library/concurrent.interpreters.html)) sit in between: one OS process, one GIL per interpreter, explicit data sharing.
- **Forking a free-threaded process** is no safer than forking any multi-threaded process; since 3.12 \`os.fork()\` warns when other threads are running, and 3.14 changed the POSIX default start method to \`forkserver\` ([multiprocessing docs](https://docs.python.org/3/library/multiprocessing.html)).

## Common Pitfalls

- **Assuming 3.12 has free threading.** It does not; on 3.12 the answer for CPU-bound Python is processes.
- **Switching to threads and forgetting locks.** Free-threaded threads share everything, so every shared read-modify-write needs a lock; processes hid that because they shared nothing.
- **Not checking extensions.** One import can silently turn the GIL back on; check \`sys._is_gil_enabled()\` after imports.
- **Shipping huge arguments to every process task.** Measure the pickled size; send indices or use shared memory.
- **Benchmarking only the parallel part.** The free-threaded build also changes single-threaded speed for the rest of the program.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Set the facts:</strong> <span style="color:#f0e2c8;">There is no free-threaded build in 3.12; it is experimental in 3.13 and supported but optional in 3.14. On the default build, CPU-bound pure Python still needs processes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When threads win:</strong> <span style="color:#f0e2c8;">On a free-threaded build with supported extensions, threads share objects by reference: no pickling, cheap start-up, low memory, best for big shared in-memory state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When processes win:</strong> <span style="color:#f0e2c8;">They work on every build and extension, give memory isolation (no data races by default) and crash isolation, and can be killed, limited and recycled.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The cost model:</strong> <span style="color:#f0e2c8;">Processes pay the process tax — pickled arguments and results, start-up, duplicated memory; reduce it with chunking, sending indices, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">initializer</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shared_memory</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I decide:</strong> <span style="color:#f0e2c8;">Check the build and dependencies, estimate the data crossing the boundary, ask whether isolation matters, then measure both with the same executor API.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">We are on 3.13t and all extensions support it. Any reason left for processes?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Isolation: a native crash or a memory leak in one task. Also untrusted plugins, per-task resource limits, and designs that must scale to several machines. And the single-threaded slowdown of the free-threaded build may cost more than parallelism gains for some programs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ProcessPoolExecutor</code> job faster without changing the algorithm?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Send less: chunk tasks, send indices instead of data, load shared data once per worker with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">initializer</code> or put it in shared memory, return reduced results, and reuse the pool.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can threads on the default build ever beat processes for CPU work?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, when the CPU work happens in C code that releases the GIL, such as NumPy, hashlib or zlib on large buffers. Then threads avoid all copying and run in parallel anyway.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if one free-threaded thread segfaults?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The whole process dies, all threads with it. With a process pool only that worker dies; the parent sees <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BrokenProcessPool</code> and can recover.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you verify the free-threaded build is actually helping?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Confirm <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys._is_gil_enabled()</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> after all imports, then compare wall-clock time for the real workload on the default build and the free-threaded build, single-threaded and multi-threaded.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CPU-bound | Limited by computation; only this kind of work gains from several cores. |
| Process tax | The pickling, start-up and memory costs of using processes. |
| Fault isolation | A failure in one worker cannot crash or corrupt the others. |

**Conclusion:** Free-threaded threads do not make \`multiprocessing\` obsolete; they move the decision from "the GIL forces processes" to a real trade-off. Threads win when workers share large state and exchange data often, on a free-threaded build whose extensions all support it. Processes still win when you are on 3.12 or a default build, when a dependency would bring the GIL back, when you need memory or crash isolation, or when you want to kill, limit and recycle workers. Measure the process tax and the single-thread tax on your real workload — and remember that switching to threads means every piece of shared state now needs a lock.`,
    examples: [
      {
        label: `The process tax: bytes pickled per design, plus a decision helper`,
        code: `# The "process tax": what each design ships across the boundary.
# Threads (GIL or free-threaded) pass a reference: 0 bytes copied.
# Processes pickle every argument and every result.
import pickle

data = list(range(200_000))
TASKS = 8
chunk = len(data) // TASKS

def size(obj):
    return len(pickle.dumps(obj))

designs = {
    "whole list to every task": [data] * TASKS,
    "one chunk per task": [data[i * chunk:(i + 1) * chunk] for i in range(TASKS)],
    "(start, stop) per task": [(i * chunk, (i + 1) * chunk) for i in range(TASKS)],
}
for name, args in designs.items():
    total = sum(size(a) for a in args)
    print(f"{name:26} {total:>10,} bytes pickled")

# A thread sees the very same object: nothing is copied.
def thread_task(arg):
    return arg is data
print("thread gets same object:", thread_task(data))  # thread gets same object: True

# A process gets an equal but separate object.
copy = pickle.loads(pickle.dumps(data))
print("process gets equal copy:", copy == data, copy is data)  # process gets equal copy: True False


# A rough decision helper encoding the rules from the answer.
def choose(cpu_bound, free_threaded, c_ext_safe, needs_isolation, big_shared_state):
    if not cpu_bound:
        return "asyncio or threads (I/O-bound)"
    if needs_isolation:
        return "processes"
    if free_threaded and c_ext_safe:
        return "threads (free-threaded)"
    if big_shared_state:
        return "processes + shared_memory"
    return "processes"

print(choose(False, False, True, False, False))
print(choose(True, True, True, False, True))
print(choose(True, True, False, False, False))
print(choose(True, True, True, True, False))
print(choose(True, False, True, False, True))`,
      },
      {
        label: `Memory and crash isolation: what only processes give you`,
        runnable: false,
        python: "3.13",
        code: `# Two reasons processes still win even when threads can run in parallel:
# memory isolation and crash isolation. Runs on CPython (not the browser).
import multiprocessing as mp
import os
import sys
import sysconfig
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from concurrent.futures.process import BrokenProcessPool

CACHE = {"hits": 0}


def touch_cache(_):
    CACHE["hits"] += 1          # threads: one shared CACHE; processes: one each
    return CACHE["hits"]


def crunch(n):
    total = 0
    for i in range(n):
        total += i * i % 7
    return total


def crash(n):
    if n == 2:
        os._exit(1)             # simulates a segfault in a C extension
    return n


if __name__ == "__main__":
    print("free-threaded build:", bool(sysconfig.get_config_var("Py_GIL_DISABLED")))
    print("GIL enabled:", sys._is_gil_enabled())
    ctx = mp.get_context("spawn")

    # Same function, same answers, either executor
    with ThreadPoolExecutor(4) as tp, ProcessPoolExecutor(4, mp_context=ctx) as pp:
        t = list(tp.map(crunch, [100_000] * 4))
        p = list(pp.map(crunch, [100_000] * 4))
    print("threads == processes:", t == p)

    # Memory isolation: threads share module state, processes do not
    with ThreadPoolExecutor(2) as tp:
        list(tp.map(touch_cache, range(6)))
    print("parent CACHE after threads:", CACHE["hits"])
    with ProcessPoolExecutor(2, mp_context=ctx) as pp:
        list(pp.map(touch_cache, range(6)))
    print("parent CACHE after processes:", CACHE["hits"])

    # Crash isolation: a dying worker breaks the pool, not the parent
    try:
        with ProcessPoolExecutor(2, mp_context=ctx) as pp:
            print(list(pp.map(crash, range(4))))
    except BrokenProcessPool as exc:
        print("parent survived:", type(exc).__name__)
    print("parent still running, pid is an int:", isinstance(os.getpid(), int))`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does async/await work in Python?`,
    difficulty: "hard",
    seoDescription: `How Python async/await works: coroutine objects, awaitables and __await__, suspension via send and StopIteration, the event loop, and blocking pitfalls.`,
    description: `**Question presented to candidate:**
"Explain what actually happens when you write \`async def\` and \`await\` in Python. What does calling an async function return, what does \`await\` do under the hood, and why can one slow line freeze an entire asyncio program?"

**What a strong answer should cover:**
- \`async def\` defines a **coroutine function**; calling it runs nothing and returns a **coroutine object** that must be awaited or wrapped in a task, otherwise you get \`RuntimeWarning: coroutine ... was never awaited\`.
- \`await x\` works on any **awaitable** (a coroutine, a \`Task\`, a \`Future\`, or an object with \`__await__\`). It suspends the current coroutine and the whole chain of awaiting coroutines up to the driver, which resumes it later with \`send()\`; the return value travels on \`StopIteration\`.
- Coroutines are built on the same machinery as generators (\`RETURN_GENERATOR\`, \`SEND\`, \`YIELD_VALUE\` in the bytecode); the event loop is just the code that calls \`send()\` at the right time.
- Concurrency is cooperative and single-threaded: \`await\` on a coroutine runs it to completion sequentially; to overlap work you create tasks (\`asyncio.create_task\`, \`gather\`, \`TaskGroup\`). Nothing runs in parallel.
- Any blocking call (\`time.sleep\`, \`requests.get\`, CPU-heavy loops) blocks the loop and every task; use async libraries, \`asyncio.to_thread\`, or a process pool.
- Version facts: \`async\`/\`await\` syntax came with PEP 492 in 3.5, became reserved keywords in 3.7, and \`asyncio.run()\` was added in 3.7.

**Code / implementation expected:** Optional — a small asyncio program comparing sequential awaits with \`gather\`, or a coroutine driven by hand with \`send()\`.`,
    answer: `**Target Audience:** Python developers who have seen \`async\`/\`await\` in FastAPI, aiohttp or asyncio examples and want to understand what it really does, from the coroutine object up to the event loop.
**Difficulty:** Hard
**Python version:** Example 1 uses no asyncio at all and runs in the page on Pyodide 0.25.1 (CPython 3.11.3); it was checked on CPython 3.11 and 3.12. Example 2 uses \`asyncio.run()\`, which the in-page runner cannot call (the page itself already runs inside an event loop), so it was run on CPython 3.12.

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A single waiter serves ten tables. A bad waiter takes table 1's order, walks to the kitchen, and **stands there** until the food is ready, while nine tables wait. A good waiter takes table 1's order, hands it to the kitchen, and **immediately** goes to table 2. When the kitchen rings the bell for table 1, the waiter picks up the plate on the next pass.

There is still only one waiter — nobody is working in parallel — but no time is wasted standing around.

In Python:

- the **waiter** is the event loop, one thread;
- each **table** is a coroutine;
- **"hand the order to the kitchen and go"** is \`await\`;
- the **bell** is the operating system saying "your network data has arrived".

And the danger is obvious: if the waiter decides to cook a steak himself (a blocking call, or heavy computation), every table waits. That single fact explains most asyncio bugs.

## 2. Coroutine Functions and Coroutine Objects

~~~python
async def fetch(name):
    data = await Wait(f"read {name}")
    return data.upper()
~~~

📌 **Interview term: Coroutine function** — a function defined with \`async def\`. Calling it does **not** run its body.

📌 **Interview term: Coroutine object** — what calling a coroutine function returns: a paused computation, sitting before its first line. Example 1 printed \`coroutine True\` for \`type(coro).__name__, inspect.iscoroutine(coro)\` and \`CORO_CREATED\` for its state.

A coroutine object only runs when something **drives** it. If nothing ever does, CPython warns when the object is destroyed; on our 3.11 run, \`f()\` without \`await\` printed \`RuntimeWarning: coroutine 'f' was never awaited\`. This is the most common asyncio beginner bug: forgetting \`await\`.

The syntax came from [PEP 492 in Python 3.5](https://docs.python.org/3.6/whatsnew/3.5.html); \`async\` and \`await\` became reserved keywords in 3.7, and \`asyncio.run()\` arrived in the same release ([What's New in 3.7](https://docs.python.org/3/whatsnew/3.7.html)).

## 3. What \`await\` Really Does

\`await x\` means: "get an iterator from \`x.__await__()\` and keep forwarding whatever it yields **out** to my caller, and whatever is sent **in** back to it, until it finishes; its return value is the value of the expression."

📌 **Interview term: Awaitable** — any object you can put after \`await\`: a coroutine object, an \`asyncio.Future\` or \`Task\`, or any object whose class defines \`__await__\` returning an iterator. Example 1 builds the smallest possible one:

~~~python
class Wait:
    def __init__(self, what):
        self.what = what

    def __await__(self):
        reply = yield self.what          # suspends the WHOLE await chain
        return reply                     # becomes the value of "await Wait(...)"
~~~

The key insight: **a \`yield\` at the bottom of the chain suspends every coroutine above it at once.** \`main\` awaits \`fetch\`, \`fetch\` awaits \`Wait\`, \`Wait\` yields — and \`coro.send(None)\` on \`main\` returns that yielded value straight to the driver. Example 1 printed \`coroutine asks for: read a.txt\`.

📌 **Interview term: Suspension point** — a place where a coroutine can pause and give control back to the event loop. Only \`await\` (and \`async for\` / \`async with\`, which await internally) create one. Between two suspension points, a coroutine runs without interruption.

To resume, the driver calls \`coro.send(value)\`. The value travels down the chain and becomes the result of the \`yield\` inside \`Wait.__await__\`. When \`main\` finally returns, \`send()\` raises **\`StopIteration\`** carrying the return value — Example 1 printed \`finished with: ALPHA+BETA\`, and the state became \`CORO_CLOSED\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 270" role="img" aria-label="The driver calls send on main, which awaits fetch, which awaits Wait; the yield in Wait travels back up to the driver">
  <defs>
    <marker id="py26q4-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="100" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="126" text-anchor="middle">driver</text>
  <text class="d-sub" x="95" y="146" text-anchor="middle">event loop</text>
  <rect class="d-box" x="215" y="100" width="130" height="60" rx="10"/>
  <text class="d-text" x="280" y="135" text-anchor="middle">main()</text>
  <rect class="d-box" x="390" y="100" width="130" height="60" rx="10"/>
  <text class="d-text" x="455" y="135" text-anchor="middle">fetch()</text>
  <rect class="d-box-muted" x="565" y="100" width="135" height="60" rx="10"/>
  <text class="d-text" x="632" y="126" text-anchor="middle">Wait</text>
  <text class="d-sub" x="632" y="146" text-anchor="middle">yield request</text>
  <path class="d-edge" d="M 172 112 L 209 112" marker-end="url(#py26q4-a1)"/>
  <path class="d-edge" d="M 347 112 L 384 112" marker-end="url(#py26q4-a1)"/>
  <path class="d-edge" d="M 522 112 L 559 112" marker-end="url(#py26q4-a1)"/>
  <text class="d-sub" x="360" y="60" text-anchor="middle">send(value) travels down the await chain</text>
  <path class="d-edge-accent" d="M 632 166 C 600 230, 140 230, 95 166" marker-end="url(#py26q4-a1)"/>
  <text class="d-sub" x="360" y="252" text-anchor="middle">yielded request comes back up</text>
</svg>

So the "magic" of async code is generator machinery: coroutines are suspendable functions, and the event loop is the code that decides when to call \`send()\` on which one.

## 4. The Same Machinery as Generators

If you know [generators](/interview-question/what-are-generators-and-why-use-them) and [\`yield from\`](/interview-question/how-does-yield-from-delegation-work), you already know coroutines. Example 1 lists the relevant bytecode of \`fetch\` on 3.11:

~~~text
['RETURN_GENERATOR', 'GET_AWAITABLE', 'SEND', 'YIELD_VALUE']
~~~

- \`RETURN_GENERATOR\` — calling the function creates the coroutine object instead of running the body (generators start the same way).
- \`GET_AWAITABLE\` — calls \`__await__\` (or uses the coroutine directly).
- \`SEND\` / \`YIELD_VALUE\` — the loop that forwards values in and out, the same loop \`yield from\` compiles to.

3.12 printed the same four names. The differences between the two kinds of object are their own question: [generator vs coroutine](/interview-question/what-is-the-difference-between-a-generator-and-a-coroutine).

## 5. The Event Loop Is Just a Smart Driver

Example 1 ends with a toy driver, \`run_all\`, that keeps a queue of coroutines and calls \`send()\` on each in turn. Two coroutines interleave on one thread:

~~~text
   job_x suspended on: read x
   job_y suspended on: read y
~~~

A real event loop does the same, but smarter: a coroutine suspends on a **Future** ("the result of this socket read"); the loop asks the OS which sockets are ready (\`select\`/\`epoll\`), marks those Futures done, and resumes only the coroutines whose Futures completed. How it orders that work — the ready queue, timers, \`call_soon\` — is covered in [how the asyncio event loop schedules coroutines](/interview-question/how-does-the-asyncio-event-loop-schedule-coroutines).

📌 **Interview term: Event loop** — the scheduler that runs on one thread, resumes coroutines whose awaited result is ready, and waits for I/O events when nothing is ready. \`asyncio.run(main())\` creates one, runs \`main()\` to completion, and closes it.

📌 **Interview term: Cooperative multitasking** — tasks give up control voluntarily (at \`await\`), instead of being interrupted by a scheduler. Fair only if every task cooperates.

## 6. \`await\` Is Sequential; Tasks Make It Concurrent

This trips people up: \`await download("a")\` does not "start a download in the background". It runs \`download("a")\` **until it finishes**, letting *other tasks* run during its waits. If there are no other tasks, nothing overlaps.

📌 **Interview term: Task** — an \`asyncio.Task\` wraps a coroutine and schedules it on the loop to run *independently*. \`asyncio.create_task(coro)\`, \`asyncio.gather(...)\` and \`asyncio.TaskGroup\` all create tasks. A Task is itself an awaitable Future, so you can await its result later.

Example 2 runs the same two downloads both ways:

~~~python
async def sequential():
    a = await download("a", 0.2)          # await = wait for THIS one to finish
    b = await download("b", 0.1)
    return [a, b]

async def concurrent():
    return await asyncio.gather(download("a", 0.2), download("b", 0.1))
~~~

Sequential took about 0.3 s (0.2 + 0.1) and logged \`start a, done a, start b, done b\`. Concurrent took about 0.2 s (the longest one) and logged \`start a, start b, done b, done a\` — both were in flight together. For structured task management prefer \`TaskGroup\`; see [TaskGroup vs gather](/interview-question/what-is-asyncio-taskgroup-and-why-does-it-replace-gather).

## 7. Blocking the Loop

Because there is one thread, anything that does not \`await\` holds it. Example 2 starts a ticker task that wants to run every 0.05 s, then calls \`time.sleep(0.3)\` — a normal, blocking sleep:

~~~text
time.sleep blocked the loop for ~0.3s; ticker ran 1 step(s)
~~~

The ticker should have ticked about six times; it ran once (before the block) and then saw the stop flag. Common blockers: \`time.sleep\`, \`requests\`, synchronous database drivers, file I/O on slow disks, and CPU-heavy loops. The fixes:

- use the async version (\`await asyncio.sleep\`, \`aiohttp\`/\`httpx\`, async DB drivers);
- push blocking calls to a thread with \`await asyncio.to_thread(func, ...)\` (3.9+) or \`loop.run_in_executor(...)\`;
- push CPU-heavy work to a process pool.

\`asyncio.run(main(), debug=True)\` reports slow steps: on our 3.12 run a 0.2 s \`time.sleep\` inside a task logged \`Executing <Task finished name='Task-1' ...> took 0.200 seconds\`.

## 8. Verified: Running the Code

Example 1 on CPython 3.11 and in the page on Pyodide 0.25.1 (same output in both):

~~~text
coroutine True
CORO_CREATED
coroutine asks for: read a.txt
CORO_SUSPENDED
coroutine asks for: read b.txt
finished with: ALPHA+BETA
CORO_CLOSED
   job_x suspended on: read x
   job_y suspended on: read y
{'job_x': '<READ X>', 'job_y': '<READ Y>'}
['RETURN_GENERATOR', 'GET_AWAITABLE', 'SEND', 'YIELD_VALUE']
~~~

Example 2 on CPython 3.12 (it calls \`asyncio.run()\`, so it is shown as code with an "Open in playground" button). The timings are rounded to 0.1 s; they printed the same on repeated runs:

~~~text
sequential -> ['A', 'B'] in ~0.3s
    start a
    done  a
    start b
    done  b
concurrent -> ['A', 'B'] in ~0.2s
    start a
    start b
    done  b
    done  a
time.sleep blocked the loop for ~0.3s; ticker ran 1 step(s)
~~~

What to notice:

- The coroutine did nothing until the first \`send(None)\`, and each \`send\` resumed it exactly where it paused.
- The values \`alpha\` and \`beta\` sent in became the results of the \`await Wait(...)\` expressions.
- \`gather\` overlapped the waits; sequential \`await\` did not.
- One blocking call stopped the other task completely.

## 9. Async vs Threads at a Glance

| | \`async\`/\`await\` | Threads |
| :--- | :--- | :--- |
| Who switches | The code, at each \`await\` | The interpreter/OS, almost anywhere |
| Number of OS threads | One (the loop) | One per thread |
| Cost per concurrent task | Small object | OS thread stack |
| Races on shared state | Only across \`await\` points | Between almost any two instructions |
| Blocking call inside | Freezes everything | Blocks only that thread |
| Library support needed | Async-aware libraries | Any library |

When each model is the right choice is covered in [threading vs multiprocessing vs asyncio](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio).

## 10. Edge Cases

- **\`await\` only inside \`async def\`** (and in the \`python -m asyncio\` REPL or notebooks, which run their own loop). At the top level of a script it is a \`SyntaxError\`.
- **\`asyncio.run()\` inside a running loop fails**: on our 3.12 run it raised \`RuntimeError: asyncio.run() cannot be called from a running event loop\`. That is exactly why the page cannot run Example 2.
- **Fire-and-forget tasks need a reference.** The loop keeps only weak references to tasks; keep the \`Task\` you create (or use a \`TaskGroup\`) so it is not garbage-collected mid-flight.
- **Exceptions surface at \`await\`.** An exception inside a task is stored on it and re-raised where the task is awaited; a task never awaited can lose its exception.
- **Async iteration and context managers** (\`async for\`, \`async with\`) are the same idea applied to \`__anext__\` and \`__aenter__\`/\`__aexit__\`; see [async iterators and async for](/interview-question/what-is-an-async-iterator-and-async-for).

## Common Pitfalls

- **Forgetting \`await\`.** You get a coroutine object instead of a result, plus a "was never awaited" warning.
- **Thinking \`await\` runs things in the background.** It waits; use tasks (\`create_task\`, \`gather\`, \`TaskGroup\`) for concurrency.
- **Calling blocking code in a coroutine** (\`time.sleep\`, \`requests.get\`) and freezing every task; use async libraries or \`asyncio.to_thread\`.
- **Expecting parallel CPU speedup.** async is concurrency on one thread; CPU work needs processes.
- **Assuming no races because there is one thread.** State can change across any \`await\`; a check before an \`await\` and a write after it can still race.
- **Dropping task references** so tasks are garbage-collected or their exceptions are never seen.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definitions:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code> makes a coroutine function; calling it returns a coroutine object that runs nothing until it is awaited or wrapped in a task.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What await does:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await x</code> takes any awaitable (coroutine, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Task</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Future</code>, or an object with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__await__</code>), suspends the current coroutine and the whole await chain, and hands control to the event loop until the result is ready.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Under the hood:</strong> <span style="color:#f0e2c8;">It is generator machinery: the loop calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send()</code> to resume, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> deep in the chain suspends, and the return value rides on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration</code>; the bytecode uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GET_AWAITABLE</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SEND</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">YIELD_VALUE</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Concurrency model:</strong> <span style="color:#f0e2c8;">One thread, cooperative: tasks switch only at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> alone is sequential; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create_task</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gather</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TaskGroup</code> make work overlap.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The big caveat:</strong> <span style="color:#f0e2c8;">Any blocking or CPU-heavy call freezes every task; use async libraries, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.to_thread</code> for blocking calls, and processes for CPU work.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await coro()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">asyncio.create_task(coro())</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await coro()</code> runs it now and waits for it to finish before the next line. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create_task</code> schedules it to run independently on the loop and returns a Task immediately; it starts at the next suspension point and you await the Task later for its result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I make my own awaitable without asyncio?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: give the class an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__await__</code> method that returns an iterator, typically a generator. Whatever it yields goes to the driver, whatever the driver sends becomes the value of the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>, and its return value is the result of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">time.sleep(1)</code> in a coroutine hurt but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await asyncio.sleep(1)</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time.sleep</code> blocks the only thread, so the loop cannot run anything. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.sleep</code> registers a timer and suspends, so the loop runs other tasks and resumes this one when the timer fires.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is async code free of race conditions?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Between two <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>s a coroutine is not interrupted, but any state read before an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> can be changed by another task before the code continues. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.Lock</code> for multi-step updates that span an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does async make CPU-bound code faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It overlaps waiting, not computation, on a single thread. For CPU work use processes, or C code that releases the GIL, and call it from async code with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run_in_executor</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Coroutine function | A function defined with \`async def\`; calling it returns a coroutine object. |
| Coroutine object | A paused computation that runs when driven by \`send()\` (via \`await\` or a task). |
| Awaitable | Anything usable after \`await\`: coroutines, Futures, Tasks, objects with \`__await__\`. |
| Suspension point | An \`await\` (or \`async for\` / \`async with\`) where control can go back to the loop. |
| Event loop | The single-threaded scheduler that resumes coroutines and waits for I/O. |
| Cooperative multitasking | Tasks yield control voluntarily at \`await\`, rather than being pre-empted. |
| Task | A coroutine scheduled to run independently on the loop; also a Future. |

**Conclusion:** \`async\`/\`await\` is not magic and not parallelism. \`async def\` builds a suspendable coroutine object; \`await\` forwards suspension all the way up the chain to a driver, which resumes it with \`send()\` and receives the result through \`StopIteration\` — the same machinery as generators. The asyncio event loop is that driver, resuming coroutines when their I/O is ready, so one thread can keep thousands of waiting operations in flight. Use tasks to make work actually overlap, never block the loop, and remember that state can still change across every \`await\`.`,
    examples: [
      {
        label: `Driving coroutines by hand, no asyncio`,
        code: `# async/await with NO asyncio: drive coroutines by hand to see the machinery.
import dis
import inspect


class Wait:
    """A minimal awaitable: its __await__ yields a request to whoever drives us."""
    def __init__(self, what):
        self.what = what

    def __await__(self):
        reply = yield self.what          # suspends the WHOLE await chain
        return reply                     # becomes the value of "await Wait(...)"


async def fetch(name):
    data = await Wait(f"read {name}")
    return data.upper()


async def main():
    a = await fetch("a.txt")
    b = await fetch("b.txt")
    return a + "+" + b


# 1. Calling an async function runs nothing; it builds a coroutine object.
coro = main()
print(type(coro).__name__, inspect.iscoroutine(coro))  # coroutine True
print(inspect.getcoroutinestate(coro))

# 2. A driver (an event loop, in real life) resumes it with send().
request = coro.send(None)
print("coroutine asks for:", request)
print(inspect.getcoroutinestate(coro))
request = coro.send("alpha")             # answer the first request
print("coroutine asks for:", request)
try:
    coro.send("beta")
except StopIteration as stop:
    # the return value rides on StopIteration
    print("finished with:", stop.value)
print(inspect.getcoroutinestate(coro))  # CORO_CLOSED


# 3. A tiny round-robin driver: two coroutines interleave on one thread.
def run_all(*coros):
    results, queue = {}, [(c, None) for c in coros]
    while queue:
        c, value = queue.pop(0)
        try:
            req = c.send(value)
            print("  ", c.__name__, "suspended on:", req)
            queue.append((c, f"<{req}>"))
        except StopIteration as stop:
            results[c.__name__] = stop.value
    return results

async def job_x():
    return await fetch("x")

async def job_y():
    return await fetch("y")

print(run_all(job_x(), job_y()))

# 4. The bytecode: await compiles to a GET_AWAITABLE + SEND/YIELD loop.
ops = [i.opname for i in dis.get_instructions(fetch)]
print([op for op in ops if op in ("RETURN_GENERATOR", "GET_AWAITABLE", "SEND", "YIELD_VALUE")])`,
      },
      {
        label: `Real asyncio: sequential vs concurrent, and a blocking call`,
        runnable: false,
        python: "3.12",
        code: `# Real asyncio: sequential awaits vs concurrent tasks, and a blocking call.
# asyncio.run() cannot run inside the browser page, so this runs on CPython.
import asyncio
import time

log = []


async def download(name, seconds):
    log.append(f"start {name}")
    await asyncio.sleep(seconds)          # yields to the loop while "waiting"
    log.append(f"done  {name}")
    return name.upper()


async def sequential():
    a = await download("a", 0.2)          # await = wait for THIS one to finish
    b = await download("b", 0.1)
    return [a, b]


async def concurrent():
    # gather wraps each coroutine in a Task, so both are in flight at once
    return await asyncio.gather(download("a", 0.2), download("b", 0.1))


async def ticker(stop):
    ticks = 0
    while not stop.is_set():
        ticks += 1
        await asyncio.sleep(0.05)
    return ticks


async def blocking_demo():
    stop = asyncio.Event()
    t = asyncio.create_task(ticker(stop))
    await asyncio.sleep(0)                # let the ticker take its first step
    before = time.perf_counter()
    time.sleep(0.3)                       # BLOCKS the thread: no task can run
    stalled = round(time.perf_counter() - before, 1)
    stop.set()
    ticks = await t
    return stalled, ticks


for runner in (sequential, concurrent):
    log.clear()
    start = time.perf_counter()
    result = asyncio.run(runner())
    elapsed = round(time.perf_counter() - start, 1)
    print(f"{runner.__name__:10} -> {result} in ~{elapsed}s")
    for line in log:
        print("   ", line)

stalled, ticks = asyncio.run(blocking_demo())
print(f"time.sleep blocked the loop for ~{stalled}s; ticker ran {ticks} step(s)")`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does the asyncio event loop schedule coroutines?`,
    difficulty: "hard",
    seoDescription: `How the asyncio event loop schedules work: the ready deque, the timer heap, select, Tasks stepping coroutines, Future callbacks and eager tasks.`,
    description: `**Question presented to candidate:**
"Inside asyncio there is one thread and possibly thousands of coroutines. How does the event loop decide what runs next? Walk me through what happens between \`create_task()\`, an \`await\` on a socket or a sleep, and the coroutine being resumed."

**What a strong answer should cover:**
- The loop holds a **ready queue** of callbacks (a FIFO \`collections.deque\`), a **heap of timers** for \`call_later\`/\`call_at\`, and a **selector** (\`epoll\`, \`kqueue\`, ...) for I/O. Each iteration (\`_run_once\`) waits on the selector with a timeout based on the earliest timer, moves due timers and I/O callbacks to the ready queue, then runs exactly the callbacks that were ready at that moment.
- The loop only runs callbacks; a **Task** turns a coroutine into callbacks: each \`Task.__step\` calls \`coro.send(None)\` until the coroutine yields a Future, then registers a done-callback that schedules the next step.
- Futures connect the two worlds: when I/O completes or a timer fires, \`set_result\` schedules the waiting Tasks with \`call_soon\`.
- Ordering consequences: \`create_task\` does not start the coroutine until the current task suspends; \`call_soon\` is FIFO; \`await asyncio.sleep(0)\` yields one turn; a coroutine that never awaits starves everything (cooperative scheduling).
- 3.12 added \`asyncio.eager_task_factory\`, which runs a new task synchronously up to its first suspension; debug mode reports slow callbacks.

**Code / implementation expected:** Optional — a tiny scheduler model, or a script that prints the order in which tasks and callbacks run.`,
    answer: `**Target Audience:** Developers comfortable with \`async\`/\`await\` who want to explain, precisely, how asyncio orders and resumes work.
**Difficulty:** Hard
**Python version:** Example 1 (a model scheduler, no asyncio) runs in the page on Pyodide 0.25.1 (CPython 3.11.3) and was checked on CPython 3.11. Example 2 uses the real asyncio loop and \`asyncio.eager_task_factory\`, so it was run on CPython 3.12 (3.13 printed the same). Source references are to CPython 3.12 \`Lib/asyncio/base_events.py\` and \`tasks.py\`.

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

An air-traffic controller works alone in the tower. She keeps three things:

1. **A list of planes cleared to move right now**, handled strictly in order — first in, first out.
2. **A schedule board** of planes due at a certain time ("flight 22 lands at 14:05"), always sorted by time.
3. **A radio** that tells her when a plane calls in ("ready for take-off").

Her routine never changes: listen to the radio (but not longer than until the next scheduled event), move everything that is now due onto the "cleared" list, then handle **exactly** the planes that were on the list when she started this round. Anything that becomes cleared while she works waits for the next round.

That is the asyncio event loop, almost line for line. The planes are callbacks, the cleared list is the ready queue, the board is a timer heap, the radio is the OS selector. Once you can describe this loop, every ordering question ("why did this print before that?") answers itself.

## 2. The Loop Runs Callbacks, Not Coroutines

The first surprise: the event loop does not know what a coroutine is. It runs **callbacks** — plain functions with arguments, wrapped in \`Handle\` objects.

📌 **Interview term: Ready queue** — the loop FIFO of callbacks that can run immediately. In CPython 3.12 it is \`self._ready = collections.deque()\` in \`BaseEventLoop.__init__\`. \`loop.call_soon(cb)\` appends to it.

📌 **Interview term: Timer heap** — \`self._scheduled\`, a list kept as a min-heap with \`heapq\` (\`heapq.heappush(self._scheduled, timer)\`), ordered by due time. \`loop.call_later(delay, cb)\` and \`loop.call_at(when, cb)\` push onto it.

📌 **Interview term: Selector** — the OS mechanism that waits for many sockets at once and reports which are ready: \`epoll\` on Linux, \`kqueue\` on macOS/BSD, IOCP via the proactor loop on Windows. On our 3.12 Linux run \`asyncio.new_event_loop()\` was a \`_UnixSelectorEventLoop\` using an \`EpollSelector\`.

## 3. One Turn of the Loop: \`_run_once\`

Every turn of \`loop.run_forever()\` calls \`_run_once()\`. Reading the 3.12 source, it does four things:

1. **Compute a timeout.** If the ready queue is non-empty, \`timeout = 0\` (do not wait). Otherwise wait until the earliest timer is due (or forever if there are none).
2. **Poll for I/O.** \`self._selector.select(timeout)\`, then \`_process_events\` turns each ready socket into callbacks on the ready queue.
3. **Move due timers.** Pop every timer whose time has come (within the clock resolution) from the heap and append it to the ready queue.
4. **Run what is ready now.** \`ntodo = len(self._ready)\`, then pop and run exactly \`ntodo\` callbacks. The source comment says it: *"We run all currently scheduled callbacks, but not any callbacks scheduled by callbacks run this time around -- they will be run the next time (after another I/O poll)."*

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="One loop iteration: select with timeout, I/O callbacks and due timers move to the ready deque, then the ready callbacks run, and the cycle repeats">
  <defs>
    <marker id="py26q5-a1" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="200" height="60" rx="10"/>
  <text class="d-text" x="120" y="56" text-anchor="middle">1. select(timeout)</text>
  <text class="d-sub" x="120" y="76" text-anchor="middle">epoll or kqueue</text>
  <rect class="d-box" x="20" y="200" width="200" height="60" rx="10"/>
  <text class="d-text" x="120" y="226" text-anchor="middle">timer heap</text>
  <text class="d-sub" x="120" y="246" text-anchor="middle">call_later, sleep</text>
  <rect class="d-box-accent" x="290" y="110" width="180" height="70" rx="10"/>
  <text class="d-text" x="380" y="140" text-anchor="middle">ready deque</text>
  <text class="d-sub" x="380" y="162" text-anchor="middle">FIFO of callbacks</text>
  <rect class="d-box" x="530" y="110" width="170" height="70" rx="10"/>
  <text class="d-text" x="615" y="140" text-anchor="middle">4. run ntodo</text>
  <text class="d-sub" x="615" y="162" text-anchor="middle">Task steps run here</text>
  <path class="d-edge" d="M 222 70 L 286 125" marker-end="url(#py26q5-a1)"/>
  <text class="d-sub" x="255" y="78">2. I/O</text>
  <path class="d-edge" d="M 222 220 L 286 168" marker-end="url(#py26q5-a1)"/>
  <text class="d-sub" x="250" y="222">3. due</text>
  <path class="d-edge-accent" d="M 472 145 L 524 145" marker-end="url(#py26q5-a1)"/>
  <path class="d-edge-dashed" d="M 615 106 C 615 20, 320 10, 224 50" marker-end="url(#py26q5-a1)"/>
  <text class="d-sub" x="470" y="40">next turn</text>
</svg>

New callbacks added during step 4 (by \`call_soon\`, or by a Task scheduling its next step) wait for the next turn, after another I/O poll. That rule is what keeps I/O from being starved by a busy chain of callbacks.

## 4. Tasks Turn Coroutines into Callbacks

📌 **Interview term: Future** — an object that will hold a result later. It has \`set_result()\` and a list of done-callbacks; when the result is set, each callback is scheduled with \`call_soon\`. In CPython it is the C type \`_asyncio.Future\`.

📌 **Interview term: Task** — a Future subclass that drives one coroutine (C type \`_asyncio.Task\`). Creating it schedules its first \`__step\` with \`call_soon\`. Each step:

1. calls \`coro.send(None)\` (or \`throw()\` for cancellation), which runs the coroutine until its next suspension;
2. if the coroutine **finished**, \`StopIteration\` carries the return value and the Task sets its own result — waking anything awaiting the Task;
3. if the coroutine **yielded a Future** (from deep inside an \`await\` chain, as explained in [how async/await works](/interview-question/how-does-async-await-work-in-python)), the Task adds its own wake-up as a done-callback of that Future and returns to the loop;
4. if it yielded a **bare \`None\`**, the Task simply schedules its next step with \`call_soon\`. That is how \`asyncio.sleep(0)\` works: the 3.12 \`tasks.py\` helper \`__sleep0\` is just a bare \`yield\`, "used when the 'delay' is set to 0".

So \`await asyncio.sleep(1)\` is: create a Future, \`call_later(1, future.set_result, ...)\`, yield the Future. One second later the timer moves to the ready queue, sets the result, which schedules the Task step, which resumes the coroutine right after the \`await\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Task step sends into the coroutine, the coroutine yields a Future, the Future completes and schedules the next Task step">
  <defs>
    <marker id="py26q5-a2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="70" width="170" height="64" rx="10"/>
  <text class="d-text" x="105" y="98" text-anchor="middle">Task step</text>
  <text class="d-sub" x="105" y="118" text-anchor="middle">coro.send(None)</text>
  <rect class="d-box" x="275" y="70" width="170" height="64" rx="10"/>
  <text class="d-text" x="360" y="98" text-anchor="middle">coroutine</text>
  <text class="d-sub" x="360" y="118" text-anchor="middle">runs to next await</text>
  <rect class="d-box" x="530" y="70" width="170" height="64" rx="10"/>
  <text class="d-text" x="615" y="98" text-anchor="middle">Future</text>
  <text class="d-sub" x="615" y="118" text-anchor="middle">pending</text>
  <path class="d-edge" d="M 192 102 L 269 102" marker-end="url(#py26q5-a2)"/>
  <path class="d-edge" d="M 447 102 L 524 102" marker-end="url(#py26q5-a2)"/>
  <text class="d-sub" x="485" y="88" text-anchor="middle">yields</text>
  <path class="d-edge-accent" d="M 615 138 C 615 200, 105 200, 105 140" marker-end="url(#py26q5-a2)"/>
  <text class="d-sub" x="360" y="196" text-anchor="middle">set_result then call_soon</text>
</svg>

The arrow back is the whole trick: a coroutine never resumes itself; a completed Future schedules the Task step that resumes it.

## 5. The Model, Running in the Page

Example 1 is a 60-line model of exactly this: a \`Loop\` with a ready \`deque\`, a timer heap with a sequence number as tie-breaker, \`call_soon\`, \`call_later\`, a \`Future\` whose \`set_result\` schedules callbacks, and a \`Task\` whose \`step\` calls \`send(None)\`. It uses a virtual clock, so the trace is the same every run:

~~~text
t=0.0  a sleeps 1.0
t=0.0  b sleeps 0.5
t=0.0  parent created child, has not yielded yet
t=0.0  c sleeps 0.5
t=0.5  b sleeps 2.0
t=0.5  child finished -> C
t=0.5  parent got C
~~~

Notice \`parent created child, has not yielded yet\` printed **before** \`c sleeps 0.5\`: creating a Task only queues its first step. And at t=0.5 the timers for B and the child became due together and ran in the order they were scheduled.

## 6. The Real Loop: Ordering Rules You Can Rely On

Example 2 asks the real asyncio loop the same questions:

- **\`create_task\` does not switch.** \`main still running: create_task did not switch\` is line 1; the tasks start only when \`main\` hits \`await asyncio.sleep(0)\`.
- **The ready queue is FIFO.** \`call_soon #1\`, \`t1 step 1\`, \`t2 step 1\`, \`call_soon #2\` ran in exactly the order they were queued.
- **Timers come after what was already ready.** \`call_later(0)\` ran after \`main resumed\`: it went into the timer heap, and was moved to the end of the ready queue at the next turn, behind the callbacks already waiting there.
- **\`sleep(0)\` yields one turn.** After it, \`t1 step 2\` and \`t2 step 2\` ran on the next turn.

📌 **Interview term: Cooperative scheduling** — the loop can only switch at a suspension point. The \`fairness\` part of Example 2 shows the cost: \`greedy\` never awaits, so it printed \`greedy 0, 1, 2\` in one go while the ticker waited; \`cooperative\` awaits \`sleep(0)\` each step, so its lines interleave with the ticker.

📌 **Interview term: Starvation** — a task that is ready never gets to run because another task holds the loop. In asyncio it is caused by any code that runs long without awaiting: CPU loops, blocking I/O, \`time.sleep\`.

## 7. Eager Tasks (3.12+)

\`asyncio.eager_task_factory\` was added in 3.12 ([CPython issue 104144](https://github.com/python/cpython/issues/104144), [Python forum](https://discuss.python.org/t/make-asyncio-eager-task-factory-default/75164)). With \`loop.set_task_factory(asyncio.eager_task_factory)\`, \`create_task\` runs the coroutine **synchronously** up to its first suspension, and only schedules it on the loop if it actually blocks.

📌 **Interview term: Eager task** — a task whose first step runs inside \`create_task\` itself. Example 2 printed \`e1 step 1\` *before* \`main after creating e1\`, the reverse of the default. A coroutine that finishes without awaiting is already done when \`create_task\` returns (\`instant done before any yield? True\`), while one that awaits \`sleep(0)\` is not (\`False\`). That saves a loop turn per task for results that are often cached — but it changes ordering, so code that relied on "the task has not started yet" can break. Lazy remains the default; we found no evidence that this changed.

## 8. Verified: Running the Code

Example 1 on CPython 3.11 and in the page on Pyodide 0.25.1 (same output in both):

~~~text
t=0.0  a sleeps 1.0
t=0.0  b sleeps 0.5
t=0.0  parent created child, has not yielded yet
t=0.0  c sleeps 0.5
t=0.5  b sleeps 2.0
t=0.5  child finished -> C
t=0.5  parent got C
t=0.5  P finished -> ok
t=1.0  a sleeps 1.0
t=2.0  A finished -> A
t=2.5  B finished -> B
2.5
~~~

Example 2 on CPython 3.12 (it calls \`asyncio.run()\`, which the page cannot, so it is shown as code with an "Open in playground" button; 3.13 printed the same):

~~~text
--- lazy_tasks
 1. main still running: create_task did not switch
 2. call_soon #1
 3. t1 step 1
 4. t2 step 1
 5. call_soon #2
 6. main resumed
 7. call_later(0)
 8. t1 step 2
 9. t2 step 2
10. main done
--- eager_tasks
 1. e1 step 1
 2. main after creating e1
 3. e1 step 2
 4. instant done before any yield? True
 5. sleep(0) done before any yield? False
--- fairness
 1.   tick 0
 2. greedy 0
 3. greedy 1
 4. greedy 2
 5.   tick 1
 6.   tick 2
 7. ----
 8.   tick 0
 9. coop 0
10.   tick 1
11. coop 1
12.   tick 2
13. coop 2
~~~

What to notice:

- The model and the real loop agree: creating a task queues it, FIFO order holds, and timers re-enter through the ready queue.
- \`call_soon #2\` ran before \`main resumed\` because it was queued before \`main\` yielded.
- Eager mode flipped lines 1 and 2 of the \`eager_tasks\` block.

## 9. Scheduling APIs at a Glance

| API | Goes into | Runs |
| :--- | :--- | :--- |
| \`loop.call_soon(cb)\` | Ready deque (end) | On the next turn, FIFO |
| \`loop.call_soon_threadsafe(cb)\` | Ready deque, and wakes the selector | From another thread; the only safe way in |
| \`loop.call_later(d, cb)\` / \`call_at\` | Timer heap | When due, appended to the ready deque |
| \`asyncio.create_task(coro)\` | Ready deque (first step) | After the current callback returns |
| Eager \`create_task\` (3.12+) | Runs the first step immediately | Until the first real suspension |
| \`await asyncio.sleep(0)\` | Task re-queued via a bare \`yield\` | Next turn |
| \`await asyncio.sleep(d)\` | Future + timer | After \`d\` seconds, via the ready deque |
| \`await reader.read()\` | Future + selector registration | When the OS reports the socket readable |

## 10. Edge Cases

- **Timer precision.** Timers are due when \`when < now + clock_resolution\`; \`call_later(0)\` is a timer, not a \`call_soon\`, which is why it ran later in Example 2.
- **Cancelled callbacks are skipped**, and when many timers are cancelled the heap is rebuilt (3.12 \`_run_once\` does this when cancelled handles pass a threshold).
- **Other threads must use \`call_soon_threadsafe\`**; plain \`call_soon\` from another thread does not wake a loop sleeping in \`select\`.
- **Debug mode** (\`asyncio.run(main(), debug=True)\`) logs any callback slower than \`loop.slow_callback_duration\` (0.1 s by default); our 3.12 run logged \`Executing <Task finished ...> took 0.200 seconds\` for a blocking \`time.sleep(0.2)\`.
- **\`asyncio.get_event_loop()\`** with no running loop raises \`RuntimeError\` since 3.14 ([docs](https://docs.python.org/3/library/asyncio-eventloop.html)); use \`asyncio.run()\` as the entry point and \`asyncio.get_running_loop()\` inside coroutines.

## Common Pitfalls

- **Assuming \`create_task\` starts the coroutine now.** With the default factory it only queues the first step.
- **Expecting \`call_later(0, cb)\` to behave like \`call_soon(cb)\`.** It is a timer and runs after the callbacks already ready.
- **Long stretches without \`await\`** (CPU loops, blocking calls), which starve every other task and delay I/O.
- **Relying on exact interleaving between tasks for correctness.** FIFO is guaranteed per queue, but adding an \`await\` anywhere shifts every later step; coordinate with \`asyncio.Event\`, \`Queue\` or \`Lock\`.
- **Calling loop methods from another thread** without \`call_soon_threadsafe\` or \`asyncio.run_coroutine_threadsafe\`.
- **Switching on eager tasks globally** without checking code that assumes a new task has not started yet.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The data structures:</strong> <span style="color:#f0e2c8;">The loop keeps a FIFO ready deque of callbacks, a heap of timers for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call_later</code>, and a selector such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">epoll</code> for I/O.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One turn:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_run_once</code> computes a timeout from the earliest timer (zero if work is ready), polls the selector, moves I/O callbacks and due timers onto the ready deque, then runs exactly the callbacks that were ready at that moment.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tasks:</strong> <span style="color:#f0e2c8;">The loop only runs callbacks; a Task step calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">coro.send(None)</code>, and when the coroutine yields a Future the Task registers a done-callback, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">set_result</code> schedules the next step with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call_soon</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Ordering:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create_task</code> only queues the first step; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call_soon</code> is FIFO; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sleep(0)</code> is a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> that requeues the task; timers enter the ready queue behind waiting callbacks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consequences:</strong> <span style="color:#f0e2c8;">Scheduling is cooperative, so code that never awaits starves everything; 3.12 adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eager_task_factory</code>, which runs a new task synchronously until its first suspension.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my task not start right after <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">create_task</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create_task</code> only appends the first step to the ready queue. It runs after the current callback — your coroutine — reaches an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> that suspends and returns control to the loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await asyncio.sleep(0)</code> actually do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It yields a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> up to the Task, which schedules its next step with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call_soon</code> and returns to the loop. Everything already in the ready queue runs first, so it is a yield-one-turn checkpoint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the loop avoid busy-waiting when nothing is ready?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It blocks in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">selector.select(timeout)</code>, where the timeout is the time until the earliest timer, or none if there are no timers. The OS wakes it when a socket becomes ready or the timeout expires.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you safely hand work to the loop from another thread?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loop.call_soon_threadsafe(cb)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.run_coroutine_threadsafe(coro, loop)</code>. They add to the ready queue and write to the self-pipe so a sleeping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">select</code> wakes up; plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call_soon</code> is not thread-safe.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes with eager tasks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The first step runs inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create_task</code>. A coroutine that completes without suspending never touches the loop, saving a turn; one that suspends is scheduled normally. It changes ordering, so it is opt-in.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Ready queue | The FIFO \`deque\` of callbacks the loop will run on its next turn. |
| Timer heap | The \`heapq\` min-heap of callbacks scheduled by time. |
| Selector | The OS facility (\`epoll\`, \`kqueue\`) that waits for many sockets at once. |
| Future | A placeholder for a result; completing it schedules its callbacks. |
| Task | A Future that drives a coroutine one \`send()\` step at a time. |
| Cooperative scheduling | Switching only at suspension points, never pre-emptively. |
| Starvation | A ready task never runs because another holds the loop. |
| Eager task | A task (3.12+ opt-in) whose first step runs inside \`create_task\`. |

**Conclusion:** The asyncio event loop is a short, strict routine: wait on the selector no longer than the next timer, move due I/O callbacks and timers onto a FIFO ready queue, and run exactly what was ready at that moment. Coroutines take part only through Tasks, which turn each \`send()\` step into a callback and each awaited Future into a wake-up registration. From that single picture follow all the ordering rules — \`create_task\` does not run immediately, \`sleep(0)\` yields one turn, timers queue behind ready work, and any code that does not await starves everything else — plus the 3.12 eager-task option that deliberately bends the first of them.`,
    examples: [
      {
        label: `A model scheduler: ready queue, timer heap, Futures and Tasks`,
        code: `# A 60-line model of asyncio's scheduler: a ready queue, a timer heap,
# Futures with callbacks, and Tasks that step coroutines. Virtual clock,
# so the trace is identical on every run.
import heapq
from collections import deque


class Future:
    def __init__(self, loop):
        self.loop, self.done, self.result, self._callbacks = loop, False, None, []

    def set_result(self, value):
        self.done, self.result = True, value
        for cb in self._callbacks:              # wake-ups go to the READY queue
            self.loop.call_soon(cb)

    def __await__(self):
        if not self.done:
            yield self                          # tell the Task what we wait on
        return self.result


class Task(Future):
    def __init__(self, loop, coro, name):
        super().__init__(loop)
        self.coro, self.name = coro, name
        loop.call_soon(self.step)               # scheduled, not started

    def step(self):
        try:
            waiting_on = self.coro.send(None)   # run until the next suspension
        except StopIteration as stop:
            self.loop.trace(f"{self.name} finished -> {stop.value}")
            self.set_result(stop.value)
        else:
            waiting_on._callbacks.append(self.step)


class Loop:
    def __init__(self):
        self.now, self.ready, self.timers, self.seq, self.lines = 0.0, deque(), [], 0, []

    def trace(self, msg):
        self.lines.append(f"t={self.now:.1f}  {msg}")

    def call_soon(self, cb):
        self.ready.append(cb)

    def call_later(self, delay, cb):
        self.seq += 1                           # tie-breaker keeps FIFO order
        heapq.heappush(self.timers, (self.now + delay, self.seq, cb))

    def sleep(self, delay):
        fut = Future(self)
        self.call_later(delay, lambda: fut.set_result(None))
        return fut

    def run(self):
        while self.ready or self.timers:
            if not self.ready:                  # nothing runnable: jump the clock
                self.now = self.timers[0][0]
            while self.timers and self.timers[0][0] <= self.now:
                self.ready.append(heapq.heappop(self.timers)[2])
            for _ in range(len(self.ready)):    # run only what was ready NOW
                self.ready.popleft()()


loop = Loop()

async def worker(name, delays):
    for d in delays:
        loop.trace(f"{name} sleeps {d}")
        await loop.sleep(d)
    return name.upper()

async def parent():
    child = Task(loop, worker("c", [0.5]), "child")
    loop.trace("parent created child, has not yielded yet")
    value = await child                         # a Task is a Future
    loop.trace(f"parent got {value}")
    return "ok"

Task(loop, worker("a", [1.0, 1.0]), "A")
Task(loop, worker("b", [0.5, 2.0]), "B")
Task(loop, parent(), "P")
loop.run()
print("\\n".join(loop.lines))
print(loop.now)  # 2.5`,
      },
      {
        label: `Real asyncio ordering: call_soon, create_task, eager tasks, fairness`,
        runnable: false,
        python: "3.12",
        code: `# The real asyncio loop: what runs in which order. Runs on CPython 3.12+
# (asyncio.eager_task_factory is new in 3.12; asyncio.run needs no page loop).
import asyncio

order = []


async def child(name):
    order.append(f"{name} step 1")
    await asyncio.sleep(0)                 # yield: go to the back of the ready queue
    order.append(f"{name} step 2")


async def lazy_tasks():
    loop = asyncio.get_running_loop()
    loop.call_soon(order.append, "call_soon #1")
    loop.call_later(0, order.append, "call_later(0)")
    t1 = asyncio.create_task(child("t1"))  # queued; does NOT run yet
    t2 = asyncio.create_task(child("t2"))
    loop.call_soon(order.append, "call_soon #2")
    order.append("main still running: create_task did not switch")
    await asyncio.sleep(0)                 # main yields for the first time
    order.append("main resumed")
    await asyncio.gather(t1, t2)
    order.append("main done")


async def eager_tasks():
    asyncio.get_running_loop().set_task_factory(asyncio.eager_task_factory)
    t1 = asyncio.create_task(child("e1"))  # runs NOW, up to its first await
    order.append("main after creating e1")
    await t1
    async def instant():
        return "x"                         # never awaits anything
    quick = asyncio.create_task(instant())
    slow = asyncio.create_task(asyncio.sleep(0))
    order.append(f"instant done before any yield? {quick.done()}")
    order.append(f"sleep(0) done before any yield? {slow.done()}")
    await slow


async def ticker():
    for i in range(3):
        order.append(f"  tick {i}")
        await asyncio.sleep(0)


async def greedy():
    for i in range(3):
        order.append(f"greedy {i}")        # no await inside: never yields


async def cooperative():
    for i in range(3):
        order.append(f"coop {i}")
        await asyncio.sleep(0)             # a checkpoint: let others run


async def fairness():
    await asyncio.gather(ticker(), greedy())
    order.append("----")
    await asyncio.gather(ticker(), cooperative())


for demo in (lazy_tasks, eager_tasks, fairness):
    order.clear()
    asyncio.run(demo())
    print(f"--- {demo.__name__}")
    for i, line in enumerate(order, 1):
        print(f"{i:2}. {line}")`,
      },
    ],
  },
];

export default augments;
