import type { PythonAugment } from "./python-augments.types";

/**
 * Python augments — batch 3 (questions 15-30 of curated/python-2.json).
 * Same conventions as batches 1-2. The virtual-environments answer uses a
 * runnable:false shell snippet (venv/pip don't run in the Piston sandbox) plus a
 * runnable Python example that inspects the active interpreter.
 */
const augments: PythonAugment[] = [
  {
    title: "How do type hints work in Python?",
    answer:
      "**Type hints** (PEP 484) annotate the expected types of variables, parameters and return values: `def greet(name: str) -> str:`. They are **not enforced at runtime** — Python ignores them during execution. Their value is **static analysis**: tools like **mypy**/**pyright** check them, IDEs use them for autocomplete and refactoring, and they double as precise documentation.\n\n" +
      "The `typing` module (much of it now built into the builtins) provides:\n\n" +
      "- **`Optional[X]`** (= `X | None`) and **`Union[A, B]`** (modern: `A | B`).\n" +
      "- Generic containers: `list[int]`, `dict[str, int]`, `tuple[int, ...]`, `Callable[[int], str]`.\n" +
      "- **`TypedDict`** (typed dict shapes), **`Protocol`** (structural/duck typing), `Literal`, `Any`, `TypeVar`/generics, `Annotated`.\n\n" +
      "Hints power real frameworks at runtime too — **Pydantic** and **FastAPI** read them to validate and parse data, and `@dataclass` uses them to generate fields. Inspect them via `typing.get_type_hints(obj)`.\n\n" +
      "**Interview tip:** the line that matters is 'hints are checked statically, not enforced at runtime.' Then show range: `X | None`, generics like `dict[str, int]`, and that tools (mypy) or libraries (Pydantic/FastAPI) are what give them teeth.",
    examples: [
      {
        label: "Hints don't enforce at runtime; introspecting them",
        tech: "python",
        code:
          "from typing import Optional, get_type_hints\n\n" +
          "def repeat(text: str, times: int = 2) -> str:\n" +
          "    return text * times\n\n" +
          "def find(items: list[int], target: int) -> Optional[int]:\n" +
          "    return items.index(target) if target in items else None\n\n" +
          "print(repeat(\"ab\", 3))\n" +
          "print(\"index:\", find([10, 20, 30], 20))\n\n" +
          "# Hints are NOT enforced — Python runs this happily\n" +
          "print(\"ignored at runtime:\", repeat(5, 3))   # int * int, no error\n\n" +
          "# But they ARE introspectable (what mypy/Pydantic read)\n" +
          "print(\"hints:\", get_type_hints(repeat))",
      },
    ],
  },
  {
    title: "What is EAFP vs LBYL in Python?",
    answer:
      "Two error-handling philosophies:\n\n" +
      "- **EAFP — 'Easier to Ask Forgiveness than Permission':** just *do* the operation and catch the exception if it fails. `try: value = d[key] except KeyError: ...`. This is the **Pythonic** default.\n" +
      "- **LBYL — 'Look Before You Leap':** *check* preconditions first, then act. `if key in d: value = d[key]`.\n\n" +
      "Why Python favors EAFP:\n\n" +
      "1. **Avoids race conditions (TOCTOU):** with LBYL the state can change *between* the check and the use (a file you checked exists gets deleted; a dict key gets popped by another thread). EAFP acts atomically and handles the failure.\n" +
      "2. **Often clearer and faster on the happy path** — no duplicate lookups, and exceptions are cheap when they don't fire.\n\n" +
      "LBYL still has its place (cheap, side-effect-free checks; validating user input up front; avoiding an expensive operation). But for dict access, attribute access, file I/O and conversions, EAFP wins.\n\n" +
      "**Interview tip:** name both acronyms, say EAFP is idiomatic Python, and give the **race-condition** argument — that's the technical reason, not just style. `d.get(key, default)` is the neat middle ground for the dict case.",
    examples: [
      {
        label: "EAFP try/except vs LBYL pre-check",
        tech: "python",
        code:
          "config = {\"host\": \"localhost\", \"port\": \"8080\"}\n\n" +
          "# EAFP — try it, handle failure (Pythonic)\n" +
          "def get_port_eafp(cfg):\n" +
          "    try:\n" +
          "        return int(cfg[\"port\"])\n" +
          "    except (KeyError, ValueError):\n" +
          "        return 80\n\n" +
          "# LBYL — check everything first (more verbose, race-prone)\n" +
          "def get_port_lbyl(cfg):\n" +
          "    if \"port\" in cfg and cfg[\"port\"].isdigit():\n" +
          "        return int(cfg[\"port\"])\n" +
          "    return 80\n\n" +
          "print(\"eafp:\", get_port_eafp(config))\n" +
          "print(\"lbyl:\", get_port_lbyl(config))\n" +
          "print(\"missing key, eafp:\", get_port_eafp({}))\n\n" +
          "# The pragmatic middle ground for dicts\n" +
          "print(\"d.get:\", config.get(\"timeout\", 30))",
      },
    ],
  },
  {
    title: "How do you create and chain custom exceptions?",
    answer:
      "Create a domain-specific exception by **subclassing `Exception`** (never `BaseException` — that's reserved for `KeyboardInterrupt`/`SystemExit`). A common pattern is one **base exception per package/app** with specific subclasses, so callers can catch your whole family (`except MyAppError`) or a precise case (`except ValidationError`).\n\n" +
      "```python\n" +
      "class AppError(Exception): pass\n" +
      "class ValidationError(AppError): pass\n" +
      "```\n\n" +
      "**Chaining** preserves *why* an error happened. When you catch a low-level error and raise a higher-level one, use **`raise NewError(...) from original`** (explicit chaining). The traceback then shows 'The above exception was the direct cause of the following exception', keeping the root cause visible. Inside an `except`, a bare `raise New(...)` already records the current exception as `__context__` (implicit chaining); add `from None` to deliberately **suppress** a noisy inner cause.\n\n" +
      "Carry structured data by giving the exception `__init__` extra attributes (an error code, the offending field).\n\n" +
      "**Interview tip:** two points score: (1) subclass `Exception`, ideally with an app-specific base class for a catchable hierarchy; (2) **`raise ... from err`** to chain and preserve the cause (and `from None` to suppress). Mention adding attributes for structured error context.",
    examples: [
      {
        label: "An exception hierarchy with `raise ... from`",
        tech: "python",
        code:
          "class AppError(Exception):\n" +
          "    \"\"\"Base for every error this app raises.\"\"\"\n\n" +
          "class ConfigError(AppError):\n" +
          "    def __init__(self, key, message):\n" +
          "        super().__init__(message)\n" +
          "        self.key = key            # structured context\n\n" +
          "def load_port(raw):\n" +
          "    try:\n" +
          "        return int(raw)\n" +
          "    except ValueError as err:\n" +
          "        raise ConfigError(\"port\", f\"invalid port {raw!r}\") from err\n\n" +
          "try:\n" +
          "    load_port(\"abc\")\n" +
          "except AppError as e:           # base class catches the subclass\n" +
          "    print(\"type :\", type(e).__name__)\n" +
          "    print(\"key  :\", e.key)\n" +
          "    print(\"cause:\", type(e.__cause__).__name__)   # the chained error",
      },
    ],
  },
  {
    title: "When do you use threading, multiprocessing, or asyncio?",
    answer:
      "Match the tool to the **bottleneck**, remembering the GIL lets only one thread run Python bytecode at a time:\n\n" +
      "| Model | Best for | Parallelism | Cost |\n" +
      "|---|---|---|---|\n" +
      "| **threading** | **I/O-bound**, blocking libraries | concurrency only (GIL released on I/O) | shared memory → locks/races |\n" +
      "| **multiprocessing** | **CPU-bound** work | **true** (separate processes bypass the GIL) | high startup + IPC/pickle overhead |\n" +
      "| **asyncio** | **I/O-bound, very high concurrency** | concurrency on one thread | needs async libraries; one blocking call stalls all |\n\n" +
      "Rules of thumb:\n\n" +
      "- **CPU-bound** (number crunching, image processing) → **multiprocessing** (or `ProcessPoolExecutor`, or release-the-GIL native libs like NumPy).\n" +
      "- **I/O-bound with a handful of tasks / blocking libs** → **threading** (or `ThreadPoolExecutor`).\n" +
      "- **I/O-bound with thousands of concurrent connections** and async-capable libraries → **asyncio** (lighter than a thread per task).\n\n" +
      "**Interview tip:** the decision tree is the whole answer: *CPU-bound → multiprocessing; I/O-bound → threads or asyncio (asyncio when you need massive concurrency)*. Anchor it in the GIL — that's *why* threads don't help CPU-bound code.",
    examples: [
      {
        label: "ProcessPool (CPU) vs ThreadPool (I/O)",
        tech: "python",
        code:
          "import time, math\n" +
          "from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor\n\n" +
          "def cpu_task(n):              # CPU-bound\n" +
          "    return sum(math.isqrt(i) for i in range(n))\n\n" +
          "def io_task(_):              # I/O-bound (simulated wait)\n" +
          "    time.sleep(0.2)\n" +
          "    return \"done\"\n\n" +
          "# CPU-bound: processes give real parallelism (bypass the GIL)\n" +
          "start = time.perf_counter()\n" +
          "with ProcessPoolExecutor() as ex:\n" +
          "    list(ex.map(cpu_task, [2_000_000] * 4))\n" +
          "print(f\"CPU via processes: {time.perf_counter() - start:.2f}s\")\n\n" +
          "# I/O-bound: threads overlap the waiting\n" +
          "start = time.perf_counter()\n" +
          "with ThreadPoolExecutor(max_workers=4) as ex:\n" +
          "    list(ex.map(io_task, range(4)))\n" +
          "print(f\"I/O via threads  : {time.perf_counter() - start:.2f}s (~0.2, not 0.8)\")",
      },
    ],
  },
  {
    title: "How does iterable unpacking work?",
    answer:
      "**Unpacking** assigns the elements of an iterable to multiple targets at once: `a, b, c = [1, 2, 3]`. The count must match — unless you use a **starred target** `*rest`, which greedily absorbs the remaining items into a **list**: `first, *middle, last = [1, 2, 3, 4, 5]` gives `first=1`, `middle=[2,3,4]`, `last=5`. Exactly one star is allowed, and it works at either end or the middle.\n\n" +
      "Unpacking powers several idioms:\n\n" +
      "- **Swapping** without a temp: `a, b = b, a` (the right side becomes a tuple first).\n" +
      "- **Nested** unpacking: `(name, (lat, lng)) = record`.\n" +
      "- **In function calls**: `f(*args, **kwargs)` and merging: `merged = {**d1, **d2}`, `combined = [*a, *b]`.\n" +
      "- **`for` loops over pairs**: `for k, v in d.items():`.\n" +
      "- **Throwaway** with `_`: `_, value = pair`.\n\n" +
      "**Interview tip:** show the **starred** unpack (`first, *rest = ...` → `rest` is a *list*) and the tuple-swap, and mention `{**a, **b}` / `[*a, *b]` for merging. Knowing the star captures into a list (not a tuple) is a nice precise detail.",
    examples: [
      {
        label: "Starred capture, swap, nested, and merge unpacking",
        tech: "python",
        code:
          "# Starred target absorbs the middle (as a LIST)\n" +
          "first, *middle, last = [1, 2, 3, 4, 5]\n" +
          "print(\"first/middle/last:\", first, middle, last)\n\n" +
          "# Swap with no temp variable\n" +
          "a, b = \"x\", \"y\"\n" +
          "a, b = b, a\n" +
          "print(\"swapped:\", a, b)\n\n" +
          "# Nested unpacking\n" +
          "name, (lat, lng) = (\"HQ\", (37.77, -122.41))\n" +
          "print(\"nested:\", name, lat, lng)\n\n" +
          "# Merge with * and **\n" +
          "print(\"list merge:\", [*[1, 2], *[3, 4]])\n" +
          "print(\"dict merge:\", {**{\"a\": 1}, **{\"b\": 2}})",
      },
    ],
  },
  {
    title: "How do you use multiple context managers at once?",
    answer:
      "Three approaches:\n\n" +
      "1. **One `with`, comma-separated:** `with open('a') as a, open('b') as b:`. Both are entered left-to-right and exited in **reverse** order; each is cleaned up even if a later one or the block raises. Since Python 3.10 you can wrap them in **parentheses** for clean line-wrapping across multiple lines.\n" +
      "2. **`contextlib.ExitStack`** — when the number of context managers is **dynamic** (e.g. open a variable list of files). You `enter_context(cm)` in a loop; the stack guarantees all of them are unwound (in reverse) on exit. It also lets you transfer cleanup ownership (`pop_all`).\n" +
      "3. Nested `with` blocks — functionally equivalent but more indentation; the single-`with` form is preferred for a fixed set.\n\n" +
      "The guarantee is the same as a single context manager: every entered manager's `__exit__` runs, in reverse order, no matter how the block ends.\n\n" +
      "**Interview tip:** mention both the comma form (with the 3.10 parenthesized syntax) for a *fixed* set and **`ExitStack`** for a *dynamic* number — reaching for `ExitStack` when the count isn't known up front is the senior signal.",
    examples: [
      {
        label: "Comma form + ExitStack for a dynamic number",
        tech: "python",
        code:
          "from contextlib import contextmanager, ExitStack\n\n" +
          "@contextmanager\n" +
          "def tag(name):\n" +
          "    print(f\"enter {name}\")\n" +
          "    try:\n" +
          "        yield name\n" +
          "    finally:\n" +
          "        print(f\"exit  {name}\")    # reverse order on the way out\n\n" +
          "# Fixed set: one with, comma-separated\n" +
          "with tag(\"A\") as a, tag(\"B\") as b:\n" +
          "    print(\"  using\", a, b)\n\n" +
          "print(\"--- dynamic count via ExitStack ---\")\n" +
          "names = [\"db\", \"cache\", \"file\"]\n" +
          "with ExitStack() as stack:\n" +
          "    managers = [stack.enter_context(tag(n)) for n in names]\n" +
          "    print(\"  all open:\", managers)",
      },
    ],
  },
  {
    title: "What set operations does Python support?",
    answer:
      "A `set` is an **unordered** collection of **unique, hashable** items with average **O(1)** membership tests — ideal for de-duplication and fast 'is this in here?' checks. It supports the full algebra of sets, with both operator and method forms:\n\n" +
      "| Operation | Operator | Method | Result |\n" +
      "|---|---|---|---|\n" +
      "| Union | `a | b` | `a.union(b)` | in either |\n" +
      "| Intersection | `a & b` | `a.intersection(b)` | in both |\n" +
      "| Difference | `a - b` | `a.difference(b)` | in `a`, not `b` |\n" +
      "| Symmetric diff | `a ^ b` | `a.symmetric_difference(b)` | in exactly one |\n" +
      "| Subset / superset | `a <= b` / `a >= b` | `issubset`/`issuperset` | containment test |\n\n" +
      "The method forms accept any iterable; the operators require both sides to be sets. There's also `frozenset` (immutable, hashable → usable as a dict key or set member). Common uses: dedup (`set(seq)`), finding common/missing items between two collections, and membership filters.\n\n" +
      "**Interview tip:** beyond listing operators, sell the **O(1) membership** vs a list's O(n) — that's why converting to a set before many `in` checks is a classic optimization. Mention `frozenset` for a hashable, immutable set.",
    examples: [
      {
        label: "Union/intersection/difference and O(1) membership",
        tech: "python",
        code:
          "a = {1, 2, 3, 4}\n" +
          "b = {3, 4, 5, 6}\n\n" +
          "print(\"union       :\", a | b)\n" +
          "print(\"intersection:\", a & b)\n" +
          "print(\"difference  :\", a - b)\n" +
          "print(\"symmetric   :\", a ^ b)\n" +
          "print(\"subset?     :\", {1, 2} <= a)\n\n" +
          "# Dedup while preserving nothing about order\n" +
          "print(\"dedup:\", set([1, 1, 2, 3, 3, 3]))\n\n" +
          "# Fast membership: build a set once, test many times in O(1)\n" +
          "allowed = {\"GET\", \"POST\", \"PUT\"}\n" +
          "print(\"PATCH allowed?\", \"PATCH\" in allowed)",
      },
    ],
  },
  {
    title: "What is the memory difference between a list comprehension and a generator expression?",
    answer:
      "Same syntax, one bracket apart, very different memory profile:\n\n" +
      "- **List comprehension `[...]`** is **eager**: it builds the **entire list in memory** immediately. You can index it, take its `len()`, and iterate it many times — but it costs O(n) memory.\n" +
      "- **Generator expression `(...)`** is **lazy**: it creates a generator object that yields items **one at a time** on demand, using ~**constant** memory regardless of input size. You can't index it or re-iterate, and it has no `len()`.\n\n" +
      "Choose a generator when you only need a **single pass** and especially when feeding an aggregator — `sum(x*x for x in data)`, `any(...)`, `max(...)`, `''.join(...)` — because no intermediate list is ever materialized. (You can even drop the parentheses when the genexp is the sole argument: `sum(x*x for x in data)`.) Choose a list when you need random access, multiple passes, or the length.\n\n" +
      "**Interview tip:** 'list = O(n) memory, eager; genexp = O(1) memory, lazy, single-pass.' The clinching example is `sum(x*x for x in huge)` — same result as the list version with none of the memory. Mention you can't re-iterate a generator.",
    examples: [
      {
        label: "sys.getsizeof: list grows, generator stays tiny",
        tech: "python",
        code:
          "import sys\n\n" +
          "list_comp = [x * x for x in range(100_000)]   # eager: full list\n" +
          "gen_expr = (x * x for x in range(100_000))    # lazy: one at a time\n\n" +
          "print(\"list size :\", sys.getsizeof(list_comp), \"bytes\")\n" +
          "print(\"gen size  :\", sys.getsizeof(gen_expr), \"bytes (constant)\")\n\n" +
          "# Aggregate without ever building a list\n" +
          "print(\"sum of squares:\", sum(x * x for x in range(100_000)))\n\n" +
          "# Generators are single-pass\n" +
          "g = (c.upper() for c in \"abc\")\n" +
          "print(\"first pass :\", list(g))\n" +
          "print(\"second pass:\", list(g), \"<- exhausted\")",
      },
    ],
  },
  {
    title: "What is pickling and what are its risks?",
    answer:
      "**Pickling** serializes almost any Python object graph into a byte stream (`pickle.dumps`) and reconstructs it later (`pickle.loads`) — preserving types, nesting and references. It's Python's native persistence/IPC format and is what `multiprocessing` uses to pass objects between processes.\n\n" +
      "The critical risk: **`pickle.loads` on untrusted data can execute arbitrary code.** Unpickling can invoke an object's `__reduce__`, which may call any callable — so a malicious pickle can run `os.system(...)` the moment you load it. **Never unpickle data from an untrusted or unauthenticated source.**\n\n" +
      "Other limitations: it's **Python-specific** (not interoperable with other languages), **not human-readable**, can **break across Python/library versions**, and can't pickle some objects (open files, sockets, lambdas, local functions).\n\n" +
      "Safer alternatives: **JSON** for interoperable, human-readable, untrusted data (limited to basic types); MessagePack/Protocol Buffers for compact cross-language formats; and if you must use pickle, restrict it to data you produced and trust (sign/encrypt it in transit).\n\n" +
      "**Interview tip:** lead with the security headline — '`pickle.loads` of untrusted input is arbitrary code execution' — then contrast with JSON (safe, interoperable, but only basic types). That security framing is exactly what the question is checking.",
    examples: [
      {
        label: "Round-trip a complex object; why JSON can't",
        tech: "python",
        code:
          "import pickle, json\n" +
          "from dataclasses import dataclass\n\n" +
          "@dataclass\n" +
          "class User:\n" +
          "    name: str\n" +
          "    roles: set        # a set: JSON can't represent this directly\n\n" +
          "u = User(\"ada\", {\"admin\", \"editor\"})\n\n" +
          "# pickle preserves arbitrary Python types and structure\n" +
          "blob = pickle.dumps(u)\n" +
          "restored = pickle.loads(blob)     # SAFE only for trusted data!\n" +
          "print(\"unpickled:\", restored)\n" +
          "print(\"type kept:\", type(restored).__name__)\n\n" +
          "# JSON is safe + interoperable but rejects non-basic types\n" +
          "try:\n" +
          "    json.dumps(u.__dict__)\n" +
          "except TypeError as e:\n" +
          "    print(\"json error:\", e)",
      },
    ],
  },
  {
    title: "Why use virtual environments?",
    answer:
      "A **virtual environment** is an isolated Python installation for a single project: its own `site-packages` (and a pinned interpreter), separate from the system Python and from other projects. You create one with **`python -m venv .venv`**, activate it, then `pip install` into *that* sandbox.\n\n" +
      "Why it matters:\n\n" +
      "- **No dependency conflicts:** project A needs `Django 3`, project B needs `Django 5` — without isolation those collide in one global `site-packages`. Each venv gets its own versions.\n" +
      "- **Reproducibility:** pin exact versions in `requirements.txt` (or a lockfile) so `pip install -r requirements.txt` rebuilds the same environment on another machine / in CI / in production.\n" +
      "- **Don't pollute system Python:** installing globally can break OS tools that depend on specific package versions.\n\n" +
      "Modern tooling (`poetry`, `pipenv`, `uv`, `conda`) wraps this with lockfiles and resolution, but they all rest on the same isolation idea.\n\n" +
      "**Interview tip:** the core reasons are **dependency isolation** (per-project versions) and **reproducibility** (pinned `requirements.txt`). Bonus for naming a modern manager (`poetry`/`uv`) and noting they add proper lockfiles on top of the venv concept.",
    examples: [
      {
        label: "Typical venv workflow (shell)",
        tech: "python",
        runnable: false,
        code:
          "# Create an isolated environment in ./.venv\n" +
          "python -m venv .venv\n\n" +
          "# Activate it\n" +
          "source .venv/bin/activate        # macOS / Linux\n" +
          "# .venv\\Scripts\\activate         # Windows\n\n" +
          "# Install INTO this env only, then freeze exact versions\n" +
          "pip install requests==2.32.0\n" +
          "pip freeze > requirements.txt\n\n" +
          "# Reproduce the exact env elsewhere (another machine / CI)\n" +
          "pip install -r requirements.txt\n\n" +
          "deactivate                       # leave the environment",
      },
      {
        label: "Inspect which interpreter/env is active",
        tech: "python",
        code:
          "import sys, os\n\n" +
          "print(\"interpreter :\", sys.executable)\n" +
          "print(\"version     :\", sys.version.split()[0])\n\n" +
          "# sys.prefix points at the active environment's root;\n" +
          "# in a venv it differs from base_prefix.\n" +
          "in_venv = sys.prefix != getattr(sys, \"base_prefix\", sys.prefix)\n" +
          "print(\"running in a venv:\", in_venv)\n" +
          "print(\"VIRTUAL_ENV var :\", os.environ.get(\"VIRTUAL_ENV\", \"(not set)\"))",
      },
    ],
  },
  {
    title: "What is the late-binding closure pitfall in loops?",
    answer:
      "Closures in Python capture **variables by reference, not by value**. A function defined inside a loop closes over the loop *variable itself*, not its value at definition time — and the loop variable keeps changing. So every function created in the loop sees the **final** value once the loop has finished.\n\n" +
      "The classic surprise: `funcs = [lambda: i for i in range(3)]` — calling any of them returns **2**, not 0/1/2, because they all reference the same `i`, which ends at 2.\n\n" +
      "Fixes:\n\n" +
      "1. **Default-argument binding** — `lambda i=i: i`. Default arguments are evaluated *when the lambda is defined*, capturing the **current** value. (Most common fix.)\n" +
      "2. **A factory function** — call a function that takes `i` as a parameter and returns the closure; each call gets its own scope.\n" +
      "3. **`functools.partial(func, i)`** — binds the current `i`.\n\n" +
      "Note this also bites `for`-created closures generally, not just lambdas. (List/genexp variables are scoped to the comprehension, but a closure built *inside* one still captures by reference.)\n\n" +
      "**Interview tip:** explain *why* — 'closures capture the variable, not its value, and the loop variable is shared/mutated.' Then give the `i=i` default-arg fix. Being able to predict the wrong output (all 2s) and explain it is the whole point.",
    examples: [
      {
        label: "All closures see the final i — and three fixes",
        tech: "python",
        code:
          "from functools import partial\n\n" +
          "# PITFALL: every lambda captures the same i (ends at 2)\n" +
          "bad = [lambda: i for i in range(3)]\n" +
          "print(\"buggy   :\", [f() for f in bad])   # [2, 2, 2]\n\n" +
          "# FIX 1: default-arg binds the CURRENT value\n" +
          "good1 = [lambda i=i: i for i in range(3)]\n" +
          "print(\"default :\", [f() for f in good1])  # [0, 1, 2]\n\n" +
          "# FIX 2: factory gives each closure its own scope\n" +
          "def make(i):\n" +
          "    return lambda: i\n" +
          "good2 = [make(i) for i in range(3)]\n" +
          "print(\"factory :\", [f() for f in good2])\n\n" +
          "# FIX 3: functools.partial binds i now\n" +
          "good3 = [partial(lambda x: x, i) for i in range(3)]\n" +
          "print(\"partial :\", [f() for f in good3])",
      },
    ],
  },
  {
    title: "What are abstract base classes and Protocols?",
    answer:
      "Both define **interfaces**, but with opposite typing philosophies:\n\n" +
      "- **Abstract Base Classes (ABCs)** — from the `abc` module — are **nominal**: a class must *explicitly inherit* the ABC, and any `@abstractmethod` left unimplemented makes the subclass **uninstantiable** (you get a `TypeError` at construction). This enforces a contract at runtime and documents intent. The `collections.abc` module ships ABCs like `Iterable`, `Sequence`, `Mapping`.\n" +
      "- **Protocols** — from `typing` (PEP 544) — enable **structural / duck typing**: a class satisfies a `Protocol` simply by **having the right methods/attributes**, with **no inheritance** and no runtime coupling. Checking is done **statically** by type checkers ('if it walks like a duck...'). Use `@runtime_checkable` to allow `isinstance` checks too.\n\n" +
      "Rule of thumb: reach for an **ABC** when you control the hierarchy and want enforced, explicit contracts; reach for a **Protocol** to type-check duck-typed code or third-party classes you can't make inherit your base.\n\n" +
      "**Interview tip:** the one-liner is 'ABC = nominal/explicit-inheritance/runtime-enforced; Protocol = structural/duck-typed/static.' Mention `@abstractmethod` blocks instantiation, and that a Protocol needs no `import`-time relationship — perfect for typing code you don't own.",
    examples: [
      {
        label: "ABC enforces; Protocol matches by shape (no inheritance)",
        tech: "python",
        code:
          "from abc import ABC, abstractmethod\n" +
          "from typing import Protocol\n\n" +
          "# ABC: must inherit AND implement, else can't instantiate\n" +
          "class Shape(ABC):\n" +
          "    @abstractmethod\n" +
          "    def area(self) -> float: ...\n\n" +
          "class Square(Shape):\n" +
          "    def __init__(self, s): self.s = s\n" +
          "    def area(self): return self.s * self.s\n\n" +
          "print(\"square area:\", Square(4).area())\n" +
          "try:\n" +
          "    Shape()                       # abstract -> TypeError\n" +
          "except TypeError as e:\n" +
          "    print(\"can't instantiate ABC:\", str(e)[:40], \"...\")\n\n" +
          "# Protocol: satisfied by SHAPE, no inheritance needed\n" +
          "class Sized(Protocol):\n" +
          "    def __len__(self) -> int: ...\n\n" +
          "def describe(x: Sized) -> str:\n" +
          "    return f\"has {len(x)} items\"\n\n" +
          "print(describe([1, 2, 3]))        # list never imported Sized\n" +
          "print(describe(\"hello\"))",
      },
    ],
  },
  {
    title: "What are common useful string methods?",
    answer:
      "Strings are **immutable**, so every method returns a **new** string (the original is untouched). The everyday toolkit:\n\n" +
      "- **`split(sep)` / `rsplit` / `splitlines`** and **`sep.join(iterable)`** — the idiomatic pair for tokenizing and assembling. `' '.join(parts)` is the right way to build a string, **not** repeated `+=` in a loop (which is O(n²)).\n" +
      "- **`strip()` / `lstrip` / `rstrip`** — trim whitespace (or given chars).\n" +
      "- **`replace(old, new)`**, **`startswith`/`endswith`** (accept a tuple of options), **`find`/`index`** (find returns −1, index raises), **`count`**.\n" +
      "- Case: `lower`, `upper`, `title`, `casefold` (aggressive lowercase for caseless comparison).\n" +
      "- Tests: `isdigit`, `isalpha`, `isalnum`, `isspace`.\n" +
      "- Formatting: f-strings, `format`, `zfill`, `ljust`/`rjust`/`center`.\n\n" +
      "**Interview tip:** the highest-signal points are **`' '.join(...)` to build strings** (immutability makes `+=` in a loop O(n²)) and `split`/`join` as inverses. Knowing `find` returns −1 while `index` raises, and that `startswith` takes a tuple, shows depth.",
    examples: [
      {
        label: "split/join, strip, case, and membership tests",
        tech: "python",
        code:
          "raw = \"  Name, Email , Role  \"\n\n" +
          "# split + strip each token, then re-join idiomatically\n" +
          "fields = [part.strip() for part in raw.strip().split(\",\")]\n" +
          "print(\"fields:\", fields)\n" +
          "print(\"joined:\", \" | \".join(fields))\n\n" +
          "s = \"Hello, World\"\n" +
          "print(\"lower      :\", s.lower())\n" +
          "print(\"replace    :\", s.replace(\"World\", \"Python\"))\n" +
          "print(\"startswith :\", s.startswith((\"Hi\", \"Hello\")))  # tuple of options\n" +
          "print(\"find/index :\", s.find(\"zzz\"))                  # -1, not an error\n\n" +
          "# Immutability: build with join, never += in a loop\n" +
          "print(\"built:\", \"-\".join(str(n) for n in range(5)))",
      },
    ],
  },
  {
    title: "Why use functools.wraps when writing decorators?",
    answer:
      "When a decorator replaces a function with an inner `wrapper`, the returned object **is** the wrapper — so it carries the *wrapper's* identity: `__name__` becomes `'wrapper'`, `__doc__` is lost, `__module__`, `__qualname__`, the signature and `__wrapped__` are all wrong. That silently breaks anything that introspects the function: help text, debuggers, logging that prints `__name__`, API docs, and other decorators (or frameworks) that read metadata.\n\n" +
      "**`@functools.wraps(func)`** applied to the wrapper copies the original function's metadata (`__name__`, `__doc__`, `__module__`, `__qualname__`, `__dict__`) onto the wrapper and sets `__wrapped__` back to the original (so tools can still reach the real function). It's just `functools.update_wrapper` packaged as a decorator.\n\n" +
      "Rule: **every** decorator's wrapper should be decorated with `@wraps(func)`. It's one line and prevents a class of confusing bugs.\n\n" +
      "**Interview tip:** be concrete about what breaks without it — `decorated.__name__` reads `'wrapper'`, the docstring vanishes, introspection/stacked-decorators misbehave. `@wraps` restores all of that. Showing the before/after of `__name__` is the cleanest demonstration.",
    examples: [
      {
        label: "Without wraps the name/doc are lost; with it they survive",
        tech: "python",
        code:
          "import functools\n\n" +
          "def no_wraps(func):\n" +
          "    def wrapper(*a, **k):\n" +
          "        return func(*a, **k)\n" +
          "    return wrapper\n\n" +
          "def with_wraps(func):\n" +
          "    @functools.wraps(func)\n" +
          "    def wrapper(*a, **k):\n" +
          "        return func(*a, **k)\n" +
          "    return wrapper\n\n" +
          "@no_wraps\n" +
          "def alpha(x):\n" +
          "    \"\"\"Compute alpha.\"\"\"\n" +
          "    return x\n\n" +
          "@with_wraps\n" +
          "def beta(x):\n" +
          "    \"\"\"Compute beta.\"\"\"\n" +
          "    return x\n\n" +
          "print(\"no wraps  -> name:\", alpha.__name__, \"| doc:\", alpha.__doc__)\n" +
          "print(\"with wraps-> name:\", beta.__name__, \"| doc:\", beta.__doc__)",
      },
    ],
  },
  {
    title: "What values are falsy in Python?",
    answer:
      "In a boolean context (`if`, `while`, `and`/`or`, `bool(x)`), every object is either **truthy** or **falsy**. The **falsy** values are:\n\n" +
      "- **`None`** and **`False`**\n" +
      "- **Zero** of any numeric type: `0`, `0.0`, `0j`, `Decimal(0)`, `Fraction(0)`\n" +
      "- **Empty** sequences and collections: `''`, `[]`, `()`, `{}` (empty dict), `set()`, `range(0)`\n" +
      "- Objects whose `__bool__` returns `False`, or (lacking that) whose `__len__` returns `0`\n\n" +
      "**Everything else is truthy** — non-zero numbers, non-empty containers, and any object that defines neither `__bool__` nor `__len__` (truthy by default). This enables idioms like `if items:` (non-empty?) and `name or 'default'`.\n\n" +
      "The classic bug: **`None` and falsy-but-valid values are not the same**. `if not count:` treats `count == 0` like 'missing'; if `0` is a legitimate value, test `if count is None:` instead. Likewise distinguish `''`/`[]` from `None` when absence and emptiness mean different things.\n\n" +
      "**Interview tip:** list the falsy set (None, False, numeric zeros, empties) and state 'everything else is truthy.' The high-value insight is the `0`/`''`-vs-`None` trap — using `if not x:` when `0` or empty is valid is a real, common bug; use `is None` there.",
    examples: [
      {
        label: "The falsy set, and the 0-vs-None trap",
        tech: "python",
        code:
          "falsy = [None, False, 0, 0.0, \"\", [], {}, set(), range(0)]\n" +
          "print(\"all falsy?\", all(not bool(x) for x in falsy))\n\n" +
          "truthy = [1, -1, \"0\", [0], {\"a\": 1}, \" \"]\n" +
          "print(\"all truthy?\", all(bool(x) for x in truthy))\n\n" +
          "# Custom truthiness via __len__\n" +
          "class Bag:\n" +
          "    def __init__(self, items): self.items = items\n" +
          "    def __len__(self): return len(self.items)\n\n" +
          "print(\"empty Bag truthy?\", bool(Bag([])))\n\n" +
          "# The trap: 0 is a VALID value but falsy\n" +
          "def describe(count):\n" +
          "    if count is None:        # right: distinguishes missing from zero\n" +
          "        return \"unknown\"\n" +
          "    return f\"{count} items\"\n\n" +
          "print(describe(0), \"|\", describe(None))",
      },
    ],
  },
  {
    title: "How does functools.lru_cache work?",
    answer:
      "**`@functools.lru_cache(maxsize=N)`** wraps a function with a **memoization** cache: it stores return values keyed by the call's arguments, so a repeat call with the same arguments returns the cached result instead of recomputing. **LRU** = Least Recently Used: when the cache is full (`maxsize` entries), the least-recently-used entry is evicted to make room. `maxsize=None` (or `@functools.cache`, 3.9+) means an **unbounded** cache that never evicts.\n\n" +
      "Mechanics and constraints:\n\n" +
      "- **Arguments must be hashable** (they form the dict key), so it works for `(int, str, tuple)` args but not `list`/`dict` args.\n" +
      "- It introspects via **`.cache_info()`** (hits, misses, size) and resets with **`.cache_clear()`**.\n" +
      "- It only makes sense for **pure** functions (same input → same output, no side effects); caching an impure or time-dependent function returns stale results.\n\n" +
      "The headline use is collapsing expensive or exponential recomputation — memoized recursion (Fibonacci, edit distance) goes from exponential to linear; repeated expensive lookups become instant.\n\n" +
      "**Interview tip:** define LRU eviction precisely, note **arguments must be hashable**, mention `.cache_info()`/`maxsize=None`/`@cache`, and stress it's only safe for **pure** functions. The Fibonacci exponential→linear story is the canonical demonstration.",
    examples: [
      {
        label: "Cache hits/misses and LRU eviction with a small maxsize",
        tech: "python",
        code:
          "from functools import lru_cache\n\n" +
          "calls = 0\n\n" +
          "@lru_cache(maxsize=2)          # holds only 2 entries\n" +
          "def square(n):\n" +
          "    global calls\n" +
          "    calls += 1                 # counts ACTUAL computations\n" +
          "    return n * n\n\n" +
          "square(1); square(2)\n" +
          "square(1)                      # cache hit -> no compute\n" +
          "print(\"after 1,2,1:\", square.cache_info(), \"computes:\", calls)\n\n" +
          "square(3)                      # evicts least-recently-used (2)\n" +
          "square(2)                      # recompute -> 2 was evicted\n" +
          "print(\"after 3,2  :\", square.cache_info(), \"computes:\", calls)\n\n" +
          "square.cache_clear()\n" +
          "print(\"after clear:\", square.cache_info())",
      },
    ],
  },
];

export default augments;
