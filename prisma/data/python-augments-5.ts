import type { PythonAugment } from "./python-augments.types";

/**
 * Python augments — batch 5 (protocols & data model, Q11-20 in
 * curated/python-3.json). Same conventions: answer + theme-aware inline SVG +
 * "**Interview tip:**" + one runnable Python example.
 */
const augments: PythonAugment[] = [
  {
    title: "What is the descriptor protocol?",
    answer:
      "A **descriptor** is an object that customizes attribute access by implementing any of `__get__`, `__set__`, `__delete__`. When a descriptor lives **on a class** and you touch that attribute on an instance, Python routes the access **through the descriptor's methods** instead of just reading a dict:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 170' role='img' aria-label='obj.attr access routed through a descriptor __get__ on the class'>" +
      "<defs><marker id='py-desc-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='62' width='120' height='46' rx='8'/><text class='d-text' x='74' y='82' text-anchor='middle'>obj.temp</text><text class='d-sub' x='74' y='98' text-anchor='middle'>attribute access</text>" +
      "<rect class='d-box-accent' x='190' y='40' width='150' height='90' rx='8'/><text class='d-text' x='265' y='64' text-anchor='middle'>descriptor</text><text class='d-sub' x='265' y='84' text-anchor='middle'>__get__(self,obj,type)</text><text class='d-sub' x='265' y='100' text-anchor='middle'>__set__(self,obj,val)</text><text class='d-sub' x='265' y='116' text-anchor='middle'>on the CLASS</text>" +
      "<rect class='d-box' x='392' y='62' width='100' height='46' rx='8'/><text class='d-text' x='442' y='82' text-anchor='middle'>value</text><text class='d-sub' x='442' y='98' text-anchor='middle'>computed/validated</text>" +
      "<line class='d-edge-accent' x1='134' y1='85' x2='188' y2='85' marker-end='url(#py-desc-ar)'/>" +
      "<line class='d-edge-accent' x1='340' y1='85' x2='390' y2='85' marker-end='url(#py-desc-ar)'/>" +
      "<text class='d-sub' x='250' y='160' text-anchor='middle'>property, methods, classmethod, staticmethod are all descriptors</text>" +
      "</svg>\n\n" +
      "Descriptors are the **mechanism behind** `property`, **methods** (functions are descriptors — that's how `self` gets bound), `classmethod`, `staticmethod`, and ORM fields. There are two kinds, which set lookup precedence: a **data descriptor** defines `__set__`/`__delete__` (and wins over the instance dict); a **non-data descriptor** defines only `__get__` (and is overridden by an instance attribute).\n\n" +
      "Use one when you want **reusable** managed-attribute logic across many attributes/classes (validation, lazy loading, type coercion) — more reusable than writing a `property` per field.\n\n" +
      "**Interview tip:** 'an object with `__get__`/`__set__` that intercepts attribute access; it's how property and methods work.' The data-vs-non-data distinction (and that it controls precedence over the instance dict) is the senior detail.",
    examples: [
      {
        label: "A reusable validating descriptor",
        tech: "python",
        code:
          "class Positive:\n" +
          "    def __set_name__(self, owner, name):\n" +
          "        self.name = \"_\" + name\n\n" +
          "    def __get__(self, obj, objtype=None):\n" +
          "        return getattr(obj, self.name)\n\n" +
          "    def __set__(self, obj, value):           # data descriptor\n" +
          "        if value <= 0:\n" +
          "            raise ValueError(\"must be positive\")\n" +
          "        setattr(obj, self.name, value)\n\n" +
          "class Account:\n" +
          "    balance = Positive()                     # reused per field\n" +
          "    rate = Positive()\n\n" +
          "a = Account()\n" +
          "a.balance = 100\n" +
          "print(\"balance:\", a.balance)\n" +
          "try:\n" +
          "    a.rate = -1\n" +
          "except ValueError as e:\n" +
          "    print(\"rejected:\", e)",
      },
    ],
  },
  {
    title: "How does a for loop work under the hood?",
    answer:
      "`for x in obj:` is syntactic sugar for the **iterator protocol**. Python calls `iter(obj)` **once** to get an iterator, then calls `next(it)` **repeatedly**, binding each result to `x`, until `next` raises **`StopIteration`** — which the loop catches silently to stop:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 520 180' role='img' aria-label='for loop desugared into iter then repeated next until StopIteration'>" +
      "<defs><marker id='py-for-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='64' width='110' height='44' rx='8'/><text class='d-text' x='69' y='84' text-anchor='middle'>iter(obj)</text><text class='d-sub' x='69' y='100' text-anchor='middle'>__iter__ (once)</text>" +
      "<rect class='d-box-accent' x='180' y='64' width='120' height='44' rx='8'/><text class='d-text' x='240' y='84' text-anchor='middle'>next(it)</text><text class='d-sub' x='240' y='100' text-anchor='middle'>__next__ (loop)</text>" +
      "<rect class='d-box' x='356' y='30' width='150' height='40' rx='8'/><text class='d-text' x='431' y='54' text-anchor='middle'>bind x, run body</text>" +
      "<rect class='d-box-muted' x='356' y='100' width='150' height='40' rx='8'/><text class='d-text' x='431' y='124' text-anchor='middle'>StopIteration &#8594; stop</text>" +
      "<line class='d-edge' x1='124' y1='86' x2='178' y2='86' marker-end='url(#py-for-ar)'/>" +
      "<line class='d-edge-accent' x1='300' y1='78' x2='354' y2='54' marker-end='url(#py-for-ar)'/>" +
      "<line class='d-edge' x1='300' y1='94' x2='354' y2='118' marker-end='url(#py-for-ar)'/>" +
      "<path class='d-edge-accent' d='M431 70 C 431 86, 360 86, 300 86' fill='none' marker-end='url(#py-for-ar)'/>" +
      "<text class='d-sub' x='360' y='84' text-anchor='middle'>loop back</text>" +
      "</svg>\n\n" +
      "This is why **anything** with `__iter__` works in a `for` loop — lists, dicts, files, generators, your own classes — and why a generator (an iterator) is **single-pass**: once `next` reaches the end, it stays exhausted. It also explains how `break` works (the loop just stops calling `next`) and why manually catching `StopIteration` is rarely needed.\n\n" +
      "**Interview tip:** narrate the desugaring — `iter()` once, `next()` until `StopIteration`. Connect it to two facts: a `for` loop works on any iterable via this protocol, and iterators/generators are one-shot because exhaustion is permanent.",
    examples: [
      {
        label: "Manually driving the protocol a for loop hides",
        tech: "python",
        code:
          "obj = [\"a\", \"b\", \"c\"]\n\n" +
          "# What `for x in obj` actually does:\n" +
          "it = iter(obj)                 # __iter__, once\n" +
          "while True:\n" +
          "    try:\n" +
          "        x = next(it)           # __next__, each step\n" +
          "    except StopIteration:\n" +
          "        break\n" +
          "    print(\"item:\", x)\n\n" +
          "# A generator is its own iterator -> single pass\n" +
          "g = (n * n for n in range(3))\n" +
          "print(\"iter(g) is g:\", iter(g) is g)\n" +
          "print(\"drain:\", list(g), \"then:\", list(g))",
      },
    ],
  },
  {
    title: "What is a generator's lifecycle?",
    answer:
      "A generator function returns a generator **object** that moves through distinct **states**. Calling the function runs **none** of the body — it just creates the generator in the **CREATED** state. Each `next()` resumes it (RUNNING) until it hits a `yield` (back to **SUSPENDED**, value handed out) or finishes/`return`s (**CLOSED**, raising `StopIteration`):\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 540 150' role='img' aria-label='Generator state machine: created, suspended, running, closed'>" +
      "<defs><marker id='py-gen-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='10' y='52' width='96' height='44' rx='8'/><text class='d-text' x='58' y='78' text-anchor='middle'>CREATED</text>" +
      "<rect class='d-box-accent' x='158' y='52' width='110' height='44' rx='8'/><text class='d-text' x='213' y='73' text-anchor='middle'>RUNNING</text><text class='d-sub' x='213' y='88' text-anchor='middle'>executing</text>" +
      "<rect class='d-box' x='320' y='52' width='110' height='44' rx='8'/><text class='d-text' x='375' y='73' text-anchor='middle'>SUSPENDED</text><text class='d-sub' x='375' y='88' text-anchor='middle'>at yield</text>" +
      "<rect class='d-box-muted' x='474' y='52' width='56' height='44' rx='8'/><text class='d-sub' x='502' y='78' text-anchor='middle'>CLOSED</text>" +
      "<line class='d-edge' x1='106' y1='74' x2='156' y2='74' marker-end='url(#py-gen-ar)'/><text class='d-sub' x='131' y='44' text-anchor='middle'>next()</text>" +
      "<line class='d-edge-accent' x1='268' y1='66' x2='318' y2='66' marker-end='url(#py-gen-ar)'/><text class='d-sub' x='293' y='44' text-anchor='middle'>yield</text>" +
      "<path class='d-edge' d='M320 84 C 290 104, 240 104, 213 98' fill='none' marker-end='url(#py-gen-ar)'/><text class='d-sub' x='270' y='120' text-anchor='middle'>next() resumes</text>" +
      "<line class='d-edge' x1='268' y1='80' x2='472' y2='80' marker-end='url(#py-gen-ar)'/><text class='d-sub' x='400' y='118' text-anchor='middle'>return / exhaust &#8594; StopIteration</text>" +
      "</svg>\n\n" +
      "Crucially, while SUSPENDED the generator **retains all local state** (variables, instruction pointer), so it resumes exactly where it left off — that's what makes lazy, stateful streams possible. You can also `close()` it early (raises `GeneratorExit` inside) or `send()`/`throw()` values into it.\n\n" +
      "**Interview tip:** stress that **calling the function runs nothing** — the body executes lazily on each `next()`, suspending at `yield` with **state preserved**, and that once CLOSED it's permanently exhausted. Knowing `inspect.getgeneratorstate()` names these states is a nice flourish.",
    examples: [
      {
        label: "Observe the state transitions",
        tech: "python",
        code:
          "from inspect import getgeneratorstate\n\n" +
          "def counter():\n" +
          "    print(\"  body starts\")\n" +
          "    yield 1\n" +
          "    yield 2\n\n" +
          "g = counter()                      # body NOT run yet\n" +
          "print(\"created :\", getgeneratorstate(g))\n\n" +
          "print(\"next ->\", next(g))          # runs to first yield\n" +
          "print(\"suspended:\", getgeneratorstate(g))\n\n" +
          "print(\"next ->\", next(g))\n" +
          "try:\n" +
          "    next(g)                        # exhausts\n" +
          "except StopIteration:\n" +
          "    print(\"closed  :\", getgeneratorstate(g))",
      },
    ],
  },
  {
    title: "How does yield from delegation work?",
    answer:
      "`yield from iterable` **delegates** the whole iteration to a sub-iterator: instead of writing `for v in sub: yield v`, you write `yield from sub`. It pipes every value out to the caller — but it does **more** than the loop: it transparently forwards `.send()` values and `.throw()` exceptions to the sub-generator, and captures the sub-generator's **return value** as the result of the `yield from` expression:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 520 160' role='img' aria-label='Caller drives an outer generator that delegates to a sub-generator via yield from'>" +
      "<defs><marker id='py-yf-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='58' width='110' height='44' rx='8'/><text class='d-text' x='69' y='78' text-anchor='middle'>caller</text><text class='d-sub' x='69' y='94' text-anchor='middle'>for / next</text>" +
      "<rect class='d-box-accent' x='196' y='58' width='130' height='44' rx='8'/><text class='d-text' x='261' y='78' text-anchor='middle'>outer gen</text><text class='d-sub' x='261' y='94' text-anchor='middle'>yield from sub</text>" +
      "<rect class='d-box' x='398' y='58' width='110' height='44' rx='8'/><text class='d-text' x='453' y='78' text-anchor='middle'>sub gen</text><text class='d-sub' x='453' y='94' text-anchor='middle'>yields values</text>" +
      "<line class='d-edge' x1='124' y1='72' x2='194' y2='72' marker-end='url(#py-yf-ar)'/><text class='d-sub' x='159' y='62' text-anchor='middle'>next/send</text>" +
      "<line class='d-edge-accent' x1='326' y1='72' x2='396' y2='72' marker-end='url(#py-yf-ar)'/>" +
      "<line class='d-edge-accent' x1='396' y1='90' x2='326' y2='90' marker-end='url(#py-yf-ar)'/>" +
      "<line class='d-edge' x1='194' y1='90' x2='124' y2='90' marker-end='url(#py-yf-ar)'/><text class='d-sub' x='159' y='118' text-anchor='middle'>values flow back out</text>" +
      "<text class='d-sub' x='360' y='130' text-anchor='middle'>transparent pass-through (values, send, throw, return)</text>" +
      "</svg>\n\n" +
      "It's the building block for **composing generators** (flattening nested data, splitting a big generator into helpers) and was foundational to coroutine-based async before `async`/`await`. The captured return value (`result = yield from sub()`) is what `StopIteration.value` carries.\n\n" +
      "**Interview tip:** 'delegates iteration to a sub-generator, forwarding values *and* send/throw, and capturing its return value.' The 'it's more than `for v in sub: yield v`' point — two-way forwarding + return capture — is what distinguishes a real answer.",
    examples: [
      {
        label: "Compose generators and capture the return value",
        tech: "python",
        code:
          "def sub():\n" +
          "    yield \"a\"\n" +
          "    yield \"b\"\n" +
          "    return \"sub-done\"          # becomes the yield-from value\n\n" +
          "def outer():\n" +
          "    result = yield from sub()  # delegate, then capture return\n" +
          "    print(\"  sub returned:\", result)\n" +
          "    yield \"c\"\n\n" +
          "print(\"items:\", list(outer()))\n\n" +
          "# Flatten nested iterables by delegating\n" +
          "def flatten(nested):\n" +
          "    for item in nested:\n" +
          "        if isinstance(item, list):\n" +
          "            yield from flatten(item)\n" +
          "        else:\n" +
          "            yield item\n\n" +
          "print(\"flat:\", list(flatten([1, [2, [3, 4]], 5])))",
      },
    ],
  },
  {
    title: "How does a + b dispatch in Python?",
    answer:
      "Operators are **method calls** in disguise. `a + b` asks the **left** operand first, then falls back to the **right** operand's *reflected* method:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 520 170' role='img' aria-label='a plus b tries a.__add__ then b.__radd__ else TypeError'>" +
      "<defs><marker id='py-add-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='200' y='10' width='120' height='38' rx='8'/><text class='d-text' x='260' y='34' text-anchor='middle'>a + b</text>" +
      "<rect class='d-box-accent' x='160' y='66' width='200' height='38' rx='8'/><text class='d-text' x='260' y='85' text-anchor='middle'>a.__add__(b)</text><text class='d-sub' x='260' y='98' text-anchor='middle'>left operand first</text>" +
      "<rect class='d-box-muted' x='160' y='118' width='200' height='38' rx='8'/><text class='d-text' x='260' y='137' text-anchor='middle'>b.__radd__(a)</text><text class='d-sub' x='260' y='150' text-anchor='middle'>reflected, if left = NotImplemented</text>" +
      "<rect class='d-box' x='400' y='118' width='110' height='38' rx='8'/><text class='d-text' x='455' y='142' text-anchor='middle'>TypeError</text>" +
      "<line class='d-edge' x1='260' y1='48' x2='260' y2='64' marker-end='url(#py-add-ar)'/>" +
      "<line class='d-edge' x1='260' y1='104' x2='260' y2='116' marker-end='url(#py-add-ar)'/><text class='d-sub' x='340' y='114'>NotImplemented</text>" +
      "<line class='d-edge' x1='360' y1='137' x2='398' y2='137' marker-end='url(#py-add-ar)'/><text class='d-sub' x='379' y='128' text-anchor='middle'>both fail</text>" +
      "</svg>\n\n" +
      "If `a.__add__` returns the sentinel **`NotImplemented`** (not the same as raising — it means 'I don't know how to add this'), Python tries `b.__radd__(a)`. If **both** decline, it raises `TypeError`. (Special case: if `b`'s type is a **subclass** of `a`'s, the reflected `__radd__` is tried *first*, so subclasses can override.) Every operator follows this pattern: `__sub__`/`__rsub__`, `__mul__`/`__rmul__`, etc., plus in-place `__iadd__` for `+=`.\n\n" +
      "**Interview tip:** the dispatch order — `__add__`, then reflected `__radd__`, else `TypeError` — and the role of **`NotImplemented`** (return it, don't raise it) are the points. `__radd__` is what lets `2 * your_vector` work when the left operand is a builtin that doesn't know your type.",
    examples: [
      {
        label: "__radd__ makes the builtin-on-the-left case work",
        tech: "python",
        code:
          "class Money:\n" +
          "    def __init__(self, cents):\n" +
          "        self.cents = cents\n\n" +
          "    def __add__(self, other):\n" +
          "        if isinstance(other, Money):\n" +
          "            return Money(self.cents + other.cents)\n" +
          "        return NotImplemented        # let the other side try\n\n" +
          "    def __radd__(self, other):       # handles 0 + Money (e.g. sum())\n" +
          "        if other == 0:\n" +
          "            return self\n" +
          "        return NotImplemented\n\n" +
          "    def __repr__(self):\n" +
          "        return f\"${self.cents / 100:.2f}\"\n\n" +
          "wallet = [Money(150), Money(350), Money(99)]\n" +
          "print(\"sum ->\", sum(wallet))        # sum starts from 0 -> __radd__",
      },
    ],
  },
  {
    title: "What is the __hash__ and __eq__ contract?",
    answer:
      "Hash-based containers (`dict`, `set`) rely on an invariant between equality and hashing. The **contract**: if `a == b`, then **`hash(a) == hash(b)`** must also hold. (The reverse isn't required — different objects may share a hash; that's a collision, resolved by probing.)\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='Equal objects must hash equally to land in the same bucket'>" +
      "<rect class='d-box-accent' x='20' y='40' width='110' height='44' rx='8'/><text class='d-text' x='75' y='60' text-anchor='middle'>a == b</text><text class='d-sub' x='75' y='76' text-anchor='middle'>value-equal</text>" +
      "<defs><marker id='py-hash-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<line class='d-edge-accent' x1='130' y1='62' x2='190' y2='62' marker-end='url(#py-hash-ar)'/><text class='d-accent d-sub' x='160' y='52' text-anchor='middle'>requires</text>" +
      "<rect class='d-box-accent' x='200' y='40' width='150' height='44' rx='8'/><text class='d-text' x='275' y='60' text-anchor='middle'>hash(a) == hash(b)</text><text class='d-sub' x='275' y='76' text-anchor='middle'>same bucket</text>" +
      "<line class='d-edge' x1='350' y1='62' x2='408' y2='62' marker-end='url(#py-hash-ar)'/>" +
      "<rect class='d-box' x='418' y='40' width='70' height='44' rx='8'/><text class='d-sub' x='453' y='66' text-anchor='middle'>found</text>" +
      "<text class='d-sub' x='250' y='122' text-anchor='middle'>break the contract &#8594; the container can't find your key</text>" +
      "</svg>\n\n" +
      "Practical rules:\n\n" +
      "- Defining **`__eq__` without `__hash__`** makes the class **unhashable** (`__hash__` is set to `None`) — Python's safeguard so a now-mutable equality can't corrupt a set/dict.\n" +
      "- Only **immutable** objects should be hashable; if a key's hash could change after insertion, lookups break. Base the hash on the same immutable fields as equality, e.g. `hash((self.x, self.y))`.\n" +
      "- `@dataclass(frozen=True)` generates a correct paired `__eq__`/`__hash__`.\n\n" +
      "**Interview tip:** state the invariant precisely — **equal implies equal hashes** — and that overriding `__eq__` drops `__hash__` (making instances unhashable) unless you redefine it. The 'hash only on immutable fields used by `__eq__`' rule shows you've actually been bitten by this.",
    examples: [
      {
        label: "Pairing __eq__ and __hash__ for a usable key",
        tech: "python",
        code:
          "class Point:\n" +
          "    def __init__(self, x, y):\n" +
          "        self.x, self.y = x, y\n\n" +
          "    def __eq__(self, other):\n" +
          "        return (self.x, self.y) == (other.x, other.y)\n\n" +
          "    def __hash__(self):\n" +
          "        return hash((self.x, self.y))   # same fields as __eq__\n\n" +
          "seen = {Point(1, 2), Point(1, 2), Point(3, 4)}\n" +
          "print(\"dedup count:\", len(seen))        # equal points collapse\n" +
          "print(\"lookup:\", Point(1, 2) in seen)\n\n" +
          "# __eq__ without __hash__ -> unhashable\n" +
          "class Bad:\n" +
          "    def __eq__(self, o): return True\n" +
          "try:\n" +
          "    {Bad()}\n" +
          "except TypeError as e:\n" +
          "    print(\"unhashable:\", e)",
      },
    ],
  },
  {
    title: "How does the in operator work in Python?",
    answer:
      "`x in obj` (membership testing) dispatches in a defined order, so its cost depends entirely on the container:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='in operator: __contains__ then __iter__ then __getitem__'>" +
      "<defs><marker id='py-in-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='150' y='10' width='180' height='38' rx='8'/><text class='d-text' x='240' y='34' text-anchor='middle'>x in obj</text>" +
      "<rect class='d-box-accent' x='120' y='66' width='240' height='40' rx='8'/><text class='d-text' x='240' y='86' text-anchor='middle'>1. __contains__(x)</text><text class='d-sub' x='240' y='100' text-anchor='middle'>set/dict: O(1) hash lookup</text>" +
      "<rect class='d-box' x='120' y='120' width='240' height='40' rx='8'/><text class='d-text' x='240' y='140' text-anchor='middle'>2. __iter__ and compare each</text><text class='d-sub' x='240' y='154' text-anchor='middle'>list/tuple/gen: O(n) scan</text>" +
      "<rect class='d-box-muted' x='120' y='170' width='240' height='28' rx='8'/><text class='d-sub' x='240' y='189' text-anchor='middle'>3. __getitem__ by index (legacy fallback)</text>" +
      "<line class='d-edge' x1='240' y1='48' x2='240' y2='64' marker-end='url(#py-in-ar)'/>" +
      "<line class='d-edge' x1='240' y1='106' x2='240' y2='118' marker-end='url(#py-in-ar)'/>" +
      "<line class='d-edge' x1='240' y1='160' x2='240' y2='168' marker-end='url(#py-in-ar)'/>" +
      "</svg>\n\n" +
      "If the type defines **`__contains__`** it's used directly — sets and dicts hash the key for **O(1)** membership. Otherwise Python **iterates** and compares each element with `==` (**O(n)** for lists/tuples/generators), falling back to old-style indexed access via `__getitem__`. For strings, `in` is substring search. **Caveat:** testing `in` against a **generator consumes it**.\n\n" +
      "**Interview tip:** the practical punchline is the cost difference — **`in` is O(1) on a set/dict, O(n) on a list** — so building a set for repeated membership checks is a standard optimization. Mention that `in` on a generator drains it.",
    examples: [
      {
        label: "Custom __contains__ and the generator-drain gotcha",
        tech: "python",
        code:
          "class Range2D:\n" +
          "    def __init__(self, w, h): self.w, self.h = w, h\n" +
          "    def __contains__(self, point):\n" +
          "        x, y = point\n" +
          "        return 0 <= x < self.w and 0 <= y < self.h\n\n" +
          "grid = Range2D(10, 10)\n" +
          "print(\"(3,4) in grid:\", (3, 4) in grid)   # uses __contains__\n" +
          "print(\"(99,0) in grid:\", (99, 0) in grid)\n\n" +
          "# 'in' on a generator CONSUMES it\n" +
          "gen = (n for n in range(5))\n" +
          "print(\"2 in gen:\", 2 in gen)              # drains 0,1,2\n" +
          "print(\"leftover:\", list(gen))             # only 3,4 remain",
      },
    ],
  },
  {
    title: "What is the difference between __getattr__ and __getattribute__?",
    answer:
      "Both customize attribute reads, but they fire at different times:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 170' role='img' aria-label='__getattribute__ runs always; __getattr__ only on failure'>" +
      "<defs><marker id='py-ga-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='180' y='10' width='140' height='36' rx='8'/><text class='d-text' x='250' y='33' text-anchor='middle'>obj.attr</text>" +
      "<rect class='d-box-accent' x='130' y='62' width='240' height='40' rx='8'/><text class='d-text' x='250' y='82' text-anchor='middle'>__getattribute__</text><text class='d-sub' x='250' y='96' text-anchor='middle'>called on EVERY access</text>" +
      "<rect class='d-box' x='30' y='124' width='180' height='38' rx='8'/><text class='d-text' x='120' y='148' text-anchor='middle'>found &#8594; return value</text>" +
      "<rect class='d-box-muted' x='290' y='124' width='180' height='38' rx='8'/><text class='d-text' x='380' y='144' text-anchor='middle'>missing &#8594; __getattr__</text><text class='d-sub' x='380' y='157' text-anchor='middle'>fallback only</text>" +
      "<line class='d-edge' x1='250' y1='46' x2='250' y2='60' marker-end='url(#py-ga-ar)'/>" +
      "<line class='d-edge' x1='210' y1='102' x2='140' y2='122' marker-end='url(#py-ga-ar)'/>" +
      "<line class='d-edge' x1='290' y1='102' x2='360' y2='122' marker-end='url(#py-ga-ar)'/>" +
      "</svg>\n\n" +
      "- **`__getattribute__`** intercepts **every** attribute access unconditionally — it's the engine that implements the normal lookup chain. Override it only with great care, always delegating via `super().__getattribute__(name)`, or you'll cause infinite recursion / break everything.\n" +
      "- **`__getattr__`** is the **fallback**, invoked **only when normal lookup fails** (would raise `AttributeError`). It's safe and common — used for proxies, lazy attributes, and dynamic APIs (return a computed value or raise `AttributeError`).\n\n" +
      "Rule of thumb: reach for **`__getattr__`** for 'handle the missing ones'; avoid `__getattribute__` unless you truly must intercept *all* access.\n\n" +
      "**Interview tip:** 'every access vs only-on-miss.' Add the danger note: inside `__getattribute__` you must call `super().__getattribute__` (or `object.__getattribute__`) to avoid infinite recursion — and that `__getattr__` is the safe one you'll actually use.",
    examples: [
      {
        label: "__getattr__ fires only for unknown attributes",
        tech: "python",
        code:
          "class Config:\n" +
          "    def __init__(self):\n" +
          "        self.host = \"localhost\"\n\n" +
          "    def __getattribute__(self, name):\n" +
          "        print(f\"  [access] {name}\")          # EVERY access\n" +
          "        return super().__getattribute__(name)\n\n" +
          "    def __getattr__(self, name):              # only on miss\n" +
          "        return f\"<default for {name}>\"\n\n" +
          "c = Config()\n" +
          "print(\"host ->\", c.host)        # exists: getattribute only\n" +
          "print(\"port ->\", c.port)        # missing: getattribute THEN getattr",
      },
    ],
  },
  {
    title: "What are bound and unbound methods in Python?",
    answer:
      "Functions defined in a class are **descriptors**. How you access one decides whether `self` is pre-filled:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 160' role='img' aria-label='Function on the class is plain; accessed via instance it becomes a bound method'>" +
      "<defs><marker id='py-bm-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='20' y='58' width='150' height='46' rx='8'/><text class='d-text' x='95' y='78' text-anchor='middle'>Class.method</text><text class='d-sub' x='95' y='94' text-anchor='middle'>plain function</text>" +
      "<rect class='d-box-accent' x='320' y='58' width='160' height='46' rx='8'/><text class='d-text' x='400' y='78' text-anchor='middle'>obj.method</text><text class='d-sub' x='400' y='94' text-anchor='middle'>bound method (self filled)</text>" +
      "<rect class='d-box-muted' x='190' y='62' width='100' height='38' rx='8'/><text class='d-sub' x='240' y='85' text-anchor='middle'>__get__(obj)</text>" +
      "<line class='d-edge-accent' x1='170' y1='81' x2='188' y2='81' marker-end='url(#py-bm-ar)'/>" +
      "<line class='d-edge-accent' x1='290' y1='81' x2='318' y2='81' marker-end='url(#py-bm-ar)'/>" +
      "<text class='d-sub' x='95' y='130' text-anchor='middle'>needs explicit self</text>" +
      "<text class='d-accent d-sub' x='400' y='130' text-anchor='middle'>obj.method() == Class.method(obj)</text>" +
      "</svg>\n\n" +
      "Accessing `obj.method` triggers the function's `__get__`, which returns a **bound method** — a small wrapper that remembers `obj` and injects it as `self` when called. So `obj.method()` is exactly `Class.method(obj)`. Access the same name on the **class** (`Class.method`) and you get the **plain function**, where you must pass the instance yourself. (Python 3 dropped the separate 'unbound method' type — it's just a function now.) A bound method exposes `__self__` and `__func__`.\n\n" +
      "**Interview tip:** 'a bound method packages the instance with the function so `self` is auto-supplied via the descriptor protocol; `obj.m()` equals `Class.m(obj)`.' Mentioning `__self__`/`__func__` and that 'unbound methods' are gone in Py3 shows precision.",
    examples: [
      {
        label: "obj.method() desugars to Class.method(obj)",
        tech: "python",
        code:
          "class Greeter:\n" +
          "    def __init__(self, name): self.name = name\n" +
          "    def hello(self):\n" +
          "        return f\"hi, {self.name}\"\n\n" +
          "g = Greeter(\"Ada\")\n\n" +
          "bound = g.hello                 # bound method object\n" +
          "print(\"bound call :\", bound())\n" +
          "print(\"__self__ is g:\", bound.__self__ is g)\n\n" +
          "func = Greeter.hello            # plain function on the class\n" +
          "print(\"manual self:\", func(g))  # must pass the instance\n" +
          "print(\"equivalent :\", g.hello() == Greeter.hello(g))",
      },
    ],
  },
  {
    title: "How do closures capture variables in Python?",
    answer:
      "When an inner function references a variable from an enclosing function, Python keeps that variable alive in a **cell object** shared between the two functions — the closure captures the variable **by reference**, not its value at definition time:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 160' role='img' aria-label='Inner function and outer scope share a cell holding the captured variable'>" +
      "<defs><marker id='py-cl-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='20' y='30' width='150' height='44' rx='8'/><text class='d-text' x='95' y='50' text-anchor='middle'>outer()</text><text class='d-sub' x='95' y='66' text-anchor='middle'>defines count</text>" +
      "<rect class='d-box' x='20' y='96' width='150' height='44' rx='8'/><text class='d-text' x='95' y='116' text-anchor='middle'>inner()</text><text class='d-sub' x='95' y='132' text-anchor='middle'>uses count</text>" +
      "<rect class='d-box-accent' x='300' y='62' width='160' height='46' rx='8'/><text class='d-text' x='380' y='82' text-anchor='middle'>cell</text><text class='d-sub' x='380' y='98' text-anchor='middle'>holds count (shared)</text>" +
      "<line class='d-edge-accent' x1='170' y1='52' x2='298' y2='80' marker-end='url(#py-cl-ar)'/>" +
      "<line class='d-edge-accent' x1='170' y1='118' x2='298' y2='90' marker-end='url(#py-cl-ar)'/>" +
      "<text class='d-sub' x='250' y='150' text-anchor='middle'>captured by reference &#8594; inner sees the latest value</text>" +
      "</svg>\n\n" +
      "Because the cell is **shared and live**, the inner function sees the *current* value — which is great for stateful factories (a counter), but is exactly what causes the **late-binding loop pitfall** (all closures made in a loop read the loop variable's final value). The captured names are listed in `inner.__code__.co_freevars`, and the live cells in `inner.__closure__`. To *rebind* a captured variable from the inner function you need **`nonlocal`**.\n\n" +
      "**Interview tip:** 'closures capture the *variable* (a shared cell), not a snapshot of its value.' That one sentence explains both the stateful-counter pattern and the late-binding bug, and `nonlocal` is the keyword to rebind. Pointing at `__closure__`/`co_freevars` proves you know the mechanism.",
    examples: [
      {
        label: "Inspect the shared cell behind a closure",
        tech: "python",
        code:
          "def make_accumulator():\n" +
          "    total = 0\n" +
          "    def add(n):\n" +
          "        nonlocal total          # rebind the captured cell\n" +
          "        total += n\n" +
          "        return total\n" +
          "    return add\n\n" +
          "acc = make_accumulator()\n" +
          "print(\"running:\", acc(10), acc(5), acc(100))\n\n" +
          "# The mechanism is visible\n" +
          "print(\"free vars:\", acc.__code__.co_freevars)\n" +
          "print(\"cell value:\", acc.__closure__[0].cell_contents)",
      },
    ],
  },
];

export default augments;
