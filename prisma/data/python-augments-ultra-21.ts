/**
 * PYTHON ULTRA — batch 21: metaprogramming and memory. Every example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts (the one runnable: false example on
 * python3.12); quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is a metaclass?`,
    difficulty: "hard",
    seoDescription: `Python metaclasses from zero: type as the class of classes, hook order of __prepare__, __new__, __init__, __call__, real uses, and simpler options.`,
    description: `**Question presented to candidate:**
"In Python everything is an object, including classes. So what creates a class? Explain what a metaclass is, walk me through what happens when Python runs a \`class\` statement, and tell me when you would actually write one, and when you would not."

**What a strong answer should cover:**
- A metaclass is the class of a class: classes are instances of \`type\` by default, so \`type(int)\` and \`type(MyClass)\` are both \`type\`, and \`type(type) is type\`.
- The \`class\` statement is sugar for \`metaclass(name, bases, namespace)\`: Python resolves the metaclass, calls \`__prepare__\` to get the namespace, runs the class body in it, then calls the metaclass \`__new__\` and \`__init__\`.
- Instance creation goes through the metaclass \`__call__\` (\`type.__call__\` calls \`__new__\` then \`__init__\`), which is why a metaclass can implement singletons or caching.
- Real uses: registries, validation at definition time, ORMs and enums (\`ABCMeta\`, \`EnumType\` in the standard library); metaclasses are inherited, and unrelated metaclasses in multiple bases raise a "metaclass conflict" \`TypeError\`.
- The modern advice: prefer class decorators or \`__init_subclass__\` / \`__set_name__\` (PEP 487, Python 3.6) for most of those jobs; reach for a metaclass only when you must control namespace creation or instantiation.

**Code / implementation expected:** Optional — a tiny logging metaclass that shows the hook order, or a registry written both with a metaclass and with \`__init_subclass__\`.`,
    answer: `**Target Audience:** Python developers who are comfortable with classes and want to know what sits one level above them
**Difficulty:** Hard
**Python version:** Checked on CPython 3.11, 3.12 and 3.13 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); the hook order is identical on all of them

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was printed by actually running the examples, not typed from memory.

## 1. Why This Even Matters — A Story First

Picture a toy factory. A **mould** stamps out toy robots: every robot that comes out of it has the same shape. That mould is a *class*, and each robot is an *instance*.

But somebody had to make the mould. Moulds come from a **mould-making machine**. If you want every mould in the factory to carry a serial number, or to be rejected when it is missing a part, you do not fix each robot, and you do not fix each mould by hand: you change the mould-making machine.

In Python the mould-making machine is the **metaclass**. Ordinary classes stamp out objects; a metaclass stamps out classes. Most days you never touch it, because the default machine (called \`type\`) does exactly what you want. But it explains a lot of "magic" you already use: why \`abc.ABC\` can refuse to instantiate a class with missing methods, why \`Enum\` members cannot be reassigned, and how an ORM turns \`name = Column(str)\` lines into database columns.

## 2. Classes Are Objects, and Objects Have a Type

In Python, everything you can name is an object, and every object has a type. \`type(3)\` is \`int\`. \`type("hi")\` is \`str\`. Now ask the same question about a class:

~~~python
class Dog:
    sound = "woof"

type(Dog)    # <class 'type'>
type(int)    # <class 'type'>
type(type)   # <class 'type'>, type is its own type
~~~

So \`Dog\` is an object whose type is \`type\`. That makes \`type\` the class of classes. That is the whole definition:

📌 **Interview term: Metaclass** — the class of a class. A class is an instance of its metaclass, the same way an object is an instance of its class. The default metaclass is \`type\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Three levels: the instance r is made by the class Robot, and the class Robot is made by the metaclass type; type is an instance of itself">
  <defs>
    <marker id="py21q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="110" width="170" height="80" rx="10"/>
  <text class="d-text" x="125" y="144" text-anchor="middle">r = Robot()</text>
  <text class="d-sub" x="125" y="168" text-anchor="middle">an instance</text>
  <rect class="d-box-accent" x="275" y="110" width="170" height="80" rx="10"/>
  <text class="d-text" x="360" y="144" text-anchor="middle">class Robot</text>
  <text class="d-sub" x="360" y="168" text-anchor="middle">a class object</text>
  <rect class="d-box-accent" x="510" y="110" width="170" height="80" rx="10"/>
  <text class="d-text" x="595" y="144" text-anchor="middle">type</text>
  <text class="d-sub" x="595" y="168" text-anchor="middle">the metaclass</text>
  <path class="d-edge-accent" d="M 210 150 L 269 150" marker-end="url(#py21q1-arrow)"/>
  <path class="d-edge-accent" d="M 445 150 L 504 150" marker-end="url(#py21q1-arrow)"/>
  <text class="d-sub" x="240" y="96" text-anchor="middle">type(r)</text>
  <text class="d-sub" x="476" y="96" text-anchor="middle">type(Robot)</text>
  <path class="d-edge-dashed" d="M 560 190 C 560 260, 630 260, 630 196" marker-end="url(#py21q1-arrow)"/>
  <text class="d-sub" x="595" y="282" text-anchor="middle">type(type) is type</text>
</svg>

Read the arrows as "is made by". \`r\` is made by \`Robot\`, \`Robot\` is made by \`type\`. The chain stops at \`type\`, because \`type(type)\` is \`type\` itself, a special case wired into CPython. (Do not confuse this "made by" chain with inheritance: \`Robot\` inherits from \`object\`, and so does \`type\`. Example 1 prints \`Meta.__mro__\` as \`(Meta, type, object)\`: a metaclass is an ordinary subclass of \`type\`.)

📌 **Interview term: \`type\` (the built-in)** — two jobs in one name. With one argument, \`type(obj)\` returns the class of \`obj\`. With three arguments, \`type(name, bases, namespace)\` *creates a new class*. The second job is the metaclass job.

## 3. The \`class\` Statement Is Just a Call

This is the key insight. These two pieces of code build the same kind of class:

~~~python
def speak(self):
    return self.sound

class Cat:
    sound = "meow"
    def speak(self):
        return self.sound

Cat = type("Cat", (), {"sound": "meow", "speak": speak})
~~~

The second form is what the first form does under the hood. When Python executes a \`class\` statement it takes four steps (Example 1 logs each one from a real run):

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="Class statement steps from left to right: resolve metaclass, prepare namespace, run class body, metaclass new, metaclass init">
  <defs>
    <marker id="py21q1b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="60" width="120" height="90" rx="10"/>
  <text class="d-text" x="70" y="98" text-anchor="middle">0. pick</text>
  <text class="d-sub" x="70" y="122" text-anchor="middle">metaclass</text>
  <rect class="d-box" x="165" y="60" width="120" height="90" rx="10"/>
  <text class="d-text" x="225" y="98" text-anchor="middle">1. prepare</text>
  <text class="d-sub" x="225" y="122" text-anchor="middle">empty namespace</text>
  <rect class="d-box" x="320" y="60" width="120" height="90" rx="10"/>
  <text class="d-text" x="380" y="98" text-anchor="middle">body runs</text>
  <text class="d-sub" x="380" y="122" text-anchor="middle">fills namespace</text>
  <rect class="d-box-accent" x="475" y="60" width="120" height="90" rx="10"/>
  <text class="d-text" x="535" y="98" text-anchor="middle">2. new</text>
  <text class="d-sub" x="535" y="122" text-anchor="middle">builds class</text>
  <rect class="d-box-accent" x="630" y="60" width="120" height="90" rx="10"/>
  <text class="d-text" x="690" y="98" text-anchor="middle">3. init</text>
  <text class="d-sub" x="690" y="122" text-anchor="middle">finishes setup</text>
  <path class="d-edge" d="M 130 105 L 159 105" marker-end="url(#py21q1b-arrow)"/>
  <path class="d-edge" d="M 285 105 L 314 105" marker-end="url(#py21q1b-arrow)"/>
  <path class="d-edge" d="M 440 105 L 469 105" marker-end="url(#py21q1b-arrow)"/>
  <path class="d-edge" d="M 595 105 L 624 105" marker-end="url(#py21q1b-arrow)"/>
</svg>

1. **Pick the metaclass.** If you wrote \`metaclass=X\`, it is \`X\`. Otherwise it is the metaclass of the bases (for plain classes, \`type\`). The most derived metaclass among all bases wins; if none is a subclass of all the others, you get a "metaclass conflict" (Example 2).
2. **\`__prepare__(name, bases, **kwargs)\`** returns the mapping the class body will run in. By default it is an empty \`dict\`.
3. **The class body runs** like a function body, top to bottom, and every assignment or \`def\` becomes an entry in that mapping. That is why a \`print()\` inside a class body runs at definition time, between steps 1 and 2 of the log.
4. **\`metaclass(name, bases, namespace, **kwargs)\`** is called. Like any class call, that runs the metaclass \`__new__\` (which really builds the class object) and then its \`__init__\`. Extra keywords in the class line (\`version=2\` in Example 1) are passed to all three hooks.

The log from Example 1 shows exactly that order:

~~~text
1 __prepare__   build the namespace for Robot
  (class body executes between steps 1 and 2)
2 __new__       create class Robot with ['beep']
3 __init__      class Robot exists, kwargs={'version': 2}
~~~

📌 **Interview term: \`__prepare__\`** — a classmethod on the metaclass that returns the namespace mapping the class body executes in. Added by PEP 3115 ("Metaclasses in Python 3000", [peps.python.org/pep-3115](https://peps.python.org/pep-3115/)), which also introduced the \`metaclass=\` keyword syntax.

📌 **Interview term: Class namespace** — the dict-like object that collects everything defined in the class body. The metaclass \`__new__\` receives it and turns it into the class \`__dict__\`.

## 4. Where Instances Come From: the Metaclass \`__call__\`

\`Robot("R2")\` looks like a function call. What actually runs is \`type(Robot).__call__(Robot, "R2")\`, because calling any object runs the \`__call__\` defined on *its* type, and the type of \`Robot\` is its metaclass. The default \`type.__call__\` does two things: call \`Robot.__new__\` to make a blank object, then call \`Robot.__init__\` on it (the split is explained in [\`__new__\` vs \`__init__\`](/interview-question/what-is-the-difference-between-new-and-init)).

~~~text
4 __call__      Tracing.__call__ makes a Robot instance
5 Robot.__init__ name=R2
6 __call__      returns the finished instance
~~~

Overriding \`__call__\` in a metaclass therefore lets you decide whether a new object is made at all. Example 2 uses that to build a singleton: the second \`Settings()\` returns the cached first instance and \`__init__\` does not run again.

📌 **Interview term: Metaclass \`__call__\`** — the method that runs when you call a class. \`type.__call__\` calls \`__new__\` then \`__init__\`; a custom metaclass can wrap, skip or cache that.

## 5. How Lookup Works Across the Levels

A method defined on the metaclass is available on the class, but not on instances of the class:

~~~python
class Meta(type):
    def describe(cls):
        return f"I am the class {cls.__name__}"

class Thing(metaclass=Meta):
    pass

Thing.describe()            # works: Thing is an instance of Meta
hasattr(Thing(), "describe")  # False: instances look in Thing and its MRO, never in Meta
~~~

An attribute lookup on an instance searches the class and its bases (the [MRO](/interview-question/what-is-the-method-resolution-order-mro)). A lookup on a class searches the class MRO and then the metaclass. This is how \`Enum\` classes support \`len(Color)\` and \`for c in Color\`: those dunders live on the metaclass. On Python 3.11 that metaclass prints as \`EnumType\` (with \`EnumMeta\` kept as an alias, \`enum.EnumMeta is enum.EnumType\` is \`True\` on our run), and \`type(abc.ABC).__name__\` is \`ABCMeta\`.

📌 **Interview term: Metaclass inheritance** — a subclass gets the metaclass of its base automatically. Example 1 shows \`type(Droid)\` is \`Tracing\` even though \`Droid\` never mentions it, and the hooks run again for \`Droid\`.

## 6. What Metaclasses Are Actually Used For

Example 2 shows four real jobs:

| Job | Hook used | Standard-library or real-world example |
| :--- | :--- | :--- |
| Register every subclass (plugins, serializers) | \`__new__\` or \`__init__\` | Django models, plugin systems |
| Validate a class at definition time | \`__new__\` | \`ABCMeta\` collecting abstract methods |
| See or control the class body as it runs | \`__prepare__\` | \`Enum\` (rejects a member defined twice) |
| Control instantiation | \`__call__\` | singletons, instance caches |

The validation job is the one people underrate. Without a metaclass, a missing \`run()\` method blows up the first time somebody calls it, maybe in production. With the \`RequiresRun\` metaclass from Example 2, the class itself cannot be defined:

~~~text
TypeError: BadJob must define run()
~~~

And the \`__prepare__\` job is the only thing that *only* a metaclass can do: by returning a custom mapping, \`StrictMeta\` sees each assignment of the class body as it happens and rejects \`timeout\` the second time.

## 7. The Simpler Tools That Usually Win

PEP 487 ("Simpler customisation of class creation", accepted for Python 3.6 per the [3.6 What's New](https://docs.python.org/3/whatsnew/3.6.html)) added two hooks that cover most metaclass jobs without a metaclass:

- **\`__init_subclass__\`** — a classmethod on a base class, called every time a subclass is created. Example 2 builds the same registry with it in eight lines, and it accepts class keywords (\`class GetHandler(Handler, key="get")\`). Full treatment in [what \`__init_subclass__\` is](/interview-question/what-is-init-subclass-in-python).
- **\`__set_name__\`** — called on each [descriptor](/interview-question/what-is-the-descriptor-protocol) in the class body with the attribute name it was assigned to, which used to be a classic metaclass job for ORMs.

And a **class decorator** (a function that takes the finished class and returns it, see [decorators](/interview-question/what-are-decorators-in-python)) handles "post-process this one class", the way \`@dataclass\` does: \`type(P)\` for a dataclass is still plain \`type\` on our run, no metaclass involved (see [dataclasses](/interview-question/what-are-dataclasses)).

| You need to... | Use |
| :--- | :--- |
| Modify or check one class after it is built | class decorator |
| React to every subclass of a base | \`__init_subclass__\` |
| Let a descriptor learn its attribute name | \`__set_name__\` |
| Change the namespace the body runs in | metaclass \`__prepare__\` |
| Change what calling the class does, for all subclasses | metaclass \`__call__\` |
| Add methods visible on the class but not on instances | metaclass methods |

> Tim Peters' line, quoted everywhere since: "Metaclasses are deeper magic than 99% of users should ever worry about." It is a good default, not a rule.

📌 **Interview term: \`__init_subclass__\`** — a hook on a base class that runs when a subclass is defined (PEP 487, Python 3.6). The lightweight replacement for most registration and validation metaclasses.

## 8. Edge Cases

**Metaclass conflict.** A class with bases \`A\` (metaclass \`MetaA\`) and \`B\` (metaclass \`MetaB\`) needs one metaclass that is a subclass of both. Python will not guess, so it raises \`TypeError: metaclass conflict: ...\`. The fix in Example 2 is \`class MetaAB(MetaA, MetaB)\` and \`metaclass=MetaAB\`. This is the classic pain when mixing an \`ABC\` with a framework that has its own metaclass, and a strong reason to prefer \`__init_subclass__\` in library code.

**\`super().__new__\` must receive the real namespace.** If \`__prepare__\` returns a custom mapping, pass \`dict(ns)\` to \`type.__new__\` as \`StrictMeta\` does, so the class gets a normal \`__dict__\`. The 3.6 What's New also notes that custom metaclasses must pass \`__classcell__\` through to \`type.__new__\`, or zero-argument \`super()\` inside methods breaks; passing the whole namespace along does that for you.

**The class body runs once, at import time.** Anything a metaclass does happens when the module is imported. Slow work there slows every import, and errors there make the module unimportable.

**\`type(x)\` versus \`x.__class__\`.** Both normally agree. A metaclass is found through \`type(cls)\`; example: \`A.__class__.__name__\` printed \`M\` on our run for a class with \`metaclass=M\`.

## 9. Verified: Running the Code

Both examples were run with \`python3.11 main.py\`, with \`python3.12\` and \`python3.13\` (same output), and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — the hook order, from \`type()\` to the metaclass \`__call__\`** prints:

~~~text
<class 'type'>
<class 'type'>
True
Cat meow
--- class statement runs now ---
1 __prepare__   build the namespace for Robot
  (class body executes between steps 1 and 2)
2 __new__       create class Robot with ['beep']
3 __init__      class Robot exists, kwargs={'version': 2}
--- calling Robot() ---
4 __call__      Tracing.__call__ makes a Robot instance
5 Robot.__init__ name=R2
6 __call__      returns the finished instance
Tracing Robot R2
1 __prepare__   build the namespace for Droid
2 __new__       create class Droid with []
3 __init__      class Droid exists, kwargs={}
Tracing
I am the class Thing
False
True True
~~~

**Example 2 — registry, validation, \`__prepare__\`, singleton and the metaclass conflict** prints:

~~~text
['csv', 'json']
['get', 'post']
TypeError: BadJob must define run()
TypeError: 'timeout' defined twice
Settings.__init__ runs once
True
TypeError: metaclass conflict
MetaAB ['MetaAB', 'MetaA', 'MetaB', 'type', 'object']
~~~

**What the output shows:** a class is an instance of \`type\`; the hooks run in the order \`__prepare__\`, class body, \`__new__\`, \`__init__\`, and instance creation goes through the metaclass \`__call__\` before \`Robot.__init__\`; subclasses re-run the hooks because the metaclass is inherited; and \`__init_subclass__\` produced the same registry as the metaclass.

## Common Pitfalls

- **Using a metaclass for a one-class tweak.** A class decorator is shorter, explicit at the use site, and does not leak into every subclass.
- **Forgetting that the metaclass is inherited.** Every subclass, including ones in other people's code, runs your \`__new__\`. Guard with \`if bases:\` (as \`PluginMeta\` does) so the abstract base is not registered.
- **Metaclass conflicts in libraries.** Shipping a base class with a custom metaclass makes it hard for users to combine it with \`ABC\`, \`Enum\` or a framework base. \`__init_subclass__\` has no such problem.
- **Overriding \`__call__\` and forgetting \`super().__call__\`.** Then \`__new__\` and \`__init__\` never run, and you get \`None\` or a half-built object.
- **Confusing \`__new__\` on the metaclass with \`__new__\` on the class.** The metaclass \`__new__\` builds the *class* (once, at definition time); the class \`__new__\` builds each *instance*.
- **Mutating the namespace after \`type.__new__\`.** Changes to \`ns\` after the class exists do nothing; set attributes on \`cls\` instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A metaclass is the class of a class. Classes are objects, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(MyClass)</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> by default, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(type) is type</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The class statement:</strong> <span style="color:#f0e2c8;">It is a call: Python picks the metaclass, calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;prepare&#95;&#95;</code> for a namespace, runs the body in it, then calls the metaclass, which runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;new&#95;&#95;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;</code> to build the class.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Instances:</strong> <span style="color:#f0e2c8;">Calling a class runs the metaclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;call&#95;&#95;</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type.&#95;&#95;call&#95;&#95;</code> calls the class <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;new&#95;&#95;</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;</code>, so a metaclass can cache or refuse instances.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Real uses:</strong> <span style="color:#f0e2c8;">Registries, definition-time validation, controlling the body namespace, singletons. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ABCMeta</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EnumType</code> are the standard-library examples.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Judgement:</strong> <span style="color:#f0e2c8;">Prefer a class decorator or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;subclass&#95;&#95;</code> (PEP 487, 3.6); metaclasses are inherited and can conflict, so keep them for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;prepare&#95;&#95;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;call&#95;&#95;</code> jobs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type("X", (), {})</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It creates a new class named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X</code> with no explicit bases and an empty namespace. It is exactly what a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class X: pass</code> statement does, and it shows that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> is a metaclass and not just a type-checking function.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In what order do the hooks run when a class is defined?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Metaclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;prepare&#95;&#95;</code>, then the class body, then metaclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;new&#95;&#95;</code>, then metaclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;</code>. Class keywords such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">version=2</code> are passed to all three. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;subclass&#95;&#95;</code> on the parent runs from inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type.&#95;&#95;new&#95;&#95;</code>, so before the metaclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you implement a singleton with a metaclass, and is it a good idea?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Override <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;call&#95;&#95;</code>, keep a dict of instances per class, and only call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().&#95;&#95;call&#95;&#95;</code> the first time. It works, but a module-level instance or a factory function is simpler and easier to test, so say you would usually avoid it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a metaclass conflict?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the bases of a class have metaclasses that are not subclasses of one another, Python cannot choose one and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: metaclass conflict</code>. The fix is a metaclass that inherits from both, passed explicitly with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">metaclass=</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is a metaclass the only option?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need to change the namespace the class body runs in (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;prepare&#95;&#95;</code>, for duplicate detection or recording order), or change what calling the class does for every subclass, or add methods that live on the class but not on its instances.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Metaclass** | The class of a class; \`type\` by default. |
| **\`type\` (the built-in)** | One argument: returns the class of an object. Three arguments: creates a new class. |
| **\`__prepare__\`** | Metaclass classmethod returning the namespace the class body runs in (PEP 3115). |
| **Class namespace** | The mapping filled by the class body, turned into the class \`__dict__\`. |
| **Metaclass \`__call__\`** | Runs when a class is called; the default calls \`__new__\` then \`__init__\`. |
| **Metaclass inheritance** | Subclasses automatically use the metaclass of their base. |
| **\`__init_subclass__\`** | Base-class hook run for every new subclass (PEP 487, 3.6). |

**Conclusion:** A metaclass is simply the class of a class: \`type\` by default, and a \`class\` statement is a call to it, running \`__prepare__\`, the body, \`__new__\` and \`__init__\`, with the metaclass \`__call__\` deciding what happens when the class itself is called. That model explains \`ABCMeta\`, \`Enum\` and ORMs. In practice, reach for a class decorator or \`__init_subclass__\` first, and keep metaclasses for the two things nothing else can do: controlling the class namespace and controlling instantiation for a whole hierarchy.`,
    examples: [
      { label: `The hook order: type(), __prepare__, __new__, __init__ and __call__`, code: `# 1. Classes are objects, and their type is a metaclass.
class Dog:
    sound = "woof"

print(type(Dog))  # <class 'type'>
print(type(type))  # <class 'type'>
print(isinstance(Dog, type))  # True

# 2. The class statement is sugar for calling type(name, bases, namespace).
def speak(self):
    return self.sound

Cat = type("Cat", (), {"sound": "meow", "speak": speak})
print(Cat.__name__, Cat().speak())

# 3. A metaclass that logs every step of class creation and instance creation.
class Tracing(type):
    @classmethod
    def __prepare__(mcls, name, bases, **kwargs):
        print(f"1 __prepare__   build the namespace for {name}")
        return {}

    def __new__(mcls, name, bases, ns, **kwargs):
        print(f"2 __new__       create class {name} with {sorted(k for k in ns if not k.startswith('__'))}")
        return super().__new__(mcls, name, bases, ns)

    def __init__(cls, name, bases, ns, **kwargs):
        print(f"3 __init__      class {name} exists, kwargs={kwargs}")
        super().__init__(name, bases, ns)

    def __call__(cls, *args, **kwargs):
        print(f"4 __call__      Tracing.__call__ makes a {cls.__name__} instance")
        obj = super().__call__(*args, **kwargs)
        print("6 __call__      returns the finished instance")
        return obj

print("--- class statement runs now ---")

class Robot(metaclass=Tracing, version=2):
    print("  (class body executes between steps 1 and 2)")
    def __init__(self, name):
        print(f"5 Robot.__init__ name={name}")
        self.name = name
    def beep(self):
        return "beep"

print("--- calling Robot() ---")
r = Robot("R2")
print(type(Robot).__name__, type(r).__name__, r.name)

# 4. The metaclass is inherited by subclasses.
class Droid(Robot):
    pass

print(type(Droid).__name__)

# 5. Attribute lookup: methods on the metaclass are visible on the class, not on instances.
class Meta(type):
    def describe(cls):
        return f"I am the class {cls.__name__}"

class Thing(metaclass=Meta):
    pass

print(Thing.describe())
print(hasattr(Thing(), "describe"))  # False
print(Thing.__mro__ == (Thing, object), Meta.__mro__ == (Meta, type, object))` },
      { label: `Registry, validation, __prepare__, singleton and the metaclass conflict`, code: `# Four real jobs a metaclass does, and the simpler tool for two of them.

# Job 1: a plugin registry. Every subclass registers itself at class-creation time.
class PluginMeta(type):
    registry = {}
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        if bases:  # skip the abstract base itself
            mcls.registry[ns.get("key", name.lower())] = cls
        return cls

class Exporter(metaclass=PluginMeta):
    pass

class CsvExporter(Exporter):
    key = "csv"

class JsonExporter(Exporter):
    key = "json"

print(sorted(PluginMeta.registry))  # ['csv', 'json']

# The same registry with __init_subclass__ (no metaclass needed).
class Handler:
    registry = {}
    def __init_subclass__(cls, key=None, **kwargs):
        super().__init_subclass__(**kwargs)
        Handler.registry[key or cls.__name__.lower()] = cls

class GetHandler(Handler, key="get"):
    pass

class PostHandler(Handler, key="post"):
    pass

print(sorted(Handler.registry))  # ['get', 'post']

# Job 2: reject a broken class at definition time, not at first use.
class RequiresRun(type):
    def __new__(mcls, name, bases, ns):
        if bases and not callable(ns.get("run")):
            raise TypeError(f"{name} must define run()")
        return super().__new__(mcls, name, bases, ns)

class Job(metaclass=RequiresRun):
    pass

class GoodJob(Job):
    def run(self):
        return "ran"

try:
    class BadJob(Job):
        pass
except TypeError as e:
    print("TypeError:", e)

# Job 3: __prepare__ returns a custom mapping, so the metaclass sees the class body as it runs.
class NoDuplicates(dict):
    def __setitem__(self, key, value):
        if key in self and not key.startswith("__"):
            raise TypeError(f"{key!r} defined twice")
        super().__setitem__(key, value)

class StrictMeta(type):
    @classmethod
    def __prepare__(mcls, name, bases):
        return NoDuplicates()
    def __new__(mcls, name, bases, ns):
        return super().__new__(mcls, name, bases, dict(ns))

try:
    class Config(metaclass=StrictMeta):
        timeout = 10
        retries = 3
        timeout = 30
except TypeError as e:
    print("TypeError:", e)

# Job 4: control instantiation by overriding __call__ (a singleton).
class Singleton(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Settings(metaclass=Singleton):
    def __init__(self):
        print("Settings.__init__ runs once")

a = Settings()
b = Settings()
print(a is b)

# The classic trap: two bases with unrelated metaclasses.
class MetaA(type): pass
class MetaB(type): pass
class A(metaclass=MetaA): pass
class B(metaclass=MetaB): pass
try:
    class C(A, B):
        pass
except TypeError as e:
    print("TypeError:", str(e).split(":")[0])

# The fix: a metaclass that derives from both.
class MetaAB(MetaA, MetaB): pass
class C(A, B, metaclass=MetaAB): pass
print(type(C).__name__, [m.__name__ for m in type(C).__mro__])` },
    ],
  },
  {
    title: `How does Python manage memory and garbage collection?`,
    difficulty: "hard",
    seoDescription: `How CPython manages memory: private heap, pymalloc, reference counting, the generational cycle collector and immortal objects, with verified runs.`,
    description: `**Question presented to candidate:**
"You never call \`free()\` in Python, yet memory does get released. Explain how CPython manages memory: where objects live, what decides when one is freed, why reference counting alone is not enough, and what the \`gc\` module actually does."

**What a strong answer should cover:**
- Every object lives on a private heap managed by the interpreter; names and containers hold references, never the objects themselves.
- Reference counting is the primary mechanism: each object has a count, and CPython frees it the moment the count drops to zero (deterministic, immediate, no pause).
- Reference cycles never reach zero, so a separate cyclic garbage collector (the \`gc\` module) periodically finds unreachable groups of container objects; it is generational (three generations, default thresholds \`(700, 10, 10)\` on 3.11 and 3.12) and only tracks containers.
- The allocator: pymalloc serves small requests (up to 512 bytes) from pools inside arenas, larger ones go to the system \`malloc\`, so freed memory is reused by Python but not always returned to the OS.
- Practical tools and gotchas: \`sys.getrefcount\`, \`sys.getsizeof\` (shallow), \`tracemalloc\`, \`gc.collect()\`, \`gc.disable()\`/\`gc.freeze()\`; immortal objects in 3.12 (PEP 683); this is CPython behaviour, PyPy uses a different collector.

**Clarifying questions expected:**
- Do you mean CPython specifically, or Python implementations in general (PyPy, the free-threaded build)?
- Is this about understanding the model, or about a concrete problem such as a memory leak or high RSS in a long-running service?

**Code / implementation expected:** Optional — \`sys.getrefcount\` deltas and a two-object cycle that only \`gc.collect()\` frees are the classic demonstration.`,
    answer: `**Target Audience:** Python developers who want to understand what happens to their objects after they stop using them, and to debug memory in long-running programs
**Difficulty:** Hard
**Python version:** Checked on CPython 3.11, 3.12 and 3.13, and in this page on Pyodide 0.25.1 (CPython 3.11.3 compiled to 32-bit WebAssembly); everything here is CPython behaviour

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was printed by actually running the examples, not typed from memory.

## 1. Why This Even Matters — A Story First

Think of a library that lends out books. Each book has a little card in its sleeve with a tally: how many people currently have it checked out. When someone borrows it, the tally goes up; when they return it, the tally goes down. When the tally hits zero, a librarian puts the book straight back on the shelf for reuse. No weekly clean-up needed: the moment nobody holds it, it is reclaimed.

That works perfectly, except for one trick. Two friends each borrow one book, then lend it to each other and leave town. Each book is "checked out" by someone, so neither tally is zero, but no reader in the library can reach either book. To catch those, the library also sends someone round every so often to look for books that are only held by other lost books.

That is CPython in two sentences: **reference counting** puts objects back the instant the tally hits zero, and a **cyclic garbage collector** periodically hunts for groups of objects that only point at each other. Knowing which one is in charge explains when memory is freed, why \`__del__\` runs when it does, and why a "leak" in Python is almost always a reference you forgot about.

## 2. Where Objects Live: the Private Heap

Every Python value, from \`42\` to a 10 GB list, is an **object** allocated on a heap managed by the interpreter. A variable is just a name in a namespace that holds a *reference* (in CPython, a pointer) to an object. Assignment never copies an object; it copies the reference (the full model is in [names and object references](/interview-question/how-does-python-s-name-and-object-reference-model-work), and the stack side in [call stack vs heap](/interview-question/what-is-the-difference-between-the-call-stack-and-the-heap-in-python)).

📌 **Interview term: Private heap** — the memory area where CPython allocates every object. Your code never manages it directly; the interpreter allocates and frees on your behalf.

Under the heap, CPython uses a layered allocator:

| Layer | Handles | Notes |
| :--- | :--- | :--- |
| Object-specific allocators and free lists | some built-in types | e.g. freed small objects of a type kept for quick reuse |
| **pymalloc** | requests of 512 bytes or less | \`SMALL_REQUEST_THRESHOLD\` is 512 in CPython's \`pycore_obmalloc.h\` |
| System \`malloc\` | anything larger | big lists, long strings, arrays of pointers |

pymalloc carves memory into **arenas**, splits arenas into **pools**, and splits each pool into fixed-size **blocks** of one size class. According to the CPython documentation, arenas have been 1 MiB on 64-bit platforms since 3.10 (256 KiB before), and the current allocator header (\`pycore_obmalloc.h\`) defines 16 KiB pools on those builds and 4 KiB pools otherwise. An arena can only be handed back to the operating system when every block in it is free, so a process that allocated many small objects and freed most of them often keeps its memory: Python will reuse it, but \`top\` keeps showing it. That is fragmentation, not a leak.

📌 **Interview term: pymalloc** — CPython's allocator for small objects (up to 512 bytes), organised as arenas, pools and blocks to make the millions of tiny allocations a Python program does cheap.

## 3. Layer One: Reference Counting

Every object header carries a counter, \`ob_refcnt\`. Binding a name, putting the object in a list, passing it as an argument: each adds a reference. Unbinding a name, removing it from the list, returning from the function: each removes one. When the count reaches zero, CPython calls the type deallocator right there, which frees the memory and decrements the counts of everything that object referenced (which may cascade).

<svg class="iq-diagram" width="100%" viewBox="0 0 740 230" role="img" aria-label="Reference count of a list going from 1 to 2 to 1 to 0; at zero the memory is freed immediately">
  <defs>
    <marker id="py21q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="70" width="140" height="90" rx="10"/>
  <text class="d-text" x="80" y="106" text-anchor="middle">data = [1, 2]</text>
  <text class="d-sub" x="80" y="132" text-anchor="middle">refcount 1</text>
  <rect class="d-box" x="200" y="70" width="140" height="90" rx="10"/>
  <text class="d-text" x="270" y="106" text-anchor="middle">alias = data</text>
  <text class="d-sub" x="270" y="132" text-anchor="middle">refcount 2</text>
  <rect class="d-box" x="390" y="70" width="140" height="90" rx="10"/>
  <text class="d-text" x="460" y="106" text-anchor="middle">del alias</text>
  <text class="d-sub" x="460" y="132" text-anchor="middle">refcount 1</text>
  <rect class="d-box-accent" x="580" y="70" width="150" height="90" rx="10"/>
  <text class="d-text" x="655" y="106" text-anchor="middle">del data</text>
  <text class="d-sub" x="655" y="132" text-anchor="middle">0: freed now</text>
  <path class="d-edge" d="M 150 115 L 194 115" marker-end="url(#py21q2-arrow)"/>
  <path class="d-edge" d="M 340 115 L 384 115" marker-end="url(#py21q2-arrow)"/>
  <path class="d-edge-accent" d="M 530 115 L 574 115" marker-end="url(#py21q2-arrow)"/>
</svg>

\`sys.getrefcount(obj)\` shows the count, plus one for the temporary reference the call itself holds, so compare differences, not absolute numbers. Example 1 does exactly that:

~~~text
refs added by alias + dict: 2
back to the start: 0
del n ...
  freed solo
after del, object alive? False
~~~

The \`freed solo\` line is printed by a weak-reference callback (see [weak references](/interview-question/what-is-a-weak-reference-in-python)) *during* \`del n\`, before the next statement runs. That immediacy is the big advantage of reference counting: memory, file handles and locks held by an object are released at a predictable point.

📌 **Interview term: Reference counting** — each object tracks how many references point to it; at zero it is deallocated immediately. CPython's primary memory-management mechanism.

📌 **Interview term: Deterministic destruction** — the object is destroyed at a predictable moment (when its last reference goes), not "some time later". True in CPython for objects outside cycles; not promised by the language, and not true on PyPy.

The costs: every reference change writes to the object (bad for CPU caches and for sharing memory between forked processes), the count costs a word per object, and it cannot free cycles.

## 4. Layer Two: the Cyclic Garbage Collector

<svg class="iq-diagram" width="100%" viewBox="0 0 640 250" role="img" aria-label="Two objects a and b point at each other; the names were deleted, so nothing outside reaches them, yet each count is still 1">
  <defs>
    <marker id="py21q2b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="90" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="122" text-anchor="middle">names a, b</text>
  <text class="d-sub" x="95" y="144" text-anchor="middle">deleted</text>
  <rect class="d-box-accent" x="260" y="30" width="150" height="70" rx="10"/>
  <text class="d-text" x="335" y="62" text-anchor="middle">Node a</text>
  <text class="d-sub" x="335" y="84" text-anchor="middle">refcount 1</text>
  <rect class="d-box-accent" x="260" y="160" width="150" height="70" rx="10"/>
  <text class="d-text" x="335" y="192" text-anchor="middle">Node b</text>
  <text class="d-sub" x="335" y="214" text-anchor="middle">refcount 1</text>
  <path class="d-edge-accent" d="M 300 100 L 300 154" marker-end="url(#py21q2b-arrow)"/>
  <path class="d-edge-accent" d="M 370 160 L 370 106" marker-end="url(#py21q2b-arrow)"/>
  <text class="d-sub" x="250" y="134" text-anchor="end">a.other</text>
  <text class="d-sub" x="420" y="134" text-anchor="start">b.other</text>
  <path class="d-edge-dashed" d="M 170 125 L 254 125"/>
  <rect class="d-box" x="480" y="90" width="150" height="70" rx="10"/>
  <text class="d-text" x="555" y="122" text-anchor="middle">gc.collect()</text>
  <text class="d-sub" x="555" y="144" text-anchor="middle">finds and frees</text>
</svg>

After \`del a, b\`, each node is still referenced once, by the other node. Their counts never reach zero. Example 1 turns the automatic collector off with \`gc.disable()\` to make this visible: the objects stay alive after \`del\`, and only \`gc.collect()\` frees them.

How the collector finds them, in outline: for every **tracked** container in the generation being collected, it copies the reference count, then subtracts one for every reference that comes from *another object in the same set*. Whatever still has a count above zero is referenced from outside (a variable, a module, the stack) and is alive, as is everything reachable from it. The rest is unreachable garbage, and it is freed (with finalizers such as \`__del__\` run first, safely, since PEP 442 in Python 3.4).

📌 **Interview term: Reference cycle** — a group of objects that refer to each other, e.g. a parent with a list of children that each point back at the parent. Reference counting alone can never free it.

📌 **Interview term: Cyclic garbage collector** — the \`gc\` module: a collector that periodically detects unreachable groups of container objects and frees them. It exists only to handle cycles.

**Only containers are tracked.** An \`int\` or \`str\` cannot refer to other objects, so it can never be part of a cycle and the collector ignores it. Example 1 prints \`gc.is_tracked(42)\` and \`gc.is_tracked("text")\` as \`False\`, a list or a class instance as \`True\`, and shows a CPython optimisation: a dict holding only atomic values like \`{"a": 1}\` is untracked until it stores a container.

### Generations

<svg class="iq-diagram" width="100%" viewBox="0 0 740 220" role="img" aria-label="Three generations: new container objects start in generation 0, survivors move to 1, then to 2; young generations are collected most often">
  <defs>
    <marker id="py21q2c-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="50" width="190" height="110" rx="10"/>
  <text class="d-text" x="115" y="88" text-anchor="middle">generation 0</text>
  <text class="d-sub" x="115" y="114" text-anchor="middle">new containers</text>
  <text class="d-sub" x="115" y="138" text-anchor="middle">collected often</text>
  <rect class="d-box" x="275" y="50" width="190" height="110" rx="10"/>
  <text class="d-text" x="370" y="88" text-anchor="middle">generation 1</text>
  <text class="d-sub" x="370" y="114" text-anchor="middle">survived once</text>
  <text class="d-sub" x="370" y="138" text-anchor="middle">collected less</text>
  <rect class="d-box-muted" x="530" y="50" width="190" height="110" rx="10"/>
  <text class="d-text" x="625" y="88" text-anchor="middle">generation 2</text>
  <text class="d-sub" x="625" y="114" text-anchor="middle">long-lived</text>
  <text class="d-sub" x="625" y="138" text-anchor="middle">full collection</text>
  <path class="d-edge" d="M 210 105 L 269 105" marker-end="url(#py21q2c-arrow)"/>
  <path class="d-edge" d="M 465 105 L 524 105" marker-end="url(#py21q2c-arrow)"/>
  <text class="d-sub" x="240" y="190" text-anchor="middle">survives</text>
  <text class="d-sub" x="497" y="190" text-anchor="middle">survives</text>
</svg>

Most objects die young (a temporary list in a loop), and objects that survive a while tend to live for the whole program (modules, caches). So the collector is **generational**: new tracked objects start in generation 0, and each object that survives a collection of its generation is moved to the next. Example 2 watches one list move \`0 → 1 → 2\` by calling \`gc.collect(0)\` and \`gc.collect(1)\`.

Collections are triggered by \`gc.get_threshold()\`. On our runs it returned \`(700, 10, 10)\` on 3.11 and 3.12 and \`(2000, 10, 10)\` on 3.13: roughly, generation 0 is collected when allocations minus deallocations of tracked objects exceed the first number, generation 1 after 10 generation-0 collections, and so on. Python 3.14.0 shipped an incremental collector with two generations, but 3.14.5 reverted to the 3.13 generational collector after reports of memory growth in production ([pydevtools: Python 3.14.5 rolls back the incremental garbage collector](https://pydevtools.com/blog/python-3145-rolls-back-the-incremental-garbage-collector/)). Treat the exact thresholds as version-specific, and print them rather than quote them.

📌 **Interview term: Generational collection** — dividing objects by age so the young generation, where most garbage is, is scanned often and cheaply, and the old generation rarely.

## 5. Immortal Objects (3.12+)

PEP 683 ([peps.python.org/pep-0683](https://peps.python.org/pep-0683/)) made some objects **immortal** in CPython 3.12: \`None\`, \`True\`, small ints, the empty tuple and others get a fixed reference count that is never modified and never reaches zero. Example 3 (run on 3.12; it cannot show this on the 3.11 page) adds 1000 references to each and measures the change:

~~~text
True
None: 0
True: 0
small int 7: 0
empty tuple: 0
ordinary object: 1000
refcount of None is huge: True
~~~

On 3.11 the same program prints \`1000\` for every line. The motivation was to stop shared, read-only objects from being written to on every use, which matters for multi-core and forked-process memory sharing, and is a building block for the [free-threaded build](/interview-question/what-is-python-3-12-s-free-threaded-no-gil-build-and-what-changes).

📌 **Interview term: Immortal object** — an object whose reference count is pinned (CPython 3.12+, PEP 683) so it is never deallocated before interpreter shutdown.

## 6. Measuring Memory

- **\`sys.getsizeof(obj)\`** — the size of the object itself, *not* what it references. On 64-bit CPython 3.11 our run printed 56 for \`[]\`, 28 for \`1\`, 50 for \`"a"\` and 16 for \`object()\`. In this page Pyodide is 32-bit WebAssembly and prints 28, 16, 26 and 8, which is why the in-page examples never print sizes. How a list over-allocates is covered in [how a list grows](/interview-question/how-does-a-python-list-grow-in-memory).
- **\`tracemalloc\`** — records every allocation made through Python with its traceback. Example 2 shows memory going up by over 1 MB while a list of 50,000 strings exists and falling back within 100 KB the moment \`del big\` drops its last reference.
- **\`gc.get_objects()\`, \`gc.get_referrers()\`, \`gc.callbacks\`** — inspect what the collector tracks, who holds an object, and when collections run (Example 2 records that a plain \`gc.collect()\` is a generation 2 collection, and that it freed the self-referencing objects).
- Process RSS (from the OS) — includes arenas Python keeps for reuse, so it can stay high after objects are freed.

Memory-saving techniques, each with its own page: [\`__slots__\`](/interview-question/what-does-slots-do), generators instead of lists ([memory of a list comprehension vs a generator expression](/interview-question/what-is-the-memory-difference-between-a-list-comprehension-and-a-generator-expre)), and the caches CPython keeps for [small integers](/interview-question/why-does-python-cache-small-integers) and [interned strings](/interview-question/what-is-string-interning-in-python).

## 7. Controlling the Collector

| Call | What it does | When to use it |
| :--- | :--- | :--- |
| \`gc.collect(generation=2)\` | runs a collection now, returns the number of unreachable objects found | tests, after dropping a huge cyclic structure |
| \`gc.disable()\` / \`gc.enable()\` | stops or restarts automatic collections; reference counting keeps working | short latency-critical sections, benchmarks |
| \`gc.set_threshold(...)\` | changes how often collections trigger | tuning programs that create many long-lived containers |
| \`gc.freeze()\` | moves all current objects to a permanent generation the collector ignores | before \`fork()\` in pre-fork servers, so collections do not touch (and copy) shared pages |
| \`gc.get_count()\` | current counters for the three generations | debugging collection frequency |

Disabling \`gc\` does **not** disable memory management: acyclic garbage is still freed instantly by reference counting. Only cycles pile up.

## 8. Edge Cases

**Finalizers in cycles.** Before Python 3.4, objects with \`__del__\` inside a cycle were never freed and ended up in \`gc.garbage\`. PEP 442 ([peps.python.org/pep-0442](https://peps.python.org/pep-0442/)) made the collector call those finalizers and free the cycle. The details of \`del\`, \`__del__\` and collection order are in [del vs \`__del__\` vs garbage collection](/interview-question/what-is-the-difference-between-del-del-and-garbage-collection).

**Hidden references.** A traceback stored in a variable keeps every frame and every local of the failed call alive; so do caches without a size limit, closures, class-level lists, and \`functools.lru_cache\` on methods (it holds \`self\`; see [how \`lru_cache\` works](/interview-question/how-does-functools-lru-cache-work)).

**Other implementations.** PyPy does not use reference counting, so objects are freed only when its collector runs. Code that relies on a file being closed "when the variable goes out of scope" works on CPython and leaks file handles on PyPy. Use \`with\` (see [context managers](/interview-question/what-is-a-context-manager)).

## 9. Verified: Running the Code

Examples 1 and 2 were run with \`python3.11 main.py\` and again in this page (Pyodide 0.25.1), with identical output; Example 1 also gives the same output on 3.12 and 3.13. Example 3 needs 3.12 and was run with \`python3.12 main.py\`.

**Example 1 — reference counting, a cycle that only \`gc.collect()\` frees, and what is tracked** prints:

~~~text
refs added by alias + dict: 2
back to the start: 0
del n ...
  freed solo
after del, object alive? False
cycle after del, still alive? True
gc.collect() ...
  freed a
  freed b
found at least 2 objects: True
cycle alive now? False
False False True True
False True
generations: 3
~~~

**Example 2 — generations, \`gc.callbacks\` and \`tracemalloc\`** prints:

~~~text
new list: 0
after collect(0): 1
after collect(1): 2
after full collect: 2
last collection was generation 2 and freed something: True
grew by more than 1 MB while big existed: True
returned to within 100 KB after del: True
peak at least as high as during: True
~~~

**Example 3 — immortal objects on Python 3.12** prints:

~~~text
True
None: 0
True: 0
small int 7: 0
empty tuple: 0
ordinary object: 1000
refcount of None is huge: True
~~~

**What the output shows:** a reference count drops back to its start when aliases go, and the object is freed during the \`del\` statement itself; a two-node cycle survives \`del\` until the collector runs; only containers are tracked; a surviving list is promoted generation by generation; memory measured by \`tracemalloc\` returns as soon as the last reference is dropped; and on 3.12 \`None\`, \`True\`, small ints and \`()\` ignore new references entirely.

## Common Pitfalls

- **Believing \`del x\` frees memory.** It removes one reference. The object is freed only if that was the last one, and \`gc.collect()\` only helps for cycles.
- **Reading \`sys.getsizeof\` as total size.** It is shallow: a list of a million strings reports the pointer array, not the strings.
- **Expecting RSS to drop after freeing objects.** pymalloc keeps partially used arenas; memory returns to Python, not necessarily to the OS.
- **Calling \`gc.collect()\` in a hot loop "to save memory".** A full collection walks every tracked object. It fixes nothing that reference counting has not already handled, unless you create cycles.
- **Relying on CPython timing for cleanup.** Files, sockets and locks should be closed with \`with\` or \`try/finally\`, not left to the refcount, which other implementations do not have.
- **Building parent/child structures with strong back-pointers.** They form cycles that wait for the collector; a weak reference for the back-pointer frees the whole tree immediately.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Heap and references:</strong> <span style="color:#f0e2c8;">All objects live on a private heap; names and containers only hold references, and assignment copies references, never objects.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Reference counting:</strong> <span style="color:#f0e2c8;">Each object counts its references; at zero CPython frees it immediately and decrements what it pointed to. Predictable, no pauses.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The cycle collector:</strong> <span style="color:#f0e2c8;">Cycles never reach zero, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gc</code> module periodically finds unreachable groups of container objects; only containers are tracked.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Generations:</strong> <span style="color:#f0e2c8;">Three generations with thresholds such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(700, 10, 10)</code> on 3.11; young objects are scanned often, survivors are promoted and scanned rarely.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Allocator and tools:</strong> <span style="color:#f0e2c8;">pymalloc serves objects up to 512 bytes from pools in arenas, so memory is reused but not always returned to the OS; measure with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tracemalloc</code>, and know 3.12 added immortal objects.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If CPython has reference counting, why does it need a garbage collector at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because of reference cycles. Two objects that point at each other keep each count at 1 after every outside reference is gone. The cyclic collector finds them by subtracting internal references and freeing what is not reachable from outside.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">gc.disable()</code> stop memory from being freed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It only stops automatic cycle collections. Reference counting still frees every acyclic object immediately; only cyclic garbage accumulates until you re-enable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gc</code> or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gc.collect()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my process still use 2 GB after I deleted the big data structure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Small objects come from pymalloc arenas, which can only go back to the OS when completely empty. Python reuses the freed blocks, but RSS stays high. Large allocations go to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">malloc</code> and may be returned. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tracemalloc</code> to confirm Python itself no longer holds the memory.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sys.getrefcount(x)</code> show one more than you expect?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> to the function creates a temporary reference for the duration of the call. Compare differences between two calls, as Example 1 does. On 3.12+ immortal objects such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> show a huge fixed number.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">gc.freeze()</code> help with?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pre-fork servers: freezing moves all existing objects to a permanent generation that collections skip, so after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fork()</code> the collector does not touch the shared pages and trigger copy-on-write in every worker.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Private heap** | The interpreter-managed memory where every Python object is allocated. |
| **pymalloc** | CPython allocator for objects up to 512 bytes, built from arenas, pools and blocks. |
| **Reference counting** | Each object counts references and is freed the moment the count hits zero. |
| **Deterministic destruction** | Freeing at a predictable point, when the last reference goes (CPython, acyclic objects). |
| **Reference cycle** | Objects that refer to each other so their counts never reach zero. |
| **Cyclic garbage collector** | The \`gc\` module: periodically finds and frees unreachable groups of containers. |
| **Generational collection** | Grouping objects by age so young objects are scanned often and old ones rarely. |
| **Immortal object** | An object with a pinned refcount that is never freed before shutdown (3.12+, PEP 683). |

**Conclusion:** CPython keeps every object on a private heap, served by pymalloc for small objects, and frees each object the instant its reference count reaches zero. Because cycles never reach zero, a generational cyclic collector in the \`gc\` module periodically finds unreachable groups of containers and frees them, running their finalizers safely since 3.4. Add immortal objects in 3.12, and the practical consequences follow: \`del\` removes a reference rather than freeing memory, \`getsizeof\` is shallow, RSS can stay high after a free, and deterministic cleanup belongs in \`with\`, not in the garbage collector.`,
    examples: [
      { label: `Reference counting, a cycle only gc.collect() frees, and what gc tracks`, code: `import gc
import sys
import weakref

# Layer 1: reference counting. Every object counts how many references point at it.
data = [1, 2, 3]
base = sys.getrefcount(data)   # includes the temporary reference held by the call itself
alias = data
holder = {"k": data}
print("refs added by alias + dict:", sys.getrefcount(data) - base)
del alias
holder.clear()
print("back to the start:", sys.getrefcount(data) - base)

# When the count reaches zero, CPython frees the object right away.
class Node:
    def __init__(self, name):
        self.name = name
        self.other = None

def report(name):
    return lambda ref: print(f"  freed {name}")

n = Node("solo")
watch = weakref.ref(n, report("solo"))
print("del n ...")
del n
print("after del, object alive?", watch() is not None)

# Layer 2: a reference cycle keeps every count above zero.
gc.disable()           # turn the automatic cycle collector off for the demo
a, b = Node("a"), Node("b")
a.other, b.other = b, a
wa = weakref.ref(a, report("a"))
wb = weakref.ref(b, report("b"))
del a, b
print("cycle after del, still alive?", wa() is not None and wb() is not None)
print("gc.collect() ...")
found = gc.collect()
print("found at least 2 objects:", found >= 2)
print("cycle alive now?", wa() is not None)
gc.enable()

# Which objects does the cycle collector even track? Only containers.
print(gc.is_tracked(42), gc.is_tracked("text"), gc.is_tracked([]), gc.is_tracked(Node("x")))
print(gc.is_tracked({"a": 1}), gc.is_tracked({"a": []}))
print("generations:", len(gc.get_count()))  # generations: 3` },
      { label: `Generations, gc.callbacks and tracemalloc`, code: `import gc
import tracemalloc

# Generational GC: a tracked object starts in generation 0 and is promoted
# each time it survives a collection of its generation.
def generation_of(obj):
    for g in range(3):
        if any(o is obj for o in gc.get_objects(generation=g)):
            return g
    return None

gc.collect()
survivor = [1, 2, 3]
print("new list:", generation_of(survivor))
gc.collect(0)
print("after collect(0):", generation_of(survivor))
gc.collect(1)
print("after collect(1):", generation_of(survivor))
gc.collect()
print("after full collect:", generation_of(survivor))

# Watching the collector work with gc.callbacks.
events = []
def on_gc(phase, info):
    if phase == "stop":
        events.append((info["generation"], info["collected"] > 0))

class Box:
    pass

gc.callbacks.append(on_gc)
for _ in range(100):
    b = Box()
    b.me = b          # a self-cycle: only the cycle collector can free it
del b
gc.collect()
gc.callbacks.remove(on_gc)
print("last collection was generation", events[-1][0], "and freed something:", events[-1][1])

# Memory is handed back the moment the last reference goes, which tracemalloc can see.
tracemalloc.start()
before, _ = tracemalloc.get_traced_memory()
big = [str(i) for i in range(50_000)]
during, _ = tracemalloc.get_traced_memory()
del big
after, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()
print("grew by more than 1 MB while big existed:", during - before > 1_000_000)
print("returned to within 100 KB after del:", after - before < 100_000)
print("peak at least as high as during:", peak >= during)` },
      { label: `Immortal objects on Python 3.12 (PEP 683)`, runnable: false, python: "3.12", code: `# Python 3.12+: some objects are immortal (PEP 683). Their refcount is pinned,
# so taking new references to them no longer writes to the object.
import sys

def refs_added(obj, n=1000):
    before = sys.getrefcount(obj)
    holders = [obj] * n
    after = sys.getrefcount(obj)
    return after - before

class Plain:
    pass

print(sys.version_info[:2] >= (3, 12))
print("None:", refs_added(None))
print("True:", refs_added(True))
print("small int 7:", refs_added(7))
print("empty tuple:", refs_added(()))
print("ordinary object:", refs_added(Plain()))
print("refcount of None is huge:", sys.getrefcount(None) > 10**9)` },
    ],
  },
  {
    title: `What is the difference between del, __del__, and garbage collection?`,
    difficulty: "hard",
    seoDescription: `del vs __del__ vs garbage collection in Python: del unbinds a name, __del__ is a finalizer, gc frees cycles. Timing, resurrection, weakref.finalize.`,
    description: `**Question presented to candidate:**
"People often think \`del x\` calls \`x.__del__()\` and frees memory. Is that right? Explain what \`del\`, the \`__del__\` method and garbage collection each actually do in Python, how they relate, and why you would rarely write \`__del__\` yourself."

**What a strong answer should cover:**
- \`del\` is a statement that removes a reference: it unbinds a name (or deletes an item, slice, attribute or key). It never directly frees an object or calls \`__del__\`.
- \`__del__\` is a finalizer method that CPython calls when the object is about to be destroyed, which happens when its reference count reaches zero, or when the cycle collector frees it.
- Garbage collection is the interpreter reclaiming objects: reference counting frees most objects immediately, and the \`gc\` module frees reference cycles later, calling their finalizers (safe since PEP 442, Python 3.4).
- \`__del__\` caveats: timing is an implementation detail, exceptions inside it are ignored (reported via \`sys.unraisablehook\`), it can resurrect the object, it runs at most once per object in CPython, and it is not guaranteed for objects still alive at interpreter exit.
- The deterministic alternatives: context managers (\`with\`), \`try/finally\`, and \`weakref.finalize\`.

**Code / implementation expected:** Optional — a class with a printing \`__del__\`, an alias that keeps it alive past \`del\`, and a cycle that only \`gc.collect()\` finalizes.`,
    answer: `**Target Audience:** Python developers who have seen \`del\` and \`__del__\` and want to know exactly what each does, and what the garbage collector adds
**Difficulty:** Hard
**Python version:** Checked on CPython 3.11, 3.12 and 3.13 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); all three gave identical output

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was printed by actually running the examples, not typed from memory.

## 1. Why This Even Matters — A Story First

Imagine a shared office printer with a sign-up sheet. Crossing your name off the sheet (that is \`del\`) does not unplug the printer; it just says *you* are done with it. The printer is switched off only when the last name is crossed off. Right before it goes dark, it runs its shutdown routine: flush the queue, park the head (that is \`__del__\`). And once a month the facilities team walks round to find printers that are only "signed up" by other forgotten printers in a loop (that is the garbage collector).

Three different things, three different owners: **you** cross names off, **the object** runs its last-words routine, **the interpreter** decides when the end has come. Mixing them up leads to the classic bugs: expecting \`del\` to close a file, expecting \`__del__\` to run at a precise time, or calling \`gc.collect()\` to "fix" a leak that is really a forgotten reference.

## 2. \`del\`: Remove a Reference

\`del\` is a **statement**, not a function and not a method call. It removes a binding:

| Form | What is removed |
| :--- | :--- |
| \`del x\` | the name \`x\` from the current namespace |
| \`del items[0]\`, \`del items[1:3]\` | an item or slice from a list (calls \`__delitem__\`) |
| \`del obj.attr\` | an attribute (calls \`__delattr__\`) |
| \`del d["key"]\` | a dict entry (calls \`__delitem__\`) |
| \`del a, b\` | several targets, left to right |

After \`del x\`, using \`x\` raises \`NameError\` (or \`UnboundLocalError\` inside a function, Example 2). What happens to the *object* \`x\` pointed to is a separate question: it loses one reference. Example 1 keeps a second name, \`backup\`, so \`del r\` prints nothing at all; the object is destroyed only at \`del backup\`:

~~~text
del r ...
r is gone as a name: True
but the object lives on through backup: r
del backup ...
__del__ r
~~~

Rebinding does the same thing as \`del\`: \`x = Resource("x2")\` drops the reference to \`x1\`, and \`__del__ x1\` prints right there. \`del\` is not special; any way of dropping the last reference triggers destruction.

📌 **Interview term: \`del\` statement** — removes a name binding, item, slice, attribute or key. It decrements the reference count of the object involved; it never calls \`__del__\` directly.

📌 **Interview term: Unbinding** — removing the association between a name and an object. The object is unaffected unless that was its last reference.

## 3. \`__del__\`: the Finalizer

\`__del__\` is a method you can define on a class. CPython calls it when the object is about to be destroyed, just before its memory is released. The name is unlucky, because it has nothing to do with the \`del\` statement apart from the spelling.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="del removes a reference; if the count reaches zero the object is finalized and freed at once; if the object is in a cycle it waits for the cycle collector, which then finalizes and frees it">
  <defs>
    <marker id="py21q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="125" width="150" height="80" rx="10"/>
  <text class="d-text" x="95" y="160" text-anchor="middle">del x</text>
  <text class="d-sub" x="95" y="184" text-anchor="middle">one ref removed</text>
  <rect class="d-box-accent" x="280" y="30" width="190" height="80" rx="10"/>
  <text class="d-text" x="375" y="64" text-anchor="middle">count is 0</text>
  <text class="d-sub" x="375" y="88" text-anchor="middle">immediately</text>
  <rect class="d-box-muted" x="280" y="220" width="190" height="80" rx="10"/>
  <text class="d-text" x="375" y="254" text-anchor="middle">still above 0</text>
  <text class="d-sub" x="375" y="278" text-anchor="middle">alias or cycle</text>
  <rect class="d-box-accent" x="570" y="30" width="170" height="80" rx="10"/>
  <text class="d-text" x="655" y="64" text-anchor="middle">__del__ runs</text>
  <text class="d-sub" x="655" y="88" text-anchor="middle">then memory freed</text>
  <rect class="d-box" x="570" y="220" width="170" height="80" rx="10"/>
  <text class="d-text" x="655" y="254" text-anchor="middle">gc.collect</text>
  <text class="d-sub" x="655" y="278" text-anchor="middle">only for cycles</text>
  <path class="d-edge-accent" d="M 170 150 L 274 80" marker-end="url(#py21q3-arrow)"/>
  <path class="d-edge" d="M 170 180 L 274 250" marker-end="url(#py21q3-arrow)"/>
  <path class="d-edge-accent" d="M 470 70 L 564 70" marker-end="url(#py21q3-arrow)"/>
  <path class="d-edge-dashed" d="M 470 260 L 564 260" marker-end="url(#py21q3-arrow)"/>
  <path class="d-edge-dashed" d="M 655 220 L 655 116" marker-end="url(#py21q3-arrow)"/>
</svg>

Two routes lead to destruction. If the reference count hits zero, CPython runs \`__del__\` and frees the memory immediately, inside whatever statement dropped the reference (often a \`del\`, but just as often a function return or a rebind). If the object is part of a cycle, its count never hits zero, and nothing happens until the cyclic collector runs.

📌 **Interview term: Finalizer** — code that runs when an object is about to be destroyed. In Python that is \`__del__\`, or a callback registered with \`weakref.finalize\`.

The rules every interviewer probes:

- **Timing is not guaranteed by the language.** CPython runs it promptly for acyclic objects because of reference counting; other implementations (PyPy) run it whenever their collector gets round to it.
- **Exceptions are swallowed.** An exception raised in \`__del__\` cannot propagate (who would catch it?). CPython reports it through \`sys.unraisablehook\` (by default an "Exception ignored in" message on stderr) and continues. Example 2 installs a hook and captures \`['RuntimeError']\` while \`del f\` finishes normally.
- **It runs at most once.** If \`__del__\` stores \`self\` somewhere, the object is *resurrected*. Example 1 shows the \`Phoenix\` object surviving its own finalizer; when it dies the second time, \`__del__\` is not called again, per PEP 442.
- **Interpreter exit is not a promise.** Objects still referenced when the interpreter shuts down may never be finalized, and module globals a \`__del__\` relies on may already be torn down.
- **It slows destruction and complicates cycles.** Before Python 3.4 an object with \`__del__\` in a cycle was never freed and ended up in \`gc.garbage\`. PEP 442 ([peps.python.org/pep-0442](https://peps.python.org/pep-0442/)) fixed that: the collector now calls the finalizers, then frees the cycle. Example 1 shows \`__del__ p\` and \`__del__ q\` appearing only after \`gc.collect()\`.

📌 **Interview term: Resurrection** — a finalizer creating a new reference to the object being destroyed, which keeps it alive. Legal, but CPython will not call \`__del__\` a second time for the same object.

## 4. Garbage Collection: Who Actually Frees

"Garbage collection" in CPython is two cooperating mechanisms, covered in depth in [how Python manages memory](/interview-question/how-does-python-manage-memory-and-garbage-collection):

1. **Reference counting** frees an object the instant its count reaches zero. No separate collector involved: this is what runs \`__del__ r\` in the middle of \`del backup\`.
2. **The cyclic garbage collector** (\`gc\` module) runs periodically, finds groups of objects that only reference each other, runs their finalizers and frees them.

📌 **Interview term: Garbage collection** — the interpreter reclaiming memory of objects that can no longer be reached. In CPython: reference counting plus a generational cycle detector.

## 5. The Three Side by Side

| | \`del\` | \`__del__\` | Garbage collection |
| :--- | :--- | :--- | :--- |
| What it is | a statement | a method on your class | an interpreter mechanism |
| Who triggers it | your code | the interpreter, at destruction | the interpreter (refcount at zero, or \`gc\` thresholds) |
| What it does | removes one reference | runs cleanup code for one object | frees memory, calling finalizers first |
| Frees memory? | only if it removed the last reference | no, it runs just before memory is freed | yes |
| Deterministic? | yes, it always unbinds | in CPython for acyclic objects; not guaranteed | refcount part yes; cycle part no |
| Typical use | drop a big temporary, remove a key or item | rarely: last-resort cleanup of external resources | automatic; \`gc.collect()\` in tests |

## 6. Gotchas in Real Code

**The implicit \`del\` after \`except\`.** Python deletes the \`as\` name at the end of every \`except\` block, so the traceback (which references every frame of the failed call) does not keep those frames alive. Example 2 shows \`err\` is not defined after the block.

**A traceback keeps locals alive.** Inside the \`except\` block, \`e.__traceback__\` references the frame of \`fails()\`, and that frame references \`c\`. So \`Conn closed\` prints only when the block ends, not when \`fails()\` raised:

~~~text
inside except: the frame of fails() still holds c
Conn closed
after except
~~~

Store an exception object for later (\`self.last_error = e\`) and you keep that whole call stack alive until you drop it (see [call stack vs heap](/interview-question/what-is-the-difference-between-the-call-stack-and-the-heap-in-python)).

**Order inside containers.** \`del items[:]\` on our run finalized \`i2\` before \`i1\`: list clearing drops references from the end. Do not rely on any particular order.

**\`del\` in a function makes the name local.** Writing \`del value\` anywhere in a function makes \`value\` a local name for the whole function (see the [LEGB rule](/interview-question/what-is-the-legb-rule-for-scope-resolution)); using it afterwards raises \`UnboundLocalError\`, as Example 2 prints.

## 7. What to Use Instead of \`__del__\`

For anything that must be released (files, sockets, locks, temp directories), make cleanup **explicit**:

~~~python
class File:
    def __init__(self, name):
        self.name = name
        self._fin = weakref.finalize(self, print, f"finalize closed {name}")
    def close(self):
        self._fin()          # runs the cleanup now; it never runs twice
    def __enter__(self):
        return self
    def __exit__(self, *exc):
        self.close()
~~~

- **Context manager** (\`with\`) — cleanup at the end of the block, guaranteed even on exceptions ([context managers](/interview-question/what-is-a-context-manager)).
- **\`weakref.finalize(obj, func, *args)\`** — a safety net that runs \`func\` once, either when you call it or when \`obj\` is collected, whichever comes first. Unlike \`__del__\` it does not resurrect, it does not hold a reference to \`obj\` (so \`func\` must not be a bound method of it), and by default it also runs at interpreter exit. Example 2 calls \`g.close()\` twice and the cleanup prints once, then \`alive\` is \`False\`. More in [weak references](/interview-question/what-is-a-weak-reference-in-python).
- **\`try/finally\`** — for one-off cleanup without a class.

📌 **Interview term: \`weakref.finalize\`** — registers a cleanup callback tied to an object lifetime; runs at most once, either explicitly or when the object is collected. The recommended replacement for most \`__del__\` methods.

## 8. Verified: Running the Code

Both examples were run with \`python3.11 main.py\`, with \`python3.12\` and \`python3.13\` (same output), and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — \`del\` vs \`__del__\`: aliases, items, rebinding, cycles and resurrection** prints:

~~~text
open  r
del r ...
r is gone as a name: True
but the object lives on through backup: r
del backup ...
__del__ r
--
open  i0
open  i1
open  i2
__del__ i0
left: ['i1', 'i2']
__del__ i2
__del__ i1
--
open  x1
open  x2
__del__ x1
--
open  p
open  q
after del p, q: no __del__ yet
__del__ p
__del__ q
--
Phoenix.__del__ runs, saving self
resurrected: 1
second death: no second __del__ call
__del__ x2
~~~

**Example 2 — swallowed exceptions, the implicit \`del\` after \`except\`, and \`weakref.finalize\`** prints:

~~~text
del f finished normally, no exception propagated
reported to unraisablehook: ['RuntimeError']
UnboundLocalError
err still defined after except? False
inside except: the frame of fails() still holds c
Conn closed
after except
using a.txt
finalize closed a.txt
after with block
finalize closed b.txt
finalizer alive after close? False
done
~~~

**What the output shows:** \`del r\` with a second reference prints nothing; destruction happens on the last reference, whichever statement drops it; objects in a cycle are finalized only by \`gc.collect()\`; a resurrected object is not finalized twice; an exception in \`__del__\` goes to the unraisable hook; a live traceback delays destruction until the \`except\` block ends; and \`weakref.finalize\` runs its callback exactly once.

## Common Pitfalls

- **Thinking \`del x\` calls \`x.__del__()\`.** It removes one reference. If anything else references the object, nothing happens to it.
- **Putting essential cleanup in \`__del__\`.** It may run late, never (at shutdown), or on another implementation much later. Use \`with\`, \`try/finally\` or \`weakref.finalize\`.
- **Raising or logging heavily in \`__del__\`.** Exceptions are swallowed, and globals such as modules may already be \`None\` during shutdown.
- **Reviving objects by accident.** Appending \`self\` to a global list in \`__del__\` resurrects it, and its finalizer will not run again.
- **Calling \`gc.collect()\` to fix a "leak".** If memory keeps growing, something still references the objects (a cache, a global list, a stored traceback); the collector cannot free reachable objects.
- **Storing exceptions with their tracebacks.** \`self.error = e\` keeps every frame and local of the failed call alive; keep \`str(e)\` or call \`e.with_traceback(None)\` if you only need the message.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. \`del\`:</strong> <span style="color:#f0e2c8;">A statement that removes one reference: a name, item, slice, attribute or key. It does not free memory or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;del&#95;&#95;</code> directly.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. \`__del__\`:</strong> <span style="color:#f0e2c8;">A finalizer the interpreter calls just before destroying an object; nothing to do with the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">del</code> statement except the spelling.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Garbage collection:</strong> <span style="color:#f0e2c8;">Reference counting frees an object the moment its count hits zero; the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gc</code> module frees cycles later and runs their finalizers (PEP 442, 3.4).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Caveats:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;del&#95;&#95;</code> timing is not guaranteed, exceptions in it are swallowed via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.unraisablehook</code>, it can resurrect the object, and it runs at most once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What I use instead:</strong> <span style="color:#f0e2c8;">Context managers and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try/finally</code> for real cleanup, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weakref.finalize</code> as a safety net; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;del&#95;&#95;</code> almost never.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">del x</code> call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x.&#95;&#95;del&#95;&#95;()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It removes the name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>. If that was the last reference, CPython destroys the object and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;del&#95;&#95;</code> as part of destruction; if anything else still references it, nothing happens. Rebinding <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> or returning from a function has the same effect.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&#95;&#95;del&#95;&#95;</code> raises?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The exception cannot propagate, so CPython passes it to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.unraisablehook</code>, which by default prints an "Exception ignored in" message to stderr, and execution continues.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are objects with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&#95;&#95;del&#95;&#95;</code> in a reference cycle ever freed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Since Python 3.4 (PEP 442), yes: the cycle collector calls their finalizers and then frees the cycle. Before 3.4 they were left in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gc.garbage</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Python delete the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except ... as e</code> name at the end of the block?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The exception references its traceback, which references the frames, which reference the exception through the local <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e</code>: a cycle that keeps every local alive. Deleting <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e</code> breaks it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">weakref.finalize</code> better than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&#95;&#95;del&#95;&#95;</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It runs exactly once, you can trigger it early, it does not resurrect the object, it can run at interpreter exit, and it keeps the cleanup logic out of the object, so cycles and shutdown are not a problem.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`del\` statement** | Removes a name, item, slice, attribute or key; drops one reference. |
| **Unbinding** | Removing a name-to-object association; the object survives if other references exist. |
| **Finalizer** | Code run just before an object is destroyed: \`__del__\` or a \`weakref.finalize\` callback. |
| **Resurrection** | A finalizer storing a new reference to the dying object, keeping it alive. |
| **Garbage collection** | Reclaiming unreachable objects: reference counting plus the cycle collector in CPython. |
| **\`weakref.finalize\`** | A once-only cleanup callback tied to an object lifetime; the preferred alternative to \`__del__\`. |

**Conclusion:** \`del\` removes a reference, \`__del__\` is the last code an object runs before it is destroyed, and garbage collection is the interpreter deciding that moment: immediately when the reference count reaches zero, or later through the cycle collector for objects in cycles. None of them is a way to close a resource on time, so keep \`__del__\` for rare last-resort cleanup and put real cleanup in \`with\` blocks, \`try/finally\` or \`weakref.finalize\`.`,
    examples: [
      { label: `del vs __del__: aliases, items, rebinding, cycles and resurrection`, code: `import gc

class Resource:
    def __init__(self, name):
        self.name = name
        print(f"open  {name}")
    def __del__(self):
        print(f"__del__ {self.name}")

# 1. del removes a NAME. The object dies only when its last reference goes.
r = Resource("r")
backup = r
print("del r ...")
del r
print("r is gone as a name:", "r" not in globals())
print("but the object lives on through backup:", backup.name)
print("del backup ...")
del backup
print("--")

# 2. del works on more than names: items, slices, attributes, dict keys.
items = [Resource("i0"), Resource("i1"), Resource("i2")]
del items[0]
print("left:", [x.name for x in items])
del items[:]
print("--")

# 3. Rebinding also drops a reference; del is not special.
x = Resource("x1")
x = Resource("x2")
print("--")

# 4. Objects in a reference cycle: del does nothing visible.
#    __del__ runs only when the cycle collector finds them.
gc.disable()
p, q = Resource("p"), Resource("q")
p.peer, q.peer = q, p
del p, q
print("after del p, q: no __del__ yet")
gc.collect()
gc.enable()
print("--")

# 5. __del__ can resurrect an object; CPython calls it at most once per object.
saved = []
class Phoenix:
    def __del__(self):
        print("Phoenix.__del__ runs, saving self")
        saved.append(self)

ph = Phoenix()
del ph
print("resurrected:", len(saved))
saved.clear()
print("second death: no second __del__ call")
del x` },
      { label: `Swallowed exceptions, the implicit del after except, and weakref.finalize`, code: `import sys
import weakref

# 1. An exception raised inside __del__ never reaches your code.
#    CPython reports it through sys.unraisablehook and carries on.
seen = []
old_hook = sys.unraisablehook
sys.unraisablehook = lambda u: seen.append(type(u.exc_value).__name__)

class Fragile:
    def __del__(self):
        raise RuntimeError("cleanup failed")

f = Fragile()
try:
    del f
    print("del f finished normally, no exception propagated")
finally:
    sys.unraisablehook = old_hook
print("reported to unraisablehook:", seen)

# 2. del makes a name unbound; using it afterwards is an error.
def demo():
    value = 1
    del value
    try:
        return value
    except UnboundLocalError as e:
        return type(e).__name__
print(demo())

# 3. Python runs an implicit del at the end of every except block.
try:
    1 / 0
except ZeroDivisionError as err:
    pass
print("err still defined after except?", "err" in globals())

# 4. A live traceback keeps the frame, and every local in it, alive.
class Conn:
    def __del__(self):
        print("Conn closed")

def fails():
    c = Conn()
    raise ValueError("boom")

try:
    fails()
except ValueError as e:
    print("inside except: the frame of fails() still holds c")
print("after except")

# 5. The deterministic alternatives to __del__.
class File:
    def __init__(self, name):
        self.name = name
        self._fin = weakref.finalize(self, print, f"finalize closed {name}")
    def close(self):
        self._fin()          # runs the cleanup now; it never runs twice
    def __enter__(self):
        return self
    def __exit__(self, *exc):
        self.close()

with File("a.txt") as fh:
    print("using", fh.name)
print("after with block")

g = File("b.txt")
g.close()
g.close()
print("finalizer alive after close?", g._fin.alive)
del g
print("done")` },
    ],
  },
  {
    title: `What is a weak reference in Python?`,
    difficulty: "hard",
    seoDescription: `Python weak references explained: weakref.ref, proxy, callbacks, WeakValueDictionary caches, WeakKeyDictionary, WeakSet, WeakMethod and finalize, verified.`,
    description: `**Question presented to candidate:**
"What is a weak reference in Python, and how is it different from a normal reference? Give me a situation where you would use one, and tell me what the \`weakref\` module offers beyond \`weakref.ref\`."

**What a strong answer should cover:**
- A weak reference refers to an object without increasing its reference count, so it does not keep the object alive; calling the ref returns the object, or \`None\` once it has been collected.
- Use cases: caches that should not keep values alive (\`WeakValueDictionary\`), attaching data to objects you do not own (\`WeakKeyDictionary\`), observer/listener lists (\`WeakSet\`, \`WeakMethod\`), and back-pointers in trees that would otherwise create cycles.
- Callbacks on \`weakref.ref\`, \`weakref.proxy\` (raises \`ReferenceError\` when dead), and \`weakref.finalize\` for cleanup.
- Limits: \`int\`, \`str\`, \`tuple\`, \`list\` and \`dict\` instances cannot be weakly referenced (subclasses of \`list\`/\`dict\` can); classes with \`__slots__\` need \`"__weakref__"\` in the slots.
- The bound-method trap: \`weakref.ref(obj.method)\` dies immediately, which is why \`WeakMethod\` exists.

**Code / implementation expected:** Yes — a small \`WeakValueDictionary\` cache or a listener registry that cleans itself up.`,
    answer: `**Target Audience:** Python developers building caches, event systems or object graphs who need objects to be freed on time
**Difficulty:** Hard
**Python version:** Checked on CPython 3.11, 3.12 and 3.13 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); all three gave identical output

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was printed by actually running the examples, not typed from memory.

## 1. Why This Even Matters — A Story First

You keep a list of your friends' phone numbers. Holding a number does not keep your friend in town: if they move away, the number simply stops working, and you find out when you call it. You did not prevent them from leaving; you only remembered how to reach them *while* they were around.

Compare that with holding your friend's house keys. As long as you have the keys, the house cannot be sold. That is a **strong** reference: it keeps the thing alive.

A **weak reference** is the phone number. It lets you reach an object while it exists, without being one of the reasons it exists. That sounds minor until you build a cache, an event bus or a tree with parent pointers, and discover your program never frees anything because some bookkeeping structure is holding everyone's keys.

## 2. Strong vs Weak

Every normal reference (a name, a list slot, an attribute) is **strong**: it adds one to the object reference count, and CPython frees the object only when that count reaches zero (the full model is in [how Python manages memory](/interview-question/how-does-python-manage-memory-and-garbage-collection)).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 260" role="img" aria-label="An Image object with one strong reference from the name img, counted, and one weak reference from r, not counted">
  <defs>
    <marker id="py21q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="170" height="70" rx="10"/>
  <text class="d-text" x="115" y="62" text-anchor="middle">img</text>
  <text class="d-sub" x="115" y="84" text-anchor="middle">strong reference</text>
  <rect class="d-box-muted" x="30" y="160" width="170" height="70" rx="10"/>
  <text class="d-text" x="115" y="192" text-anchor="middle">r = weakref.ref</text>
  <text class="d-sub" x="115" y="214" text-anchor="middle">weak reference</text>
  <rect class="d-box-accent" x="430" y="90" width="240" height="80" rx="10"/>
  <text class="d-text" x="550" y="124" text-anchor="middle">Image object</text>
  <text class="d-sub" x="550" y="148" text-anchor="middle">refcount counts img only</text>
  <path class="d-edge-accent" d="M 200 65 L 424 115" marker-end="url(#py21q4-arrow)"/>
  <path class="d-edge-dashed" d="M 200 195 L 424 145" marker-end="url(#py21q4-arrow)"/>
  <text class="d-sub" x="310" y="70" text-anchor="middle">counted</text>
  <text class="d-sub" x="310" y="208" text-anchor="middle">not counted</text>
</svg>

A weak reference is a small separate object that knows where the target is but does not add to its count. You "dereference" it by calling it:

~~~python
img = Image("cat.png")
r = weakref.ref(img)
r()          # Image('cat.png'): the object, while it is alive
r() is img   # True
del img      # last strong reference gone, the object is freed
r()          # None
~~~

Example 1 checks with \`sys.getrefcount\` that creating \`r\` did not change the count at all.

📌 **Interview term: Strong reference** — an ordinary reference that keeps its target alive by contributing to its reference count.

📌 **Interview term: Weak reference** — a reference that does not keep its target alive; \`weakref.ref(obj)()\` returns the object or \`None\` once it has been collected.

📌 **Interview term: Referent** — the object a weak reference points to.

**Always dereference once into a local.** \`if r() is not None: r().draw()\` can fail between the two calls if the object dies in between; write \`obj = r()\` then test \`obj\`. Holding \`obj\` is a strong reference, so it stays alive while you use it.

## 3. Callbacks, Proxies and \`finalize\`

- **Callback:** \`weakref.ref(obj, callback)\` calls \`callback(ref)\` when the referent is about to be finalized. By the time it runs, \`ref()\` already returns \`None\` (Example 1 prints that).
- **Proxy:** \`weakref.proxy(obj)\` behaves like the object itself (\`p.name\` works) but raises \`ReferenceError: weakly-referenced object no longer exists\` once the object is gone. Convenient, but errors surface far from their cause; \`ref\` is more explicit.
- **\`weakref.finalize(obj, func, *args)\`:** register cleanup that runs once when \`obj\` dies or when you call the finalizer. It is the modern replacement for most \`__del__\` methods; see [del vs \`__del__\` vs garbage collection](/interview-question/what-is-the-difference-between-del-del-and-garbage-collection).

📌 **Interview term: Weak reference callback** — a function passed to \`weakref.ref\` that is called with the dead ref when the referent is collected.

## 4. The Weak Containers

The \`weakref\` module ships three containers that remove entries automatically when the weakly held object dies. Example 2 uses all of them.

| Container | Weak part | Typical use |
| :--- | :--- | :--- |
| \`WeakValueDictionary\` | values | cache or identity map: share an object while somebody uses it, forget it after |
| \`WeakKeyDictionary\` | keys | attach extra data to objects you do not own (requests, widgets) |
| \`WeakSet\` | members | listeners, observers, "all live instances" registries |

**The cache.** \`load("grass.png")\` returns the same \`Texture\` to every caller while one is in use, and the entry disappears the moment the last caller lets go; the next \`load()\` creates a new one (\`loads: 2\`). Compare that with [\`functools.lru_cache\`](/interview-question/how-does-functools-lru-cache-work), which keeps strong references and therefore keeps values alive until they are evicted. A common production pattern combines both: a small strong LRU for hot items plus a weak map for everything currently in use.

**The side table.** A \`WeakKeyDictionary\` keyed by request objects stores a start time without keeping finished requests alive; \`len(started_at)\` drops from 2 to 1 when \`req1\` is deleted. Keys are compared by \`__eq__\` and \`__hash__\`, so they must be hashable.

**The listener set.** The \`Bus\` holds listeners in a \`WeakSet\`; \`del y\` unsubscribes \`y\` with no \`unsubscribe()\` call. This is the classic answer to the "lapsed listener" leak, where an event source keeps every listener ever registered alive.

📌 **Interview term: \`WeakValueDictionary\`** — a dict whose values are weak references; an entry vanishes when its value object is collected.

📌 **Interview term: \`WeakKeyDictionary\` / \`WeakSet\`** — a dict with weakly held keys, and a set with weakly held members; entries vanish when the object is collected.

## 5. Breaking Cycles with Weak Back-Pointers

<svg class="iq-diagram" width="100%" viewBox="0 0 620 250" role="img" aria-label="A root node holds its children with strong references; each child points back to the root with a weak reference, so there is no strong cycle">
  <defs>
    <marker id="py21q4b-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="230" y="20" width="160" height="70" rx="10"/>
  <text class="d-text" x="310" y="52" text-anchor="middle">root</text>
  <text class="d-sub" x="310" y="74" text-anchor="middle">children list</text>
  <rect class="d-box" x="60" y="160" width="160" height="70" rx="10"/>
  <text class="d-text" x="140" y="192" text-anchor="middle">leaf A</text>
  <text class="d-sub" x="140" y="214" text-anchor="middle">weak parent</text>
  <rect class="d-box" x="400" y="160" width="160" height="70" rx="10"/>
  <text class="d-text" x="480" y="192" text-anchor="middle">leaf B</text>
  <text class="d-sub" x="480" y="214" text-anchor="middle">weak parent</text>
  <path class="d-edge-accent" d="M 260 90 L 170 154" marker-end="url(#py21q4b-arrow)"/>
  <path class="d-edge-accent" d="M 360 90 L 450 154" marker-end="url(#py21q4b-arrow)"/>
  <path class="d-edge-dashed" d="M 110 160 L 230 70" marker-end="url(#py21q4b-arrow)"/>
  <path class="d-edge-dashed" d="M 510 160 L 390 70" marker-end="url(#py21q4b-arrow)"/>
</svg>

A tree where each child holds a strong \`parent\` reference forms a cycle with every child, so dropping the root frees nothing until the cycle collector runs. Make the back-pointer weak, expose it through a [property](/interview-question/what-is-the-property-decorator), and the whole tree is freed by reference counting the instant the last outside reference goes. Example 2 ends with \`leaf.parent\` turning into \`None\` after \`del root\`.

## 6. What Can and Cannot Be Weakly Referenced

To be weakly referenceable, an object needs a slot for the list of weak references pointing at it. Example 1 checks the common types:

~~~text
int cannot be weakly referenced
str cannot be weakly referenced
tuple cannot be weakly referenced
list cannot be weakly referenced
dict cannot be weakly referenced
subclass of list: True
Slotted needs __weakref__ in __slots__
SlottedWeak ok
~~~

- Instances of ordinary classes, functions, sets, frozensets, file objects and generators are weakly referenceable.
- \`int\`, \`str\`, \`tuple\`, \`list\`, \`dict\` (and \`bytes\`, \`None\`) are not; a trivial subclass such as \`class MyList(list)\` is, because the subclass gets the slot.
- A class with [\`__slots__\`](/interview-question/what-does-slots-do) loses its \`__weakref__\` slot unless you list it: \`__slots__ = ("x", "__weakref__")\`.

📌 **Interview term: \`__weakref__\`** — the per-instance slot where CPython keeps the list of weak references to the object. Classes with \`__slots__\` must declare it to support weak references.

## 7. The Bound-Method Trap and \`WeakMethod\`

\`btn.click\` creates a **new bound-method object** each time you access it. \`weakref.ref(btn.click)\` holds the only reference to that temporary object, so it is collected immediately and the ref is dead at once (Example 1 prints \`None\`). \`weakref.WeakMethod(btn.click)\` instead weakly references the instance and the function separately and rebuilds the bound method on demand, and it dies only when \`btn\` does. This matters for any callback registry that stores methods.

📌 **Interview term: \`WeakMethod\`** — a weak reference to a bound method that stays valid as long as the instance is alive.

## 8. Edge Cases

**Hidden strong references keep entries alive.** In Example 2 the loop variable \`tex\` still holds the last \`Texture\` after the loop, so \`three\` stays in the cache until \`del tex\`. The same happens with a value stored in the REPL \`_\` variable, a traceback, or a debugger frame.

**Iterating a weak container while objects die.** CPython defers removals while you iterate a weak container, but take a \`list(...)\` snapshot if your loop body might drop references.

**Weak references are about lifetime, not identity.** A weak reference does not make objects cheaper or smaller; it only removes one reason for them to live. If something else holds a strong reference, the weak one will happily keep returning the object.

**Implementation note.** On CPython the referent dies, and callbacks fire, the moment the last strong reference goes. On PyPy that happens only when its garbage collector runs, so code that expects a weak entry to vanish *immediately* after \`del\` is CPython-specific (fine in apps, risky in tests of a library).

## 9. Verified: Running the Code

Both examples were run with \`python3.11 main.py\`, with \`python3.12\` and \`python3.13\` (same output), and again in this page (Pyodide 0.25.1), with identical output.

**Example 1 — \`ref\`, callbacks, \`proxy\`, what can be weakly referenced, and \`WeakMethod\`** prints:

~~~text
refcount unchanged by weakref: True
call the ref to get the object: Image('cat.png')
same object: True
after del, r() returns: None
callback: referent died, ref() is None
through proxy: logo.png
ReferenceError: weakly-referenced object no longer exists
int cannot be weakly referenced
str cannot be weakly referenced
tuple cannot be weakly referenced
list cannot be weakly referenced
dict cannot be weakly referenced
subclass of list: True
Slotted needs __weakref__ in __slots__
SlottedWeak ok
plain ref to bound method: None
WeakMethod: clicked
WeakMethod after owner dies: None
~~~

**Example 2 — \`WeakValueDictionary\` cache, \`WeakKeyDictionary\`, \`WeakSet\` and a weak parent pointer** prints:

~~~text
shared while in use: True loads: 1
cache keys: ['grass.png']
cache keys after the last user let go: []
loaded again: 2
tracked requests: 2
after req1 finished: 1
publish 1:
  x got hello
  y got hello
publish 2:
  x got again
entries left after the loop: ['three']
after del tex: []
leaf.parent: root
leaf.parent after root dropped: None
~~~

**What the output shows:** a weak reference does not change the reference count and returns \`None\` after the object dies; callbacks see the ref already dead; a proxy raises \`ReferenceError\`; built-in \`int\`, \`str\`, \`tuple\`, \`list\` and \`dict\` refuse weak references while a list subclass accepts them; a plain weak ref to a bound method dies instantly while \`WeakMethod\` lives as long as the instance; and the weak containers drop entries as soon as the last strong reference disappears.

## Common Pitfalls

- **Calling the ref twice.** Check and use a single dereferenced local; the object can vanish between two \`r()\` calls.
- **Weakly referencing a bound method with \`weakref.ref\`.** It is dead immediately. Use \`WeakMethod\`, or store the instance weakly and the function name separately.
- **Expecting a \`WeakValueDictionary\` to be a cache with a lifetime.** Entries disappear the instant nobody uses them, so a value that is used once and dropped is recomputed every time. Pair it with a small strong cache if reuse matters.
- **Trying \`weakref.ref(42)\` or \`weakref.ref([1, 2])\`.** Built-in \`int\`, \`str\`, \`tuple\`, \`list\` and \`dict\` raise \`TypeError\`; wrap the data in a class or use a subclass.
- **Forgetting \`__weakref__\` in \`__slots__\`.** Classes with slots silently lose weak-reference support until you list it.
- **Leaving a stray strong reference.** A loop variable, a global, a closure or a stored exception keeps the "weak" entry alive and makes it look like weak references do not work.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A weak reference points to an object without adding to its reference count, so it never keeps the object alive; calling it returns the object or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The API:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weakref.ref(obj, callback)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weakref.proxy</code> (raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ReferenceError</code> when dead) and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weakref.finalize</code> for once-only cleanup.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The containers:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakValueDictionary</code> for caches, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakKeyDictionary</code> for data attached to objects you do not own, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakSet</code> for listeners; entries vanish automatically.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Limits:</strong> <span style="color:#f0e2c8;">Built-in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> cannot be weakly referenced; subclasses can; classes with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;slots&#95;&#95;</code> need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;weakref&#95;&#95;</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The trap:</strong> <span style="color:#f0e2c8;">A bound method is a temporary object, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weakref.ref(obj.method)</code> dies at once; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMethod</code>. And dereference once into a local before using the object.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">WeakValueDictionary</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">lru&#95;cache</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you want to share an object while anybody is using it, but not keep it alive just because it is cached, for example textures, parsed documents or ORM identity maps. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru&#95;cache</code> holds strong references until eviction; a weak dict forgets the value the moment the last user drops it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can you not weakly reference a list or an int?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Those built-in types have no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;weakref&#95;&#95;</code> slot, which is where CPython keeps the list of weak references to an object; leaving it out saves memory on very common objects. A subclass such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class MyList(list)</code> gets the slot and works.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a weak reference callback receive, and when does it run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The weak reference object itself, already dead (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ref()</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>). On CPython it runs as the referent is being destroyed, which is immediately when the last strong reference goes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">weakref.ref(obj.method)</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">None</code> right away?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Accessing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.method</code> builds a new bound-method object; the weak ref is its only reference, so it is freed at once. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMethod</code> weakly references <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj</code> and the function separately and rebuilds the bound method on each call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do weak references help with memory leaks in event systems?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An event source that stores listeners strongly keeps every listener alive forever (the lapsed-listener problem). Storing them in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakSet</code> or as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakMethod</code> objects lets them be freed when the rest of the program drops them, and they unsubscribe themselves.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Strong reference** | A normal reference that keeps its target alive. |
| **Weak reference** | A reference that does not keep its target alive; returns \`None\` after collection. |
| **Referent** | The object a weak reference points to. |
| **Weak reference callback** | Function called with the dead ref when the referent is collected. |
| **\`WeakValueDictionary\`** | Dict with weakly held values; entries vanish with their value. |
| **\`WeakKeyDictionary\` / \`WeakSet\`** | Dict with weakly held keys; set with weakly held members. |
| **\`__weakref__\`** | Per-instance slot holding the weak references to an object; must be listed in \`__slots__\`. |
| **\`WeakMethod\`** | Weak reference to a bound method, valid while the instance lives. |

**Conclusion:** A weak reference lets you reach an object without keeping it alive: it does not add to the reference count, and it returns \`None\` once the object is gone. That one property powers caches that forget unused values (\`WeakValueDictionary\`), side tables on objects you do not own (\`WeakKeyDictionary\`), self-cleaning listener sets (\`WeakSet\`, \`WeakMethod\`), cleanup hooks (\`finalize\`) and cycle-free parent pointers. Know the limits (no weak refs to built-in \`int\`, \`str\`, \`tuple\`, \`list\`, \`dict\`; add \`__weakref__\` to \`__slots__\`; bound methods need \`WeakMethod\`) and you have the whole topic.`,
    examples: [
      { label: `ref, callbacks, proxy, what can be weakly referenced, and WeakMethod`, code: `import sys
import weakref

class Image:
    def __init__(self, name):
        self.name = name
    def __repr__(self):
        return f"Image({self.name!r})"

# 1. A weak reference points at an object without keeping it alive.
img = Image("cat.png")
before = sys.getrefcount(img)
r = weakref.ref(img)
print("refcount unchanged by weakref:", sys.getrefcount(img) == before)
print("call the ref to get the object:", r())
print("same object:", r() is img)
del img
print("after del, r() returns:", r())

# 2. A callback runs when the referent dies (it receives the dead ref).
def gone(ref):
    print("callback: referent died, ref() is", ref())

tmp = Image("tmp.png")
r2 = weakref.ref(tmp, gone)
del tmp

# 3. A proxy behaves like the object but raises once it is gone.
logo = Image("logo.png")
p = weakref.proxy(logo)
print("through proxy:", p.name)
del logo
try:
    p.name
except ReferenceError as e:
    print("ReferenceError:", e)

# 4. Not every object can be weakly referenced.
for value in (42, "text", (1, 2), [1, 2], {"a": 1}):
    try:
        weakref.ref(value)
        print(type(value).__name__, "ok")
    except TypeError:
        print(type(value).__name__, "cannot be weakly referenced")

class MyList(list):
    pass
print("subclass of list:", weakref.ref(MyList()) is not None)

class Slotted:
    __slots__ = ("x",)
class SlottedWeak:
    __slots__ = ("x", "__weakref__")
for cls in (Slotted, SlottedWeak):
    try:
        weakref.ref(cls())
        print(cls.__name__, "ok")
    except TypeError:
        print(cls.__name__, "needs __weakref__ in __slots__")

# 5. Bound methods die immediately; WeakMethod fixes that.
class Button:
    def click(self):
        return "clicked"
btn = Button()
plain = weakref.ref(btn.click)
print("plain ref to bound method:", plain())
wm = weakref.WeakMethod(btn.click)
print("WeakMethod:", wm()())
del btn
print("WeakMethod after owner dies:", wm())` },
      { label: `A WeakValueDictionary cache, WeakKeyDictionary, WeakSet and a weak parent pointer`, code: `import weakref

class Texture:
    loads = 0
    def __init__(self, path):
        Texture.loads += 1
        self.path = path

# 1. WeakValueDictionary: a cache that never keeps an entry alive by itself.
_cache = weakref.WeakValueDictionary()

def load(path):
    tex = _cache.get(path)
    if tex is None:
        tex = Texture(path)
        _cache[path] = tex
    return tex

a = load("grass.png")
b = load("grass.png")
print("shared while in use:", a is b, "loads:", Texture.loads)
print("cache keys:", sorted(_cache.keys()))
del a, b
print("cache keys after the last user let go:", sorted(_cache.keys()))
c = load("grass.png")
print("loaded again:", Texture.loads)

# 2. WeakKeyDictionary: attach data to objects you do not own,
#    without stopping them from being freed.
class Request:
    pass

started_at = weakref.WeakKeyDictionary()
req1, req2 = Request(), Request()
started_at[req1] = 100
started_at[req2] = 105
print("tracked requests:", len(started_at))
del req1
print("after req1 finished:", len(started_at))

# 3. WeakSet: observers that unsubscribe themselves by dying.
class Bus:
    def __init__(self):
        self.listeners = weakref.WeakSet()
    def publish(self, msg):
        for listener in sorted(self.listeners, key=lambda l: l.name):
            listener.receive(msg)

class Listener:
    def __init__(self, name):
        self.name = name
    def receive(self, msg):
        print(f"  {self.name} got {msg}")

bus = Bus()
x, y = Listener("x"), Listener("y")
bus.listeners.add(x)
bus.listeners.add(y)
print("publish 1:")
bus.publish("hello")
del y
print("publish 2:")
bus.publish("again")

# 4. The usual surprise: a hidden strong reference keeps the entry alive.
cache = weakref.WeakValueDictionary()
for name in ("one", "two", "three"):
    tex = Texture(name)
    cache[name] = tex
print("entries left after the loop:", sorted(cache.keys()))
del tex
print("after del tex:", sorted(cache.keys()))

# 5. A cycle of objects linked only weakly: parent holds children strongly,
#    children point back weakly, so dropping the parent frees everything at once.
class TreeNode:
    def __init__(self, name, parent=None):
        self.name = name
        self.children = []
        self._parent = weakref.ref(parent) if parent else None
        if parent:
            parent.children.append(self)
    @property
    def parent(self):
        return self._parent() if self._parent else None

root = TreeNode("root")
leaf = TreeNode("leaf", root)
print("leaf.parent:", leaf.parent.name)
del root
print("leaf.parent after root dropped:", leaf.parent)` },
    ],
  },
  {
    title: `What is the difference between the call stack and the heap in Python?`,
    difficulty: "medium",
    seoDescription: `Call stack vs heap in Python: frames hold names, every object lives on the heap; recursion limits, closures, generator frames and tracebacks.`,
    description: `**Question presented to candidate:**
"In languages like C or Java people talk about values on the stack and objects on the heap. How does that map to Python? What lives on the call stack, what lives on the heap, and what consequences does that have for recursion, closures and memory?"

**What a strong answer should cover:**
- The call stack is the stack of frames, one per active function call; a frame holds the local variable slots (references), a small evaluation stack, and the position in the bytecode, and is linked to its caller via \`f_back\`.
- Every Python object, including ints and strings, lives on the heap; locals in a frame are only references to heap objects. There is no "value type on the stack" in Python.
- When a call returns its frame is discarded, but objects it created survive if anything still references them (a return value, a closure cell, a global).
- The stack is bounded: \`sys.getrecursionlimit()\` (1000 by default) raises \`RecursionError\`; deep recursion can be converted to a loop with an explicit list as the stack, which lives on the heap.
- CPython details: since 3.11 frames are cheap internal structures and frame objects are created lazily; generators keep their frame alive between \`next()\` calls; tracebacks keep frames and all their locals alive.

**Code / implementation expected:** Optional — walking \`sys._getframe()\` up the stack, or showing a recursive function hit \`RecursionError\` while an explicit-stack version succeeds.`,
    answer: `**Target Audience:** Developers coming from C, C++, Java or Go who want to map "stack vs heap" onto Python, and Python developers debugging recursion or memory
**Difficulty:** Medium
**Python version:** Checked on CPython 3.11, 3.12 and 3.13 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); all gave identical output

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was printed by actually running the examples, not typed from memory.

## 1. Why This Even Matters — A Story First

Think of a restaurant kitchen. Orders come in on paper tickets, and the chef stacks them on a spike: the newest ticket on top is the dish being made right now; when it is done, the ticket comes off and the one below is resumed. That spike is the **call stack**. Each ticket (a **frame**) says which dish, which step you are on, and which ingredients you are using.

The ingredients themselves are not on the ticket. They sit in the pantry and on the counters, the **heap**. A ticket just says "the tomatoes on shelf 3". When a ticket is thrown away, the tomatoes are still there if another ticket, or the dish going out, still needs them.

In C, a small ingredient can be written directly on the ticket (a local \`int\` lives on the stack). In Python, **nothing** is written on the ticket except labels: every value, even the number \`3\`, is in the pantry. That one difference explains why Python locals are cheap to pass around, why recursion has a hard limit, and why a stored exception can keep megabytes alive.

## 2. The Call Stack: Frames

Every time a function is called, CPython creates a **frame** for that call and pushes it on the thread call stack. When the function returns, the frame is popped and discarded. Example 1 walks the chain of frames from inside \`inner()\` using \`sys._getframe()\` and \`f_back\`:

~~~text
innermost first: ['inner', 'middle', 'outer']
~~~

A frame contains:

| Part | Holds |
| :--- | :--- |
| Code object | the compiled function (\`f_code\`): names, constants, bytecode |
| Local variable slots | one *reference* per local name (\`co_varnames\`) |
| Evaluation stack | temporary references while an expression is computed (sized by \`co_stacksize\`) |
| Instruction position | where in the bytecode execution is |
| Link to caller | \`f_back\`, the frame below it on the stack |
| Globals and builtins | the namespaces used for non-local names |

📌 **Interview term: Call stack** — the stack of frames for the calls currently in progress on a thread; the top is the function running now.

📌 **Interview term: Frame** — the per-call record holding local variable references, the evaluation stack, the instruction position and a link to the calling frame. Exposed to Python as a frame object (\`sys._getframe()\`, \`inspect.currentframe()\`).

Locals are stored in numbered slots, not in a dict. On our \`python3.11\` run, \`dis.dis\` of a tiny function shows the fast-local instructions:

~~~python
def f(a):
    b = a + 1
    return b
~~~

~~~text
  1           0 RESUME                   0

  2           2 LOAD_FAST                0 (a)
              4 LOAD_CONST               1 (1)
              6 BINARY_OP                0 (+)
             10 STORE_FAST               1 (b)

  3          12 LOAD_FAST                1 (b)
             14 RETURN_VALUE
~~~

\`LOAD_FAST 0\` pushes the reference in slot 0 onto the evaluation stack; \`STORE_FAST 1\` pops one into slot 1. The integer objects themselves are on the heap. (Bytecode differs between versions; this listing is 3.11.)

📌 **Interview term: Evaluation stack (value stack)** — the per-frame stack of references the bytecode interpreter pushes and pops while computing expressions. CPython is a stack-based virtual machine.

## 3. The Heap: Every Object

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="Left: a call stack of three frames, module, outer and inner, each holding names. Right: the heap with objects. Arrows go from names in frames to objects on the heap">
  <defs>
    <marker id="py21q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text d-accent" x="140" y="30" text-anchor="middle">call stack</text>
  <rect class="d-box-muted" x="40" y="250" width="200" height="70" rx="8"/>
  <text class="d-text" x="140" y="280" text-anchor="middle">module frame</text>
  <text class="d-sub" x="140" y="302" text-anchor="middle">shared</text>
  <rect class="d-box" x="40" y="150" width="200" height="70" rx="8"/>
  <text class="d-text" x="140" y="180" text-anchor="middle">outer() frame</text>
  <text class="d-sub" x="140" y="202" text-anchor="middle">items</text>
  <rect class="d-box-accent" x="40" y="50" width="200" height="70" rx="8"/>
  <text class="d-text" x="140" y="80" text-anchor="middle">inner() frame</text>
  <text class="d-sub" x="140" y="102" text-anchor="middle">target, n</text>
  <text class="d-text d-accent" x="590" y="30" text-anchor="middle">heap</text>
  <rect class="d-box" x="480" y="70" width="220" height="70" rx="8"/>
  <text class="d-text" x="590" y="100" text-anchor="middle">list object</text>
  <text class="d-sub" x="590" y="122" text-anchor="middle">[1, 2, 3]</text>
  <rect class="d-box" x="480" y="210" width="220" height="70" rx="8"/>
  <text class="d-text" x="590" y="240" text-anchor="middle">int object</text>
  <text class="d-sub" x="590" y="262" text-anchor="middle">3</text>
  <path class="d-edge-accent" d="M 240 80 L 474 100" marker-end="url(#py21q5-arrow)"/>
  <path class="d-edge-accent" d="M 240 180 L 474 115" marker-end="url(#py21q5-arrow)"/>
  <path class="d-edge" d="M 240 105 L 474 235" marker-end="url(#py21q5-arrow)"/>
</svg>

Every object, of every type, is allocated on the heap that the interpreter manages (allocation and freeing are covered in [how Python manages memory](/interview-question/how-does-python-manage-memory-and-garbage-collection)). Frames hold arrows into it. Two frames can point at the same heap object, which is why a callee that mutates a list changes what the caller sees, and why rebinding a parameter does not (the full argument-passing story is in [is Python pass-by-value or pass-by-reference](/interview-question/is-python-pass-by-value-or-pass-by-reference)):

~~~text
['from caller', 'from callee']
~~~

📌 **Interview term: Heap** — the memory region where all Python objects live; objects stay there as long as something references them, regardless of which function created them.

The consequences follow directly:

- **An object outlives the frame that created it** if anything still references it. \`make_order()\` returns its \`Order\` and the object survives; its local \`temp\` in \`build()\` is freed when the frame goes, because nothing else referenced it (Example 1 checks with a weak reference).
- **Object lifetime is not tied to scope.** In C, leaving a function destroys its stack values. In Python, leaving a function only drops the frame references; reference counting decides what is freed.
- **Even small ints are heap objects.** CPython avoids re-allocating common ones with a cache ([why Python caches small integers](/interview-question/why-does-python-cache-small-integers)), but they are still heap objects reached through references.

## 4. Stack vs Heap Side by Side

| | Call stack | Heap |
| :--- | :--- | :--- |
| Holds | frames: local slots (references), evaluation stack, position | every object: ints, strings, lists, functions, classes, and frame objects once created |
| Grows | one frame per active call | per allocation |
| Freed | frame discarded when the call returns | object freed when its reference count reaches zero, or by the cycle collector |
| Size limit | recursion limit (\`sys.getrecursionlimit()\`, 1000 by default) | available memory |
| Error when exhausted | \`RecursionError\` | \`MemoryError\` |
| Per thread? | yes, each thread has its own | shared by all threads |

## 5. The Stack Is Small: \`RecursionError\`

Every nested call adds a frame, and CPython caps the depth with the recursion limit, \`1000\` by default on all three versions we ran. Exceed it and \`RecursionError: maximum recursion depth exceeded\` is raised. Example 2 sets a small limit and catches it, then shows the standard fix: replace recursion with a loop and a list used as an explicit stack. The list lives on the heap, so the only limit is memory:

~~~text
iterative sum of 5000-deep nesting: 5001
recursive version: RecursionError
~~~

\`sys.setrecursionlimit()\` can raise the cap, but it is a guard, not a stack size: recursing too deep can still crash the process when the real C stack of the thread runs out. Python 3.12 changed what the limit counts: per the [3.12 What's New](https://docs.python.org/3/whatsnew/3.12.html), the recursion limit now applies only to Python code, and builtin functions are protected by a separate mechanism. There is no tail-call elimination in CPython, so a tail-recursive function still adds a frame per call.

📌 **Interview term: Recursion limit** — the maximum depth of the Python call stack, read with \`sys.getrecursionlimit()\` and changed with \`sys.setrecursionlimit()\`; exceeding it raises \`RecursionError\`.

## 6. Frames That Leave the Stack

Frames normally live and die with their call, but three features keep a frame (or its contents) alive on the heap:

- **Closures.** A local that an inner function uses is moved into a heap-allocated **cell**. Example 1 calls \`tick()\` after \`counter()\` has returned and reads \`count\` from \`tick.__closure__[0].cell_contents\`. Details in [how closures capture variables](/interview-question/how-do-closures-capture-variables-in-python).
- **Generators.** A generator object owns its frame. Between \`next()\` calls the frame is suspended, not destroyed, with its locals intact: Example 2 prints \`gen.gi_frame.f_locals\` as \`{'total': 15, 'x': 5}\`, and after \`close()\` the frame is gone (\`gi_frame\` is \`None\`). See [what generators are and why to use them](/interview-question/what-are-generators-and-why-use-them).
- **Tracebacks.** An exception carries \`__traceback__\`, a chain of traceback entries that each reference a frame. Example 2 reaches into the frame of \`fail()\` after it raised and reads its local \`secret\`. That is how debuggers show locals post mortem, and why storing exceptions can keep large objects alive. How exceptions travel down this stack is in [exception propagation up the call stack](/interview-question/how-does-exception-propagation-work-up-the-call-stack).

📌 **Interview term: Cell** — a small heap object holding a variable shared between a function and its inner functions, so it outlives the outer frame.

## 7. CPython Implementation Notes (3.11+)

The frame model above is the language-level picture. Inside CPython 3.11 two optimisations changed how frames are stored ([What's New in 3.11, faster CPython](https://docs.python.org/3/whatsnew/3.11.html)):

- **Cheaper, lazy frames.** The interpreter keeps a lean internal frame structure in a per-thread memory area, and only builds a full Python frame *object* when something asks for it, such as \`sys._getframe()\`, \`inspect.currentframe()\`, or a traceback. For most code no frame objects are created at all.
- **Inlined Python-to-Python calls.** A Python function calling another Python function no longer recurses into the C interpreter function, so most Python calls consume no C stack.

Neither changes the semantics you can observe: the recursion limit, \`f_back\`, generators and tracebacks all behave as shown, on 3.11, 3.12 and 3.13 alike.

## 8. Verified: Running the Code

Both examples were run with \`python3.11 main.py\`, with \`python3.12\` and \`python3.13\` (same output), and again in this page (Pyodide 0.25.1), with identical output. The \`dis\` listing in section 2 was printed by \`python3.11\` directly.

**Example 1 — frames on the stack, objects on the heap, closures** prints:

~~~text
innermost first: ['inner', 'middle', 'outer']
locals of make_order: ['order']
frame is gone, object survives: 42
['from caller', 'from callee']
cell value after frame ended: 2 2
free variables: ('count',)
local names: ('w', 'h', 'result') nlocals: 3
temp freed when build() returned: True
returned object alive: 2
~~~

**Example 2 — \`RecursionError\`, an explicit heap stack, a suspended generator frame and a frame kept by a traceback** prints:

~~~text
RecursionError: maximum recursion depth exceeded
iterative sum of 5000-deep nesting: 5001
recursive version: RecursionError
suspended frame locals: {'total': 15, 'x': 5}
after close, gi_frame is None
frame of fail() from the traceback: fail
its local: kept alive by the traceback
~~~

**What the output shows:** frames link to their callers through \`f_back\`; a frame records names, while the objects they refer to live on the heap and survive the frame if something still references them; a closure keeps its variable in a cell after its frame is gone; the call stack has a hard depth limit while a list used as a stack does not; and generators and tracebacks keep frames, with their locals, alive.

## Common Pitfalls

- **Thinking small values live "on the stack" in Python.** Every value is a heap object; locals are references. \`x = 3\` stores a reference to an \`int\` object.
- **Equating "the function returned" with "its objects were freed".** Only the frame references go; anything returned, captured in a closure, stored globally or held by a traceback survives.
- **Raising the recursion limit to fix deep recursion.** It moves the crash from a clean \`RecursionError\` to a possible segfault. Rewrite with an explicit stack (a list or \`collections.deque\`) instead.
- **Storing exceptions or tracebacks long-term.** They keep every frame of the failed call, and all their locals, alive.
- **Expecting tail-call optimisation.** CPython has none; a tail-recursive function still uses one frame per call.
- **Relying on \`sys._getframe()\` in production code.** It is a CPython implementation detail (the underscore says so) and is slow because it forces frame objects to be created; use \`inspect\` sparingly, for tooling.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The stack:</strong> <span style="color:#f0e2c8;">The call stack is a stack of frames, one per active call; a frame holds local slots, an evaluation stack, the bytecode position and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f&#95;back</code> to its caller.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The heap:</strong> <span style="color:#f0e2c8;">Every object, including ints and strings, lives on the heap. Frames only hold references, so there are no values on the stack in the C sense.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lifetimes:</strong> <span style="color:#f0e2c8;">Returning pops the frame, but objects survive if anything references them: return values, closure cells, globals, tracebacks.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Limits:</strong> <span style="color:#f0e2c8;">Stack depth is capped by the recursion limit (1000 by default, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code>); the heap is capped by memory, so deep recursion becomes a loop with a list as an explicit stack.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. CPython detail:</strong> <span style="color:#f0e2c8;">Since 3.11 frames are lean internal structures and frame objects are built lazily; generators own a suspended frame between <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next()</code> calls.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x = 3</code> inside a function store the 3?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> object is on the heap (for 3 it is a cached small int). The frame of the function holds a reference to it in the local slot for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code>, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STORE&#95;FAST</code> writes and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD&#95;FAST</code> reads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there a recursion limit, and should you raise it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each call adds a frame and also uses C stack in some paths, so the limit turns runaway recursion into a clean <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">RecursionError</code> instead of a crash. Raise it only modestly and knowingly; for deep data, rewrite with an explicit stack.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does Python do tail-call optimisation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. CPython keeps a frame for every call, which preserves full tracebacks. A tail-recursive function still hits the recursion limit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How can a function local still be alive after the function returned?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If something references the object: it was returned, stored in a global or container, captured by a closure (in a cell), or the frame itself is kept by a generator or a traceback.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the heap shared between threads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. All threads share one heap of objects; each thread has its own call stack of frames. That is why shared mutable objects need locks, while locals are private to their frame.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Call stack** | The stack of frames for calls in progress on one thread. |
| **Frame** | Per-call record: local references, evaluation stack, bytecode position, link to the caller. |
| **Evaluation stack (value stack)** | Per-frame stack of references used while computing expressions. |
| **Heap** | Interpreter-managed memory holding every Python object. |
| **Recursion limit** | Maximum Python call depth; exceeding it raises \`RecursionError\`. |
| **Cell** | Heap object holding a variable shared with inner functions, so it outlives the outer frame. |

**Conclusion:** In Python the call stack holds frames, one per active call, and each frame holds only references: local slots, an evaluation stack and the bytecode position. Every object, even an \`int\`, lives on the interpreter heap and lives as long as something references it, not as long as the function that made it. That is why returned objects and closure cells survive, why generators and tracebacks can keep frames alive, why recursion is capped by \`sys.getrecursionlimit()\`, and why the fix for deep recursion is an explicit stack on the heap.`,
    examples: [
      { label: `Frames on the stack, objects on the heap, closures that outlive frames`, code: `import sys
import weakref

# 1. The call stack: one frame per active call, linked by f_back.
def stack_names():
    names = []
    frame = sys._getframe(1)          # the caller of stack_names
    while frame is not None and frame.f_code.co_name != "<module>":
        names.append(frame.f_code.co_name)
        frame = frame.f_back
    return names

def outer():
    return middle()

def middle():
    return inner()

def inner():
    return stack_names()

print("innermost first:", outer())

# 2. A frame holds NAMES. The objects those names point at live on the heap.
class Order:
    def __init__(self, total):
        self.total = total

def make_order():
    order = Order(42)                 # the Order object is created on the heap
    local_names = sorted(sys._getframe().f_locals)
    return order, local_names

o, names = make_order()
print("locals of make_order:", names)
print("frame is gone, object survives:", o.total)

# 3. Two frames, one heap object: both names reference the same thing.
def append_to(target):
    target.append("from callee")      # mutates the shared heap object

shared = ["from caller"]
append_to(shared)
print(shared)

# 4. A closure moves a local into a heap cell, so it outlives its frame.
def counter():
    count = 0
    def step():
        nonlocal count
        count += 1
        return count
    return step

tick = counter()
tick()
print("cell value after frame ended:", tick(), tick.__closure__[0].cell_contents)
print("free variables:", tick.__code__.co_freevars)

# 5. What the compiler sizes per frame: local slots and evaluation-stack depth.
def area(w, h):
    result = w * h
    return result
code = area.__code__
print("local names:", code.co_varnames, "nlocals:", code.co_nlocals)

# 6. Objects die when the last reference goes, not when "the stack unwinds".
def build():
    temp = Order(1)
    keep = Order(2)
    w_temp = weakref.ref(temp)
    return keep, w_temp

kept, w = build()
print("temp freed when build() returned:", w() is None)
print("returned object alive:", kept.total)` },
      { label: `RecursionError, an explicit heap stack, generator frames and tracebacks`, code: `import sys

# 1. The call stack is bounded: sys.getrecursionlimit() guards against runaway recursion.
def depth_now():
    frame, n = sys._getframe(), 0
    while frame is not None:
        n, frame = n + 1, frame.f_back
    return n

def dive(n):
    return dive(n + 1)

old = sys.getrecursionlimit()
sys.setrecursionlimit(depth_now() + 200)   # a small, safe limit for the demo
try:
    dive(0)
except RecursionError as e:
    print("RecursionError:", str(e).split(" while")[0])
finally:
    sys.setrecursionlimit(old)

# 2. The heap is bounded only by memory: an explicit stack (a list) goes as deep as you like.
def sum_nested_recursive(item):
    if isinstance(item, int):
        return item
    return sum(sum_nested_recursive(x) for x in item)

def sum_nested_iterative(item):
    total, todo = 0, [item]          # todo is a list on the heap
    while todo:
        cur = todo.pop()
        if isinstance(cur, int):
            total += cur
        else:
            todo.extend(cur)
    return total

deep = 1
for _ in range(5000):
    deep = [deep, 1]                  # 5000 levels of nesting
print("iterative sum of 5000-deep nesting:", sum_nested_iterative(deep))
try:
    sum_nested_recursive(deep)
except RecursionError:
    print("recursive version: RecursionError")

# 3. A generator frame is suspended, not destroyed: it waits on the heap between next() calls.
def running_total():
    total = 0
    while True:
        x = yield total
        total += x

gen = running_total()
next(gen)
gen.send(10)
gen.send(5)
print("suspended frame locals:", gen.gi_frame.f_locals)
gen.close()
print("after close, gi_frame is", gen.gi_frame)

# 4. Frames themselves become heap objects once you ask for them (tracebacks, introspection).
def fail():
    secret = "kept alive by the traceback"
    raise KeyError("x")

try:
    fail()
except KeyError as e:
    tb = e.__traceback__
    while tb.tb_next:
        tb = tb.tb_next
    print("frame of fail() from the traceback:", tb.tb_frame.f_code.co_name)
    print("its local:", tb.tb_frame.f_locals["secret"])` },
    ],
  },
];

export default augments;
