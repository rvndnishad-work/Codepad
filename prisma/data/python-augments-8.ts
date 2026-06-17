import type { PythonAugment } from "./python-augments.types";

/**
 * Python augments — batch 8 (control flow & modern features, Q15-25 of
 * curated/python-4.json: slicing, match/case, decorator factory, exception
 * propagation, comparison chaining, del/__del__/gc, weakref, generator vs
 * coroutine, reduce). Answer + theme-aware inline SVG + "**Interview tip:**" +
 * runnable example.
 */
const augments: PythonAugment[] = [
  {
    title: "How does slicing with start:stop:step work?",
    answer:
      "`seq[start:stop:step]` returns a **new** subsequence. The range is **half-open** — it includes `start` but **excludes `stop`** — and `step` picks every *n*-th element (default 1). All three parts are optional and have sensible defaults:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='Indices and slice boundaries over a sequence, half-open with negative indices'>" +
      "<rect class='d-box' x='30' y='40' width='56' height='36'/><text class='d-text' x='58' y='63' text-anchor='middle'>P</text>" +
      "<rect class='d-box-accent' x='86' y='40' width='56' height='36'/><text class='d-text' x='114' y='63' text-anchor='middle'>y</text>" +
      "<rect class='d-box-accent' x='142' y='40' width='56' height='36'/><text class='d-text' x='170' y='63' text-anchor='middle'>t</text>" +
      "<rect class='d-box-accent' x='198' y='40' width='56' height='36'/><text class='d-text' x='226' y='63' text-anchor='middle'>h</text>" +
      "<rect class='d-box' x='254' y='40' width='56' height='36'/><text class='d-text' x='282' y='63' text-anchor='middle'>o</text>" +
      "<rect class='d-box' x='310' y='40' width='56' height='36'/><text class='d-text' x='338' y='63' text-anchor='middle'>n</text>" +
      "<text class='d-sub' x='58' y='30' text-anchor='middle'>0</text><text class='d-sub' x='114' y='30' text-anchor='middle'>1</text><text class='d-sub' x='170' y='30' text-anchor='middle'>2</text><text class='d-sub' x='226' y='30' text-anchor='middle'>3</text><text class='d-sub' x='282' y='30' text-anchor='middle'>4</text><text class='d-sub' x='338' y='30' text-anchor='middle'>5</text>" +
      "<text class='d-sub' x='58' y='98' text-anchor='middle'>-6</text><text class='d-sub' x='338' y='98' text-anchor='middle'>-1</text>" +
      "<text class='d-accent d-sub' x='180' y='128' text-anchor='middle'>'Python'[1:4] &#8594; 'yth'  (start 1 .. stop 4 exclusive)</text>" +
      "</svg>\n\n" +
      "Highlights: **negative indices** count from the end (`s[-1]` is the last item, `s[:-1]` drops it); a **negative step** reverses (`s[::-1]`); omitted parts mean 'from the start' / 'to the end'. Slicing **never raises** on out-of-range bounds — it clamps. On lists/strings/tuples it returns a copy; you can also **assign** to a slice (`lst[1:3] = [...]`) to replace a region. Slice objects (`slice(1, 4)`) can be reused.\n\n" +
      "**Interview tip:** stress **half-open `[start, stop)`** and the idioms — `s[::-1]` reverse, `s[-n:]` last n, `s[:]` shallow copy — plus that slicing **clamps instead of erroring**. Knowing slice assignment and `step` reversal shows fluency.",
    examples: [
      {
        label: "Half-open ranges, negatives, step and reverse",
        tech: "python",
        code:
          "s = \"Python\"\n" +
          "print(\"[1:4]   :\", s[1:4])      # 'yth' (4 excluded)\n" +
          "print(\"[:3]    :\", s[:3])       # from start\n" +
          "print(\"[3:]    :\", s[3:])       # to end\n" +
          "print(\"[-2:]   :\", s[-2:])      # last two\n" +
          "print(\"[::2]   :\", s[::2])      # every 2nd\n" +
          "print(\"[::-1]  :\", s[::-1])     # reversed\n" +
          "print(\"clamps  :\", s[2:999])    # no IndexError\n\n" +
          "# Slice assignment replaces a region of a list\n" +
          "nums = [0, 1, 2, 3, 4]\n" +
          "nums[1:3] = [10, 20, 30]\n" +
          "print(\"slice-assign:\", nums)",
      },
    ],
  },
  {
    title: "What is structural pattern matching (match/case)?",
    answer:
      "`match`/`case` (Python **3.10+**) compares a subject against a series of **structural patterns**, executing the first that matches and **binding variables** from the matched shape. It's far more than a C-style `switch` (which only compares values) — it destructures **sequences, mappings, and class instances**:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 160' role='img' aria-label='match subject tested top-down against patterns until one matches'>" +
      "<defs><marker id='py-mt-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='180' y='10' width='120' height='34' rx='8'/><text class='d-text' x='240' y='32' text-anchor='middle'>match subject</text>" +
      "<rect class='d-box' x='30' y='66' width='130' height='34' rx='6'/><text class='d-sub' x='95' y='87' text-anchor='middle'>case Point(x, 0)</text>" +
      "<rect class='d-box' x='175' y='66' width='130' height='34' rx='6'/><text class='d-sub' x='240' y='87' text-anchor='middle'>case [a, *rest]</text>" +
      "<rect class='d-box' x='320' y='66' width='130' height='34' rx='6'/><text class='d-sub' x='385' y='87' text-anchor='middle'>case {'id': v}</text>" +
      "<rect class='d-box-muted' x='175' y='118' width='130' height='32' rx='6'/><text class='d-sub' x='240' y='138' text-anchor='middle'>case _  (default)</text>" +
      "<line class='d-edge' x1='210' y1='44' x2='110' y2='64' marker-end='url(#py-mt-ar)'/>" +
      "<line class='d-edge' x1='240' y1='44' x2='240' y2='64' marker-end='url(#py-mt-ar)'/>" +
      "<line class='d-edge' x1='270' y1='44' x2='370' y2='64' marker-end='url(#py-mt-ar)'/>" +
      "<line class='d-edge' x1='240' y1='100' x2='240' y2='116' marker-end='url(#py-mt-ar)'/>" +
      "</svg>\n\n" +
      "Pattern kinds: **literals** (`case 200:`), **capture** (`case x:` binds), **sequence** (`case [a, b, *rest]`), **mapping** (`case {\"type\": t}`), **class** (`case Point(x=0)`), **OR** (`case 401 | 403:`), with optional **guards** (`case n if n > 0:`) and `_` as the wildcard. A name like `Color.RED` (a dotted constant) is matched as a value, while a bare name **captures**. It shines for parsing ASTs, handling tagged/JSON-like data, and command dispatch.\n\n" +
      "**Interview tip:** 'it's *structural* — destructures and binds from sequences/maps/classes, not just value equality.' Mention guards (`case n if ...`), OR-patterns, the `_` wildcard, and the capture-vs-dotted-constant rule — the detail that trips people up.",
    examples: [
      {
        label: "Destructure different shapes with one match",
        tech: "python",
        code:
          "def describe(event):\n" +
          "    match event:\n" +
          "        case {\"type\": \"click\", \"x\": x, \"y\": y}:   # mapping\n" +
          "            return f\"click at ({x}, {y})\"\n" +
          "        case [\"move\", *steps]:                      # sequence\n" +
          "            return f\"move with {len(steps)} steps\"\n" +
          "        case int(n) if n < 0:                       # class + guard\n" +
          "            return f\"negative number {n}\"\n" +
          "        case _:\n" +
          "            return \"unknown\"\n\n" +
          "print(describe({\"type\": \"click\", \"x\": 3, \"y\": 9}))\n" +
          "print(describe([\"move\", 1, 2, 3]))\n" +
          "print(describe(-5))\n" +
          "print(describe(\"???\"))",
      },
    ],
  },
  {
    title: "What is a decorator factory (a decorator with arguments)?",
    answer:
      "A normal decorator is a function that takes a function and returns a wrapper. To make a decorator **configurable** — `@repeat(3)` — you add one more layer: an outer function that **takes the arguments** and **returns a decorator**. So it's **three nested callables**:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='Decorator factory: outer takes args, returns decorator, returns wrapper'>" +
      "<defs><marker id='py-df-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='10' y='52' width='140' height='48' rx='8'/><text class='d-text' x='80' y='72' text-anchor='middle'>repeat(n)</text><text class='d-sub' x='80' y='88' text-anchor='middle'>takes ARGS</text>" +
      "<rect class='d-box' x='185' y='52' width='140' height='48' rx='8'/><text class='d-text' x='255' y='72' text-anchor='middle'>decorator(func)</text><text class='d-sub' x='255' y='88' text-anchor='middle'>takes FUNCTION</text>" +
      "<rect class='d-box' x='360' y='52' width='130' height='48' rx='8'/><text class='d-text' x='425' y='72' text-anchor='middle'>wrapper(*a)</text><text class='d-sub' x='425' y='88' text-anchor='middle'>takes CALL ARGS</text>" +
      "<line class='d-edge-accent' x1='150' y1='76' x2='183' y2='76' marker-end='url(#py-df-ar)'/><text class='d-sub' x='166' y='44' text-anchor='middle'>returns</text>" +
      "<line class='d-edge' x1='325' y1='76' x2='358' y2='76' marker-end='url(#py-df-ar)'/><text class='d-sub' x='341' y='44' text-anchor='middle'>returns</text>" +
      "<text class='d-sub' x='250' y='130' text-anchor='middle'>@repeat(3) == func = repeat(3)(func)</text>" +
      "</svg>\n\n" +
      "`@repeat(3)` first **calls** `repeat(3)`, which returns the real decorator; that decorator then wraps your function. Always put **`@functools.wraps(func)`** on the innermost wrapper to preserve metadata. A common nicety is making the argument **optional** (usable as both `@deco` and `@deco(opt=...)`) by checking whether the first argument is the function itself. This three-layer shape underpins `@app.route(\"/path\")`, `@retry(times=3)`, `@lru_cache(maxsize=128)`, etc.\n\n" +
      "**Interview tip:** 'add a layer — a function returning a decorator returning a wrapper; `@repeat(3)` is `repeat(3)(func)`.' Be ready to write all three `def`s live, remember `@wraps`, and mention frameworks (`@app.route`) as the everyday example.",
    examples: [
      {
        label: "@repeat(n) — three layers in action",
        tech: "python",
        code:
          "import functools\n\n" +
          "def repeat(n):                       # layer 1: takes the argument\n" +
          "    def decorator(func):             # layer 2: takes the function\n" +
          "        @functools.wraps(func)\n" +
          "        def wrapper(*args, **kwargs): # layer 3: takes call args\n" +
          "            result = None\n" +
          "            for _ in range(n):\n" +
          "                result = func(*args, **kwargs)\n" +
          "            return result\n" +
          "        return wrapper\n" +
          "    return decorator\n\n" +
          "@repeat(3)\n" +
          "def greet(name):\n" +
          "    print(f\"hi {name}\")\n" +
          "    return name\n\n" +
          "last = greet(\"Ada\")                   # runs 3 times\n" +
          "print(\"returned:\", last, \"| name kept:\", greet.__name__)",
      },
    ],
  },
  {
    title: "How does exception propagation work up the call stack?",
    answer:
      "When code `raise`s and the current function has no matching `except`, Python **unwinds the call stack**: it abandons the current frame and looks for a handler in the **caller**, then *its* caller, and so on. As each frame is unwound, its **`finally`** blocks and context-manager `__exit__`s **still run** (for cleanup). If no frame handles it, the exception reaches the top and the program **terminates** with a traceback:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 460 200' role='img' aria-label='Exception raised in inner frame propagates up to a handler'>" +
      "<defs><marker id='py-ep-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='150' y='150' width='160' height='38' rx='8'/><text class='d-text' x='230' y='170' text-anchor='middle'>inner()  raise</text><text class='d-sub' x='230' y='183' text-anchor='middle'>no handler</text>" +
      "<rect class='d-box' x='150' y='96' width='160' height='38' rx='8'/><text class='d-text' x='230' y='116' text-anchor='middle'>middle()</text><text class='d-sub' x='230' y='129' text-anchor='middle'>finally runs, no except</text>" +
      "<rect class='d-box' x='150' y='42' width='160' height='38' rx='8'/><text class='d-text' x='230' y='62' text-anchor='middle'>outer()  try/except</text><text class='d-sub' x='230' y='75' text-anchor='middle'>HANDLES it</text>" +
      "<line class='d-edge-accent' x1='230' y1='148' x2='230' y2='136' marker-end='url(#py-ep-ar)'/>" +
      "<line class='d-edge-accent' x1='230' y1='94' x2='230' y2='82' marker-end='url(#py-ep-ar)'/>" +
      "<text class='d-accent d-sub' x='360' y='120' text-anchor='middle'>unwinds</text><text class='d-accent d-sub' x='360' y='136' text-anchor='middle'>upward</text>" +
      "<text class='d-sub' x='230' y='24' text-anchor='middle'>caught &#8594; stack stops unwinding here</text>" +
      "</svg>\n\n" +
      "The traceback you see is literally this chain of frames (innermost-last). A handler can **re-raise** with a bare `raise` (preserving the original traceback) or wrap-and-chain with `raise New() from err`. Catch at the level that can actually **do something** about the error — swallowing exceptions too early (or with a bare `except:`) hides bugs.\n\n" +
      "**Interview tip:** 'unwinds frame by frame until a matching `except`, running `finally`/`__exit__` on the way, else crashes with a traceback.' The judgment point — *handle where you can act, re-raise otherwise* — and that `finally` runs during unwinding are what they're after.",
    examples: [
      {
        label: "Watch it unwind through finally to a handler",
        tech: "python",
        code:
          "def inner():\n" +
          "    raise ValueError(\"boom in inner\")\n\n" +
          "def middle():\n" +
          "    try:\n" +
          "        inner()\n" +
          "    finally:\n" +
          "        print(\"  middle finally (cleanup runs during unwind)\")\n\n" +
          "def outer():\n" +
          "    try:\n" +
          "        middle()\n" +
          "    except ValueError as e:\n" +
          "        print(\"  outer caught:\", e)\n\n" +
          "outer()\n" +
          "print(\"program continues normally\")",
      },
    ],
  },
  {
    title: "How does comparison chaining (a < b < c) work?",
    answer:
      "Python lets you **chain** comparison operators the way math does: `a < b < c` means '`a < b` **and** `b < c`'. It is **not** `(a < b) < c` (which would compare a boolean to `c`). The interpreter expands `a OP1 b OP2 c` into `(a OP1 b) and (b OP2 c)`, evaluating each operand **once** and **short-circuiting** like `and`:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 130' role='img' aria-label='a < b < c expands to a<b and b<c with b evaluated once'>" +
      "<defs><marker id='py-cc-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='160' y='14' width='160' height='34' rx='8'/><text class='d-text' x='240' y='36' text-anchor='middle'>a &lt; b &lt; c</text>" +
      "<rect class='d-box' x='40' y='78' width='170' height='34' rx='8'/><text class='d-text' x='125' y='100' text-anchor='middle'>a &lt; b</text>" +
      "<rect class='d-box' x='270' y='78' width='170' height='34' rx='8'/><text class='d-text' x='355' y='100' text-anchor='middle'>b &lt; c</text>" +
      "<line class='d-edge' x1='210' y1='44' x2='130' y2='76' marker-end='url(#py-cc-ar)'/>" +
      "<line class='d-edge' x1='270' y1='44' x2='350' y2='76' marker-end='url(#py-cc-ar)'/>" +
      "<text class='d-accent d-sub' x='240' y='100' text-anchor='middle'>and</text>" +
      "<text class='d-sub' x='240' y='126' text-anchor='middle'>b evaluated once; stops early if a &lt; b is False</text>" +
      "</svg>\n\n" +
      "This makes **range checks** read naturally (`0 <= i < len(x)`), and the **single evaluation of the middle operand** matters if it has side effects (e.g. `lo < next(it) < hi` calls `next` once). You can chain any comparison operators, even mixed and with `==`/`is` (`a is b is c`) — though long mixed chains hurt readability.\n\n" +
      "**Interview tip:** '`a < b < c` is `a < b and b < c`, *not* `(a<b)<c`, with the middle operand evaluated once and short-circuiting.' The 'evaluated once' point (side-effecting middle expression) is the subtle detail interviewers reward.",
    examples: [
      {
        label: "Chaining vs the wrong grouping; single evaluation",
        tech: "python",
        code:
          "x = 5\n" +
          "print(\"0 < x < 10 :\", 0 < x < 10)        # natural range check\n" +
          "print(\"means      :\", (0 < x) and (x < 10))\n\n" +
          "# NOT the same as grouping left-to-right:\n" +
          "print(\"(0 < x) < 10:\", (0 < x) < 10)      # True < 10 -> 1 < 10 -> True (misleading)\n\n" +
          "# The middle operand is evaluated only ONCE\n" +
          "def side_effect():\n" +
          "    print(\"  called once\")\n" +
          "    return 7\n\n" +
          "print(\"result:\", 1 < side_effect() < 10)",
      },
    ],
  },
  {
    title: "What is the difference between del, __del__, and garbage collection?",
    answer:
      "Three distinct things people conflate:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 160' role='img' aria-label='del removes a name; refcount drops; GC reclaims and runs __del__'>" +
      "<defs><marker id='py-del-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='10' y='58' width='120' height='46' rx='8'/><text class='d-text' x='70' y='78' text-anchor='middle'>del x</text><text class='d-sub' x='70' y='94' text-anchor='middle'>removes a NAME</text>" +
      "<rect class='d-box-muted' x='170' y='58' width='130' height='46' rx='8'/><text class='d-text' x='235' y='78' text-anchor='middle'>refcount -&gt; 0</text><text class='d-sub' x='235' y='94' text-anchor='middle'>unreachable</text>" +
      "<rect class='d-box-accent' x='340' y='58' width='150' height='46' rx='8'/><text class='d-text' x='415' y='74' text-anchor='middle'>reclaimed</text><text class='d-sub' x='415' y='90' text-anchor='middle'>__del__ finalizer runs</text>" +
      "<line class='d-edge' x1='130' y1='81' x2='168' y2='81' marker-end='url(#py-del-ar)'/>" +
      "<line class='d-edge' x1='300' y1='81' x2='338' y2='81' marker-end='url(#py-del-ar)'/>" +
      "<text class='d-sub' x='250' y='140' text-anchor='middle'>cycles aren't freed by refcount alone &#8594; the cyclic GC handles them</text>" +
      "</svg>\n\n" +
      "- **`del x`** just **unbinds the name** `x` (and decrements the object's refcount). It does **not** directly free memory — if other references remain, the object lives on.\n" +
      "- **`__del__`** is a **finalizer** method run *when the object is actually reclaimed* (a hook for cleanup). Its timing is **not guaranteed** (especially in cycles), so prefer `with`/context managers for deterministic cleanup; avoid relying on `__del__`.\n" +
      "- **Garbage collection** is what **frees** objects: refcounting frees them immediately when the count hits zero, and the **cyclic GC** (`gc` module) reclaims unreachable reference cycles refcounting can't.\n\n" +
      "**Interview tip:** the clean split is **`del` = drop a name, `__del__` = finalizer at reclamation (unreliable timing), GC = actually frees memory (refcount + cycle collector)**. The senior note: don't use `__del__` for important cleanup — use context managers.",
    examples: [
      {
        label: "del drops a name; __del__ fires on reclamation",
        tech: "python",
        code:
          "import sys\n\n" +
          "class Resource:\n" +
          "    def __init__(self, name): self.name = name\n" +
          "    def __del__(self):\n" +
          "        print(f\"  __del__: releasing {self.name}\")\n\n" +
          "r = Resource(\"file\")\n" +
          "alias = r\n" +
          "print(\"refcount ~\", sys.getrefcount(r) - 1)\n\n" +
          "del r                      # removes the name 'r' only...\n" +
          "print(\"after del r: object still alive (alias holds it)\")\n" +
          "del alias                  # last reference gone -> reclaimed now\n" +
          "print(\"done\")",
      },
    ],
  },
  {
    title: "What is a weak reference in Python?",
    answer:
      "A **weak reference** (`weakref`) points to an object **without** increasing its reference count — so it does **not keep the object alive**. When the last *strong* reference disappears, the object is collected even though weak references still 'point' at it; those weakrefs then return **`None`** (or fire a callback):\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 160' role='img' aria-label='Strong reference keeps object alive; weak reference does not'>" +
      "<defs><marker id='py-wr-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='20' y='30' width='110' height='38' rx='8'/><text class='d-text' x='75' y='54' text-anchor='middle'>strong ref</text>" +
      "<rect class='d-box-muted' x='20' y='100' width='110' height='38' rx='8'/><text class='d-text' x='75' y='124' text-anchor='middle'>weak ref</text>" +
      "<rect class='d-box-accent' x='300' y='62' width='150' height='44' rx='8'/><text class='d-text' x='375' y='82' text-anchor='middle'>object</text><text class='d-sub' x='375' y='98' text-anchor='middle'>refcount counts STRONG only</text>" +
      "<line class='d-edge-accent' x1='130' y1='50' x2='298' y2='76' marker-end='url(#py-wr-ar)'/><text class='d-sub' x='210' y='48' text-anchor='middle'>keeps alive</text>" +
      "<line class='d-edge-dashed' x1='130' y1='120' x2='298' y2='94' marker-end='url(#py-wr-ar)'/><text class='d-sub' x='210' y='134' text-anchor='middle'>does NOT keep alive</text>" +
      "</svg>\n\n" +
      "Why it matters: it lets you **reference without owning**, avoiding memory leaks in **caches** (don't keep an entry alive just because the cache holds it), **observer/callback** registries, parent/back-pointers (break cycles), and big-object pools. The toolkit: `weakref.ref(obj)` (call it to deref), `WeakValueDictionary`/`WeakKeyDictionary` (entries vanish when the value/key dies), and `weakref.finalize`. Note: not every type is weak-referenceable (e.g. plain `int`, `tuple`, and `__slots__` classes without `__weakref__`).\n\n" +
      "**Interview tip:** 'a reference that doesn't bump the refcount, so it won't keep the object alive — returns `None` after collection.' Name the use cases (caches, observers, breaking cycles) and `WeakValueDictionary`; that's the practical payoff.",
    examples: [
      {
        label: "A weakref goes dead when the strong ref is gone",
        tech: "python",
        code:
          "import weakref\n\n" +
          "class Node:\n" +
          "    def __init__(self, name): self.name = name\n" +
          "    def __repr__(self): return f\"Node({self.name})\"\n\n" +
          "obj = Node(\"A\")\n" +
          "ref = weakref.ref(obj)            # does NOT keep obj alive\n\n" +
          "print(\"deref while alive:\", ref())\n\n" +
          "del obj                          # last STRONG reference gone\n" +
          "print(\"deref after del :\", ref())   # -> None\n\n" +
          "# WeakValueDictionary: entries disappear with their values\n" +
          "cache = weakref.WeakValueDictionary()\n" +
          "keep = Node(\"B\")\n" +
          "cache[\"b\"] = keep\n" +
          "print(\"in cache:\", list(cache.keys()))\n" +
          "del keep\n" +
          "print(\"after value freed:\", list(cache.keys()))",
      },
    ],
  },
  {
    title: "What is the difference between a generator and a coroutine?",
    answer:
      "They share machinery (both suspend and resume) but have **opposite purposes** and **different drivers**:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='Generator driven by next produces values; coroutine driven by event loop awaits'>" +
      "<defs><marker id='py-gc-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-muted' x='20' y='20' width='130' height='40' rx='8'/><text class='d-text' x='85' y='40' text-anchor='middle'>for / next()</text><text class='d-sub' x='85' y='54' text-anchor='middle'>caller drives</text>" +
      "<rect class='d-box-accent' x='220' y='20' width='150' height='40' rx='8'/><text class='d-text' x='295' y='40' text-anchor='middle'>generator</text><text class='d-sub' x='295' y='54' text-anchor='middle'>yield &#8594; produces values</text>" +
      "<line class='d-edge' x1='150' y1='40' x2='218' y2='40' marker-end='url(#py-gc-ar)'/>" +
      "<rect class='d-box-muted' x='20' y='96' width='130' height='40' rx='8'/><text class='d-text' x='85' y='116' text-anchor='middle'>event loop</text><text class='d-sub' x='85' y='130' text-anchor='middle'>scheduler drives</text>" +
      "<rect class='d-box-accent' x='220' y='96' width='150' height='40' rx='8'/><text class='d-text' x='295' y='116' text-anchor='middle'>coroutine</text><text class='d-sub' x='295' y='130' text-anchor='middle'>await &#8594; suspends on I/O</text>" +
      "<line class='d-edge' x1='150' y1='116' x2='218' y2='116' marker-end='url(#py-gc-ar)'/>" +
      "</svg>\n\n" +
      "- A **generator** (`def` + `yield`) is built to **produce a stream of values** for iteration; you drive it with `next()`/`for`. It's about **data**.\n" +
      "- A **native coroutine** (`async def`, driven by `await`) is built to **wait on I/O cooperatively**; you drive it with an **event loop** (`asyncio.run`), not `next()`. It's about **concurrency**.\n\n" +
      "Historically the line was blurry — `yield`-based generators were used *as* coroutines (`@asyncio.coroutine`, `send()`), which is why they share internals. Modern code keeps them separate: `yield` for lazy iteration, `async`/`await` for async I/O. (`await` on a coroutine returns its result; `for`/`next` on a generator yields successive values.)\n\n" +
      "**Interview tip:** 'generator = produce values, driven by `next()`/`for` (data); coroutine = await I/O, driven by an event loop (concurrency).' Acknowledging they share suspend/resume machinery (and the old generator-as-coroutine history) shows you know *why* people confuse them.",
    examples: [
      {
        label: "Generator pulled with next; coroutine run by a loop",
        tech: "python",
        code:
          "import asyncio\n\n" +
          "# Generator: PRODUCES values, you pull them\n" +
          "def squares(n):\n" +
          "    for i in range(n):\n" +
          "        yield i * i\n\n" +
          "print(\"generator:\", list(squares(4)))\n\n" +
          "# Coroutine: AWAITS, the event loop drives it\n" +
          "async def fetch():\n" +
          "    await asyncio.sleep(0.01)     # suspend cooperatively\n" +
          "    return \"data\"\n\n" +
          "print(\"coroutine object:\", type(fetch()).__name__)\n" +
          "print(\"awaited result :\", asyncio.run(fetch()))",
      },
    ],
  },
  {
    title: "How does functools.reduce fold a sequence?",
    answer:
      "**`reduce(func, iterable, [initial])`** collapses a sequence into **one value** by repeatedly applying a **two-argument** function, carrying an **accumulator** left to right. Each step combines the running result with the next item:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 140' role='img' aria-label='reduce folding [1,2,3,4] with addition into 10'>" +
      "<defs><marker id='py-rd-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-muted' x='10' y='50' width='60' height='34' rx='6'/><text class='d-text' x='40' y='72' text-anchor='middle'>0</text>" +
      "<rect class='d-box-accent' x='110' y='50' width='60' height='34' rx='6'/><text class='d-text' x='140' y='72' text-anchor='middle'>1</text>" +
      "<rect class='d-box-accent' x='210' y='50' width='60' height='34' rx='6'/><text class='d-text' x='240' y='72' text-anchor='middle'>3</text>" +
      "<rect class='d-box-accent' x='310' y='50' width='60' height='34' rx='6'/><text class='d-text' x='340' y='72' text-anchor='middle'>6</text>" +
      "<rect class='d-box' x='410' y='50' width='70' height='34' rx='6'/><text class='d-text' x='445' y='72' text-anchor='middle'>10</text>" +
      "<line class='d-edge-accent' x1='70' y1='67' x2='108' y2='67' marker-end='url(#py-rd-ar)'/><text class='d-sub' x='89' y='44' text-anchor='middle'>+1</text>" +
      "<line class='d-edge-accent' x1='170' y1='67' x2='208' y2='67' marker-end='url(#py-rd-ar)'/><text class='d-sub' x='189' y='44' text-anchor='middle'>+2</text>" +
      "<line class='d-edge-accent' x1='270' y1='67' x2='308' y2='67' marker-end='url(#py-rd-ar)'/><text class='d-sub' x='289' y='44' text-anchor='middle'>+3</text>" +
      "<line class='d-edge-accent' x1='370' y1='67' x2='408' y2='67' marker-end='url(#py-rd-ar)'/><text class='d-sub' x='389' y='44' text-anchor='middle'>+4</text>" +
      "<text class='d-sub' x='250' y='118' text-anchor='middle'>reduce(add, [1,2,3,4], 0) &#8594; ((((0+1)+2)+3)+4) = 10</text>" +
      "</svg>\n\n" +
      "An explicit **`initial`** seeds the accumulator (and is the result for an empty iterable, avoiding an error). `reduce` lives in **`functools`** (Guido moved it out of builtins because explicit loops or specialized builtins are usually clearer). Indeed, prefer `sum`, `math.prod`, `max`, `min`, or `str.join` when they fit — reach for `reduce` only for a genuinely custom fold (e.g. composing functions, merging dicts).\n\n" +
      "**Interview tip:** 'left-to-right fold with an accumulator into a single value; supply `initial` for safety/empty inputs.' The mature take is *prefer a builtin (`sum`/`max`/`prod`) or a plain loop* — name `reduce` for custom folds only. That's the answer the GvR-era design implies.",
    examples: [
      {
        label: "reduce vs the builtins that usually beat it",
        tech: "python",
        code:
          "from functools import reduce\n\n" +
          "nums = [1, 2, 3, 4, 5]\n\n" +
          "print(\"product:\", reduce(lambda acc, x: acc * x, nums, 1))\n" +
          "print(\"max    :\", reduce(lambda a, b: a if a > b else b, nums))\n\n" +
          "# initial seeds the accumulator AND handles the empty case safely\n" +
          "print(\"empty sum:\", reduce(lambda a, b: a + b, [], 0))\n\n" +
          "# A real custom fold: merge a list of dicts\n" +
          "dicts = [{\"a\": 1}, {\"b\": 2}, {\"a\": 3}]\n" +
          "merged = reduce(lambda acc, d: {**acc, **d}, dicts, {})\n" +
          "print(\"merged:\", merged)\n\n" +
          "# ...but prefer builtins when they fit:\n" +
          "print(\"sum builtin:\", sum(nums))",
      },
    ],
  },
];

export default augments;
