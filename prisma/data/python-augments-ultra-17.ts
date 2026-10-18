/**
 * PYTHON ULTRA — batch 17: OOP I — dunder (magic) methods, __repr__ vs __str__, class vs
 * instance variables, classmethod vs staticmethod, and bound vs unbound methods.
 * Every example was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What are dunder (magic) methods?`,
    difficulty: "medium",
    seoDescription: `Python dunder (magic) methods explained: how operators, len(), with and print call them, NotImplemented, type-level lookup and the protocols they build.`,
    description: `**Question presented to candidate:**
"You keep seeing methods like \`__init__\`, \`__len__\` and \`__add__\` with double underscores on both sides. What are these dunder or magic methods, who calls them, and how would you use them to make your own class work with operators and built-ins?"

**What a strong answer should cover:**
- Dunder ("double underscore") methods are special method names that Python's syntax and built-ins call for you: \`a + b\` calls \`type(a).__add__(a, b)\`, \`len(x)\` calls \`__len__\`, \`print(x)\` calls \`__str__\`, \`with\` calls \`__enter__\`/\`__exit__\`.
- They let a user-defined class implement protocols (number, sequence, container, iteration, context manager, callable) so it behaves like a built-in type.
- Binary operators return the \`NotImplemented\` singleton when they cannot handle the other operand, so Python tries the reflected method (\`__radd__\`) and finally raises \`TypeError\`.
- Implicit invocation looks the method up on the type, not on the instance: setting \`obj.__len__\` on an instance does not change \`len(obj)\`.
- Defining \`__eq__\` without \`__hash__\` sets \`__hash__\` to \`None\`, which makes instances unhashable.
- You implement dunders, you rarely call them directly: use \`len(x)\` not \`x.__len__()\`; and you do not invent new \`__names__\` of your own.

**Code / implementation expected:** Yes — a small class (a vector, money or a deck) with \`__repr__\`, \`__eq__\`, an arithmetic operator returning \`NotImplemented\`, and a container method such as \`__len__\`.`,
    answer: `**Target Audience:** Beginners who know how to write a basic \`class\`, up to intermediate developers preparing for Python interviews.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 and 3.13 (identical output); every example also runs in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined right there. All of them are collected in the Quick Glossary at the end. Every output shown was produced by actually running the code.

## 1. Why This Even Matters — A Story First

Think of a universal power socket in a hotel. The socket does not care whether you plug in a phone charger, a hair dryer or a lamp. It only cares that your plug has the right shape. If the plug fits, the device gets power and "just works".

Python's syntax is a wall full of sockets. The \`+\` sign is a socket. \`len()\` is a socket. \`for ... in\`, \`with\`, \`print\`, \`==\`, square brackets \`[]\` — all sockets. A dunder method is the plug shape for one socket. If your class has a method called \`__add__\`, it fits the \`+\` socket. If it has \`__len__\`, it fits the \`len()\` socket. Python never needs to know what your class is; it only checks whether the right plug is there.

That is why \`1 + 2\`, \`"a" + "b"\` and \`[1] + [2]\` all use the same \`+\`: \`int\`, \`str\` and \`list\` each ship with their own \`__add__\`. Interviewers ask about dunders because they reveal whether you understand that Python's operators are not magic at all — they are ordinary method calls with a special name.

## 2. What a Dunder Method Is

A method whose name starts and ends with two underscores, such as \`__init__\`, \`__repr__\` or \`__getitem__\`.

📌 **Interview term: Dunder method** — short for "double underscore" method. Also called a **special method** (the name the official docs use) or a **magic method**. It is a method with a reserved \`__name__\` that Python calls on your behalf when you use a piece of syntax or a built-in function.

The key word is *on your behalf*. You write \`a + b\`; Python turns that into a call to \`__add__\`. You write \`len(deck)\`; Python calls \`deck\`'s \`__len__\`. You almost never type the dunder name yourself at the call site.

📌 **Interview term: Implicit invocation** — the interpreter calling a special method for you because of syntax (\`+\`, \`[]\`, \`with\`) or a built-in (\`len\`, \`str\`, \`iter\`, \`hash\`), rather than you calling it by name.

You can watch CPython do this. Here is the bytecode for the expression \`a + b\`, disassembled on 3.11:

~~~python
import dis

dis.dis(compile("a + b", "<demo>", "eval"))
~~~

~~~text
  0           0 RESUME                   0

  1           2 LOAD_NAME                0 (a)
              4 LOAD_NAME                1 (b)
              6 BINARY_OP                0 (+)
             10 RETURN_VALUE
~~~

There is no \`__add__\` in the bytecode — just one \`BINARY_OP\` instruction. At run time that instruction asks the type of \`a\` for its add slot (and, if needed, the type of \`b\` for its reflected add). For an \`int\` the slot is C code; for your class it is your \`__add__\` written in Python.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 210" role="img" aria-label="The expression a plus b compiles to BINARY_OP which calls type of a dot __add__ with a and b">
  <defs>
    <marker id="py17q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="70" width="150" height="60" rx="8"/>
  <text class="d-text" x="105" y="98" text-anchor="middle">a + b</text>
  <text class="d-sub" x="105" y="118" text-anchor="middle">your source</text>
  <path class="d-edge" d="M 182 100 L 250 100" marker-end="url(#py17q1-arrow)"/>
  <rect class="d-box" x="258" y="70" width="160" height="60" rx="8"/>
  <text class="d-text" x="338" y="98" text-anchor="middle">BINARY_OP +</text>
  <text class="d-sub" x="338" y="118" text-anchor="middle">bytecode</text>
  <path class="d-edge-accent" d="M 420 100 L 488 100" marker-end="url(#py17q1-arrow)"/>
  <rect class="d-box-accent" x="496" y="70" width="160" height="60" rx="8"/>
  <text class="d-text" x="576" y="98" text-anchor="middle">type(a).__add__</text>
  <text class="d-sub" x="576" y="118" text-anchor="middle">called with (a, b)</text>
</svg>

The operator is syntax, the bytecode is one generic instruction, and the real work is done by a method looked up on the type of the left operand.

## 3. The Big Families of Dunders

You do not memorise all of them (CPython's \`int\` alone exposes 63 dunder names in \`dir(int)\` on 3.11). You learn the families, because each family is a protocol.

📌 **Interview term: Protocol** — an informal contract: "if your object has these methods, Python's built-ins will treat it as an X." A sequence, an iterator and a context manager are all protocols. This is the machinery behind [duck typing](/interview-question/what-is-duck-typing-in-python).

| Family | Dunders | Triggered by |
| :--- | :--- | :--- |
| Lifecycle | \`__new__\`, \`__init__\`, \`__del__\` | \`Cls(...)\`, garbage collection — see [\`__new__\` vs \`__init__\`](/interview-question/what-is-the-difference-between-new-and-init) |
| Text | \`__repr__\`, \`__str__\`, \`__format__\` | \`repr()\`, \`print()\`/\`str()\`, f-strings — see [\`__repr__\` vs \`__str__\`](/interview-question/what-is-the-difference-between-repr-and-str) |
| Comparison | \`__eq__\`, \`__lt__\`, \`__le__\`, ..., \`__hash__\` | \`==\`, \`<\`, dict keys — see [the hash/eq contract](/interview-question/what-is-the-hash-and-eq-contract) |
| Arithmetic | \`__add__\`, \`__radd__\`, \`__iadd__\`, \`__mul__\`, \`__neg__\`, \`__abs__\` | \`+\`, \`+=\`, \`*\`, unary \`-\`, \`abs()\` — see [how \`a + b\` dispatches](/interview-question/how-does-a-b-dispatch-in-python) |
| Truth and size | \`__bool__\`, \`__len__\` | \`if x:\`, \`bool()\`, \`len()\` — see [falsy values](/interview-question/what-values-are-falsy-in-python) |
| Container | \`__getitem__\`, \`__setitem__\`, \`__delitem__\`, \`__contains__\` | \`x[i]\`, \`x[i] = v\`, \`del x[i]\`, \`in\` |
| Iteration | \`__iter__\`, \`__next__\` | \`for\`, \`list()\`, unpacking — see [how a for loop works](/interview-question/how-does-a-for-loop-work-under-the-hood) |
| Callable | \`__call__\` | \`obj(...)\` |
| Context manager | \`__enter__\`, \`__exit__\` | \`with\` — see [context managers](/interview-question/what-is-a-context-manager) |
| Attribute access | \`__getattr__\`, \`__getattribute__\`, \`__setattr__\` | \`obj.name\` — see [\`__getattr__\` vs \`__getattribute__\`](/interview-question/what-is-the-difference-between-getattr-and-getattribute) |
| Descriptors and classes | \`__get__\`, \`__set__\`, \`__set_name__\`, \`__init_subclass__\` | attribute lookup on classes, class creation — see [descriptors](/interview-question/what-is-the-descriptor-protocol) |

\`__set_name__\` and \`__init_subclass__\` are the newest of these well-known hooks: both came from PEP 487 in Python 3.6 ([What's New in Python 3.6](https://docs.python.org/3/whatsnew/3.6.html)).

## 4. Operator Overloading, Step by Step

📌 **Interview term: Operator overloading** — giving an operator such as \`+\` or \`==\` a meaning for your own type by defining the matching dunder method.

Here is a small \`Vector\` class. Read the comments, then the output.

~~~python
class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"

    def __eq__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)

    def __add__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, k):
        if not isinstance(k, (int, float)):
            return NotImplemented
        return Vector(self.x * k, self.y * k)

    def __rmul__(self, k):          # 3 * v
        return self * k
~~~

Three ideas are hiding in it.

**Return \`NotImplemented\`, do not raise.** When \`__add__\` gets a type it does not understand, it returns the special singleton \`NotImplemented\`. That is a polite "not me" — Python then gives the *other* operand a chance through its reflected method. Only if both sides say \`NotImplemented\` does Python raise \`TypeError\` with the familiar "unsupported operand type(s)" message.

📌 **Interview term: \`NotImplemented\`** — a built-in singleton (not the exception \`NotImplementedError\`) that a binary dunder returns to say "I cannot handle this operand; try the other side".

📌 **Interview term: Reflected (right-hand) method** — \`__radd__\`, \`__rmul__\` and friends. For \`3 * v\`, Python first calls \`int.__mul__(3, v)\`, which returns \`NotImplemented\`, then calls \`Vector.__rmul__(v, 3)\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 330" role="img" aria-label="For 3 times v Python first asks int then falls back to Vector __rmul__ and raises TypeError only if both decline">
  <defs>
    <marker id="py17q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="250" y="20" width="180" height="50" rx="8"/>
  <text class="d-text" x="340" y="51" text-anchor="middle">3 * v</text>
  <path class="d-edge" d="M 340 72 L 340 112" marker-end="url(#py17q1-arrow2)"/>
  <rect class="d-box" x="220" y="118" width="240" height="50" rx="8"/>
  <text class="d-text" x="340" y="149" text-anchor="middle">int.__mul__(3, v)</text>
  <path class="d-edge-dashed" d="M 462 143 L 520 143 L 520 210" marker-end="url(#py17q1-arrow2)"/>
  <text class="d-sub" x="580" y="135" text-anchor="middle">NotImplemented</text>
  <rect class="d-box-accent" x="420" y="216" width="220" height="50" rx="8"/>
  <text class="d-text" x="530" y="247" text-anchor="middle">Vector.__rmul__(v, 3)</text>
  <path class="d-edge-dashed" d="M 218 143 L 140 143 L 140 210" marker-end="url(#py17q1-arrow2)"/>
  <text class="d-sub" x="120" y="135" text-anchor="middle">a result</text>
  <rect class="d-box-muted" x="40" y="216" width="200" height="50" rx="8"/>
  <text class="d-text" x="140" y="247" text-anchor="middle">use it, done</text>
  <text class="d-sub" x="530" y="300" text-anchor="middle">both decline: TypeError</text>
</svg>

The left operand always gets the first try; the reflected method is the fallback, and \`TypeError\` is the last resort. (One exception: if the right operand's type is a *subclass* of the left's and overrides the reflected method, it goes first — the details are on the [\`a + b\` dispatch page](/interview-question/how-does-a-b-dispatch-in-python).)

**Defining \`__eq__\` removes \`__hash__\`.** Objects that compare equal must hash equal. Python cannot guess a hash consistent with your new \`__eq__\`, so it sets \`__hash__ = None\` and your objects stop working as dict keys or set members until you write \`__hash__\` yourself.

**The operator is only sugar.** \`a + b\` and \`Vector.__add__(a, b)\` give the same result. The run in the Verified section below shows each of these.

## 5. Protocols: One Method Unlocks a Whole Family

A class with just \`__len__\` and \`__getitem__\` already behaves like a sequence. \`len()\` works, indexing and slicing work (the slice object is passed straight to \`__getitem__\`), and — surprisingly — \`in\`, \`for\` and \`reversed()\` work too, even without \`__iter__\` or \`__contains__\`. Python falls back to calling \`__getitem__(0)\`, \`__getitem__(1)\`, ... until it gets an \`IndexError\`.

📌 **Interview term: Sequence protocol** — \`__len__\` plus \`__getitem__\` taking integer indexes from 0. Enough for \`len\`, indexing, slicing, iteration, \`in\` and \`reversed\`.

📌 **Interview term: Fallback protocol** — when the preferred dunder is missing, Python tries an older, more general one: \`in\` tries \`__contains__\`, then \`__iter__\`, then \`__getitem__\`; \`bool()\` tries \`__bool__\`, then \`__len__\`. See [how the \`in\` operator works](/interview-question/how-does-the-in-operator-work-in-python).

\`__call__\` makes an instance callable like a function, and \`__enter__\`/\`__exit__\` make it usable with \`with\`.

## 6. The Detail Interviewers Love: Lookup Happens on the Type

When Python calls a dunder implicitly, it looks it up on \`type(obj)\`, skipping the instance \`__dict__\`. So putting a \`__len__\` attribute on one object does nothing to \`len()\`:

~~~python
class Box:
    def __len__(self):
        return 1

box = Box()
box.__len__ = lambda: 99
print(len(box))        # 1  (type lookup ignores the instance attribute)
print(box.__len__())   # 99 (an explicit call is a normal attribute lookup)
Box.__len__ = lambda self: 7
print(len(box))        # 7  (patching the class works)
~~~

📌 **Interview term: Special method lookup** — the rule that implicit invocations use the type's slot, not the instance. CPython stores the special methods of every class in C-level slots on the type object (for example the \`sq_length\` and \`mp_length\` slots that \`len()\` reads), which is both faster and the reason instance attributes are ignored.

This also means you cannot make a single object "callable" by assigning \`obj.__call__ = ...\`; you must define \`__call__\` on the class.

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and \`python3.13\` (identical output) and in Pyodide 0.25.1. The first is the \`Vector\` class above.

~~~text
Vector(4, 6)
Vector(6, 8)
Vector(3, 6)
5.0
True
False
Vector(4, 6)
TypeError: unsupported operand type(s) for +: 'Vector' and 'str'
False
None
TypeError: unhashable type: 'Vector'
~~~

The second shows the sequence protocol, \`__call__\`, \`with\` and type-level lookup:

~~~text
13
A K
['A', '2', '3']
True
['K', 'Q', 'J']
42
True
<b>
bold text
</b>
1
99
7
~~~

Notice \`print("Q" in d)\` printed \`True\` although \`Deck\` has no \`__contains__\` or \`__iter__\` — that is the \`__getitem__\` fallback. And \`len(box)\` printed \`1\` while \`box.__len__()\` printed \`99\`.

## 8. Edge Cases

- **\`__bool__\` must return a \`bool\`.** Returning \`1\` raises \`TypeError: __bool__ should return bool, returned int\`. \`__len__\` must return a non-negative \`int\`.
- **In-place operators fall back.** If you do not define \`__iadd__\`, \`a += b\` becomes \`a = a + b\` (a new object). Lists define \`__iadd__\` to extend in place, which is why \`+=\` on a list mutates it.
- **Comparisons reflect too.** \`a < b\` that returns \`NotImplemented\` makes Python try \`b > a\`. \`functools.total_ordering\` can fill in the missing ordering methods from \`__eq__\` and one of \`__lt__\`/\`__le__\`/\`__gt__\`/\`__ge__\`.
- **\`__del__\` is not a destructor you can rely on.** It runs when the object is reclaimed, which may be late or, at interpreter exit, not at all — see [del, \`__del__\` and garbage collection](/interview-question/what-is-the-difference-between-del-del-and-garbage-collection).
- **Name mangling is something else.** \`__name\` (leading underscores only) is mangled to \`_Class__name\`. Dunders have trailing underscores too, so they are never mangled.

## Common Pitfalls

- **Raising \`TypeError\` (or \`NotImplementedError\`) inside \`__add__\` for an unknown type.** That blocks the other operand's \`__radd__\`. Return \`NotImplemented\` instead.
- **Forgetting \`__hash__\` after defining \`__eq__\`.** Your objects silently become unhashable (\`TypeError: unhashable type\`). Define \`__hash__\` from the same fields, or use a frozen [dataclass](/interview-question/what-are-dataclasses).
- **Calling dunders directly in normal code.** \`x.__len__()\` skips the checks and fallbacks \`len(x)\` performs and reads badly. Call the built-in.
- **Patching a dunder on an instance and expecting it to work.** Implicit calls go through the type; patch the class or use a subclass.
- **Inventing your own \`__names__\`.** The double-underscore namespace is reserved for the language; a future Python can give your \`__cache__\` a meaning. Use a single leading underscore for private helpers.
- **Forgetting \`__repr__\`.** Without it, debugging output is \`<__main__.Vector object at 0x...>\`. It is the first dunder to write on any class.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Dunder methods, also called special or magic methods, are methods with reserved <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__names__</code> that Python calls for you when you use syntax or built-ins: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a + b</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__add__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(x)</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__len__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__enter__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__exit__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why they exist:</strong> <span style="color:#f0e2c8;">They let my own classes plug into the language protocols, so a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vector</code> or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Deck</code> behaves like a built-in type: operators, indexing, iteration, truthiness, printing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Operator detail:</strong> <span style="color:#f0e2c8;">A binary dunder returns the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotImplemented</code> singleton for an operand it cannot handle; Python then tries the reflected method like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__radd__</code> and only raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> if both decline.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. CPython detail:</strong> <span style="color:#f0e2c8;">Implicit calls look the method up on the type, not the instance; CPython stores them in C slots on the type object, so patching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.__len__</code> on an instance does not change <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(obj)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practice:</strong> <span style="color:#f0e2c8;">I always write <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code> first, define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> together with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code>, call the built-ins rather than the dunders, and never invent new double-underscore names.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NotImplemented</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NotImplementedError</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotImplemented</code> is a value a binary dunder <strong style="color:#ffca28;">returns</strong> to say try the other operand. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotImplementedError</code> is an exception you <strong style="color:#ffca28;">raise</strong>, typically in an abstract method that a subclass must override. Raising it from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__add__</code> would stop the reflected fallback.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Deck</code> support <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">in</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code> with only <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__getitem__</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__len__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fallback protocols. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter()</code> uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iter__</code> if present, otherwise it builds an iterator that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getitem__(0)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getitem__(1)</code> and so on until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IndexError</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code> tries <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__contains__</code>, then iteration. Defining <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__contains__</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iter__</code> is still faster and clearer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__hash__</code> when you define <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__eq__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Python sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> on that class, so instances are unhashable and cannot be dict keys or set members. You restore it by writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> based on the same fields <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> compares, ideally on immutable data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">obj.__len__()</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">len(obj)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually the same result, but not the same lookup. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code> goes through the type slot and validates the result (it must be a non-negative int). <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.__len__()</code> is a normal attribute lookup, so an instance attribute can shadow it. Use the built-in.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Name a dunder that is not about operators.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init_subclass__</code> runs on the parent whenever a subclass is created, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set_name__</code> tells a descriptor the attribute name it was assigned to; both came from PEP 487 in Python 3.6. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__call__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__enter__</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__exit__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> are other examples.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Dunder method | A method with a reserved \`__name__\` that Python calls for you; also called special or magic method |
| Implicit invocation | Python calling a dunder because of syntax or a built-in, not because you called it by name |
| Protocol | An informal contract of methods that makes an object usable as an X (sequence, iterator, context manager) |
| Operator overloading | Defining what an operator means for your type via its dunder |
| \`NotImplemented\` | Singleton returned by a binary dunder to hand the operation to the other operand |
| Reflected method | \`__radd__\`, \`__rmul__\` ...: the right-hand operand's fallback for a binary operator |
| Sequence protocol | \`__len__\` plus integer \`__getitem__\`; enough for len, indexing, iteration and \`in\` |
| Fallback protocol | Python trying an older, more general dunder when the preferred one is missing |
| Special method lookup | Implicit calls look the dunder up on the type (its C slots), not the instance |

**Conclusion:** Dunder methods are how Python turns syntax into method calls. Every operator, most built-in functions and statements like \`for\` and \`with\` are routed to a specially named method on the object's type. Implement the ones that make your class behave naturally — \`__repr__\` always, \`__eq__\` with \`__hash__\`, arithmetic with \`NotImplemented\`, container methods when the object holds things — and leave the calling to Python. Knowing the type-level lookup rule and the \`NotImplemented\` fallback is what separates a memorised list of names from a real understanding.`,
    examples: [
      {
        label: `Operator overloading with a Vector: __add__, __rmul__, __eq__, NotImplemented`,
        code: `# A tiny 2-D vector that plugs into Python syntax through dunder methods
class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"

    def __eq__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)

    def __add__(self, other):
        if not isinstance(other, Vector):
            return NotImplemented
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, k):
        if not isinstance(k, (int, float)):
            return NotImplemented
        return Vector(self.x * k, self.y * k)

    # 3 * v: int.__mul__ gives up, so Python asks Vector.__rmul__
    def __rmul__(self, k):
        return self * k

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5

    def __bool__(self):
        return bool(self.x or self.y)


a = Vector(3, 4)
b = Vector(1, 2)

print(a + b)  # Vector(4, 6)
print(a * 2)  # Vector(6, 8)
print(3 * b)  # Vector(3, 6)
print(abs(a))  # 5.0
print(a == Vector(3, 4))  # True
print(bool(Vector(0, 0)))  # False

# The operator is only sugar: these are the same call
print(Vector.__add__(a, b))  # Vector(4, 6)

# Returning NotImplemented lets Python try the other side, then raise
try:
    a + "oops"
except TypeError as e:
    print("TypeError:", e)

# == with an unrelated type falls back to identity, so it is just False
print(a == "oops")  # False

# __hash__ was set to None because we defined __eq__
print(Vector.__hash__)  # None
try:
    {a}
except TypeError as e:
    print("TypeError:", e)`,
      },
      {
        label: `Protocols: sequence via __getitem__, __call__, with, and type-level lookup`,
        code: `# Protocols: one dunder unlocks a whole family of built-in behaviour
class Deck:
    def __init__(self, cards):
        self._cards = list(cards)

    def __len__(self):
        return len(self._cards)

    def __getitem__(self, i):
        return self._cards[i]


d = Deck("A23456789TJQK")
print(len(d))  # 13
print(d[0], d[-1])
print(d[:3])  # ['A', '2', '3']
# No __iter__ and no __contains__: Python falls back to __getitem__(0), (1), ...
print("Q" in d)  # True
print(list(reversed(d))[:3])  # ['K', 'Q', 'J']


# __call__ makes instances callable; __enter__/__exit__ power "with"
class Multiplier:
    def __init__(self, k):
        self.k = k

    def __call__(self, x):
        return x * self.k


triple = Multiplier(3)
print(triple(14))  # 42
print(callable(triple))  # True


class Tag:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        print(f"<{self.name}>")
        return self

    def __exit__(self, exc_type, exc, tb):
        print(f"</{self.name}>")
        return False


with Tag("b"):
    print("bold text")


# Implicit calls look the dunder up on the TYPE, not on the instance
class Box:
    def __len__(self):
        return 1


box = Box()
box.__len__ = lambda: 99
print(len(box))
print(box.__len__())  # 99

# Patching the class does change len()
Box.__len__ = lambda self: 7
print(len(box))  # 7`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the difference between __repr__ and __str__?`,
    difficulty: "easy",
    seoDescription: `__repr__ vs __str__ in Python: who each is for, which print, f-strings and containers call, the fallback rule, !r, f"{x=}" and recursive reprs.`,
    description: `**Question presented to candidate:**
"Python classes can define both \`__repr__\` and \`__str__\`. What is the difference between them, when does Python call each one, and if you only had time to write one, which would it be?"

**What a strong answer should cover:**
- \`__str__\` is the readable, end-user text (\`print(x)\`, \`str(x)\`, \`f"{x}"\`); \`__repr__\` is the unambiguous, developer-facing text (\`repr(x)\`, the REPL, debuggers, logs).
- Containers such as lists and dicts show the \`repr\` of their elements, even when you \`print\` the container.
- The fallback rule: if \`__str__\` is missing, \`str()\` uses \`__repr__\`; the reverse is not true, so \`__repr__\` is the one to write first.
- Convention: for simple value types \`repr\` looks like a constructor call, ideally so that \`eval(repr(x)) == x\`; otherwise use the \`<ClassName ...>\` style.
- \`!r\` and the \`f"{x=}"\` debugging form (Python 3.8+) use \`repr\`; both methods must return a \`str\`.
- \`dataclasses\` generate \`__repr__\` for you; \`reprlib.recursive_repr\` guards self-referencing objects.

**Code / implementation expected:** Yes — a small class with both methods, showing \`print\`, \`repr\`, a list of the objects and an f-string with \`!r\`.`,
    answer: `**Target Audience:** Beginners who have written a class or two, up to intermediate developers revising for interviews.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 and 3.13 (identical output); every example also runs in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined right there. All of them are collected in the Quick Glossary at the end. Every output shown was produced by actually running the code.

## 1. Why This Even Matters — A Story First

A bakery prints two labels for every cake. The one stuck on the box for the customer says "Chocolate cake — 12.00 EUR". The one on the order slip in the kitchen says "order 4471, recipe CHOC-2, 8 inch, no nuts, baked 07:15". Same cake, two audiences. The customer wants something pleasant to read. The baker wants every detail needed to recreate or debug the order, with nothing ambiguous.

Python objects get the same two labels. \`__str__\` is the customer label. \`__repr__\` is the kitchen slip. When something goes wrong at 3 a.m. and all you have is a log line, the kitchen slip is the one that saves you — which is why interviewers care that you know which is which, and that \`__repr__\` is the one you write first.

## 2. Two Methods, Two Audiences

📌 **Interview term: \`__str__\`** — returns the informal, human-friendly string for an object. Called by \`str(x)\`, \`print(x)\` and \`format(x)\` / \`f"{x}"\` (via the default \`__format__\`).

📌 **Interview term: \`__repr__\`** — returns the official, unambiguous string for an object, aimed at developers. Called by \`repr(x)\`, by the interactive prompt when it echoes a value, by debuggers, and for every element inside a container's display.

~~~python
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def __repr__(self):
        return f"Money({self.amount!r}, {self.currency!r})"

    def __str__(self):
        return f"{self.amount:.2f} {self.currency}"
~~~

\`print(m)\` shows \`9.50 EUR\`. \`repr(m)\` shows \`Money(9.5, 'EUR')\` — note the quotes around \`'EUR'\`, which tell you it is a string. Inside the \`__repr__\` we used \`!r\` on each field so the field's own repr is used; that is how the quotes appear.

📌 **Interview term: Conversion flag \`!r\`** — in an f-string or \`str.format\`, \`{x!r}\` formats \`repr(x)\` instead of \`str(x)\`. \`!s\` forces \`str\`, \`!a\` forces \`ascii()\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="print str and f-strings go to __str__ while repr the REPL containers and the equals debug form go to __repr__ and a missing __str__ falls back to __repr__">
  <defs>
    <marker id="py17q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="30" width="230" height="44" rx="8"/>
  <text class="d-text" x="145" y="57" text-anchor="middle">print(x), str(x), f"{x}"</text>
  <rect class="d-box-muted" x="30" y="200" width="230" height="44" rx="8"/>
  <text class="d-text" x="145" y="227" text-anchor="middle">repr(x), REPL, [x], {x!r}</text>
  <path class="d-edge" d="M 262 52 L 420 52" marker-end="url(#py17q2-arrow)"/>
  <path class="d-edge" d="M 262 222 L 420 222" marker-end="url(#py17q2-arrow)"/>
  <rect class="d-box" x="428" y="26" width="230" height="52" rx="8"/>
  <text class="d-text" x="543" y="50" text-anchor="middle">__str__</text>
  <text class="d-sub" x="543" y="68" text-anchor="middle">for end users</text>
  <rect class="d-box-accent" x="428" y="196" width="230" height="52" rx="8"/>
  <text class="d-text" x="543" y="220" text-anchor="middle">__repr__</text>
  <text class="d-sub" x="543" y="238" text-anchor="middle">for developers</text>
  <path class="d-edge-dashed" d="M 543 80 L 543 190" marker-end="url(#py17q2-arrow)"/>
  <text class="d-sub" x="600" y="140" text-anchor="middle">if missing</text>
</svg>

The dashed arrow is the fallback: when a class has no \`__str__\` of its own, \`str()\` uses \`__repr__\`. There is no arrow the other way.

## 3. The Fallback Rule (Why \`__repr__\` Comes First)

Every class inherits both methods from \`object\`. \`object.__str__\` simply calls \`repr(self)\`. \`object.__repr__\` produces the generic \`<__main__.OnlyStr object at 0x...>\` text with the memory address. So:

| You define | \`str(x)\` / \`print(x)\` | \`repr(x)\` / in a list |
| :--- | :--- | :--- |
| Neither | \`<__main__.C object at 0x...>\` | \`<__main__.C object at 0x...>\` |
| Only \`__repr__\` | your repr | your repr |
| Only \`__str__\` | your str | \`<__main__.C object at 0x...>\` |
| Both | your str | your repr |

📌 **Interview term: Fallback to \`__repr__\`** — \`object.__str__\` delegates to \`repr()\`, so a class that only defines \`__repr__\` gets a useful \`str()\` for free. Defining only \`__str__\` leaves logs, debuggers and containers showing the useless default.

That table is the whole interview answer to "if you only write one": write \`__repr__\`.

## 4. Containers Use \`repr\` of Their Items

\`print([m, m])\` prints \`[Money(9.5, 'EUR'), Money(9.5, 'EUR')]\`, not \`[9.50 EUR, 9.50 EUR]\`. A list's own \`__str__\` is inherited from \`object\`, which calls \`list.__repr__\`, which calls \`repr()\` on each element. This is deliberate: \`print(["1, 2", "3"])\` must show the quotes, or you could not tell whether the list holds two strings or three numbers.

The same reason explains the classic surprise below — \`str\` hides the difference between the number \`42\` and the string \`"42"\`, \`repr\` shows it:

~~~text
42 42
42 '42'
~~~

## 5. What a Good \`__repr__\` Looks Like

📌 **Interview term: Round-trip repr** — for simple value types the convention is that \`repr(x)\` looks like the Python expression that builds an equal object, so \`eval(repr(x)) == x\`. \`datetime.date(2024, 2, 29)\`, \`Decimal('0.10')\` and \`Point(x=1, y=2)\` all follow it.

When an expression is not possible (an open file, a socket, an object with a huge internal state), use the angle-bracket style: \`<Connection host='db1' open=True>\`. The [data model docs](https://docs.python.org/3/reference/datamodel.html#object.__repr__) describe both conventions and ask for the repr to be "information-rich and unambiguous".

Practical rules:

- Use \`type(self).__name__\` instead of hard-coding the class name, so subclasses show their own name.
- Use \`!r\` on each field, so strings get quotes and nested objects use their own repr.
- Both methods **must return a \`str\`**; returning anything else raises \`TypeError: __repr__ returned non-string (type int)\`.

## 6. The Tools Around It

- **\`f"{x=}"\`** — added in Python 3.8 for quick debugging ([What's New in Python 3.8](https://docs.python.org/3/whatsnew/3.8.html#f-strings-support-for-self-documenting-expressions-and-debugging)). It prints the expression text, \`=\`, and the **repr** of the value: \`m=Money(9.5, 'EUR')\`.
- **\`dataclasses\`** — \`@dataclass\` writes a field-by-field \`__repr__\` for you and no separate \`__str__\`, so \`str(p) == repr(p)\`. See [dataclasses](/interview-question/what-are-dataclasses).
- **\`reprlib.recursive_repr()\`** — a decorator for \`__repr__\` that prints \`...\` when the object is reached again during its own repr, the same protection \`list\` has built in (\`[1, 2, [...]]\`).
- **\`reprlib.repr()\`** — a shortened repr for huge values, handy in logs: \`[0, 1, 2, 3, 4, 5, ...]\`.
- **\`__format__\`** — controls format specs like \`f"{x:>10}"\`. The default \`object.__format__\` with an empty spec just returns \`str(self)\`.

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and \`python3.13\` (identical output) and in Pyodide 0.25.1. The first shows the two audiences and the fallback rule:

~~~text
9.50 EUR
9.50 EUR
Money(9.5, 'EUR')
9.50 EUR
Money(9.5, 'EUR')
m=Money(9.5, 'EUR')
[Money(9.5, 'EUR'), Money(9.5, 'EUR')]
[Money(9.5, 'EUR')]
OnlyRepr()
friendly
True
True True
42 42
42 '42'
~~~

The default repr contains a memory address that changes on every run, so the example only checks its prefix with \`startswith(...)\`.

The second shows built-in reprs, a dataclass, recursive objects and the type check:

~~~text
2024-02-29
datetime.date(2024, 2, 29)
0.10 Decimal('0.10')
True
tab	here
'tab\\there'
Point(x=1, y=2)
True
[1, 2, [...]]
Node('root', [...])
[0, 1, 2, 3, 4, 5, ...]
TypeError: __repr__ returned non-string (type int)
~~~

Look at the tab string: \`str(s)\` printed a real tab character, \`repr(s)\` printed the escape \`\\t\` inside quotes — exactly the "unambiguous" property.

## 8. Edge Cases

- **\`print\` of a string does not add quotes, \`repr\` does.** A \`__repr__\` that uses \`{self.name}\` instead of \`{self.name!r}\` makes \`Tag(a b)\` and \`Tag('a b')\` indistinguishable.
- **Exceptions:** \`str(exc)\` is the message, \`repr(exc)\` is \`ValueError('bad')\`. Logging \`{exc!r}\` keeps the exception type.
- **Recursion:** a hand-written \`__repr__\` on a graph or tree that can point to itself raises \`RecursionError\` unless you use \`reprlib.recursive_repr()\`.
- **Expensive reprs:** debuggers and error messages call \`repr()\` freely. A \`__repr__\` that hits the database or prints a million rows will hurt.

## Common Pitfalls

- **Defining only \`__str__\`.** Lists, logs and the REPL still show \`<... object at 0x...>\`. Define \`__repr__\` first; add \`__str__\` only when users need a friendlier text.
- **Expecting \`print(list_of_objects)\` to use \`__str__\`.** Containers always use the elements' \`__repr__\`.
- **Forgetting \`!r\` on fields.** Strings lose their quotes and the repr becomes ambiguous.
- **Hard-coding the class name.** \`return f"Money(...)"\` lies for a subclass; use \`type(self).__name__\`.
- **Returning a non-\`str\`.** \`return self.amount\` raises \`TypeError\` at the worst moment — often while formatting an error message.
- **Putting secrets in \`__repr__\`.** Reprs end up in logs and tracebacks; mask passwords and tokens.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Core difference:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__str__</code> is the readable text for end users, used by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">print</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str()</code> and f-strings. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code> is the unambiguous text for developers, used by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr()</code>, the REPL, debuggers and logs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Containers:</strong> <span style="color:#f0e2c8;">A list or dict always shows the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr</code> of its elements, even when I <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">print</code> the container, so strings inside keep their quotes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Fallback rule:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__str__</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr()</code>, so a class with only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code> gets a good <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> for free; the reverse is not true. If I write one, it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Good repr:</strong> <span style="color:#f0e2c8;">For value types I make it look like the constructor call, using <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(self).__name__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!r</code> on each field, ideally so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval(repr(x)) == x</code>; otherwise the angle-bracket style.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Tools:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f"{x=}"</code> from Python 3.8 and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">!r</code> use repr, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass</code> generates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reprlib.recursive_repr</code> protects self-referencing objects. Both methods must return a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">print(["42"])</code> show quotes but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">print("42")</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">print</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str()</code> on its argument. For a string that is the string itself, no quotes. For a list, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str()</code> falls back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list.__repr__</code>, which calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr()</code> on each element, and the repr of a string includes quotes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">eval(repr(x)) == x</code> have to hold?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it is a <strong style="color:#ffca28;">convention</strong>, not a rule. It holds for most built-in value types and dataclasses. For objects that hold resources, like files or connections, the docs suggest the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;...&gt;</code> form with useful details instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">f"{x=}"</code> print?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The expression text, an equals sign and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr</code> of the value, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m=Money(9.5, 'EUR')</code>. It was added in Python 3.8 for quick debugging; a format spec like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{x=:.2f}</code> switches it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">format()</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid infinite recursion in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__repr__</code> of a tree that can contain itself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Decorate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reprlib.recursive_repr()</code>. It tracks objects currently being repr-ed and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">...</code> when it meets one again, matching what <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> do internally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a dataclass give you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass</code> generates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code> in the form <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point(x=1, y=2)</code> from the fields (switch off with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repr=False</code>, or hide one field with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">field(repr=False)</code>). It does not generate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__str__</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str()</code> falls back to the same text.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`__str__\` | Informal, user-facing text; used by \`print\`, \`str()\`, f-strings |
| \`__repr__\` | Official, unambiguous developer-facing text; used by \`repr()\`, REPL, containers, debuggers |
| Conversion flag \`!r\` | f-string or format flag that uses \`repr()\` instead of \`str()\` |
| Fallback to \`__repr__\` | \`object.__str__\` calls \`repr()\`, so \`__repr__\` alone covers both |
| Round-trip repr | Convention that \`repr(x)\` is an expression rebuilding an equal object |

**Conclusion:** \`__str__\` and \`__repr__\` are the same object described for two audiences. \`__str__\` is the friendly label for users; \`__repr__\` is the precise label for whoever has to debug the program, and it is the one Python uses inside containers, in the REPL, in \`!r\` and in \`f"{x=}"\`. Because \`str()\` falls back to \`__repr__\` and never the other way round, the professional habit is simple: give every class a clear, constructor-style \`__repr__\`, and add \`__str__\` only when end users need something prettier.`,
    examples: [
      {
        label: `Money: str for users, repr for developers, and the fallback rule`,
        code: `# One object, two audiences: __str__ for users, __repr__ for developers
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def __repr__(self):
        return f"Money({self.amount!r}, {self.currency!r})"

    def __str__(self):
        return f"{self.amount:.2f} {self.currency}"


m = Money(9.5, "EUR")
print(m)  # 9.50 EUR
print(str(m))  # 9.50 EUR
print(repr(m))  # Money(9.5, 'EUR')
print(f"{m}")  # 9.50 EUR
print(f"{m!r}")  # Money(9.5, 'EUR')
print(f"{m=}")  # m=Money(9.5, 'EUR')

# Containers always show the repr of what they hold
print([m, m])  # [Money(9.5, 'EUR'), Money(9.5, 'EUR')]
print(str([m]))  # [Money(9.5, 'EUR')]


# Only __repr__ defined: str() falls back to it
class OnlyRepr:
    def __repr__(self):
        return "OnlyRepr()"


print(str(OnlyRepr()))  # OnlyRepr()


# Only __str__ defined: repr() does NOT fall back to it
class OnlyStr:
    def __str__(self):
        return "friendly"


o = OnlyStr()
print(o)  # friendly
print(repr(o).startswith("<__main__.OnlyStr object at 0x"))  # True
print([o][0] is o, repr([o]).startswith("[<__main__.OnlyStr object"))

# The classic reason repr exists: these two print the same
print(42, "42")  # 42 42
print(repr(42), repr("42"))  # 42 '42'`,
      },
      {
        label: `Built-ins, dataclasses, recursive reprs and reprlib`,
        code: `import datetime
import reprlib
from dataclasses import dataclass
from decimal import Decimal

# Built-ins: repr aims to be an expression that rebuilds the value
d = datetime.date(2024, 2, 29)
print(str(d))  # 2024-02-29
print(repr(d))  # datetime.date(2024, 2, 29)
print(str(Decimal("0.10")), repr(Decimal("0.10")))
print(eval(repr(d)) == d)  # True

s = "tab\\there"
print(str(s))
print(repr(s))


# dataclass writes a __repr__ for you (and no separate __str__)
@dataclass
class Point:
    x: int
    y: int


p = Point(1, 2)
print(p)  # Point(x=1, y=2)
print(str(p) == repr(p))  # True

# A list that contains itself does not recurse forever
loop = [1, 2]
loop.append(loop)
print(loop)  # [1, 2, [...]]


# Your own recursive containers need reprlib.recursive_repr
class Node:
    def __init__(self, name):
        self.name = name
        self.children = []

    @reprlib.recursive_repr()
    def __repr__(self):
        return f"Node({self.name!r}, {self.children!r})"


root = Node("root")
root.children.append(root)
print(root)  # Node('root', [...])

# reprlib.repr shortens huge values for logs
print(reprlib.repr(list(range(100))))  # [0, 1, 2, 3, 4, 5, ...]


# Both must return str; anything else is a TypeError
class Bad:
    def __repr__(self):
        return 42


try:
    repr(Bad())
except TypeError as e:
    print("TypeError:", e)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the difference between class variables and instance variables?`,
    difficulty: "medium",
    seoDescription: `Class vs instance variables in Python: where each lives, attribute lookup, shadowing, the shared mutable list bug, += on class attrs and ClassVar.`,
    description: `**Question presented to candidate:**
"In a Python class you can put a variable directly in the class body or set it on \`self\` inside \`__init__\`. What is the difference between class variables and instance variables, how does Python decide which one you get when you read \`obj.x\`, and what bug do people hit with them?"

**What a strong answer should cover:**
- A class variable is defined in the class body and stored once in the class \`__dict__\`, shared by every instance; an instance variable is set on \`self\` and stored in that object's own \`__dict__\`.
- Lookup order for \`obj.x\`: data descriptors on the type, then the instance \`__dict__\`, then the class and its bases along the MRO; so an instance variable shadows a class variable of the same name.
- Assignment \`obj.x = ...\` always writes to the instance (it creates a shadow); to change the shared value, assign through the class (\`Cls.x = ...\` or \`type(self).x = ...\`).
- The classic bug: a mutable class variable (\`members = []\`) mutated through \`self\` is shared by all instances; create it in \`__init__\` instead.
- \`self.count += 1\` on a class variable reads the class value and writes a new instance variable; subclasses inherit class variables until they assign their own.
- Typical uses: constants, defaults, counters and caches shared by all instances; \`typing.ClassVar\` marks them for type checkers and dataclasses.

**Clarifying questions expected:**
- Should the value be shared by all instances or be per object?
- Will subclasses need their own copy of the shared state?

**Code / implementation expected:** Yes — a class with one of each, showing \`__dict__\`, shadowing, and the shared-list bug with its fix.`,
    answer: `**Target Audience:** Beginners who have written a class with \`__init__\`, up to intermediate developers revising Python's object model for interviews.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 and 3.13 (identical output); every example also runs in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined right there. All of them are collected in the Quick Glossary at the end. Every output shown was produced by actually running the code.

## 1. Why This Even Matters — A Story First

In a school classroom there is one whiteboard at the front, and every pupil has their own notebook. When the teacher writes "Homework: page 42" on the whiteboard, every pupil sees the same message — change it once and everyone sees the change. What a pupil writes in their own notebook only exists in that notebook.

Now a pupil wants a different homework note. If they copy it into their notebook and change it there, the whiteboard is untouched and the other pupils are unaffected. But if they walk up and scribble on the whiteboard itself, everyone's homework changes.

A class variable is the whiteboard. An instance variable is a notebook. Python's rule for reading \`obj.x\` is "look in your notebook first, then at the whiteboard". Almost every bug in this area — and every interview question about it — comes down to someone scribbling on the whiteboard when they meant to write in a notebook, or the other way round.

## 2. The Two Kinds of Variables

~~~python
class Dog:
    species = "Canis familiaris"   # class variable
    count = 0                      # class variable used as a counter

    def __init__(self, name):
        self.name = name           # instance variable
        Dog.count += 1             # write through the CLASS on purpose
~~~

📌 **Interview term: Class variable (class attribute)** — a name assigned directly in the class body. It is stored once, in the class object, and every instance can read it.

📌 **Interview term: Instance variable (instance attribute)** — a name assigned on \`self\` (or on any instance). It is stored on that one object and other instances do not see it.

In CPython "stored on" is literal: each class and each ordinary instance has a dictionary called \`__dict__\`.

📌 **Interview term: \`__dict__\`** — the attribute dictionary of an object. An instance's \`__dict__\` holds its instance variables; a class's \`__dict__\` (a read-only \`mappingproxy\` view) holds the class variables and the methods.

~~~python
class Dog:
    species = "dog"

    def __init__(self, name):
        self.name = name


rex = Dog("Rex")
print(type(rex).__mro__)
print(rex.__dict__)
print({k: v for k, v in Dog.__dict__.items() if not k.startswith("__")})
print(type(Dog.__dict__).__name__)
try:
    Dog.__dict__["species"] = "cat"
except TypeError as e:
    print("TypeError:", e)
~~~

~~~text
(<class '__main__.Dog'>, <class 'object'>)
{'name': 'Rex'}
{'species': 'dog'}
mappingproxy
TypeError: 'mappingproxy' object does not support item assignment
~~~

The instance only holds \`name\`. \`species\` lives in the class. Methods like \`__init__\` live there too, which is why methods are shared and not copied into every object. The class dict cannot be written directly — you assign \`Dog.species = ...\` instead, which goes through \`type.__setattr__\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 290" role="img" aria-label="Two instances rex and fido each have their own dict holding name and both point to the single Dog class dict holding species and count">
  <defs>
    <marker id="py17q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="230" height="70" rx="8"/>
  <text class="d-text" x="155" y="58" text-anchor="middle">rex.__dict__</text>
  <text class="d-sub" x="155" y="82" text-anchor="middle">name = Rex</text>
  <rect class="d-box" x="430" y="30" width="230" height="70" rx="8"/>
  <text class="d-text" x="545" y="58" text-anchor="middle">fido.__dict__</text>
  <text class="d-sub" x="545" y="82" text-anchor="middle">name = Fido</text>
  <path class="d-edge-accent" d="M 155 102 L 300 182" marker-end="url(#py17q3-arrow)"/>
  <path class="d-edge-accent" d="M 545 102 L 400 182" marker-end="url(#py17q3-arrow)"/>
  <text class="d-sub" x="185" y="160" text-anchor="middle">__class__</text>
  <text class="d-sub" x="515" y="160" text-anchor="middle">__class__</text>
  <rect class="d-box-accent" x="220" y="190" width="260" height="76" rx="8"/>
  <text class="d-text" x="350" y="218" text-anchor="middle">Dog.__dict__</text>
  <text class="d-sub" x="350" y="244" text-anchor="middle">species, count, __init__</text>
</svg>

Each instance owns a small dictionary of its own data and a link to its class; everything shared lives once, in the class.

## 3. How Python Reads \`obj.x\`

📌 **Interview term: Attribute lookup order** — for an ordinary instance, \`obj.x\` checks (1) data descriptors such as properties on the type, (2) the instance \`__dict__\`, (3) the class \`__dict__\` and then each base class along the MRO. The first hit wins. The full algorithm, including descriptors and \`__getattr__\`, is on the [attribute lookup page](/interview-question/how-does-attribute-lookup-work-on-a-python-object).

📌 **Interview term: MRO (Method Resolution Order)** — the ordered list of classes Python searches, available as \`Cls.__mro__\`; for \`Dog\` it is \`(Dog, object)\`. See [the MRO](/interview-question/what-is-the-method-resolution-order-mro).

Reading is a search; **writing is not**. \`obj.x = value\` never walks up to the class: it always puts \`x\` into the instance \`__dict__\`.

📌 **Interview term: Shadowing** — when an instance variable has the same name as a class variable, the instance one hides the class one for that object only. Deleting the instance attribute (\`del obj.x\`) makes the class value visible again.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="Reading rex dot species looks in the instance dict first then the class dict then the base classes and stops at the first hit">
  <defs>
    <marker id="py17q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="140" height="56" rx="8"/>
  <text class="d-text" x="90" y="113" text-anchor="middle">rex.species</text>
  <path class="d-edge" d="M 162 108 L 212 108" marker-end="url(#py17q3-arrow2)"/>
  <rect class="d-box" x="220" y="80" width="140" height="56" rx="8"/>
  <text class="d-text" x="290" y="104" text-anchor="middle">1. rex.__dict__</text>
  <text class="d-sub" x="290" y="124" text-anchor="middle">shadow wins</text>
  <path class="d-edge" d="M 362 108 L 412 108" marker-end="url(#py17q3-arrow2)"/>
  <rect class="d-box-accent" x="420" y="80" width="130" height="56" rx="8"/>
  <text class="d-text" x="485" y="104" text-anchor="middle">2. Dog</text>
  <text class="d-sub" x="485" y="124" text-anchor="middle">class value</text>
  <path class="d-edge" d="M 552 108 L 592 108" marker-end="url(#py17q3-arrow2)"/>
  <rect class="d-box-muted" x="600" y="80" width="90" height="56" rx="8"/>
  <text class="d-text" x="645" y="113" text-anchor="middle">3. object</text>
  <text class="d-sub" x="350" y="40" text-anchor="middle">reading searches left to right, first hit wins</text>
</svg>

Writing \`rex.species = ...\` only ever touches box 1; to change box 2 you must write \`Dog.species = ...\`.

## 4. The Shared Mutable Class Variable Bug

This is the question behind the question.

~~~python
class Team:
    members = []                   # ONE list for all teams

    def add(self, who):
        self.members.append(who)   # mutates the shared list, no assignment
~~~

\`self.members.append(...)\` is a **read** of \`self.members\` (found on the class, since the instance has none) followed by a method call that mutates that list. No assignment happens, so no instance variable is created, and every \`Team\` appends to the same list. After \`red.add("Ann")\` and \`blue.add("Bob")\`, \`red.members\` is \`['Ann', 'Bob']\`.

The fix is to create the list per instance in \`__init__\` (\`self.members = []\`). It is the class-level twin of the [mutable default argument trap](/interview-question/why-is-using-a-mutable-default-argument-dangerous): a mutable object created once, at definition time, and shared by everyone who uses it.

📌 **Interview term: Shared mutable state** — one mutable object (list, dict, set) reachable from many places, so a change through one path is seen through all of them. Immutable class variables (numbers, strings, tuples) are safe to share because they can only be replaced, never changed.

## 5. \`self.x += 1\` and Other Subtle Writes

\`self.hits += 1\` looks like "add one to hits". With \`hits\` as a class variable it actually means \`self.hits = self.hits + 1\`: the right side **reads** the class value \`0\`, the left side **writes** an instance variable. After two calls on \`c1\`, \`c1.hits\` is \`2\`, \`Counter.hits\` is still \`0\`, and \`c2\` has nothing in its \`__dict__\` at all.

That is why the \`Dog\` counter writes \`Dog.count += 1\`. A more subclass-friendly form is \`type(self).count += 1\` — but it has its own twist, visible in the run below: for a subclass the first \`+=\` reads the **inherited** parent value and writes a new attribute on the subclass. Three objects (one \`Registry\`, two \`Special\`) end with \`Registry.created == 1\` and \`Special.created == 3\`, because \`Special\` started counting from the parent's \`1\`.

📌 **Interview term: \`typing.ClassVar\`** — an annotation that tells type checkers (and \`@dataclass\`) that an attribute belongs to the class, not to instances. A dataclass skips \`ClassVar\` fields when building \`__init__\`, and raises \`ValueError\` if you give a normal field a mutable default like \`[]\` — use \`field(default_factory=list)\`.

## 6. When to Use Each

| | Class variable | Instance variable |
| :--- | :--- | :--- |
| Defined | In the class body | On \`self\`, usually in \`__init__\` |
| Stored in | \`Cls.__dict__\` (once) | \`obj.__dict__\` (per object; or a slot with [\`__slots__\`](/interview-question/what-does-slots-do)) |
| Shared? | Yes, by all instances and subclasses | No |
| Read via | \`Cls.x\`, \`obj.x\` (if not shadowed) | \`obj.x\` |
| Write via | \`Cls.x = v\` or \`type(self).x = v\` | \`obj.x = v\` |
| Good for | Constants, defaults, counters, registries, caches | The object's own data |
| Danger | Mutable values mutated through \`self\` | None special |

Class variables are also how methods work: a method is just a function stored as a class variable, turned into a bound method when you read it through an instance — see [bound and unbound methods](/interview-question/what-are-bound-and-unbound-methods-in-python).

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and \`python3.13\` (identical output) and in Pyodide 0.25.1. The first shows sharing, \`__dict__\`, shadowing, deletion and the shared-list bug:

~~~text
Rex Fido
Canis familiaris Canis familiaris Canis familiaris
2
{'name': 'Rex'}
True False
Robot dog
Canis familiaris
['name', 'species']
Wolf Robot dog
Wolf
['Ann', 'Bob']
True
['Ann'] ['Bob']
~~~

The second shows \`+=\` on a class variable, inheritance, the \`type(self)\` counter twist and the dataclass rules:

~~~text
2 0 0
{'hits': 2} {}
10 False
10 99
1 3
Order(items=['tea']) Order(items=[])
0.2 ['items']
ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory
~~~

## 8. Edge Cases

- **Class variables are read through \`self\` inside methods.** \`self.TAX\` is fine and lets a subclass override \`TAX\`; \`Order.TAX\` would not.
- **Properties beat the instance dict.** A \`@property\` on the class is a data descriptor, so it wins even over an instance \`__dict__\` entry — see [the property decorator](/interview-question/what-is-the-property-decorator).
- **\`__slots__\` classes have no instance \`__dict__\`.** A class variable with the same name as a slot raises \`ValueError\` at class creation.
- **Class variables in nested scopes.** Names in a class body are not visible as plain names inside methods or comprehensions in that body; you must write \`self.x\` or \`Cls.x\` — the [LEGB rule](/interview-question/what-is-the-legb-rule-for-scope-resolution) skips class scope.

## Common Pitfalls

- **A mutable class variable mutated through \`self\`.** \`items = []\` at class level plus \`self.items.append(x)\` shares one list across all instances. Create it in \`__init__\`.
- **Changing shared state through the instance.** \`self.rate = 0.1\` only changes this object; use \`Cls.rate = 0.1\` to change it for everyone.
- **\`self.count += 1\` as a "global" counter.** It creates an instance variable and leaves the class counter at zero.
- **Assuming each subclass has its own counter.** Until a subclass assigns the name, it reads and mutates the parent attribute; \`type(self).x += 1\` starts from the parent value.
- **Expecting \`obj.__dict__\` to show class variables.** It only shows what the instance owns; use \`vars(type(obj))\` or \`getattr\` to see the full picture.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A class variable is assigned in the class body and stored once in the class <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, shared by every instance. An instance variable is assigned on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> and stored in that object's own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Lookup:</strong> <span style="color:#f0e2c8;">Reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.x</code> checks data descriptors on the type, then the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, then the class and its bases along the MRO, so an instance variable of the same name shadows the class one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Writes:</strong> <span style="color:#f0e2c8;">Assignment through an instance always writes to the instance. To change shared state I assign through the class, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cls.x = v</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(self).x = v</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.count += 1</code> reads the class value but writes an instance variable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The bug:</strong> <span style="color:#f0e2c8;">A mutable class variable like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">members = []</code>, mutated with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.members.append</code>, is shared by every instance. The fix is to create it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code>; dataclasses force this with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default_factory</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Use cases:</strong> <span style="color:#f0e2c8;">Class variables are for constants, defaults, counters and registries; instance variables are for per-object data. I mark class-level ones with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ClassVar</code> when using type hints or dataclasses.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">After <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">rex.species = "Robot"</code>, what does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">fido.species</code> return?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The class value. The assignment created a new entry in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rex.__dict__</code> that shadows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Dog.species</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rex</code> only. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fido</code> has no such entry, so its lookup falls through to the class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">self.items.append(x)</code> change every instance but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">self.items = [x]</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append</code> is a <strong style="color:#ffca28;">read</strong> followed by a mutation: it finds the one list on the class and changes it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.items = [x]</code> is an <strong style="color:#ffca28;">assignment</strong>, and assignment through an instance always creates or replaces an instance attribute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a separate counter per subclass?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a class method or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(self)</code> and make sure each subclass gets its own attribute, for example by checking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"count" in cls.__dict__</code> before incrementing, or by setting it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init_subclass__</code>. Otherwise the first increment starts from the parent value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do methods live — class or instance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In the class <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, like any class variable. Reading one through an instance runs the function descriptor <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code>, which produces a bound method carrying <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code>. That is why methods are not copied into every object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ClassVar</code> do at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For ordinary classes, nothing; it is a hint for type checkers. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass</code> does read it: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ClassVar</code> annotation is excluded from the generated fields, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Class variable | Name assigned in the class body; stored once in the class and shared |
| Instance variable | Name assigned on an instance; stored in that object only |
| \`__dict__\` | The attribute dictionary of an object or class |
| Attribute lookup order | Data descriptors, then instance \`__dict__\`, then class and bases along the MRO |
| MRO | The ordered list of classes searched for an attribute, \`Cls.__mro__\` |
| Shadowing | An instance attribute hiding a class attribute of the same name |
| Shared mutable state | One mutable object reachable from many places, so changes show everywhere |
| \`typing.ClassVar\` | Annotation marking an attribute as class-level for type checkers and dataclasses |

**Conclusion:** Class variables live once on the class and are shared; instance variables live in each object's own \`__dict__\`. Reading \`obj.x\` searches the instance first and then the class, but writing \`obj.x\` always lands on the instance — and that asymmetry explains shadowing, the \`self.count += 1\` surprise and the shared-list bug. Keep class variables for constants and genuinely shared state, write to them through the class, and create every mutable per-object value in \`__init__\`.`,
    examples: [
      {
        label: `Shared vs per-object state, __dict__, shadowing and the shared list bug`,
        code: `# Class variable: one value stored on the class, shared by every instance
# Instance variable: stored on each object, in its own __dict__
class Dog:
    species = "Canis familiaris"   # class variable
    count = 0                      # class variable used as a counter

    def __init__(self, name):
        self.name = name           # instance variable
        Dog.count += 1             # write through the CLASS on purpose


rex = Dog("Rex")
fido = Dog("Fido")

print(rex.name, fido.name)  # Rex Fido
print(rex.species, fido.species, Dog.species)
print(Dog.count)  # 2

# Where does each name actually live?
print(rex.__dict__)  # {'name': 'Rex'}
print("species" in Dog.__dict__, "species" in rex.__dict__)  # True False

# Assigning through an instance creates a NEW instance variable (shadowing)
rex.species = "Robot dog"
print(rex.species)
print(fido.species)
print(sorted(rex.__dict__))

# Changing the class variable is seen by every instance that has not shadowed it
Dog.species = "Wolf"
print(fido.species, rex.species)

# Deleting the instance attribute uncovers the class one again
del rex.species
print(rex.species)  # Wolf


# The famous bug: a mutable class variable is shared
class Team:
    members = []                   # ONE list for all teams

    def add(self, who):
        self.members.append(who)   # mutates the shared list, no assignment


red, blue = Team(), Team()
red.add("Ann")
blue.add("Bob")
print(red.members)  # ['Ann', 'Bob']
print(red.members is blue.members)  # True


# The fix: create the list per instance in __init__
class FixedTeam:
    def __init__(self):
        self.members = []

    def add(self, who):
        self.members.append(who)


r2, b2 = FixedTeam(), FixedTeam()
r2.add("Ann")
b2.add("Bob")
print(r2.members, b2.members)  # ['Ann'] ['Bob']`,
      },
      {
        label: `self.x += 1, inheritance, type(self) counters and dataclass ClassVar`,
        code: `from dataclasses import dataclass, field, fields
from typing import ClassVar


# self.x += 1 on a class variable reads the class value, writes an instance one
class Counter:
    hits = 0

    def bump(self):
        self.hits += 1             # same as: self.hits = self.hits + 1


c1, c2 = Counter(), Counter()
c1.bump()
c1.bump()
print(c1.hits, c2.hits, Counter.hits)  # 2 0 0
print(c1.__dict__, c2.__dict__)  # {'hits': 2} {}


# Inheritance: a subclass reads the parent class variable until it assigns its own
class Base:
    limit = 10


class Child(Base):
    pass


print(Child.limit, "limit" in Child.__dict__)
Child.limit = 99                   # creates Child.limit, Base is untouched
print(Base.limit, Child.limit)  # 10 99

# type(self).attr writes to the class of the object (handy with subclasses)
class Registry:
    created = 0

    def __init__(self):
        type(self).created += 1


class Special(Registry):
    pass


Registry()
Special()
Special()
# Special() read the inherited 1, then wrote 2 and 3 onto Special
print(Registry.created, Special.created)  # 1 3


# dataclasses: ClassVar marks a class variable, field(default_factory) a per-instance one
@dataclass
class Order:
    TAX: ClassVar[float] = 0.2
    items: list = field(default_factory=list)


o1, o2 = Order(), Order()
o1.items.append("tea")
print(o1, o2)
print(Order.TAX, [f.name for f in fields(Order)])  # 0.2 ['items']

# dataclasses refuse a shared mutable default outright
try:
    @dataclass
    class BadOrder:
        items: list = []
except ValueError as e:
    print("ValueError:", e)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the difference between classmethod and staticmethod?`,
    difficulty: "medium",
    seoDescription: `classmethod vs staticmethod in Python: what each receives, alternative constructors, subclass behaviour, the descriptor mechanics and 3.10/3.13 changes.`,
    description: `**Question presented to candidate:**
"Python has \`@classmethod\` and \`@staticmethod\`. What is the difference between them and a normal method, when would you reach for each, and what actually happens when you call one?"

**What a strong answer should cover:**
- A normal method receives the instance (\`self\`), a class method receives the class (\`cls\`), a static method receives nothing extra — it is a plain function namespaced in the class.
- Class methods are the tool for alternative constructors (\`dict.fromkeys\`, \`datetime.fromtimestamp\`) because \`cls(...)\` builds the subclass when called on a subclass; a static method has to hard-code the class.
- Both can be called on the class or an instance; a class method called through an instance still gets the class.
- Mechanism: both are descriptors stored in the class \`__dict__\`; \`classmethod.__get__\` returns a method bound to the class, \`staticmethod.__get__\` returns the underlying function unchanged.
- Version facts: since Python 3.10 a \`staticmethod\` object is itself callable and both expose \`__wrapped__\`; chaining \`@classmethod\` over \`@property\` was deprecated in 3.11 and removed in 3.13.
- Choosing: use a static method for a helper that needs neither the instance nor the class (or a module-level function), a class method when the class itself matters.

**Code / implementation expected:** Yes — a class with all three method kinds, an alternative constructor via \`@classmethod\`, and a subclass showing the difference.`,
    answer: `**Target Audience:** Beginners who know what \`self\` is, up to intermediate developers preparing for Python interviews.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 and 3.13 (identical output except where a version is named); every in-page example also runs on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined right there. All of them are collected in the Quick Glossary at the end. Every output shown was produced by actually running the code.

## 1. Why This Even Matters — A Story First

Picture a car factory with three kinds of workers.

A **mechanic** works on one specific car: "fix the brakes on *this* car". They need the car in front of them. That is an ordinary method — it gets \`self\`.

A **production planner** works on the *model line*: "build me a new car of this model from this order form". They do not need any particular car, but they must know which model line they are planning for — the sedan line builds sedans, the SUV line builds SUVs. That is a class method — it gets \`cls\`.

A **unit converter** pinned to the wall turns miles into kilometres. It does not care about any car or any model line; it just happens to hang in the factory because the workers use it. That is a static method — it gets nothing.

Interviewers ask this because the planner versus converter difference — "does this code need to know *which class* it runs on?" — is exactly the design judgement they want to see.

## 2. Three Kinds of Methods Side by Side

~~~python
class Temperature:
    unit = "C"

    def __init__(self, degrees):
        self.degrees = degrees

    def describe(self):                 # instance method: gets the object
        return f"{self.degrees}{self.unit}"

    @classmethod
    def from_fahrenheit(cls, f):        # class method: gets the class
        return cls(round((f - 32) * 5 / 9, 1))

    @staticmethod
    def is_freezing(c):                 # static method: gets nothing extra
        return c <= 0
~~~

📌 **Interview term: Instance method** — an ordinary \`def\` in a class. Called through an instance, Python passes that instance as the first argument, named \`self\` by convention.

📌 **Interview term: Class method** — a function decorated with \`@classmethod\`. Called through the class *or* an instance, Python passes the class as the first argument, named \`cls\` by convention.

📌 **Interview term: Static method** — a function decorated with \`@staticmethod\`. Python passes no automatic first argument; it behaves like a plain function that lives in the class namespace.

| | Instance method | \`@classmethod\` | \`@staticmethod\` |
| :--- | :--- | :--- | :--- |
| First argument | the instance (\`self\`) | the class (\`cls\`) | none |
| Can read instance data | Yes | No (no instance) | No |
| Can read class data | Yes, via \`self\` or \`type(self)\` | Yes, via \`cls\` | Only by naming the class |
| Follows subclasses | Yes | Yes, \`cls\` is the subclass | No |
| \`C.m\` gives | a plain function | a method bound to \`C\` | a plain function |
| \`C().m\` gives | a method bound to the instance | a method bound to \`C\` | a plain function |
| Typical use | Behaviour of one object | Alternative constructors, per-class state | Helpers that logically belong to the class |

## 3. Why \`cls\` Matters: Alternative Constructors

📌 **Interview term: Alternative constructor** — a class method that builds an instance from a different kind of input than \`__init__\` takes. The standard library is full of them: \`dict.fromkeys\`, \`int.from_bytes\`, \`datetime.fromtimestamp\`, \`datetime.fromisoformat\`.

Because the method receives \`cls\` and calls \`cls(...)\`, it builds whatever class it was called on. \`Kelvinish.from_fahrenheit(32)\` returns a \`Kelvinish\`, not a \`Temperature\`, without overriding anything. A static method that wrote \`return Temperature(...)\` (or \`Shape()\`) would quietly return the parent type from a subclass — the run below shows \`Circle.make_static()\` returning a \`Shape\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Calling Circle dot make_class passes Circle as cls and builds a Circle while make_static has the name Shape hard coded and builds a Shape">
  <defs>
    <marker id="py17q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="220" height="50" rx="8"/>
  <text class="d-text" x="140" y="70" text-anchor="middle">Circle.make_class()</text>
  <path class="d-edge-accent" d="M 252 65 L 330 65" marker-end="url(#py17q4-arrow)"/>
  <rect class="d-box-accent" x="338" y="40" width="160" height="50" rx="8"/>
  <text class="d-text" x="418" y="62" text-anchor="middle">cls = Circle</text>
  <text class="d-sub" x="418" y="80" text-anchor="middle">return cls()</text>
  <path class="d-edge-accent" d="M 500 65 L 560 65" marker-end="url(#py17q4-arrow)"/>
  <rect class="d-box-accent" x="568" y="40" width="110" height="50" rx="8"/>
  <text class="d-text" x="623" y="70" text-anchor="middle">a Circle</text>
  <rect class="d-box-muted" x="30" y="170" width="220" height="50" rx="8"/>
  <text class="d-text" x="140" y="200" text-anchor="middle">Circle.make_static()</text>
  <path class="d-edge" d="M 252 195 L 330 195" marker-end="url(#py17q4-arrow)"/>
  <rect class="d-box" x="338" y="170" width="160" height="50" rx="8"/>
  <text class="d-text" x="418" y="192" text-anchor="middle">no cls</text>
  <text class="d-sub" x="418" y="210" text-anchor="middle">return Shape()</text>
  <path class="d-edge" d="M 500 195 L 560 195" marker-end="url(#py17q4-arrow)"/>
  <rect class="d-box" x="568" y="170" width="110" height="50" rx="8"/>
  <text class="d-text" x="623" y="200" text-anchor="middle">a Shape</text>
</svg>

The class method adapts to whoever calls it; the static method is frozen to the name it was written with.

## 4. What Actually Happens: Both Are Descriptors

The decorators do not change how Python *calls* things; they change what you *get back* when you read the attribute.

📌 **Interview term: Descriptor** — an object stored in a class that defines \`__get__\` (and optionally \`__set__\`/\`__delete__\`), so reading it as an attribute runs code. Functions, \`property\`, \`classmethod\` and \`staticmethod\` are all descriptors. Full detail on the [descriptor protocol page](/interview-question/what-is-the-descriptor-protocol).

When the class body runs, \`@classmethod\` wraps your function in a \`classmethod\` object and \`@staticmethod\` wraps it in a \`staticmethod\` object. Those wrappers sit in \`C.__dict__\`. On every attribute access Python calls the wrapper's \`__get__\`:

- a plain **function** \`__get__(instance, owner)\` returns a bound method with \`__self__ = instance\` (or the bare function when accessed on the class);
- **\`classmethod.__get__\`** returns a bound method with \`__self__ = owner\`, whether you came through the class or an instance;
- **\`staticmethod.__get__\`** returns the wrapped function unchanged.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 300" role="img" aria-label="The class dict holds a function a classmethod object and a staticmethod object and attribute access through __get__ turns them into a method bound to the instance a method bound to the class and the plain function">
  <defs>
    <marker id="py17q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="140" y="30" text-anchor="middle">stored in C.__dict__</text>
  <text class="d-sub" x="520" y="30" text-anchor="middle">what C().name gives</text>
  <rect class="d-box-muted" x="40" y="50" width="200" height="50" rx="8"/>
  <text class="d-text" x="140" y="80" text-anchor="middle">function inst</text>
  <rect class="d-box-muted" x="40" y="140" width="200" height="50" rx="8"/>
  <text class="d-text" x="140" y="170" text-anchor="middle">classmethod klass</text>
  <rect class="d-box-muted" x="40" y="230" width="200" height="50" rx="8"/>
  <text class="d-text" x="140" y="260" text-anchor="middle">staticmethod stat</text>
  <path class="d-edge" d="M 242 75 L 400 75" marker-end="url(#py17q4-arrow2)"/>
  <path class="d-edge" d="M 242 165 L 400 165" marker-end="url(#py17q4-arrow2)"/>
  <path class="d-edge" d="M 242 255 L 400 255" marker-end="url(#py17q4-arrow2)"/>
  <text class="d-sub" x="320" y="62" text-anchor="middle">__get__</text>
  <text class="d-sub" x="320" y="152" text-anchor="middle">__get__</text>
  <text class="d-sub" x="320" y="242" text-anchor="middle">__get__</text>
  <rect class="d-box" x="408" y="50" width="250" height="50" rx="8"/>
  <text class="d-text" x="533" y="80" text-anchor="middle">method, __self__ = instance</text>
  <rect class="d-box-accent" x="408" y="140" width="250" height="50" rx="8"/>
  <text class="d-text" x="533" y="170" text-anchor="middle">method, __self__ = C</text>
  <rect class="d-box" x="408" y="230" width="250" height="50" rx="8"/>
  <text class="d-text" x="533" y="260" text-anchor="middle">plain function</text>
</svg>

Same lookup, three different \`__get__\` implementations: that is the entire difference between the three kinds of method.

Both wrappers keep the original function as \`__func__\`. Since Python 3.10 they also copy \`__name__\`, \`__doc__\` and friends and expose \`__wrapped__\`, and a bare \`staticmethod\` object became callable like a regular function (bpo-43682, [What's New in Python 3.10](https://docs.python.org/3/whatsnew/3.10.html)). A \`classmethod\` object is still not callable on its own — the Verified run shows the \`TypeError\`.

## 5. A Version Trap: \`@classmethod\` + \`@property\`

Python 3.9 let \`classmethod\` wrap other descriptors, so stacking \`@classmethod\` on top of \`@property\` gave a "class property". That chaining was deprecated in 3.11 and removed in 3.13 ([gh-89519](https://github.com/python/cpython/issues/89519); [removal PR gh-110163](https://github.com/python/cpython/pull/110163)). This snippet is not an in-page example because its result depends on the version; here it is run on two interpreters:

~~~python
import sys
import warnings

warnings.simplefilter("ignore", DeprecationWarning)


class Config:
    @classmethod
    @property
    def name(cls):
        return cls.__name__.lower()


print(sys.version_info[:2], type(Config.name).__name__, repr(Config.name))
~~~

~~~text
(3, 11) str 'config'
(3, 13) method <bound method name of <class '__main__.Config'>>
~~~

On 3.11 the property ran and returned \`'config'\`. On 3.13 the same code gives you a bound method instead — no error, just a different object, which is why it breaks code silently. We did not see a \`DeprecationWarning\` printed on 3.11 when testing with \`-W error\`, so do not count on a warning to catch it. For a class-level computed value, use a plain class attribute, a class method you call (\`Config.name()\`), or a metaclass property.

## 6. Verified: Running the Code

Both in-page examples were run with \`python3.11\` and \`python3.13\` (identical output) and in Pyodide 0.25.1. The first covers the three method kinds, alternative constructors and subclasses:

~~~text
Temperature(100.0)
100.0C
True False
Kelvinish(0.0) Kelvinish
0.0K?
Shape
Circle
Show Show
(1,) (1,)
~~~

The second shows the descriptor objects in \`C.__dict__\`, calling \`__get__\` by hand, \`__func__\`, the 3.10+ callable \`staticmethod\`, and per-class state through \`cls\`:

~~~text
function
classmethod
staticmethod
function method
method True
function
C
42
klass stat
10
TypeError: 'classmethod' object is not callable
['mp3', 'wav'] ['mp4'] None
~~~

In the plugin registry, \`cls.__dict__.get("registry")\` checks whether *this* class has its own list; without that check, \`cls.registry.append\` would find and mutate the parent list (the [class vs instance variables](/interview-question/what-is-the-difference-between-class-variables-and-instance-variables) trap one level up).

## 7. Choosing Between Them

- Needs the instance? Ordinary method.
- Needs the class — to construct, to read or write class-level state, or to respect subclasses? \`@classmethod\`.
- Needs neither, but belongs with the class conceptually (a validator, a unit conversion)? \`@staticmethod\` — or a module-level function. Python does not require everything to live in a class, and many style guides prefer the module function unless the helper is part of the class interface or meant to be overridden.
- Overriding: a subclass can override a static method, and calling it as \`self.helper()\` picks up the override. That is a legitimate reason to keep a helper as a static method rather than a module function.

## Common Pitfalls

- **Static method as an alternative constructor.** \`return Temperature(...)\` ignores subclasses; use \`@classmethod\` and \`cls(...)\`.
- **Forgetting \`cls\` or \`self\`.** \`@classmethod def make():\` raises \`TypeError: ... takes 0 positional arguments but 1 was given\` when called, because the class is still passed.
- **Mutating inherited state through \`cls\`.** \`cls.items.append(...)\` on a subclass changes the parent list unless the subclass has its own attribute.
- **Stacking \`@classmethod\` on \`@property\`.** Works on 3.9–3.12, silently changes meaning on 3.13.
- **Decorator order with other decorators.** \`@classmethod\`/\`@staticmethod\` should be the outermost (top) decorator; a decorator above them receives the wrapper object, not a function.
- **Using a class method where an instance method is needed.** It has no access to instance attributes; \`cls.name\` reads the class attribute, not the object's value.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Core difference:</strong> <span style="color:#f0e2c8;">An instance method gets the instance as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code>, a class method gets the class as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls</code>, and a static method gets nothing extra; it is a plain function that lives in the class namespace.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When to use each:</strong> <span style="color:#f0e2c8;">I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@classmethod</code> for alternative constructors like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict.fromkeys</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">datetime.fromtimestamp</code> and for per-class state, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@staticmethod</code> for helpers that need neither the object nor the class.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Subclasses:</strong> <span style="color:#f0e2c8;">The key difference is that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls</code> is whatever class it was called on, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Sub.from_x()</code> returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Sub</code>. A static method has to hard-code a class name and ignores subclasses.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mechanism:</strong> <span style="color:#f0e2c8;">Both are descriptors stored in the class <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">classmethod.__get__</code> returns a method bound to the class even through an instance; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">staticmethod.__get__</code> returns the raw function. Both keep it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__func__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versions:</strong> <span style="color:#f0e2c8;">Since 3.10 a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">staticmethod</code> object is callable and both expose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__wrapped__</code>; chaining <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@classmethod</code> over <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@property</code> was deprecated in 3.11 and removed in 3.13.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you call a class method on an instance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.from_fahrenheit(212)</code> works and still receives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(obj)</code> as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">classmethod.__get__</code> ignores the instance and binds to the owner class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a module-level function instead of a static method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Often you should. A static method is worth it when the helper is part of the class's public interface, reads naturally as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cls.helper</code>, or should be <strong style="color:#ffca28;">overridable</strong> by subclasses through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.helper()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">classmethod</code> yourself?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A descriptor class whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> stores the function and whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__(self, obj, owner)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types.MethodType(self.f, owner)</code>. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">staticmethod</code> clone just returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.f</code> from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type(C.__dict__["m"])</code> show for each kind?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function</code> for an ordinary method, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">classmethod</code> for a class method and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">staticmethod</code> for a static method. Reading <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">C.m</code> normally goes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code>, so you see a bound <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">method</code> for the class method and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function</code> for the other two.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed in Python 3.13 for class methods?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The ability of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">classmethod</code> to wrap other descriptors such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code> was removed after being deprecated in 3.11. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@classmethod @property</code> now returns a bound method instead of running the property, so class properties need a metaclass or a different design.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Instance method | Ordinary method; receives the instance as \`self\` |
| Class method | \`@classmethod\`; receives the class as \`cls\`, even when called through an instance |
| Static method | \`@staticmethod\`; receives no automatic argument |
| Alternative constructor | A class method that builds an instance from another input format |
| Descriptor | An object with \`__get__\` in a class that controls what attribute access returns |

**Conclusion:** The three method kinds differ only in what their descriptor's \`__get__\` hands back: a method bound to the instance, a method bound to the class, or the raw function. That gives the practical rule — instance method when you need the object, class method when you need the class (alternative constructors and anything that must respect subclasses), static method when you need neither but the helper belongs with the class. Add the two version facts (callable static methods in 3.10, no \`classmethod\`-wrapped properties from 3.13) and you have a complete, senior-level answer.`,
    examples: [
      {
        label: `Instance, class and static methods; alternative constructors and subclasses`,
        code: `# What each kind of method receives as its first argument
class Temperature:
    unit = "C"

    def __init__(self, degrees):
        self.degrees = degrees

    def describe(self):                 # instance method: gets the object
        return f"{self.degrees}{self.unit}"

    @classmethod
    def from_fahrenheit(cls, f):        # class method: gets the class
        return cls(round((f - 32) * 5 / 9, 1))

    @staticmethod
    def is_freezing(c):                 # static method: gets nothing extra
        return c <= 0

    def __repr__(self):
        return f"{type(self).__name__}({self.degrees})"


t = Temperature.from_fahrenheit(212)
print(t)  # Temperature(100.0)
print(t.describe())  # 100.0C
print(Temperature.is_freezing(-3), t.is_freezing(5))  # True False


# The point of cls: alternative constructors follow subclasses
class Kelvinish(Temperature):
    unit = "K?"


k = Kelvinish.from_fahrenheit(32)
print(k, type(k).__name__)  # Kelvinish(0.0) Kelvinish
print(k.describe())  # 0.0K?


# A static method cannot know which class it was called on
class Shape:
    @staticmethod
    def make_static():
        return Shape()                  # hard-coded class name

    @classmethod
    def make_class(cls):
        return cls()


class Circle(Shape):
    pass


print(type(Circle.make_static()).__name__)  # Shape
print(type(Circle.make_class()).__name__)  # Circle


# Called through an instance, a classmethod still gets the class
class Show:
    @classmethod
    def who(cls):
        return cls.__name__

    @staticmethod
    def args(*a):
        return a


print(Show().who(), Show.who())  # Show Show
print(Show.args(1), Show().args(1))  # (1,) (1,)`,
      },
      {
        label: `Descriptor view: __dict__ objects, __get__, __func__ and per-class state`,
        code: `# Under the hood both decorators are descriptors stored in the class __dict__
class C:
    def inst(self):
        return "inst"

    @classmethod
    def klass(cls):
        return cls.__name__

    @staticmethod
    def stat(x):
        return x * 2


raw = C.__dict__
print(type(raw["inst"]).__name__)  # function
print(type(raw["klass"]).__name__)  # classmethod
print(type(raw["stat"]).__name__)  # staticmethod

# Attribute access calls __get__, which decides what you receive
print(type(C.inst).__name__, type(C().inst).__name__)  # function method
print(type(C.klass).__name__, C.klass.__self__ is C)  # method True
print(type(C.stat).__name__)  # function

# Doing the descriptor call by hand gives the same objects
print(raw["klass"].__get__(None, C)())  # C
print(raw["stat"].__get__(None, C)(21))  # 42

# The wrapped function is always reachable
print(raw["klass"].__func__.__name__, raw["stat"].__func__.__name__)  # klass stat

# Since Python 3.10 a bare staticmethod object is itself callable
print(raw["stat"](5))  # 10
try:
    raw["klass"]()
except TypeError as e:
    print("TypeError:", e)


# Class methods see the class they were called on, so per-class state works
class Plugin:
    registry = None

    @classmethod
    def register(cls, name):
        if cls.__dict__.get("registry") is None:
            cls.registry = []
        cls.registry.append(name)


class Audio(Plugin):
    pass


class Video(Plugin):
    pass


Audio.register("mp3")
Video.register("mp4")
Audio.register("wav")
print(Audio.registry, Video.registry, Plugin.registry)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What are bound and unbound methods in Python?`,
    difficulty: "medium",
    seoDescription: `Bound vs unbound methods in Python 3: functions vs method objects, __self__ and __func__, how binding works via __get__, and why Python 2 differed.`,
    description: `**Question presented to candidate:**
"If I write \`obj.method\` without calling it, what do I actually get back? What is a bound method, what did 'unbound method' mean, and how does \`self\` get passed in?"

**What a strong answer should cover:**
- A bound method is an object that pairs a function with an instance: \`obj.method\` gives a \`method\` object with \`__self__\` (the instance) and \`__func__\` (the function); calling it calls \`__func__(__self__, *args)\`.
- In Python 3, \`Class.method\` is just the plain function; the separate "unbound method" type of Python 2 (which type-checked its first argument) was removed in 3.0.
- Binding is done by the descriptor protocol: functions define \`__get__\`, so attribute lookup through an instance calls \`function.__get__(obj, type(obj))\`.
- Every access creates a new bound method object (\`obj.m is obj.m\` is \`False\`, but \`==\` is \`True\`); CPython avoids that allocation for direct calls with \`LOAD_METHOD\` (3.11) / \`LOAD_ATTR\` method form (3.12+).
- Bound methods are first-class callables (callbacks, \`map\`), and they hold a strong reference to the instance; \`weakref.WeakMethod\` avoids keeping it alive.
- Functions stored on an instance are not bound; \`types.MethodType\` binds one by hand.

**Code / implementation expected:** Optional — show \`type(C.f)\` vs \`type(c.f)\`, \`__self__\`/\`__func__\`, and \`C.f(c)\` being the same as \`c.f()\`.`,
    answer: `**Target Audience:** Developers who can write a class and want to understand what \`self\` really is — beginners welcome, intermediate developers will find the CPython detail.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 and 3.13 (identical output; bytecode shown for 3.11 and 3.12); every example also runs in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined right there. All of them are collected in the Quick Glossary at the end. Every output shown was produced by actually running the code.

## 1. Why This Even Matters — A Story First

A coffee shop has one recipe card for "make a latte". The card itself is general: it says "take *the customer's* cup, add espresso, add milk". On its own the card cannot do anything, because it does not know which customer.

When Ann orders, the barista clips the recipe card to Ann's cup. Now the pair — card plus cup — is a complete job that can be done at any moment: "make a latte *for Ann*". The barista could even hand that clipped pair to a colleague, who can finish it without asking whose it is.

The recipe card is the function defined in the class. The clipped pair is a **bound method**: the function with one specific instance already attached. "Unbound method" was the old name for the card on its own. Understanding this explains where \`self\` comes from, why you can pass \`obj.save\` as a callback, and a few memory bugs in event systems — which is why interviewers ask it.

## 2. Function Through the Class, Method Through the Instance

~~~python
class Greeter:
    def __init__(self, name):
        self.name = name

    def hello(self, punct="!"):
        return f"Hello from {self.name}{punct}"

g = Greeter("Ann")
type(Greeter.hello)   # function
type(g.hello)         # method
~~~

📌 **Interview term: Bound method** — an object of type \`method\` produced when you read a function attribute through an instance. It stores the instance in \`__self__\` and the function in \`__func__\`; calling it calls \`__func__(__self__, *args, **kwargs)\`.

📌 **Interview term: \`__self__\` and \`__func__\`** — the two attributes of a bound method: the object it is bound to and the underlying function.

So there is no magic in \`self\`. \`g.hello("?")\` and \`Greeter.hello(g, "?")\` are the same call — the bound method simply puts \`g\` in front of your arguments. The name \`self\` is only a convention; Python passes the instance as the first positional argument whatever it is called.

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="Reading g dot hello wraps the function hello and the instance g into a bound method object whose call passes g as the first argument">
  <defs>
    <marker id="py17q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="40" width="200" height="50" rx="8"/>
  <text class="d-text" x="130" y="70" text-anchor="middle">function hello</text>
  <rect class="d-box-muted" x="30" y="170" width="200" height="50" rx="8"/>
  <text class="d-text" x="130" y="200" text-anchor="middle">instance g</text>
  <path class="d-edge" d="M 232 65 L 300 120" marker-end="url(#py17q5-arrow)"/>
  <path class="d-edge" d="M 232 195 L 300 150" marker-end="url(#py17q5-arrow)"/>
  <rect class="d-box-accent" x="308" y="100" width="190" height="66" rx="8"/>
  <text class="d-text" x="403" y="126" text-anchor="middle">bound method</text>
  <text class="d-sub" x="403" y="148" text-anchor="middle">__func__ + __self__</text>
  <path class="d-edge-accent" d="M 500 133 L 548 133" marker-end="url(#py17q5-arrow)"/>
  <rect class="d-box" x="556" y="100" width="130" height="66" rx="8"/>
  <text class="d-text" x="621" y="126" text-anchor="middle">call</text>
  <text class="d-sub" x="621" y="148" text-anchor="middle">hello(g, ...)</text>
</svg>

Reading \`g.hello\` builds the pair; calling the pair inserts \`g\` as the first argument.

## 3. What "Unbound Method" Meant

In Python 2, \`Greeter.hello\` was not a function but an **unbound method** object. It checked that the first argument you passed was an instance of \`Greeter\` (or a subclass) and raised \`TypeError\` otherwise. Python 3.0 removed that type: accessing a method through the class now returns the plain function, and the old \`im_func\`/\`im_self\` attributes were renamed \`__func__\`/\`__self__\` ([Python 3.0 NEWS](https://svn.python.org/projects/python/tags/r30a2/Misc/NEWS); [PEP 3100](https://peps.python.org/pep-3100/) lists "drop unbound methods" as done).

📌 **Interview term: Unbound method** — the Python 2 object you got from \`Class.method\`: a function plus a class, with a type check on the first argument. In Python 3 the term survives only informally, meaning "the function accessed through the class, before binding".

The practical consequence is visible in the run: \`Greeter.hello(Impostor())\` works in Python 3 because nothing checks the type — any object with a \`.name\` will do. That is [duck typing](/interview-question/what-is-duck-typing-in-python) applied to \`self\`. Calling \`Greeter.hello()\` with no argument fails with the normal "missing 1 required positional argument: 'self'" error, because it is just a function call with too few arguments.

You will still see the word "unbound" in Python 3 tooling — for example \`help(object.__repr__)\` prints \`unbound builtins.object method\` — but it describes how the function is being reached, not a separate type.

## 4. How Binding Works: Functions Are Descriptors

📌 **Interview term: Descriptor protocol** — any object in a class that defines \`__get__\` controls what attribute access returns. Plain functions define \`__get__\`, and that is the whole mechanism of method binding. See [the descriptor protocol](/interview-question/what-is-the-descriptor-protocol).

When you write \`g.hello\`, the [attribute lookup](/interview-question/how-does-attribute-lookup-work-on-a-python-object) finds \`hello\` in \`Greeter.__dict__\`, sees that it has a \`__get__\`, and calls \`Greeter.__dict__["hello"].__get__(g, Greeter)\`. A function \`__get__\` returns a new bound method. With \`None\` as the instance (access through the class) it returns the function itself. You can do every step by hand, as the second example does:

~~~python
func = C.__dict__["f"]
bound = func.__get__(c, C)    # what c.f does
func.__get__(None, C) is func # what C.f does -> True
~~~

The same descriptor idea gives you \`classmethod\` (binds to the class) and \`staticmethod\` (does not bind) — see [classmethod vs staticmethod](/interview-question/what-is-the-difference-between-classmethod-and-staticmethod).

**Instance attributes are not bound.** Binding only happens for functions found on the *class*. If you store a function in an instance attribute (\`c.plain = shout\`), reading it returns the plain function, so \`c.plain()\` fails with a missing-argument error. To attach a real method to one object, use \`types.MethodType(shout, c)\`.

📌 **Interview term: \`types.MethodType\`** — the type of bound methods; calling \`types.MethodType(func, obj)\` creates one by hand.

## 5. A New Object on Every Access — and How CPython Avoids It

Each \`g.hello\` runs \`__get__\` again and builds a fresh \`method\` object, so \`g.hello is g.hello\` is \`False\`. Two bound methods compare equal with \`==\` when they wrap the same function and the same instance, so \`g.hello == g.hello\` is \`True\`.

Allocating an object just to call it immediately would be wasteful, so CPython has a fast path for the common \`obj.method(...)\` form. On 3.11:

~~~python
import dis

dis.dis(compile("g.hello()", "<demo>", "eval"))
~~~

~~~text
  0           0 RESUME                   0

  1           2 LOAD_NAME                0 (g)
              4 LOAD_METHOD              1 (hello)
             26 PRECALL                  0
             30 CALL                     0
             40 RETURN_VALUE
~~~

On 3.12 the same expression compiles to a \`LOAD_ATTR\` with a method flag:

~~~text
  0           0 RESUME                   0

  1           2 LOAD_NAME                0 (g)
              4 LOAD_ATTR                3 (NULL|self + hello)
             24 CALL                     0
             32 RETURN_VALUE
~~~

📌 **Interview term: Method call optimisation** — \`LOAD_METHOD\` (3.11) or \`LOAD_ATTR\` with the \`NULL|self\` form (3.12+) pushes the function and the instance separately onto the stack, so \`obj.m()\` calls \`m(obj)\` directly without creating a bound method object. Writing \`f = obj.m\` and calling \`f()\` later does create one.

## 6. Bound Methods as Values

Because a bound method already carries its instance, you can pass it anywhere a callable is expected: \`button.on_click(self.save)\`, \`map(obj.transform, items)\`, \`sorted(items, key=self.score)\`. The function and the object travel together.

Two consequences follow:

- **It sees later changes.** It holds the instance, not a snapshot, so renaming \`names[0]\` after saving \`names[0].hello\` changes what the saved method prints.
- **It keeps the instance alive.** A bound method holds a strong reference in \`__self__\`. Storing \`obj.handler\` in a global registry means \`obj\` is never garbage collected — a classic leak in observer patterns. \`weakref.WeakMethod\` stores a weak reference to both parts and returns \`None\` once the object is gone. See [weak references](/interview-question/what-is-a-weak-reference-in-python).

📌 **Interview term: \`weakref.WeakMethod\`** — a weak reference designed for bound methods; calling it returns a fresh bound method while the instance lives, and \`None\` after it has been collected.

**Built-in methods follow the same idea, with C types.** \`str.upper\` is a \`method_descriptor\` (the C equivalent of a function in the class), and \`"hi".upper\` is a \`builtin_function_or_method\` whose \`__self__\` is \`"hi"\`. \`str.upper("hi")\` is the same call as \`"hi".upper()\`.

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and \`python3.13\` (identical output) and in Pyodide 0.25.1. The first shows the function/method split, \`__self__\`/\`__func__\`, the three equivalent calls, identity vs equality and methods as callbacks:

~~~text
function
method
True True
Hello from Ann!
Hello from Ann?
Hello from Ann?
Hello from Ann?
TypeError: Greeter.hello() missing 1 required positional argument: 'self'
Hello from an impostor!
False
True
['Hello from Bo!', 'Hello from Cy!']
['Hello from Bo.', 'Hello from Cy.']
Hello from Bo (renamed)!
~~~

The second binds by hand with \`__get__\` and \`types.MethodType\`, shows that instance attributes are not bound, inspects built-in method types and uses \`WeakMethod\`:

~~~text
function
method True
f called on C
True
C says HI
TypeError: shout() missing 1 required positional argument: 'self'
method_descriptor
builtin_function_or_method
hi
HI
handled
True handled
None
~~~

The last line is \`None\` because, after \`del listener\` and \`del strong\`, nothing strong points to the object and CPython reference counting frees it immediately; the \`WeakMethod\` then reports it gone. On an interpreter without reference counting (PyPy) that could happen later.

## 8. Comparison: What You Get From Each Access

| Expression | Python 3 result | Python 2 result |
| :--- | :--- | :--- |
| \`C.f\` | plain \`function\` | unbound method (type-checked) |
| \`c.f\` | bound \`method\`, \`__self__ is c\` | bound method |
| \`C.f(c)\` | works; any object accepted | works; must be a \`C\` instance |
| \`c.f()\` | same as \`C.f(c)\` | same as \`C.f(c)\` |
| \`c.attr = func; c.attr\` | plain \`function\`, not bound | plain function, not bound |

## Common Pitfalls

- **Comparing bound methods with \`is\`.** \`obj.m is obj.m\` is \`False\`; use \`==\`, or compare \`__func__\` and \`__self__\`. This breaks code that tries to unregister a callback by identity.
- **Leaking objects through stored callbacks.** A registry of bound methods keeps every instance alive; use \`WeakMethod\` or unregister explicitly.
- **Assigning a function to an instance and expecting \`self\`.** Only class attributes are bound; use \`types.MethodType\` or put the function on the class.
- **Thinking \`self\` is a keyword.** It is just the first parameter; forgetting it in a \`def\` gives "takes 0 positional arguments but 1 was given".
- **Expecting Python 2 type checks.** \`Class.method(other_object)\` runs happily in Python 3 and may fail deep inside with an \`AttributeError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A bound method is the object you get from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.method</code>: it pairs the function with the instance, stored as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__func__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__self__</code>, and calling it calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__func__(__self__, ...)</code>. That is where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> comes from.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Unbound:</strong> <span style="color:#f0e2c8;">In Python 2, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Class.method</code> was an unbound method that type-checked its first argument. Python 3.0 removed that type, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Class.method</code> is now the plain function and accepts any object.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mechanism:</strong> <span style="color:#f0e2c8;">Binding is the descriptor protocol: functions define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code>, and attribute lookup through an instance calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">func.__get__(obj, type(obj))</code>, which returns a new bound method.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. CPython detail:</strong> <span style="color:#f0e2c8;">Each access builds a new method object, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.m is obj.m</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>. For direct calls CPython skips the allocation with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_METHOD</code> on 3.11 or the method form of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_ATTR</code> on 3.12+.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Practice:</strong> <span style="color:#f0e2c8;">Bound methods make great callbacks because the instance travels with them, but they hold a strong reference, so long-lived registries should use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weakref.WeakMethod</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Class.method(obj)</code> exactly the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">obj.method()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For an ordinary method defined on the class, yes. They differ only when something intercepts the lookup on the instance, such as an instance attribute with the same name or a custom <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattribute__</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.method</code> goes through the instance lookup and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Class.method</code> does not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">c.plain = func; c.plain()</code> fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binding happens only when a function is found on the <strong style="color:#ffca28;">class</strong>; the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code> is returned as is, so no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> is inserted. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types.MethodType(func, c)</code> to bind it to that one object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"hi".upper</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">builtin_function_or_method</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__self__</code> equal to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"hi"</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str.upper</code> itself is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">method_descriptor</code>. C-implemented methods follow the same binding idea as Python functions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you unregister a bound-method callback?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code>, since each access creates a new object; or store the bound method once and reuse that exact object. With weak references, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMethod</code> handles both parts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you write a decorator that works on methods?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Return a plain function (a closure) from the decorator. Because it is a function stored on the class, it is a descriptor and gets bound normally. A decorator that returns a class instance needs its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code> to bind, which is a common bug — see [decorators](/interview-question/what-are-decorators-in-python).</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Bound method | A \`method\` object pairing a function with an instance; calling it passes the instance first |
| \`__self__\` and \`__func__\` | The instance and the function stored in a bound method |
| Unbound method | Python 2 type for \`Class.method\` with a first-argument check; removed in Python 3.0 |
| Descriptor protocol | Objects with \`__get__\` in a class control what attribute access returns; functions use it to bind |
| \`types.MethodType\` | The bound method type; call it to bind a function to an object by hand |
| Method call optimisation | \`LOAD_METHOD\` / \`LOAD_ATTR\` method form that calls \`obj.m()\` without building a bound method |
| \`weakref.WeakMethod\` | Weak reference to a bound method that does not keep the instance alive |

**Conclusion:** A method in Python is just a function stored on the class. Reading it through an instance runs the function's \`__get__\`, which wraps the function and the instance into a bound method — that object is where \`self\` comes from. Python 3 dropped the old unbound-method type, so through the class you simply get the function back. Knowing the descriptor mechanism, the new-object-per-access detail, the \`LOAD_METHOD\` fast path and the strong reference a bound method holds turns a vocabulary question into a demonstration that you understand Python's object model.`,
    examples: [
      {
        label: `Function vs bound method, __self__/__func__, and methods as callbacks`,
        code: `# Python 3: through the class you get a plain function,
# through an instance you get a bound method
class Greeter:
    def __init__(self, name):
        self.name = name

    def hello(self, punct="!"):
        return f"Hello from {self.name}{punct}"


g = Greeter("Ann")

print(type(Greeter.hello).__name__)  # function
print(type(g.hello).__name__)  # method

# A bound method remembers the instance and the function
m = g.hello
print(m.__self__ is g, m.__func__ is Greeter.hello)  # True True
print(m())  # Hello from Ann!

# These three calls are the same thing
print(g.hello("?"))  # Hello from Ann?
print(Greeter.hello(g, "?"))  # Hello from Ann?
print(m.__func__(m.__self__, "?"))  # Hello from Ann?

# The "unbound" call needs self passed by hand
try:
    Greeter.hello()
except TypeError as e:
    print("TypeError:", e)


# Python 3 does no type check on that first argument (Python 2 did)
class Impostor:
    name = "an impostor"


print(Greeter.hello(Impostor()))  # Hello from an impostor!

# Each attribute access builds a NEW bound method object
print(g.hello is g.hello)  # False
print(g.hello == g.hello)  # True

# Bound methods are ordinary callables: pass them around
names = [Greeter(n) for n in ("Bo", "Cy")]
print(list(map(Greeter.hello, names)))
callbacks = [x.hello for x in names]
print([cb(".") for cb in callbacks])

# A bound method keeps its instance alive and sees later changes
saved = names[0].hello
names[0].name = "Bo (renamed)"
print(saved())  # Hello from Bo (renamed)!`,
      },
      {
        label: `Binding by hand: __get__, types.MethodType, built-in methods, WeakMethod`,
        code: `import types
import weakref


# Binding is the descriptor protocol: function.__get__(instance, owner)
class C:
    def f(self):
        return f"f called on {type(self).__name__}"


c = C()
func = C.__dict__["f"]
print(type(func).__name__)  # function
bound = func.__get__(c, C)
print(type(bound).__name__, bound.__self__ is c)  # method True
print(bound())  # f called on C
print(func.__get__(None, C) is func)  # True

# types.MethodType binds any function to any object by hand
def shout(self):
    return f"{type(self).__name__} says HI"


c.shout = types.MethodType(shout, c)
print(c.shout())  # C says HI
# A plain function stored on the INSTANCE is not bound (no descriptor step)
c.plain = shout
try:
    c.plain()
except TypeError as e:
    print("TypeError:", e)

# Built-in types have their own method kinds
print(type(str.upper).__name__)  # method_descriptor
print(type("hi".upper).__name__)  # builtin_function_or_method
print("hi".upper.__self__)  # hi
print(str.upper("hi"))  # HI


# A bound method holds a strong reference; WeakMethod does not
class Listener:
    def on_event(self):
        return "handled"


listener = Listener()
strong = listener.on_event
weak = weakref.WeakMethod(listener.on_event)
print(weak()())
del listener
print(strong.__self__ is not None, strong())
del strong
print(weak())  # None`,
      },
    ],
  },
];

export default augments;
