import type { PythonAugment } from "./python-augments.types";

/**
 * Python augments — batch 7 (concurrency + data structures, Q1-14 of
 * curated/python-4.json). Answer + theme-aware inline SVG + "**Interview tip:**"
 * + runnable example. Sandbox-safe: examples use threads (allowed) or
 * demonstrate the underlying mechanism (e.g. pickling for IPC) without spawning
 * processes or deadlocking.
 */
const augments: PythonAugment[] = [
  {
    title: "What is the difference between concurrency and parallelism in Python?",
    answer:
      "- **Concurrency** is *structuring* a program to make progress on **many tasks by interleaving** them — they overlap in time but may share one core. Good for **I/O-bound** work where tasks spend time waiting.\n" +
      "- **Parallelism** is *executing* multiple tasks **literally at the same instant** on multiple cores. Good for **CPU-bound** work.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 180' role='img' aria-label='Concurrency interleaves tasks on one core; parallelism runs them on separate cores'>" +
      "<text class='d-sub' x='130' y='18' text-anchor='middle'>Concurrency (1 core, interleaved)</text>" +
      "<rect class='d-box-accent' x='20' y='30' width='40' height='24'/><rect class='d-box-muted' x='60' y='30' width='40' height='24'/><rect class='d-box-accent' x='100' y='30' width='40' height='24'/><rect class='d-box-muted' x='140' y='30' width='40' height='24'/><rect class='d-box-accent' x='180' y='30' width='40' height='24'/>" +
      "<text class='d-sub' x='130' y='72' text-anchor='middle'>A B A B A ... time &#8594;</text>" +
      "<line class='d-edge-dashed' x1='250' y1='14' x2='250' y2='120'/>" +
      "<text class='d-sub' x='380' y='18' text-anchor='middle'>Parallelism (2 cores, same time)</text>" +
      "<rect class='d-box-accent' x='290' y='30' width='180' height='24'/><text class='d-sub' x='380' y='47' text-anchor='middle'>core 1: task A</text>" +
      "<rect class='d-box-accent' x='290' y='58' width='180' height='24'/><text class='d-sub' x='380' y='75' text-anchor='middle'>core 2: task B</text>" +
      "<text class='d-sub' x='130' y='150' text-anchor='middle'>threading / asyncio (I/O-bound)</text>" +
      "<text class='d-sub' x='380' y='150' text-anchor='middle'>multiprocessing (CPU-bound)</text>" +
      "</svg>\n\n" +
      "In CPython the **GIL** means threads give you *concurrency* but not CPU *parallelism* — only **multiprocessing** (separate interpreters) achieves true parallelism for Python bytecode. So: I/O-bound → threads/asyncio (concurrency is enough, since tasks are waiting); CPU-bound → multiprocessing (you need parallelism). Rob Pike's line: 'concurrency is about *dealing with* many things at once; parallelism is about *doing* many things at once.'\n\n" +
      "**Interview tip:** 'concurrency = interleaving/structure; parallelism = simultaneous execution.' Anchor it to the GIL (threads = concurrency only) and the decision rule (I/O→threads/asyncio, CPU→multiprocessing). The Pike quote is a clean mic-drop.",
    examples: [
      {
        label: "Threads interleave (concurrency) on I/O waits",
        tech: "python",
        code:
          "import time\n" +
          "from threading import Thread\n\n" +
          "def worker(name):\n" +
          "    for i in range(3):\n" +
          "        print(f\"{name} step {i}\")\n" +
          "        time.sleep(0.01)        # yields -> other thread runs\n\n" +
          "start = time.perf_counter()\n" +
          "a = Thread(target=worker, args=(\"A\",))\n" +
          "b = Thread(target=worker, args=(\"B\",))\n" +
          "a.start(); b.start()\n" +
          "a.join(); b.join()\n" +
          "print(f\"interleaved in {time.perf_counter()-start:.2f}s\")",
      },
    ],
  },
  {
    title: "How does the asyncio event loop schedule coroutines?",
    answer:
      "`asyncio` runs **one thread** with an **event loop** that juggles many coroutines cooperatively. Each task runs until it hits an **`await`** on something not-yet-ready (I/O, a timer, another future); the loop then **parks** that task and runs the next **ready** one. When the awaited thing completes, a callback marks the task ready again and the loop **resumes** it where it left off:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 190' role='img' aria-label='Event loop pulls ready tasks, runs until await, parks on a future, resumes on completion'>" +
      "<defs><marker id='py-el-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<circle class='d-box-accent' cx='110' cy='95' r='52'/><text class='d-text' x='110' y='92' text-anchor='middle'>event</text><text class='d-text' x='110' y='108' text-anchor='middle'>loop</text>" +
      "<rect class='d-box' x='250' y='20' width='160' height='40' rx='8'/><text class='d-text' x='330' y='40' text-anchor='middle'>ready queue</text><text class='d-sub' x='330' y='54' text-anchor='middle'>tasks to run now</text>" +
      "<rect class='d-box-muted' x='250' y='130' width='160' height='40' rx='8'/><text class='d-text' x='330' y='150' text-anchor='middle'>awaiting futures</text><text class='d-sub' x='330' y='164' text-anchor='middle'>parked on I/O</text>" +
      "<line class='d-edge-accent' x1='162' y1='80' x2='248' y2='44' marker-end='url(#py-el-ar)'/><text class='d-sub' x='205' y='58'>pick &amp; run</text>" +
      "<line class='d-edge' x1='330' y1='60' x2='330' y2='128' marker-end='url(#py-el-ar)'/><text class='d-sub' x='370' y='96'>hits await</text>" +
      "<line class='d-edge-accent' x1='248' y1='150' x2='162' y2='110' marker-end='url(#py-el-ar)'/><text class='d-sub' x='205' y='150'>ready &#8594; resume</text>" +
      "</svg>\n\n" +
      "Because it's **cooperative single-threading**, there are no data races within the loop — but a **blocking call** (sync `time.sleep`, a CPU loop, `requests.get`) **freezes the whole loop**, since nothing can preempt it. You create concurrency with `asyncio.create_task()`/`asyncio.gather()`, and offload blocking/CPU work via `run_in_executor`.\n\n" +
      "**Interview tip:** 'single-threaded cooperative loop: run a task until it awaits, park it, run others, resume on completion.' The non-negotiable caveat is that a blocking call stalls the entire loop — and the fix (`asyncio.sleep`, executors). That's what they're really probing.",
    examples: [
      {
        label: "Tasks yield at await so others can run",
        tech: "python",
        code:
          "import asyncio\n\n" +
          "async def task(name, n):\n" +
          "    for i in range(n):\n" +
          "        print(f\"{name}: tick {i}\")\n" +
          "        await asyncio.sleep(0.01)   # park here, loop runs others\n" +
          "    return f\"{name} done\"\n\n" +
          "async def main():\n" +
          "    # scheduled concurrently on ONE thread\n" +
          "    results = await asyncio.gather(task(\"A\", 3), task(\"B\", 3))\n" +
          "    print(\"results:\", results)\n\n" +
          "asyncio.run(main())",
      },
    ],
  },
  {
    title: "How does multiprocessing share data between processes?",
    answer:
      "Unlike threads, processes have **separate memory** — they can't see each other's objects. So `multiprocessing` moves data **explicitly**, and the default mechanism is **pickling**: an object is serialized to bytes, sent over a pipe/queue, and reconstructed on the other side.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 170' role='img' aria-label='Process A pickles an object through a pipe to process B which unpickles it'>" +
      "<defs><marker id='py-mp-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='10' y='50' width='120' height='60' rx='8'/><text class='d-text' x='70' y='76' text-anchor='middle'>Process A</text><text class='d-sub' x='70' y='94' text-anchor='middle'>obj &#8594; pickle</text>" +
      "<rect class='d-box-accent' x='185' y='62' width='130' height='36' rx='8'/><text class='d-text' x='250' y='84' text-anchor='middle'>pipe / queue</text>" +
      "<rect class='d-box' x='370' y='50' width='120' height='60' rx='8'/><text class='d-text' x='430' y='76' text-anchor='middle'>Process B</text><text class='d-sub' x='430' y='94' text-anchor='middle'>unpickle &#8594; obj</text>" +
      "<line class='d-edge-accent' x1='130' y1='80' x2='183' y2='80' marker-end='url(#py-mp-ar)'/><text class='d-sub' x='156' y='66' text-anchor='middle'>bytes</text>" +
      "<line class='d-edge-accent' x1='315' y1='80' x2='368' y2='80' marker-end='url(#py-mp-ar)'/><text class='d-sub' x='342' y='66' text-anchor='middle'>bytes</text>" +
      "<text class='d-sub' x='250' y='140' text-anchor='middle'>or skip copying: shared_memory / Value / Array for raw bytes</text>" +
      "</svg>\n\n" +
      "Tools: **`Queue`/`Pipe`** (pickled message passing), **`Pool`** (pickles arguments and results to/from workers), and for large numeric data **`Value`/`Array`/`shared_memory`** (a real shared memory block, no copy — what NumPy-heavy code uses). Consequences: arguments and return values **must be picklable** (no lambdas/local functions/open sockets), and pickling has cost — chatty IPC of big objects can erase the parallelism win.\n\n" +
      "**Interview tip:** 'separate memory, so data is shared by **pickling** over pipes/queues — or `shared_memory`/`Value`/`Array` to avoid copies.' The gotcha to name: everything passed must be **picklable**, and IPC overhead means coarse-grained tasks win.",
    examples: [
      {
        label: "Pickling is the IPC mechanism (round-trip)",
        tech: "python",
        code:
          "import pickle\n\n" +
          "# What a Queue/Pool does under the hood to cross the process boundary:\n" +
          "task = {\"op\": \"sum\", \"data\": [1, 2, 3, 4]}\n\n" +
          "wire_bytes = pickle.dumps(task)         # sender serializes\n" +
          "print(\"on the wire:\", len(wire_bytes), \"bytes\")\n\n" +
          "received = pickle.loads(wire_bytes)     # other process rebuilds it\n" +
          "result = sum(received[\"data\"])\n" +
          "print(\"reconstructed:\", received)\n" +
          "print(\"computed     :\", result)\n\n" +
          "# Unpicklable payloads can't cross processes:\n" +
          "try:\n" +
          "    pickle.dumps(lambda x: x)\n" +
          "except Exception as e:\n" +
          "    print(\"not picklable:\", type(e).__name__)",
      },
    ],
  },
  {
    title: "What is an async iterator and async for?",
    answer:
      "An **async iterator** is the asynchronous version of the iterator protocol: it defines **`__aiter__`** and **`__anext__`** (a **coroutine**), and raises **`StopAsyncIteration`** when done. You consume it with **`async for`**, which **awaits each item** — so iteration can *suspend on I/O* between elements without blocking the event loop:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='async for awaits each __anext__ which may suspend on I/O'>" +
      "<defs><marker id='py-ai-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='20' y='52' width='130' height='46' rx='8'/><text class='d-text' x='85' y='72' text-anchor='middle'>async for x in s</text><text class='d-sub' x='85' y='88' text-anchor='middle'>__aiter__</text>" +
      "<rect class='d-box-accent' x='200' y='52' width='140' height='46' rx='8'/><text class='d-text' x='270' y='72' text-anchor='middle'>await __anext__()</text><text class='d-sub' x='270' y='88' text-anchor='middle'>may suspend on I/O</text>" +
      "<rect class='d-box-muted' x='380' y='52' width='110' height='46' rx='8'/><text class='d-text' x='435' y='72' text-anchor='middle'>StopAsync-</text><text class='d-text' x='435' y='88' text-anchor='middle'>Iteration</text>" +
      "<line class='d-edge' x1='150' y1='75' x2='198' y2='75' marker-end='url(#py-ai-ar)'/>" +
      "<path class='d-edge-accent' d='M270 52 C 270 30, 200 30, 200 50' fill='none' marker-end='url(#py-ai-ar)'/><text class='d-sub' x='235' y='26' text-anchor='middle'>loop per item</text>" +
      "<line class='d-edge' x1='340' y1='75' x2='378' y2='75' marker-end='url(#py-ai-ar)'/>" +
      "</svg>\n\n" +
      "The easy way to build one is an **async generator** — an `async def` with `yield` — which auto-implements the protocol. This is the natural shape for **streaming** data: paginated API calls, rows from an async DB cursor, or messages off a socket, where each item requires an `await`. There are also **async context managers** (`async with`, via `__aenter__`/`__aexit__`).\n\n" +
      "**Interview tip:** 'the async twin of the iterator protocol — `__aiter__`/`__anext__` (a coroutine), consumed by `async for`, ended by `StopAsyncIteration`; easiest via an async generator.' The use case to name is **streaming I/O** (paged APIs, DB cursors) where each item needs to await.",
    examples: [
      {
        label: "An async generator streamed with async for",
        tech: "python",
        code:
          "import asyncio\n\n" +
          "async def fetch_pages(n):           # async generator\n" +
          "    for page in range(1, n + 1):\n" +
          "        await asyncio.sleep(0.01)   # simulate awaiting the network\n" +
          "        yield f\"page {page} data\"\n\n" +
          "async def main():\n" +
          "    async for chunk in fetch_pages(3):   # awaits each item\n" +
          "        print(\"received:\", chunk)\n\n" +
          "asyncio.run(main())",
      },
    ],
  },
  {
    title: "What is a race condition and how do locks prevent it?",
    answer:
      "A **race condition** happens when the correctness of the result depends on the **timing/interleaving** of threads touching **shared mutable state**. Even `counter += 1` isn't atomic — it's *read, add, write* — so two threads can both read the same value and one update is **lost**:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 160' role='img' aria-label='Two threads interleave read-modify-write and lose an update; a lock serializes them'>" +
      "<text class='d-sub' x='130' y='16' text-anchor='middle'>without a lock (lost update)</text>" +
      "<rect class='d-box' x='20' y='28' width='100' height='26' rx='5'/><text class='d-sub' x='70' y='45' text-anchor='middle'>T1 read 0</text>" +
      "<rect class='d-box' x='140' y='28' width='100' height='26' rx='5'/><text class='d-sub' x='190' y='45' text-anchor='middle'>T2 read 0</text>" +
      "<rect class='d-box' x='20' y='60' width='100' height='26' rx='5'/><text class='d-sub' x='70' y='77' text-anchor='middle'>T1 write 1</text>" +
      "<rect class='d-box' x='140' y='60' width='100' height='26' rx='5'/><text class='d-sub' x='190' y='77' text-anchor='middle'>T2 write 1</text>" +
      "<text class='d-accent d-sub' x='130' y='106' text-anchor='middle'>result 1, not 2 &#8594; lost!</text>" +
      "<line class='d-edge-dashed' x1='270' y1='12' x2='270' y2='130'/>" +
      "<text class='d-sub' x='390' y='16' text-anchor='middle'>with a lock (serialized)</text>" +
      "<rect class='d-box-accent' x='300' y='34' width='180' height='26' rx='5'/><text class='d-sub' x='390' y='51' text-anchor='middle'>T1: acquire, +1, release</text>" +
      "<rect class='d-box-accent' x='300' y='66' width='180' height='26' rx='5'/><text class='d-sub' x='390' y='83' text-anchor='middle'>T2: acquire, +1, release</text>" +
      "<text class='d-accent d-sub' x='390' y='112' text-anchor='middle'>result 2 (correct)</text>" +
      "</svg>\n\n" +
      "A **`Lock`** fixes it by making the read-modify-write a **critical section**: only the thread holding the lock runs it, others wait. Use `with lock:` so it's released even on exceptions. (The GIL makes *single bytecode ops* atomic, but `+=` is several ops — so you still need a lock.) Keep critical sections small to avoid contention.\n\n" +
      "**Interview tip:** define it as *unsynchronized access to shared mutable state where the interleaving changes the result*, and show that `+=` is read-modify-write (not atomic despite the GIL). The fix is a `Lock` (`with lock:`) wrapping the critical section.",
    examples: [
      {
        label: "Lost updates without a lock; correct with one",
        tech: "python",
        code:
          "from threading import Thread, Lock\n\n" +
          "def run(use_lock):\n" +
          "    counter = 0\n" +
          "    lock = Lock()\n" +
          "    def bump():\n" +
          "        nonlocal counter\n" +
          "        for _ in range(50_000):\n" +
          "            if use_lock:\n" +
          "                with lock:\n" +
          "                    counter += 1\n" +
          "            else:\n" +
          "                counter += 1        # racy read-modify-write\n" +
          "    threads = [Thread(target=bump) for _ in range(4)]\n" +
          "    for t in threads: t.start()\n" +
          "    for t in threads: t.join()\n" +
          "    return counter\n\n" +
          "print(\"expected      :\", 4 * 50_000)\n" +
          "print(\"no lock (race):\", run(False))\n" +
          "print(\"with lock     :\", run(True))",
      },
    ],
  },
  {
    title: "What is a deadlock in Python?",
    answer:
      "A **deadlock** is when two or more threads each hold a lock the other needs and **wait forever** — no one can proceed. The classic shape is **inconsistent lock ordering**: thread 1 grabs A then wants B; thread 2 grabs B then wants A:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 460 180' role='img' aria-label='Circular wait: T1 holds A wants B, T2 holds B wants A'>" +
      "<defs><marker id='py-dl-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='40' y='30' width='110' height='40' rx='8'/><text class='d-text' x='95' y='54' text-anchor='middle'>Thread 1</text>" +
      "<rect class='d-box' x='310' y='30' width='110' height='40' rx='8'/><text class='d-text' x='365' y='54' text-anchor='middle'>Thread 2</text>" +
      "<rect class='d-box-accent' x='40' y='118' width='110' height='40' rx='8'/><text class='d-text' x='95' y='142' text-anchor='middle'>Lock A</text>" +
      "<rect class='d-box-accent' x='310' y='118' width='110' height='40' rx='8'/><text class='d-text' x='365' y='142' text-anchor='middle'>Lock B</text>" +
      "<line class='d-edge' x1='95' y1='70' x2='95' y2='116' marker-end='url(#py-dl-ar)'/><text class='d-sub' x='70' y='96'>holds</text>" +
      "<line class='d-edge' x1='365' y1='70' x2='365' y2='116' marker-end='url(#py-dl-ar)'/><text class='d-sub' x='390' y='96'>holds</text>" +
      "<line class='d-edge-dashed' x1='150' y1='45' x2='345' y2='120' marker-end='url(#py-dl-ar)'/><text class='d-sub' x='250' y='70' text-anchor='middle'>wants B</text>" +
      "<line class='d-edge-dashed' x1='310' y1='45' x2='115' y2='120' marker-end='url(#py-dl-ar)'/><text class='d-sub' x='250' y='104' text-anchor='middle'>wants A</text>" +
      "<text class='d-accent d-sub' x='230' y='176' text-anchor='middle'>circular wait &#8594; both blocked forever</text>" +
      "</svg>\n\n" +
      "Prevent it by attacking the four Coffman conditions — most practically: **acquire locks in a single consistent global order** (everyone takes A before B), use **`acquire(timeout=...)`** and back off if it fails, hold locks briefly, or use higher-level constructs (a queue) that avoid manual locking. `threading.RLock` solves the *self*-deadlock of re-acquiring your own lock.\n\n" +
      "**Interview tip:** 'mutual circular waiting on locks.' The fix interviewers want is **consistent lock ordering** (plus timeouts as a safety net). Mentioning the Coffman conditions or preferring a queue over hand-rolled locks signals depth.",
    examples: [
      {
        label: "Avoid deadlock with a lock-acquire timeout",
        tech: "python",
        code:
          "from threading import Lock\n\n" +
          "a, b = Lock(), Lock()\n\n" +
          "# Simulate the dangerous order: B is already held elsewhere\n" +
          "b.acquire()\n\n" +
          "a.acquire()\n" +
          "print(\"got A, now trying B with a timeout...\")\n\n" +
          "# Instead of blocking forever, time out and back off\n" +
          "if b.acquire(timeout=0.1):\n" +
          "    print(\"got both\")\n" +
          "    b.release()\n" +
          "else:\n" +
          "    print(\"could not get B -> backing off (no deadlock)\")\n\n" +
          "a.release()\n" +
          "b.release()\n" +
          "print(\"released cleanly\")",
      },
    ],
  },
  {
    title: "How does heapq work in Python?",
    answer:
      "`heapq` maintains a **binary min-heap** stored inside an **ordinary list**. The heap invariant is: every parent is **≤** its children, so the smallest element is always at index 0. The tree is implicit — for index `i`, children are at `2i+1` and `2i+2`:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 460 190' role='img' aria-label='Binary min-heap as a tree mapped to a list by index'>" +
      "<defs><marker id='py-hq-ar' markerWidth='8' markerHeight='8' refX='6' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L7,4 L0,8 Z'/></marker></defs>" +
      "<circle class='d-box-accent' cx='230' cy='34' r='20'/><text class='d-text' x='230' y='39' text-anchor='middle'>1</text>" +
      "<circle class='d-box' cx='150' cy='94' r='20'/><text class='d-text' x='150' y='99' text-anchor='middle'>3</text>" +
      "<circle class='d-box' cx='310' cy='94' r='20'/><text class='d-text' x='310' y='99' text-anchor='middle'>2</text>" +
      "<circle class='d-box' cx='110' cy='154' r='20'/><text class='d-text' x='110' y='159' text-anchor='middle'>7</text>" +
      "<circle class='d-box' cx='190' cy='154' r='20'/><text class='d-text' x='190' y='159' text-anchor='middle'>5</text>" +
      "<line class='d-edge' x1='215' y1='48' x2='165' y2='80'/><line class='d-edge' x1='245' y1='48' x2='295' y2='80'/>" +
      "<line class='d-edge' x1='138' y1='110' x2='120' y2='138'/><line class='d-edge' x1='162' y1='110' x2='180' y2='138'/>" +
      "<text class='d-sub' x='40' y='34'>root = min</text><line class='d-edge-accent' x1='100' y1='34' x2='208' y2='34' marker-end='url(#py-hq-ar)'/>" +
      "<text class='d-sub' x='230' y='184' text-anchor='middle'>list: [1, 3, 2, 7, 5]   child(i) = 2i+1, 2i+2</text>" +
      "</svg>\n\n" +
      "`heappush`/`heappop` are **O(log n)** (an element bubbles up/sifts down one level per step), and peeking the min (`heap[0]`) is **O(1)**. `heapify` builds a heap in **O(n)**. It's the tool for **priority queues**, **top-k** (`nlargest`/`nsmallest`), merging sorted streams (`heapq.merge`), and Dijkstra-style algorithms. It's a **min**-heap; for a max-heap, negate the keys or store `(-priority, item)` tuples.\n\n" +
      "**Interview tip:** 'binary min-heap on a plain list: O(1) peek-min, O(log n) push/pop, O(n) heapify.' Name the use cases (priority queue, top-k) and the **min-heap → negate for max-heap** trick, which is the most common practical wrinkle.",
    examples: [
      {
        label: "Priority queue and top-k with heapq",
        tech: "python",
        code:
          "import heapq\n\n" +
          "nums = [5, 1, 8, 3, 9, 2, 7]\n\n" +
          "heapq.heapify(nums)                 # O(n) -> min at index 0\n" +
          "print(\"min:\", nums[0])\n\n" +
          "order = [heapq.heappop(nums) for _ in range(3)]\n" +
          "print(\"3 smallest popped:\", order)\n\n" +
          "# top-k without a full sort\n" +
          "data = [5, 1, 8, 3, 9, 2, 7]\n" +
          "print(\"3 largest :\", heapq.nlargest(3, data))\n\n" +
          "# max-heap via negation\n" +
          "max_heap = [-x for x in data]\n" +
          "heapq.heapify(max_heap)\n" +
          "print(\"max:\", -heapq.heappop(max_heap))",
      },
    ],
  },
  {
    title: "How does the bisect module work?",
    answer:
      "`bisect` does **binary search** on an **already-sorted** list to find, in **O(log n)**, the **index where a value would be inserted** to keep the list sorted. `bisect_left` returns the leftmost such position (before equal items), `bisect_right` the rightmost (after them); `insort` finds the spot and inserts:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 150' role='img' aria-label='Binary search halving a sorted list to find an insertion point'>" +
      "<defs><marker id='py-bs-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='240' y='18' text-anchor='middle'>sorted: [10, 20, 30, 40, 50]  find 35</text>" +
      "<rect class='d-box' x='40' y='34' width='70' height='34'/><text class='d-text' x='75' y='56' text-anchor='middle'>10</text>" +
      "<rect class='d-box' x='110' y='34' width='70' height='34'/><text class='d-text' x='145' y='56' text-anchor='middle'>20</text>" +
      "<rect class='d-box-accent' x='180' y='34' width='70' height='34'/><text class='d-text' x='215' y='56' text-anchor='middle'>30</text>" +
      "<rect class='d-box' x='250' y='34' width='70' height='34'/><text class='d-text' x='285' y='56' text-anchor='middle'>40</text>" +
      "<rect class='d-box' x='320' y='34' width='70' height='34'/><text class='d-text' x='355' y='56' text-anchor='middle'>50</text>" +
      "<line class='d-edge-accent' x1='250' y1='100' x2='250' y2='70' marker-end='url(#py-bs-ar)'/>" +
      "<text class='d-accent d-sub' x='250' y='118' text-anchor='middle'>insertion index 3 (between 30 and 40)</text>" +
      "<text class='d-sub' x='240' y='140' text-anchor='middle'>halve the search range each step &#8594; O(log n)</text>" +
      "</svg>\n\n" +
      "Uses: keep a list sorted as you stream inserts; **fast membership/range** queries on sorted data; and **grade/bucket** lookups — e.g. map a score to a letter grade by `bisect` over breakpoints. The catch: it only works on **sorted** input (it won't sort for you), and `insort` is O(n) for the shift even though finding the spot is O(log n).\n\n" +
      "**Interview tip:** 'binary search for the insertion point in O(log n); `bisect_left`/`bisect_right` handle the equal-element edge.' The standout use is **breakpoint/grade bucketing** with `bisect`. Flag that the list must already be sorted and `insort`'s insert is still O(n).",
    examples: [
      {
        label: "Grade bucketing and sorted inserts",
        tech: "python",
        code:
          "import bisect\n\n" +
          "# Map a score to a grade via breakpoints (classic bisect trick)\n" +
          "breakpoints = [60, 70, 80, 90]\n" +
          "grades = \"FDCBA\"\n" +
          "def grade(score):\n" +
          "    return grades[bisect.bisect_right(breakpoints, score)]\n\n" +
          "for s in [55, 72, 85, 95]:\n" +
          "    print(f\"{s} -> {grade(s)}\")\n\n" +
          "# Keep a list sorted while inserting\n" +
          "data = [10, 20, 40, 50]\n" +
          "bisect.insort(data, 35)\n" +
          "print(\"after insort 35:\", data)\n" +
          "print(\"index for 30:\", bisect.bisect_left(data, 30))",
      },
    ],
  },
  {
    title: "How does collections.deque work internally?",
    answer:
      "A `deque` ('deck', double-ended queue) is implemented as a **doubly-linked list of fixed-size blocks** (small arrays), not one big contiguous array. That layout gives **O(1)** appends and pops at **both ends** — adding/removing at the head never shifts the other elements:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='Deque as linked blocks with O(1) operations at both ends'>" +
      "<defs><marker id='py-dq-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='110' y='50' width='100' height='44' rx='6'/><text class='d-sub' x='160' y='76' text-anchor='middle'>block [.,.,.]</text>" +
      "<rect class='d-box' x='250' y='50' width='100' height='44' rx='6'/><text class='d-sub' x='300' y='76' text-anchor='middle'>block [.,.,.]</text>" +
      "<line class='d-edge' x1='210' y1='64' x2='248' y2='64' marker-end='url(#py-dq-ar)'/>" +
      "<line class='d-edge' x1='248' y1='80' x2='210' y2='80' marker-end='url(#py-dq-ar)'/>" +
      "<text class='d-accent d-sub' x='50' y='40'>appendleft O(1)</text><line class='d-edge-accent' x1='60' y1='48' x2='110' y2='60' marker-end='url(#py-dq-ar)'/>" +
      "<text class='d-accent d-sub' x='400' y='40'>append O(1)</text><line class='d-edge-accent' x1='430' y1='48' x2='350' y2='60' marker-end='url(#py-dq-ar)'/>" +
      "<text class='d-sub' x='250' y='128' text-anchor='middle'>vs list: appendleft / pop(0) shift all elements &#8594; O(n)</text>" +
      "</svg>\n\n" +
      "That makes it the right structure for **queues** (FIFO) and **BFS**, sliding windows (with **`maxlen`**, it auto-evicts from the far end), and undo/redo stacks. The trade-off vs a list: **indexing in the middle is O(n)** (you traverse blocks), so use a list when you need fast random access and a deque when you push/pop at the ends.\n\n" +
      "**Interview tip:** 'doubly-linked blocks &#8594; O(1) at both ends, vs a list whose front ops are O(n).' The two killer features to name are **FIFO queue/BFS** and **`maxlen` sliding window**; the cost is O(n) middle indexing.",
    examples: [
      {
        label: "O(1) both ends, plus a maxlen sliding window",
        tech: "python",
        code:
          "from collections import deque\n\n" +
          "q = deque([1, 2, 3])\n" +
          "q.appendleft(0)        # O(1) at the front (list would be O(n))\n" +
          "q.append(4)            # O(1) at the back\n" +
          "print(\"deque:\", q)\n" +
          "print(\"popleft:\", q.popleft(), \"-> FIFO queue\")\n\n" +
          "# maxlen: a fixed-size sliding window that auto-evicts\n" +
          "window = deque(maxlen=3)\n" +
          "for n in range(1, 7):\n" +
          "    window.append(n)\n" +
          "    print(\"window:\", list(window))",
      },
    ],
  },
  {
    title: "How does an LRU cache work internally?",
    answer:
      "An **LRU (Least-Recently-Used) cache** must do three things in **O(1)**: look up by key, mark an entry as just-used, and evict the **least-recently-used** entry when full. The standard design combines **two structures**: a **hash map** (key → node) for O(1) lookup, and a **doubly-linked list** ordered by recency (most-recent at the front, least-recent at the back):\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 160' role='img' aria-label='LRU cache: hash map to nodes in a recency-ordered doubly linked list'>" +
      "<defs><marker id='py-lru-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-muted' x='10' y='40' width='90' height='80' rx='8'/><text class='d-text' x='55' y='66' text-anchor='middle'>hash map</text><text class='d-sub' x='55' y='84' text-anchor='middle'>key &#8594; node</text><text class='d-sub' x='55' y='100' text-anchor='middle'>O(1) find</text>" +
      "<text class='d-accent d-sub' x='180' y='34' text-anchor='middle'>most recent (front)</text>" +
      "<rect class='d-box-accent' x='150' y='60' width='70' height='40' rx='6'/><text class='d-text' x='185' y='84' text-anchor='middle'>A</text>" +
      "<rect class='d-box' x='250' y='60' width='70' height='40' rx='6'/><text class='d-text' x='285' y='84' text-anchor='middle'>B</text>" +
      "<rect class='d-box' x='350' y='60' width='70' height='40' rx='6'/><text class='d-text' x='385' y='84' text-anchor='middle'>C</text>" +
      "<text class='d-sub' x='385' y='118' text-anchor='middle'>evict here when full</text>" +
      "<line class='d-edge' x1='220' y1='74' x2='248' y2='74' marker-end='url(#py-lru-ar)'/><line class='d-edge' x1='248' y1='86' x2='222' y2='86' marker-end='url(#py-lru-ar)'/>" +
      "<line class='d-edge' x1='320' y1='74' x2='348' y2='74' marker-end='url(#py-lru-ar)'/><line class='d-edge' x1='348' y1='86' x2='322' y2='86' marker-end='url(#py-lru-ar)'/>" +
      "<line class='d-edge' x1='100' y1='80' x2='148' y2='80' marker-end='url(#py-lru-ar)'/>" +
      "</svg>\n\n" +
      "On a **hit**, move that node to the front (O(1) pointer surgery). On **insert past capacity**, drop the back node and its map entry. CPython's **`functools.lru_cache`** is exactly this idea; you can also approximate it with an **`OrderedDict`** using `move_to_end()` and `popitem(last=False)`. It's a top interview build because it forces both data structures to cooperate for O(1).\n\n" +
      "**Interview tip:** the answer they want is **hash map (O(1) lookup) + doubly-linked list (O(1) recency reorder/evict)**. Mention `functools.lru_cache` as the stdlib version and `OrderedDict` (`move_to_end`/`popitem(last=False)`) as the easy hand-roll.",
    examples: [
      {
        label: "An LRU cache via OrderedDict",
        tech: "python",
        code:
          "from collections import OrderedDict\n\n" +
          "class LRUCache:\n" +
          "    def __init__(self, capacity):\n" +
          "        self.cap = capacity\n" +
          "        self.store = OrderedDict()\n\n" +
          "    def get(self, key):\n" +
          "        if key not in self.store:\n" +
          "            return -1\n" +
          "        self.store.move_to_end(key)      # mark most-recent\n" +
          "        return self.store[key]\n\n" +
          "    def put(self, key, value):\n" +
          "        if key in self.store:\n" +
          "            self.store.move_to_end(key)\n" +
          "        self.store[key] = value\n" +
          "        if len(self.store) > self.cap:\n" +
          "            evicted, _ = self.store.popitem(last=False)  # drop LRU\n" +
          "            print(\"  evicted:\", evicted)\n\n" +
          "c = LRUCache(2)\n" +
          "c.put(\"a\", 1); c.put(\"b\", 2)\n" +
          "print(\"get a:\", c.get(\"a\"))     # touches 'a' -> 'b' is now LRU\n" +
          "c.put(\"c\", 3)                    # evicts 'b'\n" +
          "print(\"get b:\", c.get(\"b\"))     # -1 (gone)",
      },
    ],
  },
  {
    title: "How does Timsort make Python's sort fast and stable?",
    answer:
      "**Timsort** is Python's built-in sort (`list.sort`, `sorted`) — a hybrid of **merge sort** and **insertion sort** tuned for **real-world data**, which often has pre-sorted stretches. It scans for existing ascending/descending **runs**, extends short runs with insertion sort up to a minimum length, then **merges** runs using a smart balancing strategy:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='Timsort detects sorted runs then merges them pairwise'>" +
      "<defs><marker id='py-ts-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='100' y='18' text-anchor='middle'>detect runs</text>" +
      "<rect class='d-box-accent' x='20' y='28' width='80' height='30' rx='6'/><text class='d-sub' x='60' y='48' text-anchor='middle'>run [2,5,9]</text>" +
      "<rect class='d-box-accent' x='110' y='28' width='80' height='30' rx='6'/><text class='d-sub' x='150' y='48' text-anchor='middle'>run [1,4,8]</text>" +
      "<rect class='d-box' x='280' y='28' width='90' height='30' rx='6'/><text class='d-sub' x='325' y='48' text-anchor='middle'>merge runs</text>" +
      "<rect class='d-box' x='200' y='100' width='220' height='30' rx='6'/><text class='d-sub' x='310' y='120' text-anchor='middle'>[1,2,4,5,8,9] sorted &amp; stable</text>" +
      "<line class='d-edge' x1='190' y1='43' x2='278' y2='43' marker-end='url(#py-ts-ar)'/>" +
      "<line class='d-edge-accent' x1='325' y1='58' x2='320' y2='98' marker-end='url(#py-ts-ar)'/>" +
      "<text class='d-sub' x='100' y='90' text-anchor='middle'>insertion sort for short runs</text>" +
      "</svg>\n\n" +
      "Properties worth knowing: it's **stable** (equal elements keep their input order — which is what makes multi-key sorting by repeated passes work), **adaptive** (≈ **O(n)** on already-/nearly-sorted data, **O(n log n)** worst case), and it uses the `key=` function once per element. You rarely implement it, but understanding 'stable + adaptive merge/insertion hybrid' explains Python's sort guarantees.\n\n" +
      "**Interview tip:** 'merge+insertion hybrid that exploits existing runs — stable, adaptive, O(n) best / O(n log n) worst.' The word that matters most is **stable** (enables layered multi-key sorts); 'adaptive on nearly-sorted data' is the second.",
    examples: [
      {
        label: "Stability enables multi-key sorting in passes",
        tech: "python",
        code:
          "people = [(\"eng\", \"Bo\"), (\"ops\", \"Al\"), (\"eng\", \"Ada\"), (\"ops\", \"Cy\")]\n\n" +
          "# Stable sort: sort by the SECONDARY key first, then the primary.\n" +
          "by_name = sorted(people, key=lambda p: p[1])      # name\n" +
          "by_dept = sorted(by_name, key=lambda p: p[0])     # dept (stable!)\n" +
          "print(\"dept then name:\", by_dept)\n\n" +
          "# Adaptive: nearly-sorted input is close to O(n)\n" +
          "import time\n" +
          "nearly = list(range(200_000)); nearly[0], nearly[1] = nearly[1], nearly[0]\n" +
          "t = time.perf_counter(); nearly.sort()\n" +
          "print(f\"nearly-sorted: {(time.perf_counter()-t)*1000:.1f} ms\")",
      },
    ],
  },
  {
    title: "How do generator pipelines stream data lazily?",
    answer:
      "Chaining generators builds a **pull-based pipeline**: each stage is a generator that *reads from the previous one*, so an item is produced **only when the final consumer asks for it**, and it flows through **all stages one at a time**. No stage builds an intermediate list:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 520 130' role='img' aria-label='Source feeds map stage feeds filter stage feeds consumer, one item at a time'>" +
      "<defs><marker id='py-pl-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='10' y='44' width='100' height='44' rx='8'/><text class='d-text' x='60' y='64' text-anchor='middle'>source</text><text class='d-sub' x='60' y='80' text-anchor='middle'>read_lines</text>" +
      "<rect class='d-box-accent' x='140' y='44' width='100' height='44' rx='8'/><text class='d-text' x='190' y='64' text-anchor='middle'>map</text><text class='d-sub' x='190' y='80' text-anchor='middle'>parse</text>" +
      "<rect class='d-box-accent' x='270' y='44' width='100' height='44' rx='8'/><text class='d-text' x='320' y='64' text-anchor='middle'>filter</text><text class='d-sub' x='320' y='80' text-anchor='middle'>keep valid</text>" +
      "<rect class='d-box' x='400' y='44' width='110' height='44' rx='8'/><text class='d-text' x='455' y='64' text-anchor='middle'>consumer</text><text class='d-sub' x='455' y='80' text-anchor='middle'>sum / for</text>" +
      "<line class='d-edge-accent' x1='110' y1='66' x2='138' y2='66' marker-end='url(#py-pl-ar)'/>" +
      "<line class='d-edge-accent' x1='240' y1='66' x2='268' y2='66' marker-end='url(#py-pl-ar)'/>" +
      "<line class='d-edge-accent' x1='370' y1='66' x2='398' y2='66' marker-end='url(#py-pl-ar)'/>" +
      "<text class='d-accent d-sub' x='260' y='115' text-anchor='middle'>consumer PULLS &#8594; one item is pulled through every stage on demand</text>" +
      "</svg>\n\n" +
      "Because nothing is materialized, a pipeline processes **huge or infinite** streams (log files, sockets) in near-**constant memory**, and you get the first result without computing the last. Stages compose cleanly and read top-to-bottom. The trade-offs are the usual generator ones: **single pass** and no random access. This is the Pythonic take on the Unix-pipe philosophy (`source | map | filter | reduce`).\n\n" +
      "**Interview tip:** 'lazy, pull-based stages — each generator reads the previous, so data streams one item at a time in constant memory.' Contrast with building intermediate lists (eager, O(n) memory each). The Unix-pipes analogy lands well.",
    examples: [
      {
        label: "A 3-stage lazy pipeline over a stream",
        tech: "python",
        code:
          "def read_lines():                       # source (could be a huge file)\n" +
          "    yield from [\"12\", \"x\", \"7\", \"-3\", \"40\", \"\"]\n\n" +
          "def parse(lines):                       # stage 1\n" +
          "    for ln in lines:\n" +
          "        if ln.lstrip(\"-\").isdigit():\n" +
          "            yield int(ln)\n\n" +
          "def positives(nums):                    # stage 2\n" +
          "    for n in nums:\n" +
          "        if n > 0:\n" +
          "            yield n\n\n" +
          "# Stages are wired but NOTHING runs until the consumer pulls\n" +
          "pipeline = positives(parse(read_lines()))\n" +
          "print(\"pipeline object:\", pipeline)\n" +
          "print(\"sum of positives:\", sum(pipeline))   # pulls everything once",
      },
    ],
  },
  {
    title: "What is the difference between bytes and str?",
    answer:
      "- **`str`** is a sequence of **Unicode code points** — human **text**, abstract characters with no inherent byte layout.\n" +
      "- **`bytes`** is a sequence of **raw 8-bit values (0–255)** — binary data: file contents, network packets, image data.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 140' role='img' aria-label='str encodes to bytes and bytes decode to str via a codec'>" +
      "<defs><marker id='py-bs-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='30' y='50' width='150' height='44' rx='8'/><text class='d-text' x='105' y='70' text-anchor='middle'>str  'café'</text><text class='d-sub' x='105' y='86' text-anchor='middle'>4 code points</text>" +
      "<rect class='d-box' x='300' y='50' width='160' height='44' rx='8'/><text class='d-text' x='380' y='70' text-anchor='middle'>bytes  b'caf\\xc3\\xa9'</text><text class='d-sub' x='380' y='86' text-anchor='middle'>5 bytes (UTF-8)</text>" +
      "<path class='d-edge-accent' d='M180 62 C 240 62, 240 62, 298 62' fill='none' marker-end='url(#py-bs-ar)'/><text class='d-accent d-sub' x='240' y='44' text-anchor='middle'>.encode('utf-8')</text>" +
      "<path class='d-edge' d='M298 84 C 240 84, 240 84, 182 84' fill='none' marker-end='url(#py-bs-ar)'/><text class='d-sub' x='240' y='112' text-anchor='middle'>.decode('utf-8')</text>" +
      "</svg>\n\n" +
      "You convert between them with a **codec**: `str.encode('utf-8')` → bytes, `bytes.decode('utf-8')` → str. Note one character can be **multiple bytes** (`'é'` is 2 bytes in UTF-8), so `len(str)` (characters) differs from `len(bytes)` (bytes). They **don't mix** — `'a' + b'b'` raises `TypeError` — and the boundary is where Python 3 forces correctness: decode bytes from the outside world into `str` as early as possible (the **'Unicode sandwich'**), work in text, then encode on the way out. `bytearray` is the mutable form of `bytes`.\n\n" +
      "**Interview tip:** 'str = Unicode text (code points); bytes = raw octets; bridge them with encode/decode via a codec (UTF-8).' Mention the **Unicode sandwich** (decode early, encode late) and that one char ≠ one byte — that's the practical maturity signal.",
    examples: [
      {
        label: "encode/decode round-trip; chars vs bytes",
        tech: "python",
        code:
          "text = \"café\"                       # str: 4 code points\n" +
          "raw = text.encode(\"utf-8\")          # -> bytes\n\n" +
          "print(\"str  :\", text, \"| len:\", len(text))\n" +
          "print(\"bytes:\", raw, \"| len:\", len(raw))   # 5 (é is 2 bytes)\n\n" +
          "print(\"decoded back:\", raw.decode(\"utf-8\"))\n\n" +
          "# They don't mix\n" +
          "try:\n" +
          "    _ = \"a\" + b\"b\"\n" +
          "except TypeError as e:\n" +
          "    print(\"can't mix:\", e)",
      },
    ],
  },
];

export default augments;
