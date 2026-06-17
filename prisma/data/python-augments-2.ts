import type { PythonAugment } from "./python-augments.types";

/**
 * Python augments — batch 2 (questions 1-15 of curated/python-2.json).
 * Same conventions as batch 1: expanded answer ending in "**Interview tip:**"
 * plus runnable, output-printing Python examples (tech 'python').
 */
const augments: PythonAugment[] = [
  {
    title: "What do enumerate and zip do?",
    answer:
      "Two iteration helpers that replace clumsy index bookkeeping:\n\n" +
      "- **`enumerate(iterable, start=0)`** yields `(index, item)` pairs, so you get a running counter without `range(len(...))` and manual indexing. The `start` argument lets you begin at 1 (or anywhere).\n" +
      "- **`zip(a, b, ...)`** pairs items from several iterables element-wise into tuples, **stopping at the shortest** input. It's the idiomatic way to iterate two lists in lockstep or to build a dict from keys+values (`dict(zip(keys, values))`).\n\n" +
      "Both are **lazy** (they return iterators, not lists). `zip` has a neat inverse — `zip(*matrix)` **transposes** rows to columns. Use `itertools.zip_longest` when you *don't* want to truncate at the shortest, and `strict=True` (3.10+) to raise if lengths differ.\n\n" +
      "**Interview tip:** the giveaway of a non-Pythonic loop is `for i in range(len(xs)): xs[i]` — replace it with `enumerate`. For parallel lists, `zip`. Bonus points for `zip(*rows)` as the transpose trick and knowing `zip` stops at the shortest.",
    examples: [
      {
        label: "enumerate, zip lockstep, dict(zip(...)) and transpose",
        tech: "python",
        code:
          "names = [\"Ann\", \"Bob\", \"Cy\"]\n" +
          "scores = [91, 85, 78]\n\n" +
          "# enumerate: index + item, starting at 1\n" +
          "for rank, name in enumerate(names, start=1):\n" +
          "    print(f\"{rank}. {name}\")\n\n" +
          "# zip: walk two lists together (stops at shortest)\n" +
          "for name, score in zip(names, scores):\n" +
          "    print(f\"{name}: {score}\")\n\n" +
          "# Build a dict from keys + values\n" +
          "print(\"dict:\", dict(zip(names, scores)))\n\n" +
          "# zip(*rows) transposes a matrix\n" +
          "matrix = [(1, 2, 3), (4, 5, 6)]\n" +
          "print(\"transpose:\", list(zip(*matrix)))",
      },
    ],
  },
  {
    title: "What is the difference between classmethod and staticmethod?",
    answer:
      "All three method kinds live on a class but receive different first arguments:\n\n" +
      "| Decorator | First arg | Sees the class? | Typical use |\n" +
      "|---|---|---|---|\n" +
      "| (regular) | `self` (instance) | via `type(self)` | normal behavior on an instance |\n" +
      "| `@classmethod` | `cls` (the class) | yes | **alternative constructors**, factory methods, class-level state |\n" +
      "| `@staticmethod` | none | no | a plain utility logically grouped on the class |\n\n" +
      "A **classmethod** receives the class, so it can construct instances (`return cls(...)`) and, crucially, **respects subclasses** — `Subclass.from_string(...)` builds a `Subclass`. That's why `dict.fromkeys`, `datetime.now`, etc. are classmethods.\n\n" +
      "A **staticmethod** gets neither `self` nor `cls`; it's just a function namespaced under the class for organization. If it never touches instance or class state, it's a staticmethod (or arguably a module function).\n\n" +
      "**Interview tip:** the standout point is that `@classmethod` enables **alternative constructors that work polymorphically with subclasses** (`cls(...)`), whereas `@staticmethod` is just organizational. Give `from_string`/`from_dict` as the classic classmethod example.",
    examples: [
      {
        label: "classmethod as a subclass-aware factory; staticmethod utility",
        tech: "python",
        code:
          "class Temperature:\n" +
          "    def __init__(self, celsius):\n" +
          "        self.celsius = celsius\n\n" +
          "    @classmethod\n" +
          "    def from_fahrenheit(cls, f):\n" +
          "        # cls means subclasses build the right type\n" +
          "        return cls((f - 32) * 5 / 9)\n\n" +
          "    @staticmethod\n" +
          "    def is_freezing(celsius):\n" +
          "        return celsius <= 0\n\n" +
          "    def __repr__(self):\n" +
          "        return f\"{type(self).__name__}({self.celsius:.1f}C)\"\n\n" +
          "class Kelvinish(Temperature):\n" +
          "    pass\n\n" +
          "print(\"factory:\", Temperature.from_fahrenheit(98.6))\n" +
          "print(\"subclass factory:\", Kelvinish.from_fahrenheit(32))  # -> Kelvinish\n" +
          "print(\"static util:\", Temperature.is_freezing(-4))",
      },
    ],
  },
  {
    title: "What is the difference between __new__ and __init__?",
    answer:
      "They're two phases of object creation. When you call `MyClass(...)`:\n\n" +
      "1. **`__new__(cls, ...)`** runs first — it **creates and returns** the new instance (usually via `super().__new__(cls)`). It's a static method receiving the *class*.\n" +
      "2. **`__init__(self, ...)`** runs second — it **initializes** the already-created instance and returns `None`. It receives the *instance*.\n\n" +
      "Key rule: `__init__` only runs if `__new__` returned an **instance of `cls`**. You almost never override `__new__` — `__init__` is where 99% of setup goes. You *do* reach for `__new__` when you must control creation itself:\n\n" +
      "- Subclassing **immutable** types (`int`, `str`, `tuple`) — they're fixed by the time `__init__` runs, so you customize the value in `__new__`.\n" +
      "- Implementing **singletons**, object pools, or instance caching (return an existing object instead of a new one).\n" +
      "- Some metaclass / factory patterns.\n\n" +
      "**Interview tip:** 'allocate vs initialize' — `__new__` makes the object, `__init__` configures it. The interviewer wants you to know *when* `__new__` is needed: immutables and singletons. For normal classes, leave `__new__` alone.",
    examples: [
      {
        label: "__new__ runs first; using it for a singleton",
        tech: "python",
        code:
          "class Logger:\n" +
          "    _instance = None\n\n" +
          "    def __new__(cls):\n" +
          "        if cls._instance is None:\n" +
          "            print(\"  __new__: creating the one instance\")\n" +
          "            cls._instance = super().__new__(cls)\n" +
          "        return cls._instance\n\n" +
          "    def __init__(self):\n" +
          "        print(\"  __init__: runs every call\")\n\n" +
          "a = Logger()\n" +
          "b = Logger()\n" +
          "print(\"same object (singleton):\", a is b)",
      },
    ],
  },
  {
    title: "What is the @property decorator?",
    answer:
      "**`@property`** turns a method into a **managed attribute**: callers read `obj.area` (no parentheses) and the method runs behind the scenes. It lets you expose a clean attribute-style API while keeping logic — validation, computation, lazy evaluation — behind it. This is Python's answer to Java-style getters/setters: you start with a plain attribute and *upgrade* it to a property later **without changing the calling code**.\n\n" +
      "- A bare `@property` is **read-only** (computed each access).\n" +
      "- Add `@<name>.setter` to allow assignment with validation, and `@<name>.deleter` for `del`.\n\n" +
      "Use it for derived values (`full_name` from first+last), validated fields (reject a negative radius), and backward-compatible refactors. Don't hide expensive work behind something that *looks* like a cheap attribute access (use a method or cache it).\n\n" +
      "**Interview tip:** the winning framing is 'attribute syntax, method behavior — so you can add validation/computation without breaking the public API.' Show a setter that rejects bad input; that's the canonical use.",
    examples: [
      {
        label: "Computed property + validating setter",
        tech: "python",
        code:
          "class Circle:\n" +
          "    def __init__(self, radius):\n" +
          "        self.radius = radius          # goes through the setter\n\n" +
          "    @property\n" +
          "    def radius(self):\n" +
          "        return self._radius\n\n" +
          "    @radius.setter\n" +
          "    def radius(self, value):\n" +
          "        if value < 0:\n" +
          "            raise ValueError(\"radius must be non-negative\")\n" +
          "        self._radius = value\n\n" +
          "    @property\n" +
          "    def area(self):                    # read-only, computed\n" +
          "        return 3.14159 * self._radius ** 2\n\n" +
          "c = Circle(2)\n" +
          "print(\"area:\", round(c.area, 2))\n" +
          "c.radius = 5                            # setter runs\n" +
          "print(\"new area:\", round(c.area, 2))\n" +
          "try:\n" +
          "    c.radius = -1\n" +
          "except ValueError as e:\n" +
          "    print(\"rejected:\", e)",
      },
    ],
  },
  {
    title: "What is the Method Resolution Order (MRO)?",
    answer:
      "The **MRO** is the deterministic, linear order in which Python searches a class and its bases for an attribute/method. With multiple inheritance, 'which `foo` wins?' is answered by walking the MRO left-to-right and using the first match. You can inspect it via `Cls.__mro__` or `Cls.mro()`.\n\n" +
      "Python computes it with the **C3 linearization** algorithm, which guarantees: a class appears **before** its parents, left-to-right order among bases is preserved, and each class appears **once**. If a consistent order can't be built (contradictory base orderings), the class definition raises `TypeError`.\n\n" +
      "**`super()`** doesn't simply mean 'the parent' — it means 'the **next class in the MRO**' relative to the current one. That's what makes **cooperative multiple inheritance** work: in a diamond (`D(B, C)`, `B`/`C` both extend `A`), each class's `super().method()` calls the next in line, so `A` runs **exactly once** instead of twice.\n\n" +
      "**Interview tip:** define MRO as C3 linearization and stress that `super()` follows the MRO, not 'the parent'. The diamond example — A invoked once thanks to cooperative `super()` calls — is what separates a real answer from a memorized one.",
    examples: [
      {
        label: "Diamond inheritance: super() follows the MRO",
        tech: "python",
        code:
          "class A:\n" +
          "    def greet(self):\n" +
          "        print(\"A\")\n\n" +
          "class B(A):\n" +
          "    def greet(self):\n" +
          "        print(\"B\"); super().greet()\n\n" +
          "class C(A):\n" +
          "    def greet(self):\n" +
          "        print(\"C\"); super().greet()\n\n" +
          "class D(B, C):\n" +
          "    def greet(self):\n" +
          "        print(\"D\"); super().greet()\n\n" +
          "print(\"MRO:\", [cls.__name__ for cls in D.__mro__])\n" +
          "print(\"--- D().greet() ---\")\n" +
          "D().greet()      # D -> B -> C -> A, with A reached exactly once",
      },
    ],
  },
  {
    title: "What is a metaclass?",
    answer:
      "If a class is a template for instances, a **metaclass** is a template for **classes**. Since classes are themselves objects in Python, every class is an *instance* of some metaclass — by default **`type`**. So `type` is both 'the type of all types' and a callable that builds classes dynamically: `type(name, bases, namespace)`.\n\n" +
      "You define a metaclass by subclassing `type` and overriding `__new__`/`__init__` (to inspect or rewrite a class as it's created) or `__call__` (to control how instances are made). A class opts in with `class Foo(metaclass=Meta):`. The hook runs **once, at class-definition time**, letting you validate, register, or inject behavior into every class that uses it.\n\n" +
      "Real users: ORMs (Django/SQLAlchemy turning class attributes into columns), ABCs, enums, serialization frameworks, plugin registries. In application code you **rarely** need one — class decorators or `__init_subclass__` cover most cases more simply.\n\n" +
      "**Interview tip:** 'a class's class — controls class *creation*, default is `type`.' Then immediately add that you almost never write one; reach for `__init_subclass__` or a class decorator first. Naming Django/SQLAlchemy as real consumers shows you know where they actually live.",
    examples: [
      {
        label: "A metaclass that auto-registers every subclass",
        tech: "python",
        code:
          "class PluginMeta(type):\n" +
          "    registry = {}\n\n" +
          "    def __new__(mcls, name, bases, ns):\n" +
          "        cls = super().__new__(mcls, name, bases, ns)\n" +
          "        if bases:                       # skip the base class itself\n" +
          "            PluginMeta.registry[name.lower()] = cls\n" +
          "            print(\"registered:\", name)\n" +
          "        return cls\n\n" +
          "class Plugin(metaclass=PluginMeta):\n" +
          "    pass\n\n" +
          "class CsvExporter(Plugin):\n" +
          "    pass\n\n" +
          "class JsonExporter(Plugin):\n" +
          "    pass\n\n" +
          "print(\"registry:\", list(PluginMeta.registry))\n" +
          "print(\"a class is an instance of its metaclass:\", isinstance(CsvExporter, PluginMeta))",
      },
    ],
  },
  {
    title: "What are dataclasses?",
    answer:
      "**`@dataclass`** (from `dataclasses`, 3.7+) auto-generates the boilerplate for classes that mostly hold data. From typed class-level fields it writes `__init__`, `__repr__`, and `__eq__` for you (and more on request), so a clear, correct value object is a few lines.\n\n" +
      "Useful options:\n\n" +
      "- **`frozen=True`** — immutable instances (and makes them hashable), great for value objects / dict keys.\n" +
      "- **`order=True`** — generates `<`, `<=`, etc. for sorting.\n" +
      "- **`slots=True`** (3.10+) — generate `__slots__` for memory savings.\n" +
      "- **`field(default_factory=list)`** — the correct way to give a mutable default (avoids the shared-default bug).\n" +
      "- `kw_only`, `__post_init__` (extra validation/derived fields).\n\n" +
      "Compared to alternatives: less magic than a hand-written class, more structure than a dict/tuple, and standard-library (no dependency) unlike `attrs`; `NamedTuple` is similar but always immutable and tuple-like.\n\n" +
      "**Interview tip:** 'removes `__init__`/`__repr__`/`__eq__` boilerplate from data-holding classes.' Score extra by naming `frozen=True` for hashable value objects and `field(default_factory=...)` as the *right* way to default a mutable field — it shows you remember the mutable-default trap.",
    examples: [
      {
        label: "Generated init/repr/eq, ordering, and default_factory",
        tech: "python",
        code:
          "from dataclasses import dataclass, field\n\n" +
          "@dataclass(order=True, frozen=True)\n" +
          "class Point:\n" +
          "    x: int\n" +
          "    y: int\n\n" +
          "@dataclass\n" +
          "class Cart:\n" +
          "    items: list = field(default_factory=list)  # safe mutable default\n\n" +
          "a = Point(1, 2)\n" +
          "b = Point(1, 2)\n" +
          "print(\"repr :\", a)               # auto __repr__\n" +
          "print(\"eq   :\", a == b)          # auto __eq__\n" +
          "print(\"sort :\", sorted([Point(3, 0), Point(1, 9), a]))  # auto ordering\n" +
          "print(\"hash :\", len({a, b}), \"unique (frozen -> hashable)\")\n\n" +
          "c1, c2 = Cart(), Cart()\n" +
          "c1.items.append(\"apple\")\n" +
          "print(\"independent carts:\", c1.items, c2.items)",
      },
    ],
  },
  {
    title: "What are f-strings?",
    answer:
      "**f-strings** (formatted string literals, 3.6+) embed expressions directly inside a string prefixed with `f`: `f\"{name} is {age}\"`. The `{...}` parts are evaluated at runtime and inserted. They're the **most readable and fastest** way to format strings — faster than `%`-formatting and `str.format`, because the parsing happens at compile time.\n\n" +
      "They do more than interpolate names — any expression works: `f\"{a + b}\"`, `f\"{user.name.upper()}\"`, `f\"{items[0]}\"`. And they support **format specs** after a colon:\n\n" +
      "- `f\"{x:.2f}\"` — 2 decimal places; `f\"{n:,}\"` — thousands separators; `f\"{n:08.2f}\"` — width/padding.\n" +
      "- `f\"{x:>10}\"` / `^` / `<` — alignment; `f\"{n:#x}\"` / `:b` — hex/binary.\n" +
      "- `f\"{value!r}\"` — use `repr()`; **`f\"{x=}\"`** (3.8+) prints `x=<value>`, a fantastic debugging shortcut.\n\n" +
      "Double a brace to emit a literal one: `f\"{{literal}}\"`. Since 3.12 f-strings can even nest the same quote and contain backslashes.\n\n" +
      "**Interview tip:** beyond 'embed expressions,' show the format mini-language (`:.2f`, `:,`) and the `f\"{x=}\"` self-documenting debug form — those two details mark someone who actually uses f-strings daily.",
    examples: [
      {
        label: "Interpolation, format specs and the {x=} debug form",
        tech: "python",
        code:
          "name, qty, price = \"widget\", 7, 1234.5\n\n" +
          "print(f\"{name} x{qty} = {qty * price}\")        # expressions\n" +
          "print(f\"price: {price:,.2f}\")                  # commas + 2 decimals\n" +
          "print(f\"padded: |{name:>10}|\")                 # right-align width 10\n" +
          "print(f\"hex: {255:#x}  bin: {5:04b}\")          # number bases\n" +
          "print(f\"percent: {0.1875:.1%}\")               # percentage\n\n" +
          "# The self-documenting debug form (Python 3.8+)\n" +
          "total = qty * price\n" +
          "print(f\"{total=:,.2f}\")\n\n" +
          "# Literal braces: double them\n" +
          "print(f\"set literal: {{1, 2, 3}}\")",
      },
    ],
  },
  {
    title: "What useful types does the collections module provide?",
    answer:
      "`collections` offers specialized containers that make common patterns cleaner and faster than hand-rolling with plain `dict`/`list`:\n\n" +
      "- **`defaultdict(factory)`** — missing keys auto-initialize via the factory, so grouping/counting skips the `if key not in d` dance.\n" +
      "- **`Counter`** — a multiset for tallying hashables, with `.most_common(n)` and arithmetic between counters. The go-to for frequency questions.\n" +
      "- **`deque`** — a double-ended queue with **O(1)** `append`/`pop` at *both* ends (a plain list is O(n) at the front), plus `maxlen` for sliding windows. Ideal for queues/BFS.\n" +
      "- **`namedtuple`** — a lightweight, immutable record with named fields and tuple behavior — readable without a full class.\n" +
      "- **`OrderedDict`** — historically for ordering (less needed since dicts are ordered), but still has `move_to_end`/order-sensitive `==`; **`ChainMap`** layers multiple mappings.\n\n" +
      "**Interview tip:** know the *right tool per task*: tallying → `Counter`, grouping → `defaultdict(list)`, a queue/sliding window → `deque` (O(1) both ends vs a list's O(n) front pop). Naming the Big-O win for `deque` is what makes the answer land.",
    examples: [
      {
        label: "Counter, defaultdict grouping, and a bounded deque",
        tech: "python",
        code:
          "from collections import Counter, defaultdict, deque\n\n" +
          "# Counter: frequencies in one line\n" +
          "freq = Counter(\"mississippi\")\n" +
          "print(\"top 2:\", freq.most_common(2))\n\n" +
          "# defaultdict: group without 'if key in d'\n" +
          "words = [\"apple\", \"banana\", \"avocado\", \"cherry\", \"blueberry\"]\n" +
          "by_letter = defaultdict(list)\n" +
          "for w in words:\n" +
          "    by_letter[w[0]].append(w)\n" +
          "print(\"grouped:\", dict(by_letter))\n\n" +
          "# deque with maxlen: a sliding window of the last 3 items\n" +
          "window = deque(maxlen=3)\n" +
          "for n in range(1, 7):\n" +
          "    window.append(n)\n" +
          "print(\"last 3 seen:\", list(window))",
      },
    ],
  },
  {
    title: "What does the functools module offer?",
    answer:
      "`functools` is the toolbox for working **with functions**:\n\n" +
      "- **`@lru_cache(maxsize=N)` / `@cache`** — memoize results keyed by (hashable) arguments. Turns exponential recursion (naive Fibonacci) into linear, and caches expensive pure calls.\n" +
      "- **`partial(fn, *args, **kw)`** — pre-fill some arguments to make a new, specialized callable (a clean alternative to a one-line lambda).\n" +
      "- **`reduce(fn, iterable, init)`** — fold a sequence into one value.\n" +
      "- **`@wraps(fn)`** — inside a decorator, copy the wrapped function's `__name__`/`__doc__`/signature onto the wrapper (so introspection still works). Essential in every decorator.\n" +
      "- **`@cached_property`** — compute once on first access, then store on the instance.\n" +
      "- **`@total_ordering`** — fill in the rest of the comparison operators from `__eq__` + one of `<`/`>`.\n" +
      "- **`cmp_to_key`** — adapt an old-style comparator to a `key=` function.\n\n" +
      "**Interview tip:** the two everyone should know cold are **`lru_cache`** (memoization — show it on Fibonacci) and **`wraps`** (preserve metadata in decorators). Mentioning `partial` and `cached_property` rounds out a senior-sounding answer.",
    examples: [
      {
        label: "lru_cache turns exponential recursion linear; partial",
        tech: "python",
        code:
          "from functools import lru_cache, partial\n\n" +
          "@lru_cache(maxsize=None)\n" +
          "def fib(n):\n" +
          "    return n if n < 2 else fib(n - 1) + fib(n - 2)\n\n" +
          "print(\"fib(50):\", fib(50))            # instant thanks to caching\n" +
          "print(\"cache stats:\", fib.cache_info())\n\n" +
          "# partial: pre-bind arguments into a specialized callable\n" +
          "def power(base, exp):\n" +
          "    return base ** exp\n\n" +
          "square = partial(power, exp=2)\n" +
          "cube = partial(power, exp=3)\n" +
          "print(\"square(7):\", square(7))\n" +
          "print(\"cube(3)  :\", cube(3))",
      },
    ],
  },
  {
    title: "What is the itertools module used for?",
    answer:
      "`itertools` provides fast, **lazy**, composable iterator building blocks (implemented in C) for looping patterns that would otherwise need verbose code or large intermediate lists. They fall into three families:\n\n" +
      "- **Infinite:** `count(start, step)`, `cycle(iterable)`, `repeat(x, n)` — endless streams you slice with `islice`.\n" +
      "- **Combinatoric:** `product` (nested loops / Cartesian product), `permutations`, `combinations`, `combinations_with_replacement` — generate arrangements without hand-written nested loops.\n" +
      "- **Terminating / transforming:** `chain` (concatenate iterables), `groupby` (group *consecutive* equal keys — sort first!), `islice` (slice an iterator), `accumulate` (running totals), `takewhile`/`dropwhile`, `zip_longest`, `tee`, `pairwise` (3.10+).\n\n" +
      "Because everything stays lazy, you can compose them into pipelines over huge or infinite data with near-constant memory.\n\n" +
      "**Interview tip:** the most useful to name are `chain`, `islice`, `groupby`, `product`, `combinations`, and `accumulate`. The classic gotcha worth flagging: **`groupby` only groups *adjacent* equal keys**, so you must sort by the same key first.",
    examples: [
      {
        label: "product, combinations, accumulate, islice(count())",
        tech: "python",
        code:
          "import itertools as it\n\n" +
          "# Cartesian product replaces nested loops\n" +
          "print(\"product:\", list(it.product([1, 2], [\"a\", \"b\"])))\n\n" +
          "# Choose 2 of 4 (order-independent)\n" +
          "print(\"combos:\", list(it.combinations(\"ABCD\", 2)))\n\n" +
          "# Running totals\n" +
          "print(\"running sum:\", list(it.accumulate([1, 2, 3, 4, 5])))\n\n" +
          "# Slice an infinite counter\n" +
          "evens = it.islice(it.count(0, 2), 5)\n" +
          "print(\"first 5 evens:\", list(evens))\n\n" +
          "# groupby works on ADJACENT keys -> sort first\n" +
          "data = [\"apple\", \"avocado\", \"banana\", \"cherry\"]\n" +
          "for key, group in it.groupby(sorted(data), key=lambda w: w[0]):\n" +
          "    print(key, \"->\", list(group))",
      },
    ],
  },
  {
    title: "What is the walrus operator?",
    answer:
      "The **walrus operator** `:=` (named for its `:=` 'eyes and tusks', added in Python 3.8) is an **assignment expression** — it assigns a value **and** evaluates to that value, so you can bind a name inside a larger expression instead of on its own statement line.\n\n" +
      "It shines where you'd otherwise compute something twice or add an extra line:\n\n" +
      "- **`while` loops over a read:** `while (chunk := f.read(1024)):` — assign and test in one place.\n" +
      "- **`if` that needs the value:** `if (n := len(data)) > 10: print(n)` — reuse `n` in the body.\n" +
      "- **Comprehensions:** compute an expensive value once and both filter and use it: `[y for x in xs if (y := f(x)) > 0]`.\n\n" +
      "Use it to remove genuine duplication, not to cram logic into one line — overuse hurts readability. Note it needs parentheses in many contexts, and it's an *expression* (you can't do `x := 5` as a bare statement).\n\n" +
      "**Interview tip:** the canonical wins are the read-loop and 'filter-and-reuse in a comprehension' (call `f(x)` once, not twice). Mention it's about avoiding recomputation/extra lines — and that it can be abused, so use judiciously.",
    examples: [
      {
        label: "Compute once in a comprehension; assign-and-test loop",
        tech: "python",
        code:
          "def expensive(x):\n" +
          "    return x * x - 10\n\n" +
          "data = [1, 3, 4, 5]\n\n" +
          "# Without walrus you'd call expensive(x) twice per item.\n" +
          "kept = [y for x in data if (y := expensive(x)) > 0]\n" +
          "print(\"filtered + reused:\", kept)\n\n" +
          "# Assign-and-test loop: process in chunks until empty\n" +
          "import io\n" +
          "stream = io.StringIO(\"abcdefghij\")\n" +
          "while (chunk := stream.read(4)):\n" +
          "    print(\"chunk:\", chunk)\n\n" +
          "# Reuse the computed length in the body\n" +
          "nums = list(range(15))\n" +
          "if (n := len(nums)) > 10:\n" +
          "    print(f\"list has {n} items (> 10)\")",
      },
    ],
  },
  {
    title: "What do the global and nonlocal keywords do?",
    answer:
      "By default, **assigning** to a name inside a function creates a **new local** variable — even if a same-named variable exists in an outer scope. (Reading falls back through enclosing scopes by the LEGB rule, but *assignment* is local.) `global` and `nonlocal` change *where the assignment binds*:\n\n" +
      "- **`global x`** — assignments to `x` in this function rebind the **module-level** variable instead of creating a local.\n" +
      "- **`nonlocal x`** — assignments rebind `x` in the **nearest enclosing function** scope (not global). This is how a closure can *mutate* a variable from its enclosing function (e.g. a counter).\n\n" +
      "You only need them to **rebind** an outer name. To merely *mutate* a mutable outer object (`outer_list.append(1)`), you don't need either — you're not rebinding the name, just calling a method on the object it points to.\n\n" +
      "Heavy use of `global` is usually a design smell (hidden shared state); prefer return values, parameters, or a class.\n\n" +
      "**Interview tip:** the precise statement is 'assignment is local by default; `global`/`nonlocal` let you *rebind* an outer name.' Stress the difference between rebinding (needs the keyword) and mutating (doesn't) — that distinction trips people up.",
    examples: [
      {
        label: "nonlocal mutable closure counter; global rebind",
        tech: "python",
        code:
          "def make_counter():\n" +
          "    count = 0\n" +
          "    def increment():\n" +
          "        nonlocal count       # rebind the enclosing 'count'\n" +
          "        count += 1\n" +
          "        return count\n" +
          "    return increment\n\n" +
          "c = make_counter()\n" +
          "print(\"counter:\", c(), c(), c())\n\n" +
          "total = 0\n" +
          "def add(n):\n" +
          "    global total             # rebind the module-level 'total'\n" +
          "    total += n\n\n" +
          "add(5); add(10)\n" +
          "print(\"global total:\", total)\n\n" +
          "# Mutating (not rebinding) needs NEITHER keyword\n" +
          "log = []\n" +
          "def record(x):\n" +
          "    log.append(x)            # just calling a method on the object\n" +
          "record(\"a\"); record(\"b\")\n" +
          "print(\"log:\", log)",
      },
    ],
  },
  {
    title: "How do you sort with a custom key, and how does sorted differ from sort?",
    answer:
      "Both sort with the optional **`key=`** function — it's called once per element to derive the value to compare (a *decorate-sort-undecorate*, so it's efficient). `reverse=True` flips the order.\n\n" +
      "- **`list.sort()`** sorts the list **in place** and returns **`None`** (a common bug: `x = mylist.sort()` gives `None`). It only exists on lists.\n" +
      "- **`sorted(iterable)`** returns a **new sorted list** and accepts **any iterable** (a generator, dict keys, a set, a string).\n\n" +
      "Common keys: `key=len`, `key=str.lower` (case-insensitive), `key=lambda p: p['age']`, and **tuple keys for multi-level sorts** — `key=lambda p: (p.dept, -p.salary)` sorts by department ascending then salary descending. Both sorts are **stable** (equal keys keep their original relative order), which is what makes layered sorting by repeated passes work.\n\n" +
      "**Interview tip:** nail the two differences — `sort()` mutates and returns `None` (list-only) vs `sorted()` returns a new list (any iterable) — and show a **tuple key** for multi-criteria sorting plus the word **stable**. Those signal real experience.",
    examples: [
      {
        label: "in-place vs new list, tuple keys, stability",
        tech: "python",
        code:
          "words = [\"banana\", \"Apple\", \"cherry\", \"date\"]\n\n" +
          "# sorted() -> new list, any iterable; sort() -> in place, returns None\n" +
          "print(\"sorted by len :\", sorted(words, key=len))\n" +
          "print(\"case-insensitive:\", sorted(words, key=str.lower))\n" +
          "print(\"sort() returns  :\", words.sort())   # None!\n" +
          "print(\"list now sorted :\", words)\n\n" +
          "# Multi-level sort with a tuple key: dept asc, then salary desc\n" +
          "people = [(\"eng\", 90), (\"eng\", 120), (\"ops\", 80), (\"ops\", 95)]\n" +
          "ranked = sorted(people, key=lambda p: (p[0], -p[1]))\n" +
          "print(\"multi-key:\", ranked)",
      },
    ],
  },
];

export default augments;
