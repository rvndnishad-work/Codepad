/**
 * PYTHON ULTRA — batch 27: Async III — async iterators and async for, generators vs
 * coroutines, asyncio.TaskGroup vs gather, TaskGroup cancellation and ExceptionGroup,
 * and raising/splitting ExceptionGroups by hand.
 * Every example was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is an async iterator and async for?`,
    difficulty: "hard",
    seoDescription: `Python async iterators from zero: __aiter__, __anext__, StopAsyncIteration, async generators, async for, aiter/anext, and early-exit cleanup.`,
    description: `**Question presented to candidate:**
"You already know how a normal \`for\` loop works over an iterator. What changes when the next item has to come from the network? Explain what an async iterator is, what \`async for\` actually does, and how you would write one."

**What a strong answer should cover:**
- The protocol: \`__aiter__\` (a plain method that returns the async iterator) and \`__anext__\` (returns an awaitable, usually an \`async def\`), ending with \`StopAsyncIteration\` instead of \`StopIteration\`.
- \`async for\` is only legal inside \`async def\`; each step *awaits* \`__anext__()\`, so the event loop can run other tasks while the next item is being fetched.
- The easy way to write one is an **async generator** (\`async def\` + \`yield\`, PEP 525, Python 3.6); it gets \`asend\`, \`athrow\` and \`aclose\` for free and cannot \`return\` a value.
- The helpers: \`aiter()\` / \`anext()\` builtins (3.10), async comprehensions \`[x async for x in src]\` (PEP 530).
- Early exit: after \`break\`, an async generator is left suspended and asyncio closes it later; \`contextlib.aclosing\` (or \`await gen.aclose()\`) makes the cleanup happen at a known point.
- The common errors: \`async for\` over a list and a plain \`for\` over an async generator are both \`TypeError\`s.

**Code / implementation expected:** Optional — a small class with \`__aiter__\` / \`__anext__\` or an async generator consumed with \`async for\`.`,
    answer: `**Target Audience:** Python developers who know normal \`for\` loops, iterators and the basics of \`async def\` / \`await\`, and want the exact protocol an interviewer probes.
**Difficulty:** Hard
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13 (same output on all three); both examples also run in this page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

Picture a sushi conveyor belt. A plate arrives, you eat it, you wait for the next one. With a normal \`for\` loop the chef has already made every plate before you sit down — the "next plate" is instant, because it is just sitting in a list.

Now imagine the chef cooks each plate **only when you ask for it**, and cooking takes a few minutes. If you stand at the belt staring at the empty spot, the whole restaurant stops for you. What you want is: "ask for the next plate, **go do something else while it cooks**, come back when it is ready."

That is an async iterator. A normal iterator answers "give me the next item" immediately. An async iterator answers "I will give you the next item **when it is ready** — \`await\` me", and while you wait, the [event loop](/interview-question/how-does-the-asyncio-event-loop-schedule-coroutines) is free to run other tasks. Paginated HTTP APIs, rows from an async database driver, messages from a websocket and lines from a subprocess all have this shape: a stream where *each* item costs a wait.

## 2. First, The Normal Iterator (One-Minute Recap)

A \`for\` loop over \`x\` does two things (details in [iterable vs iterator](/interview-question/what-is-the-difference-between-an-iterable-and-an-iterator)):

1. \`it = iter(x)\` — calls \`x.__iter__()\`.
2. Repeatedly \`item = next(it)\` — calls \`it.__next__()\` — until it raises \`StopIteration\`.

The async version keeps that exact shape and changes three words.

| Step | Sync (\`for\`) | Async (\`async for\`) |
| :--- | :--- | :--- |
| Get the iterator | \`iter(x)\` → \`x.__iter__()\` | \`aiter(x)\` → \`x.__aiter__()\` (a **plain** call, no await) |
| Get the next item | \`next(it)\` → \`it.__next__()\` | \`await anext(it)\` → \`await it.__anext__()\` |
| "No more items" signal | \`raise StopIteration\` | \`raise StopAsyncIteration\` |
| Where it is allowed | anywhere | only inside \`async def\` |
| Generator shortcut | \`def\` + \`yield\` | \`async def\` + \`yield\` |

📌 **Interview term: Asynchronous iterator protocol** — an object is an *async iterable* if it has \`__aiter__\`, which returns an *async iterator*: an object whose \`__anext__\` returns an **awaitable** that resolves to the next value, or raises \`StopAsyncIteration\` when the stream is finished. The protocol came with \`async\`/\`await\` in [PEP 492](https://peps.python.org/pep-0492/) (Python 3.5).

📌 **Interview term: \`StopAsyncIteration\`** — the exception \`__anext__\` raises to say "the stream is over". \`async for\` catches it and ends the loop, exactly as \`for\` catches \`StopIteration\`.

## 3. What \`async for\` Does, Step by Step

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="async for calls aiter once, then awaits anext in a loop; while waiting the event loop runs other tasks; StopAsyncIteration ends the loop">
  <defs>
    <marker id="py27q1-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="40" width="190" height="60" rx="10"/>
  <text class="d-text" x="125" y="66" text-anchor="middle">it = src.__aiter__()</text>
  <text class="d-sub" x="125" y="86" text-anchor="middle">once, no await</text>
  <rect class="d-box-accent" x="290" y="40" width="200" height="60" rx="10"/>
  <text class="d-text" x="390" y="66" text-anchor="middle">await it.__anext__()</text>
  <text class="d-sub" x="390" y="86" text-anchor="middle">may suspend here</text>
  <rect class="d-box" x="560" y="40" width="170" height="60" rx="10"/>
  <text class="d-text" x="645" y="66" text-anchor="middle">run loop body</text>
  <text class="d-sub" x="645" y="86" text-anchor="middle">with the item</text>
  <rect class="d-box-muted" x="290" y="210" width="200" height="60" rx="10"/>
  <text class="d-text" x="390" y="236" text-anchor="middle">event loop runs</text>
  <text class="d-sub" x="390" y="256" text-anchor="middle">other tasks meanwhile</text>
  <rect class="d-box-muted" x="560" y="210" width="170" height="60" rx="10"/>
  <text class="d-text" x="645" y="236" text-anchor="middle">loop ends</text>
  <text class="d-sub" x="645" y="256" text-anchor="middle">StopAsyncIteration</text>
  <path class="d-edge" d="M 222 70 L 284 70" marker-end="url(#py27q1-a)"/>
  <path class="d-edge-accent" d="M 492 70 L 554 70" marker-end="url(#py27q1-a)"/>
  <path class="d-edge-dashed" d="M 390 102 L 390 204" marker-end="url(#py27q1-a)"/>
  <path class="d-edge" d="M 645 38 C 645 6, 390 6, 390 34" marker-end="url(#py27q1-a)"/>
  <path class="d-edge-dashed" d="M 492 120 C 560 140, 620 160, 640 204" marker-end="url(#py27q1-a)"/>
</svg>

The arc on top is "next item, please"; the dashed line down is the moment the coroutine suspends and the loop goes off to do other work; the right-hand dashed line is the end of the stream.

In Python terms, this loop:

~~~python
async for item in src:
    body(item)
~~~

behaves like this hand expansion:

~~~python
it = type(src).__aiter__(src)          # no await
while True:
    try:
        item = await type(it).__anext__(it)
    except StopAsyncIteration:
        break
    body(item)
~~~

Two details interviewers like:

- **\`__aiter__\` is a normal method.** It must return the iterator object itself, not a coroutine. If you write \`async def __aiter__\`, Python gets a coroutine back and complains: on our 3.11 run the message was \`'async for' received an object from __aiter__ that does not implement __anext__: coroutine\` (plus a "coroutine was never awaited" warning).
- **\`__anext__\` only has to return an awaitable.** Writing it as \`async def __anext__\` is the usual way, but any object with \`__await__\` works.

📌 **Interview term: Awaitable** — anything you can put after \`await\`: a coroutine, an \`asyncio.Task\` / \`Future\`, or an object with an \`__await__\` method.

## 4. Writing One By Hand

The first example builds a paginated fetcher. Here is the class part:

~~~python
class Pages:
    """A hand-written async iterator: __aiter__ + async __anext__."""
    def __init__(self, count):
        self.count = count
        self.page = 0

    def __aiter__(self):               # plain def: returns the iterator itself
        return self

    async def __anext__(self):         # async def: may await before answering
        if self.page == self.count:
            raise StopAsyncIteration   # the async twin of StopIteration
        self.page += 1
        await asyncio.sleep(0.5)       # pretend: one network round trip
        return f"page {self.page}"
~~~

\`await asyncio.sleep(0.5)\` stands in for "wait for an HTTP response". While \`__anext__\` is parked there, the event loop is free.

## 5. The Shortcut: Async Generators

Writing a class with a counter is tedious. Just as \`def\` + \`yield\` gives you a normal iterator for free ([generators](/interview-question/what-are-generators-and-why-use-them)), \`async def\` + \`yield\` gives you an async iterator for free:

~~~python
async def rows(count):
    """The same idea as an async generator: async def + yield."""
    for i in range(1, count + 1):
        await asyncio.sleep(0.2)
        yield f"row {i}"
~~~

📌 **Interview term: Async generator** — a function defined with \`async def\` that contains \`yield\`. Calling it returns an \`async_generator\` object that is its own async iterator, and inside it you may use both \`await\` and \`yield\`. Added by [PEP 525](https://peps.python.org/pep-0525/) in Python 3.6.

What you get, as printed by \`dir()\` on 3.11 (public names only): \`aclose\`, \`ag_await\`, \`ag_code\`, \`ag_frame\`, \`ag_running\`, \`asend\`, \`athrow\`. Those are the async twins of a generator's \`close\`, \`send\` and \`throw\` — each one returns an awaitable.

Restrictions worth knowing (each checked with \`compile()\` on 3.11):

- \`return value\` inside an async generator is a \`SyntaxError\`: \`'return' with value in async generator\`. A bare \`return\` is fine; it just ends the stream.
- \`yield from\` is not allowed inside any \`async def\`: \`'yield from' inside async function\`. To re-yield from another async generator, loop over it with \`async for\` and \`yield\` each item.

📌 **Interview term: Async comprehension** — \`[x async for x in src]\` (also set, dict and generator forms) collects an async stream, and \`await\` is allowed inside comprehensions. From [PEP 530](https://peps.python.org/pep-0530/) (Python 3.6). Only valid inside \`async def\`.

## 6. Example 1 Walk-Through: Streaming On A Fake Clock

The examples on this page run in your browser, where \`asyncio.run()\` is not allowed (the page already runs inside an event loop). So each async example starts with a ~25-line helper, \`run()\`, that builds a real asyncio event loop whose clock is fake: when every task is waiting, the loop simply jumps the clock forward instead of sleeping. The scheduling code is asyncio itself, so the order of events is the real order — and the printed times (\`t=1.5\`) are exact and repeatable. On your own machine, delete the helper and call \`asyncio.run(main())\`; we ran every async example that way on python3.12, with real sleeps, and got the same output.

The interesting part of \`main()\`:

~~~python
async def main():
    async for page in Pages(3):
        print(stamp(), "got", page)

    async for row in rows(2):
        print(stamp(), "got", row)

    # An async comprehension collects every item (inside async def only).
    print(stamp(), [r async for r in rows(3) if r != "row 2"])

    # Two consumers at once: their awaits interleave on one thread.
    async def consume(name, source):
        async for item in source:
            print(stamp(), name, item)

    await asyncio.gather(consume("A", Pages(2)), consume("B", rows(3)))
~~~

Read the output with the clock in mind:

~~~text
t=0.5 got page 1
t=1.0 got page 2
t=1.5 got page 3
t=1.7 got row 1
t=1.9 got row 2
t=1.9 ['row 1', 'row 3']
t=2.7 B row 1
t=2.9 B row 2
t=3.0 A page 1
t=3.1 B row 3
t=3.5 A page 2
~~~

- Pages arrive at 0.5, 1.0, 1.5 — one \`await\` each, one after another. A single \`async for\` is **sequential**: it does not prefetch the next item while the body runs.
- The comprehension waited for all three rows (0.6 s) and dropped \`row 2\`.
- In the last block, A and B run **concurrently** in one thread: B prints at 2.7, 2.9 and 3.1 while A is still waiting for its pages at 3.0 and 3.5. Concurrency comes from running *several* consumers at once (here with \`gather\`; in new code a [TaskGroup](/interview-question/what-is-asyncio-taskgroup-and-why-does-it-replace-gather)), not from \`async for\` itself.

## 7. Example 2 Walk-Through: The Edges

~~~python
agen = numbers()
print(type(agen).__name__, inspect.isasyncgen(agen))
print(aiter(agen) is agen)
print(await anext(agen), await anext(agen))
await agen.aclose()   # throws GeneratorExit in: the finally runs now
print(await anext(agen, "default"))
~~~

📌 **Interview term: \`aiter()\` / \`anext()\`** — builtins added in Python 3.10 ([built-in functions docs](https://docs.python.org/3/library/functions.html#anext)). \`aiter(x)\` calls \`x.__aiter__()\`; \`anext(it)\` returns an awaitable for the next item, and \`anext(it, default)\` gives \`default\` instead of raising \`StopAsyncIteration\` when the stream is done. Note that \`anext\` itself is not awaited by magic — you write \`await anext(it)\`.

📌 **Interview term: \`aclose()\`** — awaits the async generator's shutdown: Python throws \`GeneratorExit\` in at the paused \`yield\`, so \`finally\` blocks and \`async with\` exits inside the generator run, and they may \`await\`.

Then the two classic \`TypeError\`s and the early-exit behaviour:

~~~python
async for n in numbers():
    break
print("  loop body finished")
for turn in (1, 2, 3):
    await asyncio.sleep(0)
    print("  after event-loop turn", turn)

async with contextlib.aclosing(numbers()) as gen:
    async for n in gen:
        break
print("  loop body finished")
~~~

~~~text
async_generator True
True
1 2
  numbers() cleanup ran
default
TypeError: 'async for' requires an object with __aiter__ method, got list
TypeError: 'async_generator' object is not iterable
break without aclosing:
  loop body finished
  after event-loop turn 1
  numbers() cleanup ran
  after event-loop turn 2
  after event-loop turn 3
break with aclosing:
  numbers() cleanup ran
  loop body finished
~~~

Why the cleanup lands **after** "loop body finished" in the first case: after \`break\`, the async generator is still suspended at its \`yield\`. Its \`finally\` contains code that may need to \`await\`, which cannot run inside the garbage collector, so asyncio installs hooks (\`sys.set_asyncgen_hooks\`) that, when the abandoned generator is freed, *schedule* \`aclose()\` as a task on the loop. That task ran one loop turn later. If the generator holds a database connection or a lock, "at some later turn" is a real bug source. \`contextlib.aclosing()\` (in the standard library since 3.10, per the [contextlib docs](https://docs.python.org/3/library/contextlib.html#contextlib.aclosing)) awaits \`aclose()\` when the \`async with\` block ends, so the cleanup line came *before* "loop body finished".

📌 **Interview term: Async generator finalization** — the machinery (\`sys.set_asyncgen_hooks\`, \`loop.shutdown_asyncgens()\`) that lets the event loop close async generators that were abandoned mid-stream. \`asyncio.run()\` calls \`shutdown_asyncgens()\` at the end so none are left open.

## 8. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runner (Pyodide 0.25.1), with identical stdout; python3.12 and python3.13 printed the same. They were also run with the helper replaced by \`asyncio.run()\` and real sleeps on python3.12: same lines.

Example 1 — streaming pages and rows:

~~~text
t=0.5 got page 1
t=1.0 got page 2
t=1.5 got page 3
t=1.7 got row 1
t=1.9 got row 2
t=1.9 ['row 1', 'row 3']
t=2.7 B row 1
t=2.9 B row 2
t=3.0 A page 1
t=3.1 B row 3
t=3.5 A page 2
~~~

Example 2 — \`aiter\`, \`anext\`, \`aclose\`, the \`TypeError\`s and \`break\` cleanup:

~~~text
async_generator True
True
1 2
  numbers() cleanup ran
default
TypeError: 'async for' requires an object with __aiter__ method, got list
TypeError: 'async_generator' object is not iterable
break without aclosing:
  loop body finished
  after event-loop turn 1
  numbers() cleanup ran
  after event-loop turn 2
  after event-loop turn 3
break with aclosing:
  numbers() cleanup ran
  loop body finished
~~~

## 9. Sync vs Async Iteration, Side by Side

| | Iterator | Async iterator |
| :--- | :--- | :--- |
| Methods | \`__iter__\`, \`__next__\` | \`__aiter__\`, \`__anext__\` (returns awaitable) |
| End signal | \`StopIteration\` | \`StopAsyncIteration\` |
| Loop | \`for\` | \`async for\` (inside \`async def\`) |
| Builtins | \`iter()\`, \`next()\` | \`aiter()\`, \`anext()\` (3.10+) |
| Generator form | \`def\` + \`yield\` | \`async def\` + \`yield\` |
| Generator extras | \`send\`, \`throw\`, \`close\`, \`yield from\`, \`return value\` | \`asend\`, \`athrow\`, \`aclose\`; no \`yield from\`, no \`return value\` |
| Cleanup on early exit | \`close()\` runs at garbage collection, synchronously | \`aclose()\` is scheduled on the loop; use \`aclosing()\` |
| Can wait between items | no (blocks the thread) | yes (other tasks run) |

There is also the matching protocol for resources: \`async with\` calls \`__aenter__\` / \`__aexit__\` (see [context managers](/interview-question/what-is-a-context-manager)), and async generators combine naturally with it.

## 10. Edge Cases

- **A plain list cannot be \`async for\`-ed.** If you need to, wrap it: \`async def from_list(xs): for x in xs: yield x\`.
- **An async iterator can be infinite** (a websocket, a queue reader). Stop it with \`break\`, a timeout (\`asyncio.timeout\`, 3.11) or cancellation — and make sure it closes.
- **Concurrent \`__anext__\` calls on one async generator are an error.** If two tasks call \`anext()\` on the same generator while it is suspended at an \`await\`, the second fails: in a separate run on 3.11 and 3.13 it raised \`RuntimeError: anext(): asynchronous generator is already running\`. Give each consumer its own iterator, or put an \`asyncio.Queue\` in between.
- **Sync iteration of an async source** is impossible without an event loop: a plain \`for\` raised \`'async_generator' object is not iterable\`.

## Common Pitfalls

- **Writing \`async def __aiter__\`.** \`__aiter__\` must return the iterator directly; only \`__anext__\` is async.
- **Raising \`StopIteration\` from \`__anext__\`.** The end signal is \`StopAsyncIteration\`; a \`StopIteration\` escaping a coroutine is turned into \`RuntimeError: coroutine raised StopIteration\` (checked on 3.11 and 3.13).
- **Assuming \`async for\` is parallel.** One \`async for\` waits for each item in turn; run several consumers (TaskGroup, \`gather\`) to overlap waits.
- **Breaking out of an async generator that holds a resource** and expecting the \`finally\` to run immediately. It runs on a later loop turn; wrap with \`contextlib.aclosing()\` or call \`await gen.aclose()\`.
- **Calling blocking code inside \`__anext__\`** (\`requests.get\`, \`time.sleep\`). That freezes every task on the loop; use an async client or \`asyncio.to_thread\`.
- **Trying to \`return\` a final value from an async generator.** It is a \`SyntaxError\`; yield it or store it on an object.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">async iterator</strong> is the async version of the iterator protocol: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__aiter__</code> returns the iterator, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__anext__</code> returns an awaitable for the next item, and the stream ends with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopAsyncIteration</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What async for does:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async for</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__aiter__</code> once, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>s <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__anext__()</code> for every item. Each await is a point where the event loop can run other tasks, so a slow network page does not block the program.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How to write one:</strong> <span style="color:#f0e2c8;">The easy way is an <strong style="color:#ffca28;">async generator</strong>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>. It supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> inside and gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asend</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">athrow</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aclose</code>, but no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code> and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return value</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Helpers:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aiter()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">anext()</code> are builtins since 3.10, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[x async for x in src]</code> is an async comprehension; all of it only works inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The gotcha:</strong> <span style="color:#f0e2c8;">If you <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code> out of an async generator, its cleanup is scheduled on the loop later, so wrap it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">contextlib.aclosing()</code> when it holds a connection or a lock.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async for</code> concurrent? Will it fetch the next page while my loop body runs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It awaits one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__anext__()</code> at a time, in order. Concurrency comes from running several tasks — for example several consumers in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TaskGroup</code>, or a producer task filling an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.Queue</code> ahead of the consumer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__aiter__</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__anext__</code> regarding <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__aiter__</code> is a plain method that must return the async iterator itself. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__anext__</code> must return an awaitable, usually by being <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code>. An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def __aiter__</code> makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async for</code> fail with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you close an async generator early and why does it matter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await agen.aclose()</code> or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async with contextlib.aclosing(agen)</code>. Otherwise, after a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code>, asyncio only schedules <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">aclose()</code> when the object is freed, so connections or locks in its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> stay held for at least another loop turn.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">yield from</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">return value</code> in an async generator?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code> delegation is a generator-coroutine mechanism that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code> replaced with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, so it is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError</code> in any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code>. Async generators have no return-value channel: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopAsyncIteration</code> carries no value, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return x</code> is rejected at compile time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you turn a paginated REST API into something callers can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async for</code> over?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write an async generator that awaits each page request, yields each record from it, and stops when the API has no next cursor. Callers write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async for record in fetch_all(client):</code> and never see the pagination.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| Asynchronous iterator protocol | \`__aiter__\` returns the iterator; \`__anext__\` returns an awaitable for the next item |
| \`StopAsyncIteration\` | The exception that ends an async stream |
| Awaitable | Anything usable after \`await\`: coroutine, Task/Future, or object with \`__await__\` |
| Async generator | \`async def\` with \`yield\`; its own async iterator, with \`asend\`/\`athrow\`/\`aclose\` |
| Async comprehension | \`[x async for x in src]\`; collects an async stream inside \`async def\` |
| \`aiter()\` / \`anext()\` | 3.10 builtins for \`__aiter__\` and an awaitable \`__anext__\`, with an optional default |
| \`aclose()\` | Awaitable shutdown of an async generator that runs its \`finally\` |
| Async generator finalization | Event-loop hooks that close abandoned async generators later |

**Conclusion:** An async iterator is the iterator protocol with an \`await\` in the middle: \`__aiter__\` once, then \`await __anext__()\` until \`StopAsyncIteration\`. That single await is what lets a stream of slow items — pages, rows, messages — be consumed without blocking the event loop. Write them as async generators, consume them with \`async for\` or an async comprehension, remember that one \`async for\` is sequential, and close generators explicitly when they hold resources. For how the \`await\` inside actually suspends, see [async/await](/interview-question/how-does-async-await-work-in-python) and [generators vs coroutines](/interview-question/what-is-the-difference-between-a-generator-and-a-coroutine).`,
    examples: [
      {
        label: `Streaming pages and rows with async for, on a fake clock`,
        code: `import asyncio
import asyncio.events as _events

# --- Helper so this runs in the browser page too. On your own machine
# --- replace run(main()) with asyncio.run(main()); the behaviour is the same.
class VirtualClockLoop(asyncio.BaseEventLoop):
    """Real asyncio scheduling; sleeps jump a fake clock instead of waiting."""
    def __init__(self):
        super().__init__()
        self._now = 0.0
        self._selector = self          # the loop asks us: wait how long?
    def select(self, timeout):
        self._now += timeout or 0.0    # pretend that much time passed
        return []
    def time(self):
        return self._now
    def _process_events(self, events):
        pass
    def _write_to_self(self):
        pass

def run(main):
    outer = _events._get_running_loop()   # the page already runs a loop
    _events._set_running_loop(None)
    loop = VirtualClockLoop()
    try:
        return loop.run_until_complete(main)
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        _events._set_running_loop(outer)
# --- end of helper


def stamp():
    return f"t={asyncio.get_running_loop().time():.1f}"


class Pages:
    """A hand-written async iterator: __aiter__ + async __anext__."""
    def __init__(self, count):
        self.count = count
        self.page = 0

    def __aiter__(self):               # plain def: returns the iterator itself
        return self

    async def __anext__(self):         # async def: may await before answering
        if self.page == self.count:
            raise StopAsyncIteration   # the async twin of StopIteration
        self.page += 1
        await asyncio.sleep(0.5)       # pretend: one network round trip
        return f"page {self.page}"


async def rows(count):
    """The same idea as an async generator: async def + yield."""
    for i in range(1, count + 1):
        await asyncio.sleep(0.2)
        yield f"row {i}"


async def main():
    async for page in Pages(3):
        print(stamp(), "got", page)

    async for row in rows(2):
        print(stamp(), "got", row)

    # An async comprehension collects every item (inside async def only).
    print(stamp(), [r async for r in rows(3) if r != "row 2"])

    # Two consumers at once: their awaits interleave on one thread.
    async def consume(name, source):
        async for item in source:
            print(stamp(), name, item)

    await asyncio.gather(consume("A", Pages(2)), consume("B", rows(3)))


run(main())`,
      },
      {
        label: `aiter, anext, aclose, the two TypeErrors, and break cleanup`,
        code: `import asyncio
import asyncio.events as _events

# --- Helper so this runs in the browser page too. On your own machine
# --- replace run(main()) with asyncio.run(main()); the behaviour is the same.
class VirtualClockLoop(asyncio.BaseEventLoop):
    """Real asyncio scheduling; sleeps jump a fake clock instead of waiting."""
    def __init__(self):
        super().__init__()
        self._now = 0.0
        self._selector = self          # the loop asks us: wait how long?
    def select(self, timeout):
        self._now += timeout or 0.0    # pretend that much time passed
        return []
    def time(self):
        return self._now
    def _process_events(self, events):
        pass
    def _write_to_self(self):
        pass

def run(main):
    outer = _events._get_running_loop()   # the page already runs a loop
    _events._set_running_loop(None)
    loop = VirtualClockLoop()
    try:
        return loop.run_until_complete(main)
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        _events._set_running_loop(outer)
# --- end of helper
import contextlib
import inspect


async def numbers():
    try:
        for n in (1, 2, 3):
            await asyncio.sleep(0)
            yield n
    finally:
        print("  numbers() cleanup ran")


async def main():
    agen = numbers()
    print(type(agen).__name__, inspect.isasyncgen(agen))
    # An async generator is its own async iterator.
    print(aiter(agen) is agen)
    # anext(x) returns an awaitable; awaiting it runs __anext__().
    print(await anext(agen), await anext(agen))
    await agen.aclose()   # throws GeneratorExit in: the finally runs now
    # Exhausted (closed) generator: anext with a default returns it.
    print(await anext(agen, "default"))

    # Mistake 1: async for over a normal list.
    try:
        async for x in [1, 2]:
            pass
    except TypeError as e:
        print("TypeError:", e)

    # Mistake 2: plain for over an async generator.
    try:
        for x in numbers():
            pass
    except TypeError as e:
        print("TypeError:", e)

    # break leaves the generator suspended; asyncio closes it later.
    print("break without aclosing:")
    async for n in numbers():
        break
    print("  loop body finished")
    for turn in (1, 2, 3):
        await asyncio.sleep(0)
        print("  after event-loop turn", turn)

    # contextlib.aclosing closes it at the end of the with block.
    print("break with aclosing:")
    async with contextlib.aclosing(numbers()) as gen:
        async for n in gen:
            break
    print("  loop body finished")


run(main())`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the difference between a generator and a coroutine?`,
    difficulty: "hard",
    seoDescription: `Generator vs coroutine in Python: def+yield vs async def, next() vs an event loop, code flags, send(), types.coroutine and a 15-line event loop.`,
    description: `**Question presented to candidate:**
"Generators and coroutines both pause and resume, and they even share methods like \`send()\`. So what really is the difference between a generator and a coroutine in Python, and why can you not just \`await\` a generator?"

**What a strong answer should cover:**
- Purpose: a generator (\`def\` + \`yield\`) **produces a sequence of values** for its caller; a native coroutine (\`async def\`) **waits for results** and is driven by an event loop.
- Who drives it: a generator is pulled with \`next()\` / \`for\`; a coroutine is resumed with \`send(None)\` by an event loop and is **not** an iterator (\`next(coro)\` is a \`TypeError\`).
- The shared machinery: both are suspended frames with \`send\` / \`throw\` / \`close\`, both report their return value through \`StopIteration.value\`; the code-object flags differ (\`GENERATOR\` vs \`COROUTINE\`), and \`inspect\` can tell them apart.
- Awaitability: only coroutines, Futures/Tasks, objects with \`__await__\`, and \`types.coroutine\`-decorated generators can be awaited; \`await\` on a bare generator is a \`TypeError\`.
- History: generator-based coroutines (PEP 342 \`send\`, PEP 380 \`yield from\`, \`@asyncio.coroutine\`) led to \`async\`/\`await\` in PEP 492 (3.5); \`@asyncio.coroutine\` is gone in 3.11.
- The bottom of every \`await\` chain is a \`yield\` to the event loop — "a coroutine is a generator with a different job and a stricter type".

**Code / implementation expected:** Optional — showing \`next()\` on a generator vs \`send(None)\` on a coroutine, or a toy event loop.`,
    answer: `**Target Audience:** Python developers who have used both \`yield\` and \`async\`/\`await\` and want to explain precisely how they relate.
**Difficulty:** Hard
**Python version:** Behaviour and bytecode checked on CPython 3.11 (examples also print the same on 3.12 and 3.13); both examples run in this page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

Think of two people in a kitchen who both know how to "pause".

- The **baker** makes cookies one tray at a time. Each time you knock on the door, the baker hands you one tray and pauses until you knock again. *You* decide when the next tray happens. That is a **generator**: it pauses to **hand something out**.
- The **chef** is cooking a big dinner. The chef puts the roast in the oven and says "wake me when the timer rings". While the roast cooks, the **kitchen manager** sends the chef to chop salad for someone else. When the timer rings, the manager brings the chef back to the roast. That is a **coroutine**: it pauses to **wait for something**, and a manager (the event loop) decides who works next.

Same skill — pause and resume where you left off. Totally different job, and a different boss. Mixing them up is where bugs and confusing interview answers come from.

## 2. The Core Distinction

📌 **Interview term: Generator** — a function with \`yield\` in its body (\`def\`). Calling it returns a \`generator\` object, which is an **iterator**: each \`next()\` runs the body to the next \`yield\` and returns that value. See [what generators are](/interview-question/what-are-generators-and-why-use-them) and [a generator's lifecycle](/interview-question/what-is-a-generator-s-lifecycle).

📌 **Interview term: Native coroutine** — a function defined with \`async def\` (without \`yield\`). Calling it returns a \`coroutine\` object, which does nothing until something drives it. It can \`await\` other awaitables, and its \`return\` value is the result of \`await coro\`. Added in [PEP 492](https://peps.python.org/pep-0492/) (Python 3.5).

| | Generator | Native coroutine |
| :--- | :--- | :--- |
| Defined with | \`def\` + \`yield\` | \`async def\` |
| Object type | \`generator\` | \`coroutine\` |
| Job | produce a sequence of values | wait for results without blocking |
| Pauses at | \`yield value\` (value goes to the caller) | \`await x\` (control goes to the event loop) |
| Driven by | \`next()\`, \`for\`, \`list()\` — the caller | \`send(None)\` from an event loop (\`asyncio.run\`) |
| Iterator? | yes | no — \`next(coro)\` is a \`TypeError\` |
| Awaitable? | no (unless \`types.coroutine\`) | yes |
| Return value | in \`StopIteration.value\` (seen by \`yield from\`) | the value of \`await coro\` |
| Code flag | \`GENERATOR\` | \`COROUTINE\` |
| State attributes | \`gi_frame\`, \`gi_running\`, \`gi_yieldfrom\` | \`cr_frame\`, \`cr_running\`, \`cr_await\`, \`cr_origin\` |

(The attribute names come from \`dir()\` on 3.11.) A third kind, \`async def\` **with** \`yield\`, is an *async generator* — the subject of [async iterators and async for](/interview-question/what-is-an-async-iterator-and-async-for). Its flag is \`ASYNC_GENERATOR\`.

## 3. Who Drives Whom

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Top row: the caller calls next and the generator yields a value back. Bottom row: the event loop sends None into the coroutine, which awaits, and the innermost yield hands a request back to the loop">
  <defs>
    <marker id="py27q2-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="190" height="64" rx="10"/>
  <text class="d-text" x="125" y="58" text-anchor="middle">your code</text>
  <text class="d-sub" x="125" y="78" text-anchor="middle">for x in gen</text>
  <rect class="d-box-accent" x="470" y="30" width="210" height="64" rx="10"/>
  <text class="d-text" x="575" y="58" text-anchor="middle">generator</text>
  <text class="d-sub" x="575" y="78" text-anchor="middle">yield value</text>
  <path class="d-edge" d="M 222 48 L 464 48" marker-end="url(#py27q2-a)"/>
  <text class="d-sub" x="343" y="38" text-anchor="middle">next()</text>
  <path class="d-edge-accent" d="M 468 80 L 226 80" marker-end="url(#py27q2-a)"/>
  <text class="d-sub" x="347" y="110" text-anchor="middle">the value</text>
  <rect class="d-box-muted" x="30" y="190" width="190" height="64" rx="10"/>
  <text class="d-text" x="125" y="218" text-anchor="middle">event loop</text>
  <text class="d-sub" x="125" y="238" text-anchor="middle">asyncio.run</text>
  <rect class="d-box-accent" x="470" y="190" width="210" height="64" rx="10"/>
  <text class="d-text" x="575" y="218" text-anchor="middle">coroutine</text>
  <text class="d-sub" x="575" y="238" text-anchor="middle">await something</text>
  <path class="d-edge" d="M 222 208 L 464 208" marker-end="url(#py27q2-a)"/>
  <text class="d-sub" x="343" y="198" text-anchor="middle">send(None)</text>
  <path class="d-edge-dashed" d="M 468 240 L 226 240" marker-end="url(#py27q2-a)"/>
  <text class="d-sub" x="347" y="276" text-anchor="middle">a wait request</text>
</svg>

With a generator, the values that come out are the **point** — your code consumes them. With a coroutine, what comes out of the bottom-most \`yield\` is a **request to the event loop** ("wake me when this future is done"). Your code never sees those; it only sees the final result of \`await\`.

## 4. Example 1 Walk-Through: Side by Side

~~~python
def countdown(n):            # generator function: def + yield
    while n > 0:
        yield n
        n -= 1
    return "liftoff"


async def fetch(n):          # coroutine function: async def
    return n * 10


gen = countdown(3)
coro = fetch(4)
~~~

The compiler marks the difference on the code object. \`dis.pretty_flags(countdown.__code__.co_flags)\` printed \`OPTIMIZED, NEWLOCALS, GENERATOR\`; for \`fetch\` it printed \`OPTIMIZED, NEWLOCALS, COROUTINE\`. Calling either function only *creates* the object; no line of the body has run yet.

The generator is an iterator, so \`next(gen)\` gave \`3\` and \`list(gen)\` drained the rest, \`[2, 1]\`. Its \`return "liftoff"\` was delivered inside \`StopIteration.value\`, which is how \`yield from\` passes return values up ([yield from delegation](/interview-question/how-does-yield-from-delegation-work)).

The coroutine refuses to be iterated: \`next(coro)\` raised \`TypeError: 'coroutine' object is not an iterator\` and \`iter(coro)\` raised \`TypeError: 'coroutine' object is not iterable\`. Python deliberately made them different types so that forgetting an \`await\` (and accidentally iterating) fails loudly.

Then the key line:

~~~python
try:
    coro.send(None)
except StopIteration as stop:
    print("coroutine returned", stop.value)
~~~

\`send(None)\` is **exactly what an event loop does** to step a coroutine. \`fetch\` never awaits, so the first step finished it, and its return value \`40\` came out the same way a generator's does — in \`StopIteration.value\`. Underneath, they are the same kind of resumable frame.

📌 **Interview term: \`send()\`** — resumes a suspended generator or coroutine, making the paused \`yield\` evaluate to the sent value. \`next(gen)\` is \`gen.send(None)\`. Added for generators by PEP 342 (Python 2.5), which is the root of all of this.

~~~text
generator
coroutine
OPTIMIZED, NEWLOCALS, GENERATOR
OPTIMIZED, NEWLOCALS, COROUTINE
True False
True False
3 [2, 1]
generator returned 'liftoff'
TypeError: 'coroutine' object is not an iterator
TypeError: 'coroutine' object is not iterable
coroutine returned 40
['close', 'send', 'throw']
True True
SyntaxError: 'await' outside async function
SyntaxError: 'yield from' inside async function
~~~

The last two lines show the compiler keeping the worlds apart: \`await\` in a plain \`def\` is \`'await' outside async function\`, and \`yield from\` in an \`async def\` is \`'yield from' inside async function\`.

## 5. What \`await\` Compiles To

\`dis\` on this tiny coroutine (3.11):

~~~python
async def aw():
    await asyncio.sleep(0)
    return 5
~~~

listed these opcodes on our run: \`RETURN_GENERATOR, POP_TOP, RESUME, LOAD_GLOBAL, LOAD_ATTR, LOAD_CONST, PRECALL, CALL, GET_AWAITABLE, LOAD_CONST, SEND, YIELD_VALUE, RESUME, JUMP_BACKWARD_NO_INTERRUPT, POP_TOP, LOAD_CONST, RETURN_VALUE\`.

Look at the middle: \`GET_AWAITABLE\` (call \`__await__\` and check the result is an iterator), then a \`SEND\` / \`YIELD_VALUE\` loop — the **same opcodes \`yield from\` uses**. A coroutine starts with \`RETURN_GENERATOR\`, just like a generator. So \`await x\` is, mechanically, "\`yield from\` \`x.__await__()\`, but only if \`x\` is awaitable". Opcode names change between versions — on python3.12 the same function dropped \`PRECALL\` and added \`END_SEND\` and \`CLEANUP_THROW\` — so treat the list as a 3.11 snapshot; the \`GET_AWAITABLE\` → \`SEND\` → \`YIELD_VALUE\` core was the same on both.

📌 **Interview term: \`__await__\`** — the method that makes an object awaitable; it must return an iterator. A \`Future\`'s \`__await__\` yields the future itself up to the event loop (on 3.11, \`next(fut.__await__()) is fut\` printed \`True\`), which is how a coroutine says "wake me when this is done".

## 6. Example 2 Walk-Through: A 15-Line Event Loop

To prove that coroutines are just resumable frames driven by \`send\`, example 2 builds an event loop with no asyncio at all:

~~~python
@types.coroutine
def pause(reason):
    """The bottom of every await chain is a plain generator yield."""
    reply = yield reason          # this value travels up to the loop
    return reply


async def worker(name, steps):
    total = 0
    for i in range(steps):
        got = await pause(f"{name} waits ({i})")
        total += got
    return f"{name} total={total}"


def tiny_loop(*coros):
    ready = deque((c, None) for c in coros)
    results = []
    while ready:
        coro, value = ready.popleft()
        try:
            request = coro.send(value)    # resume the coroutine
        except StopIteration as done:
            results.append(done.value)    # its return value
            continue
        print("loop got:", request)
        ready.append((coro, 1))           # answer the request with 1
    return results
~~~

📌 **Interview term: \`types.coroutine\`** — a decorator that marks a generator function as a *generator-based coroutine* so it can be \`await\`ed. It sets the \`ITERABLE_COROUTINE\` code flag (the run printed \`OPTIMIZED, NEWLOCALS, GENERATOR, ITERABLE_COROUTINE\`); the object is still a plain \`generator\`. Libraries use exactly this to build the lowest awaitable layer.

The \`yield reason\` inside \`pause\` passes **straight through** \`await\` in \`worker\` and lands in \`tiny_loop\` as the return value of \`coro.send(...)\`. The loop's reply (\`1\`) travels back down and becomes the value of \`yield\`, then of \`await pause(...)\`. The two workers alternate — this is cooperative multitasking in miniature, and it is what [the asyncio event loop](/interview-question/how-does-the-asyncio-event-loop-schedule-coroutines) does with Futures instead of strings.

~~~text
loop got: A waits (0)
loop got: B waits (0)
loop got: A waits (1)
loop got: B waits (1)
loop got: B waits (2)
['A total=2', 'B total=3']
generator
OPTIMIZED, NEWLOCALS, GENERATOR, ITERABLE_COROUTINE
TypeError: object generator can't be used in 'await' expression
False
~~~

The last lines: awaiting a bare generator raised \`TypeError: object generator can't be used in 'await' expression\` — without \`types.coroutine\` it is not awaitable — and \`hasattr(asyncio, "coroutine")\` is \`False\` on 3.11.

## 7. A Short History (Why They Look So Similar)

1. **PEP 342** (Python 2.5) gave generators \`send()\`, \`throw()\` and \`close()\`, so a generator could *receive* values — people started calling these "coroutines".
2. **PEP 380** (Python 3.3) added \`yield from\`, so one generator could delegate to another and get its return value.
3. **asyncio** (Python 3.4, [PEP 3156](https://peps.python.org/pep-3156/)) built its scheduler on \`yield from\` and the \`@asyncio.coroutine\` decorator.
4. **PEP 492** (Python 3.5) introduced \`async def\` / \`await\` so coroutines became a **separate type** that cannot be confused with iteration; its text describes the earlier approach as coroutines "via generators (PEP 342), further enhanced by the yield from syntax introduced in PEP 380".
5. \`@asyncio.coroutine\` was deprecated in 3.8 and removed in 3.11 (CPython change bpo-43216); our 3.11 run confirms the attribute no longer exists.

Sources: the [PEP 492 text](https://peps.python.org/pep-0492/) and the [asyncio history notes](https://asyncio-notes.readthedocs.io/en/latest/asyncio-history.html).

## 8. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runner (Pyodide 0.25.1, CPython 3.11.3) with identical stdout, and printed the same on python3.12 and python3.13. The \`dis\` opcode list in section 5 came from a separate 3.11 run.

Example 1 — a generator and a coroutine side by side:

~~~text
generator
coroutine
OPTIMIZED, NEWLOCALS, GENERATOR
OPTIMIZED, NEWLOCALS, COROUTINE
True False
True False
3 [2, 1]
generator returned 'liftoff'
TypeError: 'coroutine' object is not an iterator
TypeError: 'coroutine' object is not iterable
coroutine returned 40
['close', 'send', 'throw']
True True
SyntaxError: 'await' outside async function
SyntaxError: 'yield from' inside async function
~~~

Example 2 — a tiny event loop driving coroutines with \`send()\`:

~~~text
loop got: A waits (0)
loop got: B waits (0)
loop got: A waits (1)
loop got: B waits (1)
loop got: B waits (2)
['A total=2', 'B total=3']
generator
OPTIMIZED, NEWLOCALS, GENERATOR, ITERABLE_COROUTINE
TypeError: object generator can't be used in 'await' expression
False
~~~

## 9. Edge Cases

- **Forgetting \`await\`.** \`fetch(4)\` without \`await\` just creates a coroutine object; Python prints \`RuntimeWarning: coroutine 'fetch' was never awaited\` when it is garbage-collected. Our examples call \`.send()\` or \`.close()\` on every coroutine they create to stay warning-free.
- **A generator used as a data pipeline inside async code is fine.** You can call a normal generator from a coroutine (\`for x in gen:\`) as long as each \`next()\` is fast; it blocks the loop while it runs.
- **\`send()\` on a just-created generator** must send \`None\`; anything else is \`TypeError: can't send non-None value to a just-started generator\` (a coroutine says \`just-started coroutine\`; both checked on 3.11).
- **Async generators are neither**: they are async iterators, consumed with \`async for\`, and cannot be \`await\`ed directly.

## Common Pitfalls

- **Saying "a coroutine is a generator".** In modern Python they are different types (\`coroutine\` vs \`generator\`) with different flags; the accurate phrase is "built on the same suspend/resume machinery".
- **Calling \`next()\` on a coroutine** or iterating it — a \`TypeError\`. Drive coroutines with \`await\`, \`asyncio.run\` or a Task.
- **Trying to \`await\` a plain generator** — \`TypeError\` unless it is decorated with \`types.coroutine\`.
- **Using \`@asyncio.coroutine\` and \`yield from\` from old tutorials** — the decorator is gone in 3.11; use \`async def\` and \`await\`.
- **Doing slow blocking work in a generator called from async code** — the event loop stops while it runs.
- **Mixing up the three return channels:** a generator returns through \`StopIteration.value\`, a coroutine through \`await\`, an async generator cannot return a value at all.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One-line difference:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">generator</strong> produces a sequence of values for whoever iterates it; a <strong style="color:#ffca28;">coroutine</strong> waits for results and is scheduled by an event loop.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Who drives it:</strong> <span style="color:#f0e2c8;">You pull a generator with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>. An event loop resumes a coroutine with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send(None)</code>; a coroutine is deliberately not an iterator, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next(coro)</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Shared machinery:</strong> <span style="color:#f0e2c8;">Both are suspended frames with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">throw</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">close</code>, and both deliver a return value in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">StopIteration.value</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> compiles to the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SEND</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">YIELD_VALUE</code> loop as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The difference in types:</strong> <span style="color:#f0e2c8;">The compiler sets the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GENERATOR</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">COROUTINE</code> flag, the objects are different types, and only awaitables — coroutines, Futures, objects with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__await__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types.coroutine</code> generators — can follow <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. History:</strong> <span style="color:#f0e2c8;">Coroutines used to be generators (PEP 342 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send</code>, PEP 380 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield from</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@asyncio.coroutine</code>); PEP 492 in 3.5 split them into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code>, and the old decorator is gone in 3.11.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If coroutines are not generators, how does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code> actually pause anything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the bottom of every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> chain there is a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>, usually inside a Future's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__await__</code>. That yielded Future travels up through every <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> to the event loop's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">send()</code> call; the loop resumes the coroutine when the Future is done.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">types.coroutine</code> for?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It marks a generator function so its generators can be awaited (it sets the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ITERABLE_COROUTINE</code> flag). Frameworks use it to write the lowest-level awaitable that yields a request to their own event loop.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you call an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async def</code> function without <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">await</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You get a coroutine object and none of the body runs. If nothing ever awaits it, Python warns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">coroutine ... was never awaited</code> when it is garbage-collected — a common bug.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does an async generator fit?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async def</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> is a third kind: an async iterator with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__anext__</code>, consumed with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async for</code>. It can <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> inside, but it cannot be awaited itself and cannot <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> a value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you send values into a native coroutine?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mechanically yes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">coro.send(value)</code> works and the value becomes the result of the innermost <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code>. In asyncio code you never do it by hand; the event loop does it, and data flows through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code> return values instead.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| Generator | \`def\` + \`yield\`; an iterator that produces values for its caller |
| Native coroutine | \`async def\`; an awaitable that waits for results, driven by an event loop |
| \`send()\` | Resumes a suspended generator or coroutine with a value for the paused \`yield\` |
| \`__await__\` | Method that makes an object awaitable; returns an iterator |
| \`types.coroutine\` | Decorator that makes a generator function awaitable (\`ITERABLE_COROUTINE\` flag) |

**Conclusion:** Generators and coroutines are built from the same part — a function frame that can pause and be resumed with \`send()\` — but they serve opposite purposes. A generator pauses to hand values *out* to the code iterating it; a coroutine pauses to wait, handing a request *up* to the event loop that decides what runs next. Python 3.5 made them separate types so you cannot iterate a coroutine or await a generator by accident, and the 15-line loop above is the clearest proof that everything asyncio does rests on \`send()\` and one \`yield\` at the bottom of the chain. Continue with [async/await](/interview-question/how-does-async-await-work-in-python) for the asyncio side.`,
    examples: [
      {
        label: `A generator and a coroutine side by side`,
        code: `import dis
import inspect


def countdown(n):            # generator function: def + yield
    while n > 0:
        yield n
        n -= 1
    return "liftoff"


async def fetch(n):          # coroutine function: async def
    return n * 10


gen = countdown(3)
coro = fetch(4)

print(type(gen).__name__)  # generator
print(type(coro).__name__)  # coroutine
print(dis.pretty_flags(countdown.__code__.co_flags))
print(dis.pretty_flags(fetch.__code__.co_flags))
print(inspect.isgenerator(gen), inspect.iscoroutine(gen))
print(inspect.isawaitable(coro), inspect.isawaitable(gen))

# A generator is an iterator: next() and for-loops pull values out.
print(next(gen), list(gen))

# The return value travels inside StopIteration.
gen2 = countdown(1)
next(gen2)
try:
    next(gen2)
except StopIteration as stop:
    print("generator returned", repr(stop.value))

# A coroutine is NOT an iterator: no next(), no for-loop.
for attempt in (lambda: next(coro), lambda: iter(coro)):
    try:
        attempt()
    except TypeError as e:
        print("TypeError:", e)

# What an event loop really does: send(None) until StopIteration.
try:
    coro.send(None)
except StopIteration as stop:
    print("coroutine returned", stop.value)

# Both share the same suspend/resume methods...
shared = sorted({"send", "throw", "close"} & set(dir(gen)) & set(dir(coro)))
print(shared)
# ...but keep their state under different attribute prefixes.
print(gen.gi_frame is None, coro.cr_frame is None)

# Syntax keeps the two worlds apart.
for src in ("def f():\\n    await x", "async def f():\\n    yield from x"):
    try:
        compile(src, "<demo>", "exec")
    except SyntaxError as e:
        print("SyntaxError:", e.msg)`,
      },
      {
        label: `Coroutines are driven by send(): a tiny event loop`,
        code: `import types
from collections import deque


@types.coroutine
def pause(reason):
    """The bottom of every await chain is a plain generator yield."""
    reply = yield reason          # this value travels up to the loop
    return reply


async def worker(name, steps):
    total = 0
    for i in range(steps):
        got = await pause(f"{name} waits ({i})")
        total += got
    return f"{name} total={total}"


def tiny_loop(*coros):
    """A 15-line event loop: round-robin send() until each one finishes."""
    ready = deque((c, None) for c in coros)
    results = []
    while ready:
        coro, value = ready.popleft()
        try:
            request = coro.send(value)    # resume the coroutine
        except StopIteration as done:
            results.append(done.value)    # its return value
            continue
        print("loop got:", request)
        ready.append((coro, 1))           # answer the request with 1
    return results


print(tiny_loop(worker("A", 2), worker("B", 3)))

# A generator-based coroutine (types.coroutine) is awaitable...
print(type(pause("x")).__name__)
import dis
print(dis.pretty_flags(pause.__code__.co_flags))
# ...and so is a native coroutine. A bare generator is not.


def plain():
    yield 1


async def await_plain():
    await plain()


c = await_plain()
try:
    c.send(None)
except TypeError as e:
    print("TypeError:", e)

# The old @asyncio.coroutine decorator is gone in 3.11.
import asyncio
print(hasattr(asyncio, "coroutine"))  # False`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is asyncio.TaskGroup and why does it replace gather?`,
    difficulty: "medium",
    seoDescription: `asyncio.TaskGroup vs gather: structured concurrency in Python 3.11, cancelling siblings on failure, ExceptionGroup, and when gather still fits.`,
    description: `**Question presented to candidate:**
"You need to call three services concurrently from an async handler. Most older code would use \`asyncio.gather\` for that. Python 3.11 added \`asyncio.TaskGroup\`. What is it, and why do people say it should replace \`gather\`?"

**What a strong answer should cover:**
- What it is: an async context manager (\`async with asyncio.TaskGroup() as tg:\`) whose \`tg.create_task()\` starts child tasks; leaving the block **waits for every child** — the idea called structured concurrency (added in Python 3.11).
- The failure behaviour: when one child raises, TaskGroup **cancels the other children and the body**, waits for them, then raises an \`ExceptionGroup\` with every error; plain \`gather\` raises the first error and leaves the siblings running unattended.
- Errors are not lost: gather silently drops the 2nd, 3rd... errors (unless \`return_exceptions=True\`, which turns errors into values you must check); TaskGroup keeps them all, handled with \`except*\`.
- Results: gather returns a list in argument order; with TaskGroup you keep the \`Task\` objects and call \`.result()\` after the block.
- Honest trade-off: TaskGroup is not a drop-in replacement — gather with \`return_exceptions=True\` is still the right tool when you *want* partial results; TaskGroup needs 3.11+.

**Clarifying questions expected:**
- If one of the calls fails, do you want the others cancelled, or do you want whatever results succeeded?
- Which Python version does the service run on (TaskGroup needs 3.11+)?

**Code / implementation expected:** Optional — the same three calls written with \`gather\` and with \`TaskGroup\`, and what happens when one fails.`,
    answer: `**Target Audience:** Developers who have written \`asyncio\` code with \`gather\` or \`create_task\` and want to know what TaskGroup changes and when to pick which.
**Difficulty:** Medium
**Python version:** \`TaskGroup\` needs Python 3.11+. Behaviour checked on CPython 3.11, 3.12 and 3.13 (same output); both examples also run in this page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A teacher takes three children on a museum trip.

**The \`gather\` teacher** sends the three children off to different rooms and waits at the exit. The moment one child comes back crying ("I broke a vase!"), the teacher rushes home to deal with it — and leaves the other two children wandering the museum. Nobody is watching them anymore. If a second child also broke something, the teacher never hears about it.

**The \`TaskGroup\` teacher** has one rule: *nobody leaves the museum until everyone is accounted for*. When one child breaks a vase, the teacher calls the other two back ("we are leaving, stop what you are doing"), waits until all three are at the exit, and then goes home with a complete report of **everything** that went wrong.

The second teacher is slower to react by a moment, but never loses a child and never loses news. That is structured concurrency.

## 2. The Core Idea

📌 **Interview term: \`asyncio.TaskGroup\`** — an async context manager that owns a set of child tasks. \`tg.create_task(coro)\` starts a child; the \`async with\` block does not finish until every child has finished. If any child fails, the group cancels the rest and raises an \`ExceptionGroup\`. Added in Python 3.11 ([asyncio Task docs](https://docs.python.org/3/library/asyncio-task.html#task-groups)).

📌 **Interview term: Structured concurrency** — the rule that concurrent tasks live inside a code block, like local variables: they cannot outlive the block that started them, and their errors come out of that block. Exception groups were introduced largely for this: [PEP 654](https://peps.python.org/pep-0654/) names "a better task spawning API in asyncio, inspired by Trio nurseries" as its main motivation.

📌 **Interview term: \`asyncio.gather\`** — \`await gather(*aws)\` runs awaitables concurrently and returns their results as a list **in argument order**. On the first exception it raises that exception to the caller **without cancelling the others**; with \`return_exceptions=True\` it instead returns exceptions in the result list.

📌 **Interview term: Orphaned task** — a task still running after the code that started it has stopped waiting for it. Its result and its errors go nowhere.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 320" role="img" aria-label="Left: with gather, the caller has moved on while task A still runs as an orphan. Right: with TaskGroup, every child sits inside the async with block and the block ends only after all children end">
  <defs>
    <marker id="py27q3-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="280" height="60" rx="10"/>
  <text class="d-text" x="170" y="56" text-anchor="middle">await gather(A, B)</text>
  <text class="d-sub" x="170" y="76" text-anchor="middle">B fails, error raised</text>
  <rect class="d-box-muted" x="30" y="170" width="120" height="60" rx="10"/>
  <text class="d-text" x="90" y="196" text-anchor="middle">task A</text>
  <text class="d-sub" x="90" y="216" text-anchor="middle">still running</text>
  <rect class="d-box-accent" x="190" y="170" width="120" height="60" rx="10"/>
  <text class="d-text" x="250" y="196" text-anchor="middle">caller</text>
  <text class="d-sub" x="250" y="216" text-anchor="middle">moved on</text>
  <path class="d-edge-dashed" d="M 90 92 L 90 164" marker-end="url(#py27q3-a)"/>
  <path class="d-edge" d="M 250 92 L 250 164" marker-end="url(#py27q3-a)"/>
  <rect class="d-box-accent" x="420" y="30" width="310" height="230" rx="12"/>
  <text class="d-text" x="575" y="58" text-anchor="middle">async with TaskGroup() as tg</text>
  <rect class="d-box" x="450" y="90" width="110" height="60" rx="10"/>
  <text class="d-text" x="505" y="116" text-anchor="middle">task A</text>
  <text class="d-sub" x="505" y="136" text-anchor="middle">cancelled</text>
  <rect class="d-box" x="590" y="90" width="110" height="60" rx="10"/>
  <text class="d-text" x="645" y="116" text-anchor="middle">task B</text>
  <text class="d-sub" x="645" y="136" text-anchor="middle">failed</text>
  <text class="d-sub" x="575" y="196" text-anchor="middle">block waits for both</text>
  <text class="d-sub" x="575" y="232" text-anchor="middle">then raises ExceptionGroup</text>
</svg>

On the left, the error reached the caller but task A is nobody's responsibility any more. On the right, nothing escapes the box: the block ends only when both children are done, and then one exception group carries the outcome.

## 3. Example 1 Walk-Through: The Orphan

The examples start with a small \`run()\` helper, because this page runs in a browser where \`asyncio.run()\` is not allowed. It drives a real asyncio event loop whose clock jumps forward instead of sleeping, so the \`t=\` times are exact and repeatable. On your machine, use \`asyncio.run(main())\`; we did that on python3.12 with real sleeps and got the same output.

~~~python
async def with_gather():
    try:
        await asyncio.gather(call("users", 1), call("billing", 0.5, fail=True))
    except ConnectionError as e:
        print(stamp(), "gather raised:", e)
    await asyncio.sleep(2)   # look: users still runs, nobody awaits it
    print(stamp(), "main moved on long ago")


async def with_taskgroup():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(call("users", 1))
            tg.create_task(call("billing", 0.5, fail=True))
    except* ConnectionError as eg:
        print(stamp(), "TaskGroup raised:", repr(eg))
    print(stamp(), "every child is finished here")
~~~

~~~text
--- gather: first error is raised, siblings keep running
t=0.5 gather raised: billing is down
t=1.0 users finished
t=2.5 main moved on long ago
--- TaskGroup: first error cancels the siblings
t=3.0 users was cancelled
t=3.0 TaskGroup raised: ExceptionGroup('unhandled errors in a TaskGroup', [ConnectionError('billing is down')])
t=3.0 every child is finished here
--- both, when nothing fails
t=3.1 b finished
t=3.2 a finished
t=3.2 gather results in argument order: ['A', 'B']
t=3.3 b finished
t=3.4 a finished
t=3.4 TaskGroup results: ['A', 'B']
~~~

Read the times:

- **gather:** \`billing\` fails at 0.5 and gather raises immediately. But \`users\` keeps running and prints \`users finished\` at **1.0** — after the caller had already handled the error. In a real server that orphan could be writing to a database for a request that already returned a 500 error.
- **TaskGroup:** \`billing\` fails at 3.0 (the second section started at 2.5), the group cancels \`users\` at the same instant, and only then raises. When the line after the block runs, no child is alive.
- **Happy path:** with no failures both give the same results in the same order. With TaskGroup you keep the \`Task\` objects (\`ta\`, \`tb\`) and read \`.result()\` after the block — safe, because the block guarantees they are done.

The exception TaskGroup raises is always an \`ExceptionGroup\` (message \`unhandled errors in a TaskGroup\`), even for a single failure, so you catch it with \`except*\` — see [except* and ExceptionGroup](/interview-question/what-is-except-and-exceptiongroup-in-python-3-11).

## 4. Example 2 Walk-Through: Several Failures

Three checks, two of which fail in the same instant:

~~~python
jobs = [("disk", 0.1, None), ("dns", 0.2, KeyError), ("db", 0.2, TimeoutError)]
~~~

~~~text
gather, default: only the first error reaches you
  (dns raises KeyError)
  (db raises TimeoutError)
  caught KeyError('dns')
gather(return_exceptions=True): errors become results
  (dns raises KeyError)
  (db raises TimeoutError)
   'disk: ok'
   KeyError('dns')
   TimeoutError('db')
TaskGroup: every error, grouped, nothing left running
  (dns raises KeyError)
  (db raises TimeoutError)
  KeyError part: (KeyError('dns'),)
  TimeoutError part: (TimeoutError('db'),)
~~~

- **gather, default:** both \`dns\` and \`db\` raised, but only \`KeyError('dns')\` reached the caller. The \`TimeoutError\` from \`db\` vanished without a log line — gather marks the later exceptions as retrieved so asyncio does not even warn about them.
- **\`gather(return_exceptions=True)\`:** nothing is lost, but errors come back **as values** mixed with results. Your code must check every item with \`isinstance(r, BaseException)\`; forget once and an exception object flows into your business logic as if it were data.
- **TaskGroup:** both errors arrive, grouped by type, and each \`except*\` clause handled its part.

## 5. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runner (Pyodide 0.25.1) with identical stdout, and printed the same on python3.12 and python3.13. With the helper swapped for \`asyncio.run()\` and real sleeps (python3.12), the output was again identical.

Example 1 — gather leaves orphans, TaskGroup cancels siblings:

~~~text
--- gather: first error is raised, siblings keep running
t=0.5 gather raised: billing is down
t=1.0 users finished
t=2.5 main moved on long ago
--- TaskGroup: first error cancels the siblings
t=3.0 users was cancelled
t=3.0 TaskGroup raised: ExceptionGroup('unhandled errors in a TaskGroup', [ConnectionError('billing is down')])
t=3.0 every child is finished here
--- both, when nothing fails
t=3.1 b finished
t=3.2 a finished
t=3.2 gather results in argument order: ['A', 'B']
t=3.3 b finished
t=3.4 a finished
t=3.4 TaskGroup results: ['A', 'B']
~~~

Example 2 — several failures under gather, \`return_exceptions\` and TaskGroup:

~~~text
gather, default: only the first error reaches you
  (dns raises KeyError)
  (db raises TimeoutError)
  caught KeyError('dns')
gather(return_exceptions=True): errors become results
  (dns raises KeyError)
  (db raises TimeoutError)
   'disk: ok'
   KeyError('dns')
   TimeoutError('db')
TaskGroup: every error, grouped, nothing left running
  (dns raises KeyError)
  (db raises TimeoutError)
  KeyError part: (KeyError('dns'),)
  TimeoutError part: (TimeoutError('db'),)
~~~

## 6. gather vs TaskGroup

| | \`asyncio.gather\` | \`asyncio.TaskGroup\` |
| :--- | :--- | :--- |
| Available since | very early asyncio | Python 3.11 |
| Shape | one \`await\` on a fixed list | \`async with\` block; add tasks at any time inside it, even from children |
| Results | list in argument order | keep each \`Task\`, call \`.result()\` after the block |
| First failure | raised at once; **siblings keep running** | siblings and the body are cancelled, then all are awaited |
| Several failures | only the first is raised; the rest are dropped | all collected into one \`ExceptionGroup\` |
| Partial results on failure | yes with \`return_exceptions=True\` | no — failed group means \`except*\`; successful tasks still have \`.result()\` |
| Caller is cancelled | children are cancelled too (checked on 3.11 and 3.13) | children are cancelled too |
| Error handling syntax | \`try\` / \`except\` | \`try\` / \`except*\` |

So does TaskGroup *replace* gather? For "run these and fail as a unit", yes — it is the safer default, and the asyncio docs mention it next to gather as the alternative that cancels the remaining tasks when one fails. But the CPython maintainers explicitly adjusted the documentation so it does not imply TaskGroup is a drop-in replacement for gather ([CPython PR 103644](https://github.com/python/cpython/pull/103644/files)). When you *want* "best effort, give me whatever succeeded", \`gather(..., return_exceptions=True)\` is still a good fit — or wrap each child so it catches its own errors inside a TaskGroup.

## 7. Writing The Common Patterns With TaskGroup

~~~python
# Collect results in order
async with asyncio.TaskGroup() as tg:
    tasks = [tg.create_task(fetch(url)) for url in urls]
results = [t.result() for t in tasks]

# Best effort: each child handles its own error, so the group never fails
async def safe_fetch(url):
    try:
        return await fetch(url)
    except OSError as e:
        return e
~~~

Cancellation details — what happens to the body, to a child that ignores cancellation, to timeouts and to outside cancellation — are their own question: [how TaskGroup handles cancellation and ExceptionGroup](/interview-question/how-does-taskgroup-handle-cancellation-and-exceptiongroup).

## 8. Edge Cases

- **A group with no tasks** is fine; the block just runs its body.
- **Adding a task after the block ended** raises \`RuntimeError\` (the message on 3.11 ends in \`is finished\`).
- **Fire-and-forget background tasks** (\`asyncio.create_task\` without keeping a reference) are the opposite of structured concurrency; a TaskGroup at the right level of your program usually replaces them.
- **Python 3.10 and earlier** have no TaskGroup. Libraries such as anyio offer task groups there; we did not test them for this page.

## Common Pitfalls

- **Catching a TaskGroup failure with \`except ValueError\`.** It raises an \`ExceptionGroup\`, so a plain \`except ValueError\` does not match; use \`except* ValueError\`.
- **Reading \`.result()\` inside the block.** A child may still be running there: on 3.11 and 3.13 it raised \`InvalidStateError: Result is not set.\`; read results after the block.
- **Replacing \`gather(return_exceptions=True)\` mechanically.** If the code relied on partial results, a TaskGroup changes the behaviour: the first failure cancels everyone.
- **Assuming gather cancels siblings on error.** It does not (example 1 shows \`users finished\` after gather raised); only cancelling the gather itself cancels its children.
- **Forgetting that one \`except*\` clause handles a whole subgroup.** \`eg.exceptions\` may hold several errors of that type.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.TaskGroup</code>, added in 3.11, is an async context manager: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tg.create_task()</code> starts children, and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async with</code> block does not end until every child has finished.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it beats gather:</strong> <span style="color:#f0e2c8;">With gather, the first error is raised but the other tasks keep running as <strong style="color:#ffca28;">orphans</strong>, and any later errors are silently dropped. TaskGroup cancels the siblings, waits for them, and raises one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup</code> with every error.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The principle:</strong> <span style="color:#f0e2c8;">That is <strong style="color:#ffca28;">structured concurrency</strong>: tasks cannot outlive the block that created them, so there are no leaks and no lost errors — the same idea as Trio nurseries, which PEP 654 cites.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How you use results:</strong> <span style="color:#f0e2c8;">Keep the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Task</code> objects and call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.result()</code> after the block; handle failures with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except*</code> because the error is always a group.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The honest caveat:</strong> <span style="color:#f0e2c8;">It is not a drop-in replacement: when you want partial results, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gather(return_exceptions=True)</code> or children that catch their own errors are still right.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">gather</code> cancel the other tasks when one fails?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It propagates the first exception and the other awaitables keep running. They are only cancelled if the gather future itself is cancelled, for example when the caller is cancelled.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What exception do you get from a TaskGroup when one child fails?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup('unhandled errors in a TaskGroup', [...])</code>, even for a single failure, so you use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except* ConnectionError</code> or inspect <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eg.exceptions</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get results out of a TaskGroup in order?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create the tasks in a list inside the block, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[t.result() for t in tasks]</code> after it. The order is the order you created them, not the completion order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still use gather?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For best-effort fan-out where partial success is fine — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return_exceptions=True</code> and check each item — or on Python 3.10 and older, which have no TaskGroup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the task running the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">async with</code> block is cancelled from outside?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The group cancels all children, waits for them, and then re-raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CancelledError</code> (not a group), so the cancellation keeps travelling up.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| \`asyncio.TaskGroup\` | 3.11 async context manager that owns child tasks and waits for all of them |
| Structured concurrency | Concurrent tasks are scoped to a block and cannot outlive it |
| \`asyncio.gather\` | Await several awaitables, results in argument order, first error raised, siblings keep running |
| Orphaned task | A task still running after nobody waits for it |

**Conclusion:** \`TaskGroup\` turns "start some tasks and hope" into a block with a guarantee: when it ends, every child has ended, and every error is in the \`ExceptionGroup\` it raised. \`gather\` is still handy for best-effort fan-out, but for "these calls succeed or fail together" — the common case in request handlers — TaskGroup removes two classes of bug at once: orphaned tasks and silently lost exceptions. Pair it with \`except*\` and read results after the block.`,
    examples: [
      {
        label: `gather leaves orphans; TaskGroup cancels siblings`,
        code: `import asyncio
import asyncio.events as _events

# --- Helper so this runs in the browser page too. On your own machine
# --- replace run(main()) with asyncio.run(main()); the behaviour is the same.
class VirtualClockLoop(asyncio.BaseEventLoop):
    """Real asyncio scheduling; sleeps jump a fake clock instead of waiting."""
    def __init__(self):
        super().__init__()
        self._now = 0.0
        self._selector = self          # the loop asks us: wait how long?
    def select(self, timeout):
        self._now += timeout or 0.0    # pretend that much time passed
        return []
    def time(self):
        return self._now
    def _process_events(self, events):
        pass
    def _write_to_self(self):
        pass

def run(main):
    outer = _events._get_running_loop()   # the page already runs a loop
    _events._set_running_loop(None)
    loop = VirtualClockLoop()
    try:
        return loop.run_until_complete(main)
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        _events._set_running_loop(outer)
# --- end of helper


def stamp():
    return f"t={asyncio.get_running_loop().time():.1f}"


async def call(name, seconds, fail=False):
    try:
        await asyncio.sleep(seconds)
        if fail:
            raise ConnectionError(f"{name} is down")
        print(stamp(), name, "finished")
        return name.upper()
    except asyncio.CancelledError:
        print(stamp(), name, "was cancelled")
        raise


async def with_gather():
    print("--- gather: first error is raised, siblings keep running")
    try:
        await asyncio.gather(call("users", 1), call("billing", 0.5, fail=True))
    except ConnectionError as e:
        print(stamp(), "gather raised:", e)
    await asyncio.sleep(2)   # look: users still runs, nobody awaits it
    print(stamp(), "main moved on long ago")


async def with_taskgroup():
    print("--- TaskGroup: first error cancels the siblings")
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(call("users", 1))
            tg.create_task(call("billing", 0.5, fail=True))
    except* ConnectionError as eg:
        print(stamp(), "TaskGroup raised:", repr(eg))
    print(stamp(), "every child is finished here")


async def happy_path():
    print("--- both, when nothing fails")
    results = await asyncio.gather(call("a", 0.2), call("b", 0.1))
    print(stamp(), "gather results in argument order:", results)
    async with asyncio.TaskGroup() as tg:
        ta = tg.create_task(call("a", 0.2))
        tb = tg.create_task(call("b", 0.1))
    print(stamp(), "TaskGroup results:", [ta.result(), tb.result()])


async def main():
    await with_gather()
    await with_taskgroup()
    await happy_path()


run(main())`,
      },
      {
        label: `Several failures: gather, return_exceptions and TaskGroup`,
        code: `import asyncio
import asyncio.events as _events

# --- Helper so this runs in the browser page too. On your own machine
# --- replace run(main()) with asyncio.run(main()); the behaviour is the same.
class VirtualClockLoop(asyncio.BaseEventLoop):
    """Real asyncio scheduling; sleeps jump a fake clock instead of waiting."""
    def __init__(self):
        super().__init__()
        self._now = 0.0
        self._selector = self          # the loop asks us: wait how long?
    def select(self, timeout):
        self._now += timeout or 0.0    # pretend that much time passed
        return []
    def time(self):
        return self._now
    def _process_events(self, events):
        pass
    def _write_to_self(self):
        pass

def run(main):
    outer = _events._get_running_loop()   # the page already runs a loop
    _events._set_running_loop(None)
    loop = VirtualClockLoop()
    try:
        return loop.run_until_complete(main)
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        _events._set_running_loop(outer)
# --- end of helper


async def check(name, seconds, error=None):
    await asyncio.sleep(seconds)
    if error:
        print(f"  ({name} raises {error.__name__})")
        raise error(name)
    return f"{name}: ok"


async def main():
    jobs = [("disk", 0.1, None), ("dns", 0.2, KeyError), ("db", 0.2, TimeoutError)]

    print("gather, default: only the first error reaches you")
    try:
        await asyncio.gather(*(check(*j) for j in jobs))
    except Exception as e:
        print("  caught", repr(e))
    await asyncio.sleep(1)   # db failed meanwhile: nobody will ever see it

    print("gather(return_exceptions=True): errors become results")
    results = await asyncio.gather(*(check(*j) for j in jobs), return_exceptions=True)
    for r in results:
        print("  ", repr(r))

    print("TaskGroup: every error, grouped, nothing left running")
    try:
        async with asyncio.TaskGroup() as tg:
            for j in jobs:
                tg.create_task(check(*j))
    except* KeyError as eg:
        print("  KeyError part:", eg.exceptions)
    except* TimeoutError as eg:
        print("  TimeoutError part:", eg.exceptions)


run(main())`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does TaskGroup handle cancellation and ExceptionGroup?`,
    difficulty: "hard",
    seoDescription: `How asyncio.TaskGroup cancels siblings and the body on failure, collects errors into an ExceptionGroup, and handles outside cancellation and timeouts.`,
    description: `**Question presented to candidate:**
"Inside \`async with asyncio.TaskGroup()\`, one child task raises. Walk me through exactly what happens next: to the other children, to the code in the \`async with\` body, and to the exception you finally see. Then: what if the whole thing is cancelled from outside, or wrapped in a timeout?"

**What a strong answer should cover:**
- On the first child failure the group **cancels every other running child and the parent task running the body**, then waits for all of them, including their \`finally\` / cleanup code, before leaving the block.
- The result is one \`ExceptionGroup("unhandled errors in a TaskGroup", [...])\` holding every non-cancellation error (children and body); \`CancelledError\`s of the cancelled children are not included. Handle it with \`except*\`.
- The group cancels the parent with \`cancel()\` and undoes it with \`uncancel()\` in \`__aexit__\`, so its own cancellation turns into the group error, while a **real outside cancellation** still comes out as a plain \`CancelledError\` (and \`asyncio.timeout\` turns it into \`TimeoutError\`).
- A child that swallows \`CancelledError\` breaks the contract: it keeps running cleanup or returns normally; always re-raise.
- \`KeyboardInterrupt\` and \`SystemExit\` are treated specially (re-raised as-is, not grouped); nested groups stay nested.

**Clarifying questions expected:**
- Should one failing child really stop the others, or are some children "best effort"?

**Code / implementation expected:** Optional — a TaskGroup where one child fails and another prints when it is cancelled, caught with \`except*\`.`,
    answer: `**Target Audience:** Developers who already use \`asyncio.TaskGroup\` and need the precise cancellation rules for production code and for interviews.
**Difficulty:** Hard
**Python version:** Checked on CPython 3.11, 3.12 and 3.13 (identical output for both examples); both run in this page on Pyodide 0.25.1 (CPython 3.11.3). Source-code references are to \`Lib/asyncio/taskgroups.py\` as installed with CPython 3.11 and 3.13.

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A film crew is shooting a scene: the camera operator, the sound engineer and the lighting tech all work at the same time, and the director stands in the middle watching.

The lighting rig catches fire. What should happen?

1. Someone shouts **"cut!"** — the camera and sound people stop what they are doing. They do not just drop everything: they get a moment to **pack up safely** (save the footage, unplug the mics).
2. The **director** stops directing too, even mid-sentence.
3. Only when everyone has stopped and packed up does the director walk to the producer with **one incident report** listing every problem — maybe the sound desk also broke.

But if the *producer* calls the whole shoot off ("we are out of budget"), nobody files an incident report. Everyone just stops, and the news that goes up the chain is "cancelled".

That is exactly how a \`TaskGroup\` behaves, and the difference between those two endings — "incident report" versus "cancelled" — is the part interviewers dig into.

## 2. The Rules in Plain Words

📌 **Interview term: Cancellation** — in asyncio, \`task.cancel()\` asks a task to stop: the next time it is suspended at an \`await\`, a \`CancelledError\` is raised inside it. Code in \`except\` / \`finally\` can clean up (even \`await\`), and is expected to **re-raise** so the task ends as cancelled. \`CancelledError\` is a \`BaseException\`, not an \`Exception\`, so \`except Exception:\` does not catch it.

When a child task fails with an ordinary exception, the group:

1. records the error,
2. **cancels every other unfinished child**,
3. **cancels the parent task** — the one running the \`async with\` body — so whatever the body is awaiting is interrupted too,
4. waits in \`__aexit__\` until **all** children have finished, cleanup included,
5. raises \`ExceptionGroup("unhandled errors in a TaskGroup", errors)\`, where \`errors\` are all non-cancellation exceptions from children **and** from the body.

📌 **Interview term: Sibling cancellation** — the first failure in a structured-concurrency scope cancels the other tasks in that scope, so nothing keeps running for a job that has already failed.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="Timeline: child B fails, the group cancels child A and the body, waits for cleanup, then raises one ExceptionGroup">
  <defs>
    <marker id="py27q4-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="40" width="190" height="64" rx="10"/>
  <text class="d-text" x="125" y="68" text-anchor="middle">child B raises</text>
  <text class="d-sub" x="125" y="88" text-anchor="middle">ValueError</text>
  <rect class="d-box" x="290" y="40" width="190" height="64" rx="10"/>
  <text class="d-text" x="385" y="68" text-anchor="middle">group aborts</text>
  <text class="d-sub" x="385" y="88" text-anchor="middle">cancel A and body</text>
  <rect class="d-box" x="540" y="40" width="190" height="64" rx="10"/>
  <text class="d-text" x="635" y="68" text-anchor="middle">cleanup runs</text>
  <text class="d-sub" x="635" y="88" text-anchor="middle">finally blocks await</text>
  <rect class="d-box-muted" x="290" y="220" width="190" height="64" rx="10"/>
  <text class="d-text" x="385" y="248" text-anchor="middle">__aexit__ waits</text>
  <text class="d-sub" x="385" y="268" text-anchor="middle">until no child is left</text>
  <rect class="d-box-accent" x="540" y="220" width="190" height="64" rx="10"/>
  <text class="d-text" x="635" y="248" text-anchor="middle">ExceptionGroup</text>
  <text class="d-sub" x="635" y="268" text-anchor="middle">all real errors</text>
  <path class="d-edge-accent" d="M 222 72 L 284 72" marker-end="url(#py27q4-a)"/>
  <path class="d-edge" d="M 482 72 L 534 72" marker-end="url(#py27q4-a)"/>
  <path class="d-edge" d="M 635 106 C 635 170, 385 160, 385 214" marker-end="url(#py27q4-a)"/>
  <path class="d-edge-accent" d="M 482 252 L 534 252" marker-end="url(#py27q4-a)"/>
</svg>

The \`CancelledError\`s raised inside A and the body are the *mechanism* of stopping, so they are not put in the group — only the real failure is.

## 3. Example 1 Walk-Through: One Child Fails

The examples begin with a \`run()\` helper because the page runs in a browser, where \`asyncio.run()\` is not allowed. It is a real asyncio event loop whose clock jumps forward instead of sleeping, so the \`t=\` times are exact; on your machine use \`asyncio.run(main())\`. We ran both examples that way on python3.12 with real sleeps and got the same lines.

~~~python
async def download(name, seconds):
    try:
        await asyncio.sleep(seconds)
        return name
    except asyncio.CancelledError:
        print(stamp(), name, "got CancelledError")
        raise                          # always let it propagate
    finally:
        await asyncio.sleep(0.2)       # cleanup may still await
        print(stamp(), name, "cleanup finished")
~~~

~~~python
async with asyncio.TaskGroup() as tg:
    slow = tg.create_task(download("video", 10))
    tg.create_task(explode("thumb", 1, ValueError("bad size")))
    try:
        await asyncio.sleep(60)    # the body is waiting here
    except asyncio.CancelledError:
        print(stamp(), "body got CancelledError too")
        raise
~~~

~~~text
1) one child fails: siblings AND the body are cancelled
t=1.0 thumb raises ValueError('bad size')
t=1.0 video got CancelledError
t=1.0 body got CancelledError too
t=1.2 video cleanup finished
t=1.2 caught ExceptionGroup('unhandled errors in a TaskGroup', [ValueError('bad size')])
t=1.2 video cancelled? True
2) two children fail in the same instant: both are kept
t=1.7 a raises KeyError('a')
t=1.7 b raises OSError('b')
  KeyError handler: (KeyError('a'),)
  OSError handler: (OSError('b'),)
3) a child that raises a group gives a nested group
t=1.8 inner raises ExceptionGroup('inner', [ValueError(1)])
   ExceptionGroup('unhandled errors in a TaskGroup', [ExceptionGroup('inner', [ValueError(1)])])
~~~

Section 1 of the output, line by line:

- \`t=1.0 thumb raises\` — the failure.
- \`t=1.0 video got CancelledError\` — the sibling is cancelled in the same instant, 9 seconds before it would have finished.
- \`t=1.0 body got CancelledError too\` — the body's \`sleep(60)\` was interrupted. Without this, the body could keep the whole group waiting for a minute after the job had already failed.
- \`t=1.2 video cleanup finished\` — the group **waited 0.2 s for the cleanup** in \`finally\` before raising. Structured concurrency means "nothing is left running", and that includes cleanup.
- \`t=1.2 caught ExceptionGroup(...)\` — one group, one real error. \`slow.cancelled()\` is \`True\`.

Section 2 shows two children failing in the same loop iteration: both errors are kept, and each \`except*\` clause got its own part. Section 3 shows that a child raising an \`ExceptionGroup\` itself produces a **nested** group — the TaskGroup does not flatten it, and \`except* ValueError\` still matched the leaf inside (see [splitting ExceptionGroups](/interview-question/how-do-you-raise-and-split-exceptiongroups-manually)).

## 4. How the Group Cancels Its Own Parent (and Undoes It)

The body is not a child task; it runs in the **parent task**. The only way to interrupt what the body is awaiting is to cancel that task. But then, how does the group tell "I cancelled my parent to abort" apart from "someone outside cancelled my parent"? The 3.11 source answers it with a counter:

📌 **Interview term: \`Task.cancelling()\` / \`Task.uncancel()\`** — task methods that TaskGroup and \`asyncio.timeout\` (both new in 3.11) are built on. \`cancelling()\` returns how many cancellation requests are pending on a task; \`uncancel()\` decrements it. Code that cancels a task *for its own purposes* calls \`uncancel()\` later, so only cancellations from someone else keep counting.

What \`taskgroups.py\` does (paraphrased from the 3.11 source):

~~~python
# In _on_task_done, when a child failed and we are not aborting yet:
self._abort()                          # cancel every unfinished child
self._parent_cancel_requested = True
self._parent_task.cancel()             # interrupt the body

# In __aexit__:
if self._parent_cancel_requested:
    if self._parent_task.uncancel() == 0:
        propagate_cancellation_error = None   # it was only us: swallow it
...
if self._errors:
    raise BaseExceptionGroup("unhandled errors in a TaskGroup", self._errors)
~~~

So if the count drops to zero, the \`CancelledError\` was the group's own and becomes the group error. If someone else also cancelled the parent, the count stays above zero and the cancellation keeps travelling. In 3.13 the source moves the \`uncancel()\` call later and, if the parent is still being cancelled from outside when errors exist, re-arms that cancellation — the observable behaviour in our examples was the same on 3.11, 3.12 and 3.13. (The module's first line also says it was "Adapted with permission from the EdgeDB project".)

In a separate probe, a cancelled child's \`asyncio.current_task().cancelling()\` returned \`1\` inside its \`except CancelledError\` block. The rule of thumb for application code is simple: **never call \`uncancel()\` yourself unless you are writing a primitive like TaskGroup or timeout.**

## 5. Example 2 Walk-Through: Cancellation From Outside

~~~text
1) the parent task is cancelled from outside
t=0.5 child cancelled
t=0.5 parent raised plain CancelledError, not a group
2) a timeout around the group
t=1.5 slow cancelled
t=1.5 TimeoutError: the group was cancelled by the timeout
3) stop every task on purpose with a sentinel exception
t=1.8 poller cancelled
t=1.8 group stopped cleanly
4) a child that swallows CancelledError
t=2.0 stubborn swallowed it and returned
t=2.0 still raised: (OSError('disk'),)
t=2.0 stubborn.cancelled() = False result: pretending all is fine
5) create_task on a finished group
RuntimeError: TaskGroup <TaskGroup cancelling> is finished
~~~

1. **Outside cancellation.** \`task.cancel()\` on the task running the group: the child was cancelled, and the parent raised a **plain \`CancelledError\`**, not an \`ExceptionGroup\`. Cancellation is not an error report; it must keep propagating so whoever cancelled can see it finish.
2. **Timeout.** \`asyncio.timeout(1)\` (new in 3.11) cancels the task when the deadline passes; the group cancelled its child and the timeout context manager converted the cancellation into \`TimeoutError\`. Timeouts compose with groups because both use the counter from section 4.
3. **Stopping a group on purpose.** TaskGroup has no \`cancel()\` method — its only public method was \`create_task\` on 3.11, 3.12 and 3.13. The usual pattern is a sentinel exception: a child raises \`StopGroup\`, siblings are cancelled, and \`except* StopGroup:\` absorbs it.
4. **A child that swallows \`CancelledError\`.** \`stubborn\` caught it and returned a value. The group still raised the \`OSError\`, but \`stubborn.cancelled()\` is \`False\` and it has a result. In real code that child may keep working — or, in a loop, never stop — and timeouts built on cancellation stop working reliably. The asyncio docs warn that structured-concurrency components "might misbehave if a coroutine swallows \`asyncio.CancelledError\`" ([asyncio Task docs](https://docs.python.org/3/library/asyncio-task.html#task-cancellation)).
5. **A finished group.** \`create_task\` raised \`RuntimeError: TaskGroup <TaskGroup cancelling> is finished\`. The repr shows the group's last state (it had aborted), and the check is "exiting and no tasks left". We closed the coroutine ourselves; on 3.11 an unclosed one triggers a "never awaited" warning, while the 3.13 source calls \`coro.close()\` for you.

## 6. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runner (Pyodide 0.25.1) with identical stdout; python3.12 and python3.13 printed the same, and so did the \`asyncio.run()\` + real-sleep variant on python3.12.

Example 1 — a child fails: who gets cancelled, cleanup, and the group:

~~~text
1) one child fails: siblings AND the body are cancelled
t=1.0 thumb raises ValueError('bad size')
t=1.0 video got CancelledError
t=1.0 body got CancelledError too
t=1.2 video cleanup finished
t=1.2 caught ExceptionGroup('unhandled errors in a TaskGroup', [ValueError('bad size')])
t=1.2 video cancelled? True
2) two children fail in the same instant: both are kept
t=1.7 a raises KeyError('a')
t=1.7 b raises OSError('b')
  KeyError handler: (KeyError('a'),)
  OSError handler: (OSError('b'),)
3) a child that raises a group gives a nested group
t=1.8 inner raises ExceptionGroup('inner', [ValueError(1)])
   ExceptionGroup('unhandled errors in a TaskGroup', [ExceptionGroup('inner', [ValueError(1)])])
~~~

Example 2 — outside cancellation, timeouts, a sentinel stop and a swallowed cancel:

~~~text
1) the parent task is cancelled from outside
t=0.5 child cancelled
t=0.5 parent raised plain CancelledError, not a group
2) a timeout around the group
t=1.5 slow cancelled
t=1.5 TimeoutError: the group was cancelled by the timeout
3) stop every task on purpose with a sentinel exception
t=1.8 poller cancelled
t=1.8 group stopped cleanly
4) a child that swallows CancelledError
t=2.0 stubborn swallowed it and returned
t=2.0 still raised: (OSError('disk'),)
t=2.0 stubborn.cancelled() = False result: pretending all is fine
5) create_task on a finished group
RuntimeError: TaskGroup <TaskGroup cancelling> is finished
~~~

## 7. Every Ending, In One Table

| What happened | Other children | Body | What leaves the \`async with\` |
| :--- | :--- | :--- | :--- |
| All children succeed | — | runs to the end | nothing; read \`task.result()\` |
| One or more children raise \`Exception\`s | cancelled, cleanup awaited | cancelled | \`ExceptionGroup\` of all real errors |
| The body raises an \`Exception\` | cancelled | — | \`ExceptionGroup\` that includes the body error |
| Parent cancelled from outside | cancelled | cancelled | plain \`CancelledError\` (unless real errors also occurred — errors take priority) |
| \`asyncio.timeout\` around the group expires | cancelled | cancelled | \`TimeoutError\` from the timeout block |
| A child raises \`KeyboardInterrupt\` / \`SystemExit\` | cancelled | cancelled | the bare exception, not a group (source rule \`_is_base_error\`) |

The "body raises" row: a \`ValueError\` raised directly in the body showed up as \`ExceptionGroup('unhandled errors in a TaskGroup', [ValueError('body')])\` in our 3.11 probe — the body's error is grouped like a child's. On the last row, note that in a real program asyncio's own task machinery also lets \`KeyboardInterrupt\` escape the event loop: in our 3.11 probe, raising it in a child stopped \`run_until_complete\` with the bare \`KeyboardInterrupt\`.

## 8. Edge Cases

- **Cleanup that awaits is allowed** but should be short; the whole group (and its caller) waits for it.
- **A child that fails during its own cleanup** adds that error to the same group: a child whose \`finally\` raised \`OSError\` while being cancelled gave \`ExceptionGroup('unhandled errors in a TaskGroup', [ValueError('first'), OSError('cleanup broke')])\` on 3.11, 3.12 and 3.13.
- **Calling \`create_task\` while the group is aborting** raises \`RuntimeError\` ending in \`is shutting down\` (3.11 source), so a child cannot spawn new work after the group has started to fail.
- **Errors after the parent finished** cannot happen in normal use; the 3.11 source still reports them to the loop's exception handler.

## Common Pitfalls

- **\`except Exception:\` around an \`await\` inside a child, then carrying on.** It does not catch \`CancelledError\` (good), but \`except BaseException:\` or a bare \`except:\` does — and swallows the group's cancellation.
- **Swallowing \`CancelledError\` to "finish cleanly".** Do cleanup in \`finally\`, or catch, clean up and \`raise\`.
- **Expecting a cancelled parent to raise an \`ExceptionGroup\`.** Outside cancellation comes out as \`CancelledError\`; only real errors make a group.
- **Long or blocking cleanup in \`finally\`.** The group waits for it, so a stuck cleanup hangs the whole request.
- **Catching the group with \`except ValueError\`.** It is an \`ExceptionGroup\`; use \`except*\` or check \`eg.exceptions\`.
- **Using \`uncancel()\` in application code.** It exists for primitives like TaskGroup and timeout; calling it casually breaks their bookkeeping.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The failure path:</strong> <span style="color:#f0e2c8;">When a child raises, the TaskGroup cancels every other child <strong style="color:#ffca28;">and the parent task running the body</strong>, waits for all of them, including their <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finally</code> cleanup, and only then raises.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What you get:</strong> <span style="color:#f0e2c8;">One <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup('unhandled errors in a TaskGroup', ...)</code> with every real error from children and the body; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CancelledError</code>s used to stop siblings are not included. You handle it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except*</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Own vs outside cancel:</strong> <span style="color:#f0e2c8;">The group cancels its parent with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cancel()</code> and undoes that with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uncancel()</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__aexit__</code>. If the parent was also cancelled from outside, the count stays positive and a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CancelledError</code> propagates; a timeout turns that into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TimeoutError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The contract for children:</strong> <span style="color:#f0e2c8;">Children must let <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CancelledError</code> propagate; a child that swallows it keeps running and breaks timeouts. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">KeyboardInterrupt</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SystemExit</code> are re-raised bare, not grouped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practical pattern:</strong> <span style="color:#f0e2c8;">To stop a group on purpose, raise a sentinel exception from a child and catch it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except*</code>; nested groups from children stay nested, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except*</code> still matches the leaves.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are the cancelled siblings' <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">CancelledError</code>s part of the ExceptionGroup?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. They are how the group stops them. Only non-cancellation exceptions are collected; a cancelled child just ends with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">task.cancelled()</code> being <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the body get interrupted if it is not a task in the group?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The body runs in the parent task, so the group calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent.cancel()</code>. In <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__aexit__</code> it calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parent.uncancel()</code>, and if the count reaches zero it knows the cancellation was its own and raises the error group instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the request handler running the TaskGroup is cancelled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">All children are cancelled and awaited, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CancelledError</code> propagates out of the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async with</code> — no group — unless real errors happened too, in which case the group takes priority.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you put a deadline on a whole group?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Wrap it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">async with asyncio.timeout(5): async with asyncio.TaskGroup() as tg: ...</code>. When the deadline passes, the task is cancelled, the group cancels its children, and the timeout block raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TimeoutError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is swallowing <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">CancelledError</code> dangerous here?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The group, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.timeout</code> and the outside caller all rely on cancellation actually ending the task. A child that catches it and returns looks successful, may keep working, and can make a timeout or shutdown hang.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| Cancellation | \`task.cancel()\` raises \`CancelledError\` at the next \`await\`; clean up and re-raise |
| Sibling cancellation | The first failure in a scope cancels the other tasks in it |
| \`Task.cancelling()\` / \`Task.uncancel()\` | Counter of pending cancellation requests that TaskGroup and timeout rely on |

**Conclusion:** A TaskGroup failure is a controlled shutdown: the first real error cancels the siblings and the body, the group waits for every cleanup, and one \`ExceptionGroup\` reports every real error. Cancellation from outside is different — it is passed on as \`CancelledError\` (or turned into \`TimeoutError\` by a timeout) because it is an instruction, not an error report, and the \`cancel()\` / \`uncancel()\` counter is how the group tells the two apart. The one rule you must follow in children is to let \`CancelledError\` propagate. For the basics, see [TaskGroup vs gather](/interview-question/what-is-asyncio-taskgroup-and-why-does-it-replace-gather) and [except* and ExceptionGroup](/interview-question/what-is-except-and-exceptiongroup-in-python-3-11).`,
    examples: [
      {
        label: `A child fails: who gets cancelled, cleanup, and the group`,
        code: `import asyncio
import asyncio.events as _events

# --- Helper so this runs in the browser page too. On your own machine
# --- replace run(main()) with asyncio.run(main()); the behaviour is the same.
class VirtualClockLoop(asyncio.BaseEventLoop):
    """Real asyncio scheduling; sleeps jump a fake clock instead of waiting."""
    def __init__(self):
        super().__init__()
        self._now = 0.0
        self._selector = self          # the loop asks us: wait how long?
    def select(self, timeout):
        self._now += timeout or 0.0    # pretend that much time passed
        return []
    def time(self):
        return self._now
    def _process_events(self, events):
        pass
    def _write_to_self(self):
        pass

def run(main):
    outer = _events._get_running_loop()   # the page already runs a loop
    _events._set_running_loop(None)
    loop = VirtualClockLoop()
    try:
        return loop.run_until_complete(main)
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        _events._set_running_loop(outer)
# --- end of helper


def stamp():
    return f"t={asyncio.get_running_loop().time():.1f}"


async def download(name, seconds):
    try:
        await asyncio.sleep(seconds)
        return name
    except asyncio.CancelledError:
        print(stamp(), name, "got CancelledError")
        raise                          # always let it propagate
    finally:
        await asyncio.sleep(0.2)       # cleanup may still await
        print(stamp(), name, "cleanup finished")


async def explode(name, seconds, error):
    await asyncio.sleep(seconds)
    print(stamp(), name, "raises", repr(error))
    raise error


async def main():
    print("1) one child fails: siblings AND the body are cancelled")
    try:
        async with asyncio.TaskGroup() as tg:
            slow = tg.create_task(download("video", 10))
            tg.create_task(explode("thumb", 1, ValueError("bad size")))
            try:
                await asyncio.sleep(60)    # the body is waiting here
            except asyncio.CancelledError:
                print(stamp(), "body got CancelledError too")
                raise
    except* ValueError as eg:
        print(stamp(), "caught", repr(eg))
    print(stamp(), "video cancelled?", slow.cancelled())

    print("2) two children fail in the same instant: both are kept")
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(explode("a", 0.5, KeyError("a")))
            tg.create_task(explode("b", 0.5, OSError("b")))
    except* KeyError as eg:
        print("  KeyError handler:", eg.exceptions)
    except* OSError as eg:
        print("  OSError handler:", eg.exceptions)

    print("3) a child that raises a group gives a nested group")
    try:
        async with asyncio.TaskGroup() as outer:
            outer.create_task(explode("inner", 0.1, ExceptionGroup("inner", [ValueError(1)])))
    except* ValueError as eg:
        print("  ", repr(eg))


run(main())`,
      },
      {
        label: `Outside cancellation, timeouts, a sentinel stop and swallowed cancels`,
        code: `import asyncio
import asyncio.events as _events

# --- Helper so this runs in the browser page too. On your own machine
# --- replace run(main()) with asyncio.run(main()); the behaviour is the same.
class VirtualClockLoop(asyncio.BaseEventLoop):
    """Real asyncio scheduling; sleeps jump a fake clock instead of waiting."""
    def __init__(self):
        super().__init__()
        self._now = 0.0
        self._selector = self          # the loop asks us: wait how long?
    def select(self, timeout):
        self._now += timeout or 0.0    # pretend that much time passed
        return []
    def time(self):
        return self._now
    def _process_events(self, events):
        pass
    def _write_to_self(self):
        pass

def run(main):
    outer = _events._get_running_loop()   # the page already runs a loop
    _events._set_running_loop(None)
    loop = VirtualClockLoop()
    try:
        return loop.run_until_complete(main)
    finally:
        loop.run_until_complete(loop.shutdown_asyncgens())
        loop.close()
        _events._set_running_loop(outer)
# --- end of helper


def stamp():
    return f"t={asyncio.get_running_loop().time():.1f}"


async def job(name, seconds):
    try:
        await asyncio.sleep(seconds)
        return name
    except asyncio.CancelledError:
        print(stamp(), name, "cancelled")
        raise


class StopGroup(Exception):
    """Raised on purpose to shut the whole group down."""


async def main():
    print("1) the parent task is cancelled from outside")
    async def parent():
        async with asyncio.TaskGroup() as tg:
            tg.create_task(job("child", 10))
    task = asyncio.create_task(parent())
    await asyncio.sleep(0.5)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print(stamp(), "parent raised plain CancelledError, not a group")

    print("2) a timeout around the group")
    try:
        async with asyncio.timeout(1):
            async with asyncio.TaskGroup() as tg:
                tg.create_task(job("slow", 10))
    except TimeoutError:
        print(stamp(), "TimeoutError: the group was cancelled by the timeout")

    print("3) stop every task on purpose with a sentinel exception")
    async def watchdog():
        await asyncio.sleep(0.3)
        raise StopGroup
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(job("poller", 10))
            tg.create_task(watchdog())
    except* StopGroup:
        print(stamp(), "group stopped cleanly")

    print("4) a child that swallows CancelledError")
    async def stubborn():
        try:
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            print(stamp(), "stubborn swallowed it and returned")
            return "pretending all is fine"
    async def boom():
        await asyncio.sleep(0.2)
        raise OSError("disk")
    try:
        async with asyncio.TaskGroup() as tg:
            s = tg.create_task(stubborn())
            tg.create_task(boom())
    except* OSError as eg:
        print(stamp(), "still raised:", eg.exceptions)
    print(stamp(), "stubborn.cancelled() =", s.cancelled(), "result:", s.result())

    print("5) create_task on a finished group")
    coro = job("late", 1)
    try:
        tg.create_task(coro)
    except RuntimeError as e:
        coro.close()
        print("RuntimeError:", e)


run(main())`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do you raise and split ExceptionGroups manually?`,
    difficulty: "medium",
    seoDescription: `Raise an ExceptionGroup yourself, catch it with except*, and use split(), subgroup(), derive() and nesting correctly in Python 3.11+.`,
    description: `**Question presented to candidate:**
"Forget asyncio for a moment. Suppose you validate a form or process a batch, and you want to report *every* failure at once instead of stopping at the first one. How do you raise an \`ExceptionGroup\` yourself, and how do you take one apart with \`except*\`, \`split()\` and \`subgroup()\`?"

**What a strong answer should cover:**
- Raising: collect exceptions in a list and \`raise ExceptionGroup("message", errors)\`; the list must be a non-empty sequence of exception instances; \`ExceptionGroup\` only accepts \`Exception\` subclasses, \`BaseExceptionGroup\` takes any and picks the right class (Python 3.11+, PEP 654).
- Catching: \`except* T\` handles the matching part of a group (every leaf, nesting kept); several \`except*\` clauses can each run once; unhandled parts and errors raised in handlers are re-raised as a group; a naked exception is wrapped.
- Splitting: \`eg.split(cond)\` returns \`(match, rest)\`, \`eg.subgroup(cond)\` returns only the match; \`cond\` is a type, a tuple of types or a predicate (which also sees the groups themselves); no match gives \`None\`; nesting, \`__traceback__\`, \`__cause__\`, \`__context__\` and \`__notes__\` are kept.
- Subclasses: override \`derive()\` so \`split\` / \`subgroup\` rebuild your class with its extra fields; otherwise they produce plain \`ExceptionGroup\`s.
- Rules: \`except\` and \`except*\` cannot mix in one \`try\`; \`except* ExceptionGroup\` is a \`TypeError\`; no \`break\` / \`continue\` / \`return\` in an \`except*\` block.

**Code / implementation expected:** Yes — raise a group of validation errors, catch it with \`except*\`, and show \`split()\` on a nested group.`,
    answer: `**Target Audience:** Python developers who have seen \`ExceptionGroup\` come out of a \`TaskGroup\` and want to create, inspect and split groups themselves.
**Difficulty:** Medium
**Python version:** Python 3.11+ (PEP 654). Behaviour checked on CPython 3.11, 3.12 and 3.13 (identical output); both examples run in this page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

You hand in a tax form. A bad clerk reads until the first mistake — "box 3 is empty" — and sends it back. You fix box 3, hand it in, and hear "box 7 is wrong". Then "you did not sign". Three round trips for three problems.

A good clerk reads the **whole** form and gives you one sheet: "box 3 empty, box 7 wrong, signature missing". You fix everything at once.

A normal \`raise\` is the bad clerk: one exception, and everything after it is skipped. An **\`ExceptionGroup\`** is the good clerk's sheet — one exception object carrying a list of problems. And because the sheet may hold different *kinds* of problems, Python gives you \`except*\` to say "I handle the money problems here, the identity problems there", and \`split()\` / \`subgroup()\` to sort the sheet in code.

Groups were added for concurrency (a [TaskGroup](/interview-question/what-is-asyncio-taskgroup-and-why-does-it-replace-gather) has several children that can fail at once), but they are a general tool: validation, batch jobs, retries, shutting down several resources. The language feature itself is covered in [except* and ExceptionGroup](/interview-question/what-is-except-and-exceptiongroup-in-python-3-11); this page is about building and taking groups apart by hand.

## 2. Raising A Group

📌 **Interview term: \`ExceptionGroup\`** — a built-in exception (Python 3.11, [PEP 654](https://peps.python.org/pep-0654/)) constructed as \`ExceptionGroup(message, exceptions)\`. \`eg.message\` is the string, \`eg.exceptions\` is a **tuple** of the contained exceptions, which may themselves be groups.

~~~python
def validate(form):
    errors = []
    if "@" not in form["email"]:
        errors.append(ValueError("email: missing @"))
    if len(form["password"]) < 8:
        errors.append(ValueError("password: too short"))
    if form["age"] is None:
        errors.append(KeyError("age"))
    if errors:
        raise ExceptionGroup("form is invalid", errors)
~~~

The pattern is always the same: **collect, then raise once** — and only if the list is non-empty, because the constructor refuses an empty one.

📌 **Interview term: Leaf exception** — an exception inside a group that is not itself a group. A group is a tree; the leaves are the real errors.

📌 **Interview term: \`BaseExceptionGroup\`** — the base class. \`ExceptionGroup\` is its subclass that is also an \`Exception\` and may only contain \`Exception\`s. Calling \`BaseExceptionGroup(...)\` with only \`Exception\`s actually returns an \`ExceptionGroup\`, so \`except Exception\` still catches it.

## 3. Catching With \`except*\`

~~~python
try:
    validate({"email": "bob", "password": "123", "age": None})
except* ValueError as eg:
    print("value problems:", [str(e) for e in eg.exceptions])
except* KeyError as eg:
    print("missing fields:", [e.args[0] for e in eg.exceptions])
~~~

Both clauses ran — that is the big difference from \`except\`, where at most one clause runs. Each \`except*\` receives an \`ExceptionGroup\` holding only its part (here two \`ValueError\`s, then one \`KeyError\`).

📌 **Interview term: \`except*\`** — a clause that matches *leaves* of a group by type. The group is split: the matching part is bound to the name (always a group), the rest goes on to the next \`except*\` clause, and whatever no clause handled is re-raised at the end of the \`try\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="An ExceptionGroup with two ValueErrors and one KeyError is split: the first except star clause gets the ValueError part, the second gets the KeyError part, and nothing is left to re-raise">
  <defs>
    <marker id="py27q5-a" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="30" width="260" height="70" rx="10"/>
  <text class="d-text" x="380" y="58" text-anchor="middle">form is invalid</text>
  <text class="d-sub" x="380" y="80" text-anchor="middle">ValueError x2, KeyError x1</text>
  <rect class="d-box" x="40" y="200" width="250" height="70" rx="10"/>
  <text class="d-text" x="165" y="228" text-anchor="middle">except* ValueError</text>
  <text class="d-sub" x="165" y="250" text-anchor="middle">group of 2</text>
  <rect class="d-box" x="470" y="200" width="250" height="70" rx="10"/>
  <text class="d-text" x="595" y="228" text-anchor="middle">except* KeyError</text>
  <text class="d-sub" x="595" y="250" text-anchor="middle">group of 1</text>
  <path class="d-edge" d="M 320 102 L 200 194" marker-end="url(#py27q5-a)"/>
  <path class="d-edge" d="M 440 102 L 560 194" marker-end="url(#py27q5-a)"/>
</svg>

After both clauses, nothing is left, so nothing is re-raised. If a \`TypeError\` had also been in the group, it would have been re-raised (as a group) after the \`try\`.

## 4. \`split()\` and \`subgroup()\` — The Same Sorting, In Code

\`except*\` is built on one method. You can call it yourself when you want to sort errors without raising them — to log one kind and re-raise another, say.

~~~python
eg = ExceptionGroup("batch", [
    ValueError("v1"),
    TypeError("t1"),
    ExceptionGroup("retry", [ValueError("v2"), OSError("o1")]),
])
match, rest = eg.split(ValueError)
~~~

📌 **Interview term: \`split(condition)\`** — returns a pair \`(match, rest)\`: two new groups with the **same tree shape and message**, the first holding the leaves that satisfy \`condition\`, the second holding the others. Either side is \`None\` if empty.

📌 **Interview term: \`subgroup(condition)\`** — just the \`match\` half of \`split\`.

\`condition\` can be:

- an exception **type** or a **tuple** of types (matched with \`isinstance\` on each leaf), or
- a **predicate** function. Careful: the predicate is called on the groups too. In a probe, a predicate that recorded its argument was called on the top group, then \`ValueError('v1')\`, then the nested \`retry\` group, then \`ValueError('v2')\`. If it returns \`True\` for a group, that whole group is kept.

Two identity rules came out of our runs: when *everything* matches, \`subgroup\` returns **the same object** (\`eg.subgroup(lambda e: True) is eg\` is \`True\`); when nothing matches, it returns \`None\`, never an empty group.

What \`split\` keeps: in a probe, the matched part had the original \`__notes__\` (\`['batch 7']\`), the original \`__cause__\` (\`OSError('root')\`), the **same** \`__traceback__\` object, and the **same** leaf objects (\`m.exceptions[0] is g.exceptions[0]\` was \`True\`). So splitting is cheap and loses no debugging information.

Run the walk-through:

~~~text
value problems: ['email: missing @', 'password: too short']
missing fields: ['age']
ExceptionGroup('batch', [ValueError('v1'), TypeError('t1'), ExceptionGroup('retry', [ValueError('v2'), OSError('o1')])])
batch 3
match: ExceptionGroup('batch', [ValueError('v1'), ExceptionGroup('retry', [ValueError('v2')])])
rest:  ExceptionGroup('batch', [TypeError('t1'), ExceptionGroup('retry', [OSError('o1')])])
ExceptionGroup('batch', [TypeError('t1'), ExceptionGroup('retry', [OSError('o1')])])
ExceptionGroup('batch', [ValueError('v1'), TypeError('t1'), ExceptionGroup('retry', [OSError('o1')])])
True
None
["ValueError('v1')", "TypeError('t1')", "ValueError('v2')", "OSError('o1')"]
~~~

The last line uses a small recursive \`leaves()\` helper to flatten the tree. Python 3.11 has no built-in "flatten"; [PEP 785](https://peps.python.org/pep-0785/) proposes one (\`leaf_exceptions()\`), but it is only a proposal, so do not rely on it.

## 5. Subclassing: Why \`derive()\` Exists

Say your group carries extra data — a form id. When \`split\` builds the two halves, which class should it use, and how would it know about \`form_id\`? It calls \`self.derive(excs)\`:

~~~python
class ValidationErrors(ExceptionGroup):
    def __new__(cls, message, errors, form_id):
        self = super().__new__(cls, message, errors)
        self.form_id = form_id
        return self

    def derive(self, excs):
        return ValidationErrors(self.message, excs, self.form_id)
~~~

📌 **Interview term: \`derive(excs)\`** — the hook \`split()\` and \`subgroup()\` use to build a new group of the same kind with different contents. The default returns a plain \`ExceptionGroup\` (or \`BaseExceptionGroup\`) with the same message; override it in subclasses that take extra arguments. In the run, the subclass with \`derive\` gave \`ValidationErrors 42\`; the one without gave plain \`ExceptionGroup\`. The metadata (\`__traceback__\`, \`__cause__\`, \`__context__\`, \`__notes__\`) is copied onto the new group by \`split\` itself, so \`derive\` only rebuilds the object.

Two details: exceptions do not accept keyword arguments in their constructor (our first try with \`form_id=42\` failed with \`TypeError: ValidationErrors() takes no keyword arguments\`), so pass extra fields positionally; and set them in \`__new__\` because \`BaseExceptionGroup\` does its construction there.

## 6. Example 2: The Rules Python Enforces

~~~text
ValueError: second argument (exceptions) must be a non-empty sequence
TypeError: second argument (exceptions) must be a sequence
TypeError: Cannot nest BaseExceptions in an ExceptionGroup
ExceptionGroup
BaseExceptionGroup
True False
ValidationErrors 42
ExceptionGroup
ExceptionGroup('', (ValueError('naked'),))
ExceptionGroup('', [RuntimeError('handler failed'), ExceptionGroup('job', [OSError('o')])])
ExceptionGroup('job', [ValueError('v')])
['row 17 of upload.csv']
TypeError: catching ExceptionGroup with except* is not allowed. Use except instead.
SyntaxError: cannot have both 'except' and 'except*' on the same 'try'
SyntaxError: 'break', 'continue' and 'return' cannot appear in an except* block
~~~

Line by line:

1. The constructor checks its arguments: an empty list is a \`ValueError\`, a non-sequence a \`TypeError\`, and a \`KeyboardInterrupt\` inside an \`ExceptionGroup\` is \`TypeError: Cannot nest BaseExceptions in an ExceptionGroup\`.
2. \`BaseExceptionGroup\` chooses the class: only \`Exception\`s → \`ExceptionGroup\`; any \`BaseException\` → \`BaseExceptionGroup\`. \`ExceptionGroup\` is an \`Exception\`; \`BaseExceptionGroup\` is not.
3. \`derive()\` decides the class of split results (section 5).
4. **Naked exceptions are wrapped**: \`except* ValueError\` caught a plain \`ValueError\` and bound \`ExceptionGroup('', (ValueError('naked'),))\` — empty message. Code in an \`except*\` block can always use \`eg.exceptions\`.
5. **Handler errors join the leftovers**: a \`RuntimeError\` raised inside the \`except*\` handler, plus the unhandled \`OSError\` part, came out together in a new group with an empty message; the \`RuntimeError\`'s \`__context__\` is the part it was handling.
6. \`add_note()\` ([PEP 678](https://peps.python.org/pep-0678/), 3.11) attaches extra lines that tracebacks print under the exception — handy for "which row of the file" without wrapping errors.
7. The compiler and runtime rules: \`except* ExceptionGroup\` is a runtime \`TypeError\` (you would be catching the container, not leaves), \`except\` and \`except*\` cannot share one \`try\`, and \`break\` / \`continue\` / \`return\` are not allowed inside an \`except*\` block.

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runner (Pyodide 0.25.1) with identical stdout; python3.12 and python3.13 printed the same. The \`split\` metadata checks and the predicate-call order in section 4 came from separate 3.11 probes.

Example 1 — raising a group, \`except*\`, \`split\` and \`subgroup\`:

~~~text
value problems: ['email: missing @', 'password: too short']
missing fields: ['age']
ExceptionGroup('batch', [ValueError('v1'), TypeError('t1'), ExceptionGroup('retry', [ValueError('v2'), OSError('o1')])])
batch 3
match: ExceptionGroup('batch', [ValueError('v1'), ExceptionGroup('retry', [ValueError('v2')])])
rest:  ExceptionGroup('batch', [TypeError('t1'), ExceptionGroup('retry', [OSError('o1')])])
ExceptionGroup('batch', [TypeError('t1'), ExceptionGroup('retry', [OSError('o1')])])
ExceptionGroup('batch', [ValueError('v1'), TypeError('t1'), ExceptionGroup('retry', [OSError('o1')])])
True
None
["ValueError('v1')", "TypeError('t1')", "ValueError('v2')", "OSError('o1')"]
~~~

Example 2 — constructor rules, \`derive()\`, naked exceptions and the \`except*\` rules:

~~~text
ValueError: second argument (exceptions) must be a non-empty sequence
TypeError: second argument (exceptions) must be a sequence
TypeError: Cannot nest BaseExceptions in an ExceptionGroup
ExceptionGroup
BaseExceptionGroup
True False
ValidationErrors 42
ExceptionGroup
ExceptionGroup('', (ValueError('naked'),))
ExceptionGroup('', [RuntimeError('handler failed'), ExceptionGroup('job', [OSError('o')])])
ExceptionGroup('job', [ValueError('v')])
['row 17 of upload.csv']
TypeError: catching ExceptionGroup with except* is not allowed. Use except instead.
SyntaxError: cannot have both 'except' and 'except*' on the same 'try'
SyntaxError: 'break', 'continue' and 'return' cannot appear in an except* block
~~~

## 8. When To Use Which

| You want to | Use |
| :--- | :--- |
| Report several independent failures at once | \`raise ExceptionGroup("msg", errors)\` |
| Handle each kind of failure in its own block | \`except* T1:\` ... \`except* T2:\` |
| Treat the whole group as one failure | plain \`except ExceptionGroup as eg:\` (or \`except Exception\`) |
| Sort errors without raising (log some, re-raise others) | \`match, rest = eg.split(T)\`; \`if rest: raise rest\` |
| Keep only one kind | \`eg.subgroup(T)\` |
| Carry extra fields on your own group class | subclass and override \`derive()\` |
| Add context to one leaf | \`exc.add_note("...")\` |

And when **not** to use one: if the errors are not independent — the second only happened *because of* the first — use [exception chaining](/interview-question/how-do-you-create-and-chain-custom-exceptions) (\`raise New from old\`) instead.

## 9. Edge Cases

- **\`str(eg)\`** is the message plus a count: on 3.11 \`str(g)\` printed \`g (2 sub-exceptions)\`, and \`traceback.format_exception_only\` gave \`ExceptionGroup: g (2 sub-exceptions)\` followed by the note line.
- **A group of one** is still a group; \`except ValueError\` will not catch it.
- **\`eg.exceptions\` is a tuple**, even if you passed a list, so a group is immutable once raised.
- **Before 3.11** there is no built-in \`ExceptionGroup\`; a backport package named \`exceptiongroup\` exists on PyPI. We did not test it for this page.

## Common Pitfalls

- **Raising a group with an empty list** "just in case". The constructor rejects it; check \`if errors:\` first.
- **Putting \`KeyboardInterrupt\` / \`SystemExit\` in an \`ExceptionGroup\`** — a \`TypeError\`. Use \`BaseExceptionGroup\`, and think twice: those usually should not be collected.
- **Catching with \`except ValueError\`** and wondering why the group slips through. Use \`except*\`, or catch the group and \`split\` it.
- **Subclassing without \`derive()\`** when the constructor needs extra arguments — split results silently become plain \`ExceptionGroup\`s and lose your fields.
- **Writing a predicate that assumes every argument is a leaf.** It is also called with groups; check \`isinstance(e, BaseExceptionGroup)\` if that matters.
- **Swallowing the \`rest\`.** After \`match, rest = eg.split(T)\`, re-raise \`rest\` if it is not \`None\`, or real errors vanish.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Raise:</strong> <span style="color:#f0e2c8;">Collect errors in a list and, if it is not empty, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">raise ExceptionGroup("message", errors)</code>. The list must hold exception instances, groups can nest, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup</code> only takes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Exception</code>s — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BaseExceptionGroup</code> takes anything and picks the class.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Catch:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except* ValueError</code> gets a group with only the matching leaves; several <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except*</code> clauses can each run; whatever is unhandled, plus anything raised in a handler, is re-raised as a new group. A naked exception is wrapped in a group with an empty message.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Split by hand:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eg.split(cond)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(match, rest)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eg.subgroup(cond)</code> just the match. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cond</code> is a type, a tuple or a predicate; the tree shape, message, traceback, cause, context and notes are all kept, and no match gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Subclasses:</strong> <span style="color:#f0e2c8;">Override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">derive(excs)</code> so split results are rebuilt as your class with its extra fields; without it they become plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup</code>s.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rules:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except*</code> cannot mix in one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except* ExceptionGroup</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">break</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">continue</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return</code> are not allowed in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except*</code> block.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except ExceptionGroup</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except* ValueError</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except ExceptionGroup</code> catches the whole group as one exception, once. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except* ValueError</code> splits the group and handles only the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code> leaves, leaving the rest for other <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except*</code> clauses or re-raising them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a predicate passed to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">split</code> receive?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every node of the tree, groups included — in our probe the top group first, then each leaf and nested group in order. Returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> for a group keeps it whole.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">split</code> call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">derive</code> instead of just calling <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type(self)(...)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A subclass may need extra constructor arguments that split cannot guess. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">derive</code> lets the subclass decide how to rebuild itself; split then copies the traceback, cause, context and notes onto the result.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you raise an ExceptionGroup outside of asyncio?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whenever several independent operations can fail and the caller should see all failures: form or config validation, a batch import, closing several resources, or running a test suite's cleanup steps.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If an <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except*</code> handler raises a new exception, what happens to the unhandled parts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are not lost. Python combines the new exception and the unhandled parts into a new group and raises that; in our run it was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ExceptionGroup('', [RuntimeError('handler failed'), ExceptionGroup('job', [OSError('o')])])</code>.</span>
</div>

</div>

## Quick Glossary

| Term | One-line meaning |
| :--- | :--- |
| \`ExceptionGroup\` | 3.11 exception holding a message and a tuple of exceptions; only \`Exception\`s |
| Leaf exception | An exception in a group tree that is not itself a group |
| \`BaseExceptionGroup\` | Base class; may hold any \`BaseException\` and picks \`ExceptionGroup\` when it can |
| \`except*\` | Clause that handles the matching leaves of a group; several can run |
| \`split(condition)\` | Returns \`(match, rest)\` groups with the same shape and metadata |
| \`subgroup(condition)\` | Returns only the matching part, or \`None\` |
| \`derive(excs)\` | Hook that rebuilds a group of the same kind for \`split\` / \`subgroup\` |

**Conclusion:** An \`ExceptionGroup\` is just an exception with a list inside, and the whole API follows from that: raise one when several independent things failed, catch its parts with \`except*\`, and sort it yourself with \`split()\` and \`subgroup()\`, which keep the tree shape and all the debugging metadata. Subclass with \`derive()\` when you need extra fields, never put \`BaseException\`s in a plain \`ExceptionGroup\`, and re-raise whatever you did not handle. Whether the errors came from a \`TaskGroup\` or from your own validation loop, the handling code is the same — see [how TaskGroup produces these groups](/interview-question/how-does-taskgroup-handle-cancellation-and-exceptiongroup).`,
    examples: [
      {
        label: `Raise a group, catch with except*, split and subgroup it`,
        code: `# Validate a sign-up form and report EVERY problem at once.
def validate(form):
    errors = []
    if "@" not in form["email"]:
        errors.append(ValueError("email: missing @"))
    if len(form["password"]) < 8:
        errors.append(ValueError("password: too short"))
    if form["age"] is None:
        errors.append(KeyError("age"))
    if errors:
        raise ExceptionGroup("form is invalid", errors)


try:
    validate({"email": "bob", "password": "123", "age": None})
except* ValueError as eg:
    print("value problems:", [str(e) for e in eg.exceptions])
except* KeyError as eg:
    print("missing fields:", [e.args[0] for e in eg.exceptions])

# Build a nested group by hand to try split() and subgroup() on.
eg = ExceptionGroup("batch", [
    ValueError("v1"),
    TypeError("t1"),
    ExceptionGroup("retry", [ValueError("v2"), OSError("o1")]),
])
print(repr(eg))
print(eg.message, len(eg.exceptions))  # batch 3

# split(type) -> (matching part, the rest); nesting is preserved.
match, rest = eg.split(ValueError)
print("match:", repr(match))
print("rest: ", repr(rest))

# subgroup() keeps only the matching part.
print(repr(eg.subgroup((TypeError, OSError))))

# A predicate gets every leaf AND every nested group.
print(repr(eg.subgroup(lambda e: "1" in str(e))))

# A full match returns the very same object; no match gives None.
print(eg.subgroup(lambda e: True) is eg)  # True
print(eg.subgroup(ZeroDivisionError))  # None


# Walk every leaf exception (there is no built-in flatten in 3.11).
def leaves(group):
    for e in group.exceptions:
        if isinstance(e, BaseExceptionGroup):
            yield from leaves(e)
        else:
            yield e


print([repr(e) for e in leaves(eg)])`,
      },
      {
        label: `Constructor rules, derive(), naked exceptions and except* rules`,
        code: `# 1. The constructor checks its arguments.
for args in (("empty", []), ("not a list", ValueError("x")), ("base", [KeyboardInterrupt()])):
    try:
        ExceptionGroup(*args)
    except (TypeError, ValueError) as e:
        print(type(e).__name__ + ":", e)

# BaseExceptionGroup picks the right class for you.
print(type(BaseExceptionGroup("m", [ValueError()])).__name__)
print(type(BaseExceptionGroup("m", [KeyboardInterrupt()])).__name__)
print(issubclass(ExceptionGroup, Exception), issubclass(BaseExceptionGroup, Exception))


# 2. A subclass must define derive() or split() falls back to the base class.
class ValidationErrors(ExceptionGroup):
    def __new__(cls, message, errors, form_id):
        self = super().__new__(cls, message, errors)
        self.form_id = form_id
        return self

    def derive(self, excs):
        return ValidationErrors(self.message, excs, self.form_id)


class NoDerive(ExceptionGroup):
    pass


errs = [ValueError("a"), KeyError("b")]
part, _ = ValidationErrors("bad form", errs, 42).split(ValueError)
print(type(part).__name__, part.form_id)
part, _ = NoDerive("plain", errs).split(ValueError)
print(type(part).__name__)

# 3. except* wraps a naked exception in a group.
try:
    raise ValueError("naked")
except* ValueError as eg:
    print(repr(eg))

# 4. Unhandled parts are re-raised as a group; errors raised inside
#    a handler are added alongside them.
try:
    try:
        raise ExceptionGroup("job", [ValueError("v"), OSError("o")])
    except* ValueError:
        raise RuntimeError("handler failed")
except ExceptionGroup as outer:
    print(repr(outer))
    print(repr(outer.exceptions[0].__context__))

# 5. Notes travel with the exception (PEP 678).
e = ValueError("bad")
e.add_note("row 17 of upload.csv")
print(e.__notes__)

# 6. Rules the compiler enforces.
for src in (
    "try:\\n    raise ValueError\\nexcept* ExceptionGroup:\\n    pass",
    "try:\\n    pass\\nexcept ValueError:\\n    pass\\nexcept* KeyError:\\n    pass",
    "for i in x:\\n    try:\\n        pass\\n    except* KeyError:\\n        break",
):
    try:
        exec(compile(src, "<demo>", "exec"), {"x": [1]})
    except (SyntaxError, TypeError) as err:
        print(type(err).__name__ + ":", err.msg if isinstance(err, SyntaxError) else err)`,
      },
    ],
  },
];

export default augments;
