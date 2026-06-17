import type { PythonAugment } from "./python-augments.types";

/**
 * Python augments — batch 1 (the 20 questions in curated/python.json).
 * Each: an expanded markdown answer (double-quoted, "\n"-joined so inline-code
 * backticks stay literal) closing with "**Interview tip:**", plus one or more
 * RUNNABLE Python examples (tech 'python' -> /play?template=python via Piston).
 * Example code is backtick-free and prints output so the console shows results.
 */
const augments: PythonAugment[] = [
  {
    title: "What is the difference between a list and a tuple?",
    answer:
      "Both are ordered sequences, but the defining difference is **mutability**.\n\n" +
      "| | `list` | `tuple` |\n" +
      "|---|---|---|\n" +
      "| Mutable | yes — append/insert/remove/reassign | no — fixed once created |\n" +
      "| Syntax | `[1, 2, 3]` | `(1, 2, 3)` |\n" +
      "| Hashable | no (can't be a dict key / set member) | yes, if all items are hashable |\n" +
      "| Memory & speed | larger, slight overhead for resizing | smaller, marginally faster to build/iterate |\n" +
      "| Intent | a homogeneous collection you'll change | a fixed, often heterogeneous record |\n\n" +
      "Because a tuple is immutable and hashable, it can be a **dict key** or **set element** and is safe to share across threads or use as a constant. Lists can't do any of that. Idiomatically, reach for a tuple when the number and meaning of the items is fixed (a coordinate `(x, y)`, a DB row) and a list when you'll grow or mutate the collection.\n\n" +
      "Note `(1)` is just the int `1` — a one-element tuple needs the trailing comma: `(1,)`.\n\n" +
      "**Interview tip:** the headline is immutability, but score points by adding the *consequences*: hashability (dict keys / set members), the one-element `(1,)` gotcha, and that immutability is shallow — a tuple **can** hold a mutable list, so `t = ([1], 2); t[0].append(3)` works.",
    examples: [
      {
        label: "Mutability, hashability & the shallow-immutability gotcha",
        tech: "python",
        code:
          "nums = [1, 2, 3]\n" +
          "nums.append(4)          # lists are mutable\n" +
          "print(\"list:\", nums)\n\n" +
          "point = (10, 20)        # tuples are immutable\n" +
          "try:\n" +
          "    point[0] = 99\n" +
          "except TypeError as e:\n" +
          "    print(\"tuple error:\", e)\n\n" +
          "# Only the hashable tuple can be a dict key\n" +
          "locations = {(10, 20): \"home\", (0, 0): \"origin\"}\n" +
          "print(\"lookup:\", locations[(10, 20)])\n\n" +
          "# Immutability is shallow: a tuple can hold a mutable list\n" +
          "t = ([1], 2)\n" +
          "t[0].append(3)\n" +
          "print(\"nested mutation:\", t)\n\n" +
          "# One-element tuple needs the trailing comma\n" +
          "print(type((1)), type((1,)))",
      },
    ],
  },
  {
    title: "What are mutable and immutable types in Python?",
    answer:
      "Every Python object is either **mutable** (its state can change in place) or **immutable** (any 'change' actually produces a new object). The distinction is about identity over time, not about whether a *name* can be reassigned.\n\n" +
      "- **Immutable:** `int`, `float`, `bool`, `complex`, `str`, `bytes`, `tuple`, `frozenset`, `range`. Operations return new objects; the original is untouched.\n" +
      "- **Mutable:** `list`, `dict`, `set`, `bytearray`, and most user-defined class instances.\n\n" +
      "Three practical consequences interviewers probe:\n\n" +
      "1. **Hashability** — immutable built-ins are hashable, so only they can be dict keys / set members.\n" +
      "2. **Function arguments** — Python passes references. Mutating a mutable argument is visible to the caller; rebinding a name inside the function is not.\n" +
      "3. **Mutable default arguments** — a classic bug (its own question), caused by a mutable object being created once and shared.\n\n" +
      "`x += 1` on an int rebinds `x` to a brand-new int (the old object is unchanged), whereas `lst += [1]` mutates the list in place — same operator, different semantics because of mutability.\n\n" +
      "**Interview tip:** stress that assignment binds a *name* to an object; it never copies. The interesting behavior — aliasing, in-place vs new object, the `is` identity changing — all falls out of 'mutable changes in place, immutable returns a new object.'",
    examples: [
      {
        label: "Identity proves in-place mutation vs rebinding",
        tech: "python",
        code:
          "# Immutable: += rebinds to a NEW object (id changes)\n" +
          "n = 10\n" +
          "before = id(n)\n" +
          "n += 1\n" +
          "print(\"int id changed:\", before != id(n))\n\n" +
          "# Mutable: += mutates IN PLACE (id stays the same)\n" +
          "lst = [1, 2]\n" +
          "before = id(lst)\n" +
          "lst += [3]\n" +
          "print(\"list id changed:\", before != id(lst), lst)\n\n" +
          "def add_item(seq):\n" +
          "    seq.append(\"mutated\")   # visible to caller\n" +
          "    seq = [\"rebound\"]        # NOT visible — just a local name\n\n" +
          "data = [1]\n" +
          "add_item(data)\n" +
          "print(\"caller sees:\", data)",
      },
    ],
  },
  {
    title: "What are decorators in Python?",
    answer:
      "A **decorator** is a callable that takes a function (or class) and returns a replacement, letting you add behavior *around* the original without editing it. `@decorator` above a `def` is pure syntactic sugar for `func = decorator(func)`.\n\n" +
      "The standard shape uses a nested wrapper plus `functools.wraps` to preserve the original's `__name__`/`__doc__`:\n\n" +
      "- **No arguments:** `decorator(func)` returns `wrapper`.\n" +
      "- **With arguments:** you add an outer layer — `decorator(arg)` returns the real decorator, which returns `wrapper` (a 'decorator factory').\n\n" +
      "Common real uses: logging/timing, caching (`@functools.lru_cache`), access control/auth checks, retries, registering routes (Flask's `@app.route`), and turning methods into properties (`@property`). Decorators stack bottom-up: the one nearest the `def` wraps first.\n\n" +
      "**Interview tip:** be ready to *write* a timing or logging decorator live, and mention `functools.wraps` — without it the wrapped function loses its name, docstring and signature, which breaks introspection and other decorators.",
    examples: [
      {
        label: "A timing decorator (with functools.wraps)",
        tech: "python",
        code:
          "import functools\n" +
          "import time\n\n" +
          "def timed(func):\n" +
          "    @functools.wraps(func)        # preserve name/doc of func\n" +
          "    def wrapper(*args, **kwargs):\n" +
          "        start = time.perf_counter()\n" +
          "        result = func(*args, **kwargs)\n" +
          "        elapsed = (time.perf_counter() - start) * 1000\n" +
          "        print(f\"{func.__name__} took {elapsed:.2f} ms\")\n" +
          "        return result\n" +
          "    return wrapper\n\n" +
          "@timed\n" +
          "def slow_square(n):\n" +
          "    \"\"\"Square a number after a short pause.\"\"\"\n" +
          "    time.sleep(0.05)\n" +
          "    return n * n\n\n" +
          "print(\"result:\", slow_square(9))\n" +
          "print(\"name preserved:\", slow_square.__name__)",
      },
    ],
  },
  {
    title: "What are generators and why use them?",
    answer:
      "A **generator** produces values **lazily**, one at a time, instead of building a whole collection up front. You create one with a function that uses `yield`, or with a generator expression `(x for x in ...)`. Calling the function doesn't run its body — it returns a generator object; each `next()` runs to the next `yield`, suspends, and **remembers all local state** for the following call.\n\n" +
      "Why use them:\n\n" +
      "- **Memory** — a generator holds one item at a time, so you can process huge or even **infinite** streams (log lines, a number sequence) that would never fit in a list.\n" +
      "- **Composability** — generators chain into lazy pipelines (`(parse(l) for l in lines)`), doing work only as items are pulled.\n" +
      "- **Time-to-first-result** — you get item #1 without computing item #1,000,000.\n\n" +
      "The trade-offs: single-pass (you can't re-iterate or index it), and no `len()`. `yield from` delegates to a sub-iterator.\n\n" +
      "**Interview tip:** the killer line is 'constant memory regardless of input size.' Show a generator producing an infinite sequence and being safely truncated with `itertools.islice` — that proves laziness in a way a list comprehension never could.",
    examples: [
      {
        label: "Lazy infinite sequence, safely truncated",
        tech: "python",
        code:
          "import itertools\n\n" +
          "def fibonacci():\n" +
          "    a, b = 0, 1\n" +
          "    while True:          # infinite — but lazy, so it's fine\n" +
          "        yield a\n" +
          "        a, b = b, a + b\n\n" +
          "# Pull only the first 10 values; the rest are never computed\n" +
          "first_ten = list(itertools.islice(fibonacci(), 10))\n" +
          "print(\"fib:\", first_ten)\n\n" +
          "# Generator expression: sum of squares with no intermediate list\n" +
          "total = sum(x * x for x in range(1, 1001))\n" +
          "print(\"sum of squares 1..1000:\", total)\n\n" +
          "# State is remembered between next() calls\n" +
          "g = fibonacci()\n" +
          "print(\"manual next():\", next(g), next(g), next(g), next(g))",
      },
    ],
  },
  {
    title: "What is the Global Interpreter Lock (GIL)?",
    answer:
      "The **GIL** is a mutex in **CPython** (the reference interpreter) that lets **only one thread execute Python bytecode at a time**. It exists because CPython's memory management (reference counting) isn't thread-safe; the GIL makes object access safe without per-object locks, and keeps single-threaded code fast.\n\n" +
      "Consequences:\n\n" +
      "- **CPU-bound** multithreading gets **no speedup** — threads take turns, so two threads finish about as fast as one (plus switching overhead). Use **`multiprocessing`** (separate processes, each with its own interpreter and GIL) for real parallelism.\n" +
      "- **I/O-bound** multithreading **does** help: the GIL is released during blocking I/O (sockets, disk, `time.sleep`), so other threads run while one waits.\n" +
      "- C extensions (NumPy, etc.) can release the GIL around heavy native work, regaining parallelism.\n\n" +
      "The GIL is a CPython implementation detail — Jython/IronPython don't have one, and Python 3.13 ships an experimental **free-threaded (no-GIL)** build.\n\n" +
      "**Interview tip:** the crisp decision rule is *CPU-bound → multiprocessing, I/O-bound → threads or asyncio*. Bonus credit for naming it a CPython detail and mentioning the 3.13 free-threaded experiment.",
    examples: [
      {
        label: "CPU-bound: threads don't beat sequential (the GIL)",
        tech: "python",
        code:
          "import time\n" +
          "from threading import Thread\n\n" +
          "def crunch(n):\n" +
          "    total = 0\n" +
          "    for i in range(n):\n" +
          "        total += i * i\n" +
          "    return total\n\n" +
          "N = 5_000_000\n\n" +
          "start = time.perf_counter()\n" +
          "crunch(N); crunch(N)\n" +
          "print(f\"sequential : {time.perf_counter() - start:.3f}s\")\n\n" +
          "start = time.perf_counter()\n" +
          "threads = [Thread(target=crunch, args=(N,)) for _ in range(2)]\n" +
          "for t in threads: t.start()\n" +
          "for t in threads: t.join()\n" +
          "print(f\"2 threads  : {time.perf_counter() - start:.3f}s  (no speedup — GIL)\")",
      },
    ],
  },
  {
    title: "What are list/dict/set comprehensions?",
    answer:
      "Comprehensions build a collection from an iterable in a single, declarative expression `[expr for item in iterable if condition]`:\n\n" +
      "- **List:** `[x*x for x in nums if x > 0]`\n" +
      "- **Set:** `{x % 3 for x in nums}` (deduplicated)\n" +
      "- **Dict:** `{k: v for k, v in pairs}`\n" +
      "- **Generator expression:** `(x*x for x in nums)` — same syntax with `()`, but **lazy** (no list built).\n\n" +
      "They read as 'what I want' rather than 'how to build it', and are usually **faster than an equivalent `for`+`append`** loop because the iteration runs in C and there's no repeated method lookup. You can nest loops (`[... for row in grid for x in row]`, read left-to-right) and add conditional filters or expressions.\n\n" +
      "Keep them readable: if you need multiple conditions, nesting three levels, or side effects, a plain loop is clearer. Comprehensions are for *building a value*, not for running side effects.\n\n" +
      "**Interview tip:** know which bracket gives which type, that `{}`-with-pairs is a dict but `{}`-with-values is a set (and `{}` alone is an empty dict, not a set), and that swapping `[]` for `()` turns an eager list into a lazy generator — the memory win for big data.",
    examples: [
      {
        label: "All four forms side by side",
        tech: "python",
        code:
          "nums = [1, -2, 3, -4, 5, 3]\n\n" +
          "squares = [x * x for x in nums if x > 0]       # list\n" +
          "print(\"list :\", squares)\n\n" +
          "unique_mod = {x % 3 for x in nums}              # set (dedup)\n" +
          "print(\"set  :\", unique_mod)\n\n" +
          "index = {word: i for i, word in enumerate([\"a\", \"b\", \"c\"])}  # dict\n" +
          "print(\"dict :\", index)\n\n" +
          "gen = (x * x for x in nums if x > 0)            # lazy generator\n" +
          "print(\"gen  :\", gen, \"-> sum\", sum(gen))\n\n" +
          "# Nested: flatten a 2D grid (loops read left-to-right)\n" +
          "grid = [[1, 2], [3, 4], [5, 6]]\n" +
          "flat = [x for row in grid for x in row]\n" +
          "print(\"flat :\", flat)",
      },
    ],
  },
  {
    title: "What do *args and **kwargs mean?",
    answer:
      "They let a function accept a **variable number** of arguments:\n\n" +
      "- **`*args`** collects extra **positional** arguments into a **tuple**.\n" +
      "- **`**kwargs`** collects extra **keyword** arguments into a **dict**.\n\n" +
      "The names are convention only — the `*` and `**` do the work. In a definition the full parameter order is: positional, `*args`, keyword-only params, `**kwargs`. A bare `*` forces the parameters after it to be **keyword-only**.\n\n" +
      "The same operators **unpack** at the *call* site: `f(*some_list, **some_dict)` spreads a sequence into positional args and a dict into keyword args. This is how you forward arbitrary arguments through wrappers and decorators (`func(*args, **kwargs)`), which is why every decorator wrapper you write uses them.\n\n" +
      "**Interview tip:** distinguish the two contexts clearly — in a `def`, `*`/`**` *collect* (pack); at a *call*, they *spread* (unpack). The pass-through `(*args, **kwargs)` in a decorator wrapper is the canonical example.",
    examples: [
      {
        label: "Packing in the definition, unpacking at the call",
        tech: "python",
        code:
          "def report(label, *args, **kwargs):\n" +
          "    print(f\"{label}: positional={args} keyword={kwargs}\")\n\n" +
          "report(\"direct\", 1, 2, 3, mode=\"fast\", retries=2)\n\n" +
          "# Unpack a list and a dict INTO the call\n" +
          "extra_pos = [10, 20]\n" +
          "extra_kw = {\"mode\": \"slow\", \"debug\": True}\n" +
          "report(\"spread\", *extra_pos, **extra_kw)\n\n" +
          "# The canonical pass-through wrapper\n" +
          "def logged(fn):\n" +
          "    def wrapper(*args, **kwargs):\n" +
          "        print(\"calling\", fn.__name__, \"with\", args, kwargs)\n" +
          "        return fn(*args, **kwargs)\n" +
          "    return wrapper\n\n" +
          "@logged\n" +
          "def add(a, b): return a + b\n" +
          "print(\"sum:\", add(3, 4))",
      },
    ],
  },
  {
    title: "What is the difference between '==' and 'is'?",
    answer:
      "- **`==`** tests **value equality** — 'do these represent the same value?' It calls the object's `__eq__`, so you can customize it.\n" +
      "- **`is`** tests **identity** — 'are these the exact same object in memory?' It compares `id()` and can't be overridden.\n\n" +
      "Two distinct lists with equal contents are `==` but not `is`. The rule of thumb: use **`==`** for value comparisons, and reserve **`is`** for singletons — above all `x is None` (also `is True`/`is False`, and sentinel objects).\n\n" +
      "The classic trap is **interning/caching**: CPython caches small integers (−5..256) and many short strings, so `a = 256; b = 256; a is b` is `True`, but at 257 it's `False`. That's an implementation detail you must never rely on — comparing values with `is` is a bug waiting to happen.\n\n" +
      "**Interview tip:** say 'value vs identity', then give the rule: `==` for values, `is` only for `None`/singletons. Mention small-int interning as *why* `is` sometimes lies for numbers — and why you still shouldn't use it for them.",
    examples: [
      {
        label: "Value vs identity, plus the small-int interning trap",
        tech: "python",
        code:
          "a = [1, 2, 3]\n" +
          "b = [1, 2, 3]\n" +
          "print(\"a == b:\", a == b)     # same value\n" +
          "print(\"a is b:\", a is b)     # different objects\n\n" +
          "c = a\n" +
          "print(\"a is c:\", a is c)     # same object (alias)\n\n" +
          "# Interning: small ints are cached, large ones are not\n" +
          "x = 256; y = 256\n" +
          "print(\"256 is 256:\", x is y)\n" +
          "x = 257; y = 257\n" +
          "print(\"257 is 257:\", x is y)  # don't rely on this!\n\n" +
          "# The one correct use of 'is'\n" +
          "value = None\n" +
          "print(\"value is None:\", value is None)",
      },
    ],
  },
  {
    title: "Why is using a mutable default argument dangerous?",
    answer:
      "Default argument values are evaluated **once**, when the `def` statement runs — **not** on each call. So a default like `def append_to(item, target=[])` creates **one** list that is **shared by every call** that doesn't pass `target`. Each call mutates the same object, so values 'leak' between unrelated calls.\n\n" +
      "The fix is the **`None` sentinel**: default to `None` and create a fresh object inside the body.\n\n" +
      "```python\n" +
      "def append_to(item, target=None):\n" +
      "    if target is None:\n" +
      "        target = []\n" +
      "    target.append(item)\n" +
      "    return target\n" +
      "```\n\n" +
      "The same trap applies to any mutable default — `{}`, `set()`, or an object built from another mutable. (Immutable defaults like `0`, `\"\"`, `None`, or a tuple are fine, since they can't be mutated.)\n\n" +
      "**Interview tip:** the key phrase is 'defaults are evaluated once at definition time, not per call.' Always reach for the `None` sentinel. If you genuinely *want* shared state across calls, a default list is a confusing way to get it — be explicit instead.",
    examples: [
      {
        label: "The bug, then the None-sentinel fix",
        tech: "python",
        code:
          "# BUG: the default list is created once and shared\n" +
          "def append_bad(item, target=[]):\n" +
          "    target.append(item)\n" +
          "    return target\n\n" +
          "print(\"call 1:\", append_bad(1))   # [1]\n" +
          "print(\"call 2:\", append_bad(2))   # [1, 2]  <- leaked!\n" +
          "print(\"call 3:\", append_bad(3))   # [1, 2, 3]\n\n" +
          "# FIX: default to None, build a fresh list inside\n" +
          "def append_good(item, target=None):\n" +
          "    if target is None:\n" +
          "        target = []\n" +
          "    target.append(item)\n" +
          "    return target\n\n" +
          "print(\"fixed 1:\", append_good(1))  # [1]\n" +
          "print(\"fixed 2:\", append_good(2))  # [2]  <- independent",
      },
    ],
  },
  {
    title: "What is the difference between shallow and deep copy?",
    answer:
      "Assignment (`b = a`) copies **nothing** — both names point at the same object. To get an independent object you copy, and there are two depths:\n\n" +
      "- **Shallow copy** (`copy.copy(x)`, `list(x)`, `x[:]`, `dict(x)`): a new outer container, but its elements are the **same references** as the original. Mutating a *nested* object is visible through both copies; replacing a top-level element is not.\n" +
      "- **Deep copy** (`copy.deepcopy(x)`): recursively copies the container **and everything inside**, producing a fully independent object graph (and correctly handling shared/cyclic references).\n\n" +
      "So shallow copy is enough for a flat structure (a list of ints), but for nested structures (a list of lists, a dict of dicts) you need `deepcopy` to avoid surprise aliasing. Deep copy is slower and uses more memory, so don't reach for it reflexively.\n\n" +
      "**Interview tip:** the crisp statement is 'shallow copies one level; deep copies recursively.' Nail it with the list-of-lists example: after a shallow copy, `b[0].append(...)` mutates `a[0]` too — that surprise is exactly what the question is testing.",
    examples: [
      {
        label: "Shallow shares nested objects; deep doesn't",
        tech: "python",
        code:
          "import copy\n\n" +
          "original = [[1, 2], [3, 4]]\n\n" +
          "shallow = copy.copy(original)     # or original[:] / list(original)\n" +
          "deep = copy.deepcopy(original)\n\n" +
          "# Mutate a NESTED list in the original\n" +
          "original[0].append(99)\n\n" +
          "print(\"original:\", original)\n" +
          "print(\"shallow :\", shallow, \"<- nested change leaked in\")\n" +
          "print(\"deep    :\", deep, \"<- fully independent\")\n\n" +
          "# Replacing a TOP-LEVEL element does NOT affect the shallow copy\n" +
          "original[1] = \"new\"\n" +
          "print(\"after top-level swap, shallow:\", shallow)",
      },
    ],
  },
  {
    title: "What is a context manager?",
    answer:
      "A **context manager** is an object that defines setup and teardown for a block, driven by the **`with`** statement. It implements `__enter__` (runs on entry, its return value is bound by `as`) and `__exit__` (runs on exit — **always**, even if the block raises or returns). That guarantee is the point: resources get released deterministically without a manual `try/finally`.\n\n" +
      "The canonical example is `with open(path) as f:` — the file is closed automatically. Others: locks (`with lock:`), DB transactions/connections, `decimal.localcontext`, temporarily redirecting stdout, timers.\n\n" +
      "Two ways to write your own:\n\n" +
      "1. A **class** with `__enter__`/`__exit__` (return `True` from `__exit__` to swallow an exception).\n" +
      "2. The **`@contextlib.contextmanager`** decorator over a generator: code before `yield` is setup, code after (ideally in a `finally`) is teardown — much less boilerplate.\n\n" +
      "`contextlib.ExitStack` manages a dynamic number of context managers.\n\n" +
      "**Interview tip:** emphasize that `__exit__` runs *even on exceptions*, which is why `with` beats remembering to call `.close()`. Be ready to write a tiny `@contextmanager` timer — it's the most common live-coding ask here.",
    examples: [
      {
        label: "A @contextmanager timer (setup / yield / teardown)",
        tech: "python",
        code:
          "import time\n" +
          "from contextlib import contextmanager\n\n" +
          "@contextmanager\n" +
          "def timer(label):\n" +
          "    start = time.perf_counter()\n" +
          "    print(f\"[{label}] start\")\n" +
          "    try:\n" +
          "        yield                          # the with-block runs here\n" +
          "    finally:\n" +
          "        elapsed = (time.perf_counter() - start) * 1000\n" +
          "        print(f\"[{label}] done in {elapsed:.1f} ms\")  # always runs\n\n" +
          "with timer(\"work\"):\n" +
          "    total = sum(i for i in range(1_000_00))\n" +
          "    print(\"computed:\", total)\n\n" +
          "# Teardown still runs when the block raises\n" +
          "try:\n" +
          "    with timer(\"boom\"):\n" +
          "        raise ValueError(\"kaboom\")\n" +
          "except ValueError as e:\n" +
          "    print(\"caught:\", e)",
      },
    ],
  },
  {
    title: "How does async/await work in Python?",
    answer:
      "`async def` defines a **coroutine**. Calling it doesn't run it — it returns a coroutine object that must be driven by an **event loop** (`asyncio.run(main())`). Inside, **`await`** hands control back to the loop while waiting on something I/O-bound; the loop then runs *other* ready coroutines, and resumes this one when its awaited result is ready. All of this happens on a **single thread** — it's cooperative concurrency, not parallelism.\n\n" +
      "This shines for **I/O-bound, high-concurrency** work: thousands of network/DB calls overlap their waiting instead of each blocking a thread. You launch concurrent work with `asyncio.gather(...)` or `asyncio.create_task(...)`.\n\n" +
      "The big caveats:\n\n" +
      "- A **blocking or CPU-bound** call (a plain `time.sleep`, a tight loop, `requests.get`) **stalls the entire loop** — there's only one thread. Use `await asyncio.sleep`, async libraries, or offload CPU work to a process pool.\n" +
      "- It's concurrency, not parallelism — for CPU-bound work you still need multiprocessing.\n\n" +
      "**Interview tip:** the line that lands is 'one thread, cooperative — `await` yields control during I/O so other coroutines run.' Then name the footgun: a synchronous blocking call inside a coroutine freezes everything.",
    examples: [
      {
        label: "Concurrent awaits overlap their waiting",
        tech: "python",
        code:
          "import asyncio\n" +
          "import time\n\n" +
          "async def fetch(name, seconds):\n" +
          "    print(f\"  start {name}\")\n" +
          "    await asyncio.sleep(seconds)   # non-blocking wait\n" +
          "    print(f\"  done  {name}\")\n" +
          "    return name\n\n" +
          "async def main():\n" +
          "    start = time.perf_counter()\n" +
          "    # gather runs all three concurrently on ONE thread\n" +
          "    results = await asyncio.gather(\n" +
          "        fetch(\"A\", 1.0),\n" +
          "        fetch(\"B\", 1.0),\n" +
          "        fetch(\"C\", 1.0),\n" +
          "    )\n" +
          "    print(\"results:\", results)\n" +
          "    print(f\"elapsed ~{time.perf_counter() - start:.1f}s (not 3s)\")\n\n" +
          "asyncio.run(main())",
      },
    ],
  },
  {
    title: "What are dunder (magic) methods?",
    answer:
      "**Dunder** ('double underscore') methods like `__init__`, `__repr__`, `__len__`, `__eq__`, `__iter__`, `__add__` are hooks Python's syntax and built-ins call on your behalf. By implementing them, your objects integrate naturally with the language — this is how Python does **operator overloading** and the **data model / protocols**.\n\n" +
      "Some you'll define most:\n\n" +
      "- `__init__` — initialize a new instance; `__new__` actually creates it.\n" +
      "- `__repr__` / `__str__` — debug vs user-facing string. Always provide `__repr__`.\n" +
      "- `__eq__` (+ `__hash__`) — value equality and hashability.\n" +
      "- `__len__`, `__getitem__`, `__iter__`, `__contains__` — make an object behave like a container/sequence.\n" +
      "- `__add__`, `__lt__`, `__call__`, `__enter__`/`__exit__` — operators, callables, context managers.\n\n" +
      "`len(x)` calls `x.__len__()`, `x + y` calls `x.__add__(y)`, `for i in x` calls `x.__iter__()`. You rarely call dunders directly — you implement them and let the syntax dispatch.\n\n" +
      "**Interview tip:** frame them as 'the protocol that hooks objects into Python's syntax', and give one concrete pairing — e.g. `__repr__` for debugging or `__eq__`+`__hash__` so an object can live in a set. Mention you implement them, the interpreter calls them.",
    examples: [
      {
        label: "A Vector that supports +, ==, len() and repr",
        tech: "python",
        code:
          "class Vector:\n" +
          "    def __init__(self, x, y):\n" +
          "        self.x, self.y = x, y\n\n" +
          "    def __repr__(self):\n" +
          "        return f\"Vector({self.x}, {self.y})\"\n\n" +
          "    def __add__(self, other):\n" +
          "        return Vector(self.x + other.x, self.y + other.y)\n\n" +
          "    def __eq__(self, other):\n" +
          "        return (self.x, self.y) == (other.x, other.y)\n\n" +
          "    def __len__(self):\n" +
          "        return 2\n\n" +
          "a = Vector(1, 2)\n" +
          "b = Vector(3, 4)\n" +
          "print(\"a + b   :\", a + b)            # __add__\n" +
          "print(\"repr    :\", repr(a))          # __repr__\n" +
          "print(\"equal   :\", a == Vector(1, 2)) # __eq__\n" +
          "print(\"len     :\", len(a))           # __len__",
      },
    ],
  },
  {
    title: "What are lambda functions and map/filter/reduce?",
    answer:
      "A **lambda** is a small **anonymous** function written inline: `lambda x: x * 2`. It's limited to a single expression (no statements, no annotations) and is handy as a throwaway callback — most often a `key=` for sorting/min/max.\n\n" +
      "The functional trio operates over iterables:\n\n" +
      "- **`map(fn, it)`** — apply `fn` to each item (lazy iterator).\n" +
      "- **`filter(pred, it)`** — keep items where `pred` is truthy (lazy).\n" +
      "- **`functools.reduce(fn, it, init)`** — fold the sequence into a single value by repeatedly combining.\n\n" +
      "`map`/`filter` return lazy iterators, so wrap in `list()` to materialize. In modern Python a **comprehension is usually preferred** to `map`/`filter` for readability (`[f(x) for x in xs if p(x)]`), and `reduce` is often clearer as an explicit loop or a built-in like `sum`/`math.prod`. Lambdas still earn their place as short inline keys.\n\n" +
      "**Interview tip:** know they're lazy (need `list()`), and that the Pythonic default is a comprehension over `map`/`filter`. The strongest practical use of a lambda is `sorted(data, key=lambda r: r['age'])` — show that.",
    examples: [
      {
        label: "lambda key + map/filter/reduce vs comprehension",
        tech: "python",
        code:
          "from functools import reduce\n\n" +
          "people = [(\"Ann\", 30), (\"Bo\", 25), (\"Cy\", 35)]\n\n" +
          "# lambda as a sort key — its best everyday use\n" +
          "print(\"by age:\", sorted(people, key=lambda p: p[1]))\n\n" +
          "nums = [1, 2, 3, 4, 5, 6]\n" +
          "doubled = list(map(lambda x: x * 2, nums))\n" +
          "evens = list(filter(lambda x: x % 2 == 0, nums))\n" +
          "product = reduce(lambda acc, x: acc * x, nums, 1)\n" +
          "print(\"map   :\", doubled)\n" +
          "print(\"filter:\", evens)\n" +
          "print(\"reduce:\", product)\n\n" +
          "# The Pythonic equivalent of map+filter is a comprehension\n" +
          "print(\"comprehension:\", [x * 2 for x in nums if x % 2 == 0])",
      },
    ],
  },
  {
    title: "How does exception handling work in Python?",
    answer:
      "Python uses `try`/`except`/`else`/`finally`:\n\n" +
      "- **`try`** wraps the risky code.\n" +
      "- **`except SomeError as e`** handles a specific exception type (and its subclasses). You can have several, most-specific first.\n" +
      "- **`else`** runs only if **no** exception was raised — put the 'happy path' continuation here so it isn't accidentally guarded by the `try`.\n" +
      "- **`finally`** **always** runs (success, exception, or `return`), for cleanup.\n\n" +
      "Best practices: catch **specific** exceptions, never a bare `except:` (it also swallows `KeyboardInterrupt`/`SystemExit` and hides bugs). Re-raise with a bare `raise` to preserve the traceback, and chain causes with `raise New() from err`. Exceptions are classes in a hierarchy rooted at `BaseException` (most inherit `Exception`), so catching a base type catches its subclasses.\n\n" +
      "Python's style is **EAFP** ('easier to ask forgiveness than permission') — try the operation and handle the exception, rather than pre-checking with lots of `if`s.\n\n" +
      "**Interview tip:** explain what `else` and `finally` add beyond `try/except` — `else` keeps the happy path out of the `try`, `finally` guarantees cleanup. And state the rule: catch specific types, never bare `except`.",
    examples: [
      {
        label: "try / except / else / finally and exception chaining",
        tech: "python",
        code:
          "def parse_ratio(text):\n" +
          "    try:\n" +
          "        a, b = text.split(\"/\")\n" +
          "        result = int(a) / int(b)\n" +
          "    except ZeroDivisionError:\n" +
          "        raise ValueError(f\"denominator is zero in {text!r}\") from None\n" +
          "    except ValueError as e:\n" +
          "        print(\"  bad input:\", e)\n" +
          "        return None\n" +
          "    else:\n" +
          "        print(\"  parsed ok\")        # only if no exception\n" +
          "        return result\n" +
          "    finally:\n" +
          "        print(\"  (cleanup always runs)\")\n\n" +
          "print(\"3/4 ->\", parse_ratio(\"3/4\"))\n" +
          "print(\"x/4 ->\", parse_ratio(\"x/4\"))",
      },
    ],
  },
  {
    title: "What is the difference between an iterable and an iterator?",
    answer:
      "These are two roles in the **iteration protocol**:\n\n" +
      "- An **iterable** is anything you can loop over: it implements `__iter__()`, which returns a fresh **iterator**. Lists, tuples, strings, dicts, sets, files are iterables. They're **reusable** — each `for` loop gets a new iterator.\n" +
      "- An **iterator** implements `__next__()` (and returns *itself* from `__iter__`). It produces items one at a time and raises **`StopIteration`** when exhausted. It's **stateful and single-pass** — once consumed, it's empty.\n\n" +
      "A `for x in obj:` loop is sugar for: call `iter(obj)` once, then call `next()` repeatedly until `StopIteration`. **Generators are iterators** (so single-use). A list is an iterable but *not* its own iterator — which is why you can loop over the same list many times but a generator only once.\n\n" +
      "**Interview tip:** the sharp distinction is reusable vs one-shot: `iter(a_list)` gives a *new* iterator each time, but a generator/iterator is consumed after one pass. Be ready to write a class with `__iter__`/`__next__` raising `StopIteration`.",
    examples: [
      {
        label: "iter()/next(), StopIteration, and one-shot exhaustion",
        tech: "python",
        code:
          "nums = [10, 20, 30]               # iterable\n" +
          "it = iter(nums)                   # -> a fresh iterator\n" +
          "print(next(it), next(it), next(it))\n" +
          "try:\n" +
          "    next(it)\n" +
          "except StopIteration:\n" +
          "    print(\"exhausted -> StopIteration\")\n\n" +
          "# A list is reusable; an iterator is single-pass\n" +
          "gen = (x * x for x in range(3))\n" +
          "print(\"first pass :\", list(gen))\n" +
          "print(\"second pass:\", list(gen), \"<- empty, already consumed\")\n\n" +
          "# A custom iterator\n" +
          "class CountDown:\n" +
          "    def __init__(self, n): self.n = n\n" +
          "    def __iter__(self): return self\n" +
          "    def __next__(self):\n" +
          "        if self.n <= 0: raise StopIteration\n" +
          "        self.n -= 1\n" +
          "        return self.n + 1\n\n" +
          "print(\"countdown:\", list(CountDown(4)))",
      },
    ],
  },
  {
    title: "How does Python manage memory and garbage collection?",
    answer:
      "CPython manages memory automatically with **two cooperating mechanisms**:\n\n" +
      "1. **Reference counting (primary):** every object tracks how many references point to it. When the count hits **zero**, the object is freed **immediately**. This is deterministic and prompt, but can't reclaim **reference cycles** (A → B → A) because their counts never reach zero.\n" +
      "2. **Cyclic garbage collector (backup):** a generational, mark-and-sweep collector in the `gc` module periodically finds and frees unreachable cycles. It uses **3 generations** — new objects are checked often, survivors are promoted and checked less, exploiting that most objects die young.\n\n" +
      "Under the hood, CPython allocates from private heaps with size-segregated pools (`pymalloc`) and free-lists for small objects, so it rarely calls the OS allocator. You don't `free()` manually, but you can still **leak** by keeping references alive (global caches, lingering closures, `__del__` issues). `weakref` lets you reference an object without keeping it alive.\n\n" +
      "**Interview tip:** lead with 'refcounting frees most objects instantly; a generational cyclic GC mops up reference cycles refcounting can't.' Bonus: mention the cycle problem is *why* the cyclic collector exists, and that GC is a CPython detail (PyPy/Jython differ).",
    examples: [
      {
        label: "Refcounts drop to zero; the GC handles a cycle",
        tech: "python",
        code:
          "import gc\n" +
          "import sys\n\n" +
          "data = [1, 2, 3]\n" +
          "alias = data\n" +
          "# getrefcount is +1 because the argument itself is a reference\n" +
          "print(\"refcount with 2 names:\", sys.getrefcount(data))\n" +
          "del alias\n" +
          "print(\"refcount after del   :\", sys.getrefcount(data))\n\n" +
          "# A reference cycle: refcounting alone can't free this\n" +
          "class Node:\n" +
          "    def __init__(self): self.ref = None\n\n" +
          "a, b = Node(), Node()\n" +
          "a.ref = b\n" +
          "b.ref = a            # cycle a <-> b\n" +
          "del a, b             # counts never hit zero\n\n" +
          "collected = gc.collect()   # cyclic GC reclaims it\n" +
          "print(\"objects collected by cyclic GC:\", collected)",
      },
    ],
  },
  {
    title: "What does __slots__ do?",
    answer:
      "By default each instance stores its attributes in a per-instance **`__dict__`** (a dict), which is flexible but costs memory and an extra indirection. Declaring **`__slots__ = ('x', 'y')`** tells Python to reserve fixed storage for exactly those attributes and **skip the `__dict__`**, so each instance is significantly smaller and attribute access is slightly faster.\n\n" +
      "When it matters: you create **very many** small objects (millions of points/records/nodes) — the per-instance dict savings add up to large reductions in memory.\n\n" +
      "Trade-offs to mention:\n\n" +
      "- You **can't add new attributes** not listed in `__slots__` (often a feature — it catches typos).\n" +
      "- No `__dict__` unless you add `'__dict__'` to the slots (which defeats the purpose).\n" +
      "- Subclassing and multiple inheritance need care; a subclass without its own `__slots__` regains a `__dict__`.\n" +
      "- `@dataclass(slots=True)` (3.10+) generates slots for you.\n\n" +
      "**Interview tip:** frame it as a memory optimization for high-instance-count classes, and immediately name the cost: no dynamic attributes and a re-introduced `__dict__` on naive subclasses. Don't apply it everywhere — only where instance counts justify it.",
    examples: [
      {
        label: "Slots block stray attributes and shrink instances",
        tech: "python",
        code:
          "import sys\n\n" +
          "class PointDict:\n" +
          "    def __init__(self, x, y):\n" +
          "        self.x, self.y = x, y\n\n" +
          "class PointSlots:\n" +
          "    __slots__ = (\"x\", \"y\")\n" +
          "    def __init__(self, x, y):\n" +
          "        self.x, self.y = x, y\n\n" +
          "d = PointDict(1, 2)\n" +
          "s = PointSlots(1, 2)\n\n" +
          "print(\"has __dict__ (dict) :\", hasattr(d, \"__dict__\"))\n" +
          "print(\"has __dict__ (slots):\", hasattr(s, \"__dict__\"))\n\n" +
          "# Slots reject attributes that weren't declared\n" +
          "d.z = 99            # fine\n" +
          "try:\n" +
          "    s.z = 99\n" +
          "except AttributeError as e:\n" +
          "    print(\"slots block stray attr:\", e)",
      },
    ],
  },
  {
    title: "How are Python dictionaries implemented and ordered?",
    answer:
      "A `dict` is a **hash table**: keys are hashed (`hash(key)`) to find a slot, giving **average O(1)** lookup, insertion and deletion (worst case O(n) under pathological collisions). Keys must be **hashable** — i.e. immutable-by-value with stable `__hash__`/`__eq__` (so `str`, `int`, `tuple` work; `list`/`dict` don't).\n\n" +
      "Since **Python 3.7** dicts **preserve insertion order** as a **language guarantee** (it was a CPython implementation detail in 3.6). The modern 'compact dict' stores entries in a dense insertion-ordered array, with a separate sparse index array of hashes — which is also why dicts use less memory than they used to. Iteration, `keys()`, `values()`, `items()` all follow insertion order.\n\n" +
      "Dicts are everywhere in Python internals: object attributes (`__dict__`), namespaces/globals, and `**kwargs`. For an order-independent comparison or counting, you still use `==` (order doesn't affect equality) or `collections.Counter`.\n\n" +
      "**Interview tip:** two facts win this one — 'hash table, average O(1)' and 'insertion-ordered since 3.7 (guaranteed), 3.6 (incidental).' Add that order doesn't affect `==` and that keys must be hashable to show depth.",
    examples: [
      {
        label: "Average O(1) lookups, guaranteed insertion order",
        tech: "python",
        code:
          "# Insertion order is preserved (guaranteed since Python 3.7)\n" +
          "d = {}\n" +
          "for key in [\"z\", \"a\", \"m\", \"b\"]:\n" +
          "    d[key] = key.upper()\n" +
          "print(\"order:\", list(d.keys()))\n\n" +
          "# O(1) average lookup regardless of size\n" +
          "big = {i: i * i for i in range(1_000_000)}\n" +
          "print(\"lookup 999999:\", big[999_999])\n\n" +
          "# Keys must be hashable\n" +
          "ok = {(1, 2): \"tuple key works\"}\n" +
          "print(ok[(1, 2)])\n" +
          "try:\n" +
          "    {[1, 2]: \"nope\"}\n" +
          "except TypeError as e:\n" +
          "    print(\"unhashable key:\", e)",
      },
    ],
  },
  {
    title: "What is the difference between a module and a package?",
    answer:
      "- A **module** is a single `.py` file — a namespace of functions, classes and variables you can `import`. Importing runs the file once and caches it in `sys.modules`; its top-level names become attributes of the module object.\n" +
      "- A **package** is a **directory** of modules (and sub-packages) that groups them under a dotted namespace, e.g. `package.subpackage.module`. Historically a package needs an `__init__.py` (run on import, often used to expose a curated public API); since 3.3, **namespace packages** can omit it.\n\n" +
      "So a package is essentially a module that contains other modules. You import with `import pkg.mod` or `from pkg.mod import thing`. Python finds them by walking `sys.path`; the **`if __name__ == \"__main__\":`** guard lets a file act as both an importable module and a runnable script.\n\n" +
      "**Interview tip:** one-liner — 'a module is a file, a package is a directory of modules (with an optional `__init__.py`).' Mention `__init__.py`'s role (package init / public API) and the `__name__ == \"__main__\"` guard; both signal you've actually structured a project.",
    examples: [
      {
        label: "A module is an object; the __main__ guard",
        tech: "python",
        code:
          "import math      # importing a module binds a namespace object\n\n" +
          "print(\"module object :\", math)\n" +
          "print(\"its file       :\", math.__file__.split(\"/\")[-1])\n" +
          "print(\"pulled symbols :\", math.pi, math.sqrt(16))\n\n" +
          "# Every module has a __name__. When run directly it is '__main__';\n" +
          "# when imported it is the module's own name. This guard is how a file\n" +
          "# works as BOTH an importable module and a runnable script.\n" +
          "def main():\n" +
          "    print(\"running as a script\")\n\n" +
          "print(\"__name__ here is:\", __name__)\n" +
          "if __name__ == \"__main__\":\n" +
          "    main()",
      },
    ],
  },
];

export default augments;
