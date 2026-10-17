/**
 * PYTHON ULTRA — batch 20: Object model deep dive — attribute lookup, the descriptor protocol,
 * __getattr__ vs __getattribute__, how a + b dispatches, and __init_subclass__.
 * Every example was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does attribute lookup work on a Python object?`,
    difficulty: "hard",
    seoDescription: `How obj.attr is resolved in Python: data descriptors, the instance __dict__, the class MRO, non-data descriptors and __getattr__, verified on 3.11.`,
    description: `**Question presented to candidate:**
"When you write \`obj.name\` in Python, where does the value actually come from? Walk me through the order Python checks things in, and explain why an instance attribute can hide a method but cannot hide a property."

**What a strong answer should cover:**
- \`obj.name\` calls \`type(obj).__getattribute__(obj, "name")\`; for ordinary classes that is \`object.__getattribute__\`, and \`__getattr__\` is called only if it raises \`AttributeError\`.
- The precedence: a **data descriptor** found on the class (defines \`__set__\` or \`__delete__\`, such as \`property\`) wins; then the **instance \`__dict__\`**; then a **non-data descriptor** or plain class attribute found by walking \`type(obj).__mro__\`; then \`__getattr__\`; else \`AttributeError\`.
- Why methods can be shadowed: a function is a non-data descriptor (only \`__get__\`), so an instance-dict entry with the same name wins; \`property\` is a data descriptor, so it does not.
- Assignment is different from reading: \`obj.x = v\` goes to a data descriptor's \`__set__\` if one exists, otherwise straight into \`obj.__dict__\` (which is why \`self.count += 1\` on a class attribute creates an instance copy).
- Implicit special-method lookups (\`len(obj)\`, \`a + b\`) go to the type and skip the instance dict and \`__getattr__\`; \`__slots__\` replaces the instance dict with descriptors on the class.

**Clarifying questions expected:**
- Do you want normal instance lookup only, or also lookup on a class object (which uses \`type.__getattribute__\` and the metaclass)?

**Code / implementation expected:** Optional — a small class showing a data descriptor beating the instance dict and the instance dict beating a method.`,
    answer: `**Target Audience:** Intermediate Python developers who know what a class, an instance and a method are, and want the exact rules an interviewer probes.
**Difficulty:** Hard
**Python version:** Behaviour and bytecode checked on CPython 3.11 (and 3.12/3.13 where noted); both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Every idea comes in plain language first. Words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are repeated in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

Imagine asking an office receptionist for "the stapler".

- First they check the **locked cabinet** the building manager controls. If the building says "the stapler lives here", that is the answer, full stop — nobody's desk can override it.
- Otherwise they look on **your own desk**.
- Otherwise they check the **department shelf**, then the **floor shelf**, then the **building store room**, in that order.
- If still nothing, they ring a **"last resort" helpline** that may invent an answer.
- If the helpline also shrugs, you hear "we have no stapler".

That is attribute lookup on a Python object almost exactly. The locked cabinet is a *data descriptor* on the class, your desk is the instance's \`__dict__\`, the shelves are the classes in the MRO, and the helpline is \`__getattr__\`. Interviewers ask about it because \`property\`, methods, \`classmethod\`, \`__slots__\`, ORMs and \`dataclasses\` all rely on this one rule — and because "why did my instance attribute not override the property?" is a real bug people hit.

## 2. What obj.name Actually Calls

Writing \`obj.name\` compiles to a single bytecode instruction. On CPython 3.11:

~~~text
>>> dis.dis("obj.attr")
  1           2 LOAD_NAME                0 (obj)
              4 LOAD_ATTR                1 (attr)
~~~

\`LOAD_ATTR\` asks the object's **type** to do the lookup: \`type(obj).__getattribute__(obj, "attr")\`. Almost every class inherits that method from \`object\`.

📌 **Interview term: \`object.__getattribute__\`** — the generic attribute-lookup routine (in C, \`PyObject_GenericGetAttr\`) that implements the precedence rules below. You can override \`__getattribute__\` to replace it entirely; that is covered in [__getattr__ vs __getattribute__](/interview-question/what-is-the-difference-between-getattr-and-getattribute).

📌 **Interview term: Instance \`__dict__\`** — the ordinary dict that stores an object's own attributes. \`self.x = 1\` in \`__init__\` usually puts \`"x": 1\` there.

📌 **Interview term: MRO (Method Resolution Order)** — the ordered tuple of classes Python searches, available as \`type(obj).__mro__\`. In Example 1 it printed \`['Thing', 'Base', 'object']\`. How it is computed for multiple inheritance is in [the MRO question](/interview-question/what-is-the-method-resolution-order-mro).

📌 **Interview term: Descriptor** — an object stored on a class that defines \`__get__\` (and maybe \`__set__\` / \`__delete__\`), so that reading it through an instance runs code instead of returning the object itself. A **data descriptor** defines \`__set__\` or \`__delete__\`; a **non-data descriptor** defines only \`__get__\`. The full protocol has [its own question](/interview-question/what-is-the-descriptor-protocol).

## 3. The Lookup Order

<svg class="iq-diagram" width="100%" viewBox="0 0 720 560" role="img" aria-label="Attribute lookup order: data descriptor on the class, then instance dict, then non-data descriptor or class attribute, then getattr, then AttributeError">
  <defs>
    <marker id="py20q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="210" y="20" width="300" height="56" rx="10"/>
  <text class="d-text" x="360" y="44" text-anchor="middle">0. search type(obj).__mro__</text>
  <text class="d-sub" x="360" y="64" text-anchor="middle">remember the first class attribute found</text>
  <path class="d-edge" d="M 360 78 L 360 112" marker-end="url(#py20q1-arrow)"/>
  <rect class="d-box-accent" x="210" y="118" width="300" height="56" rx="10"/>
  <text class="d-text d-accent" x="360" y="142" text-anchor="middle">1. is it a data descriptor?</text>
  <text class="d-sub" x="360" y="162" text-anchor="middle">has __get__ and __set__ or __delete__</text>
  <path class="d-edge" d="M 360 176 L 360 210" marker-end="url(#py20q1-arrow)"/>
  <text class="d-sub" x="390" y="198">no</text>
  <rect class="d-box" x="210" y="216" width="300" height="56" rx="10"/>
  <text class="d-text" x="360" y="240" text-anchor="middle">2. name in obj.__dict__?</text>
  <text class="d-sub" x="360" y="260" text-anchor="middle">the instance attributes</text>
  <path class="d-edge" d="M 360 274 L 360 308" marker-end="url(#py20q1-arrow)"/>
  <text class="d-sub" x="390" y="296">no</text>
  <rect class="d-box" x="210" y="314" width="300" height="56" rx="10"/>
  <text class="d-text" x="360" y="338" text-anchor="middle">3. class attribute found in step 0?</text>
  <text class="d-sub" x="360" y="358" text-anchor="middle">call its __get__ if it has one</text>
  <path class="d-edge" d="M 360 372 L 360 406" marker-end="url(#py20q1-arrow)"/>
  <text class="d-sub" x="390" y="394">no</text>
  <rect class="d-box-muted" x="210" y="412" width="300" height="56" rx="10"/>
  <text class="d-text" x="360" y="436" text-anchor="middle">4. class defines __getattr__?</text>
  <text class="d-sub" x="360" y="456" text-anchor="middle">called only after AttributeError</text>
  <path class="d-edge-dashed" d="M 360 470 L 360 498" marker-end="url(#py20q1-arrow)"/>
  <rect class="d-box-muted" x="260" y="504" width="200" height="36" rx="8"/>
  <text class="d-sub" x="360" y="527" text-anchor="middle">else AttributeError</text>
  <rect class="d-box-accent" x="580" y="118" width="120" height="56" rx="10"/>
  <text class="d-text" x="640" y="142" text-anchor="middle">yes: call</text>
  <text class="d-sub" x="640" y="162" text-anchor="middle">__get__</text>
  <path class="d-edge-accent" d="M 512 146 L 574 146" marker-end="url(#py20q1-arrow)"/>
  <rect class="d-box" x="580" y="216" width="120" height="56" rx="10"/>
  <text class="d-text" x="640" y="240" text-anchor="middle">yes: return</text>
  <text class="d-sub" x="640" y="260" text-anchor="middle">the dict value</text>
  <path class="d-edge" d="M 512 244 L 574 244" marker-end="url(#py20q1-arrow)"/>
</svg>

Read it top to bottom; the first step that produces a value wins. The surprising part is that the class is searched **before** the instance dict (step 0), but only a *data* descriptor found there gets to answer before the instance dict does.

Example 1 sets up one class where every rung of this ladder holds a different value and the instance dict also has an entry for most of the names:

~~~text
loud      -> from data descriptor
quiet     -> from instance dict
plain     -> from instance dict
inherited -> from Base (found via the MRO)
missing   -> from __getattr__ (missing)
~~~

- \`loud\` is a data descriptor, so it beat the instance dict even though \`t.__dict__["loud"]\` exists.
- \`quiet\` is a non-data descriptor, so the instance dict won.
- \`plain\` is a plain class attribute — the instance dict won again.
- \`inherited\` is not on \`Thing\` or the instance; the MRO walk found it on \`Base\`.
- \`missing\` is nowhere, so \`__getattr__\` was finally called.

The example also contains a 20-line pure-Python \`lookup()\` that implements steps 0-3; it agreed with real \`getattr\` on all four names. Writing that model is a good way to make the rule stick.

## 4. Why a Method Can Be Shadowed but a Property Cannot

📌 **Interview term: Non-data descriptor** — functions are one. A function stored on a class has \`__get__\`, which turns it into a bound method when read through an instance (see [bound methods](/interview-question/what-are-bound-and-unbound-methods-in-python)). It has no \`__set__\`, so an instance-dict entry with the same name wins at step 2.

📌 **Interview term: Data descriptor** — \`property\` is one: \`property\` has \`__get__\`, \`__set__\` and \`__delete__\` (checked on 3.11), even for a read-only property. So it answers at step 1 and the instance dict is never consulted.

Example 2 shows both:

~~~python
b.size = lambda: "lambda on the instance"   # shadows Box.size
b.size()        # 'lambda on the instance'
del b.size
b.size()        # 'method on the class' again

a.__dict__["balance"] = -5                  # sneak a value into the dict
a.balance       # 100 -- the property still wins
a.balance = 0   # AttributeError: property 'balance' of 'Account' object has no setter
~~~

That last error message is the 3.11 wording; the important point is that **assignment** also hits the data descriptor first.

## 5. Writing Is Not the Mirror of Reading

📌 **Interview term: Attribute assignment** — \`obj.x = v\` calls \`type(obj).__setattr__\`, which (for \`object\`) does just two things: if the class has a data descriptor for \`x\`, call its \`__set__\`; otherwise store \`v\` in \`obj.__dict__\`. It never walks to a shelf higher up to "update" a class attribute.

That explains the classic class-variable trap from Example 2:

~~~python
class Counter:
    count = 0

c1, c2 = Counter(), Counter()
c1.count += 1        # READ finds Counter.count (0), WRITE goes to c1.__dict__
c1.count, c2.count, Counter.count   # (1, 0, 0)
c1.__dict__, c2.__dict__            # ({'count': 1}, {})
~~~

More on that in [class vs instance variables](/interview-question/what-is-the-difference-between-class-variables-and-instance-variables).

## 6. Lookups That Skip the Instance

<svg class="iq-diagram" width="100%" viewBox="0 0 700 220" role="img" aria-label="len of b goes straight to type of b, while b dot __len__ goes through normal lookup and finds the instance attribute">
  <defs>
    <marker id="py20q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="30" y="30" width="180" height="56" rx="10"/>
  <text class="d-text" x="120" y="54" text-anchor="middle">len(b)</text>
  <text class="d-sub" x="120" y="74" text-anchor="middle">implicit lookup</text>
  <rect class="d-box" x="30" y="134" width="180" height="56" rx="10"/>
  <text class="d-text" x="120" y="158" text-anchor="middle">b.__len__()</text>
  <text class="d-sub" x="120" y="178" text-anchor="middle">explicit lookup</text>
  <rect class="d-box-accent" x="470" y="30" width="200" height="56" rx="10"/>
  <text class="d-text" x="570" y="54" text-anchor="middle">type(b).__len__</text>
  <text class="d-sub" x="570" y="74" text-anchor="middle">returns 3</text>
  <rect class="d-box" x="470" y="134" width="200" height="56" rx="10"/>
  <text class="d-text" x="570" y="158" text-anchor="middle">b.__dict__ entry</text>
  <text class="d-sub" x="570" y="178" text-anchor="middle">returns 99</text>
  <path class="d-edge-accent" d="M 212 58 L 464 58" marker-end="url(#py20q1-arrow2)"/>
  <path class="d-edge" d="M 212 162 L 464 162" marker-end="url(#py20q1-arrow2)"/>
</svg>

📌 **Interview term: Implicit special-method lookup** — when Python itself calls a dunder for an operation (\`len(x)\`, \`x + y\`, \`for i in x\`, \`with x:\`), it looks the method up on \`type(x)\` only, skipping the instance dict and \`__getattr__\` / \`__getattribute__\`. Example 2 gave \`len(b)\` → \`3\` while \`b.__len__()\` → \`99\`. This is what makes operators fast and predictable, and it is why \`a + b\` dispatch is defined on types (see [how a + b dispatches](/interview-question/how-does-a-b-dispatch-in-python)).

## 7. Variations Worth Knowing

- **\`__slots__\`.** A class with \`__slots__ = ("x",)\` gives instances no \`__dict__\`. Each slot is a \`member_descriptor\` on the class — a data descriptor — so steps 1 and 3 do all the work. Assigning an unknown name fails: on 3.11 \`p.y = 2\` raised \`AttributeError: 'Point' object has no attribute 'y'\`; 3.13 adds \`and no __dict__ for setting new attributes\`. See [what __slots__ does](/interview-question/what-does-slots-do).
- **Looking up on a class.** \`Box.size\` goes through \`type.__getattribute__\` instead (they are different functions: \`type.__getattribute__ is object.__getattribute__\` printed \`False\`). It searches the metaclass for data descriptors, then the class MRO, calling \`__get__(None, Box)\`. For a function that returns the plain function: \`type(Box.__dict__["size"]).__name__\` is \`function\`, while \`type(Box().size).__name__\` is \`method\`.
- **Method calls.** \`obj.m()\` compiles to \`LOAD_METHOD\` + \`CALL\` on 3.11 (3.12 folds it into \`LOAD_ATTR\` with a "NULL|self" flag). It is an optimisation that skips creating the bound-method object; the lookup rules are the same.
- **Speed.** CPython 3.11 rewrites hot \`LOAD_ATTR\` instructions into specialised forms for the object shapes it sees — the "specializing adaptive interpreter" of [PEP 659](https://peps.python.org/pep-0659/), which shipped in 3.11. On our run, after calling \`def f(p): return p.x\` 100 times, \`dis.get_instructions(f, adaptive=True)\` showed \`LOAD_ATTR_INSTANCE_VALUE\`. A specialised instruction must give the same answer as the slow path (it falls back when its assumptions break), so the rules above are still what you reason with.

## 8. Verified: Running the Code

Example 1, the ladder and the pure-Python model, printed:

~~~text
loud      -> from data descriptor
quiet     -> from instance dict
plain     -> from instance dict
inherited -> from Base (found via the MRO)
missing   -> from __getattr__ (missing)
MRO: ['Thing', 'Base', 'object']
assigning t.loud = 1
  Loud.__set__ intercepted the assignment
t.__dict__['loud'] is still: from instance dict
loud      model agrees: True
quiet     model agrees: True
plain     model agrees: True
inherited model agrees: True
from data descriptor
~~~

Example 2, special methods, properties, class attributes and slots, printed:

~~~text
3
99
lambda on the instance
method on the class
100
AttributeError: property 'balance' of 'Account' object has no setter
1 0 0
{'count': 1} {}
function
method
member_descriptor
AttributeError: 'Point' object has no attribute 'y'
~~~

What the output proves:

- \`t.loud = 1\` printed \`Loud.__set__ intercepted the assignment\` and left \`t.__dict__['loud']\` untouched: a data descriptor controls writes as well as reads.
- The hand-written \`lookup()\` matched \`getattr\` for every name, so the four-step model is the real behaviour, not a simplification.
- \`len(b)\` and \`b.__len__()\` disagree (\`3\` vs \`99\`): implicit dunder lookup ignores the instance.
- \`{'count': 1} {}\` shows \`+=\` on a class attribute created an instance attribute on \`c1\` only.

## 9. Common Pitfalls

- **Assuming the instance dict is always checked first.** It is checked first only against *non-data* descriptors and plain class attributes; a \`property\` or other data descriptor on the class always wins.
- **Patching a dunder on an instance to change an operator.** \`obj.__len__ = ...\` or \`obj.__add__ = ...\` changes explicit calls only; \`len(obj)\` and \`obj + 1\` still use the type. Patch the class instead.
- **\`self.counter += 1\` on a class attribute.** It reads the shared value and writes a private copy; use \`type(self).counter += 1\` or \`ClassName.counter += 1\` if you meant the shared one.
- **Shadowing a method by accident.** \`self.update = True\` in \`__init__\` makes \`obj.update()\` fail with \`TypeError: 'bool' object is not callable\`, because the instance dict beats the function.
- **A \`__getattr__\` that answers for every name.** It turns typos into silent values and makes \`hasattr\` always true; raise \`AttributeError\` for names you do not handle.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The entry point:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.name</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(obj).__getattribute__(obj, "name")</code>, normally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__getattribute__</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> runs only if that raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The order:</strong> <span style="color:#f0e2c8;">Find the name on the class via the MRO; if it is a data descriptor, call its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code>; else use the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>; else call the class attribute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code> or return it; else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code>; else <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The key distinction:</strong> <span style="color:#f0e2c8;">A data descriptor defines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set__</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__delete__</code> (like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code>), so it beats the instance dict; functions only define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code>, so an instance attribute can shadow a method.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Writes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.x = v</code> calls a data descriptor <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set__</code> if there is one, otherwise writes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.__dict__</code> — that is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.count += 1</code> copies a class attribute onto the instance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The exceptions:</strong> <span style="color:#f0e2c8;">Implicit dunder lookups like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len(obj)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a + b</code> go straight to the type; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__slots__</code> replaces the instance dict with descriptors on the class.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I not override a property by setting an instance attribute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code> is a data descriptor — it has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set__</code> — so it is consulted before the instance dict on reads and intercepts writes. A read-only property raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> on assignment instead of storing the value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does the MRO come in?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is the order in which classes are searched for the name in step 0 — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(obj).__mro__</code>, computed by C3 linearisation. The first class that has the name in its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code> supplies the class attribute.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">len(obj)</code> ignore <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">obj.__len__</code> set on the instance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implicit special-method lookup goes to the type only. It is both a speed optimisation and a correctness rule: operators behave the same for every instance of a type.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is looking up <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Class.attr</code> different from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">instance.attr</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type.__getattribute__</code>: data descriptors on the metaclass first, then the class MRO, calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__(None, Class)</code>. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Class.method</code> gives the plain function and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Class.prop</code> gives the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code> object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does CPython really do this whole walk on every access?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Logically yes. In practice 3.11 specialises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_ATTR</code> and caches results per object shape, but the cache must give the same answer as the full rule, so the rule is what you reason with.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`object.__getattribute__\`** | The default routine that implements attribute lookup |
| **Instance \`__dict__\`** | The dict that holds the object's own attributes |
| **MRO** | The ordered list of classes searched, \`type(obj).__mro__\` |
| **Descriptor** | A class attribute with \`__get__\` that runs code when accessed |
| **Data descriptor** | A descriptor with \`__set__\` or \`__delete__\`; beats the instance dict |
| **Non-data descriptor** | A descriptor with only \`__get__\` (functions); loses to the instance dict |
| **Attribute assignment** | \`obj.x = v\`: data descriptor \`__set__\`, else write to \`obj.__dict__\` |
| **Implicit special-method lookup** | Operators and built-ins look dunders up on the type only |

---
**Conclusion:** Attribute lookup is one fixed algorithm in \`object.__getattribute__\`: search the class MRO, let a data descriptor answer first, then the instance dict, then a non-data descriptor or plain class attribute, and only then \`__getattr__\`. Once you know that \`property\` is a data descriptor and a function is a non-data descriptor, the classic puzzles — why a property cannot be shadowed but a method can, why \`self.count += 1\` forks a class variable, why \`len(obj)\` ignores a patched instance — all fall out of the same rule. Name the order, the data/non-data distinction and the type-only lookup for dunders, and you have the answer an interviewer is looking for.`,
    examples: [
      {
        label: `The lookup order, traced, plus a pure-Python model of it`,
        code: `# The four places obj.name can come from, in priority order.

class Loud:
    """A data descriptor: it defines __get__ AND __set__."""
    def __get__(self, obj, owner):
        return "from data descriptor"
    def __set__(self, obj, value):
        print("  Loud.__set__ intercepted the assignment")

class Quiet:
    """A non-data descriptor: it defines only __get__."""
    def __get__(self, obj, owner):
        return "from non-data descriptor"

class Base:
    inherited = "from Base (found via the MRO)"

class Thing(Base):
    loud = Loud()
    quiet = Quiet()
    plain = "from the class"

    def __getattr__(self, name):
        return f"from __getattr__ ({name})"

t = Thing()
# Write straight into the instance dict, bypassing descriptors.
t.__dict__.update(loud="from instance dict", quiet="from instance dict",
                  plain="from instance dict")

print("loud      ->", t.loud)
print("quiet     ->", t.quiet)
print("plain     ->", t.plain)
print("inherited ->", t.inherited)
print("missing   ->", t.missing)

print("MRO:", [c.__name__ for c in type(t).__mro__])

print("assigning t.loud = 1")
t.loud = 1
print("t.__dict__['loud'] is still:", t.__dict__["loud"])

# A pure-Python model of object.__getattribute__ (no __getattr__ step).
def lookup(obj, name):
    cls_attr = None
    for klass in type(obj).__mro__:
        if name in klass.__dict__:
            cls_attr = klass.__dict__[name]
            break
    getter = getattr(type(cls_attr), "__get__", None)
    is_data = hasattr(type(cls_attr), "__set__") or hasattr(type(cls_attr), "__delete__")
    if getter and is_data:
        return getter(cls_attr, obj, type(obj))
    if name in getattr(obj, "__dict__", {}):
        return obj.__dict__[name]
    if getter:
        return getter(cls_attr, obj, type(obj))
    if cls_attr is not None:
        return cls_attr
    raise AttributeError(name)

for name in ["loud", "quiet", "plain", "inherited"]:
    print(f"{name:9} model agrees:", lookup(t, name) == getattr(t, name))

print(lookup(t, "loud"))  # from data descriptor`,
      },
      {
        label: `Special methods, properties, class attributes and __slots__`,
        code: `# Lookups that do NOT follow the normal instance-first rules.

class Box:
    def __len__(self):
        return 3
    def size(self):
        return "method on the class"

b = Box()
b.__len__ = lambda: 99      # instance attribute named __len__
b.size = lambda: "lambda on the instance"

# Implicit special-method lookup goes to type(b), skipping the instance.
print(len(b))  # 3
print(b.__len__())  # 99
# A plain method is a non-data descriptor, so the instance dict wins.
print(b.size())
del b.size
print(b.size())  # method on the class

# property is a data descriptor: an instance dict entry cannot hide it.
class Account:
    @property
    def balance(self):
        return 100

a = Account()
a.__dict__["balance"] = -5
print(a.balance)  # 100
try:
    a.balance = 0
except AttributeError as e:
    print("AttributeError:", e)

# Class attributes are shared until an instance shadows them.
class Counter:
    count = 0

c1, c2 = Counter(), Counter()
c1.count += 1           # reads Counter.count, writes c1.__dict__["count"]
print(c1.count, c2.count, Counter.count)  # 1 0 0
print(c1.__dict__, c2.__dict__)  # {'count': 1} {}

# Looking up an attribute on a class: the function itself, not a bound method.
print(type(Box.__dict__["size"]).__name__)  # function
print(type(Box().size).__name__)  # method

# __slots__ classes have no instance __dict__; slots are data descriptors.
class Point:
    __slots__ = ("x",)

p = Point()
p.x = 1
print(type(Point.__dict__["x"]).__name__)  # member_descriptor
try:
    p.y = 2
except AttributeError as e:
    print("AttributeError:", e)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the descriptor protocol?`,
    difficulty: "hard",
    seoDescription: `Python descriptors from zero: __get__, __set__, __set_name__, data vs non-data descriptors, and how methods, property and classmethod use them.`,
    description: `**Question presented to candidate:**
"What is the descriptor protocol in Python? Explain \`__get__\`, \`__set__\` and \`__set_name__\`, the difference between a data and a non-data descriptor, and show me a case where you would write one yourself."

**What a strong answer should cover:**
- A descriptor is an object stored as a **class attribute** whose type defines \`__get__(self, obj, objtype)\`, and optionally \`__set__(self, obj, value)\` / \`__delete__(self, obj)\`; attribute access through an instance then calls those methods.
- Data descriptor (has \`__set__\` or \`__delete__\`) beats the instance \`__dict__\`; non-data descriptor (only \`__get__\`) loses to it — and why that matters for caching.
- \`__get__\` receives \`obj=None\` when accessed on the class, and conventionally returns the descriptor itself; \`__set_name__(owner, name)\` (Python 3.6, PEP 487) tells the descriptor the attribute name it was assigned to.
- Built-ins are descriptors: functions (binding \`self\` into a bound method), \`property\`, \`classmethod\`, \`staticmethod\`, \`__slots__\` members, \`functools.cached_property\`.
- Typical uses: validated or typed fields, ORM columns, lazy/cached attributes; per-instance data must live on the instance (e.g. its \`__dict__\`), not on the shared descriptor.

**Code / implementation expected:** Yes — a small validating descriptor (for example a \`Positive\` field) using \`__set_name__\`, \`__get__\` and \`__set__\`.`,
    answer: `**Target Audience:** Intermediate Python developers who use \`@property\` and methods every day and want to know the machinery under them.
**Difficulty:** Hard
**Python version:** Behaviour checked on CPython 3.11 (outputs identical on 3.12 and 3.13); both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Plain-language explanation comes first. The vocabulary an interviewer expects is tagged \`📌 Interview term:\` and defined on the spot; all terms are collected in the Quick Glossary. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A hotel has a **concierge desk** in the lobby. Guests do not walk into the storeroom to grab things; they ask the desk. When you say "my umbrella, please", the concierge checks your room number, fetches *your* umbrella and hands it over. When you hand an umbrella in, the concierge can refuse it ("that is a parasol, sir") before filing it under your room.

One desk serves every guest, and it decides what happens on every hand-out and every hand-in.

A **descriptor** is that concierge. It lives once on the **class**; every **instance** that reads or writes the attribute goes through it; and it uses the instance it was given to find or store that guest's value. Interviewers like this topic because \`property\`, methods, \`classmethod\`, \`staticmethod\`, Django and SQLAlchemy model fields, and \`dataclasses\`' field machinery are all descriptors or built on them. If you understand descriptors, you understand why \`self\` appears in methods at all.

## 2. The Protocol in One Table

📌 **Interview term: Descriptor** — any object whose **type** defines at least one of \`__get__\`, \`__set__\`, \`__delete__\`, and which is stored as an attribute **of a class** (not of an instance).

| Method | Called for | Arguments |
| :--- | :--- | :--- |
| \`__get__(self, obj, objtype=None)\` | reading \`obj.attr\` (or \`Class.attr\`, with \`obj=None\`) | the descriptor, the instance or \`None\`, the owner class |
| \`__set__(self, obj, value)\` | \`obj.attr = value\` | the descriptor, the instance, the new value |
| \`__delete__(self, obj)\` | \`del obj.attr\` | the descriptor, the instance |
| \`__set_name__(self, owner, name)\` | once, when the owning class is created | the descriptor, the class, the attribute name |

📌 **Interview term: \`__set_name__\`** — a hook added with \`__init_subclass__\` in Python 3.6 by PEP 487 ([What's New in 3.6](https://docs.python.org/3/whatsnew/3.6.html)). Before it, a descriptor had no way to learn the name it was assigned to, so you had to write \`qty = Positive("qty")\`. Now \`qty = Positive()\` is enough. In Example 1 it printed \`__set_name__: Order.qty\` and \`__set_name__: Order.price\` as soon as the \`class Order\` statement finished — before any order existed.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Reading o.qty goes to type of o, finds the Positive descriptor in Order dot dict, calls its get method with o and Order, which reads o dot dict">
  <defs>
    <marker id="py20q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="160" height="56" rx="10"/>
  <text class="d-text" x="100" y="64" text-anchor="middle">o.qty</text>
  <text class="d-sub" x="100" y="84" text-anchor="middle">your code</text>
  <rect class="d-box-accent" x="270" y="40" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="370" y="64" text-anchor="middle">Order.__dict__ qty</text>
  <text class="d-sub" x="370" y="84" text-anchor="middle">a Positive object</text>
  <rect class="d-box" x="540" y="40" width="160" height="56" rx="10"/>
  <text class="d-text" x="620" y="64" text-anchor="middle">__get__</text>
  <text class="d-sub" x="620" y="84" text-anchor="middle">(desc, o, Order)</text>
  <rect class="d-box-muted" x="490" y="200" width="210" height="56" rx="10"/>
  <text class="d-text" x="595" y="224" text-anchor="middle">o.__dict__ qty</text>
  <text class="d-sub" x="595" y="244" text-anchor="middle">this order value: 3</text>
  <path class="d-edge" d="M 182 68 L 264 68" marker-end="url(#py20q2-arrow)"/>
  <path class="d-edge-accent" d="M 472 68 L 534 68" marker-end="url(#py20q2-arrow)"/>
  <path class="d-edge-dashed" d="M 620 98 L 620 194" marker-end="url(#py20q2-arrow)"/>
</svg>

One \`Positive\` object sits on the class and serves every \`Order\`; each order's actual number lives in that order's own \`__dict__\`. Storing the value on the descriptor (\`self.value = value\`) would make every order share one quantity — the most common descriptor bug.

## 3. Data vs Non-Data: Who Wins Against the Instance Dict

📌 **Interview term: Data descriptor** — its type defines \`__set__\` or \`__delete__\`. During lookup it is consulted **before** the instance \`__dict__\`, and it intercepts assignment.

📌 **Interview term: Non-data descriptor** — its type defines only \`__get__\`. The instance \`__dict__\` is consulted first, so an instance attribute of the same name hides it.

The full lookup ladder is drawn in [how attribute lookup works](/interview-question/how-does-attribute-lookup-work-on-a-python-object). The one-line version: **data descriptor > instance dict > non-data descriptor > plain class attribute > \`__getattr__\`**.

Example 2 classified the usual suspects by checking their types on 3.11:

~~~text
method non-data descriptor
prop   data descriptor
cm     non-data descriptor
sm     non-data descriptor
plain  not a descriptor
~~~

So a \`property\` cannot be hidden by an instance attribute, but a method, a \`classmethod\` and a \`staticmethod\` can.

The distinction is also a tool. A **non-data** descriptor that writes its result into the instance dict is consulted once, then hidden by its own cached value. Example 2's \`lazy\` does exactly that:

~~~text
  computing total
first : 499500
second: 499500
in dict: True
~~~

\`computing total\` printed once: the second read found \`total\` in \`r.__dict__\` at step 2 and never reached the descriptor. \`functools.cached_property\` works the same way — \`hasattr(functools.cached_property, "__set__")\` is \`False\` on 3.11.

## 4. A Descriptor You Would Actually Write

~~~python
class Positive:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:            # Order.qty -> the descriptor itself
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f"{self.name} must be > 0, got {value}")
        obj.__dict__[self.name] = value

class Order:
    qty = Positive()
    price = Positive()

    def __init__(self, qty, price):
        self.qty = qty             # runs Positive.__set__
        self.price = price
~~~

Line by line:

- \`__set_name__\` stores \`"qty"\` or \`"price"\`, so one class serves both fields.
- \`__get__\` with \`obj is None\` returns the descriptor; that is why \`type(Order.qty).__name__\` printed \`Positive\` and tools like \`help()\` and \`inspect\` can see the field.
- \`__set__\` validates, then writes into the instance dict **using the same key as the attribute name**. That is safe only because \`Positive\` is a data descriptor — it is asked first, so the dict entry never shadows it. Example 1 proved this: after \`o.__dict__["qty"] = 10\`, \`o.qty\` printed \`10\` through the descriptor.
- The validation runs inside \`__init__\` too: \`Order(0, 1)\` raised \`ValueError: qty must be > 0, got 0\`.

Example 1 also calls the protocol by hand: \`Positive.__get__(Order.__dict__["price"], o, Order)\` returned \`2.5\`, which is exactly what \`o.price\` does.

## 5. The Descriptors You Already Use

📌 **Interview term: Bound method** — the object you get from \`instance.method\`. A plain function is a non-data descriptor whose \`__get__(obj, cls)\` returns a \`method\` object that remembers \`obj\` as \`__self__\` and the function as \`__func__\`. Example 2:

~~~python
f = Greeter.__dict__["hello"]      # function
bound = f.__get__(g, Greeter)      # method
bound.__self__ is g, bound.__func__ is f   # (True, True)
bound()                            # 'hello from Greeter'
~~~

That is the entire reason \`self\` is passed automatically; see [bound and unbound methods](/interview-question/what-are-bound-and-unbound-methods-in-python).

| Built-in | Kind | What \`__get__\` returns |
| :--- | :--- | :--- |
| function | non-data | a bound method with \`obj\` as \`self\` |
| \`property\` | data (\`__get__\`, \`__set__\`, \`__delete__\`) | the getter result; \`__set__\` calls the setter or raises |
| \`classmethod\` | non-data | a method bound to the **class** |
| \`staticmethod\` | non-data | the plain function, nothing bound |
| \`__slots__\` entry | data (\`member_descriptor\`) | the value from the fixed slot |
| \`functools.cached_property\` | non-data | computes once, stores in the instance dict |

Built-in functions written in C, such as \`len\`, are **not** descriptors (\`hasattr(type(len), "__get__")\` is \`False\` on 3.11), which is why \`class A: f = len\` makes \`A().f\` the plain \`len\`, with no \`self\` bound. More on the decorators in [@property](/interview-question/what-is-the-property-decorator) and [classmethod vs staticmethod](/interview-question/what-is-the-difference-between-classmethod-and-staticmethod).

## 6. Verified: Running the Code

Example 1, the validated \`Positive\` field, printed:

~~~text
__set_name__: Order.qty
__set_name__: Order.price
7.5
{'qty': 3, 'price': 2.5}
ValueError: qty must be > 0, got -1
ValueError: qty must be > 0, got 0
Positive
qty
10
2.5
4
~~~

Example 2, built-in descriptors and a lazy attribute, printed:

~~~text
function
method
True True
hello from Greeter
method non-data descriptor
prop   data descriptor
cm     non-data descriptor
sm     non-data descriptor
plain  not a descriptor
Demo
static
  computing total
first : 499500
second: 499500
in dict: True
False
~~~

What the output proves:

- \`__set_name__\` ran at class-creation time, once per field, before any \`Order\` was made.
- Bad values were rejected both on assignment (\`-1\`) and inside the constructor (\`0\`).
- \`o.__dict__["qty"] = 10\` did not bypass the descriptor; it just changed what \`__get__\` read.
- A function \`__get__\` produced a \`method\` whose \`__self__\` is the instance.
- The non-data \`lazy\` descriptor ran once and was then shadowed by the instance dict.

## 7. Edge Cases

- **Descriptors only work on the class.** Put \`Positive()\` in an instance's \`__dict__\` and reading it returns the \`Positive\` object itself; the protocol is triggered by the type, not the instance.
- **Classes with \`__slots__\` and no \`__dict__\`.** \`obj.__dict__[self.name]\` fails there; store in a differently named slot, or use a \`weakref.WeakKeyDictionary\` keyed by instance (see [weak references](/interview-question/what-is-a-weak-reference-in-python)).
- **\`__delete__\` alone makes a data descriptor.** A descriptor with \`__get__\` and \`__delete__\` but no \`__set__\` still beats the instance dict, and assignment then fails: on 3.11, \`obj.attr = 5\` raised \`AttributeError('__set__')\`.
- **Inheritance.** A subclass can replace a descriptor by defining the same name; the MRO finds the subclass one first.

## 8. Common Pitfalls

- **Storing per-instance values on the descriptor.** \`self.value = value\` inside \`__set__\` makes every instance share one value. Store on \`obj\`.
- **Forgetting \`obj is None\` in \`__get__\`.** Then \`Class.attr\` crashes with \`AttributeError: 'NoneType' object has no attribute '__dict__'\` and introspection tools break.
- **Writing a caching descriptor with \`__set__\`.** If it is a data descriptor, the cached dict entry never shadows it, so \`__get__\` runs every time — the cache does nothing.
- **Putting the descriptor on an instance.** \`self.qty = Positive()\` in \`__init__\` just stores an object; descriptors must be class attributes.
- **Reaching for a descriptor when \`property\` would do.** One computed attribute on one class is a \`property\`; write a descriptor when the same logic repeats across many fields or classes.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The definition:</strong> <span style="color:#f0e2c8;">A descriptor is an object stored on a class whose type defines <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code>, and optionally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set__</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__delete__</code>; reading or writing that attribute through an instance calls those methods.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Data vs non-data:</strong> <span style="color:#f0e2c8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set__</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__delete__</code> it is a data descriptor and beats the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>; with only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code> it is a non-data descriptor and an instance attribute hides it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The signatures:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__(self, obj, objtype)</code> gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj=None</code> on class access and should return itself; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set_name__(owner, name)</code>, since Python 3.6, tells it the attribute name.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it is used:</strong> <span style="color:#f0e2c8;">Functions are non-data descriptors — <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code> creates the bound method, which is how <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> is passed; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">property</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">classmethod</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">staticmethod</code>, slots and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_property</code> are all descriptors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When I write one:</strong> <span style="color:#f0e2c8;">For reusable field logic such as validation or type coercion across many attributes, storing each value on the instance, not on the shared descriptor.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">functools.cached_property</code> not define <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__set__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It wants to be a non-data descriptor. After the first call it writes the value into the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>, which then wins the lookup, so later reads are plain dict hits and never call the descriptor.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">self</code> get passed to a method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.method</code> finds a function on the class; functions have <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__get__</code>, which returns a bound <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">method</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__self__ = obj</code>. Calling that inserts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj</code> as the first argument.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__get__</code> receive when you access the attribute on the class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">objtype</code> is the class. By convention you return the descriptor itself, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Order.qty</code> gives the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Positive</code> object.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should a descriptor store per-instance data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On the instance: in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.__dict__</code> under a key (the same name is fine for a data descriptor), or in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WeakKeyDictionary</code> for objects without a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code>. Never on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code>, which is shared by all instances.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a descriptor and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__getattr__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A descriptor controls one named attribute and is found during normal lookup; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> is a single fallback for any name that normal lookup could not find.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Descriptor** | A class attribute whose type defines \`__get__\`, \`__set__\` or \`__delete__\` |
| **\`__set_name__\`** | Hook that tells a descriptor its owner class and attribute name (3.6+) |
| **Data descriptor** | Has \`__set__\` or \`__delete__\`; consulted before the instance dict |
| **Non-data descriptor** | Has only \`__get__\`; the instance dict wins over it |
| **Bound method** | What a function \`__get__\` returns: the function plus the instance |

---
**Conclusion:** The descriptor protocol is the hook that lets a class attribute run code when an instance reads, writes or deletes it: \`__get__\`, \`__set__\`, \`__delete__\`, plus \`__set_name__\` to learn its own name. The data versus non-data split decides whether the descriptor or the instance dict wins, which is why a \`property\` cannot be shadowed while a method or a \`cached_property\` can. Functions being non-data descriptors is how bound methods and \`self\` work at all. In practice you write one when the same field logic repeats across many attributes — and you keep the per-instance value on the instance, never on the shared descriptor.`,
    examples: [
      {
        label: `A validated field descriptor with __set_name__`,
        code: `# A reusable validated field: the classic descriptor use case.

class Positive:
    def __set_name__(self, owner, name):
        # Called once, when the owning class body finishes.
        print(f"__set_name__: {owner.__name__}.{name}")
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:            # accessed on the class, not an instance
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f"{self.name} must be > 0, got {value}")
        obj.__dict__[self.name] = value

class Order:
    qty = Positive()
    price = Positive()

    def __init__(self, qty, price):
        self.qty = qty          # goes through Positive.__set__
        self.price = price

o = Order(3, 2.5)
print(o.qty * o.price)
print(o.__dict__)

try:
    o.qty = -1
except ValueError as e:
    print("ValueError:", e)

try:
    Order(0, 1)
except ValueError as e:
    print("ValueError:", e)

# On the class, __get__ receives obj=None and returns the descriptor itself.
print(type(Order.qty).__name__)  # Positive
print(Order.__dict__["qty"].name)  # qty

# It is a DATA descriptor (has __set__), so it beats the instance dict.
o.__dict__["qty"] = 10        # store directly, same key the descriptor uses
print(o.qty)  # 10

# Explicit protocol calls: what Python does for o.price and o.price = 4
print(Positive.__get__(Order.__dict__["price"], o, Order))
Order.__dict__["price"].__set__(o, 4)
print(o.price)  # 4`,
      },
      {
        label: `Methods, property, classmethod and a lazy cached attribute`,
        code: `# Functions, property, classmethod and staticmethod are all descriptors.

class Greeter:
    def hello(self):
        return f"hello from {type(self).__name__}"

g = Greeter()
f = Greeter.__dict__["hello"]          # the raw function object
print(type(f).__name__)  # function
bound = f.__get__(g, Greeter)          # what g.hello does under the hood
print(type(bound).__name__)  # method
print(bound.__self__ is g, bound.__func__ is f)  # True True
print(bound())  # hello from Greeter

def kind(obj):
    t = type(obj)
    if not hasattr(t, "__get__"):
        return "not a descriptor"
    data = hasattr(t, "__set__") or hasattr(t, "__delete__")
    return "data descriptor" if data else "non-data descriptor"

class Demo:
    def method(self): pass
    @property
    def prop(self): return 1
    @classmethod
    def cm(cls): return cls.__name__
    @staticmethod
    def sm(): return "static"
    plain = 42

for name in ["method", "prop", "cm", "sm", "plain"]:
    print(f"{name:6} {kind(Demo.__dict__[name])}")

# classmethod binds the class; staticmethod binds nothing.
print(Demo.__dict__["cm"].__get__(None, Demo)())  # Demo
print(Demo.__dict__["sm"].__get__(None, Demo)())  # static

# A lazy cached value: a NON-data descriptor that writes into the
# instance dict, so the second access never reaches the descriptor.
class lazy:
    def __init__(self, func):
        self.func = func
    def __set_name__(self, owner, name):
        self.name = name
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        print(f"  computing {self.name}")
        value = self.func(obj)
        obj.__dict__[self.name] = value   # shadows the descriptor from now on
        return value

class Report:
    @lazy
    def total(self):
        return sum(range(1_000))

r = Report()
print("first :", r.total)
print("second:", r.total)
print("in dict:", "total" in r.__dict__)

# functools.cached_property uses the same idea.
import functools
print(hasattr(functools.cached_property, "__set__"))  # False`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the difference between __getattr__ and __getattribute__?`,
    difficulty: "hard",
    seoDescription: `__getattr__ vs __getattribute__ in Python: every access vs only misses, the recursion trap, delegation proxies, dunder bypass and module __getattr__.`,
    description: `**Question presented to candidate:**
"Python classes can define both \`__getattr__\` and \`__getattribute__\`. What is the difference, when does each one run, and which would you use to build something like a proxy or a lazy-loading object?"

**What a strong answer should cover:**
- \`__getattribute__\` is called for **every** attribute read on an instance (including methods and \`__dict__\`); \`object.__getattribute__\` implements the normal lookup.
- \`__getattr__\` is a **fallback**, called only when the normal lookup raises \`AttributeError\`; the normal case pays nothing for it.
- The recursion trap: any \`self.x\` inside \`__getattribute__\` calls it again; use \`object.__getattribute__(self, name)\` or \`super().__getattribute__(name)\`.
- Both must raise \`AttributeError\` for unknown names so \`hasattr\` and \`getattr(obj, name, default)\` keep working; an \`AttributeError\` escaping a property silently triggers \`__getattr__\`.
- Implicit special-method lookups (\`len(x)\`, \`x + y\`) bypass both on the instance, so a proxy must define the dunders it needs; modules can define \`__getattr__\` too (PEP 562, Python 3.7).
- Choice: \`__getattr__\` for delegation, defaults and lazy attributes; \`__getattribute__\` only for rare cases that must see every access (tracing, access control), because it is slower and easy to get wrong.

**Code / implementation expected:** Optional — a delegating proxy with \`__getattr__\`, or a tracing \`__getattribute__\` that calls \`object.__getattribute__\`.`,
    answer: `**Target Audience:** Intermediate Python developers who know classes and methods and have seen \`__getattr__\` in library code.
**Difficulty:** Hard
**Python version:** Behaviour checked on CPython 3.11 (outputs identical on 3.12 and 3.13); both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Ideas come in plain language first. Terms an interviewer expects you to use are tagged \`📌 Interview term:\` and defined where they appear; the Quick Glossary repeats them. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A library has two kinds of staff:

- A **security guard at the door** who stops **every** visitor, every single time, before they can ask for anything. Useful if you must log every visit; exhausting, and if the guard ever needs to ask the guard a question, nobody gets in at all.
- A **reference librarian at the back** who is only called when you **could not find** a book on the shelves yourself. Most visitors never meet them; the ones who do get help with the unusual request.

\`__getattribute__\` is the guard: it runs on every attribute access. \`__getattr__\` is the librarian: it runs only after the normal search failed. Interviewers ask this because the names are nearly identical, mixing them up causes infinite recursion or silent bugs, and real tools — mocks, proxies, ORMs, lazy loaders, deprecation shims — are built on the librarian.

## 2. Where Each Hook Sits

📌 **Interview term: \`__getattribute__\`** — the method \`type(obj).__getattribute__(obj, name)\` that performs **every** attribute read. The default, \`object.__getattribute__\`, is the full lookup algorithm described in [how attribute lookup works](/interview-question/how-does-attribute-lookup-work-on-a-python-object). Overriding it replaces the whole algorithm.

📌 **Interview term: \`__getattr__\`** — an optional method Python calls with the name **only if** \`__getattribute__\` raised \`AttributeError\`. It is a fallback for missing names, not a hook on all names.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 330" role="img" aria-label="obj dot name calls getattribute every time; only if it raises AttributeError is getattr called; otherwise the value is returned">
  <defs>
    <marker id="py20q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="40" width="160" height="56" rx="10"/>
  <text class="d-text" x="120" y="64" text-anchor="middle">obj.name</text>
  <text class="d-sub" x="120" y="84" text-anchor="middle">any attribute read</text>
  <rect class="d-box-accent" x="280" y="40" width="200" height="56" rx="10"/>
  <text class="d-text d-accent" x="380" y="64" text-anchor="middle">__getattribute__</text>
  <text class="d-sub" x="380" y="84" text-anchor="middle">runs every time</text>
  <rect class="d-box" x="560" y="40" width="130" height="56" rx="10"/>
  <text class="d-text" x="625" y="64" text-anchor="middle">value</text>
  <text class="d-sub" x="625" y="84" text-anchor="middle">found</text>
  <rect class="d-box-muted" x="280" y="200" width="200" height="56" rx="10"/>
  <text class="d-text" x="380" y="224" text-anchor="middle">__getattr__</text>
  <text class="d-sub" x="380" y="244" text-anchor="middle">only after a miss</text>
  <rect class="d-box-muted" x="560" y="200" width="130" height="56" rx="10"/>
  <text class="d-text" x="625" y="224" text-anchor="middle">value or</text>
  <text class="d-sub" x="625" y="244" text-anchor="middle">AttributeError</text>
  <path class="d-edge" d="M 202 68 L 274 68" marker-end="url(#py20q3-arrow)"/>
  <path class="d-edge-accent" d="M 482 68 L 554 68" marker-end="url(#py20q3-arrow)"/>
  <path class="d-edge-dashed" d="M 380 98 L 380 194" marker-end="url(#py20q3-arrow)"/>
  <text class="d-sub" x="396" y="150">raised AttributeError</text>
  <path class="d-edge" d="M 482 228 L 554 228" marker-end="url(#py20q3-arrow)"/>
</svg>

Example 1 traces both on one class:

~~~text
t.real:
  __getattribute__('real')
  -> present
t.method():
  __getattribute__('method')
  -> method ran
t.nope:
  __getattribute__('nope')
  __getattr__('nope')  <- only after a miss
  -> default for nope
~~~

\`__getattribute__\` ran for the data attribute, for the **method** (methods are attributes too) and for the missing name. \`__getattr__\` ran only for \`nope\`.

## 3. Side by Side

| | \`__getattribute__\` | \`__getattr__\` |
| :--- | :--- | :--- |
| When it runs | every instance attribute read | only after normal lookup raises \`AttributeError\` |
| Default exists? | yes, \`object.__getattribute__\` | no, it is optional |
| Cost | on every access, including \`self.x\` inside your own methods | zero for attributes that exist |
| Recursion risk | high: \`self.anything\` inside calls it again | low, but \`self.missing\` inside it recurses too |
| Typical use | tracing, access control, very unusual proxies | delegation, defaults, lazy loading, deprecation shims |
| Called for \`len(obj)\`, \`obj + 1\`? | no — implicit dunder lookup uses the type | no |
| Write counterpart | \`__setattr__\` (every write), \`__delattr__\` | none — writes have no "missing" case |

Note the asymmetry on the last row: there is no "fallback setter". \`__setattr__\` is called for every assignment, like \`__getattribute__\`, which is why the proxy in Example 2 uses \`object.__setattr__\` in its own \`__init__\`.

## 4. The Recursion Trap

📌 **Interview term: Infinite recursion in \`__getattribute__\`** — inside the method, \`self.__dict__\` is itself an attribute read, so it calls \`__getattribute__\` again, which reads \`self.__dict__\` again, until Python stops it. Example 1:

~~~python
class Broken:
    def __getattribute__(self, name):
        return self.__dict__[name]       # calls __getattribute__ again
~~~

~~~text
RecursionError: maximum recursion depth exceeded
~~~

The fix is to delegate to the base implementation without going through \`self.\`:

~~~python
def __getattribute__(self, name):
    print(f"  __getattribute__({name!r})")
    return object.__getattribute__(self, name)   # or super().__getattribute__(name)
~~~

\`__getattr__\` has a milder version of the same bug: if it reads \`self.something\` that does not exist yet (common during unpickling or \`copy.copy\`, when \`__init__\` has not run), it calls itself.

## 5. AttributeError Is the Contract

📌 **Interview term: \`AttributeError\` contract** — \`hasattr(obj, name)\` and \`getattr(obj, name, default)\` both work by calling the lookup and catching \`AttributeError\`. Both hooks must raise exactly that for names they do not handle. Example 1:

~~~text
False
fallback
True
~~~

- \`Strict.__getattr__\` raised \`AttributeError\`, so \`hasattr\` said \`False\` and \`getattr(..., "fallback")\` returned the default.
- \`Yes.__getattr__\` returned \`None\` for everything, so \`hasattr(Yes(), "literally_anything")\` said \`True\`. Every typo now "works".

The subtle consequence: **any** \`AttributeError\` raised while computing an attribute — even a bug deep inside a \`property\` — makes Python call \`__getattr__\` for the property name. Example 1's \`Config.port\` property mistyped \`self._settings\`:

~~~text
  __getattr__('_settings')
  __getattr__('port')
Config().port -> <missing port>
~~~

The real error vanished; the caller got a plausible-looking default. Defensive fix: let \`__getattr__\` handle only a known set of names, and re-raise everything else.

## 6. Building a Proxy with __getattr__

📌 **Interview term: Delegation (proxy)** — an object that forwards most attribute access to a wrapped object. \`__getattr__\` is the natural tool: attributes the proxy defines itself are found normally, and everything else is forwarded. Example 2's \`ReadOnly\` forwards reads and blocks writes:

~~~python
class ReadOnly:
    def __init__(self, target):
        object.__setattr__(self, "_target", target)   # our own __setattr__ blocks writes
    def __getattr__(self, name):
        return getattr(self._target, name)
    def __setattr__(self, name, value):
        raise AttributeError(f"read-only proxy: cannot set {name!r}")
~~~

\`p.count(1)\` and \`p.index(2)\` were forwarded to the list. \`p.__len__()\` also worked (\`3\`) — but \`len(p)\` raised:

~~~text
TypeError: object of type 'ReadOnly' has no len()
~~~

📌 **Interview term: Special-method lookup bypass** — implicit calls to dunders (\`len()\`, operators, iteration, \`with\`) look on the **type** and never go through \`__getattr__\` or the instance's \`__getattribute__\`. A proxy must define each dunder it wants to support; Example 2's \`ReadOnlySized\` adds \`__len__\` and \`__iter__\`, and \`len(q), sorted(q)\` then printed \`3 [1, 2, 3]\`.

## 7. Module-Level __getattr__

📌 **Interview term: Module \`__getattr__\`** — since Python 3.7 a module can define a top-level \`def __getattr__(name)\` that is called for missing module attributes ([PEP 562](https://peps.python.org/pep-0562/)). Common uses: deprecation warnings for renamed names and lazy imports of heavy submodules. Example 2 builds a module object with \`types.ModuleType\` and attaches the hook:

~~~text
OLD_TIMEOUT = 30
warning: OLD_TIMEOUT is deprecated, use TIMEOUT
AttributeError: module 'settings' has no attribute 'NOPE'
~~~

There is no module-level \`__getattribute__\`; only the fallback exists. Modules are explained in [modules vs packages](/interview-question/what-is-the-difference-between-a-module-and-a-package).

## 8. Verified: Running the Code

Example 1, which hook runs when, recursion and hidden errors, printed:

~~~text
t.real:
  __getattribute__('real')
  -> present
t.method():
  __getattribute__('method')
  -> method ran
t.nope:
  __getattribute__('nope')
  __getattr__('nope')  <- only after a miss
  -> default for nope
RecursionError: maximum recursion depth exceeded
  __getattr__('_settings')
  __getattr__('port')
Config().port -> <missing port>
False
fallback
True
~~~

Example 2, proxy, dunder bypass and module \`__getattr__\`, printed:

~~~text
1
2
AttributeError: read-only proxy: cannot set 'x'
3
TypeError: object of type 'ReadOnly' has no len()
3 [1, 2, 3]
OLD_TIMEOUT = 30
warning: OLD_TIMEOUT is deprecated, use TIMEOUT
AttributeError: module 'settings' has no attribute 'NOPE'
~~~

What the output proves:

- \`__getattribute__\` ran for data, methods and missing names alike; \`__getattr__\` only for the miss.
- \`self.__dict__\` inside \`__getattribute__\` recursed until \`RecursionError\`.
- An \`AttributeError\` from inside a property was swallowed and replaced by \`__getattr__\`'s default.
- \`len(p)\` ignored the proxy \`__getattr__\` even though \`p.__len__()\` worked.

## 9. Common Pitfalls

- **Using \`self.x\` inside \`__getattribute__\`.** Always go through \`object.__getattribute__(self, ...)\` or \`super()\`.
- **Returning a value for every name in \`__getattr__\`.** \`hasattr\` becomes always \`True\`, typos stop failing, and tools such as \`copy\` and \`pickle\` that probe for optional dunders (\`__deepcopy__\`, \`__getstate__\`) get your default instead of \`AttributeError\`.
- **Reading \`self.attr\` inside \`__getattr__\` before \`__init__\` ran.** Unpickling and \`copy.copy\` create objects without \`__init__\`; the lookup misses and \`__getattr__\` calls itself — on our 3.11 run, \`copy.copy()\` of a proxy whose \`__getattr__\` read \`self.t\` raised \`RecursionError\`. Use \`self.__dict__.get(...)\` or \`object.__getattribute__\`.
- **Expecting a \`__getattr__\` proxy to support operators.** \`len()\`, \`+\`, \`in\`, iteration and \`with\` ignore it; define those dunders explicitly.
- **Overriding \`__getattribute__\` for something \`__getattr__\` or a \`property\` can do.** It slows every access, including your own methods' \`self.\` reads, and makes the class hard to debug.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattribute__</code> runs on every attribute read; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> runs only when normal lookup raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The default:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__getattribute__</code> is the normal lookup — descriptors, instance dict, MRO — and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> is called after it fails; there is no default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trap:</strong> <span style="color:#f0e2c8;">Inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattribute__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.anything</code> recurses forever; call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__getattribute__(self, name)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().__getattribute__(name)</code> instead.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The contract:</strong> <span style="color:#f0e2c8;">Both must raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> for unknown names so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasattr</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">getattr</code> with a default keep working; an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> escaping a property silently falls into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What I would use:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> for proxies, defaults and lazy attributes, plus explicit dunders because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code> and operators bypass it; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattribute__</code> only when every access must be intercepted.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does my <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__getattr__</code> proxy fail with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">len(proxy)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Built-ins and operators look special methods up on the type, not through instance attribute access, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> is never asked. Define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__len__</code> (and any other dunder you need) on the proxy class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid recursion in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__getattribute__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Never read through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.</code> inside it. Delegate with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__getattribute__(self, name)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().__getattribute__(name)</code>, and use that same call for any of your own attributes you need inside.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__setattr__</code> fallback like <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__getattr__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__setattr__</code> is called for every assignment, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattribute__</code>, because assignment has no "not found" case. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__setattr__</code> inside it to actually store a value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does PEP 562 add?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Module-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dir__</code>, in Python 3.7. A module can lazily import a submodule or warn about a deprecated name when someone accesses it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a property bug look like a missing attribute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If the property getter raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> for any reason, Python treats the property itself as missing and calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> with its name, hiding the original error.</span>
</div>

</div>

## 11. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`__getattribute__\`** | Runs on every attribute read; default is the normal lookup |
| **\`__getattr__\`** | Optional fallback called only after a lookup miss |
| **Infinite recursion in \`__getattribute__\`** | \`self.x\` inside the hook calls the hook again |
| **\`AttributeError\` contract** | Raise it for unknown names so \`hasattr\`/\`getattr\` work |
| **Delegation (proxy)** | Forwarding attribute access to a wrapped object |
| **Special-method lookup bypass** | \`len()\` and operators look dunders up on the type only |
| **Module \`__getattr__\`** | PEP 562 fallback for missing module attributes (3.7+) |

---
**Conclusion:** \`__getattribute__\` and \`__getattr__\` differ in *when* they run: the first is the lookup itself and runs on every read, the second is the fallback that runs only after that lookup raised \`AttributeError\`. That single fact explains the rest — \`__getattr__\` is cheap and safe for proxies, defaults and lazy loading, while overriding \`__getattribute__\` is slow and recursion-prone unless you delegate to \`object.__getattribute__\`. Add the two traps an interviewer looks for: always raise \`AttributeError\` for unknown names, and remember that \`len()\` and operators bypass both hooks, so a proxy needs its dunders defined explicitly.`,
    examples: [
      {
        label: `Which hook runs when, the recursion trap and hidden AttributeErrors`,
        code: `# __getattribute__ runs on EVERY access; __getattr__ only after a miss.

class Traced:
    def __init__(self):
        self.real = "present"

    def __getattribute__(self, name):
        print(f"  __getattribute__({name!r})")
        return object.__getattribute__(self, name)   # the normal lookup

    def __getattr__(self, name):
        print(f"  __getattr__({name!r})  <- only after a miss")
        return f"default for {name}"

    def method(self):
        return "method ran"

t = Traced()
print("t.real:")
print("  ->", t.real)
print("t.method():")
print("  ->", t.method())
print("t.nope:")
print("  ->", t.nope)

# The recursion trap: self.anything inside __getattribute__ calls it again.
class Broken:
    def __getattribute__(self, name):
        return self.__dict__[name]       # self.__dict__ -> __getattribute__ ...

try:
    Broken().x
except RecursionError as e:
    print("RecursionError:", e)

# A property that raises AttributeError by mistake falls into __getattr__,
# hiding the real bug.
class Config:
    def __init__(self):
        self._config = {"port": 8080}
    @property
    def port(self):
        # Bug: the real attribute is _config, not _settings.
        return self._settings["port"]
    def __getattr__(self, name):
        print(f"  __getattr__({name!r})")
        if name.startswith("_"):
            raise AttributeError(name)
        return f"<missing {name}>"

print("Config().port ->", Config().port)

# hasattr() and getattr(default) both rely on AttributeError.
class Strict:
    def __getattr__(self, name):
        raise AttributeError(f"{type(self).__name__} has no {name!r}")

s = Strict()
print(hasattr(s, "anything"))  # False
print(getattr(s, "anything", "fallback"))  # fallback

# __getattr__ returning a value for every name fools hasattr.
class Yes:
    def __getattr__(self, name):
        return None
print(hasattr(Yes(), "literally_anything"))  # True`,
      },
      {
        label: `A delegating proxy, the dunder bypass and module-level __getattr__`,
        code: `# __getattr__ for delegation: a read-only proxy around another object.

class ReadOnly:
    def __init__(self, target):
        object.__setattr__(self, "_target", target)

    def __getattr__(self, name):
        # Only names the proxy itself lacks get here.
        return getattr(self._target, name)

    def __setattr__(self, name, value):
        raise AttributeError(f"read-only proxy: cannot set {name!r}")

data = [3, 1, 2]
p = ReadOnly(data)
print(p.count(1))  # 1
print(p.index(2))  # 2
try:
    p.x = 5
except AttributeError as e:
    print("AttributeError:", e)

# Implicit special-method calls look on the TYPE and skip __getattr__.
print(p.__len__())  # 3
try:
    len(p)
except TypeError as e:
    print("TypeError:", e)

# Fix: define the dunders you need on the proxy class explicitly.
class ReadOnlySized(ReadOnly):
    def __len__(self):
        return len(self._target)
    def __iter__(self):
        return iter(self._target)

q = ReadOnlySized(data)
print(len(q), sorted(q))  # 3 [1, 2, 3]

# Module-level __getattr__ (PEP 562): lazy or deprecated module names.
import types, warnings
mod = types.ModuleType("settings")
mod.TIMEOUT = 30

def module_getattr(name):
    if name == "OLD_TIMEOUT":
        warnings.warn("OLD_TIMEOUT is deprecated, use TIMEOUT", DeprecationWarning)
        return mod.TIMEOUT
    raise AttributeError(f"module 'settings' has no attribute {name!r}")

mod.__getattr__ = module_getattr
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    print("OLD_TIMEOUT =", mod.OLD_TIMEOUT)
print("warning:", caught[0].message)
try:
    mod.NOPE
except AttributeError as e:
    print("AttributeError:", e)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does a + b dispatch in Python?`,
    difficulty: "medium",
    seoDescription: `How Python evaluates a + b: __add__, NotImplemented, __radd__, the subclass-first rule, __iadd__ for +=, and the BINARY_OP bytecode, all verified.`,
    description: `**Question presented to candidate:**
"When Python evaluates \`a + b\`, what actually happens? Which object's method gets called, what happens if it does not know how to add the other type, and how is \`a += b\` different?"

**What a strong answer should cover:**
- \`a + b\` calls \`type(a).__add__(a, b)\`; if that is missing or returns \`NotImplemented\`, Python calls \`type(b).__radd__(b, a)\`; if that also fails, \`TypeError: unsupported operand type(s) for +\`.
- \`NotImplemented\` is a special value to **return** (not \`NotImplementedError\` to raise), meaning "I cannot handle this type, ask the other side".
- The subclass rule: if \`type(b)\` is a subclass of \`type(a)\` and overrides \`__radd__\`, \`b.__radd__\` is tried **first**; if both operands have the same type, \`__radd__\` is never tried.
- Methods are looked up on the **type**, not the instance, so patching \`obj.__add__\` has no effect on \`obj + x\`.
- \`a += b\` tries \`__iadd__\` first (in-place, e.g. \`list\` mutates and aliases see it), falling back to \`a = a + b\` (e.g. \`tuple\`, \`int\`, \`str\`); the \`t[0] += [x]\` tuple gotcha.
- CPython detail: since 3.11 all binary operators compile to a single \`BINARY_OP\` instruction with the operator in its argument.

**Code / implementation expected:** Optional — a small class with \`__add__\` and \`__radd__\` returning \`NotImplemented\` for unsupported types.`,
    answer: `**Target Audience:** Beginners to intermediate Python developers who have written a class and want to know how operators work on it.
**Difficulty:** Medium
**Python version:** Behaviour and bytecode checked on CPython 3.11 (outputs identical on 3.12 and 3.13); both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Plain language first; terms an interviewer expects are tagged \`📌 Interview term:\` and defined where they appear, then repeated in the Quick Glossary. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

Two people from different countries want to combine their savings. One holds dollars, the other euros.

The rule at the bank is polite: **the person on the left speaks first**. "Can you add my dollars to those euros?" If the left person says "sorry, I only know dollars", the clerk turns to the **person on the right** and asks the mirrored question: "can *you* add those dollars to your euros?" Only if both say no does the clerk give up with "these currencies cannot be combined".

One more rule: if the right person is a **specialist version** of the left one — say, a euro-dollar expert who works for the same bank — they get asked **first**, because they know more.

That is \`a + b\` in Python. \`+\` is not magic for numbers only; it is a polite, two-sided negotiation between objects, and it is what lets \`Decimal + int\`, \`numpy_array + 1\`, \`Path / "file"\` and your own \`Money + Money\` all work. Interviewers ask it to check you know \`NotImplemented\`, the reflected methods, and the \`+=\` traps.

## 2. The Dispatch Rules

📌 **Interview term: Operator overloading** — defining what an operator means for your class by implementing its special method: \`+\` is \`__add__\`, \`-\` is \`__sub__\`, \`*\` is \`__mul__\`, \`@\` is \`__matmul__\`, and so on. See [dunder methods](/interview-question/what-are-dunder-magic-methods) for the wider family.

📌 **Interview term: Reflected method** — the mirrored version Python tries on the **right** operand: \`__radd__\`, \`__rsub__\`, \`__rmul__\`... For \`a + b\` it is called as \`b.__radd__(a)\`.

📌 **Interview term: \`NotImplemented\`** — a built-in singleton (of type \`NotImplementedType\`) that an operator method **returns** to say "I do not support that other type". It is not an error and must not be confused with the exception \`NotImplementedError\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 470" role="img" aria-label="a plus b: optional subclass check first, then type of a add, then type of b radd, then TypeError">
  <defs>
    <marker id="py20q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="260" y="20" width="200" height="44" rx="10"/>
  <text class="d-text" x="360" y="48" text-anchor="middle">a + b</text>
  <path class="d-edge" d="M 360 66 L 360 100" marker-end="url(#py20q4-arrow)"/>
  <rect class="d-box-muted" x="180" y="106" width="360" height="56" rx="10"/>
  <text class="d-text" x="360" y="130" text-anchor="middle">0. type(b) subclass of type(a)</text>
  <text class="d-sub" x="360" y="150" text-anchor="middle">and overrides __radd__: try b first</text>
  <path class="d-edge" d="M 360 164 L 360 198" marker-end="url(#py20q4-arrow)"/>
  <rect class="d-box-accent" x="180" y="204" width="360" height="56" rx="10"/>
  <text class="d-text d-accent" x="360" y="228" text-anchor="middle">1. type(a).__add__(a, b)</text>
  <text class="d-sub" x="360" y="248" text-anchor="middle">missing or NotImplemented: go on</text>
  <path class="d-edge" d="M 360 262 L 360 296" marker-end="url(#py20q4-arrow)"/>
  <rect class="d-box" x="180" y="302" width="360" height="56" rx="10"/>
  <text class="d-text" x="360" y="326" text-anchor="middle">2. type(b).__radd__(b, a)</text>
  <text class="d-sub" x="360" y="346" text-anchor="middle">skipped when both types are the same</text>
  <path class="d-edge-dashed" d="M 360 360 L 360 394" marker-end="url(#py20q4-arrow)"/>
  <rect class="d-box-muted" x="210" y="400" width="300" height="44" rx="10"/>
  <text class="d-sub" x="360" y="427" text-anchor="middle">3. TypeError: unsupported operand</text>
  <rect class="d-box-accent" x="600" y="204" width="100" height="56" rx="10"/>
  <text class="d-text" x="650" y="237" text-anchor="middle">result</text>
  <path class="d-edge-accent" d="M 542 232 L 594 232" marker-end="url(#py20q4-arrow)"/>
</svg>

The first method that returns anything other than \`NotImplemented\` gives the result. Example 1 prints a trace line each time Python calls one of \`Money\`'s methods:

~~~text
3 + Money(5):
  Money(5).__radd__(3)
  Money(5).__add__(3)
  = Money(8)
(3).__add__(Money(5)) -> NotImplemented
~~~

\`int.__add__\` ran first (silently, it is C code) and returned \`NotImplemented\` — the second line proves that — so Python asked \`Money(5).__radd__(3)\`.

When nobody can do it:

~~~text
Money(5) + 'x':
  Money(5).__add__('x')
  TypeError: unsupported operand type(s) for +: 'Money' and 'str'
~~~

\`str\` has no \`__radd__\`, so after \`Money.__add__\` returned \`NotImplemented\` there was nothing left to try.

## 3. The Subclass-First Rule

📌 **Interview term: Subclass priority for reflected operands** — if the right operand's type is a **subclass** of the left operand's type **and provides its own** reflected method, Python calls the right operand's reflected method **before** the left one's normal method. Without this rule, a subclass could never customise how it combines with its parent class, because the parent (on the left) would always answer first.

~~~text
Money(1) + Euro(2):
  Euro(2).__radd__(Money(1))  <- asked first
  = Euro(3)
~~~

\`Money.__add__\` was never called. Two details, both checked on 3.11:

- If the subclass does **not** override \`__radd__\`, the normal order applies (left \`__add__\` first).
- If both operands are the **same** type, the reflected method is never tried: an \`A + A\` whose \`__add__\` returns \`NotImplemented\` goes straight to \`TypeError\`, even when \`A\` defines \`__radd__\`.

## 4. Looked Up on the Type

📌 **Interview term: Implicit special-method lookup** — Python finds \`__add__\` on \`type(a)\`, never in the instance dict and never through \`__getattr__\`. Example 1 assigned \`m.__add__ = lambda other: "instance attribute"\`, and \`m + 1\` still returned \`Money(2)\`. Details in [how attribute lookup works](/interview-question/how-does-attribute-lookup-work-on-a-python-object).

In bytecode, every binary operator is one instruction. Example 2 printed this on 3.11:

~~~text
plus ['BINARY_OP +']
plus_eq ['BINARY_OP +=']
~~~

The 3.11 release replaced the separate \`BINARY_ADD\`, \`BINARY_SUBTRACT\`, \`INPLACE_ADD\` and similar opcodes with a single \`BINARY_OP\` whose argument names the operator ([CPython devguide on the 3.11 interpreter](https://devguide.python.org/internals/interpreter/)). The operator is chosen by the argument; the dispatch rules are the same for all of them.

## 5. a += b Is a Different Protocol

📌 **Interview term: In-place operator** — \`a += b\` first tries \`type(a).__iadd__(a, b)\`, which may modify \`a\` and return it. If \`__iadd__\` does not exist (or returns \`NotImplemented\`), Python falls back to \`a = a + b\` with the full dispatch above. Either way, the result is **assigned back** to \`a\`.

| Type | Has \`__iadd__\`? | \`a += b\` does | Aliases see the change? |
| :--- | :--- | :--- | :--- |
| \`list\` | yes | extends the same list | yes |
| \`tuple\`, \`str\`, \`int\` | no | builds a new object, rebinds \`a\` | no |
| \`set\` (for \`|=\`) | yes (\`__ior__\`) | updates the same set | yes |

Example 2:

~~~text
[1, 2, 3] [1, 2, 3] True
[1, 2, 3] [1, 2] False
(1, 2, 3) (1, 2) False
False True
~~~

The list \`+=\` mutated the object \`alias\` also points to; \`b = b + [3]\` and the tuple \`+=\` built new objects. The aliasing story is in [Python's name and object model](/interview-question/how-does-python-s-name-and-object-reference-model-work).

\`list.__iadd__\` is also more permissive than \`__add__\`: \`c += (2, 3)\` worked, while \`[1] + (2, 3)\` raised \`TypeError: can only concatenate list (not "tuple") to list\`.

The famous puzzle follows from "modify, then assign back":

~~~python
pair = ([1], "label")
pair[0] += [2]     # TypeError: 'tuple' object does not support item assignment
pair               # ([1, 2], 'label')  -- the list WAS changed
~~~

Step one, \`list.__iadd__\`, succeeded and mutated the list. Step two, storing the result back into \`pair[0]\`, failed because tuples are immutable. So you get an exception **and** a change.

## 6. Writing Operators Correctly

~~~python
def __add__(self, other):
    if isinstance(other, Money):
        return Money(self.cents + other.cents)
    if isinstance(other, int):
        return Money(self.cents + other)
    return NotImplemented          # let the other side try

def __radd__(self, other):         # other + self, where other did not know Money
    return self.__add__(other)     # addition is commutative here
~~~

- Return \`NotImplemented\` for unknown types — do not raise \`TypeError\` yourself, or the other operand never gets its turn.
- Implement \`__radd__\` if you want \`sum()\` to work: \`sum()\` starts from \`0\`, so the first step is \`0 + Money(1)\`. Example 1's trace showed \`Money(1).__radd__(0)\` as the first call.
- Only reuse \`__add__\` in \`__radd__\` when the operation is commutative; for \`-\` or string-like concatenation, \`__rsub__\` must compute \`other - self\`.

## 7. Verified: Running the Code

Example 1, tracing \`__add__\`, \`__radd__\` and the subclass rule, printed:

~~~text
Money(5) + Money(7):
  Money(5).__add__(Money(7))
  = Money(12)
Money(5) + 3:
  Money(5).__add__(3)
  = Money(8)
3 + Money(5):
  Money(5).__radd__(3)
  Money(5).__add__(3)
  = Money(8)
(3).__add__(Money(5)) -> NotImplemented
sum:
  Money(1).__radd__(0)
  Money(1).__add__(0)
  Money(1).__add__(Money(2))
  = Money(3)
Money(5) + 'x':
  Money(5).__add__('x')
  TypeError: unsupported operand type(s) for +: 'Money' and 'str'
Money(1) + Euro(2):
  Euro(2).__radd__(Money(1))  <- asked first
  = Euro(3)
  Money(1).__add__(1)
instance __add__ ignored: Money(2)
~~~

Example 2, \`+=\`, the tuple gotcha and bytecode, printed:

~~~text
[1, 2, 3] [1, 2, 3] True
[1, 2, 3] [1, 2] False
(1, 2, 3) (1, 2) False
False True
[1, 2, 3]
TypeError: can only concatenate list (not "tuple") to list
TypeError: 'tuple' object does not support item assignment
([1, 2], 'label')
plus ['BINARY_OP +']
plus_eq ['BINARY_OP +=']
NotImplementedType
NotImplemented
2.5
~~~

What the output proves:

- \`3 + Money(5)\` reached \`Money.__radd__\` only because \`int.__add__\` returned \`NotImplemented\`.
- \`Money(1) + Euro(2)\` called \`Euro.__radd__\` first and never called \`Money.__add__\`.
- An instance-level \`__add__\` was ignored; the type's method ran.
- \`pair[0] += [2]\` raised and still changed the list.
- \`(1).__add__(1.5)\` is \`NotImplemented\` and \`(1.5).__radd__(1)\` is \`2.5\`: that is how \`1 + 1.5\` works.

## 8. Common Pitfalls

- **Raising instead of returning \`NotImplemented\`.** \`raise TypeError\` or \`raise NotImplementedError\` stops the negotiation; \`return NotImplemented\` lets the other operand try.
- **Forgetting \`__radd__\`.** \`obj + 1\` works but \`1 + obj\` and \`sum(objs)\` fail.
- **Assuming \`a += b\` equals \`a = a + b\`.** For lists it mutates the shared object; for tuples it rebinds; for a list inside a tuple it does both and raises.
- **Patching \`obj.__add__\` on an instance.** Operators look on the type; patch the class (and know you are changing every instance).
- **Returning \`NotImplemented\` from a non-operator method.** Only operator dispatch understands it; anywhere else it is just an object — and using it in a boolean context is deprecated since 3.9 and raises \`TypeError\` from 3.14 ([built-in constants docs](https://docs.python.org/3/library/constants.html)). On 3.11 with \`-W error\`, \`bool(NotImplemented)\` raised \`DeprecationWarning: NotImplemented should not be used in a boolean context\`. Compare with \`is NotImplemented\` instead.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a + b</code> calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(a).__add__(a, b)</code>; if it is missing or returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotImplemented</code>, Python calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(b).__radd__(b, a)</code>; if that fails too, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. NotImplemented:</strong> <span style="color:#f0e2c8;">It is a value you return, not an exception, meaning "I do not handle that type, ask the other operand".</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The subclass rule:</strong> <span style="color:#f0e2c8;">If <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(b)</code> is a subclass of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(a)</code> that overrides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__radd__</code>, Python asks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> first; same-type operands never use the reflected method.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Type lookup:</strong> <span style="color:#f0e2c8;">The methods are looked up on the type, not the instance, and since 3.11 every binary operator is one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BINARY_OP</code> instruction.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Plus-equals:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a += b</code> tries <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iadd__</code> first and assigns the result back; lists mutate in place, tuples and ints rebind, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">t[0] += [x]</code> both mutates and raises.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why should <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__add__</code> return <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NotImplemented</code> rather than raise <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TypeError</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Returning it lets Python try the right operand's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__radd__</code>, so another type can still support the combination. Raising ends the dispatch immediately.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you need for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sum()</code> to work on your objects?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__radd__</code>, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sum()</code> starts with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>, and the first step is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0 + obj</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int.__add__</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotImplemented</code>, so your <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__radd__</code> must handle <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pair[0] += [2]</code> raise but still modify the list?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iadd__</code> on the list, which mutates it, followed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pair[0] = result</code>, which fails because tuples do not support item assignment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is the right operand asked first?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When its type is a proper subclass of the left type and provides its own reflected method. That lets subclasses take control of mixed operations with their parent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a == b</code> use the same machinery?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Similar but not identical: comparisons use reflected pairs like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__lt__</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__gt__</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> falls back to identity instead of raising. See the comparison chaining question for the details.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Operator overloading** | Defining \`__add__\` and friends so operators work on your class |
| **Reflected method** | \`__radd__\` and friends, tried on the right operand |
| **\`NotImplemented\`** | Returned value meaning "I cannot handle that type" |
| **Subclass priority for reflected operands** | A subclass on the right with its own \`__radd__\` is asked first |
| **Implicit special-method lookup** | Operators look methods up on the type only |
| **In-place operator** | \`+=\` tries \`__iadd__\`, else falls back to \`a = a + b\` |

---
**Conclusion:** \`a + b\` is a negotiation: the left operand's \`__add__\` is asked first, \`NotImplemented\` passes the question to the right operand's \`__radd__\`, and only when both decline does Python raise \`TypeError\` — with the one exception that a subclass on the right that overrides \`__radd__\` gets to speak first. The methods are always looked up on the type, and \`+=\` is a separate protocol that tries \`__iadd__\` and then assigns back, which explains both list aliasing and the tuple puzzle. If you can say "return \`NotImplemented\`, implement \`__radd__\` for \`sum()\`, and know what \`+=\` does to aliases", you have covered what the interviewer is checking. For comparisons, see [comparison chaining](/interview-question/how-does-comparison-chaining-a-b-c-work).`,
    examples: [
      {
        label: `Tracing __add__, __radd__, NotImplemented and the subclass rule`,
        code: `# Tracing who gets asked, and in what order, when Python evaluates a + b.

class Money:
    def __init__(self, cents):
        self.cents = cents
    def __repr__(self):
        return f"Money({self.cents})"
    def __add__(self, other):
        print(f"  {self!r}.__add__({other!r})")
        if isinstance(other, Money):
            return Money(self.cents + other.cents)
        if isinstance(other, int):
            return Money(self.cents + other)
        return NotImplemented          # "I do not know how": let Python try b
    def __radd__(self, other):
        print(f"  {self!r}.__radd__({other!r})")
        return self.__add__(other)

print("Money(5) + Money(7):")
print("  =", Money(5) + Money(7))

print("Money(5) + 3:")
print("  =", Money(5) + 3)

# int.__add__ returns NotImplemented for a Money, so Python asks Money.__radd__.
print("3 + Money(5):")
print("  =", 3 + Money(5))
print("(3).__add__(Money(5)) ->", (3).__add__(Money(5)))

# sum() starts from 0, so it needs __radd__ for the very first step.
print("sum:")
print("  =", sum([Money(1), Money(2)]))

# Both sides return NotImplemented: Python raises TypeError.
print("Money(5) + 'x':")
try:
    Money(5) + "x"
except TypeError as e:
    print("  TypeError:", e)

# The subclass rule: if type(b) is a subclass of type(a) AND overrides the
# reflected method, b.__radd__ is tried FIRST.
class Euro(Money):
    def __repr__(self):
        return f"Euro({self.cents})"
    def __radd__(self, other):
        print(f"  {self!r}.__radd__({other!r})  <- asked first")
        return Euro(other.cents + self.cents)

print("Money(1) + Euro(2):")
print("  =", Money(1) + Euro(2))

# Only the type is consulted, never the instance dict.
m = Money(1)
m.__add__ = lambda other: "instance attribute"
print("instance __add__ ignored:", m + 1)`,
      },
      {
        label: `+= and __iadd__, the tuple gotcha and the BINARY_OP bytecode`,
        code: `# a += b: try __iadd__ first, fall back to a = a + b.
import dis

a = [1, 2]
alias = a
a += [3]                 # list.__iadd__ mutates in place
print(a, alias, a is alias)  # [1, 2, 3] [1, 2, 3] True

b = [1, 2]
alias_b = b
b = b + [3]              # list.__add__ builds a new list
print(b, alias_b, b is alias_b)  # [1, 2, 3] [1, 2] False

t = (1, 2)
alias_t = t
t += (3,)                # tuple has no __iadd__: becomes t = t + (3,)
print(t, alias_t, t is alias_t)  # (1, 2, 3) (1, 2) False
print(hasattr(tuple, "__iadd__"), hasattr(list, "__iadd__"))  # False True

# list.__add__ insists on a list; list.__iadd__ accepts any iterable.
c = [1]
c += (2, 3)
print(c)  # [1, 2, 3]
try:
    [1] + (2, 3)
except TypeError as e:
    print("TypeError:", e)

# The famous gotcha: += on a list inside a tuple both works AND raises.
pair = ([1], "label")
try:
    pair[0] += [2]       # list.__iadd__ succeeds, then tuple item assignment fails
except TypeError as e:
    print("TypeError:", e)
print(pair)  # ([1, 2], 'label')

# Bytecode on 3.11: one BINARY_OP instruction, the operator in its argument.
def plus(x, y):
    return x + y
def plus_eq(x, y):
    x += y
    return x

for fn in (plus, plus_eq):
    ops = [f"{i.opname} {i.argrepr}" for i in dis.get_instructions(fn)
           if i.opname == "BINARY_OP"]
    print(fn.__name__, ops)

# NotImplemented is a value to return, not an exception to raise.
print(type(NotImplemented).__name__)  # NotImplementedType
print((1).__add__(1.5))  # NotImplemented
print((1.5).__radd__(1))  # 2.5`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is __init_subclass__ in Python?`,
    difficulty: "hard",
    seoDescription: `Python __init_subclass__ explained: a hook that runs when a subclass is defined, class keyword arguments, registries, validation and metaclass trade-offs.`,
    description: `**Question presented to candidate:**
"Have you come across \`__init_subclass__\`? What does it do, when exactly does it run, and when would you use it instead of a metaclass or a class decorator?"

**What a strong answer should cover:**
- \`__init_subclass__\` is a method on a base class that Python calls **every time a subclass of it is defined** (at \`class\` statement time, not when instances are created), with \`cls\` bound to the **new subclass**; it is not called for the class that defines it.
- It is an implicit \`classmethod\` and was added in Python 3.6 by PEP 487 together with \`__set_name__\`.
- Class keyword arguments (\`class CsvExporter(Exporter, fmt="csv")\`) are passed to it; it should accept \`**kwargs\` and call \`super().__init_subclass__(**kwargs)\`, and \`object.__init_subclass__\` raises \`TypeError\` for leftover keywords.
- Typical uses: plugin registries, enforcing that subclasses define required attributes or methods, configuring subclasses — validation happens at import time.
- Order during class creation: class body, then \`__set_name__\` on descriptors, then \`__init_subclass__\`; compared with a metaclass it composes through ordinary inheritance and avoids metaclass conflicts.

**Code / implementation expected:** Yes — a base class whose \`__init_subclass__\` registers subclasses by a class keyword and rejects incomplete ones.`,
    answer: `**Target Audience:** Intermediate Python developers comfortable with classes and inheritance who have heard of metaclasses and want the simpler tool.
**Difficulty:** Hard
**Python version:** Behaviour checked on CPython 3.11 (outputs identical on 3.12 and 3.13); both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Ideas come in plain language first. Terms an interviewer expects you to use are tagged \`📌 Interview term:\` and defined where they appear; all of them are repeated in the Quick Glossary. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A franchise company has one rule: every new branch that opens under its name must call head office **on opening day**. Head office then writes the branch into the directory, checks that it has a fire exit, and sends it the branch code it asked for. Nobody has to remember to register; opening the branch *is* the registration. A branch with no fire exit is refused before a single customer walks in.

\`__init_subclass__\` is that opening-day phone call. You write it once on a base class, and Python calls it automatically every time someone writes \`class Something(Base):\`. Interviewers like it because it answers "how would you build a plugin system?" in five lines, and because it shows you know you rarely need a [metaclass](/interview-question/what-is-a-metaclass).

## 2. What It Is and When It Runs

📌 **Interview term: \`__init_subclass__\`** — a method defined on a base class that Python calls once for **each new subclass**, right after that subclass object is created by the \`class\` statement. Inside it, \`cls\` is the **subclass**, not the base. It was introduced in Python 3.6 by PEP 487 ([What's New in 3.6](https://docs.python.org/3/whatsnew/3.6.html)), together with the descriptor hook \`__set_name__\`.

📌 **Interview term: Implicit classmethod** — you write \`def __init_subclass__(cls, **kwargs)\` with no decorator, and Python wraps it in \`classmethod\` for you. Example 2 confirmed: \`type(Model.__dict__["__init_subclass__"]).__name__\` printed \`classmethod\`.

Example 1, with a print as the first line of the hook:

~~~text
defining classes...
__init_subclass__ ran for CsvExporter (fmt='csv')
__init_subclass__ ran for TextBase (fmt=None)
__init_subclass__ ran for TsvExporter (fmt='tsv')
~~~

Three facts from that run:

- It ran as each \`class\` statement finished — **before** any instance existed.
- It ran for \`TsvExporter\` too, which inherits from \`Exporter\` through \`TextBase\`: **every descendant**, not only direct children.
- It did **not** run for \`Exporter\` itself. The second part of Example 1 shows the same: \`Root hook saw Child\` and \`Root hook saw GrandChild\`, but nothing for \`Root\`.

## 3. Class Keyword Arguments

📌 **Interview term: Class keyword arguments** — extra \`name=value\` items in the base list of a \`class\` statement: \`class CsvExporter(Exporter, fmt="csv")\`. Except for \`metaclass=\`, they are passed to \`__init_subclass__\` of the parent.

~~~python
class Exporter:
    registry = {}

    def __init_subclass__(cls, /, fmt=None, **kwargs):
        super().__init_subclass__(**kwargs)    # pass the rest up the chain
        if fmt is None:
            return                             # helper base, not a plugin
        if not callable(getattr(cls, "export", None)):
            raise TypeError(f"{cls.__name__} must define export()")
        cls.fmt = fmt
        Exporter.registry[fmt] = cls
~~~

- \`fmt\` is pulled out by name; everything else goes up with \`super().__init_subclass__(**kwargs)\` so that other bases in a multiple-inheritance chain get their own keywords. The \`/\` makes \`cls\` positional-only, so a keyword literally called \`cls\` cannot clash with it.
- The registry ended as \`registry: ['csv', 'tsv']\`, and \`Exporter.registry["csv"]().export(...)\` worked without anyone importing \`CsvExporter\` by name.
- \`class Broken(Exporter, fmt="json")\` with no \`export\` method failed at definition time: \`TypeError: Broken must define export()\`, and \`"json" in Exporter.registry\` stayed \`False\`.

📌 **Interview term: \`object.__init_subclass__\`** — the default at the top of every chain. It does nothing, except reject keyword arguments that nobody consumed. Example 1:

~~~text
TypeError: Oops.__init_subclass__() takes no keyword arguments
~~~

That is a feature: a typo like \`colour=\` instead of \`color=\` fails loudly instead of being ignored.

## 4. Where It Fits in Class Creation

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="Class creation order: class body runs, type new builds the class, set name is called on each descriptor, then the parent init subclass hook, then the name is bound">
  <defs>
    <marker id="py20q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="190" height="56" rx="10"/>
  <text class="d-text" x="115" y="64" text-anchor="middle">1. class body runs</text>
  <text class="d-sub" x="115" y="84" text-anchor="middle">fills a namespace</text>
  <rect class="d-box" x="265" y="40" width="190" height="56" rx="10"/>
  <text class="d-text" x="360" y="64" text-anchor="middle">2. type.__new__</text>
  <text class="d-sub" x="360" y="84" text-anchor="middle">builds the class</text>
  <rect class="d-box" x="510" y="40" width="190" height="56" rx="10"/>
  <text class="d-text" x="605" y="64" text-anchor="middle">3. __set_name__</text>
  <text class="d-sub" x="605" y="84" text-anchor="middle">on each descriptor</text>
  <rect class="d-box-accent" x="265" y="170" width="190" height="56" rx="10"/>
  <text class="d-text d-accent" x="360" y="194" text-anchor="middle">4. __init_subclass__</text>
  <text class="d-sub" x="360" y="214" text-anchor="middle">of the parent</text>
  <rect class="d-box-muted" x="510" y="170" width="190" height="56" rx="10"/>
  <text class="d-text" x="605" y="194" text-anchor="middle">5. name bound</text>
  <text class="d-sub" x="605" y="214" text-anchor="middle">User = the class</text>
  <path class="d-edge" d="M 212 68 L 259 68" marker-end="url(#py20q5-arrow)"/>
  <path class="d-edge" d="M 457 68 L 504 68" marker-end="url(#py20q5-arrow)"/>
  <path class="d-edge-accent" d="M 605 98 L 365 164" marker-end="url(#py20q5-arrow)"/>
  <path class="d-edge" d="M 457 198 L 504 198" marker-end="url(#py20q5-arrow)"/>
</svg>

Steps 3 and 4 both happen inside \`type.__new__\`, in that order. So by the time \`__init_subclass__\` runs, every descriptor on the new class already knows its name — which is exactly what an ORM-style \`Model\` base needs. Example 2:

~~~text
class User(Model):
  0. class body runs first
  1. __set_name__ User.name
  1. __set_name__ User.email
  2. __init_subclass__ User, fields=['name', 'email']
done: ['name', 'email']
~~~

(Descriptors and \`__set_name__\` are covered in [the descriptor protocol](/interview-question/what-is-the-descriptor-protocol).)

## 5. __init_subclass__ vs a Metaclass vs a Class Decorator

📌 **Interview term: Metaclass** — the class of a class (by default \`type\`), which controls how classes are built. A metaclass can do everything \`__init_subclass__\` does and more, but it becomes the type of every subclass and conflicts with other metaclasses.

Example 2 builds the same "collect subclass names" feature both ways. Both found the right names:

~~~text
metaclass found: ['PluginB', 'PluginC']
hook found: ['PluginY', 'PluginZ']
RegistryMeta type
TypeError: metaclass conflict
mixed Mixed
~~~

- The metaclass version made \`type(PluginB)\` a \`RegistryMeta\`; the hook version left \`type(PluginY)\` as plain \`type\`.
- Mixing \`PluginA\` (metaclass \`RegistryMeta\`) with an unrelated class that has a different metaclass raised \`TypeError: metaclass conflict\`.
- Two hook-based bases combined without trouble: \`class Mixed(PluginRoot, Tagged, tag="mixed")\` ran both hooks through cooperative \`super()\` — \`Tagged\` received \`tag\`, \`PluginRoot\` recorded the name.

| | \`__init_subclass__\` | Class decorator | Metaclass |
| :--- | :--- | :--- | :--- |
| Runs for | every subclass, automatically | only classes you decorate | every class with that metaclass |
| Inherited? | yes | no — each subclass must be decorated | yes |
| Runs for the base itself? | no | yes, if you decorate it | yes (you skip it by hand) |
| Can change how the class object is built (\`__new__\`, \`__prepare__\`, \`__call__\`)? | no | no (it can only modify or replace the finished class) | yes |
| Conflict risk | low, composes with \`super()\` | none | metaclass conflicts in multiple inheritance |

The rule of thumb: reach for \`__init_subclass__\` when **subclasses** should be registered, validated or configured; a class decorator when it is one-off and explicit; a metaclass only when you must control class creation itself (a custom namespace via \`__prepare__\`, or changing what calling the class does). See [mixins](/interview-question/what-are-mixins-in-python) for the cooperative-\`super()\` style it relies on, and [abstract base classes](/interview-question/what-are-abstract-base-classes-and-protocols) for the instance-time alternative to required-method checks.

## 6. Verified: Running the Code

Example 1, a validated plugin registry, printed:

~~~text
defining classes...
__init_subclass__ ran for CsvExporter (fmt='csv')
__init_subclass__ ran for TextBase (fmt=None)
__init_subclass__ ran for TsvExporter (fmt='tsv')
registry: ['csv', 'tsv']
['1,2', '3,4']
tsv
__init_subclass__ ran for Broken (fmt='json')
TypeError: Broken must define export()
False
Root hook saw Child
Root hook saw GrandChild
TypeError: Oops.__init_subclass__() takes no keyword arguments
~~~

Example 2, creation order and the metaclass comparison, printed:

~~~text
class User(Model):
  0. class body runs first
  1. __set_name__ User.name
  1. __set_name__ User.email
  2. __init_subclass__ User, fields=['name', 'email']
done: ['name', 'email']
metaclass found: ['PluginB', 'PluginC']
hook found: ['PluginY', 'PluginZ']
RegistryMeta type
TypeError: metaclass conflict
mixed Mixed
classmethod
~~~

What the output proves:

- The hook runs once per subclass, at definition time, for grandchildren too, and not for the defining class.
- Validation in the hook rejects a bad subclass before it is registered or instantiated.
- Unused class keywords reach \`object.__init_subclass__\` and raise \`TypeError\`.
- \`__set_name__\` runs before \`__init_subclass__\`, so descriptors are named when the hook inspects them.
- The hook avoids the metaclass conflict and leaves subclasses typed as plain \`type\`.

## 7. Edge Cases

- **Hooks on several bases.** Only the first \`__init_subclass__\` found in the new class MRO is called; the others run only if each one calls \`super().__init_subclass__(**kwargs)\`. Forgetting that call silently disables the other bases' hooks.
- **Defining a hook in a subclass.** \`class Child(Base)\` with its own \`__init_subclass__\` does not affect \`Child\` itself (its parent's hook runs for it); it applies to \`Child\`'s future subclasses.
- **Exceptions abort the class.** If the hook raises, the \`class\` statement raises and the name is never bound — \`Broken\` did not exist afterwards.
- **\`ABC\` interplay.** \`abc.ABC\` checks for abstract methods when you **instantiate**; \`__init_subclass__\` can check at **definition** time, which fails earlier, at import.

## 8. Common Pitfalls

- **Expecting it to run for the base class.** It runs only for subclasses; register the base by hand if you need it.
- **Not calling \`super().__init_subclass__(**kwargs)\`.** Other bases' hooks never run, and keyword arguments meant for them are silently lost.
- **Swallowing every keyword.** A signature like \`def __init_subclass__(cls, **kwargs)\` that never forwards \`kwargs\` hides typos that \`object.__init_subclass__\` would have caught.
- **Confusing it with \`__init__\`.** It does not run per instance; nothing in it can see instance data.
- **Writing a metaclass for a registry.** It works, but brings metaclass conflicts and changes \`type()\` of every subclass; the hook does the same job in fewer lines.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init_subclass__</code> is a hook on a base class that Python calls every time a subclass is defined, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls</code> bound to the new subclass; it does not run for the base itself or for instances.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The details:</strong> <span style="color:#f0e2c8;">It is an implicit classmethod, added in Python 3.6 by PEP 487, and runs inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type.__new__</code> right after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set_name__</code> has been called on the descriptors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Keywords:</strong> <span style="color:#f0e2c8;">Class keyword arguments like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Csv(Exporter, fmt="csv")</code> arrive as parameters; I take mine and forward the rest with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().__init_subclass__(**kwargs)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Uses:</strong> <span style="color:#f0e2c8;">Plugin registries, validating that subclasses define required attributes or methods at import time, and per-subclass configuration.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versus a metaclass:</strong> <span style="color:#f0e2c8;">It covers most metaclass use cases, composes through ordinary inheritance and cannot cause metaclass conflicts; I keep metaclasses for controlling class creation itself.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__init_subclass__</code> run when I create an instance?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It runs once per subclass, when the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class</code> statement executes, usually at import time. Per-instance work belongs in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__new__</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">super().__init_subclass__(**kwargs)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So every base in the MRO gets its hook and its own keywords, and so leftover keywords reach <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__init_subclass__</code>, which raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> for anything nobody consumed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What runs first, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__set_name__</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__init_subclass__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__set_name__</code>. Both are triggered from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type.__new__</code>, descriptors first, so the hook can rely on every field already knowing its name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still write a metaclass?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When I must change how the class is created rather than react to it: a custom namespace through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__prepare__</code>, intercepting class calls with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__call__</code>, or behaviour that must also apply to the root class.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from an abstract base class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abc</code> refuses to instantiate a class with missing abstract methods, so the error appears at run time on first use. A check in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init_subclass__</code> fails when the class is defined, which is earlier and can enforce rules ABCs cannot, like class attributes.</span>
</div>

</div>

## 10. Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`__init_subclass__\`** | Hook on a base class called for each new subclass |
| **Implicit classmethod** | Python wraps \`__init_subclass__\` in \`classmethod\` for you |
| **Class keyword arguments** | \`name=value\` in the class bases, passed to the hook |
| **\`object.__init_subclass__\`** | The default hook; rejects unused keywords |
| **Metaclass** | The class of a class; controls how classes are created |

---
**Conclusion:** \`__init_subclass__\` is the "a subclass was just defined" hook: an implicit classmethod on a base class, called for every descendant as its \`class\` statement finishes, after \`__set_name__\` has named its descriptors, with any class keyword arguments passed in. That makes registries, subclass validation and per-subclass configuration a few lines of ordinary code, checked at import time and composable through cooperative \`super()\`. Mention that it arrived in Python 3.6 with PEP 487, that it never runs for the base or for instances, and that it replaces most — but not all — reasons to write a metaclass.`,
    examples: [
      {
        label: `A validated plugin registry with class keyword arguments`,
        code: `# A plugin registry with validation, using __init_subclass__ (no metaclass).

class Exporter:
    registry = {}

    def __init_subclass__(cls, /, fmt=None, **kwargs):
        # Implicitly a classmethod: cls is the NEW subclass, not Exporter.
        super().__init_subclass__(**kwargs)    # keep the chain cooperative
        print(f"__init_subclass__ ran for {cls.__name__} (fmt={fmt!r})")
        if fmt is None:
            return                           # an abstract helper: do not register
        if not callable(getattr(cls, "export", None)):
            raise TypeError(f"{cls.__name__} must define export()")
        cls.fmt = fmt
        Exporter.registry[fmt] = cls

print("defining classes...")

class CsvExporter(Exporter, fmt="csv"):
    def export(self, rows):
        return "\\n".join(",".join(map(str, r)) for r in rows)

class TextBase(Exporter):          # no fmt: helper base, not registered
    sep = " "

class TsvExporter(TextBase, fmt="tsv"):   # grandchildren trigger it too
    def export(self, rows):
        return "\\n".join("\\t".join(map(str, r)) for r in rows)

print("registry:", sorted(Exporter.registry))
print(Exporter.registry["csv"]().export([[1, 2], [3, 4]]).splitlines())
print(TsvExporter.fmt)  # tsv

# Validation fires at class-definition time, before any instance exists.
try:
    class Broken(Exporter, fmt="json"):
        pass
except TypeError as e:
    print("TypeError:", e)
print("json" in Exporter.registry)  # False

# The hook does not run for the class that defines it.
class Root:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        print(f"Root hook saw {cls.__name__}")

class Child(Root): pass
class GrandChild(Child): pass

# Unknown class keywords end up at object.__init_subclass__, which rejects them.
try:
    class Oops(Child, colour="red"):
        pass
except TypeError as e:
    print("TypeError:", e)`,
      },
      {
        label: `Ordering with __set_name__, and the metaclass it replaces`,
        code: `# Ordering during class creation, and the metaclass it replaces.

class Field:
    def __set_name__(self, owner, name):
        print(f"  1. __set_name__ {owner.__name__}.{name}")
        self.name = name

class Model:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.fields = [k for k, v in vars(cls).items() if isinstance(v, Field)]
        print(f"  2. __init_subclass__ {cls.__name__}, fields={cls.fields}")

print("class User(Model):")
class User(Model):
    print("  0. class body runs first")
    name = Field()
    email = Field()
print("done:", User.fields)

# The same registry with a metaclass, the pre-3.6 way.
class RegistryMeta(type):
    found = []
    def __new__(mcls, name, bases, ns, **kwargs):
        cls = super().__new__(mcls, name, bases, ns, **kwargs)
        if bases:                       # skip the root class itself
            RegistryMeta.found.append(name)
        return cls

class PluginA(metaclass=RegistryMeta): pass
class PluginB(PluginA): pass
class PluginC(PluginA): pass
print("metaclass found:", RegistryMeta.found)

class PluginRoot:
    found = []
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        PluginRoot.found.append(cls.__name__)

class PluginY(PluginRoot): pass
class PluginZ(PluginRoot): pass
print("hook found:", PluginRoot.found)

# The metaclass version leaks into every subclass type; the hook does not.
print(type(PluginB).__name__, type(PluginY).__name__)  # RegistryMeta type

# Metaclass conflict: two unrelated metaclasses cannot be mixed.
class OtherMeta(type): pass
class Other(metaclass=OtherMeta): pass
try:
    class Both(PluginA, Other): pass
except TypeError as e:
    print("TypeError:", str(e).split(":")[0])

# Two hook-based bases combine fine through cooperative super().
class Tagged:
    def __init_subclass__(cls, tag="none", **kwargs):
        super().__init_subclass__(**kwargs)
        cls.tag = tag

class Mixed(PluginRoot, Tagged, tag="mixed"): pass
print(Mixed.tag, PluginRoot.found[-1])  # mixed Mixed

# It is an implicit classmethod.
print(type(Model.__dict__["__init_subclass__"]).__name__)  # classmethod`,
      },
    ],
  },
];

export default augments;
