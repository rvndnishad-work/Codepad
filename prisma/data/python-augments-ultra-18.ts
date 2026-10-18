/**
 * PYTHON ULTRA — batch 18: OOP II (__new__ vs __init__, dataclasses,
 * __slots__, composition versus inheritance, mixins). Every example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is the difference between __new__ and __init__?`,
    difficulty: "medium",
    seoDescription: `__new__ creates and returns the object; __init__ fills in one that already exists. The call order, when __new__ is needed, and the gotchas.`,
    description: `**Question presented to candidate:**
"When I write \`Point(3, 4)\`, Python calls both \`__new__\` and \`__init__\`. What does each one do, in what order, and when would you ever override \`__new__\` instead of just writing an \`__init__\`?"

**What a strong answer should cover:**
- \`__new__(cls, ...)\` runs first: it receives the **class**, creates the object (normally via \`super().__new__(cls)\`) and **returns** it; it is implicitly a static method
- \`__init__(self, ...)\` runs second on the object \`__new__\` returned, sets its attributes and must return \`None\`
- The glue is \`type.__call__\`: it calls \`__new__\`, and only calls \`__init__\` if the result is an instance of the class (a subclass counts)
- When \`__new__\` is the right tool: subclassing immutable types (\`int\`, \`float\`, \`str\`, \`tuple\`), instance caching or singletons, and returning a different (sub)class
- Gotchas: a cached instance still has \`__init__\` re-run on every call, \`object.__new__\` accepts only the class, and \`copy\` / \`pickle\` create objects through \`__new__\` without calling \`__init__\`

**Code / implementation expected:** Optional — a class that prints from both methods to show the order, plus one immutable subclass that needs \`__new__\`.`,
    answer: `**Target Audience:** Python developers who write classes with \`__init__\` and have seen \`__new__\` in library code or an interview question.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17, 3.12 and 3.13, and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of a furniture workshop. One person, the **builder**, takes the order "a chair" and produces a raw wooden chair: it exists, you can point at it, but it has no paint and no cushion. A second person, the **finisher**, takes that chair and paints it, adds the cushion and puts the customer label on it.

Python splits object creation the same way. \`__new__\` is the builder: it makes the object exist and hands it back. \`__init__\` is the finisher: it receives the object that already exists and fills in its attributes. In everyday code you only ever talk to the finisher, because the default builder (\`object.__new__\`) is perfectly good at making blank objects.

The question matters in interviews because it tests whether you know what really happens when you "call a class", and whether you know the handful of cases where the finisher is too late: when the object is **immutable** and must be right the moment it is built, or when you do not want a **new** object at all.

## 2. The Core Idea: Create, Then Initialise

When you write \`Point(3, 4)\`, Python does roughly this:

~~~python
obj = Point.__new__(Point, 3, 4)       # 1. create (gets the class)
if isinstance(obj, Point):
    obj.__init__(3, 4)                 # 2. initialise (gets the instance)
result = obj                           # 3. the call returns obj
~~~

The real code is \`type.__call__\`, written in C, but this is its logic. Because \`Point\` is itself an object whose class is \`type\`, calling \`Point(...)\` calls \`type.__call__(Point, ...)\`.

| | \`__new__\` | \`__init__\` |
| :--- | :--- | :--- |
| Runs | first | second, only if \`__new__\` returned an instance of the class |
| First argument | \`cls\`, the class | \`self\`, the new instance |
| Job | create and **return** the object | set attributes on an object that exists |
| Must return | the object (any object, actually) | \`None\`; anything else is a \`TypeError\` |
| Kind of method | implicitly a \`staticmethod\` | a normal function / method |
| Override it when | immutable subclass, caching, choosing the class | almost always: normal setup goes here |

📌 **Interview term: constructor vs initialiser** — in Python, \`__new__\` is the true **constructor** (it creates the object) and \`__init__\` is the **initialiser** (it configures an existing one). People loosely call \`__init__\` "the constructor"; in an interview, say "initialiser" and then explain why.

📌 **Interview term: \`type.__call__\`** — the method that runs when you call a class. It calls \`cls.__new__\`, checks the result with an \`isinstance\` test, and then calls \`__init__\`. A metaclass can override it to change how instances are made; see [What is a metaclass?](/interview-question/what-is-a-metaclass)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="Calling a class runs type call, which calls new and then init, then returns the object">
  <defs>
    <marker id="py18q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="122" text-anchor="middle">Point(3, 4)</text>
  <text class="d-sub" x="95" y="144" text-anchor="middle">type.__call__</text>
  <rect class="d-box-accent" x="230" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="330" y="72" text-anchor="middle">__new__(cls, 3, 4)</text>
  <text class="d-sub" x="330" y="94" text-anchor="middle">creates, returns obj</text>
  <rect class="d-box" x="230" y="150" width="200" height="70" rx="10"/>
  <text class="d-text" x="330" y="182" text-anchor="middle">__init__(obj, 3, 4)</text>
  <text class="d-sub" x="330" y="204" text-anchor="middle">sets attributes</text>
  <rect class="d-box-muted" x="560" y="90" width="170" height="70" rx="10"/>
  <text class="d-text" x="645" y="122" text-anchor="middle">obj returned</text>
  <text class="d-sub" x="645" y="144" text-anchor="middle">x=3, y=4</text>
  <path class="d-edge" d="M 170 112 L 224 82" marker-end="url(#py18q1-arrow)"/>
  <path class="d-edge-accent" d="M 330 110 L 330 144" marker-end="url(#py18q1-arrow)"/>
  <path class="d-edge" d="M 430 185 L 554 135" marker-end="url(#py18q1-arrow)"/>
</svg>

\`__new__\` is the only step that decides **which** object comes back; \`__init__\` can only modify the object it is given.

## 3. Watching the Two Steps

~~~python
class Point:
    def __new__(cls, x, y):
        print(f"1. __new__(cls={cls.__name__}, x={x}, y={y})")
        obj = super().__new__(cls)          # object.__new__ allocates
        print("   has attributes yet?", vars(obj))
        return obj

    def __init__(self, x, y):
        print(f"2. __init__(self, x={x}, y={y})")
        self.x = x
        self.y = y

p = Point(3, 4)
print("3. result:", vars(p))
~~~

~~~text
1. __new__(cls=Point, x=3, y=4)
   has attributes yet? {}
2. __init__(self, x=3, y=4)
3. result: {'x': 3, 'y': 4}
~~~

What to notice:

- Both methods receive the **same arguments** (\`3, 4\`), because \`type.__call__\` passes the call arguments to each.
- After \`__new__\`, the object exists but its \`__dict__\` is empty. Attributes appear only in \`__init__\`.
- You can run the steps by hand: \`Point.__new__(Point, 5, 6)\` gives an empty object, and \`Point.__init__(q, 5, 6)\` fills it. That is exactly what \`copy\` and \`pickle\` exploit (section 5).
- \`Point.__dict__["__new__"]\` is a \`staticmethod\` object. Python wraps \`__new__\` automatically, which is why you pass \`cls\` explicitly when you call \`super().__new__(cls)\`.

### The three rules that bite

1. **\`__init__\` runs only if \`__new__\` returned an instance of the class.** A \`__new__\` that returns \`42\` makes \`Weird()\` evaluate to \`42\` and \`__init__\` is silently skipped. Returning an instance of a **subclass** still counts: \`Shape(4)\` returning a \`Square\` runs \`Shape.__init__\` on it.
2. **\`__init__\` must return \`None\`.** Returning anything else raises \`TypeError: __init__() should return None, not 'str'\`.
3. **\`object.__new__\` takes only the class.** \`super().__new__(cls, x)\` raises \`TypeError: object.__new__() takes exactly one argument (the type to instantiate)\`. And a class that overrides neither method rejects arguments: \`Plain(1)\` raises \`Plain() takes no arguments\`. If you override \`__new__\` *or* \`__init__\`, \`object\` tolerates the extra arguments on the other one.

📌 **Interview term: factory \`__new__\`** — a \`__new__\` that decides which class to instantiate (or returns an existing object) instead of always making a new instance of \`cls\`. Legal, but surprising to readers; a \`@classmethod\` factory such as \`Shape.from_sides(4)\` is usually clearer. See [What is the difference between classmethod and staticmethod?](/interview-question/what-is-the-difference-between-classmethod-and-staticmethod)

## 4. When You Actually Need \`__new__\`

### 4.1 Subclassing immutable types

An \`int\`, \`float\`, \`str\` or \`tuple\` gets its value when it is **created**. By the time \`__init__\` runs, \`self\` is already the finished value and cannot be changed.

~~~python
class Upper(str):
    def __init__(self, text):
        text = text.upper()      # rebinding a local name; self is unchanged

class Upper2(str):
    def __new__(cls, text):
        return super().__new__(cls, text.upper())

print(Upper("hello"))    # hello
print(Upper2("hello"))   # HELLO
~~~

The same pattern validates or normalises the value before it is frozen: \`Celsius(21.456)\` rounds to \`21.5\` and \`Celsius(-300)\` raises \`ValueError\`, both inside \`__new__\`. Here \`super().__new__(cls, value)\` *does* take the value, because \`float.__new__\` accepts one, unlike \`object.__new__\`. Background on why these types cannot change is in [What are mutable and immutable types in Python?](/interview-question/what-are-mutable-and-immutable-types-in-python)

📌 **Interview term: immutable built-in subclass** — a class like \`class Celsius(float)\`. Its value must be chosen in \`__new__\`, because the object cannot be changed once created.

### 4.2 Instance caching and singletons

\`__new__\` may return an object that already exists. That is how you build a cache or a singleton:

~~~python
class Config:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            print("creating the one Config")
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, env="dev"):
        print("__init__ runs with env =", env)
        self.env = env

a = Config("prod")
b = Config()
print(a is b, a.env)
~~~

~~~text
creating the one Config
__init__ runs with env = prod
__init__ runs with env = dev
True dev
~~~

The trap is in the last line. The object is shared, but **\`__init__\` runs on every call**, and the second call overwrote \`env\` with the default. Fixes: do all set-up in \`__new__\` when the instance is first created, guard \`__init__\` with a flag, or skip the pattern altogether. In Python a module is already a single shared object, and a module-level instance or a \`functools.cache\`-decorated factory function is usually the simpler singleton.

📌 **Interview term: singleton** — a class with at most one instance. In Python it is more often a module-level object than a \`__new__\` trick.

### 4.3 Objects that skip \`__init__\`

\`copy.copy\`, \`copy.deepcopy\` and \`pickle.loads\` rebuild objects by calling \`cls.__new__(cls)\` and then restoring the state directly into the instance. They do not call \`__init__\`. The example counts calls: after one real construction, a copy and a pickle round trip, \`Tracked.inits\` is still \`1\`. So validation that lives only in \`__init__\` does not run for copies and unpickled objects; code that must run there belongs in \`__setstate__\` or \`__reduce__\`. More on copying in [What is the difference between shallow and deep copy?](/interview-question/what-is-the-difference-between-shallow-and-deep-copy)

## 5. Verified: Running the Code

Both examples below the answer were run on python3.11 and in the page runner, and the outputs on 3.12 and 3.13 were identical. Example 1, the call order and the rules:

~~~text
1. __new__(cls=Point, x=3, y=4)
   has attributes yet? {}
2. __init__(self, x=3, y=4)
3. result: {'x': 3, 'y': 4}
1. __new__(cls=Point, x=5, y=6)
   has attributes yet? {}
after __new__ only: {}
2. __init__(self, x=5, y=6)
after __init__ too: {'x': 5, 'y': 6}
staticmethod
function
42 int
TypeError: __init__() should return None, not 'str'
TypeError: Plain() takes no arguments
TypeError: object.__new__() takes exactly one argument (the type to instantiate)
Square 4
~~~

Example 2, immutable subclasses, caching and the objects that skip \`__init__\`:

~~~text
21.5 Celsius 22.5
hello
HELLO
ValueError: below absolute zero
creating the one Config
__init__ runs with env = prod
__init__ runs with env = dev
True dev
x x __init__ calls: 1
~~~

What the run proves rather than asserts:

- \`__new__\` saw the class and the arguments, and the object it returned had an empty \`__dict__\` until \`__init__\` ran.
- \`Weird()\` evaluated to the \`int\` \`42\`, and the "never printed" line was never printed.
- \`Shape(4)\` returned a \`Square\` with \`sides == 4\`: \`__init__\` ran because a subclass instance passes the \`isinstance\` check.
- The singleton returned the same object twice (\`True\`) but \`__init__\` reset \`env\` to \`dev\`.
- One constructor call, one \`copy.copy\` and one pickle round trip produced three objects with \`name == "x"\` and only **one** \`__init__\` call.

## 6. Where Each Belongs

| You want to... | Put it in |
| :--- | :--- |
| Set attributes, validate arguments for a mutable object | \`__init__\` |
| Choose or adjust the value of an \`int\` / \`str\` / \`tuple\` / \`float\` subclass | \`__new__\` |
| Return a cached or shared instance | \`__new__\` (or a factory function) |
| Return an instance of a different class | \`__new__\`, though a \`@classmethod\` factory is clearer |
| Run code when an object is copied or unpickled | \`__setstate__\` / \`__reduce__\`, not \`__init__\` |
| Customise how a whole class family builds instances | a metaclass \`__call__\` |

## Edge Cases Worth Knowing

- **Data classes** generate an \`__init__\`, never a \`__new__\`; a frozen dataclass sets its fields with \`object.__setattr__\` inside that \`__init__\`. See [What are dataclasses?](/interview-question/what-are-dataclasses)
- **\`__slots__\`** objects are also created by \`object.__new__\`; the slots exist but are empty until \`__init__\` assigns them. See [What does __slots__ do?](/interview-question/what-does-slots-do)
- **Calling \`super().__new__(cls)\` with the right class matters.** \`object.__new__(int)\` raises \`TypeError: object.__new__(int) is not safe, use int.__new__()\` on our 3.11 run: each built-in type must be created by its own \`__new__\`.
- **Subclasses inherit a caching \`__new__\` and its cache.** With the \`Config\` pattern, if the parent is created first, \`cls._instance\` on a subclass finds the *inherited* attribute: in a quick 3.11 check, \`S()\` for \`class S(C)\` returned the existing \`C\` instance (\`type(s).__name__\` was \`C\`). Key the cache by class (\`cls.__dict__.get("_instance")\` or a dict keyed by \`cls\`) if subclasses need their own.

## Common Pitfalls

- **Putting normal set-up in \`__new__\`.** It works but surprises every reader; use \`__init__\` unless one of the cases in section 4 applies.
- **Forwarding arguments to \`object.__new__\`.** \`super().__new__(cls, *args)\` fails with "takes exactly one argument" when the parent is \`object\`. Pass only \`cls\`.
- **Forgetting to return from \`__new__\`.** A \`__new__\` without \`return\` returns \`None\`, the call evaluates to \`None\`, and \`__init__\` never runs.
- **Singleton with an \`__init__\`.** The instance is shared, but \`__init__\` runs on every call and resets its state.
- **Trusting \`__init__\` for invariants.** \`copy\`, \`pickle\` and anyone calling \`cls.__new__(cls)\` directly bypass it.
- **"Initialising" an immutable subclass in \`__init__\`.** \`self\` is already the final value; changing a local name changes nothing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two steps:</strong> <span style="color:#f0e2c8;">Calling a class runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type.__call__</code>, which calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__new__</code> to <strong style="color:#ffca28;">create</strong> the object and then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> to <strong style="color:#ffca28;">initialise</strong> it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. __new__:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__new__(cls, ...)</code> receives the class, normally calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().__new__(cls)</code>, and must <strong style="color:#ffca28;">return</strong> the object. It is implicitly a static method.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. __init__:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__(self, ...)</code> receives the object that already exists, sets attributes and returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>. It only runs if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__new__</code> returned an instance of the class.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When __new__:</strong> <span style="color:#f0e2c8;">Override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__new__</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> is too late: subclasses of immutable types like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float</code>, instance caching or singletons, or choosing a different class to return.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Gotchas:</strong> <span style="color:#f0e2c8;">A cached instance still has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> re-run on every call, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__new__</code> takes only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pickle</code> create objects via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__new__</code> and skip <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I not change the value of a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">str</code> subclass in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__init__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A string is immutable and gets its value when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str.__new__</code> creates it. By <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> time <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> is already the final string, so the value must be chosen in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__new__</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return super().__new__(cls, text.upper())</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__new__</code> returns something that is not an instance of the class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The call returns that object and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> is skipped. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type.__call__</code> only calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(obj, cls)</code> is true; an instance of a subclass passes, an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> from a non-int class does not.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You wrote a singleton with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__new__</code>. Any problem?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> still runs on every call, so state can be reset. Our run showed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Config("prod")</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Config()</code> leaving <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">env == "dev"</code>. A module-level instance or a cached factory function is usually simpler.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pickle</code> call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__init__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls.__new__(cls)</code> and restores the state into the instance, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">copy.copy</code> does the same. Code that must run on unpickling goes in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__setstate__</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">super().__new__(cls, x)</code> fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the parent is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__new__</code> accepts only the class and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> for anything else. Built-ins like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float.__new__</code> accept a value, which is why the immutable-subclass pattern passes one.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Constructor vs initialiser | \`__new__\` creates and returns the object; \`__init__\` configures an object that already exists |
| \`type.__call__\` | What runs when you call a class: it calls \`__new__\`, checks \`isinstance\`, then calls \`__init__\` |
| Factory \`__new__\` | A \`__new__\` that returns an existing object or an instance of another class |
| Immutable built-in subclass | A subclass of \`int\`, \`float\`, \`str\`, \`tuple\`: its value must be set in \`__new__\` |
| Singleton | A class with at most one instance; in Python usually a module-level object |

**Conclusion:** Calling a class runs \`type.__call__\`, which first calls \`__new__\` to create and return an object and then, if that object is an instance of the class, calls \`__init__\` to fill it in. \`__new__\` gets the class and controls *which* object you get; \`__init__\` gets the instance and controls *what is in it*, and must return \`None\`. Override \`__init__\` for ordinary set-up, and reach for \`__new__\` only when \`__init__\` is too late: immutable subclasses such as \`str\` or \`float\`, caching or singletons, or returning a different class. Remember the two traps the run showed: a cached instance still has \`__init__\` re-run on every call, and \`copy\` and \`pickle\` build objects through \`__new__\` without calling \`__init__\` at all.`,
    examples: [
      {
        label: `The two steps of construction and the rules that connect them`,
        code: `# Calling a class runs two steps: __new__ makes the object, __init__ fills it in.
class Point:
    def __new__(cls, x, y):
        print(f"1. __new__(cls={cls.__name__}, x={x}, y={y})")
        obj = super().__new__(cls)          # object.__new__ allocates
        print("   has attributes yet?", vars(obj))
        return obj

    def __init__(self, x, y):
        print(f"2. __init__(self, x={x}, y={y})")
        self.x = x
        self.y = y

p = Point(3, 4)
print("3. result:", vars(p))

# Point(3, 4) is really type.__call__(Point, 3, 4). Doing the two steps by hand:
q = Point.__new__(Point, 5, 6)
print("after __new__ only:", vars(q))
Point.__init__(q, 5, 6)
print("after __init__ too:", vars(q))

# __new__ is a static method that takes the CLASS; __init__ takes the instance.
print(type(Point.__dict__["__new__"]).__name__)  # staticmethod
print(type(Point.__dict__["__init__"]).__name__)  # function

# Rule: __init__ only runs if __new__ returns an instance of cls.
class Weird:
    def __new__(cls):
        return 42                           # not a Weird
    def __init__(self):
        print("never printed")

w = Weird()
print(w, type(w).__name__)

# __init__ must return None.
class Bad:
    def __init__(self):
        return "oops"

try:
    Bad()
except TypeError as e:
    print("TypeError:", e)

# object.__new__ rejects extra arguments when __init__ is not overridden.
class Plain:
    pass

try:
    Plain(1)
except TypeError as e:
    print("TypeError:", e)

# Common bug: forwarding the arguments to object.__new__.
class Forward:
    def __new__(cls, x):
        return super().__new__(cls, x)
    def __init__(self, x):
        self.x = x

try:
    Forward(1)
except TypeError as e:
    print("TypeError:", e)

# Returning an instance of a SUBCLASS still counts: __init__ runs on it.
class Shape:
    def __new__(cls, sides):
        target = Square if sides == 4 else cls
        return super().__new__(target)
    def __init__(self, sides):
        self.sides = sides

class Square(Shape):
    pass

s = Shape(4)
print(type(s).__name__, s.sides)`,
      },
      {
        label: `When you need __new__: immutable subclasses, instance caching, copy and pickle`,
        code: `# 1. Immutable types: by the time __init__ runs, the value is already fixed.
class Celsius(float):
    def __new__(cls, value):
        if value < -273.15:
            raise ValueError("below absolute zero")
        return super().__new__(cls, round(value, 1))

t = Celsius(21.456)
print(t, type(t).__name__, t + 1)

class Upper(str):
    def __init__(self, text):
        # too late: self is already the str "hello"; this line changes nothing
        text = text.upper()

print(Upper("hello"))  # hello

class Upper2(str):
    def __new__(cls, text):
        return super().__new__(cls, text.upper())

print(Upper2("hello"))  # HELLO

try:
    Celsius(-300)
except ValueError as e:
    print("ValueError:", e)

# 2. Instance caching in __new__ - and the gotcha: __init__ still runs every time.
class Config:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            print("creating the one Config")
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, env="dev"):
        print("__init__ runs with env =", env)
        self.env = env

a = Config("prod")
b = Config()
print(a is b, a.env)

# 3. copy and pickle build objects with __new__ and skip __init__.
import copy, pickle

class Tracked:
    inits = 0
    def __init__(self, name):
        Tracked.inits += 1
        self.name = name

orig = Tracked("x")
dup = copy.copy(orig)
back = pickle.loads(pickle.dumps(orig))
print(dup.name, back.name, "__init__ calls:", Tracked.inits)`,
      },
    ],
  },
  {
    title: `What are dataclasses?`,
    difficulty: "medium",
    seoDescription: `@dataclass writes __init__, __repr__ and __eq__ from annotated fields: default_factory, __post_init__, frozen, order, slots and kw_only explained.`,
    description: `**Question presented to candidate:**
"We have a lot of small classes that just hold data and every one has the same hand-written \`__init__\`, \`__repr__\` and \`__eq__\`. What does \`@dataclass\` do for us, how do you configure it, and where does it fall short?"

**What a strong answer should cover:**
- \`@dataclass\` (standard library since Python 3.7, PEP 557) reads the **annotated** class attributes as fields and generates \`__init__\`, \`__repr__\` and \`__eq__\` from them, in declaration order
- Defaults and the mutable-default rule: \`list\`, \`dict\` and \`set\` defaults are rejected with \`ValueError\`; use \`field(default_factory=list)\`
- \`__post_init__\` for validation and derived fields, \`field(init=False)\`, \`InitVar\`, and helpers \`asdict\`, \`replace\`, \`fields\`
- Options: \`frozen=True\` (immutable and hashable), \`order=True\` (tuple-style comparisons), \`slots=True\` and \`kw_only=True\` (3.10+); \`eq=True\` alone makes instances unhashable
- Limits: type hints are not validated at runtime (that is what Pydantic is for), default-before-non-default ordering breaks with inheritance, and how it compares with \`NamedTuple\` and plain classes

**Clarifying questions expected:**
- Do the objects need to be immutable or usable as dict keys?
- Is the input trusted, or does it need runtime validation (for example parsed JSON)?

**Code / implementation expected:** Yes — a small dataclass with a \`default_factory\` field and a \`__post_init__\` check, ideally a frozen one used as a dict key.`,
    answer: `**Target Audience:** Python developers who write classes by hand and want to know what \`@dataclass\` generates, which options matter, and where its limits are.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17, 3.12 and 3.13, and in the page runner (Pyodide 0.25.1, CPython 3.11.3). \`slots\`, \`kw_only\` and \`KW_ONLY\` need 3.10+.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine filling in the same paper form for every new customer: name in box one, email in box two, copy the boxes onto a receipt, then compare two forms box by box to see if they are the same customer. It is boring, and the day someone adds a "phone" box, three different places have to change and one of them is always forgotten.

A hand-written data class is that form. You write the field names in \`__init__\`, again in \`__repr__\`, again in \`__eq__\`. A **dataclass** is a rubber stamp: you list the boxes once, as annotated class attributes, and the decorator writes all three methods for you. Add a field and every generated method updates.

Interviewers ask about dataclasses because nearly every modern Python codebase uses them for configuration objects, DTOs, events and value objects, and because the options (\`frozen\`, \`order\`, \`slots\`, \`default_factory\`) reveal whether you understand hashing, mutability and memory.

## 2. The Core Idea: Annotated Fields In, Methods Out

~~~python
from dataclasses import dataclass, field

@dataclass
class Item:
    name: str
    price: float
    qty: int = 1
    tags: list = field(default_factory=list)   # fresh list per instance

a = Item("pen", 1.5)
print(a)                       # Item(name='pen', price=1.5, qty=1, tags=[])
print(a == Item("pen", 1.5))   # True
~~~

The decorator, which became part of the standard library in Python 3.7 through [PEP 557](https://peps.python.org/pep-0557/), runs **once, when the class is created**. It looks at \`__annotations__\`, builds a list of fields in declaration order, and adds methods to the class:

| Generated by default | What it does |
| :--- | :--- |
| \`__init__\` | one parameter per field, in order, with defaults: \`(name: str, price: float, qty: int = 1, tags: list = <factory>) -> None\` |
| \`__repr__\` | \`Item(name='pen', price=1.5, qty=1, tags=[])\` |
| \`__eq__\` | compares the fields as a tuple, and returns \`NotImplemented\` for other types |
| \`__match_args__\` | \`('name', 'price', 'qty', 'tags')\` for positional \`match\` patterns (3.10+) |
| \`__hash__\` | set to \`None\` because \`eq=True\` and not frozen: instances are **unhashable** |

📌 **Interview term: field** — an annotated class attribute that \`@dataclass\` turns into an \`__init__\` parameter and a part of \`__repr__\` and \`__eq__\`. A class attribute **without** an annotation is not a field: in the example, \`Counter.step = 5\` is left out of the signature \`(start: int = 0)\`.

📌 **Interview term: code generation at class creation** — the decorator builds the source of \`__init__\` and friends as text and compiles it with \`exec\`. You can see the trace: \`Item.__init__.__code__.co_filename\` is \`'<string>'\`. The cost is paid once per class, and the generated methods run as fast as hand-written ones.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="Annotated fields go into the dataclass decorator, which adds init, repr and eq methods to the class">
  <defs>
    <marker id="py18q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="200" height="140" rx="10"/>
  <text class="d-text" x="120" y="92" text-anchor="middle">class body</text>
  <text class="d-sub" x="120" y="122" text-anchor="middle">name: str</text>
  <text class="d-sub" x="120" y="146" text-anchor="middle">price: float</text>
  <text class="d-sub" x="120" y="170" text-anchor="middle">qty: int = 1</text>
  <rect class="d-box-accent" x="290" y="95" width="170" height="70" rx="10"/>
  <text class="d-text" x="375" y="126" text-anchor="middle">@dataclass</text>
  <text class="d-sub" x="375" y="148" text-anchor="middle">reads annotations</text>
  <rect class="d-box" x="540" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="640" y="54" text-anchor="middle">__init__</text>
  <rect class="d-box" x="540" y="102" width="200" height="56" rx="10"/>
  <text class="d-text" x="640" y="136" text-anchor="middle">__repr__</text>
  <rect class="d-box" x="540" y="184" width="200" height="56" rx="10"/>
  <text class="d-text" x="640" y="218" text-anchor="middle">__eq__</text>
  <path class="d-edge" d="M 220 130 L 284 130" marker-end="url(#py18q2-arrow)"/>
  <path class="d-edge-accent" d="M 460 115 L 534 52" marker-end="url(#py18q2-arrow)"/>
  <path class="d-edge-accent" d="M 460 130 L 534 130" marker-end="url(#py18q2-arrow)"/>
  <path class="d-edge-accent" d="M 460 145 L 534 208" marker-end="url(#py18q2-arrow)"/>
</svg>

The result is still an ordinary class: you can add methods, properties and class attributes, and inherit from it.

## 3. Defaults, \`default_factory\` and \`__post_init__\`

### Mutable defaults are refused

A default value is evaluated once and would be shared by every instance, the same trap as [Why is using a mutable default argument dangerous?](/interview-question/why-is-using-a-mutable-default-argument-dangerous). Dataclasses refuse the common cases when the class is created:

~~~text
ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory
~~~

The check rejects \`list\`, \`dict\` and \`set\` (strictly, on our 3.11 run: any default whose class sets \`__hash__ = None\`, so a custom unhashable class is rejected too). \`field(default_factory=list)\` calls \`list()\` on **every** construction, which is why \`a.tags.append("office")\` left \`b.tags\` empty in the run.

📌 **Interview term: \`default_factory\`** — a zero-argument callable that \`field()\` runs to build a fresh default for each instance. The signature shows it as \`<factory>\`.

### Validation and derived fields

The generated \`__init__\` assigns the fields and then calls \`__post_init__\` if you defined one:

~~~python
@dataclass
class Order:
    unit_price: float
    qty: int
    total: float = field(init=False)      # not an __init__ parameter

    def __post_init__(self):
        if self.qty <= 0:
            raise ValueError("qty must be positive")
        self.total = self.unit_price * self.qty
~~~

\`Order(2.5, 4)\` prints \`Order(unit_price=2.5, qty=4, total=10.0)\` and \`Order(1.0, 0)\` raises. An \`InitVar[str]\` field goes the other way: it **is** an \`__init__\` parameter, is passed to \`__post_init__\`, and is **not** stored. The run turns a password into \`pw_len=6\` without keeping the password.

📌 **Interview term: \`__post_init__\`** — a hook the generated \`__init__\` calls last; the place for validation, normalisation and computed fields.

### Type hints are not checked

\`Item(name=123, price="free")\` runs without complaint and prints \`Item(name=123, price='free', qty=1, tags=[])\`. The annotations only tell the decorator what the fields are and tell type checkers what to expect. For runtime validation and parsing use Pydantic: [How does Pydantic v2 validation work (BaseModel, field_validator, mode)?](/interview-question/how-does-pydantic-v2-validation-work-basemodel-field-validator-mode)

### Helpers

- \`asdict(obj)\` converts recursively to plain dicts and lists (it deep-copies the values).
- \`replace(obj, qty=3)\` builds a **new** instance by calling \`__init__\` again, so \`__post_init__\` runs. It is a shallow copy: \`c.tags is a.tags\` printed \`True\`. Python 3.13 added the general \`copy.replace()\`, which supports dataclasses through \`__replace__\` ([copy docs](https://docs.python.org/3.13/library/copy.html)).
- \`fields(cls)\` returns \`Field\` objects with \`name\`, \`type\`, \`default\` and \`metadata\`, which libraries use for serialisation.

## 4. The Options That Matter

~~~python
@dataclass(frozen=True)          # immutable, hashable
@dataclass(order=True)           # <, <=, >, >= by field tuple
@dataclass(slots=True)           # __slots__, no __dict__ (3.10+)
@dataclass(kw_only=True)         # every field keyword-only (3.10+)
~~~

\`slots\`, \`kw_only\` and \`match_args\` appear as new parameters in the [Python 3.10 dataclasses documentation](https://docs.python.org/3.10/library/dataclasses.html), and \`weakref_slot\` was added in 3.11.

| Option | Effect seen in the run | Use it for |
| :--- | :--- | :--- |
| \`frozen=True\` | \`p.x = 10\` raises \`FrozenInstanceError: cannot assign to field 'x'\`; \`hash(p) == hash(Point(1, 2))\` | value objects, dict keys, set members, config |
| \`order=True\` | \`sorted()\` gave \`0.9\`, \`1.2\`, \`1.10\` (tuples of ints, not strings) | sortable records |
| \`field(compare=False)\` | \`Version(1, 2) == Version(1, 2, "final")\` is \`True\` | caches, labels, ids that should not affect equality |
| \`slots=True\` | \`Pixel.__slots__ == ('x', 'y')\`, no \`__dict__\`, \`px.colour = ...\` raises \`AttributeError\` | many small objects; typo protection |
| \`kw_only=True\` / \`KW_ONLY\` | \`Request("/api", 1.0)\` raises \`takes 2 positional arguments but 3 were given\` | readable calls, and fixing the inheritance ordering problem |
| \`unsafe_hash=True\` | generates \`__hash__\` on a mutable class | rarely; only if you never mutate hashed fields |

📌 **Interview term: frozen dataclass** — a dataclass whose \`__setattr__\` and \`__delattr__\` raise \`FrozenInstanceError\`, which makes it safe to generate \`__hash__\` from the fields. It is *shallowly* immutable: a list field can still be appended to. The hashing rules are in [What is the __hash__ and __eq__ contract?](/interview-question/what-is-the-hash-and-eq-contract)

📌 **Interview term: \`slots=True\`** — the decorator creates a **new** class with \`__slots__\` for the fields, so instances have no per-instance \`__dict__\`. The memory and attribute details are in [What does __slots__ do?](/interview-question/what-does-slots-do). One documented gotcha ([gh-90562](https://github.com/python/cpython/issues/90562)): because the class is replaced, a zero-argument \`super()\` inside its methods raised \`TypeError: super(type, obj): obj must be an instance or subtype of type\` on our 3.11 and 3.12 runs. On our 3.13.16 run the same code worked, so a later fix landed; the two-argument form \`super(Cls, self)\` works on every version.

## 5. Inheritance and the Ordering Rule

Fields of a base class come **first** in the generated \`__init__\`. So a base with a default followed by a child field without one produces an impossible signature:

~~~text
TypeError: non-default argument 'name' follows default argument
~~~

(3.13 adds the name of the earlier field: \`... follows default argument 'id'\`.) Fixes: give the child field a default, or mark fields keyword-only with \`kw_only=True\` or a \`_: KW_ONLY\` marker, since keyword-only parameters can come in any order.

📌 **Interview term: \`KW_ONLY\` sentinel** — a pseudo-field annotation; every field after \`_: KW_ONLY\` becomes a keyword-only \`__init__\` parameter.

## 6. Verified: Running the Code

Both examples below the answer were run on python3.11 and in the page runner. Example 1, what is generated, defaults, \`__post_init__\` and the helpers:

~~~text
Item(name='pen', price=1.5, qty=1, tags=[])
True False
(name: str, price: float, qty: int = 1, tags: list = <factory>) -> None
['__init__', '__repr__', '__eq__']
None
['office'] []
ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory
(start: int = 0) -> None ['start']
Order(unit_price=2.5, qty=4, total=10.0)
ValueError: qty must be positive
{'name': 'pen', 'price': 1.5, 'qty': 1, 'tags': ['office']}
3 1 True
Item(name=123, price='free', qty=1, tags=[])
~~~

Example 2, the options, inheritance and pattern matching:

~~~text
FrozenInstanceError: cannot assign to field 'x'
True origin-ish
[Version(major=0, minor=9, label=''), Version(major=1, minor=2, label='rc'), Version(major=1, minor=10, label='')]
True
('x', 'y') False
AttributeError: 'Pixel' object has no attribute 'colour'
Request(url='/api', timeout=5.0, retries=2)
TypeError: Request.__init__() takes 2 positional arguments but 3 were given
User(name='ana', pw_len=6)
TypeError: non-default argument 'name' follows default argument
('x', 'y')
x is 1, y is 2
~~~

What the run proves:

- The generated \`__init__\` has the exact signature you would write by hand, and \`Item.__hash__\` is \`None\`: an \`eq=True\` dataclass that is not frozen cannot go in a set.
- \`field(default_factory=list)\` gave each instance its own list, while a plain \`[]\` default was rejected at class-creation time.
- \`order=True\` compared \`(1, 10)\` with \`(1, 2)\` as integers, so \`1.10\` sorted after \`1.2\`.
- \`slots=True\` removed \`__dict__\`; the frozen \`Point\` worked as a dict key and in a \`match\` statement with positional patterns.
- On 3.13 the only differences were longer error messages (\`... and no __dict__ for setting new attributes\`, \`... follows default argument 'id'\`).

## 7. Dataclass vs the Alternatives

| | Plain class | \`@dataclass\` | \`typing.NamedTuple\` | Pydantic \`BaseModel\` |
| :--- | :--- | :--- | :--- | :--- |
| Boilerplate | all by hand | generated | generated | generated |
| Mutable | yes | yes, or \`frozen=True\` | no (it is a tuple) | yes, configurable |
| Runtime type validation | manual | **no** | no | yes, with coercion |
| Unpacks / indexes like a tuple | no | no | yes: \`x, y = p\`, \`p[0]\` | no |
| Memory | \`__dict__\` | \`__dict__\`, or none with \`slots=True\` | tuple, no \`__dict__\` | larger |
| Dependency | none | standard library | standard library | third-party |

Rule of thumb: dataclass for internal data you trust, \`NamedTuple\` when tuple behaviour is a feature, Pydantic at the boundary where untrusted input arrives, and an \`Enum\` for a fixed set of named values ([What is the enum module and when should you use it?](/interview-question/what-is-the-enum-module-and-when-should-you-use-it)).

## Edge Cases Worth Knowing

- **\`ClassVar\` annotations are excluded.** \`count: ClassVar[int] = 0\` stays a class attribute, not a field.
- **Frozen means shallow.** A frozen dataclass with a list field still lets you call \`f.xs.append(2)\`, and \`hash(f)\` then raises \`TypeError: unhashable type: 'list'\` because the generated hash hashes the field tuple.
- **\`__eq__\` is type-strict.** \`Item("a") == ("a", 1)\` returns \`NotImplemented\` from \`__eq__\`, so the comparison ends \`False\`; a subclass instance is not equal to a parent instance either.
- **Defining a method yourself wins.** If you write \`__repr__\` in the class body, the decorator does not overwrite it (for \`__init__\`, \`__repr__\` and \`__eq__\`).
- **\`frozen=True\` and \`__post_init__\`.** Assigning a derived field in \`__post_init__\` of a frozen class needs \`object.__setattr__(self, "total", ...)\`.

## Common Pitfalls

- **Expecting validation from annotations.** \`price: float\` accepts \`"free"\`. Validate in \`__post_init__\` or use Pydantic.
- **Mutable defaults.** Use \`field(default_factory=list)\`; a plain list default raises \`ValueError\` when the class is defined.
- **Putting an unhashable dataclass in a set.** \`eq=True\` without \`frozen=True\` sets \`__hash__ = None\`. Freeze it instead of reaching for \`unsafe_hash=True\`.
- **Inheriting fields with defaults.** A required child field after a defaulted parent field raises \`TypeError\`; use \`kw_only\`.
- **\`replace()\` sharing nested objects.** It is a shallow copy; nested lists are the same object in both instances.
- **Zero-argument \`super()\` in a \`slots=True\` class** on older interpreters; use \`super(Cls, self)\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass</code> is a class decorator from the standard library (3.7, PEP 557). It reads the <strong style="color:#ffca28;">annotated</strong> class attributes as fields and generates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> in declaration order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Defaults:</strong> <span style="color:#f0e2c8;">Plain defaults work, but mutable ones like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code> at class creation; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">field(default_factory=list)</code> for a fresh object per instance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Hooks:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__post_init__</code> runs after the generated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> for validation or derived fields; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">field(init=False)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">InitVar</code> control what is a parameter and what is stored.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Options:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozen=True</code> makes it immutable and hashable, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">order=True</code> adds comparisons, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slots=True</code> removes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kw_only=True</code> makes fields keyword-only; the last two need 3.10+.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Annotations are not validated at runtime, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eq=True</code> alone makes instances unhashable, and inheriting a defaulted field before a required one is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is my dataclass instance unhashable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eq=True</code> (the default) generates <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> and, without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozen=True</code>, sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>: a mutable object that compares by value must not be hashed. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozen=True</code> to get a field-based <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a dataclass check that <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">price: float</code> is a float?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The run created <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Item(name=123, price='free')</code> without error. Annotations define the fields and help type checkers; validate in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__post_init__</code> or use Pydantic for untrusted input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you give a field a list default?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tags: list = field(default_factory=list)</code>. A bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[]</code> would be shared by all instances, so the decorator rejects it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError: mutable default ... use default_factory</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Dataclass or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NamedTuple</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NamedTuple</code> is an immutable tuple: it unpacks, indexes and is small. A dataclass is a normal class: mutable by default, supports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__post_init__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">slots</code>, inheritance and methods without tuple behaviour.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">slots=True</code> change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The decorator returns a new class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code> for the fields, so instances have no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, use less memory and reject unknown attributes. Watch for zero-argument <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code> failing on older versions.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Field | An annotated class attribute that becomes an \`__init__\` parameter and part of \`__repr__\` / \`__eq__\` |
| Code generation at class creation | The decorator builds method source and compiles it once, when the class is defined |
| \`default_factory\` | A zero-argument callable run on every construction to build a fresh default |
| \`__post_init__\` | Hook called at the end of the generated \`__init__\` for validation and derived fields |
| Frozen dataclass | Assignment raises \`FrozenInstanceError\`; \`__hash__\` is generated from the fields |
| \`slots=True\` | Generates \`__slots__\` for the fields, so instances have no \`__dict__\` (3.10+) |
| \`KW_ONLY\` sentinel | \`_: KW_ONLY\` makes every following field a keyword-only parameter |

**Conclusion:** A dataclass is an ordinary class whose boilerplate is written for you: the decorator reads the annotated fields once, at class-creation time, and generates \`__init__\`, \`__repr__\`, \`__eq__\` and \`__match_args__\` in declaration order. Use \`field(default_factory=...)\` for mutable defaults and \`__post_init__\` for validation or derived values. The options are where interview points are: \`frozen=True\` for immutable, hashable value objects, \`order=True\` for sorting, \`slots=True\` for smaller objects without \`__dict__\`, and \`kw_only\` to keep signatures readable and solve the inheritance ordering problem. Know its limits too: annotations are not validated at runtime, and a mutable dataclass with \`eq=True\` is unhashable.`,
    examples: [
      {
        label: `What @dataclass generates, default_factory, __post_init__ and the helpers`,
        code: `from dataclasses import dataclass, field, fields, asdict, replace
import inspect

# Annotated class attributes become fields; the decorator writes the methods.
@dataclass
class Item:
    name: str
    price: float
    qty: int = 1
    tags: list = field(default_factory=list)   # fresh list per instance

a = Item("pen", 1.5)
b = Item("pen", 1.5)
print(a)
print(a == b, a is b)
print(inspect.signature(Item))

# The generated methods are ordinary functions on the class.
print([n for n in ("__init__", "__repr__", "__eq__") if n in Item.__dict__])
# eq=True without frozen=True sets __hash__ to None: instances are unhashable.
print(Item.__hash__)  # None

a.tags.append("office")
print(a.tags, b.tags)

# A plain mutable default is rejected when the class is created.
try:
    @dataclass
    class Cart:
        items: list = []
except ValueError as e:
    print("ValueError:", e)

# A name without an annotation is NOT a field, just a class attribute.
@dataclass
class Counter:
    start: int = 0
    step = 5

print(inspect.signature(Counter), [f.name for f in fields(Counter)])

# __post_init__ runs after the generated __init__: validate or derive fields.
@dataclass
class Order:
    unit_price: float
    qty: int
    total: float = field(init=False)

    def __post_init__(self):
        if self.qty <= 0:
            raise ValueError("qty must be positive")
        self.total = self.unit_price * self.qty

o = Order(2.5, 4)
print(o)
try:
    Order(1.0, 0)
except ValueError as e:
    print("ValueError:", e)

# Helpers: asdict (recursive), replace (a new object), fields (metadata).
print(asdict(a))
c = replace(a, qty=3)
print(c.qty, a.qty, c.tags is a.tags)
# Type hints are NOT enforced at runtime.
print(Item(name=123, price="free"))`,
      },
      {
        label: `frozen, order, slots, kw_only, InitVar, inheritance and match`,
        code: `from dataclasses import dataclass, field, KW_ONLY, InitVar, FrozenInstanceError

# frozen=True: assignment raises, and __hash__ is generated from the fields.
@dataclass(frozen=True)
class Point:
    x: int
    y: int

p = Point(1, 2)
try:
    p.x = 10
except FrozenInstanceError as e:
    print("FrozenInstanceError:", e)
print(hash(p) == hash(Point(1, 2)), {p: "origin-ish"}[Point(1, 2)])

# order=True: comparisons compare the fields as a tuple, in declaration order.
@dataclass(order=True)
class Version:
    major: int
    minor: int
    label: str = field(default="", compare=False)

vs = [Version(1, 10), Version(1, 2, "rc"), Version(0, 9)]
print(sorted(vs))
print(Version(1, 2) == Version(1, 2, "final"))  # True

# slots=True (3.10+): no per-instance __dict__, unknown attributes rejected.
@dataclass(slots=True)
class Pixel:
    x: int
    y: int

px = Pixel(0, 0)
print(Pixel.__slots__, hasattr(px, "__dict__"))  # ('x', 'y') False
try:
    px.colour = "red"
except AttributeError as e:
    print("AttributeError:", e)

# kw_only / KW_ONLY (3.10+): fields after the marker must be passed by name.
@dataclass
class Request:
    url: str
    _: KW_ONLY
    timeout: float = 5.0
    retries: int = 0

print(Request("/api", retries=2))
try:
    Request("/api", 1.0)
except TypeError as e:
    print("TypeError:", e)

# InitVar: an __init__ argument that is passed to __post_init__, not stored.
@dataclass
class User:
    name: str
    password: InitVar[str]
    pw_len: int = field(init=False)

    def __post_init__(self, password):
        self.pw_len = len(password)

print(User("ana", "s3cret"))

# Inheritance: base fields come first, so a default cannot precede a non-default.
@dataclass
class Base:
    id: int = 0

try:
    @dataclass
    class Child(Base):
        name: str
except TypeError as e:
    print("TypeError:", e)

# match_args: positional patterns in match/case work out of the box.
print(Point.__match_args__)  # ('x', 'y')
match p:
    case Point(1, y):
        print("x is 1, y is", y)`,
      },
    ],
  },
  {
    title: `What does __slots__ do?`,
    difficulty: "medium",
    seoDescription: `__slots__ replaces the per-instance __dict__ with fixed fields: less memory, typo-proof attributes. How it works and the inheritance and weakref gotchas.`,
    description: `**Question presented to candidate:**
"Some classes in our codebase declare \`__slots__ = ('x', 'y')\`. What does that actually change about the objects, why would you do it, and what breaks when you do?"

**What a strong answer should cover:**
- \`__slots__\` declares a fixed set of attribute names; instances get fixed storage for them instead of a per-instance \`__dict__\`
- Effects: less memory per object (no dict), and assigning an undeclared attribute raises \`AttributeError\`
- How: each slot is a **member descriptor** on the class (\`type(Cls.__dict__['x'])\` is \`member_descriptor\`) that reads and writes a fixed offset in the object
- Inheritance rules: every class in the chain must define \`__slots__\` (only new names) or a \`__dict__\` comes back; two bases with non-empty slots cannot be combined
- Costs: no weak references unless \`'__weakref__'\` is listed, no class-attribute defaults with the same name, no \`vars()\` or \`cached_property\`; \`@dataclass(slots=True)\` (3.10+) generates them for you

**Clarifying questions expected:**
- How many instances are alive at once? (the saving only matters with many objects)
- Is the class part of a hierarchy, or used with weak references or \`cached_property\`?

**Code / implementation expected:** Optional — a slotted class next to a plain one showing the missing \`__dict__\` and the \`AttributeError\` on a typo.`,
    answer: `**Target Audience:** Python developers who know classes and instance attributes and want to understand what \`__slots__\` changes under the hood.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17, 3.12 and 3.13, and in the page runner (Pyodide 0.25.1, CPython 3.11.3). Memory figures are from our CPython runs and vary by version.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture two kinds of suitcase. The first is a duffel bag: you can stuff anything into it, any time, and it stretches. The second is a moulded case with exactly two cut-outs, one for a camera and one for a lens. You cannot add a sandwich, but it is smaller, nothing rattles, and if you try to put the lens in the camera slot you notice straight away.

A normal Python object is the duffel bag. Its attributes live in a dictionary, \`obj.__dict__\`, and you can add new ones whenever you like, including by accident (\`user.emial = ...\`). A class with \`__slots__\` makes moulded cases: each instance has a fixed place for each declared attribute and no dictionary at all.

That matters when you have **many** small objects (millions of points, nodes or records), where the dictionaries are a big part of the memory bill, and when you want misspelled attribute names to fail loudly.

## 2. The Core Idea: A Fixed Set of Names, No \`__dict__\`

~~~python
class PlainPoint:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class SlotPoint:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x = x
        self.y = y
~~~

| | \`PlainPoint\` | \`SlotPoint\` |
| :--- | :--- | :--- |
| \`hasattr(obj, "__dict__")\` | \`True\` | \`False\` |
| \`obj.z = 3\` | silently adds \`z\` | \`AttributeError: 'SlotPoint' object has no attribute 'z'\` |
| Where \`x\` lives | key \`'x'\` in the instance dict | a fixed field inside the object |
| \`vars(obj)\` | \`{'x': 1, 'y': 2}\` | \`TypeError: vars() argument must have __dict__ attribute\` |
| Weak references | allowed | only if \`'__weakref__'\` is in \`__slots__\` |

📌 **Interview term: \`__slots__\`** — a class attribute (a tuple, list or dict of names) that tells CPython to reserve one storage field per name in each instance and to skip creating the instance \`__dict__\` and \`__weakref__\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="A plain object points to a separate dict of attributes, a slotted object stores x and y in fixed fields">
  <defs>
    <marker id="py18q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="190" y="28" text-anchor="middle">PlainPoint(1, 2)</text>
  <rect class="d-box-muted" x="30" y="50" width="140" height="150" rx="10"/>
  <text class="d-sub" x="100" y="84" text-anchor="middle">header</text>
  <text class="d-sub" x="100" y="124" text-anchor="middle">dict pointer</text>
  <text class="d-sub" x="100" y="164" text-anchor="middle">weakref pointer</text>
  <rect class="d-box" x="230" y="80" width="130" height="100" rx="10"/>
  <text class="d-text" x="295" y="114" text-anchor="middle">__dict__</text>
  <text class="d-sub" x="295" y="140" text-anchor="middle">x: 1</text>
  <text class="d-sub" x="295" y="162" text-anchor="middle">y: 2</text>
  <path class="d-edge" d="M 170 124 L 224 124" marker-end="url(#py18q3-arrow)"/>
  <text class="d-text" x="590" y="28" text-anchor="middle">SlotPoint(1, 2)</text>
  <rect class="d-box-accent" x="500" y="50" width="180" height="150" rx="10"/>
  <text class="d-sub" x="590" y="84" text-anchor="middle">header</text>
  <text class="d-text" x="590" y="124" text-anchor="middle">slot x = 1</text>
  <text class="d-text" x="590" y="164" text-anchor="middle">slot y = 2</text>
</svg>

The plain object carries a pointer to a separate dictionary that holds the names and values; the slotted object holds the values directly, and the names live once, on the class.

## 3. How It Works: Slots Are Descriptors

When the class statement runs, \`type\` reads \`__slots__\`, reserves one pointer-sized field per name in the instance layout, and puts a **member descriptor** on the class for each name:

~~~python
print(type(SlotPoint.__dict__["x"]).__name__)   # member_descriptor
print(SlotPoint.x)                              # <member 'x' of 'SlotPoint' objects>
print("__dict__" in SlotPoint.__dict__)         # False
~~~

\`s.x\` finds the descriptor on the class, and the descriptor reads the field at a fixed offset inside \`s\`. That is the same machinery \`@property\` uses; see [What is the descriptor protocol?](/interview-question/what-is-the-descriptor-protocol). Because the descriptor lives in the class namespace under the slot name, you cannot *also* put a class attribute there:

~~~text
ValueError: 'x' in __slots__ conflicts with class variable
~~~

So slotted classes cannot use \`x = 0\` as a default; set defaults in \`__init__\`, or use a dataclass, which handles it. A declared slot that was never assigned simply raises \`AttributeError\` on read.

📌 **Interview term: member descriptor** — the C-level descriptor CPython creates for each slot; its \`__get__\` and \`__set__\` read and write a fixed offset in the instance.

## 4. The Memory Saving, Measured

The example measures it in a way that prints a stable answer, and these are the numbers from our runs, for 10,000 two-attribute objects measured with \`tracemalloc\` (includes the list holding them):

| Interpreter | Plain class | \`__slots__\` class | \`getsizeof(obj)\` plain / slotted | \`getsizeof(obj.__dict__)\` |
| :--- | ---: | ---: | :---: | ---: |
| CPython 3.11.17 | 1,359,632 bytes | 876,896 bytes | 56 / 48 | 96 |
| CPython 3.12 | 1,279,632 bytes | 876,896 bytes | 48 / 48 | 96 |
| CPython 3.13.16 | 1,359,808 bytes | 876,896 bytes | 48 / 48 | 96 |

So on these runs the slotted objects used about 35% less memory. The gap is smaller than old blog posts suggest because CPython already shares the key table between instance dicts of one class ([PEP 412](https://peps.python.org/pep-0412/), key-sharing dictionaries, Python 3.3) and has kept changing how instance attributes are stored, which is why the per-version numbers above differ. Note also that \`sys.getsizeof\` does **not** include the separate dict, which is why the example adds \`getsizeof(p.__dict__)\` before comparing. Measure your real workload before relying on a figure. Background: [How does Python manage memory and garbage collection?](/interview-question/how-does-python-manage-memory-and-garbage-collection)

📌 **Interview term: key-sharing dictionary** — a CPython optimisation where instance dicts of the same class share one table of keys and each instance stores only its values.

## 5. Inheritance: Where Slots Go Wrong

Slots only help if **every** class in the chain cooperates:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="A subclass with slots stays without a dict, a subclass without slots gets a dict back">
  <defs>
    <marker id="py18q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="280" y="20" width="200" height="64" rx="10"/>
  <text class="d-text" x="380" y="48" text-anchor="middle">Base</text>
  <text class="d-sub" x="380" y="70" text-anchor="middle">slots: id</text>
  <rect class="d-box-accent" x="60" y="146" width="240" height="64" rx="10"/>
  <text class="d-text" x="180" y="174" text-anchor="middle">Tight(Base)</text>
  <text class="d-sub" x="180" y="196" text-anchor="middle">slots: name, no dict</text>
  <rect class="d-box-muted" x="460" y="146" width="240" height="64" rx="10"/>
  <text class="d-text" x="580" y="174" text-anchor="middle">Loose(Base)</text>
  <text class="d-sub" x="580" y="196" text-anchor="middle">no slots, gets a dict</text>
  <path class="d-edge" d="M 180 140 L 330 90" marker-end="url(#py18q3-arrow2)"/>
  <path class="d-edge-dashed" d="M 580 140 L 430 90" marker-end="url(#py18q3-arrow2)"/>
</svg>

The arrows point from each subclass to the base it inherits from. The rules, each shown in example 2:

1. **A subclass without \`__slots__\` gets a \`__dict__\` back.** \`Loose(Base)\` has one; the parent saving is lost for it.
2. **List only the new names in a subclass.** \`Tight\` declares \`("name",)\` and inherits \`id\`. Repeating a parent slot wastes space and hides the parent descriptor.
3. **A parent with a \`__dict__\` defeats the child.** \`Pointless(Normal)\` declares slots, but \`obj.anything = 1\` still works because \`Normal\` already gave instances a dict.
4. **Two bases that both add slots cannot be combined.** \`class AB(A, B)\` raises \`TypeError: multiple bases have instance lay-out conflict\`, because both want their fields at the same offset. Base classes meant for mixing should declare \`__slots__ = ()\`, which keeps children slotted and combines freely. See [What are mixins in Python?](/interview-question/what-are-mixins-in-python)

📌 **Interview term: instance layout conflict** — the \`TypeError\` raised when multiple base classes each define their own non-empty fixed storage, so no single memory layout satisfies both.

## 6. Opting Back In: \`__weakref__\` and \`__dict__\`

Slots remove two things by default, and you can add each back by name:

- \`"__weakref__"\`: without it, \`weakref.ref(obj)\` raises \`TypeError: cannot create weak reference to 'Base' object\`. Caches built on \`weakref.WeakValueDictionary\` need it. See [What is a weak reference in Python?](/interview-question/what-is-a-weak-reference-in-python)
- \`"__dict__"\`: the declared names get fixed fields and anything else goes into a dict. \`Hybrid\` printed \`{'extra': 2}\` from \`vars(h)\`: the slot \`fixed\` is not in the dict.

Two more details: \`__slots__\` may be a **dict** whose values document each slot (\`inspect.getdoc(Doc.x)\` returned the text on our 3.11 and 3.13 runs), and slotted objects pickle fine with the default protocol, which the example round-trips.

## 7. Verified: Running the Code

Both examples below the answer were run on python3.11 and in the page runner. Example 1, the basics and the memory check:

~~~text
True False
{'x': 1, 'y': 2}
{'x': 1, 'y': 2, 'z': 3}
AttributeError: 'SlotPoint' object has no attribute 'z'
member_descriptor
<member 'x' of 'SlotPoint' objects>
False False
AttributeError: 'Lazy' object has no attribute 'value'
ValueError: 'x' in __slots__ conflicts with class variable
slotted object smaller: True
plain uses more memory than slots: True
11 2 2
~~~

Example 2, inheritance and the opt-ins:

~~~text
True False
1 ana
{'anything': 1}
TypeError: cannot create weak reference to 'Base' object
True
{'extra': 2}
TypeError: multiple bases have instance lay-out conflict
False
1 ana
the horizontal position
~~~

What the run proves:

- The slotted object has no \`__dict__\`, has a \`member_descriptor\` for each slot on its class, and rejects \`s.z = 3\`.
- A slotted object is smaller than a plain object **plus** its dict, and 10,000 plain objects used more than 1.2 times the memory of 10,000 slotted ones.
- \`Loose(Base)\` regained a \`__dict__\`, \`Pointless(Normal)\` accepted any attribute, and \`AB(A, B)\` failed with a layout conflict, while \`Combined(Mixin, A)\` with an empty-slots mixin stayed dict-free.
- On 3.13 the only difference was a longer message: \`... has no attribute 'z' and no __dict__ for setting new attributes\`.

## 8. When to Use \`__slots__\`

| Use it when | Skip it when |
| :--- | :--- |
| You create very many instances (hundreds of thousands or more) | There are only a few instances |
| The attribute set is fixed and known | Code or libraries add attributes dynamically, or rely on \`vars()\` |
| You want typos in attribute names to fail | You use \`functools.cached_property\` (it needs a \`__dict__\`) |
| You control the whole class hierarchy | The class is a base others will subclass freely or mix with other slotted bases |

The easiest way in modern code: \`@dataclass(slots=True)\` (3.10+) generates \`__slots__\` from the fields, keeps defaults working, and avoids the class-variable conflict. See [What are dataclasses?](/interview-question/what-are-dataclasses)

## Edge Cases Worth Knowing

- **\`cached_property\` fails** on a slotted class with \`TypeError: No '__dict__' attribute on 'S' instance to cache 'y' property.\` (our 3.11 run).
- **A string is treated as one name.** \`__slots__ = "x"\` declares a single slot \`x\`; \`__slots__ = "xy"\` declares one slot called \`xy\`, not two. Use a tuple.
- **Adding \`__slots__\` after the class exists does nothing.** The layout is fixed when the class statement runs; assigning \`Cls.__slots__\` later has no effect.
- **Class-level attributes still work** if their names are not slots: constants and methods live on the class as usual.

## Common Pitfalls

- **Forgetting \`__slots__\` in a subclass.** The subclass quietly gets a \`__dict__\` and the memory saving disappears.
- **Repeating parent slot names** in a subclass instead of listing only the new ones.
- **Trying to give a slot a default with a class attribute.** It raises \`ValueError: ... conflicts with class variable\`; set it in \`__init__\`.
- **Breaking weak references or \`cached_property\`** without noticing; add \`"__weakref__"\` or \`"__dict__"\` explicitly when needed.
- **Combining two slotted bases** in multiple inheritance; keep mixins at \`__slots__ = ()\`.
- **Using slots as a security or immutability feature.** Existing slots can still be reassigned; slots restrict *which* names exist, not whether they change.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code> is a class attribute listing the allowed attribute names. Instances get a fixed field for each name and **no per-instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>**.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Mechanism:</strong> <span style="color:#f0e2c8;">For each name CPython puts a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">member_descriptor</code> on the class that reads and writes a fixed offset in the object, the same descriptor protocol that powers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Benefits:</strong> <span style="color:#f0e2c8;">Less memory per instance, which matters with many objects (about 35% less in our 10,000-object measurement), and assigning an undeclared name raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Costs:</strong> <span style="color:#f0e2c8;">No weak references unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__weakref__</code> is listed, no class-attribute defaults with slot names, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vars()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_property</code>, and every subclass must declare its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code> or it gets a dict back.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In practice:</strong> <span style="color:#f0e2c8;">Use it for many small fixed-shape objects, often via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass(slots=True)</code> from 3.10, and keep mixin bases at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__ = ()</code> to avoid layout conflicts.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__slots__</code> make an object immutable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It fixes <em style="color:#d8d8d8;">which</em> attributes exist, not whether they change: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s.x += 10</code> works. For immutability use a frozen dataclass, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NamedTuple</code> or properties without setters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">I added <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__slots__</code> to a subclass but it still has a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__dict__</code>. Why?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A parent class without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code> already gives instances a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>. Every class in the chain, apart from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code>, must declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code> for the dict to disappear.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">weakref.ref(obj)</code> fail on my slotted class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Slots also remove the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__weakref__</code> field. Add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"__weakref__"</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code> to allow weak references again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you combine two slotted classes with multiple inheritance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not if both define non-empty slots: Python raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">multiple bases have instance lay-out conflict</code>. Bases meant to be mixed should declare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__ = ()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How big is the memory saving?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the version and the number of attributes. On our CPython 3.11 run, 10,000 two-attribute objects took about 1.36 MB plain and 0.88 MB slotted. Measure with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tracemalloc</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.getsizeof</code> alone misses the separate dict.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`__slots__\` | Class attribute declaring a fixed set of instance attribute names, replacing the per-instance \`__dict__\` |
| Member descriptor | The C-level descriptor on the class that reads and writes one slot at a fixed offset |
| Key-sharing dictionary | CPython optimisation (PEP 412) where instance dicts of one class share their key table |
| Instance layout conflict | \`TypeError\` when two base classes each add non-empty slots |

**Conclusion:** \`__slots__\` replaces the flexible per-instance \`__dict__\` with a fixed set of fields declared on the class. CPython reserves one field per name and exposes each through a member descriptor, so instances use less memory (about a third less in our 10,000-object measurement) and reject attribute names you did not declare. The price is flexibility: no \`__dict__\` or weak references unless you list them, no class-attribute defaults under slot names, every class in a hierarchy must declare its own slots, and two bases with non-empty slots cannot be combined. Use it for many small, fixed-shape objects, most easily through \`@dataclass(slots=True)\`.`,
    examples: [
      {
        label: `No __dict__, slot descriptors, unknown attributes rejected and the memory saving`,
        code: `import sys

class PlainPoint:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class SlotPoint:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x = x
        self.y = y

p, s = PlainPoint(1, 2), SlotPoint(1, 2)
print(hasattr(p, "__dict__"), hasattr(s, "__dict__"))  # True False
print(p.__dict__)

# A typo creates a new attribute silently on a normal object...
p.z = 3
print(vars(p))
# ...but is an error on a slotted one.
try:
    s.z = 3
except AttributeError as e:
    print("AttributeError:", e)

# Each slot is a descriptor stored on the CLASS, backed by a fixed field in the object.
print(type(SlotPoint.__dict__["x"]).__name__)  # member_descriptor
print(SlotPoint.x)
print("__dict__" in SlotPoint.__dict__, "__weakref__" in SlotPoint.__dict__)  # False False

# A declared slot that was never assigned is simply missing.
class Lazy:
    __slots__ = ("value",)

try:
    Lazy().value
except AttributeError as e:
    print("AttributeError:", e)

# A slot name cannot also be a class attribute (no defaults this way).
try:
    class WithDefault:
        __slots__ = ("x",)
        x = 0
except ValueError as e:
    print("ValueError:", e)

# Memory: the slotted object has no separate dict to pay for.
plain_total = sys.getsizeof(p) + sys.getsizeof(p.__dict__)
print("slotted object smaller:", sys.getsizeof(s) < plain_total)

import tracemalloc

def measure(cls, n=10_000):
    tracemalloc.start()
    objs = [cls(i, i) for i in range(n)]
    size, _ = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return size

ratio = measure(PlainPoint) / measure(SlotPoint)
print("plain uses more memory than slots:", ratio > 1.2)

# Attribute access still works the same way from the outside.
s.x += 10
print(s.x, s.y, getattr(s, "y"))`,
      },
      {
        label: `Inheritance, __weakref__, __dict__ opt-in, layout conflicts and pickling`,
        code: `import pickle, weakref

class Base:
    __slots__ = ("id",)

# Gotcha 1: a subclass WITHOUT its own __slots__ gets a __dict__ back.
class Loose(Base):
    pass

class Tight(Base):
    __slots__ = ("name",)        # only the NEW names; id is inherited

print(hasattr(Loose(), "__dict__"), hasattr(Tight(), "__dict__"))  # True False
t = Tight()
t.id, t.name = 1, "ana"
print(t.id, t.name)

# Gotcha 2: slots in a child do nothing if a parent already has a __dict__.
class Normal:
    pass

class Pointless(Normal):
    __slots__ = ("a",)

obj = Pointless()
obj.anything = 1
print(vars(obj))

# Gotcha 3: no __weakref__ slot means no weak references.
try:
    weakref.ref(Base())
except TypeError as e:
    print("TypeError:", e)

class Weakable:
    __slots__ = ("id", "__weakref__")

print(weakref.ref(Weakable()) is not None)  # True

# Opt back in to dynamic attributes by listing __dict__ itself.
class Hybrid:
    __slots__ = ("fixed", "__dict__")

h = Hybrid()
h.fixed, h.extra = 1, 2
print(vars(h))

# Gotcha 4: two bases that both add slots cannot be combined.
class A:
    __slots__ = ("a",)

class B:
    __slots__ = ("b",)

try:
    class AB(A, B):
        __slots__ = ()
except TypeError as e:
    print("TypeError:", e)

# Empty __slots__ in a mixin-style base is fine and keeps children slotted.
class Mixin:
    __slots__ = ()

class Combined(Mixin, A):
    __slots__ = ("c",)

print(hasattr(Combined(), "__dict__"))  # False

# Pickling a slotted object works with the default protocol.
t2 = pickle.loads(pickle.dumps(t))
print(t2.id, t2.name)

# A dict for __slots__ documents each slot; inspect.getdoc and help() read it.
import inspect

class Doc:
    __slots__ = {"x": "the horizontal position"}

print(inspect.getdoc(Doc.x))  # the horizontal position`,
      },
    ],
  },
  {
    title: `What is composition versus inheritance?`,
    difficulty: "medium",
    seoDescription: `Inheritance is is-a reuse via a base class; composition is has-a reuse via objects you hold. The fragile base class, and when to pick each.`,
    description: `**Question presented to candidate:**
"People say 'favour composition over inheritance'. What is the difference between the two, can you show it in Python, and when is inheritance still the right choice?"

**What a strong answer should cover:**
- Inheritance is an **is-a** relationship: the subclass gets every attribute and method of the base and can be used wherever the base is expected (substitutability)
- Composition is a **has-a** relationship: the object holds other objects as attributes and calls them, exposing only its own interface
- Why composition is often preferred: looser coupling, no fragile base class, parts can be swapped at runtime and replaced by fakes in tests, no subclass explosion when features combine
- A concrete Python trap: subclassing \`dict\` and overriding \`__setitem__\` is bypassed by \`dict.__init__\` and \`update()\`; \`collections.UserDict\` (which wraps a dict) fixes it
- When inheritance fits: a real is-a relationship, framework base classes and ABCs, small mixins; delegation with \`__getattr__\` as a middle ground

**Clarifying questions expected:**
- Is the new type genuinely a kind of the old one, usable everywhere the old one is?
- Will behaviours need to be combined or swapped (formats, storage, transports)?

**Code / implementation expected:** Optional — the same feature built both ways, for example a \`Stack\` that inherits from \`list\` versus one that holds a list.`,
    answer: `**Target Audience:** Developers who can write classes and subclasses and want to know how to choose between the two main ways of reusing code.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17, 3.12 and 3.13, and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A car manufacturer could design a new model in two ways. One: "the new model **is** the old model, with changes". Every part of the old car comes along, wanted or not, and if engineering changes the old car's chassis, the new one changes too. Two: "the new model **has** an engine, **has** a gearbox, **has** wheels". You pick each part, you can bolt in an electric engine next year, and the test track can use a dummy engine.

The first is **inheritance**, the second is **composition**. Both are ways to reuse code you already have. The 1994 *Design Patterns* book by the "Gang of Four" summed up the advice as "favor object composition over class inheritance" ([overview of the book](https://en.wikipedia.org/wiki/Design_Patterns)), and interviewers ask about it because the choice decides how easy the code is to change a year later.

## 2. The Two Relationships

📌 **Interview term: inheritance (is-a)** — \`class Child(Base)\`: the child gets every attribute and method of the base through the method resolution order, can override any of them, and an instance passes \`isinstance(obj, Base)\`.

📌 **Interview term: composition (has-a)** — the object stores other objects in its attributes (\`self.engine = engine\`) and calls them to do part of the work. Its public interface is whatever **it** defines.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Inheritance: InheritedStack is a list. Composition: ComposedStack has a list inside it">
  <defs>
    <marker id="py18q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="170" y="26" text-anchor="middle">inheritance: is-a</text>
  <rect class="d-box-muted" x="70" y="46" width="200" height="56" rx="10"/>
  <text class="d-text" x="170" y="80" text-anchor="middle">list</text>
  <rect class="d-box" x="70" y="160" width="200" height="56" rx="10"/>
  <text class="d-text" x="170" y="194" text-anchor="middle">InheritedStack</text>
  <path class="d-edge" d="M 170 156 L 170 108" marker-end="url(#py18q4-arrow)"/>
  <text class="d-text" x="570" y="26" text-anchor="middle">composition: has-a</text>
  <rect class="d-box-accent" x="440" y="46" width="260" height="170" rx="10"/>
  <text class="d-text" x="570" y="78" text-anchor="middle">ComposedStack</text>
  <text class="d-sub" x="570" y="102" text-anchor="middle">push, pop, len</text>
  <rect class="d-box-muted" x="490" y="140" width="160" height="50" rx="10"/>
  <text class="d-text" x="570" y="171" text-anchor="middle">_items: list</text>
</svg>

On the left the subclass points up to its base and inherits all of it; on the right the list is a hidden part inside the object, reachable only through the methods the stack chose to expose.

## 3. The Same Feature, Built Both Ways

~~~python
class InheritedStack(list):          # is-a list
    def push(self, item):
        self.append(item)

class ComposedStack:                 # has-a list
    def __init__(self):
        self._items = []
    def push(self, item):
        self._items.append(item)
    def pop(self):
        return self._items.pop()
    def __len__(self):
        return len(self._items)
~~~

The inherited version took one line, but it also inherited **12 public methods** (the 11 of \`list\` plus \`push\`), including \`insert\`, \`sort\` and \`reverse\`. A caller wrote \`s.insert(0, 99)\` and the "stack" became \`[99, 1, 2]\`: the rule "only touch the top" cannot be enforced. The composed version exposes exactly \`push\`, \`pop\` and \`len\`; \`hasattr(c, "insert")\` is \`False\`.

That is the core trade-off:

| | Inheritance | Composition |
| :--- | :--- | :--- |
| Relationship | is-a | has-a |
| Interface | everything the base has, whether you want it or not | only what you write |
| Coupling | tight: depends on base internals and which methods call which | loose: depends only on the part public methods |
| Change at runtime | no: the base is fixed when the class is defined | yes: assign a different part |
| \`isinstance(obj, Base)\` | \`True\`, can be passed where a \`Base\` is expected | \`False\` (use duck typing or a Protocol) |
| Amount of code | less up front | more: forwarding methods |
| Testing | must use the real base | pass a fake part |

## 4. The Fragile Base Class, Live

The most convincing Python example is subclassing \`dict\`:

~~~python
class UpperDict(dict):
    def __setitem__(self, key, value):
        super().__setitem__(key.upper(), value)

d = UpperDict(a=1)    # constructor: does NOT call our __setitem__
d["b"] = 2            # this does
d.update(c=3)         # update: does NOT call it either
print(sorted(d))      # ['B', 'a', 'c']
~~~

The built-in \`dict\` is written in C, and its \`__init__\` and \`update\` insert items directly instead of calling \`self.__setitem__\`. The subclass made an assumption about the base class internals, and the assumption was wrong. That is the **fragile base class problem**: a subclass depends on *how* the base is implemented, not just on *what* it promises.

\`collections.UserDict\` is the fix, and it is composition in disguise: it stores a real dict in \`self.data\` and its methods are written in Python on top of \`__setitem__\`. The same override then gives \`['A', 'B', 'C']\`. \`UserList\` and \`UserString\` exist for the same reason.

📌 **Interview term: fragile base class** — a base class whose internal changes, or whose undocumented internal call pattern, silently break subclasses that override some of its methods.

## 5. Composition Scales Where Inheritance Explodes

Suppose a report can be formatted as CSV or JSON and sent to a printer or kept in memory. With inheritance you write a subclass per combination: \`CsvPrintReport\`, \`JsonPrintReport\`, \`CsvMemoryReport\`, ... Add XML and email and there are 3 × 3 = 9 classes. With composition the report **has** a formatter and **has** a sink:

~~~python
class Report:
    def __init__(self, formatter, sink):
        self.formatter = formatter
        self.sink = sink

    def publish(self, rows):
        self.sink.send(self.formatter.format(rows))

Report(CsvFormatter(), PrintSink()).publish(rows)
r = Report(CsvFormatter(), MemorySink())
r.formatter = JsonFormatter()        # swap a part at runtime
~~~

Two formatters and two sinks give four behaviours from four small classes. \`MemorySink\` is a test fake: the report is tested without any I/O. The parts only need the right method names, which is [duck typing](/interview-question/what-is-duck-typing-in-python); a \`Protocol\` makes that contract visible to type checkers ([What are abstract base classes and Protocols?](/interview-question/what-are-abstract-base-classes-and-protocols)).

📌 **Interview term: dependency injection** — passing the parts an object needs into its constructor instead of creating them inside, which is what makes composed objects easy to reconfigure and test.

📌 **Interview term: strategy pattern** — an interchangeable object (like the formatter) that supplies one piece of behaviour; composition is how you plug it in.

## 6. Delegation: Composition Without the Boilerplate

Writing a forwarding method for every operation is the main cost of composition. Python can forward automatically with \`__getattr__\`, which is called only when normal attribute lookup fails:

~~~python
class LoggingList:
    def __init__(self, inner):
        self._inner = inner
        self.calls = []
    def __getattr__(self, name):
        self.calls.append(name)
        return getattr(self._inner, name)
    def __len__(self):
        return len(self._inner)
~~~

\`ll.append(0)\` and \`ll.sort()\` were forwarded and logged. But \`len(ll)\` needed an explicit \`__len__\`: implicit special-method calls like \`len()\` look the method up on the **type**, not the instance, so \`__getattr__\` never sees them. More in [What is the difference between __getattr__ and __getattribute__?](/interview-question/what-is-the-difference-between-getattr-and-getattribute)

📌 **Interview term: delegation** — an object handing a request it does not handle itself to another object it holds; in Python often done with \`__getattr__\`.

## 7. Verified: Running the Code

Both examples below the answer were run on python3.11 and in the page runner, and the output on 3.12 and 3.13 was identical. Example 1, is-a versus has-a and the dict trap:

~~~text
[99, 1, 2] 12 public methods
2 1 False
['B', 'a', 'c']
['A', 'B', 'C'] dict
True False False
~~~

Example 2, composed reports, runtime swapping and delegation:

~~~text
[print] 1,a | 2,b
[print] [[1, "a"], [2, "b"]]
['1,a\\n2,b', '[[1, "a"], [2, "b"]]']
4 ('CsvFormatter', 'PrintSink')
[0, 1, 2, 3] ['append', 'sort'] 4
~~~

What the run proves:

- The inherited stack accepted \`insert(0, 99)\`; the composed stack has no \`insert\` at all.
- \`UpperDict\` upper-cased only the key set through \`d["b"]\`; the constructor and \`update\` bypassed the override. \`UserDict\` routed all three through it.
- The same \`Report\` object switched from CSV to JSON output by assigning one attribute, and the fake sink captured both strings.
- \`LoggingList\` forwarded \`append\` and \`sort\` via \`__getattr__\` and recorded them, while \`len()\` used the explicit \`__len__\`.

## 8. When Inheritance Is the Right Call

Composition is the default, not a law. Inheritance is the better tool when:

- **The is-a relationship is real and stable,** and a subclass instance must work everywhere the base works (the Liskov substitution principle). A \`ValueError\` subclass for your library is a fine example: \`except ValueError\` must catch it.
- **A framework is built around it:** \`unittest.TestCase\`, Django models and views, \`Exception\` hierarchies, \`threading.Thread\`.
- **You implement an abstract base class** such as \`collections.abc.Mapping\`, which hands you many methods for implementing a few ([What are abstract base classes and Protocols?](/interview-question/what-are-abstract-base-classes-and-protocols)).
- **You add a small, focused capability** with a mixin ([What are mixins in Python?](/interview-question/what-are-mixins-in-python)).

📌 **Interview term: Liskov substitution principle** — a subclass instance should be usable anywhere a base instance is expected without breaking the caller. If you have to disable or contradict base methods (a \`Square\` that breaks \`Rectangle.set_width\`), the relationship is not really is-a, and composition fits better.

## Edge Cases Worth Knowing

- **Composition loses \`isinstance\`.** \`isinstance(ComposedStack(), list)\` is \`False\`; code that checks types explicitly will reject it. Prefer duck typing or Protocols in the code that consumes it.
- **\`super()\` in deep hierarchies follows the MRO, not "the parent".** Multiple inheritance makes the call order something you have to read off \`__mro__\`; see [What is the Method Resolution Order (MRO)?](/interview-question/what-is-the-method-resolution-order-mro)
- **Special methods do not delegate through \`__getattr__\`.** \`len()\`, \`iter()\`, \`+\` and friends need explicit methods on the wrapper class.
- **Built-in containers do not call your overrides** from their C methods; subclass \`UserDict\` / \`UserList\` or the \`collections.abc\` classes when you override item access.

## Common Pitfalls

- **Inheriting for code reuse alone.** If "B is an A" is not true in the problem domain, inheritance drags in the whole interface of A.
- **Subclassing \`dict\` or \`list\` and overriding one method,** then wondering why \`update\`, \`extend\` or the constructor ignore it.
- **Deep hierarchies.** Four levels of overrides make it hard to know which method runs; flatten with composition.
- **A class per combination of features** instead of one class with pluggable parts.
- **Forgetting that composition needs forwarding,** then exposing the inner object publicly (\`stack.items.insert(...)\`), which gives back the problem it solved.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Inheritance:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Is-a</strong>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Child(Base)</code> gets every method and attribute of the base and can be used wherever a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Base</code> is expected.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Composition:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Has-a</strong>: the object holds other objects as attributes and calls them, exposing only the interface it defines.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why composition is the default:</strong> <span style="color:#f0e2c8;">Looser coupling, no fragile base class, parts can be swapped at runtime or faked in tests, and features combine without a subclass per combination.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Python proof:</strong> <span style="color:#f0e2c8;">Subclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> and override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__setitem__</code>: the constructor and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">update()</code> bypass it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.UserDict</code> wraps a real dict and honours the override.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When inheritance wins:</strong> <span style="color:#f0e2c8;">A real, stable is-a relationship (Liskov substitution), exception hierarchies, framework base classes, ABCs and small mixins.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dict</code> subclass ignore <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__setitem__</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">update()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> methods are written in C and insert directly instead of calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.__setitem__</code>. Subclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.UserDict</code>, which is built on a wrapped dict and routes writes through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__setitem__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does composition cost you?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Forwarding code for every method you want to expose, and the object no longer passes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(obj, Base)</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> can delegate automatically, but special methods like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__len__</code> still need explicit definitions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you test a class that uses composition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Inject the parts through the constructor and pass a fake in the test, like the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MemorySink</code> that recorded output with no I/O. With inheritance you are stuck with the real base.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Give an example where inheritance is clearly right.</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exception classes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class ConfigError(ValueError)</code> really is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>, and callers rely on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">except ValueError</code> catching it. Implementing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.abc.Mapping</code> is another.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the Liskov substitution principle?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A subclass instance must work anywhere a base instance does. If a subclass has to disable or contradict base methods, the is-a relationship is false and composition is the better design.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Inheritance (is-a) | A subclass takes the interface and implementation of its base and can stand in for it |
| Composition (has-a) | An object holds other objects as attributes and uses them to do its work |
| Fragile base class | Changes to, or hidden call patterns in, a base class break subclasses that override part of it |
| Dependency injection | Passing an object the parts it needs instead of creating them inside |
| Strategy pattern | An interchangeable object that supplies one piece of behaviour |
| Delegation | Forwarding a request to a held object, often via \`__getattr__\` |
| Liskov substitution principle | A subclass must be usable anywhere its base is expected |

**Conclusion:** Inheritance reuses code through an is-a relationship: the subclass takes the whole interface and implementation of its base and can stand in for it, at the price of tight coupling to the base internals, as the \`dict\` subclass that ignored its own \`__setitem__\` showed. Composition reuses code through has-a: the object holds parts and exposes only its own methods, so parts can be swapped at runtime, faked in tests and combined without a subclass per combination, at the price of some forwarding code. Default to composition, and use inheritance where the is-a relationship is real and stable: exception hierarchies, framework base classes, ABCs and small mixins.`,
    examples: [
      {
        label: `Is-a versus has-a: a list-based Stack and the dict subclass trap`,
        code: `# Inheritance = "is-a": a Stack IS a list, so it gets every list method.
class InheritedStack(list):
    def push(self, item):
        self.append(item)

s = InheritedStack()
s.push(1)
s.push(2)
# Nothing stops callers from breaking the "only touch the top" rule.
s.insert(0, 99)
print(s, len([m for m in dir(s) if not m.startswith("_")]), "public methods")

# Composition = "has-a": a Stack HAS a list and exposes only what it means.
class ComposedStack:
    def __init__(self):
        self._items = []           # the part, hidden behind our own API

    def push(self, item):
        self._items.append(item)

    def pop(self):
        return self._items.pop()

    def __len__(self):
        return len(self._items)

c = ComposedStack()
c.push(1)
c.push(2)
print(c.pop(), len(c), hasattr(c, "insert"))

# The fragile base class problem, live: dict subclass that upper-cases keys.
class UpperDict(dict):
    def __setitem__(self, key, value):
        super().__setitem__(key.upper(), value)

d = UpperDict(a=1)          # the constructor does NOT call our __setitem__
d["b"] = 2                  # this does
d.update(c=3)               # update does NOT either
print(sorted(d))  # ['B', 'a', 'c']

# collections.UserDict wraps a real dict (composition inside) and routes
# every write through __setitem__, so the override is honoured.
from collections import UserDict

class UpperUserDict(UserDict):
    def __setitem__(self, key, value):
        super().__setitem__(key.upper(), value)

u = UpperUserDict(a=1)
u["b"] = 2
u.update(c=3)
print(sorted(u), type(u.data).__name__)  # ['A', 'B', 'C'] dict

# isinstance is the price and the prize of inheritance.
print(isinstance(s, list), isinstance(c, list), isinstance(u, dict))  # True False False`,
      },
      {
        label: `Composing behaviour from parts, swapping them at runtime, and delegation`,
        code: `# Inheritance explodes when behaviours combine: one subclass per combination.
#   CsvFileReport, CsvEmailReport, JsonFileReport, JsonEmailReport, ...
# Composition: pass the parts in, and combine them freely.
import json

class CsvFormatter:
    def format(self, rows):
        return "\\n".join(",".join(map(str, r)) for r in rows)

class JsonFormatter:
    def format(self, rows):
        return json.dumps(rows)

class PrintSink:
    def send(self, text):
        print("[print]", text.replace("\\n", " | "))

class MemorySink:                    # a fake for tests: no I/O at all
    def __init__(self):
        self.sent = []
    def send(self, text):
        self.sent.append(text)

class Report:
    def __init__(self, formatter, sink):
        self.formatter = formatter   # has-a formatter
        self.sink = sink             # has-a sink

    def publish(self, rows):
        self.sink.send(self.formatter.format(rows))

rows = [[1, "a"], [2, "b"]]
Report(CsvFormatter(), PrintSink()).publish(rows)
Report(JsonFormatter(), PrintSink()).publish(rows)

# Swap a part at runtime - impossible to "change your base class" later.
r = Report(CsvFormatter(), MemorySink())
r.publish(rows)
r.formatter = JsonFormatter()
r.publish(rows)
print(r.sink.sent)

# 2 formatters x 2 sinks = 4 behaviours from 4 small classes, not 4 subclasses.
combos = [(f.__name__, s.__name__) for f in (CsvFormatter, JsonFormatter)
          for s in (PrintSink, MemorySink)]
print(len(combos), combos[0])

# Delegation: forward everything you do not define to the wrapped object.
class LoggingList:
    def __init__(self, inner):
        self._inner = inner
        self.calls = []

    def __getattr__(self, name):          # only called when normal lookup fails
        self.calls.append(name)
        return getattr(self._inner, name)

    def __len__(self):                    # dunders are looked up on the type,
        return len(self._inner)           # so __getattr__ never sees len()

ll = LoggingList([3, 1, 2])
ll.append(0)
ll.sort()
print(ll._inner, ll.calls, len(ll))  # [0, 1, 2, 3] ['append', 'sort'] 4`,
      },
    ],
  },
  {
    title: `What are mixins in Python?`,
    difficulty: "medium",
    seoDescription: `A mixin is a small class that adds one capability through multiple inheritance. How the MRO orders them, cooperative super(), and the stdlib mixins.`,
    description: `**Question presented to candidate:**
"You see classes like \`class UserView(LoginRequiredMixin, JsonMixin, View)\`. What is a mixin, how does Python decide which method runs when several mixins define the same one, and what makes a mixin well designed?"

**What a strong answer should cover:**
- A mixin is a small class that provides **one** capability (methods, rarely state) to be combined with other classes through multiple inheritance; it is not meant to be instantiated alone
- Order matters: mixins go to the **left** of the main base class, because the MRO (C3 linearisation) searches left to right; on the wrong side the base method wins
- Overriding mixins must call \`super()\`, which means the next class in the MRO, not the parent, so several mixins chain cooperatively
- A mixin relies on a contract with its host (attributes or methods it expects); state-carrying mixins accept \`**kwargs\` and pass the rest on; empty \`__slots__ = ()\` keeps them compatible with slotted classes
- Real examples: \`collections.abc\` mixin methods, \`socketserver.ThreadingMixIn\`, Django class-based view mixins; alternatives are composition, class decorators and Protocols

**Clarifying questions expected:**
- Does the capability need its own state, or only methods that use the host attributes?

**Code / implementation expected:** Yes — two small mixins combined on one class, with the MRO printed, ideally one that overrides a method with \`super()\`.`,
    answer: `**Target Audience:** Developers who know single inheritance and want to use (and explain) multiple inheritance the way Python libraries do.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11.17, 3.12 and 3.13, and in the page runner (Pyodide 0.25.1, CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of an ice-cream shop. The base is the scoop of vanilla. Mix-ins are the extras you fold into it: cookie pieces, caramel, nuts. Nobody orders a cup of just cookie pieces; a mix-in only makes sense **combined** with a base, and you can pick any combination of them.

A Python mixin is exactly that: a small class that adds one capability, such as "can print itself nicely" or "can serialise to JSON" or "logs every request", and is folded into a real class through multiple inheritance. Frameworks lean on them heavily (Django views, the standard library \`socketserver\`, the \`collections.abc\` classes), so you will both read and write them.

## 2. The Core Idea

📌 **Interview term: mixin** — a class that supplies a focused set of methods for other classes to inherit, is not meant to be instantiated on its own, and is not the main "is-a" parent of the classes that use it. By convention the name ends in \`Mixin\` (the standard library also uses \`MixIn\`).

~~~python
class ReprMixin:
    def __repr__(self):
        fields = ", ".join(f"{k}={v!r}" for k, v in vars(self).items())
        return f"{type(self).__name__}({fields})"

class JsonMixin:
    def to_json(self):
        return json.dumps(vars(self), sort_keys=True)

class Base:
    def __init__(self, id):
        self.id = id

class User(ReprMixin, JsonMixin, Base):    # mixins left, base last
    def __init__(self, id, name):
        super().__init__(id)
        self.name = name
~~~

\`User(1, "ana")\` prints as \`User(id=1, name='ana')\` and \`to_json()\` returns \`{"id": 1, "name": "ana"}\`. Neither mixin knows anything about users; they work on any class whose instances keep their data in \`vars(self)\`.

What makes a good mixin:

| Good mixin | Warning sign |
| :--- | :--- |
| One capability, a few methods | Many unrelated methods ("UtilsMixin") |
| No \`__init__\`, or one that takes \`**kwargs\` and calls \`super().__init__\` | An \`__init__\` with fixed positional parameters |
| Documents what it needs from the host (\`self.name\`, \`self.request\`) | Silently reaches into host internals |
| Calls \`super()\` when it overrides a method | Overrides without calling \`super()\`, cutting the chain |
| \`__slots__ = ()\` if it has no state | Adds instance state that clashes with other mixins |

## 3. Order Matters: The MRO

When several classes in the bases define the same method, Python picks the first one in the **method resolution order** (MRO), computed with the C3 linearisation algorithm. For \`User\` it is:

~~~text
['User', 'ReprMixin', 'JsonMixin', 'Base', 'object']
~~~

Lookup goes left to right through the bases you listed, and every class comes before its own parents. The full algorithm is in [What is the Method Resolution Order (MRO)?](/interview-question/what-is-the-method-resolution-order-mro).

📌 **Interview term: MRO** — the ordered list in \`Cls.__mro__\` that Python searches for attributes; \`super()\` moves along this list.

That is why mixins go on the **left**. In \`class WrongOrder(Service, LoggingMixin)\`, \`Service.handle\` comes first in the MRO and the logging mixin never runs: the run printed only \`handled GET /x\`.

## 4. Cooperative Mixins and \`super()\`

A mixin that *changes* behaviour overrides a method and then calls \`super()\` to let the rest of the chain run:

~~~python
class LoggingMixin:
    def handle(self, request):
        print("log: before", request)
        result = super().handle(request)
        print("log: after", request)
        return result

class TimingMixin:
    def handle(self, request):
        print("timing: start")
        result = super().handle(request)
        print("timing: stop")
        return result

class Api(LoggingMixin, TimingMixin, Service):
    pass
~~~

~~~text
log: before GET /
timing: start
timing: stop
log: after GET /
handled GET /
~~~

\`LoggingMixin\` has no base class of its own, yet \`super().handle\` inside it reached \`TimingMixin\`. \`super()\` means "the next class **in the MRO of the object's type**", not "my parent". For an \`Api\` object that order is \`Api, LoggingMixin, TimingMixin, Service\`, so the calls wrap each other like layers of an onion.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Api handle goes to LoggingMixin, then TimingMixin, then Service, following the MRO">
  <defs>
    <marker id="py18q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="50" width="130" height="70" rx="10"/>
  <text class="d-text" x="75" y="82" text-anchor="middle">Api</text>
  <text class="d-sub" x="75" y="104" text-anchor="middle">no handle</text>
  <rect class="d-box-accent" x="200" y="50" width="160" height="70" rx="10"/>
  <text class="d-text" x="280" y="82" text-anchor="middle">LoggingMixin</text>
  <text class="d-sub" x="280" y="104" text-anchor="middle">super().handle</text>
  <rect class="d-box-accent" x="420" y="50" width="160" height="70" rx="10"/>
  <text class="d-text" x="500" y="82" text-anchor="middle">TimingMixin</text>
  <text class="d-sub" x="500" y="104" text-anchor="middle">super().handle</text>
  <rect class="d-box" x="630" y="50" width="120" height="70" rx="10"/>
  <text class="d-text" x="690" y="82" text-anchor="middle">Service</text>
  <text class="d-sub" x="690" y="104" text-anchor="middle">real work</text>
  <path class="d-edge" d="M 140 85 L 194 85" marker-end="url(#py18q5-arrow)"/>
  <path class="d-edge-accent" d="M 360 85 L 414 85" marker-end="url(#py18q5-arrow)"/>
  <path class="d-edge-accent" d="M 580 85 L 624 85" marker-end="url(#py18q5-arrow)"/>
</svg>

Each arrow is one \`super()\` call moving one step along \`Api.__mro__\`; the results return back along the same path.

📌 **Interview term: cooperative multiple inheritance** — a design where every class in the hierarchy calls \`super()\` with compatible arguments, so each class in the MRO runs exactly once.

### Mixins with state: pass \`**kwargs\` along

A mixin that needs its own constructor argument takes it by keyword and forwards everything else:

~~~python
class TagsMixin:
    def __init__(self, *args, tags=(), **kwargs):
        super().__init__(*args, **kwargs)
        self.tags = list(tags)

class Post(TagsMixin, ReprMixin, Base):
    pass

print(Post(7, tags=["py"]))   # Post(id=7, tags=['py'])
~~~

The mixin does not know \`Base\` wants \`id\`; it just passes it through. This is the forwarding pattern from [What do *args and **kwargs mean?](/interview-question/what-do-args-and-kwargs-mean)

## 5. The Contract With the Host

A mixin's methods use \`self\`, so they assume things about the class they are mixed into. \`GreetMixin.greet\` reads \`self.name\`; mixed into a \`Robot\` without that attribute it fails with \`AttributeError: 'Robot' object has no attribute 'name'\`. Document the contract in the docstring, or make it checkable: declare the expected method as abstract with \`abc\`, or describe the host with a \`typing.Protocol\` and annotate \`self\` with it. See [What are abstract base classes and Protocols?](/interview-question/what-are-abstract-base-classes-and-protocols)

## 6. Mixins in the Standard Library

**\`collections.abc\`**: the abstract base classes are mixin providers. Subclass \`Mapping\`, implement \`__getitem__\`, \`__iter__\` and \`__len__\`, and you get \`get\`, \`keys\`, \`items\`, \`values\`, \`__contains__\` and \`__eq__\` for free. The run checked that they are defined on \`Mapping\` itself: \`['__contains__', '__eq__', 'get', 'items', 'keys', 'values']\`. Leaving out an abstract method makes the class impossible to instantiate:

~~~text
TypeError: Can't instantiate abstract class Broken with abstract methods __iter__, __len__
~~~

(3.12 and 3.13 word it as \`... without an implementation for abstract methods '__iter__', '__len__'\`.)

**\`socketserver\`** builds servers from a concurrency mixin plus a transport class:

~~~text
['ThreadingTCPServer', 'ThreadingMixIn', 'TCPServer', 'BaseServer', 'object']
~~~

\`ThreadingMixIn\` overrides how each request is processed (in a new thread) and leaves everything else to \`TCPServer\`. The example only inspects the MRO; it does not start a server, which the browser runner could not do.

**Django** class-based views (\`LoginRequiredMixin\`, \`PermissionRequiredMixin\`) follow the same left-of-the-view rule; Django is third-party, so it is not run here.

## 7. Verified: Running the Code

Both examples below the answer were run on python3.11 and in the page runner. Example 1, writing and ordering mixins:

~~~text
User(id=1, name='ana')
{"id": 1, "name": "ana"}
['User', 'ReprMixin', 'JsonMixin', 'Base', 'object']
AttributeError: 'Robot' object has no attribute 'name'
log: before GET /
timing: start
timing: stop
log: after GET /
handled GET /
['Api', 'LoggingMixin', 'TimingMixin', 'Service']
handled GET /x
Post(id=7, tags=['py'])
~~~

Example 2, standard library mixins and an ordering mixin:

~~~text
8080 default True
['debug', 'port'] True
['__contains__', '__eq__', 'get', 'items', 'keys', 'values']
TypeError: Can't instantiate abstract class Broken with abstract methods __iter__, __len__
['ThreadingTCPServer', 'ThreadingMixIn', 'TCPServer', 'BaseServer', 'object']
[Version('0.9'), Version('1.2'), Version('1.10')]
True
~~~

What the run proves:

- The two mixins added \`__repr__\` and \`to_json\` to \`User\` without knowing its fields, and the MRO put both before \`Base\`.
- With both overriding mixins on the left, their \`handle\` methods wrapped each other in MRO order; on the wrong side, the mixin never ran.
- \`TagsMixin\` took \`tags\` and forwarded \`7\` to \`Base.__init__\` through \`*args, **kwargs\`.
- The \`OrderByKeyMixin\` gave \`Version\` sorting from one \`_key\` method, and \`>\` worked without \`__gt__\`: Python tried the reflected \`__lt__\` of the right operand. The standard decorator \`functools.total_ordering\` is the ready-made way to fill in the rest.
- The only version difference was the abstract-class error wording on 3.12 and 3.13.

## 8. Mixins vs the Alternatives

| Approach | How it adds behaviour | Good for | Watch out for |
| :--- | :--- | :--- | :--- |
| Mixin | multiple inheritance | adding methods many classes share, framework hooks | MRO order, name clashes, hidden contracts |
| Composition | hold a helper object | swappable behaviour, state of its own | forwarding code; see [What is composition versus inheritance?](/interview-question/what-is-composition-versus-inheritance) |
| Class decorator | rewrites the class after creation | generating methods (\`@dataclass\`, \`@total_ordering\`) | less visible in the class bases |
| \`__init_subclass__\` | hook in a base class | registering or validating subclasses | runs for every subclass; see [What is __init_subclass__ in Python?](/interview-question/what-is-init-subclass-in-python) |

## Edge Cases Worth Knowing

- **Name clashes are silent.** Two mixins that both define \`save\` resolve by MRO order with no warning. Prefix private helpers (\`_repr_fields\`) to avoid collisions.
- **Inconsistent orders fail at class creation.** If one class lists \`A, B\` and another \`B, A\`, combining them raises \`TypeError: Cannot create a consistent method resolution order (MRO)\`.
- **Slotted hosts.** A mixin without \`__slots__\` gives slotted subclasses a \`__dict__\` back; give stateless mixins \`__slots__ = ()\`. See [What does __slots__ do?](/interview-question/what-does-slots-do)
- **Defining \`__eq__\` sets \`__hash__\` to \`None\`** in that class, so an equality mixin makes its hosts unhashable unless it also defines \`__hash__\`.

## Common Pitfalls

- **Putting the mixin to the right of the base class,** so the base method shadows the mixin override.
- **Forgetting \`super()\` in an overriding mixin,** which stops every class after it in the MRO from running.
- **Fixed-signature \`__init__\` in a mixin,** which breaks when combined with other classes; take keywords and forward \`**kwargs\`.
- **Fat mixins** with many unrelated methods; they become a hidden second base class.
- **Using a mixin where composition fits:** if the capability has its own state and configuration, a held helper object is clearer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A mixin is a small class that adds <strong style="color:#ffca28;">one</strong> capability through multiple inheritance, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReprMixin</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">JsonMixin</code>, and is not meant to be instantiated alone.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Order:</strong> <span style="color:#f0e2c8;">Python resolves methods along the MRO, left to right, so mixins go <strong style="color:#ffca28;">left</strong> of the main base: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class User(ReprMixin, JsonMixin, Base)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. super():</strong> <span style="color:#f0e2c8;">Overriding mixins call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code>, which means the next class in the MRO of the instance, so several mixins wrap each other cooperatively.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Design:</strong> <span style="color:#f0e2c8;">Keep them focused, document what they need from the host, take keywords and forward <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code>, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__ = ()</code> when they hold no state.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Examples:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.abc.Mapping</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">keys</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">items</code> and more for three methods, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">socketserver.ThreadingMixIn</code> adds threads, Django views use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LoginRequiredMixin</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you put the mixin after the base class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The base class comes first in the MRO, so its method wins and the mixin override never runs. Our run printed only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">handled GET /x</code> for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class WrongOrder(Service, LoggingMixin)</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;"><code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">LoggingMixin</code> has no parent. How can it call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">super().handle</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code> follows the MRO of the actual object type, not the class where it is written. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Api</code> the next class after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LoggingMixin</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TimingMixin</code>, so that is what runs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is a mixin different from an abstract base class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An ABC defines an interface subclasses <em style="color:#d8d8d8;">must</em> implement, and can supply mixin methods on top (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Mapping</code>). A plain mixin only <em style="color:#d8d8d8;">adds</em> methods. They overlap, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.abc</code> is both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Mixin or composition?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mixin when many classes share a stateless capability that needs to look like part of the class, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__repr__</code> or a view hook. Composition when the behaviour has its own state or must be swapped at runtime.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if two mixins define the same method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The one earlier in the MRO wins silently. If both call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code>, both run in MRO order; if the first does not, the second is skipped. Use distinctive names for helpers.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Mixin | A small class that adds one capability through multiple inheritance and is not used on its own |
| MRO | \`Cls.__mro__\`, the C3-linearised order in which Python searches classes for an attribute |
| Cooperative multiple inheritance | Every class calls \`super()\` with compatible arguments so each one in the MRO runs once |

**Conclusion:** A mixin is a small class that adds one capability to other classes through multiple inheritance and is never used alone. Python resolves methods along the MRO, left to right through the bases, so mixins go to the left of the main base class, and an overriding mixin calls \`super()\` so the next class in the MRO, not a fixed parent, runs next. Keep mixins focused, document what they need from the host, accept and forward \`**kwargs\` if they need constructor arguments, and use \`__slots__ = ()\` when they hold no state. The standard library shows the pattern working: \`collections.abc.Mapping\` gives you a full mapping interface for three methods, and \`socketserver.ThreadingMixIn\` adds threads to any server class.`,
    examples: [
      {
        label: `Writing mixins: placement, the MRO, cooperative super() and **kwargs`,
        code: `import json

# A mixin: a small class that adds ONE capability and is not used on its own.
class ReprMixin:
    def __repr__(self):
        fields = ", ".join(f"{k}={v!r}" for k, v in vars(self).items())
        return f"{type(self).__name__}({fields})"

class JsonMixin:
    def to_json(self):
        return json.dumps(vars(self), sort_keys=True)

class Base:
    def __init__(self, id):
        self.id = id

# Mixins go on the LEFT, the real base class goes LAST.
class User(ReprMixin, JsonMixin, Base):
    def __init__(self, id, name):
        super().__init__(id)
        self.name = name

u = User(1, "ana")
print(u)
print(u.to_json())
print([c.__name__ for c in User.__mro__])

# A mixin relies on a contract with its host: here, "has a name attribute".
class GreetMixin:
    def greet(self):
        return f"hi {self.name}"

class Robot(GreetMixin):
    pass

try:
    Robot().greet()
except AttributeError as e:
    print("AttributeError:", e)

# Mixins that override behaviour must call super() to stay cooperative.
class Service:
    def handle(self, request):
        return f"handled {request}"

class LoggingMixin:
    def handle(self, request):
        print("log: before", request)
        result = super().handle(request)     # next class in the MRO
        print("log: after", request)
        return result

class TimingMixin:
    def handle(self, request):
        print("timing: start")
        result = super().handle(request)
        print("timing: stop")
        return result

class Api(LoggingMixin, TimingMixin, Service):
    pass

print(Api().handle("GET /"))
print([c.__name__ for c in Api.__mro__][:4])

# Put the mixin on the wrong side and its override never runs.
class WrongOrder(Service, LoggingMixin):
    pass

print(WrongOrder().handle("GET /x"))

# A mixin with state: accept **kwargs and pass the rest along.
class TagsMixin:
    def __init__(self, *args, tags=(), **kwargs):
        super().__init__(*args, **kwargs)
        self.tags = list(tags)

class Post(TagsMixin, ReprMixin, Base):
    pass

print(Post(7, tags=["py"]))`,
      },
      {
        label: `Mixins in the standard library and an ordering mixin`,
        code: `# The standard library is full of mixins. collections.abc.Mapping is the classic:
# write 3 abstract methods, get the other mixin methods for free.
from collections.abc import Mapping

class Config(Mapping):
    def __init__(self, **values):
        self._values = dict(values)
    def __getitem__(self, key):
        return self._values[key.lower()]
    def __iter__(self):
        return iter(self._values)
    def __len__(self):
        return len(self._values)

cfg = Config(debug=True, port=8080)
print(cfg["PORT"], cfg.get("missing", "default"), "DEBUG" in cfg)
print(sorted(cfg.keys()), cfg == {"debug": True, "port": 8080})
provided = sorted(n for n in ("get", "keys", "items", "values", "__contains__", "__eq__")
                  if n in Mapping.__dict__)
print(provided)

# Forget one abstract method and the class cannot be instantiated.
class Broken(Mapping):
    def __getitem__(self, key):
        return 1

try:
    Broken()
except TypeError as e:
    print("TypeError:", e)

# socketserver composes servers from mixins: concurrency + transport.
import socketserver
print([c.__name__ for c in socketserver.ThreadingTCPServer.__mro__])

# A mixin that adds comparison operators from one key method.
class OrderByKeyMixin:
    def _key(self):
        raise NotImplementedError
    def __eq__(self, other):
        return self._key() == other._key()
    def __lt__(self, other):
        return self._key() < other._key()
    def __le__(self, other):
        return self._key() <= other._key()
    __hash__ = None   # defining __eq__ already does this; stated for clarity

class Version(OrderByKeyMixin):
    def __init__(self, text):
        self.text = text
    def _key(self):
        return tuple(int(p) for p in self.text.split("."))
    def __repr__(self):
        return f"Version({self.text!r})"

print(sorted([Version("1.10"), Version("1.2"), Version("0.9")]))
# Python reflects a > b into b < a, so __gt__ works without being written.
print(Version("2.0") > Version("1.9"))  # True`,
      },
    ],
  },
];

export default augments;
